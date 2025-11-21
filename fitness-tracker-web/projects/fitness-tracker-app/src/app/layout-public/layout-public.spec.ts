import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutPublic } from './layout-public';

describe('LayoutPublic', () => {
  let component: LayoutPublic;
  let fixture: ComponentFixture<LayoutPublic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPublic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutPublic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
