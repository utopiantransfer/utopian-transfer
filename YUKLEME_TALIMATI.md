# UTOPIAN Transfer v8.11 — Yükleme ve Test

## Klasör yapısı
```
KÖK dizine:     index.html, style.css, manifest.json, sw.js
js/ klasörüne:  algo.js, data.js, ui.js, init.js, history.js, perf.js
```
`js` klasöründe SADECE 6 `.js` dosyası olmalı.

## Yükleme
1. ZIP'teki 4 dosyayı KÖK dizine, `js` içindeki 6 dosyayı `js` klasörüne yükleyin.
2. 1-2 dk bekleyin, sitede **Ctrl+F5**.
3. Başlıkta **"v8.11"** yazmalı.

## v8.11'de YENİ olanlar

### 1. Çalışmayı Kaydet — sayfa yenilense bile kaybolmaz
- Analiz sonrası sağ üstte **"💾 Çalışmayı Kaydet"** butonu var.
- Tıklayınca transfer çalışması tarihiyle birlikte kalıcı saklanır.
- "Önceki Transfer Çalışmaları" listesinde tarih bazlı görünür.
- Bir kaydın ÜZERİNE ÇİFT TIKLAYIN → o transferin tüm verisi geri
  yüklenir. Sonra "Excel İndir" derseniz o kaydın Excel'i iner.
- "📂 Aç" butonu da aynı işi yapar.

### 2. Üçüncü-tur kırık denetimi
- Önceden: 1. transfer turu → 2. simülasyon (transfer sonrası kırık yakalama).
- Şimdi: 2. turdan sonra **3. tur** çalışır. 2. turun kendi transferlerinin
  yarattığı zincir kırıkları veya gözden kaçan kırıkları yakalar.
- 3. turda da çözülemeyen kırıklar "üçüncü-tur onayı" etiketiyle Bekleyen
  listesinde — bunlar gerçekten elde kalan, iade/showroom adayı ürünlerdir.
- Çift kayıt önleme: aynı ürün Bekleyen'e iki kez yazılmaz.

## Test
1. Veri yükleyip analiz çalıştırın.
2. Sağ üstte "💾 Çalışmayı Kaydet" → tıklayın → onay mesajı gelmeli.
3. Sayfayı YENİLEYİN (F5). Ana ekranda "Önceki Transfer Çalışmaları"
   altında kaydınız tarihiyle görünmeli.
4. Kaydın üzerine ÇİFT TIKLAYIN → transfer tablosu geri gelmeli.
5. Kırık sekmesinde "⚡⚡ Üçüncü-tur" yazan satırlar olabilir — bu yeni
   denetim turunun çalıştığını gösterir.
