import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayTokenAuthorizerHandler} from "aws-lambda";
import {verify, VerifyOptions} from "jsonwebtoken";
import {UserItem} from "../../services/database.service";
import {UserJwt} from "../../util/user-jwt";
import {MiddyUtil} from "../../util/middy-util";

/**
 * <a href="https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html">Custom
 * authorizer</a> that authenticates a user's JWT session. Allows access to the rest of the API if the session is valid.
 */
class Auth extends LambdaBase {
	/** prefix of a bearer token where JWT is passed in */
	private static readonly TOKEN_PREFIX = 'Bearer ';

	/**
	 * Entry point from API Gateway
	 * @param event data from the client
	 */
	public handler:APIGatewayTokenAuthorizerHandler = async(event:APIGatewayTokenAuthorizerEvent):Promise<APIGatewayAuthorizerResult> => {
		//if there is no token then deny
		if(!event.authorizationToken) {
			throw new Error("Deny");
		}

		//get the jwt by cutting of the bearer part of the authorization
		const jwt = event.authorizationToken.substring(Auth.TOKEN_PREFIX.length);
		if(!jwt) {
			console.warn('Not JWT provided');
			throw new Error("Deny");
		}

		//setup the various services
		await this.setupServices();

		//get the JWT signing key from S3
		const key = await this.configService.loadJwt();

		let user:UserJwt;

		try {
			console.log(`Handling authorization ${event.type} for ${event.methodArn}`);

			//parse the client's JWT
			user = await this.parseJwt(jwt, key);
		} catch(e) {
			console.error("Failed to authenticate user", e);
			throw new Error("Unauthorized");
		}

		console.log(`Validated ${user.email}, returning policy`);

		//return a policy allowing access to the rest of the api
		return this.createPolicy(user, event.methodArn);
	}

	/**
	 * Parse a client's JWT and if valid return the user object stored there
	 * @param jwt the jwt to parse
	 * @param key the secret key to authenticate with
	 */
	private parseJwt(jwt:string, key:Buffer):Promise<UserJwt> {
		return new Promise<UserItem>((resolve, reject) => {
			const options:VerifyOptions = {
				algorithms: ['HS512', 'HS256'],
				audience: 'website-alerter',
				issuer: 'website-alerter-server'
			};

			//verify the token
			verify(jwt, key, options, (error, decoded) => {
				//if there is an error then reject it
				if(error) {
					reject(error);
					return;
				}

				if(typeof decoded != "object") {
					reject('jwt empty');
					return;
				}

				//return the decoded jwt object
				resolve(decoded as UserJwt);
			});
		});
	}

	/**
	 * Return a policy so the client can access the API
	 * @param user the client to give access
	 * @param methodArn the method arn the client has requested to view
	 * @private
	 */
	private createPolicy(user:UserJwt, methodArn:string):APIGatewayAuthorizerResult {
		//split up the requested method arn
		const split = methodArn.split(":");
		const region = split[3];
		const accountId = split[4];

		const partials = split[5].split("/");
		const apiId = partials[0];
		const stage = partials[1];

		//return the policy (it's not very restrictive)
		return {
			principalId: user.userID,
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Action: 'execute-api:Invoke',
						Effect: 'Allow',
						Resource: [
							`arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/POST/*`,
							`arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/GET/*`,
							`arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/PUT/*`,
							`arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/DELETE/*`
						]
					}
				]
			},

			//add the user's information to be grabbed by other api methods
			context: user
		};
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.handler(new Auth().handler);
