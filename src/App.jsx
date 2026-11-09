// src/App.jsx — route config. All admin + customer pages lazy-loaded; only

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import axios from 'axios';
import { readUser, readAuth, isSignedIn, isStaffRole, homeFor } from './utils/authRoute';
import { installResponseGuards, watchCrossTabSession } from './utils/session';
// iOS has no native install prompt (Android gets one from the manifest); this fills that gap.
import PWAPrompt from 'react-ios-pwa-prompt';
import { MotionConfig } from 'framer-motion';
import StorageNotice from './components/StorageNotice';
import RouteMeta from './components/RouteMeta';
import BrandedStatus from './components/BrandedStatus';
import usePageTitle from './hooks/usePageTitle';

// Dev: no baseURL, /api/* goes through the Vite proxy. Prod: VITE_API_URL points straight at Railway.
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}
axios.defaults.headers.common['Accept']       = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Interceptor: reads fresh token on every request (handles post-login token set)
axios.interceptors.request.use((config) => {
  const tok = localStorage.getItem('vfrb_token');
  if (tok) config.headers['Authorization'] = `Bearer ${tok}`;
  return config;
});
installResponseGuards();
watchCrossTabSession();

// ── Layouts — lazy (role-gated by RequireAuth; a visitor only ever needs
// one, and neither is needed pre-login, so eager-importing both bloated
// every user's initial bundle with the other role's shell). Existing
// top-level <Suspense> (below) already covers this. ──────────────────────
const AdminLayout    = lazy(() => import('./layouts/AdminLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));

// ── Landing Pages — eager (public, lightweight) ───────────────────────────────
// No admin landing page — those accounts are provisioned directly, never self-registered.
import Landing      from './pages/Landing';

// ── Auth — eager (small, always needed for login flow) ───────────────────────
import CustomerLogin    from './pages/auth/Login';
import AuthSkeleton, { useAuthReady } from './components/AuthSkeleton';
import { AppShellSkeleton, SiteSkeleton, StudioSkeleton } from './components/PageSkeletons';
import UpdatePrompt from './components/UpdatePrompt';
import { useAfter } from './components/ui/PageLoader';
import { areaOf } from './utils/routeArea';
import VerifyEmail      from './pages/auth/VerifyEmail';
import GoogleComplete   from './pages/auth/GoogleComplete';

// ── Admin Pages — all lazy ────────────────────────────────────────────────────
const AdminDashboard         = lazy(() => import('./pages/admin/Dashboard'));

// Manager and Owner share the full admin dashboard.
function DashboardHome() {
  return <AdminDashboard/>;
}
const AdminOrders            = lazy(() => import('./pages/admin/Orders'));
const AdminInventory         = lazy(() => import('./pages/admin/Inventory'));
const AdminMaterials         = lazy(() => import('./pages/admin/Materials'));
// AdminMaterialRates removed Aug 28 2026 — no formula/BOM exists in this
// system; nothing computes from material_usage_rates anymore.
const AdminPurchaseOrders    = lazy(() => import('./pages/admin/PurchaseOrders'));
const AdminReports           = lazy(() => import('./pages/admin/Reports'));
const AdminSalesTransactions = lazy(() => import('./pages/admin/SalesTransactions'));
const AdminMessages          = lazy(() => import('./pages/admin/Messages'));
const AdminDeliveryTracking  = lazy(() => import('./pages/admin/DeliveryTracking'));
const AdminCustomers         = lazy(() => import('./pages/admin/CustomersMaster'));
const AdminSuppliers         = lazy(() => import('./pages/admin/Suppliers'));
const AdminShowcaseQueue     = lazy(() => import('./pages/admin/ShowcaseModerationQueue'));
const AdminSettings          = lazy(() => import('./pages/admin/Settings'));
const AdminActivityLog       = lazy(() => import('./pages/admin/ActivityLog'));
const AdminAuditLog          = lazy(() => import('./pages/admin/AuditLog'));
const AdminFeedback          = lazy(() => import('./pages/admin/Feedback')); // NEW Aug 27 2026
const AdminInvoice           = lazy(() => import('./pages/admin/Invoice'));
const AdminOrderDetail       = lazy(() => import('./pages/admin/OrderDetail'));
const AdminProductionTracking= lazy(() => import('./pages/admin/ProductionTracking')); // TASK R: was missing
const AdminProductionList    = lazy(() => import('./pages/admin/ProductionList'));      // BUG-FIX: list before detail
const AdminPhysicalCount     = lazy(() => import('./pages/admin/PhysicalCount'));
const AdminDailyOutputLog    = lazy(() => import('./pages/admin/DailyOutputLog'));
const AdminQCChecklist       = lazy(() => import('./pages/admin/QCChecklist'));

// ── Customer Pages — all lazy ─────────────────────────────────────────────────
const CustomerDashboard   = lazy(() => import('./pages/client/Dashboard'));
const CustomerOrders      = lazy(() => import('./pages/client/Orders'));
const CustomerMyDesigns   = lazy(() => import('./pages/client/MyDesigns'));
const CustomerOrderDetail = lazy(() => import('./pages/client/OrderDetail'));
const CustomerOrderWizard = lazy(() => import('./pages/client/OrderWizard'));
const CustomerAIMaterials = lazy(() => import('./pages/client/AIMaterials'));
const CustomerMessages    = lazy(() => import('./pages/client/Messages'));
const CustomerSettings    = lazy(() => import('./pages/client/AccountSettings'));

// ── Design Studio — separately lazy (Fabric.js + Three.js are heavy) ─────────
const DesignStudio = lazy(() => import('./pages/client/DesignStudio'));
const DevLayouts = import.meta.env.DEV ? lazy(() => import('./dev/layouts/DevLayouts')) : null;

// ── Auth extras — lazy ────────────────────────────────────────────────────────
// ── Public info pages — lazy, no auth required; PUBLIC is also what Prefetch warms ──
const PUBLIC = {
  forgot: () => import('./pages/auth/ForgotPassword'), reset: () => import('./pages/auth/ResetPassword'),
  guide: () => import('./pages/Guide'), faq: () => import('./pages/FAQ'), team: () => import('./pages/Team'),
  about: () => import('./pages/About'), whatWeDo: () => import('./pages/WhatWeDo'), inside: () => import('./pages/InsideVFRB'),
  gallery: () => import('./pages/Gallery'), group60: () => import('./pages/Group60'),
  privacy: () => import('./pages/PrivacyPolicy'), terms: () => import('./pages/TermsOfService'),
};
const ForgotPassword = lazy(PUBLIC.forgot);
const ResetPassword  = lazy(PUBLIC.reset);
const GuidePage    = lazy(PUBLIC.guide);
const FAQPage      = lazy(PUBLIC.faq);
const TeamPage     = lazy(PUBLIC.team);
const AboutPage    = lazy(PUBLIC.about);
const WhatWeDoPage = lazy(PUBLIC.whatWeDo);
const InsidePage   = lazy(PUBLIC.inside);
const GalleryPage  = lazy(PUBLIC.gallery);
const Group60Page  = lazy(PUBLIC.group60);
const PrivacyPage  = lazy(PUBLIC.privacy);
const TermsPage    = lazy(PUBLIC.terms);

// Skeletons appear only when a load takes longer than 150 ms; quicker loads show nothing.
const Late = ({ children }) => (useAfter(150) ? children : null);

// ── Page loader — skeleton shaped like the page whose bundle is downloading ──
function Loader() {
  const { pathname } = useLocation();
  const area = areaOf(pathname);
  const late = useAfter(150);
  if (!late) return null;
  if (area === 'auth') return <AuthSkeleton variant={SPLIT_AUTH.includes(pathname) ? 'split' : undefined}/>;
  if (area === 'studio') return <StudioSkeleton/>;
  if (area === 'admin') return <AppShellSkeleton/>;
  if (area === 'app') return <AppShellSkeleton customer/>;
  return <SiteSkeleton/>;
}

// Warm the public and auth chunks once the browser is idle, so page hops skip the skeleton.
function Prefetch() {
  const area = areaOf(useLocation().pathname);
  useEffect(() => {
    if ((area !== 'site' && area !== 'auth') || navigator.connection?.saveData) return undefined;
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 1200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const id = idle(() => Object.values(PUBLIC).forEach(load => load().catch(() => {})));
    return () => cancel(id);
  }, [area]);
  return null;
}

// Each route gets its own boundary: router navigations run as transitions, which
// keep the old page on screen instead of showing an already-mounted fallback.
const SiteLoad  = ({ children }) => <Suspense fallback={<Late><SiteSkeleton/></Late>}>{children}</Suspense>;
const SPLIT_AUTH = ['/login', '/forgot-password', '/reset-password'];
const AuthLoad  = ({ children }) => <Suspense fallback={<Late><AuthSkeleton variant="split"/></Late>}>{children}</Suspense>;
const ShellLoad = ({ customer, children }) => <Suspense fallback={<Late><AppShellSkeleton customer={customer}/></Late>}>{children}</Suspense>;

// ── Auth guards ───────────────────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const user = readUser();
  const tok  = localStorage.getItem('vfrb_token');
  if (!tok) {
    return <Navigate to={role === 'customer' ? '/login' : '/admin/login'} replace/>;
  }
  if (role === 'admin' && !isStaffRole(user)) {
    return <Navigate to="/admin/login" replace/>;
  }
  if (role === 'customer' && user.role !== 'customer') {
    return <Navigate to="/login" replace/>;
  }
  // The API enforces this too; redirecting here just avoids a screen of 403s.
  if (role === 'customer' && !user.email_verified_at) {
    return <Navigate to="/verify-email" replace/>;
  }
  return children;
}

import { canAccessArea, readAdminUser, isAdmin, isOwner, ownerCanOpen } from './utils/jobAccess';
import AccessDenied from './components/AccessDenied';
function RequireArea({ area, children }) {
  return canAccessArea(readAdminUser(), area) ? children : <AccessDenied what={`The ${area} area`}/>;
}
function RequireManager({ children }) {
  const { pathname } = useLocation();
  const user = readUser();
  return isAdmin(user) || (isOwner(user) && ownerCanOpen(pathname)) ? children : <AccessDenied what="This page"/>;
}

// Unknown public path: its own tab title, or the previous page's title would stay.
function NotFound() {
  usePageTitle('Page not found');
  return <BrandedStatus code="404" title="Page not found" body="There is no page at this address. It may have moved, or the link was mistyped."/>;
}

// Unknown /admin/* path: say so inside the shell instead of an empty outlet.
function AdminNotFound() {
  usePageTitle('Page not found');
  return (
    <div role="alert" style={{ maxWidth: 520, margin: '64px auto', padding: '0 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px', color: 'var(--ink, #0f172a)' }}>Page not found</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted, #475569)' }}>
        There is no admin page at this address. It may have moved, or the link was mistyped.
      </p>
      <Link to="/admin/dashboard" className="adm-btn primary" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px' }}>Back to dashboard</Link>
    </div>
  );
}

// ── Root route handlers ───────────────────────────────────────────────────────
function CustomerRootRoute() {
  const tok  = localStorage.getItem('vfrb_token');
  const user = readUser();
  if (tok && user.role === 'customer')                       return <Navigate to="/dashboard"        replace/>;
  if (tok && isStaffRole(user))                              return <Navigate to="/admin/dashboard"   replace/>;
  return <Landing/>;
}

function AdminRootRoute() {
  const tok  = localStorage.getItem('vfrb_token');
  const user = readUser();
  if (tok && isStaffRole(user))                              return <Navigate to="/admin/dashboard" replace/>;
  // No landing page for admin/staff (Sept 3 2026) — straight to login.
  return <Navigate to="/admin/login" replace/>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
// Signed-in users never need the login/register screens; respect the existing session.
function GuestOnly({ children }) {
  const auth = readAuth();
  return isSignedIn(auth) ? <Navigate to={homeFor(auth.user)} replace/> : children;
}

// Skeleton first, so every auth screen (incl. home → login, logout → login) opens on a placeholder.
function AuthGate({ children }) {
  return useAuthReady() ? children : <Late><AuthSkeleton/></Late>;
}


export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <ScrollTop/>
      <RouteMeta/>
      <Prefetch/>
      <StorageNotice/>
      <UpdatePrompt/>
      {/* appIconPath points at the local icon — the package default falls back to a
          Google CDN call, which this project's offline-tolerant rule forbids. */}
      <PWAPrompt
        copyTitle="Install VFRB Enterprise"
        copyDescription="Add VFRB to your home screen for faster access and a full-screen app view — no browser address bar."
        appIconPath="/apple-touch-icon.png"
      />
      <Suspense fallback={<Loader/>}>
        <Routes>

          {/* ── ROOT ──────────────────────────────────────────────────────── */}
          <Route path="/"      element={<CustomerRootRoute/>}/>
          <Route path="/admin" element={<AdminRootRoute/>}/>

          {/* ── CUSTOMER AUTH ─────────────────────────────────────────────── */}
          {/* Split auth pages have no photo, so they skip AuthGate's photo wait. */}
          <Route path="/login"           element={<GuestOnly><CustomerLogin/></GuestOnly>}/>
          {/* Self-registration is closed: VFRB creates customer accounts. */}
          <Route path="/register"        element={<Navigate to="/login" replace/>}/>
          <Route path="/forgot-password" element={<AuthLoad><ForgotPassword/></AuthLoad>}/>
          <Route path="/reset-password"  element={<AuthLoad><ResetPassword/></AuthLoad>}/>
          <Route path="/verify-email"    element={<AuthGate><VerifyEmail/></AuthGate>}/>
          <Route path="/auth/google/complete" element={<GoogleComplete/>}/>

          {/* ── ADMIN AUTH — one shared login, role decides the redirect ───── */}
          <Route path="/admin/login" element={<Navigate to="/login" replace/>}/>

          {/* ── PUBLIC INFO PAGES — no auth required ─────────────────────── */}
          <Route path="/guide"    element={<SiteLoad><GuidePage/></SiteLoad>}/>
          <Route path="/faq"      element={<SiteLoad><FAQPage/></SiteLoad>}/>
          <Route path="/about"       element={<SiteLoad><AboutPage/></SiteLoad>}/>
          <Route path="/what-we-do"  element={<SiteLoad><WhatWeDoPage/></SiteLoad>}/>
          <Route path="/inside-vfrb" element={<SiteLoad><InsidePage/></SiteLoad>}/>
          <Route path="/gallery"     element={<SiteLoad><GalleryPage/></SiteLoad>}/>
          <Route path="/our-team" element={<SiteLoad><TeamPage/></SiteLoad>}/>
          <Route path="/vfrb-family" element={<Navigate to="/our-team" replace/>}/>
          <Route path="/group-60" element={<SiteLoad><Group60Page/></SiteLoad>}/>
          <Route path="/privacy"  element={<SiteLoad><PrivacyPage/></SiteLoad>}/>
          <Route path="/terms"    element={<SiteLoad><TermsPage/></SiteLoad>}/>

          {/* ── ADMIN PORTAL ──────────────────────────────────────────────── */}
          <Route path="/admin/*" element={
            <RequireAuth role="admin"><ShellLoad><AdminLayout/></ShellLoad></RequireAuth>
          }>
            <Route path="dashboard"   element={<DashboardHome/>}/>

            {/* Manager + Owner */}
            <Route path="orders"      element={<AdminOrders/>}/>
            <Route path="orders/:id"  element={<AdminOrderDetail/>}/>
            <Route path="customers"   element={<AdminCustomers/>}/>
            <Route path="production/:orderId" element={<RequireArea area="production"><AdminProductionTracking/></RequireArea>}/>
            <Route path="production"          element={<RequireArea area="production"><AdminProductionList/></RequireArea>}/>
            <Route path="inventory"   element={<RequireArea area="inventory"><AdminInventory/></RequireArea>}/>
            <Route path="messages"    element={<AdminMessages/>}/>
            <Route path="procurement" element={<RequireArea area="inventory"><AdminPurchaseOrders/></RequireArea>}/>
            <Route path="delivery"    element={<AdminDeliveryTracking/>}/>
            <Route path="materials"   element={<RequireArea area="inventory"><AdminMaterials/></RequireArea>}/>
            {/* material-rates route removed Aug 28 2026 — see App.jsx lazy-import comment */}
            <Route path="transactions"element={<AdminSalesTransactions/>}/>

            {/* Month 2 operational */}
            <Route path="physical-count" element={<RequireArea area="inventory"><AdminPhysicalCount/></RequireArea>}/>
            <Route path="output-log"     element={<RequireArea area="production"><AdminDailyOutputLog/></RequireArea>}/>
            <Route path="qc"             element={<RequireArea area="production"><AdminQCChecklist/></RequireArea>}/>

            <Route path="settings"  element={<AdminSettings/>}/>

            {/* Manager Only */}
            <Route path="reports"   element={<RequireManager><AdminReports/></RequireManager>}/>
            <Route path="feedback"  element={<RequireManager><AdminFeedback/></RequireManager>}/>
            <Route path="activity-log" element={<RequireManager><AdminActivityLog/></RequireManager>}/>
            <Route path="audit-logs" element={<RequireManager><AdminAuditLog/></RequireManager>}/>
            <Route path="invoice"   element={<RequireManager><AdminInvoice/></RequireManager>}/>
            <Route path="suppliers" element={<RequireManager><AdminSuppliers/></RequireManager>}/>
            <Route path="users"     element={<RequireManager><Navigate to="/admin/settings?tab=users" replace/></RequireManager>}/>
            <Route path="designs/showcase-queue" element={<RequireManager><AdminShowcaseQueue/></RequireManager>}/>
            <Route path="*" element={<AdminNotFound/>}/>
          </Route>

          {/* ── CUSTOMER PORTAL — root-level paths, no /client or /customer prefix ── */}
          <Route element={
            <RequireAuth role="customer"><ShellLoad customer><CustomerLayout/></ShellLoad></RequireAuth>
          }>
            <Route path="dashboard"   element={<CustomerDashboard/>}/>
            <Route path="my-designs"  element={<CustomerMyDesigns/>}/>
            <Route path="orders"      element={<CustomerOrders/>}/>
            <Route path="orders/:id"  element={<CustomerOrderDetail/>}/>
            <Route path="order/create"element={<CustomerOrderWizard/>}/>
            <Route path="ai-materials"element={<CustomerAIMaterials/>}/>
            <Route path="messages"    element={<CustomerMessages/>}/>
            <Route path="billing"     element={<Navigate to="/settings?tab=billing" replace/>}/>
            <Route path="settings"    element={<CustomerSettings/>}/>
            <Route path="help"        element={<Navigate to="/settings?tab=help" replace/>}/>
            <Route path="profile"     element={<Navigate to="/settings?tab=profile" replace/>}/>
          </Route>

          {/* ── DESIGN STUDIO — full-screen, outside CustomerLayout ───────── */}
          <Route path="/design-studio" element={
            <RequireAuth role="customer">
              <Suspense fallback={<Late><StudioSkeleton/></Late>}><DesignStudio/></Suspense>
            </RequireAuth>
          }/>

          {DevLayouts && <Route path="/dev/layouts" element={<Suspense fallback={null}><DevLayouts/></Suspense>}/>}

          {/* ── 404 ───────────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound/>}/>

        </Routes>
      </Suspense>
    </BrowserRouter>
    </MotionConfig>
  );
}