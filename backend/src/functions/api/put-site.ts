import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {WebsiteItem, WebsiteItemRequest} from "website-alerter-shared";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";
import {HttpMethod} from "../../util/http-method";
import {randomUUID} from "crypto";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Add or edit a {@link WebsiteItem} in the database
 */
export class PutSite extends ApiLambda {

	protected async handle(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		//if a PUT method, then this is a new site
		const isNewSite = event.httpMethod.toUpperCase() == HttpMethod.Put;

		//parse the body of the request
		const siteRequest = JSON.parse(event.body) as WebsiteItemRequest;

		console.info(`User "${this.user.sub}" ${isNewSite ? "adding" : "updating"} site ${siteRequest.site}`);

		//create a new item for the database (we can trust siteRequest since it is pre-verified by a json schema)
		const siteItem:WebsiteItem = Object.assign(siteRequest, {
			siteID: isNewSite ? randomUUID() : siteRequest.siteID,
			enabled: siteRequest.enabled ?? true,
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
