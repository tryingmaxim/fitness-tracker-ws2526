import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionsPublic, PublicSession } from './sessions-public';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../environment'; // Pfad ggf. anpassen

describe('SessionsPublic', () => {
  let component: SessionsPublic;
  let fixture: ComponentFixture<SessionsPublic>;
  let httpMock: HttpTestingController;
  
  const API_URL = `${environment.apiBaseUrl}/training-sessions`;

  // Mock-Daten für die API-Antwort
  const MOCK_SESSIONS_RESPONSE = {
    content: [
      { id: 1, name: 'Push Day', days: [1, 3], plan: { id: 10, name: 'PPL' } },
      { id: 2, name: 'Pull Day', days: [2, 4], planName: 'PPL' }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // WICHTIG: HttpClientTestingModule für API-Calls, FormsModule für ngModel
      imports: [SessionsPublic, HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionsPublic);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Prüft auf offene HTTP-Requests
  });

  it('should create and load sessions on init', () => {
    // 1. Init triggert ngOnInit -> fetchSessions
    fixture.detectChanges();

    // 2. Erwarteter API-Call
    const req = httpMock.expectOne(`${API_URL}?size=200`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_SESSIONS_RESPONSE);

    // 3. View Update
    fixture.detectChanges();

    // 4. Logik-Checks
    expect(component.sessions.length).toBe(2);
    expect(component.sessions[0].name).toBe('Push Day');
    expect(component.isLoading).toBeFalse();

    // 5. Template-Checks (Liste gerendert?)
    const sessionItems = fixture.debugElement.queryAll(By.css('.session-item'));
    expect(sessionItems.length).toBe(2);
    expect(sessionItems[0].nativeElement.textContent).toContain('Push Day');
  });

  it('should handle API errors gracefully', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${API_URL}?size=200`);
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    
    fixture.detectChanges();

    expect(component.errorMessage).toContain('Fehler beim Laden');
    expect(component.isLoading).toBeFalse();

    // UI Check: Error Alert sichtbar?
    const errorAlert = fixture.debugElement.query(By.css('.alert.error'));
    expect(errorAlert).toBeTruthy();
    expect(errorAlert.nativeElement.textContent).toContain('Fehler');
  });

  it('should filter sessions correctly by search query', async () => {
    // Setup
    fixture.detectChanges();
    httpMock.expectOne(`${API_URL}?size=200`).flush(MOCK_SESSIONS_RESPONSE);
    fixture.detectChanges();

    // Eingabe simulieren
    const inputElement = fixture.debugElement.query(By.css('input.search')).nativeElement;
    inputElement.value = 'Pull';
    inputElement.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    await fixture.whenStable(); // Warten auf ngModel Update

    // Logik Check
    expect(component.searchQuery).toBe('Pull');
    expect(component.filteredSessions.length).toBe(1);
    expect(component.filteredSessions[0].name).toBe('Pull Day');

    // UI Check
    const sessionItems = fixture.debugElement.queryAll(By.css('.session-item'));
    expect(sessionItems.length).toBe(1);
    expect(sessionItems[0].nativeElement.textContent).toContain('Pull Day');
  });

  it('should fetch details only if not already cached', () => {
    // Setup mit manuellen Daten
    const session: PublicSession = { id: 1, name: 'Test Session', days: [] };
    component.sessions = [session];
    
    // 1. Session auswählen (Klick simulieren oder direkt aufrufen)
    component.selectSession(session);
    
    // 2. Erwarteter API Call für Details
    const req = httpMock.expectOne(`${API_URL}/1/executions`);
    req.flush([{ exerciseId: 100, orderIndex: 1, plannedSets: 3 }]);
    
    expect(session.exerciseExecutions?.length).toBe(1);

    // 3. Erneut auswählen (sollte KEINEN Request auslösen -> Caching)
    component.selectSession(session);
    httpMock.expectNone(`${API_URL}/1/executions`);
  });

  it('should show details in UI when a session is clicked', () => {
    // Setup
    fixture.detectChanges();
    httpMock.expectOne(`${API_URL}?size=200`).flush(MOCK_SESSIONS_RESPONSE);
    fixture.detectChanges();

    // Klick auf erstes Element
    const firstSessionBtn = fixture.debugElement.query(By.css('.session-item'));
    firstSessionBtn.triggerEventHandler('click', null);
    
    // Mock Detail Request (da noch nicht geladen)
    const req = httpMock.expectOne(`${API_URL}/1/executions`);
    req.flush([]); // Leere Details reichen für den Test
    fixture.detectChanges();

    // UI Check: Detail-Ansicht sichtbar?
    const detailTitle = fixture.debugElement.query(By.css('.sessions-detail-card h2'));
    expect(detailTitle).toBeTruthy();
    expect(detailTitle.nativeElement.textContent).toContain('Push Day');
  });
});