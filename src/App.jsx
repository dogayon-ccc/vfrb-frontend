// src/App.jsx — route config. All admin + customer pages lazy-loaded; only

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import axios from 'axios';
// iOS has no native install prompt (Android gets one from the manifest); this fills that gap.
import PWAPrompt from 'react-ios-pwa-prompt';

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

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// ── Layouts — eager (always needed on login) ──────────────────────────────────
import AdminLayout    from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';

// ── Landing Pages — eager (public, lightweight) ───────────────────────────────
// No admin landing page — those accounts are provisioned directly, never self-registered.
import Landing      from './pages/Landing';

// ── Auth — eager (small, always needed for login flow) ───────────────────────
import CustomerLogin    from './pages/auth/Login';
import CustomerRegister from './pages/auth/Register';
import VerifyEmail      from './pages/auth/VerifyEmail';
import GoogleComplete   from './pages/auth/GoogleComplete';

// ── Admin Pages — all lazy ────────────────────────────────────────────────────
const AdminDashboard         = lazy(() => import('./pages/admin/Dashboard'));
const StaffDashboard         = lazy(() => import('./pages/admin/StaffDashboard'));

// Manager gets AdminDashboard.jsx; every other job_function gets the
// role-specific StaffDashboard.jsx instead — same route, different home.
function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  return user.role === 'manager' ? <AdminDashboard/> : <StaffDashboard/>;
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
const AdminSuppliers         = lazy(() => import('./pages/admin/Suppliers'));
const AdminUserManagement    = lazy(() => import('./pages/admin/UserManagement'));
const AdminShowcaseQueue     = lazy(() => import('./pages/admin/ShowcaseModerationQueue'));
const AdminSettings          = lazy(() => import('./pages/admin/Settings'));
const AdminActivityLog       = lazy(() => import('./pages/admin/ActivityLog'));
const AdminFeedback          = lazy(() => import('./pages/admin/Feedback')); // NEW Aug 27 2026
const AdminInvoice           = lazy(() => import('./pages/admin/Invoice'));
const AdminOrderDetail       = lazy(() => import('./pages/admin/OrderDetail'));
const AdminProductionTracking= lazy(() => import('./pages/admin/ProductionTracking')); // TASK R: was missing
const AdminProductionList    = lazy(() => import('./pages/admin/ProductionList'));      // BUG-FIX: list before detail
const AdminPhysicalCount     = lazy(() => import('./pages/admin/PhysicalCount'));
const AdminDailyOutputLog    = lazy(() => import('./pages/admin/DailyOutputLog'));
const AdminQCChecklist       = lazy(() => import('./pages/admin/QCChecklist'));
const AdminProductionIncidents = lazy(() => import('./pages/admin/ProductionIncidents')); // NEW Aug 25 2026

// ── Customer Pages — all lazy ─────────────────────────────────────────────────
const CustomerDashboard   = lazy(() => import('./pages/client/Dashboard'));
const CustomerOrders      = lazy(() => import('./pages/client/Orders'));
const CustomerMyDesigns   = lazy(() => import('./pages/client/MyDesigns'));
const CustomerOrderDetail = lazy(() => import('./pages/client/OrderDetail'));
const CustomerOrderWizard = lazy(() => import('./pages/client/OrderWizard'));
const CustomerAIMaterials = lazy(() => import('./pages/client/AIMaterials'));
const CustomerMessages    = lazy(() => import('./pages/client/Messages'));
const CustomerBilling     = lazy(() => import('./pages/client/BillingProfiles'));
const CustomerSettings    = lazy(() => import('./pages/client/AccountSettings'));
const CustomerHelp        = lazy(() => import('./pages/client/settings/HelpSupport'));
const CustomerProfile     = lazy(() => import('./pages/client/Profile'));

// ── Design Studio — separately lazy (Fabric.js + Three.js are heavy) ─────────
const DesignStudio = lazy(() => import('./pages/client/DesignStudio'));

