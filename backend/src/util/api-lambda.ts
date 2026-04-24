import {LambdaBase} from "./lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {AlerterUser} from "./alerter-user";
import {EnvironmentVars} from "./environment-vars";

/**
 * Base class for all API Gateway lambdas
 */
export abstract class ApiLambda extends LambdaBase {
	/** Cognito user's information */
	private _user:AlerterUser;

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	handler = (event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		if(!EnvironmentVars.isProduction && event.requestContext.authorizer == undefined) {
			this._user = {
				sub: "unknown",
				email: "test@test.com"
			};
		} else {
			this._user = event.requestContext.authorizer.claims;
		}

		return this.handle(event)
	}

	/**
	 * Handle the event
	 * @param event data from the client
	 */
	protected abstract handle(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult>;

	/** Return the cognito user's information */
	get user():AlerterUser {
		return this._user;
	}
}
