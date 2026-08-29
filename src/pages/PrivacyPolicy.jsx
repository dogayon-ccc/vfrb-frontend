// src/pages/PrivacyPolicy.jsx
// VFRB Enterprise — Privacy Policy
//
// Grounded ONLY in what this system actually collects and does — checked
// against the real users table schema (vfrb_db.sql) and controllers
// before writing a single claim here. No invented third-party sharing,
// no invented analytics/tracking, no invented cookie categories — if a
// future feature adds any of those, this page must be updated alongside
// it, same discipline as Guide.jsx.

import { motion } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';

const T = { teal: '#028090', accent: '#02C39A', dark: '#06101a' };

const SECTIONS = [
  {
    title: '1. What information we collect',
    body: `When you create an account, we collect your name, email address,
    and password (stored as a one-way hash — VFRB never sees or stores your
    actual password). Depending on your account type, you may also provide
    a contact number, organization name, address, and client type
    (individual, corporate, school, or medical).

    When you place an order, we collect the garment specifications you
    submit — garment type, collar/sleeve/pocket style, color, quantity,
    size breakdown, delivery preferences, and any design notes or
    reference image/PDF you upload. If you use the Design Studio, your
    design configuration and a preview image of your design are saved
    with your order.

    If you sign in with Google, we receive your name, email, and Google
    account ID from Google — nothing else from your Google account.`,
  },
  {
    title: '2. How we use your information',
    body: `Your information is used only to operate VFRB Enterprise's
    order and production system: to create and manage your account, to
    process and track your orders through production, to communicate
    with you about your orders, and to generate the AI raw-material
    recommendation for your submitted design. We do not sell, rent, or
    share your personal information with third parties for marketing
    purposes.`,
  },
  {
    title: '3. AI processing',
    body: `Your garment specifications (type, quantity, color, and
    style details — never your name, contact information, or payment
    details) are sent to Google's Gemini AI service to generate a
    raw-material type recommendation for your order. This recommendation
    is limited to material categories and a plain-language explanation —
    it never includes pricing, personal information, or account details.`,
  },
  {
    title: '4. Data storage and security',
    body: `Your data is stored in a secured MySQL database. Passwords
    are hashed using industry-standard one-way hashing (bcrypt) — never
    stored in plain text or reversible form. Account access is protected
    by token-based authentication, and administrative accounts (staff and
    manager) can only be created by an existing VFRB manager — there is
    no public staff registration.`,
  },
  {
    title: '5. Your rights',
    body: `You may review and update your profile information at any
    time from your account's Profile page. To request deletion of your
    account or personal data, contact VFRB Enterprise directly using the
    contact details on our homepage.`,
  },
  {
    title: '6. Changes to this policy',
    body: `If this policy changes, the updated version will be posted on
    this page with a revised date below.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: '#fff', minHeight: '100vh' }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;} body{margin:0;background:${T.dark};}`}</style>

      <MarketingNav/>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px 40px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Legal
          </p>
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(28px,4vw,42px)', margin: '0 0 8px' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 40px' }}>
            Last updated: August 28, 2026
          </p>

          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {s.body}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      <Footer/>
    </div>
  );
}
