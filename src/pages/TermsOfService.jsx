// src/pages/TermsOfService.jsx — Terms of Service, grounded in the Ma'am Fe interview + locked system rules.
import LegalPage from '../components/site/LegalPage';

const SECTIONS = [
  {
    title: '1. Bulk orders only',
    body: `VFRB Enterprise accepts bulk garment orders only. The minimum
    order quantity is 100 pieces per order. Individual or single-piece
    orders are not accepted.`,
  },
  {
    title: '2. Order specifications and production',
    body: `Once you submit an order, VFRB will produce your garment to
    the exact specifications you provided (garment type, size breakdown,
    color, collar/sleeve/pocket style, and design). Because production
    is made to your specific order, orders cannot be returned once
    accepted into production — you will be responsible for payment in
    full for the order as specified.`,
  },
  {
    title: '3. Quality control',
    body: `Every order goes through VFRB's internal quality control
    process before delivery, to confirm the finished garment meets the
    specifications you provided.`,
  },
  {
    title: '4. Delivery timelines',
    body: `VFRB will coordinate your delivery date with you directly.
    In the rare case of a delay, VFRB's typical maximum delay is two
    days, and any delay will be communicated to you in advance. If a
    delay is not acceptable to you, VFRB may arrange overtime production
    to meet the original delivery date where possible. Delivery delays
    do not entitle you to a discount on the order total.`,
  },
  {
    title: '5. Payment terms',
    body: `Payment terms depend on your order type and will be confirmed
    with you by VFRB staff at the time of order confirmation. Payment is
    required in full for the agreed order total.`,
  },
  {
    title: '6. AI material recommendations',
    body: `The material-type recommendations shown for your order are
    generated to assist VFRB's production planning and are provided as
    a general guide to material categories — not a quotation, price
    estimate, or guarantee of final material selection. Final material
    sourcing decisions are made by VFRB's production team.`,
  },
  {
    title: '7. Account responsibilities',
    body: `You are responsible for providing accurate order
    specifications and contact information, and for keeping your account
    password confidential. VFRB staff accounts are created only by an
    Administrator (Manager) — there is no public registration path for
    staff accounts.`,
  },
  {
    title: '8. Changes to these terms',
    body: `If these terms change, the updated version will be posted on
    this page with a revised date below.`,
  },
];

export default function TermsOfService() {
  return <LegalPage title="Terms of Service" updated="October 21, 2026" sections={SECTIONS} />;
}
