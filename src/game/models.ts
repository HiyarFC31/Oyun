import * as THREE from 'three';
import type { CityTextures } from './textures';
import {
  type BeardStyleId,
  type EquippableWeaponId,
  type HairStyleId,
  HAIR_COLOR_SPECS,
  OUTFIT_SPECS,
  type PlayerAppearance,
  type VehicleType,
  type WeaponId,
} from './types';

export interface PlayerCustomizationRefs {
  jacketMat: THREE.MeshStandardMaterial;
  teeMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  shoeUpperMat: THREE.MeshStandardMaterial;
  soleMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  beardMat: THREE.MeshStandardMaterial;
  sunglassesGroup: THREE.Group;
  hairStyleGroups: Record<HairStyleId, THREE.Group>;
  beardStyleGroups: Record<BeardStyleId, THREE.Group>;
}

export interface VehicleRig {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  glassMesh: THREE.Mesh;
  hitMeshes: THREE.Object3D[];
  wheels: THREE.Group[]; // [FL, FR, RL, RR]
  frontSteerPivots: THREE.Group[]; // [FL, FR]
  brakeLights: THREE.Mesh[];
  headlightCone?: THREE.Mesh;
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  baseColor: THREE.Color;
  halfWidth: number;
  halfLength: number;
}

export type FirearmId = Exclude<WeaponId, 'unarmed' | 'knife'>;

export interface CharacterRig {
  group: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  headGroup: THREE.Group;
  weaponGroup: THREE.Group;
  weaponMeshes: Record<EquippableWeaponId, THREE.Group>;
  torsoMesh: THREE.Mesh;
  customization?: PlayerCustomizationRefs;
}

export interface PoliceHeliRig {
  group: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Group;
  searchlightCone: THREE.Mesh;
  spotTarget: THREE.Mesh;
  beaconRed: THREE.Mesh;
  beaconBlue: THREE.Mesh;
}

// ============================================================================
// SHARED VEHICLE GEOMETRIES & PBR MATERIALS
// ============================================================================
const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 28);
tireGeo.rotateZ(Math.PI / 2);

const sidewallTorusGeo = new THREE.TorusGeometry(0.29, 0.085, 10, 24);
sidewallTorusGeo.rotateY(Math.PI / 2);

const rimBarrelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.22, 20);
rimBarrelGeo.rotateZ(Math.PI / 2);

const rimLipGeo = new THREE.TorusGeometry(0.238, 0.018, 8, 24);
rimLipGeo.rotateY(Math.PI / 2);

const spokeGeo = new THREE.BoxGeometry(0.032, 0.22, 0.034);

const hubGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.27, 14);
hubGeo.rotateZ(Math.PI / 2);

const lugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.275, 6);
lugGeo.rotateZ(Math.PI / 2);

const rotorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 18);
rotorGeo.rotateZ(Math.PI / 2);

const caliperGeo = new THREE.BoxGeometry(0.15, 0.12, 0.095);

const wheelArchGeo = new THREE.TorusGeometry(0.465, 0.068, 10, 20, Math.PI);
wheelArchGeo.rotateY(Math.PI / 2);

const tireMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.85,
  metalness: 0.06,
});

const sidewallMat = new THREE.MeshStandardMaterial({
  color: 0x15171c,
  roughness: 0.78,
  metalness: 0.08,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0xeef3f9,
  roughness: 0.1,
  metalness: 0.98,
  envMapIntensity: 1.65,
});

const rotorMat = new THREE.MeshStandardMaterial({
  color: 0x9aa5b5,
  roughness: 0.28,
  metalness: 0.88,
});

const caliperMat = new THREE.MeshStandardMaterial({
  color: 0xe63946,
  roughness: 0.3,
  metalness: 0.5,
});

const chromeMat = new THREE.MeshStandardMaterial({
  color: 0xf4f8fc,
  roughness: 0.08,
  metalness: 0.98,
  envMapIntensity: 1.85,
});

const darkTrimMat = new THREE.MeshStandardMaterial({
  color: 0x171920,
  roughness: 0.52,
  metalness: 0.28,
});

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x102036,
  roughness: 0.03,
  metalness: 0.28,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  transparent: true,
  opacity: 0.78,
  envMapIntensity: 2.25,
});

function createWheelAssembly(textures?: CityTextures): THREE.Group {
  const wheel = new THREE.Group();

  if (textures?.tireTread) {
    if (tireMat.map !== textures.tireTread) {
      tireMat.map = textures.tireTread;
      tireMat.needsUpdate = true;
    }
  } else if (tireMat.color.getHex() !== 0x15161a) {
    tireMat.color.setHex(0x15161a);
  }

  const tire = new THREE.Mesh(tireGeo, tireMat);
  wheel.add(tire);

  [-0.092, 0.092].forEach((sx) => {
    const sw = new THREE.Mesh(sidewallTorusGeo, sidewallMat);
    sw.position.x = sx;
    wheel.add(sw);
  });

  const rim = new THREE.Mesh(rimBarrelGeo, darkTrimMat);
  wheel.add(rim);

  [-0.125, 0.125].forEach((lx) => {
    const lip = new THREE.Mesh(rimLipGeo, rimMat);
    lip.position.x = lx;
    wheel.add(lip);
  });

  const rotor = new THREE.Mesh(rotorGeo, rotorMat);
  wheel.add(rotor);

  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0, 0.115, -0.075);
  wheel.add(caliper);

  // 5-spoke split Y alloy rim (both outer & inner face)
  for (let s = 0; s < 5; s++) {
    const baseAngle = (s / 5) * Math.PI * 2;
    [-0.11, 0.11].forEach((sx) => {
      [-0.12, 0.12].forEach((spread) => {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        const a = baseAngle + spread;
        spoke.position.set(sx, Math.cos(a) * 0.125, Math.sin(a) * 0.125);
        spoke.rotation.x = a;
        wheel.add(spoke);
      });
    });
  }

  const hub = new THREE.Mesh(hubGeo, chromeMat);
  wheel.add(hub);

  for (let l = 0; l < 5; l++) {
    const a = (l / 5) * Math.PI * 2;
    const lug = new THREE.Mesh(lugGeo, darkTrimMat);
    lug.position.set(0, Math.cos(a) * 0.042, Math.sin(a) * 0.042);
    wheel.add(lug);
  }

  return wheel;
}

