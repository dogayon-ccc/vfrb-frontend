// src/App.jsx — VFRB Enterprise v10.4
// TASK FF-1 BUG FIX: production route now includes :orderId param.
//   Before: path="production"           → orderId always undefined in component
//   After:  path="production/:orderId"  → useParams() reads real order_id
//
// SETTINGS FIX (Aug 21 2026, Account 2): the "settings" route was wrapped
//   in <RequireManager>, which fully blocked staff from ever reaching the
//   page — contradicts the confirmed rule (manager edits, staff views).
//   Gating now happens INSIDE Settings.jsx itself (fields disabled, no
//   Save/logo buttons for staff), same pattern as PhysicalCount.jsx.
//   Route itself is open to any authenticated admin/staff user.
//
// All admin + customer pages lazy-loaded — only layouts and auth pages eager.
// DesignStudio + DesignStudio3D separately lazy-loaded (Three.js is 600KB+).

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import axios from 'axios';

// ── Axios Setup ───────────────────────────────────────────────────────────────
// LOCAL DEV:   No baseURL — all /api/* go through Vite proxy → localhost:8000
//              (CORS eliminated entirely in dev — no changes needed)
// PRODUCTION:  VITE_API_URL is set in .env.production before `npm run build`
//              Vite bakes the URL into the bundle at build time.
//              axios.defaults.baseURL = 'https://vfrb-api.railway.app'
//              All /api/* calls then go directly to the Railway backend.
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
import Landing      from './pages/Landing';
import AdminLanding from './pages/admin/Landing';

// ── Auth — eager (small, always needed for login flow) ───────────────────────
import CustomerLogin    from './pages/auth/Login';
import CustomerRegister from './pages/auth/Register';
import AdminLogin       from './pages/admin/Login';
import VerifyEmail      from './pages/auth/VerifyEmail';

// ── Admin Pages — all lazy ────────────────────────────────────────────────────
const AdminDashboard         = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders            = lazy(() => import('./pages/admin/Orders'));
const AdminInventory         = lazy(() => import('./pages/admin/Inventory'));
const AdminMaterials         = lazy(() => import('./pages/admin/Materials'));
const AdminMaterialRates     = lazy(() => import('./pages/admin/MaterialRates'));
const AdminPurchaseOrders    = lazy(() => import('./pages/admin/PurchaseOrders'));
const AdminReports           = lazy(() => import('./pages/admin/Reports'));
const AdminSalesTransactions = lazy(() => import('./pages/admin/SalesTransactions'));
const AdminMessages          = lazy(() => import('./pages/admin/Messages'));
const AdminDeliveryTracking  = lazy(() => import('./pages/admin/DeliveryTracking'));
const AdminSuppliers         = lazy(() => import('./pages/admin/Suppliers'));
const AdminUserManagement    = lazy(() => import('./pages/admin/UserManagement'));
const AdminSettings          = lazy(() => import('./pages/admin/Settings'));
const AdminActivityLog       = lazy(() => import('./pages/admin/ActivityLog'));
const AdminInvoice           = lazy(() => import('./pages/admin/Invoice'));
const AdminOrderDetail       = lazy(() => import('./pages/admin/OrderDetail'));
const AdminProductionTracking= lazy(() => import('./pages/admin/ProductionTracking')); // TASK R: was missing
const AdminProductionList    = lazy(() => import('./pages/admin/ProductionList'));      // BUG-FIX: list before detail
const AdminPhysicalCount     = lazy(() => import('./pages/admin/PhysicalCount'));
const AdminDailyOutputLog    = lazy(() => import('./pages/admin/DailyOutputLog'));
const AdminQCChecklist       = lazy(() => import('./pages/admin/QCChecklist'));

// ── Customer Pages — all lazy ─────────────────────────────────────────────────
const CustomerDashboard   = lazy(() => import('./pages/customer/Dashboard'));
const CustomerOrders      = lazy(() => import('./pages/customer/Orders'));
const CustomerOrderDetail = lazy(() => import('./pages/customer/OrderDetail'));
const CustomerOrderWizard = lazy(() => import('./pages/customer/OrderWizard'));
const CustomerAIMaterials = lazy(() => import('./pages/customer/AIMaterials'));
const CustomerMessages    = lazy(() => import('./pages/customer/Messages'));
const CustomerProfile     = lazy(() => import('./pages/customer/Profile'));

