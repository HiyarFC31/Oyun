import React from 'react';
import { Globe, Play, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { getTranslations } from '../game/i18n';
import type { LanguageCode } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  language: LanguageCode;
  onStart: () => void;
  onStartOnline: () => void;
  onOpenSettings: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  language,
  onStart,
  onStartOnline,
  onOpenSettings,
  muted,
  onToggleMute,
}) => {
  const t = getTranslations(language);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-12 pointer-events-none bg-gradient-to-t from-[#0d0a16]/90 via-[#0d0a16]/25 to-[#0d0a16]/55">
      {/* Top Bar: Settings & Sound Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono-num tracking-[0.26em] uppercase text-[#ffb472]/85">
          {t.title.tagline}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <PWAInstallButton language={language} variant="topbar" />
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161224]/90 border border-[#00f5d4]/45 text-xs font-medium text-[#6ef3d6] hover:text-white hover:border-[#00f5d4] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t.title.settingsBtn}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.title.soundOn : t.title.soundOff}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161224]/90 border border-white/15 text-xs font-medium text-white/85 hover:text-white hover:border-[#ff9f1c]/60 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#ff6b6b]" /> : <Volume2 className="w-4 h-4 text-[#00f5d4]" />}
            <span>{muted ? t.title.soundOff : t.title.soundOn}</span>
          </button>
        </div>
      </div>

      {/* Center-Left Hero Lockup over Calm Negative Space */}
      <div className="max-w-xl my-auto">
        {/* Bespoke Inline SVG Title Emblem */}
        <svg
          viewBox="0 0 560 168"
          className="w-full max-w-[500px] h-auto mb-5 drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
          aria-label="Theft at Solaris"
        >
          <defs>
            <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd166" />
              <stop offset="52%" stopColor="#ff7b54" />
              <stop offset="100%" stopColor="#ff3d7f" />
            </linearGradient>
            <linearGradient id="chromeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Sunset Disc */}
          <circle cx="72" cy="78" r="54" fill="url(#sunGrad)" opacity="0.92" />
          <rect x="14" y="88" width="116" height="5" fill="#120d1d" opacity="0.7" />
          <rect x="14" y="99" width="116" height="6" fill="#120d1d" opacity="0.82" />
          <rect x="14" y="111" width="116" height="8" fill="#120d1d" opacity="0.9" />

          {/* Palm Silhouette */}
          <path
            d="M54 128 Q60 92 70 64 M70 64 Q50 56 36 66 M70 64 Q54 44 42 44 M70 64 Q86 46 102 52 M70 64 Q92 60 104 72"
            stroke="#140f21"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Title Typography */}
          <text
            x="144"
            y="80"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontStyle="italic"
            fontSize="48"
            letterSpacing="3"
            fill="url(#chromeGrad)"
          >
            THEFT AT
          </text>
          <text
            x="144"
            y="134"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontStyle="italic"
            fontSize="58"
            letterSpacing="5"
            fill="url(#sunGrad)"
          >
            SOLARIS
          </text>
          <rect x="148" y="146" width="265" height="4" rx="2" fill="#00f5d4" />
        </svg>

        <p className="text-sm md:text-base text-white/80 leading-relaxed mb-7 max-w-md">
          {t.title.description}
        </p>

        <div className="flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={onStart}
            className="pointer-events-auto group flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#ff7b54] to-[#ff3d7f] text-white font-display font-bold text-lg tracking-wider uppercase shadow-[0_12px_32px_rgba(255,61,127,0.38)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{t.title.startBtn}</span>
          </button>
          <button
            type="button"
            onClick={onStartOnline}
            className="pointer-events-auto flex items-center gap-2.5 px-6 py-4 rounded-xl bg-[#0e2a2d]/95 border border-[#00f5d4]/70 text-[#6ef3d6] font-display font-bold text-base tracking-wider uppercase shadow-[0_10px_28px_rgba(0,245,212,0.18)] hover:bg-[#13383c] hover:text-white hover:border-[#00f5d4] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#00f5d4]" />
            <span>{t.settings.playOnline}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="pointer-events-auto flex items-center gap-2.5 px-5 py-4 rounded-xl bg-[#161224]/92 border border-white/20 text-white/85 font-display font-bold text-base tracking-wider uppercase hover:border-[#ffbe0b]/65 hover:text-white transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#ffbe0b]" />
            <span>{t.title.settingsHeroBtn}</span>
          </button>
          <span className="text-xs font-mono-num text-white/60 uppercase tracking-wider">
            {t.title.enterHint}
          </span>
        </div>
      </div>

      {/* Bottom: Single Flat Control-Hint Line */}
      <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/75 font-mono-num">
        <span>{t.title.controlsLine}</span>
      </div>
    </div>
  );
};
