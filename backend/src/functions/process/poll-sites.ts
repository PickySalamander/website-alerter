import {Handler} from "aws-lambda";
import puppeteer, {Browser} from "puppeteer";
import {LambdaBase} from "../../util/lambda-base";
import {SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {PollSiteData} from "./poll-site-data";
import {randomUUID} from "crypto";
import {DefaultChromeArgs} from "../../util/default-chrome-args";

/**
 * Process a website through the Puppeteer framework. This function runs in its own Docker container which installs the
 * relevant dependencies required. ProcessSite will start Puppeteer, poll the provided website, wait for JS to render
 * the site enough, save an HTML and PNG of the site to S3, and finally return information on the {@link SiteRevision}
 * so that it can be parsed for changes.
 */
class PollSites extends LambdaBase {
	/** Sites that were successfully parsed */
	private successfullyParsed:WebsiteItem[];

	/** The current Chromium browser running */
	private browser:Browser;

	/** The current run's ID */
	private runID:string;

	/**
	 * Entry point from the state machine
	 * @param data data from the previous step that contains information about the site to check
	 */
	public handler:Handler<PollSiteData, WebsiteItem[]> = async(data) => {
		try {
			console.info(`Starting to poll ${data.sites.length} sites in run ${data.runID}`);

			this.runID = data.runID;

			this.successfullyParsed = [];

			await this.initialize();

			try {
				await Promise.all(data.sites.map(async site => this.parseSite(site)));
			} finally {
				await this.close();
			}

			return this.successfullyParsed;
		} catch(e) {
			console.error("Uncaught exception", e);
		}
	}

	/** Start up a Puppeteer browser instance */
	private async initialize() {
		console.info("Starting up puppeteer for the first time...");

		//start up a headless browser
		this.browser = await puppeteer.launch({
			args: DefaultChromeArgs(),
			timeout: 0,
			headless: true
		});

		const browserVersion = await this.browser.version();
		console.info(`Puppeteer started, running chrome ${browserVersion}`);
	}

	/**
	 * Poll the website and wait for it to render, then save the HTML content to S3
	 * @param site the website to parse
	 * @returns true if the site was successfully polled, false if otherwise
	 */
	private async parseSite(site:WebsiteItem):Promise<void> {
		//generate a new revision
		const revisionID:string = randomUUID();

		site.last = {
			siteID: site.siteID,
			runID: this.runID,
			time: new Date().getTime(),
			revisionID,
			siteState: SiteRevisionState.Open
		}

		//add the revision to the database
		await this.database.putSiteRevision(site.last);

		console.info(`Parsing site ${site.siteID} with revision ${revisionID}`);

		//poll the site and save the html
		const result = await this.pollSite(site);

		if(!result) {
			return;
		}

		console.info("Parsed site successfully, uploading to S3");

		//put the HTML in S3
		await this.s3.putObject(`content/${site.siteID}/${revisionID}.html`, result.content);

		//put the PNG in S3
		await this.s3.putObject(`content/${site.siteID}/${revisionID}.png`, result.screenshot);

		//add a revision to the database
		site.last.siteState = SiteRevisionState.Polled;
		await this.database.updateSiteRevision(site.siteID, revisionID, SiteRevisionState.Polled);

		this.successfullyParsed.push(site);
	}

	private async pollSite(site:WebsiteItem):Promise<PageResult> {
		console.info(`Navigating to ${site.site} in browser...`);

		//open a new page in the browser
		const page = await this.browser.newPage();
		await page.setViewport({width: 1920, height: 1080});

		try {
			//go to the page and wait for it to render
			await page.goto(site.site, {
				waitUntil: ["load", "domcontentloaded", "networkidle2"],
				timeout: 30000
			});

			let content:string;

			if(site.selector) {
				console.info(`Getting with selector "${site.selector}"...`);

				//wait for the css selector to be visible on the page
				const element = await page.waitForSelector(site.selector, {
					timeout: 15000,
					visible: true
				});

				//get the outer html when it is available
				content = await element.evaluate(el => el.outerHTML);
			} else {
				//get page html
				content = await page.content();
			}

			//take a PNG screenshot for posterity
			const screenshot = await page.screenshot({fullPage: true}) as Buffer;

			return {
				content,
				screenshot
			}
		} catch(e) {
			console.warn("Failed to parse website", e as Error);
			return undefined;
		} finally {
			await page.close();
		}
	}

	async close() {
		await this.browser?.close();
	}
}

interface PageResult {
	screenshot:Buffer;

	content:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new PollSites().handler;
