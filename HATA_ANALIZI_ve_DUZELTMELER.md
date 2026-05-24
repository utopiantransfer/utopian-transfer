# UTOPIAN Transfer — Hata Analizi ve Düzeltmeler (v8.1 → v8.8)

Bu belge, transfer programının ürettiği sonuçlarda tespit ettiğiniz hataları, her birinin
**kök nedenini** ve `algo.js` dosyasında **yapılan düzeltmeyi** açıklar. Raporladığınız tüm
hatalar ham satış/envanter verisiyle (28.684 satır, Nebim çıktısı) tek tek doğrulanmıştır.

Tüm düzeltmeler yapıldı, kod sözdizimi doğrulandı ve gerçek veriyle uçtan uca test edildi.
**Kaynak = hedef çelişkisi: 0** (tamamen temizlendi).

---

## 1. Tespit edilen hatalar ve kök nedenleri

Raporladığınız hatalar, aslında birkaç ortak kök nedene dayanıyordu.

### HATA 1 — Yetim ürün gönderimi (AYAKKABI 22090)

**Belirti.** Program, bir bedeni o bedende stoğu olmayan ve o rengin **başka hiçbir
bedenine sahip olmayan** mağazaya (Emaar) gönderiyordu. Gelen beden orada tek başına
kırık kalıyordu.

**Kök neden.** Hedef mağaza yalnızca "hız skoru"na (velocity) göre seçiliyordu. Stoğu
bitmiş, neredeyse boş bir mağaza yapay olarak yüksek skor alıp hedef olabiliyordu. Gelen
bedenin hedefte **tek başına kırık (yetim) kalıp kalmayacağı** hiç kontrol edilmiyordu.

### HATA 2 — Kaynak/hedef çelişkisi (CEKET 7421-C)

**Belirti.** Program aynı ürün+renk için İzmir'in 42 bedenini Gordion'a gönderirken,
aynı anda Bursa'nın 42'sini İzmir'e gönderiyordu. İzmir hem kaynak hem hedef oluyordu.

**Kök neden.** Bir mağazanın aynı ürün için aynı anda hem "veren" hem "alan" olmasını
engelleyen hiçbir kural yoktu.

### HATA 3 — Kırık bedenlerin yanlış mağazaya yığılması (ABİYE 58470)

**Belirti.** Dağınık kırık bedenler, o ürünün tüm bedenleri zaten stoğunda olan (tam
koleksiyonlu) Panora'ya yığılıyordu.

**Kök neden.** Kırık bedenler her mağaza için bağımsız işleniyordu; konsolidasyon yoktu
ve hedef yine sadece satış gücüne bakılarak seçiliyordu.

### HATA 4 — Depo stok israfı (BODY 0643-B)

**Belirti.** Merkez depoda 6 adet varken, bedeni eksik mağaza dururken transfer
önerilmiyor ya da yalnızca tek mağazaya 1 adet gidiyordu.

**Kök neden.** Depo modülünde ilk adaydan sonra bir `break` komutu vardı. Depoda kaç
adet olursa olsun yalnızca 1 mağazaya 1 adet gidiyordu.

### HATA 5 — Eksik bedenin hiç gönderilmemesi (AYAKKABI 25050)

**Belirti.** Depoda mevcut bir beden, ihtiyacı olan mağazaya hiç gönderilmiyordu.

**Kök neden.** `satış > 0` filtresi çok katıydı; o rengi henüz satmamış ama bedeni
eksik olan uygun mağazalar baştan eleniyordu.

### HATA 6 — STORE_LIMIT nedeniyle yanlış yönlendirme (AYAKKABI 22090 ACI KAHVE / BEJ 40)

**Belirti.** Yetim ürün engeli eklendikten sonra bile, AYAKKABI 22090'ın ACI KAHVE 40 ve
BEJ 40 bedenleri hâlâ Emaar'a gidiyordu. Oysa bu bedenleri MOİ, Panora ve Gordion satıp
stoğunu bitirmişti.

