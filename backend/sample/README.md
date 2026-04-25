# Website Alerter Samples
This folder contains a series of files for examples and local development. Their descriptions are below:

- [env.json](env.json): environmental variables to use for local SAM running. Replace the `CONFIG_S3` parameter with a S3 bucket that can be used.
- [poll-sites.json](poll-sites.json): sample event sent to the [poll-sites.ts](../src/functions/process/poll-sites.ts) lambda function.
