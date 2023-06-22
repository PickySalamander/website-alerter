import {Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DockerImageCode, DockerImageFunction, Runtime} from "aws-cdk-lib/aws-lambda";
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
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		const websiteQueue = new Queue(this, "WebsiteQueue", {
			queueName: "website-alerter-queue",
			visibilityTimeout: Duration.minutes(2)
		});

		const changeQueue = new Queue(this, "ChangeQueue", {
			queueName: "website-alerter-change"
		})

		const configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY
		});

		const lambdaRole = this.createLambdaRole(websiteTable, websiteQueue, changeQueue, configBucket);

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

		new DockerImageFunction(this, "ProcessSite", {
			code: DockerImageCode.fromImageAsset("build/process-site"),
			description: "Scheduled call to the function to start scrapping process",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": configBucket.bucketName,
				"WEBSITE_TABLE": websiteTable.tableName,
				"CHANGE_QUEUE_NAME": changeQueue.queueUrl,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH,
			events: [
				new SqsEventSource(websiteQueue)
			],
			memorySize: 1024,
			timeout: Duration.minutes(1)
		});

		new NodejsFunction(this, "DetectChanges", {
			description: "Detect the changes from the browser processing and notify",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/detect-changes.ts",
			handler: "handler",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": configBucket.bucketName,
				"WEBSITE_TABLE": websiteTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(changeQueue)
			],
			logRetention: RetentionDays.ONE_MONTH
		});
	}

	private createLambdaRole(websiteTable:Table, websiteQueue:Queue, changeQueue:Queue, configBucket:Bucket):Role {
		return new Role(this, "LambdaIAMRole", {
			roleName: "website-alerter-role",
			description: "Generic role for Lambdas in website-alerter stack",
			assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
			inlinePolicies: {
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
				Data: new PolicyDocument({
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
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"s3:GetObject",
								"s3:PutObject",
								"s3:DeleteObject"
							],
							resources: [`${configBucket.bucketArn}/*`]
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
							resources: [websiteQueue.queueArn, changeQueue.queueArn]
						})
					]
				})
			}
		});
	}
}
