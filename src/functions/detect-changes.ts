import {SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../util/lambda-base";
import {WebsiteCheck} from "../services/database.service";
import parse, {HTMLElement} from "node-html-parser";
import {SqsSiteEvent} from "../util/sqs-site-event";
import {createTwoFilesPatch, parsePatch} from "diff";
import formatXml from "xml-formatter";

class DetectChanges extends LambdaBase {
	private combinedMessage:string;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Checking for changes in ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		this.combinedMessage = "";

		await this.setupServices();

		for(const record of event.Records) {
			const siteEvent = JSON.parse(record.body) as SqsSiteEvent;
			await this.checkSite(siteEvent);
		}

		if(this.combinedMessage.length > 0) {
			await this.sendNotification("Website Alerter Changes", this.combinedMessage);
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

		const current = await this.getContent(site.updates[site.updates.length - 1], siteConfig.selector);
		const last = await this.getContent(site.updates[site.updates.length - 2], siteConfig.selector);

		if(!current || !last) {
			return;
		}

		const differenceBody = createTwoFilesPatch(
			"old.html",
			"new.html",
			last.formatted,
			current.formatted,
			new Date(last.revision.time).toString(),
			new Date(current.revision.time).toString(),
			{
				ignoreCase: true,
				ignoreWhitespace: true
			});

		const difference = parsePatch(differenceBody);

		if(difference[0].hunks.length == 0) {
			console.log("Found no differences, moving on");
			return;
		}

		const s3Key = `content/${current.revision.id}.diff`

		const url =
			`https://s3.console.aws.amazon.com/s3/object/${this.configPath}?region=us-east-1&prefix=${s3Key}`;
		this.combinedMessage += `Found some differences for ${siteConfig.site}, outputted them here: ${url}`

		console.log(`Found differences, uploading to s3://${this.configPath}/${s3Key}`);

		await this.s3.putObject({
			Bucket: this.configPath,
			Key: s3Key,
			Body: differenceBody
		}).promise();
	}

	private async getContent(revision:WebsiteCheck, selector:string = "body"):Promise<Parsed> {
		const s3Result = await this.s3.getObject({
			Bucket: this.configPath,
			Key: `content/${revision.id}.html`
		}).promise();


		const htmlStr = s3Result.Body.toString("utf-8");
		const parsed = parse(htmlStr);
		let queried = parsed.querySelectorAll(selector);

		if(queried.length > 1) {
			console.warn(`Selector selected too many items ${queried.length}`);
			this.combinedMessage += `WARN: Selector for ${selector} found too many items on revision ${revision.id}.\n`;
			return undefined;
		}

		if(queried.length == 0) {
			console.warn("Nothing was selected");
			this.combinedMessage += `WARN: Selector for ${selector} found no items in revision ${revision.id}.\n`;
			return undefined;
		}

		return {
			revision,
			html: queried[0],
			formatted: formatXml(queried[0].toString())
		};
	}
}

interface Parsed {
	revision:WebsiteCheck;
	formatted:string;
	html:HTMLElement;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new DetectChanges().handler;