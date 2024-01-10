import {Component, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTooltipModule} from "@angular/material/tooltip";

/** Small component to display a shortened v4 uuid and a tooltip of its full length */
@Component({
  selector: 'app-short-uuid',
  standalone: true,
	imports: [CommonModule, MatTooltipModule],
  templateUrl: './short-uuid.component.html',
  styleUrl: './short-uuid.component.scss'
})
export class ShortUuidComponent implements OnInit {
	/** The uuid to use */
	@Input() uuid:string;

	/** The shortened version of the uuid to show */
	shortened:string;

	ngOnInit() {
		//shorten it
		this.shortened = this.uuid.slice(0, this.uuid.indexOf("-"));
	}
}
