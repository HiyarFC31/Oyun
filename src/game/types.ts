export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'shop'
  | 'clothing'
  | 'barber'
  | 'map'
  | 'wasted'
  | 'busted';

export type LanguageCode = 'tr' | 'en' | 'de' | 'ru' | 'it';

export type OutfitId = 'biker' | 'miami' | 'tuxedo' | 'street' | 'tactical' | 'gold';
export type HairStyleId = 'pompadour' | 'buzz' | 'fade' | 'slick' | 'afro' | 'bald';
export type HairColorId = 'black' | 'brown' | 'blonde' | 'red' | 'silver' | 'neon';
export type BeardStyleId = 'stubble' | 'clean' | 'goatee' | 'full';

export interface PlayerAppearance {
  outfit: OutfitId;
  sunglasses: boolean;
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  beardStyle: BeardStyleId;
}

export interface OutfitSpec {
  id: OutfitId;
  price: number;
  jacketColor: number;
  teeColor: number;
  pantsColor: number;
  shoeColor: number;
  soleColor: number;
  leather: boolean;
}

export const OUTFIT_IDS: OutfitId[] = ['biker', 'miami', 'tuxedo', 'street', 'tactical', 'gold'];

export const OUTFIT_SPECS: Record<OutfitId, OutfitSpec> = {
  biker: {
    id: 'biker',
    price: 0,
    jacketColor: 0x1b202c,
    teeColor: 0x0ea5c6,
    pantsColor: 0x222b3e,
    shoeColor: 0x1e2028,
    soleColor: 0xe9ecef,
    leather: true,
  },
  miami: {
    id: 'miami',
    price: 180,
    jacketColor: 0xf1f5f9,
    teeColor: 0xff4d6d,
    pantsColor: 0xd6c7b2,
    shoeColor: 0xffffff,
    soleColor: 0xdbe2ea,
    leather: false,
  },
  tuxedo: {
    id: 'tuxedo',
    price: 420,
    jacketColor: 0x111318,
    teeColor: 0xf8fafc,
    pantsColor: 0x14171f,
    shoeColor: 0x0d0e12,
    soleColor: 0x1a1d24,
    leather: false,
  },
  street: {
    id: 'street',
    price: 260,
    jacketColor: 0x6d28d9,
    teeColor: 0xffbe0b,
    pantsColor: 0x1e2430,
    shoeColor: 0xe63946,
    soleColor: 0xf8fafc,
    leather: false,
  },
  tactical: {
    id: 'tactical',
    price: 380,
    jacketColor: 0x3b4d36,
    teeColor: 0x16181c,
    pantsColor: 0x2b3029,
    shoeColor: 0x18181b,
    soleColor: 0x27272a,
    leather: true,
  },
  gold: {
    id: 'gold',
    price: 750,
    jacketColor: 0x7c1d32,
    teeColor: 0x121318,
    pantsColor: 0x1f2229,
    shoeColor: 0xf8fafc,
    soleColor: 0xffbe0b,
    leather: true,
  },
};

export interface HairStyleSpec {
  id: HairStyleId;
  price: number;
}

export const HAIR_STYLE_IDS: HairStyleId[] = ['pompadour', 'buzz', 'fade', 'slick', 'afro', 'bald'];

export const HAIR_STYLE_SPECS: Record<HairStyleId, HairStyleSpec> = {
  pompadour: { id: 'pompadour', price: 0 },
  buzz: { id: 'buzz', price: 45 },
  fade: { id: 'fade', price: 75 },
  slick: { id: 'slick', price: 90 },
  afro: { id: 'afro', price: 110 },
  bald: { id: 'bald', price: 30 },
};

export interface HairColorSpec {
  id: HairColorId;
  hex: number;
  css: string;
  price: number;
}

export const HAIR_COLOR_IDS: HairColorId[] = ['black', 'brown', 'blonde', 'red', 'silver', 'neon'];

