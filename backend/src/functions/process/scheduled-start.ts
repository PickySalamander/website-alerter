import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {v4} from "uuid";
import {ChangeFrequency, RunScheduling} from "website-alerter-shared";
import {RunThroughState} from "website-alerter-shared/dist/util/run-through";
import {EnvironmentVars} from "../../util/environment-vars";
import {GetItemsData, ScheduledStartData} from "../../util/step-data";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will go through a JSON
 * config file in S3 and queue up sites into SQS for checking.
 */
class ScheduledStart extends LambdaBase {
	public handler:Handler<void, ScheduledStartData> = async() => {
		console.log("Starting scheduled queuing of websites");

		await this.setupServices();

		const frequencies = RunScheduling.shouldRun();
		if(EnvironmentVars.isAlwaysRunSemiWeekly && frequencies.length == 0) {
			frequencies.push(ChangeFrequency.SemiWeekly);
		}

		const runID = v4();
		await this.database.putRunThrough({
			runID: runID,
			time: new Date().getTime(),
			runState: RunThroughState.Open
		})

		const shouldRun:GetItemsData[] =
			frequencies.map(value => ({ frequency: value, runID: runID }));

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