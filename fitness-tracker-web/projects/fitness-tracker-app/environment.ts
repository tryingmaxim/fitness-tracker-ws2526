export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8081/api/v1',

  // Entwickler Modus um schneller testen zu können, ohne sich jedes mal neu anzumelden
  devAuthBypass: {
    enabled: true,
    email: 'dev@fitness.local',
    username: 'Dev Nutzer',

    // legacy - wird nicht mehr als JWT benutzt
    token: 'dev-mode-token',
  },
};