export const HAIR_COLOR_SPECS: Record<HairColorId, HairColorSpec> = {
  black: { id: 'black', hex: 0x1a1412, css: '#1a1412', price: 0 },
  brown: { id: 'brown', hex: 0x523422, css: '#523422', price: 40 },
  blonde: { id: 'blonde', hex: 0xd6a853, css: '#d6a853', price: 65 },
  red: { id: 'red', hex: 0x9e3622, css: '#9e3622', price: 65 },
  silver: { id: 'silver', hex: 0xcbd5e1, css: '#cbd5e1', price: 85 },
  neon: { id: 'neon', hex: 0x00f5d4, css: '#00f5d4', price: 120 },
};

export interface BeardStyleSpec {
  id: BeardStyleId;
  price: number;
}

export const BEARD_STYLE_IDS: BeardStyleId[] = ['stubble', 'clean', 'goatee', 'full'];

export const BEARD_STYLE_SPECS: Record<BeardStyleId, BeardStyleSpec> = {
  stubble: { id: 'stubble', price: 0 },
  clean: { id: 'clean', price: 25 },
  goatee: { id: 'goatee', price: 55 },
  full: { id: 'full', price: 80 },
};

export type WeaponId = 'unarmed' | 'knife' | 'pistol' | 'smg' | 'shotgun' | 'rifle';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  shortName: string;
  fireRate: number; // shots per second
  damage: number;
  pellets: number;
  spread: number;
  range: number;
  magSize: number; // 0 for unarmed
  maxAmmo: number; // max reserve ammo
  reloadTime: number; // seconds
  price: number;
  ammoPrice: number;
  ammoPack: number;
  color: number;
}

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  unarmed: {
    id: 'unarmed',
    name: 'Silahsız (Yumruk)',
    shortName: 'Yumruk',
    fireRate: 2.2,
    damage: 24,
    pellets: 1,
    spread: 0,
    range: 2.8,
    magSize: 0,
    maxAmmo: 0,
    reloadTime: 0,
    price: 0,
    ammoPrice: 0,
    ammoPack: 0,
    color: 0xffffff,
  },
  knife: {
    id: 'knife',
    name: 'Komando Bıçağı',
    shortName: 'Bıçak',
    fireRate: 2.8,
    damage: 45,
    pellets: 1,
    spread: 0,
    range: 2.9,
    magSize: 0,
    maxAmmo: 0,
    reloadTime: 0,
    price: 90,
    ammoPrice: 0,
    ammoPack: 0,
    color: 0xe2e8f0,
  },
  pistol: {
    id: 'pistol',
    name: '9mm Tabanca',
    shortName: 'Tabanca',
    fireRate: 3.6,
    damage: 36,
    pellets: 1,
    spread: 0.012,
    range: 80,
    magSize: 12,
    maxAmmo: 120,
    reloadTime: 1.05,
    price: 150,
    ammoPrice: 60,
    ammoPack: 36,
    color: 0xffd166,
  },
  smg: {
    id: 'smg',
    name: 'MP-7 Makineli',
    shortName: 'MP-7',
    fireRate: 10.8,
    damage: 23,
    pellets: 1,
    spread: 0.042,
    range: 70,
    magSize: 30,
    maxAmmo: 240,
    reloadTime: 1.35,
    price: 450,
    ammoPrice: 110,
    ammoPack: 60,
    color: 0x6ef3d6,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Pompalı Tüfek',
    shortName: 'Pompalı',
    fireRate: 1.3,
    damage: 27,
    pellets: 6,
    spread: 0.1,
    range: 42,
    magSize: 8,
    maxAmmo: 64,
    reloadTime: 1.55,
    price: 650,
    ammoPrice: 130,
    ammoPack: 16,
    color: 0xff6b6b,
  },
  rifle: {
    id: 'rifle',
    name: 'M4 Taktik Tüfek',
    shortName: 'M4',
    fireRate: 7.8,
    damage: 34,
    pellets: 1,
    spread: 0.018,
    range: 96,
    magSize: 30,
    maxAmmo: 240,
    reloadTime: 1.45,
    price: 1200,
    ammoPrice: 160,
    ammoPack: 60,
    color: 0x70d6ff,
  },
};

