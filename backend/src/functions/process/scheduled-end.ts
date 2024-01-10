import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {
	RunThrough,
	RunThroughState,
	RunThroughStats,
	SiteRevision,
	SiteRevisionState,
	WebsiteItem
} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DeleteObjectCommand} from "@aws-sdk/client-s3";

/**
 * Function that is called when the whole website polling queue is completed successfully. This will email the user
 * via SNS and perform some final maintenance.
 */
class ScheduledEnd extends LambdaBase {
	/** The client to use to notify the user */
	private sns:SNSClient;

	/** The current {@link RunThrough.runID} being run through the state machine */
	private runID:string;

	/** All sites that were polled during this run */
	private sites:Map<string, WebsiteItem>;

	/**
	 * Entry point from the state machine
	 * @param data data from the previous step that contains information about the current {@link RunThrough}
	 */
	public handler:Handler<ScheduledEndData, void> = async(data) => {
		console.log(`Processing the end of run ${data.runID}`);

		await this.setupServices();

		//get the run from the database and make sure it exists
		const runThrough = await this.database.getRunThrough(data.runID);
		if(!runThrough) {
			throw new Error(`Failed to find run ${data.runID}`);
		}

		this.runID = data.runID;

		//get all the site entries in the run and store in a Map for easy lookup
		const siteIDs = new Set<string>(runThrough.sites);
		this.sites =
			new Map((await this.database.getSitesByID(siteIDs)).map(value => [value.siteID, value]));

		//keep track of all the changed and errored sites
		let changed:number = 0;
		let errored:number = 0;

		//go through each site and check its last state
		for(const [, site] of this.sites) {
			//if the site wasn't updated during the last run don't process it
			if(site.last.runID != data.runID) {
				console.warn(`Site ${site.siteID} (${site.site}) was not updated for run ${data.runID}`);
				continue;
			}

			//update the sets
			switch(site.last.siteState) {
				case SiteRevisionState.Open:
				case SiteRevisionState.Polled:
					errored++;
					break;
				case SiteRevisionState.Changed:
					changed++;
					break;
			}
		}

		//email the user
		await this.sendEmail(changed, errored);

		//save the stats on this current run for reporting on the frontend
		const stats:RunThroughStats = {
			unchanged: this.sites.size - (changed + errored),
			changed,
			errored,
		};

		//update the stats and state
		await this.database.updateRunState(data.runID, stats, RunThroughState.Complete);

		//perform any maintenance
		await this.performMaintenance();

		console.log("Done!");
	}

	/**
	 * Email the user on the final status of the {@link RunThrough}
	 * @param changed the number of sites that changed
	 * @param errored the number of sites that errored
	 */
	private async sendEmail(changed:number, errored:number) {
		//set up the email to send
		let email = `Finished run through ${this.runID} of ${this.sites.size} sites. Output follows:\n` +
			`\tChanged: ${changed}\n\tErrored:${errored}\n\n` +
			`\tView changes here: ${EnvironmentVars.websiteUrl}/runs/${this.runID}`;

		//if in production email the user via SNS
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
	 * Preform maintenance by removing old runs if exceeding {@link EnvironmentVars.numRunsAllowed}.
	 */
	private async performMaintenance() {
		console.log(`Performing maintenance...`);

		//get all runs in the database
		let runs = await this.database.getRunThroughs();

		//bail out if there are too many runs
		if(runs.length <= EnvironmentVars.numRunsAllowed) {
			console.log(`Only ${runs.length} revisions out of ${EnvironmentVars.numRunsAllowed} allowed, skipping.`);
			return;
		}

		const numDelete = runs.length - EnvironmentVars.numRunsAllowed;
		console.log(`Deleting ${numDelete} old runs that are over ${EnvironmentVars.numRunsAllowed} allowed runs...`);

		//order the runs by time and get the ones we need to delete by ID
		const runsToDelete:string[] = runs.sort((a, b) => a.time - b.time)
			.slice(0, numDelete)
			.map(value => value.runID);

		//keep track of the revisions to delete
		const revisionsToDelete:string[] = [];

		//got through each run that needs to be deleted
		for(const runID of runsToDelete) {
			console.log(`Deleting run ${runID}...`);

			//get all the revisions in a run and delete their assets
			const revisions = await this.database.getSiteRevisionsInRun(runID);
			for(const revision of revisions) {
				await this.deleteRevisionData(revision.revisionID);
				revisionsToDelete.push(revision.revisionID);
			}
		}

		console.log(`Deleting ${runsToDelete.length} runs and ${revisionsToDelete.length} revisions`);
		await this.database.deleteRunsAndRevisions(runsToDelete, revisionsToDelete);
	}

	/**
	 * Delete all the S3 assets for a revision
	 * @param revisionID the {@link SiteRevision} data to delete
	 */
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

/** Data received from the previous step */
interface ScheduledEndData {
	/** The current {@link RunThrough.runID} being run through the state machine */
	runID:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;