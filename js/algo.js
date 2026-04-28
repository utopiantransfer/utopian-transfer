// ============================================================
// UTOPIAN TRANSFER v8.0 — ALGORİTMA MODÜLÜ
// Revizyonlar:
//  - Kırık beden KEY: Depo Kodu & Ürün Kodu & Renk
//  - Kırık beden: lokasyon bazlı, stok > 0 olan beden adedi 1 ise ve ürün-renk toplam üretim bedeni >= 3 ise kırık
//  - Ürün değerlendirme KEY: Ürün Kodu & Renk
//  - Mal Grubu / Ana Grup / Alt Grup / Takım Bilgisi / Takım Kodu tablolarda taşınır
// ============================================================

const ALGO = (function() {
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
    { code: '1-0-7',  key: 'MERKEZ',   label: 'Merkez Depo', priority: 1, patterns: ['1-0-7', 'UTOPIAN MERKEZ', 'MERKEZ DEPO', '1UTOPIAN'] },
    { code: 'bk.shw', key: 'SHOWROOM', label: 'Showroom',    priority: 2, patterns: ['bk.shw', 'SHOWROOM'] },
  ];

  const NEW_SEASON_PREFIXES = ['Y26S', 'Y26'];
  const NEW_SEASON_DAY_THRESHOLD = 15;
  const VIRMAN_DAY_THRESHOLD = 30;
  const TRANSFER_DAY_THRESHOLD = NEW_SEASON_DAY_THRESHOLD;
  const ERROR_DATE_YEAR = 1900;

  function norm(v) { return String(v ?? '').trim(); }
  function upper(v) { return norm(v).toLocaleUpperCase('tr-TR'); }
  function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function locKey(depoKodu, fallbackKey) { return upper(depoKodu) || fallbackKey || 'LOKASYON'; }

  function matchStore(depoAdi, depoKodu) {
    const dk = upper(depoKodu);
    const adi = upper(depoAdi);
    for (const store of STORES) if (dk && dk === upper(store.depoCode)) return store;
    for (const store of STORES) for (const p of store.patterns) if (adi.includes(upper(p)) || dk.includes(upper(p))) return store;
    return null;
  }

  function matchCentral(depoAdi, depoKodu) {
    const adi = upper(depoAdi);
    const kod = upper(depoKodu);
    for (const dep of CENTRAL_DEPOTS) {
      for (const p of dep.patterns) if (kod === upper(p) || kod.includes(upper(p)) || adi.includes(upper(p))) return dep;
    }
    return null;
  }

  function isNewSeason(productCode) {
    const code = upper(productCode);
    return NEW_SEASON_PREFIXES.some(prefix => code.startsWith(prefix));
  }

  function getDayThreshold(isNew) { return isNew ? NEW_SEASON_DAY_THRESHOLD : VIRMAN_DAY_THRESHOLD; }

  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'number' && v > 25569) return new Date((v - 25569) * 86400 * 1000);
    const s = norm(v);
    if (!s || s === '0' || s.toLowerCase() === 'nat') return null;
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
    const tr = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (tr) return new Date(+tr[3], +tr[2] - 1, +tr[1]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function isErrorDate(date) {
    const d = parseDate(date);
    if (!d) return true;
    return d.getFullYear() === ERROR_DATE_YEAR;
  }

  function daysSince(date, referenceDate) {
    const d = parseDate(date);
    if (!d) return null;
    const ref = referenceDate || new Date();
    return Math.floor((ref - d) / 86400000);
  }

  function calculatePerformance(satis, stok) {
    const total = safeNum(satis) + safeNum(stok);
    return total === 0 ? 0 : safeNum(satis) / total;
  }

  function getCategory(altGrup, anaGrup, malGrubu) {
    const a = upper(altGrup);
    const n = upper(anaGrup);
    const m = upper(malGrubu);
    const combined = `${m} ${n} ${a}`;
    const accessories = ['KÜPE', 'BİLEKLİK', 'KOLYE', 'YÜZÜK', 'BROŞ', 'TOKA', 'TAÇ', 'FULAR', 'ŞAL', 'ATKI', 'BERE', 'ŞAPKA', 'ELDİVEN', 'AKSESUAR'];
    const shoes = ['AYAKKABI', 'BOT', 'ÇİZME', 'SNEAKER', 'SANDALET', 'LOAFER', 'TERLİK'];
    const bags = ['ÇANTA', 'CANTA'];
    const outerwear = ['DIŞ GİYİM', 'DIS GIYIM', 'KABAN', 'MONT', 'DERİ MONT', 'TRENÇKOT', 'MANTO', 'KÜRK', 'YAĞMURLUK'];
    if (bags.some(x => combined.includes(x))) return { code: 'ÇANTA', label: 'Çanta', cls: 'ct-c', bucket: 'CANTA' };
    if (shoes.some(x => combined.includes(x))) return { code: 'AYAKKABI', label: 'Ayakkabı', cls: 'ct-y', bucket: 'AYAKKABI' };
    if (accessories.some(x => combined.includes(x))) return { code: 'AKSESUAR', label: 'Aksesuar', cls: 'ct-a', bucket: 'AKSESUAR' };
    if (outerwear.some(x => combined.includes(x))) return { code: 'DIŞ GİYİM', label: 'Dış Giyim', cls: 'ct-d', bucket: 'TEKSTIL_DIS' };
    return { code: 'TEKSTİL', label: 'Tekstil', cls: 'ct-t', bucket: 'TEKSTIL_DIS' };
  }

  function normalizeTakim(v) {
    const u = upper(v);
    if (u.includes('TAKIM') && !u.includes('DEĞİL') && !u.includes('DEGIL')) return 'TAKIM';
    return 'TEK';
  }

  function getMetaFromRow(row, takimInfo) {
    const malGrubu = norm((takimInfo && takimInfo.malGrubu) || row.malGrubu || '');
    const anaGrup = norm(row.anaGrup || (takimInfo && takimInfo.anaGrup) || '');
    const altGrup = norm(row.altGrupAciklama || (takimInfo && takimInfo.altGrupAciklama) || '');
    const newSeason = isNewSeason(row.urunKodu || row.sezonuKodu);
    return {
      urunKodu: norm(row.urunKodu),
      urunAdi: norm(row.urunAdi),
      renk: norm(row.renkAciklamasi || 'STD'),
      malGrubu,
      anaGrup,
      altGrup,
      sezonKodu: norm(row.sezonuKodu),
      sezonAciklama: norm(row.sezonuAciklama),
      kategori: getCategory(altGrup, anaGrup, malGrubu),
      isNewSeason: newSeason,
      sezonTipi: newSeason ? 'YENI' : 'VIRMAN',
      takimDurumu: normalizeTakim((takimInfo && takimInfo.takimDurumu) || row.takimDurumu || ''),
      takimKod: norm((takimInfo && takimInfo.takimKod) || row.takimKod || ''),
    };
  }

  function sizeListFromLocations(pdata) {
    const s = new Set();
    for (const loc of [...Object.values(pdata.depots), ...Object.values(pdata.stores)]) {
      for (const [beden, rec] of Object.entries(loc.sizes)) {
        const stok = typeof rec === 'number' ? rec : rec.stok;
        const satis = typeof rec === 'number' ? 0 : rec.satis;
        if (stok > 0 || satis > 0) s.add(beden);
      }
    }
    return [...s].sort((a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true }));
  }

  function availableSizeList(location) {
    return Object.entries(location.sizes)
      .filter(([_, rec]) => (typeof rec === 'number' ? rec : rec.stok) > 0)
      .map(([beden]) => beden)
      .sort((a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true }));
  }

  function addLocationSize(target, locationMeta, sizeKey, stok, satis, giris, depoKodu, depoAdi) {
    if (!target[locationMeta.key]) target[locationMeta.key] = { meta: locationMeta, depoKodu: norm(depoKodu), depoAdi: norm(depoAdi), sizes: {} };
    if (!target[locationMeta.key].sizes[sizeKey]) target[locationMeta.key].sizes[sizeKey] = { stok: 0, satis: 0, giris: null };
    const sd = target[locationMeta.key].sizes[sizeKey];
    sd.stok += safeNum(stok);
    sd.satis += safeNum(satis);
    const gd = parseDate(giris);
    if (gd && (!sd.giris || gd < sd.giris)) sd.giris = gd;
  }

  function findBestStoreForProduct(pdata, excludeKey, beden) {
    const candidates = Object.entries(pdata.storePerformance || {})
      .filter(([key, p]) => key !== excludeKey && p.satis > 0)
      .filter(([_, p]) => !beden || !p.sizes[beden] || p.sizes[beden].stok === 0)
      .sort((a, b) => {
        if (Math.abs(b[1].performance - a[1].performance) > 0.05) return b[1].performance - a[1].performance;
        if (b[1].satis !== a[1].satis) return b[1].satis - a[1].satis;
        return a[1].store.rank - b[1].store.rank;
      });
    return candidates[0] ? candidates[0][1] : null;
  }

  function analyze(rawData, takimMap, options) {
    options = options || {};
    const refDate = options.refDate || new Date();
    const result = {
      depoTransfers: [], magTransfers: [], kirikBeden: [], bekleyen: [], hataliTarih: [], envanterOzet: [],
      categoryOzet: { TEKSTIL_DIS: 0, CANTA: 0, AYAKKABI: 0, AKSESUAR: 0 },
      seasonSenderOzet: {},
      stats: { totalRows: rawData.length, merkezStok: 0, yeniSezonAdet: 0, virmanAdet: 0, transferableCount: 0, waitingCount: 0 }
    };

    const productMap = {};

    for (const row of rawData) {
      const central = matchCentral(row.depoAdi, row.depoKodu);
      const store = matchStore(row.depoAdi, row.depoKodu);
      if (!central && !store) continue;

      const storeError = store && isErrorDate(row.magazayaGirisTarihi) && (safeNum(row.toplamEnvanter) > 0 || safeNum(row.toplamSatisMiktari) > 0);
      if (storeError) {
        result.hataliTarih.push({
          depo: row.depoAdi, urunAdi: row.urunAdi, urunKodu: row.urunKodu, renk: row.renkAciklamasi, beden: row.beden,
          tarih: '1.1.1900', stok: safeNum(row.toplamEnvanter), satis: safeNum(row.toplamSatisMiktari),
          sebep: 'Mağaza giriş tarihi hatalı (1.1.1900) — transfere dahil edilmedi'
        });
        continue;
      }

      const takimInfo = takimMap ? takimMap[norm(row.urunKodu)] : null;
      const meta = getMetaFromRow(row, takimInfo);
      const productKey = `${meta.urunKodu}|||${meta.renk}`;
      const sizeKey = norm(row.beden || 'STD');

      if (!productMap[productKey]) productMap[productKey] = { meta, depots: {}, stores: {} };
      const pdata = productMap[productKey];
      // Eğer takım dosyası daha dolu geldiyse meta'yı zenginleştir
      pdata.meta = { ...pdata.meta, ...meta, kategori: meta.kategori };

      if (central) {
        addLocationSize(pdata.depots, central, sizeKey, row.toplamEnvanter, 0, row.magazayaGirisTarihi, row.depoKodu, row.depoAdi);
        result.stats.merkezStok += safeNum(row.toplamEnvanter);
      }
      if (store) {
        addLocationSize(pdata.stores, store, sizeKey, row.toplamEnvanter, row.toplamSatisMiktari, row.magazayaGirisTarihi, row.depoKodu, row.depoAdi);
      }
    }

    // Performans ve sezon/depo özetleri
    for (const pdata of Object.values(productMap)) {
      const storePerformance = {};
      for (const [storeKey, sdata] of Object.entries(pdata.stores)) {
        let totalSatis = 0, totalStok = 0;
        for (const sd of Object.values(sdata.sizes)) { totalSatis += sd.satis; totalStok += sd.stok; }
        storePerformance[storeKey] = { store: sdata.meta, satis: totalSatis, stok: totalStok, performance: calculatePerformance(totalSatis, totalStok), sizes: sdata.sizes };
      }
      pdata.storePerformance = storePerformance;
      pdata.producedSizes = sizeListFromLocations(pdata);

      const totalDepoStock = Object.values(pdata.depots).reduce((sum, d) => sum + Object.values(d.sizes).reduce((s, rec) => s + rec.stok, 0), 0);
      if (pdata.meta.isNewSeason) result.stats.yeniSezonAdet += totalDepoStock; else result.stats.virmanAdet += totalDepoStock;

      for (const dep of Object.values(pdata.depots)) {
        const stock = Object.values(dep.sizes).reduce((s, rec) => s + rec.stok, 0);
        if (!stock) continue;
        const season = pdata.meta.sezonTipi;
        const key = `${season}|||${dep.meta.label}`;
        if (!result.seasonSenderOzet[key]) result.seasonSenderOzet[key] = { sezonTipi: season, gonderen: dep.meta.label, adet: 0 };
        result.seasonSenderOzet[key].adet += stock;
      }
    }

    // Bekleyen: depoda stok var, mağazalarda hiç stok/satış yok
    for (const pdata of Object.values(productMap)) {
      const totalDepoStock = Object.values(pdata.depots).reduce((sum, d) => sum + Object.values(d.sizes).reduce((s, rec) => s + rec.stok, 0), 0);
      if (!totalDepoStock) continue;
      const anyStoreActivity = Object.values(pdata.stores).some(s => Object.values(s.sizes).some(sd => sd.stok > 0 || sd.satis > 0));
      if (!anyStoreActivity) {
        const allSizes = {};
        for (const dep of Object.values(pdata.depots)) for (const [b, rec] of Object.entries(dep.sizes)) allSizes[b] = (allSizes[b] || 0) + rec.stok;
        result.bekleyen.push({
          ...pdata.meta,
          bedenSayisi: Object.values(allSizes).filter(q => q > 0).length,
          toplamAdet: totalDepoStock,
          bedenler: Object.entries(allSizes).filter(([_, q]) => q > 0).map(([b, q]) => `${b}(${q})`).join(', '),
          durum: Object.values(allSizes).filter(q => q > 0).length === 1 && pdata.producedSizes.length >= 3 ? 'Kırık Beden' : 'Bekleyen',
        });
      }
    }

    // Kırık Beden: lokasyon bazlı Depo Kodu & Ürün Kodu & Renk
    for (const pdata of Object.values(productMap)) {
      const producedCount = pdata.producedSizes.length;
      if (producedCount < 3) continue;
      const dayThreshold = getDayThreshold(pdata.meta.isNewSeason);
      const locations = [
        ...Object.entries(pdata.depots).map(([k, v]) => ({ type: 'DEPO', key: k, loc: v })),
        ...Object.entries(pdata.stores).map(([k, v]) => ({ type: 'STORE', key: k, loc: v })),
      ];
      for (const locWrap of locations) {
        const available = availableSizeList(locWrap.loc);
        if (available.length !== 1) continue;
        const beden = available[0];
        const sd = locWrap.loc.sizes[beden];
        if (!sd || sd.stok <= 0) continue;

        if (locWrap.type === 'STORE') {
          const days = daysSince(sd.giris, refDate);
          if (days === null || days < dayThreshold || sd.satis > 0) continue;
        }

        let best = findBestStoreForProduct(pdata, locWrap.type === 'STORE' ? locWrap.key : null, beden);
        if (!best && locWrap.type === 'DEPO') {
          // Satış yoksa YTD sıralamasında en iyi mağazaya öner
          best = { store: STORES[0], performance: 0, satis: 0 };
        }
        if (!best) continue;

        result.kirikBeden.push({
          ...pdata.meta,
          gonderen: locWrap.loc.meta,
          gonderenDepoAdi: locWrap.loc.meta.label,
          gonderenTip: locWrap.type,
          hedef: best.store,
          beden,
          adet: sd.stok,
          uretilenBedenSayisi: producedCount,
          mevcutBedenSayisi: available.length,
          lokasyonKey: `${locWrap.loc.depoKodu || locWrap.loc.meta.code}&${pdata.meta.urunKodu}&${pdata.meta.renk}`,
          neden: `${locWrap.loc.meta.label}: ${producedCount} üretim bedeninden sadece ${available.length} beden stokta (${beden}) → ${best.store.label}`,
        });
      }
    }

    // Depo → Mağaza önerileri
    const globalLoad = {}; STORES.forEach(s => globalLoad[s.key] = 0);
    for (const pdata of Object.values(productMap)) {
      const depoStock = {};
      for (const dep of Object.values(pdata.depots)) for (const [b, rec] of Object.entries(dep.sizes)) depoStock[b] = (depoStock[b] || 0) + rec.stok;
      if (!Object.values(depoStock).some(q => q > 0)) continue;
      const storesWithSales = Object.values(pdata.storePerformance).filter(p => p.satis > 0).sort((a, b) => b.performance - a.performance);
      if (!storesWithSales.length) continue;
      for (const [beden, depoQty] of Object.entries(depoStock)) {
        if (depoQty <= 0) continue;
        // Depo lokasyonu bu ürün-renkte kırıkse ayrıca kırık tabına gittiği için burada yine dağıtmayalım
        const centralBroken = Object.values(pdata.depots).some(dep => availableSizeList(dep).length === 1 && pdata.producedSizes.length >= 3 && dep.sizes[beden] && dep.sizes[beden].stok > 0);
        if (centralBroken) continue;
        const needs = storesWithSales.filter(sp => !sp.sizes[beden] || sp.sizes[beden].stok === 0).map(sp => ({ store: sp.store, performance: sp.performance, totalSatis: sp.satis, totalStok: sp.stok }));
        if (!needs.length) continue;
        needs.sort((a, b) => Math.abs(b.performance - a.performance) > 0.05 ? b.performance - a.performance : globalLoad[a.store.key] - globalLoad[b.store.key]);
        let remaining = depoQty; const distrib = [];
        for (const n of needs) {
          if (remaining <= 0) break;
          if (globalLoad[n.store.key] >= 50) continue;
          const give = Math.min(remaining, 1);
          distrib.push({ ...n, qty: give });
          remaining -= give; globalLoad[n.store.key] += give;
        }
        if (!distrib.length) continue;
        const storeStatus = STORES.map(s => {
          const sp = pdata.storePerformance[s.key]; if (!sp) return null;
          const sd = sp.sizes[beden];
          return { store: s, stok: sd ? sd.stok : 0, satis: sd ? sd.satis : 0, totalPerf: sp.performance };
        }).filter(Boolean);
        result.depoTransfers.push({
          ...pdata.meta,
          gonderenDepoAdi: Object.values(pdata.depots)[0]?.meta?.label || 'Merkez Depo',
          beden, depoStok: depoQty, distrib, storeStatus,
          neden: `En iyi performans: ${distrib[0].store.label} (%${Math.round(distrib[0].performance * 100)})`,
          confidence: Math.round((distrib[0]?.performance || 0) * 100),
        });
      }
    }

    // Mağaza → Mağaza önerileri
    for (const pdata of Object.values(productMap)) {
      const hasAnySales = Object.values(pdata.stores).some(s => Object.values(s.sizes).some(sd => sd.satis > 0));
      const dayThreshold = getDayThreshold(pdata.meta.isNewSeason);
      if (!hasAnySales) continue;
      for (const [storeKey, sdata] of Object.entries(pdata.stores)) {
        const isLocationBroken = pdata.producedSizes.length >= 3 && availableSizeList(sdata).length === 1;
        if (isLocationBroken) continue; // kırık tabında yönetiliyor
        for (const [beden, sd] of Object.entries(sdata.sizes)) {
          if (sd.stok <= 0 || sd.satis > 0) continue;
          const days = daysSince(sd.giris, refDate);
          if (days === null || days < dayThreshold) { result.stats.waitingCount++; continue; }
          const best = findBestStoreForProduct(pdata, storeKey, beden);
          if (!best) continue;
          result.magTransfers.push({
            ...pdata.meta,
            gonderen: sdata.meta,
            gonderenDepoAdi: sdata.meta.label,
            hedef: best.store,
            beden, adet: Math.min(sd.stok, 1), giris: sd.giris, days, dayThreshold,
            neden: `${days} gün satışsız (eşik ${dayThreshold}) → ${best.store.label} (%${Math.round(best.performance * 100)})`,
            confidence: Math.round(best.performance * 100),
          });
          result.stats.transferableCount++;
        }
      }
    }

    // Envanter özeti ve kategori özetleri
    for (const store of STORES) {
      let totalStok = 0, totalSatis = 0, eksikBeden = 0;
      for (const pdata of Object.values(productMap)) {
        const sp = pdata.storePerformance[store.key]; if (!sp) continue;
        totalStok += sp.stok; totalSatis += sp.satis;
        if (sp.satis > 0) for (const sd of Object.values(sp.sizes)) if (sd.satis > 0 && sd.stok === 0) eksikBeden++;
      }
      const depoGelen = result.depoTransfers.reduce((sum, t) => sum + t.distrib.filter(d => d.store.key === store.key).reduce((s, d) => s + d.qty, 0), 0);
      const magGelen = result.magTransfers.filter(t => t.hedef.key === store.key).reduce((s, t) => s + t.adet, 0) + result.kirikBeden.filter(t => t.hedef.key === store.key).reduce((s, t) => s + t.adet, 0);
      const giden = result.magTransfers.filter(t => t.gonderen.key === store.key).reduce((s, t) => s + t.adet, 0) + result.kirikBeden.filter(t => t.gonderen?.key === store.key).reduce((s, t) => s + t.adet, 0);
      result.envanterOzet.push({ store, totalStok, totalSatis, performance: calculatePerformance(totalSatis, totalStok), eksikBeden, depoGelen, magGelen, giden, net: depoGelen + magGelen - giden });
    }

    const transferRows = [...result.depoTransfers, ...result.magTransfers, ...result.kirikBeden];
    for (const t of transferRows) if (t.kategori && result.categoryOzet[t.kategori.bucket] !== undefined) result.categoryOzet[t.kategori.bucket] += t.adet || t.depoStok || 1;

    return result;
  }

  return {
    STORES, CENTRAL_DEPOTS, NEW_SEASON_PREFIXES, NEW_SEASON_DAY_THRESHOLD, VIRMAN_DAY_THRESHOLD, TRANSFER_DAY_THRESHOLD,
    analyze, matchStore, matchCentral, isNewSeason, isErrorDate, parseDate, daysSince, calculatePerformance, getCategory, getDayThreshold,
    runAnalysis() {
      if (!DATA.rawData || DATA.rawData.length === 0) { alert('Önce Nebim datasını yükleyin'); return; }
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
        } finally { UI.hideLoading(); }
      }, 100);
    }
  };
})();
