// Key landmark indices for glasses placement
const LANDMARKS = {
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 362,
  RIGHT_EYE_INNER: 133,
  NOSE_BRIDGE: 6,
  NOSE_TIP: 1,
  FOREHEAD_MID: 10,
  LEFT_TEMPLE: 234,
  RIGHT_TEMPLE: 454,
};

const glassesImages = new Map();

export function preloadGlassesImage(id, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      glassesImages.set(id, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function renderGlasses(ctx, landmarks, glassesId, options = {}) {
  const img = glassesImages.get(glassesId);
  if (!img || !landmarks || landmarks.length === 0) return;

  const face = landmarks[0];
  const { scaleFactor = 1.0, verticalOffset = 0 } = options;

  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  // Get key points in pixel coordinates
  const leftOuter = {
    x: face[LANDMARKS.LEFT_EYE_OUTER].x * canvasW,
    y: face[LANDMARKS.LEFT_EYE_OUTER].y * canvasH,
  };
  const rightOuter = {
    x: face[LANDMARKS.RIGHT_EYE_OUTER].x * canvasW,
    y: face[LANDMARKS.RIGHT_EYE_OUTER].y * canvasH,
  };
  const noseBridge = {
    x: face[LANDMARKS.NOSE_BRIDGE].x * canvasW,
    y: face[LANDMARKS.NOSE_BRIDGE].y * canvasH,
  };
  const forehead = {
    x: face[LANDMARKS.FOREHEAD_MID].x * canvasW,
    y: face[LANDMARKS.FOREHEAD_MID].y * canvasH,
  };

  // Calculate glasses width based on eye distance with some padding for frames
  const eyeDistance = Math.hypot(
    leftOuter.x - rightOuter.x,
    leftOuter.y - rightOuter.y
  );
  const glassesWidth = eyeDistance * 1.55 * scaleFactor;

  // Maintain aspect ratio
  const aspect = img.naturalHeight / img.naturalWidth;
  const glassesHeight = glassesWidth * aspect;

  // Center position between the eyes, slightly above nose bridge
  const centerX = (leftOuter.x + rightOuter.x) / 2;
  const centerY = noseBridge.y + verticalOffset;

  // Calculate rotation angle from eye positions
  const angle = Math.atan2(
    leftOuter.y - rightOuter.y,
    leftOuter.x - rightOuter.x
  );

  // Draw glasses
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.drawImage(
    img,
    -glassesWidth / 2,
    -glassesHeight / 2,
    glassesWidth,
    glassesHeight
  );
  ctx.restore();
}