function createExtrudedChassis(type: VehicleType, halfW: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (type === 'sports') {
    shape.moveTo(-2.28, 0.24);
    shape.lineTo(2.32, 0.24);
    shape.lineTo(2.42, 0.48);
    shape.lineTo(1.88, 0.72);
    shape.lineTo(0.88, 0.84);
    shape.lineTo(0.14, 1.24);
    shape.lineTo(-1.12, 1.22);
    shape.lineTo(-1.98, 0.88);
    shape.lineTo(-2.34, 0.8);
    shape.closePath();
  } else if (type === 'suv') {
    shape.moveTo(-2.36, 0.32);
    shape.lineTo(2.36, 0.32);
    shape.lineTo(2.42, 0.94);
    shape.lineTo(1.42, 1.04);
    shape.lineTo(0.86, 1.62);
    shape.lineTo(-2.08, 1.6);
    shape.lineTo(-2.36, 1.02);
    shape.closePath();
  } else if (type === 'muscle') {
    shape.moveTo(-2.36, 0.28);
    shape.lineTo(2.36, 0.28);
    shape.lineTo(2.44, 0.76);
    shape.lineTo(1.16, 0.88);
    shape.lineTo(0.42, 1.31);
    shape.lineTo(-1.18, 1.31);
    shape.lineTo(-1.86, 0.9);
    shape.lineTo(-2.36, 0.84);
    shape.closePath();
  } else {
    shape.moveTo(-2.32, 0.28);
    shape.lineTo(2.32, 0.28);
    shape.lineTo(2.38, 0.72);
    shape.lineTo(1.28, 0.84);
    shape.lineTo(0.62, 1.33);
    shape.lineTo(-1.04, 1.33);
    shape.lineTo(-1.76, 0.88);
    shape.lineTo(-2.34, 0.8);
    shape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: halfW * 2 - 0.18,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -(halfW - 0.09));
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createExtrudedGreenhouse(type: VehicleType, halfW: number): THREE.ExtrudeGeometry {
  // Sloped windshield + side glass matching body rake (no boxy cube glass)
  const gShape = new THREE.Shape();
  if (type === 'sports') {
    gShape.moveTo(-1.68, 0.84);
    gShape.lineTo(1.06, 0.84);
    gShape.lineTo(0.22, 1.2);
    gShape.lineTo(-1.06, 1.19);
    gShape.closePath();
  } else if (type === 'suv') {
    gShape.moveTo(-2.05, 1.02);
    gShape.lineTo(1.36, 1.02);
    gShape.lineTo(0.84, 1.56);
    gShape.lineTo(-1.92, 1.54);
    gShape.closePath();
  } else if (type === 'muscle') {
    gShape.moveTo(-1.68, 0.88);
    gShape.lineTo(1.12, 0.88);
    gShape.lineTo(0.42, 1.27);
    gShape.lineTo(-1.12, 1.27);
    gShape.closePath();
  } else {
    gShape.moveTo(-1.64, 0.85);
    gShape.lineTo(1.2, 0.85);
    gShape.lineTo(0.6, 1.29);
    gShape.lineTo(-0.98, 1.29);
    gShape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(gShape, {
    depth: halfW * 1.84,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -halfW * 0.92);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createVehicleMesh(
  type: VehicleType,
  colorHex: number,
  shadowTex: THREE.Texture,
  headlightTex?: THREE.Texture,
  textures?: CityTextures,
): VehicleRig {
  const group = new THREE.Group();
  const halfWidth = type === 'suv' ? 1.06 : 0.98;
  const halfLength = type === 'sports' ? 2.4 : 2.42;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.11,
    metalness: 0.82,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.25,
  });

  // 1. Primary sculpted body & undercarriage pan
  const chassisGeo = createExtrudedChassis(type, halfWidth);
  const bodyMesh = new THREE.Mesh(chassisGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const underTray = new THREE.Mesh(
    new THREE.BoxGeometry(halfWidth * 1.72, 0.08, halfLength * 1.86),
    darkTrimMat,
  );
  underTray.position.set(0, 0.24, 0);
  group.add(underTray);

  // 2. Aerodynamic Sloped Cabin Greenhouse Glass + Dark Interior Cockpit, Steering Wheel, Gauges, Pillars & Headrests
  const glassMesh = new THREE.Mesh(createExtrudedGreenhouse(type, halfWidth), glassMat);
  group.add(glassMesh);

  const hitMeshes: THREE.Object3D[] = [bodyMesh, glassMesh];

  const cabinTopY = type === 'suv' ? 1.54 : type === 'sports' ? 1.18 : 1.27;
  const interiorDash = new THREE.Mesh(
    new THREE.BoxGeometry(halfWidth * 1.48, 0.16, 0.42),
    darkTrimMat,
  );
  interiorDash.position.set(0, 0.88, 0.56);
  group.add(interiorDash);

  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 16), darkTrimMat);
  steerWheel.rotation.x = 0.45;
  steerWheel.position.set(-0.36, 0.99, 0.36);
  group.add(steerWheel);

  const gaugeGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.055, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x38bdf8, emissiveIntensity: 0.55 }),
  );
  gaugeGlow.position.set(-0.36, 0.96, 0.48);
  group.add(gaugeGlow);

  // Windshield wiper blades
  [-0.28, 0.28].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.018), darkTrimMat);
    wiper.position.set(wx, type === 'suv' ? 1.04 : 0.88, type === 'suv' ? 1.32 : 1.08);
    wiper.rotation.z = 0.06;
    group.add(wiper);
  });

  // Front & rear seat headrests visible through greenhouse glass
  [-0.36, 0.36].forEach((hx) => {
    const frontHeadrest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.14), darkTrimMat);
    frontHeadrest.position.set(hx, cabinTopY - 0.24, -0.06);
    frontHeadrest.rotation.x = -0.14;
    group.add(frontHeadrest);

    const rearHeadrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.12), darkTrimMat);
    rearHeadrest.position.set(hx, cabinTopY - 0.26, -0.78);
    group.add(rearHeadrest);
  });

  // B-Pillar & C-Pillar window divider frames on left/right sides
  [-halfWidth * 0.92, halfWidth * 0.92].forEach((px) => {
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.11), darkTrimMat);
    bPillar.position.set(px, cabinTopY - 0.2, -0.12);
    group.add(bPillar);
  });

  // 3. Role-Specific Liveries, Hood Scoops, Vents & Racing Stripes
  if (type === 'police') {
    const doorGeo = new THREE.BoxGeometry(halfWidth * 2 + 0.04, 0.48, 1.66);
    const doorMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6f9,
      roughness: 0.2,
      metalness: 0.18,
      clearcoat: 0.95,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.64, -0.05);
    group.add(door);
    hitMeshes.push(door);

    // Gold 5-point Police Star Badges + side belt stripe
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xffc83d,
      metalness: 0.9,
      roughness: 0.2,
    });
    [-halfWidth - 0.025, halfWidth + 0.025].forEach((bx) => {
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 5), badgeMat);
      badge.rotation.z = Math.PI / 2;
      badge.position.set(bx, 0.66, 0.12);
      group.add(badge);
    });
  } else if (type === 'taxi') {
    // Signature checkered yellow/black side trim along doors
    const checkMat = new THREE.MeshStandardMaterial({ color: 0x16181f, roughness: 0.4 });
    [-halfWidth - 0.015, halfWidth + 0.015].forEach((tx) => {
      for (let c = 0; c < 6; c++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.065, 0.14), checkMat);
        sq.position.set(tx, c % 2 === 0 ? 0.68 : 0.615, -0.58 + c * 0.18);
        group.add(sq);
      }
    });
  } else if (type === 'muscle' || type === 'sports') {
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.24,
      metalness: 0.16,
    });
    // Dual racing stripes across hood, roof & decklid
    [-0.18, 0.18].forEach((sx) => {
      const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 1.45), stripeMat);
      hoodStripe.position.set(sx, type === 'sports' ? 0.8 : 0.87, 1.48);
      hoodStripe.rotation.x = type === 'sports' ? 0.13 : 0.07;
      group.add(hoodStripe);

      const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 1.38), stripeMat);
      roofStripe.position.set(sx, type === 'sports' ? 1.27 : 1.35, -0.45);
      group.add(roofStripe);
    });

    if (type === 'muscle') {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.11, 0.88), darkTrimMat);
      scoop.position.set(0, 0.93, 1.35);
      group.add(scoop);

      const intakeGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.055, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xb81d2c, emissive: 0x700b14, emissiveIntensity: 0.6 }),
      );
      intakeGlow.position.set(0, 0.94, 1.79);
      group.add(intakeGlow);

      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 1.9, 0.1, 0.22), paintMat);
      ducktail.position.set(0, 0.92, -halfLength + 0.16);
      ducktail.rotation.x = -0.32;
      group.add(ducktail);
    } else {
      // Sports car hood vents
      [-0.44, 0.44].forEach((vx) => {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.42), darkTrimMat);
        vent.position.set(vx, 0.81, 1.48);
        vent.rotation.x = 0.12;
        group.add(vent);
      });
    }
  }

  // 4. Sculpted Wheel Arch Flares (4 curved fender arches)
  const wheelCoords: [number, number][] = [
    [-halfWidth + 0.04, 1.45],
    [halfWidth - 0.04, 1.45],
    [-halfWidth + 0.04, -1.42],
    [halfWidth - 0.04, -1.42],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const arch = new THREE.Mesh(wheelArchGeo, darkTrimMat);
    arch.position.set(wx + (wx > 0 ? 0.05 : -0.05), 0.38, wz);
    group.add(arch);
  });

  // 5. Rounded Bumpers, Front Aero Splitter, Side Rocker Skirts, Door Handles & Rear Diffuser
  const bumperGeo = new THREE.CylinderGeometry(0.105, 0.105, halfWidth * 1.94, 12);
  bumperGeo.rotateZ(Math.PI / 2);
  const frontBumper = new THREE.Mesh(bumperGeo, type === 'police' || type === 'sports' ? darkTrimMat : chromeMat);
  frontBumper.position.set(0, 0.35, halfLength - 0.02);
  group.add(frontBumper);
  hitMeshes.push(frontBumper);

  const rearBumper = new THREE.Mesh(bumperGeo, type === 'police' || type === 'sports' ? darkTrimMat : chromeMat);
  rearBumper.position.set(0, 0.35, -halfLength + 0.02);
  group.add(rearBumper);
  hitMeshes.push(rearBumper);

  // Lower front aero splitter lip
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 1.92, 0.05, 0.28), darkTrimMat);
  splitter.position.set(0, 0.22, halfLength + 0.02);
  group.add(splitter);

  // Sculpted side rocker skirts + door handles
  const doorHandleOffsets = type === 'sports' || type === 'muscle' ? [0.16] : [0.22, -0.58];
  [-halfWidth, halfWidth].forEach((sx) => {
    const sign = sx > 0 ? 1 : -1;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 2.15), darkTrimMat);
    skirt.position.set(sx + sign * 0.02, 0.23, 0);
    group.add(skirt);

    doorHandleOffsets.forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.032, 0.16), chromeMat);
      handle.position.set(sx + sign * 0.015, 0.78, hz);
      group.add(handle);
    });
  });

  // Rear aero diffuser with vertical fins
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 0.18), darkTrimMat);
  diffuser.position.set(0, 0.24, -halfLength + 0.02);
  group.add(diffuser);
  [-0.4, -0.14, 0.14, 0.4].forEach((fx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.2), darkTrimMat);
    fin.position.set(fx, 0.24, -halfLength);
    group.add(fin);
  });

  // Front & rear Solaris Bay license plates
  const plateMat = textures?.licensePlate
    ? new THREE.MeshStandardMaterial({ map: textures.licensePlate, roughness: 0.38, metalness: 0.12 })
    : new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.4 });
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.03), plateMat);
  frontPlate.position.set(0, 0.36, halfLength + 0.09);
  group.add(frontPlate);
  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.03), plateMat);
  rearPlate.position.set(0, 0.56, -halfLength - 0.01);
  group.add(rearPlate);

  if (type === 'police') {
    const barGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.15, 8);
    barGeo.rotateZ(Math.PI / 2);
    const barTop = new THREE.Mesh(barGeo, darkTrimMat);
    barTop.position.set(0, 0.68, halfLength + 0.1);
    group.add(barTop);
    [-0.4, 0.4].forEach((bx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), darkTrimMat);
      post.position.set(bx, 0.5, halfLength + 0.08);
      group.add(post);
    });
  } else if (type === 'suv') {
    // Aluminum skid plates front & rear
    const skidMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, metalness: 0.8, roughness: 0.32 });
    const frontSkid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.12), skidMat);
    frontSkid.position.set(0, 0.28, halfLength + 0.02);
    const rearSkid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.12), skidMat);
    rearSkid.position.set(0, 0.28, -halfLength - 0.02);
    group.add(frontSkid, rearSkid);
  }

  // 6. Chrome Exhaust Tips (quad on sports, twin on others)
  const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.24, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustXs = type === 'sports' ? [-0.66, -0.5, 0.5, 0.66] : [-0.56, 0.56];
  exhaustXs.forEach((ex) => {
    const exMesh = new THREE.Mesh(exhaustGeo, chromeMat);
    exMesh.position.set(ex, 0.25, -halfLength - 0.03);
    group.add(exMesh);
  });

  // 7. Spoiler / Roof Attachments
  if (type === 'sports') {
    const wingGeo = new THREE.BoxGeometry(halfWidth * 1.98, 0.06, 0.36);
    const wing = new THREE.Mesh(wingGeo, darkTrimMat);
    wing.position.set(0, 1.08, -2.08);
    group.add(wing);

    [-halfWidth * 0.99, halfWidth * 0.99].forEach((epx) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.44), paintMat);
      endplate.position.set(epx, 1.07, -2.08);
      group.add(endplate);
    });

    [-0.65, 0.65].forEach((sx) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), darkTrimMat);
      strut.position.set(sx, 0.94, -2.08);
      group.add(strut);
    });
  } else if (type === 'taxi') {
    const signGeo = new THREE.CapsuleGeometry(0.11, 0.44, 4, 10);
    signGeo.rotateZ(Math.PI / 2);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffb703,
      emissiveIntensity: 1.05,
      roughness: 0.25,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.44, -0.2);
    group.add(sign);
  } else if (type === 'suv') {
    [-0.65, 0.65].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8), darkTrimMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(rx, 1.66, -0.55);
      group.add(rail);
    });
    [-1.25, 0.15].forEach((rz) => {
      const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.32, 8), darkTrimMat);
      crossBar.rotation.z = Math.PI / 2;
      crossBar.position.set(0, 1.66, rz);
      group.add(crossBar);
    });
  }

  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  if (type === 'police') {
    const barY = 1.42;
    const baseBar = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.07, 0.25), darkTrimMat);
    baseBar.position.set(0, barY - 0.03, -0.22);
    group.add(baseBar);

    const centerWhite = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.085, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0x99ccff, emissiveIntensity: 0.45 }),
    );
    centerWhite.position.set(0, barY + 0.02, -0.22);
    group.add(centerWhite);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff2a4b,
      emissive: 0xff1e42,
      emissiveIntensity: 0.35,
      roughness: 0.16,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x2494ff,
      emissive: 0x1e88ff,
      emissiveIntensity: 0.35,
      roughness: 0.16,
    });
    const domeGeo = new THREE.CapsuleGeometry(0.09, 0.32, 4, 10);
    domeGeo.rotateZ(Math.PI / 2);
    sirenRed = new THREE.Mesh(domeGeo, redMat);
    sirenRed.position.set(-0.36, barY + 0.03, -0.22);
    group.add(sirenRed);

    sirenBlue = new THREE.Mesh(domeGeo, blueMat);
    sirenBlue.position.set(0.36, barY + 0.03, -0.22);
    group.add(sirenBlue);
  }

  // 8. Front Grille, Fog Lamps, Side Mirrors, Contoured Headlights & Multi-Element Taillights
  const grilleSurround = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.24, 0.07), type === 'police' ? darkTrimMat : chromeMat);
  grilleSurround.position.set(0, 0.5, halfLength - 0.02);
  group.add(grilleSurround);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.18, 0.09), darkTrimMat);
  grille.position.set(0, 0.5, halfLength);
  group.add(grille);

  [-halfWidth - 0.05, halfWidth + 0.05].forEach((mx) => {
    const sign = mx > 0 ? 1 : -1;
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.05), darkTrimMat);
    stalk.position.set(mx - sign * 0.05, 0.9, 0.62);
    group.add(stalk);

    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 10), paintMat);
    mirror.scale.set(1.25, 0.72, 1.0);
    mirror.position.set(mx, 0.92, 0.61);
    group.add(mirror);
  });

  const hlGeo = new THREE.CapsuleGeometry(0.072, 0.25, 4, 10);
  hlGeo.rotateZ(Math.PI / 2);
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    emissive: 0xffeaa8,
    emissiveIntensity: 3.0,
    roughness: 0.08,
  });
  const amberSignalMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0xff7b00,
    emissiveIntensity: 1.25,
    roughness: 0.14,
  });
  [-0.66, 0.66].forEach((hx) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), darkTrimMat);
    housing.position.set(hx, 0.6, halfLength - 0.04);
    group.add(housing);

    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(hx, 0.6, halfLength - 0.005);
    group.add(hl);

    const turnSig = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), amberSignalMat);
    turnSig.position.set(hx + (hx > 0 ? 0.18 : -0.18), 0.6, halfLength - 0.01);
    group.add(turnSig);

    // Lower bumper fog lamp
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), hlMat);
    fog.rotation.x = Math.PI / 2;
    fog.position.set(hx * 1.05, 0.35, halfLength + 0.04);
    group.add(fog);
  });

  let headlightCone: THREE.Mesh | undefined;
  if (headlightTex) {
    headlightCone = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 13),
      new THREE.MeshBasicMaterial({
        map: headlightTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.34,
      }),
    );
    headlightCone.rotation.x = -Math.PI / 2;
    headlightCone.position.set(0, 0.05, halfLength + 6.4);
    headlightCone.visible = false;
    group.add(headlightCone);
  }

  const brakeLights: THREE.Mesh[] = [];
  [-0.66, 0.66].forEach((tx) => {
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xb81d2c,
      emissive: 0xff2238,
      emissiveIntensity: 1.05,
      roughness: 0.16,
    });
    const tl = new THREE.Mesh(hlGeo, tlMat);
    tl.position.set(tx, 0.66, -halfLength + 0.01);
    group.add(tl);
    brakeLights.push(tl);
  });
  // Sleek LED trunk lightbar strip linking taillights
  const rearBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.032, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x9b1826, emissive: 0xee1c34, emissiveIntensity: 0.85 }),
  );
  rearBar.position.set(0, 0.66, -halfLength + 0.01);
  group.add(rearBar);

  // 9. Four Articulated 5-Spoke Split-Alloy Wheels
  const wheels: THREE.Group[] = [];
  const frontSteerPivots: THREE.Group[] = [];
  wheelCoords.forEach(([wx, wz], idx) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, 0.38, wz);
    const wheel = createWheelAssembly(textures);
    steerPivot.add(wheel);
    group.add(steerPivot);
    wheels.push(wheel);
    if (idx < 2) frontSteerPivots.push(steerPivot);
  });

  // 10. Grounded Contact Shadow Plane
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(halfWidth * 2.55, halfLength * 2.35),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  group.add(shadowPlane);

  return {
    group,
    bodyMesh,
    glassMesh,
    hitMeshes,
    wheels,
    frontSteerPivots,
    brakeLights,
    headlightCone,
    sirenRed,
    sirenBlue,
    baseColor: new THREE.Color(colorHex),
    halfWidth,
    halfLength,
  };
}

