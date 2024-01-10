import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {ChangeDetector} from "../../util/change-detector";
import {Parsed} from "../../util/parsed-html";
import {DetectChangesData} from "../../util/detect-changes-data";
import {ChangeOptions, SiteRevision, SiteRevisionState} from "website-alerter-shared";

/**
 * Lambda step function task that checks HTML {@link SiteRevision} downloaded into S3 for changes. If there are any
 * changes they will be put into a unified diff and uploaded to S3 for the user to check later.
 */
class DetectChanges extends LambdaBase {

	/**
	 * Entry point from the state machine
	 * @param data data from the previous step that contains information about the revision to check
	 */
	public handler:Handler<DetectChangesData> = async(data) => {
		console.log(`Checking for changes in ${JSON.stringify(data)}.`);

		await this.setupServices();

		//check the site and see if it changed since last time
		const finalState = await this.checkSite(data);

		console.log(`Updating final state...`);

		await this.database.updateSiteRevision(data.siteID, data.revisionID, finalState);

		console.log("Done.");
	}

	/**
	 * Check the current site and see if it has changed since the last {@link SiteRevision}
	 * @param data data from the previous step that contains information about the revision to check
	 * @returns what the final {@link SiteRevisionState} of the {@link SiteRevision} should be.
	 */
	private async checkSite(data:DetectChangesData):Promise<SiteRevisionState> {
		//Get the site that is being checked and make sure it exists
		const site = await this.database.getSite(data.siteID);
		if(!site) {
			throw new Error(`Failed to find site from revision ${site.siteID}`);
		}

		console.log(`Checking the download ${site.site} for changes...`);

		//get the revision that was just polled and make sure it exists
		const currentRevision = await this.database.getSiteRevision(data.revisionID);
		if(!currentRevision) {
			throw new Error(`Failed to find ${data.revisionID} revision in the database.`);
		}

		//make sure that the site was actually polled (we don't care if we're recomputing)
		if(currentRevision.siteState == SiteRevisionState.Open) {
			console.warn(`Could not check ${data.revisionID} since it was not polled`);
			return SiteRevisionState.Open;
		}

		//get the last successful revision in the database
		const lastRevision = await this.database.getSiteRevisionAfter(data.siteID, currentRevision.time);

		//if there aren't enough revisions yet then abort
		if(!lastRevision) {
			console.log("Website has too few updates, skipping.");
			return SiteRevisionState.Unchanged;
		}

		console.log(`Comparing current:${currentRevision.revisionID} (${new Date(currentRevision.time)}) to ` +
			`last:${lastRevision.revisionID} (${new Date(lastRevision.time)})...`);

		//get the current HTML revision and the previous
		const current = await this.getContent(currentRevision, site.options);
		const last = await this.getContent(lastRevision, site.options);

		console.log(`Getting content changes (ignore ${site.options ? JSON.stringify(site.options) : "unset"})`);

		//detect changes in the versions
		const detection = new ChangeDetector(last, current);

		//If there are no changes
		if(!detection.isChanged) {
			console.log("Found no differences, moving on");
			return SiteRevisionState.Unchanged;
		}

		//if there are changes upload the diff to S3
		const s3Key = `content/${current.revision.revisionID}.diff`

		console.log(`Found differences, uploading to s3://${this.configPath}/${s3Key}`);

		await this.s3.send(new PutObjectCommand({
			Bucket: this.configPath,
			Key: s3Key,
			Body: detection.body
		}));

		//return that there are changes
		return SiteRevisionState.Changed;
	}

	/**
	 * Retrieve the relevant HTML from S3
	 * @param revision the revision of HTML and where it is located
	 * @param options options for detecting changes on the page
	 * @returns the parsed HTML and the revision
	 */
	private async getContent(revision:SiteRevision, options?:ChangeOptions):Promise<Parsed> {
		//get the html from S3
		const s3Result = await this.s3.send(new GetObjectCommand({
			Bucket: this.configPath,
			Key: `content/${revision.revisionID}.html`
		}));

		//get the html string
		const html = await s3Result.Body.transformToString("utf8");

		//return the html and pretty print it
		return new Parsed(revision, html, options);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new DetectChanges().handler;