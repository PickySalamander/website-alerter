import {WebsiteAlerterStack} from "../website-alerter.stack";
import {DockerImageCode, FunctionBase} from "aws-cdk-lib/aws-lambda";
import {AlerterDockerFunction, AlerterJsFunction} from "./alerter-js-function";

export class ApiLambdaStack {
	public readonly login:FunctionBase;

	public readonly auth:FunctionBase;

	public readonly getSites:FunctionBase;

	public readonly putSite:FunctionBase;

	public readonly deleteSites:FunctionBase;

	constructor(stack:WebsiteAlerterStack) {
		let allowOrigins = `https://${stack.cdn.cdn.attrDomainName}`;
		if(stack.isIncludeLocalCors) {
			allowOrigins += ",http://localhost:4200";
		}

		this.login = new AlerterDockerFunction(stack, "Login", {
			code: DockerImageCode.fromImageAsset("build/login"),
			description: "Login users to the API using JWT",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"USERS_TABLE": stack.dynamo.usersTable.tableName,
				"ALLOWED_ORIGINS": allowOrigins,
				"IS_PRODUCTION": "true"
			}
		});

		this.auth = new AlerterJsFunction(stack, "Auth", {
			description: "JWT authorizer for API",
			entry: "src/functions/api/auth.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"IS_PRODUCTION": "true"
			}
		});

		this.getSites = new AlerterJsFunction(stack, "GetSites", {
			description: "Get a list of sites for the user already configured in the backend",
			entry: "src/functions/api/get-sites.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"ALLOWED_ORIGINS": allowOrigins,
				"IS_PRODUCTION": "true"
			}
		});

		this.putSite = new AlerterJsFunction(stack, "PutSite", {
			description: "Put a new site into the backend for a user",
			entry: "src/functions/api/put-site.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"ALLOWED_ORIGINS": allowOrigins,
				"IS_PRODUCTION": "true"
			}
		});

		this.deleteSites = new AlerterJsFunction(stack, "DeleteSites", {
			description: "Delete site in the backend for a user",
			entry: "src/functions/api/delete-sites.ts",
			environment: {
				"CONFIG_S3": stack.configBucket.bucketName,
				"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
				"ALLOWED_ORIGINS": allowOrigins,
				"IS_PRODUCTION": "true"
			}
		});
	}
}