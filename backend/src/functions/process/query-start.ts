import {Handler} from "aws-lambda";
import {LambdaBase} from "../../util/lambda-base";
import {ScheduledStartData} from "../../util/scheduled-start-data";
import {SiteToProcess} from "../../util/site-to-process";
import {QueryCommandOutput} from "@aws-sdk/lib-dynamodb";

class QueryStart extends LambdaBase {
	public handler:Handler<ScheduledStartData> = async(data) => {
		console.log(`Starting querying of sites ${data.frequency} to run ${data.runID}.`);

		await this.setupServices();

		const response = await this.database.getAllSites(data.frequency, data.lastEvaluatedKey);

		const items:SiteToProcess[] = this.convertItems(data.runID, response);

		return {
			items,
			count: items.length,
			lastEvaluatedKey: response.LastEvaluatedKey
		};
	}

	private convertItems(runID:string, response:QueryCommandOutput):SiteToProcess[] {
		if(response.Items && response.Items.length > 0) {
			return response.Items.map(value => ({
				runID,
				siteID: value.siteID
			}));
		}

		return [];
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new QueryStart().handler;