import {Component} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatButtonModule} from "@angular/material/button";
import {HttpErrorResponse} from "@angular/common/http";
import {LoginService} from "../services/login.service";
import {SnackbarService} from "../services/snackbar.service";
import {PageLoaderService} from "../page-loader/page-loader.service";
import {signIn, signOut} from "aws-amplify/auth";

/** The login page */
@Component({
	selector: 'app-login',
	imports: [MatCardModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatProgressBarModule, MatButtonModule],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss'
})
export class LoginComponent {
	/** the login form configuration */
	loginForm = new FormGroup({
		email: new FormControl('', Validators.required),
		password: new FormControl('', Validators.required)
	});

	/** Whether to obfuscate the password on the login form */
	hidePassword:boolean = true;

	constructor(private loginService:LoginService,
	            private pageLoader:PageLoaderService,
	            private snackbar:SnackbarService) {
	}

	/** Called to submit the form */
	async submit() {
		//ignore if invalid
		if(this.loginForm.invalid) {
			return;
		}

		this.pageLoader.show("Logging in...")

		try {

			//sign out any previous session
			await signOut();

			//sign in the user
			const response = await signIn({
				username: this.loginForm.value.email,
				password: this.loginForm.value.password
			});

			//if the user was successfully signed in, redirect to the next step
			if(response.nextStep.signInStep == 'DONE') {
				await this.loginService.redirectAfterLogin();
			} else {
				//otherwise, display an error message (the user needs to do a second step which isn't handled by this app)
				this.snackbar.error(`Failed to login, another login step is needed (${response.nextStep.signInStep}`);
			}

		} catch(e) {
			if(e instanceof HttpErrorResponse && e.status == 401) {
				this.snackbar.message("Password or username was incorrect");
			} else {
				this.snackbar.error("An unknown error occurred");
			}

			this.loginForm.controls.password.reset();

			console.error("Failed to login", e);
		} finally {
			this.pageLoader.close();
		}
	}
}
