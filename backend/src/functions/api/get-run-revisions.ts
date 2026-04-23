import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {RunThrough, SiteRevision} from "website-alerter-shared";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Get all the {@link SiteRevision} in a {@link RunThrough} for the client
 */
export class GetRunRevisions extends ApiLambda {
	protected async handle(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> {
		//the requested run ID from the path
		const runID = event.pathParameters.runID;

		console.log(`Getting run ${runID} revisions for user ${this.user.sub}`);

		//make sure the run exists
		const run = await this.database.getRunThrough(runID);
		if(!run) {
			throw createError.BadRequest(`Run ${runID} not found`);
		}

		//get all the revisions
		const revisions = await this.database.getSiteRevisionsInRun(runID);

		console.log(`Returning ${revisions.length} runs.`);

		return {
			statusCode: 200,
			body: JSON.stringify(revisions)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRunRevisions().handler);
