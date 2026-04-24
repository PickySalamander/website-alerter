import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from "@angular/common/http";
import {SiteService} from "../services/site.service";
import {environment} from "../../environments/environment";
import {ActivatedRoute, ResolveFn, RouterLink} from "@angular/router";
import {GetRevisionResponse, RevisionUrls, SiteRevision, SiteRevisionState, WebsiteItem} from "website-alerter-shared";
import {RevisionStateComponent} from "../revision-state/revision-state.component";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {firstValueFrom} from "rxjs";

/** Display the details of the revision along with a diff if the revision has a change */
@Component({
	selector: 'app-revision-detail',
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

	/** The state of the site's polling and change detection */
	SiteRevisionState = SiteRevisionState;

	constructor(private http:HttpClient,
	            private route:ActivatedRoute,
	            private siteService:SiteService) {
	}

	ngOnInit() {
		//get the revision id from the route params
		const response = this.route.snapshot.data['revision'];

		this.revision = response.revision;
		this.urls = response.urls;
		this.site = this.siteService.getSite(response.revision.siteID);
	}

	/** Get a Revision */
	static resolve:ResolveFn<GetRevisionResponse> = async(route) => {
		//get the editing site if it is provided (if not then we are adding a new site)
		const revisionID = route.paramMap?.get("revisionID");

		const http = inject(HttpClient);

		//load the revision from the API
		return await firstValueFrom(http.get<GetRevisionResponse>(`${environment.apiUrl}/revisions/${revisionID}`));
	};
}
