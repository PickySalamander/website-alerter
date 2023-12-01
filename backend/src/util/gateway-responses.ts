import {APIGatewayProxyEvent} from "aws-lambda";
import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";

export abstract class GatewayResponses {
	public static error(statusCode:number, message:string):APIGatewayProxyResult {
		return {
			statusCode,
			body: `"${message}"`
		};
	}

	public static badRequestError(message:string):APIGatewayProxyResult {
		return GatewayResponses.error(401, message);
	}

	public static forbiddenError(message:string):APIGatewayProxyResult {
		return GatewayResponses.error(403, message);
	}
}