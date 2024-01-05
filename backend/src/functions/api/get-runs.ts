import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";

export class GetRuns extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		const user = event.requestContext.authorizer as UserJwt;

		await this.setupServices();

		console.log(`Getting runs for user ${user.userID}`);

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