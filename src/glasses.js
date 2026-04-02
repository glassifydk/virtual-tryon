// Glasses catalog - each entry defines a model available for try-on
// type: "procedural" uses Three.js generated models, "glb" uses .glb files

const BASE = import.meta.env.BASE_URL;

export const GLASSES_CATALOG = [
  {
    id: "classic-black-oval",
    name: "Classic Oval",
    src: "/glasses/classic-round.svg",
    glb: `${BASE}models/classic-black-oval.glb`,
    type: "glb",
  },
  {
    id: "glasses-yellow",
    name: "Yellow Frame",
    src: "/glasses/wayfarer.svg",
    glb: `${BASE}models/glasses-yellow.glb`,
    type: "glb",
  },
  {
    id: "sunglasses-classic",
    name: "Classic Solbrille",
    src: "/glasses/aviator.svg",
    glb: `${BASE}models/sunglasses-classic.glb`,
    type: "glb",
  },
  {
    id: "sunglasses-khronos",
    name: "Khronos",
    src: "/glasses/rectangular.svg",
    glb: `${BASE}models/sunglasses-khronos.glb`,
    type: "glb",
  },
  {
    id: "sunglasses-aviator-round",
    name: "Aviator Round",
    src: "/glasses/aviator.svg",
    glb: `${BASE}models/sunglasses-aviator-round.glb`,
    type: "glb",
  },
  {
    id: "sunglasses-square",
    name: "Square",
    src: "/glasses/wayfarer.svg",
    glb: `${BASE}models/sunglasses-square.glb`,
    type: "glb",
  },
  {
    id: "classic-round",
    name: "Round (3D)",
    src: "/glasses/classic-round.svg",
    type: "procedural",
  },
  {
    id: "cat-eye",
    name: "Cat Eye (3D)",
    src: "/glasses/cat-eye.svg",
    type: "procedural",
  },
];
