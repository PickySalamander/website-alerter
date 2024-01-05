import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionStateComponent } from './revision-state.component';

describe('RevisionStateComponent', () => {
  let component: RevisionStateComponent;
  let fixture: ComponentFixture<RevisionStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionStateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RevisionStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
