import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  //Komponente sollte erfolgreich erstellt werden
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
