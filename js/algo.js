// ============================================================
// UTOPIAN TRANSFER v8.16 — ALGORİTMA MODÜLÜ
//
// v8.15 DÜZELTMESİ (kullanıcı geri bildirimi — transfer modu görünümü):
//  36. SERİ TAMAMLAMA AYRI TÜR — Sadece-depo modunda devreye giren seri
//      tamamlama transferleri artık birleşik tabloda ve Excel'de "Seri
//      Tamamlama" (🔗) türüyle gösterilir; "Kırık" sayılmaz. Kırık beden
//      özet kartı yalnızca gerçek kırıkları sayar. Böylece sadece-depo
//      modunda "kırık çalışması da çıkıyor" karışıklığı giderildi —
//      çıkan kayıtlar depo transferinin seri bütünlüğü desteğidir.
//
//  35. SADECE-DEPO MODU SERİ TAMAMLAMA DESTEĞİ — "Sadece Depodan Transfer"
//      modunda bile, depodan çıkan ürün alıcı mağazada KIRIK oluşturacaksa,
//      o mağazaya önce depodan sonra diğer mağazalardan eksik bedenler
//      gönderilip seri tamamlanır. Kaynak mağazada kırık YARATMAMA koşulu
//      ve "iyi satan mağazadan ürün sökme" kuralı korunur. Seri bütünlüğü
//      her zaman önceliklidir. Tam modda devreye girmez (2./3. tur yapar).
//
//  31. YTD SIRALAMASI İPTAL — Sabit mağaza sıralaması kaldırıldı. Hedef
//      seçiminde eşitlik bozucu artık ÜRÜN+RENK TOPLAM SATIŞ, sonra stok
//      zenginliği. Mağazanın o üründeki gerçek performansı esas alınır.
//  32. TRANSFER MODU SEÇİMİ — İki kutucuk: "Sadece Depodan" / "Mağaza
//      Arası + Kırık". Sadece depo seçiliyse mağaza+kırık modülleri (2./3.
//      tur simülasyon dahil) hiç çalışmaz; sadece depodan beden tamamlama.
//  33. SEZON BAŞLANGIÇ TARİHİ — Sezon koduna ek tarih alanı (Y26→16.02.2026).
//      Kod↔tarih eşlemesi kalıcı saklanır; stats.seasonStart ile raporlanır.
//  34. MÜKERRER TRANSFER DENETİMİ — Aynı ürün+renk+beden+kaynak+hedef
//      ikilisi iki kez listelenmişse fazlası çıktıdan silinir.
//
//  30. MAĞAZA × KATEGORİ DNA — Her mağazanın her ana grupta (kategori)
//      gerçek satış gücü hesaplanır (DNA katsayısı: 1.0 ortalama, >1 güçlü,
//      <1 zayıf). Hedef seçiminde küçük ama anlamlı ağırlık olarak kullanılır
//      — sabit YTD sıralamasının kategori körlüğünü giderir. Abiye kırığı
//      abiyede güçlü mağazaya, denim kırığı denimde güçlü mağazaya yönlenir.
//      DNA tablosu IndexedDB'de saklanır; her veri yüklemesinde harmanlanarak
//      güncellenir (yeni %60 + birikmiş geçmiş %40). Sezon başlangıcı
//      16.02.2026 olduğundan sezonun TÜM satış verisi esas alınır.
//
//  28. ÇALIŞMAYI KAYDET — Analiz sonucu artık "Çalışmayı Kaydet" butonuyla
//      geçmişe (IndexedDB) TAM olarak saklanır. Sayfa yenilense bile kalır;
//      "Önceki Transfer Çalışmaları" listesinde tarihiyle görünür, çift
//      tıklamayla tüm transfer verisi + Excel geri yüklenir.
//  29. ÜÇÜNCÜ-TUR KIRIK DENETİMİ — İkinci-tur simülasyonun ardından üçüncü
//      bir güvenlik taraması: ikinci turun kendi transferlerinin yarattığı
//      zincir kırıkları veya gözden kaçan kırıkları yakalar. Çözülemeyenler
//      "üçüncü-tur onayı" ile elde kalan (iade/showroom adayı) işaretlenir.
//      Çift kayıt önleme: aynı SKU bekleyene iki kez yazılmaz.
//
//  26. FOTOĞRAF YÖNETİMİ — Klasör seçimi tek akışta: tüm ürün klasörleri
//      taranır, SADECE bellekte olmayan fotoğraflar IndexedDB'ye kaydedilir
//      (artımlı). Çift-tık kilidi ("picker already active" hatası giderildi).
//      Son güncelleme tarihi saklanır. Fotoğraflar kalıcıdır.
//  27. GÜVEN ENDEKSİ KALİBRASYONU — Kriter 1/2/4/5 tabanları, mantıksal
//      olarak sağlam transferler (seri tamamlama, konsolidasyon) için
//      yükseltildi. seriTamamlama sinyali eklendi. Ortalama %79→%84.
//      NOT: Gerçekten belirsiz transferler (satışı olmayan tekil ürün)
//      bilinçli olarak düşük puanda bırakıldı — güven dürüst kalmalı.
//
//  25. 1.1.1900 = YOLDA / YENİ GİRİŞ (veri hatası DEĞİL). Ürün depoya yeni
//      girmiş ve mağazaya sevk edilmiş; mağaza henüz fiziksel teslim almamış
//      (nakil). Bu ürünler transfere DAHİL EDİLMEZ; result.yolda listesinde
//      ve UI'da "Yeni Giriş / Yolda" sekmesi + ayrı Excel sayfasında raporlanır.
//
// v8.8 GELİŞTİRMELERİ (uzman değerlendirme raporu — onaylı öneriler):
//  21. İKİNCİ-TUR KIRIK SİMÜLASYONU — Tüm transferler bittikten sonra sanal
//      stok üzerinden bir tur daha dönülür. Transfer sonrası kırık kalan
//      mağazalar (kaynak yetimi + hedef kırığı) tespit edilip ek transfere
//      bağlanır. Post-transfer kırık oranı ~%8'den ~%6'ya indi.
//  22. KIRIK / FAZLA STOK AYRIMI — Bir bedende 3+ adet varsa bu "kırık"
//      değil FAZLA STOK'tur; transferTipi alanıyla ayrı etiketlenir.
//  23. YENİ GİRİŞ / YOLDA ÖZETİ — 1.1.1900 kayıtları yolda ürün olarak
//      tespit edilir; stats.yoldaOzet ile ürün/mağaza dökümü raporlanır.
//  24. TRANSFER BAŞARI GERİ BESLEMESİ (altyapı) — Her çalışmada transfer
//      edilen SKU'lar saklanır; HISTORY.measureSuccess() sonraki çalışmada
//      "transfer satışa dönüştü mü?" ölçümünü yapar.
//
// v8.7 DÜZELTMELERİ (kullanıcı kırık transfer örneklemi — Cuma kontrol listesi):
//  16. FAZLA STOKLU HEDEF ENGELİ — Hedefte o bedenden 3+ stok varsa o
//      mağazanın bu bedene ihtiyacı yok; ağır ceza (BLUZ 3299 XL hatası).
//  17. KIRIK MAĞAZAYA GÖNDERME — Bir beden, bu üründe kırık olan hiçbir
//      mağazaya hedef yapılamaz (HUB istisna). Saf stok kontrolüyle tespit.
//  18. HUB = EN YÜKSEK TOPLAM SATIŞ — Konsolidasyon hedefi, kırık olmayan
//      güçlü mağazalar da dahil, toplam satışı en yüksek mağazadır
//      (BLUZ 1772 EKRU → Gordion).
//  19. DÜŞÜK SELL-THROUGH (AYAKKABI) — Ürün olgunlaşmamışsa (sell-through
//      ≤%30) kırık bedeni konsolide etme; yalnızca o bedeni satıp tüketmiş
//      gerçek ihtiyaç sahibine gönder, yoksa mağazada bırak (AYAKKABI 26030).
//  20. TEK MAĞAZADA KALAN BEDEN — Beden tek mağazada + seri kurulamıyorsa
//      ve kanıtlı ihtiyaç sahibi yoksa transfer etme, mağazada bırak (iade
//      adayı) — BLUZ 3005 / 3754 örneği.
//
// v8.6 DÜZELTMELERİ (kullanıcı geri bildirimi — güven endeksi denetimi):
//  14. GÜVEN HATASI — kaynakBeden_satis sabit 0. Kırık modüllerinde kaynak
//      mağazanın o bedendeki satışı her zaman 0 varsayılıyordu → Kriter 3
//      hep tam +15 veriyor, güveni yapay yükseltiyordu. Artık gerçek veriden
//      okunuyor; kaynak o bedeni satmışsa güven doğru biçimde düşüyor.
//  15. GÜVEN — Kriter 2 yeniden tasarlandı. "Hedefte stok varsa RİSK (+0)"
//      mantığı v8.3+ kuralıyla çelişiyordu. Artık asıl sinyal "hedef o
//      bedeni satmış mı"; stok yalnızca küçük bir ayar faktörü.
//
// v8.5 DÜZELTMELERİ (kullanıcı geri bildirimi — ABİYE 58470 İzmir konsolidasyonu):
//  12. KONSOLİDASYON HUB'I — Bir ürün+renkte 2+ kırık mağaza varsa, talebi
//      en güçlü olan kırık mağaza (kanıtlı satış) HUB seçilir. HUB gönderici
//      yapılmaz; diğer kırık mağazaların bedenleri HUB'da toplanır ve HUB'ın
//      eksik bedenleri tamamlanır. Tam koleksiyonlu mağaza eşit satışta bile
//      tercih edilmez — kırık mağazanın ürüne ihtiyacı daha fazladır.
//  13. ACİL İHTİYAÇ SİNYALİ — Bir bedeni "satmış + stoğu 0" olan mağaza, o
//      beden için kesin ilk önceliktir; bu sinyal rengin toplam satışından
//      daha güçlü ağırlıklandırıldı (ABİYE 58464 / 36 bedeni → Gordion).
//
// v8.4 DÜZELTMELERİ (kullanıcı geri bildirimi — ABİYE 58470 İzmir çelişkisi):
//  10. KAYNAK/HEDEF ÇELİŞKİSİ — DEPO vs KIRIK AÇIĞI KAPATILDI. Bir mağazaya
//      depo→mağaza ile ürün gönderilirken, aynı çalışmada kırık beden modülü
//      o mağazadan ürün ÇIKARABİLİYORDU (mağaza hem alıcı hem verici). Artık
//      kırık modülü, o ürün için ZATEN HEDEF olan mağazayı kaynak yapmaz.
//  11. SON ÇELİŞKİ DENETİMİ — Tüm modüller bittikten sonra çıktının tamamı
//      taranır; aynı ürün+renkte hem kaynak hem hedef olan mağaza KALMADIĞI
//      garanti edilir. Artık bu sınıf hata yapısal olarak imkânsızdır.
//
// v8.3 DÜZELTMELERİ (kullanıcı geri bildirimi — ABİYE 58464):
//   8. KIRIK BEDEN — HER BEDEN AYRI YÖNLENDİRİLİR. Eski sürümde bir kırık
//      mağazanın tüm bedenleri TEK hedefe yığılıyordu (Panora'nın 36+40'ı
//      birlikte boş MOİ'ye). YENİ: her beden, o bedeni KANITLI satan mağazaya
//      gider (36→Gordion, 40→Bursa). Aynı beden birden çok kaynaktan gelirse
//      o bedenin en iyi satıcısında doğal olarak konsolide olur.
//   9. HEDEFTE STOK ŞARTI KALDIRILDI. Kırık bedeni alan mağazanın o bedende
//      stoğu 0 olmak ZORUNDA değildir; asıl kriter o bedenin satış geçmişidir.
//      (Bursa 40'ı 1 adet satmış + elinde 1 stok → yine de uygun hedef.)
//      Yeni skorlama: scoreSizeTarget().
//
// v8.2 DÜZELTMELERİ (kullanıcı hata analizine göre):
//   1. YETİM ÜRÜN ENGELİ — Depo→Mağaza: gelen beden hedefte tek başına
//      kırık kalmasın. Hedefin o renkte BAŞKA bedeninde stoğu olmalı.
//   2. KANITLI BEDEN TALEBİ — O bedeni satmış + stoğu bitmiş mağaza önceliklidir
//      (sadece velocity skoru değil).
//   3. KIRIK BEDEN KONSOLİDASYONU — Dağınık kırıklar TEK hedefte toplanır;
//      tam koleksiyonu olan mağazaya yığma yapılmaz.
//   4. KAYNAK/HEDEF ÇELİŞKİ ENGELİ — Bir mağaza aynı ürün+renk için hem
//      kaynak hem hedef olamaz (CEKET 7421-C çift transfer hatası).
//   5. DEPO STOK DAĞITIMI — Depoda N adet varsa N farklı hak eden mağazaya
//      dağıtılır (eski "break" kaldırıldı; depo stok israfı önlendi).
//   6. STOK BİTMEK ÜZERE — Renk toplam stoğu kritik düşükse gün eşiği
//      beklenmeden konsolidasyon yapılır.
//   7. STORE_LIMIT YANLIŞ YÖNLENDİRME — Eski 50 sınırı doğal dağıtımda
//      sürekli doluyor, kalan ürünler skoru düşük mağazaya yığılıyordu.
//      Sınır 120'ye çıkarıldı + kalite kapısı eklendi: iyi hedefler doluysa
//      ürün yanlış mağazaya gitmez, depoda bekletilir (AYAKKABI 22090 hatası).
//
// KIRIK BEDEN KURALLARI (v8.1 — Romina onaylı, korundu):
//   3 size üretim  → mağazada 1 size stoklu         = KIRIK
//   4 size üretim  → mağazada ≤2 size stoklu        = KIRIK
//   5 size üretim  → mağazada ≤2 size stoklu        = KIRIK
//   6+ size üretim → mağazada ≤2 size stoklu        = KIRIK
//   STD (Çanta/Aksesuar)                            = KIRIK DEĞİL
//
// EŞİKLER:
//   Yeni Sezon: 15 gün  |  Virman: 30 gün
//
// YENİ SEZON PREFIX: Manuel girilebilir (varsayılan "Y26")
//
// HATA TARİHLERİ:
//   1.1.1900 = veri hatası → transfere dahil etme
//   1.1.1990 = ürün yolda (henüz mağazaya ulaşmamış) → transfere dahil etme
// ============================================================

