/*
This is a build script to compile process-site and login to be used in a Docker image and then copy over required files.
 */

import * as esbuild from 'esbuild';
import fs from "fs/promises";
import path from "node:path";

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
const processSitePath = "src/docker/process-site/";
for(const file of await fs.readdir("src/docker/process-site/")) {
	await fs.copyFile(path.resolve(processSitePath, file), path.resolve("build/process-site", file));
}

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