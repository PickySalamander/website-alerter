import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {IamStack} from "./stack/iam.stack";
import {SqsStack} from "./stack/sqs.stack";
import {LambdaStack} from "./stack/lambda.stack";

/** CDK code to build the Website Alerter Tool's serverless stack */
export class WebsiteAlerterStack extends Stack {
	/** Website dynamo table*/
	public readonly websiteTable:Table;

	/** Alerter run dynamo table*/
	public readonly runThroughTable:Table;

	/** S3 bucket for configuration and storage of files */
	public readonly configBucket:Bucket;

	public readonly sqs:SqsStack;

	public readonly iam:IamStack;

	public readonly lambda:LambdaStack;

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

		// create the S3 bucket
		this.configBucket = new Bucket(this, 'ConfigurationBucket', {
			removalPolicy: RemovalPolicy.DESTROY
		});

		this.sqs = new SqsStack(this);

		// create the role that all lambda functions use
		this.iam = new IamStack(this);

		this.lambda = new LambdaStack(this);
	}
}
