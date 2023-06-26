# Local Development
Here are the instructions for developing and running this project locally. Building and testing locally is best done with [AWS SAM](https://aws.amazon.com/serverless/sam/).

# Prerequisites
- Node.js 18+
- Docker
- [CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)

# Initial Setup
Here's the first time setup for developing locally:

1. Build and deploy a build of the stack on AWS or make an S3 bucket somewhere that SAM can access locally. It will need to have a `config.json` file in the root of the bucket. There is a sample of a config [here](sample/config.json).
2. Initially you will need to populate your local DynamoDB table with the `website-alerter-run` and `website-alerter-sites` tables. Refer to [website-alerter.stack.ts](src/website-alerter.stack.ts) for their structure. They don't need to be populated.
3. Make an `env.json` file to supply environmental variables to SAM. A sample file is located [here](sample/env.json).

# Building and Running

1. Build the project: `npm run build`
2. Compile the CDK for SAM: `cdk synth --no-staging`
3. Build the Docker image: `sam build -t cdk.out/WebsiteAlerter.template.json`
4. Run the project with SAM: `sam local invoke ScheduledStart -e sample/scheduled-start.json -n env.json -t cdk.out/WebsiteAlerter.template.json`. Sample Lambda events exist in the [sample](sample) folder.