import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";
import {HttpMethod} from "../../util/http-method";

/**
 * Request to delete a site or sites from the database.
 */
export class DeleteSites extends LambdaBase {

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

		//get the id's of the sites the user wants to delete
		const toDelete = new Set(<string[]>JSON.parse(event.body));
		console.log(`User "${user.userID}" wants to delete ${toDelete.size} sites.`);

		//can't delete more than 25 per dynamo standards
		if(toDelete.size > 25) {
			throw new createError.BadRequest("Can only delete 25 items at a time");
		}

		await this.setupServices();

		//retrieve all the sites that need to be deleted (verify they exist)
		const itemsToDelete = await this.database.getSitesByID(toDelete);
		if(itemsToDelete.length != toDelete.size) {
			throw new createError.BadRequest(`Failed to find all ${toDelete.size} items in the database`);
		}

		//delete the sites
		await this.database.deleteSites(toDelete);

		return {
			statusCode: 204,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Delete))
	.handler(new DeleteSites().handler);