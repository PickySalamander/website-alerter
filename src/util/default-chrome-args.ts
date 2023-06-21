import puppeteer from "puppeteer";

export function DefaultChromeArgs() {
	const puppeteerFlags = puppeteer.defaultArgs();

	const puppeteerDisableFeatures = [
		"Translate",
		"BackForwardCache",
		// AcceptCHFrame disabled because of crbug.com/1348106.
		"AcceptCHFrame",
		"MediaRouter",
		"OptimizationHints",
	];

	const puppeteerEnableFeatures = ["NetworkServiceInProcess2"];

	const chromiumFlags = [
		"--disable-domain-reliability", // https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md#background-networking
		"--disable-print-preview", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisablePrintPreview&ss=chromium
		"--disable-speech-api", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSpeechAPI&ss=chromium
		"--disk-cache-size=33554432", // https://source.chromium.org/search?q=lang:cpp+symbol:kDiskCacheSize&ss=chromium
		"--mute-audio", // https://source.chromium.org/search?q=lang:cpp+symbol:kMuteAudio&ss=chromium
		"--no-default-browser-check", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoDefaultBrowserCheck&ss=chromium
		"--no-pings", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoPings&ss=chromium
		"--single-process", // Needs to be single-process to avoid `prctl(PR_SET_NO_NEW_PRIVS) failed` error
	];

	const chromiumDisableFeatures = [
		"AudioServiceOutOfProcess",
		"IsolateOrigins",
		"site-per-process",
	];

	const chromiumEnableFeatures = ["SharedArrayBuffer"];

	const graphicsFlags = [
		"--hide-scrollbars", // https://source.chromium.org/search?q=lang:cpp+symbol:kHideScrollbars&ss=chromium
		"--ignore-gpu-blocklist", // https://source.chromium.org/search?q=lang:cpp+symbol:kIgnoreGpuBlocklist&ss=chromium
		"--in-process-gpu", // https://source.chromium.org/search?q=lang:cpp+symbol:kInProcessGPU&ss=chromium
		"--window-size=1920,1080", // https://source.chromium.org/search?q=lang:cpp+symbol:kWindowSize&ss=chromium
		"--disable-webgl"
	];

	const insecureFlags = [
		"--allow-running-insecure-content", // https://source.chromium.org/search?q=lang:cpp+symbol:kAllowRunningInsecureContent&ss=chromium
		"--disable-setuid-sandbox", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSetuidSandbox&ss=chromium
		"--disable-site-isolation-trials", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSiteIsolation&ss=chromium
		"--disable-web-security", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableWebSecurity&ss=chromium
		"--no-sandbox", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoSandbox&ss=chromium
		"--no-zygote", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoZygote&ss=chromium
	];

	return [
		...puppeteerFlags,
		...chromiumFlags,
		`--disable-features=${[
			...puppeteerDisableFeatures,
			...chromiumDisableFeatures,
		].join(",")}`,
		`--enable-features=${[
			...puppeteerEnableFeatures,
			...chromiumEnableFeatures,
		].join(",")}`,
		...graphicsFlags,
		...insecureFlags,
	];
}