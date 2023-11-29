import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {IamStack} from "./stack/iam.stack";
import {SqsStack} from "./stack/sqs.stack";
import {LambdaStack} from "./stack/lambda.stack";
import {ApiStack} from "./stack/api.stack";
import {DynamoStack} from "./stack/dynamo.stack";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	public readonly sqs:SqsStack;

	public readonly iam:IamStack;

	public readonly lambda:LambdaStack;

	public readonly dynamo:DynamoStack;

	constructor(scope:Construct, id:string, props?:StackProps) {
		super(scope, id, props);

		this.dynamo = new DynamoStack(this);

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY
		});

		this.sqs = new SqsStack(this);

		// create the role that all lambda functions use
		this.iam = new IamStack(this);

		this.lambda = new LambdaStack(this);

		new ApiStack(this);
	}
}