// ============================================================================
// REALISTIC ARTICULATED HUMANOID CHARACTERS (FRANK + POLICE + GANG + CIVILIANS)
// ============================================================================
const charThighProfile = [
  new THREE.Vector2(0.0, -0.205),
  new THREE.Vector2(0.07, -0.205),
  new THREE.Vector2(0.075, -0.13),
  new THREE.Vector2(0.092, -0.02),
  new THREE.Vector2(0.104, 0.07),
  new THREE.Vector2(0.102, 0.16),
  new THREE.Vector2(0.094, 0.205),
  new THREE.Vector2(0.0, 0.205),
];
const charThighGeo = new THREE.LatheGeometry(charThighProfile, 18);

const charKneeCapGeo = new THREE.SphereGeometry(0.071, 12, 10);

const charShinProfile = [
  new THREE.Vector2(0.0, -0.19),
  new THREE.Vector2(0.05, -0.19),
  new THREE.Vector2(0.055, -0.11),
  new THREE.Vector2(0.072, -0.01),
  new THREE.Vector2(0.08, 0.065),
  new THREE.Vector2(0.073, 0.145),
  new THREE.Vector2(0.068, 0.19),
  new THREE.Vector2(0.0, 0.19),
];
const charShinGeo = new THREE.LatheGeometry(charShinProfile, 18);
const charPantCuffGeo = new THREE.CylinderGeometry(0.062, 0.068, 0.055, 16);

