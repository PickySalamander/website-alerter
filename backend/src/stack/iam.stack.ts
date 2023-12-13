import {Effect, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {WebsiteAlerterStack} from "../website-alerter.stack";

/** Create the IAM role that all the lambda functions will use */
export class IamStack {
	public readonly lambdaRole:Role;

	public readonly stateMachineRole:Role;

	constructor(private stack:WebsiteAlerterStack) {
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
								"dynamodb:PutItem"
							],
							resources: [
								stack.dynamo.websiteTable.tableArn,
								stack.dynamo.runThroughTable.tableArn,
								stack.dynamo.usersTable.tableArn,
								`${stack.dynamo.usersTable.tableArn}/index/*`
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
								"sqs:ReceiveMessage",
								"sqs:DeleteMessage",
								"sqs:GetQueueAttributes",
								"sqs:ChangeMessageVisibility",
								"sqs:DeleteMessage",
								"sqs:GetQueueUrl",
								"sqs:SendMessage"
							],
							resources: [
								stack.sqs.websiteQueue.queueArn,
								stack.sqs.changeQueue.queueArn,
								stack.sqs.endQueue.queueArn
							]
						})
					]
				})
			}
		});

		this.stateMachineRole = new Role(stack, "StateMachineRole", {
			description: "Generic role for State Machines in website-alerter stack",
			assumedBy: new ServicePrincipal("states.amazonaws.com"),
			inlinePolicies: {
				//read database
				Data: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"dynamodb:ListTables",
								"dynamodb:DescribeTable",
								"dynamodb:GetItem",
								"dynamodb:Query",
								"dynamodb:Scan"
							],
							resources: [
								stack.dynamo.websiteTable.tableArn,
								`${stack.dynamo.websiteTable.tableArn}/index/*`
							]
						})]
				})
			}
		});
	}
}