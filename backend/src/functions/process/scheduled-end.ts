import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {getOrderedSiteRevisions, RunThroughState, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {EnvironmentVars} from "../../util/environment-vars";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DeleteObjectCommand} from "@aws-sdk/client-s3";

class ScheduledEnd extends LambdaBase {
	private sns:SNSClient;

	private runID:string;

	private sites:Map<string, WebsiteItem>;

	private waiting:Promise<any>[];

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
		const maintenance = new Set<string>();

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

			if(Object.keys(site.updates).length > EnvironmentVars.numRevisions) {
				maintenance.add(site.siteID);
			}
		}

		await this.sendEmail(changed, errored);

		await this.database.updateRunState(data.runID, RunThroughState.Complete);

		this.waiting = [];
		await this.performMaintenance(maintenance);

		console.log("Waiting for final tasks to finish");
		await Promise.all(this.waiting);
	}

	private async sendEmail(changed:Set<string>, errored:Set<string>) {
		//set up the email to send
		let email = `Finished run through ${this.runID} of ${this.sites.size} sites. Output follows:\n\n`;

		email += `\tChanged: ${changed.size}\n\tErrored:${errored.size}`;

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
	private async performMaintenance(maintenance:Set<string>) {
		console.log(`Performing maintenance of ${maintenance.size} sites`);

		//got through each site in the config
		for(const siteID of maintenance) {
			//get the site from the database
			const website = this.sites.get(siteID);

			const orderedUpdates = getOrderedSiteRevisions(website);

			const numDelete = orderedUpdates.length - EnvironmentVars.numRevisions;
			const revisionsToDelete:string[] = []

			console.log(`Deleting ${numDelete} old updates from site ${website.siteID}`);

			//preform delete operations by deleting them from S3
			for(let i = 0; i < numDelete; i++) {
				const toDelete = orderedUpdates.shift().revisionID;
				console.log(`Deleting revision ${toDelete}`);

				this.waiting.push(this.deleteObject(toDelete, "diff"));
				this.waiting.push(this.deleteObject(toDelete, "png"));
				this.waiting.push(this.deleteObject(toDelete, "html"));

				revisionsToDelete.push(toDelete);
			}

			//update the database with less revisions
			this.waiting.push(this.database.deleteRevisions(siteID, revisionsToDelete));
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

interface ScheduledEndData {
	runID:string;
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;