const charUpperArmProfile = [
  new THREE.Vector2(0.0, -0.13),
  new THREE.Vector2(0.05, -0.13),
  new THREE.Vector2(0.057, -0.06),
  new THREE.Vector2(0.072, 0.025),
  new THREE.Vector2(0.074, 0.085),
  new THREE.Vector2(0.066, 0.13),
  new THREE.Vector2(0.0, 0.13),
];
const charUpperArmGeo = new THREE.LatheGeometry(charUpperArmProfile, 16);

const charElbowCapGeo = new THREE.SphereGeometry(0.051, 10, 10);

const charForeArmProfile = [
  new THREE.Vector2(0.0, -0.125),
  new THREE.Vector2(0.038, -0.125),
  new THREE.Vector2(0.044, -0.055),
  new THREE.Vector2(0.054, 0.025),
  new THREE.Vector2(0.058, 0.08),
  new THREE.Vector2(0.051, 0.125),
  new THREE.Vector2(0.0, 0.125),
];
const charForeArmGeo = new THREE.LatheGeometry(charForeArmProfile, 16);

const charPalmGeo = new THREE.CapsuleGeometry(0.028, 0.028, 6, 10);
const charFingerGeo = new THREE.CapsuleGeometry(0.008, 0.03, 4, 6);
const charThumbGeo = new THREE.CapsuleGeometry(0.011, 0.03, 5, 8);
const charShoulderGeo = new THREE.SphereGeometry(0.088, 14, 12);
const charHeadGeo = new THREE.SphereGeometry(0.146, 32, 24);
const charJawGeo = new THREE.SphereGeometry(0.102, 20, 14);
const charChinGeo = new THREE.SphereGeometry(0.052, 14, 10);
const charBrowGeo = new THREE.CapsuleGeometry(0.011, 0.102, 5, 10);
const charNoseBridgeGeo = new THREE.CapsuleGeometry(0.0115, 0.036, 5, 8);
const charNoseTipGeo = new THREE.SphereGeometry(0.0165, 10, 8);
const charNostrilGeo = new THREE.SphereGeometry(0.0115, 8, 8);
const charEarShellGeo = new THREE.SphereGeometry(0.027, 10, 8);
const charEarHelixGeo = new THREE.TorusGeometry(0.021, 0.006, 6, 12, Math.PI * 1.45);

const charNeckProfile = [
  new THREE.Vector2(0.0, -0.08),
  new THREE.Vector2(0.084, -0.08),
  new THREE.Vector2(0.072, -0.025),
  new THREE.Vector2(0.063, 0.03),
  new THREE.Vector2(0.066, 0.08),
  new THREE.Vector2(0.0, 0.08),
];
const charNeckGeo = new THREE.LatheGeometry(charNeckProfile, 16);

// Sculpted contoured upper torso profile (hip overlap hem -> athletic waist -> chest pectorals -> trapezius shoulders)
const torsoProfile = [
  new THREE.Vector2(0.0, -0.04),
  new THREE.Vector2(0.17, -0.02),
  new THREE.Vector2(0.162, 0.045),
  new THREE.Vector2(0.17, 0.17),
  new THREE.Vector2(0.214, 0.34),
  new THREE.Vector2(0.24, 0.475),
  new THREE.Vector2(0.194, 0.56),
  new THREE.Vector2(0.084, 0.598),
  new THREE.Vector2(0.0, 0.598),
];
const charSculptedTorsoGeo = new THREE.LatheGeometry(torsoProfile, 26);

let _charVariantCounter = 0;

