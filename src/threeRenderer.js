import * as THREE from "three";
import { GLASSES_3D } from "./glasses3d.js";

let renderer, scene, camera, currentGlasses;
let ambientLight, directionalLight;

export function initThreeRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  // Orthographic camera - we'll match it to canvas dimensions
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 5;

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(0, 2, 5);
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-3, 0, 3);
  scene.add(fillLight);
}

export function setGlassesModel(glassesId) {
  if (currentGlasses) {
    scene.remove(currentGlasses);
    currentGlasses = null;
  }

  const factory = GLASSES_3D[glassesId];
  if (!factory) return;

  currentGlasses = factory();
  scene.add(currentGlasses);
}

// Key landmark indices
const LEFT_EYE_OUTER = 263;
const RIGHT_EYE_OUTER = 33;
const NOSE_BRIDGE = 6;

export function renderGlasses3D(landmarks, canvasWidth, canvasHeight, options = {}) {
  if (!renderer || !currentGlasses || !landmarks || landmarks.length === 0) {
    // Clear if no face
    if (renderer) {
      renderer.setSize(canvasWidth, canvasHeight);
      renderer.clear();
    }
    return;
  }

  const face = landmarks[0];
  const { scaleFactor = 1.0, verticalOffset = 0 } = options;

  renderer.setSize(canvasWidth, canvasHeight);

  // Update camera to match canvas aspect
  const aspect = canvasWidth / canvasHeight;
  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();

  // Convert landmark positions from normalized (0-1) to camera space (-aspect to +aspect, -1 to +1)
  const leftEye = face[LEFT_EYE_OUTER];
  const rightEye = face[RIGHT_EYE_OUTER];
  const noseBridge = face[NOSE_BRIDGE];

  // Convert to camera coordinates (flip Y because canvas Y is inverted)
  const leftX = (leftEye.x * 2 - 1) * aspect;
  const leftY = -(leftEye.y * 2 - 1);
  const rightX = (rightEye.x * 2 - 1) * aspect;
  const rightY = -(rightEye.y * 2 - 1);
  const noseX = (noseBridge.x * 2 - 1) * aspect;
  const noseY = -(noseBridge.y * 2 - 1);

  // Center between eyes
  const centerX = (leftX + rightX) / 2;
  const centerY = noseY + (verticalOffset / canvasHeight) * 2;

  // Eye distance determines scale
  const eyeDist = Math.sqrt((leftX - rightX) ** 2 + (leftY - rightY) ** 2);
  const glassesScale = eyeDist * 1.1 * scaleFactor;

  // Rotation from eye positions
  const angle = Math.atan2(leftY - rightY, leftX - rightX);

  // 3D depth tilt from landmark z values
  const zDiff = (leftEye.z - rightEye.z) * 5;
  const faceTiltY = Math.asin(Math.max(-0.5, Math.min(0.5, (noseBridge.z - (leftEye.z + rightEye.z) / 2) * 3)));

  // Position and orient the glasses
  currentGlasses.position.set(centerX, centerY, 0);
  currentGlasses.scale.set(glassesScale, glassesScale, glassesScale);
  currentGlasses.rotation.set(faceTiltY, zDiff, angle);

  renderer.render(scene, camera);
}
