import { ComponentFixture, TestBed } from '@angular/core/testing';
import { About } from './about';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ 
        RouterTestingModule, // Simuliert Routing-Direktiven wie routerLink
        About                // Standalone Component muss importiert werden
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Happy Path
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // UI Check: Titel
  it('should render the main title', () => {
    const title = fixture.debugElement.query(By.css('h1'));
    expect(title.nativeElement.textContent).toContain('Über FitnessTracker');
  });

  // UI Check: Features (sollten 3 Stück sein gemäß HTML)
  it('should render three feature sections', () => {
    const features = fixture.debugElement.queryAll(By.css('.feature'));
    expect(features.length).toBe(3);
  });

  // Navigation Check: Button Link
  it('should have a register button pointing to /register', () => {
    const btn = fixture.debugElement.query(By.css('.cta-btn'));
    expect(btn).toBeTruthy();
    
    // Prüft, ob das routerLink Attribut gesetzt ist (statische Prüfung)
    // Hinweis: In manchen Test-Umgebungen heißt das Attribut im DOM 'ng-reflect-router-link'
    const linkAttribute = btn.attributes['routerLink'] || btn.attributes['ng-reflect-router-link'];
    expect(linkAttribute).toBe('/register');
  });
});