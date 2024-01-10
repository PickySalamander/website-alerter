import {Handler} from "aws-lambda";
import puppeteer, {Browser, Page} from "puppeteer";
import {DefaultChromeArgs} from "../../util/default-chrome-args";
import {v4} from "uuid";
import {LambdaBase} from "../../util/lambda-base";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {SiteRevision, SiteRevisionState, WebsiteItem, RunThrough} from "website-alerter-shared";
import {DetectChangesData} from "../../util/detect-changes-data";

/**
 * Process a website through the Puppeteer framework. This function runs in its own Docker container which installs the
 * relevant dependencies required. ProcessSite will start Puppeteer, poll the provided website, wait for JS to render
 * the site enough, save an HTML and PNG of the site to S3, and finally return information on the {@link SiteRevision}
 * so that it can be parsed for changes.
 */
class ProcessSite extends LambdaBase {
	/** The current chromium browser running */
	private browser:Browser;

	/** The current {@link SiteRevision.revisionID} being processed */
	private currentRevision:string;

	/** The current site being polled */
	private site:WebsiteItem;

	/**
	 * Entry point from the state machine
	 * @param data data from the previous step that contains information about the site to check
	 */
	public handler:Handler<ProcessSiteData, DetectChangesData> = async(data) => {
		console.log(`Starting to parse site ${data.siteID} in run ${data.runID}`);

		await this.setupServices();

		//get information from the database on the website
		this.site = await this.database.getSite(data.siteID);
		if(!this.site) {
			throw new Error(`Site ${data.siteID} doesn't exist in the database, aborting`);
		}

		//generate a new revision
		this.currentRevision = v4();
		console.log(`Starting new revision ${this.currentRevision}`);

		const revision:SiteRevision = {
			siteID: data.siteID,
			runID: data.runID,
			time: new Date().getTime(),
			revisionID: this.currentRevision,
			siteState: SiteRevisionState.Open
		}

		//add the revision to the database
		await this.database.putSiteRevision(revision);

		//set up the browser if it isn't already running
		if(!this.browser) {
			await this.initializeBrowser();
		}

		//poll the site and save the html
		const wasPolled = await this.parseSite();

		console.log("Done.");

		//return to the next step the information on the revision and if it was successfully polled
		return {
			runID: data.runID,
			siteID: data.siteID,
			revisionID: this.currentRevision,
			wasPolled
		}
	}

	/** Start up a Puppeteer browser instance */
	private async initializeBrowser() {
		console.log("Starting up puppeteer...");

		//start up a headless browser
		this.browser = await puppeteer.launch({
			args: DefaultChromeArgs(),
			timeout: 0,
			headless: "new"
		});

		const browserVersion = await this.browser.version();
		console.log(`Puppeteer started, running chrome ${browserVersion}`);
	}

	/**
	 * Poll the website and wait for it to render, then save the HTML content to S3
	 * @returns true if the site was successfully polled, false if otherwise
	 */
	private async parseSite() {
		console.log(`Navigating to ${this.site.site} in browser...`);

		//open a new page in the browser
		const page = await this.browser.newPage();
		await page.setViewport({width: 1920, height: 1080});

		try {
			//the finally loaded DOM
			const content = await this.navigateToPage(this.site, page);

			//take a PNG screenshot for posterity
			const screenshot = await page.screenshot({fullPage: true}) as Buffer;

			console.log(`Done with page, uploading changes:${this.currentRevision}`);

			//put the HTML in S3
			await this.s3.send(new PutObjectCommand({
				Bucket: this.configPath,
				Key: `content/${this.currentRevision}.html`,
				Body: content
			}));

			//put the PNG in S3
			await this.s3.send(new PutObjectCommand({
				Bucket: this.configPath,
				Key: `content/${this.currentRevision}.png`,
				Body: screenshot
			}));

			console.log("All done, updating database");

			//add a revision to the database
			await this.database.updateSiteRevision(this.site.siteID, this.currentRevision, SiteRevisionState.Polled);
		} catch(e) {
			console.error("Failed to process website", e);
			return false;
		} finally {
			//make sure to close the page
			await page.close();
		}

		return true;
	}

	/**
	 * Navigate the browser to the page, wait for it to render, and get the HTML content from it. This will either use
	 * the provided CSS {@link WebsiteItem.selector} or just wait for the body to render if a
	 * {@link WebsiteItem.selector} was not provided.
	 * @param site the site to navigate to
	 * @param page the browser page to navigate with
	 * @returns the final HTML content loaded on the page
	 */
	private async navigateToPage(site:WebsiteItem, page:Page) {
		// if a selector is defined then select with it, otherwise we just wait for the network to load and select the
		// body
		if(site.selector) {
			//go to the page and wait for it to render
			await page.goto(site.site, {
				waitUntil: ["load", "domcontentloaded"],
				timeout: 15000
			});

			console.log(`Waiting for site with selector "${site.selector}"...`);

			//wait for the css selector to be visible on the page
			const element = await page.waitForSelector(site.selector, {
				timeout: 15000,
				visible: true
			});

			//get the outer html when it is available
			return await element.evaluate(el => el.outerHTML);
		}

		console.log(`Waiting for site with no selector...`);

		//go to the page and wait for it to render
		await page.goto(site.site, {
			waitUntil: ["load", "domcontentloaded", "networkidle2"],
			timeout: 30000
		});

		//get the outer html of the body
		return await page.$eval("body", el => el.outerHTML);

	}
}

/** Incoming data from the previous state machine step */
interface ProcessSiteData {
	/** The current {@link RunThrough.runID} being run through the state machine */
	runID:string;

	/** The current {@link WebsiteItem.siteID} to process */
	siteID:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;