/*
This is a build script to compile process-site to be used in a Docker image and then copy over required files.
 */

import * as esbuild from 'esbuild';
import fs from "fs/promises";

//build the typescript
await esbuild.build({
	entryPoints: ["src/functions/process-site.ts"],
	bundle: true,
	minify: true,
	sourcemap: true,
	outfile: 'build/process-site/index.js',
	target: "es2020",
	platform: "node",
	external: [ "vm2" ] //vm2 really wasn't built to be packaged with typescript, so it needs to be external
});

//copy required files
await fs.copyFile("src/docker/Dockerfile", "build/process-site/Dockerfile");
await fs.copyFile("src/docker/package.json", "build/process-site/package.json");
await fs.copyFile("src/docker/puppeteer.config.js", "build/process-site/puppeteer.config.js");

await esbuild.build({
	entryPoints: ["src/functions/scheduled-start.ts"],
	bundle: true,
	minify: true,
	sourcemap: true,
	outfile: 'build/scheduled-start/index.js',
	target: "es2020",
	platform: "node"
});