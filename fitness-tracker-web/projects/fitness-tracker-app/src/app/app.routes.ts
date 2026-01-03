import { Routes } from '@angular/router';

import { LayoutPublic } from './layout-public/layout-public';
import { LayoutPrivate } from './layout-private/layout-private';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { About } from './pages/about/about';
import { AGB } from './pages/agb/agb';
import { Impressum } from './pages/impressum/impressum';

import { Exercises } from './pages/exercises/exercises';
import { ExercisesPublic } from './pages/exercises-public/exercises-public';
import { Plans } from './pages/plans/plans';
import { PlansPublic } from './pages/plans-public/plans-public';
import { Sessions } from './pages/sessions/sessions';
import { SessionsPublic } from './pages/sessions-public/sessions-public';


import { Dashboard } from './pages/dashboard/dashboard';
import { TrainingProgress } from './pages/training-progress/training-progress';
import { Profile } from './pages/profile/profile';
import { TrainingStart } from './pages/training-start/training-start';

import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  // Legacy Redirects (alte URLs -> neue /app URLs)
  { path: 'dashboard', redirectTo: 'app/dashboard', pathMatch: 'full' },
  { path: 'training-progress', redirectTo: 'app/training-progress', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'app/profile', pathMatch: 'full' },

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
      { path: 'impressum', component: Impressum },

      { path: 'exercises', component: ExercisesPublic },
      { path: 'plans', component: PlansPublic },
      { path: 'sessions', component: SessionsPublic },
    ],
  },

  // PRIVATE (/app)
  {
    path: 'app',
    component: LayoutPrivate,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'dashboard', component: Dashboard },
      { path: 'training-progress', component: TrainingProgress },
      { path: 'profile', component: Profile },
      { path: 'training/start/:sessionId', component: TrainingStart },

      { path: 'exercises', component: Exercises },
      { path: 'plans', component: Plans },
      { path: 'sessions', component: Sessions },

      
      { path: 'about', component: About },
      { path: 'agb', component: AGB },
      { path: 'impressum', component: Impressum },

    ],
  },

  { path: '**', redirectTo: '' },
];
