# UTOPIAN Transfer v8.14 — Yükleme ve Test

## Klasör yapısı
```
KÖK dizine:     index.html, style.css, manifest.json, sw.js
js/ klasörüne:  algo.js, data.js, ui.js, init.js, history.js, perf.js
```

## Yükleme
1. ZIP'teki 4 dosyayı KÖK dizine, `js` içindeki 6 dosyayı `js` klasörüne.
2. 1-2 dk bekleyin, sitede Ctrl+F5.
3. Başlıkta "v8.14" yazmalı.

## v8.14'te YENİ: Sadece-depo modunda seri tamamlama desteği

### Sorun neydi?
"Sadece Depodan Transfer" modunda, depodan çıkan bir ürün alıcı mağazada
KIRIK oluşturabiliyordu. Örnek: İzmir bir rengi çok satmış, depodan
1 beden gidiyor ama İzmir'de o üründe stok yok → tek başına kırık.

### Çözüm
Sadece-depo modunda artık şu kontrol var: Depo transferi bir mağazada
kırık bırakacaksa, o seriyi tamamlamak için:
1. ÖNCE depodan eksik bedenler eklenir,
2. SONRA diğer mağazalardan eksik bedenler gönderilir.

Kurallar:
- Kaynak mağazada kırık YARATILMAZ (o bedeni çıkarınca kaynak kırık
  olacaksa o mağazadan alınmaz).
- İyi satan mağazadan ürün sökülmez — kaynak olarak o üründe en az
  satışı olan mağaza seçilir.
- Seri bütünlüğü her zaman önceliklidir.

Bu destek SADECE "Sadece Depodan" modunda çalışır. İkisi de seçiliyse
zaten 2./3. tur kırık simülasyonu bu işi yapıyor.

Seri tamamlama transferleri raporda "🔗 Seri tamamlama" etiketiyle
ve transferTipi = SERI_TAMAMLAMA olarak görünür.

### Test sonucu
Sadece-depo modunda transfer sonrası kırık kalan hedef: 14 → 2'ye indi.
(Kalan 2: hiçbir mağazada/depoda eksik bedeni bulunamayan ürünler.)

## Önceki sürümlerden (korundu)
v8.13: YTD iptal, transfer modu, sezon tarihi, mükerrer denetimi.
v8.12: Mağaza × kategori DNA. v8.11: Çalışmayı Kaydet + 3. tur.
