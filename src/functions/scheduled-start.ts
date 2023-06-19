import {EventBridgeHandler} from "aws-lambda";
import {SQS} from "aws-sdk";
import {ConfigurationService} from "../services/configuration.service";
import {Utils} from "../util/utils";

class ScheduledStart {
	public handler:EventBridgeHandler<string, any, void> = async() => {
		console.log("Starting scheduled queuing of websites");

		const queueUrl = process.env.WEBSITE_QUEUE_NAME;
		if(!queueUrl && Utils.isProduction) {
			console.error("Failed to find queue URL for sending to SQS in environmental variables.");
			return;
		}

		const config = await new ConfigurationService().load();

		if(!Utils.isProduction) {
			console.log(`Would have queued ${config.websites.length} websites to be checked, but this isn't production.`);
			return;
		}

		const sqs = new SQS();

		console.log(`Queueing ${config.websites.length} websites to ${queueUrl} be checked.`);

		for(const site of config.websites) {
			await sqs.sendMessage({
				QueueUrl: queueUrl,
				MessageBody: JSON.stringify(site)
			}).promise();
		}

		console.log("Done.");
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;