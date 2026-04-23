import {APIGatewayProxyResult} from "aws-lambda";
import {MiddyUtil} from "../../util/middy-util";
import {HttpMethod} from "../../util/http-method";
import {WebsiteItem} from "website-alerter-shared";
import {ApiLambda} from "../../util/api-lambda";

/**
 * Get all the {@link WebsiteItem}'s in the database and return to the client
 */
export class GetSites extends ApiLambda {

	protected async handle():Promise<APIGatewayProxyResult> {
		console.log(`Getting sites for user ${this.user.sub}`);

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
