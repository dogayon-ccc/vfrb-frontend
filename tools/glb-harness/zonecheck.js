import { zonesFor, FIT_GARMENTS } from '../../src/pages/client/design-studio/dsShared.ts';
import { get3DCapabilities } from '../../src/pages/client/design-studio/garmentCapabilities.ts';
window.__result = {
  FIT_GARMENTS,
  poloZones: zonesFor('Polo Shirt', 'Short'),
  schoolPoloZones: zonesFor('School Polo', 'Short'),
  tshirtZones: zonesFor('T-Shirt', 'Short'),
  labCoverallZones: zonesFor('Lab Coverall', 'Long'),
  poloCap: get3DCapabilities('Polo Shirt', 'female'),
  tshirtCap: get3DCapabilities('T-Shirt', 'female'),
};
window.__ready = true;
