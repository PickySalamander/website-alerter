import {
	RunThrough,
	RunThroughState,
	RunThroughStats,
	SiteRevision,
	SiteRevisionState,
	WebsiteItem
} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {PublishCommand} from "@aws-sdk/client-sns";
import {DurableChild} from "../../util/durable-child";
import {DurableContext} from "@aws/durable-execution-sdk-js";

/**
 * Function that is called when the whole website polling queue is completed successfully. This will email the user
 * via SNS and perform some final maintenance.
 */
export class Cleanup extends DurableChild {
	/** All sites that were polled during this run */
	private sites:Map<string, WebsiteItem>;

	/**
	 * Create the cleanup routine
	 * @param context
	 * @param runID The current {@link RunThrough.runID} being run through
	 */
	constructor(context:DurableContext, private runID:string) {
		super(context);
	}

	async run() {
		this.logger.info(`Processing the end of run ${this.runID}`);

		//get the run from the database and make sure it exists
		const runThrough = await this.database.getRunThrough(this.runID);
		if(!runThrough) {
			throw new Error(`Failed to find run ${this.runID}`);
		}

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
			if(site.last.runID != this.runID) {
				console.warn(`Site ${site.siteID} (${site.site}) was not updated for run ${this.runID}`);
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
		await this.database.updateRunState(this.runID, stats, RunThroughState.Complete);

		//perform any maintenance
		await this.performMaintenance();

		this.logger.info("Done!");
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
			this.logger.info("Sending email");

			await this.sns.send(new PublishCommand({
				TopicArn: EnvironmentVars.notificationSNS,
				Subject: `Finished website changes check ${this.runID}`,
				Message: email
			}));
		} else {
			this.logger.info(`This isn't production otherwise would have emailed:\n\n${email}`)
		}
	}

	/**
	 * Preform maintenance by removing old runs if exceeding {@link EnvironmentVars.numRunsAllowed}.
	 */
	private async performMaintenance() {
		this.logger.info(`Performing maintenance...`);

		//get all runs in the database
		let runs = await this.database.getRunThroughs();

		//bail out if there are too many runs
		if(runs.length <= EnvironmentVars.numRunsAllowed) {
			this.logger.info(`Only ${runs.length} revisions out of ${EnvironmentVars.numRunsAllowed} allowed, skipping.`);
			return;
		}

		const numDelete = runs.length - EnvironmentVars.numRunsAllowed;
		this.logger.info(`Deleting ${numDelete} old runs that are over ${EnvironmentVars.numRunsAllowed} allowed runs...`);

		//order the runs by time and get the ones we need to delete by ID
		const runsToDelete:string[] = runs.sort((a, b) => a.time - b.time)
			.slice(0, numDelete)
			.map(value => value.runID);

		//keep track of the revisions to delete
		const revisionsToDelete:string[] = [];

		//got through each run that needs to be deleted
		for(const runID of runsToDelete) {
			this.logger.info(`Deleting run ${runID}...`);

			//get all the revisions in a run and delete their assets
			const revisions = await this.database.getSiteRevisionsInRun(runID);
			for(const revision of revisions) {
				await this.deleteRevisionData(revision);
				revisionsToDelete.push(revision.revisionID);
			}
		}

		this.logger.info(`Deleting ${runsToDelete.length} runs and ${revisionsToDelete.length} revisions`);
		await this.database.deleteRunsAndRevisions(runsToDelete, revisionsToDelete);
	}

	/**
	 * Delete all the S3 assets for a revision
	 * @param revision the {@link SiteRevision} data to delete
	 */
	private deleteRevisionData(revision:SiteRevision) {
		//preform delete operations by deleting them from S3
		this.logger.info(`Deleting site ${revision.siteID}'s revision ${revision.revisionID} from S3`);

		return Promise.all([
			this.s3.deleteObject(`${revision.siteID}/${revision.revisionID}.diff`),
			this.s3.deleteObject(`${revision.siteID}/${revision.revisionID}.png`),
			this.s3.deleteObject(`${revision.siteID}/${revision.revisionID}.html`)
		]);
	}
}
