import {WebsiteAlerterStack} from "../website-alerter.stack";
import {
	AuthorizationType,
	Authorizer, CfnMethod,
	LambdaIntegration, Method,
	MethodOptions,
	RestApi,
	TokenAuthorizer
} from "aws-cdk-lib/aws-apigateway";

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
				authorizer
			}
		});

		//add the lambda functions and the authorizer to the api
		this.api.root.addResource("login").addMethod("POST",
			new LambdaIntegration(stack.lambda.login));

		this.api.root.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));

		this.api.root.addResource("{path+}")
			.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));

		this.api.root.addResource("sites")
			.addMethod("GET", new LambdaIntegration(stack.lambda.getSites));


		this.api.methods
			.filter(method => method.httpMethod == "OPTIONS" || method.resource.path == "/login")
			.forEach(method => {
				const cfnMethod = method.node.defaultChild as CfnMethod;
				cfnMethod.addPropertyOverride("ApiKeyRequired", false);
				cfnMethod.addPropertyOverride("AuthorizationType", "NONE");
				cfnMethod.addPropertyDeletionOverride("AuthorizerId");
			});
	}
}