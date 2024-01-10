import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from "@angular/common/http";
import {SiteService} from "../services/site.service";
import {environment} from "../../environments/environment";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {GetRevisionResponse, RevisionUrls} from "website-alerter-shared/dist/util/get-revision-response";
import {SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {RevisionStateComponent} from "../revision-state/revision-state.component";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import * as Diff2Html from 'diff2html';

/** Display the details of the revision along with a diff if the revision has a change */
@Component({
	selector: 'app-revision-detail',
	standalone: true,
	imports: [CommonModule, RevisionStateComponent, RouterLink, MatButtonModule, MatIconModule],
	templateUrl: './revision-detail.component.html',
	styleUrl: './revision-detail.component.scss'
})
export class RevisionDetailComponent implements OnInit {
	/** The revision being displayed */
	revision:SiteRevision;

	/** The pre-signed urls for the revision's assets */
	urls:RevisionUrls;

	/** The site this revision is for */
	site:WebsiteItem;

	/** The rendered unified diff from the diff2html library */
	diffHtml:string;

	/** The state of the site's polling and change detection */
	SiteRevisionState = SiteRevisionState;

	constructor(private http:HttpClient,
	            private route:ActivatedRoute,
	            private siteService:SiteService) {
	}

	ngOnInit() {
		//get the revision id from the route params
		const revisionID = this.route.snapshot.paramMap.get("revisionID");

		//load the revision from the API
		this.http.get<GetRevisionResponse>(`${environment.apiUrl}/revisions/${revisionID}`).subscribe(response => {
			this.revision = response.revision;
			this.urls = response.urls;
			this.site = this.siteService.getSite(response.revision.siteID);

			//render the diff if there is one
			if(this.revision.siteState == SiteRevisionState.Changed) {
				this.getDiff();
			}
		});
	}

	/** Load the unified diff from the pre-signed url */
	private getDiff() {
		this.http.get(this.urls.diff, {responseType: "text"}).subscribe(unifiedDiff => {
			//render using diff2html
			this.diffHtml = Diff2Html.html(unifiedDiff, {
				drawFileList: false,
				matching: 'lines'
			});
		});
	}
}
