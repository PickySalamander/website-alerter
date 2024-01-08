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
import {LambdaFunction, SfnStateMachine} from "aws-cdk-lib/aws-events-targets";
import {StepFunctionsStartExecution} from "aws-cdk-lib/aws-stepfunctions-tasks";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	public readonly iam:IamStack;

	public readonly lambda:LambdaStack;

	public readonly apiLambda:ApiLambdaStack;

	public readonly dynamo:DynamoStack;

	public readonly cdn:CdnStack;

	public readonly params:ParamsStack;

	/** Email notification SNS queue */
	public readonly notificationSns:Topic;

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
			cors: []
		});

		new CfnOutput(this, "WebsiteAlerterBucket", {
			description: "The alerter bucket with content",
			value: this.configBucket.bucketName
		});

		this.cdn = new CdnStack(this);

		this.configBucket.addCorsRule({
			allowedHeaders: ["*"],
			allowedMethods: [HttpMethods.GET],
			allowedOrigins: ["*"],
			maxAge: 3000
		});

		// create the role that all lambda functions use
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

		(rule.node.defaultChild as CfnRule).state = this.params.enableSchedule.toString();

		this.apiLambda = new ApiLambdaStack(this);

		new ApiStack(this);
	}
}
