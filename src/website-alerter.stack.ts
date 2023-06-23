import {CfnParameter, Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
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
import {Topic} from "aws-cdk-lib/aws-sns";
import {EmailSubscription} from "aws-cdk-lib/aws-sns-subscriptions";

export class WebsiteAlerterStack extends Stack {
	private readonly websiteTable:Table;
	private readonly runThroughTable:Table;
	private readonly websiteQueue:Queue;
	private readonly changeQueue:Queue;
	private readonly notificationSns:Topic;
	private readonly configBucket:Bucket;
	private readonly endQueue:Queue;

	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		this.websiteTable = new Table(this, "WebsiteTable", {
			tableName: "website-alerter-sites",
			partitionKey: {
				name: "site",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		this.runThroughTable = new Table(this, "RunThroughTable", {
			tableName: "website-alerter-run",
			partitionKey: {
				name: "id",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		const deadQueue = new Queue(this, "WebsiteDeadQueue");

		this.websiteQueue = new Queue(this, "WebsiteQueue", {
			queueName: "website-alerter-queue",
			visibilityTimeout: Duration.minutes(2),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		});

		this.changeQueue = new Queue(this, "ChangeQueue", {
			queueName: "website-alerter-change",
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		})

		this.endQueue = new Queue(this, "EndQueue", {
			queueName: "website-alerter-end",
			deliveryDelay: Duration.minutes(10),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		})

		this.notificationSns = new Topic(this, "WebsiteAlertNotifications");
		const emailAddress = new CfnParameter(this, "notificationEmail");
		this.notificationSns.addSubscription(new EmailSubscription(emailAddress.valueAsString));

		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY
		});

		const lambdaRole = this.createLambdaRole();

		const scheduledStartFunc = new NodejsFunction(this, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will parse the config files and queue all the sites to SQS",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-start.ts",
			handler: "handler",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": this.configBucket.bucketName,
				"WEBSITE_TABLE": this.websiteTable.tableName,
				"WEBSITE_QUEUE_NAME": this.websiteQueue.queueUrl,
				"RUN_TABLE": this.runThroughTable.tableName,
				"END_QUEUE": this.endQueue.queueUrl,
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
				"CONFIG_S3": this.configBucket.bucketName,
				"WEBSITE_TABLE": this.websiteTable.tableName,
				"CHANGE_QUEUE_NAME": this.changeQueue.queueUrl,
				"RUN_TABLE": this.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			logRetention: RetentionDays.ONE_MONTH,
			events: [
				new SqsEventSource(this.websiteQueue)
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
				"CONFIG_S3": this.configBucket.bucketName,
				"WEBSITE_TABLE": this.websiteTable.tableName,
				"RUN_TABLE": this.runThroughTable.tableName,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(this.changeQueue)
			],
			logRetention: RetentionDays.ONE_MONTH
		});

		new NodejsFunction(this, "ScheduledEnd", {
			description: "Detect the changes from the browser processing and notify",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-end.ts",
			handler: "handler",
			role: lambdaRole,
			environment: {
				"CONFIG_S3": this.configBucket.bucketName,
				"WEBSITE_TABLE": this.websiteTable.tableName,
				"RUN_TABLE": this.runThroughTable.tableName,
				"NOTIFICATION_SNS": this.notificationSns.topicArn,
				"IS_PRODUCTION": "true"
			},
			events: [
				new SqsEventSource(this.endQueue)
			],
			logRetention: RetentionDays.ONE_MONTH
		});
	}

	private createLambdaRole():Role {
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
								"dynamodb:UpdateItem",
								"dynamodb:PutItem"
							],
							resources: [this.websiteTable.tableArn, this.runThroughTable.tableArn]
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"s3:GetObject",
								"s3:PutObject"
							],
							resources: [`${this.configBucket.bucketArn}/*`]
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
							resources: [
								this.websiteQueue.queueArn,
								this.changeQueue.queueArn,
								this.endQueue.queueArn
							]
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"sns:Publish"
							],
							resources: [this.notificationSns.topicArn]
						})
					]
				})
			}
		});
	}
}
