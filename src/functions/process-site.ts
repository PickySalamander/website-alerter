import {SQSEvent, SQSHandler} from "aws-lambda";
import puppeteer, {Browser} from "puppeteer";
import {DefaultChromeArgs} from "../util/default-chrome-args";
import {v4 as uuidV4} from "uuid";
import {LambdaBase} from "../util/lambda-base";
import {Utils} from "../util/utils";
import {SqsSiteEvent} from "../util/sqs-site-event";
import {SiteRunState} from "../services/database.service";

/**
 * Process a website through the Puppeteer framework. This function runs in its own Docker container which installs the
 * relevant dependencies required. ProcessSite will start Puppeteer, poll the provided website, wait for JS to render
 * the site enough, save an HTML and PNG of the site to S3, and finally dispatch an event to have the site parsed for
 * changes.
 */
class ProcessSite extends LambdaBase {
	/** The current chromium browser running */
	private browser:Browser;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Starting to parse ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		await this.setupServices();

		try {
			//set up the browser
			await this.initializeBrowser();

			//got through each site in the SQS queue and poll them
			for(const record of event.Records) {
				const siteEvent = JSON.parse(record.body) as SqsSiteEvent;
				await this.parseSite(siteEvent);
			}
		} finally {
			//finally make sure the browser is shut down
			console.log("Closing down browser...");
			await this.browser?.close();
			this.browser = undefined;
		}

		console.log("Done.");
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
	 * @param siteEvent the event from the queue with the run ID and site url
	 */
	private async parseSite(siteEvent:SqsSiteEvent) {
		console.log(`Parsing website ${siteEvent.site} from run ${siteEvent.runID}`);

		//get information from the database on the website
		let site = await this.database.getWebsite(siteEvent.site);
		if(!site) {
			console.error(`Site ${siteEvent.site} doesn't exist in the database, aborting`);
			return;
		}

		console.log("Navigating to page in browser...");

		//open a new page in the browser
		const page = await this.browser.newPage();
		await page.setViewport({width: 1920, height: 1080});

		//go to the page and wait for it to render on a timeout of 30s
		await page.goto(siteEvent.site, {
			waitUntil: ["load", "domcontentloaded", "networkidle2"],
			timeout: 30000
		});

		//get the HTML content of the page and take a PNG screenshot
		const content = await page.content();
		const screenshot = await page.screenshot({fullPage: true}) as Buffer;

		//close the page
		await page.close();

		console.log("Done with page, uploading changes");

		const changeID = uuidV4();

		//put the HTML in S3
		await this.s3.putObject({
			Bucket: this.configPath,
			Key: `content/${changeID}.html`,
			Body: content
		}).promise();

		//put the PNG in S3
		await this.s3.putObject({
			Bucket: this.configPath,
			Key: `content/${changeID}.png`,
			Body: screenshot
		}).promise();

		console.log("All done, updating database");

		//add a revision to the database
		await this.database.addRevision(siteEvent.site, {
			time: new Date().getTime(),
			id: changeID
		});

		//update the run that the site was polled
		await this.database.updateRunSiteState(siteEvent.runID, siteEvent.site, SiteRunState.Polled);

		//queue up the HTML to be checked
		await this.queueWebsiteCheck(siteEvent);
	}

	/**
	 * Queue a website's HTML to be checked
	 * @param site the site to be checked
	 */
	private async queueWebsiteCheck(site:SqsSiteEvent) {
		//abort if not production
		if(!Utils.isProduction) {
			console.log(`Would have queued ${JSON.stringify(site)} to be checked, but this isn't production.`);
			return;
		}

		//send to sqs
		await this.sqs.sendMessage({
			QueueUrl: process.env.CHANGE_QUEUE_NAME,
			MessageBody: JSON.stringify(site)
		}).promise();
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;