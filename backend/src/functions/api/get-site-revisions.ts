import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {SiteRevision, WebsiteItem} from "website-alerter-shared";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Get all the {@link SiteRevision} for a {@link WebsiteItem} for the client
 */
export class GetSiteRevisions extends ApiLambda {

	protected async handle(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> {
		//get the requested site ID from the path
		const siteID = <string>event.pathParameters.siteID;

		console.info(`Getting site ${siteID} revisions for user ${this.user.sub}`);

		//make sure the site exists
		const site = await this.database.getSite(siteID);
		if(!site) {
			throw createError.BadRequest(`Failed to find site ${siteID}`);
		}

		//get all the revisions
		const revisions = await this.database.getSiteRevisionsForSite(siteID);

		console.info(`Returning ${revisions.length} revisions`);

		return {
			statusCode: 200,
			body: JSON.stringify(revisions)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetSiteRevisions().handler);
