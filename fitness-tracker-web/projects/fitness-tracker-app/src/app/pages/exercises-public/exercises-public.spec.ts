import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ExercisesPublic, ExerciseDto } from './exercises-public';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../environment'; // Pfad ggf. anpassen

describe('ExercisesPublic', () => {
  let component: ExercisesPublic;
  let fixture: ComponentFixture<ExercisesPublic>;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiBaseUrl}/exercises`;

  // Mock-Daten für die Tests
  const MOCK_EXERCISES: ExerciseDto[] = [
    { id: 1, name: 'Bankdrücken', category: 'Brust', muscleGroups: 'Brust, Trizeps', description: 'Langhantel' },
    
    { id: 2, name: 'Kniebeugen', category: 'Beine', muscleGroups: 'Quadrizeps', description: undefined }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExercisesPublic, HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ExercisesPublic);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and fetch exercises on init', () => {
    fixture.detectChanges(); // ngOnInit -> API Call

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_EXERCISES);

    fixture.detectChanges(); // UI Update nach API Antwort

    expect(component.exercises.length).toBe(2);
    expect(component.filteredExercises.length).toBe(2);
    expect(component.isLoading).toBeFalse();
    
    const listItems = fixture.debugElement.queryAll(By.css('.list li'));
    expect(listItems.length).toBe(2);
    expect(listItems[0].nativeElement.textContent).toContain('Bankdrücken');
  });

  it('should handle API error gracefully', () => {
    fixture.detectChanges(); 

    const req = httpMock.expectOne(API_URL);
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    
    fixture.detectChanges();

    expect(component.errorMessage).toContain('Fehler beim Laden');
    expect(component.isLoading).toBeFalse();
    
    const errorAlert = fixture.debugElement.query(By.css('.alert.error'));
    expect(errorAlert).toBeTruthy();
  });

  it('should filter exercises based on search query', async () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(API_URL);
    req.flush(MOCK_EXERCISES);
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input.exercise-search')).nativeElement;
    inputEl.value = 'Knie';
    inputEl.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.searchQuery).toBe('Knie');
    expect(component.filteredExercises.length).toBe(1);
    expect(component.filteredExercises[0].name).toBe('Kniebeugen');

    const listItems = fixture.debugElement.queryAll(By.css('.list li'));
    expect(listItems.length).toBe(1);
  });

  it('should select an exercise and show details', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(API_URL);
    req.flush(MOCK_EXERCISES);
    fixture.detectChanges();

    const firstItem = fixture.debugElement.query(By.css('.list li'));
    firstItem.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.selectedExercise).toEqual(MOCK_EXERCISES[0]);

    const detailHeader = fixture.debugElement.query(By.css('.details-head h2'));
    expect(detailHeader).toBeTruthy();
    expect(detailHeader.nativeElement.textContent).toContain('Bankdrücken');
  });

  it('should deselect exercise when back button is clicked', () => {
    fixture.detectChanges();
    httpMock.expectOne(API_URL).flush(MOCK_EXERCISES);
    component.selectExercise(MOCK_EXERCISES[0]);
    fixture.detectChanges();

    const backBtn = fixture.debugElement.query(By.css('button.back'));
    backBtn.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.selectedExercise).toBeNull();
    const placeholder = fixture.debugElement.query(By.css('.panel.details.placeholder'));
    expect(placeholder).toBeTruthy();
  });

  it('should normalize different API response structures', () => {
    const wrappedResponse = { content: MOCK_EXERCISES };
    const result = (component as any).normalizeResponse(wrappedResponse);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Bankdrücken');
  });
});