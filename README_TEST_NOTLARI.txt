# UTOPIAN Transfer v8.2 — Hülya Fix Test Paketi

Bu pakette mevcut program dosyaları korunarak algoritma tarafına ticari karar düzeltmeleri eklendi.

## Değiştirilen ana dosya
- `js/algo.js`

## Eklenen kritik kurallar
1. Full asortili mağazaya gereksiz transfer engeli
2. Satışsız hedef mağazaya transfer engeli
3. Aynı SKU + renk + beden + hedef için transfer kilidi
4. Kaynak mağazayı kırık hale getiren transfer engeli
5. Kırık beden konsolidasyonunda hedef mağaza ihtiyacı kontrolü
6. Depo → mağaza kararında velocity yerine beden ihtiyacı + satış + mağaza DNA skoru
7. Mağaza → mağaza kararında transfer sonrası hasar kontrolü
8. Dağınık stok için konsolidasyon modu hazırlığı

## Test için kullanım
1. Bu klasörü GitHub repo ana dizinine yükleyin.
2. `index.html`, `style.css`, `manifest.json`, `sw.js` ana dizinde kalmalı.
3. `js` klasörü içindeki dosyalar aynı şekilde `js/` klasörüne yüklenmeli.
4. Yayından sonra Chrome'da Ctrl + Shift + R yapın.
5. Nebim satış & envanter dosyasını tekrar yükleyip analiz başlatın.

## Testte özellikle bakılacak noktalar
- Full bedeni olan mağaza artık hedef seçiliyor mu? Seçilmemeli.
- Panora gibi full asortili mağazalara gereksiz kırık beden gidiyor mu? Gitmemeli.
- İzmir/Gordion gibi bedeni eksik ve satışı olan mağazalar öncelik alıyor mu? Almalı.
- Aynı SKU + renk + beden aynı analizde tekrar tekrar öneriliyor mu? Önerilmemeli.
- Kaynak mağazadan ürün çıkınca o mağaza kırık hale geliyor mu? Program bunu engellemeli.

## Not
Bu paket test sürümüdür. Gerçek operasyon öncesi 1-2 analiz Excel export karşılaştırması yapılması önerilir.
