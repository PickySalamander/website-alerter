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

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** Website dynamo table*/
	private readonly websiteTable:Table;

	/** Alerter run dynamo table*/
	private readonly runThroughTable:Table;

	/** Start website polling SQS queue */
	private readonly websiteQueue:Queue;

	/** Start detecting change SQS queue */
	private readonly changeQueue:Queue;

	/** Email notification SNS queue */
	private readonly notificationSns:Topic;

	/** S3 bucket for configuration and storage of files */
	private readonly configBucket:Bucket;

	/** Final maintenance queue with a delay to make sure everything finished ok */
	private readonly endQueue:Queue;

	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		// create the website table
		this.websiteTable = new Table(this, "WebsiteTable", {
			tableName: "website-alerter-sites",
			partitionKey: {
				name: "site",
				type: AttributeType.STRING
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the run table
		this.runThroughTable = new Table(this, "RunThroughTable", {
			tableName: "website-alerter-run",
			partitionKey: {
				name: "id",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create a dead letter queue, that we don't really monitor, but we can use maxReceiveCount now.
		const deadQueue = new Queue(this, "WebsiteDeadQueue");

		// create the website polling queue
		this.websiteQueue = new Queue(this, "WebsiteQueue", {
			queueName: "website-alerter-queue",
			visibilityTimeout: Duration.minutes(2),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		});

		// create the detect changes queue
		this.changeQueue = new Queue(this, "ChangeQueue", {
			queueName: "website-alerter-change",
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		})

		// create the final maintenance queue with a 10 minute delay
		this.endQueue = new Queue(this, "EndQueue", {
			queueName: "website-alerter-end",
			deliveryDelay: Duration.minutes(10),
			deadLetterQueue: {
				queue: deadQueue,
				maxReceiveCount: 3
			}
		})

		// create the email notification SNS stream and add the email parameter from the input
		this.notificationSns = new Topic(this, "WebsiteAlertNotifications");
		const emailAddress = new CfnParameter(this, "notificationEmail");
		this.notificationSns.addSubscription(new EmailSubscription(emailAddress.valueAsString));

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY
		});

		// create the role that all lambda functions use
		const lambdaRole = this.createLambdaRole();

		// creat the scheduled start function which starts the whole process when hit with the event bridge rule
		const scheduledStartFunc = new NodejsFunction(this, "ScheduledStart", {
			description: "Scheduled start of the scraping process this will parse the config files and queue all " +
				"the sites to SQS",
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

		// create the event bridge rule that starts up the whole process every 7 days
		new Rule(this, "ScheduledStartRule", {
			description: "Schedule the lambda to queue up the websites",
			schedule: Schedule.rate(Duration.days(7)),
			targets: [new LambdaFunction(scheduledStartFunc)]
		});

		// create the docker image lambda function that triggers the website polling with Puppeteer. This needs to be
		// built with "npm run build" first.
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
			//bigger memory size and timeout to give a chance for puppeteer to run
			memorySize: 1024,
			timeout: Duration.minutes(1)
		});

		// detect changes from the recently polled website
		new NodejsFunction(this, "DetectChanges", {
			description: "Detect the changes from the browser processing",
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

		// called after the whole flow is finished to follow up on the whole process
		new NodejsFunction(this, "ScheduledEnd", {
			description: "Finalize the whole flow by finishing up any lingering tasks, email the user via SNS, and " +
				"perform some final maintenance.",
			runtime: Runtime.NODEJS_18_X,
			entry: "src/functions/scheduled-end.ts",
			handler: "handler",
			role: lambdaRole,
			timeout: Duration.seconds(30),
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

	/** Create the IAM role that all the lambda functions will use */
	private createLambdaRole():Role {
		return new Role(this, "LambdaIAMRole", {
			roleName: "website-alerter-role",
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
								"dynamodb:UpdateItem",
								"dynamodb:PutItem"
							],
							resources: [this.websiteTable.tableArn, this.runThroughTable.tableArn]
						}),
						new PolicyStatement({
							effect: Effect.ALLOW,
							actions: [
								"s3:GetObject",
								"s3:PutObject",
								"s3:DeleteObject"
							],
							resources: [`${this.configBucket.bucketArn}/*`]
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
