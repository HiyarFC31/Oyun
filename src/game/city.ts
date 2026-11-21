import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CityTextures } from './textures';
import type { AABBCollider, RampCollider } from './types';

export interface CityData {
  group: THREE.Group;
  colliders: AABBCollider[];
  ramps: RampCollider[];
  roadCoords: number[];
  roadWidth: number;
  playableBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  payNSprayPos: THREE.Vector3;
  missionHubPos: THREE.Vector3;
  weaponShopPos: THREE.Vector3;
  clothingShopPos: THREE.Vector3;
  barberShopPos: THREE.Vector3;
  spawnPoints: {
    player: THREE.Vector3;
    deliveryTargets: THREE.Vector3[];
    gangZones: THREE.Vector3[];
    parkedCars: { x: number; z: number; rotY: number }[];
  };
  minimapBuildings: { x: number; z: number; w: number; d: number; round?: boolean }[];
  mountainPeaks: { x: number; z: number; r: number }[];
  mountainTrail: [number, number][];
  waterMesh: THREE.Mesh;
  roadMaterials: THREE.MeshStandardMaterial[];
  getSurfaceHeight: (x: number, z: number) => number;
}

export const ROAD_COORDS = [-120, -60, 0, 60, 120];
export const ROAD_WIDTH = 16;

export const MOUNTAIN_TRAIL_POINTS: [number, number][] = [
  [0, -128],
  [0, -152],
  [24, -176],
  [30, -206],
  [10, -228],
  [-12, -238],
];

const CLIMBABLE_PEAKS: { x: number; z: number; h: number; sigma: number }[] = [
  // Primary climbable Mount Solaris (North)
  { x: -12, z: -238, h: 52, sigma: 48 },
  { x: -95, z: -222, h: 42, sigma: 44 },
  { x: 75, z: -228, h: 46, sigma: 45 },
  { x: 165, z: -215, h: 44, sigma: 44 },
  // Distant northern alpine backdrop
  { x: -75, z: -335, h: 108, sigma: 68 },
  { x: 38, z: -348, h: 122, sigma: 72 },
  { x: 155, z: -328, h: 102, sigma: 66 },
  // Eastern Canyon Ridge (climbable)
  { x: 228, z: -30, h: 50, sigma: 48 },
  { x: 235, z: 78, h: 46, sigma: 46 },
  { x: 222, z: -132, h: 42, sigma: 44 },
  { x: 335, z: -65, h: 112, sigma: 70 },
  { x: 340, z: 70, h: 116, sigma: 72 },
  // Southern Coastal Hills (climbable)
  { x: 42, z: 228, h: 44, sigma: 46 },
  { x: 145, z: 226, h: 42, sigma: 45 },
  { x: -65, z: 224, h: 36, sigma: 42 },
  { x: -150, z: 245, h: 28, sigma: 38 },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function distToPolyline(px: number, pz: number, pts: [number, number][]): number {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0];
    const az = pts[i][1];
    const bx = pts[i + 1][0];
    const bz = pts[i + 1][1];
    const abx = bx - ax;
    const abz = bz - az;
    const lenSq = abx * abx + abz * abz || 1;
    const t = THREE.MathUtils.clamp(((px - ax) * abx + (pz - az) * abz) / lenSq, 0, 1);
    const cx = ax + abx * t;
    const cz = az + abz * t;
    const d = Math.hypot(px - cx, pz - cz);
    if (d < minD) minD = d;
  }
  return minD;
}

export function getMountainTrailFactor(x: number, z: number): number {
  if (z > -130) return 0;
  const d = distToPolyline(x, z, MOUNTAIN_TRAIL_POINTS);
  return 1 - smoothstep(3.2, 6.2, d);
}

export function getTerrainHeight(x: number, z: number): number {
  const northDist = Math.max(0, -144 - z);
  const eastDist = Math.max(0, x - 144);
  const southDist = Math.max(0, z - 144);
  const edgeDist = Math.max(northDist, eastDist, southDist);
  if (edgeDist <= 0.001) return 0;

  const oceanFade = smoothstep(-176, -112, x);
  const rampMask = smoothstep(0, 28, edgeDist) * oceanFade;
  if (rampMask <= 0.0001) return 0;

  let h = 0;
  for (let i = 0; i < CLIMBABLE_PEAKS.length; i++) {
    const p = CLIMBABLE_PEAKS[i];
    const dx = x - p.x;
    const dz = z - p.z;
    const g = p.h * Math.exp(-(dx * dx + dz * dz) / (2 * p.sigma * p.sigma));
    if (g > h) {
      h = g + h * 0.22;
    } else {
      h += g * 0.22;
    }
  }

  // Natural rocky ridges (damped on the dirt mountain trail so driving up is smooth)
  const trail = getMountainTrailFactor(x, z);
  const ridgeNoise =
    (Math.sin(x * 0.045 + z * 0.032) * 2.4 + Math.cos(x * 0.09 - z * 0.075) * 1.1) *
    (1 - trail * 0.88);

  let rawH = Math.max(0, h + ridgeNoise * smoothstep(8, 36, edgeDist));

  // Flatten a scenic summit plateau around Mount Solaris Overlook (-12, -238)
  const dSummit = Math.hypot(x - -12, z - -238);
  if (dSummit < 14) {
    const platBlend = 1 - smoothstep(7, 14, dSummit);
    rawH = THREE.MathUtils.lerp(rawH, 49.5, platBlend);
  }

  return rawH * rampMask;
}

