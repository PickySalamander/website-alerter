import {LambdaBase} from "../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {LoginRequest} from "../../../shared/src/util/login-request";

class Login extends LambdaBase {
	async handler(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> {
		//make sure there was a body
		if(!event.body) {
			throw new Error("Body was not specified");
		}

		//get the login request
		const request = JSON.parse(event.body) as LoginRequest;
		throw new Error("not supported")
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = new Login().handler;