import {CfnOutput, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, HttpMethods} from "aws-cdk-lib/aws-s3";
import {IamStack} from "./iam.stack";
import {DynamoStack} from "./dynamo.stack";
import {CdnStack} from "./cdn.stack";
import {LambdaStack} from "./lambda.stack";
import {Topic} from "aws-cdk-lib/aws-sns";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	readonly configBucket:Bucket;

	/** Iam roles created */
	readonly iam:IamStack;

	/** Environmental variables that lambdas and processes will use */
	readonly environmentVars:{ [p:string]:string };

	/** Lambda functions */
	readonly lambda:LambdaStack;

	/** All database tables */
	readonly dynamo:DynamoStack;

	/** CloudFront CDN for frontend */
	readonly cdn:CdnStack;

	/** Email notification SNS queue */
	readonly notificationSns:Topic;

	/** Create the stack */
	constructor(scope:Construct, id:string, public readonly isLocal:boolean) {
		super(scope, id, {
			stackName: "website-alerter",
			description: "Tool that scans websites and checks for changes"
		});

		this.dynamo = new DynamoStack(this);

		// create the email notification SNS stream and add the email parameter from the input
		this.notificationSns = new Topic(this, "WebsiteAlertNotifications", {
			topicName: "website-alerter-notifications",
		});

		// this.notificationSns.addSubscription(new EmailSubscription(this.params.emailAddress.valueAsString));

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			bucketName: `website-alerter-${this.accountId}`,
			removalPolicy: RemovalPolicy.DESTROY,
			websiteIndexDocument: "index.html",
			websiteErrorDocument: "index.html",

			//open-ended cors for downloading assets
			cors: [{
				allowedHeaders: ["*"],
				allowedMethods: [HttpMethods.GET],
				allowedOrigins: ["*"],
				maxAge: 3000
			}]
		});

		//output the bucket name
		new CfnOutput(this, "WebsiteAlerterBucket", {
			description: "The alerter bucket with content",
			value: this.configBucket.bucketName
		});

		this.cdn = new CdnStack(this);

		this.iam = new IamStack(this);

		//setup default environmental variables for the functions
		this.environmentVars = {
			"CONFIG_S3": this.configBucket.bucketName,
			"RUN_TABLE": this.dynamo.runThroughTable.tableName,
			"WEBSITE_TABLE": this.dynamo.websiteTable.tableName,
			"REVISION_TABLE": this.dynamo.revisionTable.tableName,
			"NODE_OPTIONS": "--enable-source-maps",
			"IS_PRODUCTION": "true"
		};

		this.lambda = new LambdaStack(this);

		//TODO re-enable this
		// create the event bridge rule that starts up the whole process every 7 days
		// const rule = new Rule(this, "ScheduledStartRule", {
		// 	description: "Schedule the lambda to queue up the websites",
		// 	schedule: Schedule.expression(`cron(${RunScheduling.CRON})`),
		// 	enabled: false,
		// 	targets: [new SfnStateMachine(steps.stateMachine)]
		// });
		//
		// //set whether the rule starts enabled
		// (rule.node.defaultChild as CfnRule).state = this.params.enableSchedule.toString();

		//TODO re-enable this
		// new ApiStack(this);
	}

	get accountId() {
		return Stack.of(this).account;
	}
}