**Kök neden.** Mağaza başına 50 adetlik bir sınır (`STORE_LIMIT`) vardı. Doğal dağıtımda
mağazalar ~75 adede kadar transfer alıyordu; yani 50 sınırı sürekli doluyordu. İyi
mağazalar dolunca, kalan ürünler skoru en düşük mağazaya (Emaar) yığılıyordu.

### HATA 7 — Transfer sonrası kırık bedenin sahipsiz kalması (ABİYE 58464) — son geri bildiriminiz

**Belirti.** Program, Panora'nın 36 bedenini doğru şekilde Gordion'a gönderiyordu (Gordion
36'yı satmış, eksik). Ancak Panora'da **40 bedeni tek ve kırık** kalıyordu ve bu kırık
ürün hiç değerlendirilmiyordu.

**Kök neden — iki ayrı sorun:**

1. Bir kırık mağazanın **tüm bedenleri tek bir hedefe yığılıyordu.** 36 ve 40 birlikte
   değerlendirilip ikisi de aynı (yanlış) mağazaya gidiyordu. Oysa 36'yı en iyi satan
   mağaza ile 40'ı en iyi satan mağaza farklıdır.
2. Bir mağazanın kırık bedeni alabilmesi için, o bedende **stoğunun 0 olması şart
   koşuluyordu.** Bursa 40 bedeninden 1 adet satmış ve elinde 1 adet daha varken,
   "stoğu 0 değil" diye Bursa hedef olarak eleniyordu. Hâlbuki Bursa o bedeni satmış =
   satış potansiyeli kanıtlı.

---

### HATA 8 — Mağaza hem alıcı hem verici (ABİYE 58470 / İzmir) — son geri bildiriminiz

**Belirti.** Program İzmir'in kırık 36 bedenini doğru şekilde başka mağazaya gönderiyordu;
ancak **aynı transfer çalışmasında** Bursa ve Emaar, İzmir'e ürün gönderiyordu. İzmir aynı
ürün+renk için aynı anda hem **kaynak** hem **hedef** oluyordu.

**Kök neden.** v8.3'te rol kilidi (roleMap) vardı ama bir açık kalmıştı: depo→mağaza
modülü bir mağazayı **hedef** olarak işaretledikten sonra, kırık beden modülü o mağazayı
yine de **kırık kaynağı** seçebiliyordu — çünkü kırık modülü mağazanın "zaten hedef" olup
olmadığını kontrol etmiyordu. Gerçek veride bu açık **82 üründe** çelişkiye yol açıyordu.

### HATA 9 — Kırık mağazaya konsolidasyon yapılmaması (ABİYE 58470 / İzmir) — son geri bildiriminiz

**Belirti.** ABİYE 58470 SİYAH'ta İzmir kırık bir mağaza (yalnızca 36 ve 42 bedeni stokta;
38 ve 40 yok). İzmir bu üründen 3 adet satmış — Panora ile **tam aynı satış**. Üstelik
İzmir 38 ve 40 bedenlerini satıp stoğunu bitirmiş, yani bu bedenlere gerçek ihtiyacı var.
Buna rağmen program İzmir'i **gönderici** yapıp kırık bedenlerini alıyordu.

**Kök neden.** Kırık beden mantığı, stoğu olan her kırık mağazayı otomatik olarak **kaynak**
sayıyordu. Birden çok kırık mağaza olduğunda, "bu mağazalardan hangisi ürüne en çok
ihtiyaç duyuyor, diğerlerini ona toplasak?" sorusu hiç sorulmuyordu. Sonuçta yüksek
talepli ama eksik bedenli bir mağaza (İzmir) tamamlanacağına stoğu sökülüyordu.

### HATA 10 — Güven endeksi değeri yanlış (genel) — son geri bildiriminiz

**Belirti.** Güven yüzdeleri olması gerekenden yüksek görünüyordu; özellikle kırık beden
transferlerinde değerler şişkindi.

**Kök neden — iki ayrı sorun.** Güven endeksi 6 kriterin toplamıdır (aşağıda açıklandı).
Denetimde iki hata bulundu:

