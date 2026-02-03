import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide login buttons initially', () => {
    const startButton = fixture.debugElement.query(By.css('.start-btn'));
    const loginButtonsContainer = fixture.debugElement.query(By.css('.login-buttons'));

    expect(component.showLoginButtons).toBeFalse();
    expect(startButton).toBeTruthy();
    expect(loginButtonsContainer.nativeElement.classList.contains('show')).toBeFalse();
  });

  it('should show login buttons after clicking start', () => {
    const startButton = fixture.debugElement.query(By.css('.start-btn'));

    startButton.nativeElement.click();
    fixture.detectChanges();

    const updatedStartButton = fixture.debugElement.query(By.css('.start-btn'));
    const loginButtonsContainer = fixture.debugElement.query(By.css('.login-buttons'));

    expect(component.showLoginButtons).toBeTrue();
    expect(updatedStartButton).toBeNull();
    expect(loginButtonsContainer.nativeElement.classList.contains('show')).toBeTrue();
  });

  it('should show login buttons when onStart is called', () => {
    component.onStart();
    fixture.detectChanges();

    const loginButtonsContainer = fixture.debugElement.query(By.css('.login-buttons'));
    expect(component.showLoginButtons).toBeTrue();
    expect(loginButtonsContainer.nativeElement.classList.contains('show')).toBeTrue();
  });
});
