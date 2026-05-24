# UTOPIAN Transfer v8.10 — GitHub'a Yükleme

## Klasör yapısı

```
KÖK dizine:        index.html, style.css, manifest.json, sw.js
js/ klasörüne:     algo.js, data.js, ui.js, init.js, history.js, perf.js
```

`js` klasöründe SADECE bu 6 `.js` dosyası olmalı. CSS/HTML/json oraya KONMAZ.

## Yükleme

1. ZIP'teki `index.html`, `style.css`, `manifest.json`, `sw.js` → KÖK dizine.
2. ZIP'teki `js` klasöründeki 6 dosyayı → `js` klasörüne.
3. 1-2 dk bekleyin, sitede **Ctrl+F5** yapın.
4. Başlıkta **"v8.10"** yazmalı.

## v8.10'da YENİ olanlar

### 1. Fotoğraf yönetimi yenilendi
- **"File picker already active" hatası giderildi** (çift-tık kilidi eklendi).
- **Tek akış:** "Klasör Seç" → tüm ürün klasörleri taranır → bellekte
  OLMAYAN fotoğraflar otomatik kaydedilir. Ayrı "Kaydet" butonuna gerek yok.
- **Kalıcı:** Fotoğraflar IndexedDB'de saklanır; tarayıcı kapansa, program
  güncellense bile silinmez.
- **Artımlı güncelleme:** 2 hafta sonra yeni ürün gelince aynı klasörü
  seçin — program SADECE yeni (bellekte olmayan) fotoğrafları ekler,
  tümünü yeniden yüklemez.
- **Son güncelleme tarihi** sol panelde gösterilir.

### 2. Güven endeksi kalibrasyonu (%79 → %84 ortalama)
- Mantıksal olarak sağlam transferler (seri tamamlama, konsolidasyon)
  artık hak ettikleri puanı alıyor. %75+ transfer oranı: %87.
- ÖNEMLİ NOT: Ortalama %90'a ZORLANMADI. Gerçekten belirsiz transferler
  (hiç satılmamış tekil ürün) bilinçli olarak düşük puanda — güven
  endeksinin dürüst kalması, sizi yanlış transferden koruması için.
  Detaylı açıklama programı veren kişiden.
