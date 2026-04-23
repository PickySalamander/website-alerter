import {Construct} from "constructs";
import {WebsiteAlerterStack} from "./website-alerter.stack";
import {UserPool, UserPoolClient} from "aws-cdk-lib/aws-cognito";

export class CognitoStack extends Construct {
	readonly pool:UserPool;

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
				userPassword: true
			}
		});
	}
}
