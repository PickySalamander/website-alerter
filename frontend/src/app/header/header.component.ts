import { Component } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatButtonModule} from "@angular/material/button";
import {RouterLink, RouterLinkActive} from "@angular/router";
import {MatRippleModule} from "@angular/material/core";
import {LoginService} from "../services/login.service";

@Component({
  selector: 'app-header',
  standalone: true,
	imports: [CommonModule, NgOptimizedImage, MatButtonModule, RouterLink, MatRippleModule, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
	constructor(private login:LoginService) {
	}


	onLogout() {
		this.login.logout();
	}
}
