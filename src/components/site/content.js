// Single source of truth for every public-site fact and repeated list. Pages import from here; never restate these inline.
import { P } from '../../pages/landing/photos';

export const SERVE = ['Local offices', 'Corporate clients', 'Schools', 'Institutional organizations'];
export const SERVE_LINE = 'Local offices, corporate clients, schools and institutional organizations';

export const SERVICES = ['Custom tailoring', 'Garment manufacturing', 'Computerized embroidery', 'Silk screen printing', 'Full sublimation'];
export const PRODUCTS = ['Company uniforms', 'Polo shirts', 'Campaign shirts', 'Caps', 'Jackets', 'Patches'];

export const PLACES = [
  ['Bayanan, Muntinlupa City', 'Company address'],
  ['Sto. Tomas, Batangas', 'Second location'],
];

export const PEOPLE = [
  { photo: P.fe, name: 'Fe Tiama Boitizon', role: 'Owner', line: 'VFRB Enterprise, sole proprietorship' },
  { photo: P.roxanne, name: 'Roxanne Boitizon Baddiri', role: 'Daughter of Ma\u2019am Fe', line: 'VFRB Enterprise family' },
];

export const EMBROIDERY = {
  steps: [
    ['Digitizing', 'Your logo or artwork is converted into a stitch file the embroidery machine can read.'],
    ['Hooping', 'The fabric is secured in a hoop so it holds flat and steady while it is stitched.'],
    ['Stitching', 'The computerized machine stitches the digitized design onto the garment or patch.'],
  ],
  uses: [
    ['Corporate branding', 'Your company logo on uniforms.'],
    ['Apparel and fashion', 'Embroidered detail on garments.'],
    ['Personalization', 'Names and marks on individual pieces.'],
  ],
};

// Stage names match the public FAQ and Client Guide exactly. Grouped into three phases so every row can carry a real photo.
export const PHASES = [
  { id: 'prepare', title: 'Prepare', photos: [[P.sewing1, 'center', 'Team preparing garments at a work table']],
    stages: [['Pattern', 'Every order starts from a pattern made for each size.'],
             ['Segregation', 'Pieces are sorted by size before they move on.'],
             ['Cutting', 'Fabric is cut in layers on the cutting tables.']] },
  { id: 'sew', title: 'Sew', photos: [[P.sewing4, 'center', 'The sewing line']],
    stages: [['Sewing', 'Garments are sewn operation by operation along the line, each worker on one step.']] },
  { id: 'finish', title: 'Check and finish', photos: [[P.packed, 'center', 'Uniforms packed and labeled for delivery']],
    stages: [['QC', 'Finished pieces are checked against the measurements for their size. Pieces that fail go back for alteration.'],
             ['Pressing', 'The finishing team presses the garments.'],
             ['Packing', 'Pieces are counted per size and color, then packed and labeled by division for delivery.']] },
];

// Mirrors the Client Guide (pages/Guide.jsx). Update both together.
export const ORDER_STEPS = [
  ['Create your design', 'Create and save your design in the Design Studio, then continue to the Order Wizard.'],
  ['Review the materials', 'The system recommends the categories of raw materials your order needs. Accept it to notify VFRB staff.'],
  ['Follow production', 'Your order moves through the 7 production stages, updated by VFRB staff.'],
  ['Message the team', 'Use Messages in your portal to reach VFRB staff about a specific order.'],
];

// The public journey, in reading order. Drives the "next page" band and the progress rail.
export const JOURNEY = [
  { to: '/', label: 'Home', title: 'VFRB Enterprise', blurb: 'Company uniforms, made by one family since 2000.', photo: P.sewing4, pos: '18% center' },
  { to: '/about', label: 'About', title: 'About VFRB', blurb: 'Who we are, who we serve and how to reach us.', photo: P.familyCourt, pos: 'center 40%' },
  { to: '/what-we-do', label: 'What We Do', title: 'What we do', blurb: 'Tailoring, computerized embroidery and printing.', photo: P.uniforms, pos: '30% center' },
  { to: '/inside-vfrb', label: 'Inside VFRB', title: 'Inside VFRB', blurb: 'The production floor, stage by stage.', photo: P.sewing4, pos: 'center' },
  { to: '/gallery', label: 'Gallery', title: 'The gallery', blurb: 'Finished pieces and the floor behind them.', photo: P.tees, pos: 'center' },
  { to: '/our-team', label: 'VFRB Family', title: 'The VFRB Family', blurb: 'The family and team behind the company.', photo: P.familyDinner, pos: 'center 40%' },
  { to: '/group-60', label: 'Group 60', title: 'Group 60', blurb: 'The researchers who built this system.', photo: null },
];
