import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";

export class GetRevision extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		const user = event.requestContext.authorizer as UserJwt;

		const siteID = <string>event.pathParameters.siteID;

		await this.setupServices();

		console.log(`Getting site ${siteID} revisions for user ${user.userID}`);

		const site = await this.database.getSite(siteID);
		const revisions = Object.values(site.updates);

		console.log(`Returning ${revisions.length} revisions`);

		return {
			statusCode: 200,
			body: JSON.stringify(revisions)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRevision().handler);