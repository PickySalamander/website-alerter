import {EventBridgeHandler} from "aws-lambda";
import {SQS} from "aws-sdk";
import {Utils} from "../util/utils";
import {LambdaBase} from "../util/lambda-base";

class ScheduledStart extends LambdaBase {
	public handler:EventBridgeHandler<string, any, void> = async() => {
		console.log("Starting scheduled queuing of websites");

		const queueUrl = process.env.WEBSITE_QUEUE_NAME;
		if(!queueUrl && Utils.isProduction) {
			console.error("Failed to find queue URL for sending to SQS in environmental variables.");
			return;
		}

		await this.setupServices();

		await this.queueSiteChecks(queueUrl);

		console.log("Done.");
	}

	private async queueSiteChecks(queueUrl:string) {
		console.log(`Queueing ${this.config.websites.length} websites to ${queueUrl} be checked.`);

		for(const siteConfig of this.config.websites) {
			let siteItem = await this.database.getWebsite(siteConfig.site);
			if(!siteItem) {
				console.log(`Site ${siteConfig.site} doesn't exist yet, adding to database`);

				siteItem = {
					site: siteConfig.site,
					lastCheck: 0,
					updates: []
				};

				await this.database.putWebsite(siteItem);
			}

			if(!Utils.isProduction) {
				console.log(`Would have queued ${siteConfig.site} to be checked, but this isn't production.`);
				continue;
			}

			await this.sqs.sendMessage({
				QueueUrl: queueUrl,
				MessageBody: JSON.stringify(siteConfig)
			}).promise();
		}
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;