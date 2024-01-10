import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {SiteRevision, WebsiteItem} from "website-alerter-shared";

/**
 * Get all the {@link SiteRevision} for a {@link WebsiteItem} for the client
 */
export class GetSiteRevisions extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		//get the requested site ID from the path
		const siteID = <string>event.pathParameters.siteID;

		await this.setupServices();

		console.log(`Getting site ${siteID} revisions for user ${user.userID}`);

		//make sure the site exists
		const site = await this.database.getSite(siteID);
		if(!site) {
			throw createError.BadRequest(`Failed to find site ${siteID}`);
		}

		//get all the revisions
		const revisions = await this.database.getSiteRevisionsForSite(siteID);

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
	.handler(new GetSiteRevisions().handler);