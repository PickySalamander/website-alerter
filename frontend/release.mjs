import {CloudFormationClient, DescribeStacksCommand} from "@aws-sdk/client-cloudformation";
import {S3Client} from "@aws-sdk/client-s3";
import * as fs from "fs";
import {S3SyncClient} from "s3-sync-client";
import {CloudFrontClient, CreateInvalidationCommand} from "@aws-sdk/client-cloudfront";
import mime from 'mime-types';

console.log("Looking up stack outputs for bucket and cloud front information...");

const cloudFormationClient = new CloudFormationClient();

const stacks = await cloudFormationClient.send(new DescribeStacksCommand({
	StackName: "website-alerter"
}));

if (stacks.Stacks.length > 1) {
	throw new Error(`Found too many stacks (${stacks.Stacks.length}) to proceed.`);
}

const cdnID = findOutput("WebsiteAlerterCdnId");
if (!cdnID) {
	throw new Error("Failed to find cdn output in the stack");
}

const bucketName = findOutput("WebsiteAlerterBucket");
if (!bucketName) {
	throw new Error("Failed to find bucket name output in the stack");
}

const s3Loc = `s3://${bucketName}/web`;

console.log(`Syncing files to ${s3Loc}...`);

if (!fs.existsSync("dist/website-alerter/browser")) {
	throw new Error("Failed to find folder, is web built?");
}

const s3Client = new S3Client({});
const {sync} = new S3SyncClient({client: s3Client});

const syncOutput = await sync("dist/website-alerter/browser", s3Loc, {
	del: true,
	commandInput: (input) => ({
		ContentType: mime.lookup(input.Key) || 'text/html'
	})
});

console.log(`${syncOutput.deleted.length} files deleted and ${syncOutput.created.length} files uploaded.`);

console.log(`Creating invalidation on ${cdnID}...`);

const cloudFrontClient = new CloudFrontClient({});

await cloudFrontClient.send(new CreateInvalidationCommand({
	DistributionId: cdnID,
	InvalidationBatch: {
		Paths: {
			Quantity: 1,
			Items: ["/index.html"]
		},
		CallerReference: `release-${new Date().getTime()}`
	}
}));

console.log("All done!");

function findOutput(key) {
	const outputs = stacks.Stacks[0].Outputs;
	if (!outputs) {
		return undefined;
	}

	for (const output of outputs) {
		if (output.OutputKey === key) {
			return output.OutputValue;
		}
	}
}
