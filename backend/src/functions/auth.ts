import {LambdaBase} from "../util/lambda-base";
import {APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayTokenAuthorizerHandler} from "aws-lambda";

class Auth extends LambdaBase {
	public handler:APIGatewayTokenAuthorizerHandler = async(event:APIGatewayTokenAuthorizerEvent):Promise<APIGatewayAuthorizerResult> => {
		//if there is no token then deny
		if(!event.authorizationToken) {
			throw new Error("Deny");
		}

		try {
			console.log(`Handling authorization ${event.type} for ${event.methodArn}`);
		} catch(e) {
			console.error("Failed to authenticate user using basic authentication", e);
			throw new Error("Unauthorized");
		}

		throw new Error("Not working yet");
	}
}