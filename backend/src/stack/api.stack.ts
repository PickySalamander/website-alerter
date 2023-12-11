import {WebsiteAlerterStack} from "../website-alerter.stack";
import {
	AuthorizationType,
	CfnMethod,
	JsonSchema,
	LambdaIntegration,
	Method,
	Resource,
	ResponseType,
	RestApi,
	TokenAuthorizer
} from "aws-cdk-lib/aws-apigateway";
import * as fs from "fs";
import path from "node:path";
import {HttpMethod} from "../util/middy-util";
import {FunctionBase} from "aws-cdk-lib/aws-lambda";

export class ApiStack {
	public readonly api:RestApi;

	constructor(stack:WebsiteAlerterStack) {
		const authorizer = new TokenAuthorizer(stack, "Authorizor", {
			handler: stack.apiLambda.auth,
			validationRegex: "^Bearer [-0-9a-zA-Z\\._]*$"
		});

		const allowOrigins = [`https://${stack.cdn.cdn.attrDomainName}`];

		if(stack.isIncludeLocalCors) {
			allowOrigins.push("http://localhost:4200")
		}

		this.api = new RestApi(stack, "WebsiteAlerterApi", {
			description: "Website Alerter API for website functions",
			defaultMethodOptions: {
				authorizationType: AuthorizationType.CUSTOM,
				authorizer
			},
			defaultCorsPreflightOptions: {
				allowCredentials: true,
				allowOrigins,
				allowHeaders: ["Content-Type", "Authorization"],
				allowMethods: ["GET", "POST", "DELETE", "PUT"]
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

		const login = this.api.root.addResource("login");
		this.addLambda(login, {
			method: "POST",
			function: stack.apiLambda.login,
			authorizer: false,
			schemaName: "login"
		});

		const sites = this.api.root.addResource("sites");
		this.addLambda(sites, {
			method: "GET",
			function: stack.apiLambda.getSites
		});

		this.addLambda(sites, {
			method: "PUT",
			function: stack.apiLambda.putSite,
			schemaName: "put-site"
		});

		this.addLambda(sites, {
			method: "DELETE",
			function: stack.apiLambda.deleteSites,
			schemaName: "delete-sites"
		});
	}

	private addLambda(resource:Resource, props:LambdaOptions) {
		const methodOptions:any = {};

		if(props.schemaName) {
			const model = this.api.addModel(`${props.schemaName}Schema`, {
				description: `Validation for ${props.schemaName} calls`,
				contentType: "application/json",
				schema: this.schemaFromFile(props.schemaName)
			});

			methodOptions.requestValidatorOptions = {
				validateRequestBody: true
			};

			methodOptions.requestModels = {
				"application/json": model
			};
		}

		const method = resource.addMethod(props.method, new LambdaIntegration(props.function), methodOptions);

		if(props.authorizer === false) {
			this.noAuthorizer(method);
		}
	}

	private noAuthorizer(method:Method) {
		const cfnMethod = method.node.defaultChild as CfnMethod;
		cfnMethod.addPropertyOverride("ApiKeyRequired", false);
		cfnMethod.addPropertyOverride("AuthorizationType", "NONE");
		cfnMethod.addPropertyDeletionOverride("AuthorizerId");
	}

	private schemaFromFile(name:string):JsonSchema {
		const fileName = path.resolve(__dirname, '..', 'schema', `${name}.json`);
		console.log(`Loading json schema from ${fileName}`);
		return JSON.parse(fs.readFileSync(fileName, {encoding: 'utf-8'}));
	}
}

export interface LambdaOptions {
	method:HttpMethod;
	function:FunctionBase;
	schemaName?:string;
	authorizer?:boolean;
}