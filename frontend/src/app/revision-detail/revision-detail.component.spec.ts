import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionDetailComponent } from './revision-detail.component';

describe('RevisionDetailComponent', () => {
  let component: RevisionDetailComponent;
  let fixture: ComponentFixture<RevisionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RevisionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
