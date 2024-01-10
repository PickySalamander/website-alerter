import {Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {WebsiteAlerterStack} from "../website-alerter.stack";

/**
 * Part of the CDK stack that concerns the IAM roles used
 */
export class IamStack {
	/** Role for lambda functions */
	public readonly lambdaRole:Role;

	/** Role for the step function state machine */
	public readonly processStateMachineRole:Role;

	/** Create the stack */
	constructor(private stack:WebsiteAlerterStack) {
		//create the lambda roles
		this.lambdaRole = new Role(stack, "LambdaIAMRole", {
			description: "Generic role for Lambdas in website-alerter stack",
			assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
			inlinePolicies: {
				//basic lambda permissions to make logs
				General: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"logs:DescribeLogStreams",
								"logs:CreateLogStream",
								"logs:CreateLogGroup",
								"logs:PutLogEvents",
								"s3:ListBucket"
							],
							resources: ["*"]
						})
					]
				}),

				//read and write to databases and files
				Data: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"dynamodb:ListTables",
								"dynamodb:DescribeTable",
								"dynamodb:GetItem",
								"dynamodb:DeleteItem",
								"dynamodb:Query",
								"dynamodb:Scan",
								"dynamodb:UpdateItem",
								"dynamodb:BatchGetItem",
								"dynamodb:PutItem"
							],
							resources: [
								stack.dynamo.websiteTable.tableArn,
								`${stack.dynamo.websiteTable.tableArn}/index/*`,
								stack.dynamo.runThroughTable.tableArn,
								`${stack.dynamo.runThroughTable.tableArn}/index/*`,
								stack.dynamo.usersTable.tableArn,
								`${stack.dynamo.usersTable.tableArn}/index/*`,
								stack.dynamo.revisionTable.tableArn,
								`${stack.dynamo.revisionTable.tableArn}/index/*`
							]
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"s3:GetObject",
								"s3:PutObject",
								"s3:DeleteObject"
							],
							resources: [`${stack.configBucket.bucketArn}/*`]
						})
					]
				}),

				//read and write to required queues and notifications
				Events: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"sns:Publish"
							],
							resources: [this.stack.notificationSns.topicArn]
						})
					]
				})
			}
		});

		//create the state machine role (cdk will automatically add policies to this as state machine is built)
		this.processStateMachineRole = new Role(stack, "StateMachineRole", {
			description: "Generic role for process state machine in website-alerter stack",
			assumedBy: new ServicePrincipal("states.amazonaws.com")
		});
	}
}