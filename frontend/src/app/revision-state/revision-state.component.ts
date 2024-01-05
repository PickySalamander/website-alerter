import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import {SiteRevisionState} from "website-alerter-shared";

@Component({
  selector: 'app-revision-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revision-state.component.html',
  styleUrl: './revision-state.component.scss'
})
export class RevisionStateComponent {
	@Input() state:SiteRevisionState;

	stateValues = SiteRevisionState;
}
