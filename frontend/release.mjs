/* Perform a release of the Angular web application, make sure npm run build is called before this. This will take the
following operations:

1. Query the CloudFormation stack and get the S3 bucket and CloudFront template involved in this stack
2. Upload built Angular assets to S3
3. Invalidate the CloudFront cache
*/

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

// get CloudFront's distribution
const cdnID = findOutput("WebsiteAlerterCdnId");
if (!cdnID) {
	throw new Error("Failed to find cdn output in the stack");
}

// get S3 bucket
const bucketName = findOutput("WebsiteAlerterBucket");
if (!bucketName) {
	throw new Error("Failed to find bucket name output in the stack");
}

// get the upload location
const s3Loc = `s3://${bucketName}/web`;
console.log(`Syncing files to ${s3Loc}...`);

// make sure the distribution is built
if (!fs.existsSync("dist/website-alerter/browser")) {
	throw new Error("Failed to find folder, is web built?");
}

// Sync the files up to S3
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

// Invalidate index.html
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

/**
 * Find the named output in a CloudFormation stack
 * @param key the key of the output to get
 */
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