export function createCharacterMesh(
  role: 'player' | 'pedestrian' | 'police' | 'gang' | 'remote',
  shirtColor: number,
  shadowTex: THREE.Texture,
  textures?: CityTextures,
): CharacterRig {
  const variant = _charVariantCounter++;
  const group = new THREE.Group();
  const isCustomizable = role === 'player' || role === 'remote';

  const skinIndex = role === 'player' ? 0 : variant % 4;
  const skinColors = [0xdfa782, 0xcf926a, 0x9a6544, 0xe8baa0];
  const skinBase = skinColors[skinIndex];
  const faceCount = textures?.charFaces.length ?? 0;
  const faceTex = faceCount > 0 ? textures?.charFaces[skinIndex % faceCount] : undefined;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinBase,
    roughness: 0.53,
    metalness: 0.02,
  });

  const headFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: faceTex,
    roughness: 0.52,
    metalness: 0.02,
  });
  if (!faceTex) {
    headFaceMat.color.setHex(skinBase);
  }

  // Frank wears a signature dark leather biker jacket with teal henley tee & dark indigo denim
  const jacketColor =
    role === 'player'
      ? 0x1b202c
      : role === 'police'
        ? 0x182e54
        : role === 'gang'
          ? 0x8a1d32
          : shirtColor;
  const pantsColor =
    role === 'police'
      ? 0x131f33
      : isCustomizable
        ? 0x222b3e
        : variant % 2 === 0
          ? 0x2c3648
          : 0x3a332e;

  const useLeather = role === 'player';
  const jacketMat = new THREE.MeshStandardMaterial({
    color: jacketColor,
    map: useLeather ? textures?.leather : textures?.fabric,
    bumpMap: useLeather ? textures?.leather : textures?.fabric,
    bumpScale: useLeather ? 0.014 : 0.008,
    roughness: useLeather ? 0.34 : 0.68,
    metalness: useLeather ? 0.22 : 0.04,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    map: textures?.denim,
    bumpMap: textures?.denim,
    bumpScale: 0.011,
    roughness: 0.78,
    metalness: 0.03,
  });
  const shoeUpperMat = new THREE.MeshStandardMaterial({
    color: isCustomizable ? 0x1e2028 : role === 'police' ? 0x121318 : variant % 3 === 0 ? 0xd9dce2 : 0x24262e,
    roughness: role === 'police' ? 0.32 : 0.5,
    metalness: 0.14,
  });
  const soleWhiteMat = new THREE.MeshStandardMaterial({
    color: role === 'police' ? 0x16181e : 0xe9ecef,
    roughness: 0.76,
    metalness: 0.04,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    metalness: 0.94,
    roughness: 0.16,
  });

  // 1. Articulated Anatomical 2-Segment Legs (Hip -> Quad Thigh -> Knee -> Calf Shin -> Pant Cuff -> Lace-Up Sneaker/Boot)
  const makeLeg = (offsetX: number): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(offsetX, 0.9, 0);

    const thigh = new THREE.Mesh(charThighGeo, pantsMat);
    thigh.scale.set(1.03, 1, 1.1);
    thigh.position.y = -0.205;
    thigh.castShadow = role === 'player';
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.41, 0);
    hip.add(knee);

    const kneeCap = new THREE.Mesh(charKneeCapGeo, pantsMat);
    kneeCap.scale.set(0.96, 1.0, 1.06);
    knee.add(kneeCap);

    const shin = new THREE.Mesh(charShinGeo, pantsMat);
    shin.scale.set(0.98, 1, 1.08);
    shin.position.set(0, -0.195, -0.004);
    shin.castShadow = role === 'player';
    knee.add(shin);

    const cuff = new THREE.Mesh(charPantCuffGeo, pantsMat);
    cuff.position.y = -0.365;
    knee.add(cuff);

    // Contoured sneaker / tactical boot (outsole, rounded midsole, sculpted vamp, heel stabilizer, padded tongue & laces)
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.44, 0.042);

    const outsole = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.148, 5, 10), darkTrimMat);
    outsole.rotation.x = Math.PI / 2;
    outsole.scale.set(1.06, 1.0, 0.3);
    outsole.position.set(0, -0.04, 0.015);

    const midsole = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.144, 5, 10), soleWhiteMat);
    midsole.rotation.x = Math.PI / 2;
    midsole.scale.set(1.04, 1.0, 0.42);
    midsole.position.set(0, -0.02, 0.015);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.11, 6, 10), shoeUpperMat);
    upper.rotation.x = Math.PI / 2;
    upper.scale.set(1.0, 1.0, 0.72);
    upper.position.set(0, 0.024, -0.01);

    const heelCounter = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.058, 0.068, 12, 1, false, Math.PI * 0.55, Math.PI * 0.9), darkTrimMat);
    heelCounter.position.set(0, 0.028, -0.058);

    const vamp = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), shoeUpperMat);
    vamp.scale.set(0.95, 0.6, 1.48);
    vamp.position.set(0, 0.012, 0.072);

    const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.036, 4, 8), soleWhiteMat);
    tongue.rotation.x = -0.42;
    tongue.scale.set(1.2, 1.0, 0.45);
    tongue.position.set(0, 0.058, 0.036);

    shoe.add(outsole, midsole, upper, heelCounter, vamp, tongue);

    // Subtle lace bars across instep
    [0.04, 0.062, 0.084].forEach((lz, idx) => {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.008, 0.01), soleWhiteMat);
      lace.position.set(0, 0.046 - idx * 0.008, lz);
      shoe.add(lace);
    });

    knee.add(shoe);

    return { hip, knee };
  };

  const leftLegData = makeLeg(-0.122);
  const rightLegData = makeLeg(0.122);
  group.add(leftLegData.hip, rightLegData.hip);

  // Pelvis, Belt & Belt Loops
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.16, 0.17, 18), pantsMat);
  pelvis.scale.set(1.18, 1, 0.78);
  pelvis.position.y = 0.9;
  group.add(pelvis);

  const beltMat = new THREE.MeshStandardMaterial({ color: 0x161418, roughness: 0.4, metalness: 0.25 });
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.176, 0.176, 0.056, 18), beltMat);
  belt.scale.set(1.18, 1, 0.8);
  belt.position.y = 0.955;
  group.add(belt);

  [-0.12, 0.12].forEach((lx) => {
    const loop = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.068, 0.022), pantsMat);
    loop.position.set(lx, 0.955, 0.138);
    group.add(loop);
  });

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.052, 0.028), chromeMat);
  buckle.position.set(0, 0.955, 0.145);
  group.add(buckle);

  // 2. Articulated Upper Body (`torsoGroup` pivoted at waist y=0.95)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.95, 0);
  group.add(torsoGroup);

  const torsoMesh = new THREE.Mesh(charSculptedTorsoGeo, jacketMat);
  torsoMesh.scale.set(1.14, 1, 0.72);
  torsoMesh.position.y = 0.0;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // Sculpted shoulder deltoids + subtle pectoral definition
  [-0.242, 0.242].forEach((sx) => {
    const sh = new THREE.Mesh(charShoulderGeo, jacketMat);
    sh.scale.set(1.04, 1.0, 0.92);
    sh.position.set(sx, 0.49, 0);
    torsoGroup.add(sh);
  });

  let playerTeeMat: THREE.MeshStandardMaterial | undefined;

  if (isCustomizable) {
    // Frank & Online Players: open leather biker jacket panels + pocket zips + inner tee + buttons + silver dog tag
    playerTeeMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5c6,
      map: textures?.fabric,
      bumpMap: textures?.fabric,
      bumpScale: 0.006,
      roughness: 0.72,
    });
    const innerTee = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.098, 0.56, 16), playerTeeMat);
    innerTee.scale.set(0.95, 1, 0.56);
    innerTee.position.set(0, 0.28, 0.095);
    torsoGroup.add(innerTee);

    // Henley collar buttons & silver dog tag
    [0.44, 0.49].forEach((by) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 8), chromeMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, 0.16);
      torsoGroup.add(btn);
    });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 6, 14), chromeMat);
    chain.rotation.x = Math.PI / 2 - 0.38;
    chain.position.set(0, 0.525, 0.055);
    torsoGroup.add(chain);

    // Contoured open jacket lapels, metallic zipper trim & angled chest pocket zips
    [-0.082, 0.082].forEach((lx) => {
      const lapel = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.44, 4, 8), jacketMat);
      lapel.scale.set(1.08, 1, 0.65);
      lapel.position.set(lx, 0.29, 0.145);
      lapel.rotation.y = lx > 0 ? -0.22 : 0.22;
      torsoGroup.add(lapel);

      const zipStrip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.45, 0.015), chromeMat);
      zipStrip.position.set(lx * 0.68, 0.27, 0.168);
      torsoGroup.add(zipStrip);

      const chestZip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.016), chromeMat);
      chestZip.position.set(lx * 1.65, 0.39, 0.156);
      chestZip.rotation.z = lx > 0 ? -0.18 : 0.18;
      torsoGroup.add(chestZip);
    });

    // Jacket stand collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.028, 10, 18, Math.PI * 1.45),
      jacketMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 0.28;
    collar.position.set(0, 0.555, 0.005);
    torsoGroup.add(collar);
  } else if (role === 'police') {
    // Police uniform shirt collar, tie, tactical chest pocket flaps, gold badge, radio mic, belt pouches & holster
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.024, 8, 16, Math.PI * 1.6), jacketMat);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 0.2;
    collar.position.set(0, 0.562, 0.005);
    torsoGroup.add(collar);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.34, 0.018), darkTrimMat);
    tie.position.set(0, 0.38, 0.165);
    torsoGroup.add(tie);

    [-0.1, 0.1].forEach((px) => {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.024), jacketMat);
      pocket.position.set(px, 0.39, 0.155);
      torsoGroup.add(pocket);

      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.028, 0.028), jacketMat);
      flap.position.set(px, 0.435, 0.158);
      torsoGroup.add(flap);
    });

    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.022, 6), goldMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0.11, 0.42, 0.175);
    torsoGroup.add(badge);

    const radioMic = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.054, 0.028), darkTrimMat);
    radioMic.position.set(-0.17, 0.49, 0.11);
    torsoGroup.add(radioMic);

    const policeTrimMat = new THREE.MeshStandardMaterial({ color: 0xe5e9f0, roughness: 0.4, metalness: 0.22 });
    [-0.2, 0.2].forEach((ex) => {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.02, 0.055), policeTrimMat);
      ep.position.set(ex, 0.555, 0);
      torsoGroup.add(ep);
    });

    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.1), darkTrimMat);
    holster.position.set(0.21, -0.02, 0.02);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.06), darkTrimMat);
    pouch.position.set(-0.19, 0.03, 0.06);
    torsoGroup.add(holster, pouch);
  } else if (role === 'gang') {
    // Streetwear folded hood collar + kangaroo pocket + drawstrings + gold curb chain
    const hoodFold = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.045, 10, 16), jacketMat);
    hoodFold.rotation.x = Math.PI / 2 + 0.18;
    hoodFold.position.set(0, 0.54, -0.03);
    torsoGroup.add(hoodFold);

    const kangaroo = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.13, 4, 8), jacketMat);
    kangaroo.rotation.z = Math.PI / 2;
    kangaroo.scale.set(1, 1, 0.42);
    kangaroo.position.set(0, 0.14, 0.145);
    torsoGroup.add(kangaroo);

    [-0.035, 0.035].forEach((dx) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), soleWhiteMat);
      cord.position.set(dx, 0.45, 0.155);
      torsoGroup.add(cord);
    });

    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.013, 8, 18), goldMat);
    chain.rotation.x = Math.PI / 2 - 0.32;
    chain.position.set(0, 0.48, 0.08);
    torsoGroup.add(chain);
  } else {
    // Pedestrian casual collar & shirt button placket / overshirt
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 8, 16), jacketMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.56, 0.01);
    torsoGroup.add(collar);

    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.42, 0.015), darkTrimMat);
    placket.position.set(0, 0.34, 0.155);
    torsoGroup.add(placket);
  }

  // 3. Articulated Anatomical 2-Segment Arms (Shoulder -> Bicep -> Elbow -> Forearm -> Cuff/Watch -> 5-Finger Hand)
  const makeArm = (offsetX: number, bareForearm: boolean, isLeft: boolean): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(offsetX, 0.49, 0);

    const upperArm = new THREE.Mesh(charUpperArmGeo, jacketMat);
    upperArm.position.y = -0.13;
    upperArm.castShadow = role === 'player';
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.26, 0);
    shoulder.add(elbow);

    const elbowCap = new THREE.Mesh(charElbowCapGeo, bareForearm ? skinMat : jacketMat);
    elbow.add(elbowCap);

    if (bareForearm) {
      const sleeveCuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12), jacketMat);
      sleeveCuff.rotation.x = Math.PI / 2;
      sleeveCuff.position.y = 0.01;
      elbow.add(sleeveCuff);
    }

    const foreArm = new THREE.Mesh(charForeArmGeo, bareForearm ? skinMat : jacketMat);
    foreArm.position.y = -0.125;
    foreArm.castShadow = role === 'player';
    elbow.add(foreArm);

    // Rolled sleeve cuff + Frank's steel wristwatch with dark dial
    if (isCustomizable && isLeft) {
      const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.024, 14), chromeMat);
      watchBand.position.y = -0.21;
      const watchFace = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 12), darkTrimMat);
      watchFace.rotation.z = Math.PI / 2;
      watchFace.position.set(-0.042, -0.21, 0);
      elbow.add(watchBand, watchFace);
    }

    // Sculpted anatomical palm + 4 curled fingers + opposable thumb
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.258, 0.008);

    const palm = new THREE.Mesh(charPalmGeo, skinMat);
    palm.scale.set(1.0, 1.0, 0.78);
    handGroup.add(palm);

    [-0.019, -0.006, 0.007, 0.019].forEach((fz, fIdx) => {
      const finger = new THREE.Mesh(charFingerGeo, skinMat);
      const lenScale = fIdx === 1 || fIdx === 2 ? 1.05 : fIdx === 0 ? 0.96 : 0.82;
      finger.scale.set(1, lenScale, 1);
      finger.position.set(isLeft ? -0.004 : 0.004, -0.042, fz * 0.9);
      finger.rotation.x = 0.16;
      finger.rotation.z = isLeft ? -0.18 : 0.18;
      handGroup.add(finger);
    });

    const thumb = new THREE.Mesh(charThumbGeo, skinMat);
    thumb.position.set(isLeft ? 0.024 : -0.024, -0.014, 0.032);
    thumb.rotation.x = 0.55;
    thumb.rotation.z = isLeft ? 0.35 : -0.35;
    handGroup.add(thumb);
    elbow.add(handGroup);

    return { shoulder, elbow };
  };

  const bareNPCForearm = (role === 'pedestrian' || role === 'police') && variant % 2 === 0;
  const leftArmData = makeArm(-0.292, bareNPCForearm, true);
  const rightArmData = makeArm(0.292, bareNPCForearm, false);
  torsoGroup.add(leftArmData.shoulder, rightArmData.shoulder);

  // Composite Firearm Models (Pistol, SMG, Shotgun, Rifle) attached to right forearm hand
  const gunSteelMat = new THREE.MeshStandardMaterial({ color: 0x262a34, metalness: 0.88, roughness: 0.24 });
  const gunPolymerMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.78, metalness: 0.12 });
  const gunWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.72, metalness: 0.05 });
  const knifeBladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.14 });

  const buildWeaponModel = (kind: EquippableWeaponId): THREE.Group => {
    const fg = new THREE.Group();
    if (kind === 'knife') {
      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.09, 4, 8), gunPolymerMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, 0.0, 0.0);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.028, 0.016), chromeMat);
      guard.position.set(0, 0.0, 0.06);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.034, 0.2), knifeBladeMat);
      blade.position.set(0, 0.004, 0.165);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.075, 4), knifeBladeMat);
      tip.rotation.x = Math.PI / 2;
      tip.scale.set(0.32, 1, 1);
      tip.position.set(0, 0.004, 0.295);
      fg.add(handle, guard, blade, tip);
    } else if (kind === 'pistol') {
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.28), gunSteelMat);
      slide.position.set(0, 0.02, 0.12);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), chromeMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.022, 0.2);
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.08, 4, 8), gunPolymerMat);
      grip.rotation.x = 0.22;
      grip.position.set(0, -0.05, 0.02);
      fg.add(slide, barrel, grip);
    } else if (kind === 'smg') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.09, 0.36), gunSteelMat);
      receiver.position.set(0, 0.02, 0.14);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), darkTrimMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.022, 0.36);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.18, 0.055), gunPolymerMat);
      mag.rotation.x = -0.15;
      mag.position.set(0, -0.09, 0.18);
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.08, 4, 8), gunPolymerMat);
      grip.rotation.x = 0.2;
      grip.position.set(0, -0.05, 0.02);
      fg.add(receiver, barrel, mag, grip);
    } else if (kind === 'shotgun') {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.28), gunWoodMat);
      stock.position.set(0, -0.01, -0.08);
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.095, 0.28), gunSteelMat);
      receiver.position.set(0, 0.02, 0.14);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.56, 10), gunSteelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.036, 0.44);
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.22, 10), gunWoodMat);
      pump.rotation.x = Math.PI / 2;
      pump.position.set(0, -0.005, 0.4);
      fg.add(stock, receiver, barrel, pump);
    } else {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.24), gunPolymerMat);
      stock.position.set(0, 0.0, -0.09);
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.095, 0.38), gunSteelMat);
      receiver.position.set(0, 0.02, 0.16);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 10), darkTrimMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.024, 0.48);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.18, 10), gunPolymerMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.085, 0.16);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.2, 0.065), gunPolymerMat);
      mag.rotation.x = -0.22;
      mag.position.set(0, -0.1, 0.22);
      fg.add(stock, receiver, barrel, scope, mag);
    }
    return fg;
  };

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.26, 0.08);
  const weaponMeshes: Record<EquippableWeaponId, THREE.Group> = {
    knife: buildWeaponModel('knife'),
    pistol: buildWeaponModel('pistol'),
    smg: buildWeaponModel('smg'),
    shotgun: buildWeaponModel('shotgun'),
    rifle: buildWeaponModel('rifle'),
  };
  (Object.keys(weaponMeshes) as EquippableWeaponId[]).forEach((k) => {
    weaponMeshes[k].visible = k === 'pistol';
    weaponGroup.add(weaponMeshes[k]);
  });
  weaponGroup.visible = role === 'player' || role === 'police' || role === 'gang' || role === 'remote';
  rightArmData.elbow.add(weaponGroup);

  // 4. Anatomically Sculpted Head, Tapered Neck, 512px Face, Smooth Brow, 3-Part Nose, Helix Ears, Layered Hair & Shades
  const neck = new THREE.Mesh(charNeckGeo, skinMat);
  neck.position.set(0, 0.635, -0.005);
  torsoGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.785, 0.008);

  const cranium = new THREE.Mesh(charHeadGeo, headFaceMat);
  cranium.scale.set(0.91, 1.05, 0.96);
  cranium.rotation.y = -Math.PI / 2; // Aligns canvas face features cleanly to +Z front
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Sculpted jawline + chin prominence + curved brow bone
  const jaw = new THREE.Mesh(charJawGeo, skinMat);
  jaw.scale.set(0.84, 0.92, 0.95);
  jaw.position.set(0, -0.056, 0.036);
  headGroup.add(jaw);

  const chin = new THREE.Mesh(charChinGeo, skinMat);
  chin.scale.set(1.06, 0.78, 0.88);
  chin.position.set(0, -0.104, 0.074);
  headGroup.add(chin);

  const browRidge = new THREE.Mesh(charBrowGeo, skinMat);
  browRidge.rotation.z = Math.PI / 2;
  browRidge.scale.set(0.85, 1, 0.72);
  browRidge.position.set(0, 0.044, 0.128);
  headGroup.add(browRidge);

  // 3-part sculpted anatomical nose (bridge + tip + subtle alar wings)
  const noseBridge = new THREE.Mesh(charNoseBridgeGeo, skinMat);
  noseBridge.rotation.x = -0.34;
  noseBridge.position.set(0, 0.006, 0.136);
  const noseTip = new THREE.Mesh(charNoseTipGeo, skinMat);
  noseTip.scale.set(0.95, 0.88, 1.05);
  noseTip.position.set(0, -0.015, 0.149);
  headGroup.add(noseBridge, noseTip);

  [-0.012, 0.012].forEach((nx) => {
    const nostril = new THREE.Mesh(charNostrilGeo, skinMat);
    nostril.scale.set(0.85, 0.75, 0.9);
    nostril.position.set(nx, -0.02, 0.14);
    headGroup.add(nostril);
  });

  // Sculpted ears with outer helix rim
  [-0.132, 0.132].forEach((ex) => {
    const ear = new THREE.Mesh(charEarShellGeo, skinMat);
    ear.scale.set(0.42, 1.0, 0.74);
    ear.position.set(ex, -0.005, -0.005);
    const helix = new THREE.Mesh(charEarHelixGeo, skinMat);
    helix.rotation.y = ex < 0 ? Math.PI / 2 : -Math.PI / 2;
    helix.position.set(ex * 1.03, -0.003, -0.005);
    headGroup.add(ear, helix);
  });

  let playerHairMat: THREE.MeshStandardMaterial | undefined;
  let playerBeardMat: THREE.MeshStandardMaterial | undefined;
  let playerHairStyleGroups: Record<HairStyleId, THREE.Group> | undefined;
  let playerBeardStyleGroups: Record<BeardStyleId, THREE.Group> | undefined;
  let playerSunglassesGroup: THREE.Group | undefined;

  if (role === 'police') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.148, 0.1, 18), jacketMat);
    capCrown.position.set(0, 0.125, -0.005);
    const capBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.152, 0.152, 0.025, 18),
      new THREE.MeshStandardMaterial({ color: 0xe5e9f0, roughness: 0.42, metalness: 0.2 }),
    );
    capBand.position.set(0, 0.085, 0);
    const capEmblem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.015, 8), goldMat);
    capEmblem.rotation.x = Math.PI / 2;
    capEmblem.position.set(0, 0.125, 0.155);
    const capVisor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.022, 16, 1, false, -0.85, 1.7),
      soleWhiteMat,
    );
    capVisor.rotation.x = 0.14;
    capVisor.position.set(0, 0.075, 0.068);
    headGroup.add(capCrown, capBand, capEmblem, capVisor);
  } else if (isCustomizable) {
    playerHairMat = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.74 });
    playerBeardMat = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.82 });

    const buildCapAndBack = (g: THREE.Group, capScaleY = 1.04, backLen = 0.12) => {
      const hCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.152, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
        playerHairMat,
      );
      hCap.scale.set(0.94, capScaleY, 1.0);
      hCap.position.set(0, 0.022, -0.015);
      const nape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.136, 0.118, backLen, 16, 1, false, Math.PI * 0.58, Math.PI * 0.84),
        playerHairMat,
      );
      nape.scale.set(0.94, 1, 1.02);
      nape.position.set(0, 0.032 - backLen * 0.3, -0.025);
      g.add(hCap, nape);
      [-0.124, 0.124].forEach((sbx) => {
        const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.052, 4, 6), playerHairMat);
        sb.scale.set(0.75, 1, 1.35);
        sb.position.set(sbx, 0.012, 0.034);
        g.add(sb);
      });
    };

    const pompadourG = new THREE.Group();
    buildCapAndBack(pompadourG);
    const quiff = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.125, 6, 10), playerHairMat);
    quiff.rotation.z = Math.PI / 2;
    quiff.position.set(0, 0.138, 0.06);
    const wave = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.095, 5, 8), playerHairMat);
    wave.rotation.z = Math.PI / 2 - 0.12;
    wave.position.set(-0.014, 0.148, 0.028);
    pompadourG.add(quiff, wave);

    const buzzG = new THREE.Group();
    const buzzCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.54),
      playerHairMat,
    );
    buzzCap.scale.set(0.92, 1.03, 0.98);
    buzzCap.position.set(0, 0.018, -0.012);
    const buzzNape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.132, 0.118, 0.085, 16, 1, false, Math.PI * 0.58, Math.PI * 0.84),
      playerHairMat,
    );
    buzzNape.position.set(0, 0.018, -0.022);
    buzzG.add(buzzCap, buzzNape);

    const fadeG = new THREE.Group();
    buildCapAndBack(fadeG, 1.01, 0.08);
    const flatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.126, 0.072, 16), playerHairMat);
    flatTop.scale.set(0.95, 1, 1.15);
    flatTop.position.set(0, 0.142, 0.005);
    fadeG.add(flatTop);

    const slickG = new THREE.Group();
    buildCapAndBack(slickG, 1.03, 0.145);
    const slickCrown = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.16, 6, 10), playerHairMat);
    slickCrown.rotation.x = Math.PI / 2 - 0.18;
    slickCrown.position.set(0, 0.135, -0.01);
    slickG.add(slickCrown);

    const afroG = new THREE.Group();
    const afroMain = new THREE.Mesh(new THREE.SphereGeometry(0.202, 20, 16), playerHairMat);
    afroMain.scale.set(1.05, 0.97, 1.03);
    afroMain.position.set(0, 0.095, -0.024);
    afroG.add(afroMain);

    const baldG = new THREE.Group();

    playerHairStyleGroups = {
      pompadour: pompadourG,
      buzz: buzzG,
      fade: fadeG,
      slick: slickG,
      afro: afroG,
      bald: baldG,
    };
    (Object.keys(playerHairStyleGroups) as HairStyleId[]).forEach((hs) => {
      playerHairStyleGroups![hs].visible = hs === 'pompadour';
      headGroup.add(playerHairStyleGroups![hs]);
    });

    // Sculpted 3D Jaw-Hugging Beard Styles (stubble / clean / goatee / full)
    const stubbleG = new THREE.Group();
    const stubbleArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.015, 6, 14, Math.PI * 1.1),
      playerBeardMat,
    );
    stubbleArc.rotation.x = Math.PI / 2 + 0.35;
    stubbleArc.rotation.z = -Math.PI * 0.05;
    stubbleArc.position.set(0, -0.085, 0.028);
    stubbleG.add(stubbleArc);

    const cleanG = new THREE.Group();

    const goateeG = new THREE.Group();
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.068, 4, 8), playerBeardMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, -0.044, 0.128);
    const chinTuft = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), playerBeardMat);
    chinTuft.scale.set(0.95, 1.15, 0.82);
    chinTuft.position.set(0, -0.092, 0.094);
    goateeG.add(stache, chinTuft);

    const fullBeardG = new THREE.Group();
    const fullJawShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.114, 18, 12, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.45, Math.PI * 0.5),
      playerBeardMat,
    );
    fullJawShell.rotation.y = -Math.PI / 2;
    fullJawShell.scale.set(0.96, 1.0, 0.92);
    fullJawShell.position.set(0, -0.048, 0.026);
    const fullChin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), playerBeardMat);
    fullChin.scale.set(1.1, 0.92, 0.92);
    fullChin.position.set(0, -0.098, 0.078);
    const fullStache = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.082, 5, 8), playerBeardMat);
    fullStache.rotation.z = Math.PI / 2;
    fullStache.position.set(0, -0.042, 0.129);
    fullBeardG.add(fullJawShell, fullChin, fullStache);

    playerBeardStyleGroups = {
      stubble: stubbleG,
      clean: cleanG,
      goatee: goateeG,
      full: fullBeardG,
    };
    (Object.keys(playerBeardStyleGroups) as BeardStyleId[]).forEach((bs) => {
      playerBeardStyleGroups![bs].visible = bs === 'stubble';
      headGroup.add(playerBeardStyleGroups![bs]);
    });
  } else {
    const hairPalette = [0x1c1513, 0x3b261c, 0x61442c, 0x18181b];
    const hairColor = hairPalette[variant % hairPalette.length];
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.78 });

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.152, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat,
    );
    hairCap.scale.set(0.94, 1.04, 1.0);
    hairCap.position.set(0, 0.022, -0.015);
    headGroup.add(hairCap);

    // Tapered skull-hugging nape & sideburns framing the temples
    const backHair = new THREE.Mesh(
      new THREE.CylinderGeometry(0.136, 0.118, 0.12, 16, 1, false, Math.PI * 0.58, Math.PI * 0.84),
      hairMat,
    );
    backHair.scale.set(0.94, 1, 1.02);
    backHair.position.set(0, -0.005, -0.024);
    headGroup.add(backHair);

    [-0.124, 0.124].forEach((sbx) => {
      const sideburn = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.052, 4, 6), hairMat);
      sideburn.scale.set(0.75, 1, 1.35);
      sideburn.position.set(sbx, 0.012, 0.034);
      headGroup.add(sideburn);
    });

    if (role === 'gang' || variant % 4 === 1) {
      // Streetwear backward/forward cap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), jacketMat);
      cap.position.set(0, 0.035, 0);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.018, 14, 1, false, -0.8, 1.6),
        darkTrimMat,
      );
      brim.position.set(0, 0.068, role === 'gang' ? -0.05 : 0.06);
      if (role === 'gang') brim.rotation.y = Math.PI;
      headGroup.add(cap, brim);
    } else if (variant % 4 === 2) {
      // Casual swept front bang
      const bang = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.11, 5, 8), hairMat);
      bang.rotation.z = Math.PI / 2 + 0.14;
      bang.position.set(0.01, 0.125, 0.068);
      headGroup.add(bang);
    }
  }

  // Sculpted Dual-Lens Sunglasses with Side Temple Arms (for Frank, Police, Gang & stylish civilians)
  if (isCustomizable || role === 'police' || role === 'gang' || variant % 3 === 0) {
    const sgGroup = new THREE.Group();
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x090b12,
      metalness: 0.88,
      roughness: 0.05,
      clearcoat: 1,
    });
    const frameMat = isCustomizable ? chromeMat : darkTrimMat;
    [-0.044, 0.044].forEach((lx) => {
      const sign = lx > 0 ? 1 : -1;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.016, 12), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.scale.set(1.15, 1, 0.85);
      lens.position.set(lx, 0.022, 0.136);
      sgGroup.add(lens);

      const templeArm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.135), frameMat);
      templeArm.position.set(sign * 0.104, 0.028, 0.068);
      templeArm.rotation.y = sign * -0.14;
      sgGroup.add(templeArm);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.008, 0.012), frameMat);
    bridge.position.set(0, 0.03, 0.14);
    sgGroup.add(bridge);
    headGroup.add(sgGroup);
    if (isCustomizable) {
      playerSunglassesGroup = sgGroup;
    }
  }

  torsoGroup.add(headGroup);

  // 5. Contact Shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.015;
  group.add(shadow);

  const customization: PlayerCustomizationRefs | undefined =
    isCustomizable &&
    playerTeeMat &&
    playerHairMat &&
    playerBeardMat &&
    playerSunglassesGroup &&
    playerHairStyleGroups &&
    playerBeardStyleGroups
      ? {
          jacketMat,
          teeMat: playerTeeMat,
          pantsMat,
          shoeUpperMat,
          soleMat: soleWhiteMat,
          hairMat: playerHairMat,
          beardMat: playerBeardMat,
          sunglassesGroup: playerSunglassesGroup,
          hairStyleGroups: playerHairStyleGroups,
          beardStyleGroups: playerBeardStyleGroups,
        }
      : undefined;

  return {
    group,
    torsoGroup,
    leftLeg: leftLegData.hip,
    rightLeg: rightLegData.hip,
    leftKnee: leftLegData.knee,
    rightKnee: rightLegData.knee,
    leftArm: leftArmData.shoulder,
    rightArm: rightArmData.shoulder,
    leftElbow: leftArmData.elbow,
    rightElbow: rightArmData.elbow,
    headGroup,
    weaponGroup,
    weaponMeshes,
    torsoMesh,
    customization,
  };
}

