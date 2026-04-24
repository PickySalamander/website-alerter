import {Injectable} from '@angular/core';
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router} from "@angular/router";
import {PageLoaderComponent} from "./page-loader.component";

/** Helper class to show a page loading spinner on the page */
@Injectable({
	providedIn: 'root'
})
export class PageLoaderService {
	/** Link to a currently shown loader */
	private currentDialog:MatDialogRef<PageLoaderComponent>;

	/** Timeout being run to show the loader on {@link NavigationStart} */
	private timeout:any;

	/** Is there a route load already in process? */
	private routerLoading = false;

	constructor(private dialog:MatDialog, private router:Router) {
	}

	/**
	 * Call to start up the page loading service
	 */
	startup() {
		this.router.events.subscribe(event => {
			if((event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationCancel) && this.routerLoading) {
				//close if the page is done loading
				this.close();
			} else if(event instanceof NavigationStart && this.timeout == null) {
				//show if starting
				this.show();
				this.routerLoading = true;
			}
		});
	}

	/**
	 * Show the page loading indicator after a short timeout
	 * @param text The text to show for the loader, defaults to "loading..."
	 */
	show(text?:string):void {
		//close any previous dialogs
		this.close();

		//after the timeout open the dialog
		this.timeout = setTimeout(() => {
			this.currentDialog = this.dialog.open(PageLoaderComponent, {
				hasBackdrop: true,
				disableClose: true,
				closeOnNavigation: true,
				autoFocus: true,
				data: {text}
			});
		}, 300);
	}

	/** Close a shown spinner */
	close():void {
		this.routerLoading = false;

		//close if the dialog is up
		this.currentDialog?.close();
		this.currentDialog = null;

		//cancel running timers
		if(this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
}
