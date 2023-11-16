import puppeteer from "puppeteer";

/** Returns default arguments for the running of Chromium, most of these were taken from
 * <a href="https://github.com/Sparticuz/chromium/blob/master/source/index.ts#L149">@sparticuz/chromium</a>.*/
export function DefaultChromeArgs() {
	//default puppeteer arguments
	const puppeteerFlags = puppeteer.defaultArgs();

	//disable unneeded puppeteer features
	const puppeteerDisableFeatures = [
		"Translate",
		"BackForwardCache",
		// AcceptCHFrame disabled because of crbug.com/1348106.
		"AcceptCHFrame",
		"MediaRouter",
		"OptimizationHints",
	];

	//enable needed puppeteer features
	const puppeteerEnableFeatures = ["NetworkServiceInProcess2"];

	//setchromium features
	const chromiumFlags = [
		"--disable-domain-reliability",
		"--disable-print-preview",
		"--disable-speech-api",
		"--disk-cache-size=33554432",
		"--mute-audio",
		"--no-default-browser-check",
		"--no-pings",
		"--single-process", // Needs to be single-process to avoid `prctl(PR_SET_NO_NEW_PRIVS) failed` error
	];

	//disable unneeded chromium features
	const chromiumDisableFeatures = [
		"AudioServiceOutOfProcess",
		"IsolateOrigins",
		"site-per-process",
	];

	//enabled needed chromium features
	const chromiumEnableFeatures = ["SharedArrayBuffer"];

	//set graphics flags
	const graphicsFlags = [
		"--hide-scrollbars",
		"--ignore-gpu-blocklist",
		"--in-process-gpu",
		"--window-size=1920,1080",
		"--disable-webgl"
	];

	//set insecure flags, these get in the way of headless running
	const insecureFlags = [
		"--allow-running-insecure-content",
		"--disable-setuid-sandbox",
		"--disable-site-isolation-trials",
		"--disable-web-security",
		"--no-sandbox",
		"--no-zygote",
	];

	//combine and return all the flags
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