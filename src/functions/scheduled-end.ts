import {EventBridgeEvent, EventBridgeHandler, SQSEvent, SQSHandler} from "aws-lambda";
import {LambdaBase} from "../util/lambda-base";

class ScheduledEnd extends LambdaBase {
	public handler:SQSHandler = async(event:SQSEvent) => {
		console.log("Performing maintenance");

		console.log(`Here ${JSON.stringify(event)}`);

		await this.setupServices();

		console.log("Done.")
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;