export type EquippableWeaponId = Exclude<WeaponId, 'unarmed'>;
export const FIREARM_IDS: ('pistol' | 'smg' | 'shotgun' | 'rifle')[] = ['pistol', 'smg', 'shotgun', 'rifle'];
export const SHOP_WEAPON_IDS: EquippableWeaponId[] = ['knife', 'pistol', 'smg', 'shotgun', 'rifle'];

export type VehicleType = 'sports' | 'muscle' | 'taxi' | 'police' | 'suv';

export type WeatherType = 'sunny' | 'rainy' | 'foggy';

export type MissionType = 'delivery' | 'hijack' | 'gang' | 'convoy' | 'sabotage' | 'heist' | 'race' | 'none';

export interface MissionSnapshot {
  active: boolean;
  index: number; // 1..6
  totalMissions: number;
  type: MissionType;
  title: string;
  contactName?: string;
  stageLabel?: string;
  objective: string;
  timeLeft: number;
  reward: number;
  distanceMeters?: number;
  progressText?: string;
}

export type OnlineStatus = 'offline' | 'connecting' | 'connected' | 'error';

export interface OnlinePlayerInfo {
  id: string;
  name: string;
  color: number;
  inVehicle: boolean;
  wantedStars: number;
}

export interface OnlineChatMessage {
  id: string;
  name: string;
  color: number;
  text: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  language: LanguageCode;
  playerName: string;
  health: number;
  maxHealth: number;
  armor: number;
  cash: number;
  wantedStars: number;
  wantedHeat: number; // 0..100 toward next star
  wantedEvading: boolean;
  wantedEvadeProgress: number; // 0..100
  bustedProgress: number; // 0..100
  weapon: WeaponId;
  ownedWeapons: Record<WeaponId, boolean>;
  magAmmo: Record<WeaponId, number>;
  ammo: Record<WeaponId, number>;
  reloading: boolean;
  reloadProgress: number;
  isAiming: boolean;
  nearWeaponShop: boolean;
  nearClothingShop: boolean;
  nearBarberShop: boolean;
  appearance: PlayerAppearance;
  ownedOutfits: Record<OutfitId, boolean>;
  ownedHairStyles: Record<HairStyleId, boolean>;
  ownedHairColors: Record<HairColorId, boolean>;
  ownedBeardStyles: Record<BeardStyleId, boolean>;
  inVehicle: boolean;
  vehicleName: string;
  vehicleHp: number;
  vehicleSpeedKmh: number;
  nitro: number;
  mission: MissionSnapshot;
  promptText: string;
  toastText: string;
  toastTone: 'cash' | 'wanted' | 'mission' | 'stunt';
  scoreStats: {
    missionsCompleted: number;
    vehiclesHijacked: number;
    stuntCash: number;
  };
  pointerLocked: boolean;
  muted: boolean;
  cameraModeLabel: string;
  radarZoom: 'near' | 'wide';
  weather: WeatherType;
  weatherLabel: string;
  mouseSensitivity: number;
  gamepadConnected: boolean;
  gamepadName: string;
  hapticsEnabled: boolean;
  onlineStatus: OnlineStatus;
  onlineRoom: string;
  onlinePlayers: OnlinePlayerInfo[];
  onlineChat: OnlineChatMessage[];
  shopDistanceMeters: number;
  clothingDistanceMeters: number;
  barberDistanceMeters: number;
  missionHubDistanceMeters: number;
  missionBanner: {
    title: string;
    subtitle: string;
    tone: 'passed' | 'failed' | 'brief';
  } | null;
}

export interface AABBCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  label?: string;
}

export interface RampCollider {
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  dirX: number; // unit direction pointing up the ramp
  dirZ: number;
}
