import {SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {RunThroughState, SiteRevisionState} from "../../services/database.service";
import {Utils} from "../../util/utils";
import {DeleteObjectCommand} from "@aws-sdk/client-s3";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";

/**
 * Function that is called when the whole website polling queue is supposed to be complete. This will finish up any
 * lingering tasks, email the user via SNS, and perform some final maintenance.
 */
class ScheduledEnd extends LambdaBase {
	/** SNS notifications to send emails through */
	private sns:SNSClient;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log("Performing maintenance");

		await this.setupServices();

		//got through each run in the events and process the end of the flow
		for(const record of event.Records) {
			const endEvent = JSON.parse(record.body) as { runID:string };
			await this.processEnd(endEvent.runID);
		}

		//perform final maintenance by throwing away old revisions
		await this.performMaintenance();

		console.log("Done.")
	}

	/**
	 * Process the end of a run
	 * @param runID the run to finish up
	 */
	private async processEnd(runID:string) {
		console.log(`Processing the end of run ${runID}`);

		//get the run from the database and look at all the site entries
		const runThrough = await this.database.getRunThrough(runID);
		const sites = Object.entries(runThrough.sites);

		//set up the email to send
		let email = `Finished run through of ${sites.length} sites. Output follows:\n\n`;

		//the final state to set in the database
		let finalState:RunThroughState = RunThroughState.Complete;

		//go through each site in the run
		for(const [site, run] of sites) {
			email += `${site}: `;

			switch(run.siteState) {
				//if the site is still in open it means it was never polled by detect-changes
				case SiteRunState.Open:
					email += "OPEN\n\tPolling the website failed.";
					finalState = RunThroughState.Expired;
					break;

				//if the site is polled it was never checked for changes
				case SiteRunState.Polled:
					email += "POLLED\n\tDetecting changes on the website failed.";
					finalState = RunThroughState.Expired;
					break;

				//if complete then add the info to the email if there was a revision or not
				case SiteRunState.Complete:
					email += "COMPLETE\n";

					if(run.revisionID) {
						const url = `https://s3.console.aws.amazon.com/s3/object/${this.configPath}?region=us-east-1&prefix=content/${run.revisionID}.diff`;
						email += `\tA change was detected, view the change here: ${url}`;
					} else {
						email += `\tNo changes detected`;
					}

					break;
			}

			email += "\n\n";
		}

		//if in production send an email to the user via SNS
		if(Utils.isProduction) {
			if(!this.sns) {
				this.sns = new SNSClient({});
			}

			console.log("Sending email");

			await this.sns.send(new PublishCommand({
				TopicArn: process.env.NOTIFICATION_SNS,
				Subject: `Finished website changes check ${runID}`,
				Message: email
			}));
		} else {
			console.log(`This isn't production otherwise would have emailed:\n\n${email}`)
		}

		//set the final run state
		await this.database.updateRunState(runID, finalState);
	}

	/**
	 * Preform maintenance on all the sites in the database
	 */
	private async performMaintenance() {
		console.log("Performing maintenance");

		//got through each site in the config
		for(const siteConfig of this.config.websites) {
			//get the site from the database
			const website = await this.database.getSite(siteConfig.site);

			//if the site has too many revisions, delete the old ones
			if(website && website.updates.length > this.config.numRevisions) {
				const numDelete = website.updates.length - this.config.numRevisions;

				console.log(`Deleting ${numDelete} old updates from site ${siteConfig.site}`);

				//preform delete operations by deleting them from S3
				for(let i = 0; i < numDelete; i++) {
					const toDelete = website.updates.shift();
					console.log(`Deleting revision ${toDelete.revisionID}`);

					await this.deleteObject(toDelete.revisionID, "diff");
					await this.deleteObject(toDelete.revisionID, "png");
					await this.deleteObject(toDelete.revisionID, "html");
				}

				//update the database with less revisions
				await this.database.putWebsite(website);
			}
		}
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

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;