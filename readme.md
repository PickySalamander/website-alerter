# Website Alerter Tool

## Local Development

1. Build the project: `cdk synth --no-staging`
2. Run the project with SAM: `sam local invoke ProcessSite -e sample/process-site.json -n sample/env.json -t cdk.out/WebsiteAlerter.template.json`