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
    title: '4. The face check in the Design Studio',
    body: `Before you create a 2D garment from a photo, or add a logo,
    the Studio checks the photo for a face. This check runs only in your
    browser. The photo is not uploaded for the check, and the result is
    not stored. It only decides whether that step can continue.`,
  },
  {
    title: '5. Who can see your information',
    body: `VFRB staff see only what they need for their role: the
    manager handles accounts, orders and billing, and station staff see
    the production details for their stage. We use service providers to
    run the system: Supabase (database), Vercel (hosting), Google (Gemini
    for the material recommendation, and Google sign-in if you use it)
    and an email service for account emails. They process data only to
    provide that service to VFRB.

    We do not sell your personal information.`,
  },
  {
    title: '6. Data storage and security',
    body: `Your data is stored in a secured PostgreSQL database hosted on
    Supabase. Passwords are hashed using industry-standard one-way
    hashing (bcrypt), never stored in plain text or reversible form.
    Account access is protected by token-based authentication. Customer
    and staff accounts are created only by VFRB; there is no public
    registration, and staff accounts can only be created by an
    Administrator (Manager).

    Your browser keeps your sign-in token and a few display preferences
    in local storage. Signing out removes the sign-in token.`,
  },
  {
    title: '7. Cookies and browser storage',
    body: `VFRB does not use advertising or tracking cookies, and this site
    has no analytics service. To work, your browser keeps a few items in
    local storage on your own device: your sign-in token and basic
    account details (removed when you sign out), Design Studio
    preferences such as the grid, guides, panel layout, shortcut keys and
    whether you have seen the tour, the admin sidebar layout, and a short
    queue of actions saved while you are offline.

    If you choose "Continue with Google", Google may set its own cookies
    on its own sites under Google's privacy policy. You can remove
    everything VFRB keeps in your browser by signing out and clearing
    this site's data in your browser settings. The Studio still works
    if your browser blocks storage; your preferences are just not
    remembered.`,
  },
  {
    title: '8. How long we keep it',
    body: `We keep account and order records for as long as your account
    is active and for as long as the law requires us to keep business
    and tax records. After that, records are deleted or made anonymous.`,
  },
  {
    title: '9. Your rights under the Data Privacy Act of 2012',
    body: `The Philippine Data Privacy Act of 2012 (Republic Act No.
    10173) gives you these rights over your personal data: to be
    informed, to access it, to object to its processing, to have it
    corrected, to have it erased or blocked, to data portability, and to
    claim damages. You can also file a complaint with the National
    Privacy Commission.

    You can review and update your profile at any time from your
    account settings. For any other request, including deleting your
    account, contact VFRB Enterprise using the details on our About page.
    We will answer within a reasonable time.

    If a personal data breach happens that is likely to harm you, VFRB
    will notify you and the National Privacy Commission as the law
    requires.`,
  },
  {
    title: '10. Changes to this policy',
    body: `If this policy changes, the updated version will be posted on
    this page with a new date at the top.`,
  },
];

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" updated="November 9, 2026" sections={SECTIONS} draft />;
}
