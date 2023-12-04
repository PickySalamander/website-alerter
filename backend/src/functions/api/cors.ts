import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";

export class Cors extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		let result = this.cors.appendCors(event, {statusCode: 204, body: ''});
		return result || {statusCode: 400, body: ""};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new Cors().handler;
