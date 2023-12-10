import {WebsiteAlerterStack} from "../website-alerter.stack";
import {CachePolicy, CfnDistribution, CfnOriginAccessControl, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";
import {Effect, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {CfnOutput} from "aws-cdk-lib";

//https://github.com/aws/aws-cdk/issues/21771
export class CdnStack {
	public readonly cdn:CfnDistribution;

	constructor(stack:WebsiteAlerterStack) {
		const oac = new CfnOriginAccessControl(stack, "AlerterCdnOac", {
			originAccessControlConfig: {
				name: stack.stackName,
				description: "Allow CDN to access S3 bucket",
				originAccessControlOriginType: "s3",
				signingBehavior: "always",
				signingProtocol: "sigv4"
			}
		});

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
					{errorCode: 403, responseCode: 200, responsePagePath: "/index.html"},
					{errorCode: 404, responseCode: 200, responsePagePath: "/index.html"},
				]
			}
		});

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

		new CfnOutput(stack, "WebsiteAlerterCdnId", {
			description: "The distribution ID of the CDN",
			value: this.cdn.ref
		});

		new CfnOutput(stack, "WebsiteAlerterCdnUrl", {
			description: "The distribution ID of the CDN",
			value: this.cdn.attrDomainName
		});
	};
}