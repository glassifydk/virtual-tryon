import * as THREE from "three";

// Create 3D glasses models procedurally
// Each function returns a THREE.Group that can be positioned on the face

function createFrameMaterial(color, metalness = 0.8, roughness = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
  });
}

function createLensMaterial(color = 0x88ccff, opacity = 0.3) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
  });
}

export function createClassicRound() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0x1a1a1a);
  const lensMat = createLensMaterial();

  // Left lens frame
  const leftRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.03, 16, 48),
    frameMat
  );
  leftRing.position.set(-0.45, 0, 0);
  group.add(leftRing);

  // Left lens
  const leftLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 48),
    lensMat
  );
  leftLens.position.set(-0.45, 0, 0);
  group.add(leftLens);

  // Right lens frame
  const rightRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.03, 16, 48),
    frameMat
  );
  rightRing.position.set(0.45, 0, 0);
  group.add(rightRing);

  // Right lens
  const rightLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 48),
    lensMat
  );
  rightLens.position.set(0.45, 0, 0);
  group.add(rightLens);

  // Bridge
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 0.05, 0),
    new THREE.Vector3(0, 0.1, 0.03),
    new THREE.Vector3(0.1, 0.05, 0),
  ]);
  const bridge = new THREE.Mesh(
    new THREE.TubeGeometry(bridgeCurve, 12, 0.02, 8, false),
    frameMat
  );
  group.add(bridge);

  // Left temple arm
  const leftTemple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.015, 1.0, 8),
    frameMat
  );
  leftTemple.position.set(-0.8, 0.05, -0.45);
  leftTemple.rotation.x = Math.PI / 2;
  leftTemple.rotation.z = 0.05;
  group.add(leftTemple);

  // Right temple arm
  const rightTemple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.015, 1.0, 8),
    frameMat
  );
  rightTemple.position.set(0.8, 0.05, -0.45);
  rightTemple.rotation.x = Math.PI / 2;
  rightTemple.rotation.z = -0.05;
  group.add(rightTemple);

  return group;
}

export function createAviator() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0xc4a35a, 0.9, 0.15);
  const lensMat = createLensMaterial(0x4a6741, 0.5);

  // Aviator lens shape (teardrop-ish) - use scaled circles
  for (const side of [-1, 1]) {
    // Lens frame
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.02, 16, 48),
      frameMat
    );
    ring.position.set(side * 0.48, 0, 0);
    ring.scale.set(1, 1.15, 1);
    group.add(ring);

    // Lens
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 48),
      lensMat
    );
    lens.position.set(side * 0.48, 0, 0);
    lens.scale.set(1, 1.15, 1);
    group.add(lens);
  }

  // Bridge (double bar)
  for (const yOff of [0.08, 0.18]) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
      frameMat
    );
    bar.position.set(0, yOff, 0.01);
    bar.rotation.z = Math.PI / 2;
    group.add(bar);
  }

  // Nose pads
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      frameMat
    );
    pad.position.set(side * 0.12, -0.1, 0.04);
    pad.scale.set(0.5, 1, 0.5);
    group.add(pad);
  }

  // Temple arms
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.012, 1.0, 8),
      frameMat
    );
    temple.position.set(side * 0.86, 0.1, -0.45);
    temple.rotation.x = Math.PI / 2;
    temple.rotation.z = side * -0.05;
    group.add(temple);
  }

  return group;
}

