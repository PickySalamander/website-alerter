import {LambdaBase} from "../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {GatewayResponses} from "../util/gateway-responses";
import {WebsiteItemRequest} from "../../../shared/src/util/website-item-request";
import {UserJwt} from "../util/user-jwt";

export class PutSite extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			return GatewayResponses.badRequestError("Body was not specified");
		}

		const user = event.requestContext.authorizer as UserJwt;

		const newSite = JSON.parse(event.body) as WebsiteItemRequest;
		console.log(`User ${user.userID} adding site ${newSite.site}`);

		await this.setupServices();

		await this.database.putWebsite({
			userID: user.userID,
			site: newSite.site,
			options: newSite.options,
			selector: newSite.selector
		});

		return {
			statusCode: 200,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new PutSite().handler;