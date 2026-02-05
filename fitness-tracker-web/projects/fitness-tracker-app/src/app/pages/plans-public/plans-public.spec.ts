import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlansPublic, PublicPlanDto } from './plans-public';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../environment'; // Pfad ggf. anpassen

describe('PlansPublic', () => {
  let component: PlansPublic;
  let fixture: ComponentFixture<PlansPublic>;
  let httpMock: HttpTestingController;

  const API_PLANS = `${environment.apiBaseUrl}/training-plans`;
  const API_SESSIONS = `${environment.apiBaseUrl}/training-sessions`;

  // Mock-Daten
  const MOCK_PLANS: PublicPlanDto[] = [
    { id: 1, name: 'Ganzkörper', description: 'Für Anfänger', sessionsCount: 2, sessionsLoaded: false },
    
    { id: 2, name: '3er Split', description: undefined, sessionsCount: 3, sessionsLoaded: false }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Importiert HttpClientTestingModule für API-Calls und FormsModule für ngModel
      imports: [PlansPublic, HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PlansPublic);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Prüft auf offene HTTP-Requests
  });

  it('should create and fetch plans on init', () => {
    // 1. Init (ngOnInit)
    fixture.detectChanges();

    // 2. Erwarteter Request
    const req = httpMock.expectOne(API_PLANS);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_PLANS);

    // 3. UI Update
    fixture.detectChanges();

    expect(component.plans.length).toBe(2);
    expect(component.isLoading).toBeFalse();

    // 4. UI Check: Liste gerendert?
    const listItems = fixture.debugElement.queryAll(By.css('.list li'));
    expect(listItems.length).toBe(2);
    expect(listItems[0].nativeElement.textContent).toContain('Ganzkörper');
  });

  it('should show "No description" text if description is missing', () => {
    fixture.detectChanges();
    httpMock.expectOne(API_PLANS).flush(MOCK_PLANS);
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('.list li'));
    // Der zweite Plan hat keine Description -> Fallback-Text prüfen
    expect(listItems[1].nativeElement.textContent).toContain('Keine Beschreibung hinterlegt');
  });

  it('should filter plans by search query', async () => {
    // Setup
    fixture.detectChanges();
    httpMock.expectOne(API_PLANS).flush(MOCK_PLANS);
    fixture.detectChanges();

    // Eingabe simulieren
    const input = fixture.debugElement.query(By.css('input.search')).nativeElement;
    input.value = 'Split';
    input.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    await fixture.whenStable();

    // Checks
    expect(component.searchQuery).toBe('Split');
    expect(component.filteredPlans.length).toBe(1);
    expect(component.filteredPlans[0].name).toBe('3er Split');
  });

  it('should select a plan and lazy load sessions', () => {
    // 1. Pläne laden
    fixture.detectChanges();
    httpMock.expectOne(API_PLANS).flush(MOCK_PLANS);
    fixture.detectChanges();

    const planToSelect = component.plans[0];

    // 2. Klick auf Plan simulieren
    const listItems = fixture.debugElement.queryAll(By.css('.list li'));
    listItems[0].triggerEventHandler('click', null);
    fixture.detectChanges();

    // 3. Check Loading State & API Request
    expect(component.selectedPlan?.id).toBe(planToSelect.id);
    expect(component.selectedPlan?.loadingSessions).toBeTrue();

    const req = httpMock.expectOne(req => req.url === API_SESSIONS && req.params.get('planId') === String(planToSelect.id));
    expect(req.request.method).toBe('GET');
    
    // 4. Antwort senden
    req.flush([{ id: 101, name: 'Session A', days: [1] }]);
    fixture.detectChanges();

    // 5. Final Checks
    expect(component.selectedPlan?.loadingSessions).toBeFalse();
    expect(component.selectedPlan?.sessionsLoaded).toBeTrue();
    expect(component.selectedPlan?.sessions?.length).toBe(1);

    // UI Check: Details Panel sichtbar?
    const detailsHeader = fixture.debugElement.query(By.css('.details h2'));
    expect(detailsHeader.nativeElement.textContent).toContain('Details: Ganzkörper');
  });

  it('should not load sessions again if already loaded (Caching)', () => {
    // Setup: Plan, der bereits "sessionsLoaded" ist
    const loadedPlan: PublicPlanDto = { 
      id: 99, name: 'Cached Plan', sessionsLoaded: true, sessions: [], description: 'Test' 
    };
    
    fixture.detectChanges();
    httpMock.expectOne(API_PLANS).flush([loadedPlan]);
    fixture.detectChanges();

    // Klick simulieren
    const listItem = fixture.debugElement.query(By.css('.list li'));
    listItem.triggerEventHandler('click', null);
    fixture.detectChanges();

    // WICHTIG: Es darf KEIN Request an API_SESSIONS gehen
    httpMock.expectNone(API_SESSIONS);
    expect(component.selectedPlan?.name).toBe('Cached Plan');
  });

  it('should handle API errors gracefully', () => {
    fixture.detectChanges();
    
    // Fehler simulieren
    const req = httpMock.expectOne(API_PLANS);
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBeFalse();
    
    // UI Check: Error Alert sichtbar?
    const alert = fixture.debugElement.query(By.css('.alert.error'));
    expect(alert).toBeTruthy();
  });
});