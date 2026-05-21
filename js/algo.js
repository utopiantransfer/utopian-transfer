// ============================================================
// UTOPIAN TRANSFER v8.1 — ALGORİTMA MODÜLÜ
//
// KIRIK BEDEN KURALLARI (v8.1 — Romina onaylı):
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
//
// v8.1 YENİ:
//   - Kırık beden tanımı boyuta göre dinamik eşik
//   - Velocity skoru: Bayes(%40) + Haftalık hız(%60)
//   - Transfer sonrası kırık beden tespiti
//   - Çanta/Aksesuar STD → kırık sayılmaz
//   - Mağaza × Beden eğrisi (NEBİM verisinden)
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
  const STORE_LIMIT              = 50;  // Mağaza başı max adet

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
    if (hedefSatis >= 5) skor += 35;       // Çok güçlü talep
    else if (hedefSatis >= 3) skor += 30;
    else if (hedefSatis >= 1) skor += 25;
    else skor += 0;                         // Hedefte hiç satış yok → RİSK
    
    // ===== Kriter 2: Hedefte bu BEDEN eksik mi (20 puan) =====
    if (hedefBeden_stok === 0 && hedefBeden_satis > 0) skor += 20; // Eksik + talep var = mükemmel
    else if (hedefBeden_stok === 0) skor += 15;                     // Eksik var
    else if (hedefBeden_stok === 1) skor += 8;                      // Az stok
    else skor += 0;                                                 // Yeterli stok = RİSK
    
    // ===== Kriter 3: Kaynak doğru mu (15 puan) =====
    if (isDepoTransfer) {
      skor += 15;  // Depo zaten doğal kaynak
    } else {
      // Mağaza→Mağaza için: kaynakta bu BEDENDE satış 0 olmalı
      if (kaynakBeden_satis === 0) skor += 15;
      else if (kaynakBeden_satis === 1) skor += 8;
      else skor += 0;  // Kaynakta da satılıyor → göndermek yanlış
    }
    
    // ===== Kriter 4: Beden eğrisi uyumu (10 puan) =====
    // Hedef mağazada bu bedenin tarihsel pay yüksekse → doğru gönderim
    if (bedenCurve >= 25) skor += 10;
    else if (bedenCurve >= 15) skor += 8;
    else if (bedenCurve >= 8) skor += 5;
    else if (bedenCurve > 0) skor += 3;
    
    // ===== Kriter 5: Bekleme süresi (10 puan) =====
    // Eşiğin üzerinde ne kadar çok beklediyse o kadar acil
    if (bekledigiGun && esik) {
      const ratio = bekledigiGun / esik;
      if (ratio >= 3) skor += 10;       // 3x ve üzeri bekledi
      else if (ratio >= 2) skor += 8;
      else if (ratio >= 1.5) skor += 6;
      else if (ratio >= 1) skor += 5;
    } else if (isDepoTransfer) {
      skor += 7;  // Depo için uygula varsayılan
    }
    
    // ===== Kriter 6: Hedef mağaza YTD performansı (10 puan) =====
    // Genel olarak iyi satan mağaza = daha güvenilir
    if (hedefSTR >= 35) skor += 10;
    else if (hedefSTR >= 30) skor += 8;
    else if (hedefSTR >= 25) skor += 6;
    else if (hedefSTR >= 20) skor += 4;
    else skor += 2;
    
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

  // ===== HATA TARİH KONTROLÜ =====
  // 1.1.1900 = veri hatası, 1.1.1990 = ürün yolda
  function isErrorDate(d) {
    if (!d) return false;
    const y=d.getFullYear();
    return y===1900||y===1899||y===1990;
  }

  function isOnTheWay(d) {
    // 1.1.1990 = mağazaya ulaşmamış, yolda
    if (!d) return false;
    return d.getFullYear()===1990;
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

  // ===== ANA ANALİZ =====
  function analyze(rawData, takimMap, options) {
    const opts=options||{};
    const refDate=opts.refDate?new Date(opts.refDate):new Date();
    const newSeasonPrefix=opts.newSeasonPrefix||'Y26';
    const filterCat=opts.filterCategory||null;
    const filterSto=opts.filterStore||null;

    const result={
      depoTransfers:[],magTransfers:[],kirikBeden:[],
      bekleyen:[],hataliTarih:[],envanter:[],
      stats:{totalRows:0,matchedRows:0,transferableCount:0,
             waitingCount:0,errorDateCount:0,onTheWayCount:0,
             kirikCount:0,criticalKirikCount:0,
             merkezStok:0,yeniSezonAdet:0,virmanAdet:0},
    };
    if (!rawData||rawData.length===0) return result;
    result.stats.totalRows=rawData.length;

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

      // ===== HATA TARİH: 1.1.1900 =====
      if (magazaGiris&&(magazaGiris.getFullYear()===1900||magazaGiris.getFullYear()===1899)) {
        if (store) {
          result.hataliTarih.push({
            store,urunKodu,urunAdi,renkKodu,renk:renkAdi||renkKodu,
            beden,stok,satis,anaGrup,altGrup,magazaGiris,depoyaGiris,sonFatura,
            neden:'MagazayaGirisTarihi = 1.1.1900 (veri hatası)',
          });
          result.stats.errorDateCount++;
        }
        continue;
      }

      // ===== YOLDA: 1.1.1990 → transfere dahil etme =====
      if (magazaGiris&&magazaGiris.getFullYear()===1990) {
        if (store) {
          result.hataliTarih.push({
            store,urunKodu,urunAdi,renkKodu,renk:renkAdi||renkKodu,
            beden,stok,satis,anaGrup,altGrup,magazaGiris,depoyaGiris,sonFatura,
            neden:'MagazayaGirisTarihi = 1.1.1990 (ürün yolda, henüz mağazaya ulaşmamış)',
            yolda:true,
          });
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


    // ===== HÜLYA v8.4 AKILLI TİCARİ KARAR KATMANI =====
    // Amaç: sadece satış gücüne değil, gerçek beden ihtiyacına ve asorti yapısına göre karar vermek.
    // Kritik kurallar:
    // 1) Satış var + aynı beden stok 0 ise en güçlü öncelik.
    // 2) Hedef mağazada ürün/rengin full asortisi varsa gereksiz transfer yapılmaz.
    // 3) Hedefe giden ürün tek başına yeni kırık ürün oluşturacaksa bloklanır.
    // 4) Aynı SKU+renk+beden aynı analizde sadece 1 kez transfer edilebilir.
    // 5) Kırık bedenler topluca tek mağazaya değil, beden bazlı gerçek ihtiyaç olan mağazaya gider.

    const modelPerformance = {};
    for (const pp of Object.values(productMap)) {
      const u = pp.meta.urunKodu;
      if (!modelPerformance[u]) modelPerformance[u] = {};
      for (const [sk, sp] of Object.entries(pp.storePerformance)) {
        if (!modelPerformance[u][sk]) modelPerformance[u][sk] = { satis:0, stok:0 };
        modelPerformance[u][sk].satis += sp.satis || 0;
        modelPerformance[u][sk].stok  += sp.stok  || 0;
      }
    }

    function allProducedSizes(pdata) {
      const set = new Set();
      for (const sd of Object.values(pdata.stores || {})) {
        for (const b of Object.keys(sd.sizes || {})) if (String(b).toUpperCase() !== 'STD') set.add(b);
      }
      for (const dd of Object.values(pdata.depots || {})) {
        for (const b of Object.keys(dd.sizes || {})) if (String(b).toUpperCase() !== 'STD') set.add(b);
      }
      return Array.from(set);
    }

    function stockSizeCount(pdata, storeKey) {
      const sp = pdata.storePerformance[storeKey];
      if (!sp || !sp.sizes) return 0;
      let n = 0;
      for (const [b, sz] of Object.entries(sp.sizes)) {
        if (String(b).toUpperCase() !== 'STD' && (sz.stok || 0) > 0) n++;
      }
      return n;
    }

    function sizeData(pdata, storeKey, beden) {
      const sp = pdata.storePerformance[storeKey];
      if (!sp || !sp.sizes || !sp.sizes[beden]) return { stok:0, satis:0 };
      return { stok:sp.sizes[beden].stok || 0, satis:sp.sizes[beden].satis || 0 };
    }

    function isFullAssorti(pdata, storeKey) {
      const total = allProducedSizes(pdata).length;
      if (total <= 1) return false;
      return stockSizeCount(pdata, storeKey) >= total;
    }

    function willCreateOrphan(pdata, storeKey, beden) {
      const total = allProducedSizes(pdata).length;
      if (total <= 2) return false;
      const sp = pdata.storePerformance[storeKey];
      if (!sp) return true;
      const currentStockSizes = stockSizeCount(pdata, storeKey);
      const sd = sizeData(pdata, storeKey, beden);
      const afterStockSizes = currentStockSizes + (sd.stok > 0 ? 0 : 1);
      // Mağazada bu ürün/rengin hiç stoku yoksa ve sadece 1 beden gidecekse yeni kırık yaratır.
      // Ancak aynı renk/bedende daha önce satış varsa stok tamamlama kabul edilir.
      if (afterStockSizes <= 1 && total >= 3 && sd.satis === 0) return true;
      return false;
    }

    function smartTargetScore(pdata, storeKey, beden, mode) {
      const sp = pdata.storePerformance[storeKey];
      if (!sp) return -999;
      const sd = sizeData(pdata, storeKey, beden);
      const totalSizes = allProducedSizes(pdata).length;
      const stockCnt = stockSizeCount(pdata, storeKey);
      const model = (modelPerformance[pdata.meta.urunKodu] || {})[storeKey] || { satis:0, stok:0 };
      let score = 0;
      let reason = [];

      // Full asorti mağazaya aynı üründen gereksiz transfer yapma.
      if (isFullAssorti(pdata, storeKey) && sd.stok > 0) return { score:-999, reason:'full asorti + beden stoklu' };

      // Beden bazlı gerçek ihtiyaç.
      if (sd.stok === 0 && sd.satis > 0) { score += 120; reason.push('satış var + beden stok 0'); }
      else if (sd.stok === 0 && sp.satis > 0 && sp.stok > 0) { score += 80; reason.push('ürün/renginde satış var + beden eksik'); }
      else if (sd.stok === 0 && sp.satis > 0 && sp.stok === 0) { score += 70; reason.push('ürün/rengi satmış ve tükenmiş'); }
      else if (sd.stok === 0 && model.satis > 0 && model.stok > 0) { score += 45; reason.push('model diğer renklerde satıyor'); }
      else if (sd.stok === 0 && model.satis > 0 && mode === 'depo') { score += 30; reason.push('model satış geçmişi var'); }
      else if (sd.stok > 0) { score -= 80; reason.push('beden zaten stoklu'); }
      else { score -= 60; reason.push('satış kanıtı yok'); }

      // Yetim/kırık yaratma kontrolü.
      if (willCreateOrphan(pdata, storeKey, beden)) { score -= 90; reason.push('tek beden/kırık yaratır'); }

      // Asorti tamamlama bonusu: 1/4 -> 2/4 veya 2/4 -> 3/4 yapıyorsa iyi.
      if (sd.stok === 0 && stockCnt > 0 && totalSizes > 0) {
        const after = Math.min(totalSizes, stockCnt + 1);
        score += after * 8;
        reason.push('asorti güçlendirir');
      }

      // Satış/stok performansı ve beden eğrisi.
      score += (sp.velocityScore || sp.performance || 0) * 35;
      score += Math.min(20, (sp.satis || 0) * 3);
      score += Math.min(10, getBedenCurve(beden, storeKey) / 3);

      // Mağaza önceliği küçük tie-breaker.
      score += Math.max(0, 8 - (sp.store.rank || 8));

      return { score, reason:reason.join(' + ') };
    }

    const globalTransferLock = new Set();
    function lockKey(pdata, beden) { return `${pdata.meta.urunKodu}|${pdata.meta.renkKodu}|${beden}`; }
    function isLocked(pdata, beden) { return globalTransferLock.has(lockKey(pdata, beden)); }
    function setLocked(pdata, beden) { globalTransferLock.add(lockKey(pdata, beden)); }

    // ===== DEPO → MAĞAZA =====
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
          // HÜLYA v8.4: Hedef mağaza, gerçek beden ihtiyacına göre seçilir.
          // Öncelik: aynı beden satış var + stok 0 > aynı renk asorti tamamlama > model bazlı satış.
          // Satış kanıtı yoksa veya tek beden/kırık yaratacaksa elenir.
          if (isLocked(pdata, beden)) continue;
          const cands=Object.entries(pdata.storePerformance)
            .map(([k,p])=>{
              const sc = smartTargetScore(pdata, k, beden, 'depo');
              return [k, Object.assign({}, p, { smartScore:sc.score, smartReason:sc.reason })];
            })
            .filter(([k,p])=>p.smartScore>=45)
            .sort((a,b)=>b[1].smartScore-a[1].smartScore);
          if (cands.length===0) continue;
          for (const [tsk,tp] of cands) {
            if (!storeTrfCount[tsk]) storeTrfCount[tsk]=0;
            if (storeTrfCount[tsk]>=STORE_LIMIT) continue;
            const qty=Math.min(dd.stok,1);
            storeTrfCount[tsk]+=qty;
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
            const guvenEnd_=calculateGuvenEndeksi({
              hedefSatis:tp.satis,kaynakSatis:0,kaynakBeden_satis:0,
              hedefBeden_stok:tpSizeData.stok,hedefBeden_satis:tpSizeData.satis,
              bedenCurve:getBedenCurve(beden,tp.store.key),
              hedefSTR:hedefStr_,bekledigiGun:0,esik:0,
              isDepoTransfer:true,isKirikBeden:false,
            });
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
              neden:ddata.meta.label+' → '+tp.store.label+': Hedefte '+tp.satis+' satış, beden eksik (Güven %'+guvenEnd_+')',
            });
            result.stats.transferableCount++;
            break;
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
    
    // ===== KIRIK BEDEN (v8.1 — Yeni Kurallar) =====
    // 3 size → 1 stoklu = KIRIK
    // 4,5,6+ size → ≤2 stoklu = KIRIK
    // Çanta/Aksesuar/STD → KIRIK DEĞİL

    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      // Çanta/Aksesuar muaf
      if (isKirikMuaf(pdata.meta.anaGrup,pdata.meta.altGrup,'')) continue;

      const hasAnySales=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.satis>0));

      // Tüm üretilen bedenler (STD hariç)
      const tumBedenler=new Set();
      for (const sd of Object.values(pdata.stores)) {
        for (const b of Object.keys(sd.sizes)) {
          if (String(b).toUpperCase()!=='STD') tumBedenler.add(b);
        }
      }
      for (const dd of Object.values(pdata.depots)) {
        for (const b of Object.keys(dd.sizes)) {
          if (String(b).toUpperCase()!=='STD') tumBedenler.add(b);
        }
      }
      const toplamSize=tumBedenler.size;
      const kirikEsik=getKirikThreshold(toplamSize);
      if (kirikEsik===0) continue; // Kırık mümkün değil (≤2 size)

      const dayThreshold=getDayThreshold(pdata.meta.isNewSeason);

      for (const sk of Object.keys(pdata.stores)) {
        const sdata=pdata.stores[sk];

        // Bu mağazada stoklu bedenler (STD hariç)
        const stokluB=[];
        let minGiris=null;
        for (const [b,sd] of Object.entries(sdata.sizes)) {
          if (String(b).toUpperCase()==='STD') continue;
          if (sd.stok>0) {
            stokluB.push(b);
            if (sd.giris&&(!minGiris||sd.giris<minGiris)) minGiris=sd.giris;
          }
        }

        // Stoklu beden sayısı kırık eşiğinde veya altında mı?
        if (stokluB.length===0) continue; // Tamamen tükenmiş
        if (stokluB.length>kirikEsik) continue; // Yeterli beden var, kırık değil

        // Gün eşiği kontrolü
        const days=minGiris?daysSince(minGiris,refDate):0;
        if (days!==null&&days<dayThreshold) continue;
        if (!hasAnySales) continue;

        // HÜLYA v8.4: Kırık bedenleri topluca tek mağazaya yığma.
        // Her kalan beden ayrı değerlendirilir. Gordion'da 36 satış var + stok 0 ise 36 öncelikle Gordion'a gider.
        const byTarget = {};
        for (const kb of stokluB) {
          if (isLocked(pdata, kb)) continue;
          const cands = Object.entries(pdata.storePerformance)
            .filter(([k,p]) => k !== sk)
            .map(([k,p]) => {
              const sc = smartTargetScore(pdata, k, kb, 'kirik');
              return [k, Object.assign({}, p, { smartScore:sc.score, smartReason:sc.reason })];
            })
            .filter(([k,p]) => p.smartScore >= 45)
            .sort((a,b) => b[1].smartScore - a[1].smartScore);
          if (cands.length === 0) continue;
          const [targetKey, targetPerf] = cands[0];
          if (!byTarget[targetKey]) byTarget[targetKey] = { perf:targetPerf, bedenler:[], adet:0, reasons:[] };
          byTarget[targetKey].bedenler.push(kb);
          byTarget[targetKey].adet += (sdata.sizes[kb]?.stok || 0);
          byTarget[targetKey].reasons.push(`${kb}: ${targetPerf.smartReason}`);
          setLocked(pdata, kb);
        }

        for (const targetKey of Object.keys(byTarget)) {
          const grp = byTarget[targetKey];
          const target = grp.perf.store;
          const kHp=pdata.storePerformance[target.key];
          const firstBeden = grp.bedenler[0];
          const kHsize=firstBeden&&kHp&&kHp.sizes?kHp.sizes[firstBeden]:null;
          const kSTR=kHp&&(kHp.stok+kHp.satis>0)?Math.round(kHp.satis/(kHp.stok+kHp.satis)*100):0;
          const guvenK_=calculateGuvenEndeksi({
            hedefSatis:kHp?kHp.satis:0,kaynakSatis:sdata.totalSatis,
            kaynakBeden_satis:0,
            hedefBeden_stok:kHsize?kHsize.stok:0,hedefBeden_satis:kHsize?kHsize.satis:0,
            bedenCurve:getBedenCurve(firstBeden||'',target.key),
            hedefSTR:kSTR,bekledigiGun:days||0,esik:dayThreshold,
            isDepoTransfer:false,isKirikBeden:true,
            stokluBedenSayisi:stokluB.length,toplamBedenSayisi:toplamSize,
          });

          result.kirikBeden.push({
            gonderen:sdata.meta,hedef:target,
            urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
            renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,
            beden:grp.bedenler.join(', '),adet:grp.adet,
            toplamSize,stokluBedenler:stokluB.length,
            bosBeden:toplamSize-stokluB.length,
            kirikEsik,giris:minGiris,days,dayThreshold,
            altGrup:pdata.meta.altGrup,anaGrup:pdata.meta.anaGrup,
            malGrubu:pdata.meta.malGrubu,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
            sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
            takimKod:pdata.meta.takimKod,
            velocityScore:Math.round((grp.perf.velocityScore||0)*100),
            guvenEndeksi:guvenK_,
            confidence:guvenK_,
            neden:`Kırık beden: ${stokluB.length}/${toplamSize} stoklu (eşik:${kirikEsik}) → ${target.label} [${grp.bedenler.join(',')}] · ${grp.reasons.join(' | ')} (Güven %${guvenK_})`,
          });
          result.stats.kirikCount++;
          result.stats.transferableCount++;
        }
      }
    }

    // ===== MAĞAZA → MAĞAZA =====
    const magCands=[];
    for (const pkey of Object.keys(productMap)) {
      const pdata=productMap[pkey];
      const hasAnySales=Object.values(pdata.stores).some(s=>Object.values(s.sizes).some(sd=>sd.satis>0));
      const dayThreshold=getDayThreshold(pdata.meta.isNewSeason);
      const catAvg=getCatAvg(pdata.meta.anaGrup);

      for (const sk of Object.keys(pdata.stores)) {
        const sdata=pdata.stores[sk];
        for (const [beden,sd] of Object.entries(sdata.sizes)) {
          if (sd.stok<=0) continue;
          if (sd.satis>0) continue;   // Satışı var → göndermeyiz
          if (sd.stok===1) continue;  // Tek stok → kırık beden modülüne gider

          if (!sd.giris) continue;
          const days=daysSince(sd.giris,refDate);
          if (days===null||days<dayThreshold) { result.stats.waitingCount++; continue; }
          if (!hasAnySales) { result.stats.waitingCount++; continue; }

          // HÜLYA v8.4: Hedef bu bedene gerçekten ihtiyaç duyuyor mu?
          // Satışsız/kanıtsız hedefe, full asortili hedefe veya tek beden kırık yaratacak hedefe gönderme.
          if (isLocked(pdata, beden)) continue;
          const hedefA=[];
          for (const tsk of Object.keys(pdata.storePerformance)) {
            if (tsk===sk) continue;
            const tp=pdata.storePerformance[tsk];
            const sc=smartTargetScore(pdata, tsk, beden, 'magaza');
            if (sc.score>=50) {
              hedefA.push({
                store:tp.store,velocityScore:tp.velocityScore,
                performance:tp.performance,totalSatis:tp.satis,
                bedenCurve:getBedenCurve(beden,tsk),
                smartScore:sc.score,smartReason:sc.reason,
              });
            }
          }
          if (hedefA.length===0) continue;

          hedefA.sort((a,b)=>b.smartScore-a.smartScore);

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
      // HÜLYA v8.4: aynı SKU+renk+beden tek analizde yalnızca bir kez hareket etsin.
      // Önceki sürüm hedef bazlı grupladığı için aynı beden farklı hedeflere tekrar dağılabiliyordu.
      const key=`${c.pdata.meta.urunKodu}|${c.pdata.meta.renkKodu}|${c.kaynak.beden}`;
      if (!grouped[key]) { grouped[key]=c; continue; }
      const cur=grouped[key];
      const curS=(cur.hedef.smartScore||0)*100 + cur.kaynak.days*10 + (1-cur.kaynak.gondPerf)*50 + cur.kaynak.sdata.rank;
      const newS=(c.hedef.smartScore||0)*100 + c.kaynak.days*10 + (1-c.kaynak.gondPerf)*50 + c.kaynak.sdata.rank;
      if (newS>curS) grouped[key]=c;
    }

    // Mağaza→Mağaza transferleri listeye ekle
    // Sanal stok takibi: transfer sonrası kalan stok
    const virtualStock={};
    for (const c of Object.values(grouped)) {
      const qty=Math.min(c.kaynak.sd.stok,1);
      const vkey=`${c.kaynak.sk}|${c.pdata.meta.urunKodu}|${c.pdata.meta.renkKodu}|${c.kaynak.beden}`;
      if (!virtualStock[vkey]) virtualStock[vkey]={stok:c.kaynak.sd.stok,sent:0};
      virtualStock[vkey].sent+=qty;

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
      if (isLocked(c.pdata, c.kaynak.beden)) continue;
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
      setLocked(c.pdata, c.kaynak.beden);
    }

    // ===== TRANSFER SONRASI KIRIK BEDEN KONTROLÜ =====
    // Mağaza→Mağaza transferi sonrası bir mağazada kırık beden oluştuysa → en iyi mağazaya gönder
    for (const c of Object.values(grouped)) {
      const sk=c.kaynak.sk;
      const pdata=c.pdata;
      const pkey=`${pdata.meta.urunKodu}|${pdata.meta.renkKodu}`;
      if (isKirikMuaf(pdata.meta.anaGrup,pdata.meta.altGrup,'')) continue;

      const sdata=pdata.stores[sk];
      if (!sdata) continue;

      // Transfer sonrası kalan stokları hesapla
      const kalanSizes={};
      for (const [b,sd] of Object.entries(sdata.sizes)) {
        const vkey=`${sk}|${pdata.meta.urunKodu}|${pdata.meta.renkKodu}|${b}`;
        const sent=(virtualStock[vkey]?.sent||0);
        const kalan=sd.stok-sent;
        if (kalan>0) kalanSizes[b]=kalan;
      }

      const tumBedenler=new Set();
      for (const sd2 of Object.values(pdata.stores)) for (const b of Object.keys(sd2.sizes)) if (String(b).toUpperCase()!=='STD') tumBedenler.add(b);
      const toplamSize=tumBedenler.size;
      const kirikEsik=getKirikThreshold(toplamSize);
      if (kirikEsik===0) continue;

      const stokluB=Object.keys(kalanSizes);
      if (stokluB.length===0||stokluB.length>kirikEsik) continue;

      // Transfer sonrası kırık oluştu → ekstra transfer öner
      const cands2=Object.entries(pdata.storePerformance)
        .filter(([k,p])=>k!==sk&&p.satis>0)
        .sort((a,b)=>b[1].velocityScore-a[1].velocityScore);
      if (cands2.length===0) continue;

      const target2=cands2[0][1].store;
      const adet2=stokluB.reduce((s,b)=>s+(kalanSizes[b]||0),0);

      // Daha önce aynı kırık beden eklenmemiş mi kontrol et
      const zatenVar=result.kirikBeden.find(k=>
        k.urunKodu===pdata.meta.urunKodu&&k.renkKodu===pdata.meta.renkKodu&&k.gonderen.key===sk
      );
      if (!zatenVar&&adet2>0) {
        result.kirikBeden.push({
          gonderen:sdata.meta,hedef:target2,
          urunKodu:pdata.meta.urunKodu,urunAdi:pdata.meta.urunAdi,
          renk:pdata.meta.renk,renkKodu:pdata.meta.renkKodu,
          beden:stokluB.join(', '),adet:adet2,
          toplamSize,stokluBedenler:stokluB.length,
          bosBeden:toplamSize-stokluB.length,kirikEsik,
          altGrup:pdata.meta.altGrup,anaGrup:pdata.meta.anaGrup,
          malGrubu:pdata.meta.malGrubu,sezonTipi:pdata.meta.isNewSeason?'YENI':'VIRMAN',
          sezonDurum:pdata.meta.sezonDurum,takimDurumu:pdata.meta.takimDurumu,
          takimKod:pdata.meta.takimKod,
          velocityScore:Math.round(cands2[0][1].velocityScore*100),
          neden:`⚡ Transfer sonrası kırık: ${stokluB.length}/${toplamSize} beden kaldı → ${target2.label}`,
          postTransfer:true,
        });
        result.stats.kirikCount++;
        result.stats.transferableCount++;
      }
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
    
    var r = analyze(raw, dataObj.takimMap || {}, { newSeasonPrefix: prefix });
    
    dataObj.lastAnalysis = r;
    dataObj.lastAnalysisDate = new Date();
    
    console.log('runAnalysis: analiz bitti, depo=' + r.depoTransfers.length + ' mag=' + r.magTransfers.length);
    return r;
  }

  return {
    analyze,runAnalysis,STORES,CENTRAL_DEPOTS,matchStore,matchCentral,
    isNewSeason,parseDate,isErrorDate,isOnTheWay,daysSince,
    calculatePerformance,calcVelocity,getCategory,getBedenCurve,
    getKirikThreshold,isKirikMuaf,
    SIZE_CURVE_NUMERIC,SIZE_CURVE_SML,
    VERSION:'v8.1',
    THRESHOLDS:{NEW_SEASON:NEW_SEASON_DAY_THRESHOLD,VIRMAN:VIRMAN_DAY_THRESHOLD,STORE_LIMIT},
  };
})();

// Global erişim için window objesine ekle
if (typeof window !== "undefined") window.ALGO = ALGO;
