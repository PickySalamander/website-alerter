import {SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../util/lambda-base";
import {RunThroughState, SiteRunState} from "../services/database.service";
import {SNS} from "aws-sdk";
import {Utils} from "../util/utils";

class ScheduledEnd extends LambdaBase {
	private sns:SNS;

	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log("Performing maintenance");

		await this.setupServices();

		for(const record of event.Records) {
			const endEvent = JSON.parse(record.body) as { runID:string };
			await this.processEnd(endEvent.runID);
		}

		await this.performMaintenance();

		console.log("Done.")
	}

	private async processEnd(runID:string) {
		console.log(`Processing the end of run ${runID}`);

		const runThrough = await this.database.getRunThrough(runID);
		const sites = Object.entries(runThrough.sites);

		let email = `Finished run through of ${sites.length} sites. Output follows:\n\n`;

		let finalState:RunThroughState = RunThroughState.Complete;

		for(const [site, run] of sites) {
			email += `${site}: `;

			switch(run.siteState) {
				case SiteRunState.Open:
					email += "OPEN\n\tPolling the website failed.";
					finalState = RunThroughState.Expired;
					break;
				case SiteRunState.Polled:
					email += "POLLED\n\tDetecting changes on the website failed.";
					finalState = RunThroughState.Expired;
					break;
				case SiteRunState.Complete:
					email += "COMPLETE\n";

					if(run.revision) {
						const url = `https://s3.console.aws.amazon.com/s3/object/${this.configPath}?region=us-east-1&prefix=content/${run.revision}.diff`;
						email += `\tA change was detected, view the change here: ${url}`;
					} else {
						email += `\tNo changes detected`;
					}

					break;
			}

			email += "\n\n";
		}

		if(Utils.isProduction) {
			if(!this.sns) {
				this.sns = new SNS();
			}

			console.log("Sending email");

			await this.sns.publish({
				TopicArn: process.env.NOTIFICATION_SNS,
				Subject: `Finished website changes check ${runID}`,
				Message: email
			}).promise();
		} else {
			console.log(`This isn't production otherwise would have emailed:\n\n${email}`)
		}

		await this.database.updateRunState(runID, finalState);
	}

	private async performMaintenance() {
		console.log("Performing maintenance");

		for(const siteConfig of this.config.websites) {
			const website = await this.database.getWebsite(siteConfig.site);

			if(website.updates.length > this.config.numRevisions) {
				const numDelete = website.updates.length - this.config.numRevisions;

				console.log(`Deleting ${numDelete} old updates from site ${siteConfig.site}`);

				for(let i=0; i<numDelete; i++) {
					const toDelete = website.updates.shift();
					console.log(`Deleting revision ${toDelete.id}`);

					await this.deleteObject(toDelete.id, "diff");
					await this.deleteObject(toDelete.id, "png");
					await this.deleteObject(toDelete.id, "html");
				}

				await this.database.putWebsite(website);
			}
		}
	}

	private async deleteObject(id:string, ext:string) {
		try {
			await this.s3.deleteObject({
				Bucket: this.configPath,
				Key: `content/${id}.${ext}`
			}).promise();
		} catch(e) {
			console.warn(`Failed to delete s3://${this.configPath}/content/${id}.${ext} from s3`);
		}
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;