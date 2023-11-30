import {Construct} from "constructs";
import {WebsiteAlerterStack} from "../website-alerter.stack";
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway";

export class ApiStack {
	public readonly api:RestApi;
	//
	// constructor(stack:WebsiteAlerterStack) {
	// 	this.api = new HttpApi(stack);
	// }

	constructor(stack:WebsiteAlerterStack) {
		this.api = new RestApi(stack, "WebsiteAlerterApi");

		//add the lambda functions and the authorizer to the api
		this.api.root.addResource("login")
			.addMethod("POST", new LambdaIntegration(stack.lambda.login));

		this.api.root.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));

		this.api.root.addResource("{path+}")
			.addMethod("OPTIONS", new LambdaIntegration(stack.lambda.cors));
	}
}