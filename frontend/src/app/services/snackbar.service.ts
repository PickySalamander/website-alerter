import { Injectable } from '@angular/core';
import {MatSnackBar} from "@angular/material/snack-bar";

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

	constructor(private snackbar:MatSnackBar) {}

	/**
	 * Show an error message to the user with an "ok" button
	 * @param message the message to show
	 */
	error(message:string) {
		this.snackbar.open(message, "Ok");
	}

	/**
	 * Show a message to the user in the snack bar for a short amount of time
	 * @param message the message to show
	 * @param duration duration to show the notification
	 */
	message(message:string, duration:number = 5000) {
		this.snackbar.open(message, undefined, {duration});
	}
}
