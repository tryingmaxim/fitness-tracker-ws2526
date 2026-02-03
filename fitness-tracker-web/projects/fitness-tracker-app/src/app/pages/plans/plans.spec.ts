import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Plans } from './plans';
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

describe('Plans', () => {
  let component: Plans;
  let httpMock: HttpTestingController;
  let sessionStub: AuthSessionServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, Plans],
      providers: [{ provide: AuthSessionService, useClass: AuthSessionServiceStub }],
    });

    component = TestBed.createComponent(Plans).componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    sessionStub = TestBed.inject(AuthSessionService) as unknown as AuthSessionServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load plans on init', () => {
    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    req.flush([{ id: 1, name: 'Push/Pull', description: 'Plan' }]);

    expect(component.loading).toBeFalse();
    expect(component.plans.length).toBe(1);
    expect(component.plans[0].id).toBe(1);
  });

  it('should block add when logged out', () => {
    sessionStub.setLoggedIn(false);
    component.form = { name: 'Plan', desc: '' };

    component.add();

    expect(component.error).toBe('Bitte anmelden, um Trainingspläne anzulegen.');
  });

  it('should validate name on add', () => {
    sessionStub.setLoggedIn(true);
    component.form = { name: '   ', desc: '' };

    component.add();

    expect(component.error).toBe('Bitte einen Namen für den Trainingsplan angeben.');
  });

  it('should post and reload plans on successful add', () => {
    sessionStub.setLoggedIn(true);
    component.form = { name: 'Neuer Plan', desc: 'Beschreibung' };

    component.add();

    const postReq = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({});

    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush([{ id: 2, name: 'Neuer Plan', description: 'Beschreibung' }]);

    expect(component.info).toBe('Trainingsplan wurde erstellt.');
    expect(component.submitting).toBeFalse();
    expect(component.plans.length).toBe(1);
  });

  it('should block saveSelected when logged out', () => {
    sessionStub.setLoggedIn(false);
    component.selectedPlan = { id: 1, name: 'A', description: 'B' };
    component.editForm = { name: 'A', desc: 'B' };

    component.saveSelected();

    expect(component.error).toBe('Bitte anmelden, um Trainingspläne zu bearbeiten.');
  });

  it('should validate name on saveSelected', () => {
    sessionStub.setLoggedIn(true);
    component.selectedPlan = { id: 1, name: 'A', description: 'B' };
    component.editForm = { name: '   ', desc: 'B' };

    component.saveSelected();

    expect(component.editErrors.name).toBe('Der Name darf nicht leer sein.');
  });

  it('should put and update local state on successful saveSelected', () => {
    sessionStub.setLoggedIn(true);
    component.plans = [{ id: 10, name: 'Alt', description: 'AltDesc' }];
    component.selectedPlan = component.plans[0];
    component.editForm = { name: 'Neu', desc: 'NeuDesc' };

    component.saveSelected();

    const putReq = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans/10`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: 10, name: 'Neu', description: 'NeuDesc' });

    expect(component.info).toBe('Trainingsplan wurde erfolgreich aktualisiert.');
    expect(component.saving).toBeFalse();
    expect(component.plans[0].name).toBe('Neu');
    expect(component.selectedPlan?.name).toBe('Neu');
  });

  it('should not delete when confirmation is canceled', () => {
    sessionStub.setLoggedIn(true);
    spyOn(window, 'confirm').and.returnValue(false);

    component.delete({ id: 1, name: 'Plan', description: '' });

    expect(httpMock.match(`${environment.apiBaseUrl}/training-plans/1`).length).toBe(0);
  });

  it('should delete and reload plans when confirmation is accepted', () => {
    sessionStub.setLoggedIn(true);
    spyOn(window, 'confirm').and.returnValue(true);

    component.delete({ id: 1, name: 'Plan', description: '' });

    const delReq = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans/1`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);

    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    getReq.flush([]);

    expect(component.plans.length).toBe(0);
  });

  it('should format days as sorted 1-30 list', () => {
    const result = component.formatDays([30, 2, 1, 31, 0, 15]);

    expect(result).toBe('1, 2, 15, 30');
  });
});
