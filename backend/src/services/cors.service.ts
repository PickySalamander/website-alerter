import {APIGatewayProxyEvent} from "aws-lambda";
import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";

/**
 * Simple service to add CORS to API Gateway responses
 */
export class CorsService {
	private readonly allowedMethods:string;

	private readonly exposedHeaders:string;

	/**
	 * Setup a new service to handle requests
	 * @param allowedOrigins the origin regex to allow
	 * @param allowedMethods the methods that are allowed for the headers (defaults to GET and POST)
	 * @param allowCredentials Does the allow credentials header get added?
	 * @param exposedHeaders headers to expose to the front-end
	 */
	constructor(private allowedOrigins:RegExp[],
	            allowedMethods:string[] = ['GET', 'POST'],
	            private allowCredentials:boolean = false,
	            exposedHeaders?:string[]) {
		this.allowedMethods = allowedMethods.join(',').toUpperCase();
		this.exposedHeaders = exposedHeaders ? exposedHeaders.join(',') : undefined;
	}

	public handleCors(event:APIGatewayProxyEvent):CorsResult | null {
		if(!event.headers) {
			console.warn("Failed to find headers, can't add cors");
			return null;
		}

		//get the origin from the request
		const origin = event.headers.Origin || event.headers.origin;

		//throw an error if not set
		if(origin) {
			//got through each origin and if matches then return the origin
			for(const allowed of this.allowedOrigins) {
				if(allowed.test(origin)) {
					const result:CorsResult = {
						"Access-Control-Allow-Headers": "Content-Type,Authorization",
						"Access-Control-Allow-Origin": origin,
						"Access-Control-Allow-Methods": this.allowedMethods,
					};

					if(this.allowCredentials) {
						result["Access-Control-Allow-Credentials"] = 'true';
					}

					if(this.exposedHeaders) {
						result["Access-Control-Expose-Headers"] = this.exposedHeaders;
					}

					console.debug(`Cors origin approved: ${origin}`);

					return result;
				}
			}
		}

		console.debug(`Cors origin failed: ${origin}`);

		//throw error, no origin found
		return null;
	}

	/**
	 * Append cors values to a request result's headers. Any cors headers already assigned won't be overriden
	 * @param event the event that started the lambda with the origin in it
	 * @param result the result being sent back to the client
	 */
	public appendCors(event:APIGatewayProxyEvent, result:APIGatewayProxyResult):APIGatewayProxyResult {
		const cors = this.handleCors(event);
		if(cors) {
			if(typeof result.headers !== "object") {
				result.headers = {};
			}

			result.headers = Object.assign(cors, result.headers);
		}

		return result;
	}

}

/** Cors results sent to the client */
export interface CorsResult {
	/** indicate which HTTP headers can be used when making the actual request. */
	'Access-Control-Allow-Headers':string;

	/** tells browsers to allow that origin to access the resource */
	'Access-Control-Allow-Origin':string;

	/** specifies the method or methods allowed when accessing the resource */
	'Access-Control-Allow-Methods':string;

	/**  whitelist headers that browsers are allowed to access. */
	'Access-Control-Expose-Headers'?:string;

	/**  how long the results of a preflight request can be cached in seconds */
	'Access-Control-Max-Age'?:string;

	/** tells browsers whether to expose the response authentication to frontend JavaScript */
	'Access-Control-Allow-Credentials'?:'true' | 'false';
}

