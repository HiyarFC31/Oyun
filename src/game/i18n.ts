import type {
  BeardStyleId,
  HairColorId,
  HairStyleId,
  LanguageCode,
  OutfitId,
  WeaponId,
  WeatherType,
} from './types';

export interface LanguageOption {
  id: LanguageCode;
  name: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'tr', name: 'Türkçe', flag: 'TR' },
  { id: 'en', name: 'English', flag: 'EN' },
  { id: 'de', name: 'Deutsch', flag: 'DE' },
  { id: 'ru', name: 'Русский', flag: 'RU' },
  { id: 'it', name: 'Italiano', flag: 'IT' },
];

const LANG_STORAGE_KEY = 'solaris_bay_lang';

export function loadSavedLanguage(): LanguageCode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'tr' || saved === 'en' || saved === 'de' || saved === 'ru' || saved === 'it') {
        return saved;
      }
    }
  } catch {
    // ignore storage access issues
  }
  return 'tr';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  } catch {
    // ignore storage access issues
  }
}

export function getNumberLocale(lang: LanguageCode): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'de':
      return 'de-DE';
    case 'ru':
      return 'ru-RU';
    case 'it':
      return 'it-IT';
    default:
      return 'tr-TR';
  }
}

export interface TranslationSet {
  weapons: Record<WeaponId, { name: string; shortName: string }>;
  cameraModes: readonly [string, string, string];
  weather: Record<WeatherType, string>;
  title: {
    tagline: string;
    settingsBtn: string;
    settingsHeroBtn: string;
    soundOn: string;
    soundOff: string;
    description: string;
    startBtn: string;
    enterHint: string;
    controlsLine: string;
  };
  settings: {
    title: string;
    subtitle: string;
    languageTitle: string;
    onlineTitle: string;
    statusConnected: (count: number) => string;
    statusConnecting: string;
    statusError: string;
    statusOffline: string;
    playerNameLabel: string;
    roomLabel: string;
    playOnline: string;
    disconnectOnline: string;
    playersInRoom: (room: string) => string;
    youTag: string;
    sensitivityLabel: string;
    cameraLabel: string;
    weatherLabel: string;
    soundOn: string;
    soundOff: string;
    touchOn: string;
    touchOff: string;
    close: string;
  };
  hud: {
    radarLabel: string;
    wideLabel: string;
    openFullMap: string;
    zoomRadar: string;
    legendShop: string;
    legendClothing: string;
    legendBarber: string;
    legendTarget: string;
    legendMission: string;
    legendSpray: string;
    freeRoamTitle: string;
    freeRoamObjective: string;
    getContract: (index: number, total: number) => string;
    evadeLabel: (pct: number) => string;
    heliLabel: string;
    roadblockLabel: string;
    wantedLabel: string;
    settingsOnline: string;
    onlineBadge: (count: number) => string;
    connectingBadge: string;
    pauseLabel: string;
    stateDriving: string;
    stateAim: string;
    stateOnFoot: string;
    meleeLabel: string;
    reloadingLabel: (pct: number) => string;
    hideChat: string;
    showChat: (count: number) => string;
    chatEmpty: (room: string) => string;
    chatPlaceholder: string;
    sendChat: string;
    bustedWarning: string;
    nitro: string;
    damage: string;
    vehicleControls: string;
    reloadBtn: string;
    holsterBtn: string;
    dropBtn: string;
    aimHint: string;
  };
  modals: {
    paused: string;
    wasted: string;
    busted: string;
    wastedSub: string;
    bustedSub: string;
    cash: string;
    completedContracts: string;
    vehiclesHijacked: string;
    rampBonus: string;
    ctrlMove: string;
    ctrlMoveVal: string;
    ctrlAim: string;
    ctrlAimVal: string;
    ctrlFire: string;
    ctrlFireVal: string;
    ctrlGear: string;
    ctrlGearVal: string;
    ctrlVehicle: string;
    ctrlVehicleVal: string;
    ctrlMisc: string;
    ctrlMiscVal: string;
    resume: string;
    settingsOnline: string;
    restart: string;
    playAgain: string;
  };
  map: {
    title: string;
    subtitle: string;
    close: string;
    landmarksTitle: string;
    shopTitle: string;
    shopDesc: string;
    clothingTitle: string;
    clothingDesc: string;
    barberTitle: string;
    barberDesc: string;
    hubTitle: string;
    hubDesc: string;
    activeTargetDesc: string;
    sprayTitle: string;
    sprayDesc: string;
    pierTitle: string;
    pierDesc: string;
    legendPlayer: string;
    legendPolice: string;
    legendGang: string;
  };
  shop: {
    subtitle: string;
    exitAria: string;
    equipped: string;
    owned: string;
    statDamage: string;
    statMelee: string;
    statMag: string;
    statRange: string;
    meleeNote: string;
    ammoNote: (mag: number, reserve: number, total: number) => string;
    selected: string;
    equip: string;
    buy: (price: number) => string;
    armorTitle: string;
    healthTitle: string;
    current: (val: number, max: number) => string;
    exitBtn: string;
  };
  clothing: {
    title: string;
    subtitle: string;
    exitAria: string;
    outfitsTitle: string;
    equipped: string;
    owned: string;
    selected: string;
    equip: string;
    buy: (price: number) => string;
    sunglassesTitle: string;
    sunglassesOn: string;
    sunglassesOff: string;
    exitBtn: string;
    outfits: Record<OutfitId, { name: string; desc: string }>;
  };
  barber: {
    title: string;
    subtitle: string;
    exitAria: string;
    hairStyleTitle: string;
    hairColorTitle: string;
    beardStyleTitle: string;
    equipped: string;
    owned: string;
    selected: string;
    equip: string;
    buy: (price: number) => string;
    exitBtn: string;
    hairStyles: Record<HairStyleId, string>;
    hairColors: Record<HairColorId, string>;
    beardStyles: Record<BeardStyleId, string>;
  };
  touch: {
    steerHint: string;
    moveHint: string;
    shop: string;
    clothing: string;
    barber: string;
    map: string;
    contract: string;
    holster: string;
    drop: string;
    exitCar: string;
    enterCar: string;
    drift: string;
    nitro: string;
    brake: string;
    reverse: string;
    gas: string;
    aim: string;
    sprint: string;
    jump: string;
    hit: string;
    slash: string;
    fire: string;
  };
  engine: {
    welcomeToast: (name: string) => string;
    weatherToasts: Record<WeatherType, string>;
    offlineToast: string;
    onlineConnectedToast: (room: string) => string;
    playerJoinedToast: (name: string) => string;
    playerLeftToast: (name: string) => string;
    shotByPlayerToast: (name: string) => string;
    cameraToast: (label: string) => string;
    sprayToast: string;
    sprayPrompt: string;
    shopPrompt: string;
    clothingPrompt: string;
    barberPrompt: string;
    enterCarPrompt: (carLabel: string) => string;
    noWeaponToast: string;
    holsterToast: string;
    noEquipWeaponToast: string;
    equippedToast: (shortName: string) => string;
    noDropWeaponToast: string;
    droppedToast: (shortName: string) => string;
    noAmmoToast: string;
    insufficientFundsToast: (price: number) => string;
    boughtToast: (name: string) => string;
    buyWeaponFirstToast: string;
    ammoAddedToast: (shortName: string, pack: number) => string;
    armorFullToast: string;
    armorBoughtToast: string;
    healthFullToast: string;
    healthBoughtToast: string;
    outOfAmmoToast: string;
    stuntBonusToast: (bonus: number) => string;
    evadedToast: (name: string) => string;
    gamepadConnectedToast: (name: string) => string;
    gamepadDisconnectedToast: string;
    outfitEquippedToast: (name: string) => string;
    outfitBoughtToast: (name: string) => string;
    sunglassesOnToast: string;
    sunglassesOffToast: string;
    hairEquippedToast: (name: string) => string;
    hairBoughtToast: (name: string) => string;
    hairColorToast: (name: string) => string;
    beardEquippedToast: (name: string) => string;
    beardBoughtToast: (name: string) => string;
  };
  gamepad: {
    title: string;
    connected: string;
    waiting: string;
    hapticsOn: string;
    hapticsOff: string;
    controlsSummary: string;
  };
  pwa: {
    installApp: string;
    installIOS: string;
    iosTitle: string;
    iosStep1: string;
    iosStep2: string;
    offlineBanner: string;
    close: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationSet> = {
  tr: {
    weapons: {
      unarmed: { name: 'Silahsız (Yumruk)', shortName: 'Yumruk' },
      knife: { name: 'Komando Bıçağı', shortName: 'Bıçak' },
      pistol: { name: '9mm Tabanca', shortName: 'Tabanca' },
      smg: { name: 'MP-7 Makineli', shortName: 'MP-7' },
      shotgun: { name: 'Pompalı Tüfek', shortName: 'Pompalı' },
      rifle: { name: 'M4 Taktik Tüfek', shortName: 'M4' },
    },
    cameraModes: ['Yakın', 'Geniş', 'Sinematik'],
    weather: { sunny: 'Güneşli', rainy: 'Yağmurlu', foggy: 'Sisli' },
    title: {
      tagline: 'SOLARIS BAY // OPEN DISTRICT 3D',
      settingsBtn: 'Ayarlar',
      settingsHeroBtn: 'Ayarlar',
      soundOn: 'Ses Açık',
      soundOff: 'Sessiz',
      description:
        'Frank ile gün batımında Solaris Bay sokaklarında yüksel. Araç gasp et, 5 yıldızlı polis helikopterlerinden kaç, rampa akrobasisi yap ve 6 hikaye görevini tamamla.',
      startBtn: 'Oyuna Başla',
      enterHint: '[Enter] veya [Boşluk]',
      controlsLine:
        'PC: WASD Hareket · F Araç Bin/İn · Sol Tık Ateş · Shift Depar/Nitro · Mobil/Tablet: Ekran Çubuğu & Kaydırarak Kamera',
    },
    settings: {
      title: 'AYARLAR',
      subtitle: 'THEFT AT SOLARIS // DİL, KAMERA VE KONTROL AYARLARI',
      languageTitle: 'Oyun Dili',
      onlineTitle: 'Online Çok Oyunculu',
      statusConnected: (count) => `Çevrimiçi • ${count} Oyuncu`,
      statusConnecting: 'Bağlanıyor...',
      statusError: 'Bağlantı Hatası',
      statusOffline: 'Çevrimdışı',
      playerNameLabel: 'Oyuncu Adı',
      roomLabel: 'Sunucu Odası',
      playOnline: 'Online Oyna',
      disconnectOnline: 'Online Bağlantıyı Kes',
      playersInRoom: (room) => `Odadaki Oyuncular (${room}):`,
      youTag: '(Sen)',
      sensitivityLabel: 'Fare Bakış Hassasiyeti',
      cameraLabel: 'Kamera Mesafesi',
      weatherLabel: 'Hava Durumu',
      soundOn: 'Ses Açık',
      soundOff: 'Ses Kapalı',
      touchOn: 'Dokunmatik Açık',
      touchOff: 'Dokunmatik Kapalı',
      close: 'Kapat',
    },
    hud: {
      radarLabel: 'RADAR',
      wideLabel: 'GENİŞ',
      openFullMap: 'Tam Harita [TAB]',
      zoomRadar: 'Radar Yakınlaştırma',
      legendShop: 'Silahçı',
      legendClothing: 'Kıyafetçi',
      legendBarber: 'Berber',
      legendTarget: 'Hedef',
      legendMission: 'Görev',
      legendSpray: 'Boyahane',
      freeRoamTitle: 'Serbest Dolaşım',
      freeRoamObjective: 'Kontrat başlat: Palmiye Meydanı işaretine git veya [M] bas',
      getContract: (i, t) => `GÖREV AL (${i}/${t})`,
      evadeLabel: (pct) => `KAÇIŞ %${pct}`,
      heliLabel: 'HELİ',
      roadblockLabel: 'BARİKAT',
      wantedLabel: 'ARANMA',
      settingsOnline: 'Ayarlar / Online',
      onlineBadge: (count) => `ONLINE (${count})`,
      connectingBadge: 'BAĞLANIYOR',
      pauseLabel: 'Duraklat',
      stateDriving: 'SÜRÜŞTE',
      stateAim: 'NİŞAN',
      stateOnFoot: 'YAYA',
      meleeLabel: 'YAKIN',
      reloadingLabel: (pct) => `DOLUYOR %${pct}`,
      hideChat: 'Sohbeti Gizle',
      showChat: (count) => `Online Sohbet (${count})`,
      chatEmpty: (room) => `Oda: ${room} — Henüz mesaj yok.`,
      chatPlaceholder: 'Mesaj yaz...',
      sendChat: 'Mesaj Gönder',
      bustedWarning: 'TUTUKLANMA RİSKİ — KAÇ!',
      nitro: 'NİTRO',
      damage: 'HASAR',
      vehicleControls: '[F] İn · [Shift] Nitro · [Boşluk] Drift · [H] Korna',
      reloadBtn: '[R] Şarjör',
      holsterBtn: '[X] Kılıf',
      dropBtn: '[G] Bırak',
      aimHint: '[Sağ Tık / V] Nişan',
    },
    modals: {
      paused: 'DURAKLATILDI',
      wasted: 'FRANK HASTANELİK',
      busted: 'FRANK TUTUKLANDI',
      wastedSub: 'WASTED — SAĞLIK TÜKENDİ',
      bustedSub: 'BUSTED — POLİS TARAFINDAN YAKALANDIN',
      cash: 'Nakit',
      completedContracts: 'Tamamlanan Kontrat',
      vehiclesHijacked: 'Gasp Edilen Araç',
      rampBonus: 'Rampa Bonusu',
      ctrlMove: 'Hareket / Sürüş',
      ctrlMoveVal: 'WASD / Ok Tuşları',
      ctrlAim: 'Nişan Al / Etrafa Bak',
      ctrlAimVal: 'Sağ Tık (veya V) / Fare / Q-E',
      ctrlFire: 'Ateş / Şarjör / Silahlar',
      ctrlFireVal: 'Sol Tık (J) / R / 0-5',
      ctrlGear: 'Kılıf / Yere Bırak / Mağaza',
      ctrlGearVal: 'X / G / B (Solaris Arms)',
      ctrlVehicle: 'Araç Bin-İn / Nitro / Drift',
      ctrlVehicleVal: 'F / Shift / Boşluk',
      ctrlMisc: 'Yeni Kontrat / Kamera / Harita',
      ctrlMiscVal: 'M Tuşu / C Tuşu / Tab',
      resume: 'Devam Et',
      settingsOnline: 'Ayarlar / Online',
      restart: 'Yeniden Başlat',
      playAgain: 'Tekrar Oyna',
    },
    map: {
      title: 'Solaris Bay — Şehir Haritası',
      subtitle: 'Silahçı, Görev Merkezi, Boyahane, Solaris Dağları ve Aktif Hedefler',
      close: 'Kapat [TAB / ESC]',
      landmarksTitle: 'Önemli Noktalar & Mesafeler',
      shopTitle: 'Silahçı (Solaris Arms)',
      shopDesc: 'Silah, mermi ve çelik yelek',
      clothingTitle: 'Kıyafetçi (Solaris Style)',
      clothingDesc: 'Ceket, takım elbise ve gözlük',
      barberTitle: 'Berber (Solaris Cuts)',
      barberDesc: 'Saç kesimi, boya ve sakal tıraşı',
      hubTitle: 'Görev Merkezi',
      hubDesc: 'Palmiye Meydanı kontrat noktası',
      activeTargetDesc: 'Aktif görev hedefi',
      sprayTitle: 'Polis Boyahanesi',
      sprayDesc: '$200 ile aranmayı sıfırla',
      pierTitle: 'Solaris İskelesi',
      pierDesc: 'Batı sahili & teslimat noktası',
      legendPlayer: 'Oyuncu (Mevcut Konum & Yön)',
      legendPolice: 'Polis Devriyesi',
      legendGang: 'Çete Hedefleri',
    },
    shop: {
      subtitle: 'SİLAH, CEPHANE & EKİPMAN MAĞAZASI',
      exitAria: 'Mağazadan Çık',
      equipped: 'KUŞANILDI',
      owned: 'SAHİP',
      statDamage: 'Hasar',
      statMelee: 'Tip: Yakın',
      statMag: 'Şarjör',
      statRange: 'Menzil',
      meleeNote: 'Cephaneye gerek yok · Sınırsız yakın dövüş',
      ammoNote: (mag, res, tot) => `Mevcut Mermi: ${mag} / ${res} (Toplam ${tot})`,
      selected: 'Seçili',
      equip: 'Kuşan',
      buy: (price) => `Satın Al · $${price}`,
      armorTitle: 'Çelik Yelek (+50)',
      healthTitle: 'İlk Yardım Kiti (+50)',
      current: (val, max) => `Mevcut: ${val}/${max}`,
      exitBtn: 'Mağazadan Çık [ESC]',
    },
    clothing: {
      title: 'SOLARIS STYLE',
      subtitle: 'KIYAFET, TAKIM ELBİSE & AKSESUAR BUTİĞİ',
      exitAria: 'Kıyafetçiden Çık',
      outfitsTitle: 'Kıyafet Kombinleri',
      equipped: 'GİYİLİYOR',
      owned: 'DOLAPTA',
      selected: 'Giyiliyor',
      equip: 'Giy',
      buy: (price) => `Satın Al · $${price}`,
      sunglassesTitle: 'Güneş Gözlüğü',
      sunglassesOn: 'Gözlük Takılı (Çıkar)',
      sunglassesOff: 'Gözlük Çıkarıldı (Tak)',
      exitBtn: 'Butikten Çık [ESC]',
      outfits: {
        biker: { name: 'Gece Sürücüsü', desc: 'Siyah deri ceket, turkuaz tişört ve koyu kot' },
        miami: { name: 'Solaris Beyazı', desc: 'Açık keten ceket, neon mercan tişört ve bej pantolon' },
        tuxedo: { name: 'VIP Smokin', desc: 'Keskin siyah takım, beyaz gömlek ve klasik rugan' },
        street: { name: 'Neon Sokak', desc: 'Mor bomber ceket, altın tişört ve kırmızı sneaker' },
        tactical: { name: 'Taktik Operasyon', desc: 'Zeytin yeşili zırhlı ceket ve komando pantolonu' },
        gold: { name: 'Bordo Patron', desc: 'Bordo deri ceket, siyah gömlek ve altın taban' },
      },
    },
    barber: {
      title: 'SOLARIS CUTS',
      subtitle: 'BERBER, SAÇ TASARIMI & SAKAL TIRAŞI SALONU',
      exitAria: 'Berberden Çık',
      hairStyleTitle: 'Saç Modelleri',
      hairColorTitle: 'Saç & Sakal Rengi',
      beardStyleTitle: 'Sakal & Tıraş',
      equipped: 'SEÇİLİ',
      owned: 'AÇIK',
      selected: 'Kullanılıyor',
      equip: 'Uygula',
      buy: (price) => `Tıraş Ol · $${price}`,
      exitBtn: 'Berberden Çık [ESC]',
      hairStyles: {
        pompadour: 'Klasik Pompadour',
        buzz: '3 Numara Kısa',
        fade: 'Kutu Fade Kesim',
        slick: 'Arkaya Taralı',
        afro: 'Hacimli Afro',
        bald: 'Tam Kazıtma (Kel)',
      },
      hairColors: {
        black: 'Kuzgun Siyah',
        brown: 'Kestane Kahve',
        blonde: 'Güneş Sarısı',
        red: 'Ateş Kızılı',
        silver: 'Gümüş Platin',
        neon: 'Solaris Turkuaz',
      },
      beardStyles: {
        stubble: 'Kirli Sakal',
        clean: 'Sinekkaydı Tıraş',
        goatee: 'Keçi Sakal & Bıyık',
        full: 'Dolgun Tam Sakal',
      },
    },
    touch: {
      steerHint: 'Sol / Sağ Direksiyon',
      moveHint: 'Hareket',
      shop: 'Silahçı',
      clothing: 'Kıyafet',
      barber: 'Berber',
      map: 'Harita',
      contract: 'Kontrat',
      holster: 'Kılıf',
      drop: 'Bırak',
      exitCar: 'İn',
      enterCar: 'Araca Bin',
      drift: 'Drift',
      nitro: 'Nitro',
      brake: 'Fren',
      reverse: 'Geri',
      gas: 'Gaz',
      aim: 'Nişan',
      sprint: 'Depar',
      jump: 'Zıpla',
      hit: 'Vur',
      slash: 'Kes',
      fire: 'Ateş',
    },
    engine: {
      welcomeToast: (name) => `Hoş geldin ${name}! Araca bin [F] veya ilk görevi al [M]`,
      weatherToasts: {
        sunny: 'Hava Durumu: Güneşli — Kuru asfalt ve net görüş!',
        rainy: 'Hava Durumu: Yağmurlu — Islak asfaltta yol tutuşu azaldı!',
        foggy: 'Hava Durumu: Sisli — Görüş mesafesi düştü, zemin nemli!',
      },
      offlineToast: 'Çevrimdışı (Tek Oyunculu) moda geçildi.',
      onlineConnectedToast: (room) => `Online Oda Bağlandı (${room})!`,
      playerJoinedToast: (name) => `${name} Solaris Bay'a katıldı!`,
      playerLeftToast: (name) => `${name} oyundan ayrıldı.`,
      shotByPlayerToast: (name) => `${name} sana ateş açtı!`,
      cameraToast: (label) => `Kamera: ${label}`,
      sprayToast: 'Boyahane: Aranma Sıfırlandı & Araç Onarıldı (-$200)',
      sprayPrompt: 'Polis Boyahanesi — İçeri Gir ($200)',
      shopPrompt: '[B] Solaris Arms Silah Mağazasına Gir',
      clothingPrompt: '[B] Solaris Style Kıyafet Mağazasına Gir',
      barberPrompt: '[B] Solaris Cuts Berber Salonuna Gir',
      enterCarPrompt: (carLabel) => `[F] ${carLabel} Aracına Bin`,
      noWeaponToast: 'Bu silaha sahip değilsin! Solaris Arms [B] mağazasından alabilirsin.',
      holsterToast: 'Silah kılıfa kondu (Yumruk Modu)',
      noEquipWeaponToast: 'Elinde kuşanacak silah yok!',
      equippedToast: (shortName) => `${shortName} kuşanıldı`,
      noDropWeaponToast: 'Elinde bırakacak silah yok.',
      droppedToast: (shortName) => `${shortName} yere bırakıldı`,
      noAmmoToast: 'Yedek mermi yok! Silahçıdan cephane al.',
      insufficientFundsToast: (price) => `Yetersiz bakiye! ($${price} gerekli)`,
      boughtToast: (name) => `${name} satın alındı!`,
      buyWeaponFirstToast: 'Önce silahı satın almalısın!',
      ammoAddedToast: (shortName, pack) => `${shortName}: +${pack} mermi eklendi`,
      armorFullToast: 'Çelik yelek zaten dolu!',
      armorBoughtToast: '+50 Çelik Yelek alındı',
      healthFullToast: 'Sağlık zaten tam!',
      healthBoughtToast: '+50 İlk Yardım Paketi alındı',
      outOfAmmoToast: 'Mermi bitti! Silahçıdan [B] cephane al.',
      stuntBonusToast: (bonus) => `Havada Kalma Bonusu! +$${bonus}`,
      evadedToast: (name) => `${name} polis takibinden kurtuldu!`,
      gamepadConnectedToast: (name) => `${name} kontrolcüsü bağlandı!`,
      gamepadDisconnectedToast: 'Kontrolcü bağlantısı kesildi.',
      outfitEquippedToast: (name) => `${name} kıyafeti giyildi`,
      outfitBoughtToast: (name) => `${name} satın alındı ve giyildi!`,
      sunglassesOnToast: 'Güneş gözlüğü takıldı',
      sunglassesOffToast: 'Güneş gözlüğü çıkarıldı',
      hairEquippedToast: (name) => `Saç modeli uygulandı: ${name}`,
      hairBoughtToast: (name) => `Yeni saç kesimi: ${name}!`,
      hairColorToast: (name) => `Saç/Sakal rengi değişti: ${name}`,
      beardEquippedToast: (name) => `Sakal stili uygulandı: ${name}`,
      beardBoughtToast: (name) => `Yeni tıraş tamamlandı: ${name}!`,
    },
    gamepad: {
      title: 'PS5 DualSense / Kontrolcü',
      connected: 'Bağlı',
      waiting: 'USB / Bluetooth ile bağlayıp bir tuşa basın',
      hapticsOn: 'Titreşim Açık',
      hapticsOff: 'Titreşim Kapalı',
      controlsSummary:
        'LS: Hareket · RS: Kamera · L2/R2: Nişan/Ateş (Fren/Gaz) · △: Araç · ×: Zıpla/Nitro · □: Şarjör/Drift · R1: Silah · L1: Kılıf/Korna · Touchpad: Harita',
    },
    pwa: {
      installApp: 'Uygulamayı Yükle',
      installIOS: 'Ana Ekrana Ekle (iOS)',
      iosTitle: 'iPhone / iPad Kurulumu',
      iosStep1: '1. Safari alt çubuğundaki Paylaş simgesine dokunun.',
      iosStep2: '2. Aşağı kaydırıp "Ana Ekrana Ekle" seçeneğine dokunun.',
      offlineBanner: 'Çevrimdışı Mod — Önbellekteki oyun verileri kullanılıyor.',
      close: 'Kapat',
    },
  },

  en: {
    weapons: {
      unarmed: { name: 'Unarmed (Fists)', shortName: 'Fists' },
      knife: { name: 'Combat Knife', shortName: 'Knife' },
      pistol: { name: '9mm Pistol', shortName: 'Pistol' },
      smg: { name: 'MP-7 SMG', shortName: 'MP-7' },
      shotgun: { name: 'Pump Shotgun', shortName: 'Shotgun' },
      rifle: { name: 'M4 Tactical Rifle', shortName: 'M4' },
    },
    cameraModes: ['Near', 'Wide', 'Cinematic'],
    weather: { sunny: 'Sunny', rainy: 'Rainy', foggy: 'Foggy' },
    title: {
      tagline: 'SOLARIS BAY // OPEN DISTRICT 3D',
      settingsBtn: 'Settings',
      settingsHeroBtn: 'Settings',
      soundOn: 'Sound On',
      soundOff: 'Muted',
      description:
        'Rise through the sunset streets of Solaris Bay as Frank. Hijack rides, evade 5-star police choppers, hit ramp stunts, and complete 6 story contracts.',
      startBtn: 'Start Game',
      enterHint: '[Enter] or [Space]',
      controlsLine:
        'PC: WASD Move · F Enter/Exit · Left Click Fire · Shift Sprint/Nitro · Mobile/Tablet: On-Screen Stick & Drag Camera',
    },
    settings: {
      title: 'SETTINGS',
      subtitle: 'THEFT AT SOLARIS // LANGUAGE, CAMERA & CONTROLS',
      languageTitle: 'Game Language',
      onlineTitle: 'Online Multiplayer',
      statusConnected: (count) => `Online • ${count} Players`,
      statusConnecting: 'Connecting...',
      statusError: 'Connection Error',
      statusOffline: 'Offline',
      playerNameLabel: 'Player Name',
      roomLabel: 'Server Room',
      playOnline: 'Play Online',
      disconnectOnline: 'Disconnect Online',
      playersInRoom: (room) => `Players in Room (${room}):`,
      youTag: '(You)',
      sensitivityLabel: 'Mouse Look Sensitivity',
      cameraLabel: 'Camera Distance',
      weatherLabel: 'Weather',
      soundOn: 'Sound On',
      soundOff: 'Sound Off',
      touchOn: 'Touch Controls On',
      touchOff: 'Touch Controls Off',
      close: 'Close',
    },
    hud: {
      radarLabel: 'RADAR',
      wideLabel: 'WIDE',
      openFullMap: 'Full Map [TAB]',
      zoomRadar: 'Zoom Radar',
      legendShop: 'Gun Shop',
      legendClothing: 'Clothing',
      legendBarber: 'Barber',
      legendTarget: 'Target',
      legendMission: 'Mission',
      legendSpray: 'Pay-n-Spray',
      freeRoamTitle: 'Free Roam',
      freeRoamObjective: 'Start a contract: Head to Palm Plaza marker or press [M]',
      getContract: (i, t) => `CONTRACT (${i}/${t})`,
      evadeLabel: (pct) => `EVADE ${pct}%`,
      heliLabel: 'CHOPPER',
      roadblockLabel: 'BLOCK',
      wantedLabel: 'WANTED',
      settingsOnline: 'Settings & Online',
      onlineBadge: (count) => `ONLINE (${count})`,
      connectingBadge: 'CONNECTING',
      pauseLabel: 'Pause',
      stateDriving: 'DRIVING',
      stateAim: 'AIMING',
      stateOnFoot: 'ON FOOT',
      meleeLabel: 'MELEE',
      reloadingLabel: (pct) => `RELOAD ${pct}%`,
      hideChat: 'Hide Chat',
      showChat: (count) => `Online Chat (${count})`,
      chatEmpty: (room) => `Room: ${room} — No messages yet.`,
      chatPlaceholder: 'Type a message...',
      sendChat: 'Send Message',
      bustedWarning: 'BUSTED RISK — RUN!',
      nitro: 'NITRO',
      damage: 'ARMOR',
      vehicleControls: '[F] Exit · [Shift] Nitro · [Space] Drift · [H] Horn',
      reloadBtn: '[R] Reload',
      holsterBtn: '[X] Holster',
      dropBtn: '[G] Drop',
      aimHint: '[Right Click / V] Aim',
    },
    modals: {
      paused: 'PAUSED',
      wasted: 'WASTED',
      busted: 'BUSTED',
      wastedSub: 'WASTED — HEALTH DEPLETED',
      bustedSub: 'BUSTED — CAUGHT BY THE POLICE',
      cash: 'Cash',
      completedContracts: 'Contracts Completed',
      vehiclesHijacked: 'Vehicles Hijacked',
      rampBonus: 'Stunt Bonus',
      ctrlMove: 'Move / Drive',
      ctrlMoveVal: 'WASD / Arrow Keys',
      ctrlAim: 'Aim / Look Around',
      ctrlAimVal: 'Right Click (or V) / Mouse / Q-E',
      ctrlFire: 'Fire / Reload / Weapons',
      ctrlFireVal: 'Left Click (J) / R / 0-5',
      ctrlGear: 'Holster / Drop / Gun Shop',
      ctrlGearVal: 'X / G / B (Solaris Arms)',
      ctrlVehicle: 'Enter-Exit / Nitro / Drift',
      ctrlVehicleVal: 'F / Shift / Space',
      ctrlMisc: 'Contract / Camera / Map',
      ctrlMiscVal: 'M Key / C Key / Tab',
      resume: 'Resume',
      settingsOnline: 'Settings & Online',
      restart: 'Restart',
      playAgain: 'Play Again',
    },
    map: {
      title: 'Solaris Bay — City Map',
      subtitle: 'Gun Shop, Mission Hub, Spray Shop, Solaris Peaks & Active Targets',
      close: 'Close [TAB / ESC]',
      landmarksTitle: 'Landmarks & Distances',
      shopTitle: 'Gun Shop (Solaris Arms)',
      shopDesc: 'Weapons, ammo and body armor',
      clothingTitle: 'Clothing Store (Solaris Style)',
      clothingDesc: 'Jackets, suits and sunglasses',
      barberTitle: 'Barber Shop (Solaris Cuts)',
      barberDesc: 'Haircuts, dye and beard shave',
      hubTitle: 'Mission Hub',
      hubDesc: 'Palm Plaza contract point',
      activeTargetDesc: 'Active mission target',
      sprayTitle: 'Police Spray Shop',
      sprayDesc: 'Clear wanted stars for $200',
      pierTitle: 'Solaris Pier',
      pierDesc: 'West coast & drop-off point',
      legendPlayer: 'Player (Position & Heading)',
      legendPolice: 'Police Patrol',
      legendGang: 'Gang Targets',
    },
    shop: {
      subtitle: 'WEAPONS, AMMO & TACTICAL GEAR',
      exitAria: 'Exit Shop',
      equipped: 'EQUIPPED',
      owned: 'OWNED',
      statDamage: 'Damage',
      statMelee: 'Type: Melee',
      statMag: 'Mag',
      statRange: 'Range',
      meleeNote: 'No ammo needed · Unlimited melee',
      ammoNote: (mag, res, tot) => `Ammo: ${mag} / ${res} (Total ${tot})`,
      selected: 'Equipped',
      equip: 'Equip',
      buy: (price) => `Buy · $${price}`,
      armorTitle: 'Body Armor (+50)',
      healthTitle: 'First Aid Kit (+50)',
      current: (val, max) => `Current: ${val}/${max}`,
      exitBtn: 'Exit Shop [ESC]',
    },
    clothing: {
      title: 'SOLARIS STYLE',
      subtitle: 'CLOTHING, SUITS & FASHION BOUTIQUE',
      exitAria: 'Exit Clothing Store',
      outfitsTitle: 'Outfits & Styles',
      equipped: 'WEARING',
      owned: 'OWNED',
      selected: 'Wearing',
      equip: 'Wear',
      buy: (price) => `Buy · $${price}`,
      sunglassesTitle: 'Sunglasses',
      sunglassesOn: 'Wearing Shades (Remove)',
      sunglassesOff: 'No Shades (Put On)',
      exitBtn: 'Exit Boutique [ESC]',
      outfits: {
        biker: { name: 'Night Rider', desc: 'Black leather jacket, teal tee and dark denim' },
        miami: { name: 'Solaris White', desc: 'Crisp linen blazer, coral tee and sand chinos' },
        tuxedo: { name: 'VIP Tuxedo', desc: 'Tailored black suit, white shirt and dress shoes' },
        street: { name: 'Neon Street', desc: 'Violet bomber jacket, gold tee and red kicks' },
        tactical: { name: 'Spec Ops', desc: 'Olive armored jacket and tactical combat pants' },
        gold: { name: 'Crimson Boss', desc: 'Burgundy leather jacket with gold-sole kicks' },
      },
    },
    barber: {
      title: 'SOLARIS CUTS',
      subtitle: 'BARBER SHOP, HAIR STYLING & SHAVE',
      exitAria: 'Exit Barber Shop',
      hairStyleTitle: 'Hairstyles',
      hairColorTitle: 'Hair & Beard Color',
      beardStyleTitle: 'Beard & Shave',
      equipped: 'ACTIVE',
      owned: 'UNLOCKED',
      selected: 'Applied',
      equip: 'Apply',
      buy: (price) => `Style · $${price}`,
      exitBtn: 'Exit Barber [ESC]',
      hairStyles: {
        pompadour: 'Classic Pompadour',
        buzz: 'Buzz Cut',
        fade: 'High Top Fade',
        slick: 'Slick Back',
        afro: 'Full Afro',
        bald: 'Clean Shaved',
      },
      hairColors: {
        black: 'Jet Black',
        brown: 'Chestnut Brown',
        blonde: 'Solar Blonde',
        red: 'Crimson Red',
        silver: 'Platinum Silver',
        neon: 'Solaris Teal',
      },
      beardStyles: {
        stubble: 'Designer Stubble',
        clean: 'Clean Shave',
        goatee: 'Goatee & Mustache',
        full: 'Full Beard',
      },
    },
    touch: {
      steerHint: 'Left / Right Steer',
      moveHint: 'Move',
      shop: 'Shop',
      clothing: 'Clothes',
      barber: 'Barber',
      map: 'Map',
      contract: 'Mission',
      holster: 'Holster',
      drop: 'Drop',
      exitCar: 'Exit',
      enterCar: 'Enter Car',
      drift: 'Drift',
      nitro: 'Nitro',
      brake: 'Brake',
      reverse: 'Rev',
      gas: 'Gas',
      aim: 'Aim',
      sprint: 'Sprint',
      jump: 'Jump',
      hit: 'Punch',
      slash: 'Slash',
      fire: 'Fire',
    },
    engine: {
      welcomeToast: (name) => `Welcome ${name}! Enter a car [F] or take a contract [M]`,
      weatherToasts: {
        sunny: 'Weather: Sunny — Dry asphalt and clear visibility!',
        rainy: 'Weather: Rainy — Reduced grip on wet roads!',
        foggy: 'Weather: Foggy — Low visibility and damp asphalt!',
      },
      offlineToast: 'Switched to Offline (Single Player) mode.',
      onlineConnectedToast: (room) => `Connected to Online Room (${room})!`,
      playerJoinedToast: (name) => `${name} joined Solaris Bay!`,
      playerLeftToast: (name) => `${name} left the game.`,
      shotByPlayerToast: (name) => `${name} shot at you!`,
      cameraToast: (label) => `Camera: ${label}`,
      sprayToast: 'Spray Shop: Wanted Cleared & Car Repaired (-$200)',
      sprayPrompt: 'Police Spray Shop — Enter ($200)',
      shopPrompt: '[B] Enter Solaris Arms Gun Shop',
      clothingPrompt: '[B] Enter Solaris Style Clothing Store',
      barberPrompt: '[B] Enter Solaris Cuts Barber Shop',
      enterCarPrompt: (carLabel) => `[F] Enter ${carLabel}`,
      noWeaponToast: 'You do not own this weapon! Buy it at Solaris Arms [B].',
      holsterToast: 'Weapon holstered (Fists Mode)',
      noEquipWeaponToast: 'No weapon to equip!',
      equippedToast: (shortName) => `Equipped ${shortName}`,
      noDropWeaponToast: 'No weapon to drop.',
      droppedToast: (shortName) => `Dropped ${shortName}`,
      noAmmoToast: 'No reserve ammo! Buy more at the gun shop.',
      insufficientFundsToast: (price) => `Not enough cash! ($${price} required)`,
      boughtToast: (name) => `Purchased ${name}!`,
      buyWeaponFirstToast: 'Buy the weapon first!',
      ammoAddedToast: (shortName, pack) => `${shortName}: +${pack} rounds added`,
      armorFullToast: 'Body armor is already full!',
      armorBoughtToast: '+50 Body Armor equipped',
      healthFullToast: 'Health is already full!',
      healthBoughtToast: '+50 First Aid Kit used',
      outOfAmmoToast: 'Out of ammo! Visit Gun Shop [B].',
      stuntBonusToast: (bonus) => `Air Stunt Bonus! +$${bonus}`,
      evadedToast: (name) => `${name} evaded the police!`,
      gamepadConnectedToast: (name) => `${name} controller connected!`,
      gamepadDisconnectedToast: 'Controller disconnected.',
      outfitEquippedToast: (name) => `Wearing ${name}`,
      outfitBoughtToast: (name) => `Bought & equipped ${name}!`,
      sunglassesOnToast: 'Sunglasses equipped',
      sunglassesOffToast: 'Sunglasses removed',
      hairEquippedToast: (name) => `Hairstyle changed: ${name}`,
      hairBoughtToast: (name) => `Fresh haircut: ${name}!`,
      hairColorToast: (name) => `Hair/Beard color: ${name}`,
      beardEquippedToast: (name) => `Beard style applied: ${name}`,
      beardBoughtToast: (name) => `Fresh shave complete: ${name}!`,
    },
    gamepad: {
      title: 'PS5 DualSense / Controller',
      connected: 'Connected',
      waiting: 'Connect via USB / Bluetooth and press any button',
      hapticsOn: 'Haptics On',
      hapticsOff: 'Haptics Off',
      controlsSummary:
        'LS: Move · RS: Camera · L2/R2: Aim/Fire (Brake/Gas) · △: Car · ×: Jump/Nitro · □: Reload/Drift · R1: Weapon · L1: Holster/Horn · Touchpad: Map',
    },
    pwa: {
      installApp: 'Install App',
      installIOS: 'Install on iOS',
      iosTitle: 'Install on iPhone / iPad',
      iosStep1: '1. Tap the Share button in the Safari toolbar.',
      iosStep2: '2. Scroll down and tap "Add to Home Screen".',
      offlineBanner: 'Offline Mode — Cached game assets are in use.',
      close: 'Close',
    },
  },

  de: {
    weapons: {
      unarmed: { name: 'Unbewaffnet (Fäuste)', shortName: 'Fäuste' },
      knife: { name: 'Kampfmesser', shortName: 'Messer' },
      pistol: { name: '9mm Pistole', shortName: 'Pistole' },
      smg: { name: 'MP-7 Maschinenpistole', shortName: 'MP-7' },
      shotgun: { name: 'Schrotflinte', shortName: 'Schrot' },
      rifle: { name: 'M4 Taktikgewehr', shortName: 'M4' },
    },
    cameraModes: ['Nah', 'Weit', 'Kino'],
    weather: { sunny: 'Sonnig', rainy: 'Regnerisch', foggy: 'Neblig' },
    title: {
      tagline: 'SOLARIS BAY // OPEN DISTRICT 3D',
      settingsBtn: 'Einstellungen',
      settingsHeroBtn: 'Einstellungen',
      soundOn: 'Ton An',
      soundOff: 'Stumm',
      description:
        'Steige mit Frank bei Sonnenuntergang in Solaris Bay auf. Klau Autos, entkomme 5-Sterne-Polizeihubschraubern, mach Rampen-Stunts und schließe 6 Story-Aufträge ab.',
      startBtn: 'Spiel Starten',
      enterHint: '[Enter] oder [Leertaste]',
      controlsLine:
        'PC: WASD Bewegung · F Ein/Aussteigen · Linksklick Schießen · Shift Sprint/Nitro · Mobil: Joystick & Kamera ziehen',
    },
    settings: {
      title: 'EINSTELLUNGEN',
      subtitle: 'THEFT AT SOLARIS // SPRACHE, KAMERA & STEUERUNG',
      languageTitle: 'Spielsprache',
      onlineTitle: 'Online-Mehrspieler',
      statusConnected: (count) => `Online • ${count} Spieler`,
      statusConnecting: 'Verbinde...',
      statusError: 'Verbindungsfehler',
      statusOffline: 'Offline',
      playerNameLabel: 'Spielername',
      roomLabel: 'Serverraum',
      playOnline: 'Online Spielen',
      disconnectOnline: 'Online Trennen',
      playersInRoom: (room) => `Spieler im Raum (${room}):`,
      youTag: '(Du)',
      sensitivityLabel: 'Maus-Empfindlichkeit',
      cameraLabel: 'Kameradistanz',
      weatherLabel: 'Wetter',
      soundOn: 'Ton An',
      soundOff: 'Ton Aus',
      touchOn: 'Touch-Steuerung An',
      touchOff: 'Touch-Steuerung Aus',
      close: 'Schließen',
    },
    hud: {
      radarLabel: 'RADAR',
      wideLabel: 'WEIT',
      openFullMap: 'Stadtkarte [TAB]',
      zoomRadar: 'Radar-Zoom',
      legendShop: 'Waffenladen',
      legendClothing: 'Mode',
      legendBarber: 'Friseur',
      legendTarget: 'Ziel',
      legendMission: 'Mission',
      legendSpray: 'Lackiererei',
      freeRoamTitle: 'Freies Spiel',
      freeRoamObjective: 'Auftrag starten: Zum Palmenplatz-Symbol gehen oder [M] drücken',
      getContract: (i, t) => `AUFTRAG (${i}/${t})`,
      evadeLabel: (pct) => `FLUCHT ${pct}%`,
      heliLabel: 'HELI',
      roadblockLabel: 'SPERRE',
      wantedLabel: 'GESUCHT',
      settingsOnline: 'Einstellungen & Online',
      onlineBadge: (count) => `ONLINE (${count})`,
      connectingBadge: 'VERBINDET',
      pauseLabel: 'Pause',
      stateDriving: 'FAHREN',
      stateAim: 'ZIELEN',
      stateOnFoot: 'ZU FUSS',
      meleeLabel: 'NAHKAMPF',
      reloadingLabel: (pct) => `LADEN ${pct}%`,
      hideChat: 'Chat ausblenden',
      showChat: (count) => `Online-Chat (${count})`,
      chatEmpty: (room) => `Raum: ${room} — Noch keine Nachrichten.`,
      chatPlaceholder: 'Nachricht schreiben...',
      sendChat: 'Senden',
      bustedWarning: 'VERHAFTUNGSGEFAHR — LAUF!',
      nitro: 'NITRO',
      damage: 'ZUSTAND',
      vehicleControls: '[F] Aussteigen · [Shift] Nitro · [Leertaste] Drift · [H] Hupe',
      reloadBtn: '[R] Nachladen',
      holsterBtn: '[X] Wegstecken',
      dropBtn: '[G] Ablegen',
      aimHint: '[Rechtsklick / V] Zielen',
    },
    modals: {
      paused: 'PAUSIERT',
      wasted: 'AUSSER GEFECHT',
      busted: 'VERHAFTET',
      wastedSub: 'WASTED — GESUNDHEIT AUFGEBRAUCHT',
      bustedSub: 'BUSTED — VON DER POLIZEI GEFASST',
      cash: 'Bargeld',
      completedContracts: 'Erledigte Aufträge',
      vehiclesHijacked: 'Geklaute Fahrzeuge',
      rampBonus: 'Rampen-Bonus',
      ctrlMove: 'Bewegen / Fahren',
      ctrlMoveVal: 'WASD / Pfeiltasten',
      ctrlAim: 'Zielen / Umschauen',
      ctrlAimVal: 'Rechtsklick (oder V) / Maus / Q-E',
      ctrlFire: 'Schießen / Nachladen / Waffen',
      ctrlFireVal: 'Linksklick (J) / R / 0-5',
      ctrlGear: 'Wegstecken / Ablegen / Laden',
      ctrlGearVal: 'X / G / B (Solaris Arms)',
      ctrlVehicle: 'Ein-Aussteigen / Nitro / Drift',
      ctrlVehicleVal: 'F / Shift / Leertaste',
      ctrlMisc: 'Auftrag / Kamera / Karte',
      ctrlMiscVal: 'M-Taste / C-Taste / Tab',
      resume: 'Fortsetzen',
      settingsOnline: 'Einstellungen & Online',
      restart: 'Neu Starten',
      playAgain: 'Nochmal Spielen',
    },
    map: {
      title: 'Solaris Bay — Stadtkarte',
      subtitle: 'Waffenladen, Auftragszentrum, Lackiererei, Solaris-Berge & Ziele',
      close: 'Schließen [TAB / ESC]',
      landmarksTitle: 'Wichtige Orte & Distanzen',
      shopTitle: 'Waffenladen (Solaris Arms)',
      shopDesc: 'Waffen, Munition & Schutzweste',
      clothingTitle: 'Bekleidung (Solaris Style)',
      clothingDesc: 'Jacken, Anzüge & Sonnenbrillen',
      barberTitle: 'Friseur (Solaris Cuts)',
      barberDesc: 'Haarschnitte, Farbe & Bartrasur',
      hubTitle: 'Auftragszentrum',
      hubDesc: 'Palmenplatz-Auftragspunkt',
      activeTargetDesc: 'Aktives Missionsziel',
      sprayTitle: 'Polizei-Lackiererei',
      sprayDesc: 'Fahndung für $200 löschen',
      pierTitle: 'Solaris-Pier',
      pierDesc: 'Westküste & Lieferpunkt',
      legendPlayer: 'Spieler (Position & Richtung)',
      legendPolice: 'Polizeistreife',
      legendGang: 'Gang-Ziele',
    },
    shop: {
      subtitle: 'WAFFEN, MUNITION & AUSRÜSTUNG',
      exitAria: 'Laden verlassen',
      equipped: 'AUSGERÜSTET',
      owned: 'IM BESITZ',
      statDamage: 'Schaden',
      statMelee: 'Typ: Nahkampf',
      statMag: 'Magazin',
      statRange: 'Reichweite',
      meleeNote: 'Keine Munition nötig · Unbegrenzter Nahkampf',
      ammoNote: (mag, res, tot) => `Munition: ${mag} / ${res} (Gesamt ${tot})`,
      selected: 'Aktiv',
      equip: 'Ausrüsten',
      buy: (price) => `Kaufen · $${price}`,
      armorTitle: 'Schutzweste (+50)',
      healthTitle: 'Erste-Hilfe-Set (+50)',
      current: (val, max) => `Aktuell: ${val}/${max}`,
      exitBtn: 'Laden Verlassen [ESC]',
    },
    clothing: {
      title: 'SOLARIS STYLE',
      subtitle: 'MODE, ANZÜGE & ACCESSOIRE-BOUTIQUE',
      exitAria: 'Boutique verlassen',
      outfitsTitle: 'Outfits & Stile',
      equipped: 'GETRAGEN',
      owned: 'IM BESITZ',
      selected: 'Aktiv',
      equip: 'Anziehen',
      buy: (price) => `Kaufen · $${price}`,
      sunglassesTitle: 'Sonnenbrille',
      sunglassesOn: 'Brille Auf (Absetzen)',
      sunglassesOff: 'Keine Brille (Aufsetzen)',
      exitBtn: 'Boutique Verlassen [ESC]',
      outfits: {
        biker: { name: 'Night Rider', desc: 'Schwarze Lederjacke, Petrol-Shirt & Denim' },
        miami: { name: 'Solaris Weiß', desc: 'Weißes Sakko, Korallen-Shirt & Beige-Hose' },
        tuxedo: { name: 'VIP-Smoking', desc: 'Schwarzer Anzug, weißes Hemd & Lackschuhe' },
        street: { name: 'Neon-Street', desc: 'Violette Bomberjacke & Gold-Shirt' },
        tactical: { name: 'Taktik-Ops', desc: 'Olivgrüne Einsatzjacke & Kampfhose' },
        gold: { name: 'Boss Bordeaux', desc: 'Weinrote Lederjacke & Goldsohlen' },
      },
    },
    barber: {
      title: 'SOLARIS CUTS',
      subtitle: 'FRISEURSALON, HAARSTYLING & RASUR',
      exitAria: 'Friseur verlassen',
      hairStyleTitle: 'Frisuren',
      hairColorTitle: 'Haar- & Bartfarbe',
      beardStyleTitle: 'Bart & Rasur',
      equipped: 'AKTIV',
      owned: 'FREI',
      selected: 'Aktiv',
      equip: 'Anwenden',
      buy: (price) => `Schneiden · $${price}`,
      exitBtn: 'Friseur Verlassen [ESC]',
      hairStyles: {
        pompadour: 'Klassik-Pompadour',
        buzz: 'Kurzhaarschnitt',
        fade: 'Box Fade',
        slick: 'Zurückgekämmt',
        afro: 'Voller Afro',
        bald: 'Glattrasiert',
      },
      hairColors: {
        black: 'Tiefschwarz',
        brown: 'Kastanienbraun',
        blonde: 'Sonnenblond',
        red: 'Feuerrot',
        silver: 'Platin-Silber',
        neon: 'Solaris-Türkis',
      },
      beardStyles: {
        stubble: 'Dreitagebart',
        clean: 'Glattrasur',
        goatee: 'Spitzbart',
        full: 'Vollbart',
      },
    },
    touch: {
      steerHint: 'Links / Rechts Lenken',
      moveHint: 'Bewegen',
      shop: 'Laden',
      clothing: 'Kleidung',
      barber: 'Friseur',
      map: 'Karte',
      contract: 'Auftrag',
      holster: 'Holster',
      drop: 'Ablegen',
      exitCar: 'Raus',
      enterCar: 'Einsteigen',
      drift: 'Drift',
      nitro: 'Nitro',
      brake: 'Bremse',
      reverse: 'Rück',
      gas: 'Gas',
      aim: 'Zielen',
      sprint: 'Sprint',
      jump: 'Springen',
      hit: 'Schlag',
      slash: 'Hieb',
      fire: 'Feuer',
    },
    engine: {
      welcomeToast: (name) => `Willkommen ${name}! Steig ein [F] oder nimm einen Auftrag an [M]`,
      weatherToasts: {
        sunny: 'Wetter: Sonnig — Trockener Asphalt und klare Sicht!',
        rainy: 'Wetter: Regnerisch — Weniger Haftung auf nasser Straße!',
        foggy: 'Wetter: Neblig — Geringere Sicht und feuchter Boden!',
      },
      offlineToast: 'In den Offline-Modus (Einzelspieler) gewechselt.',
      onlineConnectedToast: (room) => `Mit Online-Raum verbunden (${room})!`,
      playerJoinedToast: (name) => `${name} ist Solaris Bay beigetreten!`,
      playerLeftToast: (name) => `${name} hat das Spiel verlassen.`,
      shotByPlayerToast: (name) => `${name} hat auf dich geschossen!`,
      cameraToast: (label) => `Kamera: ${label}`,
      sprayToast: 'Lackiererei: Fahndung gelöscht & Wagen repariert (-$200)',
      sprayPrompt: 'Polizei-Lackiererei — Hineinfahren ($200)',
      shopPrompt: '[B] Solaris Arms Waffenladen betreten',
      clothingPrompt: '[B] Solaris Style Modeboutique betreten',
      barberPrompt: '[B] Solaris Cuts Friseursalon betreten',
      enterCarPrompt: (carLabel) => `[F] In ${carLabel} einsteigen`,
      noWeaponToast: 'Diese Waffe gehört dir nicht! Kauf sie bei Solaris Arms [B].',
      holsterToast: 'Waffe weggesteckt (Faust-Modus)',
      noEquipWeaponToast: 'Keine Waffe zum Ausrüsten!',
      equippedToast: (shortName) => `${shortName} ausgerüstet`,
      noDropWeaponToast: 'Keine Waffe zum Ablegen.',
      droppedToast: (shortName) => `${shortName} abgelegt`,
      noAmmoToast: 'Keine Reservemunition! Kauf welche im Waffenladen.',
      insufficientFundsToast: (price) => `Nicht genug Geld! ($${price} benötigt)`,
      boughtToast: (name) => `${name} gekauft!`,
      buyWeaponFirstToast: 'Kaufe zuerst die Waffe!',
      ammoAddedToast: (shortName, pack) => `${shortName}: +${pack} Schuss hinzugefügt`,
      armorFullToast: 'Schutzweste ist bereits voll!',
      armorBoughtToast: '+50 Schutzweste angelegt',
      healthFullToast: 'Gesundheit ist bereits voll!',
      healthBoughtToast: '+50 Erste-Hilfe-Set verwendet',
      outOfAmmoToast: 'Keine Munition! Besuche Waffenladen [B].',
      stuntBonusToast: (bonus) => `Stunt-Bonus! +$${bonus}`,
      evadedToast: (name) => `${name} hat die Polizei abgehängt!`,
      gamepadConnectedToast: (name) => `${name}-Controller verbunden!`,
      gamepadDisconnectedToast: 'Controller getrennt.',
      outfitEquippedToast: (name) => `Outfit angelegt: ${name}`,
      outfitBoughtToast: (name) => `${name} gekauft und angezogen!`,
      sunglassesOnToast: 'Sonnenbrille aufgesetzt',
      sunglassesOffToast: 'Sonnenbrille abgesetzt',
      hairEquippedToast: (name) => `Frisur geändert: ${name}`,
      hairBoughtToast: (name) => `Neuer Haarschnitt: ${name}!`,
      hairColorToast: (name) => `Haar-/Bartfarbe: ${name}`,
      beardEquippedToast: (name) => `Bartstil: ${name}`,
      beardBoughtToast: (name) => `Frische Rasur: ${name}!`,
    },
    gamepad: {
      title: 'PS5 DualSense / Controller',
      connected: 'Verbunden',
      waiting: 'Per USB / Bluetooth verbinden und Taste drücken',
      hapticsOn: 'Vibration An',
      hapticsOff: 'Vibration Aus',
      controlsSummary:
        'LS: Bewegen · RS: Kamera · L2/R2: Zielen/Feuer (Bremse/Gas) · △: Auto · ×: Sprung/Nitro · □: Laden/Drift · R1: Waffe · L1: Holster/Hupe · Touchpad: Karte',
    },
    pwa: {
      installApp: 'App installieren',
      installIOS: 'Auf iOS installieren',
      iosTitle: 'Auf iPhone / iPad installieren',
      iosStep1: '1. Tippe in Safari auf das Teilen-Symbol.',
      iosStep2: '2. Scrolle nach unten und tippe auf "Zum Home-Bildschirm".',
      offlineBanner: 'Offline-Modus — Zwischengespeicherte Spieldaten aktiv.',
      close: 'Schließen',
    },
  },

  ru: {
    weapons: {
      unarmed: { name: 'Без оружия (Кулаки)', shortName: 'Кулаки' },
      knife: { name: 'Боевой нож', shortName: 'Нож' },
      pistol: { name: 'Пистолет 9мм', shortName: 'Пистолет' },
      smg: { name: 'Пистолет-пулемёт MP-7', shortName: 'MP-7' },
      shotgun: { name: 'Дробовик', shortName: 'Дробовик' },
      rifle: { name: 'Тактическая винтовка M4', shortName: 'M4' },
    },
    cameraModes: ['Близко', 'Широко', 'Кино'],
    weather: { sunny: 'Ясно', rainy: 'Дождь', foggy: 'Туман' },
    title: {
      tagline: 'SOLARIS BAY // OPEN DISTRICT 3D',
      settingsBtn: 'Настройки',
      settingsHeroBtn: 'Настройки',
      soundOn: 'Звук Вкл',
      soundOff: 'Без звука',
      description:
        'Покоряй улицы Солярис-Бэй на закате вместе с Фрэнком. Угоняй авто, уходи от полицейских вертолётов на 5 звёздах, прыгай с трамплинов и выполни 6 сюжетных миссий.',
      startBtn: 'Начать игру',
      enterHint: '[Enter] или [Пробел]',
      controlsLine:
        'ПК: WASD Движение · F Сесть/Выйти · ЛКМ Огонь · Shift Бег/Нитро · Моб.: Джойстик и вращение камеры',
    },
    settings: {
      title: 'НАСТРОЙКИ',
      subtitle: 'THEFT AT SOLARIS // ЯЗЫК, КАМЕРА И УПРАВЛЕНИЕ',
      languageTitle: 'Язык игры',
      onlineTitle: 'Сетевая игра (Онлайн)',
      statusConnected: (count) => `В сети • ${count} игр.`,
      statusConnecting: 'Подключение...',
      statusError: 'Ошибка связи',
      statusOffline: 'Офлайн',
      playerNameLabel: 'Имя игрока',
      roomLabel: 'Комната сервера',
      playOnline: 'Играть онлайн',
      disconnectOnline: 'Отключиться',
      playersInRoom: (room) => `Игроки в комнате (${room}):`,
      youTag: '(Вы)',
      sensitivityLabel: 'Чувствительность мыши',
      cameraLabel: 'Дистанция камеры',
      weatherLabel: 'Погода',
      soundOn: 'Звук Вкл',
      soundOff: 'Звук Выкл',
      touchOn: 'Сенсор. упр. Вкл',
      touchOff: 'Сенсор. упр. Выкл',
      close: 'Закрыть',
    },
    hud: {
      radarLabel: 'РАДАР',
      wideLabel: 'ОБЗОР',
      openFullMap: 'Карта города [TAB]',
      zoomRadar: 'Масштаб радара',
      legendShop: 'Оружейная',
      legendClothing: 'Одежда',
      legendBarber: 'Барбер',
      legendTarget: 'Цель',
      legendMission: 'Миссия',
      legendSpray: 'Покраска',
      freeRoamTitle: 'Свободный режим',
      freeRoamObjective: 'Взять контракт: идите к маркеру Пальмовой площади или нажмите [M]',
      getContract: (i, t) => `МИССИЯ (${i}/${t})`,
      evadeLabel: (pct) => `УХОД ${pct}%`,
      heliLabel: 'ВЕРТОЛЁТ',
      roadblockLabel: 'БЛОКПОСТ',
      wantedLabel: 'РОЗЫСК',
      settingsOnline: 'Настройки / Онлайн',
      onlineBadge: (count) => `ОНЛАЙН (${count})`,
      connectingBadge: 'ВХОД...',
      pauseLabel: 'Пауза',
      stateDriving: 'ЗА РУЛЁМ',
      stateAim: 'ПРИЦЕЛ',
      stateOnFoot: 'ПЕШКОМ',
      meleeLabel: 'БЛИЖН.',
      reloadingLabel: (pct) => `ЗАРЯДКА ${pct}%`,
      hideChat: 'Скрыть чат',
      showChat: (count) => `Онлайн-чат (${count})`,
      chatEmpty: (room) => `Комната: ${room} — Сообщений пока нет.`,
      chatPlaceholder: 'Написать сообщение...',
      sendChat: 'Отправить',
      bustedWarning: 'РИСК АРЕСТА — БЕГИТЕ!',
      nitro: 'НИТРО',
      damage: 'ПРОЧН.',
      vehicleControls: '[F] Выйти · [Shift] Нитро · [Пробел] Дрифт · [H] Сигнал',
      reloadBtn: '[R] Перезарядка',
      holsterBtn: '[X] Убрать',
      dropBtn: '[G] Бросить',
      aimHint: '[ПКМ / V] Прицел',
    },
    modals: {
      paused: 'ПАУЗА',
      wasted: 'ПОТРАЧЕНО',
      busted: 'АРЕСТОВАН',
      wastedSub: 'WASTED — ЗДОРОВЬЕ НА НУЛЕ',
      bustedSub: 'BUSTED — ЗАДЕРЖАН ПОЛИЦИЕЙ',
      cash: 'Наличные',
      completedContracts: 'Выполнено миссий',
      vehiclesHijacked: 'Угнано машин',
      rampBonus: 'Бонус за прыжки',
      ctrlMove: 'Движение / Вождение',
      ctrlMoveVal: 'WASD / Стрелки',
      ctrlAim: 'Прицел / Обзор',
      ctrlAimVal: 'ПКМ (или V) / Мышь / Q-E',
      ctrlFire: 'Огонь / Зарядка / Оружие',
      ctrlFireVal: 'ЛКМ (J) / R / 0-5',
      ctrlGear: 'Кобура / Бросить / Магазин',
      ctrlGearVal: 'X / G / B (Solaris Arms)',
      ctrlVehicle: 'Сесть-Выйти / Нитро / Дрифт',
      ctrlVehicleVal: 'F / Shift / Пробел',
      ctrlMisc: 'Миссия / Камера / Карта',
      ctrlMiscVal: 'M / C / Tab',
      resume: 'Продолжить',
      settingsOnline: 'Настройки / Онлайн',
      restart: 'Начать заново',
      playAgain: 'Играть снова',
    },
    map: {
      title: 'Solaris Bay — Карта города',
      subtitle: 'Оружейная, Центр миссий, Покраска, Горы Солярис и цели',
      close: 'Закрыть [TAB / ESC]',
      landmarksTitle: 'Важные точки и дистанции',
      shopTitle: 'Оружейная (Solaris Arms)',
      shopDesc: 'Оружие, патроны и бронежилет',
      clothingTitle: 'Одежда (Solaris Style)',
      clothingDesc: 'Куртки, костюмы и очки',
      barberTitle: 'Барбершоп (Solaris Cuts)',
      barberDesc: 'Стрижка, покраска и борода',
      hubTitle: 'Центр миссий',
      hubDesc: 'Точка контрактов на Пальмовой площади',
      activeTargetDesc: 'Текущая цель миссии',
      sprayTitle: 'Полицейская покраска',
      sprayDesc: 'Сброс розыска за $200',
      pierTitle: 'Пирс Солярис',
      pierDesc: 'Западный берег и точка доставки',
      legendPlayer: 'Игрок (Позиция и курс)',
      legendPolice: 'Патруль полиции',
      legendGang: 'Цели банд',
    },
    shop: {
      subtitle: 'ОРУЖИЕ, ПАТРОНЫ И СНАРЯЖЕНИЕ',
      exitAria: 'Выйти из магазина',
      equipped: 'В РУКАХ',
      owned: 'КУПЛЕНО',
      statDamage: 'Урон',
      statMelee: 'Тип: Ближн.',
      statMag: 'Магазин',
      statRange: 'Дальн.',
      meleeNote: 'Патроны не нужны · Ближний бой',
      ammoNote: (mag, res, tot) => `Патроны: ${mag} / ${res} (Всего ${tot})`,
      selected: 'Выбрано',
      equip: 'Взять',
      buy: (price) => `Купить · $${price}`,
      armorTitle: 'Бронежилет (+50)',
      healthTitle: 'Аптечка (+50)',
      current: (val, max) => `Сейчас: ${val}/${max}`,
      exitBtn: 'Выйти из магазина [ESC]',
    },
    clothing: {
      title: 'SOLARIS STYLE',
      subtitle: 'БУТИК ОДЕЖДЫ, КОСТЮМОВ И АКСЕССУАРОВ',
      exitAria: 'Выйти из бутика',
      outfitsTitle: 'Комплекты одежды',
      equipped: 'НАДЕТО',
      owned: 'КУПЛЕНО',
      selected: 'Надето',
      equip: 'Надеть',
      buy: (price) => `Купить · $${price}`,
      sunglassesTitle: 'Солнцезащитные очки',
      sunglassesOn: 'Очки надеты (Снять)',
      sunglassesOff: 'Без очков (Надеть)',
      exitBtn: 'Выйти из бутика [ESC]',
      outfits: {
        biker: { name: 'Ночной гонщик', desc: 'Чёрная косуха, бирюзовая майка и джинсы' },
        miami: { name: 'Белый Солярис', desc: 'Белый пиджак, коралловая футболка и брюки' },
        tuxedo: { name: 'VIP Смокинг', desc: 'Строгий чёрный костюм, белая сорочка и туфли' },
        street: { name: 'Неоновый стиль', desc: 'Фиолетовый бомбер и золотая футболка' },
        tactical: { name: 'Тактик Спецназ', desc: 'Оливковая куртка и тактические штаны' },
        gold: { name: 'Бордовый Босс', desc: 'Бордовая кожанка и золотая подошва' },
      },
    },
    barber: {
      title: 'SOLARIS CUTS',
      subtitle: 'БАРБЕРШОП, СТРИЖКА И БРИТЬЁ БОРОДЫ',
      exitAria: 'Выйти из барбершопа',
      hairStyleTitle: 'Причёски',
      hairColorTitle: 'Цвет волос и бороды',
      beardStyleTitle: 'Борода и бритьё',
      equipped: 'АКТИВНО',
      owned: 'ДОСТУПНО',
      selected: 'Применено',
      equip: 'Выбрать',
      buy: (price) => `Подстричь · $${price}`,
      exitBtn: 'Выйти из барбершопа [ESC]',
      hairStyles: {
        pompadour: 'Классик Помпадур',
        buzz: 'Короткий ёжик',
        fade: 'Бокс Фейд',
        slick: 'Зачёс назад',
        afro: 'Объёмное афро',
        bald: 'Налысо',
      },
      hairColors: {
        black: 'Чёрный',
        brown: 'Каштановый',
        blonde: 'Солнечный блонд',
        red: 'Рыжий',
        silver: 'Серебро',
        neon: 'Неон-бирюза',
      },
      beardStyles: {
        stubble: 'Щетина',
        clean: 'Гладкое бритьё',
        goatee: 'Эспаньолка и усы',
        full: 'Густая борода',
      },
    },
    touch: {
      steerHint: 'Руль Влево / Вправо',
      moveHint: 'Движение',
      shop: 'Магазин',
      clothing: 'Одежда',
      barber: 'Барбер',
      map: 'Карта',
      contract: 'Миссия',
      holster: 'Убрать',
      drop: 'Бросить',
      exitCar: 'Выйти',
      enterCar: 'Сесть в авто',
      drift: 'Дрифт',
      nitro: 'Нитро',
      brake: 'Тормоз',
      reverse: 'Назад',
      gas: 'Газ',
      aim: 'Прицел',
      sprint: 'Бег',
      jump: 'Прыжок',
      hit: 'Удар',
      slash: 'Резать',
      fire: 'Огонь',
    },
    engine: {
      welcomeToast: (name) => `Добро пожаловать, ${name}! Садись в авто [F] или бери миссию [M]`,
      weatherToasts: {
        sunny: 'Погода: Ясно — Сухой асфальт и отличная видимость!',
        rainy: 'Погода: Дождь — Сцепление на мокрой дороге снижено!',
        foggy: 'Погода: Туман — Видимость снижена, дорога влажная!',
      },
      offlineToast: 'Переключено в офлайн-режим (одиночная игра).',
      onlineConnectedToast: (room) => `Подключено к онлайн-комнате (${room})!`,
      playerJoinedToast: (name) => `${name} присоединился к Solaris Bay!`,
      playerLeftToast: (name) => `${name} покинул игру.`,
      shotByPlayerToast: (name) => `${name} стреляет в вас!`,
      cameraToast: (label) => `Камера: ${label}`,
      sprayToast: 'Покраска: Розыск снят и авто отремонтировано (-$200)',
      sprayPrompt: 'Автопокраска — Въехать ($200)',
      shopPrompt: '[B] Войти в оружейный магазин Solaris Arms',
      clothingPrompt: '[B] Войти в магазин одежды Solaris Style',
      barberPrompt: '[B] Войти в барбершоп Solaris Cuts',
      enterCarPrompt: (carLabel) => `[F] Сесть в ${carLabel}`,
      noWeaponToast: 'У вас нет этого оружия! Купите его в Solaris Arms [B].',
      holsterToast: 'Оружие убрано (Режим кулаков)',
      noEquipWeaponToast: 'Нет оружия для экипировки!',
      equippedToast: (shortName) => `Выбрано: ${shortName}`,
      noDropWeaponToast: 'Нечего выбрасывать.',
      droppedToast: (shortName) => `Выброшено: ${shortName}`,
      noAmmoToast: 'Нет запасных патронов! Купите в оружейной.',
      insufficientFundsToast: (price) => `Недостаточно денег! (Нужно $${price})`,
      boughtToast: (name) => `Куплено: ${name}!`,
      buyWeaponFirstToast: 'Сначала купите оружие!',
      ammoAddedToast: (shortName, pack) => `${shortName}: +${pack} патр. добавлено`,
      armorFullToast: 'Бронежилет уже полон!',
      armorBoughtToast: '+50 к бронежилету',
      healthFullToast: 'Здоровье уже полное!',
      healthBoughtToast: '+50 здоровья (Аптечка)',
      outOfAmmoToast: 'Кончились патроны! Зайдите в магазин [B].',
      stuntBonusToast: (bonus) => `Бонус за трюк! +$${bonus}`,
      evadedToast: (name) => `${name} ушёл от погони полиции!`,
      gamepadConnectedToast: (name) => `Контроллер ${name} подключён!`,
      gamepadDisconnectedToast: 'Контроллер отключён.',
      outfitEquippedToast: (name) => `Надето: ${name}`,
      outfitBoughtToast: (name) => `Куплено и надето: ${name}!`,
      sunglassesOnToast: 'Очки надеты',
      sunglassesOffToast: 'Очки сняты',
      hairEquippedToast: (name) => `Причёска: ${name}`,
      hairBoughtToast: (name) => `Новая стрижка: ${name}!`,
      hairColorToast: (name) => `Цвет волос/бороды: ${name}`,
      beardEquippedToast: (name) => `Стиль бороды: ${name}`,
      beardBoughtToast: (name) => `Новое бритьё: ${name}!`,
    },
    gamepad: {
      title: 'PS5 DualSense / Геймпад',
      connected: 'Подключён',
      waiting: 'Подключите по USB / Bluetooth и нажмите любую кнопку',
      hapticsOn: 'Вибрация Вкл',
      hapticsOff: 'Вибрация Выкл',
      controlsSummary:
        'LS: Движение · RS: Камера · L2/R2: Прицел/Огонь (Тормоз/Газ) · △: Авто · ×: Прыжок/Нитро · □: Зарядка/Дрифт · R1: Оружие · L1: Кобура/Сигнал · Touchpad: Карта',
    },
    pwa: {
      installApp: 'Установить игру',
      installIOS: 'Установить на iOS',
      iosTitle: 'Установка на iPhone / iPad',
      iosStep1: '1. Нажмите кнопку «Поделиться» в панели Safari.',
      iosStep2: '2. Выберите «На экран «Домой»».',
      offlineBanner: 'Офлайн-режим — Используются кэшированные данные игры.',
      close: 'Закрыть',
    },
  },

  it: {
    weapons: {
      unarmed: { name: 'Disarmato (Pugni)', shortName: 'Pugni' },
      knife: { name: 'Coltello Tattico', shortName: 'Coltello' },
      pistol: { name: 'Pistola 9mm', shortName: 'Pistola' },
      smg: { name: 'Mitraglietta MP-7', shortName: 'MP-7' },
      shotgun: { name: 'Fucile a Pompa', shortName: 'Pompa' },
      rifle: { name: 'Fucile Tattico M4', shortName: 'M4' },
    },
    cameraModes: ['Vicina', 'Ampia', 'Cinema'],
    weather: { sunny: 'Sole', rainy: 'Pioggia', foggy: 'Nebbia' },
    title: {
      tagline: 'SOLARIS BAY // OPEN DISTRICT 3D',
      settingsBtn: 'Impostazioni',
      settingsHeroBtn: 'Impostazioni',
      soundOn: 'Audio On',
      soundOff: 'Muto',
      description:
        'Scala le strade al tramonto di Solaris Bay con Frank. Ruba auto, sfuggi agli elicotteri a 5 stelle, fai acrobazie sulle rampe e completa 6 contratti.',
      startBtn: 'Inizia Gioco',
      enterHint: '[Invio] o [Spazio]',
      controlsLine:
        'PC: WASD Movimento · F Entra/Esci · Click Sx Spara · Shift Scatto/Nitro · Mobile: Stick su schermo & Trascina visuale',
    },
    settings: {
      title: 'IMPOSTAZIONI',
      subtitle: 'THEFT AT SOLARIS // LINGUA, CAMERA E CONTROLLI',
      languageTitle: 'Lingua del Gioco',
      onlineTitle: 'Multigiocatore Online',
      statusConnected: (count) => `Online • ${count} Giocatori`,
      statusConnecting: 'Connessione...',
      statusError: 'Errore di Rete',
      statusOffline: 'Offline',
      playerNameLabel: 'Nome Giocatore',
      roomLabel: 'Stanza Server',
      playOnline: 'Gioca Online',
      disconnectOnline: 'Disconnetti Online',
      playersInRoom: (room) => `Giocatori nella Stanza (${room}):`,
      youTag: '(Tu)',
      sensitivityLabel: 'Sensibilità Mouse',
      cameraLabel: 'Distanza Camera',
      weatherLabel: 'Meteo',
      soundOn: 'Audio Attivo',
      soundOff: 'Audio Disattivo',
      touchOn: 'Comandi Touch On',
      touchOff: 'Comandi Touch Off',
      close: 'Chiudi',
    },
    hud: {
      radarLabel: 'RADAR',
      wideLabel: 'AMPIO',
      openFullMap: 'Mappa Città [TAB]',
      zoomRadar: 'Zoom Radar',
      legendShop: 'Armeria',
      legendClothing: 'Moda',
      legendBarber: 'Barbiere',
      legendTarget: 'Obiettivo',
      legendMission: 'Missione',
      legendSpray: 'Officina',
      freeRoamTitle: 'Esplorazione Libera',
      freeRoamObjective: 'Avvia un contratto: vai a Piazza delle Palme o premi [M]',
      getContract: (i, t) => `CONTRATTO (${i}/${t})`,
      evadeLabel: (pct) => `FUGA ${pct}%`,
      heliLabel: 'ELIC.',
      roadblockLabel: 'BLOCCO',
      wantedLabel: 'RICERCATO',
      settingsOnline: 'Opzioni & Online',
      onlineBadge: (count) => `ONLINE (${count})`,
      connectingBadge: 'CONNESSIONE',
      pauseLabel: 'Pausa',
      stateDriving: 'ALLA GUIDA',
      stateAim: 'MIRA',
      stateOnFoot: 'A PIEDI',
      meleeLabel: 'CORPO',
      reloadingLabel: (pct) => `RICARICA ${pct}%`,
      hideChat: 'Nascondi Chat',
      showChat: (count) => `Chat Online (${count})`,
      chatEmpty: (room) => `Stanza: ${room} — Nessun messaggio.`,
      chatPlaceholder: 'Scrivi un messaggio...',
      sendChat: 'Invia',
      bustedWarning: 'RISCHIO ARRESTO — SCAPPA!',
      nitro: 'NITRO',
      damage: 'DANNI',
      vehicleControls: '[F] Esci · [Shift] Nitro · [Spazio] Drift · [H] Clacson',
      reloadBtn: '[R] Ricarica',
      holsterBtn: '[X] Fondina',
      dropBtn: '[G] Lascia',
      aimHint: '[Click Dx / V] Mira',
    },
    modals: {
      paused: 'IN PAUSA',
      wasted: 'ELIMINATO',
      busted: 'ARRESTATO',
      wastedSub: 'WASTED — SALUTE ESAURITA',
      bustedSub: 'BUSTED — CATTURATO DALLA POLIZIA',
      cash: 'Contanti',
      completedContracts: 'Contratti Completati',
      vehiclesHijacked: 'Veicoli Rubati',
      rampBonus: 'Bonus Rampe',
      ctrlMove: 'Movimento / Guida',
      ctrlMoveVal: 'WASD / Frecce',
      ctrlAim: 'Mira / Guardati Intorno',
      ctrlAimVal: 'Click Dx (o V) / Mouse / Q-E',
      ctrlFire: 'Spara / Ricarica / Armi',
      ctrlFireVal: 'Click Sx (J) / R / 0-5',
      ctrlGear: 'Fondina / Lascia / Armeria',
      ctrlGearVal: 'X / G / B (Solaris Arms)',
      ctrlVehicle: 'Entra-Esci / Nitro / Drift',
      ctrlVehicleVal: 'F / Shift / Spazio',
      ctrlMisc: 'Contratto / Camera / Mappa',
      ctrlMiscVal: 'Tasto M / Tasto C / Tab',
      resume: 'Riprendi',
      settingsOnline: 'Opzioni & Online',
      restart: 'Ricomincia',
      playAgain: 'Gioca Ancora',
    },
    map: {
      title: 'Solaris Bay — Mappa della Città',
      subtitle: 'Armeria, Centro Missioni, Officina, Monti Solaris e Obiettivi',
      close: 'Chiudi [TAB / ESC]',
      landmarksTitle: 'Punti di Interesse & Distanze',
      shopTitle: 'Armeria (Solaris Arms)',
      shopDesc: 'Armi, munizioni e giubbotto',
      clothingTitle: 'Abbigliamento (Solaris Style)',
      clothingDesc: 'Giacche, abiti e occhiali',
      barberTitle: 'Barbiere (Solaris Cuts)',
      barberDesc: 'Taglio, tinta e barba',
      hubTitle: 'Centro Missioni',
      hubDesc: 'Punto contratti Piazza delle Palme',
      activeTargetDesc: 'Obiettivo missione attiva',
      sprayTitle: 'Officina Verniciatura',
      sprayDesc: 'Azzera taglia per $200',
      pierTitle: 'Molo Solaris',
      pierDesc: 'Costa ovest e consegna',
      legendPlayer: 'Giocatore (Posizione e Direzione)',
      legendPolice: 'Pattuglia Polizia',
      legendGang: 'Bersagli Gang',
    },
    shop: {
      subtitle: 'ARMI, MUNIZIONI & EQUIPAGGIAMENTO',
      exitAria: 'Esci dall’Armeria',
      equipped: 'IN USO',
      owned: 'POSSEDUTA',
      statDamage: 'Danno',
      statMelee: 'Tipo: Mischia',
      statMag: 'Caric.',
      statRange: 'Gittata',
      meleeNote: 'Nessuna munizione richiesta · Mischia illimitata',
      ammoNote: (mag, res, tot) => `Munizioni: ${mag} / ${res} (Totale ${tot})`,
      selected: 'Selezionata',
      equip: 'Equipaggia',
      buy: (price) => `Acquista · $${price}`,
      armorTitle: 'Giubbotto Antiproiettile (+50)',
      healthTitle: 'Kit Primo Soccorso (+50)',
      current: (val, max) => `Attuale: ${val}/${max}`,
      exitBtn: 'Esci dal Negozio [ESC]',
    },
    clothing: {
      title: 'SOLARIS STYLE',
      subtitle: 'BOUTIQUE ABBIGLIAMENTO, ABITI & ACCESSORI',
      exitAria: 'Esci dalla Boutique',
      outfitsTitle: 'Completi e Stili',
      equipped: 'INDOSSATO',
      owned: 'POSSEDUTO',
      selected: 'Indossato',
      equip: 'Indossa',
      buy: (price) => `Acquista · $${price}`,
      sunglassesTitle: 'Occhiali da Sole',
      sunglassesOn: 'Occhiali Indossati (Togli)',
      sunglassesOff: 'Senza Occhiali (Indossa)',
      exitBtn: 'Esci dalla Boutique [ESC]',
      outfits: {
        biker: { name: 'Night Rider', desc: 'Giacca in pelle nera, maglia turchese e jeans' },
        miami: { name: 'Bianco Solaris', desc: 'Giacca bianca, maglia corallo e pantaloni sabbia' },
        tuxedo: { name: 'Smoking VIP', desc: 'Abito nero sartoriale e camicia bianca' },
        street: { name: 'Neon Street', desc: 'Bomber viola e maglia oro con sneaker rosse' },
        tactical: { name: 'Tattico Ops', desc: 'Giacca operativa verde oliva e pantaloni cargo' },
        gold: { name: 'Boss Cremisi', desc: 'Giacca bordeaux in pelle con suola dorata' },
      },
    },
    barber: {
      title: 'SOLARIS CUTS',
      subtitle: 'BARBIERE, TAGLIO CAPELLI & BARBA',
      exitAria: 'Esci dal Barbiere',
      hairStyleTitle: 'Tagli di Capelli',
      hairColorTitle: 'Colore Capelli & Barba',
      beardStyleTitle: 'Barba & Rasatura',
      equipped: 'ATTIVO',
      owned: 'SBLOCCATO',
      selected: 'Applicato',
      equip: 'Applica',
      buy: (price) => `Taglio · $${price}`,
      exitBtn: 'Esci dal Barbiere [ESC]',
      hairStyles: {
        pompadour: 'Pompadour Classico',
        buzz: 'Taglio Corto',
        fade: 'Box Fade',
        slick: 'Pettinati Indietro',
        afro: 'Afro Voluminoso',
        bald: 'Rasato a Zero',
      },
      hairColors: {
        black: 'Nero Corvino',
        brown: 'Castano',
        blonde: 'Biondo Solare',
        red: 'Rosso Fuoco',
        silver: 'Argento Platino',
        neon: 'Turchese Solaris',
      },
      beardStyles: {
        stubble: 'Barba Incolta',
        clean: 'Rasatura Completa',
        goatee: 'Pizzetto & Baffi',
        full: 'Barba Piena',
      },
    },
    touch: {
      steerHint: 'Sterzo Sx / Dx',
      moveHint: 'Muovi',
      shop: 'Armeria',
      clothing: 'Vestiti',
      barber: 'Barbiere',
      map: 'Mappa',
      contract: 'Missione',
      holster: 'Fondina',
      drop: 'Lascia',
      exitCar: 'Esci',
      enterCar: 'Entra Auto',
      drift: 'Drift',
      nitro: 'Nitro',
      brake: 'Freno',
      reverse: 'Retro',
      gas: 'Gas',
      aim: 'Mira',
      sprint: 'Scatto',
      jump: 'Salta',
      hit: 'Colpisci',
      slash: 'Taglia',
      fire: 'Spara',
    },
    engine: {
      welcomeToast: (name) => `Benvenuto ${name}! Sali su un’auto [F] o accetta una missione [M]`,
      weatherToasts: {
        sunny: 'Meteo: Soleggiato — Asfalto asciutto e ottima visibilità!',
        rainy: 'Meteo: Piovoso — Meno aderenza su strada bagnata!',
        foggy: 'Meteo: Nebbioso — Visibilità ridotta e asfalto umido!',
      },
      offlineToast: 'Passato alla modalità Offline (Giocatore Singolo).',
      onlineConnectedToast: (room) => `Connesso alla stanza Online (${room})!`,
      playerJoinedToast: (name) => `${name} si è unito a Solaris Bay!`,
      playerLeftToast: (name) => `${name} ha lasciato la partita.`,
      shotByPlayerToast: (name) => `${name} ti ha sparato!`,
      cameraToast: (label) => `Camera: ${label}`,
      sprayToast: 'Officina: Taglia azzerata e auto riparata (-$200)',
      sprayPrompt: 'Officina Polizia — Entra ($200)',
      shopPrompt: '[B] Entra in Solaris Arms',
      clothingPrompt: '[B] Entra nel Negozio Solaris Style',
      barberPrompt: '[B] Entra dal Barbiere Solaris Cuts',
      enterCarPrompt: (carLabel) => `[F] Entra in ${carLabel}`,
      noWeaponToast: 'Non possiedi quest’arma! Acquistala da Solaris Arms [B].',
      holsterToast: 'Arma rinfoderata (Modalità Pugni)',
      noEquipWeaponToast: 'Nessuna arma da equipaggiare!',
      equippedToast: (shortName) => `${shortName} equipaggiata`,
      noDropWeaponToast: 'Nessuna arma da lasciare.',
      droppedToast: (shortName) => `${shortName} lasciata a terra`,
      noAmmoToast: 'Nessuna munizione di riserva! Acquista in armeria.',
      insufficientFundsToast: (price) => `Fondi insufficienti! ($${price} richiesti)`,
      boughtToast: (name) => `Acquistato: ${name}!`,
      buyWeaponFirstToast: 'Acquista prima l’arma!',
      ammoAddedToast: (shortName, pack) => `${shortName}: +${pack} colpi aggiunti`,
      armorFullToast: 'Giubbotto già al massimo!',
      armorBoughtToast: '+50 Giubbotto Antiproiettile',
      healthFullToast: 'Salute già al massimo!',
      healthBoughtToast: '+50 Kit Primo Soccorso',
      outOfAmmoToast: 'Munizioni finite! Vai in Armeria [B].',
      stuntBonusToast: (bonus) => `Bonus Acrobazia! +$${bonus}`,
      evadedToast: (name) => `${name} è sfuggito alla polizia!`,
      gamepadConnectedToast: (name) => `Controller ${name} connesso!`,
      gamepadDisconnectedToast: 'Controller disconnesso.',
      outfitEquippedToast: (name) => `Indossato: ${name}`,
      outfitBoughtToast: (name) => `Acquistato e indossato: ${name}!`,
      sunglassesOnToast: 'Occhiali da sole indossati',
      sunglassesOffToast: 'Occhiali da sole rimossi',
      hairEquippedToast: (name) => `Taglio applicato: ${name}`,
      hairBoughtToast: (name) => `Nuovo taglio: ${name}!`,
      hairColorToast: (name) => `Colore capelli/barba: ${name}`,
      beardEquippedToast: (name) => `Barba applicata: ${name}`,
      beardBoughtToast: (name) => `Rasatura completata: ${name}!`,
    },
    gamepad: {
      title: 'PS5 DualSense / Controller',
      connected: 'Connesso',
      waiting: 'Collega via USB / Bluetooth e premi un tasto',
      hapticsOn: 'Vibrazione Attiva',
      hapticsOff: 'Vibrazione Disattiva',
      controlsSummary:
        'LS: Muovi · RS: Camera · L2/R2: Mira/Spara (Freno/Gas) · △: Auto · ×: Salta/Nitro · □: Ricarica/Drift · R1: Arma · L1: Fondina/Clacson · Touchpad: Mappa',
    },
    pwa: {
      installApp: 'Installa App',
      installIOS: 'Installa su iOS',
      iosTitle: 'Installa su iPhone / iPad',
      iosStep1: '1. Tocca il pulsante Condividi nella barra di Safari.',
      iosStep2: '2. Scorri e tocca "Aggiungi alla schermata Home".',
      offlineBanner: 'Modalità Offline — Dati di gioco salvati nella cache.',
      close: 'Chiudi',
    },
  },
};

export function getTranslations(lang: LanguageCode): TranslationSet {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.tr;
}
