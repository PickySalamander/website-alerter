import {CfnOutput, CfnParameter, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {IamStack} from "./stack/iam.stack";
import {SqsStack} from "./stack/sqs.stack";
import {LambdaStack} from "./stack/lambda.stack";
import {ApiStack} from "./stack/api.stack";
import {DynamoStack} from "./stack/dynamo.stack";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";

import {CdnStack} from "./stack/cdn.stack";
import {RunScheduling} from "website-alerter-shared";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	public readonly sqs:SqsStack;

	public readonly iam:IamStack;

	public readonly lambda:LambdaStack;

	public readonly dynamo:DynamoStack;

	public readonly cdn:CdnStack;

	private readonly includeLocalCors:CfnParameter;

	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		this.dynamo = new DynamoStack(this);

		//TODO hook this up
		this.includeLocalCors = new CfnParameter(this, "includeLocalCors", {
			type: "String",
			description: "Should localhost be included in the CORS config?",
			allowedValues: ["true", "false"],
			"default": "true"
		});

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			websiteIndexDocument: "index.html",
			websiteErrorDocument: "index.html"
		});

		new CfnOutput(this, "WebsiteAlerterBucket", {
			description: "The alerter bucket with content",
			value: this.configBucket.bucketName
		});

		this.cdn = new CdnStack(this);

		this.sqs = new SqsStack(this);

		// create the role that all lambda functions use
		this.iam = new IamStack(this);

		this.lambda = new LambdaStack(this);

		// create the event bridge rule that starts up the whole process every 7 days
		new Rule(this, "ScheduledStartRule", {
			description: "Schedule the lambda to queue up the websites",
			schedule: Schedule.expression(`cron(${RunScheduling.CRON})`),
			enabled: false,
			targets: [new LambdaFunction(this.lambda.scheduledStart)]
		});

		new ApiStack(this);
	}
}
