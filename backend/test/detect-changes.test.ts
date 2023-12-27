// noinspection HtmlUnknownAttribute,CssInvalidHtmlTagReference,JSUnresolvedReference

import * as path from "path";
import * as fs from "fs/promises";
import {ChangeDetector} from "../src/util/change-detector";
import {Parsed} from "../src/util/parsed-html";
import {ParsedDiff} from "diff";
import {ChangeOptions, SiteRevisionState} from "website-alerter-shared";

describe("Detect Changes", () => {
	let file1:string;
	let file2:string;

	beforeAll(async() => {
		file1 = await getTestFile("change-test-1.xml");
		file2 = await getTestFile("change-test-2.xml");
	})

	test("XML Parsing", async() => {
		const parsed = createParsed(file1);

		expect(parsed.formatted).not.toBeNull();
		expect(parsed.html).not.toBeNull();
		expect(parsed.formatted).toContain("class=\"class1 class2 class3\"");
		expect(parsed.formatted).toContain("id=\"123\"");
		expect(parsed.formatted).toContain("style=\"style1 style2 style3\"");
		expect(parsed.formatted).toContain("attr=\"attr1 attr2\"");
		expect(parsed.formatted).toContain("<style>test</style>");
		expect(parsed.formatted).toContain("<script>IGNORED</script>");

		const parse2 = createParsed(file1, {ignoreAttributes: true});

		expect(parse2.formatted).not.toBeNull();
		expect(parse2.html).not.toBeNull();
		expect(parse2.formatted).not.toContain("class=\"class1 class2 class3\"");
		expect(parse2.formatted).not.toContain("id=\"123\"");
		expect(parse2.formatted).not.toContain("style=\"style1 style2 style3\"");
		expect(parse2.formatted).not.toContain("attr=\"attr1 attr2\"");
		expect(parse2.formatted).toContain("<style>test</style>");
		expect(parse2.formatted).toContain("<script>IGNORED</script>");

		const parse3 = createParsed(file1, {ignoreCss: true, ignoreScripts: false});

		expect(parse3.formatted).not.toBeNull();
		expect(parse3.html).not.toBeNull();
		expect(parse3.formatted).not.toContain("class=\"class1 class2 class3\"");
		expect(parse3.formatted).toContain("id=\"123\"");
		expect(parse3.formatted).not.toContain("style=\"style1 style2 style3\"");
		expect(parse3.formatted).toContain("attr=\"attr1 attr2\"");
		expect(parse3.formatted).toContain("<style>IGNORED</style>");
		expect(parse3.formatted).toContain("<script>test1</script>");
	});

	test("Equal", async() => {
		const last = createParsed(file1);

		const current = createParsed(file1);

		const detector = new ChangeDetector(last, current);
		expect(detector.isChanged).toBe(false);
		expect(detector.body).not.toBe("");
		expect(detector.body.split("\n").length).toEqual(4);
		expect(detector.difference).not.toBeNull();
		expect(detector.difference).toHaveLength(1);

		const diff0 = detector.difference[0];
		expect(diff0.hunks).toHaveLength(0);
		expect(diff0.oldFileName).toEqual("old.html")
		expect(diff0.newFileName).toEqual("new.html")
	});

	test("NotEqual", async() => {
		const last = createParsed(file1);

		const current = createParsed(file2);

		const diff0 = createChangeDetector(last, current);
		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(19);

		expect(lines).toContain("-<div class=\"class1 class2 class3\" attr=\"attr1 attr2 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");
		expect(lines).toContain("+<div class=\"class1 class2 class3\" attr=\"attr1 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");

		expect(lines).toContain("-<div class=\"class2 class3\" style=\"style1 style2 style3\" attr=\"attr1 attr2\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");
		expect(lines).toContain("+<div class=\"class2\" style=\"style1 style2 style3\" attr=\"attr1 attr2\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");

		expect(lines).toContain("-pariatur. Excepteur occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
		expect(lines).toContain("+pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");

		expect(lines).toContain("-<span id=\"1234\">test</span>");
		expect(lines).toContain("+<span id=\"123\">test</span>");
	});

	test("NotEqual Classes and Styles", async() => {
		const last = createParsed(file1, {ignoreCss: true, ignoreScripts: false});

		const current = createParsed(file2, {ignoreCss: true, ignoreScripts: false});

		const diff0 = createChangeDetector(last, current);
		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(19);

		expect(lines).toContain("-<div class=\"IGNORED\" attr=\"attr1 attr2 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");
		expect(lines).toContain("+<div class=\"IGNORED\" attr=\"attr1 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");

		expect(lines).toContain("-pariatur. Excepteur occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
		expect(lines).toContain("+pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");

		expect(lines).toContain("-<span id=\"1234\">test</span>");
		expect(lines).toContain("+<span id=\"123\">test</span>");

		expect(lines).toContain("-<script>test1</script>");
		expect(lines).toContain("+<script>test2</script>");
	});

	test("NotEqual Attributes", async() => {
		const last = createParsed(file1, {ignoreAttributes: true});

		const current = createParsed(file2, {ignoreAttributes: true});

		const diff0 = createChangeDetector(last, current);
		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(10);

		expect(lines).toContain("-pariatur. Excepteur occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
		expect(lines).toContain("+pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
	});
});

function createParsed(file:string, options?:ChangeOptions) {
	return new Parsed({
		time: new Date().getTime(),
		revisionID: "a",
		runID: "a",
		siteID: "a",
		siteState: SiteRevisionState.Open
	}, file, options);
}

async function getTestFile(fileName:string) {
	const filePath = path.join(__dirname, fileName);
	const file = await fs.readFile(filePath);
	return file.toString("utf8");
}

function createChangeDetector(last:Parsed, current:Parsed):ParsedDiff {
	const detector = new ChangeDetector(last, current);
	expect(detector.isChanged).toBe(true);
	expect(detector.body).not.toBe("");
	expect(detector.difference).not.toBeNull();
	expect(detector.difference).toHaveLength(1);

	const diff0 = detector.difference[0];
	expect(diff0.hunks).toHaveLength(1);
	expect(diff0.oldFileName).toEqual("old.html")
	expect(diff0.newFileName).toEqual("new.html")

	return diff0;
}