# Website Alerter Samples
This folder contains a series of files for examples and local development. Their descriptions are below:

- [env.json](env.json) - environmental variables to use for local SAM running. Replace the `CONFIG_S3` parameter with a S3 bucket that can be used.
- [scheduled-start.json](scheduled-start.json) - sample event sent to the [scheduled-start.ts](../src/functions/process/scheduled-start.ts) lambda function.
- [process-site.json](process-site.json) - sample event sent to the [process-site.ts](../src/functions/process/process-site.ts) lambda function.
- [detect-changes.json](detect-changes.json) - sample event sent to the [detect-changes.ts](../src/functions/process/detect-changes.ts) lambda function.
- [scheduled-end.json](scheduled-end.json) - sample event sent to the [scheduled-end.ts](../src/functions/process/scheduled-end.ts) lambda function.
