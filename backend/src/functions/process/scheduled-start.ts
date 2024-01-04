import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {v4} from "uuid";
import {RunThroughState} from "website-alerter-shared/dist/util/run-through";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will go through a JSON
 * config file in S3 and queue up sites into SQS for checking.
 */
class ScheduledStart extends LambdaBase {
	public handler:Handler<StartingData, StartingOutput> = async(data) => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		const sites = await this.database.getSitesForRun();

		const runID = v4();
		await this.database.putRunThrough({
			runID: runID,
			executionID: data.executionID,
			time: new Date().getTime(),
			sites,
			runState: RunThroughState.Open
		})

		console.log(`Starting new run ${runID} and queueing ${sites.length} sites.`);

		return {
			runID,
			sites
		};
	}
}

interface StartingData {
	executionID:string;
}

interface StartingOutput {
	runID:string;
	sites:string[];
}


// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;