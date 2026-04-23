import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {GetRevisionResponse} from "website-alerter-shared/dist/util/get-revision-response";
import {SiteRevision} from "website-alerter-shared";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Return a {@link SiteRevision} to the client along with pre-signed urls to get html, png, and diffs.
 */
export class GetRevision extends ApiLambda {

	protected async handle(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> {
		//get the revision requested from the path
		const revisionID = <string>event.pathParameters.revisionID;

		console.log(`Getting revision ${revisionID} for user ${this.user.sub}`);

		//verify the revision exists in the database
		const revision = await this.database.getSiteRevision(revisionID);
		if(!revision) {
			throw createError.BadRequest(`Failed to find ${revisionID}`);
		}

		//set up the response to the user
		const toReturn:GetRevisionResponse = {
			revision,
			urls: {
				screenshot: await this.s3.getPreSigned(`content/${revision.siteID}${revisionID}.png`),
				html: await this.s3.getPreSigned(`content/${revision.siteID}${revisionID}.html`)
			}
		};

		return {
			statusCode: 200,
			body: JSON.stringify(toReturn)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRevision().handler);
