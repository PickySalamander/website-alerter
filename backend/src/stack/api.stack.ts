import {WebsiteAlerterStack} from "../website-alerter.stack";
import {
	AuthorizationType,
	CfnMethod,
	Cors, JsonSchema,
	LambdaIntegration, Model, RequestValidator,
	ResponseType,
	RestApi,
	TokenAuthorizer
} from "aws-cdk-lib/aws-apigateway";
import {JsonSchemaMapper} from "aws-cdk-lib/aws-apigateway/lib/util";
import * as fs from "fs";
import path from "node:path";

export class ApiStack {
	public readonly api:RestApi;
	//
	// constructor(stack:WebsiteAlerterStack) {
	// 	this.api = new HttpApi(stack);
	// }

	constructor(stack:WebsiteAlerterStack) {
		const authorizer = new TokenAuthorizer(stack, "Authorizor", {
			handler: stack.lambda.auth,
			validationRegex: "^Bearer [-0-9a-zA-Z\\._]*$"
		});

		this.api = new RestApi(stack, "WebsiteAlerterApi", {
			description: "Website Alerter API for website functions",
			defaultMethodOptions: {
				authorizationType: AuthorizationType.CUSTOM,
				authorizer
			},
			defaultCorsPreflightOptions: {
				allowCredentials: true,
				allowOrigins: ["http://localhost:4200"],
				allowHeaders: ["Content-Type","Authorization"],
				allowMethods: ["GET", "POST"]
			}
		});

		this.api.addGatewayResponse("Default4XX", {
			type: ResponseType.DEFAULT_4XX,
			responseHeaders: {
				"Access-Control-Allow-Origin": "'*'",
				"Access-Control-Allow-Headers": "'*'"
			}
		});

		this.api.addGatewayResponse("Default5XX", {
			type: ResponseType.DEFAULT_5XX,
			responseHeaders: {
				"Access-Control-Allow-Origin": "'*'",
				"Access-Control-Allow-Headers": "'*'"
			}
		});

		const loginModel = this.api.addModel("LoginSchema", {
			description: "Validation for Login calls",
			contentType: "application/json",
			schema: this.schemaFromFile("login")
		})

		//add the lambda functions and the authorizer to the api
		this.api.root.addResource("login")
			.addMethod("POST", new LambdaIntegration(stack.lambda.login), {
				requestValidatorOptions: {
					validateRequestBody: true
				},
				requestModels: {
					"application/json": loginModel
				}
			});

		// this.api.root.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));
		//
		// this.api.root.addResource("{path+}")
		// 	.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));

		const sites = this.api.root.addResource("sites");
		sites.addMethod("GET", new LambdaIntegration(stack.lambda.getSites));

		const putSiteModel = this.api.addModel("PutSiteSchema", {
			description: "Validation for PutSite calls",
			contentType: "application/json",
			schema: this.schemaFromFile("put-site")
		})

		sites.addMethod("PUT", new LambdaIntegration(stack.lambda.putSite), {
			requestValidatorOptions: {
				validateRequestBody: true
			},
			requestModels: {
				"application/json": putSiteModel
			}
		});

		this.api.methods
			.filter(method => method.httpMethod == "OPTIONS" || method.resource.path == "/login")
			.forEach(method => {
				const cfnMethod = method.node.defaultChild as CfnMethod;
				cfnMethod.addPropertyOverride("ApiKeyRequired", false);
				cfnMethod.addPropertyOverride("AuthorizationType", "NONE");
				cfnMethod.addPropertyDeletionOverride("AuthorizerId");
			});
	}

	private schemaFromFile(name:string):JsonSchema {
		const fileName = path.resolve(__dirname, '..', 'schema', `${name}.json`);
		console.log(`Loading json schema from ${fileName}`);
		return JSON.parse(fs.readFileSync(fileName, { encoding: 'utf-8' }));
	}
}