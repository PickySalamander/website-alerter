import {SQSEvent, SQSHandler} from "aws-lambda";
import {ConfigurationService, SiteConfig} from "../services/configuration.service";
import {DatabaseService} from "../services/database.service";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

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
				lastCheck: undefined
			};
		}

		chromium.setHeadlessMode = true;
		chromium.setGraphicsMode = false;

		const browser = await puppeteer.launch({
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			executablePath: await chromium.executablePath(),
			headless: chromium.headless,
		})

		site.lastCheck = new Date().getTime();
		await this.database.putWebsite(site);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ProcessSite().handler;