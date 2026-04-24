import {Construct} from "constructs";
import {WebsiteAlerterStack} from "./website-alerter.stack";
import {UserPool, UserPoolClient} from "aws-cdk-lib/aws-cognito";

/**
 * Part of the CDK stack that concerns the Cognito user pool
 */
export class CognitoStack extends Construct {
	/** The created Cognito user pool */
	readonly pool:UserPool;

	/** The created Cognito user pool client */
	readonly client:UserPoolClient;

	constructor(stack:WebsiteAlerterStack) {
		super(stack, "Cognito");

		this.pool = new UserPool(this, "UserPool", {
			userPoolName: "website-alerter-pool",
			standardAttributes: {
				email: {
					required: true,
					mutable: true
				}
			},
			signInAliases: {
				email: true,
				phone: false,
				username: false,
				preferredUsername: false
			},
			selfSignUpEnabled: false
		});

		this.pool.addDomain("domain", {
			cognitoDomain: {
				domainPrefix: "website-alerter"
			}
		});

		this.client =new UserPoolClient(this, "AppClient", {
			userPoolClientName: "regular-login",
			userPool: this.pool,
			authFlows: {
				userPassword: true,
				userSrp: true
			}
		});
	}
}
