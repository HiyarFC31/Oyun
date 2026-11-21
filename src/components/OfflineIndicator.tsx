import React, { useEffect, useState } from 'react';
import { getTranslations } from '../game/i18n';
import type { LanguageCode } from '../game/types';

export const OfflineIndicator: React.FC<{ language: LanguageCode }> = ({ language }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  const t = getTranslations(language);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#2b1a09]/95 border border-[#ffbe0b]/65 px-3 py-1.5 text-xs font-mono-num text-[#ffd166] shadow-lg pointer-events-none">
      <span className="h-2 w-2 rounded-full bg-[#ffbe0b] animate-pulse" />
      <span>{t.pwa.offlineBanner}</span>
    </div>
  );
};