// ── Design Studio — separately lazy (Fabric.js + Three.js are heavy) ─────────
const DesignStudio = lazy(() => import('./pages/customer/DesignStudio'));

// ── Auth extras — lazy ────────────────────────────────────────────────────────
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'));

// ── Public info pages — lazy, no auth required ────────────────────────────────
const GuidePage = lazy(() => import('./pages/Guide'));
const FAQPage    = lazy(() => import('./pages/FAQ'));
const TeamPage   = lazy(() => import('./pages/Team'));

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
  if (tok && user.role === 'customer')                       return <Navigate to="/customer"          replace/>;
  if (tok && ['manager','staff'].includes(user.role))        return <Navigate to="/admin/dashboard"   replace/>;
  return <Landing/>;
}

function AdminRootRoute() {
  const tok  = localStorage.getItem('vfrb_token');
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  if (tok && ['manager','staff'].includes(user.role))        return <Navigate to="/admin/dashboard"   replace/>;
  return <AdminLanding/>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // no return — a block body with a bare statement always returns
    // undefined, regardless of what window.scrollTo() itself returns.
    // Persisted "destroy is not a function" crash across a fresh rebuild
    // (new bundle hash, same crash) pointed at something external
    // overriding window.scrollTo (commonly a browser extension) rather
    // than a real bug in this code — this makes the effect safe either way.
  }, [pathname]);
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ScrollTop/>
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

          {/* ── ADMIN AUTH ────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLogin/>}/>

          {/* ── PUBLIC INFO PAGES — no auth required ─────────────────────── */}
          <Route path="/guide"    element={<GuidePage/>}/>
          <Route path="/faq"      element={<FAQPage/>}/>
          <Route path="/our-team" element={<TeamPage/>}/>

          {/* ── ADMIN PORTAL ──────────────────────────────────────────────── */}
          <Route path="/admin/*" element={
            <RequireAuth role="admin"><AdminLayout/></RequireAuth>
          }>
            <Route path="dashboard"   element={<AdminDashboard/>}/>

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
            <Route path="material-rates" element={<AdminMaterialRates/>}/>
            <Route path="transactions"element={<AdminSalesTransactions/>}/>

            {/* Month 2 operational */}
            <Route path="physical-count" element={<AdminPhysicalCount/>}/>
            <Route path="output-log"     element={<AdminDailyOutputLog/>}/>
            <Route path="qc"             element={<AdminQCChecklist/>}/>

            {/* Settings: staff view-only, manager can edit — gated INSIDE
                the component (see Settings.jsx), NOT wrapped in
                RequireManager, since staff must still be able to reach
                this page. (Fixed Aug 21 2026 — was incorrectly wrapped.) */}
            <Route path="settings"  element={<AdminSettings/>}/>

            {/* Manager Only */}
            <Route path="reports"   element={<RequireManager><AdminReports/></RequireManager>}/>
            <Route path="activity-log" element={<RequireManager><AdminActivityLog/></RequireManager>}/>
            <Route path="invoice"   element={<RequireManager><AdminInvoice/></RequireManager>}/>
            <Route path="suppliers" element={<RequireManager><AdminSuppliers/></RequireManager>}/>
            <Route path="users"     element={<RequireManager><AdminUserManagement/></RequireManager>}/>
          </Route>

          {/* ── CUSTOMER PORTAL ───────────────────────────────────────────── */}
          <Route path="/customer" element={
            <RequireAuth role="customer"><CustomerLayout/></RequireAuth>
          }>
            <Route index              element={<CustomerDashboard/>}/>
            <Route path="orders"      element={<CustomerOrders/>}/>
            <Route path="orders/:id"  element={<CustomerOrderDetail/>}/>
            <Route path="order/create"element={<CustomerOrderWizard/>}/>
            <Route path="ai-materials"element={<CustomerAIMaterials/>}/>
            <Route path="messages"    element={<CustomerMessages/>}/>
            <Route path="profile"     element={<CustomerProfile/>}/>
          </Route>

          {/* ── DESIGN STUDIO — full-screen, outside CustomerLayout ───────── */}
          <Route path="/customer/design-studio" element={
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
