import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatCardModule} from "@angular/material/card";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatButtonModule} from "@angular/material/button";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatProgressBarModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  hidePassword:boolean = true;

  loggingIn:boolean = false;

  submit() {
	  if(this.loginForm.invalid) {
		  return;
	  }

	  //the request to make
	  let request = {
		  user: this.loginForm.controls.username.value,
		  password: this.loginForm.controls.password.value
	  };

	  //block the login button
	  this.loggingIn = true;

	  //post to the server
	  // this.http.post<PostLoginResponse>(`${environment.apiUrl}/login`, request)
		//   .subscribe((value) => {
		// 	  //remember past settings
		// 	  LoginComponent.rememberedCompany = request.company;
		// 	  LoginComponent.rememberedUsername = request.user;
	  //
		// 	  //set the userinfo
		// 	  this.userService.userInfo = value;
	  //
		// 	  this.loggingIn = false;
	  //
		// 	  //navigate to sims list
		// 	  this.router.navigate(['sims']);
		//   }, error => this.handleError(error));
  }
}
