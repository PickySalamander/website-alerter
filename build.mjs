import * as esbuild from 'esbuild';
import fs from "fs/promises";

await esbuild.build({
	entryPoints: ["src/functions/process-site.ts"],
	bundle: true,
	minify: true,
	sourcemap: true,
	outfile: 'build/process-site/app.js',
	target: "es2020",
	platform: "node",
	external: [ "vm2" ]
});

await fs.copyFile("src/docker/Dockerfile", "build/process-site/Dockerfile");
await fs.copyFile("src/docker/package.json", "build/process-site/package.json");
await fs.copyFile("src/docker/puppeteer.config.js", "build/process-site/puppeteer.config.js");

