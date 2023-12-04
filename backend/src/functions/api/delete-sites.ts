import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {GatewayResponses} from "../../util/gateway-responses";
import {WebsiteItemRequest} from "../../../../shared/src/util/website-item-request";
import {UserJwt} from "../../util/user-jwt";

export class DeleteSites extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			return GatewayResponses.badRequestError("Body was not specified");
		}

		const user = event.requestContext.authorizer as UserJwt;

		const toDelete = <string[]>JSON.parse(event.body);
		console.log(`User "${user.userID}" wants to delete ${toDelete.length} sites.`);

		await this.setupServices();

		await this.database.deleteSites(user.userID, toDelete);

		return {
			statusCode: 200,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new DeleteSites().handler;