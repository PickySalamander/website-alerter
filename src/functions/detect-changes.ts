import {SQSEvent, SQSHandler} from "aws-lambda";
import {Browser} from "puppeteer";
import {LambdaBase} from "../util/lambda-base";
import {WebsiteCheck} from "../services/database.service";
import parse from "node-html-parser";
import {SqsSiteEvent} from "../util/sqs-site-event";
import {createPatch, createTwoFilesPatch, parsePatch, structuredPatch} from "diff";

class DetectChanges extends LambdaBase {
	private browser:Browser;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Checking for changes in ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		await this.setupServices();

		for(const record of event.Records) {
			const siteEvent = JSON.parse(record.body) as SqsSiteEvent;
			await this.checkSite(siteEvent);
		}

		console.log("Done.")
	}

	private async checkSite(siteEvent:SqsSiteEvent) {
		console.log(`Checking the download from ${siteEvent.site} for changes...`);

		let site = await this.database.getWebsite(siteEvent.site);
		if(!site) {
			console.error(`Site ${siteEvent.site} doesn't exist in the database, aborting`);
			return;
		}

		const siteConfig = this.configService.getConfig(siteEvent.site);
		if(!siteConfig) {
			console.error(`Site ${siteEvent.site} doesn't exist in the config, aborting`);
			return;
		}

		console.log("Getting content changes");

		if(site.updates.length < 2) {
			console.log("Website has too few updates, skipping.");
			return;
		}

		const currentRev = site.updates[site.updates.length - 1];
		const lastRev = site.updates[site.updates.length - 2];

		const currentCheck = await this.getContent(currentRev);
		const lastCheck = await this.getContent(lastRev);

		const selector = siteConfig.selector ?? "body";
		const currentSelect = currentCheck.querySelector(selector);
		const lastSelect = lastCheck.querySelector(selector);

		if(!currentSelect || !lastSelect) {
			console.error(`Failed to query either current or last revision with the selector "${selector}"`);
			//TODO send email about this
			return;
		}

		const differenceBody = createTwoFilesPatch(
			"old.html",
			"new.html",
			lastSelect.toString(),
			currentSelect.toString(),
			new Date(lastRev.time).toString(),
			new Date(currentRev.time).toString(),
			{
				ignoreCase: true,
				ignoreWhitespace: true
			});

		const difference = parsePatch(differenceBody);

		if(difference[0].hunks.length == 0) {
			console.log("Found no differences, moving on");
			return;
		}

		//TODO send email

		console.log(`Found differences, uploading to s3://${this.configPath}/content/${currentRev.id}.diff`);

		await this.s3.putObject({
			Bucket: this.configPath,
			Key: `content/${currentRev.id}.diff`,
			Body: differenceBody
		}).promise();
	}

	private async getContent(revision:WebsiteCheck) {
		const s3Result = await this.s3.getObject({
			Bucket: this.configPath,
			Key: `content/${revision.id}.html`
		}).promise();

		const html = s3Result.Body.toString("utf-8");
		return parse(html);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new DetectChanges().handler;