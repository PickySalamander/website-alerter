import {WebsiteCheck} from "../services/database.service";
import {X2jOptionsOptional, XMLBuilder, XmlBuilderOptions, XmlBuilderOptionsOptional, XMLParser} from "fast-xml-parser";

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
	constructor(public readonly revision:WebsiteCheck, public readonly html:string, ignore?:DetectorIgnore) {
		//setup options for parsing and output
		const options:X2jOptionsOptional | XmlBuilderOptionsOptional = {
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
			trimValues: true,
			format: true
		};

		switch(ignore) {
			case "classesAndStyles":
				//ignore the attributes when they come up in the parsing
				options.attributeValueProcessor = (name:string, value:any):string => {
					if(name.toLowerCase() == "style" || name.toLowerCase() == "class") {
						return "IGNORED";
					}

					return value;
				};
				break;
			case "attributes":
				options.ignoreAttributes = true;
				break;
		}

		//parse it
		const parser = new XMLParser(options);
		const parsed = parser.parse(html);

		//format it
		const builder = new XMLBuilder(options as XmlBuilderOptions);
		this.formatted = builder.build(parsed);
	}

}

/**
 * When comparing site changes should anything be ignored? Omitting this will ignore nothing. It can be set to the
 * following:
 *
 * <ul>
 *     <li>"classesAndStyles": "class" and "style" attributes in the dom will be ignored</li>
 *     <li>"attributes": all DOM attributes will be ignored</li>
 * </ul>
 */
export type DetectorIgnore = "attributes" | "classesAndStyles";
