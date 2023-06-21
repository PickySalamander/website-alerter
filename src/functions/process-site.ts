import {SQSEvent, SQSHandler} from "aws-lambda";
import {ConfigurationService, SiteConfig} from "../services/configuration.service";
import {DatabaseService} from "../services/database.service";
import puppeteer, {Browser} from "puppeteer";
import {DefaultChromeArgs} from "../util/default-chrome-args";
import {v4 as uuidV4} from "uuid";
import {S3} from "aws-sdk";

class ProcessSite {
	private config:ConfigurationService;
	private database:DatabaseService;
	private browser:Browser;
	private s3:S3;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Starting to parse ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		if(!this.database) {
			this.database = new DatabaseService();
		}

		if(!this.config) {
			this.s3 = new S3();
			this.config = new ConfigurationService(this.s3);
		}

		try {
			await this.initializeBrowser();

			for(const record of event.Records) {
				const siteInfo = JSON.parse(record.body) as SiteConfig;
				await this.parseSite(siteInfo);
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

	private async parseSite(siteConfig:SiteConfig) {
		console.log(`Parsing website ${siteConfig.site}`);

		let site = await this.database.getWebsite(siteConfig.site);
		if(!site) {
			console.log("This is a new website, setting up");

			site = {
				site: siteConfig.site,
				lastCheck: 0,
				updates: []
			};
		}

		console.log("Navigating to page in browser...");

		const page = await this.browser.newPage();

		await page.setViewport({width: 1920, height: 1080});
		await page.goto(siteConfig.site, {waitUntil: "load", timeout: 30000});

		const content = await page.content();
		const screenshot = await page.screenshot({fullPage: true}) as Buffer;

		await page.close();

		console.log("Done with page, uploading changes");

		const changeID = uuidV4();

		await this.s3.putObject({
			Bucket: this.config.configPath,
			Key: `content/${changeID}.txt`,
			Body: content
		}).promise();

		await this.s3.putObject({
			Bucket: this.config.configPath,
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
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;