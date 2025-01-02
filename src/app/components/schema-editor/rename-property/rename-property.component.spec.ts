import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenamePropertyComponent } from './rename-property.component';

describe('RenamePropertyComponent', () => {
  let component: RenamePropertyComponent;
  let fixture: ComponentFixture<RenamePropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenamePropertyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RenamePropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
