import printing from '../../assets/brand/printing.jpg';
import embroidery from '../../assets/brand/embroidery.jpg';
import workers from '../../assets/brand/workers.jpg';
import sewing1 from '../../assets/brand/sewing-1.jpg';
import sewing2 from '../../assets/brand/sewing-2.jpg';
import sewing3 from '../../assets/brand/sewing-3.jpg';
import sewing4 from '../../assets/brand/sewing-4.jpg';
import tees from '../../assets/brand/tees.jpg';
import packed from '../../assets/brand/packed.jpg';
import ecobag from '../../assets/brand/ecobag.jpg';
import uniforms from '../../assets/brand/uniforms.jpg';
import printAuthority from '../../assets/brand/print-authority.jpg';
import familyCourt from '../../assets/brand/family-court.jpg';
import familyDinner from '../../assets/brand/family-dinner.jpg';
import fe from '../../assets/brand/fe.jpg';
import roxanne from '../../assets/brand/roxanne.jpg';
import sublimationPolo from '../../assets/brand/sublimation-polo.jpg';
import sublimationTee from '../../assets/brand/sublimation-tee.jpg';

export const P = {
  printing:       { src: printing,       w: 1400, h: 933, alt: 'Silk screen printing on yellow shirts at VFRB Manila' },
  embroidery:     { src: embroidery,     w: 1400, h: 856, alt: 'Rows of computerized embroidery machines' },
  workers:        { src: workers,        w: 1400, h: 788, alt: 'The VFRB production team seated together' },
  sewing1:        { src: sewing1,        w: 960, h: 640, alt: 'Team preparing garments at a work table' },
  sewing2:        { src: sewing2,        w: 960, h: 640, alt: 'Sewing team working by the window' },
  sewing3:        { src: sewing3,        w: 960, h: 640, alt: 'Sewing machine stations by the window' },
  sewing4:        { src: sewing4,        w: 960, h: 640, alt: 'Sewing line at VFRB Enterprise' },
  tees:           { src: tees,           w: 720, h: 960, alt: 'Stacks of white printed shirts' },
  packed:         { src: packed,         w: 720, h: 960, alt: 'Uniforms packed and labeled by division for delivery' },
  ecobag:         { src: ecobag,         w: 720, h: 960, alt: 'VFRB Enterprise branded reusable bags' },
  uniforms:       { src: uniforms,       w: 1600, h: 720, alt: 'Shirt and blazer with embroidered emblem patches' },
  printAuthority: { src: printAuthority, w: 592, h: 707, alt: 'Print Authority by VFRB Enterprise services flyer' },
  familyCourt:    { src: familyCourt,    w: 1440, h: 806, alt: 'The VFRB family and team gathered on a basketball court' },
  familyDinner:   { src: familyDinner,   w: 1400, h: 1050, alt: 'The VFRB family and team at a group dinner' },
  fe:             { src: fe,             w: 720, h: 723, alt: 'Fe Tiama Boitizon' },
  roxanne:        { src: roxanne,        w: 720, h: 720, alt: 'Roxanne Boitizon Baddiri' },
  sublimationPolo:{ src: sublimationPolo,w: 1200, h: 926, alt: 'Full sublimation polo shirt, front and back' },
  sublimationTee: { src: sublimationTee, w: 1000, h: 1360, alt: 'Sublimated sports shirt with emblems' },
};

export const GALLERY_CATS = [
  { id: 'all', label: 'All' },
  { id: 'embroidery', label: 'Embroidery' },
  { id: 'printing', label: 'Printing and sublimation' },
  { id: 'floor', label: 'Production floor' },
  { id: 'packed', label: 'Packed and branded' },
];

export const GALLERY = [
  { photo: P.embroidery, cat: 'embroidery', caption: 'Computerized embroidery machines', pos: 'center' },
  { photo: P.uniforms, cat: 'embroidery', caption: 'Embroidered emblem patches on a shirt and blazer', pos: '30% center' },
  { photo: P.printing, cat: 'printing', caption: 'Silk screen printing on yellow shirts', pos: '35% center' },
  { photo: P.sublimationPolo, cat: 'printing', caption: 'Full sublimation polo, front and back', pos: 'center' },
  { photo: P.tees, cat: 'printing', caption: 'Stacks of white printed shirts', pos: 'center' },
  { photo: P.sublimationTee, cat: 'printing', caption: 'Sublimated sports shirt with emblems', pos: 'center' },
  { photo: P.printAuthority, cat: 'printing', caption: 'Print Authority by VFRB Enterprise services flyer', pos: 'center' },
  { photo: P.sewing4, cat: 'floor', caption: 'The sewing line', pos: 'center' },
  { photo: P.sewing3, cat: 'floor', caption: 'Sewing machine stations by the window', pos: 'center' },
  { photo: P.sewing2, cat: 'floor', caption: 'Sewing team working by the window', pos: 'center' },
  { photo: P.sewing1, cat: 'floor', caption: 'Team preparing garments at a work table', pos: 'center' },
  { photo: P.workers, cat: 'floor', caption: 'The VFRB production team', pos: 'center 30%' },
  { photo: P.packed, cat: 'packed', caption: 'Uniforms packed and labeled by division for delivery', pos: 'center' },
  { photo: P.ecobag, cat: 'packed', caption: 'VFRB Enterprise branded reusable bags', pos: 'center' },
];
