import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {RunThrough, SiteRevision} from "website-alerter-shared";

/**
 * Get all the {@link SiteRevision} in a {@link RunThrough} for the client
 */
export class GetRunRevisions extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		await this.setupServices();

		//the requested run ID from the path
		const runID = event.pathParameters.runID;

		console.log(`Getting run ${runID} revisions for user ${user.userID}`);

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