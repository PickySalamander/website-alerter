import {SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../util/lambda-base";
import {SiteRunState, WebsiteCheck} from "../services/database.service";
import {SqsSiteEvent} from "../util/sqs-site-event";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {ChangeDetector} from "../util/change-detector";
import {DetectorIgnore, Parsed} from "../util/parsed-html";

/**
 * Lambda function that checks HTML revisions downloaded into S3 for changes. If there are any changes they will be put
 * into a unified diff and uploaded to S3 for the user to check later.
 */
class DetectChanges extends LambdaBase {
	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log(`Checking for changes in ${event.Records.length} websites`);

		if(event.Records.length == 0) {
			console.error("No records on event");
			return;
		}

		await this.setupServices();

		//go through each site that was sent on the queue
		for(const record of event.Records) {
			const siteEvent = JSON.parse(record.body) as SqsSiteEvent;
			await this.checkSite(siteEvent);
		}

		console.log("Done.")
	}

	/**
	 * Check a site from the SQS queue
	 * @param siteEvent the event with the site and run ID from SQS
	 */
	private async checkSite(siteEvent:SqsSiteEvent) {
		console.log(`Checking the download ${siteEvent.site} from run ${siteEvent.runID} for changes...`);

		//get the site's revisions and info from the database
		let site = await this.database.getWebsite(siteEvent.site);
		if(!site) {
			console.error(`Site ${siteEvent.site} doesn't exist in the database, aborting`);
			return;
		}

		console.log("Getting content changes");

		//if there aren't enough revisions yet then abort
		if(site.updates.length < 2) {
			console.log("Website has too few updates, skipping.");
			return;
		}

		//get the current site config for the ignore
		const siteConfig = this.configService.getConfig(site.site);

		//get the current HTML revision and the previous
		const current = await this.getContent(site.updates[site.updates.length - 1], siteConfig.ignore);
		const last = await this.getContent(site.updates[site.updates.length - 2], siteConfig.ignore);

		//detect changes in the versions
		const detection = new ChangeDetector(last, current);

		//If there are no changes then update the database and finish up
		if(!detection.isChanged) {
			console.log("Found no differences, moving on");

			//update the database that there aren't changes
			await this.database.updateRunSiteState(siteEvent.runID, siteEvent.site, SiteRunState.Complete);
			return;
		}

		//if there are changes upload the diff to S3
		const s3Key = `content/${current.revision.id}.diff`

		console.log(`Found differences, uploading to s3://${this.configPath}/${s3Key}`);

		await this.s3.send(new PutObjectCommand({
			Bucket: this.configPath,
			Key: s3Key,
			Body: detection.body
		}));

		//update the database that there are changes
		await this.database.updateRunSiteState(siteEvent.runID, siteEvent.site, SiteRunState.Complete,
			current.revision.id);
	}

	/**
	 * Retrieve the relevant HTML from S3
	 * @param revision the revision of HTML and where it is located
	 * @param ignore changes to ignore
	 * @return the parsed HTML and the revision
	 */
	private async getContent(revision:WebsiteCheck, ignore?:DetectorIgnore):Promise<Parsed> {
		//get the html from S3
		const s3Result = await this.s3.send(new GetObjectCommand({
			Bucket: this.configPath,
			Key: `content/${revision.id}.html`
		}));

		//get the html string
		const html = await s3Result.Body.transformToString("utf8");

		//return the html and pretty print it
		return new Parsed(revision, html, ignore);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new DetectChanges().handler;