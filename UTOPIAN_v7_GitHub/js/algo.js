// ============================================================
// UTOPIAN TRANSFER v7.2 — ALGORİTMA MODÜLÜ
// SEZON BAZLI Dağıtım Motoru
//
// KURALLAR:
//   1) Yeni Sezon (Y26):  Mağaza giriş 15+ gün, satış yok → transfer
//   2) Virman (Y26 dışı): Mağaza giriş 30+ gün, satış yok → transfer
//   3) Diğer mağazalarda satışı varsa → en iyi performansa gönder
//   4) Hiç satan yoksa → bekle
//   5) Sadece Depo Kodu üzerinden mağaza eşleştir (Mağaza Kodu kullanma)
// ============================================================

const ALGO = (function() {

  // ========== KONFİGÜRASYON ==========

  // Mağaza sıralaması — YTD satışa göre
  const STORES = [
    { code: 'M22', depoCode: 'M22',     key: 'IZMIR',   label: 'İzmir',                rank: 1, patterns: ['M22', 'İZMİR', 'IZMIR', 'MAVİBAHÇE'] },
    { code: 'M21', depoCode: '1-M21-0', key: 'GORDION', label: 'Gordion',              rank: 2, patterns: ['M21', '1-M21-0', 'GORDION', 'GORDİON'] },
    { code: 'M24', depoCode: 'D24',     key: 'PANORA',  label: 'Panora',               rank: 3, patterns: ['M24', 'D24', 'PANORA'] },
    { code: 'M17', depoCode: 'D17',     key: 'MOI',     label: 'MOİ',                  rank: 4, patterns: ['M17', 'D17', 'MOİ', 'MOI', 'MALL OF'] },
    { code: 'M11', depoCode: 'D11',     key: 'BURSA',   label: 'Bursa',                rank: 5, patterns: ['M11', 'D11', 'BURSA'] },
    { code: 'M10', depoCode: 'U10',     key: 'NEXT',    label: 'Next Level Utopian',   rank: 6, patterns: ['M10', 'U10', 'NEXT LEVEL', 'ANKARA UTOPIAN NEXT'] },
    { code: 'M25', depoCode: 'EMR',     key: 'EMAAR',   label: 'Emaar',                rank: 7, patterns: ['M25', 'EMR', 'EMAAR'] },
  ];

  const CENTRAL_DEPOTS = [
    { code: '1-0-7',  key: 'MERKEZ',   label: 'Merkez Depo', priority: 1, patterns: ['1-0-7', 'UTOPIAN MERKEZ', 'MERKEZ DEPO'] },
    { code: 'bk.shw', key: 'SHOWROOM', label: 'Showroom',    priority: 2, patterns: ['bk.shw', 'SHOWROOM'] },
  ];

  const NEW_SEASON_PREFIXES = ['Y26S', 'Y26'];
  const VIRMAN_BASE_DATE = new Date(2026, 1, 16);
  const ERROR_DATE_YEAR = 1900;

  // ANA KURAL: SEZON BAZLI GÜN EŞİĞİ
  //   Yeni Sezon (Y26 ile başlayan):  15 gün
  //   Virman (Y26 dışındaki tüm ürünler): 30 gün
  const NEW_SEASON_DAY_THRESHOLD = 15;  // Yeni sezon
  const VIRMAN_DAY_THRESHOLD = 30;       // Virman/eski sezon
  
  // Geriye dönük uyumluluk için
  const TRANSFER_DAY_THRESHOLD = 15;
  
  const KIRIK_THRESHOLD = 1;
  
  // Sezona göre eşik döner
  function getDayThreshold(isNewSeason) {
    return isNewSeason ? NEW_SEASON_DAY_THRESHOLD : VIRMAN_DAY_THRESHOLD;
  }

  // ========== YARDIMCI FONKSİYONLAR ==========

  // Mağaza eşleştirme: SADECE Depo Kodu üzerinden
  // (Mağaza Kodu kolonu kullanılmaz — Romina'nın isteği)
  function matchStore(depoAdi, depoKodu) {
    const dk = String(depoKodu || '').toUpperCase().trim();
    const adi = String(depoAdi || '').toUpperCase();
    
    // Depo kodu tam eşleşme (öncelik)
    for (const store of STORES) {
      if (dk && dk === store.depoCode.toUpperCase()) return store;
    }
    
    // Pattern eşleşmesi (depo adı içinde)
    for (const store of STORES) {
      for (const p of store.patterns) {
        if (adi.includes(p.toUpperCase())) return store;
      }
    }
    return null;
  }

  function matchCentral(depoAdi, depoKodu) {
    const adi = String(depoAdi || '').toUpperCase();
    const kod = String(depoKodu || '').toUpperCase().trim();
    for (const dep of CENTRAL_DEPOTS) {
      for (const p of dep.patterns) {
        if (kod === p.toUpperCase() || adi.includes(p.toUpperCase())) {
          return dep;
        }
      }
    }
    return null;
  }

  function isNewSeason(productCode) {
    const code = String(productCode || '').toUpperCase().trim();
    return NEW_SEASON_PREFIXES.some(prefix => code.startsWith(prefix));
  }

  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'number' && v > 25569) {
      return new Date((v - 25569) * 86400 * 1000);
    }
    const s = String(v).trim();
    if (!s || s === '0' || s.toLowerCase() === 'nat') return null;
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    const trMatch = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (trMatch) return new Date(parseInt(trMatch[3]), parseInt(trMatch[2]) - 1, parseInt(trMatch[1]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function isErrorDate(date) {
    const d = parseDate(date);
    if (!d) return true;
    return d.getFullYear() === ERROR_DATE_YEAR;
  }

  function daysSince(date, referenceDate) {
    if (!date) return null;
    const ref = referenceDate || new Date();
    return Math.floor((ref - date) / (1000 * 60 * 60 * 24));
  }

  function calculatePerformance(satis, stok) {
    if (satis + stok === 0) return 0;
    return satis / (satis + stok);
  }

  function getCategory(altGrup, anaGrup) {
    const a = String(altGrup || '').toUpperCase().trim();
    const n = String(anaGrup || '').toUpperCase().trim();
    
    const accessories = ['KÜPE', 'BİLEKLİK', 'KOLYE', 'YÜZÜK', 'BROŞ', 'TOKA', 'TAÇ', 'FULAR', 'ŞAL', 'ATKI-ŞAL', 'BERE', 'ŞAPKA', 'ELDİVEN', 'AKSESUAR'];
    const shoes = ['AYAKKABI', 'BOT', 'ÇİZME', 'SNEAKER', 'SANDALET', 'LOAFER', 'TOPUKLU AYAKKABI'];
    const outerwear = ['DIŞ GİYİM', 'KABAN', 'MONT', 'DERİ MONT', 'TRENÇKOT', 'MANTO', 'KÜRK', 'DERİ KABAN', 'YAĞMURLUK-RÜZGARLIK'];
    
    if (accessories.includes(n) || accessories.includes(a)) return { code: 'AKSESUAR', label: 'Aksesuar', cls: 'ct-a' };
    if (shoes.includes(n) || shoes.includes(a)) return { code: 'AYAKKABI', label: 'Ayakkabı', cls: 'ct-y' };
    if (n === 'ÇANTA' || a === 'ÇANTA') return { code: 'ÇANTA', label: 'Çanta', cls: 'ct-c' };
    if (n === 'KEMER' || a === 'KEMER') return { code: 'KEMER', label: 'Kemer', cls: 'ct-k' };
    if (outerwear.includes(a) || outerwear.includes(n)) return { code: 'DIŞ GİYİM', label: 'Dış Giyim', cls: 'ct-d' };
    return { code: 'TEKSTİL', label: 'Tekstil', cls: 'ct-t' };
  }

  // ========== ANA ANALİZ ==========

  function analyze(rawData, takimMap, options) {
    options = options || {};
    const refDate = options.refDate || new Date();
    
    const result = {
      depoTransfers: [],
      magTransfers: [],
      kirikBeden: [],
      bekleyen: [],
      hataliTarih: [],
      envanterOzet: [],
      stats: {
        totalRows: rawData.length,
        merkezStok: 0,
        yeniSezonAdet: 0,
        virmanAdet: 0,
        transferableCount: 0,
        waitingCount: 0,
      }
    };

    const productMap = {};

    for (const row of rawData) {
      const central = matchCentral(row.depoAdi, row.depoKodu);
      const store = matchStore(row.depoAdi, row.depoKodu);
      
      if (!central && !store) continue;
      
      const productKey = row.urunKodu + '|||' + row.renkAciklamasi;
      const newSeason = isNewSeason(row.urunKodu);
      const giris = parseDate(row.magazayaGirisTarihi);
      const isError = isErrorDate(row.magazayaGirisTarihi);
      const takimInfo = takimMap[row.urunKodu] || null;
      
      if (isError && store && (row.toplamEnvanter > 0 || row.toplamSatisMiktari > 0)) {
        result.hataliTarih.push({
          depo: row.depoAdi,
          urunKodu: row.urunKodu,
          urunAdi: row.urunAdi,
          renk: row.renkAciklamasi,
          beden: row.beden,
          tarih: '1.1.1900',
          stok: row.toplamEnvanter,
          satis: row.toplamSatisMiktari,
          sebep: 'Mağaza giriş tarihi hatalı (1.1.1900) — Nebim kayıt sorunu, transfer dahil edilmedi'
        });
        continue;
      }
      
      if (!productMap[productKey]) {
        productMap[productKey] = {
          meta: {
            urunKodu: row.urunKodu,
            urunAdi: row.urunAdi,
            renk: row.renkAciklamasi,
            altGrup: row.altGrupAciklama || '',
            anaGrup: row.anaGrup || '',
            sezonKodu: row.sezonuKodu || '',
            sezonAciklama: row.sezonuAciklama || '',
            kategori: getCategory(row.altGrupAciklama, row.anaGrup),
            isNewSeason: newSeason,
            sezonTipi: newSeason ? 'YENI' : 'VIRMAN',
            takimDurumu: (takimInfo && takimInfo.takimDurumu) || 'Bilinmiyor',
            takimKod: (takimInfo && takimInfo.takimKod) || '',
            malGrubu: (takimInfo && takimInfo.malGrubu) || row.malGrubu || '',
          },
          depots: {},
          stores: {},
        };
      }
      
      const pdata = productMap[productKey];
      const sizeKey = String(row.beden || 'STD').trim();
      
      if (central) {
        if (!pdata.depots[central.key]) pdata.depots[central.key] = { meta: central, sizes: {} };
        if (!pdata.depots[central.key].sizes[sizeKey]) pdata.depots[central.key].sizes[sizeKey] = 0;
        pdata.depots[central.key].sizes[sizeKey] += row.toplamEnvanter || 0;
        result.stats.merkezStok += row.toplamEnvanter || 0;
      }
      
      if (store) {
        if (!pdata.stores[store.key]) pdata.stores[store.key] = { meta: store, sizes: {} };
        if (!pdata.stores[store.key].sizes[sizeKey]) {
          pdata.stores[store.key].sizes[sizeKey] = { stok: 0, satis: 0, giris: null };
        }
        const sd = pdata.stores[store.key].sizes[sizeKey];
        sd.stok += row.toplamEnvanter || 0;
        sd.satis += row.toplamSatisMiktari || 0;
        if (giris && (!sd.giris || giris < sd.giris)) sd.giris = giris;
      }
    }

    // Performans özeti
    for (const pkey of Object.keys(productMap)) {
      const pdata = productMap[pkey];
      const storePerformance = {};
      for (const storeKey of Object.keys(pdata.stores)) {
        const sdata = pdata.stores[storeKey];
        let totalSatis = 0, totalStok = 0;
        for (const sd of Object.values(sdata.sizes)) {
          totalSatis += sd.satis;
          totalStok += sd.stok;
        }
        storePerformance[storeKey] = {
          store: sdata.meta,
          satis: totalSatis,
          stok: totalStok,
          performance: calculatePerformance(totalSatis, totalStok),
          sizes: sdata.sizes,
        };
      }
      pdata.storePerformance = storePerformance;
      
      const totalDepoStock = Object.values(pdata.depots)
        .reduce((sum, d) => sum + Object.values(d.sizes).reduce((s, q) => s + q, 0), 0);
      if (pdata.meta.isNewSeason) result.stats.yeniSezonAdet += totalDepoStock;
      else result.stats.virmanAdet += totalDepoStock;
    }

    // BEKLEYEN ÜRÜNLER
    for (const pkey of Object.keys(productMap)) {
      const pdata = productMap[pkey];
      const totalDepoStock = Object.values(pdata.depots)
        .reduce((sum, d) => sum + Object.values(d.sizes).reduce((s, q) => s + q, 0), 0);
      if (totalDepoStock === 0) continue;
      
      const anyStoreActivity = Object.values(pdata.stores)
        .some(s => Object.values(s.sizes).some(sd => sd.satis > 0 || sd.stok > 0));
      
      if (!anyStoreActivity) {
        const allSizes = {};
        for (const dep of Object.values(pdata.depots)) {
          for (const [b, q] of Object.entries(dep.sizes)) {
            allSizes[b] = (allSizes[b] || 0) + q;
          }
        }
        const bedenSayisi = Object.keys(allSizes).filter(b => allSizes[b] > 0).length;
        const bedenList = Object.entries(allSizes)
          .filter(([b, q]) => q > 0)
          .map(([b, q]) => b + '(' + q + ')')
          .join(', ');
        
        result.bekleyen.push({
          urunKodu: pdata.meta.urunKodu,
          urunAdi: pdata.meta.urunAdi,
          renk: pdata.meta.renk,
          altGrup: pdata.meta.altGrup,
          kategori: pdata.meta.kategori,
          sezonTipi: pdata.meta.sezonTipi,
          bedenSayisi,
          toplamAdet: totalDepoStock,
          bedenler: bedenList,
          durum: bedenSayisi <= 2 ? 'Kırık Beden' : 'Tam Seri',
        });
      }
    }

    // KIRIK BEDEN
    // Yeni Sezon: 15+ gün, Virman: 30+ gün
    for (const pkey of Object.keys(productMap)) {
      const pdata = productMap[pkey];
      const hasAnySales = Object.values(pdata.stores)
        .some(s => Object.values(s.sizes).some(sd => sd.satis > 0));
      
      // Bu ürünün eşiği (sezona göre)
      const dayThreshold = getDayThreshold(pdata.meta.isNewSeason);
      
      for (const storeKey of Object.keys(pdata.stores)) {
        const sdata = pdata.stores[storeKey];
        for (const [beden, sd] of Object.entries(sdata.sizes)) {
          if (sd.stok !== KIRIK_THRESHOLD || sd.satis !== 0) continue;
          
          const days = sd.giris ? daysSince(sd.giris, refDate) : null;
          if (days === null || days < dayThreshold) continue;
          if (!hasAnySales) continue;
          
          const candidates = Object.entries(pdata.storePerformance)
            .filter(([k, p]) => k !== storeKey && p.satis > 0)
            .sort((a, b) => b[1].performance - a[1].performance);
          
          if (candidates.length > 0) {
            const target = candidates[0][1].store;
            result.kirikBeden.push({
              gonderen: sdata.meta,
              hedef: target,
              urunKodu: pdata.meta.urunKodu,
              urunAdi: pdata.meta.urunAdi,
              renk: pdata.meta.renk,
              beden,
              adet: 1,
              giris: sd.giris,
              days,
              dayThreshold,
              altGrup: pdata.meta.altGrup,
              sezonTipi: pdata.meta.sezonTipi,
              neden: 'Kırık beden (1 ad, ' + days + ' gün, eşik:' + dayThreshold + ') → ' + target.label + ' (perf: %' + Math.round(candidates[0][1].performance * 100) + ')',
            });
            result.stats.transferableCount++;
          }
        }
      }
    }

    // DEPO → MAĞAZA
    const sortedProducts = Object.entries(productMap).sort((a, b) => {
      const aNew = a[1].meta.isNewSeason ? 0 : 1;
      const bNew = b[1].meta.isNewSeason ? 0 : 1;
      return aNew - bNew;
    });
    
    const globalLoad = {};
    STORES.forEach(s => globalLoad[s.key] = 0);
    
    for (const [pkey, pdata] of sortedProducts) {
      const depoStock = {};
      for (const dep of Object.values(pdata.depots)) {
        for (const [b, q] of Object.entries(dep.sizes)) {
          depoStock[b] = (depoStock[b] || 0) + q;
        }
      }
      const totalDepoStock = Object.values(depoStock).reduce((a, b) => a + b, 0);
      if (totalDepoStock === 0) continue;
      
      const storesWithSales = Object.values(pdata.storePerformance)
        .filter(p => p.satis > 0)
        .sort((a, b) => b.performance - a.performance);
      
      if (storesWithSales.length === 0) continue;
      
      for (const [beden, depoQty] of Object.entries(depoStock)) {
        if (depoQty <= 0) continue;
        
        const needs = [];
        for (const sp of storesWithSales) {
          const sd = sp.sizes[beden];
          if (!sd || sd.stok === 0) {
            needs.push({
              store: sp.store,
              performance: sp.performance,
              totalSatis: sp.satis,
              totalStok: sp.stok,
            });
          }
        }
        
        if (needs.length === 0) continue;
        
        needs.sort((a, b) => {
          if (Math.abs(b.performance - a.performance) > 0.05) return b.performance - a.performance;
          return globalLoad[a.store.key] - globalLoad[b.store.key];
        });
        
        let remaining = depoQty;
        const distrib = [];
        for (const n of needs) {
          if (remaining <= 0) break;
          if (globalLoad[n.store.key] >= 50) continue;
          const give = Math.min(remaining, 1);
          distrib.push({
            store: n.store,
            qty: give,
            performance: n.performance,
            totalSatis: n.totalSatis,
            totalStok: n.totalStok,
          });
          remaining -= give;
          globalLoad[n.store.key] += give;
        }
        
        if (distrib.length === 0) continue;
        
        const storeStatus = STORES.map(s => {
          const sp = pdata.storePerformance[s.key];
          if (!sp) return null;
          const sd = sp.sizes[beden];
          return {
            store: s,
            stok: sd ? sd.stok : 0,
            satis: sd ? sd.satis : 0,
            totalPerf: sp.performance,
          };
        }).filter(Boolean);
        
        result.depoTransfers.push({
          sezonTipi: pdata.meta.sezonTipi,
          kategori: pdata.meta.kategori,
          altGrup: pdata.meta.altGrup,
          urunKodu: pdata.meta.urunKodu,
          urunAdi: pdata.meta.urunAdi,
          renk: pdata.meta.renk,
          beden,
          depoStok: depoQty,
          distrib,
          storeStatus,
          takimDurumu: pdata.meta.takimDurumu,
          takimKod: pdata.meta.takimKod,
          neden: distrib.length > 0
            ? 'En iyi perf: ' + distrib[0].store.label + ' (%' + Math.round(distrib[0].performance * 100) + ')'
            : 'Beden tamamlama',
          confidence: distrib[0] ? Math.round(distrib[0].performance * 100) : 0,
        });
      }
    }

    // ========== MAĞAZA → MAĞAZA (SEZON BAZLI: Y26=15 gün, Virman=30 gün) ==========
    for (const pkey of Object.keys(productMap)) {
      const pdata = productMap[pkey];
      const hasAnySales = Object.values(pdata.stores)
        .some(s => Object.values(s.sizes).some(sd => sd.satis > 0));
      
      // Bu ürünün eşiği (sezona göre)
      const dayThreshold = getDayThreshold(pdata.meta.isNewSeason);
      
      for (const storeKey of Object.keys(pdata.stores)) {
        const sdata = pdata.stores[storeKey];
        for (const [beden, sd] of Object.entries(sdata.sizes)) {
          if (sd.stok <= 0) continue;
          if (sd.satis > 0) continue;        // Bu beden satıyor → kalsın
          if (sd.stok === 1) continue;       // Kırık beden zaten işlendi
          
          // SEZON BAZLI EŞİK
          if (!sd.giris) continue;
          const days = daysSince(sd.giris, refDate);
          if (days === null || days < dayThreshold) {
            result.stats.waitingCount++;
            continue;
          }
          
          // Hiç satan yoksa beklet
          if (!hasAnySales) {
            result.stats.waitingCount++;
            continue;
          }
          
          // Hedef: bu üründe satış yapan + bu bedeni eksik mağazalar
          const hedefAdaylari = [];
          for (const tStoreKey of Object.keys(pdata.storePerformance)) {
            if (tStoreKey === storeKey) continue;
            const tp = pdata.storePerformance[tStoreKey];
            if (tp.satis === 0) continue;
            const td = tp.sizes[beden];
            if (!td || td.stok === 0) {
              hedefAdaylari.push({
                store: tp.store,
                performance: tp.performance,
                totalSatis: tp.satis,
              });
            }
          }
          
          if (hedefAdaylari.length === 0) continue;
          
          hedefAdaylari.sort((a, b) => {
            if (Math.abs(b.performance - a.performance) > 0.05) return b.performance - a.performance;
            if (b.totalSatis !== a.totalSatis) return b.totalSatis - a.totalSatis;
            return a.store.rank - b.store.rank;
          });
          
          const hedef = hedefAdaylari[0];
          const transferQty = Math.min(sd.stok, 1);
          
          result.magTransfers.push({
            sezonTipi: pdata.meta.sezonTipi,
            kategori: pdata.meta.kategori,
            gonderen: sdata.meta,
            hedef: hedef.store,
            altGrup: pdata.meta.altGrup,
            urunKodu: pdata.meta.urunKodu,
            urunAdi: pdata.meta.urunAdi,
            renk: pdata.meta.renk,
            beden,
            adet: transferQty,
            giris: sd.giris,
            days,
            dayThreshold,
            takimDurumu: pdata.meta.takimDurumu,
            neden: days + ' gün satışsız (eşik: ' + dayThreshold + ' gün) → ' + hedef.store.label + ' (perf: %' + Math.round(hedef.performance * 100) + ')',
            confidence: Math.round(hedef.performance * 100),
          });
          
          result.stats.transferableCount++;
        }
      }
    }

    // ENVANTER ÖZETİ
    for (const store of STORES) {
      let totalStok = 0, totalSatis = 0, eksikBeden = 0;
      
      for (const pdata of Object.values(productMap)) {
        const sp = pdata.storePerformance[store.key];
        if (!sp) continue;
        totalStok += sp.stok;
        totalSatis += sp.satis;
        if (sp.satis > 0) {
          for (const sd of Object.values(sp.sizes)) {
            if (sd.satis > 0 && sd.stok === 0) eksikBeden++;
          }
        }
      }
      
      const performance = calculatePerformance(totalSatis, totalStok);
      const depoGelen = result.depoTransfers
        .reduce((sum, t) => sum + t.distrib.filter(d => d.store.key === store.key).reduce((s, d) => s + d.qty, 0), 0);
      const magGelen = result.magTransfers.filter(t => t.hedef.key === store.key).reduce((s, t) => s + t.adet, 0)
        + result.kirikBeden.filter(t => t.hedef.key === store.key).reduce((s, t) => s + t.adet, 0);
      const giden = result.magTransfers.filter(t => t.gonderen.key === store.key).reduce((s, t) => s + t.adet, 0)
        + result.kirikBeden.filter(t => t.gonderen.key === store.key).reduce((s, t) => s + t.adet, 0);
      
      result.envanterOzet.push({
        store,
        totalStok,
        totalSatis,
        performance,
        eksikBeden,
        depoGelen,
        magGelen,
        giden,
        net: depoGelen + magGelen - giden,
      });
    }

    return result;
  }

  return {
    STORES,
    CENTRAL_DEPOTS,
    NEW_SEASON_PREFIXES,
    VIRMAN_BASE_DATE,
    NEW_SEASON_DAY_THRESHOLD,
    VIRMAN_DAY_THRESHOLD,
    TRANSFER_DAY_THRESHOLD,
    
    analyze,
    matchStore,
    matchCentral,
    isNewSeason,
    isErrorDate,
    parseDate,
    daysSince,
    calculatePerformance,
    getCategory,
    getDayThreshold,
    
    runAnalysis() {
      if (!DATA.rawData || DATA.rawData.length === 0) {
        alert('Önce Nebim datasını yükleyin');
        return;
      }
      UI.showLoading('Analiz yapılıyor...');
      setTimeout(() => {
        try {
          const r = analyze(DATA.rawData, DATA.takimMap);
          DATA.lastAnalysis = r;
          DATA.lastAnalysisDate = new Date();
          UI.showResults(r);
          if (typeof HISTORY !== 'undefined') HISTORY.saveCurrent(r);
        } catch (e) {
          alert('Hata: ' + e.message);
          console.error(e);
        } finally {
          UI.hideLoading();
        }
      }, 100);
    }
  };
})();
