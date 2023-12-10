import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {WebsiteItemRequest} from "website-alerter-shared";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";

export class PutSite extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		const user = event.requestContext.authorizer as UserJwt;

		const newSite = JSON.parse(event.body) as WebsiteItemRequest;
		console.log(`User "${user.userID}" adding site ${newSite.site}`);

		await this.setupServices();

		const newSiteItem = Object.assign(newSite, {userID: user.userID});

		await this.database.putWebsite(newSiteItem);

		return {
			statusCode: 204,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors("PUT"))
	.handler(new PutSite().handler);