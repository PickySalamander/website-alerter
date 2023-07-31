import {WebsiteCheck} from "../services/database.service";
import {createTwoFilesPatch, ParsedDiff, parsePatch} from "diff";

/**
 * Lambda function that checks HTML revisions downloaded into S3 for changes. If there are any changes they will be put
 * into a unified diff and uploaded to S3 for the user to check later.
 */
export class ChangeDetector {
	private readonly _body:string;
	private readonly _difference:ParsedDiff[];
	private readonly _isChanged:boolean;

	constructor(private lastRevision:Parsed, private currentRevision:Parsed) {
		//if either aren't there (usually because of an error), abort
		if(!currentRevision || !lastRevision) {
			return;
		}

		//using the diff library create a unified diff of the two HTML revisions
		this._body = createTwoFilesPatch(
			"old.html",
			"new.html",
			lastRevision.formatted,
			currentRevision.formatted,
			new Date(lastRevision.revision.time).toString(),
			new Date(currentRevision.revision.time).toString(),
			{
				ignoreCase: true,
				ignoreWhitespace: true
			});

		//Get the changes from the diff
		this._difference = parsePatch(this._body);

		this._isChanged = this._difference[0].hunks.length != 0;
	}

	/**
	 * Retrieve the relevant HTML from S3
	 * @param revision the revision of HTML and where it is located
	 * @return the parsed HTML and the revision
	 */
	// public static getContent(revision:S3.Body):Promise<Parsed> {
	// 	//get the html from S3
	// 	const s3Result = await this.s3.getObject({
	// 		Bucket: this.configPath,
	// 		Key: `content/${revision.id}.html`
	// 	}).promise();
	//
	// 	//get the html string
	// 	const html = s3Result.Body.toString("utf-8");
	//
	// 	//return the html and pretty print it
	// 	return {
	// 		revision,
	// 		html,
	// 		formatted: formatXml(html)
	// 	};
	// }

	get difference():ParsedDiff[] {
		return this._difference;
	};

	get isChanged():boolean {
		return this._isChanged;
	}

	get body():string {
		return this._body;
	}
}

/**
 * Parsed HTML from S3
 */
export interface Parsed {
	/** The original revision to check */
	revision:WebsiteCheck;

	/** The parsed DOM of the HTML from the site polling */
	html:string;

	/** Pretty printed HTML from the {@link html} property */
	formatted:string;
}