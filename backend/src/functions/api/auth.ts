import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayTokenAuthorizerHandler} from "aws-lambda";
import {verify, VerifyOptions} from "jsonwebtoken";
import {UserItem} from "../../services/database.service";
import {UserJwt} from "../../util/user-jwt";

class Auth extends LambdaBase {
	private static readonly TOKEN_PREFIX = 'Bearer ';
	public handler:APIGatewayTokenAuthorizerHandler = async(event:APIGatewayTokenAuthorizerEvent):Promise<APIGatewayAuthorizerResult> => {
		//if there is no token then deny
		if(!event.authorizationToken) {
			throw new Error("Deny");
		}

		const jwt = event.authorizationToken.substring(Auth.TOKEN_PREFIX.length);
		if(!jwt) {
			console.warn('Not JWT provided');
			throw new Error("Deny");
		}

		await this.setupServices();
		const key = await this.configService.loadJwt();

		let user:UserJwt;

		try {
			console.log(`Handling authorization ${event.type} for ${event.methodArn}`);

			user = await this.parseJwt(jwt, key);
		} catch(e) {
			console.error("Failed to authenticate user", e);
			throw new Error("Unauthorized");
		}

		console.log(`Validated ${user.email}, returning policy`);

		//return a policy allowing access to the rest of the api
		return this.createPolicy(user, event.methodArn);
	}

	private parseJwt(jwt:string, key:Buffer):Promise<UserJwt> {
		return new Promise<UserItem>((resolve, reject) => {
			const options:VerifyOptions = {
				algorithms: ['HS512', 'HS256'],
				audience: 'website-alerter',
				issuer: 'website-alerter-server'
			};

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

				resolve(decoded as UserJwt);
			});
		});
	}

	private createPolicy(user:UserJwt, methodArn:string):APIGatewayAuthorizerResult {
		const split = methodArn.split(":");
		const region = split[3];
		const accountId = split[4];

		const partials = split[5].split("/");
		const apiId = partials[0];
		const stage = partials[1];

		//return the policy
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
export const handler = new Auth().handler;
