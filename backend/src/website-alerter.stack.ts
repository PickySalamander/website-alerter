import {CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {IamStack} from "./stack/iam.stack";
import {LambdaStack} from "./stack/lambda.stack";
import {ApiStack} from "./stack/api.stack";
import {DynamoStack} from "./stack/dynamo.stack";

import {CdnStack} from "./stack/cdn.stack";
import {ApiLambdaStack} from "./stack/api-lambda";
import {StepStack} from "./stack/step.stack";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	public readonly iam:IamStack;

	public readonly lambda:LambdaStack;

	public readonly apiLambda:ApiLambdaStack;

	public readonly dynamo:DynamoStack;

	public readonly cdn:CdnStack;

	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		this.dynamo = new DynamoStack(this);

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

		// create the role that all lambda functions use
		this.iam = new IamStack(this);

		this.lambda = new LambdaStack(this);

		new StepStack(this);

		// create the event bridge rule that starts up the whole process every 7 days
		// new Rule(this, "ScheduledStartRule", {
		// 	description: "Schedule the lambda to queue up the websites",
		// 	schedule: Schedule.expression(`cron(${RunScheduling.CRON})`),
		// 	enabled: false,
		// 	targets: [new LambdaFunction(this.lambda.scheduledStart)]
		// });

		this.apiLambda = new ApiLambdaStack(this);

		new ApiStack(this);
	}
}
