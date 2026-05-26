# UTOPIAN Transfer v8.15 — Yükleme ve Test

## Klasör yapısı
```
KÖK dizine:     index.html, style.css, manifest.json, sw.js
js/ klasörüne:  algo.js, data.js, ui.js, init.js, history.js, perf.js
```

## Yükleme
1. ZIP'teki 4 dosyayı KÖK dizine, `js` içindeki 6 dosyayı `js` klasörüne.
2. 1-2 dk bekleyin, sitede Ctrl+F5.
3. Başlıkta "v8.15" yazmalı.

## v8.15'te düzeltilen: Transfer modu görünüm karışıklığı

### Sorun
"Sadece Depodan" seçince tabloda "Kırık" türü kayıtlar görünüyor,
"kırık çalışması da çıkıyor" izlenimi veriyordu.

### Açıklama + çözüm
Algoritma zaten doğru çalışıyordu — sadece-depo modunda bağımsız
kırık/mağaza çalışması YAPILMIYOR. Görünen kayıtlar, depo transferinin
bir mağazada kırık bırakmaması için devreye giren SERİ TAMAMLAMA
destek transferleridir.

v8.15'te bunlar artık ayrı bir tür: **"🔗 Seri Tamamlama"** (yeşil).
Birleşik tabloda ve Excel'de "Kırık" olarak DEĞİL, "Seri Tamamlama"
olarak gösterilir. Kırık özet kartı yalnızca gerçek kırıkları sayar.

### Doğrulama (test sonuçları)
- Sadece-depo modu → tabloda yalnızca "Depo" + "Seri Tamamlama".
  Hiç "Kırık" veya "Mağaza" yok. Gerçek kırık kartı = 0.
- Sadece-mağaza modu → yalnızca "Mağaza" + "Kırık" + "Fazla Stok".
  Hiç "Depo" yok.

### Mantık (kullanıcının istediği gibi)
Sadece-depo modu: Bir ürünü en iyi satan mağaza (örn. Bursa) ama o
üründe tüm bedenleri stok=0 ise, depo oraya transfer edince kırık
oluşurdu. Bunu engellemek için mağazalar arası transfer SADECE o ürün
için devreye girer, diğer mağazalardan alıp Bursa'ya gönderir. Böylece
hem depodan doğru adrese çıkış olur hem Bursa'da kırık oluşmaz.

NOT: Eğer hâlâ eski sonuç görüyorsanız, "Önceki Transfer Çalışmaları"
listesinden ESKİ bir kaydı açıyor olabilirsiniz. Yeni analiz için
"Transfer Analizi Başlat" butonunu kullanın.
