import { initFaceDetector, detectFace, detectFaceImage } from "./faceDetector.js";
import { initThreeRenderer, setGlassesModel, loadGLBModel, renderGlasses3D } from "./threeRenderer.js";
import { GLASSES_CATALOG } from "./glasses.js";

// DOM elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const threeCanvas = document.getElementById("three-canvas");
const loadingIndicator = document.getElementById("loading-indicator");
const noFaceMsg = document.getElementById("no-face-msg");
const glassesList = document.getElementById("glasses-list");
const btnWebcam = document.getElementById("btn-webcam");
const btnUpload = document.getElementById("btn-upload");
const fileInput = document.getElementById("file-input");
const sizeSlider = document.getElementById("size-slider");
const verticalSlider = document.getElementById("vertical-slider");
const btnScreenshot = document.getElementById("btn-screenshot");

// State
let selectedGlassesId = GLASSES_CATALOG[0].id;
let mode = "webcam";
let uploadedImage = null;
let animationFrameId = null;
let lastTimestamp = 0;

async function init() {
  loadingIndicator.classList.remove("hidden");

  // Init Three.js renderer
  initThreeRenderer(threeCanvas);

  // Preload GLB models
  const glbModels = GLASSES_CATALOG.filter((g) => g.type === "glb");
  await Promise.allSettled(
    glbModels.map((g) => loadGLBModel(g.id, g.glb))
  );

  setGlassesModel(selectedGlassesId);

  // Build glasses selector UI
  buildGlassesUI();

  // Init face detector
  await initFaceDetector(() => {
    loadingIndicator.classList.add("hidden");
  });

  // Start webcam by default
  startWebcam();

  // Event listeners
  btnWebcam.addEventListener("click", switchToWebcam);
  btnUpload.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);
  sizeSlider.addEventListener("input", onAdjustmentChange);
  verticalSlider.addEventListener("input", onAdjustmentChange);
  btnScreenshot.addEventListener("click", takeScreenshot);
}

function buildGlassesUI() {
  glassesList.innerHTML = "";
  for (const g of GLASSES_CATALOG) {
    const card = document.createElement("div");
    card.className = `glasses-card${g.id === selectedGlassesId ? " selected" : ""}`;
    card.innerHTML = `<img src="${g.src}" alt="${g.name}" /><div class="name">${g.name}</div>`;
    card.addEventListener("click", () => selectGlasses(g.id));
    glassesList.appendChild(card);
  }
}

function selectGlasses(id) {
  selectedGlassesId = id;
  setGlassesModel(id);
  document.querySelectorAll(".glasses-card").forEach((card, i) => {
    card.classList.toggle("selected", GLASSES_CATALOG[i].id === id);
  });
  if (mode === "photo" && uploadedImage) {
    renderPhotoFrame();
  }
}

// --- Webcam ---

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      requestDetectionLoop();
    });
  } catch (err) {
    console.error("Webcam access denied:", err);
    noFaceMsg.textContent = "Kunne ikke tilgå webcam – giv venligst adgang";
    noFaceMsg.classList.remove("hidden");
  }
}

function stopWebcam() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

function requestDetectionLoop() {
  const loop = () => {
    if (mode !== "webcam") return;

    const now = performance.now();
    if (now - lastTimestamp < 33) {
      animationFrameId = requestAnimationFrame(loop);
      return;
    }
    lastTimestamp = now;

    const result = detectFace(video, now);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      noFaceMsg.classList.add("hidden");
      renderGlasses3D(result.faceLandmarks, result.facialTransformationMatrixes, video.videoWidth, video.videoHeight, {
        scaleFactor: parseFloat(sizeSlider.value),
        verticalOffset: parseInt(verticalSlider.value, 10),
      });
    } else {
      noFaceMsg.classList.remove("hidden");
      renderGlasses3D(null, null, video.videoWidth, video.videoHeight);
    }

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);
}

// --- Photo upload ---

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      switchToPhoto();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function switchToPhoto() {
  mode = "photo";
  stopWebcam();
  btnWebcam.classList.remove("active");
  btnUpload.classList.add("active");
  video.style.display = "none";
  renderPhotoFrame();
}

function renderPhotoFrame() {
  if (!uploadedImage) return;

  const wrapper = document.querySelector(".video-wrapper");
  const maxW = wrapper.clientWidth;
  const maxH = wrapper.clientHeight || maxW * 0.75;
  const scale = Math.min(maxW / uploadedImage.width, maxH / uploadedImage.height, 1);

  canvas.width = uploadedImage.width * scale;
  canvas.height = uploadedImage.height * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

  // Detect face in the image
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

  const result = detectFaceImage(tempCanvas);

  if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
    noFaceMsg.classList.add("hidden");
    renderGlasses3D(result.faceLandmarks, result.facialTransformationMatrixes, canvas.width, canvas.height, {
      scaleFactor: parseFloat(sizeSlider.value),
      verticalOffset: parseInt(verticalSlider.value, 10),
    });
  } else {
    noFaceMsg.classList.remove("hidden");
  }
}

function switchToWebcam() {
  mode = "webcam";
  uploadedImage = null;
  btnWebcam.classList.add("active");
  btnUpload.classList.remove("active");
  video.style.display = "block";
  noFaceMsg.classList.add("hidden");
  startWebcam();
}

function onAdjustmentChange() {
  if (mode === "photo" && uploadedImage) {
    renderPhotoFrame();
  }
}

// --- Screenshot ---

function takeScreenshot() {
  const tempCanvas = document.createElement("canvas");

  if (mode === "webcam") {
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0);
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(threeCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
  } else {
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.drawImage(threeCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
  }

  const link = document.createElement("a");
  link.download = `virtual-tryon-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

init();
