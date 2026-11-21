import React, { useState } from 'react';
import {
  Pause,
  Shield,
  Heart,
  Volume2,
  VolumeX,
  Crosshair,
  Gauge,
  Gamepad2,
  Camera,
  ShoppingBag,
  RotateCw,
  Hand,
  ArrowDownToLine,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sun,
  CloudRain,
  CloudFog,
  Sword,
  Settings,
  Shirt,
  Scissors,
  Globe,
  MessageSquare,
  Send,
  ChevronDown,
} from 'lucide-react';
import { getNumberLocale, getTranslations } from '../game/i18n';
import { type HudSnapshot, SHOP_WEAPON_IDS, type WeaponId } from '../game/types';
import { TouchControls } from './TouchControls';

interface GameHudProps {
  hud: HudSnapshot;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  touchEnabled: boolean;
  onToggleTouch: () => void;
  onPause: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onReload: () => void;
  onToggleHolster: () => void;
  onDropWeapon: () => void;
  onOpenShop: () => void;
  onOpenClothingShop: () => void;
  onOpenBarberShop: () => void;
  onStartMission: () => void;
  onCycleCamera: () => void;
  onCycleWeather: () => void;
  onOpenMap: () => void;
  onToggleRadarZoom: () => void;
  onSendChat: (text: string) => void;
  touchActions: {
    onMove: (x: number, y: number) => void;
    onFire: (active: boolean) => void;
    onAim: (active: boolean) => void;
    onSprint: (active: boolean) => void;
    onBrake: (active: boolean) => void;
    onGas: (active: boolean) => void;
    onReverse: (active: boolean) => void;
    onJump: () => void;
    onEnterExitVehicle: () => void;
    onHorn: () => void;
    onCycleWeapon: () => void;
    onReload: () => void;
    onToggleHolster: () => void;
    onDropWeapon: () => void;
    onOpenShop: () => void;
    onOpenClothingShop: () => void;
    onOpenBarberShop: () => void;
  };
}

