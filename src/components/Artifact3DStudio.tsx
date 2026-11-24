import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  RotateCcw,
  Sun,
} from 'lucide-react';
import type { ArtifactRecord, AudienceMode } from '../types/archaeon';

interface Artifact3DStudioProps {
  artifacts: ArtifactRecord[];
  activeArtifact: ArtifactRecord;
  audienceMode: AudienceMode;
  onSelectArtifact: (id: string) => void;
}

type MaterialViewMode = 'natural' | 'rti-specular' | 'wireframe';
type CameraPreset = 'oblique' | 'front' | 'fracture' | 'top';

interface SurfaceTextures {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

function createProceduralSurfaceTextures(
  artifact: ArtifactRecord,
  maxAnisotropy: number
): SurfaceTextures {
  const width = 512;
  const height = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  const typeLower = `${artifact.artifactType} ${artifact.material}`.toLowerCase();
  const isBasalt = typeLower.includes('basalt') || typeLower.includes('stele');
  const isMarble = typeLower.includes('marble');
  const isOstracon = typeLower.includes('ostracon') || typeLower.includes('ceramic');

  // Base pigment
  if (isBasalt) {
    ctx.fillStyle = '#232826';
  } else if (isMarble) {
    ctx.fillStyle = '#dcd5c7';
  } else if (isOstracon) {
    ctx.fillStyle = '#9a5841';
  } else {
    // Baked clay tablet
    ctx.fillStyle = '#a88c67';
  }
  ctx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, width, height);

