import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {ScheduledEndData, ScheduledStartData} from "../../util/step-data";
import {RunThroughState} from "website-alerter-shared";

class ScheduledEnd extends LambdaBase {
	public handler:Handler<ScheduledEndData> = async(data) => {
		console.log(`Ending run ${data.runID}`);

		await this.setupServices();

		await this.database.updateRunState(data.runID, RunThroughState.Complete);
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledEnd().handler;