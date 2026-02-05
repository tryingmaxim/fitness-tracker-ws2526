import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AGB } from './agb'; // Korrekter Import der Klasse
import { By } from '@angular/platform-browser';

describe('AGB', () => {
  let component: AGB;
  let fixture: ComponentFixture<AGB>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AGB ] // Standalone Component Import
    })
    .compileComponents();

    fixture = TestBed.createComponent(AGB);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Wichtig: Rendert das HTML für die Tests
  });

  // 1. Basistest
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // 2. Inhaltstest: Titel
  it('should display the correct title', () => {
    const titleElement = fixture.debugElement.query(By.css('h1'));
    // Prüft auf den exakten Text aus der HTML-Datei
    expect(titleElement.nativeElement.textContent).toContain('Allgemeine Geschäftsbedingungen (AGB)');
  });

  // 3. Strukturtest: Anzahl der Paragraphen
  it('should render 5 sections', () => {
    // Es gibt im HTML genau 5 <section> Tags
    const sections = fixture.debugElement.queryAll(By.css('section'));
    expect(sections.length).toBe(5);
  });

  // 4. Inhaltstest: Fußzeile/Datum
  it('should display the effective date', () => {
    const standElement = fixture.debugElement.query(By.css('.stand'));
    expect(standElement.nativeElement.textContent).toContain('Stand: November 2025');
  });
});