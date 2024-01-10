import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {WebsiteItem, WebsiteItemRequest} from "website-alerter-shared";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";
import {v4} from "uuid";
import {HttpMethod} from "../../util/http-method";

/**
 * Add or edit a {@link WebsiteItem} in the database
 */
export class PutSite extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		//if a PUT method, then this is a new site
		const isNewSite = event.httpMethod.toUpperCase() == HttpMethod.Put;

		//parse the body of the request
		const siteRequest = JSON.parse(event.body) as WebsiteItemRequest;

		console.log(`User "${user.userID}" ${isNewSite ? "adding" : "updating"} site ${siteRequest.site}`);

		await this.setupServices();

		//create a new item for the database (we can trust siteRequest since it is pre-verified by a json schema)
		const siteItem:WebsiteItem = Object.assign(siteRequest, {
			siteID: isNewSite ? v4() : siteRequest.siteID,
			enabled: siteRequest.enabled,
			created: new Date().getTime()
		});

		//put or edit the website depending on the request
		if(isNewSite) {
			await this.database.putWebsite(siteItem);
		} else {
			await this.database.editWebsite(siteItem);
		}

		//return the current item that was saved
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