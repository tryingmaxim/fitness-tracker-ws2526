import { Routes } from '@angular/router';

import { LayoutPublic } from './layout-public/layout-public';
import { LayoutPrivate } from './layout-private/layout-private';

// public pages
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { About } from './pages/about/about';
import { AGB } from './pages/agb/agb';
import { Impressum } from './pages/impressum/impressum';

// private pages
import { Dashboard } from './pages/dashboard/dashboard';
import { Exercises } from './pages/exercises/exercises';
import { Plans } from './pages/plans/plans';
import { Sessions } from './pages/sessions/sessions';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  // PUBLIC
  {
    path: '',
    component: LayoutPublic,
    children: [
      { path: '', component: Home },
      { path: 'login', component: Login },
      { path: 'register', component: Register },
      { path: 'about', component: About },
      { path: 'agb', component: AGB },
      { path: 'impressum', component: Impressum }
    ]
  },

  // PRIVATE
  {
    path: '',
    component: LayoutPrivate,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'exercises', component: Exercises },
      { path: 'plans', component: Plans },
      { path: 'sessions', component: Sessions },
      { path: 'profile', component: Profile },
    ]
  },

  { path: '**', redirectTo: '' }
];
