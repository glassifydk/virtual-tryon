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

  // Lighting — match natural face lighting
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
 * Normalize a GLB model:
 * - Center at origin
 * - Scale so widest dimension = 1.0
 */
function normalizeGLBModel(model) {
  const wrapper = new THREE.Group();

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Center at origin
  model.position.sub(center);

  // Normalize: widest dimension = 1.0
  const maxDim = Math.max(size.x, size.y, size.z);
  const normalizeScale = 1.0 / maxDim;
  model.scale.multiplyScalar(normalizeScale);

  wrapper.add(model);
  wrapper.userData = { originalSize: size.clone(), normalizeScale, isGLB: true };
  return wrapper;
}

export function setGlassesModel(glassesId) {
  if (currentGlasses) {
    scene.remove(currentGlasses);
    currentGlasses = null;
  }

  if (loadedModels.has(glassesId)) {
    const source = loadedModels.get(glassesId);
    currentGlasses = source.clone();
    isGLBModel = true;
    scene.add(currentGlasses);
    return;
  }

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
        resolve(normalized);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load GLB: ${id}`, err);
        reject(err);
      }
    );
  });
}

// ============================================================
// LANDMARK INDICES
// ============================================================
// MediaPipe Face Mesh 478 landmarks
// Iris landmarks (468-477) give us precise pupil positions
const L = {
  // Iris centers (most precise for glasses positioning)
  LEFT_IRIS_CENTER: 473,    // Left eye iris center
  RIGHT_IRIS_CENTER: 468,   // Right eye iris center

  // Eye corners (for width reference)
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,

  // Eye top/bottom (for vertical centering)
  LEFT_EYE_TOP: 386,
  LEFT_EYE_BOTTOM: 374,
  RIGHT_EYE_TOP: 159,
  RIGHT_EYE_BOTTOM: 145,

  // Nose bridge (where glasses rest)
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 197,

  // Temples / ears
  LEFT_TEMPLE: 234,
  RIGHT_TEMPLE: 454,

  // Face outline for depth reference
  FOREHEAD: 10,
  CHIN: 152,
};

// ============================================================
// RENDERING
// ============================================================
export function renderGlasses3D(faceLandmarks, faceMatrix, canvasWidth, canvasHeight, options = {}) {
  if (!renderer) return;

  renderer.setSize(canvasWidth, canvasHeight, false);

  if (!currentGlasses || !faceLandmarks || faceLandmarks.length === 0) {
    renderer.clear();
    return;
  }

  const face = faceLandmarks[0];
  const { scaleFactor = 1.0, verticalOffset = 0 } = options;

  camera.left = 0;
  camera.right = 1;
  camera.top = 0;
  camera.bottom = 1;
  camera.updateProjectionMatrix();

  // ---- IRIS-BASED POSITIONING (like FittingBox) ----
  // Use iris centers for precise pupil-to-pupil alignment
  const hasIris = face.length > 473;
  let leftPupil, rightPupil;

  if (hasIris) {
    leftPupil = face[L.LEFT_IRIS_CENTER];
    rightPupil = face[L.RIGHT_IRIS_CENTER];
  } else {
    // Fallback: estimate from eye corners
    leftPupil = {
      x: (face[L.LEFT_EYE_OUTER].x + face[L.LEFT_EYE_INNER].x) / 2,
      y: (face[L.LEFT_EYE_TOP].y + face[L.LEFT_EYE_BOTTOM].y) / 2,
      z: face[L.LEFT_EYE_OUTER].z,
    };
    rightPupil = {
      x: (face[L.RIGHT_EYE_OUTER].x + face[L.RIGHT_EYE_INNER].x) / 2,
      y: (face[L.RIGHT_EYE_TOP].y + face[L.RIGHT_EYE_BOTTOM].y) / 2,
      z: face[L.RIGHT_EYE_OUTER].z,
    };
  }

  const noseBridge = face[L.NOSE_BRIDGE_TOP];

  // ---- PUPILLARY DISTANCE (PD) ----
  // Distance between pupil centers in normalized coordinates
  const pd = Math.sqrt(
    (leftPupil.x - rightPupil.x) ** 2 +
    (leftPupil.y - rightPupil.y) ** 2
  );

  // Wider reference: outer eye corners (for frame width, not lens centering)
  const outerEyeDist = Math.sqrt(
    (face[L.LEFT_EYE_OUTER].x - face[L.RIGHT_EYE_OUTER].x) ** 2 +
    (face[L.LEFT_EYE_OUTER].y - face[L.RIGHT_EYE_OUTER].y) ** 2
  );

  // ---- POSITION ----
  // X: midpoint between pupils (more accurate than eye corners)
  const centerX = (leftPupil.x + rightPupil.x) / 2;

  // Y: blend between pupil center and nose bridge
  // Glasses rest on the nose bridge but lenses align with eyes
  const pupilMidY = (leftPupil.y + rightPupil.y) / 2;
  const bridgeY = noseBridge.y;
  const centerY = pupilMidY * 0.5 + bridgeY * 0.5 + (verticalOffset / canvasHeight);

  // ---- Z-DEPTH SCALING ----
  // Use face size (forehead to chin) as depth proxy
  // Closer face = larger landmarks = larger glasses
  const faceHeight = Math.abs(face[L.CHIN].y - face[L.FOREHEAD].y);
  const depthFactor = faceHeight / 0.35; // 0.35 is typical face height at normal distance

  // ---- SCALE ----
  // Use outer eye distance for frame width (PD for lens centers)
  const baseScale = isGLBModel ? outerEyeDist * 1.6 : outerEyeDist * 1.1;
  const glassesScale = baseScale * scaleFactor * Math.min(Math.max(depthFactor, 0.7), 1.4);

  // ---- ROTATION via Transformation Matrix ----
  const rollAngle = Math.atan2(
    leftPupil.y - rightPupil.y,
    leftPupil.x - rightPupil.x
  );

  if (faceMatrix && faceMatrix.length > 0) {
    // Use MediaPipe's facial transformation matrix directly
    // This is the same approach FittingBox and Ditto use
    const m = faceMatrix[0].data;
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.set(
      m[0], m[1], m[2], 0,
      m[4], m[5], m[6], 0,
      m[8], m[9], m[10], 0,
      0, 0, 0, 1
    );
    const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

    // Less dampening than before — trust the matrix more
    currentGlasses.rotation.set(
      euler.x * 0.8,   // pitch (nod)
      euler.y * 0.8,   // yaw (turn)
      rollAngle         // roll from pupil line (most stable)
    );
  } else {
    // Landmark-based fallback
    const zDiff = (leftPupil.z - rightPupil.z) * 5;
    const noseDiff = noseBridge.z - (leftPupil.z + rightPupil.z) / 2;
    currentGlasses.rotation.set(
      Math.max(-0.5, Math.min(0.5, noseDiff * 3)),
      zDiff,
      rollAngle
    );
  }

  // Apply
  currentGlasses.position.set(centerX, centerY, 0);
  currentGlasses.scale.set(glassesScale, glassesScale, glassesScale);

  renderer.render(scene, camera);
}
