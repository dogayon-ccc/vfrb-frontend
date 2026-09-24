// Dev-only: renders a raw GLB (no app code) from N yaw angles so garment type and region layout can be judged by eye.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const W = 360, H = 520;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader();

window.__view = async (url, yaws = [0, 90, 180], tint = '#c8d0da') => {
  const gltf = await loader.loadAsync(url);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eef4');
  scene.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 1.1));
  const d = new THREE.DirectionalLight('#ffffff', 1.6); d.position.set(1, 2, 3); scene.add(d);
  const info = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    o.material = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, side: THREE.DoubleSide });
    info.push(o.name);
  });
  scene.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
  const dist = Math.max(s.y * 1.15, s.x * 1.6) / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
  renderer.setSize(W * yaws.length, H); renderer.setScissorTest(true);
  yaws.forEach((y, i) => {
    const a = THREE.MathUtils.degToRad(y);
    cam.position.set(c.x + Math.sin(a) * dist, c.y, c.z + Math.cos(a) * dist); cam.lookAt(c);
    renderer.setViewport(i * W, 0, W, H); renderer.setScissor(i * W, 0, W, H); renderer.render(scene, cam);
  });
  return { info, size: s.toArray().map(v => +v.toFixed(3)) };
};
window.__ready = true;