export function applyPlayerAppearance(
  rig: CharacterRig,
  appearance: PlayerAppearance,
  textures?: CityTextures,
): void {
  const c = rig.customization;
  if (!c) return;

  const outfit = OUTFIT_SPECS[appearance.outfit];
  c.jacketMat.color.setHex(outfit.jacketColor);
  c.jacketMat.map = outfit.leather ? (textures?.leather ?? null) : (textures?.fabric ?? null);
  c.jacketMat.bumpMap = outfit.leather ? (textures?.leather ?? null) : (textures?.fabric ?? null);
  c.jacketMat.bumpScale = outfit.leather ? 0.014 : 0.008;
  c.jacketMat.roughness = outfit.leather ? 0.34 : 0.62;
  c.jacketMat.metalness = outfit.leather ? 0.22 : 0.08;
  c.jacketMat.needsUpdate = true;

  c.teeMat.color.setHex(outfit.teeColor);
  c.pantsMat.color.setHex(outfit.pantsColor);
  c.shoeUpperMat.color.setHex(outfit.shoeColor);
  c.soleMat.color.setHex(outfit.soleColor);

  c.sunglassesGroup.visible = appearance.sunglasses;

  const hairHex = HAIR_COLOR_SPECS[appearance.hairColor].hex;
  c.hairMat.color.setHex(hairHex);
  c.beardMat.color.setHex(hairHex);
  if (appearance.hairColor === 'neon') {
    c.hairMat.emissive.setHex(0x00a896);
    c.hairMat.emissiveIntensity = 0.28;
  } else {
    c.hairMat.emissive.setHex(0x000000);
    c.hairMat.emissiveIntensity = 0;
  }

  (Object.keys(c.hairStyleGroups) as HairStyleId[]).forEach((hs) => {
    c.hairStyleGroups[hs].visible = hs === appearance.hairStyle;
  });
  (Object.keys(c.beardStyleGroups) as BeardStyleId[]).forEach((bs) => {
    c.beardStyleGroups[bs].visible = bs === appearance.beardStyle;
  });
}