export function createWayfarer() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0x111111, 0.3, 0.7);
  const lensMat = createLensMaterial(0x666666, 0.4);

  for (const side of [-1, 1]) {
    // Rectangular lens frame using box
    const frameShape = new THREE.Shape();
    const w = 0.38, h = 0.3, r = 0.05;
    frameShape.moveTo(-w + r, -h);
    frameShape.lineTo(w - r, -h);
    frameShape.quadraticCurveTo(w, -h, w, -h + r);
    frameShape.lineTo(w, h - r);
    frameShape.quadraticCurveTo(w, h, w - r, h);
    frameShape.lineTo(-w + r, h);
    frameShape.quadraticCurveTo(-w, h, -w, h - r);
    frameShape.lineTo(-w, -h + r);
    frameShape.quadraticCurveTo(-w, -h, -w + r, -h);

    // Frame border
    const holePath = new THREE.Path();
    const iw = w - 0.04, ih = h - 0.04, ir = 0.03;
    holePath.moveTo(-iw + ir, -ih);
    holePath.lineTo(iw - ir, -ih);
    holePath.quadraticCurveTo(iw, -ih, iw, -ih + ir);
    holePath.lineTo(iw, ih - ir);
    holePath.quadraticCurveTo(iw, ih, iw - ir, ih);
    holePath.lineTo(-iw + ir, ih);
    holePath.quadraticCurveTo(-iw, ih, -iw, ih - ir);
    holePath.lineTo(-iw, -ih + ir);
    holePath.quadraticCurveTo(-iw, -ih, -iw + ir, -ih);
    frameShape.holes.push(holePath);

    const frameGeom = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.04,
      bevelEnabled: false,
    });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(side * 0.45, 0, -0.02);
    group.add(frame);

    // Lens fill
    const lensShape = new THREE.Shape();
    lensShape.moveTo(-iw + ir, -ih);
    lensShape.lineTo(iw - ir, -ih);
    lensShape.quadraticCurveTo(iw, -ih, iw, -ih + ir);
    lensShape.lineTo(iw, ih - ir);
    lensShape.quadraticCurveTo(iw, ih, iw - ir, ih);
    lensShape.lineTo(-iw + ir, ih);
    lensShape.quadraticCurveTo(-iw, ih, -iw, ih - ir);
    lensShape.lineTo(-iw, -ih + ir);
    lensShape.quadraticCurveTo(-iw, -ih, -iw + ir, -ih);
    const lens = new THREE.Mesh(
      new THREE.ShapeGeometry(lensShape),
      lensMat
    );
    lens.position.set(side * 0.45, 0, 0);
    group.add(lens);
  }

  // Bridge
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8),
    frameMat
  );
  bridge.position.set(0, 0.1, 0);
  bridge.rotation.z = Math.PI / 2;
  group.add(bridge);

  // Temple arms (thicker for wayfarer style)
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 1.0),
      frameMat
    );
    temple.position.set(side * 0.83, 0.15, -0.48);
    group.add(temple);
  }

  return group;
}

export function createCatEye() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0x880044, 0.4, 0.5);
  const lensMat = createLensMaterial(0xcc88aa, 0.25);

  for (const side of [-1, 1]) {
    // Cat eye shape using custom shape
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, -0.2);
    shape.lineTo(0.3, -0.15);
    shape.quadraticCurveTo(0.4, 0.25, 0.35, 0.3);
    shape.lineTo(-0.1, 0.2);
    shape.quadraticCurveTo(-0.38, 0.18, -0.38, 0);
    shape.quadraticCurveTo(-0.38, -0.2, -0.3, -0.2);

    const frameGeom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(side * 0.42, 0, -0.015);
    frame.scale.x = side;
    group.add(frame);

    // Lens
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(shape), lensMat);
    lens.position.set(side * 0.42, 0, 0.005);
    lens.scale.set(side * 0.9, 0.9, 1);
    group.add(lens);
  }

  // Bridge
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.05, 0),
    new THREE.Vector3(0, 0.12, 0.02),
    new THREE.Vector3(0.08, 0.05, 0),
  ]);
  const bridge = new THREE.Mesh(
    new THREE.TubeGeometry(bridgeCurve, 12, 0.02, 8, false),
    frameMat
  );
  group.add(bridge);

  // Temple arms
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.012, 1.0, 8),
      frameMat
    );
    temple.position.set(side * 0.82, 0.15, -0.45);
    temple.rotation.x = Math.PI / 2;
    temple.rotation.z = side * -0.05;
    group.add(temple);
  }

  return group;
}

