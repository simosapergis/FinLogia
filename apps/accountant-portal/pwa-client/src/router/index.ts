import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { waitForAuthReady } from '@/composables/useAuth';
import { auth } from '@/services/firebase';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clients',
    name: 'clients',
    component: () => import('@/pages/ClientsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clients/:projectId/invoices',
    name: 'clientInvoices',
    component: () => import('@/pages/ClientInvoicesPage.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Handle dynamic import errors (e.g. when a new version is deployed and old chunks are missing)
router.onError((error, to) => {
  if (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  ) {
    // If we haven't tried to reload yet for this specific route
    if (!to.fullPath.includes('?reloaded=')) {
      const separator = to.fullPath.includes('?') ? '&' : '?';
      window.location.href = `${to.fullPath}${separator}reloaded=${Date.now()}`;
    }
  }
});

router.beforeEach(async (to) => {
  await waitForAuthReady();
  const user = auth.currentUser;

  if (to.meta.requiresAuth && !user) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && user) {
    return { name: 'dashboard' };
  }
});

export default router;
