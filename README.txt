UTOPIAN TRANSFER v8.4 HULYA FINAL

Bu paket, kullanıcı yorumlarındaki hatalı SKU senaryolarına göre algoritma düzeltmesi içerir.

Ana değişiklikler js/algo.js içindedir:
1. Kırık bedenler artık topluca tek mağazaya zorlanmaz; beden beden hedef seçilir.
2. Satış var + aynı beden stok 0 ise en yüksek öncelik verilir.
3. Full asortili mağazaya gereksiz transfer engellenir.
4. Hedefte ürün/rengin hiç geçmişi yoksa ve tek beden gönderimi yeni kırık yaratacaksa transfer bloklanır.
5. Aynı SKU + renk + beden aynı analizde yalnızca bir kez transfer edilebilir.
6. Depo -> mağaza seçiminde model/reng/beden satış geçmişi birlikte değerlendirilir.
7. Mağaza -> mağaza seçiminde hedef bazlı değil SKU+renk+beden bazlı kilit uygulanır.

Yükleme:
- Ana klasöre index.html, style.css, manifest.json, sw.js yükleyin.
- js klasörüne algo.js, data.js, history.js, init.js, perf.js, ui.js yükleyin.
- GitHub Pages canlı linkte Ctrl+Shift+R yapın.
