import {WebsiteAlerterStack} from "../website-alerter.stack";
import {DockerImageCode, FunctionBase} from "aws-cdk-lib/aws-lambda";
import {AlerterDockerFunction, AlerterJsFunction} from "./alerter-js-function";

export class ApiLambdaStack {
	public readonly login:FunctionBase;

	public readonly auth:FunctionBase;

	public readonly getSites:FunctionBase;

	public readonly putSite:FunctionBase;

	public readonly deleteSites:FunctionBase;

	public readonly getRuns:FunctionBase;

	public readonly getRunRevisions:FunctionBase;

	public readonly getSiteRevisions:FunctionBase;

	constructor(stack:WebsiteAlerterStack) {
		let allowOrigins = `https://${stack.cdn.cdn.attrDomainName}`;
		if(process.env.INCLUDE_LOCAL_CORS === "true") {
			allowOrigins += ",http://localhost:4200";
		}

		const environment = {
			"CONFIG_S3": stack.configBucket.bucketName,
			"USERS_TABLE": stack.dynamo.usersTable.tableName,
			"RUN_TABLE": stack.dynamo.runThroughTable.tableName,
			"WEBSITE_TABLE": stack.dynamo.websiteTable.tableName,
			"REVISION_TABLE": stack.dynamo.revisionTable.tableName,
			"ALLOWED_ORIGINS": allowOrigins,
			"IS_PRODUCTION": "true"
		};

		this.login = new AlerterDockerFunction(stack, "Login", {
			code: DockerImageCode.fromImageAsset("build/login"),
			description: "Login users to the API using JWT",
			environment
		});

		this.auth = new AlerterJsFunction(stack, "Auth", {
			description: "JWT authorizer for API",
			entry: "src/functions/api/auth.ts",
			environment
		});

		this.getSites = new AlerterJsFunction(stack, "GetSites", {
			description: "Get a list of sites for the user already configured in the backend",
			entry: "src/functions/api/get-sites.ts",
			environment
		});

		this.putSite = new AlerterJsFunction(stack, "PutSite", {
			description: "Put a new site into the backend for a user",
			entry: "src/functions/api/put-site.ts",
			environment
		});

		this.deleteSites = new AlerterJsFunction(stack, "DeleteSites", {
			description: "Delete site in the backend for a user",
			entry: "src/functions/api/delete-sites.ts",
			environment
		});

		this.getSiteRevisions = new AlerterJsFunction(stack, "GetSiteRevisions", {
			description: "Get all revisions for a website",
			entry: "src/functions/api/get-site-revisions.ts",
			environment
		});

		this.getRuns = new AlerterJsFunction(stack, "GetRuns", {
			description: "Get all runs in the database",
			entry: "src/functions/api/get-runs.ts",
			environment
		});

		this.getRunRevisions = new AlerterJsFunction(stack, "GetRunRevisions", {
			description: "Get all more data on a particular run",
			entry: "src/functions/api/get-run-revisions.ts",
			environment
		});
	}
}