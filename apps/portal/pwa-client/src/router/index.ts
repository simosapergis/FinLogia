import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseApp } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/OverviewPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/upload', name: 'upload', component: () => import('@/pages/UploadPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/invoices', name: 'invoices', component: () => import('@/pages/InvoicesPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/suppliers', name: 'suppliers', component: () => import('@/pages/SuppliersPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/suppliers/:supplierId/invoices', name: 'supplier-invoices', component: () => import('@/pages/SupplierInvoicesPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/notifications', name: 'notifications', component: () => import('@/pages/NotificationsPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/income', name: 'income', component: () => import('@/pages/IncomePage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/expenses', name: 'expenses', component: () => import('@/pages/ExpensesPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/financial-overview', name: 'financial-overview', component: () => import('@/pages/FinancialOverviewPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  { path: '/export-invoices', name: 'export-invoices', component: () => import('@/pages/ExportInvoicesPage.vue'), meta: { requiresAuth: true, role: 'business' } },
  
  // Accountant Routes
  { path: '/accountant', name: 'accountant-dashboard', component: () => import('@/pages/AccountantDashboardPage.vue'), meta: { requiresAuth: true, role: 'accountant' } },
  { path: '/accountant/clients', name: 'accountant-clients', component: () => import('@/pages/AccountantClientsPage.vue'), meta: { requiresAuth: true, role: 'accountant' } },
  { path: '/accountant/clients/:businessId/invoices', name: 'accountant-client-invoices', component: () => import('@/pages/AccountantClientInvoicesPage.vue'), props: (route) => ({ projectId: route.params.businessId }), meta: { requiresAuth: true, role: 'accountant' } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Wait for Firebase Auth to resolve the initial auth state.
 * Returns the current user (or null) once the listener fires.
 */
const waitForAuthReady = (): Promise<User | null> => {
  const auth = getAuth(firebaseApp);
  return new Promise((resolve) => {
    // If user is already resolved, return immediately
    if (auth.currentUser !== null) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const user = await waitForAuthReady();
    if (!user) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    const userStore = useUserStore();
    // Ensure userStore has processed the user (it might still be fetching businessId)
    // We check if userStore.user is null, or if the uid doesn't match.
    // If it's a new login, userStore.user is null.
    if (!userStore.user || userStore.user.uid !== user.uid) {
      await userStore.setUser(user);
    }

    // Wait for businessId to be fetched if it's still null but we are authenticated
    // This handles the case where setUser is async and we need the businessId for routing
    if (userStore.user && userStore.businessId === null && !userStore.isAccountant) {
      // It might take a moment for the store to update, but setUser is awaited above.
      // If it's still null, either the user has no businessId or it failed to fetch.
    }

    const isAccountant = userStore.isAccountant;

    // If accountant tries to access business routes, redirect to accountant dashboard
    // UNLESS they explicitly want to view their own business
    if (to.meta.role === 'business' && isAccountant) {
      const wantsBusinessView = localStorage.getItem('viewMode_business') === 'true';
      if (!wantsBusinessView) {
        return { name: 'accountant-dashboard' };
      }
    }

    if (to.meta.role === 'accountant' && !isAccountant) {
      return { name: 'home' }; // Normal users cannot access accountant routes
    }
  }
});

export default router;
