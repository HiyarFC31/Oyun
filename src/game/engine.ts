import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ProceduralAudio } from './audio';
import { buildCity, type CityData, ROAD_COORDS } from './city';
import { DualSenseController } from './dualsense';
import {
  applyPlayerAppearance,
  type CharacterRig,
  createCharacterMesh,
  createDroppedWeaponMesh,
  createPoliceHeliMesh,
  createVehicleMesh,
  type FirearmId,
  type PoliceHeliRig,
  type VehicleRig,
} from './models';
import { getTranslations, loadSavedLanguage, saveLanguage } from './i18n';
import { createCityTextures, type CityTextures } from './textures';
import {
  BEARD_STYLE_SPECS,
  type BeardStyleId,
  type EquippableWeaponId,
  FIREARM_IDS,
  type GamePhase,
  HAIR_COLOR_SPECS,
  HAIR_STYLE_SPECS,
  type HairColorId,
  type HairStyleId,
  type HudSnapshot,
  type LanguageCode,
  type MissionSnapshot,
  type OnlineChatMessage,
  type OnlinePlayerInfo,
  type OnlineStatus,
  OUTFIT_SPECS,
  type OutfitId,
  type PlayerAppearance,
  SHOP_WEAPON_IDS,
  type VehicleType,
  WEAPON_SPECS,
  type WeaponId,
  type WeatherType,
} from './types';

// Pre-allocated scratch math helpers (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _camWorldPos = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _hitLocalPos = new THREE.Vector3();
const _hitWorldNormal = new THREE.Vector3();
const _hitLocalNormal = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _quatInv = new THREE.Quaternion();
const _decalQuat = new THREE.Quaternion();
const _bulletRaycaster = new THREE.Raycaster();
const _skyTop = new THREE.Color();
const _skyMid = new THREE.Color();
const _skyHorizon = new THREE.Color();
const _fogCol = new THREE.Color();
const _dirCol = new THREE.Color();
const _hemiSkyCol = new THREE.Color();
const _hemiGroundCol = new THREE.Color();

const SUNNY_TOP = new THREE.Color(0x131636);
const SUNNY_MID = new THREE.Color(0x9a435a);
const SUNNY_HORIZON = new THREE.Color(0xf4935c);
const SUNNY_FOG = new THREE.Color(0x2f2134);
const SUNNY_DIR = new THREE.Color(0xffb472);
const SUNNY_HEMI_SKY = new THREE.Color(0x88a4d4);
const SUNNY_HEMI_GND = new THREE.Color(0x352830);

const RAINY_TOP = new THREE.Color(0x101826);
const RAINY_MID = new THREE.Color(0x2c3b52);
const RAINY_HORIZON = new THREE.Color(0x4b5d75);
const RAINY_FOG = new THREE.Color(0x283446);
const RAINY_DIR = new THREE.Color(0x9cb2cc);
const RAINY_HEMI_SKY = new THREE.Color(0x5e7696);
const RAINY_HEMI_GND = new THREE.Color(0x202632);

const FOGGY_TOP = new THREE.Color(0x3b4152);
const FOGGY_MID = new THREE.Color(0x6f7482);
const FOGGY_HORIZON = new THREE.Color(0xa2a0a6);
const FOGGY_FOG = new THREE.Color(0x767882);
const FOGGY_DIR = new THREE.Color(0xd8cfc8);
const FOGGY_HEMI_SKY = new THREE.Color(0x9ea5b3);
const FOGGY_HEMI_GND = new THREE.Color(0x45454c);

const WEATHER_ORDER: WeatherType[] = ['sunny', 'rainy', 'foggy'];

const CinematicVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.14 },
    uContrast: { value: 1.06 },
    uVignetteOffset: { value: 1.08 },
    uVignetteDarkness: { value: 0.34 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignetteOffset;
    uniform float uVignetteDarkness;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);
      // Warm golden-hour highlights & subtle cool twilight shadow split-toning
      vec3 shadowTint = vec3(0.95, 0.97, 1.06);
      vec3 highlightTint = vec3(1.05, 1.01, 0.96);
      float highlightWeight = smoothstep(0.18, 0.95, luma);
      col *= mix(shadowTint, highlightTint, highlightWeight);
      // Subtle linear contrast around mid-pivot preserving HDR highlights for OutputPass ACES
      col = max(col, vec3(0.0));
      col = mix(col, pow(col + vec3(0.0001), vec3(uContrast)), 0.85);
      // Merged edge vignette pass
      vec2 vignUv = (vUv - vec2(0.5)) * vec2(uVignetteOffset);
      float vign = clamp(dot(vignUv, vignUv), 0.0, 1.0);
      col *= mix(1.0, 1.0 - uVignetteDarkness, vign);
      gl_FragColor = vec4(col, tex.a);
    }
  `,
};

interface VehicleEntity {
  id: number;
  type: VehicleType;
  label: string;
  rig: VehicleRig;
  x: number;
  y: number;
  z: number;
  vy: number;
  rotY: number;
  moveYaw: number;
  speed: number; // forward m/s
  steerAngle: number;
  hp: number;
  maxHp: number;
  exploded: boolean;
  explodeTimer: number;
  aiRole: 'none' | 'traffic' | 'police' | 'missionTarget' | 'convoy' | 'sabotageTarget';
  hasDriver: boolean;
  trafficDirX: number;
  trafficDirZ: number;
  wheelSpin: number;
  airborneTime: number;
  hitFlash: number;
  bulletMarks: THREE.Mesh[];
  bulletMarkCursor: number;
  policeStuckTimer?: number;
  policeReverseTimer?: number;
  policeRamCooldown?: number;
}

interface NpcEntity {
  id: number;
  role: 'pedestrian' | 'police' | 'gang';
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  walkPhase: number;
  speed: number;
  dirX: number;
  dirZ: number;
  fleeTimer: number;
  panicTimer: number;
  knockdownTimer: number;
  gettingUpTimer: number;
  shootCooldown: number;
  hitFlash: number;
  dead: boolean;
  deadTimer: number;
  policeMode?: 'patrol' | 'chase' | 'shoot' | 'arrest';
}

interface PickupEntity {
  kind: 'cash' | 'health' | 'armor' | 'ammo' | 'bribe' | 'weaponDrop';
  mesh: THREE.Group;
  x: number;
  z: number;
  amount: number;
  life: number;
  weaponId?: EquippableWeaponId;
  magRounds?: number;
  reserveRounds?: number;
  pickupDelay?: number;
}

interface ParticleItem {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  gravity: number;
}

interface TracerItem {
  mesh: THREE.Mesh;
  life: number;
}

interface RemotePlayerEntity {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRotY: number;
  speed: number;
  walkPhase: number;
  weapon: WeaponId;
  aiming: boolean;
  inVehicle: boolean;
  vehicleType: VehicleType;
  vehicleColor: number;
  vehicleSpeed: number;
  health: number;
  wantedStars: number;
  rig: CharacterRig;
  appearanceKey: string;
  vehicleRig: VehicleRig | null;
  activeVehicleType: VehicleType | null;
  activeVehicleColor: number;
  labelSprite: THREE.Sprite;
  labelTex: THREE.CanvasTexture;
}

const VEHICLE_NAMES: Record<VehicleType, string> = {
  sports: 'Solaris GT-X',
  muscle: 'V8 Sabre',
  taxi: 'Bay Taksi',
  police: 'Polis Devriyesi',
  suv: 'Interceptor SUV',
};

const CAR_PALETTE = [0xe63946, 0xff9f1c, 0x2ec4b6, 0x3a86ff, 0x8338ec, 0xf4f1de, 0x52b788];

export class GtaGameEngine {
  private container: HTMLElement;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private fullMapCanvas: HTMLCanvasElement | null = null;
  private radarZoom: 'near' | 'wide' = 'near';
  private onHudUpdate: (hud: HudSnapshot) => void;

  private isSoftwareGl: boolean;
  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private skyMat!: THREE.ShaderMaterial;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private muzzleLight!: THREE.PointLight;
  private policeSirenLight!: THREE.PointLight;
  private rainLines!: THREE.LineSegments;
  private rainOffsets!: Float32Array;
  private weather: WeatherType = 'sunny';
  private weatherTimer = 75;
  private rainBlend = 0;
  private fogBlend = 0;
  private textures!: CityTextures;
  private city!: CityData;
  public audio = new ProceduralAudio();

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private hudSyncAccum = 0;
  private minimapAccum = 0;

  // Game phase & core player state
  private phase: GamePhase = 'title';
  private hitstopTimer = 0;
  private cameraShake = 0;

  private playerRig!: CharacterRig;
  private playerX = -4;
  private playerY = 0.025;
  private playerZ = -4;
  private playerVy = 0;
  private playerRotY = 0;
  private playerWalkPhase = 0;
  private playerHitFlash = 0;
  private health = 100;
  private maxHealth = 100;
  private armor = 50;
  private cash = 250;
  private activeWeapon: WeaponId = 'pistol';
  private lastFirearm: EquippableWeaponId = 'pistol';
  private ownedWeapons: Record<WeaponId, boolean> = {
    unarmed: true,
    knife: false,
    pistol: true,
    smg: false,
    shotgun: false,
    rifle: false,
  };
  private magAmmo: Record<WeaponId, number> = {
    unarmed: 0,
    knife: 0,
    pistol: 12,
    smg: 0,
    shotgun: 0,
    rifle: 0,
  };
  private ammo: Record<WeaponId, number> = {
    unarmed: 0,
    knife: 0,
    pistol: 60,
    smg: 0,
    shotgun: 0,
    rifle: 0,
  };
  private fireCooldown = 0;
  private meleeSwingTimer = 0;
  private reloading = false;
  private reloadTimer = 0;
  private reloadDuration = 1.15;
  private aimToggled = false;
  private virtualAim = false;
  private isAiming = false;
  private nearWeaponShop = false;
  private nearClothingShop = false;
  private nearBarberShop = false;

  private appearance: PlayerAppearance = {
    outfit: 'biker',
    sunglasses: true,
    hairStyle: 'pompadour',
    hairColor: 'black',
    beardStyle: 'stubble',
  };
  private ownedOutfits: Record<OutfitId, boolean> = {
    biker: true,
    miami: false,
    tuxedo: false,
    street: false,
    tactical: false,
    gold: false,
  };
  private ownedHairStyles: Record<HairStyleId, boolean> = {
    pompadour: true,
    buzz: false,
    fade: false,
    slick: false,
    afro: false,
    bald: false,
  };
  private ownedHairColors: Record<HairColorId, boolean> = {
    black: true,
    brown: false,
    blonde: false,
    red: false,
    silver: false,
    neon: false,
  };
  private ownedBeardStyles: Record<BeardStyleId, boolean> = {
    stubble: true,
    clean: false,
    goatee: false,
    full: false,
  };

  // Camera state (damped target angles + presets + manual look timer)
  private cameraYaw = 0;
  private cameraPitch = 0.3;
  private cameraTargetYaw = 0;
  private cameraTargetPitch = 0.3;
  private cameraMode: 0 | 1 | 2 = 0;
  private manualLookTimer = 0;
  private camCurrentPos = new THREE.Vector3(0, 8, -14);
  private camCurrentLook = new THREE.Vector3(0, 1.5, 0);
  private pointerLocked = false;
  private rightMouseDown = false;
  private leftMouseDown = false;
  private lastMousePos = { x: 0, y: 0 };

  // Wanted & police state
  private wantedStars = 0;
  private wantedHeat = 0; // 0..100 builds toward next star
  private wantedEvadeTimer = 0;
  private wantedEvading = false;
  private bustedTimer = 0;
  private arrestToastCooldown = 0;
  private policeSpawnTimer = 0;
  private policeFootSpawnTimer = 0;
  private roadblockTimer = 0;
  private policeHeliRig!: PoliceHeliRig;
  private heliPos = new THREE.Vector3(120, 34, 120);
  private heliOrbitAngle = 0;
  private playerMoveSpeed = 0;

  // Vehicles, NPCs, pickups, VFX
  private nextEntityId = 1;
  private vehicles: VehicleEntity[] = [];
  private currentVehicle: VehicleEntity | null = null;
  private nitro = 100;
  private npcs: NpcEntity[] = [];
  private pickups: PickupEntity[] = [];
  private particles: ParticleItem[] = [];
  private tracers: TracerItem[] = [];
  private bulletHoleGeo = new THREE.PlaneGeometry(0.16, 0.16);
  private bulletMetalMat!: THREE.MeshStandardMaterial;
  private bulletGlassMat!: THREE.MeshStandardMaterial;

  // Player Settings & Real-Time WebSocket Multiplayer
  private playerName = 'Frank';
  private mouseSensitivity = 1.0;
  private onlineStatus: OnlineStatus = 'offline';
  private onlineRoom = 'solaris-1';
  private onlineDesired = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: number | null = null;
  private onlinePlayerId: string | null = null;
  private onlineSyncAccum = 0;
  private remotePlayers = new Map<string, RemotePlayerEntity>();
  private onlineChat: OnlineChatMessage[] = [];
  private language: LanguageCode = loadSavedLanguage();

  // Mission & Beacon system
  private missionBeaconMesh!: THREE.Group;
  private missionTargetMesh!: THREE.Group;
  private shopBeaconMesh!: THREE.Group;
  private clothingBeaconMesh!: THREE.Group;
  private barberBeaconMesh!: THREE.Group;
  private mission: MissionSnapshot = {
    active: false,
    index: 0,
    totalMissions: 6,
    type: 'none',
    title: getTranslations(this.language).hud.freeRoamTitle,
    objective: getTranslations(this.language).hud.freeRoamObjective,
    timeLeft: 0,
    reward: 0,
  };
  private missionTargetPos = new THREE.Vector3();
  private missionVehicleId: number | null = null;
  private missionGangLeft = 0;
  private missionSabotageLeft = 0;
  private missionStage = 0;
  private missionCounter = 0;
  private raceCheckpoints: THREE.Vector3[] = [];
  private raceCheckpointIdx = 0;

  // Stats, Toast & GTA Mission Banner
  private stats = { missionsCompleted: 0, vehiclesHijacked: 0, stuntCash: 0 };
  private promptText = '';
  private toastText = '';
  private toastTone: HudSnapshot['toastTone'] = 'cash';
  private toastTimer = 0;
  private missionBanner: HudSnapshot['missionBanner'] = null;
  private missionBannerTimer = 0;

  // Input sets
  private held = new Set<string>();
  private justPressed = new Set<string>();

  // PlayStation DualSense & Gamepad state
  private dualsense = new DualSenseController();
  private hapticsEnabled = (() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('theft_solaris_haptics') !== '0'
        : true;
    } catch {
      return true;
    }
  })();
  private prevGamepadConnected = false;

  // Virtual touch / mobile inputs
  private virtualMoveX = 0; // -1 (left) .. 1 (right)
  private virtualMoveY = 0; // -1 (back) .. 1 (forward)
  private virtualFire = false;
  private virtualSprint = false;
  private virtualBrake = false;
  private virtualGas = false;
  private virtualReverse = false;
  private virtualJumpQueued = false;
  private activeCameraTouchId: number | null = null;
  private lastTouchPos = { x: 0, y: 0 };
  private lastTouchTimestamp = 0;

  // Bound listeners
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onResizeBound: () => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onPointerLockChangeBound: () => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: (e: TouchEvent) => void;
  private onGamepadConnectedBound: (e: GamepadEvent) => void;
  private onGamepadDisconnectedBound: (e: GamepadEvent) => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (hud: HudSnapshot) => void,
    minimapCanvas: HTMLCanvasElement | null,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.minimapCanvas = minimapCanvas;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = this.handleBlur.bind(this);
    this.onResizeBound = this.handleResize.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onMouseUpBound = this.handleMouseUp.bind(this);
    this.onWheelBound = this.handleWheel.bind(this);
    this.onContextMenuBound = (e: MouseEvent) => e.preventDefault();
    this.onPointerLockChangeBound = () => {
      this.pointerLocked = document.pointerLockElement === this.renderer?.domElement;
      this.emitHud();
    };
    this.onTouchStartBound = this.handleTouchStart.bind(this);
    this.onTouchMoveBound = this.handleTouchMove.bind(this);
    this.onTouchEndBound = this.handleTouchEnd.bind(this);
    this.onGamepadConnectedBound = (e: GamepadEvent) => {
      this.dualsense.setActiveIndex(e.gamepad.index);
      const gp = this.dualsense.poll();
      this.prevGamepadConnected = gp.connected;
      if (gp.connected) {
        this.showToast(getTranslations(this.language).engine.gamepadConnectedToast(gp.name), 'mission');
        this.triggerHaptic(0.35, 0.25, 110);
      }
      this.emitHud();
    };
    this.onGamepadDisconnectedBound = () => {
      const gp = this.dualsense.poll();
      this.prevGamepadConnected = gp.connected;
      if (!gp.connected) {
        this.showToast(getTranslations(this.language).engine.gamepadDisconnectedToast, 'mission');
      }
      this.emitHud();
    };

    this.initScene();
    this.bindEvents();
    this.populateWorld();
    this.emitHud();
    this.startLoop();
  }

  public setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
    this.minimapCanvas = canvas;
  }

  public setFullMapCanvas(canvas: HTMLCanvasElement | null): void {
    this.fullMapCanvas = canvas;
    if (canvas && this.phase === 'map') {
      this.drawFullMap();
    }
  }

  public toggleRadarZoom(): void {
    this.radarZoom = this.radarZoom === 'near' ? 'wide' : 'near';
    this.drawMinimap();
    this.emitHud();
  }

  public openMap(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    this.phase = 'map';
    this.clearAllInputs();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
    requestAnimationFrame(() => this.drawFullMap());
  }

  public closeMap(): void {
    if (this.phase !== 'map') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.emitHud();
  }

  public toggleMap(): void {
    if (this.phase === 'map') {
      this.closeMap();
    } else if (this.phase === 'playing') {
      this.openMap();
    }
  }

  private getTargetDpr(w: number, h: number): number {
    if (this.isSoftwareGl) return 1;
    const maxDpr = w * h > 1600000 ? 1.25 : 1.5;
    return Math.min(window.devicePixelRatio, maxDpr);
  }

  private initScene(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const dpr = this.getTargetDpr(w, h);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x21192e);
    this.scene.fog = new THREE.FogExp2(0x2f2134, 0.0028);

    // Outdoor golden-hour procedural environment dome for authentic car paint, glass & ocean reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envSkyGeo = new THREE.SphereGeometry(20, 24, 16);
    const envSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 zenith = vec3(0.14, 0.21, 0.48);
          vec3 mid = vec3(0.74, 0.36, 0.45);
          vec3 horizon = vec3(1.28, 0.66, 0.36);
          vec3 ground = vec3(0.08, 0.07, 0.11);
          vec3 col = y >= 0.0
            ? mix(horizon, mix(mid, zenith, smoothstep(0.15, 0.72, y)), smoothstep(0.0, 0.25, y))
            : mix(horizon * 0.48, ground, smoothstep(0.0, -0.25, y));
          vec3 sunDir = normalize(vec3(-0.78, 0.24, -0.48));
          float sunDot = max(dot(normalize(vDir), sunDir), 0.0);
          col += vec3(2.9, 1.85, 0.95) * pow(sunDot, 36.0);
          col += vec3(0.65, 0.36, 0.25) * pow(sunDot, 5.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(envSkyGeo, envSkyMat));
    this.scene.environment = pmrem.fromScene(envScene, 0.032).texture;
    envSkyGeo.dispose();
    envSkyMat.dispose();
    pmrem.dispose();

    // Volumetric-feel Sunset Sky Dome Shader with Multi-Octave Backlit Clouds & Rayleigh/Mie Corona
    const skyGeo = new THREE.SphereGeometry(680, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x131636) },
        midColor: { value: new THREE.Color(0x9a435a) },
        horizonColor: { value: new THREE.Color(0xf4935c) },
        sunDir: { value: new THREE.Vector3(-0.78, 0.24, -0.48).normalize() },
        uTime: { value: 0 },
        uOvercast: { value: 0 },
        uFogBlend: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDir;
        uniform float uTime;
        uniform float uOvercast;
        uniform float uFogBlend;
        varying vec3 vWorldPos;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 3; i++) {
            v += a * vnoise(p);
            p = rot * p * 2.04;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y;
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, max(h, 0.0)));
          col = mix(col, topColor, smoothstep(0.18, 0.72, max(h, 0.0)));

          float clearSky = 1.0 - clamp(uOvercast, 0.0, 1.0);

          // Sunset sun disc, Mie scattering bloom & warm horizon atmospheric band
          float sunDot = max(dot(dir, sunDir), 0.0);
          col += vec3(1.05, 0.58, 0.28) * pow(sunDot, 8.0) * 0.42 * clearSky;
          col += vec3(1.15, 0.72, 0.42) * pow(sunDot, 42.0) * 0.48 * clearSky;
          col += vec3(1.25, 0.96, 0.72) * smoothstep(0.9968, 0.9993, sunDot) * 1.35 * (0.16 + 0.84 * clearSky);
          col += vec3(1.0, 0.54, 0.34) * exp(-abs(h) * 8.5) * 0.14 * clearSky;

          // Subtle twilight zenith stars (hidden during overcast rain & fog)
          if (h > 0.22 && clearSky > 0.1) {
            vec2 suv = floor(dir.xz / (h + 0.35) * 190.0);
            float sh = fract(sin(dot(suv, vec2(12.9898, 78.233))) * 43758.5453);
            if (sh > 0.994) {
              float tw = 0.55 + 0.45 * sin(uTime * 2.2 + sh * 80.0);
              col += vec3(0.85, 0.92, 1.0) * tw * smoothstep(0.22, 0.55, h) * 0.52 * clearSky;
            }
          }

          // Backlit FBM sunset clouds
          if (h > 0.015) {
            vec2 cuv = dir.xz / (h + 0.16);
            float density = fbm(cuv * 1.25 + vec2(uTime * 0.018, -uTime * 0.012));
            float cloud = smoothstep(0.45 - uOvercast * 0.24, 0.82, density);
            float rimLight = smoothstep(0.35, 0.75, density) * (0.25 + 0.75 * pow(sunDot, 3.0)) * clearSky;
            vec3 clearCloudBase = mix(vec3(0.88, 0.48, 0.42), vec3(0.32, 0.22, 0.38), smoothstep(0.04, 0.45, h));
            clearCloudBase += vec3(1.15, 0.68, 0.38) * rimLight * 0.55;
            vec3 stormCloudCol = mix(vec3(0.32, 0.38, 0.48), vec3(0.13, 0.17, 0.24), smoothstep(0.04, 0.45, h));
            vec3 cloudCol = mix(clearCloudBase, stormCloudCol, uOvercast);
            col = mix(col, cloudCol, cloud * (0.52 + uOvercast * 0.36) * smoothstep(0.015, 0.15, h));
          }

          // Thick horizon haze blend during fog
          col = mix(col, horizonColor, clamp(uFogBlend * 0.74 * (1.0 - smoothstep(0.0, 0.55, max(h, 0.0))), 0.0, 1.0));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, this.skyMat));

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.2, 850);

    // High-contrast golden-hour lighting rig with crisp texel-dense shadows
    this.hemiLight = new THREE.HemisphereLight(0x88a6db, 0x2f2330, 0.76);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffb978, 2.1);
    this.dirLight.position.set(-70, 85, -45);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.set(1536, 1536);
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 220;
    const d = 46;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.00028;
    this.dirLight.shadow.normalBias = 0.018;
    this.dirLight.shadow.radius = 2.0;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.rimLight = new THREE.DirectionalLight(0x8e6be8, 0.56);
    this.rimLight.position.set(60, 40, 70);
    this.scene.add(this.rimLight);

    this.muzzleLight = new THREE.PointLight(0xffbe55, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    this.policeSirenLight = new THREE.PointLight(0xff2244, 0, 18, 2);
    this.scene.add(this.policeSirenLight);

    // GPU Post-Processing: HDR MSAA RenderTarget + Half-Res Bloom + Merged Grading/Vignette (skipped on software WebGL)
    if (!this.isSoftwareGl) {
      const maxSamples = this.renderer.capabilities.maxSamples || 0;
      const msaaTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(w * dpr)),
        Math.max(1, Math.floor(h * dpr)),
        {
          type: THREE.HalfFloatType,
          samples: Math.min(2, maxSamples),
        },
      );
      this.composer = new EffectComposer(this.renderer, msaaTarget);
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5))),
        0.34,
        0.54,
        0.84,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new ShaderPass(CinematicVignetteShader));
      this.composer.addPass(new OutputPass());
    }

    // Build textures and city
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createCityTextures(maxAniso);
    this.bulletMetalMat = new THREE.MeshStandardMaterial({
      map: this.textures.bulletHoleMetal,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      roughness: 0.55,
      metalness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.bulletGlassMat = new THREE.MeshStandardMaterial({
      map: this.textures.bulletHoleGlass,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      roughness: 0.22,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.city = buildCity(this.textures);
    this.scene.add(this.city.group);

    // Player character (Frank)
    this.playerRig = createCharacterMesh('player', 0x1d2330, this.textures.contactShadow, this.textures);
    this.playerX = this.city.spawnPoints.player.x;
    this.playerZ = this.city.spawnPoints.player.z;
    this.playerY = this.getGroundHeight(this.playerX, this.playerZ) + 0.025;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerRig.group);
    this.syncPlayerWeaponMesh();

    // Police Pursuit Helicopter (active at 4-5 stars)
    this.policeHeliRig = createPoliceHeliMesh();
    this.policeHeliRig.group.visible = false;
    this.policeHeliRig.spotTarget.visible = false;
    this.scene.add(this.policeHeliRig.group);
    this.scene.add(this.policeHeliRig.spotTarget);

    // Mission hub beacon, active target marker & Solaris Arms weapon shop beacon
    this.missionBeaconMesh = this.createBeaconMesh(0xffbe0b);
    this.missionBeaconMesh.position.copy(this.city.missionHubPos);
    this.scene.add(this.missionBeaconMesh);

    this.missionTargetMesh = this.createBeaconMesh(0x00f5d4);
    this.missionTargetMesh.visible = false;
    this.scene.add(this.missionTargetMesh);

    this.shopBeaconMesh = this.createBeaconMesh(0xff4d6d);
    this.shopBeaconMesh.position.copy(this.city.weaponShopPos);
    this.scene.add(this.shopBeaconMesh);

    this.clothingBeaconMesh = this.createBeaconMesh(0xff70a6);
    this.clothingBeaconMesh.position.copy(this.city.clothingShopPos);
    this.scene.add(this.clothingBeaconMesh);

    this.barberBeaconMesh = this.createBeaconMesh(0x38bdf8);
    this.barberBeaconMesh.position.copy(this.city.barberShopPos);
    this.scene.add(this.barberBeaconMesh);

    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);

    // 3D Rain Streak Particle System (follows player seamlessly across city & peaks)
    const dropCount = 1100;
    this.rainOffsets = new Float32Array(dropCount * 3);
    const rainPositions = new Float32Array(dropCount * 2 * 3);
    for (let i = 0; i < dropCount; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * 76;
      this.rainOffsets[i * 3 + 1] = Math.random() * 34;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xc2e6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // Pre-allocate smooth spherical particle pool (no blocky cubes)
    const pGeo = new THREE.IcosahedronGeometry(0.24, 1);
    for (let i = 0; i < 120; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        startScale: 1,
        endScale: 0.1,
        gravity: 0,
      });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private createBeaconMesh(colorHex: number): THREE.Group {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.65, 32),
      new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);

    const corona = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 2.05, 3.2, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    corona.position.y = 1.65;
    g.add(corona);

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.15, 4),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.88 }),
    );
    arrow.rotation.x = Math.PI;
    arrow.position.y = 4.0;
    g.add(arrow);
    return g;
  }

  private setBeaconColor(group: THREE.Group, colorHex: number): void {
    group.children.forEach((child) => {
      const m = child as THREE.Mesh;
      if (m.material && (m.material as THREE.MeshBasicMaterial).color) {
        (m.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      }
    });
  }

  private populateWorld(): void {
    // Clear existing dynamic entities
    this.vehicles.forEach((v) => this.scene.remove(v.rig.group));
    this.npcs.forEach((n) => this.scene.remove(n.rig.group));
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.vehicles = [];
    this.npcs = [];
    this.pickups = [];
    this.currentVehicle = null;

    // 1. Spawn parked sports/muscle/SUV cars near player, plaza & mountain trailhead
    const starterTypes: VehicleType[] = ['sports', 'muscle', 'taxi', 'sports', 'suv', 'muscle', 'suv'];
    this.city.spawnPoints.parkedCars.forEach((sp, i) => {
      const vt = starterTypes[i % starterTypes.length];
      const col = vt === 'taxi' ? 0xffbe0b : CAR_PALETTE[i % CAR_PALETTE.length];
      this.spawnVehicle(vt, col, sp.x, sp.z, sp.rotY, 'none', false);
    });

    // 2. Spawn cruising traffic cars along city avenues
    const trafficTypes: VehicleType[] = ['taxi', 'muscle', 'suv', 'sports'];
    for (let i = 0; i < 12; i++) {
      const vt = trafficTypes[i % trafficTypes.length];
      const col = vt === 'taxi' ? 0xffbe0b : CAR_PALETTE[(i + 2) % CAR_PALETTE.length];
      const alongZ = i % 2 === 0;
      const laneOffset = i % 4 < 2 ? 3.8 : -3.8;
      const roadLine = ROAD_COORDS[i % ROAD_COORDS.length];
      const posAlong = -100 + (i * 21) % 200;
      const x = alongZ ? roadLine + laneOffset : posAlong;
      const z = alongZ ? posAlong : roadLine + laneOffset;
      const dir = laneOffset > 0 ? 1 : -1;
      const rotY = alongZ ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const v = this.spawnVehicle(vt, col, x, z, rotY, 'traffic', true);
      v.trafficDirX = alongZ ? 0 : dir;
      v.trafficDirZ = alongZ ? dir : 0;
      v.speed = 8 + (i % 3) * 1.5;
    }

    // 3. Spawn ambient pedestrians on sidewalks
    const shirtPalette = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x9b5de5, 0xf15bb5, 0x00bbf9];
    for (let i = 0; i < 16; i++) {
      const rx = ROAD_COORDS[i % ROAD_COORDS.length] + (i % 2 === 0 ? 10.2 : -10.2);
      const rz = -105 + ((i * 37) % 210);
      this.spawnNpc('pedestrian', shirtPalette[i % shirtPalette.length], rx, rz);
    }

    // 4. Spawn collectible pickups + Police Bribe Stars + Mount Solaris Summit rewards
    const pickupSpots: { kind: PickupEntity['kind']; x: number; z: number; amount: number }[] = [
      { kind: 'armor', x: -39, z: -22, amount: 50 },
      { kind: 'ammo', x: -18, z: -30, amount: 45 },
      { kind: 'cash', x: 0, z: 0, amount: 100 },
      { kind: 'health', x: 60, z: -60, amount: 45 },
      { kind: 'ammo', x: -60, z: 60, amount: 45 },
      { kind: 'cash', x: -120, z: 0, amount: 150 },
      { kind: 'armor', x: 90, z: -42, amount: 50 },
      { kind: 'bribe', x: -158, z: 0, amount: 1 },
      { kind: 'bribe', x: 30, z: -90, amount: 1 },
      { kind: 'bribe', x: -90, z: 30, amount: 1 },
      { kind: 'cash', x: -10, z: -236, amount: 500 },
      { kind: 'armor', x: -14, z: -240, amount: 50 },
    ];
    pickupSpots.forEach((ps) => this.spawnPickup(ps.kind, ps.x, ps.z, ps.amount));
  }

  private getGroundHeight(x: number, z: number): number {
    return this.city.getSurfaceHeight(x, z);
  }

  private spawnVehicle(
    type: VehicleType,
    colorHex: number,
    x: number,
    z: number,
    rotY: number,
    aiRole: VehicleEntity['aiRole'],
    hasDriver: boolean,
  ): VehicleEntity {
    const rig = createVehicleMesh(
      type,
      colorHex,
      this.textures.contactShadow,
      this.textures.headlightGlow,
      this.textures,
    );
    rig.group.rotation.order = 'YXZ';
    const gy = this.getGroundHeight(x, z);
    rig.group.position.set(x, gy, z);
    rig.group.rotation.y = rotY;
    this.scene.add(rig.group);

    const maxHp = type === 'suv' || type === 'police' ? 180 : type === 'sports' ? 120 : 140;
    const entity: VehicleEntity = {
      id: this.nextEntityId++,
      type,
      label: VEHICLE_NAMES[type],
      rig,
      x,
      y: gy,
      z,
      vy: 0,
      rotY,
      moveYaw: rotY,
      speed: 0,
      steerAngle: 0,
      hp: maxHp,
      maxHp,
      exploded: false,
      explodeTimer: 0,
      aiRole,
      hasDriver,
      trafficDirX: Math.sin(rotY),
      trafficDirZ: Math.cos(rotY),
      wheelSpin: 0,
      airborneTime: 0,
      hitFlash: 0,
      bulletMarks: [],
      bulletMarkCursor: 0,
    };
    this.vehicles.push(entity);
    return entity;
  }

  private spawnNpc(role: NpcEntity['role'], colorHex: number, x: number, z: number): NpcEntity {
    const rig = createCharacterMesh(role, colorHex, this.textures.contactShadow, this.textures);
    const gy = this.getGroundHeight(x, z) + 0.025;
    rig.group.position.set(x, gy, z);
    this.scene.add(rig.group);

    const ang = Math.random() * Math.PI * 2;
    const maxHp = role === 'police' ? 95 : role === 'gang' ? 85 : 50;
    const npc: NpcEntity = {
      id: this.nextEntityId++,
      role,
      rig,
      x,
      y: gy,
      z,
      rotY: ang,
      hp: maxHp,
      maxHp,
      walkPhase: Math.random() * Math.PI * 2,
      speed: role === 'pedestrian' ? 2.6 : 5.4,
      dirX: Math.sin(ang),
      dirZ: Math.cos(ang),
      fleeTimer: 0,
      panicTimer: 0,
      knockdownTimer: 0,
      gettingUpTimer: 0,
      shootCooldown: 0.8 + Math.random() * 0.6,
      hitFlash: 0,
      dead: false,
      deadTimer: 0,
    };
    this.npcs.push(npc);
    return npc;
  }

  private spawnPickup(kind: PickupEntity['kind'], x: number, z: number, amount: number): void {
    const g = new THREE.Group();
    const color =
      kind === 'cash'
        ? 0x2ec4b6
        : kind === 'health'
          ? 0xef476f
          : kind === 'armor'
            ? 0x3a86ff
            : kind === 'bribe'
              ? 0xffbe0b
              : 0xff9f1c;

    const coreGeo =
      kind === 'cash'
        ? new THREE.CylinderGeometry(0.42, 0.42, 0.22, 16)
        : kind === 'bribe'
          ? new THREE.OctahedronGeometry(0.55, 0)
          : new THREE.OctahedronGeometry(0.45, 1);

    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: kind === 'bribe' ? 1.1 : 0.7,
        roughness: 0.22,
        metalness: 0.45,
      }),
    );
    core.position.y = 0.85;
    g.add(core);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 20),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);

    g.position.set(x, this.getGroundHeight(x, z), z);
    this.scene.add(g);
    this.pickups.push({ kind, mesh: g, x, z, amount, life: 90 });
  }

  private spawnWeaponPickup(
    weaponId: EquippableWeaponId,
    x: number,
    z: number,
    magRounds: number,
    reserveRounds: number,
    pickupDelay = 1.6,
  ): void {
    const g = new THREE.Group();
    const spec = WEAPON_SPECS[weaponId];
    const gunMesh = createDroppedWeaponMesh(weaponId, spec.color);
    gunMesh.position.y = 0.68;
    g.add(gunMesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.78, 22),
      new THREE.MeshBasicMaterial({ color: spec.color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);

    g.position.set(x, this.getGroundHeight(x, z), z);
    this.scene.add(g);
    this.pickups.push({
      kind: 'weaponDrop',
      mesh: g,
      x,
      z,
      amount: magRounds + reserveRounds,
      life: 140,
      weaponId,
      magRounds,
      reserveRounds,
      pickupDelay,
    });
  }

  // Public Lifecycle Controls
  public startGame(): void {
    this.audio.unlock();
    if (this.phase === 'wasted' || this.phase === 'busted') {
      this.resetGame();
    }
    this.phase = 'playing';
    this.showToast(getTranslations(this.language).engine.welcomeToast(this.playerName), 'mission');
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.audio.unlock();
      this.phase = 'playing';
      this.emitHud();
    }
  }

  public pauseGame(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.clearAllInputs();
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
      this.emitHud();
    }
  }

  public restartGame(): void {
    this.audio.unlock();
    this.resetGame();
    this.phase = 'playing';
    this.emitHud();
  }

  private clearAllInputs(): void {
    this.held.clear();
    this.justPressed.clear();
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualFire = false;
    this.virtualSprint = false;
    this.virtualBrake = false;
    this.virtualGas = false;
    this.virtualReverse = false;
    this.virtualJumpQueued = false;
    this.virtualAim = false;
    this.activeCameraTouchId = null;
  }

  // Mobile / Tablet Virtual Control APIs
  public setVirtualMove(x: number, y: number): void {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualFire(active: boolean): void {
    this.audio.unlock();
    this.virtualFire = active;
  }

  public setVirtualAim(active: boolean): void {
    this.audio.unlock();
    this.virtualAim = active;
  }

  public setVirtualSprint(active: boolean): void {
    this.virtualSprint = active;
  }

  public setVirtualBrake(active: boolean): void {
    this.virtualBrake = active;
  }

  public setVirtualGas(active: boolean): void {
    this.audio.unlock();
    this.virtualGas = active;
  }

  public setVirtualReverse(active: boolean): void {
    this.audio.unlock();
    this.virtualReverse = active;
  }

  public triggerJump(): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    this.audio.unlock();
    this.virtualJumpQueued = true;
  }

  public triggerEnterExitVehicle(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    if (this.currentVehicle) {
      this.exitCurrentVehicle();
    } else {
      this.tryEnterNearestVehicle();
    }
  }

  public triggerHorn(): void {
    if (this.phase !== 'playing' || !this.currentVehicle) return;
    this.audio.unlock();
    this.audio.playHorn();
  }

  public triggerStartMission(): void {
    if (this.phase !== 'playing' || this.mission.active) return;
    this.audio.unlock();
    this.startNextMission();
  }

  public cycleWeather(): void {
    const idx = WEATHER_ORDER.indexOf(this.weather);
    this.setWeather(WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length]);
  }

  public setWeather(next: WeatherType): void {
    this.weather = next;
    this.weatherTimer = 75;
    const msg = getTranslations(this.language).engine.weatherToasts[this.weather];
    this.showToast(msg, 'mission');
    this.emitHud();
  }

  public setLanguage(lang: LanguageCode): void {
    this.language = lang;
    saveLanguage(lang);
    const t = getTranslations(lang);
    if (!this.mission.active) {
      this.mission.title = t.hud.freeRoamTitle;
      this.mission.objective = t.hud.freeRoamObjective;
    }
    this.updateContextualPrompt();
    this.emitHud();
  }

  public setPlayerName(rawName: string): void {
    const cleaned = rawName.trim().slice(0, 16) || 'Frank';
    this.playerName = cleaned;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendLocalOnlineState(true);
    }
    this.emitHud();
  }

  public setMouseSensitivity(val: number): void {
    this.mouseSensitivity = THREE.MathUtils.clamp(val, 0.4, 2.2);
    this.emitHud();
  }

  public setCameraModePreset(mode: 0 | 1 | 2): void {
    this.cameraMode = mode;
    this.emitHud();
  }

  public toggleHaptics(): void {
    this.hapticsEnabled = !this.hapticsEnabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('theft_solaris_haptics', this.hapticsEnabled ? '1' : '0');
      }
    } catch {
      // ignore storage errors
    }
    if (this.hapticsEnabled) {
      this.triggerHaptic(0.4, 0.3, 120);
    }
    this.emitHud();
  }

  private triggerHaptic(weak: number, strong: number, durationMs: number): void {
    if (!this.hapticsEnabled) return;
    this.dualsense.triggerHaptic(weak, strong, durationMs);
  }

  public connectOnline(room?: string, name?: string): void {
    this.audio.unlock();
    if (typeof name === 'string' && name.trim()) {
      this.playerName = name.trim().slice(0, 16);
    }
    if (typeof room === 'string' && room.trim()) {
      const cleaned = room.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
      if (cleaned) this.onlineRoom = cleaned;
    }

    if (this.phase === 'title') {
      this.startGame();
    } else if (this.phase === 'paused') {
      this.resumeGame();
    }

    if (this.onlineDesired && (this.onlineStatus === 'connected' || this.onlineStatus === 'connecting')) {
      this.emitHud();
      return;
    }

    this.onlineDesired = true;
    this.openOnlineSocket();
  }

  public disconnectOnline(): void {
    this.onlineDesired = false;
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'leave' }));
        }
        this.ws.close();
      } catch {
        // ignore close error
      }
      this.ws = null;
    }
    this.onlinePlayerId = null;
    this.onlineStatus = 'offline';
    this.clearRemotePlayers();
    this.showToast(getTranslations(this.language).engine.offlineToast, 'mission');
    this.emitHud();
  }

  public sendOnlineChat(text: string): void {
    const trimmed = text.trim().slice(0, 120);
    if (!trimmed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'chat', text: trimmed }));
  }

  private openOnlineSocket(): void {
    if (this.disposed || !this.onlineDesired) return;
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.onlineStatus = 'connecting';
    this.emitHud();

    const customWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = customWsUrl || `${proto}//${window.location.host}/ws`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.onlineStatus = 'error';
      this.emitHud();
      return;
    }

    this.ws = socket;

    socket.addEventListener('open', () => {
      if (this.disposed || !this.onlineDesired || this.ws !== socket) {
        socket.close();
        return;
      }
      const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
      const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
      const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
      const rot = this.currentVehicle ? this.currentVehicle.rotY : this.playerRotY;
      socket.send(
        JSON.stringify({
          type: 'join',
          room: this.onlineRoom,
          name: this.playerName,
          x: px,
          y: py,
          z: pz,
          rotY: rot,
          weapon: this.activeWeapon,
          aiming: this.isAiming,
          inVehicle: Boolean(this.currentVehicle),
          vehicleType: this.currentVehicle?.type ?? 'sports',
          vehicleColor: this.currentVehicle?.rig.baseColor.getHex() ?? 0xff3366,
          health: Math.ceil(this.health),
          wantedStars: this.wantedStars,
          appearance: this.appearance,
        }),
      );
    });

    socket.addEventListener('message', (evt) => {
      if (this.ws !== socket) return;
      try {
        const msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
        this.handleServerMessage(msg);
      } catch {
        // ignore malformed packet
      }
    });

    socket.addEventListener('close', () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.onlinePlayerId = null;
      this.clearRemotePlayers();
      if (this.onlineDesired && !this.disposed) {
        this.onlineStatus = 'connecting';
        this.emitHud();
        this.wsReconnectTimer = window.setTimeout(() => {
          this.openOnlineSocket();
        }, 2200);
      } else {
        this.onlineStatus = 'offline';
        this.emitHud();
      }
    });

    socket.addEventListener('error', () => {
      if (this.ws !== socket) return;
      this.onlineStatus = 'error';
      this.emitHud();
    });
  }

  private handleServerMessage(msg: Record<string, unknown>): void {
    const type = msg.type;
    if (type === 'welcome') {
      this.onlinePlayerId = typeof msg.playerId === 'string' ? msg.playerId : null;
      this.onlineStatus = 'connected';
      this.clearRemotePlayers();
      if (Array.isArray(msg.players)) {
        for (const p of msg.players) {
          this.upsertRemotePlayer(p as Record<string, unknown>);
        }
      }
      this.showToast(getTranslations(this.language).engine.onlineConnectedToast(this.onlineRoom), 'cash');
      this.emitHud();
    } else if (type === 'player:joined') {
      const p = msg.player as Record<string, unknown> | undefined;
      if (p) {
        this.upsertRemotePlayer(p);
        const pName = typeof p.name === 'string' ? p.name : 'Player';
        this.showToast(getTranslations(this.language).engine.playerJoinedToast(pName), 'mission');
        this.emitHud();
      }
    } else if (type === 'player:state') {
      const p = msg.player as Record<string, unknown> | undefined;
      if (p) this.upsertRemotePlayer(p);
    } else if (type === 'player:left') {
      const pid = typeof msg.playerId === 'string' ? msg.playerId : '';
      if (pid) {
        const rp = this.remotePlayers.get(pid);
        if (rp) {
          this.showToast(getTranslations(this.language).engine.playerLeftToast(rp.name), 'mission');
          this.removeRemotePlayer(pid);
          this.emitHud();
        }
      }
    } else if (type === 'player:shot') {
      const ox = Number(msg.ox) || 0;
      const oy = Number(msg.oy) || 1.4;
      const oz = Number(msg.oz) || 0;
      const hx = Number(msg.hx) || ox;
      const hy = Number(msg.hy) || oy;
      const hz = Number(msg.hz) || oz;
      const col = typeof msg.color === 'number' ? msg.color : 0xffd166;
      const weapon = typeof msg.weapon === 'string' ? (msg.weapon as WeaponId) : 'pistol';
      this.spawnTracer(ox, oy, oz, hx, hy, hz, col);
      this.spawnParticles(hx, hy, hz, 3, 0xffbe0b, 3.5, 0.2);
      const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
      const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
      if (Math.hypot(ox - px, oz - pz) < 68) {
        this.audio.playGunshot(weapon);
      }
    } else if (type === 'player:damaged') {
      const dmg = typeof msg.damage === 'number' ? msg.damage : 15;
      const fromName = typeof msg.fromName === 'string' ? msg.fromName : 'Player';
      this.damagePlayer(dmg);
      this.showToast(getTranslations(this.language).engine.shotByPlayerToast(fromName), 'wanted');
    } else if (type === 'chat:msg') {
      const id = typeof msg.id === 'string' ? msg.id : String(Date.now());
      const name = typeof msg.name === 'string' ? msg.name : 'Oyuncu';
      const color = typeof msg.color === 'number' ? msg.color : 0x00f5d4;
      const text = typeof msg.text === 'string' ? msg.text : '';
      if (text) {
        this.onlineChat = [...this.onlineChat.slice(-14), { id, name, color, text }];
        this.emitHud();
      }
    }
  }

  private createRemoteNameplate(name: string, colorHex: number): { sprite: THREE.Sprite; tex: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const hex = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = 'rgba(16, 12, 28, 0.85)';
    ctx.fillRect(16, 10, 224, 42);
    ctx.strokeStyle = hex;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 10, 224, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 14), 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.2, 0.55, 1);
    return { sprite, tex };
  }

  private upsertRemotePlayer(data: Record<string, unknown>): void {
    const id = typeof data.id === 'string' ? data.id : '';
    if (!id || id === this.onlinePlayerId) return;

    const name = typeof data.name === 'string' ? data.name : 'Oyuncu';
    const color = typeof data.color === 'number' ? data.color : 0x00f5d4;
    const x = typeof data.x === 'number' ? data.x : 0;
    const y = typeof data.y === 'number' ? data.y : 0.08;
    const z = typeof data.z === 'number' ? data.z : 0;
    const rotY = typeof data.rotY === 'number' ? data.rotY : 0;
    const speed = typeof data.speed === 'number' ? data.speed : 0;
    const weapon = typeof data.weapon === 'string' ? (data.weapon as WeaponId) : 'pistol';
    const aiming = Boolean(data.aiming);
    const inVehicle = Boolean(data.inVehicle);
    const vehicleType = typeof data.vehicleType === 'string' ? (data.vehicleType as VehicleType) : 'sports';
    const vehicleColor = typeof data.vehicleColor === 'number' ? data.vehicleColor : color;
    const vehicleSpeed = typeof data.vehicleSpeed === 'number' ? data.vehicleSpeed : 0;
    const health = typeof data.health === 'number' ? data.health : 100;
    const wantedStars = typeof data.wantedStars === 'number' ? data.wantedStars : 0;

    const rawApp = data.appearance as Partial<PlayerAppearance> | undefined;
    const remoteApp: PlayerAppearance = {
      outfit: rawApp?.outfit && rawApp.outfit in OUTFIT_SPECS ? rawApp.outfit : 'biker',
      sunglasses: typeof rawApp?.sunglasses === 'boolean' ? rawApp.sunglasses : true,
      hairStyle: rawApp?.hairStyle && rawApp.hairStyle in HAIR_STYLE_SPECS ? rawApp.hairStyle : 'pompadour',
      hairColor: rawApp?.hairColor && rawApp.hairColor in HAIR_COLOR_SPECS ? rawApp.hairColor : 'black',
      beardStyle: rawApp?.beardStyle && rawApp.beardStyle in BEARD_STYLE_SPECS ? rawApp.beardStyle : 'stubble',
    };
    const appearanceKey = `${remoteApp.outfit}|${remoteApp.sunglasses ? 1 : 0}|${remoteApp.hairStyle}|${remoteApp.hairColor}|${remoteApp.beardStyle}`;

    let rp = this.remotePlayers.get(id);
    if (!rp) {
      const rig = createCharacterMesh('remote', color, this.textures.contactShadow, this.textures);
      applyPlayerAppearance(rig, remoteApp, this.textures);
      rig.group.position.set(x, y, z);
      rig.group.rotation.y = rotY;
      this.scene.add(rig.group);

      const { sprite, tex } = this.createRemoteNameplate(name, color);
      sprite.position.set(x, y + 2.35, z);
      this.scene.add(sprite);

      rp = {
        id,
        name,
        color,
        x,
        y,
        z,
        rotY,
        targetX: x,
        targetY: y,
        targetZ: z,
        targetRotY: rotY,
        speed,
        walkPhase: 0,
        weapon,
        aiming,
        inVehicle,
        vehicleType,
        vehicleColor,
        vehicleSpeed,
        health,
        wantedStars,
        rig,
        appearanceKey,
        vehicleRig: null,
        activeVehicleType: null,
        activeVehicleColor: vehicleColor,
        labelSprite: sprite,
        labelTex: tex,
      };
      this.remotePlayers.set(id, rp);
    } else {
      if (rp.name !== name) {
        rp.name = name;
        this.scene.remove(rp.labelSprite);
        rp.labelTex.dispose();
        (rp.labelSprite.material as THREE.SpriteMaterial).dispose();
        const { sprite, tex } = this.createRemoteNameplate(name, rp.color);
        rp.labelSprite = sprite;
        rp.labelTex = tex;
        this.scene.add(sprite);
      }
      if (rp.appearanceKey !== appearanceKey) {
        rp.appearanceKey = appearanceKey;
        applyPlayerAppearance(rp.rig, remoteApp, this.textures);
      }
      rp.targetX = x;
      rp.targetY = y;
      rp.targetZ = z;
      rp.targetRotY = rotY;
      rp.speed = speed;
      rp.weapon = weapon;
      rp.aiming = aiming;
      rp.inVehicle = inVehicle;
      rp.vehicleType = vehicleType;
      rp.vehicleColor = vehicleColor;
      rp.vehicleSpeed = vehicleSpeed;
      rp.health = health;
      rp.wantedStars = wantedStars;
    }

    // Sync weapon visibility in remote player's hand
    if (rp.weapon === 'unarmed') {
      rp.rig.weaponGroup.visible = false;
    } else {
      rp.rig.weaponGroup.visible = true;
      for (const wid of SHOP_WEAPON_IDS) {
        rp.rig.weaponMeshes[wid].visible = wid === rp.weapon;
      }
    }
  }

  private removeRemotePlayer(id: string): void {
    const rp = this.remotePlayers.get(id);
    if (!rp) return;
    this.scene.remove(rp.rig.group);
    if (rp.vehicleRig) {
      this.scene.remove(rp.vehicleRig.group);
    }
    this.scene.remove(rp.labelSprite);
    rp.labelTex.dispose();
    (rp.labelSprite.material as THREE.SpriteMaterial).dispose();
    this.remotePlayers.delete(id);
  }

  private clearRemotePlayers(): void {
    for (const id of Array.from(this.remotePlayers.keys())) {
      this.removeRemotePlayer(id);
    }
  }

  private sendLocalOnlineState(force = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const rotY = this.currentVehicle ? this.currentVehicle.rotY : this.playerRotY;
    const onFootSpeed =
      !this.currentVehicle &&
      (this.held.has('KeyW') ||
        this.held.has('KeyS') ||
        this.held.has('KeyA') ||
        this.held.has('KeyD') ||
        Math.hypot(this.virtualMoveX, this.virtualMoveY) > 0.1)
        ? this.held.has('ShiftLeft') || this.virtualSprint
          ? 10.5
          : 6.4
        : 0;

    if (!force && this.phase !== 'playing') return;
    this.ws.send(
      JSON.stringify({
        type: 'state',
        name: this.playerName,
        x: px,
        y: py,
        z: pz,
        rotY,
        speed: onFootSpeed,
        weapon: this.activeWeapon,
        aiming: this.isAiming,
        inVehicle: Boolean(this.currentVehicle),
        vehicleType: this.currentVehicle?.type ?? 'sports',
        vehicleColor: this.currentVehicle?.rig.baseColor.getHex() ?? 0xff3366,
        vehicleSpeed: this.currentVehicle ? this.currentVehicle.speed : 0,
        health: Math.ceil(this.health),
        wantedStars: this.wantedStars,
        appearance: this.appearance,
      }),
    );
  }

  private updateOnlineMultiplayer(dt: number): void {
    if (this.onlineStatus !== 'connected') return;

    this.onlineSyncAccum += dt;
    if (this.onlineSyncAccum >= 0.05) {
      this.onlineSyncAccum = 0;
      this.sendLocalOnlineState();
    }

    const posRate = 1 - Math.exp(-14 * dt);
    for (const rp of this.remotePlayers.values()) {
      rp.x = THREE.MathUtils.lerp(rp.x, rp.targetX, posRate);
      rp.y = THREE.MathUtils.lerp(rp.y, rp.targetY, posRate);
      rp.z = THREE.MathUtils.lerp(rp.z, rp.targetZ, posRate);
      rp.rotY = this.lerpAngle(rp.rotY, rp.targetRotY, posRate);

      if (rp.inVehicle) {
        if (!rp.vehicleRig || rp.activeVehicleType !== rp.vehicleType || rp.activeVehicleColor !== rp.vehicleColor) {
          if (rp.vehicleRig) this.scene.remove(rp.vehicleRig.group);
          rp.vehicleRig = createVehicleMesh(
            rp.vehicleType,
            rp.vehicleColor,
            this.textures.contactShadow,
            this.textures.headlightGlow,
            this.textures,
          );
          rp.vehicleRig.group.rotation.order = 'YXZ';
          rp.activeVehicleType = rp.vehicleType;
          rp.activeVehicleColor = rp.vehicleColor;
          this.scene.add(rp.vehicleRig.group);
        }
        rp.rig.group.visible = false;
        rp.vehicleRig.group.visible = true;
        rp.vehicleRig.group.position.set(rp.x, rp.y, rp.z);
        rp.vehicleRig.group.rotation.y = rp.rotY;
        const spin = (rp.vehicleSpeed * dt) / 0.38;
        rp.vehicleRig.wheels.forEach((w) => (w.rotation.x += spin));
        rp.labelSprite.position.set(rp.x, rp.y + 2.25, rp.z);
      } else {
        if (rp.vehicleRig) rp.vehicleRig.group.visible = false;
        rp.rig.group.visible = true;
        rp.rig.group.position.set(rp.x, rp.y, rp.z);
        rp.rig.group.rotation.y = rp.rotY;

        const moving = rp.speed > 0.25;
        const sprinting = rp.speed > 8.2;
        if (moving) rp.walkPhase += dt * (rp.speed * 1.9);
        else rp.walkPhase = 0;

        const swing = moving ? Math.sin(rp.walkPhase) * (sprinting ? 0.82 : 0.56) : 0;
        const kneeBendL = moving ? Math.max(0, Math.sin(rp.walkPhase + 0.8)) * (sprinting ? 0.98 : 0.65) : 0.04;
        const kneeBendR = moving ? Math.max(0, -Math.sin(rp.walkPhase + 0.8)) * (sprinting ? 0.98 : 0.65) : 0.04;
        const strideBob = moving ? Math.abs(Math.sin(rp.walkPhase)) * 0.022 : 0;

        rp.rig.torsoGroup.position.y = 0.95 + Math.sin(this.elapsed * 2.4) * 0.006 + strideBob;
        rp.rig.torsoGroup.rotation.x = moving ? (sprinting ? 0.15 : 0.06) : 0;
        rp.rig.torsoGroup.rotation.y = moving && !rp.aiming ? -swing * 0.13 : 0;
        rp.rig.headGroup.rotation.y = moving && !rp.aiming ? swing * 0.1 : 0;

        rp.rig.leftLeg.rotation.x = swing;
        rp.rig.rightLeg.rotation.x = -swing;
        rp.rig.leftKnee.rotation.x = kneeBendL;
        rp.rig.rightKnee.rotation.x = kneeBendR;
        rp.rig.leftArm.rotation.x = -swing * 0.68;
        rp.rig.leftElbow.rotation.x = moving ? -0.42 : -0.15;
        if (rp.aiming && rp.weapon !== 'unarmed' && rp.weapon !== 'knife') {
          rp.rig.rightArm.rotation.x = -Math.PI * 0.46;
          rp.rig.rightElbow.rotation.x = -0.14;
        } else {
          rp.rig.rightArm.rotation.x = swing * 0.68;
          rp.rig.rightElbow.rotation.x = moving ? -0.42 : -0.15;
        }
        rp.labelSprite.position.set(rp.x, rp.y + 2.32, rp.z);
      }
    }
  }

  private syncPlayerWeaponMesh(): void {
    if (!this.playerRig) return;
    if (this.activeWeapon === 'unarmed') {
      this.playerRig.weaponGroup.visible = false;
      return;
    }
    this.playerRig.weaponGroup.visible = true;
    for (const wid of SHOP_WEAPON_IDS) {
      this.playerRig.weaponMeshes[wid].visible = wid === this.activeWeapon;
    }
  }

  private getAvailableWeaponOrder(): WeaponId[] {
    const list: WeaponId[] = ['unarmed'];
    for (const wid of SHOP_WEAPON_IDS) {
      if (this.ownedWeapons[wid]) list.push(wid);
    }
    return list;
  }

  public selectWeapon(id: WeaponId): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    if (!this.ownedWeapons[id]) {
      this.showToast(getTranslations(this.language).engine.noWeaponToast, 'wanted');
      return;
    }
    this.audio.unlock();
    if (this.activeWeapon !== id) {
      this.reloading = false;
      this.reloadTimer = 0;
    }
    this.activeWeapon = id;
    if (id !== 'unarmed') this.lastFirearm = id;
    this.syncPlayerWeaponMesh();
    this.emitHud();
  }

  public cycleWeapon(): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    this.audio.unlock();
    const order = this.getAvailableWeaponOrder();
    const cur = order.indexOf(this.activeWeapon);
    const next = order[(cur + 1) % order.length];
    this.selectWeapon(next);
  }

  public toggleHolster(): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    this.audio.unlock();
    const t = getTranslations(this.language);
    if (this.activeWeapon !== 'unarmed') {
      this.lastFirearm = this.activeWeapon;
      this.reloading = false;
      this.reloadTimer = 0;
      this.activeWeapon = 'unarmed';
      this.syncPlayerWeaponMesh();
      this.showToast(t.engine.holsterToast, 'mission');
    } else {
      const target = this.ownedWeapons[this.lastFirearm]
        ? this.lastFirearm
        : SHOP_WEAPON_IDS.find((id) => this.ownedWeapons[id]);
      if (!target) {
        this.showToast(t.engine.noEquipWeaponToast, 'wanted');
        return;
      }
      this.activeWeapon = target;
      this.syncPlayerWeaponMesh();
      this.showToast(t.engine.equippedToast(t.weapons[target].shortName), 'mission');
    }
    this.emitHud();
  }

  public dropCurrentWeapon(): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    const t = getTranslations(this.language);
    if (this.activeWeapon === 'unarmed') {
      this.showToast(t.engine.noDropWeaponToast, 'wanted');
      return;
    }
    this.audio.unlock();
    const droppedId = this.activeWeapon;
    const magR = this.magAmmo[droppedId];
    const resR = this.ammo[droppedId];

    this.ownedWeapons[droppedId] = false;
    this.magAmmo[droppedId] = 0;
    this.ammo[droppedId] = 0;
    this.reloading = false;
    this.reloadTimer = 0;

    const dropX = this.playerX + Math.sin(this.playerRotY) * 1.35;
    const dropZ = this.playerZ + Math.cos(this.playerRotY) * 1.35;
    this.spawnWeaponPickup(droppedId, dropX, dropZ, magR, resR, 1.6);

    const fallback = SHOP_WEAPON_IDS.find((id) => this.ownedWeapons[id]) ?? 'unarmed';
    this.activeWeapon = fallback;
    if (fallback !== 'unarmed') this.lastFirearm = fallback;
    this.syncPlayerWeaponMesh();
    this.audio.playPickup(false);
    this.showToast(t.engine.droppedToast(t.weapons[droppedId].shortName), 'mission');
    this.emitHud();
  }

  public reloadWeapon(): void {
    if (this.phase !== 'playing' || this.currentVehicle || this.reloading) return;
    if (this.activeWeapon === 'unarmed' || this.activeWeapon === 'knife') return;
    const w = this.activeWeapon;
    const spec = WEAPON_SPECS[w];
    if (this.magAmmo[w] >= spec.magSize) return;
    if (this.ammo[w] <= 0) {
      this.audio.playEmptyClick();
      this.showToast(getTranslations(this.language).engine.noAmmoToast, 'wanted');
      return;
    }
    this.audio.unlock();
    this.reloading = true;
    this.reloadDuration = spec.reloadTime;
    this.reloadTimer = spec.reloadTime;
    this.audio.playReload();
    this.emitHud();
  }

  public openWeaponShop(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    this.phase = 'shop';
    this.clearAllInputs();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public closeWeaponShop(): void {
    if (this.phase !== 'shop') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.emitHud();
  }

  public buyWeapon(id: EquippableWeaponId): void {
    const spec = WEAPON_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    if (this.ownedWeapons[id]) {
      this.activeWeapon = id;
      this.lastFirearm = id;
      this.reloading = false;
      this.reloadTimer = 0;
      this.syncPlayerWeaponMesh();
      this.showToast(t.engine.equippedToast(t.weapons[id].shortName), 'mission');
      this.emitHud();
      return;
    }
    if (this.cash < spec.price) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.price), 'wanted');
      this.emitHud();
      return;
    }
    this.cash -= spec.price;
    this.ownedWeapons[id] = true;
    this.magAmmo[id] = spec.magSize;
    this.ammo[id] += spec.ammoPack;
    this.activeWeapon = id;
    this.lastFirearm = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.syncPlayerWeaponMesh();
    this.audio.playPurchase();
    this.showToast(t.engine.boughtToast(t.weapons[id].name), 'cash');
    this.emitHud();
  }

  public buyAmmo(id: FirearmId): void {
    const spec = WEAPON_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    if (!this.ownedWeapons[id]) {
      this.showToast(t.engine.buyWeaponFirstToast, 'wanted');
      return;
    }
    if (this.cash < spec.ammoPrice) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.ammoPrice), 'wanted');
      return;
    }
    this.cash -= spec.ammoPrice;
    this.ammo[id] += spec.ammoPack;
    this.audio.playPurchase();
    this.showToast(t.engine.ammoAddedToast(t.weapons[id].shortName, spec.ammoPack), 'cash');
    this.emitHud();
  }

  public buyGear(kind: 'armor' | 'health'): void {
    this.audio.unlock();
    const t = getTranslations(this.language);
    if (kind === 'armor') {
      if (this.armor >= 100) {
        this.showToast(t.engine.armorFullToast, 'mission');
        return;
      }
      if (this.cash < 200) {
        this.audio.playEmptyClick();
        this.showToast(t.engine.insufficientFundsToast(200), 'wanted');
        return;
      }
      this.cash -= 200;
      this.armor = Math.min(100, this.armor + 50);
      this.audio.playPurchase();
      this.showToast(t.engine.armorBoughtToast, 'cash');
    } else {
      if (this.health >= this.maxHealth) {
        this.showToast(t.engine.healthFullToast, 'mission');
        return;
      }
      if (this.cash < 150) {
        this.audio.playEmptyClick();
        this.showToast(t.engine.insufficientFundsToast(150), 'wanted');
        return;
      }
      this.cash -= 150;
      this.health = Math.min(this.maxHealth, this.health + 50);
      this.audio.playPurchase();
      this.showToast(t.engine.healthBoughtToast, 'cash');
    }
    this.emitHud();
  }

  public openClothingShop(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    this.phase = 'clothing';
    this.clearAllInputs();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public closeClothingShop(): void {
    if (this.phase !== 'clothing') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.emitHud();
  }

  public buyOrEquipOutfit(id: OutfitId): void {
    const spec = OUTFIT_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    const label = t.clothing.outfits[id].name;
    if (this.ownedOutfits[id]) {
      this.appearance = { ...this.appearance, outfit: id };
      applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
      this.showToast(t.engine.outfitEquippedToast(label), 'mission');
      this.emitHud();
      return;
    }
    if (this.cash < spec.price) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.price), 'wanted');
      this.emitHud();
      return;
    }
    this.cash -= spec.price;
    this.ownedOutfits[id] = true;
    this.appearance = { ...this.appearance, outfit: id };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.audio.playPurchase();
    this.showToast(t.engine.outfitBoughtToast(label), 'cash');
    this.emitHud();
  }

  public toggleSunglasses(): void {
    const t = getTranslations(this.language);
    this.audio.unlock();
    const next = !this.appearance.sunglasses;
    this.appearance = { ...this.appearance, sunglasses: next };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.audio.playPurchase();
    this.showToast(next ? t.engine.sunglassesOnToast : t.engine.sunglassesOffToast, 'mission');
    this.emitHud();
  }

  public openBarberShop(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    this.phase = 'barber';
    this.clearAllInputs();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public closeBarberShop(): void {
    if (this.phase !== 'barber') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.emitHud();
  }

  public buyOrEquipHairStyle(id: HairStyleId): void {
    const spec = HAIR_STYLE_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    const label = t.barber.hairStyles[id];
    if (this.ownedHairStyles[id]) {
      this.appearance = { ...this.appearance, hairStyle: id };
      applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
      this.showToast(t.engine.hairEquippedToast(label), 'mission');
      this.emitHud();
      return;
    }
    if (this.cash < spec.price) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.price), 'wanted');
      this.emitHud();
      return;
    }
    this.cash -= spec.price;
    this.ownedHairStyles[id] = true;
    this.appearance = { ...this.appearance, hairStyle: id };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.audio.playPurchase();
    this.showToast(t.engine.hairBoughtToast(label), 'cash');
    this.emitHud();
  }

  public buyOrEquipHairColor(id: HairColorId): void {
    const spec = HAIR_COLOR_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    const label = t.barber.hairColors[id];
    if (this.ownedHairColors[id]) {
      this.appearance = { ...this.appearance, hairColor: id };
      applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
      this.showToast(t.engine.hairColorToast(label), 'mission');
      this.emitHud();
      return;
    }
    if (this.cash < spec.price) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.price), 'wanted');
      this.emitHud();
      return;
    }
    this.cash -= spec.price;
    this.ownedHairColors[id] = true;
    this.appearance = { ...this.appearance, hairColor: id };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.audio.playPurchase();
    this.showToast(t.engine.hairColorToast(label), 'cash');
    this.emitHud();
  }

  public buyOrEquipBeardStyle(id: BeardStyleId): void {
    const spec = BEARD_STYLE_SPECS[id];
    const t = getTranslations(this.language);
    this.audio.unlock();
    const label = t.barber.beardStyles[id];
    if (this.ownedBeardStyles[id]) {
      this.appearance = { ...this.appearance, beardStyle: id };
      applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
      this.showToast(t.engine.beardEquippedToast(label), 'mission');
      this.emitHud();
      return;
    }
    if (this.cash < spec.price) {
      this.audio.playEmptyClick();
      this.showToast(t.engine.insufficientFundsToast(spec.price), 'wanted');
      this.emitHud();
      return;
    }
    this.cash -= spec.price;
    this.ownedBeardStyles[id] = true;
    this.appearance = { ...this.appearance, beardStyle: id };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.audio.playPurchase();
    this.showToast(t.engine.beardBoughtToast(label), 'cash');
    this.emitHud();
  }

  public cycleCameraMode(): void {
    if (this.phase !== 'playing') return;
    this.cameraMode = ((this.cameraMode + 1) % 3) as 0 | 1 | 2;
    this.emitHud();
  }

  private getCameraModeLabel(): string {
    return getTranslations(this.language).cameraModes[this.cameraMode];
  }

  private resetGame(): void {
    this.playerX = this.city.spawnPoints.player.x;
    this.playerZ = this.city.spawnPoints.player.z;
    this.playerY = this.getGroundHeight(this.playerX, this.playerZ) + 0.025;
    this.playerVy = 0;
    this.playerRotY = 0;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);

    this.health = 100;
    this.armor = 50;
    this.cash = 250;
    this.activeWeapon = 'pistol';
    this.lastFirearm = 'pistol';
    this.ownedWeapons = { unarmed: true, knife: false, pistol: true, smg: false, shotgun: false, rifle: false };
    this.magAmmo = { unarmed: 0, knife: 0, pistol: 12, smg: 0, shotgun: 0, rifle: 0 };
    this.ammo = { unarmed: 0, knife: 0, pistol: 60, smg: 0, shotgun: 0, rifle: 0 };
    this.reloading = false;
    this.reloadTimer = 0;
    this.meleeSwingTimer = 0;
    this.aimToggled = false;
    this.virtualAim = false;
    this.isAiming = false;
    this.nearWeaponShop = false;
    this.nearClothingShop = false;
    this.nearBarberShop = false;
    this.appearance = {
      outfit: 'biker',
      sunglasses: true,
      hairStyle: 'pompadour',
      hairColor: 'black',
      beardStyle: 'stubble',
    };
    this.ownedOutfits = { biker: true, miami: false, tuxedo: false, street: false, tactical: false, gold: false };
    this.ownedHairStyles = { pompadour: true, buzz: false, fade: false, slick: false, afro: false, bald: false };
    this.ownedHairColors = { black: true, brown: false, blonde: false, red: false, silver: false, neon: false };
    this.ownedBeardStyles = { stubble: true, clean: false, goatee: false, full: false };
    applyPlayerAppearance(this.playerRig, this.appearance, this.textures);
    this.syncPlayerWeaponMesh();

    this.wantedStars = 0;
    this.wantedHeat = 0;
    this.wantedEvadeTimer = 0;
    this.wantedEvading = false;
    this.bustedTimer = 0;
    this.roadblockTimer = 0;
    this.policeHeliRig.group.visible = false;
    this.policeHeliRig.spotTarget.visible = false;
    this.nitro = 100;
    this.cameraYaw = 0;
    this.cameraPitch = 0.3;
    this.cameraTargetYaw = 0;
    this.cameraTargetPitch = 0.3;
    this.manualLookTimer = 0;
    this.mission = {
      active: false,
      index: 0,
      totalMissions: 6,
      type: 'none',
      title: getTranslations(this.language).hud.freeRoamTitle,
      objective: getTranslations(this.language).hud.freeRoamObjective,
      timeLeft: 0,
      reward: 0,
    };
    this.missionTargetMesh.visible = false;
    this.missionBeaconMesh.visible = true;
    this.missionVehicleId = null;
    this.missionStage = 0;
    this.missionCounter = 0;
    this.raceCheckpoints = [];
    this.raceCheckpointIdx = 0;
    this.missionBanner = null;
    this.missionBannerTimer = 0;
    this.weather = 'sunny';
    this.weatherTimer = 75;
    this.rainBlend = 0;
    this.fogBlend = 0;
    this.stats = { missionsCompleted: 0, vehiclesHijacked: 0, stuntCash: 0 };
    this.populateWorld();
  }

  public toggleMute(): boolean {
    const m = this.audio.toggleMute();
    this.emitHud();
    return m;
  }

  private showToast(text: string, tone: HudSnapshot['toastTone'] = 'cash'): void {
    this.toastText = text;
    this.toastTone = tone;
    this.toastTimer = 3.2;
  }

  private showMissionBanner(
    title: string,
    subtitle: string,
    tone: 'passed' | 'failed' | 'brief',
    duration = 4.2,
  ): void {
    this.missionBanner = { title, subtitle, tone };
    this.missionBannerTimer = duration;
  }

  // Event Binding
  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.onMouseDownBound);
    dom.addEventListener('wheel', this.onWheelBound, { passive: true });
    dom.addEventListener('contextmenu', this.onContextMenuBound);
    dom.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    dom.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
    dom.addEventListener('touchend', this.onTouchEndBound);
    dom.addEventListener('touchcancel', this.onTouchEndBound);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) {
      e.preventDefault();
    }

    if (code === 'Tab') {
      if (this.phase === 'playing' || this.phase === 'map') {
        this.toggleMap();
      }
      return;
    }

    if (code === 'Escape') {
      if (this.phase === 'map') {
        this.closeMap();
      } else if (this.phase === 'shop') {
        this.closeWeaponShop();
      } else if (this.phase === 'clothing') {
        this.closeClothingShop();
      } else if (this.phase === 'barber') {
        this.closeBarberShop();
      } else if (this.phase === 'playing') {
        this.pauseGame();
      } else if (this.phase === 'paused') {
        this.resumeGame();
      }
      return;
    }

    if (this.phase === 'title' && (code === 'Enter' || code === 'Space')) {
      this.startGame();
      return;
    }

    if (!this.held.has(code)) {
      this.justPressed.add(code);
    }
    this.held.add(code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.held.delete(e.code);
  }

  private handleBlur(): void {
    this.clearAllInputs();
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const dpr = this.getTargetDpr(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.phase !== 'playing') return;
    // Ignore synthetic mouse events fired right after touch interactions
    if (performance.now() - this.lastTouchTimestamp < 650) return;
    this.audio.unlock();
    this.lastMousePos.x = e.clientX;
    this.lastMousePos.y = e.clientY;
    if (e.button === 0) {
      this.leftMouseDown = true;
      if (!this.currentVehicle && !this.pointerLocked && this.renderer.domElement.requestPointerLock) {
        try {
          this.renderer.domElement.requestPointerLock();
        } catch {
          // Pointer lock optional
        }
      }
    } else if (e.button === 2 || e.button === 1) {
      this.rightMouseDown = true;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.leftMouseDown = false;
    if (e.button === 2 || e.button === 1) this.rightMouseDown = false;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.phase !== 'playing') return;
    const canDragLook = this.pointerLocked || this.rightMouseDown || (Boolean(this.currentVehicle) && this.leftMouseDown);
    if (!canDragLook) return;
    const dx = this.pointerLocked ? e.movementX : e.clientX - this.lastMousePos.x;
    const dy = this.pointerLocked ? e.movementY : e.clientY - this.lastMousePos.y;
    this.lastMousePos.x = e.clientX;
    this.lastMousePos.y = e.clientY;
    this.cameraTargetYaw -= dx * 0.0036 * this.mouseSensitivity;
    this.cameraTargetPitch = THREE.MathUtils.clamp(
      this.cameraTargetPitch + dy * 0.0028 * this.mouseSensitivity,
      -0.14,
      0.96,
    );
    this.manualLookTimer = 1.9;
  }

  private handleTouchStart(e: TouchEvent): void {
    this.lastTouchTimestamp = performance.now();
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    if (this.activeCameraTouchId === null && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      this.activeCameraTouchId = t.identifier;
      this.lastTouchPos.x = t.clientX;
      this.lastTouchPos.y = t.clientY;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    this.lastTouchTimestamp = performance.now();
    if (this.phase !== 'playing' || this.activeCameraTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.activeCameraTouchId) {
        e.preventDefault();
        const dx = t.clientX - this.lastTouchPos.x;
        const dy = t.clientY - this.lastTouchPos.y;
        this.lastTouchPos.x = t.clientX;
        this.lastTouchPos.y = t.clientY;
        this.cameraTargetYaw -= dx * 0.0062;
        this.cameraTargetPitch = THREE.MathUtils.clamp(this.cameraTargetPitch + dy * 0.0046, -0.14, 0.96);
        this.manualLookTimer = 1.9;
        break;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.lastTouchTimestamp = performance.now();
    if (this.activeCameraTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.activeCameraTouchId) {
        this.activeCameraTouchId = null;
        break;
      }
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.phase !== 'playing' || this.currentVehicle) return;
    const order = this.getAvailableWeaponOrder();
    const idx = Math.max(0, order.indexOf(this.activeWeapon));
    const next = (idx + (e.deltaY > 0 ? 1 : -1) + order.length) % order.length;
    this.selectWeapon(order[next]);
  }

  // Main Loop
  private startLoop(): void {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private processDualSenseInput(dt: number): void {
    const gp = this.dualsense.poll();
    if (gp.connected !== this.prevGamepadConnected) {
      this.prevGamepadConnected = gp.connected;
      if (gp.connected) {
        this.showToast(getTranslations(this.language).engine.gamepadConnectedToast(gp.name), 'mission');
        this.triggerHaptic(0.35, 0.25, 110);
      } else {
        this.showToast(getTranslations(this.language).engine.gamepadDisconnectedToast, 'mission');
      }
      this.emitHud();
    }

    if (!gp.connected) return;

    const just = gp.justPressed;
    if (just.size > 0) {
      this.audio.unlock();
    }

    if (this.phase === 'title') {
      if (just.has('cross') || just.has('options')) {
        this.startGame();
      }
      return;
    }

    if (this.phase === 'map') {
      if (just.has('circle') || just.has('touchpad') || just.has('create') || just.has('options')) {
        this.closeMap();
      }
      return;
    }

    if (this.phase === 'shop') {
      if (just.has('circle') || just.has('options')) {
        this.closeWeaponShop();
      }
      return;
    }

    if (this.phase === 'clothing') {
      if (just.has('circle') || just.has('options')) {
        this.closeClothingShop();
      }
      return;
    }

    if (this.phase === 'barber') {
      if (just.has('circle') || just.has('options')) {
        this.closeBarberShop();
      }
      return;
    }

    if (this.phase === 'paused') {
      if (just.has('cross') || just.has('circle') || just.has('options')) {
        this.resumeGame();
      } else if (just.has('square')) {
        this.restartGame();
      }
      return;
    }

    if (this.phase === 'wasted' || this.phase === 'busted') {
      if (just.has('cross') || just.has('options')) {
        this.restartGame();
      }
      return;
    }

    // Playing phase DualSense camera + action controls
    if (Math.abs(gp.rx) > 0.001 || Math.abs(gp.ry) > 0.001) {
      const yawSpeed = (this.isAiming ? 1.85 : 2.95) * this.mouseSensitivity;
      const pitchSpeed = (this.isAiming ? 1.3 : 2.05) * this.mouseSensitivity;
      this.cameraTargetYaw -= gp.rx * yawSpeed * dt;
      this.cameraTargetPitch = THREE.MathUtils.clamp(
        this.cameraTargetPitch + gp.ry * pitchSpeed * dt,
        -0.12,
        0.92,
      );
      this.manualLookTimer = 1.9;
    }

    if (just.has('options')) {
      this.pauseGame();
      return;
    }

    if (just.has('touchpad') || just.has('create')) {
      this.openMap();
      return;
    }

    if (just.has('triangle')) {
      this.triggerEnterExitVehicle();
    }

    if (just.has('r3') || just.has('dpadRight')) {
      this.cycleCameraMode();
      this.showToast(getTranslations(this.language).engine.cameraToast(this.getCameraModeLabel()), 'mission');
    }

    if (just.has('dpadLeft')) {
      this.cycleWeather();
    }

    if (just.has('dpadUp')) {
      if (!this.currentVehicle && this.nearWeaponShop) {
        this.openWeaponShop();
        return;
      } else if (!this.currentVehicle && this.nearClothingShop) {
        this.openClothingShop();
        return;
      } else if (!this.currentVehicle && this.nearBarberShop) {
        this.openBarberShop();
        return;
      } else if (!this.mission.active) {
        this.startNextMission();
      }
    }

    if (this.currentVehicle) {
      if (just.has('l1')) {
        this.audio.playHorn();
      }
      if (just.has('dpadDown')) {
        this.toggleRadarZoom();
      }
    } else {
      if (just.has('r1')) {
        this.cycleWeapon();
      }
      if (just.has('l1')) {
        this.toggleHolster();
      }
      if (just.has('square')) {
        this.reloadWeapon();
      }
      if (just.has('dpadDown')) {
        this.dropCurrentWeapon();
      }
      if (just.has('circle')) {
        if (this.nearWeaponShop) {
          this.openWeaponShop();
          return;
        } else if (this.nearClothingShop) {
          this.openClothingShop();
          return;
        } else if (this.nearBarberShop) {
          this.openBarberShop();
          return;
        } else if (!this.mission.active) {
          this.startNextMission();
        } else {
          this.toggleHolster();
        }
      }
    }
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.processDualSenseInput(dt);

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastText = '';
    }

    if (this.missionBannerTimer > 0) {
      this.missionBannerTimer -= dt;
      if (this.missionBannerTimer <= 0) {
        this.missionBanner = null;
      }
    }

    // Animated sunset clouds & ocean wave shader / normal scroll
    this.skyMat.uniforms.uTime.value = this.elapsed;
    this.textures.waterNormal.offset.x = (this.elapsed * 0.015) % 1;
    this.textures.waterNormal.offset.y = (this.elapsed * 0.01) % 1;
    const waterMat = this.city.waterMesh.material as THREE.MeshStandardMaterial;
    waterMat.roughness = 0.08 + Math.sin(this.elapsed * 1.4) * 0.02 + this.rainBlend * 0.05;
    if (waterMat.userData.shader?.uniforms?.uTime) {
      waterMat.userData.shader.uniforms.uTime.value = this.elapsed;
    }

    // Weather cycle & atmospheric transitions (sunny -> rainy -> foggy)
    this.updateWeather(dt);

    // Spin mission & shop coronas and bob floating chevron arrow
    this.missionBeaconMesh.rotation.y += dt * 1.4;
    this.shopBeaconMesh.rotation.y += dt * 1.6;
    this.clothingBeaconMesh.rotation.y += dt * 1.6;
    this.barberBeaconMesh.rotation.y += dt * 1.6;
    if (this.missionTargetMesh.visible) {
      this.missionTargetMesh.rotation.y += dt * 2.0;
      const arrow = this.missionTargetMesh.children[2];
      if (arrow) arrow.position.y = 3.8 + Math.sin(this.elapsed * 4.2) * 0.35;
    }

    // Title Screen live cinematic city pan
    if (this.phase === 'title') {
      this.updateTrafficAndPeds(dt, false);
      const orbitAng = this.elapsed * 0.14;
      const camX = Math.cos(orbitAng) * 95;
      const camZ = Math.sin(orbitAng) * 95;
      this.camera.position.set(camX, 38 + Math.sin(this.elapsed * 0.3) * 5, camZ);
      this.camera.lookAt(-20, 6, -15);
      this.audio.updateContinuous(false, 0, false, 0, this.elapsed, true, 0);
      this.justPressed.clear();
      return;
    }

    if (this.phase === 'map') {
      this.audio.updateContinuous(false, 0, false, 0, this.elapsed, true, 0);
      this.drawMinimap();
      this.drawFullMap();
      this.justPressed.clear();
      return;
    }

    if (
      this.phase === 'paused' ||
      this.phase === 'shop' ||
      this.phase === 'clothing' ||
      this.phase === 'barber' ||
      this.phase === 'wasted' ||
      this.phase === 'busted'
    ) {
      this.audio.updateContinuous(false, 0, false, 0, this.elapsed, true, 0);
      this.justPressed.clear();
      return;
    }

    // Brief simulation hitstop on explosions
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticles(dt * 0.25);
      this.justPressed.clear();
      return;
    }

    this.handlePlayingActions();
    this.updatePlayer(dt);
    this.updateVehicles(dt);
    this.updateTrafficAndPeds(dt, true);
    this.updatePoliceSystem(dt);
    this.updateMissionSystem(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateTracers(dt);
    this.updateOnlineMultiplayer(dt);
    this.updateCamera(dt);
    this.updateContextualPrompt();
    this.minimapAccum += dt;
    if (this.minimapAccum >= 0.05) {
      this.minimapAccum = 0;
      this.drawMinimap();
    }

    // Update sun shadow camera target around player (texel-snapped to eliminate shadow shimmer)
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const shadowTexel = (46 * 2) / 1536;
    const spx = Math.round(px / shadowTexel) * shadowTexel;
    const spz = Math.round(pz / shadowTexel) * shadowTexel;
    this.dirLight.target.position.set(spx, py, spz);
    this.dirLight.position.set(spx - 70, py + 85, spz - 45);

    // Decay muzzle light & flash
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 28);
    }

    // Continuous Web Audio engine, rain ambience & sirens
    const inVeh = Boolean(this.currentVehicle);
    const speedNorm = inVeh ? Math.min(1, Math.abs(this.currentVehicle!.speed) / 42) : 0;
    const gpState = this.dualsense.state;
    const drifting =
      inVeh &&
      (this.held.has('Space') || this.virtualBrake || gpState.held.has('square') || gpState.held.has('r1')) &&
      Math.abs(this.currentVehicle!.speed) > 10;
    const siren = this.wantedStars > 0 ? (this.wantedEvading ? 0.35 : 0.95) : 0;
    this.audio.updateContinuous(inVeh, speedNorm, drifting, siren, this.elapsed, false, this.rainBlend);

    this.justPressed.clear();
    this.virtualJumpQueued = false;

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.065) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private handlePlayingActions(): void {
    // Weapon switching, holster, drop, reload, aim toggle
    if (!this.currentVehicle) {
      if (this.justPressed.has('Digit0') || this.justPressed.has('KeyX')) this.toggleHolster();
      if (this.justPressed.has('Digit1')) this.selectWeapon('knife');
      if (this.justPressed.has('Digit2')) this.selectWeapon('pistol');
      if (this.justPressed.has('Digit3')) this.selectWeapon('smg');
      if (this.justPressed.has('Digit4')) this.selectWeapon('shotgun');
      if (this.justPressed.has('Digit5')) this.selectWeapon('rifle');
      if (this.justPressed.has('KeyR')) this.reloadWeapon();
      if (this.justPressed.has('KeyG')) this.dropCurrentWeapon();
      if (this.justPressed.has('KeyV')) {
        this.aimToggled = !this.aimToggled;
      }
      if (this.justPressed.has('KeyB')) {
        if (this.nearWeaponShop) {
          this.openWeaponShop();
          return;
        }
        if (this.nearClothingShop) {
          this.openClothingShop();
          return;
        }
        if (this.nearBarberShop) {
          this.openBarberShop();
          return;
        }
      }
    }

    // Horn inside vehicle
    if (this.currentVehicle && this.justPressed.has('KeyH')) {
      this.audio.playHorn();
    }

    // Camera mode cycling [C] & manual weather cycle [T]
    if (this.justPressed.has('KeyC')) {
      this.cycleCameraMode();
      this.showToast(getTranslations(this.language).engine.cameraToast(this.getCameraModeLabel()), 'mission');
    }
    if (this.justPressed.has('KeyT')) {
      this.cycleWeather();
    }

    // Quick mission contract dispatch
    if (!this.mission.active && this.justPressed.has('KeyM')) {
      this.startNextMission();
    }

    // Enter / Exit Vehicle [F]
    if (this.justPressed.has('KeyF')) {
      if (this.currentVehicle) {
        this.exitCurrentVehicle();
      } else {
        this.tryEnterNearestVehicle();
      }
    }

    // Pay 'n' Spray activation if near garage
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const distGarage = Math.hypot(px - this.city.payNSprayPos.x, pz - this.city.payNSprayPos.z);
    if (distGarage < 9 && this.cash >= 200 && (this.wantedStars > 0 || (this.currentVehicle && this.currentVehicle.hp < this.currentVehicle.maxHp))) {
      this.cash -= 200;
      this.wantedStars = 0;
      this.wantedEvading = false;
      this.wantedEvadeTimer = 0;
      if (this.currentVehicle) {
        this.currentVehicle.hp = this.currentVehicle.maxHp;
        const newCol = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
        if (this.currentVehicle.type !== 'police') {
          (this.currentVehicle.rig.bodyMesh.material as THREE.MeshPhysicalMaterial).color.setHex(newCol);
          this.currentVehicle.rig.baseColor.setHex(newCol);
        }
      }
      this.audio.playPickup(true);
      this.showToast(getTranslations(this.language).engine.sprayToast, 'mission');
    }
  }

  private tryEnterNearestVehicle(): void {
    let best: VehicleEntity | null = null;
    let bestDist = 5.0;
    for (const v of this.vehicles) {
      if (v.exploded) continue;
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    if (!best) return;

    this.audio.playDoorSlam();
    this.virtualFire = false;
    this.virtualSprint = false;
    this.currentVehicle = best;
    best.moveYaw = best.rotY;
    // Immediately align camera behind vehicle for effortless driving
    this.cameraTargetYaw = best.rotY + Math.PI;
    this.manualLookTimer = 0;
    if (best.rig.headlightCone) best.rig.headlightCone.visible = true;
    this.playerRig.group.visible = false;

    if (best.hasDriver) {
      best.hasDriver = false;
      best.aiRole = 'none';
      // Eject fleeing NPC driver beside car
      const sideX = best.x - Math.cos(best.rotY) * 2.2;
      const sideZ = best.z + Math.sin(best.rotY) * 2.2;
      const ejected = this.spawnNpc('pedestrian', 0xf4a261, sideX, sideZ);
      ejected.fleeTimer = 6;
      this.stats.vehiclesHijacked++;
      if (best.type === 'police') {
        this.addWantedHeat(0, 'Polis Aracı Kaçırıldı!', 48);
      } else {
        this.addWantedHeat(0, 'Araç Gaspı!', 18);
      }
    } else if (best.type === 'police') {
      this.addWantedHeat(0, 'Polis Aracına Girildi!', 32);
    }

    // Check if hijacked mission target car (Mission 2 GT-X or Mission 5 Convoy SUV)
    if (this.mission.active && (this.mission.type === 'hijack' || this.mission.type === 'convoy') && best.id === this.missionVehicleId) {
      best.aiRole = 'none';
      this.missionStage = 2;
      this.mission.stageLabel = 'Aşama 2/2';
      this.mission.objective = 'Polisten sıyrıl (veya Boyahaneye B gir) ve aracı Solaris İskelesine ulaştır!';
      this.missionTargetPos.copy(this.city.spawnPoints.deliveryTargets[0]);
      this.missionTargetMesh.position.copy(this.missionTargetPos);
      this.setBeaconColor(this.missionTargetMesh, 0x00f5d4);
      this.missionTargetMesh.visible = true;
      const heatTarget = this.mission.type === 'convoy' ? 3 : 2;
      if (this.wantedStars < heatTarget) {
        this.addWantedHeat(heatTarget - this.wantedStars, this.mission.type === 'convoy' ? 'Konvoy Alarmı!' : 'GT-X Alarmı!');
      }
      this.showToast('Araç ele geçirildi! İskele teslimat noktasına sür.', 'mission');
    }
    this.emitHud();
  }

  private exitCurrentVehicle(): void {
    const v = this.currentVehicle;
    if (!v) return;
    this.audio.playDoorSlam();
    const cosR = Math.cos(v.rotY);
    const sinR = Math.sin(v.rotY);
    const leftX = v.x - cosR * 2.15;
    const leftZ = v.z + sinR * 2.15;
    let spawnX = leftX;
    let spawnZ = leftZ;
    let blockedLeft = false;
    this.resolveCircleWorldCollision(leftX, leftZ, 0.52, (nx, nz, hit) => {
      if (hit) blockedLeft = true;
      spawnX = nx;
      spawnZ = nz;
    });
    if (blockedLeft) {
      const rightX = v.x + cosR * 2.15;
      const rightZ = v.z - sinR * 2.15;
      this.resolveCircleWorldCollision(rightX, rightZ, 0.52, (nx, nz) => {
        spawnX = nx;
        spawnZ = nz;
      });
    }
    this.resolveCircleAgainstVehicles(spawnX, v.y + 0.025, spawnZ, 0.52, null, (nx, nz) => {
      spawnX = nx;
      spawnZ = nz;
    });
    this.playerX = spawnX;
    this.playerZ = spawnZ;
    this.playerY = Math.max(this.getGroundHeight(spawnX, spawnZ) + 0.025, v.y + 0.025);
    this.playerVy = 0;
    this.playerRotY = v.rotY;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.visible = true;
    this.virtualGas = false;
    this.virtualReverse = false;
    this.virtualBrake = false;
    this.virtualSprint = false;
    if (v.rig.headlightCone) v.rig.headlightCone.visible = false;
    this.currentVehicle = null;
    this.emitHud();
  }

  private updatePlayer(dt: number): void {
    // Camera yaw keyboard rotation fallback (Q / E)
    if (this.held.has('KeyQ')) {
      this.cameraTargetYaw += 2.4 * dt;
      this.manualLookTimer = 1.9;
    }
    if (this.held.has('KeyE')) {
      this.cameraTargetYaw -= 2.4 * dt;
      this.manualLookTimer = 1.9;
    }

    if (this.currentVehicle) return;

    // On-foot movement relative to cameraYaw (keyboard + virtual joystick + DualSense left stick)
    const gp = this.dualsense.state;
    let moveFwd = this.virtualMoveY - gp.ly;
    let moveRight = this.virtualMoveX + gp.lx;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) moveFwd += 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) moveFwd -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) moveRight += 1;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) moveRight -= 1;

    const fwdX = -Math.sin(this.cameraYaw);
    const fwdZ = -Math.cos(this.cameraYaw);
    const rightX = Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    let dx = fwdX * moveFwd + rightX * moveRight;
    let dz = fwdZ * moveFwd + rightZ * moveRight;
    const len = Math.hypot(dx, dz);
    const analogStrength = Math.min(1, Math.hypot(moveRight, moveFwd));
    const sprinting =
      this.held.has('ShiftLeft') || this.held.has('ShiftRight') || this.virtualSprint || gp.held.has('l3');
    const moveSpeed = (sprinting ? 10.2 : 6.2) * (len > 0.01 ? Math.max(0.35, analogStrength) : 1);

    if (len > 0.01) {
      dx /= len;
      dz /= len;
      const curGround = this.getGroundHeight(this.playerX, this.playerZ);
      const nextX = this.playerX + dx * moveSpeed * dt;
      const nextZ = this.playerZ + dz * moveSpeed * dt;
      const nextGround = this.getGroundHeight(nextX, nextZ);
      // Gentle speed moderation on steep mountain climbs without blocking ascent
      const slopeRise = Math.max(0, nextGround - curGround);
      const climbScale = slopeRise > 0.02 ? Math.max(0.62, 1 - slopeRise * 1.4) : 1;

      this.playerX += dx * moveSpeed * climbScale * dt;
      this.playerZ += dz * moveSpeed * climbScale * dt;
      this.playerWalkPhase += dt * (sprinting ? 15 : 10);
      this.playerMoveSpeed = moveSpeed * climbScale;
    } else {
      this.playerWalkPhase = 0;
      this.playerMoveSpeed = 0;
    }

    // Solid building & vehicle OBB collision (runs even when idle so moving cars never pass through Frank)
    this.resolveCircleAgainstVehicles(this.playerX, this.playerY, this.playerZ, 0.52, null, (nx, nz, hit, hitVeh) => {
      this.playerX = nx;
      this.playerZ = nz;
      if (hit && hitVeh && Math.abs(hitVeh.speed) > 6.5) {
        const impactSpd = Math.abs(hitVeh.speed);
        const knockDirX = Math.sin(hitVeh.moveYaw);
        const knockDirZ = Math.cos(hitVeh.moveYaw);
        this.playerX += knockDirX * Math.min(1.4, impactSpd * 0.08);
        this.playerZ += knockDirZ * Math.min(1.4, impactSpd * 0.08);
        if (this.playerHitFlash <= 0) {
          this.damagePlayer(Math.min(26, Math.round(impactSpd * 1.15)));
          this.playerVy = Math.max(this.playerVy, 3.2);
        }
      }
    });
    this.resolveCircleWorldCollision(this.playerX, this.playerZ, 0.5, (nx, nz) => {
      this.playerX = nx;
      this.playerZ = nz;
    });

    // Allow Frank onto the coastal Solaris Pier & up the Solaris Mountain ranges
    const bounds = this.city.playableBounds;
    const minPlayerX = Math.abs(this.playerZ) < 5.2 ? -226 : bounds.minX;
    this.playerX = THREE.MathUtils.clamp(this.playerX, minPlayerX, bounds.maxX);
    this.playerZ = THREE.MathUtils.clamp(this.playerZ, bounds.minZ, bounds.maxZ);

    // Terrain, ramp & vehicle-roof elevation, Jump & Gravity
    const groundY = this.getGroundHeightWithVehicles(this.playerX, this.playerY, this.playerZ) + 0.025;
    const grounded = this.playerY <= groundY + 0.14;
    if ((this.justPressed.has('Space') || this.virtualJumpQueued || gp.justPressed.has('cross')) && grounded) {
      this.playerVy = 7.4;
    }
    this.playerVy -= 20 * dt;
    this.playerY += this.playerVy * dt;
    if (this.playerY <= groundY) {
      this.playerY = groundY;
      this.playerVy = 0;
    }

    // Reload progression
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.reloadTimer = 0;
        if (this.activeWeapon !== 'unarmed') {
          const spec = WEAPON_SPECS[this.activeWeapon];
          const needed = spec.magSize - this.magAmmo[this.activeWeapon];
          const load = Math.min(needed, this.ammo[this.activeWeapon]);
          this.magAmmo[this.activeWeapon] += load;
          this.ammo[this.activeWeapon] -= load;
        }
      }
    }

    // Shooting / Punching / Knife Slash (Left Click, J, or Virtual Fire)
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.meleeSwingTimer = Math.max(0, this.meleeSwingTimer - dt);
    const wantsFire =
      this.leftMouseDown || this.held.has('KeyJ') || this.virtualFire || gp.r2 > 0.25 || gp.held.has('r2');
    if (wantsFire || this.isAiming) {
      this.playerRotY = Math.atan2(fwdX, fwdZ);
    } else if (len > 0.01) {
      const targetRot = Math.atan2(dx, dz);
      this.playerRotY = this.lerpAngle(this.playerRotY, targetRot, 1 - Math.exp(-14 * dt));
    }
    if (wantsFire && this.fireCooldown <= 0) {
      this.firePlayerWeapon(fwdX, fwdZ);
    }

    // Articulated 2-segment limb + stride twist + breathing torso animation
    const moving = len > 0.01;
    const swing = moving ? Math.sin(this.playerWalkPhase) * (sprinting ? 0.88 : 0.56) : 0;
    const kneeBendL = moving ? Math.max(0, Math.sin(this.playerWalkPhase + 0.8)) * (sprinting ? 1.05 : 0.65) : 0.04;
    const kneeBendR = moving ? Math.max(0, -Math.sin(this.playerWalkPhase + 0.8)) * (sprinting ? 1.05 : 0.65) : 0.04;
    const strideBob = moving ? Math.abs(Math.sin(this.playerWalkPhase)) * (sprinting ? 0.028 : 0.016) : 0;
    const idleBreath = Math.sin(this.elapsed * 2.4);

    this.playerRig.torsoGroup.position.y = 0.95 + idleBreath * 0.007 + strideBob;
    this.playerRig.torsoGroup.rotation.x = moving ? (sprinting ? 0.16 : 0.06) : idleBreath * 0.012;
    this.playerRig.torsoGroup.rotation.y = moving && !this.isAiming && !wantsFire ? -swing * 0.14 : 0;
    this.playerRig.headGroup.rotation.y = moving && !this.isAiming && !wantsFire ? swing * 0.1 : Math.sin(this.elapsed * 0.9) * 0.04;
    this.playerRig.headGroup.rotation.x = this.isAiming ? -0.05 : idleBreath * 0.015;

    this.playerRig.leftLeg.rotation.x = swing;
    this.playerRig.rightLeg.rotation.x = -swing;
    this.playerRig.leftKnee.rotation.x = kneeBendL;
    this.playerRig.rightKnee.rotation.x = kneeBendR;

    this.playerRig.leftArm.rotation.x = moving ? -swing * 0.68 : idleBreath * 0.025;
    this.playerRig.leftElbow.rotation.x = moving ? -0.45 : -0.16;

    if (this.reloading) {
      this.playerRig.rightArm.rotation.x = -0.85;
      this.playerRig.rightArm.rotation.z = 0;
      this.playerRig.rightElbow.rotation.x = -1.05;
    } else if (this.meleeSwingTimer > 0) {
      const p = 1 - this.meleeSwingTimer / 0.22;
      this.playerRig.rightArm.rotation.x = -Math.PI * (this.activeWeapon === 'knife' ? 0.52 : 0.58);
      this.playerRig.rightArm.rotation.z = this.activeWeapon === 'knife' ? -0.45 + p * 0.9 : 0;
      this.playerRig.rightElbow.rotation.x = -0.18;
    } else if ((wantsFire || this.isAiming) && this.activeWeapon !== 'unarmed' && this.activeWeapon !== 'knife') {
      this.playerRig.rightArm.rotation.x = -Math.PI * 0.46;
      this.playerRig.rightArm.rotation.z = 0;
      this.playerRig.rightElbow.rotation.x = -0.14;
    } else {
      this.playerRig.rightArm.rotation.x = moving ? swing * 0.68 : -idleBreath * 0.025;
      this.playerRig.rightArm.rotation.z = 0;
      this.playerRig.rightElbow.rotation.x = moving ? -0.45 : -0.16;
    }

    if (this.playerHitFlash > 0) {
      this.playerHitFlash -= dt;
      (this.playerRig.torsoMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        this.playerHitFlash > 0 ? 0xff2222 : 0x000000,
      );
    }

    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerRotY;
  }

  private firePlayerWeapon(fwdX: number, fwdZ: number): void {
    const w = this.activeWeapon;
    const spec = WEAPON_SPECS[w];

    // Unarmed punch (knocks surviving NPCs down!) & Combat Knife slash
    if (w === 'unarmed' || w === 'knife') {
      const isKnife = w === 'knife';
      this.fireCooldown = 1 / spec.fireRate;
      this.meleeSwingTimer = 0.22;
      if (isKnife) {
        this.audio.playKnifeSlash();
      } else {
        this.audio.playPunch();
      }
      this.cameraShake = Math.max(this.cameraShake, isKnife ? 0.1 : 0.08);
      this.triggerHaptic(isKnife ? 0.25 : 0.2, isKnife ? 0.18 : 0.14, 70);

      const hitX = this.playerX + Math.sin(this.playerRotY) * 1.45;
      const hitZ = this.playerZ + Math.cos(this.playerRotY) * 1.45;
      let hit = false;
      for (const n of this.npcs) {
        if (n.dead) continue;
        if (Math.hypot(n.x - hitX, n.z - hitZ) < 1.8) {
          this.damageNpc(
            n,
            spec.damage,
            Math.sin(this.playerRotY),
            Math.cos(this.playerRotY),
            !isKnife,
          );
          this.spawnParticles(n.x, n.y + 1.1, n.z, isKnife ? 8 : 5, 0xef476f, isKnife ? 5 : 4, 0.3);
          this.triggerHaptic(0.55, 0.45, 95);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const v of this.vehicles) {
          if (v.exploded) continue;
          if (Math.hypot(v.x - hitX, v.z - hitZ) < 2.6) {
            this.damageVehicle(v, isKnife ? 22 : 14, true);
            this.spawnParticles(hitX, this.playerY + 1.0, hitZ, 4, 0xffd166, 3, 0.22);
            break;
          }
        }
      }
      return;
    }

    if (this.reloading) return;

    if (this.magAmmo[w] <= 0) {
      if (this.ammo[w] > 0) {
        this.reloadWeapon();
      } else {
        this.fireCooldown = 0.35;
        this.audio.playEmptyClick();
        this.showToast(getTranslations(this.language).engine.outOfAmmoToast, 'wanted');
      }
      return;
    }

    this.magAmmo[w]--;
    this.fireCooldown = 1 / spec.fireRate;
    this.audio.playGunshot(w);
    this.cameraShake = Math.max(this.cameraShake, w === 'shotgun' ? 0.32 : w === 'rifle' ? 0.14 : 0.11);
    if (w === 'shotgun') {
      this.triggerHaptic(0.85, 0.78, 150);
    } else if (w === 'rifle') {
      this.triggerHaptic(0.48, 0.38, 85);
    } else if (w === 'smg') {
      this.triggerHaptic(0.28, 0.2, 55);
    } else {
      this.triggerHaptic(0.4, 0.3, 80);
    }

    const originX = this.playerX + Math.sin(this.playerRotY) * 0.72;
    const originY = this.playerY + 1.38;
    const originZ = this.playerZ + Math.cos(this.playerRotY) * 0.72;

    this.muzzleLight.position.set(originX, originY, originZ);
    this.muzzleLight.intensity = 6.5;

    // Holding, aiming, or firing warning shots alone never summons police; nearby pedestrians still react naturally
    for (const n of this.npcs) {
      if (!n.dead && n.role === 'pedestrian' && Math.hypot(n.x - this.playerX, n.z - this.playerZ) < 26) {
        n.fleeTimer = 6;
      }
    }

    // Compute exact 3D camera-center target point so bullets land directly at the crosshair
    this.camera.getWorldPosition(_camWorldPos);
    this.camera.getWorldDirection(_aimDir);
    let camHitDist = spec.range + 12;
    for (const c of this.city.colliders) {
      const t = this.rayIntersectAABB2D(
        _camWorldPos.x,
        _camWorldPos.z,
        _aimDir.x,
        _aimDir.z,
        c.minX,
        c.maxX,
        c.minZ,
        c.maxZ,
        camHitDist,
      );
      if (t !== null && t > 2.5 && t < camHitDist && _camWorldPos.y + _aimDir.y * t < c.height + 1) {
        camHitDist = t;
      }
    }
    for (const n of this.npcs) {
      if (n.dead) continue;
      const t = this.rayIntersectSphere(
        _camWorldPos.x,
        _camWorldPos.y,
        _camWorldPos.z,
        _aimDir.x,
        _aimDir.y,
        _aimDir.z,
        n.x,
        n.y + 1.0,
        n.z,
        0.78,
      );
      if (t !== null && t > 2.2 && t < camHitDist) {
        camHitDist = t;
      }
    }
    for (const v of this.vehicles) {
      if (v.exploded) continue;
      const hit = this.raycastVehicleMeshes(
        _camWorldPos.x,
        _camWorldPos.y,
        _camWorldPos.z,
        _aimDir.x,
        _aimDir.y,
        _aimDir.z,
        v,
        camHitDist,
      );
      if (hit && hit.distance > 2.5 && hit.distance < camHitDist) {
        camHitDist = hit.distance;
      }
    }
    if (_aimDir.y < -0.02) {
      const groundT = (0.12 - _camWorldPos.y) / _aimDir.y;
      if (groundT > 2.5 && groundT < camHitDist) camHitDist = groundT;
    }

    const aimPointX = _camWorldPos.x + _aimDir.x * camHitDist;
    const aimPointY = _camWorldPos.y + _aimDir.y * camHitDist;
    const aimPointZ = _camWorldPos.z + _aimDir.z * camHitDist;

    let baseDx = aimPointX - originX;
    let baseDy = aimPointY - originY;
    let baseDz = aimPointZ - originZ;
    const baseLen = Math.hypot(baseDx, baseDy, baseDz);
    if (baseLen > 0.2) {
      baseDx /= baseLen;
      baseDy /= baseLen;
      baseDz /= baseLen;
    } else {
      baseDx = fwdX;
      baseDy = 0;
      baseDz = fwdZ;
    }

    const effectiveSpread = spec.spread * (this.isAiming ? 0.32 : 1.0);
    for (let p = 0; p < spec.pellets; p++) {
      const spreadYaw = (Math.random() - 0.5) * effectiveSpread;
      const spreadPitch = (Math.random() - 0.5) * effectiveSpread * 0.55;
      const cosS = Math.cos(spreadYaw);
      const sinS = Math.sin(spreadYaw);
      const dirX = baseDx * cosS - baseDz * sinS;
      const dirZ = baseDx * sinS + baseDz * cosS;
      const dirY = baseDy + spreadPitch;

      this.castBullet(originX, originY, originZ, dirX, dirY, dirZ, spec.range, spec.damage, spec.color, true);
    }

    if (this.magAmmo[w] === 0 && this.ammo[w] > 0) {
      this.reloadWeapon();
    }
  }

  private castBullet(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    range: number,
    damage: number,
    colorHex: number,
    fromPlayer: boolean,
  ): void {
    const dLen = Math.hypot(dx, dy, dz) || 1;
    const ndx = dx / dLen;
    const ndy = dy / dLen;
    const ndz = dz / dLen;

    let bestT = range;
    let hitKind: 'none' | 'npc' | 'vehicle' | 'building' | 'player' | 'remote' = 'none';
    let hitNpc: NpcEntity | null = null;
    let hitVeh: VehicleEntity | null = null;
    let hitVehIntersect: THREE.Intersection | null = null;
    let hitRemote: RemotePlayerEntity | null = null;

    // Step along ray against colliders / actors (fast & zero-allocation)
    // 1. Check buildings
    for (const c of this.city.colliders) {
      const t = this.rayIntersectAABB2D(ox, oz, ndx, ndz, c.minX, c.maxX, c.minZ, c.maxZ, bestT);
      if (t !== null && t < bestT && oy + ndy * t < c.height + 1) {
        bestT = t;
        hitKind = 'building';
      }
    }

    // 2. Check NPCs & Online Remote Players
    if (fromPlayer) {
      for (const n of this.npcs) {
        if (n.dead) continue;
        const t = this.rayIntersectSphere(ox, oy, oz, ndx, ndy, ndz, n.x, n.y + 1.0, n.z, 0.72);
        if (t !== null && t < bestT) {
          bestT = t;
          hitKind = 'npc';
          hitNpc = n;
        }
      }
      if (this.onlineStatus === 'connected') {
        for (const rp of this.remotePlayers.values()) {
          const r = rp.inVehicle ? 1.9 : 0.78;
          const t = this.rayIntersectSphere(ox, oy, oz, ndx, ndy, ndz, rp.x, rp.y + 1.0, rp.z, r);
          if (t !== null && t < bestT) {
            bestT = t;
            hitKind = 'remote';
            hitRemote = rp;
            hitNpc = null;
          }
        }
      }
    } else if (!this.currentVehicle) {
      // Enemy bullet vs Player on foot
      const t = this.rayIntersectSphere(ox, oy, oz, ndx, ndy, ndz, this.playerX, this.playerY + 1.0, this.playerZ, 0.7);
      if (t !== null && t < bestT) {
        bestT = t;
        hitKind = 'player';
      }
    }

    // 3. Check Vehicles (broadphase sphere -> exact 3D body/glass mesh raycast)
    for (const v of this.vehicles) {
      if (v.exploded) continue;
      if (fromPlayer && v === this.currentVehicle) continue;
      const hit = this.raycastVehicleMeshes(ox, oy, oz, ndx, ndy, ndz, v, bestT);
      if (hit && hit.distance < bestT) {
        bestT = hit.distance;
        hitKind = 'vehicle';
        hitVeh = v;
        hitVehIntersect = hit;
        hitNpc = null;
        hitRemote = null;
      }
    }

    // 4. Check Mountain Terrain slopes outside flat city grid
    for (let t = 2; t < bestT; t += 2.5) {
      const rx = ox + ndx * t;
      const rz = oz + ndz * t;
      if (Math.abs(rx) > 144 || Math.abs(rz) > 144) {
        const gh = this.getGroundHeight(rx, rz);
        if (oy + ndy * t <= gh) {
          bestT = t;
          hitKind = 'building';
          hitNpc = null;
          hitVeh = null;
          hitVehIntersect = null;
          hitRemote = null;
          break;
        }
      }
    }

    const hx = ox + ndx * bestT;
    const hy = oy + ndy * bestT;
    const hz = oz + ndz * bestT;

    this.spawnTracer(ox, oy, oz, hx, hy, hz, colorHex);
    if (fromPlayer && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'shot',
          ox,
          oy,
          oz,
          hx,
          hy,
          hz,
          color: colorHex,
          weapon: this.activeWeapon,
        }),
      );
    }

    if (hitKind === 'building') {
      this.spawnParticles(hx, hy, hz, 4, 0xffd166, 4, 0.25);
    } else if (hitKind === 'npc' && hitNpc) {
      this.damageNpc(hitNpc, damage, ndx, ndz);
      this.spawnParticles(hx, hy, hz, 6, 0xef476f, 5, 0.32);
    } else if (hitKind === 'remote' && hitRemote) {
      this.spawnParticles(hx, hy, hz, 6, 0xef476f, 5, 0.32);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'hit', targetId: hitRemote.id, damage: Math.round(damage * 0.75) }));
      }
    } else if (hitKind === 'vehicle' && hitVeh) {
      if (hitVehIntersect) {
        this.addVehicleBulletMark(hitVeh, hitVehIntersect, ndx, ndy, ndz, damage);
      }
      if (!fromPlayer && hitVeh === this.currentVehicle) {
        this.damagePlayer(damage * 0.28);
      }
      this.damageVehicle(hitVeh, damage * 0.85, fromPlayer);
      this.spawnParticles(hx, hy, hz, 5, 0xffbe0b, 6, 0.3);
    } else if (hitKind === 'player') {
      this.damagePlayer(damage);
      this.spawnParticles(hx, hy, hz, 4, 0xef476f, 4, 0.25);
    }
  }

  private raycastVehicleMeshes(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    v: VehicleEntity,
    maxDist: number,
  ): THREE.Intersection | null {
    // Fast broadphase check encompassing full vehicle length + corners (handles point-blank inside sphere)
    const rx = ox - v.x;
    const ry = oy - (v.y + 0.85);
    const rz = oz - v.z;
    if (rx * rx + ry * ry + rz * rz > 2.95 * 2.95) {
      const broad = this.rayIntersectSphere(ox, oy, oz, dx, dy, dz, v.x, v.y + 0.85, v.z, 2.95);
      if (broad === null || broad > maxDist) return null;
    }

    v.rig.group.updateMatrixWorld(true);
    _rayOrigin.set(ox, oy, oz);
    _rayDir.set(dx, dy, dz).normalize();
    _bulletRaycaster.set(_rayOrigin, _rayDir);
    _bulletRaycaster.near = 0.05;
    _bulletRaycaster.far = maxDist;
    const hits = _bulletRaycaster.intersectObjects(v.rig.hitMeshes, false);
    return hits.length > 0 ? hits[0] : null;
  }

  private addVehicleBulletMark(
    v: VehicleEntity,
    hit: THREE.Intersection,
    rayDx: number,
    rayDy: number,
    rayDz: number,
    damage: number,
  ): void {
    const isGlass = hit.object === v.rig.glassMesh;
    v.rig.group.worldToLocal(_hitLocalPos.copy(hit.point));

    if (hit.face) {
      _hitWorldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
    } else {
      _hitWorldNormal.set(hit.point.x - v.x, hit.point.y - (v.y + 0.75), hit.point.z - v.z).normalize();
    }
    if (_hitWorldNormal.x * rayDx + _hitWorldNormal.y * rayDy + _hitWorldNormal.z * rayDz > 0) {
      _hitWorldNormal.negate();
    }

    v.rig.group.getWorldQuaternion(_quatInv).invert();
    _hitLocalNormal.copy(_hitWorldNormal).applyQuaternion(_quatInv).normalize();
    _hitLocalPos.addScaledVector(_hitLocalNormal, 0.013);

    const mat = isGlass ? this.bulletGlassMat : this.bulletMetalMat;
    const maxMarks = 28;
    let decal: THREE.Mesh;
    if (v.bulletMarks.length < maxMarks) {
      decal = new THREE.Mesh(this.bulletHoleGeo, mat);
      decal.renderOrder = 2;
      v.bulletMarks.push(decal);
      v.rig.group.add(decal);
    } else {
      decal = v.bulletMarks[v.bulletMarkCursor % maxMarks];
      v.bulletMarkCursor = (v.bulletMarkCursor + 1) % maxMarks;
      if (decal.material !== mat) {
        decal.material = mat;
      }
      decal.visible = true;
    }

    _decalQuat.setFromUnitVectors(_zAxis, _hitLocalNormal);
    decal.position.copy(_hitLocalPos);
    decal.quaternion.copy(_decalQuat);
    decal.rotateZ(Math.random() * Math.PI * 2);
    const sizeScale = (isGlass ? 1.18 : 0.96) * (0.85 + Math.random() * 0.34) * (damage >= 32 ? 1.08 : 0.94);
    decal.scale.setScalar(sizeScale);
  }

  private damageNpc(npc: NpcEntity, dmg: number, kx: number, kz: number, knockdown = false): void {
    npc.hp -= dmg;
    npc.hitFlash = 0.14;
    const pushScale = knockdown ? 0.95 : 0.45;
    npc.x += kx * pushScale;
    npc.z += kz * pushScale;
    this.resolveCircleWorldCollision(npc.x, npc.z, 0.45, (nx, nz) => {
      npc.x = nx;
      npc.z = nz;
    });
    npc.y = this.getGroundHeight(npc.x, npc.z) + 0.025;

    if (npc.role === 'pedestrian') {
      npc.fleeTimer = 8;
      this.addWantedHeat(0, 'Sivile Saldırı!', 10);
    } else if (npc.role === 'police') {
      this.addWantedHeat(0, 'Polise Ateş Açıldı!', 32);
    }

    if (npc.hp <= 0 && !npc.dead) {
      const wasKnockedDown = npc.knockdownTimer > 0 || npc.gettingUpTimer > 0;
      npc.dead = true;
      npc.knockdownTimer = 0;
      npc.gettingUpTimer = 0;
      npc.deadTimer = 3.5;
      npc.rig.group.rotation.x = wasKnockedDown ? -Math.PI / 2 : Math.PI / 2;
      npc.rig.group.position.set(npc.x, npc.y + 0.2, npc.z);
      this.spawnPickup('cash', npc.x, npc.z, npc.role === 'gang' ? 95 : 45);
      if (npc.role === 'gang' || npc.role === 'police') {
        this.spawnPickup('ammo', npc.x + 0.9, npc.z + 0.5, 24);
      }
      if (npc.role === 'pedestrian') {
        this.addWantedHeat(0, 'Sivil İhbarı!', 18);
      } else if (npc.role === 'police' && this.wantedStars < 2) {
        this.addWantedHeat(0, 'Memur Etkisiz Hale Getirildi!', 65);
      }
      if (npc.role === 'gang' && this.mission.active && this.mission.type === 'gang') {
        this.missionGangLeft = Math.max(0, this.missionGangLeft - 1);
        this.mission.progressText = `Kalan Hedef: ${this.missionGangLeft}`;
        if (this.missionGangLeft === 0 && this.missionStage === 1) {
          this.missionStage = 2;
          this.mission.stageLabel = 'Aşama 2/2';
          this.mission.progressText = 'Güvenli Eve Ulaş';
          const safehouse = new THREE.Vector3(90, 0.1, -120);
          this.missionTargetPos.copy(safehouse);
          this.missionTargetMesh.position.copy(safehouse);
          this.setBeaconColor(this.missionTargetMesh, 0x00f5d4);
          this.missionTargetMesh.visible = true;
          this.mission.objective = 'Bölge temizlendi! Polis geliyor — Güvenli Ev noktasına (Turkuaz) kaç!';
          this.addWantedHeat(Math.max(0, 2 - this.wantedStars), 'Çete Çatışması Bildirildi!');
          this.showToast('Çete dağıtıldı! Güvenli Eve kaç!', 'mission');
        }
      }
    } else if (knockdown && !npc.dead) {
      npc.knockdownTimer = 2.6;
      npc.gettingUpTimer = 0;
      npc.panicTimer = 0;
    }
  }

  private damageVehicle(v: VehicleEntity, dmg: number, byPlayer: boolean): void {
    if (v.exploded) return;
    v.hp -= dmg;
    v.hitFlash = 0.12;
    if (v.hp <= 0) {
      this.explodeVehicle(v, byPlayer);
    }
  }

  private explodeVehicle(v: VehicleEntity, byPlayer: boolean): void {
    v.exploded = true;
    v.explodeTimer = 14;
    v.speed = 0;
    v.vy = 5.5;
    (v.rig.bodyMesh.material as THREE.MeshPhysicalMaterial).color.setHex(0x1f2024);

    this.audio.playExplosion();
    this.hitstopTimer = 0.045; // 45ms impact hitstop
    this.cameraShake = 1.05;
    this.spawnParticles(v.x, v.y + 1.1, v.z, 28, 0xff6b35, 14, 0.85);
    this.spawnParticles(v.x, v.y + 1.4, v.z, 18, 0xffd166, 10, 0.7);
    this.spawnParticles(v.x, v.y + 1.6, v.z, 14, 0x2b2d42, 7, 1.2);

    if (byPlayer) {
      this.addWantedHeat(0, 'Araç İmha Edildi!', 28);
      if (v.aiRole === 'sabotageTarget' && this.mission.active && this.mission.type === 'sabotage') {
        this.missionSabotageLeft = Math.max(0, this.missionSabotageLeft - 1);
        this.mission.progressText = `Kalan Kaçakçı Aracı: ${this.missionSabotageLeft}`;
        const nextTarget = this.vehicles.find((veh) => veh.aiRole === 'sabotageTarget' && !veh.exploded);
        if (nextTarget) {
          this.missionTargetPos.set(nextTarget.x, 0.1, nextTarget.z);
          this.missionTargetMesh.position.copy(this.missionTargetPos);
        }
        if (this.missionSabotageLeft === 0) {
          this.completeMission();
        }
      }
    }

    if (this.currentVehicle === v) {
      this.damagePlayer(55);
      this.exitCurrentVehicle();
    }

    // Blast nearby NPCs
    for (const n of this.npcs) {
      if (!n.dead && Math.hypot(n.x - v.x, n.z - v.z) < 8.5) {
        this.damageNpc(n, 120, (n.x - v.x) * 0.2, (n.z - v.z) * 0.2);
      }
    }
  }

  private damagePlayer(dmg: number): void {
    if (this.phase !== 'playing') return;
    this.playerHitFlash = 0.18;
    this.cameraShake = Math.max(this.cameraShake, 0.28);
    this.audio.playImpact(0.6);
    this.triggerHaptic(0.55, Math.min(1, 0.35 + dmg * 0.02), 180);

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.7);
      this.armor -= absorbed;
      this.health -= dmg - absorbed;
    } else {
      this.health -= dmg;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.phase = 'wasted';
      this.audio.playGameOverStinger();
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
      this.emitHud();
    }
  }

  private updateVehicles(dt: number): void {
    let nearestSirenDistSq = Infinity;
    let nearestSirenVeh: VehicleEntity | null = null;
    let nearestSirenFlash = false;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // Hit flash visual
      if (v.hitFlash > 0) {
        v.hitFlash -= dt;
        (v.rig.bodyMesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(
          v.hitFlash > 0 ? 0x552211 : 0x000000,
        );
      }

      if (v.exploded) {
        v.explodeTimer -= dt;
        v.vy -= 20 * dt;
        v.y = Math.max(0, v.y + v.vy * dt);
        v.rig.group.position.set(v.x, v.y, v.z);
        if (Math.random() < 0.35) {
          this.spawnParticles(v.x, v.y + 1.0, v.z, 1, 0x3a3d46, 3, 0.9);
        }
        if (v.explodeTimer <= 0) {
          this.scene.remove(v.rig.group);
          this.vehicles.splice(i, 1);
        }
        continue;
      }

      // Damaged smoke
      if (v.hp < v.maxHp * 0.4 && Math.random() < 0.25) {
        this.spawnParticles(
          v.x + Math.sin(v.rotY) * 1.4,
          v.y + 0.9,
          v.z + Math.cos(v.rotY) * 1.4,
          1,
          v.hp < v.maxHp * 0.18 ? 0xff6b35 : 0x495057,
          2.5,
          0.6,
        );
      }

      // Flashing Police Sirens (emissive bars per car + 1 shared persistent PointLight on closest active cruiser)
      if (v.type === 'police' && v.rig.sirenRed && v.rig.sirenBlue) {
        const activeSiren = v.aiRole === 'police' && this.wantedStars > 0;
        if (activeSiren) {
          const flash = Math.sin(this.elapsed * 18) > 0;
          (v.rig.sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3.2 : 0.2;
          (v.rig.sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 3.2;
          const dxS = v.x - this.playerX;
          const dzS = v.z - this.playerZ;
          const distSqS = dxS * dxS + dzS * dzS;
          if (distSqS < nearestSirenDistSq) {
            nearestSirenDistSq = distSqS;
            nearestSirenVeh = v;
            nearestSirenFlash = flash;
          }
        } else {
          (v.rig.sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
          (v.rig.sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
        }
      }

      // Auto-headlights turn on for driven traffic & player vehicles in rain/fog
      if (v.rig.headlightCone) {
        const showLights = v === this.currentVehicle || (v.hasDriver && (this.rainBlend > 0.35 || this.fogBlend > 0.35));
        v.rig.headlightCone.visible = showLights;
        if (showLights) {
          (v.rig.headlightCone.material as THREE.MeshBasicMaterial).opacity =
            0.34 + (this.rainBlend * 0.14 + this.fogBlend * 0.18);
        }
      }

      const isPlayerCar = v === this.currentVehicle;
      if (isPlayerCar) {
        this.updatePlayerCarPhysics(v, dt);
      } else if (v.aiRole === 'traffic' || v.aiRole === 'convoy') {
        this.updateTrafficCarAI(v, dt);
        if (v.aiRole === 'convoy' && this.mission.active && this.mission.type === 'convoy') {
          this.missionTargetPos.set(v.x, 0.1, v.z);
          this.missionTargetMesh.position.copy(this.missionTargetPos);
        }
      } else if (v.aiRole === 'police') {
        this.updatePoliceCarAI(v, dt);
      } else {
        v.speed *= Math.exp(-3.5 * dt);
        if (Math.abs(v.speed) > 0.1) {
          v.x += Math.sin(v.rotY) * v.speed * dt;
          v.z += Math.cos(v.rotY) * v.speed * dt;
        }
      }

      // World boundaries (allow driving onto Solaris Pier & Solaris Mountain slopes) & smooth wall sliding
      const bounds = this.city.playableBounds;
      const minCarX = Math.abs(v.z) < 5.0 ? -224 : -162;
      v.x = THREE.MathUtils.clamp(v.x, minCarX, bounds.maxX - 4);
      v.z = THREE.MathUtils.clamp(v.z, bounds.minZ + 4, bounds.maxZ - 4);
      this.resolveCircleWorldCollision(v.x, v.z, 1.5, (nx, nz, hit) => {
        v.x = nx;
        v.z = nz;
        if (hit && Math.abs(v.speed) > 6) {
          if (isPlayerCar) {
            this.cameraShake = Math.max(this.cameraShake, 0.22);
            const impactForce = Math.min(1, Math.abs(v.speed) / 34);
            this.audio.playImpact(impactForce);
            this.triggerHaptic(impactForce * 0.65, impactForce * 0.9, 170);
          }
          // Dampen speed smoothly while sliding along walls — never invert forward speed into reverse!
          v.speed *= 0.62;
          v.moveYaw = this.lerpAngle(v.moveYaw, v.rotY, 0.55);
        }
      });

      // Ramp, Pier & Mountain Terrain Height Physics
      let rampHeight = this.getGroundHeight(v.x, v.z);
      for (const r of this.city.ramps) {
        const relX = v.x - r.x;
        const relZ = v.z - r.z;
        const along = relX * r.dirX + relZ * r.dirZ;
        const across = Math.abs(-relX * r.dirZ + relZ * r.dirX);
        if (across < r.width * 0.55 && along > -r.length * 0.5 && along < r.length * 0.52) {
          const t = (along + r.length * 0.5) / r.length;
          rampHeight = Math.max(rampHeight, t * r.height);
          if (t > 0.85 && Math.abs(v.speed) > 12 && v.vy < 4) {
            v.vy = Math.abs(v.speed) * 0.45;
          }
        }
      }

      if (v.y > rampHeight + 0.16 || v.vy > 0.2) {
        v.vy -= 18.5 * dt;
        v.y += v.vy * dt;
        v.airborneTime += dt;
        if (v.y <= rampHeight) {
          if (isPlayerCar && v.airborneTime > 0.65) {
            const bonus = Math.round(v.airborneTime * 150);
            this.cash += bonus;
            this.stats.stuntCash += bonus;
            this.audio.playPickup(true);
            this.triggerHaptic(0.5, 0.75, 220);
            this.showToast(getTranslations(this.language).engine.stuntBonusToast(bonus), 'stunt');
          }
          v.y = rampHeight;
          v.vy = 0;
          v.airborneTime = 0;
        }
      } else {
        v.y = rampHeight;
        v.airborneTime = 0;
      }

      // Spin wheels & steer front pivots
      v.wheelSpin += (v.speed * dt) / 0.38;
      v.rig.wheels.forEach((w) => (w.rotation.x = v.wheelSpin));
      v.rig.frontSteerPivots.forEach((p) => (p.rotation.y = v.steerAngle));

      // Terrain slope pitch/roll + suspension cornering roll
      const sinR = Math.sin(v.rotY);
      const cosR = Math.cos(v.rotY);
      const hFront = this.getGroundHeight(v.x + sinR * 1.6, v.z + cosR * 1.6);
      const hRear = this.getGroundHeight(v.x - sinR * 1.6, v.z - cosR * 1.6);
      const hLeft = this.getGroundHeight(v.x + cosR * 1.0, v.z - sinR * 1.0);
      const hRight = this.getGroundHeight(v.x - cosR * 1.0, v.z + sinR * 1.0);
      const groundedCar = v.y <= rampHeight + 0.18;
      const slopePitch = groundedCar ? -Math.atan2(hFront - hRear, 3.2) : THREE.MathUtils.clamp(-v.vy * 0.035, -0.35, 0.35);
      const slopeRoll = groundedCar ? Math.atan2(hLeft - hRight, 2.0) : 0;
      const steerRoll = -v.steerAngle * Math.min(1, Math.abs(v.speed) / 24) * 0.14;

      v.rig.group.position.set(v.x, v.y, v.z);
      v.rig.group.rotation.set(slopePitch, v.rotY, slopeRoll + steerRoll);

      if (isPlayerCar) {
        this.playerX = v.x;
        this.playerY = v.y + 0.5;
        this.playerZ = v.z;
      }
    }

    if (nearestSirenVeh) {
      this.policeSirenLight.position.set(nearestSirenVeh.x, nearestSirenVeh.y + 1.85, nearestSirenVeh.z);
      this.policeSirenLight.color.setHex(nearestSirenFlash ? 0xff2244 : 0x2288ff);
      this.policeSirenLight.intensity = 5.5;
    } else {
      this.policeSirenLight.intensity = 0;
    }

    // Exact 2D OBB Vehicle-to-Vehicle SAT Collision Solver (2 passes so cars never clip through each other)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.vehicles.length; i++) {
        const a = this.vehicles[i];
        if (a.exploded) continue;
        for (let j = i + 1; j < this.vehicles.length; j++) {
          const b = this.vehicles[j];
          if (b.exploded) continue;
          if (Math.abs(a.y - b.y) > 1.9) continue;

          const res = this.testVehicleObbCollision(a, b);
          if (!res) continue;

          const { nx, nz, overlap } = res;
          const aStatic = !a.hasDriver && a !== this.currentVehicle && Math.abs(a.speed) < 0.6;
          const bStatic = !b.hasDriver && b !== this.currentVehicle && Math.abs(b.speed) < 0.6;
          const wA = aStatic && !bStatic ? 0.68 : bStatic && !aStatic ? 0.32 : 0.5;
          const wB = 1 - wA;

          a.x -= nx * overlap * wA;
          a.z -= nz * overlap * wA;
          b.x += nx * overlap * wB;
          b.z += nz * overlap * wB;

          if (pass === 0) {
            const vax = Math.sin(a.moveYaw) * a.speed;
            const vaz = Math.cos(a.moveYaw) * a.speed;
            const vbx = Math.sin(b.moveYaw) * b.speed;
            const vbz = Math.cos(b.moveYaw) * b.speed;
            const velAlongNormal = (vbx - vax) * nx + (vbz - vaz) * nz;

            if (velAlongNormal < -0.1) {
              const closingSpeed = -velAlongNormal;
              const impulse = (1 + 0.22) * closingSpeed;

              const newVax = vax - nx * impulse * wA;
              const newVaz = vaz - nz * impulse * wA;
              const newVbx = vbx + nx * impulse * wB;
              const newVbz = vbz + nz * impulse * wB;

              const aFwdDot = newVax * Math.sin(a.rotY) + newVaz * Math.cos(a.rotY);
              const bFwdDot = newVbx * Math.sin(b.rotY) + newVbz * Math.cos(b.rotY);
              a.speed = THREE.MathUtils.clamp(aFwdDot, -13, 42);
              b.speed = THREE.MathUtils.clamp(bFwdDot, -13, 42);
              a.moveYaw = this.lerpAngle(a.moveYaw, a.rotY, 0.55);
              b.moveYaw = this.lerpAngle(b.moveYaw, b.rotY, 0.55);

              if (a.aiRole === 'traffic' && closingSpeed > 4) {
                a.speed *= 0.45;
              }
              if (b.aiRole === 'traffic' && closingSpeed > 4) {
                b.speed *= 0.45;
              }

              if (closingSpeed > 11) {
                const impactDmg = closingSpeed * 0.65;
                this.damageVehicle(a, impactDmg * 0.34, b === this.currentVehicle);
                this.damageVehicle(b, impactDmg * 0.52, a === this.currentVehicle);
                this.spawnParticles(
                  (a.x + b.x) * 0.5,
                  Math.max(a.y, b.y) + 0.8,
                  (a.z + b.z) * 0.5,
                  6,
                  0xffd166,
                  6,
                  0.28,
                );
                if (a === this.currentVehicle || b === this.currentVehicle) {
                  const impactForce = Math.min(1, closingSpeed / 30);
                  this.audio.playImpact(impactForce);
                  this.cameraShake = Math.max(this.cameraShake, 0.24);
                  this.triggerHaptic(impactForce * 0.7, impactForce * 0.95, 200);
                  if (closingSpeed > 22 && (b.type === 'police' || a.type === 'police')) {
                    this.addWantedHeat(0, 'Polis Aracına Çarpıldı!', 22);
                  }
                  // Police PIT/ramming kick when pursued at 2+ stars
                  const rammer = a.aiRole === 'police' ? a : b.aiRole === 'police' ? b : null;
                  if (rammer && this.wantedStars >= 2 && (rammer.policeRamCooldown ?? 0) <= 0) {
                    rammer.policeRamCooldown = 1.4;
                    const sideSign = Math.sin(this.currentVehicle!.rotY - rammer.rotY) >= 0 ? 1 : -1;
                    this.currentVehicle!.rotY += sideSign * Math.min(0.24, closingSpeed * 0.009);
                    this.damagePlayer(Math.min(8, Math.round(closingSpeed * 0.28)));
                  }
                }
              } else if ((a === this.currentVehicle || b === this.currentVehicle) && closingSpeed > 4.2) {
                const lightForce = Math.min(0.45, closingSpeed / 24);
                this.audio.playImpact(lightForce);
                this.cameraShake = Math.max(this.cameraShake, 0.09);
                this.triggerHaptic(lightForce * 0.5, lightForce * 0.65, 110);
              }
            }
          }
        }
      }

      // Keep separated vehicles clear of building walls & sync final transforms
      for (const v of this.vehicles) {
        if (v.exploded) continue;
        this.resolveCircleWorldCollision(v.x, v.z, 1.48, (nx, nz) => {
          v.x = nx;
          v.z = nz;
        });
        v.rig.group.position.x = v.x;
        v.rig.group.position.z = v.z;
        if (v === this.currentVehicle) {
          this.playerX = v.x;
          this.playerZ = v.z;
        }
      }
    }
  }

  private updatePlayerCarPhysics(v: VehicleEntity, dt: number): void {
    const gp = this.dualsense.state;
    const keyAccel = (this.held.has('KeyW') || this.held.has('ArrowUp') ? 1 : 0) -
      (this.held.has('KeyS') || this.held.has('ArrowDown') ? 1 : 0);
    const pedalAccel = (this.virtualGas ? 1 : 0) - (this.virtualReverse ? 1 : 0);
    const triggerAccel = gp.r2 - gp.l2;
    // Ignore slight accidental stick Y drift while mobile Gas pedal is held
    const stickAccel =
      this.virtualGas || this.virtualReverse
        ? 0
        : Math.abs(this.virtualMoveY) > 0.32
          ? this.virtualMoveY
          : 0;
    const accelIn = THREE.MathUtils.clamp(keyAccel + pedalAccel + stickAccel + triggerAccel, -1, 1);

    const keySteer = (this.held.has('KeyA') || this.held.has('ArrowLeft') ? 1 : 0) -
      (this.held.has('KeyD') || this.held.has('ArrowRight') ? 1 : 0);
    const steerRaw = THREE.MathUtils.clamp(keySteer - this.virtualMoveX - gp.lx, -1, 1);
    const steerIn = Math.abs(steerRaw) < 0.08 ? 0 : steerRaw;

    const handbrake =
      this.held.has('Space') || this.virtualBrake || gp.held.has('square') || gp.held.has('r1');
    const usingNitro =
      (this.held.has('ShiftLeft') ||
        this.held.has('ShiftRight') ||
        this.virtualSprint ||
        gp.held.has('cross') ||
        gp.held.has('l3')) &&
      this.nitro > 1 &&
      accelIn > 0;

    if (usingNitro) {
      this.nitro = Math.max(0, this.nitro - 28 * dt);
      if (Math.random() < 0.7) {
        this.spawnParticles(
          v.x - Math.sin(v.rotY) * 2.4,
          v.y + 0.35,
          v.z - Math.cos(v.rotY) * 2.4,
          1,
          0x00f5d4,
          3.5,
          0.22,
        );
      }
    } else {
      this.nitro = Math.min(100, this.nitro + 14 * dt);
    }

    // Weather-dependent road grip & handling adjustments (subtle, realistic & fun)
    const dampness = Math.min(1, this.rainBlend + this.fogBlend * 0.38);
    const rainSlip = this.rainBlend;
    const topSpeed =
      ((v.type === 'sports' ? 31 : v.type === 'muscle' ? 27 : 24) + (usingNitro ? 10 : 0)) *
      (1 - 0.04 * this.fogBlend);
    const accelPower =
      ((v.type === 'sports' ? 21 : 17) + (usingNitro ? 14 : 0)) * (1 - 0.09 * rainSlip - 0.03 * this.fogBlend);
    const brakeDecel = 38 * (1 - 0.24 * rainSlip - 0.09 * this.fogBlend);
    const coastDecay = 1.9 - 0.45 * rainSlip - 0.15 * this.fogBlend;

    if (handbrake) {
      v.speed *= Math.exp(-(3.8 - 0.95 * rainSlip) * dt);
      if (Math.abs(v.speed) > 8 && Math.random() < 0.65) {
        this.spawnParticles(
          v.x - Math.sin(v.rotY) * 1.6,
          v.y + 0.14,
          v.z - Math.cos(v.rotY) * 1.6,
          1,
          rainSlip > 0.4 ? 0xbcd8ee : 0xbfc4cc,
          2,
          0.45,
        );
      }
    } else if (accelIn > 0) {
      v.speed = Math.min(topSpeed, v.speed + accelPower * dt);
    } else if (accelIn < 0) {
      if (v.speed > 1) {
        v.speed = Math.max(0, v.speed - brakeDecel * dt);
      } else {
        v.speed = Math.max(-13, v.speed - 16 * dt);
      }
    } else {
      v.speed *= Math.exp(-coastDecay * dt);
    }

    // Wet road rear-tire spray mist during rain at cruising speeds
    if (rainSlip > 0.3 && Math.abs(v.speed) > 9 && Math.random() < 0.45 * rainSlip) {
      this.spawnParticles(
        v.x - Math.sin(v.rotY) * 1.7 + (Math.random() - 0.5) * 1.1,
        v.y + 0.12,
        v.z - Math.cos(v.rotY) * 1.7 + (Math.random() - 0.5) * 1.1,
        1,
        0xbad4ea,
        1.5,
        0.28,
      );
    }

    // Brake light emissive brightness
    const braking = accelIn < 0 || handbrake;
    v.rig.brakeLights.forEach((bl) => {
      (bl.material as THREE.MeshStandardMaterial).emissiveIntensity = braking ? 2.2 : 0.45;
    });

    const targetSteer = steerIn * 0.4;
    v.steerAngle = THREE.MathUtils.damp(v.steerAngle, targetSteer, 14, dt);

    // Speed-adaptive steering & weather traction (wet roads introduce subtle cornering slip)
    const speedAbs = Math.abs(v.speed);
    const lowSpeedAuthority = speedAbs < 0.8 ? 0.35 : Math.min(1, speedAbs / 3.8);
    const highSpeedStability = 1 / (1 + speedAbs * 0.036);
    const turnDir = v.speed >= -0.2 ? 1 : -1;
    const driftBoost = handbrake ? 1.38 : 1.0;
    const weatherTurnScale = 1 - 0.1 * rainSlip - 0.04 * this.fogBlend;
    v.rotY += steerIn * 2.55 * lowSpeedAuthority * highSpeedStability * turnDir * driftBoost * weatherTurnScale * dt;

    // Velocity heading tracks chassis heading crisply on dry asphalt and with subtle slip on wet/foggy roads
    const lateralGripRate = handbrake ? 2.6 : THREE.MathUtils.lerp(15.0, 5.2, dampness);
    v.moveYaw = this.lerpAngle(v.moveYaw, v.rotY, 1 - Math.exp(-lateralGripRate * dt));

    v.x += Math.sin(v.moveYaw) * v.speed * dt;
    v.z += Math.cos(v.moveYaw) * v.speed * dt;
  }

  private updateTrafficCarAI(v: VehicleEntity, dt: number): void {
    // Check for any vehicle directly ahead in lane so traffic brakes rather than continuously ramming
    let blockedAhead = false;
    for (let i = 0; i < this.vehicles.length; i++) {
      const other = this.vehicles[i];
      if (other === v || other.exploded || Math.abs(other.y - v.y) > 1.9) continue;
      const dx = other.x - v.x;
      const dz = other.z - v.z;
      const along = dx * v.trafficDirX + dz * v.trafficDirZ;
      if (along > 0.5 && along < 8.6) {
        const lateral = Math.abs(-dx * v.trafficDirZ + dz * v.trafficDirX);
        if (lateral < 2.25) {
          blockedAhead = true;
          break;
        }
      }
    }

    const cruiseSpeed = blockedAhead ? 0 : 9.2 + (v.id % 3) * 1.1;
    v.speed = THREE.MathUtils.damp(v.speed, cruiseSpeed, blockedAhead ? 7.5 : 1.9, dt);

    // Cruise along road and wrap/U-turn at outer road limits
    v.x += v.trafficDirX * v.speed * dt;
    v.z += v.trafficDirZ * v.speed * dt;
    v.rotY = Math.atan2(v.trafficDirX, v.trafficDirZ);
    v.moveYaw = v.rotY;

    if (v.x > 132 || v.x < -132 || v.z > 132 || v.z < -132) {
      v.trafficDirX *= -1;
      v.trafficDirZ *= -1;
      v.x = THREE.MathUtils.clamp(v.x, -130, 130);
      v.z = THREE.MathUtils.clamp(v.z, -130, 130);
      v.rotY = Math.atan2(v.trafficDirX, v.trafficDirZ);
      v.moveYaw = v.rotY;
    }
  }

  private updatePoliceCarAI(v: VehicleEntity, dt: number): void {
    if (v.policeRamCooldown && v.policeRamCooldown > 0) {
      v.policeRamCooldown = Math.max(0, v.policeRamCooldown - dt);
    }

    if (this.wantedStars === 0) {
      v.speed *= Math.exp(-2.5 * dt);
      v.moveYaw = v.rotY;
      return;
    }

    const tx = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const tz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const tvx = this.currentVehicle ? Math.sin(this.currentVehicle.moveYaw) * this.currentVehicle.speed : 0;
    const tvz = this.currentVehicle ? Math.cos(this.currentVehicle.moveYaw) * this.currentVehicle.speed : 0;

    const rawDx = tx - v.x;
    const rawDz = tz - v.z;
    const dist = Math.hypot(rawDx, rawDz);

    // Unstick recovery if wedged against buildings or traffic
    if (v.policeReverseTimer && v.policeReverseTimer > 0) {
      v.policeReverseTimer -= dt;
      v.speed = THREE.MathUtils.damp(v.speed, -8.5, 6, dt);
      const steerDir = v.id % 2 === 0 ? 1 : -1;
      v.rotY += steerDir * 1.9 * dt;
      v.steerAngle = steerDir * 0.38;
      v.moveYaw = v.rotY;
      v.x += Math.sin(v.rotY) * v.speed * dt;
      v.z += Math.cos(v.rotY) * v.speed * dt;
      return;
    }

    if (Math.abs(v.speed) < 1.3 && dist > 8.5 && v.hasDriver) {
      v.policeStuckTimer = (v.policeStuckTimer ?? 0) + dt;
      if (v.policeStuckTimer > 0.85) {
        v.policeReverseTimer = 0.85;
        v.policeStuckTimer = 0;
        return;
      }
    } else {
      v.policeStuckTimer = 0;
    }

    // Lead intercept (with PIT flank offset at higher wanted levels when chasing a moving car)
    const leadT = this.currentVehicle ? THREE.MathUtils.clamp(dist / 32, 0.1, 1.05) : 0.15;
    let aimX = tx + tvx * leadT;
    let aimZ = tz + tvz * leadT;
    if (this.currentVehicle && this.wantedStars >= 3 && dist < 18 && dist > 4.5) {
      const pRightX = Math.cos(this.currentVehicle.rotY);
      const pRightZ = -Math.sin(this.currentVehicle.rotY);
      const flank = v.id % 2 === 0 ? 1.4 : -1.4;
      aimX += pRightX * flank;
      aimZ += pRightZ * flank;
    }

    let desiredRot = Math.atan2(aimX - v.x, aimZ - v.z);

    // Building lookahead avoidance so patrol cruisers steer smoothly around city blocks
    const probeDist = 6.8;
    const probeX = v.x + Math.sin(desiredRot) * probeDist;
    const probeZ = v.z + Math.cos(desiredRot) * probeDist;
    if (this.isPointNearBuilding(probeX, probeZ, 1.85)) {
      const leftRot = desiredRot + 0.88;
      const rightRot = desiredRot - 0.88;
      const leftBlocked = this.isPointNearBuilding(
        v.x + Math.sin(leftRot) * probeDist,
        v.z + Math.cos(leftRot) * probeDist,
        1.85,
      );
      const rightBlocked = this.isPointNearBuilding(
        v.x + Math.sin(rightRot) * probeDist,
        v.z + Math.cos(rightRot) * probeDist,
        1.85,
      );
      if (!leftBlocked && rightBlocked) {
        desiredRot = leftRot;
      } else if (!rightBlocked && leftBlocked) {
        desiredRot = rightRot;
      } else {
        desiredRot += v.id % 2 === 0 ? 1.05 : -1.05;
      }
    }

    const angleDiff = Math.atan2(Math.sin(desiredRot - v.rotY), Math.cos(desiredRot - v.rotY));
    v.steerAngle = THREE.MathUtils.clamp(angleDiff * 0.75, -0.4, 0.4);
    v.rotY = this.lerpAngle(v.rotY, desiredRot, 1 - Math.exp(-4.8 * dt));
    v.moveYaw = v.rotY;

    const playerCarSpeed = this.currentVehicle ? Math.abs(this.currentVehicle.speed) : 0;
    const alignedForRam = Math.abs(angleDiff) < 0.42;
    let targetSpeed: number;

    if (this.currentVehicle) {
      // Aggressive vehicle pursuit & ramming escalation based on wantedStars
      const basePursuit = 19 + this.wantedStars * 2.3;
      const ramEligible = this.wantedStars >= 2 && alignedForRam && dist < 28 && dist > 3.2;
      if (this.wantedStars === 1 && playerCarSpeed < 2.8 && dist < 8.5) {
        targetSpeed = 0; // Box in & step out to arrest at 1★
      } else if (ramEligible) {
        targetSpeed = 24 + this.wantedStars * 2.4;
      } else if (dist > 14) {
        targetSpeed = basePursuit;
      } else {
        targetSpeed = this.wantedStars >= 2 ? 15 + this.wantedStars * 1.5 : 10;
      }
    } else {
      // Player is on foot: high-wanted cops may charge/ram into range, then brake & deploy officers
      if (this.wantedStars >= 3 && alignedForRam && dist > 9.5 && dist < 24 && this.playerMoveSpeed > 4.5) {
        targetSpeed = 20 + this.wantedStars * 1.6;
      } else if (dist > 14) {
        targetSpeed = 18 + this.wantedStars * 1.8;
      } else if (dist > 6.8) {
        targetSpeed = 9.5;
      } else {
        targetSpeed = 0;
      }
    }

    if (!v.hasDriver) {
      targetSpeed = 0;
    }

    v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, targetSpeed > v.speed ? 3.8 : 6.2, dt);
    v.x += Math.sin(v.rotY) * v.speed * dt;
    v.z += Math.cos(v.rotY) * v.speed * dt;

    // Deploy officer(s) on foot when cruiser intercepts an on-foot or stopped-car player
    const shouldDeploy =
      v.hasDriver &&
      ((!this.currentVehicle &&
        (dist < 9.5 || (dist < 14 && (this.wantedStars <= 2 || Math.abs(v.speed) < 12)))) ||
        (this.currentVehicle && playerCarSpeed < 3.0 && dist < 10.5));
    if (shouldDeploy) {
      const footCops = this.npcs.filter((n) => n.role === 'police' && !n.dead).length;
      const maxFootCops = Math.min(7, 1 + Math.ceil(this.wantedStars * 1.2));
      if (footCops < maxFootCops) {
        v.hasDriver = false;
        const sideX = v.x - Math.cos(v.rotY) * 2.1;
        const sideZ = v.z + Math.sin(v.rotY) * 2.1;
        const cop = this.spawnNpc('police', 0x1f355c, sideX, sideZ);
        cop.shootCooldown = this.wantedStars === 1 ? 1.5 : 0.65;
        cop.policeMode = 'chase';
        if (this.wantedStars >= 3 && footCops + 1 < maxFootCops) {
          const partner = this.spawnNpc(
            'police',
            0x182b4d,
            v.x + Math.cos(v.rotY) * 2.1,
            v.z - Math.sin(v.rotY) * 2.1,
          );
          partner.shootCooldown = 0.85;
          partner.policeMode = 'chase';
        }
      }
    }
  }

  private updateTrafficAndPeds(dt: number, checkRunOver: boolean): void {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    // Gun-aim threat check: when Frank aims a firearm on foot, pedestrians in line of sight panic & flee
    const playerAimingGun =
      !this.currentVehicle &&
      this.activeWeapon !== 'unarmed' &&
      this.activeWeapon !== 'knife' &&
      (this.isAiming || this.leftMouseDown || this.held.has('KeyJ') || this.virtualFire || this.dualsense.state.r2 > 0.25);
    let pFwdX = 0;
    let pFwdZ = 1;
    if (playerAimingGun) {
      this.camera.getWorldPosition(_camWorldPos);
      this.camera.getWorldDirection(_aimDir);
      pFwdX = Math.sin(this.playerRotY);
      pFwdZ = Math.cos(this.playerRotY);
    }

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const n = this.npcs[i];
      if (n.dead) {
        n.deadTimer -= dt;
        if (n.deadTimer <= 0) {
          this.scene.remove(n.rig.group);
          this.npcs.splice(i, 1);
        }
        continue;
      }

      if (n.hitFlash > 0) {
        n.hitFlash -= dt;
        (n.rig.torsoMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
          n.hitFlash > 0 ? 0xff2222 : 0x000000,
        );
      }

      // Check vehicle run-over using accurate car OBB footprint
      if (checkRunOver && this.currentVehicle && Math.abs(this.currentVehicle.speed) > 7.2) {
        const cv = this.currentVehicle;
        if (Math.abs(n.y - cv.y) < 1.8) {
          const dx = n.x - cv.x;
          const dz = n.z - cv.z;
          const fwdX = Math.sin(cv.rotY);
          const fwdZ = Math.cos(cv.rotY);
          const rightX = Math.cos(cv.rotY);
          const rightZ = -Math.sin(cv.rotY);
          const localZ = dx * fwdX + dz * fwdZ;
          const localX = dx * rightX + dz * rightZ;
          if (Math.abs(localX) < cv.rig.halfWidth + 0.42 && Math.abs(localZ) < cv.rig.halfLength + 0.45) {
            this.damageNpc(n, 110, Math.sin(cv.moveYaw), Math.cos(cv.moveYaw));
            this.audio.playImpact(0.5);
            continue;
          }
        }
      }

      // Knockdown & Recovery State (punched NPCs fall to the ground and get back up if they survive)
      if (n.knockdownTimer > 0) {
        n.knockdownTimer -= dt;
        n.speed = 0;
        const fallT = 1 - Math.exp(-15 * dt);
        n.rig.group.rotation.x = THREE.MathUtils.lerp(n.rig.group.rotation.x, -Math.PI / 2, fallT);
        n.rig.group.position.set(n.x, THREE.MathUtils.lerp(n.rig.group.position.y, n.y + 0.16, fallT), n.z);
        n.rig.torsoGroup.rotation.x = 0;
        n.rig.leftArm.rotation.x = -0.35;
        n.rig.leftArm.rotation.z = -0.42;
        n.rig.leftElbow.rotation.x = -0.25;
        n.rig.rightArm.rotation.x = -0.35;
        n.rig.rightArm.rotation.z = 0.42;
        n.rig.rightElbow.rotation.x = -0.25;
        n.rig.leftLeg.rotation.x = 0.08;
        n.rig.rightLeg.rotation.x = -0.1;
        n.rig.leftKnee.rotation.x = 0.15;
        n.rig.rightKnee.rotation.x = 0.1;
        if (n.knockdownTimer <= 0) {
          n.knockdownTimer = 0;
          n.gettingUpTimer = 0.65;
        }
        continue;
      }

      if (n.gettingUpTimer > 0) {
        n.gettingUpTimer -= dt;
        n.speed = 0;
        const upAlpha = Math.min(1, 1 - n.gettingUpTimer / 0.65);
        n.rig.group.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, 0, upAlpha);
        n.rig.group.position.set(n.x, THREE.MathUtils.lerp(n.y + 0.16, n.y, upAlpha), n.z);
        n.rig.torsoGroup.rotation.x = (1 - upAlpha) * 0.35;
        n.rig.leftArm.rotation.x = -(1 - upAlpha) * 0.8;
        n.rig.leftArm.rotation.z = 0;
        n.rig.rightArm.rotation.x = -(1 - upAlpha) * 0.8;
        n.rig.rightArm.rotation.z = 0;
        n.rig.leftKnee.rotation.x = (1 - upAlpha) * 0.7;
        n.rig.rightKnee.rotation.x = (1 - upAlpha) * 0.4;
        if (n.gettingUpTimer <= 0) {
          n.gettingUpTimer = 0;
          n.rig.group.rotation.x = 0;
          n.rig.group.position.set(n.x, n.y, n.z);
          if (n.role === 'pedestrian') {
            n.fleeTimer = Math.max(n.fleeTimer, 7.5);
          }
        }
        continue;
      }

      const distToPlayer = Math.hypot(px - n.x, pz - n.z);

      if (n.role === 'pedestrian') {
        if (playerAimingGun && distToPlayer < 30 && distToPlayer > 0.25) {
          const toNpcX = (n.x - this.playerX) / distToPlayer;
          const toNpcZ = (n.z - this.playerZ) / distToPlayer;
          const inForwardCone = distToPlayer < 14 && toNpcX * pFwdX + toNpcZ * pFwdZ > 0.9;
          const camHit = this.rayIntersectSphere(
            _camWorldPos.x,
            _camWorldPos.y,
            _camWorldPos.z,
            _aimDir.x,
            _aimDir.y,
            _aimDir.z,
            n.x,
            n.y + 1.0,
            n.z,
            2.35,
          );
          const inCamAim = camHit !== null && camHit < 36;
          if (inForwardCone || inCamAim) {
            let blockedByWall = false;
            for (const c of this.city.colliders) {
              if (
                this.rayIntersectAABB2D(
                  this.playerX,
                  this.playerZ,
                  toNpcX,
                  toNpcZ,
                  c.minX,
                  c.maxX,
                  c.minZ,
                  c.maxZ,
                  distToPlayer - 0.5,
                ) !== null
              ) {
                blockedByWall = true;
                break;
              }
            }
            if (!blockedByWall) {
              if (n.fleeTimer <= 0.15 && n.panicTimer <= 0) {
                n.panicTimer = 0.72;
              }
              n.fleeTimer = Math.max(n.fleeTimer, 6.5);
            }
          }
        }

        if (n.panicTimer > 0) {
          n.panicTimer = Math.max(0, n.panicTimer - dt);
        }

        if (n.fleeTimer > 0) {
          n.fleeTimer -= dt;
          const fx = n.x - px;
          const fz = n.z - pz;
          const fl = Math.hypot(fx, fz) || 1;
          n.dirX = fx / fl;
          n.dirZ = fz / fl;
          n.speed = n.panicTimer > 0 ? 7.4 : 6.8;
        } else {
          n.speed = 2.4;
          if (Math.random() < 0.008) {
            const ang = Math.random() * Math.PI * 2;
            n.dirX = Math.sin(ang);
            n.dirZ = Math.cos(ang);
          }
        }
      } else if (n.role === 'police') {
        if (this.wantedStars <= 0) {
          n.policeMode = 'patrol';
          n.speed = 1.8;
          if (Math.random() < 0.008) {
            const ang = Math.random() * Math.PI * 2;
            n.dirX = Math.sin(ang);
            n.dirZ = Math.cos(ang);
          }
        } else if (distToPlayer < 72 && distToPlayer > 0.1) {
          const toPlayerX = (px - n.x) / distToPlayer;
          const toPlayerZ = (pz - n.z) / distToPlayer;
          const hasLos = this.hasLineOfSight2D(n.x, n.z, px, pz);
          const playerCarStopped = Boolean(this.currentVehicle && Math.abs(this.currentVehicle.speed) < 2.8);
          const arrestPush =
            this.wantedStars === 1 ||
            playerCarStopped ||
            (!this.currentVehicle && (this.health < 55 || this.playerMoveSpeed < 2.2));

          // Flank slightly so officers fan out around Frank instead of stacking
          let moveAng = Math.atan2(toPlayerX, toPlayerZ);
          if (distToPlayer > 3.8 && distToPlayer < 18) {
            moveAng += ((n.id % 5) - 2) * 0.24;
          }
          // Steer smoothly around building corners when LOS is blocked
          const stepProbeX = n.x + Math.sin(moveAng) * 2.4;
          const stepProbeZ = n.z + Math.cos(moveAng) * 2.4;
          if (this.isPointNearBuilding(stepProbeX, stepProbeZ, 0.7)) {
            const altLeft = moveAng + 0.95;
            const altRight = moveAng - 0.95;
            const leftBlocked = this.isPointNearBuilding(
              n.x + Math.sin(altLeft) * 2.4,
              n.z + Math.cos(altLeft) * 2.4,
              0.7,
            );
            moveAng = !leftBlocked ? altLeft : altRight;
          }

          n.dirX = Math.sin(moveAng);
          n.dirZ = Math.cos(moveAng);

          const desiredStopDist = arrestPush ? 2.1 : 8.5;
          const chaseSpeed = 5.8 + this.wantedStars * 0.4;
          if (distToPlayer > desiredStopDist || !hasLos) {
            n.speed = chaseSpeed;
            n.policeMode = distToPlayer < 4.8 && arrestPush ? 'arrest' : 'chase';
          } else {
            n.speed = 0;
            n.policeMode = arrestPush ? 'arrest' : 'shoot';
          }

          // Keep minimal body separation when right next to on-foot Frank
          if (!this.currentVehicle && distToPlayer < 1.35) {
            const sep = (1.35 - distToPlayer) * 0.6;
            n.x -= toPlayerX * sep;
            n.z -= toPlayerZ * sep;
          }

          // Shoot at player when LOS is clear; at 1★ prioritize arrest unless Frank is armed & fleeing far
          n.shootCooldown -= dt;
          const playerArmedFleeing =
            !this.currentVehicle && this.activeWeapon !== 'unarmed' && distToPlayer > 9.5;
          const lethalAuth = this.wantedStars >= 2 || playerArmedFleeing;
          if (lethalAuth && hasLos && n.shootCooldown <= 0 && distToPlayer < 36 && !(arrestPush && distToPlayer < 3.6)) {
            n.shootCooldown = Math.max(0.65, 1.32 - this.wantedStars * 0.14);
            this.audio.playGunshot('pistol');
            const targetY = (this.currentVehicle ? this.currentVehicle.y + 0.85 : this.playerY + 1.0) - (n.y + 1.35);
            const dyAim = targetY / Math.max(1, distToPlayer);
            const spread = Math.max(0.06, 0.16 - this.wantedStars * 0.02);
            this.castBullet(
              n.x,
              n.y + 1.35,
              n.z,
              toPlayerX + (Math.random() - 0.5) * spread,
              dyAim + (Math.random() - 0.5) * 0.04,
              toPlayerZ + (Math.random() - 0.5) * spread,
              40,
              9 + this.wantedStars,
              0xff595e,
              false,
            );
          }
        } else {
          n.policeMode = 'chase';
          n.speed = 5.4;
          const ang = Math.atan2(px - n.x, pz - n.z);
          n.dirX = Math.sin(ang);
          n.dirZ = Math.cos(ang);
        }
      } else if (n.role === 'gang') {
        const engageRange = 34;
        if (distToPlayer < engageRange && distToPlayer > 0.1) {
          const tx = (px - n.x) / distToPlayer;
          const tz = (pz - n.z) / distToPlayer;
          n.dirX = tx;
          n.dirZ = tz;
          n.speed = distToPlayer > 11 ? 5.2 : 0;

          // Shoot at player (tracks elevation cleanly)
          n.shootCooldown -= dt;
          if (n.shootCooldown <= 0 && distToPlayer < 32 && this.hasLineOfSight2D(n.x, n.z, px, pz)) {
            n.shootCooldown = 1.45;
            this.audio.playGunshot('pistol');
            const targetY = (this.currentVehicle ? this.currentVehicle.y + 0.85 : this.playerY + 1.0) - (n.y + 1.35);
            const dyAim = targetY / Math.max(1, distToPlayer);
            this.castBullet(
              n.x,
              n.y + 1.35,
              n.z,
              tx + (Math.random() - 0.5) * 0.14,
              dyAim + (Math.random() - 0.5) * 0.04,
              tz + (Math.random() - 0.5) * 0.14,
              38,
              9,
              0xff595e,
              false,
            );
          }
        } else {
          n.speed = 0;
        }
      }

      if (n.speed > 0.1) {
        n.x += n.dirX * n.speed * dt;
        n.z += n.dirZ * n.speed * dt;
        n.x = THREE.MathUtils.clamp(n.x, -142, 140);
        n.z = THREE.MathUtils.clamp(n.z, -140, 140);
        n.y = this.getGroundHeight(n.x, n.z) + 0.025;
        n.rotY = Math.atan2(n.dirX, n.dirZ);
        n.walkPhase += dt * (n.speed * 2.2);
      } else {
        n.rotY = Math.atan2(px - n.x, pz - n.z);
        n.walkPhase = 0;
      }

      // Solid NPC-vs-Vehicle & NPC-vs-World collision (runs even when standing so cars never clip through NPCs)
      this.resolveCircleAgainstVehicles(n.x, n.y, n.z, 0.48, null, (nx, nz, hit, hitVeh) => {
        n.x = nx;
        n.z = nz;
        if (hit && hitVeh) {
          if (Math.abs(hitVeh.speed) > 7.5 && hitVeh !== this.currentVehicle) {
            this.damageNpc(n, 75, Math.sin(hitVeh.moveYaw), Math.cos(hitVeh.moveYaw), true);
          } else if (n.speed > 0.1) {
            // Steer pedestrian smoothly around parked/stopped vehicles
            const rx = nx - hitVeh.x;
            const rz = nz - hitVeh.z;
            const rLen = Math.hypot(rx, rz) || 1;
            const tx = -rz / rLen;
            const tz = rx / rLen;
            const sign = tx * n.dirX + tz * n.dirZ >= 0 ? 1 : -1;
            n.dirX = THREE.MathUtils.lerp(n.dirX, tx * sign, 0.55);
            n.dirZ = THREE.MathUtils.lerp(n.dirZ, tz * sign, 0.55);
            const dLen = Math.hypot(n.dirX, n.dirZ) || 1;
            n.dirX /= dLen;
            n.dirZ /= dLen;
          }
        }
      });
      this.resolveCircleWorldCollision(n.x, n.z, 0.45, (nx, nz, hit) => {
        n.x = nx;
        n.z = nz;
        if (hit) {
          n.dirX *= -1;
          n.dirZ *= -1;
        }
      });
      n.y = this.getGroundHeight(n.x, n.z) + 0.025;

      const npcMoving = n.speed > 0.1;
      const swing = npcMoving ? Math.sin(n.walkPhase) * 0.6 : 0;
      const kneeBendL = npcMoving ? Math.max(0, Math.sin(n.walkPhase + 0.8)) * 0.72 : 0.04;
      const kneeBendR = npcMoving ? Math.max(0, -Math.sin(n.walkPhase + 0.8)) * 0.72 : 0.04;
      const npcBreath = Math.sin(this.elapsed * 2.2 + n.id);
      const npcBob = npcMoving ? Math.abs(Math.sin(n.walkPhase)) * 0.015 : 0;
      n.rig.torsoGroup.position.y = 0.95 + npcBreath * 0.005 + npcBob;
      n.rig.torsoGroup.rotation.x = n.speed > 6.0 ? 0.18 : n.speed > 3.5 ? 0.1 : npcMoving ? 0.04 : npcBreath * 0.01;
      n.rig.torsoGroup.rotation.y = npcMoving ? -swing * 0.12 : 0;
      n.rig.headGroup.rotation.y = npcMoving ? swing * 0.09 : Math.sin(this.elapsed * 0.8 + n.id) * 0.06;
      n.rig.leftLeg.rotation.x = swing;
      n.rig.rightLeg.rotation.x = -swing;
      n.rig.leftKnee.rotation.x = kneeBendL;
      n.rig.rightKnee.rotation.x = kneeBendR;

      if (n.panicTimer > 0) {
        // Hands-up panic flinch before/while sprinting away
        n.rig.leftArm.rotation.x = -2.38;
        n.rig.leftArm.rotation.z = -0.24;
        n.rig.leftElbow.rotation.x = -0.45;
        n.rig.rightArm.rotation.x = -2.38;
        n.rig.rightArm.rotation.z = 0.24;
        n.rig.rightElbow.rotation.x = -0.45;
      } else {
        n.rig.leftArm.rotation.x = -swing * 0.7;
        n.rig.leftArm.rotation.z = 0;
        n.rig.leftElbow.rotation.x = n.speed > 0.1 ? -0.35 : -0.12;
        const aiming =
          (n.role === 'police' && this.wantedStars > 0 && (n.policeMode === 'shoot' || n.policeMode === 'arrest' || n.speed === 0)) ||
          (n.role === 'gang' && n.speed === 0);
        n.rig.rightArm.rotation.x = aiming ? -Math.PI * 0.44 : swing * 0.7;
        n.rig.rightArm.rotation.z = 0;
        n.rig.rightElbow.rotation.x = aiming ? -0.15 : n.speed > 0.1 ? -0.35 : -0.12;
      }

      n.rig.group.rotation.x = 0;
      n.rig.group.position.set(n.x, n.y, n.z);
      n.rig.group.rotation.y = n.rotY;
    }

    // Keep ambient pedestrian population healthy
    const pedCount = this.npcs.filter((n) => n.role === 'pedestrian').length;
    if (pedCount < 14 && Math.random() < 0.04) {
      const rx = ROAD_COORDS[Math.floor(Math.random() * ROAD_COORDS.length)] + 10;
      const rz = (Math.random() - 0.5) * 210;
      this.spawnNpc('pedestrian', 0x4ecdc4, rx, rz);
    }
  }

  private addWantedHeat(starsDelta: number, reason: string, heatDelta = 0): void {
    const prev = this.wantedStars;
    if (starsDelta > 0) {
      this.wantedStars = Math.min(5, this.wantedStars + starsDelta);
      this.wantedHeat = 0;
    } else if (heatDelta > 0) {
      this.wantedHeat += heatDelta;
      if (this.wantedHeat >= 100 && this.wantedStars < 5) {
        this.wantedHeat -= 100;
        this.wantedStars = Math.min(5, this.wantedStars + 1);
      }
    }
    this.wantedEvadeTimer = 0;
    this.wantedEvading = false;
    if (this.wantedStars > prev) {
      const tierLabel =
        this.wantedStars >= 5
          ? 'TAM KUŞATMA!'
          : this.wantedStars === 4
            ? 'HELİKOPTER & SWAT!'
            : this.wantedStars === 3
              ? 'YOL BARİKATLARI!'
              : '';
      this.showToast(`Aranma ${this.wantedStars}★ — ${reason} ${tierLabel}`.trim(), 'wanted');
    }
  }

  private updatePoliceSystem(dt: number): void {
    if (this.arrestToastCooldown > 0) {
      this.arrestToastCooldown = Math.max(0, this.arrestToastCooldown - dt);
    }

    if (this.wantedStars <= 0) {
      this.wantedHeat = Math.max(0, this.wantedHeat - dt * 18);
      this.wantedEvading = false;
      this.wantedEvadeTimer = 0;
      this.bustedTimer = 0;
      this.policeHeliRig.group.visible = false;
      this.policeHeliRig.spotTarget.visible = false;
      return;
    }

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    // Count active police units & distance
    const policeCars = this.vehicles.filter((v) => v.aiRole === 'police' && !v.exploded);
    const policeCops = this.npcs.filter((n) => n.role === 'police' && !n.dead);

    const desiredCars = Math.min(5, this.wantedStars);
    this.policeSpawnTimer -= dt;
    if (policeCars.length < desiredCars && this.policeSpawnTimer <= 0) {
      this.policeSpawnTimer = Math.max(3.2, 6.0 - this.wantedStars * 0.5);
      const angle = Math.random() * Math.PI * 2;
      const sx = THREE.MathUtils.clamp(px + Math.cos(angle) * 76, -124, 124);
      const sz = THREE.MathUtils.clamp(pz + Math.sin(angle) * 76, -124, 124);
      const vt: VehicleType = this.wantedStars >= 4 ? 'suv' : 'police';
      this.spawnVehicle(vt, 0x16213e, sx, sz, Math.atan2(px - sx, pz - sz), 'police', true);
    }

    // Also deploy foot police patrols nearby as wantedStars rises (especially when player is on foot or in narrow streets)
    const desiredFootCops = Math.min(6, this.wantedStars === 1 ? 2 : 1 + this.wantedStars);
    this.policeFootSpawnTimer -= dt;
    if (policeCops.length < desiredFootCops && this.policeFootSpawnTimer <= 0) {
      this.policeFootSpawnTimer = Math.max(2.8, 5.2 - this.wantedStars * 0.45);
      const ang = Math.random() * Math.PI * 2;
      const fx = THREE.MathUtils.clamp(px + Math.cos(ang) * 34, -135, 135);
      const fz = THREE.MathUtils.clamp(pz + Math.sin(ang) * 34, -135, 135);
      if (!this.isPointNearBuilding(fx, fz, 1.0)) {
        const cop = this.spawnNpc('police', 0x1f355c, fx, fz);
        cop.policeMode = 'chase';
        cop.shootCooldown = this.wantedStars === 1 ? 1.4 : 0.75;
      }
    }

    // 3+ Stars: Deploy Police Roadblock ahead on Frank's nearest avenue
    this.roadblockTimer -= dt;
    if (this.wantedStars >= 3 && this.roadblockTimer <= 0 && policeCars.length < 6) {
      this.roadblockTimer = 22;
      const rbX = THREE.MathUtils.clamp(px + (Math.random() > 0.5 ? 58 : -58), -120, 120);
      const rbZ = ROAD_COORDS.reduce((a, b) => (Math.abs(b - pz) < Math.abs(a - pz) ? b : a));
      this.spawnVehicle('police', 0x16213e, rbX, rbZ - 2.6, Math.PI * 0.42, 'police', true);
      this.spawnVehicle('police', 0x16213e, rbX, rbZ + 2.6, -Math.PI * 0.42, 'police', true);
      const rbCop = this.spawnNpc('police', 0x1f355c, rbX + 2.5, rbZ);
      rbCop.shootCooldown = 0.6;
      rbCop.policeMode = 'chase';
      this.showToast('Dikkat Frank: İleride Polis Barikatı Kuruldu!', 'wanted');
    }

    // 4+ Stars: Police Pursuit Helicopter with spinning rotors & tracking searchlight
    if (this.wantedStars >= 4) {
      this.policeHeliRig.group.visible = true;
      this.policeHeliRig.spotTarget.visible = true;
      this.heliOrbitAngle += dt * 0.58;
      const targetHeliX = px + Math.cos(this.heliOrbitAngle) * 20;
      const targetHeliZ = pz + Math.sin(this.heliOrbitAngle) * 20;
      this.heliPos.x = THREE.MathUtils.damp(this.heliPos.x, targetHeliX, 2.2, dt);
      this.heliPos.z = THREE.MathUtils.damp(this.heliPos.z, targetHeliZ, 2.2, dt);
      this.heliPos.y = 32 + Math.sin(this.elapsed * 1.4) * 1.2;

      this.policeHeliRig.group.position.copy(this.heliPos);
      this.policeHeliRig.group.rotation.y = Math.atan2(px - this.heliPos.x, pz - this.heliPos.z);
      this.policeHeliRig.group.rotation.x = 0.14;
      this.policeHeliRig.mainRotor.rotation.y += dt * 28;
      this.policeHeliRig.tailRotor.rotation.x += dt * 34;

      const strobe = Math.sin(this.elapsed * 16) > 0;
      (this.policeHeliRig.beaconRed.material as THREE.MeshStandardMaterial).emissiveIntensity = strobe ? 3.5 : 0.2;
      (this.policeHeliRig.beaconBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = strobe ? 0.2 : 3.5;

      // Aim spotlight cone toward Frank
      this.policeHeliRig.spotTarget.position.set(px, 0.08, pz);
      this.policeHeliRig.searchlightCone.lookAt(px, 0, pz);
      this.policeHeliRig.searchlightCone.rotateX(-Math.PI / 2);
    } else {
      this.policeHeliRig.group.visible = false;
      this.policeHeliRig.spotTarget.visible = false;
    }

    let nearestCarDist = Infinity;
    for (const pc of policeCars) {
      nearestCarDist = Math.min(nearestCarDist, Math.hypot(pc.x - px, pc.z - pz));
    }
    let nearestCopDist = Infinity;
    let copsInArrestRange = 0;
    for (const cop of policeCops) {
      const d = Math.hypot(cop.x - px, cop.z - pz);
      nearestCopDist = Math.min(nearestCopDist, d);
      if (d < 4.2) copsInArrestRange++;
    }
    const nearestDist = Math.min(nearestCarDist, nearestCopDist);

    const evadeDuration = 5.0 + this.wantedStars * 0.9;
    const sightThreshold = this.wantedStars >= 4 ? 62 : 48;
    if (nearestDist > sightThreshold) {
      this.wantedEvading = true;
      this.wantedEvadeTimer += dt;
      if (this.wantedEvadeTimer >= evadeDuration) {
        this.wantedStars = 0;
        this.wantedHeat = 0;
        this.wantedEvading = false;
        this.wantedEvadeTimer = 0;
        this.showToast(getTranslations(this.language).engine.evadedToast(this.playerName), 'mission');
        for (const cop of policeCops) cop.dead = true;
      }
    } else {
      this.wantedEvading = false;
      this.wantedEvadeTimer = Math.max(0, this.wantedEvadeTimer - dt * 1.5);
    }

    // Active police arrest check (on foot when cornered/slow/low HP/1★ close contact, or in a stopped vehicle)
    const carSpeed = this.currentVehicle ? Math.abs(this.currentVehicle.speed) : 0;
    const onFootArrestable =
      !this.currentVehicle &&
      nearestCopDist < 3.6 &&
      (this.playerMoveSpeed < 2.3 || this.health < 55 || (this.wantedStars === 1 && this.playerMoveSpeed < 4.6));
    const inCarArrestable =
      Boolean(this.currentVehicle) &&
      carSpeed < 2.2 &&
      (nearestCopDist < 4.2 || nearestCarDist < 5.0);

    if (onFootArrestable || inCarArrestable) {
      const arrestRate = 1 + Math.max(0, copsInArrestRange - 1) * 0.35;
      if (this.bustedTimer <= 0.05 && this.arrestToastCooldown <= 0) {
        this.arrestToastCooldown = 4.0;
        this.showToast(getTranslations(this.language).hud.bustedWarning, 'wanted');
      }
      this.bustedTimer += dt * arrestRate;
      if (this.bustedTimer >= 3.0) {
        this.phase = 'busted';
        this.audio.playGameOverStinger();
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock();
        }
        this.emitHud();
      }
    } else {
      this.bustedTimer = Math.max(0, this.bustedTimer - dt * 1.8);
    }
  }

  // Authentic Multi-Stage GTA Mission Campaign (Fixer Contacts, Street Race, Heists & Coronas)
  private startNextMission(): void {
    this.missionCounter++;
    const idx = ((this.missionCounter - 1) % 6) + 1;
    this.missionBeaconMesh.visible = false;
    this.missionStage = 1;
    this.raceCheckpoints = [];
    this.raceCheckpointIdx = 0;

    if (idx === 1) {
      // Görev 1: Sıcak Teslimat (Rico) — 2 stages: Pick up stash on West Ave -> Outrun 1* cops to Pier
      const depot = new THREE.Vector3(-120, 0.1, -90);
      this.missionTargetPos.copy(depot);
      this.missionTargetMesh.position.copy(depot);
      this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 1,
        totalMissions: 6,
        type: 'delivery',
        title: 'Sıcak Teslimat',
        contactName: 'Rico "El Rey"',
        stageLabel: 'Aşama 1/2',
        objective: 'Kuzeybatı Sahil Caddesindeki (Sarı İşaret) paketi al!',
        timeLeft: 75,
        reward: 650,
      };
      this.showMissionBanner('RİCO: SICAK TESLİMAT', 'Depodaki paketi al ve İskele teknesine ulaştır.', 'brief', 3.8);
    } else if (idx === 2) {
      // Görev 2: Turuncu GT-X (Elena Vega) — Guarded VIP sports car theft + police escape
      const spawnSpot = this.city.spawnPoints.gangZones[1];
      const car = this.spawnVehicle('sports', 0xff5400, spawnSpot.x, spawnSpot.z, 0, 'missionTarget', false);
      this.missionVehicleId = car.id;
      this.spawnNpc('gang', 0x2b2d42, spawnSpot.x + 3.2, spawnSpot.z + 2.2);
      this.spawnNpc('gang', 0x2b2d42, spawnSpot.x - 3.2, spawnSpot.z - 2.2);
      this.missionTargetPos.set(spawnSpot.x, 0.1, spawnSpot.z);
      this.missionTargetMesh.position.copy(this.missionTargetPos);
      this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 2,
        totalMissions: 6,
        type: 'hijack',
        title: 'Turuncu GT-X',
        contactName: 'Elena Vega',
        stageLabel: 'Aşama 1/2',
        objective: 'Korumalı Solaris GT-X aracını çal! (Hedef Sarı İşaret)',
        timeLeft: 90,
        reward: 950,
      };
      this.showMissionBanner('ELENA VEGA: TURUNCU GT-X', 'Otel önündeki korumaları aş ve GT-X\'i kaçır.', 'brief', 3.8);
    } else if (idx === 3) {
      // Görev 3: Kızıl Sokak Baskını (Marcus Vance) — Eliminate 6 gangsters -> Escape 2* cops to Safehouse
      const zone = this.city.spawnPoints.gangZones[0];
      this.missionGangLeft = 6;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const g = this.spawnNpc('gang', 0x8f2436, zone.x + Math.cos(ang) * 7.5, zone.z + Math.sin(ang) * 7.5);
        if (i === 0) {
          g.hp = 175;
          g.maxHp = 175;
        }
      }
      this.missionTargetPos.copy(zone);
      this.missionTargetMesh.position.copy(zone);
      this.setBeaconColor(this.missionTargetMesh, 0xff3d7f);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 3,
        totalMissions: 6,
        type: 'gang',
        title: 'Kızıl Sokak Baskını',
        contactName: 'Marcus Vance',
        stageLabel: 'Aşama 1/2',
        objective: 'Sahildeki Vagos çetesini (Kırmızı İşaret) ve liderini yok et!',
        timeLeft: 105,
        reward: 1200,
        progressText: 'Kalan Hedef: 6',
      };
      this.showMissionBanner('MARCUS: KIZIL SOKAK BASKINI', 'Sahil çetesini temizle, sonra Güvenli Eve kaç.', 'brief', 3.8);
    } else if (idx === 4) {
      // Görev 4: Gece Yarısı Hızı (Elena Vega) — Classic GTA 5-Checkpoint Street Race!
      this.raceCheckpoints = [
        new THREE.Vector3(-120, 0.1, -60),
        new THREE.Vector3(0, 0.1, -60),
        new THREE.Vector3(60, 0.1, 0),
        new THREE.Vector3(0, 0.1, 60),
        new THREE.Vector3(-120, 0.1, 0),
        new THREE.Vector3(-218, 0.25, 0),
      ];
      this.raceCheckpointIdx = 0;
      this.missionTargetPos.copy(this.raceCheckpoints[0]);
      this.missionTargetMesh.position.copy(this.missionTargetPos);
      this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 4,
        totalMissions: 6,
        type: 'race',
        title: 'Gece Yarısı Hızı',
        contactName: 'Elena Vega',
        stageLabel: 'Bölüm 1/6',
        objective: 'Bir araca atla ve ilk sokak yarış kontrol noktasına gir!',
        timeLeft: 95,
        reward: 1450,
        progressText: 'Kontrol Noktası: 0/6',
      };
      this.showMissionBanner('ELENA: GECE YARISI HIZI', '6 kontrol noktasını süre bitmeden arka arkaya geç!', 'brief', 3.8);
    } else if (idx === 5) {
      // Görev 5: Zırhlı Konvoy (Rico) — Hijack moving armored SUV -> 3* Escape to Pier
      const convoyCar = this.spawnVehicle('suv', 0x2b2d42, 60, -90, 0, 'convoy', true);
      convoyCar.trafficDirX = 0;
      convoyCar.trafficDirZ = 1;
      convoyCar.speed = 11.5;
      this.missionVehicleId = convoyCar.id;
      this.missionTargetPos.set(convoyCar.x, 0.1, convoyCar.z);
      this.missionTargetMesh.position.copy(this.missionTargetPos);
      this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 5,
        totalMissions: 6,
        type: 'convoy',
        title: 'Zırhlı Konvoy Soygunu',
        contactName: 'Rico "El Rey"',
        stageLabel: 'Aşama 1/2',
        objective: 'Hareket halindeki zırhlı SUV konvoyunu durdur ve gasp et!',
        timeLeft: 100,
        reward: 1800,
      };
      this.showMissionBanner('RİCO: ZIRHLI KONVOY', 'Para taşıyan zırhlı SUV\'u kes, çal ve İskeleye götür.', 'brief', 3.8);
    } else {
      // Görev 6: Büyük Solaris Soygunu (Marcus & Elena) — 3-Stage Grand Heist!
      const bankSpot = new THREE.Vector3(60, 0.1, 0);
      this.spawnNpc('gang', 0x1b263b, bankSpot.x + 3.5, bankSpot.z - 2.5);
      this.spawnNpc('gang', 0x1b263b, bankSpot.x - 3.5, bankSpot.z + 2.5);
      this.missionTargetPos.copy(bankSpot);
      this.missionTargetMesh.position.copy(bankSpot);
      this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
      this.missionTargetMesh.visible = true;
      this.mission = {
        active: true,
        index: 6,
        totalMissions: 6,
        type: 'heist',
        title: 'Büyük Solaris Soygunu',
        contactName: 'Marcus & Elena',
        stageLabel: 'Aşama 1/3',
        objective: 'Merkez Banka kapısına (Sarı İşaret) git ve kasa girişini ele geçir!',
        timeLeft: 130,
        reward: 3500,
      };
      this.showMissionBanner('BÜYÜK SOLARİS SOYGUNU', 'Banka kasasını patlat, 4★ polisten sıyrıl ve İskele teknesine kaç!', 'brief', 4.2);
    }
    this.audio.playPickup(false);
    this.emitHud();
  }

  private clearPolicePursuit(): void {
    this.wantedStars = 0;
    this.wantedHeat = 0;
    this.wantedEvading = false;
    this.wantedEvadeTimer = 0;
    this.bustedTimer = 0;
    this.arrestToastCooldown = 0;
    this.policeFootSpawnTimer = 0;
    this.playerMoveSpeed = 0;
    this.policeSpawnTimer = 0;
    this.roadblockTimer = 0;
    this.policeHeliRig.group.visible = false;
    this.policeHeliRig.spotTarget.visible = false;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.aiRole === 'police') {
        if (v === this.currentVehicle) {
          v.aiRole = 'none';
        } else {
          this.scene.remove(v.rig.group);
          this.vehicles.splice(i, 1);
        }
      }
    }

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const n = this.npcs[i];
      if (n.role === 'police') {
        this.scene.remove(n.rig.group);
        this.npcs.splice(i, 1);
      }
    }
  }

  private completeMission(): void {
    const reward = this.mission.reward;
    const completedTitle = this.mission.title;
    const completedIndex = this.mission.index;
    this.cash += reward;
    this.stats.missionsCompleted++;
    this.audio.playPickup(true);

    if (completedIndex === 1) {
      this.clearPolicePursuit();
    }

    this.showMissionBanner('GÖREV TAMAMLANDI', `${completedTitle}  +$${reward.toLocaleString('tr-TR')}`, 'passed', 4.5);
    this.showToast(
      completedIndex === 1
        ? `Frank Görevi Tamamladı! +$${reward} — Polisler bölgeden ayrıldı!`
        : `Frank Görevi Tamamladı! +$${reward}`,
      'cash',
    );
    this.mission = {
      active: false,
      index: this.mission.index,
      totalMissions: 6,
      type: 'none',
      title: getTranslations(this.language).hud.freeRoamTitle,
      objective: getTranslations(this.language).hud.freeRoamObjective,
      timeLeft: 0,
      reward: 0,
    };
    this.missionTargetMesh.visible = false;
    this.missionBeaconMesh.visible = true;
    this.missionVehicleId = null;
    this.missionStage = 0;
    this.raceCheckpoints = [];
    this.emitHud();
  }

  private updateMissionSystem(dt: number): void {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    if (!this.mission.active) {
      const distHub = Math.hypot(px - this.city.missionHubPos.x, pz - this.city.missionHubPos.z);
      this.mission.distanceMeters = Math.round(distHub);
      if (distHub < 4.8) {
        this.startNextMission();
      }
      return;
    }

    this.mission.distanceMeters = Math.round(
      Math.hypot(px - this.missionTargetPos.x, pz - this.missionTargetPos.z),
    );
    this.mission.timeLeft -= dt;
    if (this.mission.timeLeft <= 0) {
      const failedTitle = this.mission.title;
      this.mission = {
        active: false,
        index: this.mission.index,
        totalMissions: 6,
        type: 'none',
        title: 'Görev Başarısız',
        objective: 'Tekrar denemek için [M] tuşuna bas veya meydana dön',
        timeLeft: 0,
        reward: 0,
      };
      this.missionTargetMesh.visible = false;
      this.missionBeaconMesh.visible = true;
      this.missionVehicleId = null;
      this.missionStage = 0;
      this.raceCheckpoints = [];
      this.showMissionBanner('GÖREV BAŞARISIZ', `${failedTitle} — Süre Doldu!`, 'failed', 4.0);
      this.showToast('Görev Başarısız — Süre Doldu!', 'wanted');
      return;
    }

    const dist = Math.hypot(px - this.missionTargetPos.x, pz - this.missionTargetPos.z);

    if (this.mission.type === 'delivery') {
      if (this.missionStage === 1 && dist < 5.5) {
        this.missionStage = 2;
        this.mission.stageLabel = 'Aşama 2/2';
        this.missionTargetPos.copy(this.city.spawnPoints.deliveryTargets[0]);
        this.missionTargetMesh.position.copy(this.missionTargetPos);
        this.setBeaconColor(this.missionTargetMesh, 0x00f5d4);
        this.mission.objective = 'Paket alındı! Polis takibe başladı — Solaris İskelesine ulaştır!';
        this.addWantedHeat(Math.max(0, 1 - this.wantedStars), 'Kaçak Kargo İhbarı!');
        this.audio.playPickup(false);
        this.showToast('Paket alındı! İskele teknesine sür!', 'mission');
      } else if (this.missionStage === 2 && dist < 6.5) {
        this.completeMission();
      }
    } else if (this.mission.type === 'hijack' || this.mission.type === 'convoy') {
      if (
        this.missionStage === 2 &&
        this.currentVehicle &&
        this.currentVehicle.id === this.missionVehicleId &&
        dist < 6.8
      ) {
        this.completeMission();
      }
    } else if (this.mission.type === 'gang') {
      if (this.missionStage === 2 && dist < 6.5) {
        this.completeMission();
      }
    } else if (this.mission.type === 'race') {
      if (this.currentVehicle && dist < 7.8) {
        this.audio.playPickup(false);
        this.raceCheckpointIdx++;
        if (this.raceCheckpointIdx >= this.raceCheckpoints.length) {
          this.completeMission();
        } else {
          const nextPt = this.raceCheckpoints[this.raceCheckpointIdx];
          this.missionTargetPos.copy(nextPt);
          this.missionTargetMesh.position.copy(nextPt);
          const isFinal = this.raceCheckpointIdx === this.raceCheckpoints.length - 1;
          this.setBeaconColor(this.missionTargetMesh, isFinal ? 0x00f5d4 : 0xffbe0b);
          this.mission.stageLabel = `Bölüm ${this.raceCheckpointIdx + 1}/${this.raceCheckpoints.length}`;
          this.mission.progressText = `Kontrol Noktası: ${this.raceCheckpointIdx}/${this.raceCheckpoints.length}`;
          this.mission.objective = isFinal
            ? 'Son düzlük! Solaris İskelesi bitiş çizgisine tam gaz bas!'
            : 'Bir sonraki parlak kontrol noktasına tam gaz sür!';
          this.mission.timeLeft += 8; // GTA checkpoint time bonus
          this.showToast(`Kontrol Noktası ${this.raceCheckpointIdx}/${this.raceCheckpoints.length} (+8sn)`, 'mission');
        }
      }
    } else if (this.mission.type === 'heist') {
      if (this.missionStage === 1 && dist < 5.5) {
        this.missionStage = 2;
        this.mission.stageLabel = 'Aşama 2/3';
        this.addWantedHeat(Math.max(0, 4 - this.wantedStars), 'Merkez Banka Soygunu!');
        this.missionTargetPos.copy(this.city.payNSprayPos);
        this.missionTargetMesh.position.copy(this.missionTargetPos);
        this.setBeaconColor(this.missionTargetMesh, 0xffbe0b);
        this.mission.objective = 'Kasa boşaltıldı! İstersen Boyahaneye (Sarı) gir veya İskele kaçışına yönel!';
        this.audio.playPickup(true);
        this.showToast('4★ Alarm! Boyahane yakınında izini kaybettir!', 'wanted');
      } else if (this.missionStage === 2) {
        // Advance to Final Pier Escape once player visits Pay'n'Spray area OR evades/gets near pier
        const distPier = Math.hypot(
          px - this.city.spawnPoints.deliveryTargets[0].x,
          pz - this.city.spawnPoints.deliveryTargets[0].z,
        );
        if (dist < 10 || this.wantedStars === 0 || distPier < 45) {
          this.missionStage = 3;
          this.mission.stageLabel = 'Aşama 3/3';
          this.missionTargetPos.copy(this.city.spawnPoints.deliveryTargets[0]);
          this.missionTargetMesh.position.copy(this.missionTargetPos);
          this.setBeaconColor(this.missionTargetMesh, 0x00f5d4);
          this.mission.objective = 'Son aşama: Solaris İskelesi ucundaki kaçış teknesine ulaş!';
          this.showToast('İskeledeki kaçış teknesine bas!', 'mission');
        }
      } else if (this.missionStage === 3 && dist < 6.8) {
        this.completeMission();
      }
    }
  }

  private updatePickups(dt: number): void {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.mesh.children[0].rotation.y += dt * 2.4;
      p.mesh.children[0].position.y = (p.kind === 'weaponDrop' ? 0.68 : 0.85) + Math.sin(this.elapsed * 3.5 + i) * 0.14;

      if (p.pickupDelay && p.pickupDelay > 0) {
        p.pickupDelay -= dt;
        continue;
      }

      if (Math.hypot(px - p.x, pz - p.z) < 2.2) {
        if (p.kind === 'weaponDrop' && p.weaponId) {
          if (this.currentVehicle) continue;
          const wid = p.weaponId;
          const spec = WEAPON_SPECS[wid];
          const wasOwned = this.ownedWeapons[wid];
          this.ownedWeapons[wid] = true;
          if (!wasOwned) {
            this.magAmmo[wid] = p.magRounds ?? spec.magSize;
            this.ammo[wid] += p.reserveRounds ?? 0;
            this.activeWeapon = wid;
            this.lastFirearm = wid;
            this.syncPlayerWeaponMesh();
          } else {
            this.ammo[wid] += (p.magRounds ?? 0) + (p.reserveRounds ?? 0);
          }
          this.showToast(`${spec.shortName} yerden alındı!`, 'mission');
        } else if (p.kind === 'cash') {
          this.cash += p.amount;
          this.showToast(`+$${p.amount} Nakit Toplandı`, 'cash');
        } else if (p.kind === 'health') {
          this.health = Math.min(this.maxHealth, this.health + p.amount);
          this.showToast(`+${p.amount} Can Yenilendi`, 'mission');
        } else if (p.kind === 'armor') {
          this.armor = Math.min(100, this.armor + p.amount);
          this.showToast(`+${p.amount} Çelik Yelek`, 'mission');
        } else if (p.kind === 'bribe') {
          if (this.wantedStars > 0) {
            this.wantedStars = Math.max(0, this.wantedStars - 1);
            this.wantedHeat = 0;
            this.showToast('Polis Rüşveti: Aranma Seviyesi -1★', 'mission');
          } else {
            this.cash += 150;
            this.showToast('+$150 Gizli Paket Bonusu', 'cash');
          }
        } else if (p.kind === 'ammo') {
          this.ammo.pistol += Math.round(p.amount * 0.5);
          if (this.ownedWeapons.smg) this.ammo.smg += p.amount;
          if (this.ownedWeapons.shotgun) this.ammo.shotgun += Math.max(6, Math.round(p.amount * 0.25));
          if (this.ownedWeapons.rifle) this.ammo.rifle += Math.round(p.amount * 0.75);
          this.showToast('Cephane Eklendi!', 'mission');
        }
        this.audio.playPickup(p.kind === 'cash');
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  // VFX Pools
  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed: number,
    life: number,
  ): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.startScale = 0.6 + Math.random() * 0.8;
      p.endScale = 0.08;
      p.gravity = 12;
      p.vx = (Math.random() - 0.5) * speed * 2;
      p.vy = Math.random() * speed * 1.2 + 1.5;
      p.vz = (Math.random() - 0.5) * speed * 2;
      p.mesh.position.set(x, y, z);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(colorHex);
      mat.opacity = 1;
      p.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      const floorY = this.getGroundHeight(p.mesh.position.x, p.mesh.position.z) + 0.05;
      p.mesh.position.y = Math.max(floorY, p.mesh.position.y + p.vy * dt);
      const t = 1 - p.life / p.maxLife;
      const s = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
      p.mesh.scale.setScalar(s);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }
  }

  private spawnTracer(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    colorHex: number,
  ): void {
    const dist = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    if (dist < 0.2) return;
    const geo = new THREE.CylinderGeometry(0.03, 0.03, dist, 5);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    mesh.lookAt(x2, y2, z2);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.075 });
  }

  private updateTracers(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        (tr.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number): void {
    if (this.manualLookTimer > 0) {
      this.manualLookTimer = Math.max(0, this.manualLookTimer - dt);
    }

    // Smoothly damp yaw & pitch toward user's look target
    this.cameraYaw = this.lerpAngle(this.cameraYaw, this.cameraTargetYaw, 1 - Math.exp(-18 * dt));
    this.cameraPitch = THREE.MathUtils.damp(this.cameraPitch, this.cameraTargetPitch, 18, dt);

    const modeDistScale = this.cameraMode === 0 ? 1.0 : this.cameraMode === 1 ? 1.45 : 0.78;
    const modePitchBias = this.cameraMode === 2 ? -0.14 : 0;

    this.isAiming =
      !this.currentVehicle &&
      this.activeWeapon !== 'unarmed' &&
      this.activeWeapon !== 'knife' &&
      (this.rightMouseDown ||
        this.aimToggled ||
        this.virtualAim ||
        this.dualsense.state.l2 > 0.25 ||
        this.dualsense.state.held.has('l2'));

    if (this.currentVehicle) {
      const v = this.currentVehicle;
      // Faster follow recovery while driving so turning corners stays effortless
      if (this.manualLookTimer > 0 && Math.abs(v.speed) > 2) {
        this.manualLookTimer = Math.max(0, this.manualLookTimer - dt * 0.8);
      }
      if (this.manualLookTimer <= 0 && Math.abs(v.speed) > 0.6) {
        const behindYaw = v.rotY + Math.PI;
        this.cameraTargetYaw = this.lerpAngle(this.cameraTargetYaw, behindYaw, 1 - Math.exp(-5.8 * dt));
      }

      const dist = (9.6 + Math.min(3.2, Math.abs(v.speed) * 0.07)) * modeDistScale;
      const pitch = THREE.MathUtils.clamp(this.cameraPitch + modePitchBias, -0.06, 0.92);
      const horiz = Math.cos(pitch) * dist;
      const vert = 1.85 + Math.sin(pitch) * dist;

      _v2.set(v.x + Math.sin(v.rotY) * 2.2, v.y + 1.55, v.z + Math.cos(v.rotY) * 2.2);
      _v1.set(
        v.x + Math.sin(this.cameraYaw) * horiz,
        Math.max(0.75, v.y + vert),
        v.z + Math.cos(this.cameraYaw) * horiz,
      );

      // Speed FOV surge
      const targetFov = 60 + Math.min(14, Math.abs(v.speed) * 0.34);
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
        this.camera.updateProjectionMatrix();
      }
    } else {
      const dist = this.isAiming ? 3.1 : 5.8 * modeDistScale;
      const pitch = THREE.MathUtils.clamp(this.cameraPitch + (this.isAiming ? 0 : modePitchBias), -0.14, 0.96);
      const horiz = Math.cos(pitch) * dist;
      const vert = (this.isAiming ? 1.72 : 1.65) + Math.sin(pitch) * dist;

      // Over-the-shoulder right offset when ADS aiming
      const shoulderOffset = this.isAiming ? 0.68 : 0.16;
      const rightX = Math.cos(this.cameraYaw);
      const rightZ = -Math.sin(this.cameraYaw);

      _v2.set(
        this.playerX + rightX * shoulderOffset,
        this.playerY + (this.isAiming ? 1.64 : 1.55),
        this.playerZ + rightZ * shoulderOffset,
      );
      _v1.set(
        this.playerX + rightX * shoulderOffset + Math.sin(this.cameraYaw) * horiz,
        Math.max(0.72, this.playerY + vert),
        this.playerZ + rightZ * shoulderOffset + Math.cos(this.cameraYaw) * horiz,
      );

      const targetFov = this.isAiming ? 43 : 60;
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
        this.camera.updateProjectionMatrix();
      }
    }

    // Prevent camera from clipping inside buildings when orbiting around
    const camRayX = _v1.x - _v2.x;
    const camRayZ = _v1.z - _v2.z;
    const camRayDist = Math.hypot(camRayX, camRayZ);
    if (camRayDist > 0.4) {
      const rdx = camRayX / camRayDist;
      const rdz = camRayZ / camRayDist;
      let nearestWall = camRayDist;
      for (const c of this.city.colliders) {
        if (_v1.y > c.height + 0.5) continue;
        const hitT = this.rayIntersectAABB2D(_v2.x, _v2.z, rdx, rdz, c.minX, c.maxX, c.minZ, c.maxZ, nearestWall);
        if (hitT !== null && hitT < nearestWall) {
          nearestWall = hitT;
        }
      }
      if (nearestWall < camRayDist) {
        const pull = Math.max(1.2, nearestWall - 0.55) / camRayDist;
        _v1.x = _v2.x + camRayX * pull;
        _v1.z = _v2.z + camRayZ * pull;
      }
    }

    // Prevent camera from clipping inside vehicles or buildings
    this.resolveCircleAgainstVehicles(_v1.x, _v1.y - 0.55, _v1.z, 0.65, this.currentVehicle, (nx, nz, hit, hitVeh) => {
      if (hit && hitVeh) {
        _v1.y = Math.max(_v1.y, hitVeh.y + 1.95);
        _v1.x = nx;
        _v1.z = nz;
      }
    });

    // Keep camera above mountain slopes & roofs so it never clips underground
    const camGroundY = this.getGroundHeight(_v1.x, _v1.z);
    if (_v1.y < camGroundY + 1.15) {
      _v1.y = camGroundY + 1.15;
    }

    this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, _v1.x, 14, dt);
    this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, _v1.y, 14, dt);
    this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, _v1.z, 14, dt);

    this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, _v2.x, 16, dt);
    this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, _v2.y, 16, dt);
    this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, _v2.z, 16, dt);

    if (this.cameraShake > 0.005) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.6);
      const sx = (Math.random() - 0.5) * this.cameraShake;
      const sy = (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.set(this.camCurrentPos.x + sx, this.camCurrentPos.y + sy, this.camCurrentPos.z);
    } else {
      this.camera.position.copy(this.camCurrentPos);
    }
    this.camera.lookAt(this.camCurrentLook);
  }

  private updateContextualPrompt(): void {
    const t = getTranslations(this.language);
    if (this.currentVehicle) {
      this.nearWeaponShop = false;
      this.nearClothingShop = false;
      this.nearBarberShop = false;
      const dGarage = Math.hypot(
        this.currentVehicle.x - this.city.payNSprayPos.x,
        this.currentVehicle.z - this.city.payNSprayPos.z,
      );
      if (dGarage < 12) {
        this.promptText = t.engine.sprayPrompt;
      } else {
        this.promptText = '';
      }
      return;
    }

    const dShop = Math.hypot(this.playerX - this.city.weaponShopPos.x, this.playerZ - this.city.weaponShopPos.z);
    const dClothing = Math.hypot(this.playerX - this.city.clothingShopPos.x, this.playerZ - this.city.clothingShopPos.z);
    const dBarber = Math.hypot(this.playerX - this.city.barberShopPos.x, this.playerZ - this.city.barberShopPos.z);
    this.nearWeaponShop = dShop < 5.5;
    this.nearClothingShop = dClothing < 5.5;
    this.nearBarberShop = dBarber < 5.5;

    let nearCar: VehicleEntity | null = null;
    let best = 4.8;
    for (const v of this.vehicles) {
      if (v.exploded) continue;
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < best) {
        best = d;
        nearCar = v;
      }
    }
    if (this.nearWeaponShop) {
      this.promptText = t.engine.shopPrompt;
    } else if (this.nearClothingShop) {
      this.promptText = t.engine.clothingPrompt;
    } else if (this.nearBarberShop) {
      this.promptText = t.engine.barberPrompt;
    } else if (nearCar) {
      this.promptText = t.engine.enterCarPrompt(nearCar.label);
    } else {
      this.promptText = '';
    }
  }

  // Minimap Canvas Renderer (60fps zero-React overhead, edge-clamped tactical landmarks)
  private drawMinimap(): void {
    const canvas = this.minimapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size * 0.5;
    const scale = this.radarZoom === 'near' ? 0.92 : 0.44;
    const clampRadius = half - 13;

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark urban base
    ctx.fillStyle = '#181c28';
    ctx.fillRect(0, 0, size, size);

    ctx.translate(half, half);
    ctx.rotate(this.cameraYaw);

    // Ocean strip (West x < -150), Sandy Beach & Mountain Foothills
    ctx.fillStyle = '#133b5c';
    ctx.fillRect((-650 - px) * scale, (-550 - pz) * scale, 500 * scale, 1100 * scale);
    ctx.fillStyle = '#c49b56';
    ctx.fillRect((-150 - px) * scale, (-180 - pz) * scale, 18 * scale, 360 * scale);
    // Surrounding Mountain Foothills & Mount Solaris Dirt Trail
    ctx.fillStyle = '#253229';
    for (const mp of this.city.mountainPeaks) {
      ctx.beginPath();
      ctx.arc((mp.x - px) * scale, (mp.z - pz) * scale, mp.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#9a7d5c';
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    this.city.mountainTrail.forEach(([txp, tzp], idx) => {
      const sx = (txp - px) * scale;
      const sz = (tzp - pz) * scale;
      if (idx === 0) ctx.moveTo(sx, sz);
      else ctx.lineTo(sx, sz);
    });
    ctx.stroke();
    // Solaris Pier
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect((-224 - px) * scale, (-8 - pz) * scale, 78 * scale, 16 * scale);

    // Roads
    ctx.fillStyle = '#31374a';
    for (const rx of ROAD_COORDS) {
      ctx.fillRect((rx - 8 - px) * scale, (-148 - pz) * scale, 16 * scale, 296 * scale);
    }
    for (const rz of ROAD_COORDS) {
      ctx.fillRect((-148 - px) * scale, (rz - 8 - pz) * scale, 296 * scale, 16 * scale);
    }

    // Subtle avenue lane dashes
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.24)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const rx of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo((rx - px) * scale, (-145 - pz) * scale);
      ctx.lineTo((rx - px) * scale, (145 - pz) * scale);
      ctx.stroke();
    }
    for (const rz of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo((-145 - px) * scale, (rz - pz) * scale);
      ctx.lineTo((145 - px) * scale, (rz - pz) * scale);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Buildings (round towers as circles)
    ctx.fillStyle = '#474f69';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.8;
    for (const b of this.city.minimapBuildings) {
      if (b.round) {
        ctx.beginPath();
        ctx.arc((b.x - px) * scale, (b.z - pz) * scale, b.w * 0.48 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const bx = (b.x - b.w * 0.5 - px) * scale;
        const bz = (b.z - b.d * 0.5 - pz) * scale;
        ctx.fillRect(bx, bz, b.w * scale, b.d * scale);
        ctx.strokeRect(bx, bz, b.w * scale, b.d * scale);
      }
    }

    // Secondary contract zones shown faintly when idle
    if (!this.mission.active) {
      ctx.fillStyle = 'rgba(255, 190, 11, 0.45)';
      for (const gz of this.city.spawnPoints.gangZones) {
        ctx.beginPath();
        ctx.arc((gz.x - px) * scale, (gz.z - pz) * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // GPS Route Line to active target (or Mission Hub when free-roam)
    const gpsTarget = this.mission.active ? this.missionTargetPos : this.city.missionHubPos;
    const tx = (gpsTarget.x - px) * scale;
    const tz = (gpsTarget.z - pz) * scale;
    ctx.strokeStyle = this.mission.active ? 'rgba(0, 245, 212, 0.72)' : 'rgba(255, 190, 11, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tx, tz);
    ctx.stroke();
    ctx.setLineDash([]);

    // Police Blips
    for (const v of this.vehicles) {
      if (v.aiRole === 'police' && !v.exploded) {
        const vx = (v.x - px) * scale;
        const vz = (v.z - pz) * scale;
        ctx.fillStyle = Math.sin(this.elapsed * 16) > 0 ? '#ff2a4b' : '#2494ff';
        ctx.beginPath();
        ctx.arc(vx, vz, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Police Helicopter Blip
    if (this.policeHeliRig.group.visible) {
      const hx = (this.heliPos.x - px) * scale;
      const hz = (this.heliPos.z - pz) * scale;
      ctx.strokeStyle = '#6ef3d6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hz, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Gang Blips
    for (const n of this.npcs) {
      if (!n.dead && n.role === 'gang') {
        const nx = (n.x - px) * scale;
        const nz = (n.z - pz) * scale;
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.arc(nx, nz, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Online Remote Player Blips
    for (const rp of this.remotePlayers.values()) {
      const rx = (rp.x - px) * scale;
      const rz = (rp.z - pz) * scale;
      ctx.fillStyle = `#${rp.color.toString(16).padStart(6, '0')}`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(rx, rz, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Subtle radar range ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    // Upright Edge-Clamped Landmark Icons (Always visible even across the city!)
    const cosY = Math.cos(this.cameraYaw);
    const sinY = Math.sin(this.cameraYaw);
    const drawLandmarkBadge = (
      wx: number,
      wz: number,
      label: string,
      bg: string,
      fg: string,
      isSquare: boolean,
      sizePx: number,
    ) => {
      const dx = (wx - px) * scale;
      const dz = (wz - pz) * scale;
      let sx = dx * cosY - dz * sinY;
      let sy = dx * sinY + dz * cosY;
      const distPx = Math.hypot(sx, sy);
      const clamped = distPx > clampRadius;
      if (clamped && distPx > 0.001) {
        sx = (sx / distPx) * clampRadius;
        sy = (sy / distPx) * clampRadius;
      }
      const bx = half + sx;
      const by = half + sy;

      // Rim directional arrow when marker is outside radar range
      if (clamped) {
        const ang = Math.atan2(sy, sx);
        const ax = half + Math.cos(ang) * (half - 4);
        const ay = half + Math.sin(ang) * (half - 4);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang - 0.5) * 5, ay - Math.sin(ang - 0.5) * 5);
        ctx.lineTo(ax - Math.cos(ang + 0.5) * 5, ay - Math.sin(ang + 0.5) * 5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      if (isSquare) {
        const hs = sizePx;
        ctx.fillRect(bx - hs, by - hs, hs * 2, hs * 2);
        ctx.strokeRect(bx - hs, by - hs, hs * 2, hs * 2);
      } else {
        ctx.beginPath();
        ctx.arc(bx, by, sizePx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = fg;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by + 0.5);
    };

    // Pay 'n' Spray (B)
    drawLandmarkBadge(this.city.payNSprayPos.x, this.city.payNSprayPos.z, 'B', '#2ec4b6', '#0c1b19', false, 6.5);
    // Solaris Arms Silahci (S)
    drawLandmarkBadge(this.city.weaponShopPos.x, this.city.weaponShopPos.z, 'S', '#ff4d6d', '#ffffff', true, 7);
    // Solaris Style Kiyafetci (K)
    drawLandmarkBadge(this.city.clothingShopPos.x, this.city.clothingShopPos.z, 'K', '#ff70a6', '#ffffff', true, 6.8);
    // Solaris Cuts Berber (T)
    drawLandmarkBadge(this.city.barberShopPos.x, this.city.barberShopPos.z, 'T', '#38bdf8', '#0c1b29', true, 6.8);
    // Mission Hub (G) - always shown; if mission active, also show Active Target (*)
    drawLandmarkBadge(this.city.missionHubPos.x, this.city.missionHubPos.z, 'G', '#ffbe0b', '#141022', false, 7);
    if (this.mission.active) {
      drawLandmarkBadge(this.missionTargetPos.x, this.missionTargetPos.z, '★', '#00f5d4', '#0b1c1a', false, 7.5);
    }

    // Center Frank Triangle pointing forward
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#141022';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(half, half - 7);
    ctx.lineTo(half - 5, half + 5);
    ctx.lineTo(half, half + 2);
    ctx.lineTo(half + 5, half + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Full City Tactical Map Renderer (North-up)
  private drawFullMap(): void {
    const canvas = this.fullMapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Map world [-260 .. 300] X and [-295 .. 270] Z so climbable Mount Solaris & East Range appear cleanly
    const minX = -260;
    const maxX = 300;
    const minZ = -295;
    const maxZ = 270;
    const mapScale = Math.min(w / (maxX - minX), h / (maxZ - minZ));
    const offsetX = (w - (maxX - minX) * mapScale) * 0.5;
    const offsetY = (h - (maxZ - minZ) * mapScale) * 0.5;
    const toX = (wx: number) => offsetX + (wx - minX) * mapScale;
    const toY = (wz: number) => offsetY + (wz - minZ) * mapScale;

    // Background terrain
    ctx.fillStyle = '#161a24';
    ctx.fillRect(0, 0, w, h);

    // Mountain Ranges around North, East & South
    for (const mp of this.city.mountainPeaks) {
      const mx = toX(mp.x);
      const my = toY(mp.z);
      const mr = mp.r * mapScale;
      ctx.fillStyle = 'rgba(48, 66, 51, 0.72)';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(98, 92, 95, 0.55)';
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(154, 139, 130, 0.45)';
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mount Solaris Dirt Road Trail up to the Summit
    ctx.strokeStyle = '#a88963';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.city.mountainTrail.forEach(([txp, tzp], idx) => {
      if (idx === 0) ctx.moveTo(toX(txp), toY(tzp));
      else ctx.lineTo(toX(txp), toY(tzp));
    });
    ctx.stroke();

    // Subtle tactical grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let gx = -240; gx <= 280; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(toX(gx), 0);
      ctx.lineTo(toX(gx), h);
      ctx.stroke();
    }
    for (let gz = -280; gz <= 240; gz += 40) {
      ctx.beginPath();
      ctx.moveTo(0, toY(gz));
      ctx.lineTo(w, toY(gz));
      ctx.stroke();
    }

    // Ocean (West x < -150) & Sandy Beach (-150 .. -132)
    const oceanGrad = ctx.createLinearGradient(0, 0, toX(-150), 0);
    oceanGrad.addColorStop(0, '#0b253d');
    oceanGrad.addColorStop(1, '#144266');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, toX(-150), h);

    ctx.fillStyle = '#c89f5b';
    ctx.fillRect(toX(-150), 0, 18 * mapScale, h);

    // Mountain Range Title Label
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLARIS DAĞI ZİRVESİ (52m)', toX(-12), toY(-262));
    ctx.fillText('DOĞU SIRADAĞLARI', toX(228), toY(-8));

    // Boardwalk & Solaris Pier
    ctx.fillStyle = '#6f5c4d';
    ctx.fillRect(toX(-132), toY(-150), 6 * mapScale, 300 * mapScale);
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(toX(-225), toY(-7), 78 * mapScale, 14 * mapScale);

    // Roads
    ctx.fillStyle = '#2d3345';
    for (const rx of ROAD_COORDS) {
      ctx.fillRect(toX(rx - 8), toY(-148), 16 * mapScale, 296 * mapScale);
    }
    for (const rz of ROAD_COORDS) {
      ctx.fillRect(toX(-148), toY(rz - 8), 296 * mapScale, 16 * mapScale);
    }

    // Road center stripes
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (const rx of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo(toX(rx), toY(-145));
      ctx.lineTo(toX(rx), toY(145));
      ctx.stroke();
    }
    for (const rz of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo(toX(-145), toY(rz));
      ctx.lineTo(toX(145), toY(rz));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // City Blocks / Buildings
    for (const b of this.city.minimapBuildings) {
      if (b.round) {
        ctx.fillStyle = '#4f5878';
        ctx.beginPath();
        ctx.arc(toX(b.x), toY(b.z), b.w * 0.48 * mapScale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#3f4763';
        ctx.fillRect(toX(b.x - b.w * 0.5), toY(b.z - b.d * 0.5), b.w * mapScale, b.d * mapScale);
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(toX(b.x - b.w * 0.5), toY(b.z - b.d * 0.5), b.w * mapScale, b.d * mapScale);
      }
    }

    // Secondary contract zone pips
    ctx.fillStyle = 'rgba(255, 190, 11, 0.45)';
    for (const gz of this.city.spawnPoints.gangZones) {
      ctx.beginPath();
      ctx.arc(toX(gz.x), toY(gz.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active GPS route line from Frank
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const gpsTarget = this.mission.active ? this.missionTargetPos : this.city.missionHubPos;
    ctx.strokeStyle = this.mission.active ? '#00f5d4' : '#ffbe0b';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(toX(px), toY(pz));
    ctx.lineTo(toX(gpsTarget.x), toY(gpsTarget.z));
    ctx.stroke();
    ctx.setLineDash([]);

    // Police & Gang blips
    for (const v of this.vehicles) {
      if (v.aiRole === 'police' && !v.exploded) {
        ctx.fillStyle = '#3a86ff';
        ctx.beginPath();
        ctx.arc(toX(v.x), toY(v.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const n of this.npcs) {
      if (!n.dead && n.role === 'gang') {
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.arc(toX(n.x), toY(n.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const rp of this.remotePlayers.values()) {
      const rx = toX(rp.x);
      const ry = toY(rp.z);
      ctx.fillStyle = `#${rp.color.toString(16).padStart(6, '0')}`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rp.name, rx, ry - 9);
    }

    // Labeled Landmark Helper
    const drawPin = (wx: number, wz: number, code: string, title: string, color: string, textDark: boolean) => {
      const x = toX(wx);
      const y = toY(wz);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textDark ? '#141022' : '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, x, y + 0.5);

      ctx.font = 'bold 10px sans-serif';
      const tw = ctx.measureText(title).width + 10;
      ctx.fillStyle = 'rgba(14, 11, 24, 0.88)';
      ctx.fillRect(x - tw * 0.5, y + 12, tw, 15);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - tw * 0.5, y + 12, tw, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, x, y + 20);
    };

    drawPin(-214, 0, 'İ', 'SOLARIS İSKELESİ', '#3a86ff', false);
    drawPin(this.city.payNSprayPos.x, this.city.payNSprayPos.z, 'B', 'BOYAHANE', '#2ec4b6', true);
    drawPin(this.city.weaponShopPos.x, this.city.weaponShopPos.z, 'S', 'SİLAHÇI', '#ff4d6d', false);
    drawPin(this.city.clothingShopPos.x, this.city.clothingShopPos.z, 'K', 'KIYAFETÇİ', '#ff70a6', false);
    drawPin(this.city.barberShopPos.x, this.city.barberShopPos.z, 'T', 'BERBER', '#38bdf8', true);
    drawPin(this.city.missionHubPos.x, this.city.missionHubPos.z, 'G', 'GÖREV MERKEZİ', '#ffbe0b', true);
    if (this.mission.active) {
      drawPin(this.missionTargetPos.x, this.missionTargetPos.z, '★', 'AKTİF HEDEF', '#00f5d4', true);
    }

    // Frank's oriented player marker
    const fx = toX(px);
    const fy = toY(pz);
    const rot = this.currentVehicle ? this.currentVehicle.rotY : this.playerRotY;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(-rot);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(-6, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Geometry Collision Helpers
  private resolveCircleWorldCollision(
    x: number,
    z: number,
    radius: number,
    apply: (nx: number, nz: number, hit: boolean) => void,
  ): void {
    let cx = x;
    let cz = z;
    let hit = false;
    for (const c of this.city.colliders) {
      const closestX = THREE.MathUtils.clamp(cx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(cz, c.minZ, c.maxZ);
      const dx = cx - closestX;
      const dz = cz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          cx += (dx / dist) * push;
          cz += (dz / dist) * push;
        } else {
          cx += radius;
        }
      }
    }
    apply(cx, cz, hit);
  }

  private resolveCircleAgainstVehicles(
    x: number,
    y: number,
    z: number,
    radius: number,
    excludeVehicle: VehicleEntity | null,
    apply: (nx: number, nz: number, hit: boolean, hitVeh: VehicleEntity | null) => void,
  ): void {
    let cx = x;
    let cz = z;
    let hit = false;
    let hitVeh: VehicleEntity | null = null;

    for (const v of this.vehicles) {
      if (v === excludeVehicle) continue;
      // Allow standing cleanly above roof level without horizontal push-out
      const roofY = v.type === 'suv' ? 1.54 : v.type === 'sports' ? 1.2 : 1.29;
      if (y > v.y + roofY - 0.14 || y < v.y - 1.5) continue;

      const fwdX = Math.sin(v.rotY);
      const fwdZ = Math.cos(v.rotY);
      const rightX = Math.cos(v.rotY);
      const rightZ = -Math.sin(v.rotY);

      const dx = cx - v.x;
      const dz = cz - v.z;
      const localX = dx * rightX + dz * rightZ;
      const localZ = dx * fwdX + dz * fwdZ;

      const hw = v.rig.halfWidth + 0.04;
      const hl = v.rig.halfLength + 0.06;

      const clampedX = THREE.MathUtils.clamp(localX, -hw, hw);
      const clampedZ = THREE.MathUtils.clamp(localZ, -hl, hl);
      const diffX = localX - clampedX;
      const diffZ = localZ - clampedZ;
      const distSq = diffX * diffX + diffZ * diffZ;

      if (distSq < radius * radius) {
        hit = true;
        hitVeh = v;
        if (distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          const nxL = diffX / dist;
          const nzL = diffZ / dist;
          cx += (nxL * rightX + nzL * fwdX) * push;
          cz += (nxL * rightZ + nzL * fwdZ) * push;
        } else {
          // Inside vehicle OBB: push out via nearest edge
          const penX = hw - Math.abs(localX);
          const penZ = hl - Math.abs(localZ);
          if (penX < penZ) {
            const signX = localX >= 0 ? 1 : -1;
            const push = penX + radius;
            cx += rightX * signX * push;
            cz += rightZ * signX * push;
          } else {
            const signZ = localZ >= 0 ? 1 : -1;
            const push = penZ + radius;
            cx += fwdX * signZ * push;
            cz += fwdZ * signZ * push;
          }
        }
      }
    }

    apply(cx, cz, hit, hitVeh);
  }

  private getGroundHeightWithVehicles(x: number, y: number, z: number): number {
    let h = this.getGroundHeight(x, z);
    for (const r of this.city.ramps) {
      const relX = x - r.x;
      const relZ = z - r.z;
      const along = relX * r.dirX + relZ * r.dirZ;
      const across = Math.abs(-relX * r.dirZ + relZ * r.dirX);
      if (across < r.width * 0.5 && along > -r.length * 0.5 && along < r.length * 0.52) {
        const t = Math.min(1, (along + r.length * 0.5) / r.length);
        h = Math.max(h, 0.01 + t * r.height);
      }
    }
    for (const v of this.vehicles) {
      if (v.exploded) continue;
      if (y < v.y + 0.85) continue;
      const dx = x - v.x;
      const dz = z - v.z;
      const fwdX = Math.sin(v.rotY);
      const fwdZ = Math.cos(v.rotY);
      const rightX = Math.cos(v.rotY);
      const rightZ = -Math.sin(v.rotY);
      const localX = dx * rightX + dz * rightZ;
      const localZ = dx * fwdX + dz * fwdZ;
      const hw = v.rig.halfWidth - 0.05;
      const hl = v.rig.halfLength - 0.08;
      if (Math.abs(localX) <= hw && Math.abs(localZ) <= hl) {
        const roofH = v.type === 'suv' ? 1.58 : v.type === 'sports' ? 1.24 : 1.32;
        const deckH = Math.abs(localZ) < hl * 0.45 ? roofH : 0.86;
        if (y >= v.y + deckH - 0.25) {
          h = Math.max(h, v.y + deckH);
        }
      }
    }
    return h;
  }

  private testVehicleObbCollision(
    a: VehicleEntity,
    b: VehicleEntity,
  ): { nx: number; nz: number; overlap: number } | null {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const ahl = a.rig.halfLength + 0.04;
    const ahw = a.rig.halfWidth + 0.03;
    const bhl = b.rig.halfLength + 0.04;
    const bhw = b.rig.halfWidth + 0.03;

    // Fast radial broadphase reject
    const maxReach = ahl + bhl + 0.8;
    if (dx * dx + dz * dz > maxReach * maxReach) return null;

    const afx = Math.sin(a.rotY);
    const afz = Math.cos(a.rotY);
    const arx = afz;
    const arz = -afx;

    const bfx = Math.sin(b.rotY);
    const bfz = Math.cos(b.rotY);
    const brx = bfz;
    const brz = -bfx;

    let minOverlap = Infinity;
    let bestNx = 0;
    let bestNz = 0;

    // 4 SAT separating axes
    for (let k = 0; k < 4; k++) {
      const ux = k === 0 ? afx : k === 1 ? arx : k === 2 ? bfx : brx;
      const uz = k === 0 ? afz : k === 1 ? arz : k === 2 ? bfz : brz;

      const centerProj = Math.abs(dx * ux + dz * uz);
      const ra = Math.abs(afx * ux + afz * uz) * ahl + Math.abs(arx * ux + arz * uz) * ahw;
      const rb = Math.abs(bfx * ux + bfz * uz) * bhl + Math.abs(brx * ux + brz * uz) * bhw;
      const overlap = ra + rb - centerProj;
      if (overlap <= 0) return null;

      if (overlap < minOverlap) {
        minOverlap = overlap;
        const sign = dx * ux + dz * uz >= 0 ? 1 : -1;
        bestNx = ux * sign;
        bestNz = uz * sign;
      }
    }

    return { nx: bestNx, nz: bestNz, overlap: minOverlap };
  }

  private rayIntersectSphere(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    sx: number,
    sy: number,
    sz: number,
    r: number,
  ): number | null {
    const fx = ox - sx;
    const fy = oy - sy;
    const fz = oz - sz;
    const b = 2 * (fx * dx + fy * dy + fz * dz);
    const c = fx * fx + fy * fy + fz * fz - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) * 0.5;
    return t >= 0 ? t : null;
  }

  private rayIntersectAABB2D(
    ox: number,
    oz: number,
    dx: number,
    dz: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    maxT: number,
  ): number | null {
    const invX = dx !== 0 ? 1 / dx : 1e9;
    const invZ = dz !== 0 ? 1 / dz : 1e9;
    const t1 = (minX - ox) * invX;
    const t2 = (maxX - ox) * invX;
    const t3 = (minZ - oz) * invZ;
    const t4 = (maxZ - oz) * invZ;
    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    if (tmax < 0 || tmin > tmax || tmin > maxT) return null;
    return tmin >= 0 ? tmin : null;
  }

  private isPointNearBuilding(x: number, z: number, pad = 1.6): boolean {
    for (const c of this.city.colliders) {
      if (x >= c.minX - pad && x <= c.maxX + pad && z >= c.minZ - pad && z <= c.maxZ + pad) {
        return true;
      }
    }
    return false;
  }

  private hasLineOfSight2D(ax: number, az: number, bx: number, bz: number): boolean {
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.25) return true;
    const ndx = dx / dist;
    const ndz = dz / dist;
    const maxT = dist - 0.35;
    for (const c of this.city.colliders) {
      if (this.rayIntersectAABB2D(ax, az, ndx, ndz, c.minX, c.maxX, c.minZ, c.maxZ, maxT) !== null) {
        return false;
      }
    }
    return true;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private emitHud(): void {
    const evadeTotal = 5.0 + this.wantedStars * 0.9;
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const shopDistanceMeters = Math.round(
      Math.hypot(this.city.weaponShopPos.x - px, this.city.weaponShopPos.z - pz),
    );
    const clothingDistanceMeters = Math.round(
      Math.hypot(this.city.clothingShopPos.x - px, this.city.clothingShopPos.z - pz),
    );
    const barberDistanceMeters = Math.round(
      Math.hypot(this.city.barberShopPos.x - px, this.city.barberShopPos.z - pz),
    );
    const missionHubDistanceMeters = Math.round(
      Math.hypot(this.city.missionHubPos.x - px, this.city.missionHubPos.z - pz),
    );
    const onlinePlayers: OnlinePlayerInfo[] = Array.from(this.remotePlayers.values()).map((rp) => ({
      id: rp.id,
      name: rp.name,
      color: rp.color,
      inVehicle: rp.inVehicle,
      wantedStars: rp.wantedStars,
    }));
    const t = getTranslations(this.language);
    this.onHudUpdate({
      phase: this.phase,
      language: this.language,
      playerName: this.playerName,
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      armor: Math.ceil(this.armor),
      cash: this.cash,
      wantedStars: this.wantedStars,
      wantedHeat: Math.min(100, Math.round(this.wantedHeat)),
      wantedEvading: this.wantedEvading,
      wantedEvadeProgress:
        this.wantedStars > 0 ? Math.min(100, Math.round((this.wantedEvadeTimer / evadeTotal) * 100)) : 0,
      bustedProgress: Math.min(100, Math.round((this.bustedTimer / 3.0) * 100)),
      weapon: this.activeWeapon,
      ownedWeapons: { ...this.ownedWeapons },
      magAmmo: { ...this.magAmmo },
      ammo: { ...this.ammo },
      reloading: this.reloading,
      reloadProgress:
        this.reloading && this.reloadDuration > 0
          ? Math.min(100, Math.round(((this.reloadDuration - this.reloadTimer) / this.reloadDuration) * 100))
          : 0,
      isAiming: this.isAiming,
      nearWeaponShop: this.nearWeaponShop,
      nearClothingShop: this.nearClothingShop,
      nearBarberShop: this.nearBarberShop,
      appearance: { ...this.appearance },
      ownedOutfits: { ...this.ownedOutfits },
      ownedHairStyles: { ...this.ownedHairStyles },
      ownedHairColors: { ...this.ownedHairColors },
      ownedBeardStyles: { ...this.ownedBeardStyles },
      inVehicle: Boolean(this.currentVehicle),
      vehicleName: this.currentVehicle ? this.currentVehicle.label : '',
      vehicleHp: this.currentVehicle
        ? Math.ceil((this.currentVehicle.hp / this.currentVehicle.maxHp) * 100)
        : 0,
      vehicleSpeedKmh: this.currentVehicle ? Math.round(Math.abs(this.currentVehicle.speed) * 4.2) : 0,
      nitro: Math.round(this.nitro),
      mission: { ...this.mission },
      promptText: this.promptText,
      toastText: this.toastText,
      toastTone: this.toastTone,
      scoreStats: { ...this.stats },
      pointerLocked: this.pointerLocked,
      muted: this.audio.isMuted(),
      cameraModeLabel: this.getCameraModeLabel(),
      radarZoom: this.radarZoom,
      weather: this.weather,
      weatherLabel: t.weather[this.weather],
      mouseSensitivity: this.mouseSensitivity,
      gamepadConnected: this.dualsense.state.connected,
      gamepadName: this.dualsense.state.name,
      hapticsEnabled: this.hapticsEnabled,
      onlineStatus: this.onlineStatus,
      onlineRoom: this.onlineRoom,
      onlinePlayers,
      onlineChat: this.onlineChat,
      shopDistanceMeters,
      clothingDistanceMeters,
      barberDistanceMeters,
      missionHubDistanceMeters,
      missionBanner: this.missionBanner ? { ...this.missionBanner } : null,
    });
  }

  private updateWeather(dt: number): void {
    if (this.phase === 'playing') {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        const idx = WEATHER_ORDER.indexOf(this.weather);
        this.weather = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
        this.weatherTimer = this.weather === 'sunny' ? 85 : 65;
        this.showToast(getTranslations(this.language).engine.weatherToasts[this.weather], 'mission');
      }
    }

    const targetRain = this.weather === 'rainy' ? 1 : 0;
    const targetFog = this.weather === 'foggy' ? 1 : 0;
    this.rainBlend = THREE.MathUtils.damp(this.rainBlend, targetRain, 0.85, dt);
    this.fogBlend = THREE.MathUtils.damp(this.fogBlend, targetFog, 0.85, dt);

    const rb = this.rainBlend;
    const fb = this.fogBlend;
    const clearW = Math.max(0, 1 - rb - fb);
    const wSum = clearW + rb + fb || 1;
    const cw = clearW / wSum;
    const rw = rb / wSum;
    const fw = fb / wSum;

    // Interpolate Sky Dome colors & overcast state
    _skyTop.setRGB(
      SUNNY_TOP.r * cw + RAINY_TOP.r * rw + FOGGY_TOP.r * fw,
      SUNNY_TOP.g * cw + RAINY_TOP.g * rw + FOGGY_TOP.g * fw,
      SUNNY_TOP.b * cw + RAINY_TOP.b * rw + FOGGY_TOP.b * fw,
    );
    _skyMid.setRGB(
      SUNNY_MID.r * cw + RAINY_MID.r * rw + FOGGY_MID.r * fw,
      SUNNY_MID.g * cw + RAINY_MID.g * rw + FOGGY_MID.g * fw,
      SUNNY_MID.b * cw + RAINY_MID.b * rw + FOGGY_MID.b * fw,
    );
    _skyHorizon.setRGB(
      SUNNY_HORIZON.r * cw + RAINY_HORIZON.r * rw + FOGGY_HORIZON.r * fw,
      SUNNY_HORIZON.g * cw + RAINY_HORIZON.g * rw + FOGGY_HORIZON.g * fw,
      SUNNY_HORIZON.b * cw + RAINY_HORIZON.b * rw + FOGGY_HORIZON.b * fw,
    );
    this.skyMat.uniforms.topColor.value.copy(_skyTop);
    this.skyMat.uniforms.midColor.value.copy(_skyMid);
    this.skyMat.uniforms.horizonColor.value.copy(_skyHorizon);
    this.skyMat.uniforms.uOvercast.value = THREE.MathUtils.clamp(rw * 0.92 + fw * 0.78, 0, 1);
    this.skyMat.uniforms.uFogBlend.value = fw;

    // Interpolate Scene Fog & Background
    _fogCol.setRGB(
      SUNNY_FOG.r * cw + RAINY_FOG.r * rw + FOGGY_FOG.r * fw,
      SUNNY_FOG.g * cw + RAINY_FOG.g * rw + FOGGY_FOG.g * fw,
      SUNNY_FOG.b * cw + RAINY_FOG.b * rw + FOGGY_FOG.b * fw,
    );
    const fogExp = this.scene.fog as THREE.FogExp2;
    fogExp.color.copy(_fogCol);
    fogExp.density = 0.0028 * cw + 0.0066 * rw + 0.0145 * fw;
    (this.scene.background as THREE.Color).copy(_fogCol);

    // Interpolate Sunlight, Hemisphere & Rim Light
    _dirCol.setRGB(
      SUNNY_DIR.r * cw + RAINY_DIR.r * rw + FOGGY_DIR.r * fw,
      SUNNY_DIR.g * cw + RAINY_DIR.g * rw + FOGGY_DIR.g * fw,
      SUNNY_DIR.b * cw + RAINY_DIR.b * rw + FOGGY_DIR.b * fw,
    );
    this.dirLight.color.copy(_dirCol);
    this.dirLight.intensity = 2.1 * cw + 1.06 * rw + 0.96 * fw;

    _hemiSkyCol.setRGB(
      SUNNY_HEMI_SKY.r * cw + RAINY_HEMI_SKY.r * rw + FOGGY_HEMI_SKY.r * fw,
      SUNNY_HEMI_SKY.g * cw + RAINY_HEMI_SKY.g * rw + FOGGY_HEMI_SKY.g * fw,
      SUNNY_HEMI_SKY.b * cw + RAINY_HEMI_SKY.b * rw + FOGGY_HEMI_SKY.b * fw,
    );
    _hemiGroundCol.setRGB(
      SUNNY_HEMI_GND.r * cw + RAINY_HEMI_GND.r * rw + FOGGY_HEMI_GND.r * fw,
      SUNNY_HEMI_GND.g * cw + RAINY_HEMI_GND.g * rw + FOGGY_HEMI_GND.g * fw,
      SUNNY_HEMI_GND.b * cw + RAINY_HEMI_GND.b * rw + FOGGY_HEMI_GND.b * fw,
    );
    this.hemiLight.color.copy(_hemiSkyCol);
    this.hemiLight.groundColor.copy(_hemiGroundCol);
    this.hemiLight.intensity = 0.76 * cw + 0.84 * rw + 0.9 * fw;
    this.rimLight.intensity = 0.56 * cw + 0.34 * rw + 0.26 * fw;
    this.renderer.toneMappingExposure = 1.08 * cw + 0.98 * rw + 0.95 * fw;

    // Wet Asphalt sheen during rain & slight dampness during fog
    const wetAmount = Math.max(rw, fw * 0.25);
    const roadRough = THREE.MathUtils.lerp(0.88, 0.22, wetAmount);
    const roadMetal = THREE.MathUtils.lerp(0.08, 0.32, wetAmount);
    for (const rMat of this.city.roadMaterials) {
      rMat.roughness = roadRough;
      rMat.metalness = roadMetal;
    }

    // Update 3D Rain Streak Particles around active camera/player
    const rainActive = rb > 0.025;
    this.rainLines.visible = rainActive;
    if (rainActive) {
      (this.rainLines.material as THREE.LineBasicMaterial).opacity = rb * 0.48;
      const cx = this.phase === 'title' ? this.camera.position.x : (this.currentVehicle ? this.currentVehicle.x : this.playerX);
      const cy = this.phase === 'title' ? 14 : (this.currentVehicle ? this.currentVehicle.y : this.playerY);
      const cz = this.phase === 'title' ? this.camera.position.z : (this.currentVehicle ? this.currentVehicle.z : this.playerZ);

      const posAttr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const offs = this.rainOffsets;
      const count = offs.length / 3;
      const fallY = 38 * dt;
      const windX = 3.8 * dt;
      const windZ = 1.4 * dt;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        let ox = offs[i3] + windX;
        let oy = offs[i3 + 1] - fallY;
        let oz = offs[i3 + 2] + windZ;

        if (oy < -2) oy += 34;
        if (ox > 38) ox -= 76;
        else if (ox < -38) ox += 76;
        if (oz > 38) oz -= 76;
        else if (oz < -38) oz += 76;

        offs[i3] = ox;
        offs[i3 + 1] = oy;
        offs[i3 + 2] = oz;

        const wx = cx + ox;
        const wy = cy + oy;
        const wz = cz + oz;
        const idx = i * 6;
        arr[idx] = wx;
        arr[idx + 1] = wy;
        arr[idx + 2] = wz;
        arr[idx + 3] = wx - 0.13;
        arr[idx + 4] = wy + 1.25;
        arr[idx + 5] = wz - 0.05;
      }
      posAttr.needsUpdate = true;

      // Occasional tiny raindrop splash ripples near player on ground
      if (this.phase === 'playing' && Math.random() < 0.35 * rb) {
        const sx = cx + (Math.random() - 0.5) * 26;
        const sz = cz + (Math.random() - 0.5) * 26;
        const sy = this.getGroundHeight(sx, sz) + 0.06;
        this.spawnParticles(sx, sy, sz, 1, 0xcbe8ff, 1.2, 0.18);
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.onlineDesired = false;
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.clearRemotePlayers();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.composer?.dispose();

    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.onMouseDownBound);
    dom.removeEventListener('wheel', this.onWheelBound);
    dom.removeEventListener('contextmenu', this.onContextMenuBound);
    dom.removeEventListener('touchstart', this.onTouchStartBound);
    dom.removeEventListener('touchmove', this.onTouchMoveBound);
    dom.removeEventListener('touchend', this.onTouchEndBound);
    dom.removeEventListener('touchcancel', this.onTouchEndBound);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.LineSegments).isLineSegments) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });

    this.bulletHoleGeo.dispose();
    this.bulletMetalMat?.dispose();
    this.bulletGlassMat?.dispose();
    this.textures.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
