// src/pages/landing/tokens.js — color tokens + static content arrays shared across Landing's split sections.
export const T = {
  teal:   '#028090',
  accent: '#02C39A',
  bg:     '#F8FAFC',
  ink:    '#1A2332',
  ink2:   '#4A5568',
  ink3:   '#64748b',
  border: '#E2E8F0',
};

export const NAV = [
  { label:'About',    id:'about' },
  { label:'Features', id:'features' },
  { label:'How It Works', id:'how' },
  { label:'Designs', id:'categories' },
];

// 5 real garments only — 'sub' is null where no verified sector fact exists.
export const CATS = [
  { icon:'🩺', label:'Scrubs', sub:'Hospitals & clinics',       color:'#028090' },
  { icon:'👔', label:'Polo',   sub:'Corporate & institutional', color:'#6366f1' },
  { icon:'👖', label:'Pants',  sub:'Corporate & institutional', color:'#64748b' },
  { icon:'👗', label:'Skirt',  sub:'Corporate & institutional', color:'#3b82f6' },
  { icon:'🩳', label:'Shorts', sub:null,                        color:'#f97316' },
];

export const FEATS = [
  { icon:'🎨', title:'Visual Design Studio',    desc:'Configure collar, sleeve, color, pockets, and logo — front and back view — before submitting.', hl:false },
  { icon:'🤖', title:'AI Material Recommendation', desc:'Gemini AI recommends raw material categories for your order. VFRB production staff confirm exact quantities.', hl:true },
  { icon:'📧', title:'Direct Order Flow',       desc:"Your design and specifications go directly to VFRB's production team. No cart needed.", hl:false },
  { icon:'📏', title:'Standard & Custom Sizing',desc:'PH BPS XS–3XL standard sizes, or submit custom measurements for VFRB staff to review.', hl:false },
  { icon:'📄', title:'Design Summary Receipt',  desc:'Full design brief with AI material recommendations — sent to VFRB staff for review.', hl:false },
  { icon:'🔒', title:'RA 10173 Compliant',      desc:'Philippine Data Privacy Act. No payment info collected. Your data is used only for your order.', hl:false },
];

export const STEPS = [
  { n:'01', title:'Choose Your Garment', desc:'Select from Polo, Scrubs, Shorts, Pants, or Skirt to start your custom order.' },
  { n:'02', title:'Configure Details',  desc:'Set collar, sleeve, color, pockets, and logo for your custom garment order.' },
  { n:'03', title:'AI Recommends Materials', desc:'Gemini AI reviews your specifications and recommends the types of raw materials needed for your order.' },
  { n:'04', title:'Submit to VFRB',     desc:'Review your design brief and AI recommendation, submit. VFRB Enterprise responds within 24 hours.' },
];
