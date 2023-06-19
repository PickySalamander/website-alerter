import {Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {RetentionDays} from "aws-cdk-lib/aws-logs";

export class WebsiteAlerterStack extends Stack {
	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		const websiteTable = new Table(this, "WebsiteTable", {
			tableName: "website-alerter-sites",
			partitionKey: {
				name: "site",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST
		});

		const websiteQueue = new Queue(this, "WebsiteQueue", {
			queueName: "website-alerter-queue"
		});

		const configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.RETAIN,
			bucketName: "website-alerter"
		});

		const lambdaRole = this.createLambdaRole(websiteTable, websiteQueue, configBucket);

		const scheduledStartFunc = new NodejsFunction(this, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will parse the config files and queue all the sites to SQS",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-start.ts",
			handler: "handler",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": configBucket.bucketName,
				"WEBSITE_TABLE": websiteTable.tableName,
				"WEBSITE_QUEUE_NAME": websiteQueue.queueUrl,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH
		});

		new Rule(this, "ScheduledStartRule", {
			description: "Schedule the lambda to queue up the websites",
			schedule: Schedule.rate(Duration.days(7)),
			targets: [new LambdaFunction(scheduledStartFunc)]
		});

		new NodejsFunction(this, "ProcessSite", {
			description: "Scheduled call to the function to start scrapping process",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/process-site.ts",
			handler: "handler",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": configBucket.bucketName,
				"WEBSITE_TABLE": websiteTable.tableName,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH,
			events: [
				new SqsEventSource(websiteQueue)
			]
		});
	}

	private createLambdaRole(websiteTable:Table, websiteQueue:Queue, configBucket:Bucket):Role {
		return new Role(this, "LambdaIAMRole", {
			roleName: "website-alerter-role",
			description: "Generic role for Lambdas in website-alerter stack",
			assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
			inlinePolicies: {
				Read: new PolicyDocument({
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
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"s3:GetObject"
							],
							resources: [`${configBucket.bucketArn}/*`]
						})
					]
				}),
				Dynamo: new PolicyDocument({
					statements: [
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"dynamodb:ListTables",
								"dynamodb:DescribeTable",
								"dynamodb:GetItem",
								"dynamodb:DeleteItem",
								"dynamodb:PutItem",
								"dynamodb:Query",
								"dynamodb:UpdateItem"
							],
							resources: [websiteTable.tableArn]
						})
					]
				}),
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
							resources: [websiteQueue.queueArn]
						})
					]
				})
			}
		});
	}
}
