import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Impressum } from './impressum'; // Korrekter Import der Klasse
import { By } from '@angular/platform-browser';

describe('Impressum', () => {
  let component: Impressum;
  let fixture: ComponentFixture<Impressum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ Impressum ] // Standalone Component wird importiert
    })
    .compileComponents();

    fixture = TestBed.createComponent(Impressum);
    component = fixture.componentInstance;
    fixture.detectChanges(); // HTML rendern
  });

  // 1. Basistest: Komponente wird erstellt
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // 2. Inhaltstest: Hauptüberschrift
  it('should display the main title', () => {
    const titleElement = fixture.debugElement.query(By.css('h1'));
    expect(titleElement.nativeElement.textContent).toContain('Impressum');
  });

  // 3. Rechtlicher Check: § 5 DDG Hinweis
  it('should contain legal reference (§ 5 DDG)', () => {
    // Wir prüfen, ob der Text im gesamten Element oder spezifisch in der Adresse vorkommt
    const addressSection = fixture.debugElement.query(By.css('.legal-address'));
    expect(addressSection.nativeElement.textContent).toContain('Angaben gemäß § 5 DDG');
  });

  // 4. Strukturtest: Adresse vorhanden
  it('should display address information', () => {
    const addressSection = fixture.debugElement.query(By.css('.legal-address'));
    expect(addressSection).toBeTruthy();
    expect(addressSection.nativeElement.textContent).toContain('Musterstraße');
  });

  // 5. Interaktionstest: E-Mail Link
  it('should have a working mailto link', () => {
    const emailLink = fixture.debugElement.query(By.css('a[href^="mailto:"]'));
    expect(emailLink).toBeTruthy();
    expect(emailLink.attributes['href']).toBe('mailto:info@fitnesstracker.de');
  });
});