import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import createError from "http-errors";
import {GetRevisionResponse} from "website-alerter-shared/dist/util/get-revision-response";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {SiteRevisionState} from "website-alerter-shared";

export class GetRevision extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		const user = event.requestContext.authorizer as UserJwt;

		const revisionID = <string>event.pathParameters.revisionID;

		await this.setupServices();

		console.log(`Getting revision ${revisionID} for user ${user.userID}`);

		const revision = await this.database.getSiteRevision(revisionID);
		if(!revision) {
			throw createError.BadRequest(`Failed to find ${revisionID}`);
		}

		const toReturn:GetRevisionResponse = {
			revision,
			urls: {
				screenshot: await this.getPreSigned(revisionID, "png"),
				html: await this.getPreSigned(revisionID, "html")
			}
		};

		if(revision.siteState == SiteRevisionState.Changed) {
			toReturn.urls.diff = await this.getPreSigned(revisionID, "diff");
		}

		return {
			statusCode: 200,
			body: JSON.stringify(toReturn)
		};
	}

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