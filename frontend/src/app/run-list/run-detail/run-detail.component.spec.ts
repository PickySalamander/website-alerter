import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunDetailComponent } from './run-detail.component';

describe('RunDetailComponent', () => {
  let component: RunDetailComponent;
  let fixture: ComponentFixture<RunDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RunDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