// ── Auth extras — lazy ────────────────────────────────────────────────────────
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'));

// ── Public info pages — lazy, no auth required ────────────────────────────────
const GuidePage = lazy(() => import('./pages/Guide'));
const FAQPage    = lazy(() => import('./pages/FAQ'));
const TeamPage   = lazy(() => import('./pages/Team'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPolicy')); // NEW Aug 28 2026
const TermsPage    = lazy(() => import('./pages/TermsOfService')); // NEW Aug 28 2026

// ── Page loader — shown during lazy bundle download ───────────────────────────
function Loader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:36, height:36,
          border:'3px solid #028090', borderTopColor:'transparent',
          borderRadius:'50%', animation:'spin .7s linear infinite',
          margin:'0 auto 12px',
        }}/>
        <p style={{ color:'#64748b', fontSize:13, fontWeight:600, fontFamily:FONT }}>
          Loading…
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Auth guards ───────────────────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  const tok  = localStorage.getItem('vfrb_token');
  if (!tok) {
    return <Navigate to={role === 'customer' ? '/login' : '/admin/login'} replace/>;
  }
  if (role === 'admin' && !['manager','staff'].includes(user.role)) {
    return <Navigate to="/admin/login" replace/>;
  }
  if (role === 'customer' && user.role !== 'customer') {
    return <Navigate to="/login" replace/>;
  }
  return children;
}

function RequireManager({ children }) {
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  if (user.role !== 'manager') return <Navigate to="/admin/dashboard" replace/>;
  return children;
}

// ── Root route handlers ───────────────────────────────────────────────────────
function CustomerRootRoute() {
  const tok  = localStorage.getItem('vfrb_token');
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  if (tok && user.role === 'customer')                       return <Navigate to="/dashboard"        replace/>;
  if (tok && ['manager','staff'].includes(user.role))        return <Navigate to="/admin/dashboard"   replace/>;
  return <Landing/>;
}

