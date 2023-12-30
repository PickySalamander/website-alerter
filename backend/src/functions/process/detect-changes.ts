import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {ChangeDetector} from "../../util/change-detector";
import {Parsed} from "../../util/parsed-html";
import {RevisionToProcess} from "../../util/step-data";
import {ChangeOptions, SiteRevision, SiteRevisionState} from "website-alerter-shared";

/**
 * Lambda function that checks HTML revisions downloaded into S3 for changes. If there are any changes they will be put
 * into a unified diff and uploaded to S3 for the user to check later.
 */
class DetectChanges extends LambdaBase {
	public handler:Handler<RevisionToProcess, RevisionToProcess> = async(toProcess) => {
		console.log(`Checking for changes in ${JSON.stringify(toProcess)}.`);

		await this.setupServices();

		const finalState = await this.checkSite(toProcess);

		console.log(`Updating final state...`);

		await this.database.updateSiteRevision(toProcess.revisionID, finalState);

		await this.database.updateSiteStatus(toProcess.siteID, {
			time: new Date().getTime(),
			runID: toProcess.runID,
			revisionID: toProcess.revisionID,
			state: finalState
		});

		console.log("Done.");

		return toProcess;
	}

	private async checkSite(toProcess:RevisionToProcess):Promise<SiteRevisionState> {
		const site = await this.database.getSite(toProcess.siteID);
		if(!site) {
			throw new Error(`Failed to find site from revision ${site.siteID}`);
		}

		console.log(`Checking the download ${site.site} for changes...`);

		const currentRevision = await this.database.getSiteRevision(toProcess.revisionID);
		if(!currentRevision) {
			throw new Error(`Failed to find ${toProcess.revisionID} revision in the database.`);
		}

		if(currentRevision.siteState == SiteRevisionState.Open) {
			console.warn(`Could not check ${toProcess.revisionID} since it was not polled`);
			return SiteRevisionState.Open;
		}

		const lastRevision = await this.database.getSiteRevisionAfter(currentRevision);

		//if there aren't enough revisions yet then abort
		if(!lastRevision) {
			console.log("Website has too few updates, skipping.");

			//update the database that there aren't changes

			return SiteRevisionState.Unchanged;
		}

		console.log(`Comparing current:${currentRevision.revisionID} to last:${lastRevision.revisionID}...`);

		//get the current HTML revision and the previous
		const current = await this.getContent(currentRevision, site.options);
		const last = await this.getContent(lastRevision, site.options);

		console.log(`Getting content changes (ignore ${site.options ? JSON.stringify(site.options) : "unset"})`);

		//detect changes in the versions
		const detection = new ChangeDetector(last, current);

		//If there are no changes then update the database and finish up
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

		//update the database that there are changes
		return SiteRevisionState.Changed;
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