import {SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../util/lambda-base";
import {SiteRunState} from "../services/database.service";
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

		console.log("Done.")
	}

	private async processEnd(runID:string) {
		console.log(`Processing the end of run ${runID}`);

		const runThrough = await this.database.getRunThrough(runID);
		const sites = Object.entries(runThrough.sites);

		let email = `Finished run through of ${sites.length} sites. Output follows:\n\n`;

		for(const [site, run] of sites) {
			email += `${site}: `;

			switch(run.siteState) {
				case SiteRunState.Open:
					email += "OPEN\n\tPolling the website failed.";
					break;
				case SiteRunState.Polled:
					email += "POLLED\n\tDetecting changes on the website failed.";
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
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;