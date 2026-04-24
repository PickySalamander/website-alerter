import {SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {BedrockRuntimeClient, InvokeModelCommand} from "@aws-sdk/client-bedrock-runtime";
import {DurableChild} from "../../util/durable-child";
import {DurableContext} from "@aws/durable-execution-sdk-js";

/**
 * Checks HTML {@link SiteRevision} downloaded into S3 for changes. It uses an AI model to generate a report of
 * differences between the current and previous revisions of a website.
 */
export class DetectChanges extends DurableChild {
	/** The bedrock model to use */
	private readonly ModelID:string = "us.anthropic.claude-sonnet-4-6";

	/** The system prompt to use */
	private systemPrompt:string;

	/** The JSON schema to use for the AI response */
	private schema:any;

	/** The Bedrock client to use */
	private bedrock:BedrockRuntimeClient;

	constructor(context:DurableContext, private sites:WebsiteItem[]) {
		super(context);

		this.bedrock = new BedrockRuntimeClient();
	}

	/** Run the AI check */
	async run() {
		this.logger.info(`Checking for changes in ${this.sites.length} sites...`);

		// load the system prompt if it hasn't been loaded yet
		if(!this.systemPrompt) {
			this.logger.info("Loading system prompt for the first time...");
			this.systemPrompt = await this.s3.getString("prompt/system-prompt.txt");
			this.schema = JSON.parse(await this.s3.getString("prompt/schema.json"));
		}

		await Promise.all(this.sites.map(site => this.checkSite(site)));
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

		//run the AI model to see if there are any changes
		const detection = await this.queryAi(site.siteID, previousRevision, currentRevision);

		if(!detection) {
			return;
		}

		//If there are no changes
		if(!detection.changes) {
			this.logger.info("Found no differences, moving on");
			return this.unchanged(site);
		}

		//if there are changes write them to the database
		this.logger.info(`Found ${detection.differences.length} differences`);

		currentRevision.siteState = SiteRevisionState.Changed;
		currentRevision.differences = detection.differences;
		await this.database.putSiteRevision(currentRevision);
	}

	/**
	 * Query the AI model to see if there are any changes between the two revisions of the site.
	 * @param siteID the site to check
	 * @param lastRevision the previous revision that was downloaded
	 * @param currentRevision the revision that was just downloaded
	 */
	private async queryAi(siteID:string, lastRevision:SiteRevision, currentRevision:SiteRevision):Promise<AiResponse> {
		//get the HTML revisions
		const previous = await this.s3.getString(`content/${siteID}/${lastRevision.revisionID}.html`);
		const current = await this.s3.getString(`content/${siteID}/${currentRevision.revisionID}.html`);

		if(previous == current) {
			this.logger.info("HTML was identical, no need to call the AI");

			return {
				changes: false,
				differences: []
			}
		}

		this.logger.info(`Making AI request of ${this.ModelID}...`);

		//compose the request to the AI
		const request = {
			"anthropic_version": "bedrock-2023-05-31",
			"max_tokens": 1024,
			"system": this.systemPrompt,
			"messages": [
				{
					"role": "user",
					"content": [
						{
							"type": "text",
							"text": previous
						},
						{
							"type": "text",
							"text": current
						}
					]
				}
			],
			"output_config": {
				"format": {
					"type": "json_schema",
					"schema": this.schema
				}
			}
		}

		let responseText:string;

		try {
			// Send the command to the model and wait for the response
			const response = await this.bedrock.send(new InvokeModelCommand({
				modelId: this.ModelID,
				body: JSON.stringify(request),
				contentType: "application/json"
			}));

			// parse the response
			let responseText = response.body.transformToString("utf8");
			const parsedResponse = JSON.parse(responseText);
			return parsedResponse.content[0].text as AiResponse;
		} catch(e) {
			this.logger.error(`Failed to query the AI for site ${siteID}`, e as Error);

			if(responseText) {
				try {
					const key = `content/${siteID}/error-${currentRevision.revisionID}.json`;
					this.logger.info(`Response was received, but could not parse it to JSON, writing to S3 ${key}`);
					await this.s3.putObject(key, responseText);
				} catch(e) {
					this.logger.warn("Failed to write error to S3", e);
				}
			}
		}

		return undefined;
	}

	/**
	 * Mark the site as unchanged in the database
	 * @param site the site to mark as unchanged
	 */
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
