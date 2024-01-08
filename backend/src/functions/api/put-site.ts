import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {WebsiteItem, WebsiteItemRequest} from "website-alerter-shared";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";
import {v4} from "uuid";
import {HttpMethod} from "../../util/http-method";

export class PutSite extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		//TODO check duplicates?

		const user = event.requestContext.authorizer as UserJwt;

		const isNewSite = event.httpMethod.toUpperCase() == HttpMethod.Put;

		const siteRequest = JSON.parse(event.body) as WebsiteItemRequest;

		console.log(`User "${user.userID}" ${isNewSite ? "adding" : "updating"} site ${siteRequest.site}`);

		await this.setupServices();

		const siteItem:WebsiteItem = Object.assign(siteRequest, {
			siteID: isNewSite ? v4() : siteRequest.siteID,
			enabled: siteRequest.enabled,
			created: new Date().getTime()
		});

		if(isNewSite) {
			await this.database.putWebsite(siteItem);
		} else {
			await this.database.editWebsite(siteItem);
		}

		return {
			statusCode: 200,
			body: JSON.stringify(siteItem)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Put, HttpMethod.Post))
	.handler(new PutSite().handler);