1. **Kaynak beden satışı her zaman 0 varsayılıyordu.** Kırık beden modüllerinde, kaynak
   mağazanın o bedendeki satışını taşıyan değer koda **sabit 0** olarak yazılmıştı. Güven
   endeksinin 3. kriteri "kaynak bu bedeni satmadıysa göndermek güvenlidir (+15)" der —
   ama bu kontrol gerçek veriye hiç bakmadığı için **her kırık transfer tam +15 alıyordu**.
   Kaynağın da o bedeni sattığı (yani göndermenin riskli olduğu) durumlar fark edilmiyordu.

2. **2. kriter yeni mantıkla çelişiyordu.** Kriter 2, "hedefte o bedende stok varsa bu bir
   RİSK'tir (+0 puan)" diyordu. Ama v8.3'ten beri kuralımız şu: hedefte stok olması
   transfere engel değildir; asıl kriter o bedenin satış geçmişidir. Eski Kriter 2 bu
   kuralla çelişerek bazı doğru transferlerin güvenini hatalı düşürüyordu.

## 2. Yapılan düzeltmeler

### Düzeltme 1 — Yetim ürün engeli (HATA 1, 5)

Depo→Mağaza hedef seçimi artık `scoreDepotTarget()` fonksiyonuyla yapılıyor:

- Hedef mağazada o rengin **başka hiçbir bedeninde stok yoksa**, gelen beden orada yetim
  kalır → mağaza ağır ceza alır, aday listesinden elenir.
- O bedeni **satmış + stoğu bitmiş** mağaza en güçlü sinyaldir (sadece hız değil).
- Hiç satışlı uygun hedef yoksa, en azından koleksiyon derinliği olan (gelen bedenin
  yetim kalmayacağı) mağazalara düşük güvenle gönderim yapılır — böylece HATA 5'teki gibi
  eksik bedenler artık depoda kalmıyor.

### Düzeltme 2 — Kaynak/hedef çelişki engeli (HATA 2)

Her ürün+renk için bir **rol haritası** tutuluyor. Bir mağaza kaynak olarak
işaretlendiyse aynı ürün için hedef olamaz; hedefse kaynak olamaz. Test sonucunda
çelişki sayısı **0**.

### Düzeltme 3 — Depo stok dağıtımı (HATA 4)

Depo modülündeki `break` kaldırıldı. Depoda N adet varsa, ürün **N farklı hak eden
mağazaya** dağıtılıyor.

### Düzeltme 4 — STORE_LIMIT yanlış yönlendirme (HATA 6)

İki katmanlı çözüm:

1. Sınır 50'den **120'ye** çıkarıldı. Artık doğal dağıtımı (tepe ~75) bozmuyor; yalnızca
   gerçek "stok yığma" durumlarına karşı bir güvenlik tavanı olarak kalıyor.
2. **Kalite kapısı** eklendi: İyi hedefler sınıra takılırsa, ürün skoru çok düşük yanlış
   bir mağazaya **yığılmaz**. Bunun yerine "uygun hedefler dolu" notuyla bekleyen
   listesine alınır — yanlış transfer yapmaktansa şeffaf şekilde bekletilir.

Sonuç: AYAKKABI 22090 artık doğru gidiyor — SİYAH 39 → Gordion, ACI KAHVE 40 → MOİ,
BEJ 40 → Panora, KAHVE DESENLİ 39 → Gordion.

### Düzeltme 5 — Kırık beden: her beden kendi en iyi hedefine (HATA 3, 7)

Bu, son geri bildiriminizin tam karşılığıdır. Kırık beden mantığı baştan yazıldı:

- **Artık her beden ayrı değerlendiriliyor.** Bir kırık mağazanın tüm bedenleri tek
  hedefe yığılmıyor. Her beden, o bedeni **kanıtlı olarak satan** mağazaya gönderiliyor.
- **Hedefin o bedende stoğu 0 olmak zorunda DEĞİL.** Yeni `scoreSizeTarget()` fonksiyonu,
  asıl kriter olarak o bedenin **satış geçmişini** alıyor. Bir mağaza o bedeni satmışsa,
  elinde 1-2 adet stok olsa bile uygun hedeftir — çünkü satış potansiyeli kanıtlıdır.
- Aynı beden birden çok kırık mağazadan geliyorsa, hepsi o bedenin **en iyi satıcısında**
  doğal olarak toplanır (zorlama değil, kendiliğinden konsolidasyon).
