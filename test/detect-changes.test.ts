// noinspection HtmlUnknownAttribute

import * as path from "path";
import * as fs from "fs/promises";
import {ChangeDetector} from "../src/util/change-detector";
import {Parsed} from "../src/util/parsed-html";
import {ParsedDiff} from "diff";

describe("Detect Changes", () => {
	let file1:string;
	let file2:string;

	beforeAll(async() => {
		file1 = await getTestFile("change-test-1.xml");
		file2 = await getTestFile("change-test-2.xml");
	})

	test("XML Parsing", async() => {
		const parsed = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1);

		expect(parsed.formatted).not.toBeNull();
		expect(parsed.html).not.toBeNull();
		expect(parsed.formatted).toContain("class=\"class1 class2 class3\"");
		expect(parsed.formatted).toContain("id=\"123\"");
		expect(parsed.formatted).toContain("style=\"style1 style2 style3\"");
		expect(parsed.formatted).toContain("attr=\"attr1 attr2\"");

		const parseNoAttr = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1, "attributes");

		expect(parseNoAttr.formatted).not.toBeNull();
		expect(parseNoAttr.html).not.toBeNull();
		expect(parseNoAttr.formatted).not.toContain("class=\"class1 class2 class3\"");
		expect(parseNoAttr.formatted).not.toContain("id=\"123\"");
		expect(parseNoAttr.formatted).not.toContain("style=\"style1 style2 style3\"");
		expect(parseNoAttr.formatted).not.toContain("attr=\"attr1 attr2\"");

		const parsedClassesAndStyles = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1, "classesAndStyles");

		expect(parsedClassesAndStyles.formatted).not.toBeNull();
		expect(parsedClassesAndStyles.html).not.toBeNull();
		expect(parsedClassesAndStyles.formatted).not.toContain("class=\"class1 class2 class3\"");
		expect(parsedClassesAndStyles.formatted).toContain("id=\"123\"");
		expect(parsedClassesAndStyles.formatted).not.toContain("style=\"style1 style2 style3\"");
		expect(parsedClassesAndStyles.formatted).toContain("attr=\"attr1 attr2\"");
	});

	test("Equal", async() => {
		const last = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1);

		const current = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1);

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
		const last = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1);

		const current = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file2);

		const diff0 = createChangeDetector(last, current);

		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(17);

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
		const last = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1, "classesAndStyles");

		const current = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file2, "classesAndStyles");

		const diff0 = createChangeDetector(last, current);

		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(16);

		expect(lines).toContain("-<div class=\"IGNORED\" attr=\"attr1 attr2 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");
		expect(lines).toContain("+<div class=\"IGNORED\" attr=\"attr1 attr3\">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore");

		expect(lines).toContain("-pariatur. Excepteur occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
		expect(lines).toContain("+pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");

		expect(lines).toContain("-<span id=\"1234\">test</span>");
		expect(lines).toContain("+<span id=\"123\">test</span>");
	});

	test("NotEqual Attributes", async() => {
		const last = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file1, "attributes");

		const current = new Parsed({
			time: new Date().getTime(),
			id: "a"
		}, file2, "attributes");

		const diff0 = createChangeDetector(last, current);

		const lines = diff0.hunks[0].lines;
		expect(lines).toHaveLength(9);

		expect(lines).toContain("-pariatur. Excepteur occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
		expect(lines).toContain("+pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est");
	});
});

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