# Virtual Eyeglasses Try-On

A web-based virtual try-on tool that lets customers try on eyeglasses using their webcam or an uploaded photo. Built with MediaPipe Face Landmarker for real-time face detection and canvas-based glasses overlay.

## Features

- **Real-time webcam try-on** — glasses follow your face in real-time at 30fps
- **Photo upload** — upload a photo and try glasses on it
- **6 glasses models** — Classic Round, Aviator, Cat Eye, Wayfarer, Rectangular, Oversized
- **Adjustable fit** — size and vertical position sliders for fine-tuning
- **Screenshot** — download your try-on look as a PNG
- **Mobile-friendly** — responsive design that works on phones and tablets

## Tech Stack

- **MediaPipe Face Landmarker** — 478 3D face landmarks, runs in-browser via WASM/WebGL
- **Canvas 2D** — lightweight glasses overlay rendering
- **Vite** — fast dev server and optimized production builds
- **Vanilla JS** — no framework dependencies

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build

```bash
npm run build
npm run preview
```

## Adding Custom Glasses

1. Add your glasses image (SVG or PNG with transparency) to `public/glasses/`
2. Add an entry in `src/glasses.js`:
   ```js
   { id: "my-glasses", name: "My Glasses", src: "/glasses/my-glasses.svg" }
   ```

For best results, glasses images should:
- Have a transparent background
- Be front-facing with lenses centered
- Have an aspect ratio around 2.5:1 to 3:1 (width:height)

## How It Works

1. MediaPipe Face Landmarker detects 478 face landmarks in each frame
2. Key landmarks (eye corners, nose bridge) determine glasses position, scale, and rotation
3. Glasses are rendered on a canvas overlay matching the video/photo dimensions
4. The canvas is CSS-mirrored to match the webcam's mirror effect
