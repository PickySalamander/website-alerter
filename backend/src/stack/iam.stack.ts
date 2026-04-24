import {Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {WebsiteAlerterStack} from "./website-alerter.stack";
import {Construct} from "constructs";
import {ArnFormat} from "aws-cdk-lib";

/**
 * Part of the CDK stack that concerns the IAM roles used
 */
export class IamStack extends Construct {
	/** Role for lambda functions */
	public readonly lambdaRole:Role;

	/** Create the stack */
	constructor(private stack:WebsiteAlerterStack) {
		super(stack, "IAM");

		//default running policies
		const defaultPolicies:{ [p:string]:PolicyDocument } = {
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
							stack.dynamo.revisionTable.tableArn,
							`${stack.dynamo.revisionTable.tableArn}/index/*`
						]
					}),
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							"s3:GetObject",
							"s3:PutObject",
							"s3:DeleteObject",
							"s3:ListBucket"
						],
						resources: [
							stack.configBucket.bucketArn,
							`${stack.configBucket.bucketArn}/*`
						]
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
			}),

			//read and write to required queues and notifications
			Lambda: new PolicyDocument({
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							"lambda:InvokeFunction"
						],
						resources: [
							stack.formatArn({
								arnFormat: ArnFormat.COLON_RESOURCE_NAME,
								service: "lambda",
								resource: "function",
								resourceName: "website-alerter-poll-sites"
							})
						]
					})
				]
			}),

			// Run AI commands
			Ai: new PolicyDocument({
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							"bedrock:InvokeModel"
						],
						resources: [
							"*"
						]
					})
				]
			})
		}

		//create the lambda roles
		this.lambdaRole = new Role(this, "LambdaIAMRole", {
			roleName: "website-alerter-lambda-role",
			description: "Generic role for Lambdas in website-alerter stack",
			assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
			inlinePolicies: defaultPolicies,
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
				ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicDurableExecutionRolePolicy"),
			],
		});
	}
}