const WEAPON_SLOTS: WeaponId[] = ['unarmed', ...SHOP_WEAPON_IDS];

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  minimapRef,
  touchEnabled,
  onToggleTouch,
  onPause,
  onOpenSettings,
  onToggleMute,
  onSelectWeapon,
  onReload,
  onToggleHolster,
  onDropWeapon,
  onOpenShop,
  onOpenClothingShop,
  onOpenBarberShop,
  onStartMission,
  onCycleCamera,
  onCycleWeather,
  onOpenMap,
  onToggleRadarZoom,
  onSendChat,
  touchActions,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const t = getTranslations(hud.language);
  const locale = getNumberLocale(hud.language);
  const isMeleeWeapon = hud.weapon === 'unarmed' || hud.weapon === 'knife';
  const magRounds = hud.magAmmo[hud.weapon];
  const reserveRounds = hud.ammo[hud.weapon];

  const missionDist =
    hud.mission.active && typeof hud.mission.distanceMeters === 'number'
      ? hud.mission.distanceMeters
      : hud.missionHubDistanceMeters;

  const minimapElement = (
    <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenMap}
          title={t.hud.openFullMap}
          aria-label={t.hud.openFullMap}
          className="relative p-1 rounded-full bg-[#141022]/92 border-2 border-[#ff9f1c]/65 hover:border-[#ffbe0b] shadow-xl cursor-pointer transition-colors"
        >
          <canvas
            ref={minimapRef}
            width={164}
            height={164}
            className={`block rounded-full ${
              touchEnabled ? 'w-[92px] h-[92px] sm:w-[116px] sm:h-[116px]' : 'w-[144px] h-[144px] md:w-[164px] md:h-[164px]'
            }`}
          />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#141022] border border-white/20 text-[9px] font-mono-num text-white/85">
            {hud.radarZoom === 'near' ? t.hud.radarLabel : t.hud.wideLabel}
          </span>
        </button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onOpenMap}
            title={t.hud.openFullMap}
            aria-label={t.hud.openFullMap}
            className="p-1.5 rounded-lg bg-[#141022]/90 border border-white/15 text-white/85 hover:text-white hover:border-[#ffbe0b]/60 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#ffbe0b]" />
          </button>
          <button
            type="button"
            onClick={onToggleRadarZoom}
            title={t.hud.zoomRadar}
            aria-label={t.hud.zoomRadar}
            className="p-1.5 rounded-lg bg-[#141022]/90 border border-white/15 text-white/85 hover:text-white hover:border-[#00f5d4]/60 cursor-pointer"
          >
            {hud.radarZoom === 'near' ? (
              <ZoomOut className="w-3.5 h-3.5 text-[#00f5d4]" />
            ) : (
              <ZoomIn className="w-3.5 h-3.5 text-[#00f5d4]" />
            )}
          </button>
        </div>
      </div>

      {/* Always-visible Minimap Legend with live distances to Silahci & Mission */}
      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 px-2.5 py-1 rounded-lg bg-[#141022]/88 border border-white/12 text-[10px] font-mono-num text-white/85 shadow-md">
        <span className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-xs bg-[#ff4d6d] text-white font-bold text-[8px] flex items-center justify-center">
            S
          </span>
          <span>{t.hud.legendShop} {hud.shopDistanceMeters}m</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-xs bg-[#ff70a6] text-white font-bold text-[8px] flex items-center justify-center">
            K
          </span>
          <span>{t.hud.legendClothing} {hud.clothingDistanceMeters}m</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-xs bg-[#38bdf8] text-[#0c1b29] font-bold text-[8px] flex items-center justify-center">
            T
          </span>
          <span>{t.hud.legendBarber} {hud.barberDistanceMeters}m</span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className={`w-3.5 h-3.5 rounded-full font-bold text-[8px] flex items-center justify-center ${
              hud.mission.active ? 'bg-[#00f5d4] text-[#0c1b19]' : 'bg-[#ffbe0b] text-[#141022]'
            }`}
          >
            {hud.mission.active ? '★' : 'G'}
          </span>
          <span>{hud.mission.active ? `${t.hud.legendTarget} ${missionDist}m` : `${t.hud.legendMission} ${missionDist}m`}</span>
        </span>
        {!touchEnabled && (
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2ec4b6] text-[#0c1b19] font-bold text-[8px] flex items-center justify-center">
              B
            </span>
            <span>{t.hud.legendSpray}</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 md:p-5">
      {/* Top Perimeter Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Mission Card + Collapsible Online Chat */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-start gap-2.5 sm:gap-3">
            {touchEnabled && minimapElement}
            <button
              type="button"
              onClick={!hud.mission.active ? onStartMission : undefined}
              className={`text-left max-w-[230px] sm:max-w-xs bg-[#141022]/88 border border-white/12 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg ${
                !hud.mission.active ? 'pointer-events-auto hover:border-[#ffbe0b]/55 cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider text-[#ffbe0b] truncate">
                  {hud.mission.active
                    ? `${hud.mission.title}`
                    : t.hud.getContract(hud.mission.index, hud.mission.totalMissions)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {typeof hud.mission.distanceMeters === 'number' && (
                    <span className="font-mono-num text-[10px] text-white/70">
                      {hud.mission.distanceMeters}m
                    </span>
                  )}
                  {hud.mission.active && (
                    <span className="font-mono-num text-xs font-bold text-[#00f5d4]">
                      {Math.ceil(hud.mission.timeLeft)}s
                    </span>
                  )}
                </div>
              </div>
              {hud.mission.active && (hud.mission.contactName || hud.mission.stageLabel) && (
                <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px] font-mono-num text-[#ffd166]/85">
                  <span className="truncate">{hud.mission.contactName}</span>
                  {hud.mission.stageLabel && <span className="text-[#00f5d4] shrink-0">{hud.mission.stageLabel}</span>}
                </div>
              )}
              <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 leading-snug">{hud.mission.objective}</p>
              {hud.mission.progressText && (
                <p className="text-[11px] font-mono-num text-[#ff6b6b] mt-1">{hud.mission.progressText}</p>
              )}
            </button>
          </div>

          {hud.onlineStatus === 'connected' && (
            <div className="pointer-events-auto w-60 sm:w-72">
              {!chatOpen ? (
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141022]/88 border border-[#00f5d4]/40 text-[11px] font-mono-num text-[#6ef3d6] hover:border-[#00f5d4] hover:text-white transition-colors cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#00f5d4]" />
                  <span>{t.hud.showChat(hud.onlineChat.length)}</span>
                </button>
              ) : (
                <div className="rounded-xl bg-[#141022]/92 border border-[#00f5d4]/40 p-2.5 shadow-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono-num uppercase tracking-wider text-[#6ef3d6]">
                      <MessageSquare className="w-3 h-3 text-[#00f5d4]" />
                      <span>{hud.onlineRoom}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      className="flex items-center gap-1 text-[10px] font-mono-num text-white/60 hover:text-white cursor-pointer"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>{t.hud.hideChat}</span>
                    </button>
                  </div>

                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono-num pr-1">
                    {hud.onlineChat.length === 0 ? (
                      <div className="text-white/45 text-[10px]">{t.hud.chatEmpty(hud.onlineRoom)}</div>
                    ) : (
                      hud.onlineChat.map((m) => (
                        <div key={m.id} className="leading-snug break-words">
                          <span
                            className="font-bold mr-1.5"
                            style={{ color: `#${m.color.toString(16).padStart(6, '0')}` }}
                          >
                            {m.name}:
                          </span>
                          <span className="text-white/90">{m.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatDraft.trim()) return;
                      onSendChat(chatDraft);
                      setChatDraft('');
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      maxLength={120}
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') {
                          (e.currentTarget as HTMLInputElement).blur();
                          setChatOpen(false);
                        }
                      }}
                      placeholder={t.hud.chatPlaceholder}
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0d0a16] border border-white/15 text-[11px] text-white font-mono-num focus:outline-none focus:border-[#00f5d4]"
                    />
                    <button
                      type="submit"
                      aria-label={t.hud.sendChat}
                      title={t.hud.sendChat}
                      className="p-1.5 rounded bg-[#00f5d4]/20 border border-[#00f5d4]/60 text-[#6ef3d6] hover:bg-[#00f5d4]/30 hover:text-white cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Wanted Stars, Cash, Health/Armor, Weapon & System Buttons */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Wanted Stars & Escalating Police Status */}
            <div
              className={`flex flex-col gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border ${
                hud.wantedStars > 0
                  ? hud.wantedEvading
                    ? 'bg-[#1a1628]/90 border-[#00f5d4]/45'
                    : 'bg-[#2a1020]/92 border-[#ff3d7f]/65'
                  : 'bg-[#141022]/85 border-white/12'
              }`}
              aria-label={`Polis Aranma Seviyesi ${hud.wantedStars}`}
            >
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= hud.wantedStars;
                  return (
                    <svg
                      key={star}
                      viewBox="0 0 24 24"
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        active
                          ? hud.wantedEvading
                            ? 'text-white/75 fill-current'
                            : 'text-[#ffbe0b] fill-current'
                          : 'text-white/20 fill-current'
                      }`}
                    >
                      <path d="M12 2.4l2.9 6.1 6.7.9-4.9 4.7 1.2 6.7L12 17.6l-5.9 3.2 1.2-6.7L2.4 9.4l6.7-.9L12 2.4z" />
                    </svg>
                  );
                })}
                {hud.wantedStars > 0 && (
                  <span className="ml-1 text-[9px] font-mono-num uppercase tracking-wider text-white/80 hidden sm:inline">
                    {hud.wantedEvading
                      ? t.hud.evadeLabel(hud.wantedEvadeProgress)
                      : hud.wantedStars >= 4
                        ? t.hud.heliLabel
                        : hud.wantedStars === 3
                          ? t.hud.roadblockLabel
                          : t.hud.wantedLabel}
                  </span>
                )}
              </div>
              {hud.wantedStars > 0 && hud.wantedEvading && (
                <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00f5d4] transition-all duration-100"
                    style={{ width: `${hud.wantedEvadeProgress}%` }}
                  />
                </div>
              )}
              {hud.wantedStars < 5 && hud.wantedHeat > 8 && !hud.wantedEvading && (
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff9f1c] transition-all duration-100"
                    style={{ width: `${hud.wantedHeat}%` }}
                  />
                </div>
              )}
            </div>

            {/* Cash Readout */}
            <div className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#141022]/90 border border-[#2ec4b6]/40 font-mono-num font-bold text-sm sm:text-base text-[#2ec4b6] tracking-tight">
              ${hud.cash.toLocaleString(locale)}
            </div>

            {/* Weather Cycle, Camera Angle, Touch Controls Toggle, Mute & Pause */}
            <button
              type="button"
              onClick={onCycleWeather}
              aria-label={`Hava Durumu: ${hud.weatherLabel}`}
              title={`Hava Durumu: ${hud.weatherLabel} [T]`}
              className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer text-[11px] font-mono-num ${
                hud.weather === 'rainy'
                  ? 'bg-[#122033]/92 border-[#60a5fa]/55 text-[#bae6fd]'
                  : hud.weather === 'foggy'
                    ? 'bg-[#252734]/92 border-[#cbd5e1]/45 text-[#e2e8f0]'
                    : 'bg-[#141022]/90 border-white/15 text-white/85 hover:text-white hover:border-[#ffbe0b]/55'
              }`}
            >
              {hud.weather === 'rainy' ? (
                <CloudRain className="w-3.5 h-3.5 text-[#60a5fa]" />
              ) : hud.weather === 'foggy' ? (
                <CloudFog className="w-3.5 h-3.5 text-[#cbd5e1]" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#ffbe0b]" />
              )}
              <span className="hidden sm:inline">{hud.weatherLabel}</span>
            </button>
            <button
              type="button"
              onClick={onCycleCamera}
              aria-label={`Kamera Açısı: ${hud.cameraModeLabel}`}
              title={`Kamera Açısı: ${hud.cameraModeLabel} [C]`}
              className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 rounded-lg border bg-[#141022]/90 border-white/15 text-white/85 hover:text-white hover:border-[#ffbe0b]/55 transition-colors cursor-pointer text-[11px] font-mono-num"
            >
              <Camera className="w-3.5 h-3.5 text-[#ffbe0b]" />
              <span className="hidden sm:inline">{hud.cameraModeLabel}</span>
            </button>
            <button
              type="button"
              onClick={onToggleTouch}
              aria-label={touchEnabled ? 'Dokunmatik Kontrolleri Gizle' : 'Dokunmatik Kontrolleri Göster'}
              title={touchEnabled ? 'Dokunmatik Kontrolleri Gizle' : 'Dokunmatik Kontrolleri Göster'}
              className={`pointer-events-auto p-2 rounded-lg border transition-colors cursor-pointer ${
                touchEnabled
                  ? 'bg-[#1f1933]/92 border-[#00f5d4]/60 text-[#00f5d4]'
                  : 'bg-[#141022]/90 border-white/15 text-white/75 hover:text-white hover:border-white/35'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={hud.muted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="pointer-events-auto p-2 rounded-lg bg-[#141022]/90 border border-white/15 text-white/80 hover:text-white hover:border-white/35 transition-colors cursor-pointer"
            >
              {hud.muted ? <VolumeX className="w-4 h-4 text-[#ff6b6b]" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {hud.gamepadConnected && (
              <button
                type="button"
                onClick={onOpenSettings}
                title={t.gamepad.title}
                className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 rounded-lg border bg-[#0e2629]/92 border-[#00f5d4]/55 text-[#6ef3d6] hover:border-[#00f5d4] transition-colors cursor-pointer text-[11px] font-mono-num"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-[#00f5d4]" />
                <span className="hidden md:inline">{hud.gamepadName}</span>
              </button>
            )}
            {hud.onlineStatus !== 'offline' && (
              <button
                type="button"
                onClick={onOpenSettings}
                title={t.settings.onlineTitle}
                className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer text-[11px] font-mono-num font-bold ${
                  hud.onlineStatus === 'connected'
                    ? 'bg-[#0e2629]/92 border-[#00f5d4]/60 text-[#6ef3d6] hover:border-[#00f5d4]'
                    : hud.onlineStatus === 'connecting'
                      ? 'bg-[#282010]/92 border-[#ffbe0b]/55 text-[#ffd166]'
                      : 'bg-[#2a1020]/92 border-[#ff3d7f]/55 text-[#ff8fa3]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {hud.onlineStatus === 'connected'
                    ? t.hud.onlineBadge(hud.onlinePlayers.length + 1)
                    : hud.onlineStatus === 'connecting'
                      ? t.hud.connectingBadge
                      : 'ERR'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={t.hud.settingsOnline}
              title={t.hud.settingsOnline}
              className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer text-[11px] font-mono-num bg-[#141022]/90 border-white/15 text-white/85 hover:text-white hover:border-[#ffbe0b]/55"
            >
              <Settings className="w-3.5 h-3.5 text-[#ffbe0b]" />
              <span className="hidden sm:inline">{t.hud.settingsOnline}</span>
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label={t.hud.pauseLabel}
              className="pointer-events-auto p-2 rounded-lg bg-[#141022]/90 border border-white/15 text-white/80 hover:text-white hover:border-white/35 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Frank Identity, Health, Armor & Active Weapon Cluster */}
          <div className="bg-[#141022]/88 border border-white/12 rounded-xl px-3 py-2 w-52 sm:w-64 flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <span className="font-display font-bold text-xs tracking-wider uppercase text-[#ffbe0b]">
                {hud.playerName}
              </span>
              <span className="text-[10px] font-mono-num text-white/55 uppercase">
                {hud.inVehicle ? t.hud.stateDriving : hud.isAiming ? t.hud.stateAim : t.hud.stateOnFoot}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-[#ff4d6d] shrink-0" />
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff4d6d] transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100))}%` }}
                />
              </div>
              <span className="font-mono-num text-[11px] text-white/85 w-7 text-right">{hud.health}</span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#3a86ff] shrink-0" />
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3a86ff] transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, hud.armor))}%` }}
                />
              </div>
              <span className="font-mono-num text-[11px] text-white/85 w-7 text-right">{hud.armor}</span>
            </div>

            {!hud.inVehicle ? (
              <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <div className="flex items-center gap-1.5 text-white/90 font-medium truncate">
                    {hud.weapon === 'unarmed' ? (
                      <Hand className="w-3.5 h-3.5 text-white/75 shrink-0" />
                    ) : hud.weapon === 'knife' ? (
                      <Sword className="w-3.5 h-3.5 text-[#e2e8f0] shrink-0" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5 text-[#ffbe0b] shrink-0" />
                    )}
                    <span className="truncate">{t.weapons[hud.weapon].shortName}</span>
                  </div>
                  <span className="font-mono-num font-bold text-[#ffbe0b] shrink-0">
                    {isMeleeWeapon
                      ? t.hud.meleeLabel
                      : hud.reloading
                        ? t.hud.reloadingLabel(hud.reloadProgress)
                        : `${magRounds} / ${reserveRounds}`}
                  </span>
                </div>
                {hud.reloading && (
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00f5d4] transition-all duration-75"
                      style={{ width: `${hud.reloadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              touchEnabled && (
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                  <span className="font-display font-bold text-white/80 truncate">{hud.vehicleName}</span>
                  <div className="flex items-baseline gap-1 font-mono-num">
                    <span className="font-bold text-sm text-[#00f5d4]">{hud.vehicleSpeedKmh}</span>
                    <span className="text-[9px] text-white/60">KM/H</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Busted Risk Warning */}
      {hud.bustedProgress > 6 && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 w-full max-w-xs">
          <div className="bg-[#380b19]/95 border border-[#ff3d7f] rounded-lg px-3 py-1.5 text-center shadow-xl">
            <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#ff8fa3]">
              {t.hud.bustedWarning}
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#ff3d7f] transition-all duration-75"
                style={{ width: `${hud.bustedProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Classic GTA Mission Passed / Failed / Fixer Briefing Banner */}
      {hud.missionBanner && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 w-full max-w-lg flex justify-center">
          <div
            className={`w-full px-5 py-3 rounded-xl border-2 text-center shadow-2xl ${
              hud.missionBanner.tone === 'passed'
                ? 'bg-[#121614]/94 border-[#ffbe0b] text-[#ffd166]'
                : hud.missionBanner.tone === 'failed'
                  ? 'bg-[#2a0c16]/94 border-[#ff3d7f] text-[#ff8fa3]'
                  : 'bg-[#141022]/94 border-[#00f5d4]/80 text-white'
            }`}
          >
            <div className="font-display font-bold italic text-xl sm:text-2xl tracking-wider uppercase">
              {hud.missionBanner.title}
            </div>
            <div className="text-xs sm:text-sm font-mono-num text-white/90 mt-0.5">
              {hud.missionBanner.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* Transient Top-Center Toast */}
      {hud.toastText && !hud.missionBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 w-full max-w-md flex justify-center">
          <div
            className={`px-4 py-2 rounded-lg border text-xs md:text-sm font-display font-bold tracking-wide shadow-xl text-center ${
              hud.toastTone === 'wanted'
                ? 'bg-[#2c0d18]/92 border-[#ff3d7f]/60 text-[#ff8fa3]'
                : hud.toastTone === 'cash' || hud.toastTone === 'stunt'
                  ? 'bg-[#0e2624]/92 border-[#00f5d4]/60 text-[#6ef3d6]'
                  : 'bg-[#1a152e]/92 border-[#ffbe0b]/60 text-[#ffd166]'
            }`}
          >
            {hud.toastText}
          </div>
        </div>
      )}

      {/* Dynamic Center Reticle (ADS Tactical Brackets / Reload Ring) */}
      {!hud.inVehicle && hud.phase === 'playing' && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          {isMeleeWeapon ? (
            <div className="w-1.5 h-1.5 rounded-full bg-white/55" />
          ) : hud.isAiming ? (
            <svg viewBox="0 0 36 36" className="w-9 h-9 text-[#00f5d4] drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
              <circle cx="18" cy="18" r="1.6" fill="#ff3d7f" />
              <line x1="18" y1="6" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" />
              <line x1="18" y1="24" x2="18" y2="30" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" />
              <line x1="24" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 12 L9 9 L12 9" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <path d="M27 12 L27 9 L24 9" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <path d="M9 24 L9 27 L12 27" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <path d="M27 24 L27 27 L24 27" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
            </svg>
          ) : (
            <svg viewBox="0 0 28 28" className="w-6 h-6 text-white/75">
              <circle cx="14" cy="14" r="1.3" fill="currentColor" />
              <line x1="14" y1="3" x2="14" y2="8" stroke="currentColor" strokeWidth="1.4" />
              <line x1="14" y1="20" x2="14" y2="25" stroke="currentColor" strokeWidth="1.4" />
              <line x1="3" y1="14" x2="8" y2="14" stroke="currentColor" strokeWidth="1.4" />
              <line x1="20" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </div>
      )}

      {/* Contextual Action Prompt */}
      {hud.promptText && !touchEnabled && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
          {hud.nearWeaponShop ? (
            <button
              type="button"
              onClick={onOpenShop}
              className="px-4 py-2 rounded-lg bg-[#2a1020]/95 border border-[#ff4d6d] text-xs font-mono-num text-white shadow-lg flex items-center gap-2 hover:brightness-110 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#ff4d6d]" />
              <span>{hud.promptText}</span>
            </button>
          ) : hud.nearClothingShop ? (
            <button
              type="button"
              onClick={onOpenClothingShop}
              className="px-4 py-2 rounded-lg bg-[#281024]/95 border border-[#ff70a6] text-xs font-mono-num text-white shadow-lg flex items-center gap-2 hover:brightness-110 cursor-pointer"
            >
              <Shirt className="w-4 h-4 text-[#ff70a6]" />
              <span>{hud.promptText}</span>
            </button>
          ) : hud.nearBarberShop ? (
            <button
              type="button"
              onClick={onOpenBarberShop}
              className="px-4 py-2 rounded-lg bg-[#0d1f2e]/95 border border-[#38bdf8] text-xs font-mono-num text-white shadow-lg flex items-center gap-2 hover:brightness-110 cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-[#38bdf8]" />
              <span>{hud.promptText}</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-lg bg-[#141022]/92 border border-[#ffbe0b]/50 text-xs font-mono-num text-[#ffd166] shadow-lg pointer-events-none">
              {hud.promptText}
            </div>
          )}
        </div>
      )}

      {/* Bottom Perimeter Row (Desktop Layout) */}
      {!touchEnabled && (
        <div className="flex items-end justify-between gap-4">
          {minimapElement}

          {hud.inVehicle ? (
            <div className="bg-[#141022]/90 border border-white/12 rounded-xl px-4 py-3 min-w-[210px] flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-white/80">
                  {hud.vehicleName}
                </span>
                <div className="flex items-baseline gap-1">
                  <Gauge className="w-3.5 h-3.5 text-[#ff9f1c] self-center mr-0.5" />
                  <span className="font-mono-num font-bold text-2xl text-white">{hud.vehicleSpeedKmh}</span>
                  <span className="text-[10px] font-mono-num text-white/60">KM/H</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono-num">
                <span className="text-white/60 w-9">{t.hud.nitro}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00f5d4] transition-all duration-75"
                    style={{ width: `${hud.nitro}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono-num">
                <span className="text-white/60 w-9">{t.hud.damage}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hud.vehicleHp < 35 ? 'bg-[#ff4d6d]' : 'bg-[#ffbe0b]'
                    }`}
                    style={{ width: `${hud.vehicleHp}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono-num text-white/55 pt-0.5">
                {t.hud.vehicleControls}
              </div>
            </div>
          ) : (
            <div className="bg-[#141022]/88 border border-white/12 rounded-xl px-3 py-2 flex flex-col items-end gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {WEAPON_SLOTS.map((wk, idx) => {
                  const owned = hud.ownedWeapons[wk];
                  const selected = hud.weapon === wk;
                  return (
                    <button
                      key={wk}
                      type="button"
                      disabled={!owned}
                      onClick={() => onSelectWeapon(wk)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-mono-num transition-colors ${
                        selected
                          ? 'bg-[#ff9f1c]/20 border-[#ff9f1c] text-[#ffd166] font-bold cursor-pointer'
                          : owned
                            ? 'bg-white/5 border-white/12 text-white/75 hover:text-white cursor-pointer'
                            : 'bg-white/[0.02] border-white/5 text-white/25 cursor-not-allowed'
                      }`}
                    >
                      [{idx}] {t.weapons[wk].shortName}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono-num">
                {!isMeleeWeapon && (
                  <button
                    type="button"
                    onClick={onReload}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/75 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3 text-[#00f5d4]" />
                    <span>{t.hud.reloadBtn}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onToggleHolster}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/75 hover:text-white cursor-pointer flex items-center gap-1"
                >
                  <Hand className="w-3 h-3 text-[#ffbe0b]" />
                  <span>{t.hud.holsterBtn}</span>
                </button>
                {hud.weapon !== 'unarmed' && (
                  <button
                    type="button"
                    onClick={onDropWeapon}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/75 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <ArrowDownToLine className="w-3 h-3 text-[#ff4d6d]" />
                    <span>{t.hud.dropBtn}</span>
                  </button>
                )}
                {!isMeleeWeapon && (
                  <span className="text-white/45 px-1">{t.hud.aimHint}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Touch Controls Overlay for Mobile & Tablet */}
      {touchEnabled && hud.phase === 'playing' && (
        <TouchControls
          language={hud.language}
          inVehicle={hud.inVehicle}
          canEnterVehicle={
            Boolean(hud.promptText) && !hud.nearWeaponShop && !hud.nearClothingShop && !hud.nearBarberShop
          }
          nearWeaponShop={hud.nearWeaponShop}
          nearClothingShop={hud.nearClothingShop}
          nearBarberShop={hud.nearBarberShop}
          missionActive={hud.mission.active}
          weapon={hud.weapon}
          isAiming={hud.isAiming}
          magRounds={magRounds}
          reserveRounds={reserveRounds}
          nitro={hud.nitro}
          onMove={touchActions.onMove}
          onFire={touchActions.onFire}
          onAim={touchActions.onAim}
          onSprint={touchActions.onSprint}
          onBrake={touchActions.onBrake}
          onGas={touchActions.onGas}
          onReverse={touchActions.onReverse}
          onJump={touchActions.onJump}
          onEnterExitVehicle={touchActions.onEnterExitVehicle}
          onHorn={touchActions.onHorn}
          onCycleWeapon={touchActions.onCycleWeapon}
          onReload={touchActions.onReload}
          onToggleHolster={touchActions.onToggleHolster}
          onDropWeapon={touchActions.onDropWeapon}
          onOpenShop={touchActions.onOpenShop}
          onOpenClothingShop={touchActions.onOpenClothingShop}
          onOpenBarberShop={touchActions.onOpenBarberShop}
          onStartMission={onStartMission}
          onOpenMap={onOpenMap}
        />
      )}
    </div>
  );
};

