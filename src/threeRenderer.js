import * as THREE from "three";
import { GLASSES_3D } from "./glasses3d.js";

let renderer, scene, camera, currentGlasses;

export function initThreeRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  // Orthographic camera sized to normalized 0-1 space (matching MediaPipe coords)
  camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 100);
  camera.position.z = 5;

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(0, 2, 5);
  scene.add(dirLight);

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
  if (!renderer) return;

  // Set drawing buffer size WITHOUT changing CSS (false = don't update style)
  renderer.setSize(canvasWidth, canvasHeight, false);

  if (!currentGlasses || !landmarks || landmarks.length === 0) {
    renderer.clear();
    return;
  }

  const face = landmarks[0];
  const { scaleFactor = 1.0, verticalOffset = 0 } = options;

  // Camera maps directly to normalized coordinates (0-1)
  // MediaPipe: top-left is (0,0), bottom-right is (1,1)
  // Three.js ortho: we set left=0, right=1, top=0 (top of screen), bottom=1 (bottom)
  camera.left = 0;
  camera.right = 1;
  camera.top = 0;
  camera.bottom = 1;
  camera.updateProjectionMatrix();

  const leftEye = face[LEFT_EYE_OUTER];
  const rightEye = face[RIGHT_EYE_OUTER];
  const noseBridge = face[NOSE_BRIDGE];

  // Position directly in normalized coordinates (0-1)
  const centerX = (leftEye.x + rightEye.x) / 2;
  const centerY = noseBridge.y + (verticalOffset / canvasHeight);

  // Eye distance in normalized coords
  const eyeDist = Math.sqrt(
    (leftEye.x - rightEye.x) ** 2 + (leftEye.y - rightEye.y) ** 2
  );

  // Scale glasses based on eye distance
  const glassesScale = eyeDist * 1.1 * scaleFactor;

  // Rotation from eye positions
  const angle = Math.atan2(
    leftEye.y - rightEye.y,
    leftEye.x - rightEye.x
  );

  // 3D tilt from z coordinates
  const zDiff = (leftEye.z - rightEye.z) * 5;
  const noseDiff = noseBridge.z - (leftEye.z + rightEye.z) / 2;
  const faceTiltX = Math.max(-0.5, Math.min(0.5, noseDiff * 3));

  // Position and orient glasses
  currentGlasses.position.set(centerX, centerY, 0);
  currentGlasses.scale.set(glassesScale, glassesScale, glassesScale);
  currentGlasses.rotation.set(faceTiltX, zDiff, angle);

  renderer.render(scene, camera);
}
