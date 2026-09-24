// src/pages/client/design-studio/garmentMaterials.js
// Shared by DesignStudio3D.jsx (primitive meshes) and ScannedGarmentMesh.jsx
// (scanned meshes) — pulled out so neither file has to import the other.
import * as THREE from 'three';

export function mat(color, roughness = 0.72, metalness = 0.03, texture = null) {
  return new THREE.MeshStandardMaterial({
    color: texture ? '#ffffff' : color,
    map: texture ?? null,
    roughness, metalness,
  });
}
