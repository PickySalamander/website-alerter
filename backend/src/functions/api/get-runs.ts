import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import {RunThrough} from "website-alerter-shared";

/**
 * Get all the {@link RunThrough}'s for the client
 */
export class GetRuns extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		await this.setupServices();

		console.log(`Getting runs for user ${user.userID}`);

		//get all the runs
		const runs = await this.database.getRunThroughs();

		console.log(`Returning ${runs.length} runs.`);

		return {
			statusCode: 200,
			body: JSON.stringify(runs)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRuns().handler);