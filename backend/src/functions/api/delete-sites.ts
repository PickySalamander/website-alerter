import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";

export class DeleteSites extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		const user = event.requestContext.authorizer as UserJwt;

		const toDelete = new Set(<string[]>JSON.parse(event.body));
		console.log(`User "${user.userID}" wants to delete ${toDelete.size} sites.`);

		if(toDelete.size > 25) {
			throw new createError.BadRequest("Can only delete 25 items at a time");
		}

		await this.setupServices();

		const itemsToDelete = await this.database.getSitesByID(toDelete);
		if(itemsToDelete.length != toDelete.size) {
			throw new createError.BadRequest(`Failed to find all ${toDelete.size} items in the database`);
		}

		for(const item of itemsToDelete) {
			if(item.userID != user.userID) {
				console.error(`User ${user.userID} not authorized to delete site ${item.siteID}`);
				throw new createError.Forbidden("Not authorized to delete site");
			}
		}

		await this.database.deleteSites(toDelete);

		return {
			statusCode: 204,
			body: ''
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors("DELETE"))
	.handler(new DeleteSites().handler);