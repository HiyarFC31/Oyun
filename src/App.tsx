import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarberShopModal } from './components/BarberShopModal';
import { CityMapModal } from './components/CityMapModal';
import { ClothingShopModal } from './components/ClothingShopModal';
import { GameHud } from './components/GameHud';
import { GameModals } from './components/GameModals';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { WeaponShopModal } from './components/WeaponShopModal';
import { GtaGameEngine } from './game/engine';
import { getTranslations, loadSavedLanguage } from './game/i18n';
import type { FirearmId } from './game/models';
import type {
  BeardStyleId,
  EquippableWeaponId,
  HairColorId,
  HairStyleId,
  HudSnapshot,
  LanguageCode,
  OutfitId,
  WeaponId,
  WeatherType,
} from './game/types';

const INITIAL_LANG = loadSavedLanguage();
const INITIAL_T = getTranslations(INITIAL_LANG);

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  language: INITIAL_LANG,
  playerName: 'Frank',
  health: 100,
  maxHealth: 100,
  armor: 50,
  cash: 250,
  wantedStars: 0,
  wantedHeat: 0,
  wantedEvading: false,
  wantedEvadeProgress: 0,
  bustedProgress: 0,
  weapon: 'pistol',
  ownedWeapons: { unarmed: true, knife: false, pistol: true, smg: false, shotgun: false, rifle: false },
  magAmmo: { unarmed: 0, knife: 0, pistol: 12, smg: 0, shotgun: 0, rifle: 0 },
  ammo: { unarmed: 0, knife: 0, pistol: 60, smg: 0, shotgun: 0, rifle: 0 },
  reloading: false,
  reloadProgress: 0,
  isAiming: false,
  nearWeaponShop: false,
  nearClothingShop: false,
  nearBarberShop: false,
  appearance: {
    outfit: 'biker',
    sunglasses: true,
    hairStyle: 'pompadour',
    hairColor: 'black',
    beardStyle: 'stubble',
  },
  ownedOutfits: { biker: true, miami: false, tuxedo: false, street: false, tactical: false, gold: false },
  ownedHairStyles: { pompadour: true, buzz: false, fade: false, slick: false, afro: false, bald: false },
  ownedHairColors: { black: true, brown: false, blonde: false, red: false, silver: false, neon: false },
  ownedBeardStyles: { stubble: true, clean: false, goatee: false, full: false },
  inVehicle: false,
  vehicleName: '',
  vehicleHp: 100,
  vehicleSpeedKmh: 0,
  nitro: 100,
  mission: {
    active: false,
    index: 0,
    totalMissions: 6,
    type: 'none',
    title: INITIAL_T.hud.freeRoamTitle,
    objective: INITIAL_T.hud.freeRoamObjective,
    timeLeft: 0,
    reward: 0,
  },
  promptText: '',
  toastText: '',
  toastTone: 'cash',
  scoreStats: {
    missionsCompleted: 0,
    vehiclesHijacked: 0,
    stuntCash: 0,
  },
  pointerLocked: false,
  muted: false,
  cameraModeLabel: INITIAL_T.cameraModes[0],
  radarZoom: 'near',
  weather: 'sunny',
  weatherLabel: INITIAL_T.weather.sunny,
  mouseSensitivity: 1.0,
  gamepadConnected: false,
  gamepadName: 'DualSense',
  hapticsEnabled: true,
  onlineStatus: 'offline',
  onlineRoom: 'solaris-1',
  onlinePlayers: [],
  onlineChat: [],
  shopDistanceMeters: 36,
  clothingDistanceMeters: 74,
  barberDistanceMeters: 32,
  missionHubDistanceMeters: 37,
  missionBanner: null,
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches ||
    window.innerWidth <= 1024
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const fullMapRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GtaGameEngine | null>(null);
  const resumeOnSettingsCloseRef = useRef(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [touchEnabled, setTouchEnabled] = useState<boolean>(() => detectTouchDevice());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new GtaGameEngine(container, setHud, minimapRef.current);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Automatically enable touch controls if user touches screen on a hybrid tablet/laptop
  useEffect(() => {
    const onFirstTouch = () => {
      setTouchEnabled(true);
    };
    window.addEventListener('touchstart', onFirstTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onFirstTouch);
  }, []);

  useEffect(() => {
    engineRef.current?.setMinimapCanvas(minimapRef.current);
    engineRef.current?.setFullMapCanvas(fullMapRef.current);
  }, [hud.phase, touchEnabled]);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleToggleTouch = useCallback(() => {
    setTouchEnabled((prev) => !prev);
  }, []);

  const handleSelectWeapon = useCallback((id: WeaponId) => {
    engineRef.current?.selectWeapon(id);
  }, []);

  const handleReload = useCallback(() => {
    engineRef.current?.reloadWeapon();
  }, []);

  const handleToggleHolster = useCallback(() => {
    engineRef.current?.toggleHolster();
  }, []);

  const handleDropWeapon = useCallback(() => {
    engineRef.current?.dropCurrentWeapon();
  }, []);

  const handleOpenShop = useCallback(() => {
    engineRef.current?.openWeaponShop();
  }, []);

  const handleCloseShop = useCallback(() => {
    engineRef.current?.closeWeaponShop();
  }, []);

  const handleBuyWeapon = useCallback((id: EquippableWeaponId) => {
    engineRef.current?.buyWeapon(id);
  }, []);

  const handleBuyAmmo = useCallback((id: FirearmId) => {
    engineRef.current?.buyAmmo(id);
  }, []);

  const handleBuyGear = useCallback((kind: 'armor' | 'health') => {
    engineRef.current?.buyGear(kind);
  }, []);

  const handleOpenClothingShop = useCallback(() => {
    engineRef.current?.openClothingShop();
  }, []);

  const handleCloseClothingShop = useCallback(() => {
    engineRef.current?.closeClothingShop();
  }, []);

  const handleSelectOutfit = useCallback((id: OutfitId) => {
    engineRef.current?.buyOrEquipOutfit(id);
  }, []);

  const handleToggleSunglasses = useCallback(() => {
    engineRef.current?.toggleSunglasses();
  }, []);

  const handleOpenBarberShop = useCallback(() => {
    engineRef.current?.openBarberShop();
  }, []);

  const handleCloseBarberShop = useCallback(() => {
    engineRef.current?.closeBarberShop();
  }, []);

  const handleSelectHairStyle = useCallback((id: HairStyleId) => {
    engineRef.current?.buyOrEquipHairStyle(id);
  }, []);

  const handleSelectHairColor = useCallback((id: HairColorId) => {
    engineRef.current?.buyOrEquipHairColor(id);
  }, []);

  const handleSelectBeardStyle = useCallback((id: BeardStyleId) => {
    engineRef.current?.buyOrEquipBeardStyle(id);
  }, []);

  const handleStartMission = useCallback(() => {
    engineRef.current?.triggerStartMission();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCameraMode();
  }, []);

  const handleCycleWeather = useCallback(() => {
    engineRef.current?.cycleWeather();
  }, []);

  const handleOpenMap = useCallback(() => {
    engineRef.current?.openMap();
  }, []);

  const handleCloseMap = useCallback(() => {
    engineRef.current?.closeMap();
  }, []);

  const handleToggleRadarZoom = useCallback(() => {
    engineRef.current?.toggleRadarZoom();
  }, []);

  const handleOpenSettings = useCallback(() => {
    const isPlaying = hud.phase === 'playing';
    resumeOnSettingsCloseRef.current = isPlaying;
    if (isPlaying) {
      engineRef.current?.pauseGame();
    }
    setSettingsOpen(true);
  }, [hud.phase]);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
    if (resumeOnSettingsCloseRef.current) {
      resumeOnSettingsCloseRef.current = false;
      engineRef.current?.resumeGame();
    }
  }, []);

  const handleChangeName = useCallback((name: string) => {
    engineRef.current?.setPlayerName(name);
  }, []);

  const handleChangeLanguage = useCallback((lang: LanguageCode) => {
    engineRef.current?.setLanguage(lang);
  }, []);

  const handleChangeSensitivity = useCallback((val: number) => {
    engineRef.current?.setMouseSensitivity(val);
  }, []);

  const handleSelectCamera = useCallback((mode: 0 | 1 | 2) => {
    engineRef.current?.setCameraModePreset(mode);
  }, []);

  const handleSelectWeather = useCallback((weather: WeatherType) => {
    engineRef.current?.setWeather(weather);
  }, []);

  const handleToggleHaptics = useCallback(() => {
    engineRef.current?.toggleHaptics();
  }, []);

  const handleStartOnline = useCallback(() => {
    setSettingsOpen(false);
    resumeOnSettingsCloseRef.current = false;
    engineRef.current?.connectOnline(hud.onlineRoom, hud.playerName);
  }, [hud.onlineRoom, hud.playerName]);

  const handleConnectOnline = useCallback((room: string, name: string) => {
    setSettingsOpen(false);
    resumeOnSettingsCloseRef.current = false;
    engineRef.current?.connectOnline(room, name);
  }, []);

  const handleDisconnectOnline = useCallback(() => {
    engineRef.current?.disconnectOnline();
  }, []);

  const handleSendChat = useCallback((text: string) => {
    engineRef.current?.sendOnlineChat(text);
  }, []);

  const touchActions = useMemo(
    () => ({
      onMove: (x: number, y: number) => engineRef.current?.setVirtualMove(x, y),
      onFire: (active: boolean) => engineRef.current?.setVirtualFire(active),
      onAim: (active: boolean) => engineRef.current?.setVirtualAim(active),
      onSprint: (active: boolean) => engineRef.current?.setVirtualSprint(active),
      onBrake: (active: boolean) => engineRef.current?.setVirtualBrake(active),
      onGas: (active: boolean) => engineRef.current?.setVirtualGas(active),
      onReverse: (active: boolean) => engineRef.current?.setVirtualReverse(active),
      onJump: () => engineRef.current?.triggerJump(),
      onEnterExitVehicle: () => engineRef.current?.triggerEnterExitVehicle(),
      onHorn: () => engineRef.current?.triggerHorn(),
      onCycleWeapon: () => engineRef.current?.cycleWeapon(),
      onReload: () => engineRef.current?.reloadWeapon(),
      onToggleHolster: () => engineRef.current?.toggleHolster(),
      onDropWeapon: () => engineRef.current?.dropCurrentWeapon(),
      onOpenShop: () => engineRef.current?.openWeaponShop(),
      onOpenClothingShop: () => engineRef.current?.openClothingShop(),
      onOpenBarberShop: () => engineRef.current?.openBarberShop(),
    }),
    [],
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#120d1d]">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          language={hud.language}
          onStart={handleStart}
          onStartOnline={handleStartOnline}
          onOpenSettings={handleOpenSettings}
          muted={hud.muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {hud.phase !== 'title' && (
        <GameHud
          hud={hud}
          minimapRef={minimapRef}
          touchEnabled={touchEnabled}
          onToggleTouch={handleToggleTouch}
          onPause={handlePause}
          onOpenSettings={handleOpenSettings}
          onToggleMute={handleToggleMute}
          onSelectWeapon={handleSelectWeapon}
          onReload={handleReload}
          onToggleHolster={handleToggleHolster}
          onDropWeapon={handleDropWeapon}
          onOpenShop={handleOpenShop}
          onOpenClothingShop={handleOpenClothingShop}
          onOpenBarberShop={handleOpenBarberShop}
          onStartMission={handleStartMission}
          onCycleCamera={handleCycleCamera}
          onCycleWeather={handleCycleWeather}
          onOpenMap={handleOpenMap}
          onToggleRadarZoom={handleToggleRadarZoom}
          onSendChat={handleSendChat}
          touchActions={touchActions}
        />
      )}

      <CityMapModal hud={hud} fullMapRef={fullMapRef} onClose={handleCloseMap} />

      <WeaponShopModal
        hud={hud}
        onBuyWeapon={handleBuyWeapon}
        onBuyAmmo={handleBuyAmmo}
        onBuyGear={handleBuyGear}
        onClose={handleCloseShop}
      />

      <ClothingShopModal
        hud={hud}
        onSelectOutfit={handleSelectOutfit}
        onToggleSunglasses={handleToggleSunglasses}
        onClose={handleCloseClothingShop}
      />

      <BarberShopModal
        hud={hud}
        onSelectHairStyle={handleSelectHairStyle}
        onSelectHairColor={handleSelectHairColor}
        onSelectBeardStyle={handleSelectBeardStyle}
        onClose={handleCloseBarberShop}
      />

      <GameModals
        hud={hud}
        onResume={handleResume}
        onRestart={handleRestart}
        onOpenSettings={handleOpenSettings}
      />

      <SettingsModal
        open={settingsOpen}
        hud={hud}
        touchEnabled={touchEnabled}
        onClose={handleCloseSettings}
        onChangeName={handleChangeName}
        onChangeLanguage={handleChangeLanguage}
        onChangeSensitivity={handleChangeSensitivity}
        onToggleMute={handleToggleMute}
        onToggleTouch={handleToggleTouch}
        onToggleHaptics={handleToggleHaptics}
        onSelectCamera={handleSelectCamera}
        onSelectWeather={handleSelectWeather}
        onConnectOnline={handleConnectOnline}
        onDisconnectOnline={handleDisconnectOnline}
      />

      <OfflineIndicator language={hud.language} />
    </div>
  );
}
