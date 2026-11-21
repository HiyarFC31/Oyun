import React, { useEffect, useState } from 'react';
import {
  Camera,
  CloudFog,
  CloudRain,
  Gamepad2,
  Globe,
  Languages,
  LogOut,
  SlidersHorizontal,
  Sun,
  User,
  Users,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getTranslations, LANGUAGE_OPTIONS } from '../game/i18n';
import type { HudSnapshot, LanguageCode, WeatherType } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  open: boolean;
  hud: HudSnapshot;
  touchEnabled: boolean;
  onClose: () => void;
  onChangeName: (name: string) => void;
  onChangeLanguage: (lang: LanguageCode) => void;
  onChangeSensitivity: (val: number) => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onToggleHaptics: () => void;
  onSelectCamera: (mode: 0 | 1 | 2) => void;
  onSelectWeather: (weather: WeatherType) => void;
  onConnectOnline: (room: string, name: string) => void;
  onDisconnectOnline: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  hud,
  touchEnabled,
  onClose,
  onChangeName,
  onChangeLanguage,
  onChangeSensitivity,
  onToggleMute,
  onToggleTouch,
  onToggleHaptics,
  onSelectCamera,
  onSelectWeather,
  onConnectOnline,
  onDisconnectOnline,
}) => {
  const [nameInput, setNameInput] = useState(hud.playerName);
  const [roomInput, setRoomInput] = useState(hud.onlineRoom);
  const t = getTranslations(hud.language);

  useEffect(() => {
    if (open) {
      setNameInput(hud.playerName);
      setRoomInput(hud.onlineRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#0d0917]/86 pointer-events-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#161224] border border-white/15 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ffbe0b]/15 border border-[#ffbe0b]/40">
              <SlidersHorizontal className="w-4 h-4 text-[#ffbe0b]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl tracking-wider uppercase text-white">
                {t.settings.title}
              </h2>
              <p className="text-[11px] font-mono-num text-white/55">
                {t.settings.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.settings.close}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/30 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selector Card */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 mb-4">
          <div className="flex items-center gap-2 text-xs text-white/85 mb-2.5">
            <Languages className="w-4 h-4 text-[#ffbe0b]" />
            <span className="font-medium">{t.settings.languageTitle}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = hud.language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeLanguage(opt.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-mono-num border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#ffbe0b]/20 border-[#ffbe0b] text-[#ffd166] font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/25'
                  }`}
                >
                  <span className="text-[10px] opacity-75">{opt.flag}</span>
                  <span>{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Name */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 mb-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-xs text-white/85 font-medium">
              <User className="w-4 h-4 text-[#ffbe0b]" />
              <span>{t.settings.playerNameLabel}</span>
            </span>
            <input
              type="text"
              maxLength={16}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                onChangeName(e.target.value);
              }}
              placeholder="Frank"
              className="px-3 py-2 rounded-lg bg-[#0d0a16] border border-white/15 text-sm text-white font-mono-num focus:outline-none focus:border-[#ffbe0b]"
            />
          </label>
        </div>

        {/* Online Multiplayer Card */}
        <div className="p-3.5 rounded-xl bg-[#0e2128]/70 border border-[#00f5d4]/30 mb-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white/95 font-medium">
              <Globe className={`w-4 h-4 ${hud.onlineStatus === 'connected' ? 'text-[#00f5d4]' : 'text-[#ffbe0b]'}`} />
              <span>{t.settings.onlineTitle}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono-num font-bold uppercase border ${
                hud.onlineStatus === 'connected'
                  ? 'bg-[#00f5d4]/15 border-[#00f5d4]/50 text-[#6ef3d6]'
                  : hud.onlineStatus === 'connecting'
                    ? 'bg-[#ffbe0b]/15 border-[#ffbe0b]/50 text-[#ffd166]'
                    : hud.onlineStatus === 'error'
                      ? 'bg-[#ff3d7f]/15 border-[#ff3d7f]/50 text-[#ff8fa3]'
                      : 'bg-white/5 border-white/15 text-white/60'
              }`}
            >
              {hud.onlineStatus === 'connected'
                ? t.settings.statusConnected(hud.onlinePlayers.length + 1)
                : hud.onlineStatus === 'connecting'
                  ? t.settings.statusConnecting
                  : hud.onlineStatus === 'error'
                    ? t.settings.statusError
                    : t.settings.statusOffline}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] font-mono-num text-white/65">{t.settings.roomLabel}</span>
              <input
                type="text"
                maxLength={20}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="solaris-1"
                className="px-3 py-2 rounded-lg bg-[#0d0a16] border border-white/15 text-sm text-white font-mono-num focus:outline-none focus:border-[#00f5d4]"
              />
            </label>
            <div className="flex items-end">
              {hud.onlineStatus === 'connected' || hud.onlineStatus === 'connecting' ? (
                <button
                  type="button"
                  onClick={onDisconnectOnline}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#38101c] border border-[#ff4d6d]/60 text-[#ff8fa3] font-display font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.settings.disconnectOnline}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onConnectOnline(roomInput, nameInput)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#00f5d4]/20 border border-[#00f5d4]/70 text-[#6ef3d6] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00f5d4]/30 hover:text-white cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t.settings.playOnline}</span>
                </button>
              )}
            </div>
          </div>

          {hud.onlineStatus === 'connected' && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono-num text-white/70">
                <Users className="w-3.5 h-3.5 text-[#00f5d4]" />
                <span>{t.settings.playersInRoom(hud.onlineRoom)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#00f5d4]/15 border border-[#00f5d4]/40 text-[11px] font-mono-num text-[#6ef3d6]">
                  {hud.playerName} {t.settings.youTag}
                </span>
                {hud.onlinePlayers.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/12 text-[11px] font-mono-num text-white/85"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: `#${p.color.toString(16).padStart(6, '0')}` }}
                    />
                    <span>{p.name}</span>
                    {p.wantedStars > 0 && <span className="text-[#ffbe0b]">{p.wantedStars}★</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-3.5">
          <PWAInstallButton language={hud.language} variant="card" />
        </div>

        {/* General & Control Settings */}
        <div className="space-y-3.5">
          {/* Mouse Sensitivity */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-white/80 font-medium">{t.settings.sensitivityLabel}</span>
              <span className="font-mono-num font-bold text-[#ffbe0b]">
                {hud.mouseSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.2}
              step={0.1}
              value={hud.mouseSensitivity}
              onChange={(e) => onChangeSensitivity(Number(e.target.value))}
              className="w-full accent-[#ffbe0b] cursor-pointer"
            />
          </div>

          {/* Camera Preset */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <Camera className="w-4 h-4 text-[#ffbe0b]" />
              <span>{t.settings.cameraLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              {t.cameraModes.map((label, idx) => {
                const active = hud.cameraModeLabel === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSelectCamera(idx as 0 | 1 | 2)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-num border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#ffbe0b]/20 border-[#ffbe0b] text-[#ffd166] font-bold'
                        : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather Selector */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <Sun className="w-4 h-4 text-[#ffbe0b]" />
              <span>{t.settings.weatherLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'sunny', Icon: Sun },
                  { id: 'rainy', Icon: CloudRain },
                  { id: 'foggy', Icon: CloudFog },
                ] as const
              ).map(({ id, Icon }) => {
                const active = hud.weather === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectWeather(id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono-num border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#3a86ff]/25 border-[#60a5fa] text-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{t.weather[id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound & Touch Toggles */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/85 hover:border-white/25 cursor-pointer"
            >
              {hud.muted ? (
                <VolumeX className="w-4 h-4 text-[#ff6b6b]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#00f5d4]" />
              )}
              <span>{hud.muted ? t.settings.soundOff : t.settings.soundOn}</span>
            </button>
            <button
              type="button"
              onClick={onToggleTouch}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/85 hover:border-white/25 cursor-pointer"
            >
              <Gamepad2 className={`w-4 h-4 ${touchEnabled ? 'text-[#00f5d4]' : 'text-white/50'}`} />
              <span>{touchEnabled ? t.settings.touchOn : t.settings.touchOff}</span>
            </button>
          </div>

          {/* PS5 DualSense / Gamepad Card */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-white/90 font-medium">
                <Gamepad2 className={`w-4 h-4 ${hud.gamepadConnected ? 'text-[#00f5d4]' : 'text-[#ffbe0b]'}`} />
                <span>{t.gamepad.title}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono-num font-bold uppercase border ${
                  hud.gamepadConnected
                    ? 'bg-[#00f5d4]/15 border-[#00f5d4]/50 text-[#6ef3d6]'
                    : 'bg-white/5 border-white/15 text-white/60'
                }`}
              >
                {hud.gamepadConnected ? `${hud.gamepadName} • ${t.gamepad.connected}` : t.gamepad.waiting}
              </span>
            </div>

            <p className="text-[11px] font-mono-num text-white/65 leading-relaxed">
              {t.gamepad.controlsSummary}
            </p>

            <button
              type="button"
              onClick={onToggleHaptics}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/85 hover:border-white/25 cursor-pointer"
            >
              <Vibrate className={`w-4 h-4 ${hud.hapticsEnabled ? 'text-[#00f5d4]' : 'text-white/45'}`} />
              <span>{hud.hapticsEnabled ? t.gamepad.hapticsOn : t.gamepad.hapticsOff}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-display font-bold text-sm uppercase tracking-wider hover:bg-white/15 cursor-pointer"
        >
          {t.settings.close}
        </button>
      </div>
    </div>
  );
};