  // Deterministic mineral/clay grain
  let seed = 0;
  for (let i = 0; i < artifact.id.length; i++) {
    seed = (seed * 31 + artifact.id.charCodeAt(i)) % 99991;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 4200; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 0.6 + rand() * 2.4;
    const delta = (rand() - 0.5) * 34;
    ctx.fillStyle =
      delta > 0 ? `rgba(255,248,235,${delta / 260})` : `rgba(18,22,20,${-delta / 240})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const bShade = Math.max(40, Math.min(220, Math.round(136 + delta * 1.4)));
    bCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    bCtx.fillRect(x, y, r * 1.4, r * 1.4);
  }

  // Marble veins or terracotta throwing ribs
  if (isMarble) {
    ctx.strokeStyle = 'rgba(130, 126, 118, 0.24)';
    ctx.lineWidth = 2.5;
    for (let v = 0; v < 7; v++) {
      ctx.beginPath();
      let vx = rand() * width;
      ctx.moveTo(vx, 0);
      for (let y = 40; y <= height; y += 40) {
        vx += (rand() - 0.45) * 44;
        ctx.lineTo(vx, y);
      }
      ctx.stroke();
    }
  } else if (isOstracon) {
    for (let y = 18; y < height; y += 22) {
      ctx.fillStyle = 'rgba(70, 32, 20, 0.22)';
      ctx.fillRect(0, y, width, 6);
      bCtx.fillStyle = '#5e5e5e';
      bCtx.fillRect(0, y, width, 6);
    }
  }

  // Incised horizontal registers & ancient script glyph bands
  const lineCount = Math.max(4, Math.min(8, artifact.transcriptionLines.length + 3));
  const topOffset = 68;
  const lineStep = (height - 130) / lineCount;

  for (let row = 0; row < lineCount; row++) {
    const y = topOffset + row * lineStep;

    // Register ruling groove
    ctx.strokeStyle = isBasalt
      ? 'rgba(201, 166, 107, 0.16)'
      : isOstracon
        ? 'rgba(34, 24, 20, 0.25)'
        : 'rgba(42, 34, 24, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(46, y + 18);
    ctx.lineTo(width - 46, y + 18);
    ctx.stroke();

    bCtx.strokeStyle = '#383838';
    bCtx.lineWidth = 2;
    bCtx.beginPath();
    bCtx.moveTo(46, y + 18);
    bCtx.lineTo(width - 46, y + 18);
    bCtx.stroke();

    // Glyph strokes (chiseled, cuneiform wedges, or ink glyphs)
    let cursorX = 56;
    while (cursorX < width - 72) {
      const gap = 10 + rand() * 8;
      const w = 11 + rand() * 14;
      const h = 14 + rand() * 12;

      // Simulate eroded right-lower lacuna zone
      const inLacuna = row >= lineCount - 2 && cursorX > width * 0.54;
      if (!inLacuna) {
        if (isOstracon) {
          ctx.strokeStyle = 'rgba(30, 24, 21, 0.78)';
        } else if (isBasalt) {
          ctx.strokeStyle = 'rgba(182, 165, 134, 0.56)';
        } else if (isMarble) {
          ctx.strokeStyle = 'rgba(72, 66, 58, 0.65)';
        } else {
          ctx.strokeStyle = 'rgba(54, 41, 27, 0.68)';
        }
        ctx.lineWidth = isBasalt || isMarble ? 2.4 : 2.0;

        ctx.beginPath();
        ctx.moveTo(cursorX, y - h * 0.4);
        ctx.lineTo(cursorX + w * 0.6, y + h * 0.35);
        if (rand() > 0.35) {
          ctx.moveTo(cursorX + w * 0.85, y - h * 0.35);
          ctx.lineTo(cursorX + w * 0.15, y + h * 0.3);
        }
        if (rand() > 0.5) {
          ctx.moveTo(cursorX, y);
          ctx.lineTo(cursorX + w, y);
        }
        ctx.stroke();

        // Deep incised groove in bump map (ink ostracon stays near surface)
        if (!isOstracon) {
          bCtx.strokeStyle = '#1e1e1e';
          bCtx.lineWidth = 3.2;
          bCtx.beginPath();
          bCtx.moveTo(cursorX, y - h * 0.4);
          bCtx.lineTo(cursorX + w * 0.6, y + h * 0.35);
          if (rand() > 0.35) {
            bCtx.moveTo(cursorX + w * 0.85, y - h * 0.35);
            bCtx.lineTo(cursorX + w * 0.15, y + h * 0.3);
          }
          bCtx.stroke();
        }
      }
      cursorX += w + gap;
    }
  }

  // Simulated transverse fracture seam
  ctx.strokeStyle = 'rgba(168, 93, 72, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.42);
  ctx.lineTo(width * 0.36, height * 0.46);
  ctx.lineTo(width * 0.68, height * 0.41);
  ctx.lineTo(width, height * 0.48);
  ctx.stroke();

  bCtx.strokeStyle = '#0e0e0e';
  bCtx.lineWidth = 5;
  bCtx.beginPath();
  bCtx.moveTo(0, height * 0.42);
  bCtx.lineTo(width * 0.36, height * 0.46);
  bCtx.lineTo(width * 0.68, height * 0.41);
  bCtx.lineTo(width, height * 0.48);
  bCtx.stroke();

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

function buildArtifactGroup(
  artifact: ArtifactRecord,
  textures: SurfaceTextures,
  materialMode: MaterialViewMode,
  isSoftwareGl: boolean
): {
  root: THREE.Group;
  detachableShard: THREE.Object3D;
  shardOrigin: THREE.Vector3;
  shardOffsetVector: THREE.Vector3;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const typeLower = `${artifact.artifactType} ${artifact.material}`.toLowerCase();
  const isBasalt = typeLower.includes('basalt') || typeLower.includes('stele');
  const isMarble = typeLower.includes('marble');
  const isOstracon = typeLower.includes('ostracon') || typeLower.includes('ceramic');

  // Plinth base (1-3 grounded museum mounting parts)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1b221f,
    roughness: 0.72,
    metalness: 0.18,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc9a66b,
    roughness: 0.32,
    metalness: 0.85,
  });
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x141816,
    roughness: 0.92,
    metalness: 0.05,
  });

  // Main artifact PBR material driven by materialMode
  const isWire = materialMode === 'wireframe';
  const isRti = materialMode === 'rti-specular';

  const heroMat = new THREE.MeshStandardMaterial({
    color: isRti ? 0xbfc4be : 0xffffff,
    map: isRti ? null : textures.map,
    bumpMap: textures.bumpMap,
    bumpScale: isOstracon ? 0.018 : 0.055,
    roughness: isRti ? 0.28 : isBasalt ? 0.62 : isMarble ? 0.45 : 0.78,
    metalness: isRti ? 0.35 : 0.06,
    wireframe: isWire,
  });

  const fractureMat = new THREE.MeshStandardMaterial({
    color: isRti ? 0xcfc9be : isBasalt ? 0x2f3532 : isMarble ? 0xcac2b3 : isOstracon ? 0x8f4f39 : 0x9b7f5b,
    map: isRti ? null : textures.map,
    bumpMap: textures.bumpMap,
    bumpScale: 0.06,
    roughness: isRti ? 0.32 : 0.82,
    metalness: isRti ? 0.25 : 0.04,
    wireframe: isWire,
  });

  materials.push(plinthMat, brassMat, stageMat, heroMat, fractureMat);

  // Museum Plinth & Calibration Bar
  const basePedestalGeo = new THREE.CylinderGeometry(1.75, 1.92, 0.24, 36);
  const basePedestal = new THREE.Mesh(basePedestalGeo, plinthMat);
  basePedestal.position.y = -1.52;
  basePedestal.receiveShadow = !isSoftwareGl;
  basePedestal.castShadow = !isSoftwareGl;

  const brassRingGeo = new THREE.TorusGeometry(1.74, 0.025, 12, 48);
  const brassRing = new THREE.Mesh(brassRingGeo, brassMat);
  brassRing.rotation.x = Math.PI / 2;
  brassRing.position.y = -1.4;

  const cradleLeftGeo = new THREE.BoxGeometry(0.14, 0.34, 0.46);
  const cradleLeft = new THREE.Mesh(cradleLeftGeo, brassMat);
  cradleLeft.position.set(-0.62, -1.24, 0);
  const cradleRight = new THREE.Mesh(cradleLeftGeo, brassMat);
  cradleRight.position.set(0.62, -1.24, 0);

  // 10cm Scale Reference Bar on plinth front
  const scalePlateGeo = new THREE.BoxGeometry(0.92, 0.03, 0.14);
  const scalePlate = new THREE.Mesh(scalePlateGeo, stageMat);
  scalePlate.position.set(0, -1.39, 1.24);
  const scaleMarkerGeo = new THREE.BoxGeometry(0.18, 0.035, 0.08);
  const scaleMarkerA = new THREE.Mesh(scaleMarkerGeo, brassMat);
  scaleMarkerA.position.set(-0.22, -1.385, 1.24);
  const scaleMarkerB = new THREE.Mesh(scaleMarkerGeo, brassMat);
  scaleMarkerB.position.set(0.22, -1.385, 1.24);

  geometries.push(basePedestalGeo, brassRingGeo, cradleLeftGeo, scalePlateGeo, scaleMarkerGeo);
  root.add(basePedestal, brassRing, cradleLeft, cradleRight, scalePlate, scaleMarkerA, scaleMarkerB);

  const heroAssembly = new THREE.Group();
  let detachableShard: THREE.Object3D;
  let shardOrigin = new THREE.Vector3(0.42, -0.58, 0.02);
  let shardOffsetVector = new THREE.Vector3(0.58, -0.26, 0.32);

  if (isBasalt) {
    // Arched Ptolemaic Basalt Stele (composite slab + arched lunette + incised divider + lower-right spalled piece)
    const steleShape = new THREE.Shape();
    steleShape.moveTo(-0.88, -1.05);
    steleShape.lineTo(0.32, -1.05);
    steleShape.lineTo(0.45, -0.52);
    steleShape.lineTo(0.88, -0.38);
    steleShape.lineTo(0.88, 0.65);
    steleShape.absarc(0, 0.65, 0.88, 0, Math.PI, false);
    steleShape.lineTo(-0.88, -1.05);

    const slabGeo = new THREE.ExtrudeGeometry(steleShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 28,
    });
    slabGeo.translate(0, 0, -0.16);

    const slabMesh = new THREE.Mesh(slabGeo, heroMat);
    slabMesh.castShadow = !isSoftwareGl;
    slabMesh.receiveShadow = !isSoftwareGl;

    // Register divider band (separating Greek and Demotic registers)
    const dividerGeo = new THREE.BoxGeometry(1.74, 0.045, 0.37);
    const dividerMesh = new THREE.Mesh(dividerGeo, brassMat);
    dividerMesh.position.set(0, -0.04, 0.01);

    // Detached lower-right spalled fragment
    const shardShape = new THREE.Shape();
    shardShape.moveTo(0, -0.45);
    shardShape.lineTo(0.44, -0.45);
    shardShape.lineTo(0.44, 0.22);
    shardShape.lineTo(0.08, 0.08);
    shardShape.lineTo(0, -0.45);
    const shardGeo = new THREE.ExtrudeGeometry(shardShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    shardGeo.translate(0, 0, -0.14);
    const shardMesh = new THREE.Mesh(shardGeo, fractureMat);
    shardMesh.castShadow = !isSoftwareGl;
    shardOrigin = new THREE.Vector3(0.42, -0.6, 0);
    shardMesh.position.copy(shardOrigin);
    shardOffsetVector = new THREE.Vector3(0.62, -0.18, 0.36);

    geometries.push(slabGeo, dividerGeo, shardGeo);
    heroAssembly.add(slabMesh, dividerMesh, shardMesh);
    detachableShard = shardMesh;
  } else if (isOstracon) {
    // Curved ribbed terracotta ostracon body sherd + upper lip + fractured corner piece
    const sherdGeo = new THREE.CylinderGeometry(
      1.65,
      1.52,
      1.85,
      32,
      12,
      true,
      -Math.PI * 0.24,
      Math.PI * 0.44
    );
    const sherdMat = heroMat.clone();
    sherdMat.side = THREE.DoubleSide;
    materials.push(sherdMat);

    const sherdMesh = new THREE.Mesh(sherdGeo, sherdMat);
    sherdMesh.position.set(0, 0.05, -1.25);
    sherdMesh.castShadow = !isSoftwareGl;
    sherdMesh.receiveShadow = !isSoftwareGl;

    // Thickened amphora rim ridge
    const rimGeo = new THREE.TorusGeometry(1.66, 0.06, 12, 24, Math.PI * 0.44);
    const rimMesh = new THREE.Mesh(rimGeo, fractureMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.rotation.z = Math.PI * 0.28;
    rimMesh.position.set(0, 0.96, -1.25);

    // Fractured ceramic corner shard
    const shardGeo = new THREE.CylinderGeometry(
      1.66,
      1.6,
      0.56,
      16,
      4,
      true,
      Math.PI * 0.2,
      Math.PI * 0.16
    );
    const shardMat = fractureMat.clone();
    shardMat.side = THREE.DoubleSide;
    materials.push(shardMat);
    const shardMesh = new THREE.Mesh(shardGeo, shardMat);
    shardOrigin = new THREE.Vector3(0, -0.58, -1.25);
    shardMesh.position.copy(shardOrigin);
    shardOffsetVector = new THREE.Vector3(0.45, -0.2, 0.42);

    geometries.push(sherdGeo, rimGeo, shardGeo);
    heroAssembly.add(sherdMesh, rimMesh, shardMesh);
    detachableShard = shardMesh;
  } else if (isMarble) {
    // Adjoining Pentelic marble decree blocks along diagonal cleavage seam
    const leftBlockShape = new THREE.Shape();
    leftBlockShape.moveTo(-1.05, -0.95);
    leftBlockShape.lineTo(0.18, -0.95);
    leftBlockShape.lineTo(-0.24, 0.85);
    leftBlockShape.lineTo(-1.05, 0.85);
    leftBlockShape.lineTo(-1.05, -0.95);

    const leftGeo = new THREE.ExtrudeGeometry(leftBlockShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    leftGeo.translate(0, 0, -0.21);
    const leftMesh = new THREE.Mesh(leftGeo, heroMat);
    leftMesh.castShadow = !isSoftwareGl;
    leftMesh.receiveShadow = !isSoftwareGl;

    // Classical molded cornice crown
    const corniceGeo = new THREE.BoxGeometry(2.26, 0.18, 0.56);
    const corniceMesh = new THREE.Mesh(corniceGeo, fractureMat);
    corniceMesh.position.set(0, 0.96, 0);
    corniceMesh.castShadow = !isSoftwareGl;

    // Right adjoining marble fragment
    const rightShape = new THREE.Shape();
    rightShape.moveTo(0.22, -0.95);
    rightShape.lineTo(1.06, -0.95);
    rightShape.lineTo(1.06, 0.85);
    rightShape.lineTo(-0.2, 0.85);
    rightShape.lineTo(0.22, -0.95);
    const rightGeo = new THREE.ExtrudeGeometry(rightShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    rightGeo.translate(0, 0, -0.21);
    const rightMesh = new THREE.Mesh(rightGeo, heroMat);
    rightMesh.castShadow = !isSoftwareGl;
    shardOrigin = new THREE.Vector3(0.02, 0, 0);
    rightMesh.position.copy(shardOrigin);
    shardOffsetVector = new THREE.Vector3(0.55, 0.14, 0.25);

    geometries.push(leftGeo, corniceGeo, rightGeo);
    heroAssembly.add(leftMesh, corniceMesh, rightMesh);
    detachableShard = rightMesh;
  } else {
    // Baked Clay Tablet (pillow profile cushion + ruled register collar + cylinder seal band + sheared corner)
    const tabletShape = new THREE.Shape();
    tabletShape.moveTo(-0.85, -0.95);
    tabletShape.quadraticCurveTo(0, -1.04, 0.35, -0.96);
    tabletShape.lineTo(0.86, -0.26);
    tabletShape.quadraticCurveTo(0.95, 0.42, 0.82, 0.92);
    tabletShape.quadraticCurveTo(0, 1.04, -0.82, 0.92);
    tabletShape.quadraticCurveTo(-0.96, 0, -0.85, -0.95);

    const tabletGeo = new THREE.ExtrudeGeometry(tabletShape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 24,
    });
    tabletGeo.translate(0, 0, -0.18);
    const tabletMesh = new THREE.Mesh(tabletGeo, heroMat);
    tabletMesh.castShadow = !isSoftwareGl;
    tabletMesh.receiveShadow = !isSoftwareGl;

    // Clay envelope/seal band across reverse edge
    const sealBandGeo = new THREE.BoxGeometry(1.78, 0.12, 0.56);
    const sealBand = new THREE.Mesh(sealBandGeo, fractureMat);
    sealBand.position.set(0, 0.62, -0.02);

    // Lower-right sheared clay corner
    const cornerShape = new THREE.Shape();
    cornerShape.moveTo(0, -0.45);
    cornerShape.lineTo(0.52, -0.42);
    cornerShape.lineTo(0.54, 0.22);
    cornerShape.lineTo(0.04, 0.06);
    cornerShape.lineTo(0, -0.45);
    const cornerGeo = new THREE.ExtrudeGeometry(cornerShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    cornerGeo.translate(0, 0, -0.16);
    const cornerMesh = new THREE.Mesh(cornerGeo, fractureMat);
    cornerMesh.castShadow = !isSoftwareGl;
    shardOrigin = new THREE.Vector3(0.35, -0.52, 0);
    cornerMesh.position.copy(shardOrigin);
    shardOffsetVector = new THREE.Vector3(0.55, -0.25, 0.38);

    geometries.push(tabletGeo, sealBandGeo, cornerGeo);
    heroAssembly.add(tabletMesh, sealBand, cornerMesh);
    detachableShard = cornerMesh;
  }

  heroAssembly.position.y = -0.05;
  root.add(heroAssembly);

  return {
    root,
    detachableShard,
    shardOrigin,
    shardOffsetVector,
    materials,
    geometries,
  };
}

export const Artifact3DStudio: React.FC<Artifact3DStudioProps> = ({
  artifacts,
  activeArtifact,
  audienceMode,
  onSelectArtifact,
}) => {
  const isPublic = audienceMode === 'public';
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [materialMode, setMaterialMode] = useState<MaterialViewMode>('natural');
  const [lightAzimuthDeg, setLightAzimuthDeg] = useState<number>(36);
  const [explodeFracture, setExplodeFracture] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('oblique');
  const [dockExpanded, setDockExpanded] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [isSoftwareRenderer, setIsSoftwareRenderer] = useState<boolean>(false);

  const explodeRef = useRef(explodeFracture);
  explodeRef.current = explodeFracture;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const lightAzimuthRef = useRef(lightAzimuthDeg);
  lightAzimuthRef.current = lightAzimuthDeg;

  const sceneControllerRef = useRef<{
    requestRender: () => void;
    applyPreset: (preset: CameraPreset) => void;
    updateLightAngle: (deg: number) => void;
  } | null>(null);

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    keyLight: THREE.DirectionalLight;
    isSoftwareGl: boolean;
    artifactRoot: THREE.Group | null;
    detachableShard: THREE.Object3D | null;
    shardOrigin: THREE.Vector3;
    shardOffsetVector: THREE.Vector3;
    currentExplodeFactor: number;
    disposables: {
      geometries: THREE.BufferGeometry[];
      materials: THREE.Material[];
      textures: THREE.Texture[];
    };
  } | null>(null);

  // Initialize WebGLRenderer & Scene once on stable mount container
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    // Software WebGL fallback detection
    const gl = renderer.getContext();
    let isSoftwareGl = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rawRenderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(rawRenderer);
    } catch {
      isSoftwareGl = false;
    }
    setIsSoftwareRenderer(isSoftwareGl);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x151a18, 1);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151a18);
    scene.fog = new THREE.Fog(0x151a18, 8, 22);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(2.3, 1.05, 3.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.target.set(0, -0.15, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 9.0;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.update();

    // Museum studio three-point + raking lighting rig
    const hemiLight = new THREE.HemisphereLight(0xaab5b0, 0x201a16, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.35);
    keyLight.position.set(3.2, 2.8, 3.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88a497, 0.7);
    rimLight.position.set(-3.5, 2.2, -3.0);
    scene.add(rimLight);

    // Subtle museum pedestal floor plane
    const floorGeo = new THREE.CircleGeometry(7, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x161c19,
      roughness: 0.94,
      metalness: 0.04,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.64;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    sceneRefs.current = {
      scene,
      renderer,
      camera,
      controls,
      keyLight,
      isSoftwareGl,
      artifactRoot: null,
      detachableShard: null,
      shardOrigin: new THREE.Vector3(),
      shardOffsetVector: new THREE.Vector3(),
      currentExplodeFactor: 0,
      disposables: {
        geometries: [],
        materials: [],
        textures: [],
      },
    };

    let rafId = 0;
    let renderRequested = false;
    let prevTime = performance.now();

    const renderFrame = (now: number) => {
      rafId = 0;
      renderRequested = false;
      const refs = sceneRefs.current;
      if (!refs || renderer.getContext().isContextLost()) return;

      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;

      let needsAnotherFrame = false;

      // Smoothly damp fracture explosion offset
      const targetFactor = explodeRef.current ? 1 : 0;
      if (Math.abs(refs.currentExplodeFactor - targetFactor) > 0.002) {
        refs.currentExplodeFactor = THREE.MathUtils.damp(
          refs.currentExplodeFactor,
          targetFactor,
          7,
          dt
        );
        if (refs.detachableShard) {
          refs.detachableShard.position
            .copy(refs.shardOrigin)
            .addScaledVector(refs.shardOffsetVector, refs.currentExplodeFactor);
        }
        needsAnotherFrame = true;
      }

      controls.autoRotate = autoRotateRef.current;
      controls.autoRotateSpeed = 1.4;
      const controlsMoved = controls.update();
      if (controlsMoved || autoRotateRef.current) {
        needsAnotherFrame = true;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl && typeof (gl as WebGL2RenderingContext).fenceSync === 'function') {
        const gl2 = gl as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl2.flush();
          gl2.deleteSync(sync);
        }
      }

      if (needsAnotherFrame) {
        requestRender();
      }
    };

    const requestRender = () => {
      if (!renderRequested) {
        renderRequested = true;
        prevTime = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const applyPreset = (preset: CameraPreset) => {
      if (preset === 'front') {
        camera.position.set(0, 0.05, 4.15);
        controls.target.set(0, -0.1, 0);
      } else if (preset === 'fracture') {
        camera.position.set(1.75, -0.45, 2.35);
        controls.target.set(0.35, -0.45, 0);
      } else if (preset === 'top') {
        camera.position.set(0, 3.8, 1.35);
        controls.target.set(0, -0.25, 0);
      } else {
        camera.position.set(2.3, 1.05, 3.8);
        controls.target.set(0, -0.15, 0);
      }
      controls.update();
      requestRender();
    };

    const updateLightAngle = (deg: number) => {
      const rad = THREE.MathUtils.degToRad(deg);
      keyLight.position.set(Math.sin(rad) * 4.6, 2.4, Math.cos(rad) * 4.2);
      requestRender();
    };

    sceneControllerRef.current = {
      requestRender,
      applyPreset,
      updateLightAngle,
    };

    controls.addEventListener('change', requestRender);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
      if (rafId) cancelAnimationFrame(rafId);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(300, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      resizeObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      controls.removeEventListener('change', requestRender);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      const refs = sceneRefs.current;
      if (refs) {
        refs.disposables.geometries.forEach((g) => g.dispose());
        refs.disposables.materials.forEach((m) => m.dispose());
        refs.disposables.textures.forEach((t) => t.dispose());
      }
      floorGeo.dispose();
      floorMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      sceneRefs.current = null;
      sceneControllerRef.current = null;
    };
  }, []);

  // Rebuild active artifact 3D assembly cleanly when specimen or material mode changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    // Dispose previous artifact resources
    if (refs.artifactRoot) {
      refs.scene.remove(refs.artifactRoot);
    }
    refs.disposables.geometries.forEach((g) => g.dispose());
    refs.disposables.materials.forEach((m) => m.dispose());
    refs.disposables.textures.forEach((t) => t.dispose());

    const maxAnisotropy = Math.min(8, refs.renderer.capabilities.getMaxAnisotropy());
    const textures = createProceduralSurfaceTextures(activeArtifact, maxAnisotropy);
    const built = buildArtifactGroup(
      activeArtifact,
      textures,
      materialMode,
      refs.isSoftwareGl
    );

    refs.artifactRoot = built.root;
    refs.detachableShard = built.detachableShard;
    refs.shardOrigin = built.shardOrigin;
    refs.shardOffsetVector = built.shardOffsetVector;
    refs.currentExplodeFactor = explodeRef.current ? 1 : 0;
    refs.detachableShard.position
      .copy(refs.shardOrigin)
      .addScaledVector(refs.shardOffsetVector, refs.currentExplodeFactor);

    refs.disposables = {
      geometries: built.geometries,
      materials: built.materials,
      textures: [textures.map, textures.bumpMap],
    };

    refs.scene.add(built.root);
    sceneControllerRef.current?.requestRender();
  }, [activeArtifact, materialMode]);

  useEffect(() => {
    sceneControllerRef.current?.updateLightAngle(lightAzimuthDeg);
  }, [lightAzimuthDeg]);

  useEffect(() => {
    sceneControllerRef.current?.requestRender();
  }, [explodeFracture, autoRotate]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#39443D]">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#F0E8D8]">
            {isPublic ? '3D Artifact Explorer' : '3D Spatial Inspection Studio'}
          </h1>
          <p className="text-xs text-[#A9ADA3] mt-1">
            {isPublic
              ? 'Spin the artifact in 3D, shine angled light across faint carvings, and separate broken fragments'
              : 'Procedural WebGL surface relief, RTI-inspired raking illumination, and fracture displacement modeling'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeArtifact.id}
            onChange={(e) => onSelectArtifact(e.target.value)}
            aria-label="Select artifact for 3D inspection"
            className="h-10 px-3 rounded-md bg-[#1C2420] border border-[#39443D] text-xs text-[#F0E8D8] focus:outline-none focus:border-[#C9A66B]"
          >
            {artifacts.map((art) => (
              <option key={art.id} value={art.id}>
                {isPublic ? art.title : `${art.id} — ${art.title}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setCameraPreset('oblique');
              sceneControllerRef.current?.applyPreset('oblique');
            }}
            className="h-10 px-3.5 rounded-md bg-[#1C2420] border border-[#39443D] hover:border-[#C9A66B] text-xs text-[#F0E8D8] inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C9A66B]" />
            Reset View
          </button>
        </div>
      </div>

      {/* Main 3D Spatial Viewport (Solid HUD dock <= 15%, zero backdrop-filter over canvas) */}
      <div className="relative rounded-lg border border-[#39443D] bg-[#151A18] overflow-hidden">
        {/* Top Metadata Strip (non-overlapping top rail) */}
        <div className="px-4 py-2.5 bg-[#1C2420] border-b border-[#39443D] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-serif text-base font-medium text-[#F0E8D8]">
              {activeArtifact.title}
            </span>
            <span className="font-mono text-[#C9A66B] text-[11px] tabular-nums">
              {activeArtifact.dimensions}
            </span>
            <span className="text-[#A9ADA3] text-[11px]">{activeArtifact.material}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#A9ADA3]">
            <Box className="w-3.5 h-3.5 text-[#C9A66B]" />
            <span>
              {isSoftwareRenderer ? 'Software WebGL Paced' : 'Interactive PBR Studio'}
            </span>
          </div>
        </div>

        {/* 3D Canvas Stage */}
        <div className="relative w-full h-[500px] lg:h-[580px] bg-[#151A18]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {contextLost && (
            <div className="absolute inset-0 bg-[#151A18] flex flex-col items-center justify-center p-6 text-center">
              <p className="font-serif text-xl text-[#F0E8D8]">WebGL Context Interrupted</p>
              <p className="text-xs text-[#A9ADA3] mt-1">
                Graphics context suspended by browser. Switch tabs or reload to restore 3D view.
              </p>
            </div>
          )}

          {/* Subtle top-left camera quick-presets (solid surface, no backdrop-filter) */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {(
              [
                ['oblique', isPublic ? 'Museum Angle' : 'Oblique'],
                ['front', isPublic ? 'Front Face' : 'Ortho Front'],
                ['fracture', isPublic ? 'Broken Edge' : 'Fracture Join'],
                ['top', isPublic ? 'Top View' : 'Top Plan'],
              ] as [CameraPreset, string][]
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCameraPreset(preset);
                  sceneControllerRef.current?.applyPreset(preset);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  cameraPreset === preset
                    ? 'bg-[#C9A66B] border-[#C9A66B] text-[#151A18]'
                    : 'bg-[#1C2420] border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Bottom Control Dock (solid #1C2420, no glass blur over WebGL) */}
        <div className="bg-[#1C2420] border-t border-[#39443D] px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExplodeFracture((prev) => !prev)}
                className={`h-8 px-3 rounded text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${
                  explodeFracture
                    ? 'bg-[#A85D48] border-[#A85D48] text-[#F0E8D8]'
                    : 'bg-[#232C27] border-[#39443D] text-[#F0E8D8] hover:border-[#C9A66B]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {explodeFracture
                  ? isPublic
                    ? 'Reattach Broken Piece'
                    : 'Collapse Fracture Join'
                  : isPublic
                    ? 'Separate Broken Piece'
                    : 'Explode Fracture Vector'}
              </button>

              <button
                type="button"
                onClick={() => setAutoRotate((prev) => !prev)}
                className={`h-8 px-3 rounded text-xs font-medium border transition-colors ${
                  autoRotate
                    ? 'bg-[#C9A66B] border-[#C9A66B] text-[#151A18]'
                    : 'bg-[#232C27] border-[#39443D] text-[#A9ADA3] hover:text-[#F0E8D8]'
                }`}
              >
                {isPublic ? 'Auto-Spin Turntable' : 'Turntable Rotation'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDockExpanded((prev) => !prev)}
              className="text-[11px] font-mono text-[#A9ADA3] hover:text-[#F0E8D8] inline-flex items-center gap-1"
            >
              {dockExpanded ? 'Hide Lighting & Surface' : 'Lighting & Surface'}
              {dockExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {dockExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-[#39443D] grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-[#C9A66B] shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] text-[#A9ADA3] mb-1">
                    <span>
                      {isPublic
                        ? 'Flashlight Angle (Reveals Faint Carvings)'
                        : 'Raking Illumination Azimuth (Virtual RTI)'}
                    </span>
                    <span className="font-mono text-[#C9A66B] tabular-nums">
                      {lightAzimuthDeg > 0 ? `+${lightAzimuthDeg}°` : `${lightAzimuthDeg}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-75}
                    max={75}
                    value={lightAzimuthDeg}
                    onChange={(e) => setLightAzimuthDeg(Number(e.target.value))}
                    className="w-full accent-[#C9A66B]"
                    aria-label="Raking light azimuth"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
                <span className="text-[11px] font-mono text-[#A9ADA3] inline-flex items-center gap-1 mr-1">
                  <Eye className="w-3.5 h-3.5 text-[#C9A66B]" />
                  {isPublic ? 'Surface:' : 'Shader Pass:'}
                </span>
                {(
                  [
                    ['natural', isPublic ? 'Original Stone/Clay' : 'Natural Albedo'],
                    ['rti-specular', isPublic ? 'Carving Depth View' : 'Raking Specular'],
                    ['wireframe', 'Mesh Topology'],
                  ] as [MaterialViewMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMaterialMode(mode)}
                    className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                      materialMode === mode
                        ? 'bg-[#29332E] border-[#C9A66B] text-[#C9A66B] font-medium'
                        : 'bg-[#232C27] border-[#39443D] text-[#A9ADA3] hover:text-[#F0E8D8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
