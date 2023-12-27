import {X2jOptionsOptional, XMLBuilder, XmlBuilderOptions, XmlBuilderOptionsOptional, XMLParser} from "fast-xml-parser";
import {ChangeOptions, SiteRevision} from "website-alerter-shared";

/**
 * Parsed HTML from S3 Revisions
 */
export class Parsed {
	/** Pretty printed HTML from the {@link html} property */
	formatted:string;

	/**
	 * Create a new parsed revision
	 * @param revision The original revision to check
	 * @param html The parsed DOM of the HTML from the site polling
	 * @param ignore potential ignored values, leave empty to not ignore
	 */
	constructor(public readonly revision:SiteRevision, public readonly html:string, ignore?:ChangeOptions) {
		//setup options for parsing and output
		const options:X2jOptionsOptional | XmlBuilderOptionsOptional = {
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
			trimValues: true,
			format: true
		};

		//set default arguments
		ignore = Object.assign({
			ignoreCss: false,
			ignoreScripts: true,
			ignoreAttributes: false
		}, ignore);

		//if ignore attributes then just ignore them all, otherwise for just css we ignore certain attributes
		if(ignore.ignoreAttributes) {
			options.ignoreAttributes = true;
		} else if(ignore.ignoreCss) {
			//ignore the attributes when they come up in the parsing
			options.attributeValueProcessor = (name:string, value:any):string => {
				if(name.toLowerCase() == "style" || name.toLowerCase() == "class") {
					return "IGNORED";
				}

				return value;
			};
		}

		//if scripts or css we ignore the style and script tags if found
		if(ignore.ignoreScripts || ignore.ignoreCss) {
			options.tagValueProcessor = (tagName:string, tagValue:any) => {
				if(tagName.toLowerCase() == "script" && ignore.ignoreScripts) {
					return "IGNORED";
				}

				if(tagName.toLowerCase() == "style" && ignore.ignoreCss) {
					return "IGNORED";
				}

				return tagValue;
			}
		}

		//parse it
		const parser = new XMLParser(options);
		const parsed = parser.parse(html);

		//format it
		const builder = new XMLBuilder(options as XmlBuilderOptions);
		this.formatted = builder.build(parsed);
	}
}