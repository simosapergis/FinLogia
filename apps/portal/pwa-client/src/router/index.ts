import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '@/services/firebase';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/OverviewPage.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/upload', name: 'upload', component: () => import('@/pages/UploadPage.vue'), meta: { requiresAuth: true } },
  { path: '/invoices', name: 'invoices', component: () => import('@/pages/InvoicesPage.vue'), meta: { requiresAuth: true } },
  { path: '/suppliers', name: 'suppliers', component: () => import('@/pages/SuppliersPage.vue'), meta: { requiresAuth: true } },
  { path: '/suppliers/:supplierId/invoices', name: 'supplier-invoices', component: () => import('@/pages/SupplierInvoicesPage.vue'), meta: { requiresAuth: true } },
  { path: '/notifications', name: 'notifications', component: () => import('@/pages/NotificationsPage.vue'), meta: { requiresAuth: true } },
  { path: '/income', name: 'income', component: () => import('@/pages/IncomePage.vue'), meta: { requiresAuth: true } },
  { path: '/expenses', name: 'expenses', component: () => import('@/pages/ExpensesPage.vue'), meta: { requiresAuth: true } },
  { path: '/financial-overview', name: 'financial-overview', component: () => import('@/pages/FinancialOverviewPage.vue'), meta: { requiresAuth: true } },
  { path: '/export-invoices', name: 'export-invoices', component: () => import('@/pages/ExportInvoicesPage.vue'), meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Wait for Firebase Auth to resolve the initial auth state.
 * Returns the current user (or null) once the listener fires.
 */
const waitForAuthReady = (): Promise<boolean> => {
  const auth = getAuth(firebaseApp);
  return new Promise((resolve) => {
    // If user is already resolved, return immediately
    if (auth.currentUser !== null) {
      resolve(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(Boolean(user));
    });
  });
};

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const isAuthenticated = await waitForAuthReady();
    if (!isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }
});

export default router;
