import {SQSEvent, SQSHandler} from "aws-lambda";
import {ConfigurationService, SiteConfig} from "../services/configuration.service";
import {DatabaseService} from "../services/database.service";
import puppeteer, {Browser} from "puppeteer";

class ProcessSite {
	private config:ConfigurationService;
	private database:DatabaseService;

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
			this.config = new ConfigurationService();
		}

		for(const record of event.Records) {
			const siteInfo = JSON.parse(record.body) as SiteConfig;
			await this.parseSite(siteInfo);
		}

		console.log("Done.");
	}

	private async parseSite(siteConfig:SiteConfig) {
		console.log(`Parsing website ${siteConfig.site}`);

		let site = await this.database.getWebsite(siteConfig.site);
		if(!site) {
			console.log("This is a new website, setting up");

			site = {
				site: siteConfig.site,
				lastCheck: 0
			};
		}

		let browser:Browser;

		try {

			browser = await puppeteer.launch({
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--single-process'
				],
				headless: "new"
			});

			const browserVersion = await browser.version()
			console.log(`Started ${browserVersion}`);

		} finally {
			await browser?.close();
		}

		console.log("All done, updating database");

		site.lastCheck = new Date().getTime();
		await this.database.putWebsite(site);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;