export function createDroppedWeaponMesh(weaponId: EquippableWeaponId, accentColor: number): THREE.Group {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x262a34, metalness: 0.88, roughness: 0.24 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.78 });

  if (weaponId === 'knife') {
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.14 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), polymer);
    handle.position.set(0, 0.36, -0.12);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.03), chromeMat);
    guard.position.set(0, 0.36, -0.01);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.36), bladeMat);
    blade.position.set(0, 0.36, 0.18);
    g.add(handle, guard, blade);
  } else {
    const bodyLen = weaponId === 'pistol' ? 0.34 : weaponId === 'smg' ? 0.54 : 0.78;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, bodyLen), steel);
    body.position.y = 0.36;
    body.rotation.z = 0.2;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, bodyLen * 0.65, 8), polymer);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.38, bodyLen * 0.45);
    g.add(body, barrel);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.66, 20),
    new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);

  return g;
}

// ============================================================================
// POLICE PURSUIT HELICOPTER (4-5 WANTED STARS)
// ============================================================================
export function createPoliceHeliMesh(): PoliceHeliRig {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshPhysicalMaterial({
    color: 0x162238,
    roughness: 0.28,
    metalness: 0.6,
    clearcoat: 0.85,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f9,
    roughness: 0.35,
  });

  // Sculpted aerodynamic fuselage
  const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 14), hullMat);
  fuselage.scale.set(0.9, 0.85, 2.1);
  group.add(fuselage);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.18, 16, 12), glassMat);
  canopy.scale.set(0.86, 0.72, 1.35);
  canopy.position.set(0, 0.15, 0.9);
  group.add(canopy);

  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.32, 16), accentMat);
  stripe.rotation.x = Math.PI / 2;
  stripe.scale.set(0.92, 1.5, 0.9);
  stripe.position.set(0, -0.05, 0);
  group.add(stripe);

  // Tail boom + fin
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 4.6, 12), hullMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.position.set(0, 0.22, -3.9);
  group.add(tailBoom);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.8), hullMat);
  tailFin.position.set(0, 0.65, -6.0);
  group.add(tailFin);

  // Landing skids
  [-1.05, 1.05].forEach((sx) => {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), darkTrimMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.25, 0.2);
    group.add(skid);

    [-0.9, 0.9].forEach((sz) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), darkTrimMat);
      strut.position.set(sx * 0.82, -0.9, sz);
      strut.rotation.z = sx > 0 ? 0.35 : -0.35;
      group.add(strut);
    });
  });

  // Main 4-blade rotor
  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 1.35, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.45, 10), darkTrimMat);
  mainRotor.add(mast);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.4, metalness: 0.5 });
  for (let b = 0; b < 2; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.04, 0.26), bladeMat);
    blade.position.y = 0.22;
    blade.rotation.y = (b * Math.PI) / 2;
    mainRotor.add(blade);
  }
  group.add(mainRotor);

  // Tail rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.2, 0.72, -6.05);
  const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.45, 0.14), bladeMat);
  tailRotor.add(tBlade);
  group.add(tailRotor);

  // Strobes
  const beaconRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0xff2244, emissiveIntensity: 3.0 }),
  );
  beaconRed.position.set(0, 1.25, -5.95);
  group.add(beaconRed);

  const beaconBlue = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 3.0 }),
  );
  beaconBlue.position.set(0, -1.1, 1.4);
  group.add(beaconBlue);

  // Volumetric Searchlight Cone (projected down toward target)
  const coneGeo = new THREE.CylinderGeometry(0.3, 9.0, 38, 22, 1, true);
  coneGeo.translate(0, -19, 0);
  const searchlightCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe6f6ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  searchlightCone.position.set(0, -1.0, 1.5);
  group.add(searchlightCone);

  const spotTarget = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 24),
    new THREE.MeshBasicMaterial({
      color: 0xe6f6ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  spotTarget.rotation.x = -Math.PI / 2;

  return {
    group,
    mainRotor,
    tailRotor,
    searchlightCone,
    spotTarget,
    beaconRed,
    beaconBlue,
  };
}
