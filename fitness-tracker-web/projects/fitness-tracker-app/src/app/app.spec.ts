import { AppComponent } from './app';

//Test prüft, ob die Komponente erstellt werden kann
describe('AppComponent', () => {
  it('should create the app', () => {
    const app = new AppComponent();
    expect(app).toBeTruthy();
  });
});
