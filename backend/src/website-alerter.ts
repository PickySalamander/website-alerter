#!/usr/bin/env node

import 'source-map-support/register';
import {App} from "aws-cdk-lib";
import {WebsiteAlerterStack} from "./website-alerter.stack";

const app = new App();
new WebsiteAlerterStack(app, 'WebsiteAlerter', {
	stackName: "website-alerter",
	description: "Tool that scans websites and checks for changes"
});