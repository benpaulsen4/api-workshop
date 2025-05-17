import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportComponent } from './import.component';
import { MessageService } from 'primeng/api';
import { DataService } from '../../services/data.service';

describe('ImportComponent', () => {
  let component: ImportComponent;
  let fixture: ComponentFixture<ImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportComponent],
      providers: [
        {
          provide: MessageService,
          useValue: jasmine.createSpyObj('MessageService', ['add']),
        },
        {
          provide: DataService,
          useValue: jasmine.createSpyObj('DataService', ['getCollection']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
