import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {GetRevisionResponse} from "website-alerter-shared/dist/util/get-revision-response";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {SiteRevision, SiteRevisionState} from "website-alerter-shared";

/**
 * Return a {@link SiteRevision} to the client along with pre-signed urls to get html, png, and diffs.
 */
export class GetRevision extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		//get the revision requested from the path
		const revisionID = <string>event.pathParameters.revisionID;

		await this.setupServices();

		console.log(`Getting revision ${revisionID} for user ${user.userID}`);

		//verify the revision exists in the database
		const revision = await this.database.getSiteRevision(revisionID);
		if(!revision) {
			throw createError.BadRequest(`Failed to find ${revisionID}`);
		}

		//setup the response to the user
		const toReturn:GetRevisionResponse = {
			revision,
			urls: {
				screenshot: await this.getPreSigned(revisionID, "png"),
				html: await this.getPreSigned(revisionID, "html")
			}
		};

		//if the site has changed in this revision return a url for the unified diff
		if(revision.siteState == SiteRevisionState.Changed) {
			toReturn.urls.diff = await this.getPreSigned(revisionID, "diff");
		}

		return {
			statusCode: 200,
			body: JSON.stringify(toReturn)
		};
	}

	/**
	 * Return a pre-signed url for a revision file in s3
	 * @param revisionID the id of the revision
	 * @param extension the extension of the file to get
	 */
	private getPreSigned(revisionID:string, extension:string) {
		return getSignedUrl(this.s3,
			new GetObjectCommand({
				Bucket: this.configPath,
				Key: `content/${revisionID}.${extension}`
			}));
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetRevision().handler);