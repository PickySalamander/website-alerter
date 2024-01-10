import {WebsiteAlerterStack} from "../website-alerter.stack";
import {CachePolicy, CfnDistribution, CfnOriginAccessControl, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";
import {Effect, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {CfnOutput} from "aws-cdk-lib";

/**
 * Part of the CDK stack that concerns the CloudFront CDN used by the frontend. Unfortunately, CloudFront L2 support in
 * the CDK is a little lacking. This is class configures primarily with L1.
 *
 * @see https://github.com/aws/aws-cdk/issues/21771
 */
export class CdnStack {
	/** The created CloudFront CDN */
	public readonly cdn:CfnDistribution;

	/** Create the stack */
	constructor(stack:WebsiteAlerterStack) {
		//create the access policy that allows CloudFront to access the S3 bucket
		const oac = new CfnOriginAccessControl(stack, "AlerterCdnOac", {
			originAccessControlConfig: {
				name: stack.stackName,
				description: "Allow CDN to access S3 bucket",
				originAccessControlOriginType: "s3",
				signingBehavior: "always",
				signingProtocol: "sigv4"
			}
		});

		//create the cdn
		this.cdn = new CfnDistribution(stack, "WebsiteAlerterCDN", {
			distributionConfig: {
				comment: "website-alerter",
				defaultCacheBehavior: {
					viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					targetOriginId: "only-origin",
					cachePolicyId: CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
					compress: true
				},
				origins: [
					{
						domainName: stack.configBucket.bucketDomainName,
						originPath: "/web",
						id: "only-origin",
						s3OriginConfig: {
							originAccessIdentity: ''
						},
						originAccessControlId: oac.attrId
					}
				],
				enabled: true,
				customErrorResponses: [
					//for SPA sites to make a redirect when the file isn't found
					{errorCode: 403, responseCode: 200, responsePagePath: "/index.html"},
					{errorCode: 404, responseCode: 200, responsePagePath: "/index.html"},
				]
			}
		});

		//Allow the CloudFront dist to only get objects from the /web/* path in the bucket
		stack.configBucket.addToResourcePolicy(new PolicyStatement({
			sid: "s3-website",
			effect: Effect.ALLOW,
			actions: ["s3:GetObject"],
			principals: [
				new ServicePrincipal("cloudfront.amazonaws.com")
			],
			resources: [`${stack.configBucket.arnForObjects("web/*")}`],
			conditions: {
				"StringEquals": {
					"AWS:SourceArn": `arn:aws:cloudfront::${stack.account}:distribution/${this.cdn.ref}`
				}
			}
		}));

		//output the distribution id
		new CfnOutput(stack, "WebsiteAlerterCdnId", {
			description: "The distribution ID of the CDN",
			value: this.cdn.ref
		});

		//output the distribution domain name
		new CfnOutput(stack, "WebsiteAlerterCdnUrl", {
			description: "The distribution domain name of the CDN",
			value: this.cdn.attrDomainName
		});
	};
}