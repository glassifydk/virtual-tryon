import * as THREE from "three";
import { GLASSES_3D } from "./glasses3d.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let renderer, scene, camera, currentGlasses;
let isGLBModel = false;
const gltfLoader = new GLTFLoader();
const loadedModels = new Map();

export function initThreeRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 100);
  camera.position.z = 5;

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(0.5, 1, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xccccff, 0.5);
  fillLight.position.set(-2, 0, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, -1, -2);
  scene.add(rimLight);
}

/**
 * Normalize a GLB model so it:
 * 1. Is centered at origin (pivot at center of bounding box)
 * 2. Has a standard width of 1.0 unit (matching procedural models)
 * 3. Faces the camera (along +Z axis)
 */
function normalizeGLBModel(model) {
  const wrapper = new THREE.Group();

  // Compute bounding box of the full model
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  console.log(`GLB model size: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`);
  console.log(`GLB model center: ${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}`);

  // Center the model at origin
  model.position.sub(center);

  // Normalize scale: make the widest dimension (X = width of glasses) equal to ~1.0
  // Glasses are typically widest along X axis
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetWidth = 1.0;
  const normalizeScale = targetWidth / maxDim;
  model.scale.multiplyScalar(normalizeScale);

  wrapper.add(model);

  // Store metadata for debugging
  wrapper.userData = {
    originalSize: size.clone(),
    normalizeScale,
    isGLB: true,
  };

  return wrapper;
}

export function setGlassesModel(glassesId) {
  if (currentGlasses) {
    scene.remove(currentGlasses);
    currentGlasses = null;
  }

  // Check if we have a loaded GLB model
  if (loadedModels.has(glassesId)) {
    const source = loadedModels.get(glassesId);
    currentGlasses = source.clone();
    isGLBModel = true;
    scene.add(currentGlasses);
    return;
  }

  // Fall back to procedural model
  const factory = GLASSES_3D[glassesId];
  if (!factory) return;

  currentGlasses = factory();
  isGLBModel = false;
  scene.add(currentGlasses);
}

export function loadGLBModel(id, url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const normalized = normalizeGLBModel(gltf.scene);
        loadedModels.set(id, normalized);
        console.log(`Loaded GLB model: ${id}`);
        resolve(normalized);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load GLB model ${id}:`, err);
        reject(err);
      }
    );
  });
}

// Key landmark indices
const LANDMARKS = {
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,
  LEFT_EYE_TOP: 386,
  LEFT_EYE_BOTTOM: 374,
  RIGHT_EYE_TOP: 159,
  RIGHT_EYE_BOTTOM: 145,
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 197,
  LEFT_TEMPLE: 234,
  RIGHT_TEMPLE: 454,
  FOREHEAD: 10,
};

export function renderGlasses3D(faceLandmarks, faceMatrix, canvasWidth, canvasHeight, options = {}) {
  if (!renderer) return;

  renderer.setSize(canvasWidth, canvasHeight, false);

  if (!currentGlasses || !faceLandmarks || faceLandmarks.length === 0) {
    renderer.clear();
    return;
  }

  const face = faceLandmarks[0];
  const { scaleFactor = 1.0, verticalOffset = 0 } = options;

  // Camera in normalized 0-1 space
  camera.left = 0;
  camera.right = 1;
  camera.top = 0;
  camera.bottom = 1;
  camera.updateProjectionMatrix();

  // Get key landmarks
  const lEyeOuter = face[LANDMARKS.LEFT_EYE_OUTER];
  const rEyeOuter = face[LANDMARKS.RIGHT_EYE_OUTER];
  const lEyeTop = face[LANDMARKS.LEFT_EYE_TOP];
  const lEyeBottom = face[LANDMARKS.LEFT_EYE_BOTTOM];
  const rEyeTop = face[LANDMARKS.RIGHT_EYE_TOP];
  const rEyeBottom = face[LANDMARKS.RIGHT_EYE_BOTTOM];
  const noseBridgeTop = face[LANDMARKS.NOSE_BRIDGE_TOP];
  const noseBridgeMid = face[LANDMARKS.NOSE_BRIDGE_MID];

  // --- POSITION ---
  const centerX = (lEyeOuter.x + rEyeOuter.x) / 2;
  const leftEyeCenterY = (lEyeTop.y + lEyeBottom.y) / 2;
  const rightEyeCenterY = (rEyeTop.y + rEyeBottom.y) / 2;
  const eyeMidY = (leftEyeCenterY + rightEyeCenterY) / 2;
  const bridgeY = (noseBridgeTop.y + noseBridgeMid.y) / 2;
  const centerY = eyeMidY * 0.6 + bridgeY * 0.4 + (verticalOffset / canvasHeight);

  // --- SCALE ---
  const eyeDist = Math.sqrt(
    (lEyeOuter.x - rEyeOuter.x) ** 2 +
    (lEyeOuter.y - rEyeOuter.y) ** 2
  );

  // GLB models are normalized to width=1.0, so eyeDist directly maps to glasses width
  // Procedural models have a different base size
  const baseScale = isGLBModel ? eyeDist * 1.6 : eyeDist * 1.1;
  const glassesScale = baseScale * scaleFactor;

  // --- ROTATION ---
  // Z rotation from eye line (roll / head tilt)
  const rollAngle = Math.atan2(
    lEyeOuter.y - rEyeOuter.y,
    lEyeOuter.x - rEyeOuter.x
  );

  if (faceMatrix && faceMatrix.length > 0) {
    const m = faceMatrix[0].data;
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.set(
      m[0], m[1], m[2], 0,
      m[4], m[5], m[6], 0,
      m[8], m[9], m[10], 0,
      0, 0, 0, 1
    );
    const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

    currentGlasses.rotation.set(
      euler.x * 0.6,   // pitch (nod up/down)
      euler.y * 0.6,   // yaw (turn left/right)
      rollAngle         // roll (head tilt)
    );
  } else {
    const zDiff = (lEyeOuter.z - rEyeOuter.z) * 5;
    const noseDiff = noseBridgeTop.z - (lEyeOuter.z + rEyeOuter.z) / 2;
    currentGlasses.rotation.set(
      Math.max(-0.5, Math.min(0.5, noseDiff * 3)),
      zDiff,
      rollAngle
    );
  }

  // Apply position and scale
  currentGlasses.position.set(centerX, centerY, 0);
  currentGlasses.scale.set(glassesScale, glassesScale, glassesScale);

  renderer.render(scene, camera);
}
