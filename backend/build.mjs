/*
This is a build script to compile process-site to be used in a Docker image and then copy over required files.
 */

import * as esbuild from 'esbuild';
import fs from "fs/promises";

//build the typescript
await esbuild.build({
	entryPoints: ["src/functions/process/process-site.ts"],
	bundle: true,
	minify: true,
	outfile: 'build/process-site/index.js',
	target: "es2020",
	platform: "node",
	external: [ "vm2" ] //vm2 really wasn't built to be packaged with typescript, so it needs to be external
});

//copy required files
await fs.copyFile("src/docker/process-site/Dockerfile", "build/process-site/Dockerfile");
await fs.copyFile("src/docker/process-site/package.json", "build/process-site/package.json");
await fs.copyFile("src/docker/process-site//puppeteer.config.js", "build/process-site/puppeteer.config.js");

//build the typescript
await esbuild.build({
	entryPoints: ["src/functions/api/login.ts"],
	bundle: true,
	minify: true,
	outfile: 'build/login/index.js',
	target: "es2020",
	platform: "node",
	external: [ "bcrypt" ]
});

//copy required files
await fs.copyFile("src/docker/login/Dockerfile", "build/login/Dockerfile");