# UTOPIAN Transfer v8.9 — Kurulum Talimatı

## ⚠️ ÖNEMLİ: Test ettiğiniz sürüm ESKİ

Yüklediğiniz ekran görüntüsünde başlıkta **"DAĞITIM MOTORU v8.1"** yazıyor.
Doğru sürüm **v8.9** olmalı. Bu, GitHub'daki dosyaların güncellenmediği
anlamına gelir — yani test ettiğiniz program, yapılan düzeltmeleri içermiyor.

**ASKILI BLUZ 3299 örneğinin "değişmemiş" görünmesinin tek sebebi budur.**
Kod düzeltildi; ama eski kod GitHub'da çalışmaya devam ediyor.

---

## ✅ Doğrulama: v8.9 kodu ASKILI BLUZ 3299'u DOĞRU çözüyor

| Beden | Eski sürüm (sizin gördüğünüz) | v8.9 (bu paket) |
|-------|------------------------------|-----------------|
| SİYAH XL | → Gordion ❌ (Gordion'da 3 stok vardı) | → **Bursa** ✓ |
| EKRU M | → Next ❌ (Next kırık mağaza) | → **Bursa** ✓ |

---

## 📋 GitHub'a yükleme adımları

1. Bu ZIP'teki **TÜM dosyaları** GitHub deponuza yükleyin ve eski dosyaların
   **üzerine yazın**. Özellikle şunlar mutlaka güncellenmeli:
   - `algo.js`  (algoritma — tüm düzeltmeler burada)
   - `ui.js`    (arayüz — birleşik sekme)
   - `data.js`  (Excel — Kontrol Listesi sayfası)
   - `index.html` (sürüm v8.9 olmalı)
   - `style.css`, `init.js`, `history.js`, `perf.js`, `manifest.json`, `sw.js`

2. GitHub'a yükledikten sonra **1-2 dakika** bekleyin (GitHub Pages
   güncellemesi zaman alır).

3. Tarayıcıda siteyi açın ve **Ctrl + F5** ile zorla yenileyin.
   (PWA eski sürümü önbellekte tutar — normal yenileme yetmez.)

4. Başlıkta **"DAĞITIM MOTORU v8.9"** yazdığını kontrol edin.
   Yazıyorsa doğru sürüm yüklenmiştir.

---

## Bu sürümde (v8.9) hazır olan özellikler

- **Birleşik "🔁 Tüm Transferler" sekmesi** — Depo + Mağaza Arası + Kırık
  Beden tek sayfada. Her satırda TÜR rozeti (📦 Depo / 🔄 Mağaza / ⚠️ Kırık /
  📊 Fazla Stok). Üç ayrı sekme artık yok.
- **Sütun başlığı filtreleri** — Her sütunun kendi filtresi, başlık altında
  sabit (kaydırınca yerinde kalır).
- **Excel "Kontrol Listesi" sayfası** — İlk sayfada Depo + Mağaza + Kırık
  birleşik liste. Mevcut detay sayfaları (Depo Transfer, Mağaza Arası,
  Kırık Beden) korundu — sadece başa ek sayfa eklendi.
- **"🚚 Yeni Giriş / Yolda" sekmesi** — 1.1.1900 tarihli (yolda/nakil)
  ürünler ayrı listede; transfere dahil edilmez.
- Kırık beden algoritması: fazla stoklu hedef engeli, kırık mağazaya
  gönderme yasağı, konsolidasyon HUB'ı, ikinci-tur simülasyon.
