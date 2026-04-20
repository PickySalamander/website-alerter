#!/usr/bin/env node

import 'source-map-support/register';
import {App} from "aws-cdk-lib";
import {WebsiteAlerterStack} from "./stack/website-alerter.stack";
import * as esbuild from "esbuild";
import * as fs from "fs/promises";
import path from "path";

const app = new App();

const isLocal:boolean = app.node.tryGetContext("config") === "local";

/** Build a docker project into a distribution directory */
(async() => {
	console.info("Building docker image...");

	//build the typescript
	await esbuild.build({
		entryPoints: ["src/functions/process/poll-sites.ts"],
		outfile: "build/process-site/index.js",
		bundle: true,
		sourcemap: true,
		minify: true,
		target: "es2024",
		platform: "node"
	});

	//copy required files
	const processSitePath = "src/docker/process-site/";
	for(const file of await fs.readdir(processSitePath)) {
		await fs.copyFile(path.resolve(processSitePath, file), path.resolve("build/process-site", file));
	}

	console.info("Building stack...");

	new WebsiteAlerterStack(app, 'WebsiteAlerter', isLocal);
})();
