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
import {FunctionBase} from "aws-cdk-lib/aws-lambda";
import {HttpMethod} from "../util/http-method";

/**
 * Part of the CDK stack that concerns API Gateway
 */
export class ApiStack {
	/** The newly built API Gateway REST API */
	public readonly api:RestApi;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		//the custom authorizer
		const authorizer = new TokenAuthorizer(stack, "Authorizor", {
			handler: stack.apiLambda.auth,
			validationRegex: "^Bearer [-0-9a-zA-Z\\._]*$"
		});

		//allowed origins allowed for cors
		const allowOrigins = [`https://${stack.cdn.cdn.attrDomainName}`];

		//if the env variable is set add localhost
		if(process.env.INCLUDE_LOCAL_CORS === "true") {
			console.warn("Including localhost for cors checks");
			//SAM likes the localhost to come first otherwise won't use it
			allowOrigins.unshift("http://localhost:4200")
		}

		//build the rest API
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
				allowMethods: [HttpMethod.Get, HttpMethod.Post, HttpMethod.Delete, HttpMethod.Put]
			}
		});

		//add cors to 400 errors
		this.api.addGatewayResponse("Default4XX", {
			type: ResponseType.DEFAULT_4XX,
			responseHeaders: {
				"Access-Control-Allow-Origin": "'*'",
				"Access-Control-Allow-Headers": "'*'"
			}
		});

		//add cors to 500 errors
		this.api.addGatewayResponse("Default5XX", {
			type: ResponseType.DEFAULT_5XX,
			responseHeaders: {
				"Access-Control-Allow-Origin": "'*'",
				"Access-Control-Allow-Headers": "'*'"
			}
		});

		//add login lambda function to the api
		const login = this.api.root.addResource("login");
		this.addLambda(login, {
			method: HttpMethod.Post,
			function: stack.apiLambda.login,
			authorizer: false,
			schemaName: "login"
		});

		//add the sites path and get, put, post, and delete functions
		const sites = this.api.root.addResource("sites");
		this.addLambda(sites, {
			method: HttpMethod.Get,
			function: stack.apiLambda.getSites
		});

		this.addLambda(sites, {
			method: HttpMethod.Put,
			function: stack.apiLambda.putSite,
			schemaName: "put-site"
		});

		this.addLambda(sites, {
			method: HttpMethod.Post,
			function: stack.apiLambda.putSite,
			schemaName: "update-site"
		});

		this.addLambda(sites, {
			method: HttpMethod.Delete,
			function: stack.apiLambda.deleteSites,
			schemaName: "delete-sites"
		});

		//add the revisions path and get, get run revisions, and get site revisions functions
		const revisions = this.api.root.addResource("revisions");

		this.addLambda(revisions.addResource("{revisionID}"), {
			method: HttpMethod.Get,
			function: stack.apiLambda.getRevision
		});

		this.addLambda(revisions.addResource("run").addResource("{runID}"), {
			method: HttpMethod.Get,
			function: stack.apiLambda.getRunRevisions
		});

		this.addLambda(revisions.addResource("site").addResource("{siteID}"), {
			method: HttpMethod.Get,
			function: stack.apiLambda.getSiteRevisions
		});

		//add get all runs function
		const runs = this.api.root.addResource("runs");
		this.addLambda(runs, {
			method: HttpMethod.Get,
			function: stack.apiLambda.getRuns
		});
	}

	/**
	 * Helper function to add a lambda function to the REST API
	 * @param resource the resource path to add the lambda to
	 * @param props the properties for the lambda function being added
	 */
	private addLambda(resource:Resource, props:LambdaOptions) {
		const methodOptions:any = {};

		//if a json schema is defined then add the schema file to the stack
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

		//add the lambda function to the resource under the required method
		const method = resource.addMethod(props.method, new LambdaIntegration(props.function), methodOptions);

		//if no authorizer required then remove it (it's always added by default)
		if(props.authorizer === false) {
			this.noAuthorizer(method);
		}
	}

	/**
	 * Remove the default authorizer from a route in the REST API
	 * @param method the route to remove the authorizer from
	 */
	private noAuthorizer(method:Method) {
		//get the L1 construct (can't do this to the L2 now)
		const cfnMethod = method.node.defaultChild as CfnMethod;

		//remove the authorizer
		cfnMethod.addPropertyOverride("ApiKeyRequired", false);
		cfnMethod.addPropertyOverride("AuthorizationType", "NONE");
		cfnMethod.addPropertyDeletionOverride("AuthorizerId");
	}

	/**
	 * Load a JSON schema file from the schema directory (src/schema)
	 * @param name the name of the file (without the .json extension)
	 */
	private schemaFromFile(name:string):JsonSchema {
		const fileName = path.resolve(__dirname, '..', 'schema', `${name}.json`);
		console.log(`Loading json schema from ${fileName}`);
		return JSON.parse(fs.readFileSync(fileName, {encoding: 'utf-8'}));
	}
}

/** Options for a lambda function route in the REST API */
interface LambdaOptions {
	/** The http method that this function is for */
	method:HttpMethod;

	/** The actual function to attach */
	function:FunctionBase;

	/** An optional JSON schema to validate all request bodies against */
	schemaName?:string;

	/** Should this function have an authorizer? Defaults to true */
	authorizer?:boolean;
}