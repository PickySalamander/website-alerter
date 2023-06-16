import {EventBridgeHandler} from "aws-lambda";

class ScheduledStart {
	public handler:EventBridgeHandler<string, any, void> = async() => {
		console.log("Starting scheduled queuing of websites");
	}
}

export const handler = new ScheduledStart().handler;