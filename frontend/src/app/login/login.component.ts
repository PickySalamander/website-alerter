import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from "@angular/material/card";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatButtonModule} from "@angular/material/button";
import {LoginResponse} from "../../../../shared/src/util/login-response";
import {LoginRequest} from "../../../../shared/src/util/login-request";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {LoginService} from "../services/login.service";
import {Router} from "@angular/router";

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [CommonModule, MatCardModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatProgressBarModule, MatButtonModule],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss'
})
export class LoginComponent {
	loginForm = new FormGroup({
		email: new FormControl('', Validators.required),
		password: new FormControl('', Validators.required)
	});

	hidePassword:boolean = true;

	loggingIn:boolean = false;

	constructor(private http:HttpClient,
	            private loginService:LoginService,
	            private router:Router) {
	}

	submit() {
		if(this.loginForm.invalid) {
			return;
		}

		//the request to make
		let request:LoginRequest = {
			email: this.loginForm.controls.email.value,
			password: this.loginForm.controls.password.value
		};

		//block the login button
		this.loggingIn = true;

		//post to the server
		this.http.post<LoginResponse>(`${environment.apiUrl}/login`, request, {observe: "response"})
			.subscribe({
				next: response => {
					const session = response.headers.get("session");
					if(session) {
						this.loginService.session = session;
						// this.router.navigate(['index']);
					}

					//TODO error
				},
				error: err => {
					//TODO error
				}
			});
	}
}
