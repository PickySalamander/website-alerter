import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from "@angular/material/button";
import {FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MatDialogModule} from "@angular/material/dialog";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {HttpClient} from "@angular/common/http";
import {WebsiteItem, WebsiteItemRequest} from "website-alerter-shared";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {SiteService} from "../services/site.service";
import {SnackbarService} from "../services/snackbar.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {environment} from "../../environments/environment";
import {RevisionListComponent} from "./revision-list/revision-list.component";

/** Display information on a site and the add/edit form */
@Component({
	selector: 'app-add-site',
	standalone: true,
	imports: [CommonModule, MatButtonModule, ReactiveFormsModule, MatInputModule, MatCheckboxModule, MatDialogModule, MatSlideToggleModule, RouterLink, RevisionListComponent],
	templateUrl: './site-info.component.html',
	styleUrl: './site-info.component.scss'
})
export class SiteInfoComponent implements OnInit {
	/** Regex for validating a site url (must be https)*/
	private static readonly SITE_PATTERN = /^(https:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]+$/;

	/** The form fields to put on the page */
	createForm = new FormGroup({
		url: new FormControl('', [Validators.required,
			Validators.pattern(SiteInfoComponent.SITE_PATTERN), Validators.maxLength(2048)]),
		selector: new FormControl('', [Validators.maxLength(2048)]),
		enabled: new FormControl(true),
		ignoreCss: new FormControl(false),
		ignoreAttributes: new FormControl(false),
		ignoreScripts: new FormControl(false),
	});

	/** The website currently being edited, if not adding a new site */
	data:WebsiteItem;

	/** The initial values of the form if editing */
	private initial:{ [key:string]:string | boolean };

	constructor(private http:HttpClient,
	            private router:Router,
	            private route:ActivatedRoute,
	            private sites:SiteService,
	            private snackbar:SnackbarService) {
	}

	ngOnInit() {
		//get the editing site if it is provided (if not then we are adding a new site)
		const siteID = this.route.snapshot?.paramMap?.get("siteID");

		//if editing get the site's data and add defaults to the form
		if(siteID) {
			this.data = this.sites.getSite(siteID);
			if(this.data) {
				this.createForm.controls.url.setValue(this.data.site);
				this.createForm.controls.url.disable();
				this.createForm.controls.selector.setValue(this.data.selector ?? "");
				this.createForm.controls.enabled.setValue(this.data.enabled ?? true);
				this.createForm.controls.ignoreCss.setValue(this.data.options?.ignoreCss ?? false);
				this.createForm.controls.ignoreAttributes.setValue(this.data.options?.ignoreAttributes ?? false);
				this.createForm.controls.ignoreScripts.setValue(this.data.options?.ignoreScripts ?? false);

				//add the initial values and set up the change validator
				this.initial = this.createForm.value;
				this.createForm.addValidators(() => this.notEqualValidator());
			}
		}
	}

	/** Called to submit the form to the server */
	submit() {
		//reject if invalid
		if(this.createForm.invalid) {
			return;
		}

		//disable while sending
		this.createForm.disable();

		//create the json data to send
		const updated:WebsiteItemRequest = {
			site: this.createForm.value.url,
			selector: this.createForm.value.selector ?? undefined,
			enabled: this.createForm.value.enabled ?? true,
			options: {
				ignoreCss: this.createForm.value.ignoreCss ?? false,
				ignoreScripts: this.createForm.value.ignoreScripts ?? false,
				ignoreAttributes: this.createForm.value.ignoreAttributes ?? false
			}
		};

		//if we're updating...
		if(this.data) {
			//add the site id and make a post
			updated.siteID = this.data.siteID;

			this.http.post<WebsiteItem>(`${environment.apiUrl}/sites`, updated).subscribe({
				next: (response) => {
					this.snackbar.message("Successfully updated site!");
					this.sites.putSite(response);
					this.createForm.enable();
				},
				error: (error) => this.error(error)
			});
		} else {
			//otherwise this is a new item, make a post
			this.http.put<WebsiteItem>(`${environment.apiUrl}/sites`, updated).subscribe({
				next: (response) => {
					this.snackbar.message("Successfully added new site!");
					this.sites.putSite(response);
					this.router.navigate(["/", "list"]);
				},
				error: (error) => this.error(error)
			});
		}
	}

	/** Called when there is an error updating or adding a site item */
	error(error:any) {
		this.createForm.enable();
		console.error("Failed to add/edit", error);
		this.snackbar.error("Failed to add or edit a site.");
	}

	/** Custom validator to use, making sure the item changes when editing */
	notEqualValidator():ValidationErrors | null {
		for(const [key, initialValue] of Object.entries(this.initial)) {
			const current = (this.createForm.value as any)[key];
			if(current != initialValue) {
				return null;
			}
		}

		return {"noChange": true};
	}

	/** Is this a new site? Otherwise, we're editing */
	get isNewSite() {
		return this.data == null;
	}
}
