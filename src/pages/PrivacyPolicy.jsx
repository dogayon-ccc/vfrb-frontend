// src/pages/PrivacyPolicy.jsx — VFRB Enterprise Privacy Policy, grounded in the real schema/controllers.
import LegalPage from '../components/site/LegalPage';

const SECTIONS = [
  {
    title: '1. What information we collect',
    body: `When VFRB creates your customer account, we store your name,
    email address, and password (stored as a one-way hash — VFRB never sees or stores your
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
    account ID from Google — nothing else from your Google account.

    Messages you send VFRB staff through the portal, and the invoices and
    payment records for your orders, are also stored with your account.`,
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
    body: `Your data is stored in a secured PostgreSQL database hosted on
    Supabase. Passwords
    are hashed using industry-standard one-way hashing (bcrypt) — never
    stored in plain text or reversible form. Account access is protected
    by token-based authentication. Customer and staff accounts are
    created only by VFRB — there is no public registration, and staff
    accounts can only be created by an Administrator (Manager).`,
  },
  {
    title: '5. Your rights',
    body: `You may review and update your profile information at any
    time from your account's Profile page. To request deletion of your
    account or personal data, contact VFRB Enterprise directly using the
    contact details on our About page.`,
  },
  {
    title: '6. Changes to this policy',
    body: `If this policy changes, the updated version will be posted on
    this page with a revised date below.`,
  },
];

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" updated="October 21, 2026" sections={SECTIONS} />;
}
