import {LambdaBase} from "./lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {AlerterUser} from "./alerter-user";

export abstract class ApiLambda extends LambdaBase {
	/** Cognito user's information */
	private _user:AlerterUser;

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	handler = (event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		this._user = event.requestContext.authorizer.claims;
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