const ALGO = (function() {

  // ===== MAĞAZA LİSTESİ =====
  const STORES = [
    { code:'M22',  depoCode:'M22',     key:'IZMIR',   label:'İzmir',              rank:1, patterns:['M22','İZMİR','IZMIR','MAVİBAHÇE'] },
    { code:'M21',  depoCode:'1-M21-0', key:'GORDION', label:'Gordion',            rank:2, patterns:['M21','1-M21-0','GORDION','GORDİON'] },
    { code:'M24',  depoCode:'D24',     key:'PANORA',  label:'Panora',             rank:3, patterns:['M24','D24','PANORA'] },
    { code:'M17',  depoCode:'D17',     key:'MOI',     label:'MOİ',                rank:4, patterns:['M17','D17','MOİ','MOI','MALL OF'] },
    { code:'M11',  depoCode:'D11',     key:'BURSA',   label:'Bursa',              rank:5, patterns:['M11','D11','BURSA'] },
    { code:'M10',  depoCode:'U10',     key:'NEXT',    label:'Next Level Utopian', rank:6, patterns:['M10','U10','NEXT LEVEL','ANKARA UTOPIAN NEXT'] },
    { code:'M25',  depoCode:'EMR',     key:'EMAAR',   label:'Emaar',              rank:7, patterns:['M25','EMR','EMAAR'] },
  ];

  const CENTRAL_DEPOTS = [
    { code:'1-0-7',  key:'MERKEZ',   label:'Merkez Depo', priority:1, patterns:['1-0-7','UTOPIAN MERKEZ','MERKEZ DEPO'] },
    { code:'bk.shw', key:'SHOWROOM', label:'Showroom',    priority:2, patterns:['bk.shw','SHOWROOM'] },
  ];

  // ===== EŞİKLER =====
  const NEW_SEASON_DAY_THRESHOLD = 15;  // Y26: 15 gün
  const VIRMAN_DAY_THRESHOLD     = 30;  // Virman: 30 gün
  // v8.2 NOT: STORE_LIMIT artık yalnızca "stok yığma" güvenliğidir.
  //   ESKİ HATA: 50 sınırı doğal dağıtımda (≈75 tepe) sürekli doluyordu;
  //   iyi mağazalar dolunca kalan ürünler skoru düşük mağazaya (Emaar) yığılıyordu.
  //   (AYAKKABI 22090 ACI KAHVE/BEJ 40 hatası). Sınır artık doğal dağıtımı bozmuyor.
  const STORE_LIMIT              = 120; // Mağaza başı stok yığma güvenlik tavanı

  function getDayThreshold(isNew) { return isNew ? NEW_SEASON_DAY_THRESHOLD : VIRMAN_DAY_THRESHOLD; }

  // ===== v8.1 KIRIK BEDEN EŞİĞİ (Romina onaylı) =====
  // Parametre: toplamSize (üretilen farklı beden sayısı)
  // Döndürür: Bu sayıda veya daha az stoklu beden varsa KIRIK
  function getKirikThreshold(toplamSize) {
    if (toplamSize <= 0) return 0;
    if (toplamSize === 1) return 0;  // STD/tek bedenli → asla kırık
    if (toplamSize === 2) return 0;  // 2 bedenli → kırık sayma
    if (toplamSize === 3) return 1;  // 3 size → 1 stoklu kaldı = KIRIK
    return 2;                        // 4,5,6+ size → ≤2 stoklu kaldı = KIRIK
  }

  // ===== MAĞAZA × BEDEN PROFİLİ (gerçek NEBİM verisi) =====
  const SIZE_CURVE_NUMERIC = {
    IZMIR:   {'36':27.4,'38':30.0,'40':23.7,'42':17.3,'44':1.6},
    GORDION: {'36':32.6,'38':27.7,'40':23.9,'42':14.3,'44':1.5},
    PANORA:  {'36':29.7,'38':27.3,'40':23.1,'42':16.8,'44':3.0},
    MOI:     {'36':27.9,'38':32.8,'40':23.5,'42':14.5,'44':1.4},
    BURSA:   {'36':32.1,'38':30.2,'40':19.7,'42':17.5,'44':0.5},
    NEXT:    {'36':27.8,'38':32.2,'40':23.0,'42':16.3,'44':0.7},
    EMAAR:   {'36':22.9,'38':36.6,'40':23.7,'42':16.0,'44':0.8},
  };
  const SIZE_CURVE_SML = {
    IZMIR:   {'S':34.6,'M':31.5,'L':25.8,'XL':8.1},
    GORDION: {'S':35.0,'M':31.4,'L':25.7,'XL':8.0},
    PANORA:  {'S':25.0,'M':34.9,'L':29.7,'XL':10.4},
    MOI:     {'S':38.7,'M':30.7,'L':21.5,'XL':9.2},
    BURSA:   {'S':40.0,'M':24.8,'L':20.0,'XL':15.2},
    NEXT:    {'S':30.4,'M':29.6,'L':27.2,'XL':12.8},
    EMAAR:   {'S':28.6,'M':28.6,'L':26.5,'XL':16.3},
  };

  function getBedenCurve(beden, storeKey) {
    const b = String(beden).toUpperCase().trim();
    if (['S','M','L','XL','XXL','XS'].includes(b)) return (SIZE_CURVE_SML[storeKey]||{})[b]||0;
    if (['34','36','37','38','39','40','41','42','43','44','46'].includes(b)) return (SIZE_CURVE_NUMERIC[storeKey]||{})[b]||0;
    return 0;
  }

  // Kategori haftalık ortalama (NEBİM YTD'den)
  const CAT_WEEKLY_AVG = {
    'PANTOLON':1.51,'GÖMLEK':0.93,'CEKET':0.85,'ELBİSE':0.76,
    'ETEK':0.65,'BLUZ':0.64,'JEAN':0.53,'YELEK':0.51,
    'T-SHIRT':0.47,'DERİ CEKET':0.44,'BODY':0.43,'TRİKO':0.43,'DEFAULT':0.50,
  };
  function getCatAvg(anaGrup) { return CAT_WEEKLY_AVG[String(anaGrup||'').toUpperCase()]||0.50; }

  // ===== YARDIMCI FONKSİYONLAR =====

  // v8.12: aktif analizin mağaza × kategori DNA tablosu (analyze içinde set edilir)
  let aktifCategoryDNA = {};
  // Bir mağazanın belirli ana grupta DNA katsayısı (1.0 = ortalama)
  function getDNA(anaGrup, storeKey) {
    const ag = String(anaGrup || 'DİĞER').toUpperCase().trim() || 'DİĞER';
    const cat = aktifCategoryDNA[ag];
    if (cat && cat[storeKey]) return cat[storeKey].dna;
    return 1.0;   // veri yoksa nötr
  }

  function matchStore(depoAdi, depoKodu) {
    const dk=String(depoKodu||'').toUpperCase().trim();
    const adi=String(depoAdi||'').toUpperCase();
    for (const s of STORES) { if (dk&&dk===s.depoCode.toUpperCase()) return s; }
    for (const s of STORES) { for (const p of s.patterns) { if (adi.includes(p.toUpperCase())) return s; } }
    return null;
  }
  function matchCentral(depoAdi, depoKodu) {
    const adi=String(depoAdi||'').toUpperCase();
    const kod=String(depoKodu||'').toUpperCase().trim();
    for (const d of CENTRAL_DEPOTS) { for (const p of d.patterns) { if (kod===p.toUpperCase()||adi.includes(p.toUpperCase())) return d; } }
    return null;
  }

  // ===== YENİ SEZON TESPİTİ (dinamik prefix) =====
  // newSeasonPrefix: kullanıcının girdiği değer (ör: "Y26" veya "K26")

  // ===== GÜVEN ENDEKSİ HESAPLAMA (v8.1 — UI için) =====
  // Bir transferin doğruluğunu çok kriterli kontrol eder
  // Hedef: %90+ = güvenilir, 75-89 = orta, <75 = riskli
  function calculateGuvenEndeksi(params) {
    const {
      hedefSatis,      // Hedef mağazada bu üründe toplam satış
      kaynakSatis,     // Kaynakta bu üründe toplam satış (mağaza→mağaza için)
      kaynakBeden_satis, // Kaynakta bu BEDENDE satış (0 ideal)
      hedefBeden_stok, // Hedefte bu BEDENDE stok (0 ideal — eksik olsun)
      hedefBeden_satis,// Hedefte bu BEDENDE satış (varsa ideal)
      bedenCurve,      // Hedef mağazada bu bedenin eğri yüzdesi
      hedefSTR,        // Hedef mağaza genel STR
      bekledigiGun,    // Kaynakta kaç gün bekledi
      esik,            // Bekleme eşiği
      isDepoTransfer,  // Depo→mağaza mı (true) yoksa mağaza→mağaza mı (false)
      isKirikBeden,    // Kırık beden transferi mi?
      stokluBedenSayisi, // Kırık için: kaç beden kaldı
      toplamBedenSayisi, // Kırık için: kaç beden üretildi
    } = params;
    
    let skor = 0;
    
    // ===== Kriter 1: Hedefte bu üründe satış var mı (35 puan) =====
    // Bu en kritik kriter. Satışı olmayan mağazaya transfer = yanlış
    // v8.10: Hedef satış 0 olsa bile, transfer mantıksal olarak SAĞLAMSA
    //   (seri tamamlama / güçlü konsolidasyon hub'ı) tam sıfır vermek
    //   haksız — kısmi puan verilir. Sebep: kırık beden konsolidasyonunda
    //   hedef, tam koleksiyona sahip en güçlü mağazadır; oraya yığmak
    //   doğru karardır, "satış yok" diye güveni dibe çekmek yanıltıcıdır.
    if (hedefSatis >= 5) skor += 35;       // Çok güçlü talep
    else if (hedefSatis >= 3) skor += 30;
    else if (hedefSatis >= 1) skor += 25;
    else if (params.seriTamamlama) skor += 20; // satış yok ama seri tamamlanıyor → sağlam
    else skor += 6;                         // hedefte hiç satış yok → düşük ama sıfır değil
    
    // ===== Kriter 2: Hedefte bu BEDEN için talep/uygunluk (20 puan) =====
    // v8.10: Kırık konsolidasyonda hedefte beden YOK olması NORMALdir
    //   (zaten o yüzden konsolide ediyoruz). "Boş yer var" durumu sağlam
    //   bir hedeftir; puan tabanı yükseltildi.
    if (hedefBeden_satis > 0 && hedefBeden_stok === 0) skor += 20; // sattı + bitti = mükemmel
    else if (hedefBeden_satis > 0)                     skor += 17; // sattı, biraz stok var = iyi
    else if (hedefBeden_stok === 0)                    skor += 15; // boş yer var → seri tamamlanır
    else if (hedefBeden_stok <= 2)                     skor += 9;  // az stok
    else                                               skor += 4;  // bol stok
    
    // ===== Kriter 3: Kaynak doğru mu (15 puan) =====
    if (isDepoTransfer) {
      skor += 15;  // Depo zaten doğal kaynak
    } else {
      // Mağaza→Mağaza / kırık için: kaynakta bu BEDENDE satış 0 olmalı
      if (kaynakBeden_satis === 0) skor += 15;
      else if (kaynakBeden_satis === 1) skor += 9;
      else skor += 3;  // Kaynakta da satılıyor → göndermek riskli ama sıfır değil
    }
    
    // ===== Kriter 4: Beden eğrisi uyumu (10 puan) =====
    // Hedef mağazada bu bedenin tarihsel pay yüksekse → doğru gönderim.
    // v8.10: eğri verisi olmayan beden için taban 5 (eskiden 0) — eğri
    //   eksikliği transferi yanlış yapmaz, sadece bilgi yokluğudur.
    if (bedenCurve >= 25) skor += 10;
    else if (bedenCurve >= 15) skor += 9;
    else if (bedenCurve >= 8) skor += 7;
    else if (bedenCurve > 0) skor += 5;
    else skor += 5;  // eğri verisi yok → nötr taban
    
    // ===== Kriter 5: Bekleme süresi (10 puan) =====
    // Eşiğin üzerinde ne kadar çok beklediyse o kadar acil.
    // v8.10: bekleme verisi olmayan transfer için taban 6 (eskiden kırıkta 0)
    //   — bekleme bilgisi yokluğu transferi belirsiz yapmaz.
    if (bekledigiGun && esik) {
      const ratio = bekledigiGun / esik;
      if (ratio >= 3) skor += 10;
      else if (ratio >= 2) skor += 9;
      else if (ratio >= 1.5) skor += 8;
      else if (ratio >= 1) skor += 7;
      else skor += 6;
    } else {
      skor += 6;  // bekleme verisi yok → nötr taban (depo + kırık)
    }
    
    // ===== Kriter 6: Hedef mağaza YTD performansı (10 puan) =====
    if (hedefSTR >= 35) skor += 10;
    else if (hedefSTR >= 30) skor += 9;
    else if (hedefSTR >= 25) skor += 8;
    else if (hedefSTR >= 20) skor += 6;
    else skor += 4;
    
    // ===== Kırık beden bonusu (1 beden kaldıysa daha urgent) =====
    if (isKirikBeden && toplamBedenSayisi && stokluBedenSayisi) {
      const yayilim = (toplamBedenSayisi - stokluBedenSayisi) / toplamBedenSayisi;
      // Yayılım yüksek = ne kadar bedenin tükendiği → daha kritik
      if (yayilim >= 0.66) skor = Math.min(100, skor + 5); // 2/3+ tükendi
    }
    
    return Math.min(100, Math.max(0, Math.round(skor)));
  }

    function isNewSeason(productCode, newSeasonPrefix) {
    if (!newSeasonPrefix) newSeasonPrefix = 'Y26';
    const code = String(productCode||'').toUpperCase();
    const prefix = String(newSeasonPrefix).toUpperCase().trim();
    return code.startsWith(prefix);
  }

  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime())?null:v;
    const s=String(v).trim();
    if (!s||s==='null') return null;
    if (/^\d{4,6}$/.test(s)) {
      const n=parseInt(s);
      if (n>1000&&n<60000) { const d=new Date(Date.UTC(1899,11,30)+n*86400000); return isNaN(d.getTime())?null:d; }
    }
    const d=new Date(s); return isNaN(d.getTime())?null:d;
  }

  // ===== TARİH KONTROLÜ =====
  // 1.1.1900 = ürün YOLDA. Kullanıcı açıklaması: bu ürün depoya yeni girmiş
  //   ve mağazaya sevk edilmiş; mağaza henüz stoğunu fiziksel almamış (nakil).
  //   Bu ürünler transfere DAHİL EDİLMEZ — ayrı "Yeni Giriş / Yolda" listesi.
  function isOnTheWay(d) {
    if (!d) return false;
    const y=d.getFullYear();
    return y===1900||y===1899;
  }
  // Geriye dönük uyumluluk: isErrorDate artık isOnTheWay ile aynı kümeyi
  //   işaret eder (1900 = veri hatası değil, yolda durumudur).
  function isErrorDate(d) {
    return isOnTheWay(d);
  }

  function daysSince(d, ref) {
    if (!d) return null;
    const r=ref||new Date();
    const diff=r-d;
    if (isNaN(diff)) return null;
    return Math.floor(diff/(1000*60*60*24));
  }

  // ===== PERFORMANS =====
  function calculatePerformance(satis, stok) {
    return (satis+1)/(satis+stok+5);
  }

  // v8.1 Velocity Skoru: Bayes(%40) + Haftalık Hız(%60)
  function calcVelocity(satis, stok, days, catAvg) {
    const bayes=(satis+1)/(satis+stok+5);
    const weeks=Math.max(days/7,1);
    const hiz=(satis/weeks)/Math.max(catAvg,0.1);
    const hizNorm=Math.min(hiz,3.0);
    return (bayes*0.40)+(hizNorm*0.60);
  }

  function getCategory(altGrup, anaGrup) {
    const a=String(altGrup||'').toUpperCase().trim();
    const n=String(anaGrup||'').toUpperCase().trim();
    const ACC=['KÜPE','BİLEKLİK','KOLYE','YÜZÜK','BROŞ','TOKA','TAÇ','FULAR','ŞAL','ATKI-ŞAL','BERE','ŞAPKA','ELDİVEN','AKSESUAR'];
    const SHO=['AYAKKABI','BOT','ÇİZME','SNEAKER','SANDALET','LOAFER','TOPUKLU AYAKKABI'];
    const OUT=['DIŞ GİYİM','KABAN','MONT','DERİ MONT','TRENÇKOT','MANTO','KÜRK','DERİ KABAN','YAĞMURLUK-RÜZGARLIK'];
    if (ACC.includes(n)||ACC.includes(a)) return {code:'AKSESUAR',label:'Aksesuar',cls:'ct-a'};
    if (SHO.includes(n)||SHO.includes(a)) return {code:'AYAKKABI',label:'Ayakkabı',cls:'ct-y'};
    if (n==='ÇANTA'||a==='ÇANTA') return {code:'ÇANTA',label:'Çanta',cls:'ct-c'};
    if (n==='KEMER'||a==='KEMER') return {code:'KEMER',label:'Kemer',cls:'ct-k'};
    if (OUT.includes(a)||OUT.includes(n)) return {code:'DIŞ GİYİM',label:'Dış Giyim',cls:'ct-d'};
    return {code:'TEKSTİL',label:'Tekstil',cls:'ct-t'};
  }

  // Çanta ve Aksesuar kategorileri kırık beden kontrolünden muaf
  function isKirikMuaf(anaGrup, altGrup, beden) {
    const cat=getCategory(altGrup, anaGrup);
    if (cat.code==='ÇANTA'||cat.code==='AKSESUAR'||cat.code==='KEMER') return true;
    if (String(beden).toUpperCase().trim()==='STD') return true;
    return false;
  }

  // ============================================================
  // v8.2 — HEDEF MAĞAZA UYGUNLUK SKORLAMASI
  // (Kullanıcı geri bildirimine göre eklendi — bkz. hata analizi)
  // ============================================================

  // Bir mağazada bir ürün+rengin kaç farklı bedeninde stok var?
  // perf = pdata.storePerformance[storeKey]
  function bedenRunBilgisi(perf) {
    let stoklu = 0; const liste = [];
    if (perf && perf.sizes) {
      for (const [b, sd] of Object.entries(perf.sizes)) {
        if (String(b).toUpperCase() === 'STD') continue;
        if (sd.stok > 0) { stoklu++; liste.push(b); }
      }
    }
    return { stokluSayisi: stoklu, stokluListe: liste };
  }

  // DEPO → MAĞAZA hedef uygunluk skoru. Yüksek skor = daha uygun hedef.
  // AMAÇ: Gönderilen beden hedefte YETİM (tek başına kırık) kalmasın;
  //       eksik + talebi kanıtlı bedeni tamamlasın.
  function scoreDepotTarget(perf, beden) {
    if (!perf) return -Infinity;
    const sz = (perf.sizes && perf.sizes[beden]) ? perf.sizes[beden] : { stok: 0, satis: 0 };
    const run = bedenRunBilgisi(perf);
    let skor = 0;
    // 1) YETİM ENGELİ: mağazada bu rengin başka bedeninde stok yoksa,
    //    gelen beden orada tek başına kırık kalır → ağır ceza (aday elenir)
    if (run.stokluSayisi === 0) skor -= 1000;
    else skor += Math.min(run.stokluSayisi, 4) * 12;   // koleksiyon derinliği iyi
    // 2) KANITLI BEDEN TALEBİ: bu beden satılmış + şu an stok 0 = en güçlü sinyal
    if (sz.satis > 0 && sz.stok === 0) skor += 50;
    else if (sz.stok === 0) skor += 15;                // beden eksik (talep belirsiz)
    else skor -= 30;                                   // bedende zaten stok var → gereksiz
    // 3) RENGİN TOPLAM SATIŞI (talep büyüklüğü) — eşitlik bozucu
    skor += Math.min(perf.satis || 0, 12) * 3;
    // 4) Mağaza genel hızı — sınırlı ağırlık (boş mağaza skoru şişirmesin)
    skor += Math.min(perf.velocityScore || 0, 2) * 4;
    return skor;
  }

  // KIRIK BEDEN KONSOLİDASYON hedef skoru. Yüksek skor = daha uygun toplama merkezi.
  // AMAÇ: Dağınık kırık bedenleri TEK mağazada topla; zaten tam koleksiyonu
  //       olan mağazaya gereksiz stok yığma.
  function scoreConsolidationTarget(perf, eksikBedenler, toplamSize) {
    if (!perf) return -Infinity;
    const run = bedenRunBilgisi(perf);
    let skor = 0;
    // 1) DOLULUK CEZASI: tüm bedenleri zaten stokta olan mağazaya toplamak anlamsız
    const doluluk = toplamSize > 0 ? run.stokluSayisi / toplamSize : 0;
    if (doluluk >= 1) skor -= 200;            // tam koleksiyon → stok yığma yapma
    else if (doluluk >= 0.75) skor -= 60;     // neredeyse tam
    else if (doluluk > 0) skor += 25;         // kısmi koleksiyon = ideal toplama hedefi
    // 2) KANITLI İHTİYAÇ: gelen kırık bedeni mağaza satmış + stok 0 ise gerçek ihtiyaç
    let kanitliIhtiyac = 0, eksikSayisi = 0;
    for (const b of eksikBedenler) {
      const sz = (perf.sizes && perf.sizes[b]) ? perf.sizes[b] : { stok: 0, satis: 0 };
      if (sz.stok === 0) {
        eksikSayisi++;
        if (sz.satis > 0) kanitliIhtiyac++;
      }
    }
    skor += kanitliIhtiyac * 40;              // sattığı bedeni tamamlamak = ideal
    skor += eksikSayisi * 8;                  // en azından eksiğini tamamlıyor
    // 3) RENGİN TOPLAM SATIŞI — asıl sıralama kriteri (en iyi satan toplasın)
    skor += Math.min(perf.satis || 0, 20) * 5;
    return skor;
  }

  // ============================================================
  // v8.3 — TEK BEDEN HEDEF SKORU (kırık/yetim beden yönlendirme)
  // ============================================================
  // Kullanıcı geri bildirimi (ABİYE 58464):
  //   "Kırık bedenleri tek mağazaya yığma; HER BEDENİ o bedeni KANITLI
  //    olarak satan mağazaya gönder. Hedefin o bedende stoğu 0 olmak
  //    ZORUNDA değildir — asıl kriter satış potansiyelidir. Hedefte o
  //    beden+renkte 1'den fazla stok olması transfere engel değildir."
  // Örnek: Panora'nın yetim 40'ı → Bursa (Bursa 40'ı satmış, elinde 1 var).
  function scoreSizeTarget(perf, beden, anaGrup) {
    if (!perf) return -Infinity;
    const sz = (perf.sizes && perf.sizes[beden]) ? perf.sizes[beden] : { stok: 0, satis: 0 };
    const run = bedenRunBilgisi(perf);
    let skor = 0;
    // 1) KANITLI BEDEN SATIŞI — EN GÜÇLÜ SİNYAL (satış potansiyeli).
    //    Bu bedeni satmış mağaza, yetim bedeni de satar.
    skor += Math.min(sz.satis || 0, 5) * 35;
    // 2) BEDEN STOK DURUMU — stok 0 ZORUNLU DEĞİL; yalnızca ufak ayar.
    //    v8.7 DÜZELTME (kullanıcı / BLUZ 3299 XL): hedefte o bedenden 3+ stok
    //    varsa o mağazanın bu bedene İHTİYACI YOK; ağır ceza ver. Asıl hedef
    //    o bedeni satıp stoğu biten (gerçek ihtiyaç sahibi) mağaza olmalı.
    if (sz.stok === 0) skor += 15;          // boş yer var
    else if (sz.stok === 1) skor += 8;      // 1 stok — sorun değil
    else if (sz.stok === 2) skor += 0;      // 2 stok — nötr
    else skor -= 120;                       // 3+ zaten BOL → ihtiyaç yok, ağır ceza
    // 2b) ACİL İHTİYAÇ — bu bedeni SATMIŞ + stoğu 0 (kullanıcının ısrarla
    //   vurguladığı "hem satış var hem stok=0 → kesin ilk öncelik" kuralı).
    if ((sz.satis || 0) > 0 && sz.stok === 0) skor += 30;
    // 3) YETİM ENGELİ — gelen beden hedefte de yapayalnız kalmasın.
    //    Bomboş + bu bedeni hiç satmamış mağaza kötü hedeftir.
    if (run.stokluSayisi === 0 && (sz.satis || 0) === 0) skor -= 300;
    else skor += Math.min(run.stokluSayisi, 4) * 8;   // koleksiyon derinliği iyi
    // 4) RENGİN TOPLAM SATIŞI — talep büyüklüğü (eşitlik bozucu)
    skor += Math.min(perf.satis || 0, 12) * 3;
    // 5) Mağaza genel hızı — sınırlı ağırlık
    skor += Math.min(perf.velocityScore || 0, 2) * 3;
    // 6) v8.12 — MAĞAZA × KATEGORİ DNA: o mağaza bu kategoride güçlüyse
    //    küçük bir prim, zayıfsa küçük bir ceza. Sabit YTD sıralamasının
    //    kategori körlüğünü giderir; abiye kırığı abiyede güçlü mağazaya,
    //    denim kırığı denimde güçlü mağazaya hafifçe yönlenir.
    //    Ağırlık bilinçli olarak küçük tutulur — kanıtlı satış (kriter 1)
    //    her zaman baskın sinyaldir; DNA yalnızca eşitlik bozar.
    if (anaGrup && perf.store) {
      const dna = getDNA(anaGrup, perf.store.key);   // 0.5 – 1.8
      skor += Math.round((dna - 1.0) * 20);          // ≈ -10 .. +16 puan
    }
    // NOT (kullanıcı onaylı kural): Bir bedeni HİÇBİR mağaza satmamışsa,
    //   kriter 1 tüm adaylar için 0 olur; bu durumda kazanan, koleksiyon
    //   derinliği (kriter 3) + rengin toplam satışı (kriter 4) + kategori
    //   DNA'sı (kriter 6) en yüksek olan mağazadır.
    return skor;
  }

  // ===== ANA ANALİZ =====
  function analyze(rawData, takimMap, options) {
    const opts=options||{};
    const refDate=opts.refDate?new Date(opts.refDate):new Date();
    const newSeasonPrefix=opts.newSeasonPrefix||'Y26';
    const filterCat=opts.filterCategory||null;
    const filterSto=opts.filterStore||null;

    const result={
      depoTransfers:[],magTransfers:[],kirikBeden:[],
      bekleyen:[],hataliTarih:[],yolda:[],envanter:[],
      stats:{totalRows:0,matchedRows:0,transferableCount:0,
             waitingCount:0,errorDateCount:0,onTheWayCount:0,
             kirikCount:0,criticalKirikCount:0,
             merkezStok:0,yeniSezonAdet:0,virmanAdet:0},
    };
    if (!rawData||rawData.length===0) return result;
    result.stats.totalRows=rawData.length;
    // v8.13: sezon başlangıç tarihi — kullanıcı UI'dan girer, raporda görünür.
    //   Sezon başlangıcı satış değerlendirmesinin referans noktasıdır;
    //   ürünler sezonun TÜM satış verisiyle değerlendirilir.
    result.stats.seasonStart = opts.seasonStart || null;
    result.stats.seasonCode = newSeasonPrefix;

    const productMap={};
    const storeStatsMap={};
    const storeTrfCount={};

    // ===== VERİ OKUMA =====
    for (const row of rawData) {
      result.stats.matchedRows++;
      // data.js bu camelCase isimleri üretiyor — bunları kullan
      const depoKodu=String(row.depoKodu||'').trim();
      const depoAdi =String(row.depoAdi||'').trim();
      const urunKodu=String(row.urunKodu||'').trim();
      const urunAdi =String(row.urunAdi||'').trim();
      const renkKodu=String(row.renkKodu||'').trim();
      const renkAdi =String(row.renkAciklamasi||'').trim();
      const beden   =String(row.beden||'').trim();
      const anaGrup =String(row.anaGrup||'').trim();
      const altGrup =String(row.altGrupAciklama||'').trim();

      const satisRaw=parseFloat(row.toplamSatisMiktari||0);
      const stokRaw =parseFloat(row.toplamEnvanter||0);
      const satis=isNaN(satisRaw)?0:Math.round(satisRaw);
      const stok =isNaN(stokRaw)?0:Math.round(stokRaw);

      if (!urunKodu) continue;
      const cat=getCategory(altGrup,anaGrup);
      if (filterCat&&filterCat!=='HEPSI'&&cat.code!==filterCat) continue;

      const depoyaGiris=parseDate(row.depoyaIlkGirisTarihi);
      const sonFatura  =parseDate(row.sonFaturaTarihi);
      const magazaGiris=parseDate(row.magazayaGirisTarihi);

      const store  =matchStore(depoAdi,depoKodu);
      const central=store?null:matchCentral(depoAdi,depoKodu);
      if (!store&&!central) continue;

      // ===== YOLDA / YENİ GİRİŞ: MagazayaGirisTarihi = 1.1.1900 =====
      // Kullanıcı açıklaması: bu tarih veri hatası DEĞİL. Ürün depoya yeni
      //   girmiş ve mağazaya sevk edilmiş; mağaza henüz fiziksel teslim
      //   almamış (yolda/nakil). Bu ürünler transfer analizine ALINMAZ;
      //   ayrı "Yeni Giriş / Yolda" listesinde raporlanır.
      if (magazaGiris&&(magazaGiris.getFullYear()===1900||magazaGiris.getFullYear()===1899)) {
        if (store) {
          const kayit={
            store,urunKodu,urunAdi,renkKodu,renk:renkAdi||renkKodu,
            beden,stok,satis,anaGrup,altGrup,magazaGiris,depoyaGiris,sonFatura,
            neden:'MagazayaGirisTarihi = 1.1.1900 — ürün yolda/nakilde, mağaza henüz fiziksel teslim almadı',
            yolda:true,
          };
          result.yolda.push(kayit);
          result.hataliTarih.push(kayit); // geriye dönük uyumluluk
          result.stats.onTheWayCount++;
        }
        continue;
      }

      if (filterSto&&filterSto!=='HEPSI'&&store&&store.key!==filterSto) continue;

      const newSeason=isNewSeason(urunKodu,newSeasonPrefix);
      const pkey=`${urunKodu}|${renkKodu}`;

      if (!productMap[pkey]) {
        productMap[pkey]={
          meta:{urunKodu,urunAdi,renk:renkAdi||renkKodu,renkKodu,altGrup,anaGrup,
                malGrubu:'',category:cat,isNewSeason:newSeason,
                sezonTipi:newSeason?'Y26':'Virman',
                sezonDurum:newSeason?'Yeni Sezon':'Virman',
                takimKod:'',takimDurumu:''},
          stores:{},depots:{},storePerformance:{},
        };
      }
      const pdata=productMap[pkey];

      if (store) {
        if (!pdata.stores[store.key]) pdata.stores[store.key]={meta:store,rank:store.rank,sizes:{},totalSatis:0,totalStok:0};
        const sd=pdata.stores[store.key];
        if (!sd.sizes[beden]) sd.sizes[beden]={stok:0,satis:0,giris:null,depoyaGiris:null,sonFatura:null};
        sd.sizes[beden].stok+=stok;
        sd.sizes[beden].satis+=satis;
        sd.sizes[beden].giris=sd.sizes[beden].giris||magazaGiris;
        sd.sizes[beden].depoyaGiris=sd.sizes[beden].depoyaGiris||depoyaGiris;
        sd.sizes[beden].sonFatura=sd.sizes[beden].sonFatura||sonFatura;
        sd.totalSatis+=satis; sd.totalStok+=stok;
        if (!storeStatsMap[store.key]) storeStatsMap[store.key]={stok:0,satis:0,storeMeta:store};
        storeStatsMap[store.key].stok+=stok;
        storeStatsMap[store.key].satis+=satis;
      } else if (central) {
        if (!pdata.depots[central.key]) pdata.depots[central.key]={meta:central,sizes:{},totalSatis:0,totalStok:0};
        const dd=pdata.depots[central.key];
        if (!dd.sizes[beden]) dd.sizes[beden]={stok:0,satis:0,giris:null};
        dd.sizes[beden].stok+=stok;
        dd.sizes[beden].giris=dd.sizes[beden].giris||depoyaGiris;
        dd.totalStok+=stok;
      }
    }

    // ===== STORE PERFORMANCE =====
    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      const catAvg=getCatAvg(pdata.meta.anaGrup);
      for (const sk of Object.keys(pdata.stores)) {
        const sd=pdata.stores[sk];
        let totalDays=0,dayCnt=0;
        for (const s of Object.values(sd.sizes)) {
          if (s.giris) { const d=daysSince(s.giris,refDate); if (d!==null&&d>0){totalDays+=d;dayCnt++;} }
        }
        const avgDays=dayCnt>0?totalDays/dayCnt:30;
        const bayes=(sd.totalSatis+1)/(sd.totalSatis+sd.totalStok+5);
        const vel=calcVelocity(sd.totalSatis,sd.totalStok,avgDays,catAvg);
        pdata.storePerformance[sk]={
          store:sd.meta,satis:sd.totalSatis,stok:sd.totalStok,
          performance:bayes,velocityScore:vel,avgDays,sizes:sd.sizes,
        };
      }
    }

    // ===== v8.12 — MAĞAZA × KATEGORİ DNA =====
    // Her mağazanın her ana grupta (kategori) gerçek satış gücü.
    // Mantık: "Panora abiyede güçlü, İzmir denimde güçlü" bilgisini
    //   sayısallaştırır. Kategori bazında bir mağazanın satış payı,
    //   o kategorideki ORTALAMA mağaza payına bölünür → DNA katsayısı.
    //   1.00 = ortalama · >1.00 = o kategoride güçlü · <1.00 = zayıf.
    // Hedef seçiminde küçük ama anlamlı bir ağırlık olarak kullanılır;
    //   sabit YTD sıralamasının kategori körlüğünü giderir.
    // NOT (kullanıcı talebi): Sezon başlangıcı 16.02.2026 olduğundan,
    //   ürünler değerlendirilirken sezonun TÜM satış verisi esas alınır.
    const categoryDNA = {};   // anaGrup -> { storeKey -> { satis, pay, dna } }
    {
      // 1) kategori × mağaza ham satış toplamı
      const catStoreSatis = {};   // anaGrup -> storeKey -> toplam satış
      const catToplam = {};       // anaGrup -> toplam satış (tüm mağazalar)
      for (const pkey of Object.keys(productMap)) {
        const pdata = productMap[pkey];
        const ag = String(pdata.meta.anaGrup || 'DİĞER').toUpperCase().trim() || 'DİĞER';
        for (const [sk, sd] of Object.entries(pdata.stores)) {
          const s = sd.totalSatis || 0;
          if (s <= 0) continue;
          (catStoreSatis[ag] = catStoreSatis[ag] || {})[sk] =
            (catStoreSatis[ag][sk] || 0) + s;
          catToplam[ag] = (catToplam[ag] || 0) + s;
        }
      }
      // 2) DNA katsayısı: mağaza payı / ortalama mağaza payı
      for (const ag of Object.keys(catStoreSatis)) {
        const stores = catStoreSatis[ag];
        const magazaSayisi = Object.keys(stores).length;
        if (magazaSayisi === 0 || !catToplam[ag]) continue;
        const ortPay = 1 / magazaSayisi;   // eşit dağılım referansı
        categoryDNA[ag] = {};
        for (const [sk, satis] of Object.entries(stores)) {
          const pay = satis / catToplam[ag];
          // DNA: 1.0 ortalama; aşırı uçları sınırla (0.5 – 1.8)
          let dna = ortPay > 0 ? pay / ortPay : 1;
          dna = Math.max(0.5, Math.min(1.8, dna));
          categoryDNA[ag][sk] = { satis, pay: Math.round(pay * 100), dna: Math.round(dna * 100) / 100 };
        }
      }
    }
    result.stats.categoryDNA = categoryDNA;

    // v8.12 — KALICI DNA BİRLEŞTİRME:
    //   Önceki analizlerden gelen birikmiş DNA (opts.storedDNA) varsa,
    //   yeni DNA ile harmanlanır. Böylece DNA tablosu her veri yüklemesinde
    //   zenginleşir; tek bir haftanın dalgalanması tek başına belirleyici
    //   olmaz. Ağırlık: yeni veri %60, birikmiş geçmiş %40.
    if (opts.storedDNA && typeof opts.storedDNA === 'object') {
      for (const ag of Object.keys(categoryDNA)) {
        const eski = opts.storedDNA[ag];
        if (!eski) continue;
        for (const sk of Object.keys(categoryDNA[ag])) {
          if (eski[sk] && typeof eski[sk].dna === 'number') {
            const yeni = categoryDNA[ag][sk].dna;
            const harman = yeni * 0.6 + eski[sk].dna * 0.4;
            categoryDNA[ag][sk].dna = Math.round(harman * 100) / 100;
          }
        }
      }
    }
    // birikmiş DNA olarak dışarı ver — DATA katmanı IndexedDB'ye yazar
    result.stats.categoryDNA = categoryDNA;
    aktifCategoryDNA = categoryDNA;


    // Bir ürün+renk için bir mağaza AYNI ANDA hem kaynak hem hedef olamaz.
    // (CEKET 7421-C hatası: İzmir'den ürün çıkarken aynı ürün İzmir'e gönderiliyordu)
    const roleMap = {};
    function rmGet(pk) { if (!roleMap[pk]) roleMap[pk] = { sources: new Set(), targets: new Set() }; return roleMap[pk]; }
    function rmAddSource(pk, sk) { rmGet(pk).sources.add(sk); }
    function rmAddTarget(pk, sk) { rmGet(pk).targets.add(sk); }
    function canBeTarget(pk, sk) { return !rmGet(pk).sources.has(sk); }
    function canBeSource(pk, sk) { return !rmGet(pk).targets.has(sk); }

    // ============================================================
    // v8.18 — MERKEZİ CANLI STOK DEFTERİ (LEDGER)
    // ============================================================
    // KÖK SORUN: 3 modül (depo, kırık, mağaza) orijinal stok verisine bakıp
    //   birbirinin harcadığı stoğu görmüyordu. Bir mağazadan 2 adet stoğu
    //   kırık modülü gönderiyor, mağaza modülü AYNI 2 adedi tekrar gönderiyordu
    //   → 2 stoktan 3 çıkış (GÖMLEK 3722 SİYAH hatası).
    // ÇÖZÜM: Tüm modüller tek bir canlı deftere bakar. Her transfer kaydedildiği
    //   an defterden DÜŞÜLÜR. Kaynak ararken orijinal veriye değil deftere
    //   bakılır → stok aşımı YAPISAL olarak imkânsız.
    //
    // Defter yapısı: ledger[storeKey][pkey][beden] = kalan adet
    const ledger = {};
    function ledgerInit() {
      for (const pkey of Object.keys(productMap)) {
        const pdata = productMap[pkey];
        for (const [sk, sd] of Object.entries(pdata.stores)) {
          for (const [b, szd] of Object.entries(sd.sizes)) {
            if (!ledger[sk]) ledger[sk] = {};
            if (!ledger[sk][pkey]) ledger[sk][pkey] = {};
            ledger[sk][pkey][b] = (szd.stok || 0);
          }
        }
      }
    }
    // Bir mağazada o ürün+beden için defterdeki KALAN stok
    function ledgerGet(sk, pkey, beden) {
      return (ledger[sk] && ledger[sk][pkey] && ledger[sk][pkey][beden] != null)
        ? ledger[sk][pkey][beden] : 0;
    }
    // Kaynaktan düş (gönderim). adet kadar düşer, negatife inmez.
    function ledgerTakeFromSource(sk, pkey, beden, adet) {
      if (!ledger[sk] || !ledger[sk][pkey] || ledger[sk][pkey][beden] == null) return 0;
      const mevcut = ledger[sk][pkey][beden];
      const alinan = Math.min(mevcut, adet);
      ledger[sk][pkey][beden] = mevcut - alinan;
      return alinan;  // gerçekte alınabilen miktar
    }
    // Hedefe ekle (teslim).
    function ledgerAddToTarget(sk, pkey, beden, adet) {
      if (!ledger[sk]) ledger[sk] = {};
      if (!ledger[sk][pkey]) ledger[sk][pkey] = {};
      ledger[sk][pkey][beden] = (ledger[sk][pkey][beden] || 0) + adet;
    }
    // Bir mağazada o ürün+renkte KAÇ FARKLI bedende stok var (defter canlı)
    function ledgerStokluBedenSayisi(sk, pkey) {
      if (!ledger[sk] || !ledger[sk][pkey]) return 0;
      let c = 0;
      for (const [b, adet] of Object.entries(ledger[sk][pkey])) {
        if (String(b).toUpperCase() === 'STD') continue;
        if (adet > 0) c++;
      }
      return c;
    }
    ledgerInit();

    // ===== DEPO → MAĞAZA =====
    // v8.13: Yalnızca transfer modunda "depo" seçiliyse çalışır.
    const trfMode = opts.transferMode || { depo:true, magaza:true };
    if (trfMode.depo)
    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      if (!pdata.depots['MERKEZ']&&!pdata.depots['SHOWROOM']) continue;
      const hasAnySales=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.satis>0));

      for (const depKey of ['MERKEZ','SHOWROOM']) {
        const ddata=pdata.depots[depKey];
        if (!ddata) continue;
        for (const [beden,dd] of Object.entries(ddata.sizes)) {
          if (dd.stok<=0) continue;
          const herhangiVar=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.stok>0||sd.satis>0));
          if (!herhangiVar) {
            const ex=result.bekleyen.find(b=>b.urunKodu===pdata.meta.urunKodu&&b.renkKodu===pdata.meta.renkKodu);
            if (!ex) result.bekleyen.push({
              kaynak:ddata.meta,urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
              renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:dd.stok,
              anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
              neden:'Hiçbir mağazada bu ürün yok (bekleyen)',
            });
            continue;
          }
          if (!hasAnySales) continue;

          // ===== v8.2 HEDEF SEÇİMİ — YETİM ÜRÜN ENGELLİ =====
          // ESKİ HATA: sadece velocity'ye göre seçiliyordu; satışı olup stoğu
          //   biten boş mağazalar (örn. Emaar) yüksek skor alıp hedef oluyordu.
          //   Gelen beden orada tek başına KIRIK kalıyordu (AYAKKABI 22090 hatası).
          // YENİ: 1) bedeni eksik + 2) o rengin başka bedeninde stok olan
          //   (koleksiyon derinliği olan) + 3) bu bedeni satmış mağaza önceliklidir.

          // bu rengin toplam üretilen beden sayısı (skorlama için gerekmez ama tutarlılık)
          let cands=Object.entries(pdata.storePerformance)
            .filter(([k,p])=>p.satis>0&&(!p.sizes[beden]||p.sizes[beden].stok===0));
          let ranked=cands
            .map(([k,p])=>({k,p,sc:scoreDepotTarget(p,beden)}))
            .filter(x=>x.sc>-500)   // YETİM riski olan (derinliği olmayan) hedefleri ELE
            .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));

          // RELAKS PASS: satışlı uygun hedef yoksa, en azından koleksiyon
          //   derinliği olan (gelen beden yetim kalmayacak) mağazalara şans ver.
          //   (AYAKKABI 25050 38 beden → Panora gibi durumlar için)
          let relaxed=false;
          if (ranked.length===0) {
            ranked=Object.entries(pdata.storePerformance)
              .filter(([k,p])=>(!p.sizes[beden]||p.sizes[beden].stok===0)&&bedenRunBilgisi(p).stokluSayisi>0)
              .map(([k,p])=>({k,p,sc:scoreDepotTarget(p,beden)}))
              .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));
            relaxed=true;
          }
          if (ranked.length===0) continue;

          // DEPO STOĞUNU birden fazla hak eden mağazaya dağıt.
          // ESKİ HATA: ilk adaydan sonra "break" vardı → depoda 6 adet olsa bile
          //   sadece 1 mağazaya 1 adet gidiyordu (BODY 0643-B M / depo stok israfı).
          // v8.2 KALİTE KAPISI: iyi adaylar STORE_LIMIT'e takılırsa, ürünü
          //   skoru çok düşük bir mağazaya YIĞMA. Onun yerine depoda beklet
          //   (result.bekleyen) — yanlış transfer yapmaktansa şeffaf şekilde beklet.
          const enIyiSkor = ranked.length ? ranked[0].sc : 0;
          let depoKalan=dd.stok;
          for (const {k:tsk,p:tp,sc:tsc} of ranked) {
            if (depoKalan<=0) break;
            if (!storeTrfCount[tsk]) storeTrfCount[tsk]=0;
            if (storeTrfCount[tsk]>=STORE_LIMIT) continue;
            if (!canBeTarget(pkey,tsk)) continue;  // kaynak olan mağaza hedef olamaz
            // Kalite kapısı: bu aday, en iyi adaydan belirgin ölçüde kötüyse
            //   (skor en iyinin %55'inin veya 40 mutlak eşiğin altında) → yanlış
            //   hedefe yığma yapma; kalan depo stoğunu bekleyen listesine al.
            if (tsc < Math.max(40, enIyiSkor*0.55)) {
              const exB=result.bekleyen.find(b=>b.urunKodu===pdata.meta.urunKodu&&b.renkKodu===pdata.meta.renkKodu&&b.beden===beden);
              if (!exB) result.bekleyen.push({
                kaynak:ddata.meta,urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:depoKalan,
                anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                neden:'Uygun hedefler dolu (STORE_LIMIT) — yanlış mağazaya yığmamak için depoda bekletildi',
              });
              break;
            }
            const qty=1;
            depoKalan-=qty;
            storeTrfCount[tsk]+=qty;
            rmAddTarget(pkey,tsk);
            ledgerAddToTarget(tsk, pkey, beden, qty);  // v8.18: hedefe teslim defere işlenir
            const storeStatus_=STORES.map(st=>{
              const sp_=pdata.storePerformance[st.key];
              const sz_=sp_&&sp_.sizes?sp_.sizes[beden]:null;
              return {store:st,stok:sz_?sz_.stok:0,satis:sz_?sz_.satis:0,
                totalSatis:sp_?sp_.satis:0,totalStok:sp_?sp_.stok:0,
                totalPerf:sp_?(sp_.velocityScore||sp_.performance||0):0};
            });
            const sezTipi_=pdata.meta.isNewSeason?'YENI':'VIRMAN';
            const sezDurum_=pdata.meta.isNewSeason?'Yeni Sezon':'Virman';
            // Güven Endeksi
            const tpSizeData=tp.sizes&&tp.sizes[beden]?tp.sizes[beden]:{stok:0,satis:0};
            const hedefStr_=tp.stok+tp.satis>0?Math.round(tp.satis/(tp.stok+tp.satis)*100):0;
            let guvenEnd_=calculateGuvenEndeksi({
              hedefSatis:tp.satis,kaynakSatis:0,kaynakBeden_satis:0,
              hedefBeden_stok:tpSizeData.stok,hedefBeden_satis:tpSizeData.satis,
              bedenCurve:getBedenCurve(beden,tp.store.key),
              hedefSTR:hedefStr_,bekledigiGun:0,esik:0,
              isDepoTransfer:true,isKirikBeden:false,
              seriTamamlama:(tpSizeData.stok||0)===0,
            });
            if (relaxed) guvenEnd_=Math.max(0,guvenEnd_-20);  // şans transferi → düşük güven
            result.depoTransfers.push({
              kaynak:ddata.meta,gonderici:ddata.meta,hedef:tp.store,
              distrib:[{store:tp.store,qty,performance:tp.velocityScore}],
              storeStatus:storeStatus_,depoStok:dd.stok,
              urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
              renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,
              beden,adet:qty,anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
              malGrubu:pdata.meta.malGrubu||'',sezonTipi:sezTipi_,sezonDurum:sezDurum_,
              takimDurumu:pdata.meta.takimDurumu||'',takimKod:pdata.meta.takimKod||'',
              velocityScore:Math.round(tp.velocityScore*100),
              guvenEndeksi:guvenEnd_,
              confidence:guvenEnd_,
              neden:ddata.meta.label+' → '+tp.store.label+': Hedefte '+tp.satis+' satış, beden eksik'+(relaxed?' (koleksiyon tamamlama)':'')+' (Güven %'+guvenEnd_+')',
            });
            result.stats.transferableCount++;
          }
        }
      }
    }

    // ===== TEK KAYNAK KURALI (Universal) =====
    // Depo→Mağaza zaten önerilen (ürün+renk+beden+hedef) kombinasyonlarını işaretle
    const depoTaken = new Set();
    for (const t of result.depoTransfers) {
      const hedefKey = t.distrib[0]?.store?.key || t.hedef?.key;
      depoTaken.add(`${t.urunKodu}|${t.renkKodu}|${t.beden}|${hedefKey}`);
    }
    
    // ===== KIRIK BEDEN — v8.2 KONSOLİDASYON MANTIĞI =====
    // 3 size → 1 stoklu = KIRIK | 4,5,6+ size → ≤2 stoklu = KIRIK
    // Çanta/Aksesuar/STD → KIRIK DEĞİL
    //
    // ESKİ HATA: Her mağaza ayrı ayrı işleniyordu; aynı ürünün kırık bedenleri
    //   birden çok mağazadan FARKLI hedeflere dağılıyor, hatta tam koleksiyonu
    //   olan mağazaya yığılıyordu (ABİYE 58470 → Panora). Ayrıca bir mağaza hem
    //   kaynak hem hedef olabiliyordu (CEKET 7421-C: İzmir'den çıkıp İzmir'e).
    // YENİ: 2 AŞAMALI. Aşama 1 — aynı ürün+rengin TÜM kırık kaynaklarını topla.
    //   Aşama 2 — TEK bir konsolidasyon hedefi seç (kaynak olan mağaza hedef
    //   olamaz; tam koleksiyonlu mağazaya yığma yapılmaz; sattığı bedeni
    //   tamamlayan + toplam satışı en iyi mağaza tercih edilir) ve hepsini oraya gönder.

    // v8.13: Kırık modülü yalnızca "Mağaza Arası + Kırık" modu seçiliyse çalışır.
    if (trfMode.magaza)
    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      if (isKirikMuaf(pdata.meta.anaGrup,pdata.meta.altGrup,'')) continue;

      const hasAnySales=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.satis>0));
      if (!hasAnySales) continue;

      // Tüm üretilen bedenler (STD hariç)
      const tumBedenler=new Set();
      for (const sd of Object.values(pdata.stores)) for (const b of Object.keys(sd.sizes)) if (String(b).toUpperCase()!=='STD') tumBedenler.add(b);
      for (const dd of Object.values(pdata.depots)) for (const b of Object.keys(dd.sizes)) if (String(b).toUpperCase()!=='STD') tumBedenler.add(b);
      const toplamSize=tumBedenler.size;
      const kirikEsik=getKirikThreshold(toplamSize);
      if (kirikEsik===0) continue; // Kırık mümkün değil (≤2 size)

      const dayThreshold=getDayThreshold(pdata.meta.isNewSeason);

      // Bu ürün+rengin tüm mağazalardaki toplam stoğu ve satışı
      let toplamRenkStok=0, toplamRenkSatis=0;
      for (const sd of Object.values(pdata.stores)) {
        toplamRenkStok+=sd.totalStok; toplamRenkSatis+=sd.totalSatis;
      }
      const kritikThin=toplamRenkStok<=toplamSize; // ~1 adet/beden altı → stok bitmek üzere
      // v8.7: ürün+renk sell-through (satış / yaklaşık toplam giriş).
      //   Düşük sell-through = ürün henüz olgunlaşmamış, "zamana ihtiyacı var".
      const yaklasikGiris=toplamRenkStok+toplamRenkSatis;
      const sellThrough=yaklasikGiris>0 ? toplamRenkSatis/yaklasikGiris : 0;
      // v8.7: ayakkabı grubu mu? (kullanıcı: ayakkabıya özel davranış)
      const isAyakkabi=/AYAKKAB/i.test(String(pdata.meta.anaGrup||'')+String(pdata.meta.malGrubu||''));
      // v8.7: her beden kaç FARKLI mağazada stoklu? (tek mağazada kalan beden tespiti)
      const bedenMagazaSayisi={};
      for (const sd of Object.values(pdata.stores)) {
        for (const [b,szd] of Object.entries(sd.sizes)) {
          if ((szd.stok||0)>0) bedenMagazaSayisi[b]=(bedenMagazaSayisi[b]||0)+1;
        }
      }
      // v8.7 KURAL B — bu üründe KIRIK olan tüm mağazalar (saf stok kontrolü;
      //   kaynak uygunluğundan BAĞIMSIZ). Per-size hedef seçiminde elenir:
      //   kırık bir mağazaya ürün gönderilmez. HUB istisnadır (kasıtlı nokta).
      const urunKirikMagazalar = new Set();
      for (const [sk,sd] of Object.entries(pdata.stores)) {
        let stokluSayisi=0;
        for (const [b,szd] of Object.entries(sd.sizes)) {
          if (String(b).toUpperCase()==='STD') continue;
          if ((szd.stok||0)>0) stokluSayisi++;
        }
        if (stokluSayisi>0 && stokluSayisi<=kirikEsik) urunKirikMagazalar.add(sk);
      }

      // ===== AŞAMA 1: Kırık mağazaları topla =====
      const allKirik=[];
      for (const sk of Object.keys(pdata.stores)) {
        const sdata=pdata.stores[sk];
        // ÇELİŞKİ ENGELİ: zaten hedef olan mağaza (depodan ürün aldı vb.)
        //   kırık değerlendirmesine girmez.
        if (!canBeSource(pkey,sk)) continue;
        const stokluB=[]; let minGiris=null;
        for (const [b,sd] of Object.entries(sdata.sizes)) {
          if (String(b).toUpperCase()==='STD') continue;
          if (sd.stok>0) {
            stokluB.push(b);
            if (sd.giris&&(!minGiris||sd.giris<minGiris)) minGiris=sd.giris;
          }
        }
        if (stokluB.length===0) continue;        // tamamen tükenmiş
        if (stokluB.length>kirikEsik) continue;  // yeterli beden var, kırık değil

        const days=minGiris?daysSince(minGiris,refDate):0;
        // Gün eşiği: normalde beklenir; ANCAK stok bitmek üzereyse beklemeden topla
        if (days!==null&&days<dayThreshold&&!kritikThin) continue;

        const toplam_stok=stokluB.reduce((s,b)=>s+(sdata.sizes[b]?.stok||0),0);
        allKirik.push({sk,sdata,stokluB,minGiris,days,toplam_stok});
      }
      if (allKirik.length===0) continue;

      // ============================================================
      // v8.20 — EN İYİ SATICIYI KORU + SATIŞ SIRALI HEDEF LİSTESİ
      // ============================================================
      // KULLANICI GERİ BİLDİRİMİ (Pazartesi kontrol listesi):
      //   "Bir mağaza SATIŞI İYİ olduğu için kırık olmuş olabilir (en çok
      //    satan ama bedenleri tükenmiş). Bu mağazayı ASLA BOŞALTMA — ona
      //    seri tamamla (HEDEF yap)."
      // SORUN: Eskiden en iyi satıcı kırıksa allKirik'e girip KAYNAK oluyordu
      //   (rmAddSource), bir daha hedef olamıyordu. ABİYE BLUZ 2499, ETEK 5009:
      //   Emaar 3 adet satmış (en iyi), tükendiği için kırık → program onu
      //   boşaltıp İzmir/MOİ'ye gönderiyordu. YANLIŞ.
      //
      // ÇÖZÜM: Bu ürün+renkte mağazaları TOPLAM SATIŞA göre sırala. Satışı
      //   olan mağazalar "ihtiyaç sahibi hedef" havuzuna girer (satış sırasıyla:
      //   en iyi 1., sonra 2., 3.). Bu mağazalar — kırık olsalar bile — kaynak
      //   olamaz; onlara seri tamamlanır. Yalnızca SATIŞSIZ veya çok zayıf
      //   kırık mağazalar gerçek kaynak olur.
      const satisSirali = Object.entries(pdata.storePerformance)
        .map(([k,p])=>{
          // Bu mağazanın "kanıtlı eksik" beden sayısı: sattı ama stok 0
          let kanitliEksik=0;
          if (p.sizes) for (const sz of Object.values(p.sizes))
            if ((sz.satis||0)>0 && (sz.stok||0)===0) kanitliEksik++;
          return {k, satis:p.satis||0, kanitliEksik, perf:p};
        })
        .filter(x=>x.satis>0)
        .sort((a,b)=>b.satis-a.satis||(a.perf.store.rank-b.perf.store.rank));
      // v8.20.1 KORUNAN SATICI tanımı (düzeltilmiş):
      //   İKİ koşuldan biri sağlanırsa mağaza korunur (kaynak olamaz):
      //   (A) O ürün+renkte EN İYİ SATICI ise (satış sırasında 1.) — en çok
      //       satan mağaza asla boşaltılmaz; ona seri tamamlanır.
      //   (B) Kanıtlı eksiği varsa (bir bedeni satıp tüketmiş, stok 0) — satıştan
      //       tükendiği için korunur.
      //   Diğer mağazalar (alt sırada + tükenmemiş) kaynak olabilir; fazla
      //   stoklarını dağıtabilirler.
      //   (Test 1: Panora EN İYİ DEĞİL ve tükenmemiş → korunmaz, kaynak olabilir.
      //    Stres testi: Emaar EN İYİ → korunur, boşaltılmaz.)
      const enIyiSaticiKey = satisSirali.length > 0 ? satisSirali[0].k : null;
      const korunanSaticilar = new Set(
        satisSirali
          .filter(x => x.k === enIyiSaticiKey || x.kanitliEksik > 0)
          .map(x => x.k)
      );

      // allKirik'i ikiye ayır: (a) korunan satıcı kırıkları → KAYNAK OLMAZ,
      //   onlara tamamlanır; (b) satışsız/zayıf kırıklar → gerçek kaynak.
      const korunanKirik = allKirik.filter(k=>korunanSaticilar.has(k.sk));
      const gercekKaynakKirik = allKirik.filter(k=>!korunanSaticilar.has(k.sk));

      // ============================================================
      // v8.20 — SERİ TAMAMLAMA: En iyi satıcılara eksik bedenleri gönder
      // ============================================================
      // Korunan satıcılar (satışı olan, özellikle en iyi) eksik bedenlerini
      // alır. Kaynak önceliği (kullanıcı onayı):
      //   1) Depo (bu modülde depo yok — depo modülü zaten çalıştı, atla)
      //   2) O bedende 2+ FAZLA stoğu olan mağaza (kırık değil)
      //   3) O bedeni SATMAMIŞ ama stoğu olan mağaza
      // Transfer sonrası kaynak 0'a düşecekse: SADECE hedefte kanıtlı ihtiyaç
      //   varsa (bu zaten kanıtlı — satıcı o bedeni satıp tüketmiş) izin ver,
      //   AMA kaynakta yeni kırık yaratmamaya çalış (2+ olanı tercih et).
      // (tumBedenler ve toplamSize yukarıda tanımlı — tekrar kullanılır)
      for (const satici of satisSirali) {
        const sk = satici.k;
        const perf = satici.perf;
        if (!perf.sizes) continue;
        // Bu satıcının KANITLI EKSİK bedenleri: sattı (satis>0) ama stok 0
        for (const beden of tumBedenler) {
          const sz = perf.sizes[beden];
          const sattiBitti = sz && (sz.satis||0)>0 && (sz.stok||0)===0;
          if (!sattiBitti) continue;
          // Bu satıcı bu beden için zaten hedef olamıyorsa atla
          if (!canBeTarget(pkey,sk)) continue;
          // Kaynak ara — öncelik sırasıyla
          const ledgerKey = pkey;
          let kaynakAday=null, kaynakTip='';
          // (2) o bedende 2+ stoğu olan, kırık olmayan, satışsız/düşük mağaza
          let cand2=[], cand3=[];
          for (const [ksk,kperf] of Object.entries(pdata.storePerformance)) {
            if (ksk===sk) continue;
            if (!canBeSource(pkey,ksk)) continue;
            const ksz = kperf.sizes && kperf.sizes[beden];
            const kStok = ledgerGet(ksk, ledgerKey, beden);  // canlı stok
            if (kStok<=0) continue;
            const kSatis = ksz ? (ksz.satis||0) : 0;
            // Kaynak bu bedeni satıyorsa göndermek riskli (kaynakta da talep)
            // ama 2+ stoğu varsa 1 verebilir.
            if (kStok>=2) cand2.push({ksk,kStok,kSatis});
            else if (kSatis===0) cand3.push({ksk,kStok,kSatis}); // 1 stoklu+satışsız
          }
          // (2) fazla stoklu öncelik: en çok stoğu olan, satışı en düşük
          cand2.sort((a,b)=>b.kStok-a.kStok||a.kSatis-b.kSatis);
          // (3) satışsız 1-stoklu: bunlar kaynakta kırık yaratır ama satış yok
          cand3.sort((a,b)=>a.kSatis-b.kSatis);
          const sec = cand2[0] || cand3[0];
          if (!sec) continue;  // uygun kaynak yok → bu beden tamamlanamadı
          // Transfer sonrası kaynak 0 olacaksa ve kaynak o bedeni satıyorsa
          //   (kaynakta da talep) → riskli, atla. cand2 zaten 2+ olduğu için
          //   güvenli; cand3 satışsız olduğu için 0'a düşse de sorun değil.
          // Ledger güncelle
          ledgerTakeFromSource(sec.ksk, ledgerKey, beden, 1);
          ledgerAddToTarget(sk, ledgerKey, beden, 1);
          rmAddSource(pkey, sec.ksk);
          rmAddTarget(pkey, sk);

          const srcMeta = pdata.stores[sec.ksk] ? pdata.stores[sec.ksk].meta : {label:sec.ksk};
          const tgtStore = perf.store;
          const fazlaNot = sec.kStok>=2
            ? `kaynak ${srcMeta.label} bu bedende ${sec.kStok} adet (fazla) tutuyor`
            : `kaynak ${srcMeta.label} bu bedeni satmamış`;
          const guvenST = calculateGuvenEndeksi({
            hedefSatis:perf.satis||0, kaynakSatis:(pdata.storePerformance[sec.ksk]||{}).satis||0,
            kaynakBeden_satis:sec.kSatis,
            hedefBeden_stok:0, hedefBeden_satis:(perf.sizes[beden]||{}).satis||0,
            bedenCurve:getBedenCurve(beden,sk),
            hedefSTR:perf.stok+perf.satis>0?Math.round(perf.satis/(perf.stok+perf.satis)*100):0,
            bekledigiGun:dayThreshold, esik:dayThreshold,
            isDepoTransfer:false, isKirikBeden:true, seriTamamlama:true,
          });
          result.kirikBeden.push({
            gonderen:srcMeta, hedef:tgtStore,
            urunKodu:pdata.meta.urunKodu, urunAdi:pdata.meta.urunAdi,
            renk:pdata.meta.renk, renkKodu:pdata.meta.renkKodu,
            beden, adet:1, transferTipi:'SERI_TAMAMLAMA', seriTamamlama:true,
            toplamSize:toplamSize, stokluBedenler:0, bosBeden:0,
            kirikEsik, giris:null, days:0, dayThreshold,
            altGrup:pdata.meta.altGrup, anaGrup:pdata.meta.anaGrup,
            malGrubu:pdata.meta.malGrubu, sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
            sezonDurum:pdata.meta.sezonDurum, takimDurumu:pdata.meta.takimDurumu,
            takimKod:pdata.meta.takimKod,
            velocityScore:Math.round((perf.velocityScore||0)*100),
            guvenEndeksi:guvenST, confidence:guvenST,
            neden:`Seri tamamlama: ${tgtStore.label} bu üründe en güçlü satıcı (toplam ${perf.satis} satış), ${beden} bedenini satıp tüketmiş → ${fazlaNot}, seri tamamlanıyor (Güven %${guvenST})`,
          });
          result.stats.kirikCount++;
          result.stats.transferableCount++;
        }
      }

      // Kullanıcı geri bildirimi (BLUZ 1772 EKRU, ASKILI BLUZ 3299):
      //   "Ürün genel olarak kırığa düşmüşse, toplam satışı EN YÜKSEK mağazada
      //    topla — bu mağaza kırık olmasa bile. Kırık bir mağazaya GÖNDERME."
      // v8.18 KURAL — %70 OLGUNLUK: Ürün+renk ağ genelinde sell-through ≥ %70
      //   ise VE başka mağazalarda kırık bekliyorsa, bu ürün "olgunlaşmış,
      //   konsolide et" sınıfındadır. Tek kırık mağaza olsa bile en güçlü
      //   mağazada toplanır (ABİYE 58464 PETROL örneği — Bursa en çok satan).
      // v8.18 DÜZELTME — TEK HEDEF GARANTİSİ: HUB seçildiğinde TÜM bedenler
      //   HUB'a gider; artık beden-bazlı dağıtım HUB'ı ezemez. Eskiden 36→
      //   Gordion, 40→Bursa gibi dağılıyordu; oysa kullanıcı tek mağazada
      //   toplanmasını istiyor.
      const olgunUrun = sellThrough >= 0.70;
      // v8.20: HUB tetikleme artık SADECE gerçek kaynak kırıklara bakar.
      //   Korunan satıcılar (satışı olan) kaynak havuzundan çıktı; onlar zaten
      //   seri tamamlama ile hedef oldu. HUB, satışsız/zayıf kırıkların nereye
      //   konsolide olacağını belirler.
      const hubTetikle = gercekKaynakKirik.length >= 2 || (olgunUrun && gercekKaynakKirik.length >= 1);
      let hub=null, hubSatis=0, hubKirikMi=false;
      if (hubTetikle) {
        const kirikKeys=new Set(gercekKaynakKirik.map(k=>k.sk));
        const hubCands=[];
        // (a) gerçek kaynak kırık mağazalar (yalnızca satışsızlar buraya düşer;
        //     ama yine de hedef adaylığı için bakılır — nadiren)
        for (const ks of gercekKaynakKirik) {
          const perf=pdata.storePerformance[ks.sk];
          if (!perf||!canBeTarget(pkey,ks.sk)) continue;
          let kanitliEksik=0;
          if (perf.sizes) for (const sz of Object.values(perf.sizes))
            if ((sz.satis||0)>0&&(sz.stok||0)===0) kanitliEksik++;
          hubCands.push({sk:ks.sk,ks,satis:perf.satis||0,kanitliEksik,
            stokSize:ks.stokluB.length,rank:perf.store.rank,kirik:true});
        }
        // (b) satışı olan güçlü mağazalar (korunan satıcılar dahil — HUB hedef
        //     olarak satıcı seçebilir; bu doğru, en iyi satıcıda konsolide olur)
        for (const [k,perf] of Object.entries(pdata.storePerformance)) {
          if (kirikKeys.has(k)) continue;
          if (!canBeTarget(pkey,k)) continue;
          if ((perf.satis||0)<=0) continue;
          let kanitliEksik=0;
          if (perf.sizes) for (const sz of Object.values(perf.sizes))
            if ((sz.satis||0)>0&&(sz.stok||0)===0) kanitliEksik++;
          hubCands.push({sk:k,ks:null,satis:perf.satis||0,kanitliEksik,
            stokSize:bedenRunBilgisi(perf).stokluSayisi,rank:perf.store.rank,kirik:false});
        }
        if (hubCands.length) {
          // v8.13: Asıl kriter ÜRÜN+RENK TOPLAM SATIŞ; eşitlikte kanıtlı eksik,
          //   sonra koleksiyon genişliği. En iyi satıcı doğal olarak HUB olur.
          hubCands.sort((a,b)=>
            b.satis-a.satis||b.kanitliEksik-a.kanitliEksik||
            b.stokSize-a.stokSize||String(a.sk).localeCompare(String(b.sk)));
          const best=hubCands[0];
          hubSatis=best.satis;
          hubKirikMi=best.kirik;
          hub={sk:best.sk};
        }
      }

      // v8.20: Kaynaklar = SADECE gerçek kaynak kırıklar (korunan satıcılar değil),
      //   HUB de hariç. Korunan satıcılar asla kaynak olmaz — boşaltılmazlar.
      const brokenSources = hub
        ? gercekKaynakKirik.filter(k=>k.sk!==hub.sk)
        : gercekKaynakKirik;
      if (brokenSources.length===0) continue;

      // Kaynakları rol haritasına kaydet — bu mağazalar artık hedef OLAMAZ
      for (const src of brokenSources) rmAddSource(pkey,src.sk);
      // HUB varsa hedef olarak kaydet
      if (hub) rmAddTarget(pkey,hub.sk);

      // ===== AŞAMA 2: HER BEDEN KENDİ EN İYİ HEDEFİNE (v8.3) =====
      // ESKİ v8.2: kırık kaynağın TÜM bedenleri tek bir konsolidasyon hedefine
      //   gidiyordu. SORUN (ABİYE 58464): Panora'nın 36+40'ı birlikte boş bir
      //   mağazaya (MOİ) yığılıyordu; oysa 36'yı Gordion satmış, 40'ı Bursa satmış.
      // YENİ: Taşınacak HER BEDEN ayrı değerlendirilir; o bedeni KANITLI satan
      //   mağazaya gönderilir (scoreSizeTarget). Aynı beden birden çok kırık
      //   kaynaktan geliyorsa hepsi o bedenin en iyi satıcısında toplanır
      //   (doğal konsolidasyon). Hedefin o bedende stoğu 0 olmak zorunda değildir.
      const brokenSourceKeys = new Set(brokenSources.map(s=>s.sk));

      // Taşınacak beden → kaynak listesi: { beden: [{src, qty}] }
      const bedenKaynaklari = {};
      for (const src of brokenSources) {
        for (const b of src.stokluB) {
          const qty = src.sdata.sizes[b] ? src.sdata.sizes[b].stok : 0;
          if (qty<=0) continue;
          (bedenKaynaklari[b] = bedenKaynaklari[b] || []).push({ src, qty });
        }
      }

      for (const [beden, kaynakList] of Object.entries(bedenKaynaklari)) {
        // v8.7 KURAL C — TEK MAĞAZADA KALAN BEDEN (BLUZ 3005 / 3754 örneği):
        //   Bu beden ağ genelinde yalnızca 1 mağazada stokluysa VE o rengin
        //   toplam stoğu çok düşükse (seri kurulamaz) → KURAL: bu bedeni SATIP
        //   stoğu BİTEN (kanıtlı ihtiyaç) başka mağaza VARSA oraya gönder;
        //   YOKSA transfer etme, mağazada bırak (iade adayı, maliyet oluşmasın).
        const bedenToplamAdet=kaynakList.reduce((s,x)=>s+x.qty,0);
        if ((bedenMagazaSayisi[beden]||0) <= 1 && toplamRenkStok <= toplamSize) {
          // Kanıtlı ihtiyaç sahibi (bu bedeni satmış + stoğu 0) hedef var mı?
          const kaynakKeys=new Set(kaynakList.map(x=>x.src.sk));
          const kanitliVar=Object.entries(pdata.storePerformance).some(([k,p])=>{
            if (kaynakKeys.has(k)||urunKirikMagazalar.has(k)||!canBeTarget(pkey,k)) return false;
            const sz=p.sizes&&p.sizes[beden];
            return sz&&(sz.satis||0)>0&&(sz.stok||0)===0;
          });
          if (!kanitliVar) {
            for (const {src,qty} of kaynakList) {
              result.bekleyen.push({
                kaynak:src.sdata.meta,urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:qty,
                anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                neden:'Tek mağazada kalan kırık beden — kanıtlı ihtiyaç sahibi mağaza yok, transfer maliyeti oluşmaması için mağazada bırakıldı (iade adayı)',
              });
            }
            continue;
          }
          // kanıtlıVar ise: aşağıdaki normal akış o hedefe gönderir.
        }
        // v8.7 KURAL D — DÜŞÜK SELL-THROUGH (özellikle AYAKKABI): ürün henüz
        //   olgunlaşmamışsa (sell-through ≤ %30) kırık bedeni güçlü mağazaya
        //   "konsolide etmek" için taşıma; sadece o bedeni SATIP stoğu BİTEN
        //   (kanıtlı eksik) mağaza varsa oraya gönder. Hiç kanıtlı eksik yoksa
        //   ürünü olduğu yerde bırak (zamana ihtiyacı var).
        const dususkOlgunluk = sellThrough <= 0.30 && (isAyakkabi || sellThrough <= 0.15);
        // HEDEF SEÇİMİ:
        //   HUB modu → tüm bedenler HUB'a (talebi en güçlü kırık mağaza)
        //   Beden modu → her beden, o bedeni en iyi satan/uygun mağazaya
        //   v8.7: düşük olgunlukta HUB konsolidasyonu DEVRE DIŞI — sadece
        //         o bedeni satıp tüketmiş gerçek ihtiyaç sahibi mağazaya git.
        let target, isHubMode=false;
        // v8.18: HUB varsa TÜM bedenler HUB'a gider (tek hedef garantisi).
        //   Olgun ürün (sell-through ≥%70) ise düşük-olgunluk istisnası geçersiz —
        //   ürün zaten satmış, konsolidasyon doğru karar.
        if (hub && (!dususkOlgunluk || olgunUrun)) {
          target=pdata.storePerformance[hub.sk].store;
          isHubMode=true;
        } else {
          // v8.7 KURAL B: KIRIK bir mağazaya GÖNDERME. Bu üründe kırık olan
          //   tüm mağazalar (urunKirikMagazalar — saf stok kontrolü) hedef
          //   adaylığından çıkarılır. HUB istisna: kasıtlı konsolidasyon noktası.
          let adaylar = Object.entries(pdata.storePerformance)
            .filter(([k,p])=>!urunKirikMagazalar.has(k)&&!brokenSourceKeys.has(k)&&canBeTarget(pkey,k))
            .map(([k,p])=>({k,p,sc:scoreSizeTarget(p,beden,pdata.meta.anaGrup)}))
            .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));
          // Eğer kırık-olmayan hiç aday kalmadıysa (tüm mağazalar kırık) →
          //   en azından kırık-kaynak olmayanlara izin ver (yumuşak geri dönüş).
          if (adaylar.length===0) {
            adaylar = Object.entries(pdata.storePerformance)
              .filter(([k,p])=>!brokenSourceKeys.has(k)&&canBeTarget(pkey,k))
              .map(([k,p])=>({k,p,sc:scoreSizeTarget(p,beden,pdata.meta.anaGrup)}))
              .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));
          }
          if (dususkOlgunluk) {
            // Yalnızca KANITLI EKSİK hedefler: bu bedeni satmış + stoğu 0.
            const kanitli = adaylar.filter(a=>{
              const sz=a.p.sizes&&a.p.sizes[beden];
              return sz && (sz.satis||0)>0 && (sz.stok||0)===0;
            });
            if (kanitli.length===0) {
              // Kanıtlı ihtiyaç yok → ürünü olduğu yerde bırak (zamana ihtiyacı var)
              for (const {src,qty} of kaynakList) {
                result.bekleyen.push({
                  kaynak:src.sdata.meta,urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                  renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:qty,
                  anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                  sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                  neden:`Düşük sell-through (%${Math.round(sellThrough*100)}) — ürün olgunlaşmamış, kanıtlı beden ihtiyacı olan mağaza yok; mağazada bırakıldı`,
                });
              }
              continue;
            }
            adaylar = kanitli;
          }
          if (adaylar.length===0) continue;
          if (adaylar[0].sc < -100) continue;   // bu beden için uygun hedef yok
          target = adaylar[0].p.store;
        }
        if (brokenSourceKeys.has(target.key)) continue;
        rmAddTarget(pkey,target.key);

        const kHp=pdata.storePerformance[target.key];
        const kSTR=kHp&&(kHp.stok+kHp.satis>0)?Math.round(kHp.satis/(kHp.stok+kHp.satis)*100):0;
        const kHsize=kHp&&kHp.sizes?kHp.sizes[beden]:null;

        for (const {src,qty} of kaynakList) {
          if (src.sk===target.key) continue;
          if (depoTaken.has(`${pdata.meta.urunKodu}|${pdata.meta.renkKodu}|${beden}|${target.key}`)) continue;

          // v8.18 LEDGER: Gerçek gönderilebilir miktar canlı defterden okunur.
          //   Eğer önceki bir modül/tur bu stoğu kısmen harcadıysa, defterdeki
          //   kalan kadar gönderilir. Stok aşımı (çift sayım) YAPISAL imkânsız.
          const ledgerKalan = ledgerGet(src.sk, pkey, beden);
          const gonderQty = Math.min(qty, ledgerKalan);
          if (gonderQty <= 0) continue;  // defterde stok kalmamış → atla

          // v8.20 — HEDEFTE YENİ KIRIK YARATMA ENGELİ:
          //   Hedef mağaza bu transferi alınca o ürün+renkte hâlâ kırık olacaksa
          //   VE hedefte bu beden için kanıtlı ihtiyaç yoksa (satıp tüketmemiş),
          //   bu transfer hedefte yeni/devam eden bir kırık yaratır. HUB modunda
          //   konsolidasyon kasıtlıdır (istisna). HUB dışı beden modunda engelle.
          //   (ASKILI BLUZ 3299 SİYAH: Panora XL → Bursa, Bursa'da kırık yaratıyordu)
          if (!isHubMode) {
            const hedefBedenSatti = kHsize && (kHsize.satis||0)>0;
            const hedefStokluBeden = ledgerStokluBedenSayisi(target.key, pkey);
            // Hedefte bu beden zaten yoksa transfer +1 beden ekler.
            const hedefBuBedenVar = ledgerGet(target.key, pkey, beden) > 0;
            const sonrasiStoklu = hedefBuBedenVar ? hedefStokluBeden : hedefStokluBeden + 1;
            // Transfer sonrası hedef hâlâ kırık VE bu bedeni satmamışsa → atla
            if (sonrasiStoklu <= kirikEsik && !hedefBedenSatti) continue;
          }

          // v8.6 DÜZELTME: kaynakBeden_satis artık gerçek veriden okunuyor.
          const kaynakBedenSatis_=(src.sdata.sizes&&src.sdata.sizes[beden])
            ? (src.sdata.sizes[beden].satis||0) : 0;
          const guvenK_=calculateGuvenEndeksi({
            hedefSatis:kHp?kHp.satis:0,kaynakSatis:src.sdata.totalSatis,
            kaynakBeden_satis:kaynakBedenSatis_,
            hedefBeden_stok:kHsize?kHsize.stok:0,hedefBeden_satis:kHsize?kHsize.satis:0,
            bedenCurve:getBedenCurve(beden,target.key),
            hedefSTR:kSTR,bekledigiGun:src.days||0,esik:dayThreshold,
            isDepoTransfer:false,isKirikBeden:true,
            stokluBedenSayisi:src.stokluB.length,toplamBedenSayisi:toplamSize,
            // Seri tamamlama: hedefte bu beden yoksa, transfer seriyi tamamlıyor.
            seriTamamlama:(!kHsize||(kHsize.stok||0)===0),
          });
          // Açıklama metni — HUB modu ile beden modu farklı gerekçe yazar.
          let satisNot;
          if (isHubMode) {
            const ihtiyacNot=(kHsize&&kHsize.satis>0&&(kHsize.stok||0)===0)
              ? ` (${target.label} bu bedeni ${kHsize.satis} adet satmış, stok 0 — ÖNCELİKLİ ihtiyaç)`
              : (kHsize&&kHsize.satis>0 ? ` (${target.label} bu bedeni satmış)` : '');
            const olgunNot = olgunUrun ? ` [ürün %${Math.round(sellThrough*100)} satış — olgun, konsolide]` : '';
            satisNot=` — ${target.label} bu üründe en güçlü satışa sahip mağaza`
                   + ` (toplam satış ${hubSatis}); kırık bedenler burada konsolide ediliyor${ihtiyacNot}${olgunNot}`;
          } else {
            satisNot=(kHsize&&kHsize.satis>0)
              ? ` — ${target.label} bu bedeni ${kHsize.satis} adet satmış (satış potansiyeli)`
              : ` — bu bedende kanıtlı satış yok → en güçlü/tam koleksiyonlu mağazada konsolidasyon`;
          }
          const konsNot=(!isHubMode&&kaynakList.length>1)
            ? ` [${kaynakList.length} mağazadan ${target.label}'e konsolidasyon]` : '';
          // v8.19 DÜZELTME — KIRIK KAYNAK = HER ZAMAN KONSOLİDE:
          //   Bu commit döngüsü brokenSources (kırık mağazalar) içinden gelir.
          //   Kaynak mağaza KIRIK olduğu için (sadece bu beden kalmış, stoğu
          //   1'den fazla olabilir), TÜM adet konsolide edilmelidir — geride
          //   kırık kalmamalı. Eskiden gonderQty>=3 ise FAZLA_STOK etiketlenip
          //   sonradan çıktıdan siliniyordu; bu, kırık mağazadaki 3+ adetlik
          //   tek bedeni yok sayıyordu (kullanıcı senaryosu: 42 beden 3 adet,
          //   başka beden yok → kırık, tümü gitmeli). Kırık kaynaktan gelen
          //   transfer asla FAZLA_STOK sayılmaz.
          const transferTipi = 'KIRIK';
          const tipNot = gonderQty >= 3
            ? `Kırık beden konsolidasyonu (${gonderQty} adet ${beden} — kaynak bu bedende kırık)`
            : 'Kırık beden';

          // v8.18 LEDGER: kaynaktan düş, hedefe ekle (komut sırasının yan etkisi yok)
          ledgerTakeFromSource(src.sk, pkey, beden, gonderQty);
          ledgerAddToTarget(target.key, pkey, beden, gonderQty);

          result.kirikBeden.push({
            gonderen:src.sdata.meta,hedef:target,
            urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
            renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,
            beden,adet:gonderQty,
            transferTipi,
            toplamSize,stokluBedenler:src.stokluB.length,
            bosBeden:toplamSize-src.stokluB.length,
            kirikEsik,giris:src.minGiris,days:src.days,dayThreshold,
            altGrup:pdata.meta.altGrup,anaGrup:pdata.meta.anaGrup,
            malGrubu:pdata.meta.malGrubu,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
            sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
            takimKod:pdata.meta.takimKod,
            velocityScore:Math.round((kHp?kHp.velocityScore:0)*100),
            guvenEndeksi:guvenK_,
            confidence:guvenK_,
            neden:`${tipNot}: ${src.sdata.meta.label} ${src.stokluB.length}/${toplamSize} stoklu → ${target.label} [beden ${beden}]${satisNot}${konsNot} (Güven %${guvenK_})`,
          });
          result.stats.kirikCount++;
          result.stats.transferableCount++;
        }
      }
    }

    // ===== MAĞAZA → MAĞAZA =====
    // v8.13: Yalnızca "Mağaza Arası + Kırık" modu seçiliyse aday toplanır.
    const magCands=[];
    if (trfMode.magaza)
    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      const hasAnySales=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.satis>0));
      const dayThreshold=getDayThreshold(pdata.meta.isNewSeason);
      const catAvg=getCatAvg(pdata.meta.anaGrup);

      for (const sk of Object.keys(pdata.stores)) {
        const sdata=pdata.stores[sk];
        // v8.2: Bu mağaza bu ürün+renk için zaten HEDEF olduysa kaynak olamaz
        if (!canBeSource(pkey,sk)) continue;
        // v8.17 DÜZELTME: Kırık modülü bu mağazayı zaten kaynak olarak işaretlediyse
        //   mağaza→mağaza modülü de kaynak yapamaz — çift sayım (double-count) önlenir.
        //   Kırık mağazanın TÜM stoğunu işlediğinden, mağaza modülü aynı bedeni
        //   farklı hedeflere yönlendirip stok aşımına yol açıyordu.
        if (rmGet(pkey).sources.has(sk)) continue;
        for (const [beden,sd] of Object.entries(sdata.sizes)) {
          if (sd.stok<=0) continue;
          if (sd.satis>0) continue;   // Satışı var → göndermeyiz
          if (sd.stok===1) continue;  // Tek stok → kırık beden modülüne gider

          if (!sd.giris) continue;
          const days=daysSince(sd.giris,refDate);
          if (days===null||days<dayThreshold) { result.stats.waitingCount++; continue; }
          if (!hasAnySales) { result.stats.waitingCount++; continue; }

          // Hedef: bu bedeni eksik + satışı olan mağazalar (velocity sırası)
          const hedefA=[];
          for (const tsk of Object.keys(pdata.storePerformance)) {
            if (tsk===sk) continue;
            if (!canBeTarget(pkey,tsk)) continue;   // v8.2: kaynak olan mağaza hedef olamaz
            const tp=pdata.storePerformance[tsk];
            if (tp.satis===0) continue;
            const td=tp.sizes[beden];
            if (!td||td.stok===0) {
              hedefA.push({
                store:tp.store,velocityScore:tp.velocityScore,
                performance:tp.performance,totalSatis:tp.satis,
                bedenCurve:getBedenCurve(beden,tsk),
              });
            }
          }
          if (hedefA.length===0) continue;

          // v8.1: velocity + beden eğrisi ile sırala
          hedefA.sort((a,b)=>{
            const sA=a.velocityScore*0.7+(a.bedenCurve/100)*0.3;
            const sB=b.velocityScore*0.7+(b.bedenCurve/100)*0.3;
            return sB-sA;
          });

          const hedef=hedefA[0];
          const gondPerf=pdata.storePerformance[sk]?.performance||0.2;
          // TEK KAYNAK KURALI: Depo→Mağaza'da zaten önerildiyse, mağaza→mağaza ekleme
          const tkKey = `${pdata.meta.urunKodu}|${pdata.meta.renkKodu}|${beden}|${hedef.store.key}`;
          if (depoTaken.has(tkKey)) continue;
          
          magCands.push({kaynak:{sk,sdata,beden,sd,days,gondPerf},hedef,pdata,dayThreshold});
        }
      }
    }

    // Tek Kaynak Kuralı
    const grouped={};
    for (const c of magCands) {
      const key=`${c.pdata.meta.urunKodu}|${c.pdata.meta.renkKodu}|${c.kaynak.beden}|${c.hedef.store.key}`;
      if (!grouped[key]) { grouped[key]=c; continue; }
      const cur=grouped[key];
      const curS=cur.kaynak.days*100+(1-cur.kaynak.gondPerf)*50+cur.kaynak.sdata.rank;
      const newS=c.kaynak.days*100+(1-c.kaynak.gondPerf)*50+c.kaynak.sdata.rank;
      if (newS>curS) grouped[key]=c;
    }

    // Mağaza→Mağaza transferleri listeye ekle
    for (const c of Object.values(grouped)) {
      // v8.2: Rol çelişkisi son kontrolü (kırık modülü sonradan rol eklemiş olabilir)
      const _pk=`${c.pdata.meta.urunKodu}|${c.pdata.meta.renkKodu}`;
      if (!canBeSource(_pk,c.kaynak.sk)||!canBeTarget(_pk,c.hedef.store.key)) continue;
      // v8.17: Kırık modülü bu mağazayı kaynak işaretlediyse atla (çift sayım engeli)
      if (rmGet(_pk).sources.has(c.kaynak.sk)) continue;
      // v8.18 LEDGER: Canlı defterde bu bedende gerçekten stok kaldı mı?
      //   Kırık modülü / depo turu bu stoğu harcamış olabilir. Defter boşsa atla.
      const _ledgerKalan = ledgerGet(c.kaynak.sk, _pk, c.kaynak.beden);
      if (_ledgerKalan <= 0) continue;
      const qty=Math.min(_ledgerKalan,1);
      if (qty<=0) continue;

      // v8.20 — KAYNAK BOŞALTMA + HEDEFTE KIRIK YARATMA ENGELİ (Hata 2):
      //   (a) Kaynak bu transfer sonrası o ürün+renkte kırığa düşecekse VE
      //       kaynak bu üründe satışı olan (korunması gereken) bir mağazaysa,
      //       onu boşaltma. (Panora XL → Bursa: Panora boşalıyordu.)
      //   (b) Hedef bu transferi alınca hâlâ kırık olacak VE bu bedeni satmamışsa,
      //       hedefte yeni kırık yaratır → engelle. (Bursa'da kırık oluşuyordu.)
      {
        const _srcStokluSonrasi = ledgerStokluBedenSayisi(c.kaynak.sk, _pk) -
          (ledgerGet(c.kaynak.sk, _pk, c.kaynak.beden) - qty <= 0 ? 1 : 0);
        const _srcPerf = c.pdata.storePerformance[c.kaynak.sk];
        // v8.20.1: en iyi satıcı VEYA kanıtlı eksiği olan satıcıyı koru
        let _srcKanitliEksik=0;
        if (_srcPerf && _srcPerf.sizes) for (const sz of Object.values(_srcPerf.sizes))
          if ((sz.satis||0)>0 && (sz.stok||0)===0) _srcKanitliEksik++;
        let _enIyiM=null, _enIyiMSatis=-1;
        for (const [_k,_p] of Object.entries(c.pdata.storePerformance)) {
          if ((_p.satis||0) > _enIyiMSatis) { _enIyiMSatis=_p.satis||0; _enIyiM=_k; }
        }
        const _srcSatisli = _srcPerf && (_srcPerf.satis||0) > 0 &&
          (c.kaynak.sk===_enIyiM || _srcKanitliEksik > 0);
        // (a) satışı olan kaynağı kırığa düşürme
        if (_srcSatisli && _srcStokluSonrasi <= getKirikThreshold(
              (function(){const s=new Set();for(const sd of Object.values(c.pdata.stores))for(const b of Object.keys(sd.sizes))if(String(b).toUpperCase()!=='STD')s.add(b);return s.size;})()
            ) && _srcStokluSonrasi > 0) {
          continue;
        }
        // (b) hedefte yeni kırık yaratma
        const _hpForCheck = c.pdata.storePerformance[c.hedef.store.key];
        const _hpSize = _hpForCheck && _hpForCheck.sizes && _hpForCheck.sizes[c.kaynak.beden];
        const _hedefBedenSatti = _hpSize && (_hpSize.satis||0) > 0;
        const _hedefBuBedenVar = ledgerGet(c.hedef.store.key, _pk, c.kaynak.beden) > 0;
        const _hedefStoklu = ledgerStokluBedenSayisi(c.hedef.store.key, _pk);
        const _hedefSonrasi = _hedefBuBedenVar ? _hedefStoklu : _hedefStoklu + 1;
        const _toplamBeden = (function(){const s=new Set();for(const sd of Object.values(c.pdata.stores))for(const b of Object.keys(sd.sizes))if(String(b).toUpperCase()!=='STD')s.add(b);return s.size;})();
        if (_hedefSonrasi <= getKirikThreshold(_toplamBeden) && !_hedefBedenSatti) {
          continue;
        }
      }

      rmAddSource(_pk,c.kaynak.sk);
      rmAddTarget(_pk,c.hedef.store.key);
      // Deftere işle: kaynaktan düş, hedefe ekle
      ledgerTakeFromSource(c.kaynak.sk, _pk, c.kaynak.beden, qty);
      ledgerAddToTarget(c.hedef.store.key, _pk, c.kaynak.beden, qty);

      const sT_=c.pdata.meta.isNewSeason?'YENI':'VIRMAN';
      const sD_=c.pdata.meta.isNewSeason?'Yeni Sezon':'Virman';
      // Güven Endeksi
      const hp=c.pdata.storePerformance[c.hedef.store.key];
      const hSize=hp&&hp.sizes&&hp.sizes[c.kaynak.beden]?hp.sizes[c.kaynak.beden]:{stok:0,satis:0};
      const hSTR=hp&&(hp.stok+hp.satis>0)?Math.round(hp.satis/(hp.stok+hp.satis)*100):0;
      const guvenM_=calculateGuvenEndeksi({
        hedefSatis:hp?hp.satis:0,kaynakSatis:c.kaynak.sdata.totalSatis,
        kaynakBeden_satis:c.kaynak.sd.satis,
        hedefBeden_stok:hSize.stok,hedefBeden_satis:hSize.satis,
        bedenCurve:getBedenCurve(c.kaynak.beden,c.hedef.store.key),
        hedefSTR:hSTR,bekledigiGun:c.kaynak.days,esik:c.dayThreshold,
        isDepoTransfer:false,isKirikBeden:false,
      });
      result.magTransfers.push({
        gonderen:c.kaynak.sdata.meta,hedef:c.hedef.store,
        urunKodu:c.pdata.meta.urunKodu,urunAdi:c.pdata.meta.urunAdi,
        renkKodu:c.pdata.meta.renkKodu,renk:c.pdata.meta.renk,
        beden:c.kaynak.beden,adet:qty,days:c.kaynak.days,dayThreshold:c.dayThreshold,
        giris:c.kaynak.sd.giris,
        altGrup:c.pdata.meta.altGrup,anaGrup:c.pdata.meta.anaGrup,
        malGrubu:c.pdata.meta.malGrubu||'',sezonTipi:sT_,sezonDurum:sD_,
        takimDurumu:c.pdata.meta.takimDurumu||'',takimKod:c.pdata.meta.takimKod||'',
        velocityScore:Math.round(c.hedef.velocityScore*100),
        confidence:guvenM_,
        guvenEndeksi:guvenM_,
        neden:c.kaynak.sdata.meta.label+' → '+c.hedef.store.label+': '+c.kaynak.days+'g bekledi, hedefte '+(hp?hp.satis:0)+' satış (Güven %'+guvenM_+')',
      });
      result.stats.transferableCount++;
    }

    // ===== TRANSFER SONRASI KIRIK — v8.8'de İKİNCİ-TUR SİMÜLASYONA TAŞINDI =====
    // Eski mağaza-bazlı kontrol, aşağıdaki kapsamlı ikinci-tur
    // simülasyonu tarafından yapılıyor (depo+mağaza+kırık tümü).

    // ============================================================
    // v8.8 ÖNERİ 1 — İKİNCİ-TUR KIRIK SİMÜLASYONU
    // ============================================================
    // Tüm modüller bittikten sonra motor durmaz. TÜM transferleri (depo,
    // mağaza, kırık) sanal stok defterine uygular ve sorar:
    //   "Bu transferlerden SONRA hangi mağaza, hangi bedende kırık kaldı?"
    // İki sorunu birden yakalar:
    //   (a) KAYNAK YETİMİ — kırık mağazadan bazı bedenler taşındı ama biri
    //       uygun hedef bulamadığı için geride tek başına kaldı.
    //   (b) HEDEF KIRIĞI — transferi alan mağaza yine de seriyi tamamlayamadı.
    // Tespit edilen yeni kırıklar ek transfere bağlanır; çözülemeyenler
    // şeffaf biçimde 'bekleyen' listesine yazılır.
    // v8.13: İkinci/üçüncü tur kırık simülasyonu yalnızca "Mağaza Arası +
    //   Kırık" modu seçiliyse çalışır (sadece-depo modunda kırık üretilmez).
    if (trfMode.magaza) {
      const norm = s => String(s||'').toUpperCase().trim();
      // 1) Sanal stok defteri: storeKey → urunKodu|renkKodu → beden → adet
      const vstok = {};
      for (const pkey of Object.keys(productMap)) {
        const pdata = productMap[pkey];
        for (const [sk,sd] of Object.entries(pdata.stores)) {
          for (const [b,szd] of Object.entries(sd.sizes)) {
            if (norm(b)==='STD') continue;
            const vk = sk+'#'+pdata.meta.urunKodu+'|'+pdata.meta.renkKodu;
            (vstok[vk]=vstok[vk]||{})[b]=(vstok[vk][b]||0)+(szd.stok||0);
          }
        }
      }
      // 2) Tüm transferleri uygula (kaynaktan düş, hedefe ekle)
      const applyTr = (gonderenKey, hedefKey, urunKodu, renkKodu, beden, adet) => {
        if (beden===undefined||beden===null) return;
        const bb = String(beden);
        if (gonderenKey) {
          const sk = gonderenKey+'#'+urunKodu+'|'+renkKodu;
          if (vstok[sk]&&vstok[sk][bb]!==undefined)
            vstok[sk][bb] = Math.max(0, vstok[sk][bb]-(adet||0));
        }
        if (hedefKey) {
          const tk = hedefKey+'#'+urunKodu+'|'+renkKodu;
          (vstok[tk]=vstok[tk]||{})[bb]=(vstok[tk][bb]||0)+(adet||0);
        }
      };
      for (const t of result.depoTransfers)
        applyTr(null, t.hedef&&t.hedef.key, t.urunKodu, t.renkKodu, t.beden, t.adet);
      for (const t of result.magTransfers)
        applyTr((t.gonderen||t.kaynak||{}).key, t.hedef&&t.hedef.key, t.urunKodu, t.renkKodu, t.beden, t.adet);
      for (const t of result.kirikBeden)
        applyTr((t.gonderen||t.kaynak||{}).key, t.hedef&&t.hedef.key, t.urunKodu, t.renkKodu, t.beden, t.adet);

      // 3) Her ürün için transfer-sonrası kırık taraması
      let ikinciTurEk=0, ikinciTurBekleyen=0;
      // Önceki turlarda KAYNAK veya HEDEF olmuş mağazaları işaretle —
      // ikinci-tur bunların rolünü DEĞİŞTİREMEZ (önceki kararlar korunur).
      const oncekiRol={};
      const markRol=(pk,k,rol)=>{ if(!k)return; (oncekiRol[pk]=oncekiRol[pk]||{})[k]=rol; };
      for (const t of result.depoTransfers) markRol(t.urunKodu+'|'+t.renkKodu,(t.hedef||{}).key,'hedef');
      for (const t of result.magTransfers){ const p=t.urunKodu+'|'+t.renkKodu; markRol(p,(t.gonderen||t.kaynak||{}).key,'kaynak'); markRol(p,(t.hedef||{}).key,'hedef'); }
      for (const t of result.kirikBeden){ const p=t.urunKodu+'|'+t.renkKodu; markRol(p,(t.gonderen||t.kaynak||{}).key,'kaynak'); markRol(p,(t.hedef||{}).key,'hedef'); }

      for (const pkey of Object.keys(productMap)) {
        const pdata = productMap[pkey];
        // ürünün toplam beden sayısı
        const tumB = new Set();
        for (const sd of Object.values(pdata.stores))
          for (const b of Object.keys(sd.sizes)) if (norm(b)!=='STD') tumB.add(b);
        const toplamSize = tumB.size;
        const kirikEsik = getKirikThreshold(toplamSize);
        if (kirikEsik===0) continue;
        const prodKey = pdata.meta.urunKodu+'|'+pdata.meta.renkKodu;

        // transfer-sonrası her mağazanın stoklu bedenleri
        const postStore = {};
        for (const sk of Object.keys(pdata.stores)) {
          const vk = sk+'#'+prodKey;
          const sizes = vstok[vk]||{};
          const stoklu = Object.keys(sizes).filter(b=>sizes[b]>0);
          postStore[sk] = { stoklu, sizes };
        }
        // kırık kalan mağazalar
        const postKirik = Object.entries(postStore)
          .filter(([sk,v])=>v.stoklu.length>0 && v.stoklu.length<=kirikEsik);
        if (postKirik.length===0) continue;

        for (const [sk,v] of postKirik) {
          // Bu mağaza önceki turlarda HEDEF olduysa (depo/mağaza ürün aldı),
          // ikinci-tur onu KAYNAK yapamaz — önceki karar korunur.
          const rol=(oncekiRol[prodKey]||{})[sk];
          if (rol==='hedef') continue;
          // v8.20.1 — EN İYİ SATICIYI BOŞALTMA (Hata 1: Emaar, ETEK 5009):
          //   Bu mağaza (A) bu ürün+renkte EN İYİ SATICI ise VEYA (B) kanıtlı
          //   eksiği varsa kaynak olamaz — korunur, ona seri tamamlanır.
          const _perf = pdata.storePerformance[sk];
          if (_perf && (_perf.satis||0) > 0) {
            // en iyi satıcı mı?
            let _enIyi=null, _enIyiSatis=-1;
            for (const [_k,_p] of Object.entries(pdata.storePerformance)) {
              if ((_p.satis||0) > _enIyiSatis) { _enIyiSatis=_p.satis||0; _enIyi=_k; }
            }
            let _ke=0;
            if (_perf.sizes) for (const sz of Object.values(_perf.sizes))
              if ((sz.satis||0)>0 && (sz.stok||0)===0) _ke++;
            if (sk===_enIyi || _ke>0) continue;  // korunur, kaynak olamaz
          }
          for (const beden of v.stoklu) {
            // v8.18: qty hem sanal stok hem ana defter ile sınırlanır (senkron garanti)
            const qty = Math.min(v.sizes[beden]||0, ledgerGet(sk, prodKey, beden));
            if (qty<=0) continue;
            // bu beden için hedef: kırık OLMAYAN, o bedeni satmış/uygun mağaza
            const aday = Object.entries(pdata.storePerformance)
              .filter(([k,p])=>{
                if (k===sk) return false;
                const pv = postStore[k];
                if (pv && pv.stoklu.length>0 && pv.stoklu.length<=kirikEsik) return false; // kırık hedef olmaz
                // önceki turda KAYNAK olmuş mağaza hedef olamaz (çelişki önleme)
                if ((oncekiRol[prodKey]||{})[k]==='kaynak') return false;
                if (!canBeTarget(prodKey,k)) return false;
                return true;
              })
              .map(([k,p])=>({k,p,sc:scoreSizeTarget(p,beden,pdata.meta.anaGrup)}))
              .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));

            if (aday.length===0 || aday[0].sc < -100) {
              // çözüm yok → şeffaf biçimde bekleyene yaz
              result.bekleyen.push({
                kaynak:pdata.stores[sk].meta,
                urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:qty,
                anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                neden:'⚡ İkinci-tur: transfer sonrası kırık kaldı, uygun hedef yok — denetim için bekletildi',
              });
              ikinciTurBekleyen++;
              continue;
            }
            const target = aday[0].p.store;
            if (sk===target.key) continue;
            rmAddSource(prodKey,sk);
            rmAddTarget(prodKey,target.key);
            markRol(prodKey,sk,'kaynak');
            markRol(prodKey,target.key,'hedef');
            // sanal stoku güncelle (zincirleme kırık önlemek için)
            applyTr(sk, target.key, pdata.meta.urunKodu, pdata.meta.renkKodu, beden, qty);
            // v8.18: ana defteri de senkronize et (post-process + doğrulama için)
            ledgerTakeFromSource(sk, prodKey, beden, qty);
            ledgerAddToTarget(target.key, prodKey, beden, qty);
            postStore[sk].sizes[beden]=0;
            postStore[sk].stoklu=postStore[sk].stoklu.filter(b=>b!==beden);

            const tHp = aday[0].p;
            const tSize = tHp.sizes?tHp.sizes[beden]:null;
            const tSTR = tHp&&(tHp.stok+tHp.satis>0)?Math.round(tHp.satis/(tHp.stok+tHp.satis)*100):0;
            const guvenK_ = calculateGuvenEndeksi({
              hedefSatis:tHp.satis||0,kaynakSatis:pdata.stores[sk].totalSatis,
              kaynakBeden_satis:(pdata.stores[sk].sizes[beden]||{}).satis||0,
              hedefBeden_stok:tSize?tSize.stok:0,hedefBeden_satis:tSize?tSize.satis:0,
              bedenCurve:getBedenCurve(beden,target.key),
              hedefSTR:tSTR,bekledigiGun:0,esik:0,
              isDepoTransfer:false,isKirikBeden:true,
              stokluBedenSayisi:v.stoklu.length,toplamBedenSayisi:toplamSize,
              seriTamamlama:(!tSize||(tSize.stok||0)===0),
            });
            result.kirikBeden.push({
              gonderen:pdata.stores[sk].meta,hedef:target,
              urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
              renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,
              beden,adet:qty,
              transferTipi: 'KIRIK',  // v8.19: post-transfer kırık kaynak → her zaman konsolide
              toplamSize,stokluBedenler:v.stoklu.length,
              bosBeden:toplamSize-v.stoklu.length,kirikEsik,
              altGrup:pdata.meta.altGrup,anaGrup:pdata.meta.anaGrup,
              malGrubu:pdata.meta.malGrubu,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
              sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
              takimKod:pdata.meta.takimKod,
              velocityScore:Math.round((tHp.velocityScore||0)*100),
              guvenEndeksi:guvenK_,confidence:guvenK_,
              neden:`⚡ İkinci-tur kırık: ${pdata.stores[sk].meta.label} transfer sonrası ${v.stoklu.length}/${toplamSize} beden kaldı → ${target.label} [beden ${beden}] (Güven %${guvenK_})`,
              postTransfer:true,ikinciTur:true,
            });
            result.stats.kirikCount++;
            result.stats.transferableCount++;
            ikinciTurEk++;
          }
        }
      }
      result.stats.ikinciTurEk=ikinciTurEk;
      result.stats.ikinciTurBekleyen=ikinciTurBekleyen;

      // ============================================================
      // v8.11 — ÜÇÜNCÜ-TUR KIRIK DENETİMİ (son güvenlik taraması)
      // ============================================================
      // İkinci-tur kendi transferlerini de vstok'a uyguladı; ancak ikinci
      // turun KENDİ transferleri yeni bir kırık yaratmış olabilir (zincir
      // etki) ya da gözden kaçan bir kırık kalmış olabilir. Üçüncü tur,
      // güncel vstok üzerinden bir tarama daha yapar:
      //   - Çözülebilen yeni kırık → ek transfer.
      //   - Çözülemeyen → 'bekleyen' listesine (denetim için).
      // Üçüncü turda da çözülemeyen kırıklar stats.ucuncuTurKalan ile
      // raporlanır; bunlar gerçekten elde kalan, hiçbir mağazaya
      // gönderilemeyen kırıklardır (iade/showroom adayı).
      let ucuncuTurEk=0, ucuncuTurKalan=0;
      for (const pkey of Object.keys(productMap)) {
        const pdata = productMap[pkey];
        const tumB = new Set();
        for (const sd of Object.values(pdata.stores))
          for (const b of Object.keys(sd.sizes)) if (norm(b)!=='STD') tumB.add(b);
        const toplamSize = tumB.size;
        const kirikEsik = getKirikThreshold(toplamSize);
        if (kirikEsik===0) continue;
        const prodKey = pdata.meta.urunKodu+'|'+pdata.meta.renkKodu;

        // güncel (2. tur sonrası) sanal stok durumu
        const postStore = {};
        for (const sk of Object.keys(pdata.stores)) {
          const vk = sk+'#'+prodKey;
          const sizes = vstok[vk]||{};
          const stoklu = Object.keys(sizes).filter(b=>sizes[b]>0);
          postStore[sk] = { stoklu, sizes };
        }
        const postKirik = Object.entries(postStore)
          .filter(([sk,v])=>v.stoklu.length>0 && v.stoklu.length<=kirikEsik);
        if (postKirik.length===0) continue;

        for (const [sk,v] of postKirik) {
          // 2. turda HEDEF olmuş mağazanın stoğu sökülmez (karar korunur)
          if ((oncekiRol[prodKey]||{})[sk]==='hedef') continue;
          // v8.20: en iyi satıcıyı boşaltma — satışı olan + kanıtlı eksiği olan
          //   (satıp tüketmiş) mağaza kaynak olamaz
          const _perf3 = pdata.storePerformance[sk];
          if (_perf3 && (_perf3.satis||0) > 0) {
            let _enIyi3=null, _enIyiSatis3=-1;
            for (const [_k,_p] of Object.entries(pdata.storePerformance)) {
              if ((_p.satis||0) > _enIyiSatis3) { _enIyiSatis3=_p.satis||0; _enIyi3=_k; }
            }
            let _ke3=0;
            if (_perf3.sizes) for (const sz of Object.values(_perf3.sizes))
              if ((sz.satis||0)>0 && (sz.stok||0)===0) _ke3++;
            if (sk===_enIyi3 || _ke3>0) continue;
          }
          for (const beden of v.stoklu) {
            // v8.18: qty hem sanal stok hem ana defter ile sınırlanır (senkron garanti)
            const qty = Math.min(v.sizes[beden]||0, ledgerGet(sk, prodKey, beden));
            if (qty<=0) continue;
            const aday = Object.entries(pdata.storePerformance)
              .filter(([k,p])=>{
                if (k===sk) return false;
                const pv = postStore[k];
                if (pv && pv.stoklu.length>0 && pv.stoklu.length<=kirikEsik) return false;
                if ((oncekiRol[prodKey]||{})[k]==='kaynak') return false;
                if (!canBeTarget(prodKey,k)) return false;
                return true;
              })
              .map(([k,p])=>({k,p,sc:scoreSizeTarget(p,beden,pdata.meta.anaGrup)}))
              .sort((a,b)=>b.sc-a.sc||(b.p.satis||0)-(a.p.satis||0)||(b.p.stok||0)-(a.p.stok||0));

            if (aday.length===0 || aday[0].sc < -100) {
              // Üçüncü turda da çözülemedi → gerçekten elde kalan kırık.
              // ÇİFT KAYIT ÖNLEME: ikinci-tur bu SKU'yu zaten bekleyene
              //   yazdıysa tekrar ekleme; sadece nedenini güncelle.
              const mevcut = result.bekleyen.find(x =>
                x.urunKodu===pdata.meta.urunKodu &&
                x.renkKodu===pdata.meta.renkKodu &&
                String(x.beden)===String(beden) &&
                x.kaynak && x.kaynak.label===pdata.stores[sk].meta.label);
              if (mevcut) {
                mevcut.neden='⚡⚡ Üçüncü-tur onayı: hiçbir turda çözülemeyen kırık — elde kalan, iade/showroom adayı';
              } else {
                result.bekleyen.push({
                  kaynak:pdata.stores[sk].meta,
                  urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                  renkKodu:pdata.meta.renkKodu,renk:pdata.meta.renk,beden,stok:qty,
                  anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                  sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                  neden:'⚡⚡ Üçüncü-tur: hiçbir turda çözülemeyen kırık — elde kalan, iade/showroom adayı',
                });
              }
              ucuncuTurKalan++;
              continue;
            }
            const target = aday[0].p.store;
            if (sk===target.key) continue;
            rmAddSource(prodKey,sk);
            rmAddTarget(prodKey,target.key);
            markRol(prodKey,sk,'kaynak');
            markRol(prodKey,target.key,'hedef');
            applyTr(sk, target.key, pdata.meta.urunKodu, pdata.meta.renkKodu, beden, qty);
            // v8.18: ana defteri senkronize et
            ledgerTakeFromSource(sk, prodKey, beden, qty);
            ledgerAddToTarget(target.key, prodKey, beden, qty);
            postStore[sk].sizes[beden]=0;
            postStore[sk].stoklu=postStore[sk].stoklu.filter(b=>b!==beden);

            const tHp = aday[0].p;
            const tSize = tHp.sizes?tHp.sizes[beden]:null;
            const tSTR = tHp&&(tHp.stok+tHp.satis>0)?Math.round(tHp.satis/(tHp.stok+tHp.satis)*100):0;
            const guvenK_ = calculateGuvenEndeksi({
              hedefSatis:tHp.satis||0,kaynakSatis:pdata.stores[sk].totalSatis,
              kaynakBeden_satis:(pdata.stores[sk].sizes[beden]||{}).satis||0,
              hedefBeden_stok:tSize?tSize.stok:0,hedefBeden_satis:tSize?tSize.satis:0,
              bedenCurve:getBedenCurve(beden,target.key),
              hedefSTR:tSTR,bekledigiGun:0,esik:0,
              isDepoTransfer:false,isKirikBeden:true,
              stokluBedenSayisi:v.stoklu.length,toplamBedenSayisi:toplamSize,
              seriTamamlama:(!tSize||(tSize.stok||0)===0),
            });
            result.kirikBeden.push({
              gonderen:pdata.stores[sk].meta,hedef:target,
              urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
              renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,
              beden,adet:qty,
              transferTipi: 'KIRIK',  // v8.19: post-transfer kırık kaynak → her zaman konsolide
              toplamSize,stokluBedenler:v.stoklu.length,
              bosBeden:toplamSize-v.stoklu.length,kirikEsik,
              altGrup:pdata.meta.altGrup,anaGrup:pdata.meta.anaGrup,
              malGrubu:pdata.meta.malGrubu,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
              sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
              takimKod:pdata.meta.takimKod,
              velocityScore:Math.round((tHp.velocityScore||0)*100),
              guvenEndeksi:guvenK_,confidence:guvenK_,
              neden:`⚡⚡ Üçüncü-tur kırık: ${pdata.stores[sk].meta.label} → ${target.label} [beden ${beden}] (Güven %${guvenK_})`,
              postTransfer:true,ikinciTur:true,ucuncuTur:true,
            });
            result.stats.kirikCount++;
            result.stats.transferableCount++;
            ucuncuTurEk++;
          }
        }
      }
      result.stats.ucuncuTurEk=ucuncuTurEk;
      result.stats.ucuncuTurKalan=ucuncuTurKalan;
    }

    // ============================================================
    // v8.14 — SADECE-DEPO MODU: SERİ TAMAMLAMA DESTEĞİ
    // ============================================================
    // KURAL (kullanıcı talebi): "Sadece Depodan Transfer" modunda bile,
    //   depodan çıkan bir ürün alıcı mağazada KIRIK oluşturacaksa, o
    //   mağazaya diğer mağazalardan eksik bedenler gönderilip seri
    //   tamamlanır. Seri bütünlüğü her zaman önceliğimizdir.
    // KAPSAM: Bu destek SADECE depo modunda + mağaza modu kapalıyken
    //   devreye girer (mağaza modu açıksa zaten 2./3. tur bunu yapıyor).
    //   Yalnızca depo transferinin KIRIK BIRAKTIĞI hedefe müdahale eder —
    //   geniş kırık taraması değildir; amaç sadece o seriyi tamamlamak.
    // ÖRNEK (kullanıcının verdiği): İzmir bir rengi çok satmış (%70),
    //   depodan 1 beden gidiyor (doğru) ama İzmir'de o üründe stok yok →
    //   tek başına kırık. Bu durumda depodan ek bedenler + diğer
    //   mağazalardan eksikler İzmir'e gönderilip seri kurulur.
    let seriDestekEk = 0, seriDestekKalan = 0;
    if (trfMode.depo && !trfMode.magaza) {
      const norm2 = s => String(s||'').toUpperCase().trim();
      // Sanal stok defteri (mevcut mağaza stoğu)
      const vs = {};
      for (const pkey of Object.keys(productMap)) {
        const pd = productMap[pkey];
        for (const [sk,sd] of Object.entries(pd.stores)) {
          for (const [b,szd] of Object.entries(sd.sizes)) {
            if (norm2(b)==='STD') continue;
            const vk = sk+'#'+pkey;
            (vs[vk]=vs[vk]||{})[b]=(vs[vk][b]||0)+(szd.stok||0);
          }
        }
      }
      // Depo transferlerini sanal stoğa uygula (hedef mağaza stoğu artar)
      for (const t of result.depoTransfers) {
        const hk = t.distrib&&t.distrib[0]?t.distrib[0].store.key:null;
        if (!hk) continue;
        const pkey = t.urunKodu+'|'+t.renkKodu;
        const vk = hk+'#'+pkey;
        (vs[vk]=vs[vk]||{})[t.beden]=(vs[vk][t.beden]||0)+(t.adet||0);
      }
      // Depo transferi ALAN her hedefi kontrol et: kırık kaldı mı?
      const etkilenenHedef = {};   // pkey -> Set(storeKey)
      for (const t of result.depoTransfers) {
        const hk = t.distrib&&t.distrib[0]?t.distrib[0].store.key:null;
        if (!hk) continue;
        const pkey = t.urunKodu+'|'+t.renkKodu;
        (etkilenenHedef[pkey]=etkilenenHedef[pkey]||new Set()).add(hk);
      }
      for (const pkey of Object.keys(etkilenenHedef)) {
        const pdata = productMap[pkey];
        if (!pdata) continue;
        if (isKirikMuaf(pdata.meta.anaGrup,pdata.meta.altGrup,'')) continue;
        const tumB = new Set();
        for (const sd of Object.values(pdata.stores))
          for (const b of Object.keys(sd.sizes)) if (norm2(b)!=='STD') tumB.add(b);
        const toplamSize = tumB.size;
        const kirikEsik = getKirikThreshold(toplamSize);
        if (kirikEsik===0) continue;

        for (const hk of etkilenenHedef[pkey]) {
          const vkH = hk+'#'+pkey;
          const sizesH = vs[vkH]||{};
          const stokluH = Object.keys(sizesH).filter(b=>sizesH[b]>0);
          // Transfer sonrası hedef KIRIK mı? (değilse dokunma)
          if (stokluH.length===0 || stokluH.length>kirikEsik) continue;

          // Hedefte EKSİK olan bedenler — bunları tamamlayacağız
          const eksikBedenler = [...tumB].filter(b=>!(sizesH[b]>0));
          for (const beden of eksikBedenler) {
            // Kaynak ara: önce DEPO, sonra MAĞAZALAR (kullanıcı önceliği)
            let gonderildi = false;
            // 1) DEPODA bu beden var mı?
            for (const depKey of ['MERKEZ','SHOWROOM']) {
              const dep = pdata.depots&&pdata.depots[depKey];
              if (!dep) continue;
              const dSize = dep.sizes&&dep.sizes[beden];
              if (dSize && dSize.stok>0) {
                rmAddTarget(pkey,hk);
                result.depoTransfers.push({
                  gonderici:dep.meta||{label:depKey==='MERKEZ'?'Merkez Depo':'Showroom'},
                  urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                  renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,beden,adet:1,
                  anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                  malGrubu:pdata.meta.malGrubu,
                  sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                  sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
                  transferTipi:'SERI_TAMAMLAMA',
                  guvenEndeksi:88,confidence:88,
                  distrib:[{store:pdata.storePerformance[hk].store,qty:1}],
                  hedef:pdata.storePerformance[hk].store,
                  neden:`🔗 Seri tamamlama (depo): ${hk} mağazasında depo transferi sonrası kırık oluşmaması için eksik ${beden} bedeni depodan eklendi`,
                  seriTamamlama:true,
                });
                sizesH[beden]=(sizesH[beden]||0)+1;
                seriDestekEk++; gonderildi=true;
                break;
              }
            }
            if (gonderildi) continue;
            // 2) DİĞER MAĞAZALARDA bu beden var mı? (kaynak mağazada kırık
            //    YARATMAMAK koşuluyla — o bedeni çıkarınca kaynak kırık olmasın)
            const kaynakAday = [];
            for (const [sk,sd] of Object.entries(pdata.stores)) {
              if (sk===hk) continue;
              const vkS = sk+'#'+pkey;
              const sizesS = vs[vkS]||{};
              if (!(sizesS[beden]>0)) continue;
              const stokluS = Object.keys(sizesS).filter(b=>sizesS[b]>0);
              // Bu bedeni çıkarınca kaynak kırık olur mu?
              const sonrasi = stokluS.filter(b=>b!==beden||sizesS[b]>1);
              if (sonrasi.length<=kirikEsik && stokluS.length>kirikEsik) continue; // kaynağı kırma
              const perf = pdata.storePerformance[sk];
              kaynakAday.push({sk,perf,satis:perf?perf.satis||0:0,
                fazla:sizesS[beden]});
            }
            // Kaynak: bu üründe en AZ satışı olan + bedende fazlası olan
            //   (iyi satan mağazadan ürün sökmeyelim — kullanıcı kuralı)
            kaynakAday.sort((a,b)=>a.satis-b.satis||b.fazla-a.fazla);
            if (kaynakAday.length>0) {
              const kA = kaynakAday[0];
              rmAddSource(pkey,kA.sk);
              rmAddTarget(pkey,hk);
              const guvenSeri = calculateGuvenEndeksi({
                hedefSatis:(pdata.storePerformance[hk].satis)||0,
                kaynakSatis:kA.satis,kaynakBeden_satis:0,
                hedefBeden_stok:0,hedefBeden_satis:0,
                bedenCurve:getBedenCurve(beden,hk),
                hedefSTR:0,bekledigiGun:0,esik:0,
                isDepoTransfer:false,isKirikBeden:true,
                stokluBedenSayisi:stokluH.length,toplamBedenSayisi:toplamSize,
                seriTamamlama:true,
              });
              result.kirikBeden.push({
                gonderen:pdata.stores[kA.sk].meta,
                hedef:pdata.storePerformance[hk].store,
                urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
                renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,beden,adet:1,
                transferTipi:'SERI_TAMAMLAMA',
                toplamSize,stokluBedenler:stokluH.length,
                bosBeden:toplamSize-stokluH.length,kirikEsik,
                anaGrup:pdata.meta.anaGrup,altGrup:pdata.meta.altGrup,
                malGrubu:pdata.meta.malGrubu,
                sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
                sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
                guvenEndeksi:guvenSeri,confidence:guvenSeri,
                neden:`🔗 Seri tamamlama (mağaza): ${kA.sk} → ${hk} — depo transferi sonrası ${hk} mağazasında kırık oluşmaması için eksik ${beden} bedeni gönderildi`,
                seriTamamlama:true,
              });
              const vkS = kA.sk+'#'+pkey;
              vs[vkS][beden]=Math.max(0,(vs[vkS][beden]||0)-1);
              sizesH[beden]=(sizesH[beden]||0)+1;
              seriDestekEk++; gonderildi=true;
            }
            if (!gonderildi) seriDestekKalan++;
          }
        }
      }
    }
    result.stats.seriDestekEk = seriDestekEk;
    result.stats.seriDestekKalan = seriDestekKalan;

    // ===== v8.4 — SON ÇELİŞKİ DENETİMİ (KESİN GARANTİ) =====
    // KURAL: Hiçbir mağaza aynı ürün+renk için aynı transfer çalışmasında
    //   hem KAYNAK hem HEDEF olamaz. Üst modüllerdeki rol kilidi (roleMap)
    //   bunu zaten engeller; bu son tarama, ileride yeni bir modül eklense
    //   dahi çıktıda çelişki KALMAMASINI garanti eder.
    // ÇÖZÜM POLİTİKASI (kullanıcı talebi): "Kırık bedeni mağazadan almak
    //   doğrudur" → KAYNAK rolü korunur; çelişen mağazaya GELEN transferler
    //   iptal edilip 'bekleyen' listesine taşınır (şeffaflık).
    {
      const _pk = t => `${t.urunKodu}|${t.renkKodu}`;
      const _src = t => (t.gonderen && t.gonderen.key) || (t.kaynak && t.kaynak.key) || null;
      const _tgt = t => (t.hedef && t.hedef.key) || null;
      const kaynakSet = {}, hedefSet = {};
      const tara = list => { for (const t of list) {
        const pk=_pk(t), s=_src(t), h=_tgt(t);
        if (s) (kaynakSet[pk]=kaynakSet[pk]||new Set()).add(s);
        if (h) (hedefSet[pk]=hedefSet[pk]||new Set()).add(h);
      } };
      tara(result.depoTransfers); tara(result.magTransfers); tara(result.kirikBeden);

      // Çelişkili (ürün+renk → mağaza) kümesi
      const cakisan = {};
      for (const pk in kaynakSet) {
        if (!hedefSet[pk]) continue;
        for (const st of kaynakSet[pk]) if (hedefSet[pk].has(st)) (cakisan[pk]=cakisan[pk]||new Set()).add(st);
      }

      let cozulenCakisma = 0;
      if (Object.keys(cakisan).length) {
        // KAYNAK rolü korunur → çelişen mağazaya GELEN transferleri ayıkla
        const temizle = list => list.filter(t => {
          const pk=_pk(t), h=_tgt(t);
          if (h && cakisan[pk] && cakisan[pk].has(h)) {
            cozulenCakisma++;
            result.bekleyen.push({
              kaynak:(t.gonderen||t.kaynak||{label:'?'}),
              urunKodu:t.urunKodu,urunAdi:t.urunAdi,
              renkKodu:t.renkKodu,renk:t.renk,beden:t.beden,stok:t.adet||1,
              anaGrup:t.anaGrup,altGrup:t.altGrup,
              sezonTipi:t.sezonTipi||'',
              neden:`Çelişki giderildi: ${h} mağazası aynı üründe kaynak rolünde olduğu için bu gelen transfer iptal edildi`,
            });
            return false;
          }
          return true;
        });
        result.depoTransfers = temizle(result.depoTransfers);
        result.magTransfers  = temizle(result.magTransfers);
        result.kirikBeden    = temizle(result.kirikBeden);
      }
      result.stats.cozulenCakisma = cozulenCakisma;
    }

    // ===== v8.13 — MÜKERRER TRANSFER DENETİMİ =====
    // KURAL (kullanıcı talebi): Aynı ürün+renk+beden+kaynak+hedef ikilisi
    //   birden fazla kez transfer listesinde olmamalı. Çok katmanlı
    //   simülasyon turlarında nadiren aynı SKU iki kez yazılabilir; bu
    //   tarama mükerrerleri tespit eder ve fazlasını çıktıdan SİLER.
    {
      let mukerrerSilinen = 0;
      const dedup = list => {
        const gorulen = new Set();
        return list.filter(t => {
          const src = (t.gonderen&&t.gonderen.key)||(t.kaynak&&t.kaynak.key)||'DEPO';
          const tgt = (t.hedef&&t.hedef.key)||
                      (t.distrib&&t.distrib[0]?t.distrib[0].store.key:'')||'';
          const anahtar = `${t.urunKodu}|${t.renkKodu}|${t.beden}|${src}|${tgt}`;
          if (gorulen.has(anahtar)) { mukerrerSilinen++; return false; }
          gorulen.add(anahtar);
          return true;
        });
      };
      result.depoTransfers = dedup(result.depoTransfers);
      result.magTransfers  = dedup(result.magTransfers);
      result.kirikBeden    = dedup(result.kirikBeden);
      result.stats.mukerrerSilinen = mukerrerSilinen;
    }

    // ===== v8.16/v8.19 — FAZLA STOK KAYITLARINI ÇIKAR (güvenlik ağı) =====
    // v8.19 NOT: Kırık kaynaktan gelen transferler artık ASLA FAZLA_STOK
    //   etiketlenmiyor (kırık mağazadaki 3+ adet tek beden de konsolide edilir).
    //   Bu filtre yalnızca kırık-OLMAYAN bir kaynaktan üretilmiş gerçek fazla
    //   stok kayıtları için güvenlik ağı olarak kalır. Pratikte artık nadiren
    //   tetiklenir; kırık konsolidasyonunu etkilemez.
    {
      const oncesi = result.kirikBeden.length;
      result.kirikBeden = result.kirikBeden.filter(k => k.transferTipi !== 'FAZLA_STOK');
      result.depoTransfers = result.depoTransfers.filter(t => t.transferTipi !== 'FAZLA_STOK');
      result.magTransfers = result.magTransfers.filter(t => t.transferTipi !== 'FAZLA_STOK');
      result.stats.fazlaStokCikarilan = oncesi - result.kirikBeden.length;
    }

    // ===== ENVANTER ÖZETİ (UI uyumlu — tüm field'lar) =====
    const magGelenMap_={}, depoGelenMap_={}, gidenMap_={}, eksikBedenMap_={};
    
    for (const t of result.depoTransfers) {
      const hk=t.distrib&&t.distrib[0]?t.distrib[0].store.key:null;
      if (hk) depoGelenMap_[hk]=(depoGelenMap_[hk]||0)+t.adet;
    }
    for (const t of result.magTransfers) {
      magGelenMap_[t.hedef.key]=(magGelenMap_[t.hedef.key]||0)+t.adet;
      gidenMap_[t.gonderen.key]=(gidenMap_[t.gonderen.key]||0)+t.adet;
    }
    for (const k of result.kirikBeden) {
      gidenMap_[k.gonderen.key]=(gidenMap_[k.gonderen.key]||0)+(k.adet||1);
      eksikBedenMap_[k.gonderen.key]=(eksikBedenMap_[k.gonderen.key]||0)+1;
    }
    
    for (const sk of Object.keys(storeStatsMap)) {
      const ss=storeStatsMap[sk];
      const dG=depoGelenMap_[sk]||0;
      const mG=magGelenMap_[sk]||0;
      const gd=gidenMap_[sk]||0;
      const ek=eksikBedenMap_[sk]||0;
      result.envanter.push({
        store:ss.storeMeta,
        stok:ss.stok,satis:ss.satis,
        totalStok:ss.stok,totalSatis:ss.satis,
        str:ss.stok+ss.satis>0?Math.round(ss.satis/(ss.stok+ss.satis)*100):0,
        eksikBeden:ek,depoGelen:dG,magGelen:mG,giden:gd,
        net:(dG+mG)-gd,
      });
    }
    result.envanter.sort((a,b)=>a.store.rank-b.store.rank);
    
    // ===== STATS: Merkez stok + Y26/Virman adet =====
    let merkezStok_=0;
    for (const pdata_ of Object.values(productMap)) {
      const md_=pdata_.depots['MERKEZ'];
      if (md_) merkezStok_+=md_.totalStok;
    }
    result.stats.merkezStok=merkezStok_;
    
    let ysA_=0,vrA_=0;
    const allT_=[].concat(result.depoTransfers,result.magTransfers,result.kirikBeden);
    for (const t of allT_) {
      const a=t.adet||0;
      if (t.sezonTipi==='YENI') ysA_+=a; else vrA_+=a;
    }
    result.stats.yeniSezonAdet=ysA_;
    result.stats.virmanAdet=vrA_;
    
    // Güven Endeksi istatistikleri
    const tumGE=[];
    for (const t of result.depoTransfers) if (t.guvenEndeksi!==undefined) tumGE.push(t.guvenEndeksi);
    for (const t of result.magTransfers) if (t.guvenEndeksi!==undefined) tumGE.push(t.guvenEndeksi);
    for (const t of result.kirikBeden) if (t.guvenEndeksi!==undefined) tumGE.push(t.guvenEndeksi);
    result.stats.guvenOrtalama=tumGE.length>0?Math.round(tumGE.reduce((a,b)=>a+b,0)/tumGE.length):0;
    result.stats.guvenUstu90=tumGE.filter(g=>g>=90).length;
    result.stats.guvenAlti75=tumGE.filter(g=>g<75).length;
    result.stats.guvenToplam=tumGE.length;

    // ===== YENİ GİRİŞ / YOLDA ÜRÜN ÖZETİ =====
    // MagazayaGirisTarihi = 1.1.1900 → ürün depoya yeni girmiş ve mağazaya
    //   sevk edilmiş; mağaza henüz fiziksel teslim almamış (yolda/nakil).
    //   Bu ürünler transfer analizine alınmaz, ayrı listede raporlanır.
    {
      const etkilenenUrun=new Set();
      const magazaDagilim={};
      let toplamStokEtkilenen=0;
      for (const h of result.yolda) {
        etkilenenUrun.add(h.urunKodu+'|'+h.renkKodu);
        const ml=(h.store&&h.store.label)||'?';
        magazaDagilim[ml]=(magazaDagilim[ml]||0)+1;
        toplamStokEtkilenen+=(h.stok||0);
      }
      result.stats.yoldaOzet={
        toplamKayit:result.yolda.length,
        etkilenenUrunSayisi:etkilenenUrun.size,
        etkilenenStokAdedi:toplamStokEtkilenen,
        magazaDagilim,
        not:'MagazayaGirisTarihi = 1.1.1900 olan satırlar — ürün yolda/nakilde. Mağaza fiziksel teslim aldığında bir sonraki çalışmada normal değerlendirilecek.',
      };
      // Geriye dönük uyumluluk
      result.stats.hataliTarihOzet=result.stats.yoldaOzet;
    }

    // ===== POST-PROCESS: Alıcı Mağaza Beden Durumu (v8.18 — LEDGER tabanlı) =====
    // Her transfer için hedef mağazadaki transfer SONRASI gerçek beden doluluğu.
    // Artık canlı defterden (ledger) okunur — tüm transferler uygulandıktan
    // sonraki KESİN durum. Format: "X/Y" (X = stoklu beden, Y = toplam beden).
    {
      const allT = [].concat(result.depoTransfers, result.magTransfers, result.kirikBeden);
      for (const t of allT) {
        const pkey = t.urunKodu + '|' + t.renkKodu;
        const pdata = productMap[pkey];
        if (!pdata) { t.hedefBedenDurumu = '—'; continue; }

        const tb = new Set();
        for (const sd of Object.values(pdata.stores))
          for (const b of Object.keys(sd.sizes))
            if (String(b).toUpperCase() !== 'STD') tb.add(b);
        for (const dd of Object.values(pdata.depots))
          for (const b of Object.keys(dd.sizes))
            if (String(b).toUpperCase() !== 'STD') tb.add(b);
        const toplamSize = tb.size;
        if (toplamSize === 0) { t.hedefBedenDurumu = '—'; continue; }

        const hedefKey = (t.hedef && t.hedef.key) ||
                         (t.distrib && t.distrib[0] ? t.distrib[0].store.key : null);
        if (!hedefKey) { t.hedefBedenDurumu = '—'; continue; }

        // v8.18: canlı defterden transfer-sonrası stoklu beden sayısı
        const stoklu = ledgerStokluBedenSayisi(hedefKey, pkey);
        t.hedefBedenDurumu = stoklu + '/' + toplamSize;
      }
    }

    // ============================================================
    // v8.18 — FİNAL DOĞRULAMA & VERİ SAĞLIK RAPORU
    // ============================================================
    // Tüm modüller ve turlar bittikten sonra çıktının tamamı denetlenir.
    // İki kritik hata sınıfı taranır:
    //   1. STOK AŞIMI: Bir mağaza+ürün+bedenden, başlangıç stoğundan fazla
    //      gönderim yapılmış mı? (çift sayım kalıntısı)
    //   2. ROL ÇELİŞKİSİ: Bir mağaza aynı ürün+renkte hem kaynak hem hedef mi?
    // Bulunan her hata raporlanır; kullanıcı elle aramak zorunda kalmaz.
    {
      const saglik = { stokAsimi: [], rolCeliskisi: [], toplamTransfer: 0, durum: 'OK' };

      // Başlangıç stok haritası (orijinal veri)
      const baslangicStok = {};  // sk|pkey|beden → adet
      for (const pkey of Object.keys(productMap)) {
        for (const [sk, sd] of Object.entries(productMap[pkey].stores)) {
          for (const [b, szd] of Object.entries(sd.sizes)) {
            baslangicStok[`${sk}|${pkey}|${b}`] = (szd.stok || 0);
          }
        }
      }

      // Tüm transferlerden gönderim toplamı (kaynak bazında)
      const gonderimToplam = {};  // sk|pkey|beden → adet
      const kaynakSet = {};       // pkey → Set(sk)
      const hedefSet = {};        // pkey → Set(sk)
      const addRol = (map, pkey, sk) => {
        if (!sk) return;
        (map[pkey] = map[pkey] || new Set()).add(sk);
      };

      const allOut = [
        ...result.magTransfers.map(t => ({...t, _src:(t.gonderen||t.kaynak||{}).key})),
        ...result.kirikBeden.map(t => ({...t, _src:(t.gonderen||t.kaynak||{}).key})),
      ];
      for (const t of allOut) {
        const pkey = t.urunKodu + '|' + t.renkKodu;
        const sk = t._src;
        const hk = (t.hedef||{}).key;
        if (sk) {
          gonderimToplam[`${sk}|${pkey}|${t.beden}`] =
            (gonderimToplam[`${sk}|${pkey}|${t.beden}`] || 0) + (t.adet || 0);
          addRol(kaynakSet, pkey, sk);
        }
        addRol(hedefSet, pkey, hk);
        saglik.toplamTransfer++;
      }
      // Depo transferleri sadece hedef (kaynak = depo, sınırsız)
      for (const t of result.depoTransfers) {
        const pkey = t.urunKodu + '|' + t.renkKodu;
        const hk = (t.hedef||{}).key || (t.distrib && t.distrib[0] ? t.distrib[0].store.key : null);
        addRol(hedefSet, pkey, hk);
        saglik.toplamTransfer++;
      }

      // 1) STOK AŞIMI taraması
      for (const [key, gonderilen] of Object.entries(gonderimToplam)) {
        const baslangic = baslangicStok[key] || 0;
        if (gonderilen > baslangic) {
          const [sk, uk, rk, ...bd] = key.split('|');
          // key formatı sk|urunKodu|renkKodu|beden — pkey iki parça
          const parts = key.split('|');
          saglik.stokAsimi.push({
            magaza: parts[0],
            urun: parts[1],
            renk: parts[2],
            beden: parts[3],
            baslangicStok: baslangic,
            gonderilen,
            asim: gonderilen - baslangic,
          });
        }
      }

      // 2) ROL ÇELİŞKİSİ taraması
      for (const pkey of Object.keys(kaynakSet)) {
        const kaynaklar = kaynakSet[pkey];
        const hedefler = hedefSet[pkey] || new Set();
        for (const sk of kaynaklar) {
          if (hedefler.has(sk)) {
            saglik.rolCeliskisi.push({ urunRenk: pkey, magaza: sk });
          }
        }
      }

      // ============================================================
      // v8.20 — İKİ YENİ DENETİM
      // ============================================================
      // (3) EN İYİ SATICI BOŞALTILDI MI?
      //   Bir ürün+renkte toplam satışı en yüksek mağaza, o üründe KAYNAK
      //   olarak kullanıldıysa bu bir hatadır (en iyi satıcı boşaltılmamalı).
      saglik.enIyiSaticiBosaltildi = [];
      {
        // Her ürün+renk için en iyi satıcıyı bul
        const enIyiSatici = {};  // pkey → {sk, satis}
        for (const pkey of Object.keys(productMap)) {
          const perf = productMap[pkey].storePerformance || {};
          let best=null;
          for (const [sk,p] of Object.entries(perf)) {
            if ((p.satis||0)<=0) continue;
            if (!best || (p.satis||0) > best.satis) best={sk,satis:p.satis||0};
          }
          if (best) enIyiSatici[pkey]=best;
        }
        // Kaynak olarak kullanılan mağazalar (kirik + mağaza transferlerinden)
        for (const t of [...result.kirikBeden, ...result.magTransfers]) {
          const pkey = t.urunKodu + '|' + t.renkKodu;
          const sk = (t.gonderen||t.kaynak||{}).key;
          const ei = enIyiSatici[pkey];
          if (ei && sk && ei.sk === sk) {
            // Seri tamamlama kaynak sayılmaz (en iyi satıcı zaten hedef)
            if (t.transferTipi === 'SERI_TAMAMLAMA') continue;
            // v8.20.1: En iyi satıcı kaynak olduysa, hedefi KENDİSİNDEN DAHA ÇOK
            //   satan bir mağaza mı? Öyleyse bu kabul edilebilir konsolidasyon
            //   (daha güçlü satıcıda toplama). Değilse gerçek hata — boşaltma.
            const hedefKey = (t.hedef||{}).key;
            const hedefPerf = (productMap[pkey].storePerformance||{})[hedefKey];
            const hedefSatis = hedefPerf ? (hedefPerf.satis||0) : 0;
            if (hedefSatis >= ei.satis) continue;  // daha güçlü hedefe gitti, OK
            saglik.enIyiSaticiBosaltildi.push({
              urunRenk: pkey, magaza: sk, satis: ei.satis, beden: t.beden,
            });
          }
        }
      }

      // (4) TRANSFER HEDEFTE YENİ KIRIK YARATTI MI?
      //   Final ledger'da, bir mağaza bir ürün+renkte HEDEF olduysa ve o üründe
      //   hâlâ kırık (stoklu beden ≤ eşik) kaldıysa, transfer kırığı çözmek
      //   yerine sürdürmüş olabilir. HUB konsolidasyonu istisnadır (kasıtlı).
      saglik.hedefteKirik = [];
      {
        const hedefOlanlar = {};  // pkey → Set(sk)
        for (const t of [...result.depoTransfers, ...result.magTransfers, ...result.kirikBeden]) {
          if (t.transferTipi === 'SERI_TAMAMLAMA') continue;  // seri tamamlama kırık çözer
          const pkey = t.urunKodu + '|' + t.renkKodu;
          const hk = (t.hedef||{}).key;
          if (hk) (hedefOlanlar[pkey] = hedefOlanlar[pkey] || new Set()).add(hk);
        }
        for (const pkey of Object.keys(hedefOlanlar)) {
          const tb = new Set();
          for (const sd of Object.values(productMap[pkey].stores))
            for (const b of Object.keys(sd.sizes))
              if (String(b).toUpperCase()!=='STD') tb.add(b);
          const esik = getKirikThreshold(tb.size);
          if (esik === 0) continue;
          for (const sk of hedefOlanlar[pkey]) {
            const stoklu = ledgerStokluBedenSayisi(sk, pkey);
            // Mağaza→mağaza tek-beden transferi hedefi kırık bırakabilir;
            //   yalnızca mağaza transferi alıp hâlâ kırık olanları işaretle
            if (stoklu > 0 && stoklu <= esik) {
              // Bu mağaza bu üründe satıcı mı? (satıcıysa kırık normal — talebi var)
              const perf = (productMap[pkey].storePerformance||{})[sk];
              const satici = perf && (perf.satis||0) > 0;
              if (!satici) {
                saglik.hedefteKirik.push({ urunRenk: pkey, magaza: sk, stokluBeden: stoklu, esik });
              }
            }
          }
        }
      }

      if (saglik.stokAsimi.length > 0 || saglik.rolCeliskisi.length > 0 ||
          saglik.enIyiSaticiBosaltildi.length > 0 || saglik.hedefteKirik.length > 0) {
        saglik.durum = 'HATA';
      }
      saglik.stokAsimiSayisi = saglik.stokAsimi.length;
      saglik.rolCeliskisiSayisi = saglik.rolCeliskisi.length;
      saglik.enIyiSaticiBosaltildiSayisi = saglik.enIyiSaticiBosaltildi.length;
      saglik.hedefteKirikSayisi = saglik.hedefteKirik.length;
      result.stats.saglikRaporu = saglik;
    }

    return result;
  }

  // ===== runAnalysis =====
  function runAnalysis(newSeasonPrefix) {
    // DATA'ya güvenli erişim (window.DATA bazı tarayıcılarda undefined olabilir)
    var dataObj = (typeof DATA !== 'undefined') ? DATA : (window.DATA || null);
    if (!dataObj) {
      console.error('runAnalysis: DATA objesi bulunamadı');
      return null;
    }
    var raw = dataObj.rawData || [];
    if (!raw || raw.length === 0) {
      console.error('runAnalysis: rawData boş, uzunluk=', raw ? raw.length : 'null');
      return null;
    }
    console.log('runAnalysis: analiz başlıyor, ' + raw.length + ' satır, prefix=' + newSeasonPrefix);
    
    var prefix = newSeasonPrefix ||
      (document.getElementById('newSeasonInput') ? document.getElementById('newSeasonInput').value : 'Y26') || 'Y26';
    
    // v8.12: birikmiş mağaza × kategori DNA'sını analize ver (varsa).
    //   DATA.cachedDNA, sayfa açılışında IndexedDB'den yüklenir.
    var storedDNA = (dataObj.cachedDNA && typeof dataObj.cachedDNA === 'object')
      ? dataObj.cachedDNA : null;
    
    // v8.13: kullanıcının seçtiği transfer modu (depo / mağaza+kırık)
    var trfMode = { depo: true, magaza: true };
    try {
      if (typeof UI !== 'undefined' && UI.getTransferMode) trfMode = UI.getTransferMode();
    } catch (e) { /* varsayılan tam analiz */ }
    
    // v8.13: kullanıcının girdiği sezon başlangıç tarihi (analiz bunu bilir)
    var seasonStart = null;
    try {
      var ssEl = document.getElementById('seasonStartInput');
      if (ssEl && ssEl.value) seasonStart = ssEl.value;
    } catch (e) {}
    
    var r = analyze(raw, dataObj.takimMap || {}, {
      newSeasonPrefix: prefix, storedDNA: storedDNA, transferMode: trfMode,
      seasonStart: seasonStart,
    });
    
    dataObj.lastAnalysis = r;
    dataObj.lastAnalysisDate = new Date();
    
    // v8.12: güncellenmiş DNA'yı kalıcı sakla (veri geldikçe zenginleşir).
    if (r.stats && r.stats.categoryDNA) {
      dataObj.cachedDNA = r.stats.categoryDNA;
      if (typeof dataObj.saveDNA === 'function') {
        dataObj.saveDNA(r.stats.categoryDNA);   // async — arka planda yazar
      }
    }
    
    console.log('runAnalysis: analiz bitti, depo=' + r.depoTransfers.length + ' mag=' + r.magTransfers.length);
    return r;
  }

  return {
    analyze,runAnalysis,STORES,CENTRAL_DEPOTS,matchStore,matchCentral,
    isNewSeason,parseDate,isErrorDate,isOnTheWay,daysSince,
    calculatePerformance,calcVelocity,getCategory,getBedenCurve,
    getKirikThreshold,isKirikMuaf,
    scoreDepotTarget,scoreConsolidationTarget,scoreSizeTarget,bedenRunBilgisi,
    calculateGuvenEndeksi,
    SIZE_CURVE_NUMERIC,SIZE_CURVE_SML,
    VERSION:'v8.20.1',
    THRESHOLDS:{NEW_SEASON:NEW_SEASON_DAY_THRESHOLD,VIRMAN:VIRMAN_DAY_THRESHOLD,STORE_LIMIT},
  };
})();

// Global erişim için window objesine ekle
if (typeof window !== "undefined") window.ALGO = ALGO;
