import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";

export class DeleteSites extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		const user = event.requestContext.authorizer as UserJwt;

		const toDelete = <string[]>JSON.parse(event.body);
		console.log(`User "${user.userID}" wants to delete ${toDelete.length} sites.`);

		await this.setupServices();

		await this.database.deleteSites(user.userID, toDelete);

		return {
			statusCode: 204,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors("DELETE"))
	.handler(new DeleteSites().handler);