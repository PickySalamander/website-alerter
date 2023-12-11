import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {WebsiteAlerterStack} from "../website-alerter.stack";
import {NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs/lib/function";
import {Duration} from "aws-cdk-lib";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {DockerImageFunction, Runtime} from "aws-cdk-lib/aws-lambda";
import {DockerImageFunctionProps} from "aws-cdk-lib/aws-lambda/lib/image-function";

export class AlerterJsFunction extends NodejsFunction {

	constructor(stack:WebsiteAlerterStack, id:string, props?:NodejsFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				runtime: Runtime.NODEJS_18_X,
				handler: "handler",
				role: stack.iam.role,
			}, props));
	}
}

export class AlerterDockerFunction extends DockerImageFunction {

	constructor(stack:WebsiteAlerterStack, id:string, props?:DockerImageFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				role: stack.iam.role,
			}, props));
	}
}