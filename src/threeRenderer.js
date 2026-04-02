import * as THREE from "three";
import { GLASSES_3D } from "./glasses3d.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let renderer, scene, camera, currentGlasses;
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

  // Better lighting setup
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(0.5, 1, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xccccff, 0.4);
  fillLight.position.set(-2, 0, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, -1, -2);
  scene.add(rimLight);
}

export function setGlassesModel(glassesId) {
  if (currentGlasses) {
    scene.remove(currentGlasses);
    currentGlasses = null;
  }

  // Check if we have a loaded GLB model
  if (loadedModels.has(glassesId)) {
    currentGlasses = loadedModels.get(glassesId).clone();
    scene.add(currentGlasses);
    return;
  }

  // Fall back to procedural model
  const factory = GLASSES_3D[glassesId];
  if (!factory) return;

  currentGlasses = factory();
  scene.add(currentGlasses);
}

export function loadGLBModel(id, url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        loadedModels.set(id, model);
        resolve(model);
      },
      undefined,
      reject
    );
  });
}

// Key landmark indices for precise glasses placement
const LANDMARKS = {
  // Eye corners
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,
  // Eye top/bottom for vertical centering
  LEFT_EYE_TOP: 386,
  LEFT_EYE_BOTTOM: 374,
  RIGHT_EYE_TOP: 159,
  RIGHT_EYE_BOTTOM: 145,
  // Nose
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 197,
  // Temples (where arms rest on ears)
  LEFT_TEMPLE: 234,
  RIGHT_TEMPLE: 454,
  // Forehead for reference
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
  const lEyeInner = face[LANDMARKS.LEFT_EYE_INNER];
  const rEyeInner = face[LANDMARKS.RIGHT_EYE_INNER];
  const lEyeTop = face[LANDMARKS.LEFT_EYE_TOP];
  const lEyeBottom = face[LANDMARKS.LEFT_EYE_BOTTOM];
  const rEyeTop = face[LANDMARKS.RIGHT_EYE_TOP];
  const rEyeBottom = face[LANDMARKS.RIGHT_EYE_BOTTOM];
  const noseBridgeTop = face[LANDMARKS.NOSE_BRIDGE_TOP];
  const noseBridgeMid = face[LANDMARKS.NOSE_BRIDGE_MID];

  // --- POSITION ---
  // Center X: midpoint between outer eye corners
  const centerX = (lEyeOuter.x + rEyeOuter.x) / 2;

  // Center Y: average of eye centers, weighted towards nose bridge
  const leftEyeCenterY = (lEyeTop.y + lEyeBottom.y) / 2;
  const rightEyeCenterY = (rEyeTop.y + rEyeBottom.y) / 2;
  const eyeMidY = (leftEyeCenterY + rightEyeCenterY) / 2;
  const bridgeY = (noseBridgeTop.y + noseBridgeMid.y) / 2;
  // Blend: 60% eye center, 40% nose bridge for natural glasses resting position
  const centerY = eyeMidY * 0.6 + bridgeY * 0.4 + (verticalOffset / canvasHeight);

  // --- SCALE ---
  // Use distance between outer eye corners (most stable measurement)
  const eyeDist = Math.sqrt(
    (lEyeOuter.x - rEyeOuter.x) ** 2 +
    (lEyeOuter.y - rEyeOuter.y) ** 2
  );
  const glassesScale = eyeDist * 1.1 * scaleFactor;

  // --- ROTATION ---
  if (faceMatrix && faceMatrix.length > 0) {
    // Use the full facial transformation matrix from MediaPipe
    const m = faceMatrix[0].data;
    // Extract rotation from the 4x4 column-major matrix
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.set(
      m[0], m[1], m[2], 0,
      m[4], m[5], m[6], 0,
      m[8], m[9], m[10], 0,
      0, 0, 0, 1
    );
    const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

    // Apply rotation with dampening for natural feel
    currentGlasses.rotation.set(
      euler.x * 0.6,   // nod up/down
      euler.y * 0.6,   // turn left/right
      // Z rotation from eye line (more stable than matrix for roll)
      Math.atan2(lEyeOuter.y - rEyeOuter.y, lEyeOuter.x - rEyeOuter.x)
    );
  } else {
    // Fallback: derive rotation from landmarks
    const angle = Math.atan2(
      lEyeOuter.y - rEyeOuter.y,
      lEyeOuter.x - rEyeOuter.x
    );
    const zDiff = (lEyeOuter.z - rEyeOuter.z) * 5;
    const noseDiff = noseBridgeTop.z - (lEyeOuter.z + rEyeOuter.z) / 2;
    currentGlasses.rotation.set(
      Math.max(-0.5, Math.min(0.5, noseDiff * 3)),
      zDiff,
      angle
    );
  }

  // Apply position and scale
  currentGlasses.position.set(centerX, centerY, 0);
  currentGlasses.scale.set(glassesScale, glassesScale, glassesScale);

  renderer.render(scene, camera);
}
