import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {v4} from "uuid";
import {ChangeFrequency, RunScheduling} from "website-alerter-shared";
import {RunThroughState} from "website-alerter-shared/dist/util/run-through";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will go through a JSON
 * config file in S3 and queue up sites into SQS for checking.
 */
class ScheduledStart extends LambdaBase {
	public handler:Handler<void, any> = async() => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		const shouldRun = RunScheduling.shouldRun();
		if(process.env.ALWAYS_RUN_SEMI_WEEKLY === "true" && shouldRun.length == 0) {
			shouldRun.push(ChangeFrequency.SemiWeekly);
		}

		const runID = v4();
		await this.database.putRunThrough({
			id: runID,
			time: new Date().getTime(),
			runState: RunThroughState.Open
		})

		console.log(`Starting new run ${runID} and queueing frequencies ${JSON.stringify(shouldRun)}.`);

		return {
			runID,
			shouldRun,
			isEmpty: shouldRun.length == 0
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;