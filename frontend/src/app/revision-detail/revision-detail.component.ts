import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
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

@Component({
	selector: 'app-revision-detail',
	standalone: true,
	imports: [CommonModule, RevisionStateComponent, RouterLink, MatButtonModule, MatIconModule],
	templateUrl: './revision-detail.component.html',
	styleUrl: './revision-detail.component.scss'
})
export class RevisionDetailComponent implements OnInit, AfterViewInit {
	revision:SiteRevision;

	urls:RevisionUrls;

	site:WebsiteItem;

	diffHtml:string;

	SiteRevisionState = SiteRevisionState

	private unifiedDiff:string;

	constructor(private http:HttpClient,
	            private route:ActivatedRoute,
	            private siteService:SiteService) {
	}

	ngOnInit() {
		const revisionID = this.route.snapshot.paramMap.get("revisionID");

		this.http.get<GetRevisionResponse>(`${environment.apiUrl}/revisions/${revisionID}`).subscribe(response => {
			this.revision = response.revision;
			this.urls = response.urls;
			this.site = this.siteService.getSite(response.revision.siteID);

			this.getDiff();
		});
	}

	ngAfterViewInit() {
		if(this.unifiedDiff) {
			this.setupDiffView();
		}
	}

	private getDiff() {
		this.http.get(this.urls.diff, {responseType: "text"}).subscribe(value => {
			this.unifiedDiff = value;
			this.setupDiffView();
		});
	}

	private setupDiffView() {
		this.diffHtml = Diff2Html.html(this.unifiedDiff, {
			drawFileList: false,
			matching: 'lines'
		});
	}
}
