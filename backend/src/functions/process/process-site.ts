import {Handler} from "aws-lambda";
import puppeteer, {Browser, Page} from "puppeteer";
import {DefaultChromeArgs} from "../../util/default-chrome-args";
import {v4} from "uuid";
import {LambdaBase} from "../../util/lambda-base";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {DetectChangesData} from "../../util/step-data";

/**
 * Process a website through the Puppeteer framework. This function runs in its own Docker container which installs the
 * relevant dependencies required. ProcessSite will start Puppeteer, poll the provided website, wait for JS to render
 * the site enough, save an HTML and PNG of the site to S3, and finally dispatch an event to have the site parsed for
 * changes.
 */
class ProcessSite extends LambdaBase {
	/** The current chromium browser running */
	private browser:Browser;

	private currentRevision:string;

	private site:WebsiteItem;

	public handler:Handler<ProcessSiteData, DetectChangesData> = async(data) => {
		console.log(`Starting to parse site ${data.siteID} in run ${data.runID}`);

		await this.setupServices();

		//get information from the database on the website
		this.site = await this.database.getSite(data.siteID);
		if(!this.site) {
			throw new Error(`Site ${data.siteID} doesn't exist in the database, aborting`);
		}

		this.currentRevision = v4();
		console.log(`Starting new revision ${this.currentRevision}`);

		//add a revision to the database
		await this.database.addSiteRevision(data.siteID, {
			runID: data.runID,
			time: new Date().getTime(),
			revisionID: this.currentRevision,
			siteState: SiteRevisionState.Open
		});

		if(!this.browser) {
			//set up the browser
			await this.initializeBrowser();
		}

		const wasPolled = await this.parseSite();

		console.log("Done.");

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
			//close the page
			await page.close();
		}

		return true;
	}

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

interface ProcessSiteData {
	runID:string;
	siteID:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;