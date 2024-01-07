import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {RunThrough} from "website-alerter-shared";

export class GetRunRevisions extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		const user = event.requestContext.authorizer as UserJwt;

		await this.setupServices();

		const runID = event.pathParameters.runID;

		console.log(`Getting run ${runID} revisions for user ${user.userID}`);

		const run = await this.database.getRunThrough(runID);
		if(!run) {
			throw createError.BadRequest(`Run ${runID} not found`);
		}

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