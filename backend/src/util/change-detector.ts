import {createTwoFilesPatch, ParsedDiff, parsePatch} from "diff";
import {Parsed} from "./parsed-html";

/**
 * Detects changes in two parsed versions of a website
 */
export class ChangeDetector {
	/** The raw body of the unified diff */
	private readonly _body:string;

	/** The unified diff structure */
	private readonly _difference:ParsedDiff[];

	/** Were changes detected? */
	private readonly _isChanged:boolean;

	/**
	 * Perform that change parsing
	 * @param lastRevision the last revision
	 * @param currentRevision the current revision
	 */
	constructor(lastRevision:Parsed, currentRevision:Parsed) {
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

		//are there any changes?
		this._isChanged = this._difference[0].hunks.length != 0;
	}

	/** The unified diff structure */
	get difference():ParsedDiff[] {
		return this._difference;
	};

	/** Were changes detected? */
	get isChanged():boolean {
		return this._isChanged;
	}

	/** The raw body of the unified diff */
	get body():string {
		return this._body;
	}
}