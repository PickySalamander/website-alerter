import {Component, Inject, OnInit} from "@angular/core";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

@Component({
	selector: "app-page-loader",
	imports: [
		MatProgressSpinnerModule
	],
	templateUrl: "./page-loader.component.html",
	styleUrl: "./page-loader.component.scss",
})
export class PageLoaderComponent implements OnInit {
	/** The text to show for the loader */
	text:string;

	constructor(@Inject(MAT_DIALOG_DATA) public data:LoaderData) {
	}

	ngOnInit() {
		this.text = this.data.text ?? "Loading..."
	}
}

/** Data to pass to the page loader dialog */
export interface LoaderData {
	/** The text to show for the loader, defaults to "loading..." */
	text?:string;
}