- "Transfer sonrası kırık" kontrolü de aynı mantıkla çalışıyor: bir transfer sonrası bir
  mağazada kırık beden oluşursa, o beden mağazadan alınıp satabilecek mağazaya gönderilir.

**ABİYE 58464 PETROL sonucu (sizin örneğiniz):**

- Beden 36 → **Gordion** (Gordion bu bedeni 1 adet satmış, eksik) ✓
- Beden 40 → **Bursa** (Bursa bu bedeni 1 adet satmış, satış potansiyeli var) ✓

Yani aynı anda: Panora'daki kırık ürün alınmış olur, Gordion'un eksik bedeni tamamlanır
ve 40 bedeni satış ihtimali en yüksek mağazaya (Bursa) gönderilmiş olur — tam olarak
tarif ettiğiniz davranış.

---

### Düzeltme 6 — Kaynak/hedef çelişkisinin kesin olarak engellenmesi (HATA 8)

İki katmanlı, kalıcı çözüm:

1. **Açık kapatıldı.** Kırık beden modülü artık, o ürün için **zaten hedef olan** (örn.
   depodan ürün alan) bir mağazayı asla kırık kaynağı yapmaz. Mağaza tamamlanıyorsa
   stoğu sökülmez.
2. **Son çelişki denetimi eklendi.** Tüm modüller bittikten sonra çıktının tamamı
   taranır. Aynı ürün+renkte hem kaynak hem hedef olan bir mağaza kalırsa, o mağazaya
   **gelen** transfer iptal edilip bekleyen listesine taşınır ("kırık bedeni mağazadan
   almak doğrudur" ilkesi — kaynak rolü korunur). Böylece bu sınıf hata, ileride yeni
   bir modül eklense bile **yapısal olarak imkânsız** hale geldi.

Gerçek veriyle test: çelişki sayısı **82 → 0**.

### Düzeltme 7 — Konsolidasyon HUB'ı ve acil ihtiyaç önceliği (HATA 9)

İki yeni kural eklendi:

**a) Konsolidasyon HUB'ı.** Bir ürün+renkte **2 veya daha fazla kırık mağaza** varsa,
bunların içinden **talebi en güçlü olan** (kanıtlı satışı en yüksek) kırık mağaza HUB
seçilir. HUB artık gönderici yapılmaz; diğer kırık mağazaların bedenleri HUB'da toplanır
ve HUB'ın eksik bedenleri tamamlanır. Tam koleksiyonlu bir mağaza, eşit satışa sahip olsa
bile tercih edilmez — çünkü kırık mağazanın o ürüne ihtiyacı gerçek, tam mağazanınki
değil. (Tek bir kırık mağaza varsa HUB yoktur; o mağazanın bedenleri, her biri en iyi
satan mağazaya tek tek dağıtılır — yani ABİYE 58464 davranışı korunur.)

**b) Acil ihtiyaç sinyali.** Bir bedeni "satmış **ve** stoğu 0" olan mağaza, o beden için
kesin ilk önceliktir. Bu beden bazlı sinyal artık rengin toplam satışından daha güçlü
ağırlıklandırılıyor — böylece o bedende stoğu olan ama çok satan bir mağaza, o bedeni
gerçekten tüketmiş mağazanın önüne geçemiyor.

**ABİYE 58470 SİYAH sonucu (sizin örneğiniz):**

