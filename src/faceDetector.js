import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker = null;

export async function initFaceDetector(onReady) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  });

  if (onReady) onReady();
  return faceLandmarker;
}

export function detectFace(video, timestampMs) {
  if (!faceLandmarker) return null;
  return faceLandmarker.detectForVideo(video, timestampMs);
}

export function detectFaceImage(imageElement) {
  if (!faceLandmarker) return null;

  // Switch to IMAGE mode for single image detection
  faceLandmarker.setOptions({ runningMode: "IMAGE" });
  const result = faceLandmarker.detect(imageElement);
  // Switch back to VIDEO mode
  faceLandmarker.setOptions({ runningMode: "VIDEO" });
  return result;
}
