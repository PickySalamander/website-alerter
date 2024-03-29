# Local Development
Here are the instructions for developing and running this project locally. Building and testing locally is best done with [AWS SAM](https://aws.amazon.com/serverless/sam/).

# Prerequisites
- Node.js 20+
- Docker
- [CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Local Docker DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)

# Initial Setup
Here's the first time setup for developing locally:

1. Build and deploy a build of the stack on AWS or make an S3 bucket somewhere that SAM can access locally. It will need to have a "jwt.key" file in the root of the bucket.
2. Initially you will need to populate your local DynamoDB table with the run, users, sites, and revision tables. Refer to [dynamo.stack.ts](src/stack/dynamo.stack.ts) for their structure. They don't need to be populated.
3. Make an `env.json` file to supply environmental variables to SAM. A sample file is located [here](sample/env.json).

# Building and Running

1. Build the project with `npm run build:local`, this will do the following three things:
   1. Build process-site and login TypeScript and copy required files for Docker.
   2. Generate the CDK template.
   3. Build with SAM, which will build the Docker image.
2. Run a lambda function with SAM: `sam local invoke ScheduledStart -e sample/scheduled-start.json -n env.json -t cdk.out/WebsiteAlerter.template.json`. Sample Lambda events exist in the [sample](sample) folder.
3. Run a webserver with SAM: `sam local start-api -n env.json -t cdk.out/WebsiteAlerter.template.json`.