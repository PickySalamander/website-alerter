import {LambdaBase} from "../../util/lambda-base";
import {APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult} from "aws-lambda";
import * as bcrypt from "bcrypt";
import {UserItem} from "../../services/database.service";
import {v4} from 'uuid';
import * as jwt from "jsonwebtoken";
import {LoginResponse} from "website-alerter-shared";
import {MiddyUtil} from "../../util/middy-util";
import createError from "http-errors";
import {HttpMethod} from "../../util/http-method";

class Login extends LambdaBase {
	public handler:APIGatewayProxyHandler = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
		//make sure there was a body
		if(!event.body) {
			throw new createError.BadRequest("Body was not specified");
		}

		await this.setupServices();

		//get the login request
		const request = JSON.parse(event.body);
		const user = await this.database.getUser(request.email);

		if(!user) {
			throw new createError.Forbidden("bad credentials")
		}

		//check the password
		if(!await bcrypt.compare(request.password, user.password)) {
			throw new createError.Forbidden("bad credentials")
		}

		const key = await this.configService.loadJwt();
		const signed = await Login.getSignedJwt(user, v4(), key);

		//return the information to the user
		const response:LoginResponse = {
			userID: user.userID,
			email: user.email
		}

		//return the signed auth and user information
		return {
			body: JSON.stringify(response),
			headers: {session: signed},
			statusCode: 200
		};
	}

	public static getSignedJwt(user:UserItem, sessionID:string, key:Buffer) {

		//create a promise and sign
		return new Promise<string>((resolve, reject) => {
			jwt.sign({
				userID: user.userID,
				email: user.email
			}, key, {
				subject: user.userID,
				audience: 'website-alerter',
				expiresIn: '8h',
				notBefore: 0,
				jwtid: sessionID,
				issuer: 'website-alerter-server'
			}, (err, encoded) => {
				if(err || !encoded) {
					reject(err);
				} else {
					resolve(encoded);
				}
			});
		});
	}
}

// noinspection JSUnusedGlobalSymbols
export const handler = MiddyUtil.defaultMiddy()
	.use(MiddyUtil.cors(HttpMethod.Post))
	.handler(new Login().handler);