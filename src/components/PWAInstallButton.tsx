import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { getTranslations } from '../game/i18n';
import type { LanguageCode } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  language: LanguageCode;
  variant?: 'topbar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language,
  variant = 'topbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = getTranslations(language);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'card'
            ? 'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00f5d4] to-[#2ec4b6] text-[#091c1a] font-display font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer'
            : 'flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0e2629]/95 border border-[#00f5d4]/60 text-xs font-medium text-[#6ef3d6] hover:text-white hover:border-[#00f5d4] transition-colors cursor-pointer'
        }
      >
        <Download className="w-4 h-4" />
        <span>{t.pwa.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'card'
              ? 'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.06] border border-[#00f5d4]/45 text-[#6ef3d6] font-display font-bold text-xs uppercase tracking-wider hover:border-[#00f5d4] cursor-pointer'
              : 'flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0e2629]/95 border border-[#00f5d4]/50 text-xs font-medium text-[#6ef3d6] hover:text-white cursor-pointer'
          }
        >
          <Smartphone className="w-4 h-4" />
          <span>{t.pwa.installIOS}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
            <div className="w-full max-w-sm rounded-2xl bg-[#161224] border border-white/15 p-6 shadow-2xl">
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide">
                {t.pwa.iosTitle}
              </h3>
              <p className="mt-2.5 text-sm text-white/80 leading-relaxed space-y-1.5">
                <span className="block">{t.pwa.iosStep1}</span>
                <span className="block">{t.pwa.iosStep2}</span>
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-white/10 border border-white/15 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-white hover:bg-white/15 cursor-pointer"
              >
                {t.pwa.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
