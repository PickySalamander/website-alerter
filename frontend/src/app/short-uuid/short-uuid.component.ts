import {Component, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
  selector: 'app-short-uuid',
  standalone: true,
	imports: [CommonModule, MatTooltipModule],
  templateUrl: './short-uuid.component.html',
  styleUrl: './short-uuid.component.scss'
})
export class ShortUuidComponent implements OnInit {
	@Input() uuid:string;

	shortened:string;

	ngOnInit() {
		this.shortened = this.uuid.slice(0, this.uuid.indexOf("-"));
	}
}
