import {CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, HttpMethods} from "aws-cdk-lib/aws-s3";
import {IamStack} from "./stack/iam.stack";
import {LambdaStack} from "./stack/lambda.stack";
import {ApiStack} from "./stack/api.stack";
import {DynamoStack} from "./stack/dynamo.stack";
import {CdnStack} from "./stack/cdn.stack";
import {ApiLambdaStack} from "./stack/api-lambda";
import {StepStack} from "./stack/step.stack";
import {ParamsStack} from "./stack/params.stack";
import {Topic} from "aws-cdk-lib/aws-sns";
import {EmailSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {CfnRule, Rule, Schedule} from "aws-cdk-lib/aws-events";
import {RunScheduling} from "website-alerter-shared";
import {SfnStateMachine} from "aws-cdk-lib/aws-events-targets";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	/** Iam roles created */
	public readonly iam:IamStack;

	/** Lambda step function tasks */
	public readonly lambda:LambdaStack;

	/** Lambda REST functions */
	public readonly apiLambda:ApiLambdaStack;

	/** All database tables */
	public readonly dynamo:DynamoStack;

	/** CloudFront CDN for frontend */
	public readonly cdn:CdnStack;

	/** CloudFormation input parameters */
	public readonly params:ParamsStack;

	/** Email notification SNS queue */
	public readonly notificationSns:Topic;

	/** Create the stack */
	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		this.params = new ParamsStack(this);

		this.dynamo = new DynamoStack(this);

		// create the email notification SNS stream and add the email parameter from the input
		this.notificationSns = new Topic(this, "WebsiteAlertNotifications");
		this.notificationSns.addSubscription(new EmailSubscription(this.params.emailAddress.valueAsString));

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
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

		this.lambda = new LambdaStack(this);

		const steps = new StepStack(this);

		// create the event bridge rule that starts up the whole process every 7 days
		const rule = new Rule(this, "ScheduledStartRule", {
			description: "Schedule the lambda to queue up the websites",
			schedule: Schedule.expression(`cron(${RunScheduling.CRON})`),
			enabled: false,
			targets: [new SfnStateMachine(steps.stateMachine)]
		});

		//set whether the rule starts enabled
		(rule.node.defaultChild as CfnRule).state = this.params.enableSchedule.toString();

		this.apiLambda = new ApiLambdaStack(this);

		new ApiStack(this);
	}
}