function createChamferedPrismGeo(w: number, d: number, h: number, bevel: number): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const c = Math.min(bevel, hw * 0.4, hd * 0.4);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildCity(textures: CityTextures): CityData {
  const group = new THREE.Group();
  const colliders: AABBCollider[] = [];
  const ramps: RampCollider[] = [];
  const minimapBuildings: { x: number; z: number; w: number; d: number; round?: boolean }[] = [];

  // 1. Extended Ground Base
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({ color: 0x262925, roughness: 0.95, metalness: 0.0 }),
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.y = -0.14;
  baseGround.receiveShadow = true;
  group.add(baseGround);

  // 2. Coastal Beach Sand Strip (West side x < -128)
  const sandMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(78, 900),
    new THREE.MeshStandardMaterial({
      map: textures.sand,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );
  sandMesh.rotation.x = -Math.PI / 2;
  sandMesh.position.set(-167, -0.05, 0);
  sandMesh.receiveShadow = true;
  group.add(sandMesh);

  // Coastal Promenade Curb Wall separating avenues from the beach
  const seawall = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.55, 300),
    new THREE.MeshStandardMaterial({ color: 0xb6aba0, roughness: 0.8 }),
  );
  seawall.position.set(-130, 0.15, 0);
  seawall.receiveShadow = true;
  group.add(seawall);

  // 3. Animated Sunset Ocean with Vertex Swells, Fresnel Depth & Shoreline Surf Foam
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0b3a59,
    roughness: 0.07,
    metalness: 0.65,
    normalMap: textures.waterNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    envMapIntensity: 2.35,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSunDir = { value: new THREE.Vector3(-0.78, 0.24, -0.48).normalize() };
    waterMat.userData.shader = shader;

    shader.vertexShader =
      `uniform float uTime;\nvarying vec3 vWaterWorldPos;\n` +
      shader.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           vec4 wpNorm = modelMatrix * vec4(position, 1.0);
           float shoreDampN = 1.0 - smoothstep(-226.0, -196.0, wpNorm.x);
           float dHx = cos(wpNorm.x * 0.11 + uTime * 1.35) * 0.11 * 0.28 + cos((wpNorm.x * 0.07 + wpNorm.z * 0.09) + uTime * 1.05) * 0.07 * 0.2;
           float dHz = cos((wpNorm.x * 0.07 + wpNorm.z * 0.09) + uTime * 1.05) * 0.09 * 0.2 - sin(wpNorm.z * 0.14 - uTime * 1.6) * 0.14 * 0.12;
           objectNormal = normalize(vec3(-dHx * shoreDampN, dHz * shoreDampN, 1.0));`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 wpPos = modelMatrix * vec4(transformed, 1.0);
           float shoreDamp = 1.0 - smoothstep(-226.0, -196.0, wpPos.x);
           float wave1 = sin(wpPos.x * 0.11 + uTime * 1.35) * 0.28;
           float wave2 = sin(wpPos.x * 0.07 + wpPos.z * 0.09 + uTime * 1.05) * 0.2;
           float wave3 = cos(wpPos.z * 0.14 - uTime * 1.6) * 0.12;
           transformed.z += (wave1 + wave2 + wave3) * shoreDamp;
           vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );

    shader.fragmentShader =
      `uniform float uTime;\nuniform vec3 uSunDir;\nvarying vec3 vWaterWorldPos;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float shallowFactor = smoothstep(-245.0, -196.0, vWaterWorldPos.x);
           vec3 deepSea = vec3(0.025, 0.13, 0.24);
           vec3 shallowTeal = vec3(0.06, 0.34, 0.38);
           diffuseColor.rgb = mix(deepSea, shallowTeal, shallowFactor * 0.85);`,
        )
        .replace(
          '#include <opaque_fragment>',
          `// Shimmering sunset sun-path sparkles + animated shoreline surf foam in linear HDR space
           vec3 viewVecW = normalize(cameraPosition - vWaterWorldPos);
           vec3 rippleN = normalize(vec3(
             sin(vWaterWorldPos.x * 0.45 + uTime * 2.1) * 0.14 + cos(vWaterWorldPos.z * 0.62 - uTime * 1.7) * 0.1,
             1.0,
             cos(vWaterWorldPos.z * 0.52 + uTime * 1.9) * 0.14 - sin(vWaterWorldPos.x * 0.38 + uTime * 1.5) * 0.1
           ));
           vec3 reflDir = reflect(-viewVecW, rippleN);
           float sunGlint = pow(max(dot(reflDir, normalize(uSunDir)), 0.0), 48.0);
           outgoingLight += vec3(1.85, 1.02, 0.48) * sunGlint * 0.95;

           float distShore = max(0.0, -vWaterWorldPos.x - 195.5);
           float surfWave = sin(distShore * 1.45 - uTime * 2.4 + sin(vWaterWorldPos.z * 0.08) * 1.8);
           float foamMask = (1.0 - smoothstep(0.0, 9.5, distShore)) * smoothstep(0.32, 0.85, surfWave);
           float edgeFoam = (1.0 - smoothstep(0.0, 2.4, distShore)) * 0.72;
           outgoingLight = mix(outgoingLight, vec3(0.88, 0.82, 0.74), clamp(foamMask * 0.68 + edgeFoam, 0.0, 0.88));
           #include <opaque_fragment>`,
        );
  };
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 1400, 40, 64), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(-496, -0.22, 0);
  group.add(waterMesh);

  const foamStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 900),
    new THREE.MeshBasicMaterial({
      color: 0xf7ebdc,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  foamStrip.rotation.x = -Math.PI / 2;
  foamStrip.position.set(-197, -0.02, 0);
  group.add(foamStrip);

  // Wooden Coastal Pier ("Solaris İskelesi") extending out over the ocean at z = 0
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6c4c36, roughness: 0.88 });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(62, 0.35, 11.5), woodMat);
  pierDeck.position.set(-198, 0.18, 0);
  pierDeck.receiveShadow = true;
  pierDeck.castShadow = true;
  group.add(pierDeck);

  for (let px = -172; px >= -226; px -= 9) {
    [-5.2, 5.2].forEach((pz) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 2.2, 10), woodMat);
      piling.position.set(px, 0.35, pz);
      group.add(piling);
    });
  }
  const pierEndLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff9f1c, emissiveIntensity: 0.9 }),
  );
  pierEndLantern.position.set(-228, 2.3, 0);
  group.add(pierEndLantern);

  // 4. City Asphalt Grid
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    roughnessMap: textures.asphaltRoughness,
    normalMap: textures.asphaltNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.9,
    metalness: 0.08,
  });
  const intMat = new THREE.MeshStandardMaterial({
    map: textures.intersection,
    roughnessMap: textures.asphaltRoughness,
    normalMap: textures.asphaltNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.88,
    metalness: 0.08,
  });

  const segLen = 60 - ROAD_WIDTH; // 44
  const roadGeoNS = new THREE.PlaneGeometry(ROAD_WIDTH, segLen);
  const roadGeoEW = new THREE.PlaneGeometry(ROAD_WIDTH, segLen);
  const intGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_WIDTH);

  for (const rx of ROAD_COORDS) {
    for (const rz of ROAD_COORDS) {
      const tile = new THREE.Mesh(intGeo, intMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(rx, 0.0, rz);
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  for (const rx of ROAD_COORDS) {
    for (let i = 0; i < ROAD_COORDS.length - 1; i++) {
      const midZ = (ROAD_COORDS[i] + ROAD_COORDS[i + 1]) * 0.5;
      const seg = new THREE.Mesh(roadGeoNS, roadMat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(rx, 0.0, midZ);
      seg.receiveShadow = true;
      group.add(seg);
    }
  }

  for (const rz of ROAD_COORDS) {
    for (let i = 0; i < ROAD_COORDS.length - 1; i++) {
      const midX = (ROAD_COORDS[i] + ROAD_COORDS[i + 1]) * 0.5;
      const seg = new THREE.Mesh(roadGeoEW, roadMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = Math.PI / 2;
      seg.position.set(midX, 0.005, rz);
      seg.receiveShadow = true;
      group.add(seg);
    }
  }

  // 5. Sidewalk Blocks + Varied Sculpted Buildings + Normal Relief
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    normalMap: textures.sidewalkNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.86,
    metalness: 0.03,
  });
  const blockSize = 60 - ROAD_WIDTH; // 44
  const sidewalkGeo = createChamferedPrismGeo(blockSize, blockSize, 0.14, 2.2);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2e323e, roughness: 0.78, metalness: 0.15 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0x7b828e, roughness: 0.5, metalness: 0.48 });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x222634, roughness: 0.5, metalness: 0.35 });
  const glassCurtainMat = new THREE.MeshPhysicalMaterial({
    color: 0x223854,
    roughness: 0.08,
    metalness: 0.72,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 2.1,
  });

  let seed = 4217;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const facadeMats = textures.facades.map(
    (facadeSet) =>
      new THREE.MeshStandardMaterial({
        map: facadeSet.map,
        emissiveMap: facadeSet.emissiveMap,
        normalMap: textures.facadeNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: textures.facadeRoughness,
        emissive: 0xffe4c4,
        emissiveIntensity: 0.42,
        roughness: 1.0,
        metalness: 0.22,
        envMapIntensity: 1.75,
      }),
  );

  const palmPositions: { x: number; z: number; scale: number }[] = [];
  const lampPositions: { x: number; z: number; rotY: number }[] = [];

  const payNSprayPos = new THREE.Vector3(90, 0.1, -30);
  const missionHubPos = new THREE.Vector3(-30, 0.21, -20.5);
  const weaponShopPos = new THREE.Vector3(30, 0.1, -15);
  const clothingShopPos = new THREE.Vector3(-90, 0.1, -15);
  const barberShopPos = new THREE.Vector3(-30, 0.1, 15);

  for (let bx = 0; bx < 4; bx++) {
    for (let bz = 0; bz < 4; bz++) {
      const cx = (ROAD_COORDS[bx] + ROAD_COORDS[bx + 1]) * 0.5;
      const cz = (ROAD_COORDS[bz] + ROAD_COORDS[bz + 1]) * 0.5;

      const sw = new THREE.Mesh(sidewalkGeo, sidewalkMat);
      sw.position.set(cx, -0.22, cz);
      sw.receiveShadow = true;
      group.add(sw);

      const lo = blockSize * 0.5 - 1.8;
      lampPositions.push(
        { x: cx - lo, z: cz - lo, rotY: Math.PI * 0.25 },
        { x: cx + lo, z: cz + lo, rotY: -Math.PI * 0.75 },
      );

      // Special Block 1: Central Palm Plaza & Mission Hub (cx=-30, cz=-30)
      if (bx === 1 && bz === 1) {
        const plazaDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(14.5, 15.2, 0.2, 32),
          new THREE.MeshStandardMaterial({ color: 0xc2b2a3, roughness: 0.74 }),
        );
        plazaDisc.position.set(cx, 0.1, cz);
        plazaDisc.receiveShadow = true;
        group.add(plazaDisc);

        const fountainBase = new THREE.Mesh(
          new THREE.CylinderGeometry(4.4, 5.0, 0.85, 28),
          new THREE.MeshStandardMaterial({ color: 0xe6ddd0, roughness: 0.45 }),
        );
        fountainBase.position.set(cx, 0.52, cz);
        fountainBase.castShadow = true;
        fountainBase.receiveShadow = true;
        group.add(fountainBase);

        const fountainTier = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 2.0, 1.9, 20),
          new THREE.MeshStandardMaterial({ color: 0xded4c5, roughness: 0.45 }),
        );
        fountainTier.position.set(cx, 1.35, cz);
        fountainTier.castShadow = true;
        group.add(fountainTier);

        const fountainBowl = new THREE.Mesh(
          new THREE.CylinderGeometry(2.5, 0.8, 0.55, 24),
          new THREE.MeshStandardMaterial({ color: 0xeae1d4, roughness: 0.4 }),
        );
        fountainBowl.position.set(cx, 2.2, cz);
        group.add(fountainBowl);

        const fountainWater = new THREE.Mesh(
          new THREE.CylinderGeometry(3.8, 3.8, 0.9, 24),
          new THREE.MeshPhysicalMaterial({ color: 0x2ec4b6, roughness: 0.08, clearcoat: 1 }),
        );
        fountainWater.position.set(cx, 0.55, cz);
        group.add(fountainWater);

        colliders.push({
          minX: cx - 5.0,
          maxX: cx + 5.0,
          minZ: cz - 5.0,
          maxZ: cz + 5.0,
          height: 2.5,
          label: 'fountain',
        });

        palmPositions.push(
          { x: cx - 15.5, z: cz - 15.5, scale: 1.05 },
          { x: cx + 15.5, z: cz - 15.5, scale: 0.95 },
          { x: cx - 15.5, z: cz + 15.5, scale: 1.1 },
          { x: cx + 15.5, z: cz + 15.5, scale: 1.0 },
        );
        continue;
      }

      // Special Block 2: Pay 'n' Spray Arched Steel Garage (cx=90, cz=-30)
      if (bx === 3 && bz === 1) {
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x252a36, roughness: 0.45, metalness: 0.55 });
        const archRoof = new THREE.Mesh(
          new THREE.CylinderGeometry(9.6, 9.6, 20, 18, 1, false, -Math.PI * 0.5, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.35, metalness: 0.45 }),
        );
        archRoof.rotation.x = Math.PI / 2;
        archRoof.rotation.z = Math.PI / 2;
        archRoof.scale.set(0.55, 1, 1);
        archRoof.position.set(cx, 4.4, cz);
        archRoof.castShadow = true;
        group.add(archRoof);

        const neonTrim = new THREE.Mesh(
          new THREE.TorusGeometry(9.2, 0.18, 8, 22, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 0.85 }),
        );
        neonTrim.scale.set(1, 0.55, 1);
        neonTrim.position.set(cx, 4.4, cz + 10.0);
        group.add(neonTrim);

        const neonTrimBack = neonTrim.clone();
        neonTrimBack.position.z = cz - 10.0;
        group.add(neonTrimBack);

        [
          [-8.6, -8.5],
          [8.6, -8.5],
          [-8.6, 8.5],
          [8.6, 8.5],
        ].forEach(([px, pz]) => {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 4.8, 12), pillarMat);
          p.position.set(cx + px, 2.4, cz + pz);
          p.castShadow = true;
          group.add(p);
          colliders.push({
            minX: cx + px - 0.65,
            maxX: cx + px + 0.65,
            minZ: cz + pz - 0.65,
            maxZ: cz + pz + 0.65,
            height: 5,
          });
        });

        const pad = new THREE.Mesh(
          new THREE.PlaneGeometry(12, 14),
          new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.25 }),
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(cx, 0.11, cz);
        group.add(pad);
        continue;
      }

      // Special Block 3: SOLARIS ARMS Weapon Shop (bx=2, bz=1 -> cx=30, cz=-30)
      if (bx === 2 && bz === 1) {
        const shopMat = new THREE.MeshStandardMaterial({ color: 0x1b1924, roughness: 0.46, metalness: 0.38 });
        const shopBody = new THREE.Mesh(createChamferedPrismGeo(26, 18, 8.2, 1.8), shopMat);
        shopBody.position.set(cx, 0.09, cz - 7);
        shopBody.castShadow = true;
        shopBody.receiveShadow = true;
        group.add(shopBody);

        const shopSign = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 3.5),
          new THREE.MeshBasicMaterial({ map: textures.weaponShopSign }),
        );
        shopSign.position.set(cx, 5.8, cz + 2.2);
        group.add(shopSign);

        const roofSign = new THREE.Mesh(
          new THREE.BoxGeometry(11, 2.2, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff2a55, emissiveIntensity: 0.78 }),
        );
        roofSign.position.set(cx, 9.5, cz - 2);
        group.add(roofSign);

        // Warm illuminated storefront display windows
        const winGlowMat = new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0xff9f1c,
          emissiveIntensity: 0.42,
          roughness: 0.18,
        });
        [-6.4, 6.4].forEach((wx) => {
          const wPane = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.5), winGlowMat);
          wPane.position.set(cx + wx, 1.9, cz + 2.15);
          group.add(wPane);
        });

        const shopAwning = new THREE.Mesh(
          new THREE.BoxGeometry(16.5, 0.36, 3.8),
          new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff2a55, emissiveIntensity: 0.38 }),
        );
        shopAwning.position.set(cx, 3.6, cz + 3.6);
        group.add(shopAwning);

        const shopPad = new THREE.Mesh(
          new THREE.RingGeometry(2.0, 2.6, 28),
          new THREE.MeshBasicMaterial({ color: 0xffbe0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
        );
        shopPad.rotation.x = -Math.PI / 2;
        shopPad.position.set(weaponShopPos.x, 0.12, weaponShopPos.z);
        group.add(shopPad);

        const shopFloor = new THREE.Mesh(
          new THREE.CircleGeometry(2.0, 24),
          new THREE.MeshBasicMaterial({ color: 0xff3d7f, transparent: true, opacity: 0.25 }),
        );
        shopFloor.rotation.x = -Math.PI / 2;
        shopFloor.position.set(weaponShopPos.x, 0.11, weaponShopPos.z);
        group.add(shopFloor);

        colliders.push({
          minX: cx - 13,
          maxX: cx + 13,
          minZ: cz - 16,
          maxZ: cz + 2,
          height: 8.5,
          label: 'weaponShop',
        });
        minimapBuildings.push({ x: cx, z: cz - 7, w: 26, d: 18 });
        palmPositions.push({ x: cx - 16, z: cz + 15, scale: 1.0 }, { x: cx + 16, z: cz + 15, scale: 1.0 });
        continue;
      }

      // Special Block 4: SOLARIS STYLE Clothing Boutique (bx=0, bz=1 -> cx=-90, cz=-30)
      if (bx === 0 && bz === 1) {
        const boutiqueMat = new THREE.MeshStandardMaterial({ color: 0x22172b, roughness: 0.38, metalness: 0.28 });
        const boutiqueBody = new THREE.Mesh(createChamferedPrismGeo(26, 18, 8.0, 1.8), boutiqueMat);
        boutiqueBody.position.set(cx, 0.09, cz - 7);
        boutiqueBody.castShadow = true;
        boutiqueBody.receiveShadow = true;
        group.add(boutiqueBody);

        const boutiqueSign = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 3.5),
          new THREE.MeshBasicMaterial({ map: textures.clothingShopSign }),
        );
        boutiqueSign.position.set(cx, 5.8, cz + 2.2);
        group.add(boutiqueSign);

        const roofSign = new THREE.Mesh(
          new THREE.BoxGeometry(11, 2.0, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xff70a6, emissive: 0xff4d8d, emissiveIntensity: 0.78 }),
        );
        roofSign.position.set(cx, 9.4, cz - 2);
        group.add(roofSign);

        const boutiqueWinMat = new THREE.MeshStandardMaterial({
          color: 0xffb3d1,
          emissive: 0xff70a6,
          emissiveIntensity: 0.45,
          roughness: 0.14,
        });
        [-6.4, 6.4].forEach((wx) => {
          const wPane = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.7), boutiqueWinMat);
          wPane.position.set(cx + wx, 1.95, cz + 2.15);
          group.add(wPane);
        });

        const boutiqueAwning = new THREE.Mesh(
          new THREE.BoxGeometry(16.5, 0.36, 3.8),
          new THREE.MeshStandardMaterial({ color: 0xff70a6, emissive: 0xff4d8d, emissiveIntensity: 0.36 }),
        );
        boutiqueAwning.position.set(cx, 3.65, cz + 3.6);
        group.add(boutiqueAwning);

        const padRing = new THREE.Mesh(
          new THREE.RingGeometry(2.0, 2.6, 28),
          new THREE.MeshBasicMaterial({ color: 0xff70a6, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
        );
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.set(clothingShopPos.x, 0.12, clothingShopPos.z);
        group.add(padRing);

        const padFloor = new THREE.Mesh(
          new THREE.CircleGeometry(2.0, 24),
          new THREE.MeshBasicMaterial({ color: 0xff70a6, transparent: true, opacity: 0.25 }),
        );
        padFloor.rotation.x = -Math.PI / 2;
        padFloor.position.set(clothingShopPos.x, 0.11, clothingShopPos.z);
        group.add(padFloor);

        colliders.push({
          minX: cx - 13,
          maxX: cx + 13,
          minZ: cz - 16,
          maxZ: cz + 2,
          height: 8.4,
          label: 'clothingShop',
        });
        minimapBuildings.push({ x: cx, z: cz - 7, w: 26, d: 18 });
        palmPositions.push({ x: cx - 16, z: cz + 15, scale: 1.0 }, { x: cx + 16, z: cz + 15, scale: 1.0 });
        continue;
      }

      // Special Block 5: SOLARIS CUTS Barber Shop (bx=1, bz=2 -> cx=-30, cz=30, facing North toward Palm Plaza)
      if (bx === 1 && bz === 2) {
        const barberMat = new THREE.MeshStandardMaterial({ color: 0x162030, roughness: 0.42, metalness: 0.35 });
        const barberBody = new THREE.Mesh(createChamferedPrismGeo(26, 18, 7.6, 1.8), barberMat);
        barberBody.position.set(cx, 0.09, cz + 7);
        barberBody.castShadow = true;
        barberBody.receiveShadow = true;
        group.add(barberBody);

        const barberSign = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 3.5),
          new THREE.MeshBasicMaterial({ map: textures.barberShopSign }),
        );
        barberSign.rotation.y = Math.PI;
        barberSign.position.set(cx, 5.6, cz - 2.2);
        group.add(barberSign);

        const roofSign = new THREE.Mesh(
          new THREE.BoxGeometry(11, 2.0, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.78 }),
        );
        roofSign.position.set(cx, 9.0, cz + 2);
        group.add(roofSign);

        const barberWinMat = new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.42,
          roughness: 0.14,
        });
        [-6.4, 6.4].forEach((wx) => {
          const wPane = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.6), barberWinMat);
          wPane.rotation.y = Math.PI;
          wPane.position.set(cx + wx, 1.9, cz - 2.15);
          group.add(wPane);
        });

        const barberAwning = new THREE.Mesh(
          new THREE.BoxGeometry(16.5, 0.36, 3.8),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x38bdf8, emissiveIntensity: 0.35 }),
        );
        barberAwning.position.set(cx, 3.55, cz - 3.6);
        group.add(barberAwning);

        // Classic 3D Red-White-Blue Barber Poles flanking the entrance
        const poleChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
        const poleGlobeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xbae6fd, emissiveIntensity: 0.85 });
        const stripeColors = [0xef4444, 0xf8fafc, 0x2563eb];
        [-3.2, 3.2].forEach((px) => {
          const poleX = cx + px;
          const poleZ = cz - 2.55;
          const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.18, 12), poleChromeMat);
          baseCap.position.set(poleX, 1.25, poleZ);
          const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.18, 12), poleChromeMat);
          topCap.position.set(poleX, 2.65, poleZ);
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), poleGlobeMat);
          globe.position.set(poleX, 2.86, poleZ);
          group.add(baseCap, topCap, globe);
          stripeColors.forEach((sc, si) => {
            const band = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.16, 0.4, 14),
              new THREE.MeshStandardMaterial({ color: sc, emissive: sc, emissiveIntensity: 0.32, roughness: 0.25 }),
            );
            band.position.set(poleX, 1.54 + si * 0.4, poleZ);
            group.add(band);
          });
        });

        const padRing = new THREE.Mesh(
          new THREE.RingGeometry(2.0, 2.6, 28),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
        );
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.set(barberShopPos.x, 0.12, barberShopPos.z);
        group.add(padRing);

        const padFloor = new THREE.Mesh(
          new THREE.CircleGeometry(2.0, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 }),
        );
        padFloor.rotation.x = -Math.PI / 2;
        padFloor.position.set(barberShopPos.x, 0.11, barberShopPos.z);
        group.add(padFloor);

        colliders.push({
          minX: cx - 13,
          maxX: cx + 13,
          minZ: cz - 2,
          maxZ: cz + 16,
          height: 8.0,
          label: 'barberShop',
        });
        minimapBuildings.push({ x: cx, z: cz + 7, w: 26, d: 18 });
        palmPositions.push({ x: cx - 16, z: cz - 15, scale: 1.0 }, { x: cx + 16, z: cz - 15, scale: 1.0 });
        continue;
      }

      // Standard Urban Blocks: Sculpted Architectural Archetypes
      const subLayouts: [number, number, number, number][] =
        rand() > 0.45
          ? [
              [-9.5, -9.5, 16, 16],
              [9.5, -9.5, 16, 16],
              [0, 9.5, 34, 15],
            ]
          : [
              [-9.5, 0, 16, 34],
              [9.5, -8.5, 16, 17],
              [9.5, 9.5, 16, 15],
            ];

      subLayouts.forEach(([ox, oz, bw, bd], bIdx) => {
        const h = 11 + Math.floor(rand() * 26);
        const bMat = facadeMats[Math.floor(rand() * facadeMats.length)];

        const bGroup = new THREE.Group();
        bGroup.position.set(cx + ox, 0.09, cz + oz);

        const archetype = (bx * 3 + bz + bIdx) % 4;
        const isSquareFootprint = Math.abs(bw - bd) < 2.5;

        if (archetype === 1 && isSquareFootprint) {
          // Archetype 1: Curved Cylindrical Glass Curtain-Wall Skyscraper
          const rad = bw * 0.48;
          const podiumH = 4.2;
          const podium = new THREE.Mesh(createChamferedPrismGeo(bw, bd, podiumH, 2.2), bMat);
          podium.castShadow = true;
          podium.receiveShadow = true;
          bGroup.add(podium);

          const tower = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.9, rad, h - podiumH, 24), bMat);
          tower.position.y = podiumH + (h - podiumH) * 0.5;
          tower.castShadow = true;
          tower.receiveShadow = true;
          bGroup.add(tower);

          // Metallic horizontal architectural bands & glass crown
          for (let ry = podiumH + 4; ry < h - 1; ry += 5.5) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.96, rad * 0.96, 0.35, 24), acMat);
            band.position.y = ry;
            bGroup.add(band);
          }
          const crown = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.78, rad * 0.92, 1.8, 24), glassCurtainMat);
          crown.position.y = h + 0.9;
          bGroup.add(crown);

          if (h > 25) {
            const helipad = new THREE.Mesh(
              new THREE.RingGeometry(2.2, 2.7, 20),
              new THREE.MeshBasicMaterial({ color: 0xffbe0b, side: THREE.DoubleSide }),
            );
            helipad.rotation.x = -Math.PI / 2;
            helipad.position.y = h + 1.82;
            bGroup.add(helipad);
          }

          minimapBuildings.push({ x: cx + ox, z: cz + oz, w: bw, d: bd, round: true });
        } else if (archetype === 0) {
          // Archetype 0: Tiered Setback Art-Deco Tower with Spire
          const h1 = h * 0.56;
          const h2 = h * 0.3;
          const h3 = h * 0.14;

          const base = new THREE.Mesh(createChamferedPrismGeo(bw, bd, h1, 1.8), bMat);
          base.castShadow = true;
          base.receiveShadow = true;
          bGroup.add(base);

          const mid = new THREE.Mesh(createChamferedPrismGeo(bw * 0.82, bd * 0.82, h2, 1.5), bMat);
          mid.position.y = h1;
          mid.castShadow = true;
          mid.receiveShadow = true;
          bGroup.add(mid);

          const top = new THREE.Mesh(createChamferedPrismGeo(bw * 0.6, bd * 0.6, h3, 1.2), glassCurtainMat);
          top.position.y = h1 + h2;
          top.castShadow = true;
          bGroup.add(top);

          const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 4.5, 10), acMat);
          spire.position.y = h + 2.25;
          bGroup.add(spire);

          minimapBuildings.push({ x: cx + ox, z: cz + oz, w: bw, d: bd });
        } else {
          // Archetype 2 & 3: Chamfered Tower with Street Awning, Balcony Ledges & Rooftop Penthouse
          const body = new THREE.Mesh(createChamferedPrismGeo(bw, bd, h, 2.0), bMat);
          body.castShadow = true;
          body.receiveShadow = true;
          bGroup.add(body);

          // Ground-floor awning canopy
          const awning = new THREE.Mesh(createChamferedPrismGeo(bw + 1.2, bd + 1.2, 0.32, 2.2), awningMat);
          awning.position.y = 3.6;
          bGroup.add(awning);

          // Chamfered parapet cap & rooftop penthouse
          const cap = new THREE.Mesh(createChamferedPrismGeo(bw + 0.5, bd + 0.5, 0.75, 2.0), roofMat);
          cap.position.y = h;
          bGroup.add(cap);

          const ac = new THREE.Mesh(
            new THREE.CylinderGeometry(bw * 0.18, bw * 0.22, 2.0, 12),
            acMat,
          );
          ac.position.set((rand() - 0.5) * bw * 0.18, h + 1.4, (rand() - 0.5) * bd * 0.18);
          bGroup.add(ac);

          minimapBuildings.push({ x: cx + ox, z: cz + oz, w: bw, d: bd });
        }

        // Subtle neon architectural accent on select towers
        if (rand() > 0.72) {
          const neonColors = [0xff4d6d, 0x00f5d4, 0xffbe0b, 0x72efdd];
          const nc = neonColors[Math.floor(rand() * neonColors.length)];
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(bw * 0.52, 0.72, 0.24),
            new THREE.MeshStandardMaterial({ color: nc, emissive: nc, emissiveIntensity: 0.78 }),
          );
          sign.position.set(0, h + 1.0, bd * 0.36);
          bGroup.add(sign);
        }

        group.add(bGroup);

        colliders.push({
          minX: cx + ox - bw * 0.5,
          maxX: cx + ox + bw * 0.5,
          minZ: cz + oz - bd * 0.5,
          maxZ: cz + oz + bd * 0.5,
          height: h,
        });
      });

      palmPositions.push(
        { x: cx - 19, z: cz, scale: 0.9 + rand() * 0.25 },
        { x: cx + 19, z: cz, scale: 0.9 + rand() * 0.25 },
      );
    }
  }

  // Coastal boardwalk palms & beach umbrellas / boulders
  for (let pz = -130; pz <= 130; pz += 26) {
    palmPositions.push({ x: -133, z: pz, scale: 1.0 + rand() * 0.25 });
  }

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c5752, roughness: 0.9 });
  for (let i = 0; i < 12; i++) {
    const rz = -135 + i * 24 + (rand() - 0.5) * 8;
    if (Math.abs(rz) < 12) continue; // Keep pier entrance clear
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + rand() * 1.4, 1), rockMat);
    rock.scale.set(1.3, 0.65, 1.1);
    rock.position.set(-188 - rand() * 8, 0.12, rz);
    rock.rotation.set(rand(), rand(), rand());
    group.add(rock);
  }

  const umbrellaColors = [0xff4d6d, 0x00b4d8, 0xffbe0b, 0x2ec4b6];
  for (let i = 0; i < 10; i++) {
    const uz = -118 + i * 26;
    if (Math.abs(uz) < 10) continue;
    const ux = -154 - (i % 2) * 9;
    const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), woodMat);
    uPole.position.set(ux, 1.1, uz);
    const uCap = new THREE.Mesh(
      new THREE.ConeGeometry(1.75, 0.65, 12),
      new THREE.MeshStandardMaterial({ color: umbrellaColors[i % umbrellaColors.length], roughness: 0.65 }),
    );
    uCap.position.set(ux, 2.25, uz);
    uCap.castShadow = true;
    group.add(uPole, uCap);
  }

  // 6. Instanced Curved Palm Trees
  const palmCount = palmPositions.length;
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.28, 2.2, 0.05),
    new THREE.Vector3(0.42, 4.5, -0.05),
    new THREE.Vector3(0.18, 6.4, 0),
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 8, 0.25, 8, false);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4d38, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);

  const frondBlades: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 7; f++) {
    const angle = (f / 7) * Math.PI * 2;
    const blade = new THREE.BoxGeometry(0.68, 0.09, 2.85, 1, 1, 4);
    const pos = blade.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const z = pos.getZ(vi);
      const t = (z + 1.425) / 2.85;
      const archY = Math.sin(t * Math.PI * 0.85) * 0.55 - t * t * 0.95;
      const taper = 1 - Math.abs(t - 0.35) * 0.72;
      pos.setX(vi, pos.getX(vi) * Math.max(0.18, taper));
      pos.setY(vi, pos.getY(vi) + archY);
      pos.setZ(vi, z + 1.425);
    }
    blade.computeVertexNormals();
    blade.rotateY(angle);
    blade.translate(0.18, 6.4, 0);
    frondBlades.push(blade);
  }
  const frondGeo = mergeGeometries(frondBlades);
  frondBlades.forEach((b) => b.dispose());
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3b944f, roughness: 0.68 });
  const frondInst = new THREE.InstancedMesh(frondGeo, frondMat, palmCount);
  frondInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const cColor = new THREE.Color();
  palmPositions.forEach((p, idx) => {
    dummy.position.set(p.x, 0.08, p.z);
    dummy.rotation.set((rand() - 0.5) * 0.08, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    frondInst.setMatrixAt(idx, dummy.matrix);

    cColor.setHSL(0.32 + (rand() - 0.5) * 0.04, 0.52, 0.38 + (rand() - 0.5) * 0.08);
    frondInst.setColorAt(idx, cColor);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  frondInst.instanceMatrix.needsUpdate = true;
  if (frondInst.instanceColor) frondInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  frondInst.computeBoundingSphere();
  group.add(trunkInst, frondInst);

  // 7. Instanced Curved Street Lamps + Warm Ground Light Pools
  const lampCount = lampPositions.length;
  const lampCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 4.6, 0),
    new THREE.Vector3(0.45, 5.55, 0),
    new THREE.Vector3(1.15, 5.45, 0),
  ]);
  const poleGeo = new THREE.TubeGeometry(lampCurve, 10, 0.11, 8, false);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x262b36, metalness: 0.78, roughness: 0.28 });
  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);

  const bulbGeo = new THREE.SphereGeometry(0.24, 10, 8);
  bulbGeo.scale(1.4, 0.55, 0.9);
  bulbGeo.translate(1.12, 5.38, 0);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c4,
    emissive: 0xffc864,
    emissiveIntensity: 1.85,
  });
  const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);

  const haloGeoA = new THREE.PlaneGeometry(2.8, 2.8);
  haloGeoA.translate(1.12, 5.32, 0);
  const haloGeoB = new THREE.PlaneGeometry(2.8, 2.8);
  haloGeoB.rotateY(Math.PI / 2);
  haloGeoB.translate(1.12, 5.32, 0);
  const haloGeo = mergeGeometries([haloGeoA, haloGeoB]);
  haloGeoA.dispose();
  haloGeoB.dispose();
  const haloMat = new THREE.MeshBasicMaterial({
    map: textures.lampGlow,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    opacity: 0.38,
  });
  const haloInst = new THREE.InstancedMesh(haloGeo, haloMat, lampCount);

  const poolGeo = new THREE.PlaneGeometry(8.8, 8.8);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.translate(1.1, 0.03, 0);
  const poolMat = new THREE.MeshBasicMaterial({
    map: textures.lampGlow,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.26,
  });
  const poolInst = new THREE.InstancedMesh(poolGeo, poolMat, lampCount);

  lampPositions.forEach((lp, idx) => {
    dummy.position.set(lp.x, 0.08, lp.z);
    dummy.rotation.set(0, lp.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(idx, dummy.matrix);
    bulbInst.setMatrixAt(idx, dummy.matrix);
    haloInst.setMatrixAt(idx, dummy.matrix);
    poolInst.setMatrixAt(idx, dummy.matrix);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  haloInst.instanceMatrix.needsUpdate = true;
  poolInst.instanceMatrix.needsUpdate = true;
  poleInst.computeBoundingSphere();
  bulbInst.computeBoundingSphere();
  haloInst.computeBoundingSphere();
  poolInst.computeBoundingSphere();
  group.add(poleInst, bulbInst, haloInst, poolInst);

  // 7b. Cantilevered Traffic Signals at Central Intersections + Road Lane Cat's-Eye Studs
  const signalCoords = [-60, 0, 60];
  const sigPoleMat = new THREE.MeshStandardMaterial({ color: 0x1d212b, metalness: 0.8, roughness: 0.28 });
  const sigHousingMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.5 });
  const greenLedMat = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, emissive: 0x00f5d4, emissiveIntensity: 0.95 });
  const redLedMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff2a55, emissiveIntensity: 0.95 });

  for (const sx of signalCoords) {
    for (const sz of signalCoords) {
      const sg = new THREE.Group();
      sg.position.set(sx + 8.8, 0.08, sz + 8.8);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.8, 8), sigPoleMat);
      mast.position.y = 2.9;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 5.2, 8), sigPoleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-2.5, 5.55, 0);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.36), sigHousingMat);
      box.position.set(-3.8, 5.3, 0);
      const isNSGreen = (sx + sz) % 120 === 0;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), isNSGreen ? greenLedMat : redLedMat);
      led.position.set(-3.8, 5.3, 0.19);
      const ledBack = led.clone();
      ledBack.position.z = -0.19;
      sg.add(mast, arm, box, led, ledBack);
      group.add(sg);
    }
  }

  // Subtle Reflective Cat's-Eye Lane Studs along avenues
  const studPositions: [number, number][] = [];
  for (const r of ROAD_COORDS) {
    for (let s = -108; s <= 108; s += 20) {
      if (Math.abs(Math.abs(s) - 60) < 10 || Math.abs(s) < 10 || Math.abs(Math.abs(s) - 120) < 10) continue;
      studPositions.push([r, s], [s, r]);
    }
  }
  const studGeo = new THREE.BoxGeometry(0.2, 0.04, 0.2);
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xd4a24e,
    emissive: 0xaa6c1e,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  });
  const studInst = new THREE.InstancedMesh(studGeo, studMat, studPositions.length);
  studPositions.forEach(([px, pz], idx) => {
    dummy.position.set(px, 0.02, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    studInst.setMatrixAt(idx, dummy.matrix);
  });
  studInst.instanceMatrix.needsUpdate = true;
  studInst.computeBoundingSphere();
  group.add(studInst);

  // 7c. Instanced Urban Fire Hydrants & Coastal Boardwalk Benches
  const hydrantPositions: [number, number][] = [];
  for (let bx = 0; bx < 4; bx++) {
    for (let bz = 0; bz < 4; bz++) {
      const hcx = (ROAD_COORDS[bx] + ROAD_COORDS[bx + 1]) * 0.5;
      const hcz = (ROAD_COORDS[bz] + ROAD_COORDS[bz + 1]) * 0.5;
      hydrantPositions.push([hcx - 19.6, hcz + 14.5], [hcx + 19.6, hcz - 14.5]);
    }
  }
  const hydBody = new THREE.CylinderGeometry(0.16, 0.18, 0.62, 10);
  hydBody.translate(0, 0.31, 0);
  const hydCap = new THREE.SphereGeometry(0.16, 10, 8);
  hydCap.translate(0, 0.64, 0);
  const hydNozzle = new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8);
  hydNozzle.rotateZ(Math.PI / 2);
  hydNozzle.translate(0, 0.44, 0);
  const hydGeo = mergeGeometries([hydBody, hydCap, hydNozzle]);
  hydBody.dispose();
  hydCap.dispose();
  hydNozzle.dispose();
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.36, metalness: 0.42 });
  const hydInst = new THREE.InstancedMesh(hydGeo, hydMat, hydrantPositions.length);
  hydrantPositions.forEach(([hx, hz], idx) => {
    dummy.position.set(hx, 0.08, hz);
    dummy.rotation.set(0, (idx % 4) * (Math.PI * 0.5), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    hydInst.setMatrixAt(idx, dummy.matrix);
  });
  hydInst.instanceMatrix.needsUpdate = true;
  hydInst.computeBoundingSphere();
  group.add(hydInst);

  // Coastal boardwalk wooden benches facing sunset ocean
  const benchPositions: [number, number][] = [];
  for (let bz = -114; bz <= 114; bz += 38) {
    if (Math.abs(bz) < 16) continue;
    benchPositions.push([-132.4, bz]);
  }
  if (benchPositions.length > 0) {
    const bSeat = new THREE.BoxGeometry(0.55, 0.08, 2.1);
    bSeat.translate(0, 0.46, 0);
    const bBack = new THREE.BoxGeometry(0.08, 0.46, 2.1);
    bBack.translate(0.24, 0.72, 0);
    const bLeg1 = new THREE.BoxGeometry(0.48, 0.44, 0.09);
    bLeg1.translate(0, 0.22, -0.82);
    const bLeg2 = new THREE.BoxGeometry(0.48, 0.44, 0.09);
    bLeg2.translate(0, 0.22, 0.82);
    const benchGeo = mergeGeometries([bSeat, bBack, bLeg1, bLeg2]);
    bSeat.dispose();
    bBack.dispose();
    bLeg1.dispose();
    bLeg2.dispose();
    const benchInst = new THREE.InstancedMesh(benchGeo, woodMat, benchPositions.length);
    benchPositions.forEach(([bx, bz], idx) => {
      dummy.position.set(bx, 0.08, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      benchInst.setMatrixAt(idx, dummy.matrix);
    });
    benchInst.instanceMatrix.needsUpdate = true;
    benchInst.computeBoundingSphere();
    group.add(benchInst);
  }

  // 8. Stunt Jump Ramps
  const rampSpecs: { x: number; z: number; rotY: number; dirX: number; dirZ: number }[] = [
    { x: 0, z: -26, rotY: 0, dirX: 0, dirZ: 1 },
    { x: -120, z: 30, rotY: Math.PI, dirX: 0, dirZ: -1 },
    { x: 30, z: 60, rotY: Math.PI / 2, dirX: 1, dirZ: 0 },
    { x: -30, z: -120, rotY: -Math.PI / 2, dirX: -1, dirZ: 0 },
  ];
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xe67600,
    roughness: 0.5,
    metalness: 0.22,
  });
  const stripeRampMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff9f1c,
    emissiveIntensity: 0.22,
    roughness: 0.4,
  });

  rampSpecs.forEach((rs) => {
    const rShape = new THREE.Shape();
    rShape.moveTo(0, 0);
    rShape.lineTo(7.5, 0);
    rShape.lineTo(7.5, 2.3);
    rShape.closePath();
    const rGeo = new THREE.ExtrudeGeometry(rShape, {
      depth: 4.4,
      bevelEnabled: false,
    });
    rGeo.translate(-3.75, 0, -2.2);
    rGeo.rotateY(-Math.PI / 2);

    const rMesh = new THREE.Mesh(rGeo, rampMat);
    rMesh.position.set(rs.x, 0.01, rs.z);
    rMesh.rotation.y = rs.rotY;
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    group.add(rMesh);

    const lip = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.14, 0.6), stripeRampMat);
    lip.position.set(rs.x + rs.dirX * 3.4, 2.26, rs.z + rs.dirZ * 3.4);
    lip.rotation.y = rs.rotY;
    group.add(lip);

    ramps.push({
      x: rs.x,
      z: rs.z,
      width: 4.5,
      length: 7.5,
      height: 2.3,
      dirX: rs.dirX,
      dirZ: rs.dirZ,
    });
  });

  // 9. Continuous Climbable 3D Mountain Terrain + Mount Solaris Dirt Trail + Alpine Pines
  const mountainPeaks: { x: number; z: number; r: number }[] = CLIMBABLE_PEAKS.map((p) => ({
    x: p.x,
    z: p.z,
    r: p.sigma * 1.45,
  }));

  const terrainSize = 760;
  const terrainSegs = 128;
  const terrainMinX = 70 - terrainSize * 0.5; // -310
  const terrainMinZ = -terrainSize * 0.5; // -380
  const terrainStep = terrainSize / terrainSegs;
  const terrainGridStride = terrainSegs + 1;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(70, 0, 0); // covers X in [-310..450], Z in [-380..380]

  const tPos = terrainGeo.attributes.position;
  const tColors = new Float32Array(tPos.count * 3);
  const terrainHeights = new Float32Array(tPos.count);

  const colFoothill = new THREE.Color(0x314a2d); // pine green foothills
  const colRocky = new THREE.Color(0x5b555a);    // rocky mountain slope
  const colPeak = new THREE.Color(0x98887d);     // sunlit granite ridge
  const colTrail = new THREE.Color(0x8d7458);    // packed mountain dirt road
  const colTmp = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const h = getTerrainHeight(vx, vz);

    // Keep flat city basin slightly below baseGround (-0.14) so roads/sidewalks never z-fight
    const vy = h > 0.01 ? h : -0.18;
    tPos.setY(i, vy);
    terrainHeights[i] = vy;

    const trail = getMountainTrailFactor(vx, vz);
    if (h < 18) {
      colTmp.lerpColors(colFoothill, colRocky, THREE.MathUtils.clamp(h / 18, 0, 1));
    } else {
      colTmp.lerpColors(colRocky, colPeak, THREE.MathUtils.clamp((h - 18) / 48, 0, 1));
    }
    if (trail > 0.05) {
      colTmp.lerp(colTrail, trail * 0.85);
    }

    tColors[i * 3] = colTmp.r;
    tColors[i * 3 + 1] = colTmp.g;
    tColors[i * 3 + 2] = colTmp.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainMap,
    normalMap: textures.terrainNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Dirt trail apron connecting North Avenue (z = -128) cleanly onto the mountain slope
  const trailApron = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 20),
    new THREE.MeshStandardMaterial({ color: 0x7d674e, roughness: 0.95 }),
  );
  trailApron.rotation.x = -Math.PI / 2;
  trailApron.position.set(0, 0.015, -138);
  trailApron.receiveShadow = true;
  group.add(trailApron);

  // Wooden Trailhead Signposts ("MOUNT SOLARIS ->")
  [-4.8, 4.8].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 8), woodMat);
    post.position.set(sx, 0.9, -130);
    group.add(post);
  });

  // Scatter Instanced Alpine Pine Trees across mountain slopes (avoiding the dirt trail & summit pad)
  const pinePositions: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < 160 && pinePositions.length < 56; i++) {
    const px = -140 + rand() * 410;
    const pz = -295 + rand() * 555;
    const py = getTerrainHeight(px, pz);
    if (py > 2.2 && py < 34 && getMountainTrailFactor(px, pz) < 0.2 && Math.hypot(px + 12, pz + 238) > 13) {
      pinePositions.push({ x: px, y: py, z: pz, s: 0.8 + rand() * 0.65 });
    }
  }
  if (pinePositions.length > 0) {
    const pTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 6);
    pTrunkGeo.translate(0, 1.1, 0);
    const pCone1 = new THREE.ConeGeometry(2.1, 4.4, 7);
    pCone1.translate(0, 3.6, 0);
    const pCone2 = new THREE.ConeGeometry(1.5, 3.5, 7);
    pCone2.translate(0, 5.7, 0);
    const pFoliageGeo = mergeGeometries([pCone1, pCone2]);
    pCone1.dispose();
    pCone2.dispose();

    const pTrunkInst = new THREE.InstancedMesh(pTrunkGeo, woodMat, pinePositions.length);
    const pFolInst = new THREE.InstancedMesh(
      pFoliageGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 }),
      pinePositions.length,
    );
    pFolInst.castShadow = true;

    pinePositions.forEach((pp, idx) => {
      dummy.position.set(pp.x, pp.y - 0.15, pp.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.setScalar(pp.s);
      dummy.updateMatrix();
      pTrunkInst.setMatrixAt(idx, dummy.matrix);
      pFolInst.setMatrixAt(idx, dummy.matrix);
      cColor.setHSL(0.35 + (rand() - 0.5) * 0.05, 0.36 + rand() * 0.14, 0.18 + rand() * 0.1);
      pFolInst.setColorAt(idx, cColor);
    });
    pTrunkInst.instanceMatrix.needsUpdate = true;
    pFolInst.instanceMatrix.needsUpdate = true;
    if (pFolInst.instanceColor) pFolInst.instanceColor.needsUpdate = true;
    pTrunkInst.computeBoundingSphere();
    pFolInst.computeBoundingSphere();
    group.add(pTrunkInst, pFolInst);
  }

  // Mount Solaris Summit Overlook Deck & Radio Transmission Tower (grounded on actual summit height)
  const summitX = -12;
  const summitZ = -238;
  const summitY = getTerrainHeight(summitX, summitZ);

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.2, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x4b4648, roughness: 0.82 }),
  );
  deck.position.set(summitX, summitY + 0.1, summitZ);
  deck.receiveShadow = true;
  group.add(deck);

  const towerGroup = new THREE.Group();
  towerGroup.position.set(summitX - 3.5, summitY + 0.3, summitZ - 3.5);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 1.25, 22, 6),
    new THREE.MeshStandardMaterial({ color: 0x6f7480, metalness: 0.6, roughness: 0.45 }),
  );
  mast.position.y = 11;
  const beaconTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff2a55, emissiveIntensity: 1.0 }),
  );
  beaconTip.position.y = 22.5;
  towerGroup.add(mast, beaconTip);
  group.add(towerGroup);

  const summitDeckTopY = summitY + 0.4;

  const sampleTerrainHeight = (x: number, z: number): number => {
    const gx = (x - terrainMinX) / terrainStep;
    const gz = (z - terrainMinZ) / terrainStep;
    if (gx < 0 || gx >= terrainSegs || gz < 0 || gz >= terrainSegs) {
      return getTerrainHeight(x, z);
    }
    const ix = gx | 0;
    const iz = gz | 0;
    const fx = gx - ix;
    const fz = gz - iz;
    const row0 = iz * terrainGridStride;
    const row1 = row0 + terrainGridStride;
    const h00 = terrainHeights[row0 + ix];
    const h10 = terrainHeights[row0 + ix + 1];
    const h01 = terrainHeights[row1 + ix];
    const h11 = terrainHeights[row1 + ix + 1];

    // Exact barycentric interpolation matching Three.js PlaneGeometry diagonal (a,b,d) / (b,c,d)
    if (fx + fz <= 1) {
      return h00 + fx * (h10 - h00) + fz * (h01 - h00);
    }
    return h11 + (1 - fx) * (h01 - h11) + (1 - fz) * (h10 - h11);
  };

  const getSurfaceHeight = (x: number, z: number): number => {
    const terrainY = sampleTerrainHeight(x, z);

    // Mount Solaris Summit Overlook Deck
    if ((x - summitX) * (x - summitX) + (z - summitZ) * (z - summitZ) <= 9.2 * 9.2) {
      return Math.max(terrainY, summitDeckTopY);
    }

    // Solaris Pier
    if (Math.abs(z) <= 5.75 && x <= -167 && x >= -229) {
      return Math.max(terrainY, 0.355);
    }

    // Coastal seawall curb along beach
    if (Math.abs(x + 130) <= 0.95 && Math.abs(z) <= 150) {
      return Math.max(terrainY, 0.425);
    }

    // Beach sand west of promenade
    if (x < -129.1) {
      return Math.max(terrainY, -0.05);
    }

    // City sidewalks & Central Palm Plaza disc
    let baseY = 0.005;
    if (x >= -120 && x <= 120 && z >= -120 && z <= 120) {
      const bx = Math.floor((x + 120) / 60);
      const bz = Math.floor((z + 120) / 60);
      if (bx >= 0 && bx < 4 && bz >= 0 && bz < 4) {
        const cx = -90 + bx * 60;
        const cz = -90 + bz * 60;
        const ax = Math.abs(x - cx);
        const az = Math.abs(z - cz);
        if (bx === 1 && bz === 1 && ax * ax + az * az <= 15.0 * 15.0) {
          baseY = 0.2;
        } else if (ax <= 22.14 && az <= 22.14 && ax + az <= 42.0) {
          baseY = 0.08;
        }
      }
    }

    return Math.max(terrainY, baseY);
  };

  return {
    group,
    colliders,
    ramps,
    roadCoords: ROAD_COORDS,
    roadWidth: ROAD_WIDTH,
    playableBounds: { minX: -178, maxX: 265, minZ: -275, maxZ: 255 },
    payNSprayPos,
    missionHubPos,
    weaponShopPos,
    clothingShopPos,
    barberShopPos,
    spawnPoints: {
      player: new THREE.Vector3(-16, 0, -14),
      deliveryTargets: [
        new THREE.Vector3(-218, 0.25, 0), // Solaris Pier tip
        new THREE.Vector3(-120, 0.1, 95),
        new THREE.Vector3(120, 0.1, -95),
        new THREE.Vector3(60, 0.1, 120),
      ],
      gangZones: [
        new THREE.Vector3(-156, 0.1, 16), // Coastal boardwalk near pier
        new THREE.Vector3(30, 0.1, 60),   // Open South Avenue (was cramped inside block)
        new THREE.Vector3(-90, 0.1, 120),
        new THREE.Vector3(90, 0.1, 120),
      ],
      parkedCars: [
        { x: -11, z: -18, rotY: 0 },
        { x: -55, z: -16, rotY: Math.PI },
        { x: 55, z: -16, rotY: 0 },
        { x: -115, z: 22, rotY: Math.PI },
        { x: 115, z: -42, rotY: 0 },
        { x: 16, z: 55, rotY: Math.PI / 2 },
        { x: 4, z: -124, rotY: Math.PI }, // Trailhead off-road SUV spot
      ],
    },
    minimapBuildings,
    mountainPeaks,
    mountainTrail: MOUNTAIN_TRAIL_POINTS,
    waterMesh,
    roadMaterials: [roadMat, intMat],
    getSurfaceHeight,
  };
}
