# Website Alerter Tool

## Local Development

1. Build the project: `cdk synth --no-staging`
2. Run the project with SAM: `sam local invoke ScheduledStart -e sample/scheduled-start.json -n env.json -t cdk.out/WebsiteAlerter.template.json`