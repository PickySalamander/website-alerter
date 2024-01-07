import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortUuidComponent } from './short-uuid.component';

describe('ShortUuidComponent', () => {
  let component: ShortUuidComponent;
  let fixture: ComponentFixture<ShortUuidComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortUuidComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShortUuidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
