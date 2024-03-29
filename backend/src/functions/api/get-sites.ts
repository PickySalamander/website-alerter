import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import {WebsiteItem} from "website-alerter-shared";

/**
 * Get all the {@link WebsiteItem}'s in the database and return to the client
 */
export class GetSites extends LambdaBase {

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//get user from context
		const user = event.requestContext.authorizer as UserJwt;

		await this.setupServices();

		console.log(`Getting sites for user ${user.userID}`);

		//get the sites
		const sites = await this.database.getSites();

		console.log(`Returning ${sites.length} sites.`);

		return {
			statusCode: 200,
			body: JSON.stringify(sites)
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Get))
	.handler(new GetSites().handler);