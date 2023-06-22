import {SQSEvent, SQSHandler} from "aws-lambda";
import {SiteConfig} from "../services/configuration.service";
import puppeteer, {Browser} from "puppeteer";
import {DefaultChromeArgs} from "../util/default-chrome-args";
import {v4 as uuidV4} from "uuid";
import {LambdaBase} from "../util/lambda-base";
import {Utils} from "../util/utils";
import {SqsSiteEvent} from "../util/sqs-site-event";

class ProcessSite extends LambdaBase {
	private browser:Browser;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Starting to parse ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		await this.setupServices();

		try {
			await this.initializeBrowser();

			for(const record of event.Records) {
				const siteEvent = JSON.parse(record.body) as SqsSiteEvent;
				await this.parseSite(siteEvent);
			}
		} finally {
			console.log("Closing down browser...");
			await this.browser?.close();
			this.browser = undefined;
		}

		console.log("Done.");
	}

	private async initializeBrowser() {
		console.log("Starting up puppeteer...");

		this.browser = await puppeteer.launch({
			args: DefaultChromeArgs(),
			headless: "new"
		});

		const browserVersion = await this.browser.version();
		console.log(`Puppeteer started, running chrome ${browserVersion}`);
	}

	private async parseSite(siteEvent:SqsSiteEvent) {
		console.log(`Parsing website ${siteEvent.site}`);

		let site = await this.database.getWebsite(siteEvent.site);
		if(!site) {
			console.error(`Site ${siteEvent.site} doesn't exist in the database, aborting`);
			return;
		}

		console.log("Navigating to page in browser...");

		const page = await this.browser.newPage();

		await page.setViewport({width: 1920, height: 1080});
		await page.goto(siteEvent.site, {waitUntil: "load", timeout: 30000});

		const content = await page.content();
		const screenshot = await page.screenshot({fullPage: true}) as Buffer;

		await page.close();

		console.log("Done with page, uploading changes");

		const changeID = uuidV4();

		await this.s3.putObject({
			Bucket: this.configPath,
			Key: `content/${changeID}.html`,
			Body: content
		}).promise();

		await this.s3.putObject({
			Bucket: this.configPath,
			Key: `content/${changeID}.png`,
			Body: screenshot
		}).promise();

		console.log("All done, updating database");

		const time = new Date().getTime();

		site.updates.push({
			time,
			id: changeID
		});

		site.lastCheck = time;
		await this.database.putWebsite(site);

		await this.queueWebsiteCheck(site);
	}

	private async queueWebsiteCheck(site:SiteConfig) {
		if(!Utils.isProduction) {
			console.log(`Would have queued ${site} to be checked, but this isn't production.`);
			return;
		}

		await this.sqs.sendMessage({
			QueueUrl: process.env.CHANGE_QUEUE_NAME,
			MessageBody: JSON.stringify(site)
		}).promise();
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;