import {Handler} from "aws-lambda";
import puppeteer, {Browser} from "puppeteer";
import {DefaultChromeArgs} from "../../util/default-chrome-args";
import {v4} from "uuid";
import {LambdaBase} from "../../util/lambda-base";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {SiteToProcess} from "../../util/site-to-process";
import {SiteRevisionState} from "website-alerter-shared";

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

	public handler:Handler<SiteToProcess, any> = async(siteToProcess) => {
		console.log(`Starting to parse ${JSON.stringify(siteToProcess)}`);

		await this.setupServices();

		this.currentRevision = v4();

		console.log(`Starting new revision ${this.currentRevision}`);

		//add a revision to the database
		await this.database.putSiteRevision({
			siteID: siteToProcess.siteID,
			runID: siteToProcess.runID,
			time: new Date().getTime(),
			revisionID: this.currentRevision,
			siteState: SiteRevisionState.Open
		});

		await this.database.updateSiteRunDetails(siteToProcess.siteID, siteToProcess.runID);

		if(!this.browser) {
			//set up the browser
			await this.initializeBrowser();
		}

		await this.parseSite(siteToProcess);

		console.log("Done.");

		return {
			revisionID: this.currentRevision
		};
	}

	/** Start up a Puppeteer browser instance */
	private async initializeBrowser() {
		console.log("Starting up puppeteer...");

		//start up a headless browser
		this.browser = await puppeteer.launch({
			args: DefaultChromeArgs(),
			headless: "new"
		});

		const browserVersion = await this.browser.version();
		console.log(`Puppeteer started, running chrome ${browserVersion}`);
	}

	/**
	 * Parse the given website in the SQS queue
	 * @param toParse the event from the queue with the run ID and site url
	 */
	private async parseSite(toParse:SiteToProcess) {
		console.log(`Parsing website ${toParse.siteID} from run ${toParse.runID}`);

		//get information from the database on the website
		const site = await this.database.getWebsite(toParse.siteID);
		if(!site) {
			throw new Error(`Site ${toParse.siteID} doesn't exist in the database, aborting`);
		}

		//get the site's config for the selector
		const selector = this.configService.getConfig(site.site).selector;

		console.log(`Navigating to ${site.site} in browser...`);

		//open a new page in the browser
		const page = await this.browser.newPage();
		await page.setViewport({width: 1920, height: 1080});

		//the finally loaded DOM
		let content:string;

		// if a selector is defined then select with it, otherwise we just wait for the network to load and select the
		// body
		if(selector) {
			//go to the page and wait for it to render
			await page.goto(site.site, {
				waitUntil: ["load", "domcontentloaded"],
				timeout: 15000
			});

			//wait for the css selector to be visible on the page
			const element = await page.waitForSelector(selector, {
				timeout: 15000,
				visible: true
			});

			//get the outer html when it is available
			content = await element.evaluate(el => el.outerHTML);
		} else {
			//go to the page and wait for it to render
			await page.goto(site.site, {
				waitUntil: ["load", "domcontentloaded", "networkidle2"],
				timeout: 30000
			});

			//get the outer html of the body
			content = await page.$eval("body", el => el.outerHTML);
		}

		//take a PNG screenshot for posterity
		const screenshot = await page.screenshot({fullPage: true}) as Buffer;

		//close the page
		await page.close();

		const changeID = v4();

		console.log(`Done with page, uploading changes:${changeID}`);

		//put the HTML in S3
		await this.s3.send(new PutObjectCommand({
			Bucket: this.configPath,
			Key: `content/${changeID}.html`,
			Body: content
		}));

		//put the PNG in S3
		await this.s3.send(new PutObjectCommand({
			Bucket: this.configPath,
			Key: `content/${changeID}.png`,
			Body: screenshot
		}));

		console.log("All done, updating database");

		//add a revision to the database
		await this.database.updateSiteRevision(this.currentRevision, SiteRevisionState.Polled);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;