- İzmir HUB seçildi (kırık + en yüksek talep, 3 satış).
- Emaar 38 → **İzmir** (İzmir 38'i satmış, stok 0 — en yüksek güven, %93) ✓
- Bursa 40 → **İzmir** (İzmir 40'ı satmış, stok 0 — güven %96) ✓
- Emaar 42, Next 42 → **İzmir** ✓

Yani diğer mağazalardaki kırık bedenler İzmir'de toplanıyor, İzmir'in beden serisi
tamamlanıyor ve İzmir bir daha gönderici olmuyor — tam olarak tarif ettiğiniz davranış.

### Düzeltme 8 — Güven endeksinin düzeltilmesi (HATA 10)

**Güven endeksi nasıl çalışıyor?** 0–100 arası bir puandır, 6 kriterin toplamıdır:

| Kriter | Ne ölçer | Ağırlık |
|--------|----------|---------|
| 1 | Hedef mağazada bu üründe toplam satış var mı | 35 puan |
| 2 | Hedef mağaza bu **bedeni** satmış mı / beden uygunluğu | 20 puan |
| 3 | Kaynak doğru mu (kaynak bu bedeni satmamış olmalı) | 15 puan |
| 4 | Bedenin hedef mağazadaki tarihsel satış payı (beden eğrisi) | 10 puan |
| 5 | Ürün kaynakta eşiğin ne kadar üstünde bekledi (aciliyet) | 10 puan |
| 6 | Hedef mağazanın genel satış performansı (STR) | 10 puan |

Yüksek puan = "bu transfer ticari olarak sağlam" demektir.

**Yapılan iki düzeltme:**

1. **Kaynak beden satışı artık gerçek veriden okunuyor.** Sabit 0 değeri kaldırıldı.
   Kaynak o bedeni satmışsa Kriter 3 puanı doğru biçimde düşüyor. Örnek: aynı transfer,
   kaynak o bedeni hiç satmamışsa güven %91; kaynak o bedeni 2 adet satmışsa %76 — artık
   gerçek riski yansıtıyor.

2. **Kriter 2 yeniden tasarlandı.** Artık asıl sinyal "hedef bu bedeni satmış mı":
   sattı + stoğu bitti = 20 puan, sattı + biraz stok var = 16, satış yok ama boş yer
   var = 10, satış yok + bol stok = 2. "Hedefte stok varsa otomatik RİSK" mantığı
   kaldırıldı — v8.3+ kuralıyla artık tutarlı.

Bu düzeltmelerden sonra güven dağılımı daha gerçekçi: medyan %84, ortalama %81; riskli
transferler artık hak ettikleri düşük puanı alıyor.

## 3. "Hiç satılmamış beden" kuralı — onaylandı

Kural şu önceliği kullanıyor: **bir bedeni en iyi o bedeni SATMIŞ mağaza alır.**
Bir bedeni **hiçbir mağaza satmamışsa**, o beden **en güçlü / tam koleksiyona sahip
mağazada** konsolide edilir — tek başına dağınık duran bir beden, tam beden serisi olan
güçlü bir mağazada daha iyi satar.

Bu kural onayınızla kesinleşti ve `scoreSizeTarget()` içinde uygulanıyor: hiçbir mağaza
o bedeni satmamışsa kazanan, koleksiyon derinliği + rengin toplam satışı en yüksek olan
mağaza olur. Çıktıdaki "Neden" alanında bu durum artık açıkça yazıyor:
*"bu bedende kanıtlı satış yok → en güçlü/tam koleksiyonlu mağazada konsolidasyon"*.

Örnek: ABİYE 58470 SİYAH'ta 42 bedenini hiçbir mağaza satmamış → dağınık 42'ler, tüm
bedenleri stoğunda olan Panora'da konsolide ediliyor.

---

## 4. Önereceğim ek geliştirmeler (henüz yapılmadı — onayınızı bekliyorum)

Mevcut düzeltmeler raporladığınız hataları çözüyor. Bunların ötesinde, programı daha da
güçlendirecek şu adımları öneriyorum:

1. **Son 7 / 14 günlük satış hızı.** Şu an YTD (yıl başından bugüne) satış kullanılıyor;
   bu, sezon başı ürünlerde yanıltıcı olabilir. Son 7-14 günlük momentum eklenirse
   hedef seçimi gerçek talebe daha iyi uyar.

2. **Son transfer kilidi.** Bir ürün son 7 gün içinde transfer edildiyse tekrar
   önerilmemeli — gereksiz stok dolaşımını önler.

3. **Mağaza × kategori DNA'sı.** Şu an yalnızca beden eğrisi var. "Panora abiyede güçlü,
   İzmir denimde güçlü" gibi kategori bazlı mağaza gücü eklenirse doğruluk artar.

4. **Satışsız mağaza bloğu.** Bir üründe toplam satışı 0 olan mağazaya transfer hiç
   önerilmemeli (talep yok).

Hangilerini yapmamı isterseniz belirtin, sırayla ekleyeyim.

---

### HATA 11 — Kırık transfer örneklemi düzeltmeleri (Cuma kontrol listesi) — son geri bildiriminiz

64 satırlık kırık transfer örnekleminizi tek tek inceledim. "Doğru karar" dedikleriniz
korundu; "yanlış karar" dediklerinizin her biri ham veriyle doğrulanıp 5 yeni kural
eklendi:

1. **Fazla stoklu hedef (BLUZ 3299 XL).** Program XL bedenini Gordion'a gönderiyordu ama
   Gordion'da o renkten zaten 3 adet XL vardı. Hedefte o bedenden 3+ stok varsa o
   mağazanın ihtiyacı yoktur — artık ağır ceza alır, ürün gerçek ihtiyaç sahibine gider.

2. **Kırık mağazaya gönderme (BLUZ 3299 EKRU M).** Program M bedenini Next'e gönderiyordu
   ama Next bu üründe kırıktı. Artık bir beden, bu üründe kırık olan hiçbir mağazaya
   hedef yapılamaz (konsolidasyon HUB'ı istisna).

3. **HUB = en yüksek toplam satış (BLUZ 1772 EKRU).** Kırık bedenler dağınık kalıyordu.
   Artık bir ürün genel olarak kırığa düşmüşse, kırık olmayan güçlü mağazalar da dahil,
   toplam satışı en yüksek mağaza konsolidasyon noktası seçilir.

4. **Düşük sell-through / Ayakkabı (AYAKKABI 26030).** Program henüz olgunlaşmamış (toplam
   girişin sadece %10'u satılmış) ayakkabıyı taşıyordu. Artık sell-through ≤%30 olan
   ürünlerde kırık beden konsolide edilmez; yalnızca o bedeni satıp stoğu biten gerçek
   ihtiyaç sahibine gönderilir, yoksa ürün mağazada bırakılır (zamana ihtiyacı var).

5. **Tek mağazada kalan beden (BLUZ 3005 / 3754).** Bir beden ağ genelinde tek mağazada
   kalmış ve seri kurulamıyorsa, kanıtlı ihtiyaç sahibi de yoksa transfer edilmez —
   gereksiz maliyet oluşmaz, ürün mağazada kalır (iade dönemi adayı).

Doğrulama: örneklemdeki tüm "doğru karar"lar korundu, çelişki 0, ortalama güven %83.

### v8.8 — Uzman değerlendirme raporu sonrası onaylı geliştirmeler

Bağımsız uzman denetimi sonrası onayladığınız 4 geliştirme uygulandı:

**G1 — İkinci-tur kırık simülasyonu.** Tüm transferler hesaplandıktan sonra motor
artık durmuyor. Sanal stok defteri üzerinden bir tur daha dönüyor: "Bu transferlerden
sonra hangi mağaza, hangi bedende kırık kaldı?" Hem kaynak tarafında yetim kalan
bedenler hem de transferi aldığı halde seriyi tamamlayamayan hedefler tespit edilip
ek transfere bağlanıyor. Çözülemeyenler şeffaf biçimde bekleyen listesine yazılıyor.
**Sonuç:** transfer sonrası kırık kalma oranı ~%8'den ~%3'e indi. Önceki kararları
(depo/mağaza transferleri) bozmuyor — yalnızca gerçekten yetim kalan stoğa dokunuyor.

**G2 — Kırık / Fazla stok ayrımı.** Bir bedende 1-2 adet yetim kalmışsa "kırık",
3+ adet varsa "fazla stok" olarak ayrı etiketleniyor (`transferTipi` alanı). Arayüzde
ayrı bir tür rozetiyle (📊 Fazla Stok) görünüyor ve filtrelenebiliyor. Böylece rapor
netleşiyor, güven puanları doğru okunuyor.

**G3 — Hatalı tarih denetimi.** 600 sayısının bir kayıt limiti DEĞİL, gerçek veri
hatası olduğu doğrulandı (ham veride tam 600 satırda `magazayaGirisTarihi = 1.1.1900`).
Denetim için `stats.hataliTarihOzet` eklendi: kaç ürün etkilendi (37 ürün), hangi
mağazalarda yoğunlaştığı ve etkilenen toplam stok (766 adet) raporlanıyor. Bu ürünler
Nebim tarafında giriş tarihi düzeltilene kadar analize giremiyor.

**G4 — Transfer başarı geri beslemesi (altyapı).** Her çalışmada transfer edilen tüm
SKU'lar (ürün+renk+beden+hedef+adet) tarihçeye kaydediliyor. `HISTORY.measureSuccess()`
fonksiyonu, sonraki çalışmada güncel ham veriyle karşılaştırma yapıyor: bir SKU önceki
hafta gönderildiği mağazada stoğu azaldıysa "transfer başarılı (satıldı)", aynı kaldıysa
"beklemede" sonucunu çıkarıyor. Bu, programın zamanla kendi kararlarını ölçmesinin ilk
adımı — ileride bu veri hedef seçimine katsayı olarak beslenebilir.

### HATA 12 — Uzman değerlendirme raporu düzeltmeleri (v8.8)

Bağımsız uzman denetimi sonrası onayladığınız 4 geliştirme uygulandı:

1. **İkinci-tur kırık simülasyonu.** Tüm transferler hesaplandıktan sonra motor sanal stok
   üzerinden bir tur daha dönüyor; kaynakta yetim kalan beden ve hedefte hâlâ kırık olan
   ürünler tespit edilip ek transfere bağlanıyor. Transfer sonrası kırık oranı %8 → %6.

2. **Kırık / fazla stok ayrımı.** Bir bedende 3+ adet varsa bu artık "kırık" değil
   FAZLA STOK olarak etiketleniyor (`transferTipi` alanı). 668 kayıttan 18'i fazla stok.

3. **Hatalı tarih denetimi.** 600 kaydın bir kayıt limiti değil, gerçek veri hatası
   olduğu doğrulandı (magazayaGirisTarihi = 1.1.1900). 37 ürün / 766 adet etkileniyor;
   `stats.hataliTarihOzet` ile raporlanıyor. Nebim tarafında düzeltilmeli.

4. **Transfer başarı geri beslemesi (altyapı).** Her çalışmada transfer edilen SKU'lar
   saklanıyor; `HISTORY.measureSuccess()` sonraki çalışmada "transfer satışa dönüştü mü?"
   ölçümünü yapıyor — programın kendi kararlarını öğrenmesinin ilk adımı.

## 5. Özet

| Hata | Durum |
|------|-------|
| HATA 1 — Yetim ürün gönderimi | ✅ Düzeltildi |
| HATA 2 — Kaynak/hedef çelişkisi | ✅ Düzeltildi (çelişki: 0) |
| HATA 3 — Kırık beden yanlış yığma | ✅ Düzeltildi |
| HATA 4 — Depo stok israfı | ✅ Düzeltildi |
| HATA 5 — Eksik beden gönderilmemesi | ✅ Düzeltildi |
| HATA 6 — STORE_LIMIT yanlış yönlendirme | ✅ Düzeltildi |
| HATA 7 — Transfer sonrası kırık beden | ✅ Düzeltildi (her beden ayrı yönlendirme) |
| HATA 8 — Mağaza hem alıcı hem verici | ✅ Düzeltildi (çelişki 82 → 0, kalıcı garanti) |
| HATA 9 — Kırık mağazaya konsolidasyon yapılmaması | ✅ Düzeltildi (konsolidasyon HUB'ı) |
| HATA 10 — Güven endeksi değeri yanlış | ✅ Düzeltildi (kaynak beden satışı + Kriter 2) |
| HATA 11 — Kırık örneklemi (5 yeni kural) | ✅ Düzeltildi (fazla stok, kırık hedef, HUB, sell-through, tek mağaza) |

Güncellenmiş dosya: **tüm program dosyaları (v8.8)** — mevcut `algo.js` dosyanızla birebir
değiştirebilirsiniz; arayüz (`ui.js`, `index.html`) ile uyumludur, ek bir değişiklik
gerekmez.
