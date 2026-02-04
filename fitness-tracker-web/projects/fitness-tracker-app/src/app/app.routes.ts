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

const ROUTE_PATHS = {
  APP_ROOT: 'app',
  DASHBOARD: 'dashboard',
  TRAINING_PROGRESS: 'training-progress',
  PROFILE: 'profile',
  TRAINING_START: 'training/start/:sessionId',
  EXERCISES: 'exercises',
  PLANS: 'plans',
  SESSIONS: 'sessions',
  LOGIN: 'login',
  REGISTER: 'register',
  ABOUT: 'about',
  AGB: 'agb',
  IMPRESSUM: 'impressum',
  WILDCARD: '**',
  EMPTY: '',
} as const;

const publicRoutes: Routes = [
  { path: ROUTE_PATHS.EMPTY, component: Home },
  { path: ROUTE_PATHS.LOGIN, component: Login },
  { path: ROUTE_PATHS.REGISTER, component: Register },

  { path: ROUTE_PATHS.ABOUT, component: About },
  { path: ROUTE_PATHS.AGB, component: AGB },
  { path: ROUTE_PATHS.IMPRESSUM, component: Impressum },

  { path: ROUTE_PATHS.EXERCISES, component: ExercisesPublic },
  { path: ROUTE_PATHS.PLANS, component: PlansPublic },
  { path: ROUTE_PATHS.SESSIONS, component: SessionsPublic },
];

const privateRoutes: Routes = [
  { path: ROUTE_PATHS.EMPTY, pathMatch: 'full', redirectTo: ROUTE_PATHS.DASHBOARD },

  { path: ROUTE_PATHS.DASHBOARD, component: Dashboard },
  { path: ROUTE_PATHS.TRAINING_PROGRESS, component: TrainingProgress },
  { path: ROUTE_PATHS.PROFILE, component: Profile },
  { path: ROUTE_PATHS.TRAINING_START, component: TrainingStart },

  { path: ROUTE_PATHS.EXERCISES, component: Exercises },
  { path: ROUTE_PATHS.PLANS, component: Plans },
  { path: ROUTE_PATHS.SESSIONS, component: Sessions },

  { path: ROUTE_PATHS.ABOUT, component: About },
  { path: ROUTE_PATHS.AGB, component: AGB },
  { path: ROUTE_PATHS.IMPRESSUM, component: Impressum },
];

const legacyRedirects: Routes = [
  { path: ROUTE_PATHS.DASHBOARD, redirectTo: `${ROUTE_PATHS.APP_ROOT}/${ROUTE_PATHS.DASHBOARD}`, pathMatch: 'full' },
  {
    path: ROUTE_PATHS.TRAINING_PROGRESS,
    redirectTo: `${ROUTE_PATHS.APP_ROOT}/${ROUTE_PATHS.TRAINING_PROGRESS}`,
    pathMatch: 'full',
  },
  { path: ROUTE_PATHS.PROFILE, redirectTo: `${ROUTE_PATHS.APP_ROOT}/${ROUTE_PATHS.PROFILE}`, pathMatch: 'full' },
];

export const routes: Routes = [
  ...legacyRedirects,

  {
    path: ROUTE_PATHS.EMPTY,
    component: LayoutPublic,
    children: publicRoutes,
  },

  {
    path: ROUTE_PATHS.APP_ROOT,
    component: LayoutPrivate,
    canActivate: [authGuard],
    children: privateRoutes,
  },

  { path: ROUTE_PATHS.WILDCARD, redirectTo: ROUTE_PATHS.EMPTY },
];
