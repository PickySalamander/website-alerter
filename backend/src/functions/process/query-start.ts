import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {ScheduledStartData} from "../../util/scheduled-start-data";
import {SiteToProcess} from "../../util/site-to-process";
import {QueryCommandOutput} from "@aws-sdk/lib-dynamodb";

/**
 * Start the entire flow of polling websites for changes. Called from EventBridge, this function will go through a JSON
 * config file in S3 and queue up sites into SQS for checking.
 */
class ScheduledStart extends LambdaBase {
	public handler:Handler<ScheduledStartData> = async(data) => {
		console.log(`Starting querying of sites ${data.frequency} to run ${data.runID}.`);

		await this.setupServices();

		const response = await this.database.getAllSites(data.frequency, data.lastEvaluatedKey);

		const items:SiteToProcess[] = this.convertItems(data.runID, response);

		return {
			items,
			count: response.Count,
			lastEvaluatedKey: response.LastEvaluatedKey
		};
	}

	private convertItems(runID:string, response:QueryCommandOutput):SiteToProcess[] {
		if(response.Items && response.Items.length > 0) {
			return response.Items.map(value =>
				<SiteToProcess>Object.assign({runID}, value));
		}

		return [];
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new ScheduledStart().handler;