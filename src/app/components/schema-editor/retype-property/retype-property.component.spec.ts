import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetypePropertyComponent } from './retype-property.component';

describe('RetypePropertyComponent', () => {
  let component: RetypePropertyComponent;
  let fixture: ComponentFixture<RetypePropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetypePropertyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RetypePropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
