import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {ChangeDetector} from "../../util/change-detector";
import {Parsed} from "../../util/parsed-html";
import {SiteToProcess} from "../../util/step-data";
import {ChangeOptions, SiteRevision, SiteRevisionState} from "website-alerter-shared";

/**
 * Lambda function that checks HTML revisions downloaded into S3 for changes. If there are any changes they will be put
 * into a unified diff and uploaded to S3 for the user to check later.
 */
class DetectChanges extends LambdaBase {
	public handler:Handler<SiteToProcess, SiteToProcess> = async(toProcess) => {
		console.log(`Checking for changes in site ${toProcess.siteID}.`);

		await this.setupServices();

		await this.checkSite(toProcess);

		console.log("Done.");

		return toProcess;
	}

	private async checkSite(toProcess:SiteToProcess) {
		const site = await this.database.getSite(toProcess.siteID);
		if(!site) {
			throw new Error(`Failed to find site from revision ${site.siteID}`);
		}

		console.log(`Checking the download ${site.site} from run ${toProcess.runID} for changes...`);

		//TODO check to see if query will ever sort this
		const revisions = (await this.database.getSiteRevisions(site.siteID))
			.sort((a, b) => b.time - a.time);

		const currentRevision = revisions[0];

		//if there aren't enough revisions yet then abort
		if(revisions.length < 2) {
			console.log("Website has too few updates, skipping.");

			//update the database that there aren't changes
			await this.database.updateSiteRevision(currentRevision.revisionID, SiteRevisionState.Unchanged);
			return;
		}

		console.log(`Getting content changes (ignore ${site.options ? JSON.stringify(site.options) : "unset"})`);

		const lastRevision = revisions[1];

		//get the current HTML revision and the previous
		const current = await this.getContent(currentRevision, site.options);
		const last = await this.getContent(lastRevision, site.options);

		console.log(`Comparing current:${currentRevision.revisionID} to last:${lastRevision.revisionID}...`);

		//detect changes in the versions
		const detection = new ChangeDetector(last, current);

		//If there are no changes then update the database and finish up
		if(!detection.isChanged) {
			console.log("Found no differences, moving on");

			//update the database that there aren't changes
			await this.database.updateSiteRevision(currentRevision.revisionID, SiteRevisionState.Unchanged);
			return;
		}

		//if there are changes upload the diff to S3
		const s3Key = `content/${current.revision.revisionID}.diff`

		console.log(`Found differences, uploading to s3://${this.configPath}/${s3Key}`);

		await this.s3.send(new PutObjectCommand({
			Bucket: this.configPath,
			Key: s3Key,
			Body: detection.body
		}));

		//update the database that there are changes
		await this.database.updateSiteRevision(currentRevision.revisionID, SiteRevisionState.Changed);
	}

	/**
	 * Retrieve the relevant HTML from S3
	 * @param revision the revision of HTML and where it is located
	 * @param options options for detecting changes on the page
	 * @return the parsed HTML and the revision
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