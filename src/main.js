import { initFaceDetector, detectFace, detectFaceImage } from "./faceDetector.js";
import { preloadGlassesImage, renderGlasses } from "./glassesRenderer.js";
import { GLASSES_CATALOG } from "./glasses.js";

// DOM elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
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
let mode = "webcam"; // "webcam" or "photo"
let uploadedImage = null;
let animationFrameId = null;
let lastTimestamp = 0;

// --- Initialize ---

async function init() {
  loadingIndicator.classList.remove("hidden");

  // Preload all glasses images
  await Promise.all(
    GLASSES_CATALOG.map((g) => preloadGlassesImage(g.id, g.src))
  );

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
  document.querySelectorAll(".glasses-card").forEach((card, i) => {
    card.classList.toggle("selected", GLASSES_CATALOG[i].id === id);
  });
  // Re-render photo mode immediately
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
      // cap at ~30 fps
      animationFrameId = requestAnimationFrame(loop);
      return;
    }
    lastTimestamp = now;

    const result = detectFace(video, now);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      noFaceMsg.classList.add("hidden");
      renderGlasses(ctx, result.faceLandmarks, selectedGlassesId, {
        scaleFactor: parseFloat(sizeSlider.value),
        verticalOffset: parseInt(verticalSlider.value, 10),
      });
    } else {
      noFaceMsg.classList.remove("hidden");
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

  // Render photo onto canvas
  canvas.style.position = "relative";
  canvas.style.transform = "scaleX(-1)";
  renderPhotoFrame();
}

function renderPhotoFrame() {
  if (!uploadedImage) return;

  // Size canvas to image, fitting within the wrapper
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
    renderGlasses(ctx, result.faceLandmarks, selectedGlassesId, {
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
  canvas.style.position = "absolute";
  canvas.style.transform = "scaleX(-1)";
  noFaceMsg.classList.add("hidden");
  startWebcam();
}

// --- Adjustments ---

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
    // Mirror the video
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0);
    // Reset transform and draw overlay
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(canvas, 0, 0);
  } else {
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0);
  }

  const link = document.createElement("a");
  link.download = `virtual-tryon-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

// Start the app
init();
