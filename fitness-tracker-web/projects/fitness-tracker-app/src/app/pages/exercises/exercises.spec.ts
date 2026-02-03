import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Exercises } from './exercises';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

class AuthSessionServiceStub {
  private loggedIn = false;

  setLoggedIn(isLoggedIn: boolean): void {
    this.loggedIn = isLoggedIn;
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }
}

describe('Exercises', () => {
  let component: Exercises;
  let httpMock: HttpTestingController;
  let sessionStub: AuthSessionServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, Exercises],
      providers: [{ provide: AuthSessionService, useClass: AuthSessionServiceStub }],
    });

    component = TestBed.createComponent(Exercises).componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    sessionStub = TestBed.inject(AuthSessionService) as unknown as AuthSessionServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load exercises and apply filter on init', () => {
    sessionStub.setLoggedIn(false);

    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    req.flush([{ id: 1, name: 'Bankdrücken', category: 'Freihantel', muscleGroups: 'Brust', description: '' }]);

    expect(component.loading).toBeFalse();
    expect(component.exercises.length).toBe(1);
    expect(component.filteredExerciseOverview.length).toBe(1);
  });

  it('should normalize exercises from embedded response', () => {
    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    req.flush({
      _embedded: {
        exercises: [{ id: 2, name: 'Kniebeuge', category: 'Langhantel', muscleGroups: 'Beine' }],
      },
    });

    expect(component.exercises.length).toBe(1);
    expect(component.exercises[0].id).toBe(2);
  });

  it('should set error when addExercise is called while logged out', () => {
    sessionStub.setLoggedIn(false);

    component.addExercise();

    expect(component.error).toBe('Bitte anmelden, um Übungen anzulegen.');
  });

  it('should validate required fields when adding exercise', () => {
    sessionStub.setLoggedIn(true);
    component.form = { name: '  ', category: 'Freihantel', muscleGroups: 'Brust', description: '' };

    component.addExercise();

    expect(component.error).toBe('Bitte Name, Kategorie und Muskelgruppen angeben.');
  });

  it('should post and reload exercises on successful add', () => {
    sessionStub.setLoggedIn(true);
    component.form = { name: 'Bankdrücken', category: 'Freihantel', muscleGroups: 'Brust', description: '' };

    component.addExercise();

    const postReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 1, name: 'Bankdrücken', category: 'Freihantel', muscleGroups: 'Brust', description: '' });

    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush([{ id: 1, name: 'Bankdrücken', category: 'Freihantel', muscleGroups: 'Brust', description: '' }]);

    expect(component.info).toBe('Übung wurde angelegt.');
    expect(component.submitting).toBeFalse();
    expect(component.exercises.length).toBe(1);
  });

  it('should block saveSelected when logged out', () => {
    sessionStub.setLoggedIn(false);
    component.selectedExercise = { id: 1, name: 'A', category: 'B', muscleGroups: 'C', description: '' };
    component.editForm = { name: 'A', category: 'B', muscleGroups: 'C', description: '' };

    component.saveSelected();

    expect(component.error).toBe('Bitte anmelden, um Übungen zu bearbeiten.');
  });

  it('should put and reload exercises on successful saveSelected', () => {
    sessionStub.setLoggedIn(true);

    component.selectedExercise = { id: 10, name: 'Alt', category: 'AltCat', muscleGroups: 'AltMuscles', description: '' };
    component.editForm = { name: 'Neu', category: 'NeuCat', muscleGroups: 'NeuMuscles', description: 'Desc' };

    component.saveSelected();

    const putReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises/10`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: 10, name: 'Neu', category: 'NeuCat', muscleGroups: 'NeuMuscles', description: 'Desc' });

    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    getReq.flush([{ id: 10, name: 'Neu', category: 'NeuCat', muscleGroups: 'NeuMuscles', description: 'Desc' }]);

    expect(component.info).toBe('Übung wurde aktualisiert.');
    expect(component.saving).toBeFalse();
  });

  it('should not delete when confirmation is canceled', () => {
    sessionStub.setLoggedIn(true);
    spyOn(window, 'confirm').and.returnValue(false);

    component.deleteExercise({ id: 1, name: 'A', category: 'B', muscleGroups: 'C' });

    expect(httpMock.match(`${environment.apiBaseUrl}/exercises/1`).length).toBe(0);
  });

  it('should delete and reload when confirmation is accepted', () => {
    sessionStub.setLoggedIn(true);
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteExercise({ id: 1, name: 'A', category: 'B', muscleGroups: 'C' });

    const delReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises/1`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);

    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    getReq.flush([]);

    expect(component.exercises.length).toBe(0);
  });

  it('should reset selection when selected exercise no longer exists after reload', () => {
    component.selectedExercise = { id: 99, name: 'X', category: 'Y', muscleGroups: 'Z', description: '' };

    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    req.flush([{ id: 1, name: 'A', category: 'B', muscleGroups: 'C', description: '' }]);

    expect(component.selectedExercise).toBeNull();
  });
});
