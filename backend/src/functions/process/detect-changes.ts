import {SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {BedrockRuntimeClient, ConverseCommand} from "@aws-sdk/client-bedrock-runtime";
import {DurableChild} from "../../util/durable-child";
import {DurableContext} from "@aws/durable-execution-sdk-js";

export class DetectChanges extends DurableChild {
	private readonly ModelID:string = "us.anthropic.claude-sonnet-4-6";

	private systemPrompt:string;

	private schema:string;

	private bedrock:BedrockRuntimeClient;

	private changed:WebsiteItem[];

	constructor(context:DurableContext, private sites:WebsiteItem[]) {
		super(context);

		this.bedrock = new BedrockRuntimeClient();
	}

	async run() {
		this.logger.info(`Checking for changes in ${this.sites.length} sites...`);

		if(!this.systemPrompt) {
			this.logger.info("Loading system prompt for the first time...");
			this.systemPrompt = await this.s3.getString("prompt/system-prompt.txt");
			this.schema = await this.s3.getString("prompt/schema.json");
		}

		this.changed = [];

		await Promise.all(this.sites.map(async site => this.checkSite(site)));

		return this.changed;
	}

	/**
	 * Check the site and see if it has changed since the last {@link SiteRevision}
	 * @param site the site to check
	 * @returns what the final {@link SiteRevisionState} of the {@link SiteRevision} should be.
	 */
	private async checkSite(site:WebsiteItem):Promise<void> {
		this.logger.info(`Checking the download ${site.site} for changes...`);

		//get the revision that was just polled and make sure it exists
		const currentRevision = site.last;

		//make sure that the site was actually polled (we don't care if we're recomputing)
		if(currentRevision.siteState == SiteRevisionState.Open) {
			this.logger.warn(`Could not check ${currentRevision.revisionID} since it was not polled`);
			return;
		}

		//get the previous successful revision in the database
		const previousRevision =
			await this.database.getSiteRevisionAfter(site.siteID, currentRevision.time);

		//if there aren't enough revisions yet then abort
		if(!previousRevision) {
			this.logger.info("Website has too few updates, skipping.");
			return this.unchanged(site);
		}

		this.logger.info(`Comparing current:${currentRevision.revisionID} (${new Date(currentRevision.time)}) to ` +
			`previous:${previousRevision.revisionID} (${new Date(previousRevision.time)})...`);

		const detection = await this.queryAi(site.siteID, previousRevision, currentRevision);

		if(!detection) {
			return;
		}

		//If there are no changes
		if(!detection.changes) {
			this.logger.info("Found no differences, moving on");
			return this.unchanged(site);
		}

		this.logger.info(`Found ${detection.differences.length} differences`);

		currentRevision.siteState = SiteRevisionState.Changed;
		currentRevision.differences = detection.differences;
		await this.database.putSiteRevision(currentRevision);
		this.changed.push(site);
	}

	private async queryAi(siteID:string, lastRevision:SiteRevision, currentRevision:SiteRevision) {
		//get the current HTML revision and the previous
		const previous = await this.s3.getString(`content/${siteID}/${lastRevision.revisionID}.html`);
		const current = await this.s3.getString(`content/${siteID}/${currentRevision.revisionID}.html`);

		this.logger.info(`Making AI request of ${this.ModelID}...`);

		const request = new ConverseCommand({
			modelId: this.ModelID,
			system: [{text: this.systemPrompt}],
			inferenceConfig: {maxTokens: 1024},
			messages: [
				{
					role: "user",
					content: [{text: previous}, {text: current}]
				}
			],
			outputConfig: {
				textFormat: {
					type: "json_schema",
					structure: {
						jsonSchema: {
							schema: this.schema,
							name: "compare",
							description: "Comparing results of two different versions of a website"
						}
					}
				}
			}
		});

		try {
			// Send the command to the model and wait for the response
			const response = await this.bedrock.send(request);

			// parse the response
			const responseText = response.output.message.content[0].text;
			return JSON.parse(responseText) as AiResponse;
		} catch(e) {
			this.logger.error(`Failed to query the AI for site ${siteID}`, e as Error);
		}

		return undefined;
	}

	private async unchanged(site:WebsiteItem) {
		await this.database.updateSiteRevision(site.siteID, site.last.revisionID, SiteRevisionState.Unchanged);
		site.last.siteState = SiteRevisionState.Unchanged;
	}
}

/** Description of the revision from the AI */
interface AiResponse {
	/** Were changes detected? */
	changes:boolean;

	/** The differences as explained by AI */
	differences:string[];
}
