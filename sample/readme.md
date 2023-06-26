# Website Alerter Samples
This folder contains a series of files for examples and local development. Their descriptions are below:

- [config.json](config.json) - config file to install in the S3 bucket.
- [env.json](env.json) - environmental variables to use for local SAM running
- [scheduled-start.json](scheduled-start.json) - sample event sent to the [scheduled-start.ts](../src/functions/scheduled-start.ts) lambda function.
- [process-site.json](process-site.json) - sample event sent to the [process-site.ts](../src/functions/process-site.ts) lambda function.
- [detect-changes.json](detect-changes.json) - sample event sent to the [detect-changes.ts](../src/functions/detect-changes.ts) lambda function.
- [scheduled-end.json](scheduled-end.json) - sample event sent to the [scheduled-end.ts](../src/functions/scheduled-end.ts) lambda function.