export function createRectangular() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0x333366, 0.6, 0.3);
  const lensMat = createLensMaterial(0x8888cc, 0.2);

  for (const side of [-1, 1]) {
    // Slim rectangular frame
    const frameShape = new THREE.Shape();
    const w = 0.36, h = 0.2, r = 0.03;
    frameShape.moveTo(-w + r, -h);
    frameShape.lineTo(w - r, -h);
    frameShape.quadraticCurveTo(w, -h, w, -h + r);
    frameShape.lineTo(w, h - r);
    frameShape.quadraticCurveTo(w, h, w - r, h);
    frameShape.lineTo(-w + r, h);
    frameShape.quadraticCurveTo(-w, h, -w, h - r);
    frameShape.lineTo(-w, -h + r);
    frameShape.quadraticCurveTo(-w, -h, -w + r, -h);

    const holePath = new THREE.Path();
    const iw = w - 0.03, ih = h - 0.03, ir = 0.02;
    holePath.moveTo(-iw + ir, -ih);
    holePath.lineTo(iw - ir, -ih);
    holePath.quadraticCurveTo(iw, -ih, iw, -ih + ir);
    holePath.lineTo(iw, ih - ir);
    holePath.quadraticCurveTo(iw, ih, iw - ir, ih);
    holePath.lineTo(-iw + ir, ih);
    holePath.quadraticCurveTo(-iw, ih, -iw, ih - ir);
    holePath.lineTo(-iw, -ih + ir);
    holePath.quadraticCurveTo(-iw, -ih, -iw + ir, -ih);
    frameShape.holes.push(holePath);

    const frameGeom = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.03,
      bevelEnabled: false,
    });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(side * 0.43, 0, -0.015);
    group.add(frame);

    // Lens
    const lensShape = new THREE.Shape();
    lensShape.moveTo(-iw + ir, -ih);
    lensShape.lineTo(iw - ir, -ih);
    lensShape.quadraticCurveTo(iw, -ih, iw, -ih + ir);
    lensShape.lineTo(iw, ih - ir);
    lensShape.quadraticCurveTo(iw, ih, iw - ir, ih);
    lensShape.lineTo(-iw + ir, ih);
    lensShape.quadraticCurveTo(-iw, ih, -iw, ih - ir);
    lensShape.lineTo(-iw, -ih + ir);
    lensShape.quadraticCurveTo(-iw, -ih, -iw + ir, -ih);
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(lensShape), lensMat);
    lens.position.set(side * 0.43, 0, 0);
    group.add(lens);
  }

  // Bridge
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8),
    frameMat
  );
  bridge.position.set(0, 0.05, 0);
  bridge.rotation.z = Math.PI / 2;
  group.add(bridge);

  // Temple arms
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.012, 1.0, 8),
      frameMat
    );
    temple.position.set(side * 0.79, 0.05, -0.45);
    temple.rotation.x = Math.PI / 2;
    temple.rotation.z = side * -0.04;
    group.add(temple);
  }

  return group;
}

export function createOversized() {
  const group = new THREE.Group();
  const frameMat = createFrameMaterial(0x663399, 0.5, 0.4);
  const lensMat = createLensMaterial(0xaa77dd, 0.2);

  for (const side of [-1, 1]) {
    // Big round lens
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.035, 16, 48),
      frameMat
    );
    ring.position.set(side * 0.5, 0, 0);
    ring.scale.set(1, 1.05, 1);
    group.add(ring);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 48),
      lensMat
    );
    lens.position.set(side * 0.5, 0, 0);
    lens.scale.set(1, 1.05, 1);
    group.add(lens);
  }

  // Bridge
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, 0.1, 0),
    new THREE.Vector3(0, 0.18, 0.03),
    new THREE.Vector3(0.06, 0.1, 0),
  ]);
  const bridge = new THREE.Mesh(
    new THREE.TubeGeometry(bridgeCurve, 12, 0.025, 8, false),
    frameMat
  );
  group.add(bridge);

  // Temple arms
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.018, 1.0, 8),
      frameMat
    );
    temple.position.set(side * 0.95, 0.1, -0.45);
    temple.rotation.x = Math.PI / 2;
    temple.rotation.z = side * -0.05;
    group.add(temple);
  }

  return group;
}

// Factory map
export const GLASSES_3D = {
  "classic-round": createClassicRound,
  aviator: createAviator,
  wayfarer: createWayfarer,
  "cat-eye": createCatEye,
  rectangular: createRectangular,
  oversized: createOversized,
};
