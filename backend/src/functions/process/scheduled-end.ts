import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {RunThroughState, RunThroughStats, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DeleteObjectCommand} from "@aws-sdk/client-s3";

class ScheduledEnd extends LambdaBase {
	private sns:SNSClient;

	private runID:string;

	private sites:Map<string, WebsiteItem>;

	public handler:Handler<ScheduledEndData, void> = async(data) => {
		console.log(`Processing the end of run ${data.runID}`);

		await this.setupServices();

		//get the run from the database and look at all the site entries
		const runThrough = await this.database.getRunThrough(data.runID);
		if(!runThrough) {
			throw new Error(`Failed to find run ${data.runID}`);
		}

		this.runID = data.runID;

		const siteIDs = new Set<string>(runThrough.sites);
		this.sites =
			new Map((await this.database.getSitesByID(siteIDs)).map(value => [value.siteID, value]));

		const changed = new Set<string>();
		const errored = new Set<string>();

		for(const [, site] of this.sites) {
			if(site.last.runID != data.runID) {
				console.warn(`Site ${site.siteID} (${site.site}) was not updated for run ${data.runID}`);
				continue;
			}

			switch(site.last.siteState) {
				case SiteRevisionState.Open:
				case SiteRevisionState.Polled:
					errored.add(site.siteID);
					break;
				case SiteRevisionState.Changed:
					changed.add(site.siteID);
					break;
			}
		}

		await this.sendEmail(changed, errored);

		const stats:RunThroughStats = {
			unchanged: this.sites.size - (changed.size + errored.size),
			changed: changed.size,
			errored: errored.size
		};

		await this.database.updateRunState(data.runID, stats, RunThroughState.Complete);

		await this.performMaintenance();

		console.log("Done!");
	}

	private async sendEmail(changed:Set<string>, errored:Set<string>) {
		//set up the email to send
		let email = `Finished run through ${this.runID} of ${this.sites.size} sites. Output follows:\n`;

		email += `\tChanged: ${changed.size}\n\tErrored:${errored.size}\n\n`;

		email += `\tView changes here: ${EnvironmentVars.websiteUrl}/runs/${this.runID}`;

		//if in production send an email to the user via SNS
		if(EnvironmentVars.isProduction) {
			if(!this.sns) {
				this.sns = new SNSClient({});
			}

			console.log("Sending email");

			await this.sns.send(new PublishCommand({
				TopicArn: EnvironmentVars.notificationSNS,
				Subject: `Finished website changes check ${this.runID}`,
				Message: email
			}));
		} else {
			console.log(`This isn't production otherwise would have emailed:\n\n${email}`)
		}
	}

	/**
	 * Preform maintenance on all the sites in the database
	 */
	private async performMaintenance() {
		console.log(`Performing maintenance...`);

		let runs = await this.database.getRunThroughs();

		if(runs.length <= EnvironmentVars.numRevisions) {
			console.log(`Only ${runs.length} revisions out of ${EnvironmentVars.numRevisions} allowed, skipping.`);
			return;
		}

		const numDelete = runs.length - EnvironmentVars.numRevisions;
		console.log(`Deleting ${numDelete} old runs that are over ${EnvironmentVars.numRevisions} allowed runs...`);

		const runsToDelete:string[] = runs.sort((a, b) => a.time - b.time)
			.slice(0, numDelete)
			.map(value => value.runID);

		const revisionsToDelete:string[] = [];

		//got through each site in the config
		for(const runID of runsToDelete) {
			console.log(`Deleting run ${runID}...`);

			const revisions = await this.database.getSiteRevisionsInRun(runID);
			for(const revision of revisions) {
				await this.deleteRevisionData(revision.revisionID);
				revisionsToDelete.push(revision.revisionID);
			}
		}

		console.log(`Deleting ${runsToDelete.length} runs and ${revisionsToDelete.length} revisions`);
		await this.database.deleteRunsAndRevisions(runsToDelete, revisionsToDelete);
	}

	private deleteRevisionData(revisionID:string) {
		//preform delete operations by deleting them from S3
		console.log(`Deleting revision ${revisionID} from S3`);

		return Promise.all([
			this.deleteObject(revisionID, "diff"),
			this.deleteObject(revisionID, "png"),
			this.deleteObject(revisionID, "html")
		]);
	}

	/**
	 * Delete an object from S3
	 * @param id the name of the file
	 * @param ext the file name extension of the file
	 */
	private async deleteObject(id:string, ext:string) {
		try {
			await this.s3.send(new DeleteObjectCommand({
				Bucket: this.configPath,
				Key: `content/${id}.${ext}`
			}));
		} catch(e) {
			console.warn(`Failed to delete s3://${this.configPath}/content/${id}.${ext} from s3`);
		}
	}
}

interface ScheduledEndData {
	runID:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;