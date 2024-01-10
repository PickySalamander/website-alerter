import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {WebsiteAlerterStack} from "../website-alerter.stack";
import {NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs/lib/function";
import {Duration} from "aws-cdk-lib";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {DockerImageFunction, Runtime} from "aws-cdk-lib/aws-lambda";
import {DockerImageFunctionProps} from "aws-cdk-lib/aws-lambda/lib/image-function";

/**
 * Helper {@link NodejsFunction} that has preset parameters
 *
 * Default properties:
 * <ul>
 *     <li>timeout: 30 seconds</li>
 *     <li>logRetention: 1 month</li>
 *     <li>runtime: node 20</li>
 *     <li>handler: handler</li>
 *     <li>role: stack.iam.lambdaRole</li>
 * </ul>
 */
export class AlerterJsFunction extends NodejsFunction {

	/**
	 * Create a new lambda function
	 * @param stack the current stack
	 * @param id the id of the function
	 * @param props the properties not already define to be merged with defaults
	 */
	constructor(stack:WebsiteAlerterStack, id:string, props?:NodejsFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				runtime: Runtime.NODEJS_20_X,
				handler: "handler",
				role: stack.iam.lambdaRole,
			}, props));
	}
}

/**
 * Helper {@link DockerImageFunction} that has preset parameters
 *
 * Default properties:
 * <ul>
 *     <li>timeout: 30 seconds</li>
 *     <li>logRetention: 1 month</li>
 *     <li>role: stack.iam.lambdaRole</li>
 * </ul>
 */
export class AlerterDockerFunction extends DockerImageFunction {

	/**
	 * Create a new lambda function
	 * @param stack the current stack
	 * @param id the id of the function
	 * @param props the properties not already define to be merged with defaults
	 */
	constructor(stack:WebsiteAlerterStack, id:string, props?:DockerImageFunctionProps) {
		super(stack, id,
			Object.assign({
				timeout: Duration.seconds(30),
				logRetention: RetentionDays.ONE_MONTH,
				role: stack.iam.lambdaRole,
			}, props));
	}
}