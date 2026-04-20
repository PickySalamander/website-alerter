import {WebsiteAlerterStack} from "./website-alerter.stack";
import {Distribution, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";
import {CfnOutput} from "aws-cdk-lib";
import {Construct} from "constructs";
import {S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins";

/**
 * Part of the CDK stack that concerns the CloudFront CDN used by the frontend.
 */
export class CdnStack extends Construct {
	/** The created CloudFront CDN */
	public readonly cdn:Distribution;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		super(stack, "CDN");

		this.cdn = new Distribution(this, "WebsiteAlerterCdn", {
			comment: "website-alerter frontend",
			defaultBehavior: {
				//create the access policy that allows CloudFront to access the S3 bucket
				origin: S3BucketOrigin.withOriginAccessControl(stack.configBucket, {originPath: "web/"}),
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				compress: true
			},
			errorResponses: [
				//for SPA sites to make a redirect when the file isn't found
				{httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html"},
				{httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html"},
			]
		})

		//output the distribution id
		new CfnOutput(stack, "WebsiteAlerterCdnId", {
			description: "The distribution ID of the CDN",
			value: this.cdn.distributionId
		});

		//output the distribution domain name
		new CfnOutput(stack, "WebsiteAlerterCdnUrl", {
			description: "The distribution domain name of the CDN",
			value: this.cdn.distributionDomainName
		});
	};
}
