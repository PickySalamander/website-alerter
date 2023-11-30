import {LambdaBase} from "../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";

export class GetSites extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		console.log(event.requestContext.authorizer);

		throw "not implemented";
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new GetSites().handler;