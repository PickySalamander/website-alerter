import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from "@angular/material/button";
import {FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {SnackbarService} from "../../services/snackbar.service";
import {WebsiteItem, WebsiteItemRequest} from "website-alerter-shared";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";

@Component({
	selector: 'app-add-site',
	standalone: true,
	imports: [CommonModule, MatButtonModule, ReactiveFormsModule, MatInputModule, MatCheckboxModule, MatDialogModule, MatSlideToggleModule],
	templateUrl: './add-edit-site.component.html',
	styleUrl: './add-edit-site.component.scss'
})
export class AddEditSiteComponent {
	private static readonly SITE_PATTERN = /^(https:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]+$/;

	/** The form fields to put on the page */
	createForm = new FormGroup({
		url: new FormControl('', [Validators.required, Validators.pattern(AddEditSiteComponent.SITE_PATTERN), Validators.maxLength(2048)]),
		selector: new FormControl('', [Validators.maxLength(2048)]),
		enabled: new FormControl(true),
		ignoreCss: new FormControl(false),
		ignoreAttributes: new FormControl(false),
		ignoreScripts: new FormControl(false),
	});

	private readonly initial;

	constructor(private http:HttpClient,
	            private snackbar:SnackbarService,
	            private dialog:MatDialogRef<AddEditSiteComponent>,
	            @Inject(MAT_DIALOG_DATA) public data:WebsiteItem) {
		if(data) {
			this.createForm.controls.url.setValue(data.site);
			this.createForm.controls.url.disable();
			this.createForm.controls.selector.setValue(data.selector ?? "");
			this.createForm.controls.enabled.setValue(data.enabled ?? true);
			this.createForm.controls.ignoreCss.setValue(data.options?.ignoreCss ?? false);
			this.createForm.controls.ignoreAttributes.setValue(data.options?.ignoreAttributes ?? false);
			this.createForm.controls.ignoreScripts.setValue(data.options?.ignoreScripts ?? false);

			this.initial = this.createForm.value;

			this.createForm.addValidators(() => this.notEqualValidator());
		}
	}

	submit() {
		if(this.createForm.invalid) {
			return;
		}

		this.createForm.disable();

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

		if(this.data) {
			updated.siteID = this.data.siteID;

			this.http.post<WebsiteItem>(`${environment.apiUrl}/sites`, updated).subscribe({
				next: (response) => this.next(response),
				error: (error) => this.error(error)
			});
		} else {
			this.http.put<WebsiteItem>(`${environment.apiUrl}/sites`, updated).subscribe({
				next: (response) => this.next(response),
				error: (error) => this.error(error)
			});
		}
	}

	next(response:WebsiteItem) {
		this.snackbar.message(this.isNewSite ? "Successfully added new site!" : "Successfully updated site!");
		this.dialog.close(response);
	}

	error(error:any) {
		this.createForm.enable();
		console.error("Failed to add/edit", error);
		this.snackbar.error("Failed to add or edit a site.");
	}

	notEqualValidator():ValidationErrors | null {
		for(const [key, initialValue] of Object.entries(this.initial)) {
			const current = (this.createForm.value as any)[key];
			if(current != initialValue) {
				return null;
			}
		}

		return {"noChange": true};
	}

	get isNewSite() {
		return this.data == null;
	}
}
