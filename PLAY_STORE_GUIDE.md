# Theft at Solaris — Google Play Store Yayınlama Rehberi

Bu proje **Google Play Store (TWA — Trusted Web Activity)** ve Android/iOS **PWA (Progressive Web App)** kurulumu için hazır hale getirilmiştir:

- `manifest.webmanifest` (otomatik `vite-plugin-pwa` ile üretilir, `fullscreen` oyun modu)
- Android ve iOS uyumlu ikonlar (`public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/pwa-maskable-512x512.png`, `public/apple-touch-icon.png`)
- Offline Service Worker önbellekleme (`workbox`)
- Digital Asset Links şablonu (`public/.well-known/assetlinks.json`)

> **Önemli Not:** AI Studio ortamı doğrudan sizin Google Play Console hesabınıza giriş yapıp `.aab` paketi yükleyemez. Aşağıdaki adımlarla oyunu birkaç dakika içinde Play Store'a yükleyebilirsiniz.

---

## Adım 1: Oyunu Herkese Açık Bir HTTPS Adresinde Yayınlayın
Google Play Store (TWA) için oyunun `https://` adresinde yayında olması gerekir (örneğin AI Studio Share URL, Vercel, Cloudflare Pages veya Cloud Run).

## Adım 2: Android App Bundle (`.aab`) Oluşturun
En kolay iki yöntemden birini kullanın:

### Yöntem A — PWABuilder (Kodsuz, Tarayıcı Üzerinden)
1. [https://www.pwabuilder.com](https://www.pwabuilder.com) adresine gidin ve oyunun HTTPS adresini yapıştırın.
2. **Package for Stores -> Android -> Generate Package** adımlarını izleyin.
3. Paket kimliği (örn. `com.theftatsolaris.game3d`) belirleyip `.aab` ve imza anahtarını (`.keystore`) indirin.

### Yöntem B — Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest="https://SIZIN_DOMAIN/manifest.webmanifest"
bubblewrap build
```
Bu komut Google Play Store'a yüklemeye hazır `app-release-bundle.aab` dosyasını oluşturur.

## Adım 3: Adres Çubuğunu Gizlemek İçin `assetlinks.json` Güncellemesi
Google Play Console (**Setup -> App integrity -> App signing**) içindeki **SHA-256 certificate fingerprint** değerini kopyalayıp `public/.well-known/assetlinks.json` dosyasındaki `REPLACE_WITH_YOUR_GOOGLE_PLAY_OR_KEYSTORE_SHA256_FINGERPRINT` alanına yazın ve web uygulamasını tekrar yayınlayın.

## Adım 4: Google Play Console'a Yükleyin
1. [https://play.google.com/console](https://play.google.com/console) üzerinden **Uygulama Oluştur** deyin.
2. Oyun adı, açıklama, 16:9 / telefon ekran görüntüleri ve gizlilik politikası bağlantısını girin.
3. **Production** veya **Internal Testing** kanalına `.aab` dosyasını yükleyip incelemeye gönderin.

---

## Otomatik APK Derleme (GitHub Actions + Capacitor)
Projeye `.github/workflows/build-apk.yml` ve `capacitor.config.json` eklendi:
1. Projeyi GitHub deponuza yükleyin (`main` veya `master` dalına push yapın).
2. ~2-3 dakika bekleyin; GitHub deponuzun sağındaki **Releases** bölümüne doğrudan indirilebilir **`Theft-at-Solaris.apk`** dosyası otomatik yayınlanır (ZIP açmanız gerekmez).
3. APK içinde Online çok oyunculu modu harici bir sunucuya bağlamak isterseniz, GitHub **Actions → Build Android APK → Run workflow** ekranındaki `ws_url` alanına `wss://sunucunuz.run.app/ws` yazabilirsiniz.