function AdminRootRoute() {
  const tok  = localStorage.getItem('vfrb_token');
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  if (tok && ['manager','staff'].includes(user.role))        return <Navigate to="/admin/dashboard" replace/>;
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
export default function App() {
  return (
    <BrowserRouter>
      <ScrollTop/>
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
          <Route path="/login"           element={<CustomerLogin/>}/>
          <Route path="/register"        element={<CustomerRegister/>}/>
          <Route path="/forgot-password" element={<ForgotPassword/>}/>
          <Route path="/reset-password"  element={<ResetPassword/>}/>
          <Route path="/verify-email"    element={<VerifyEmail/>}/>
          <Route path="/auth/google/complete" element={<GoogleComplete/>}/>

          {/* ── ADMIN AUTH — one shared login, role decides the redirect ───── */}
          <Route path="/admin/login" element={<Navigate to="/login" replace/>}/>

          {/* ── PUBLIC INFO PAGES — no auth required ─────────────────────── */}
          <Route path="/guide"    element={<GuidePage/>}/>
          <Route path="/faq"      element={<FAQPage/>}/>
          <Route path="/our-team" element={<TeamPage/>}/>
          <Route path="/privacy"  element={<PrivacyPage/>}/>
          <Route path="/terms"    element={<TermsPage/>}/>

          {/* ── ADMIN PORTAL ──────────────────────────────────────────────── */}
          <Route path="/admin/*" element={
            <RequireAuth role="admin"><AdminLayout/></RequireAuth>
          }>
            <Route path="dashboard"   element={<DashboardHome/>}/>

            {/* Staff + Manager */}
            <Route path="orders"      element={<AdminOrders/>}/>
            <Route path="orders/:id"  element={<AdminOrderDetail/>}/>
            <Route path="production/:orderId" element={<AdminProductionTracking/>}/>
            <Route path="production"          element={<AdminProductionList/>}/>
            <Route path="inventory"   element={<AdminInventory/>}/>
            <Route path="messages"    element={<AdminMessages/>}/>
            <Route path="procurement" element={<AdminPurchaseOrders/>}/>
            <Route path="delivery"    element={<AdminDeliveryTracking/>}/>
            <Route path="materials"   element={<AdminMaterials/>}/>
            {/* material-rates route removed Aug 28 2026 — see App.jsx lazy-import comment */}
            <Route path="transactions"element={<AdminSalesTransactions/>}/>

            {/* Month 2 operational */}
            <Route path="physical-count" element={<AdminPhysicalCount/>}/>
            <Route path="output-log"     element={<AdminDailyOutputLog/>}/>
            <Route path="qc"             element={<AdminQCChecklist/>}/>
            {/* NEW Aug 25 2026 — machine breakdown / cutting damage reporting,
                interview-grounded. Staff+Manager tier, same as QC/Physical
                Count — NOT wrapped in RequireManager. */}
            <Route path="production-incidents" element={<AdminProductionIncidents/>}/>

            {/* Settings: staff view-only, manager can edit — gated INSIDE
                the component (see Settings.jsx), NOT wrapped in
                RequireManager, since staff must still be able to reach
                this page. (Fixed Aug 21 2026 — was incorrectly wrapped.) */}
            <Route path="settings"  element={<AdminSettings/>}/>

            {/* Manager Only */}
            <Route path="reports"   element={<RequireManager><AdminReports/></RequireManager>}/>
            <Route path="feedback"  element={<RequireManager><AdminFeedback/></RequireManager>}/>
            <Route path="activity-log" element={<RequireManager><AdminActivityLog/></RequireManager>}/>
            <Route path="invoice"   element={<RequireManager><AdminInvoice/></RequireManager>}/>
            <Route path="suppliers" element={<RequireManager><AdminSuppliers/></RequireManager>}/>
            <Route path="users"     element={<RequireManager><AdminUserManagement/></RequireManager>}/>
            <Route path="designs/showcase-queue" element={<RequireManager><AdminShowcaseQueue/></RequireManager>}/>
          </Route>

          {/* ── CUSTOMER PORTAL — root-level paths, no /client or /customer prefix ── */}
          <Route element={
            <RequireAuth role="customer"><CustomerLayout/></RequireAuth>
          }>
            <Route path="dashboard"   element={<CustomerDashboard/>}/>
            <Route path="my-designs"  element={<CustomerMyDesigns/>}/>
            <Route path="orders"      element={<CustomerOrders/>}/>
            <Route path="orders/:id"  element={<CustomerOrderDetail/>}/>
            <Route path="order/create"element={<CustomerOrderWizard/>}/>
            <Route path="ai-materials"element={<CustomerAIMaterials/>}/>
            <Route path="messages"    element={<CustomerMessages/>}/>
            <Route path="billing"     element={<CustomerBilling/>}/>
            <Route path="settings"    element={<CustomerSettings/>}/>
            <Route path="help"        element={<CustomerHelp/>}/>
            <Route path="profile"     element={<CustomerProfile/>}/>
          </Route>

          {/* ── DESIGN STUDIO — full-screen, outside CustomerLayout ───────── */}
          <Route path="/design-studio" element={
            <RequireAuth role="customer">
              <Suspense fallback={<Loader/>}><DesignStudio/></Suspense>
            </RequireAuth>
          }/>

          {/* ── 404 ───────────────────────────────────────────────────────── */}
          <Route path="*" element={
            <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', gap:14,
              background:'#f8fafc', fontFamily:FONT }}>
              <p style={{ fontSize:60, margin:0, opacity:.2 }}>🔍</p>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, fontFamily:FONT }}>
                Page Not Found
              </h1>
              <p style={{ color:'#64748b', fontSize:14, fontFamily:FONT }}>
                The page you're looking for doesn't exist.
              </p>
              <a href="/" style={{ padding:'10px 22px', borderRadius:10,
                background:'#028090', color:'#fff', textDecoration:'none',
                fontSize:13, fontWeight:700, fontFamily:FONT }}>
                Go Home →
              </a>
            </div>
          }/>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}