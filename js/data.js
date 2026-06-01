// ============================================================
// UTOPIAN TRANSFER v8.0 — VERİ YÖNETİMİ MODÜLÜ
// Excel parse, IndexedDB cache, dosya okuma, Excel export
// ============================================================

const DATA = (function() {

  // Public state
  const state = {
    rawData: [],
    takimMap: {},      // { urunKodu: { malGrubu, sezonDurumu, takimDurumu, takimKod } }
    takimUpdateDate: null,
    irsaliyeData: [],
    lastAnalysis: null,
    lastAnalysisDate: null,
    cachedDNA: null,   // v8.12: birikmiş mağaza × kategori DNA (IndexedDB'den yüklenir)
  };

  // ========== INDEXEDDB ==========
  
  const DB_NAME = 'utopian_transfer_v8';
  const DB_VERSION = 3;
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('takim')) d.createObjectStore('takim');
        if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
        if (!d.objectStoreNames.contains('images')) d.createObjectStore('images');
        // v2: fotoğraf meta verisi — hangi SKU'lar kayıtlı, son güncelleme tarihi
        if (!d.objectStoreNames.contains('imageMeta')) d.createObjectStore('imageMeta');
        // v8.12: mağaza × kategori DNA — analizler arası kalıcı, veri geldikçe güncellenir
        if (!d.objectStoreNames.contains('categoryDNA')) d.createObjectStore('categoryDNA');
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e);
    });
  }

  async function getDB() {
    if (!db) await openDB();
    return db;
  }

  async function dbGet(store, key) {
    const d = await getDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readonly');
      const r = tx.objectStore(store).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = (e) => rej(e);
    });
  }

  async function dbPut(store, value, key) {
    const d = await getDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readwrite');
      const r = key !== undefined ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
      tx.oncomplete = () => res();
      tx.onerror = (e) => rej(e);
    });
  }

  async function dbDelete(store, key) {
    const d = await getDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = (e) => rej(e);
    });
  }

  async function dbGetAll(store) {
    const d = await getDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readonly');
      const r = tx.objectStore(store).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = (e) => rej(e);
    });
  }

  // v8.10: bir store'daki TÜM anahtarları getir (artımlı fotoğraf yükleme için)
  async function dbGetAllKeys(store) {
    const d = await getDB();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, 'readonly');
      const r = tx.objectStore(store).getAllKeys();
      r.onsuccess = () => res(r.result || []);
      r.onerror = (e) => rej(e);
    });
  }

  // ========== TAKIM BİLGİSİ CACHE'TEN YÜKLE ==========
  
  async function loadTakimFromCache() {
    try {
      const data = await dbGet('takim', 'data');
      const date = await dbGet('takim', 'updateDate');
      if (data) {
        state.takimMap = data;
        state.takimUpdateDate = date ? new Date(date) : null;
        const cnt = Object.keys(data).length;
        const dateStr = state.takimUpdateDate ? state.takimUpdateDate.toLocaleString('tr') : '?';
        document.getElementById('ts').innerHTML = `✅ Önbellekte: ${cnt} ürün<br><small style="color:#6b7280">Son güncelleme: ${dateStr}</small>`;
        document.getElementById('u2').classList.add('ok');
      }
    } catch (e) {
      console.warn('Takım cache okuma:', e);
    }
  }

  // ========== EXCEL OKUMA YARDIMCI ==========
  
  function readExcelFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        callback(null, wb);
      } catch (er) {
        callback(er);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function findColumn(keys, mustHave, notHave) {
    for (const k of keys) {
      const c = String(k).replace(/[\n\r\s]/g, '').toUpperCase();
      const hasAll = mustHave.every(m => c.includes(m.toUpperCase()));
      const noneOf = !notHave || !notHave.some(n => c.includes(n.toUpperCase()));
      if (hasAll && noneOf) return k;
    }
    return null;
  }

  // ========== NEBİM DATA YÜKLEME ==========
  
  function loadNebim(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('ds').textContent = 'Okunuyor...';
    
    readExcelFile(file, (err, wb) => {
      if (err) {
        alert('Excel okuma hatası: ' + err.message);
        return;
      }
      
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      
      if (raw.length === 0) {
        alert('Excel boş');
        return;
      }
      
      const keys = Object.keys(raw[0]);
      
      // Kolon eşleştirme — Nebim TreeListColumn raporu
      // SADECE Depo Kodu üzerinden mağaza eşleştirme (Mağaza Kodu kullanılmaz)
      const colMap = {
        depoKodu: findColumn(keys, ['DEPO', 'KODU']) || findColumn(keys, ['DEPOKODU']),
        depoAdi: findColumn(keys, ['DEPO', 'ADI']) || findColumn(keys, ['DEPOADI']),
        urunKodu: findColumn(keys, ['ÜRÜN', 'KODU']) || findColumn(keys, ['URUNKODU']),
        urunAdi: findColumn(keys, ['ÜRÜN', 'ADI']) || findColumn(keys, ['URUNADI']),
        renkAciklamasi: findColumn(keys, ['RENK', 'AÇIKLAMA']) || findColumn(keys, ['RENKAÇIKLAMASI']) || findColumn(keys, ['RENK'], ['KODU']),
        renkKodu: findColumn(keys, ['RENK', 'KODU']) || findColumn(keys, ['RENKKODU']),
        depoyaIlkGirisTarihi: findColumn(keys, ['DEPOYA', 'GIRIS']) || findColumn(keys, ['DEPOYA', 'GİRİŞ']) || findColumn(keys, ['DEPOYAILKGIRIS']) || findColumn(keys, ['DEPOYAİLKGİRİŞTARİHİ']),
        sonFaturaTarihi: findColumn(keys, ['SON', 'FATURA']) || findColumn(keys, ['SONFATURA']),
        beden: findColumn(keys, ['BEDEN'], ['EKSIK', 'STOK']),
        // Önce "Toplam Satış", yoksa "Satış Miktarı"
        toplamSatisMiktari: findColumn(keys, ['TOPLAMSATIŞMIKTARI']) || findColumn(keys, ['TOPLAM', 'SATIŞ']) || findColumn(keys, ['SATIŞ', 'MIKTAR']) || findColumn(keys, ['SATIŞMİKTARI']),
        // Önce "Toplam Envanter", yoksa "Envanter"
        toplamEnvanter: findColumn(keys, ['TOPLAMENVANTER']) || findColumn(keys, ['TOPLAM', 'ENVANTER']) || findColumn(keys, ['ENVANTER'], ['TUTAR']),
        magazayaGirisTarihi: findColumn(keys, ['MAGAZAYAGIRISTARIHI']) || findColumn(keys, ['MAĞAZAYA', 'GİRİŞ']) || findColumn(keys, ['MAGAZAYA', 'GIRIS']),
        anaGrup: findColumn(keys, ['ANA', 'GRUP'], ['AÇIKLAMA']) || findColumn(keys, ['ANAGRUP'], ['AÇIKLAMA']),
        altGrupAciklama: findColumn(keys, ['ALT', 'GRUP', 'AÇIKLAMA']) || findColumn(keys, ['ALTGRUPAÇIKLAMASI']),
        sezonuKodu: findColumn(keys, ['ÜRÜN', 'SEZONU', 'KODU']) || findColumn(keys, ['SEZONU', 'KODU']) || findColumn(keys, ['SEZONUKODU']),
        sezonuAciklama: findColumn(keys, ['ÜRÜN', 'SEZONU', 'AÇIKLAMA']) || findColumn(keys, ['SEZONU', 'AÇIKLAMA']) || findColumn(keys, ['SEZONUAÇIKLAMASI']),
        malGrubu: findColumn(keys, ['MALGRUBU']) || findColumn(keys, ['MAL', 'GRUBU']),
        ciroVH: findColumn(keys, ['SATIŞ', 'VH']) || findColumn(keys, ['CIRO']),
      };
      
      // Eksik zorunlu kolon kontrolü
      const required = ['depoKodu', 'depoAdi', 'urunKodu', 'beden', 'toplamEnvanter'];
      const missing = required.filter(r => !colMap[r]);
      if (missing.length > 0) {
        alert('Eksik kolonlar: ' + missing.join(', ') + '\n\nMevcut kolonlar:\n' + keys.slice(0, 20).join('\n'));
        return;
      }
      
      // Debug
      console.log('Kolon eşleştirme:', colMap);
      
      // Veriyi normalize et — Mağaza Kodu kullanılmaz, sadece Depo Kodu
      state.rawData = raw.map(r => ({
        depoKodu: String(r[colMap.depoKodu] || ''),
        depoAdi: String(r[colMap.depoAdi] || ''),
        urunKodu: String(r[colMap.urunKodu] || '').trim(),
        urunAdi: String(r[colMap.urunAdi] || ''),
        renkAciklamasi: String(r[colMap.renkAciklamasi] || 'STD'),
        renkKodu: String(r[colMap.renkKodu] || ''),
        depoyaIlkGirisTarihi: r[colMap.depoyaIlkGirisTarihi] || '',
        sonFaturaTarihi: r[colMap.sonFaturaTarihi] || '',
        beden: String(r[colMap.beden] || 'STD'),
        toplamSatisMiktari: Number(r[colMap.toplamSatisMiktari]) || 0,
        toplamEnvanter: Number(r[colMap.toplamEnvanter]) || 0,
        magazayaGirisTarihi: r[colMap.magazayaGirisTarihi] || '',
        anaGrup: String(r[colMap.anaGrup] || ''),
        altGrupAciklama: String(r[colMap.altGrupAciklama] || ''),
        sezonuKodu: String(r[colMap.sezonuKodu] || ''),
        sezonuAciklama: String(r[colMap.sezonuAciklama] || ''),
        malGrubu: String(r[colMap.malGrubu] || ''),
        ciroVH: Number(r[colMap.ciroVH]) || 0,
      })).filter(r => r.depoKodu && r.urunKodu);
      
      document.getElementById('u1').classList.add('ok');
      document.getElementById('ds').innerHTML = `✅ ${state.rawData.length.toLocaleString('tr')} satır yüklendi`;
      document.getElementById('bRun').disabled = false;
      document.getElementById('rSt').textContent = 'Hazır → Analizi başlatabilirsiniz';
    });
  }

  // ========== TAKIM BİLGİSİ YÜKLEME ==========
  
  function loadTakim(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('ts').textContent = 'Okunuyor...';
    
    readExcelFile(file, async (err, wb) => {
      if (err) {
        alert('Takım dosyası okuma hatası: ' + err.message);
        return;
      }
      
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const keys = Object.keys(raw[0] || {});
      
      const cols = {
        urunKodu: findColumn(keys, ['ÜRÜN', 'KODU']) || findColumn(keys, ['URUNKODU']),
        malGrubu: findColumn(keys, ['MALGRUBU']) || findColumn(keys, ['MAL', 'GRUBU']),
        sezonDurumu: findColumn(keys, ['SEZON', 'DURUMU']) || findColumn(keys, ['SEZONDURUMU']),
        takimDurumu: findColumn(keys, ['TAIM', 'DURUMU']) || findColumn(keys, ['TAKIM', 'DURUMU']) || findColumn(keys, ['TAKIMDURUMU']),
        takimKod: findColumn(keys, ['TAKIM', 'KOD']) || findColumn(keys, ['TAKIMKOD']),
      };
      
      if (!cols.urunKodu) {
        alert('Ürün Kodu kolonu bulunamadı.\nMevcut: ' + keys.join(', '));
        return;
      }
      
      // Map oluştur
      state.takimMap = {};
      for (const r of raw) {
        const kod = String(r[cols.urunKodu] || '').trim();
        if (!kod || kod === 'nan') continue;
        const cleanStr = (v) => {
          const s = String(v || '').trim();
          return (s === 'nan' || s === 'NaN' || s === 'undefined') ? '' : s;
        };
        state.takimMap[kod] = {
          malGrubu: cleanStr(r[cols.malGrubu]),
          sezonDurumu: cleanStr(r[cols.sezonDurumu]),
          takimDurumu: cleanStr(r[cols.takimDurumu]) || 'TAKIM DEĞİL',
          takimKod: cleanStr(r[cols.takimKod]),
        };
      }
      
      state.takimUpdateDate = new Date();
      
      // IndexedDB'ye kaydet
      try {
        await dbPut('takim', state.takimMap, 'data');
        await dbPut('takim', state.takimUpdateDate.toISOString(), 'updateDate');
      } catch (e) {
        console.error('Takım cache kayıt:', e);
      }
      
      const cnt = Object.keys(state.takimMap).length;
      document.getElementById('u2').classList.add('ok');
      document.getElementById('ts').innerHTML = `✅ ${cnt} ürün<br><small style="color:#6b7280">Güncelleme: ${state.takimUpdateDate.toLocaleString('tr')}</small>`;
    });
  }

  // ========== TRANSFER İRSALİYE YÜKLEME (Performans Raporu için) ==========
  
  function loadIrsaliye(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('is').textContent = 'Okunuyor...';
    
    readExcelFile(file, (err, wb) => {
      if (err) {
        alert('İrsaliye okuma hatası: ' + err.message);
        return;
      }
      
      const sheet = wb.Sheets[wb.SheetNames[0]];
      state.irsaliyeData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      
      document.getElementById('u3').classList.add('ok');
      document.getElementById('is').innerHTML = `✅ ${state.irsaliyeData.length.toLocaleString('tr')} satır`;
      
      // Eğer analiz yapıldıysa hemen performans raporunu göster
      if (state.lastAnalysis && typeof PERF !== 'undefined') {
        PERF.compare(state.lastAnalysis, state.irsaliyeData);
      }
    });
  }

  // ========== EXCEL EXPORT ==========
  
  function exportExcel() {
    if (!state.lastAnalysis) {
      alert('Önce analiz yapın');
      return;
    }
    
    const a = state.lastAnalysis;
    const wb = XLSX.utils.book_new();
    
    // Ürün adına göre A-Z sıralama yardımcısı
    function sortByName(arr) {
      return arr.slice().sort((x, y) => 
        String(x.urunAdi || '').localeCompare(String(y.urunAdi || ''), 'tr'));
    }
    
    // ===== SAYFA 1: KONTROL LİSTESİ (Depo + Mağaza + Kırık birleşik, filtreli) =====
    const allRows = (UI.getVisibleRows ? UI.getVisibleRows() : []);
    if (allRows.length) {
      const d0 = allRows.slice().sort((x, y) =>
        String(x.urunAdi || '').localeCompare(String(y.urunAdi || ''), 'tr')).map(row => ({
        'Tür': row.tur,
        'GÖNDERİCİ': String(row.gonderen || '').toUpperCase(),
        'Sezon': row.sezonTipi,
        'Sezon Durum': row.sezonDurum || '',
        'Ana Grup': row.anaGrup || '',
        'Alt Grup': row.altGrup || '',
        'Ürün Adı': row.urunAdi,
        'Ürün Kodu': row.urunKodu,
        'Renk': row.renk,
        'Beden': row.beden,
        'Takım': row.takimDurumu || '',
        'Güven %': row.guven || '',
        'Neden': row.neden,
        'Adet': row.adet,
        'HEDEF MAĞAZA': String(row.hedef || '').toUpperCase(),
      }));
      const ws0 = XLSX.utils.json_to_sheet(d0);
      setColWidths(ws0, [9, 18, 8, 12, 14, 16, 24, 22, 14, 8, 8, 9, 44, 7, 18]);
      XLSX.utils.book_append_sheet(wb, ws0, 'Kontrol Listesi');
    }
    
    // ===== SAYFA 2: MAĞAZALARA DAĞITIMI YAPILMAMIŞ ÜRÜNLER =====
    // Depoda olup hiçbir mağazaya gönderilmemiş ürünler (kaynak = DEPO).
    {
      const depoBekleyen = (a.bekleyen || []).filter(b => {
        const lbl = (b.kaynak && b.kaynak.label) ? String(b.kaynak.label).toUpperCase() : '';
        return lbl.includes('DEPO') || lbl.includes('MERKEZ') || lbl.includes('SHOWROOM');
      });
      if (depoBekleyen.length) {
        const grup = {};
        for (const b of depoBekleyen) {
          const key = b.urunKodu + '|' + (b.renkKodu || b.renk);
          if (!grup[key]) grup[key] = {
            urunAdi: b.urunAdi, urunKodu: b.urunKodu, renk: b.renk,
            anaGrup: b.anaGrup || '', altGrup: b.altGrup || '',
            sezonTipi: b.sezonTipi, bedenler: [], toplamAdet: 0,
          };
          grup[key].bedenler.push(b.beden);
          grup[key].toplamAdet += (b.stok || 0);
        }
        const d2 = sortByName(Object.values(grup)).map(g => ({
          'Sezon': g.sezonTipi,
          'Ana Grup': g.anaGrup,
          'Alt Grup': g.altGrup,
          'Ürün Adı': g.urunAdi,
          'Ürün Kodu': g.urunKodu,
          'Renk': g.renk,
          'Beden Sayısı': g.bedenler.length,
          'Toplam Envanter': g.toplamAdet,
          'Bedenler': g.bedenler.join(' - '),
        }));
        const ws2 = XLSX.utils.json_to_sheet(d2);
        setColWidths(ws2, [8, 14, 16, 24, 22, 14, 12, 14, 24]);
        XLSX.utils.book_append_sheet(wb, ws2, 'Magazalara Dagitilmayan');
      }
    }

    // ===== SAYFA 3: DEPODA FAZLA BEKLEYEN ÜRÜNLER =====
    // Mağazalarda stok varken depoda fazladan bekleyen ürünler
    // (kaynak = DEPO olmayan, yani mağaza kaynaklı bekleyen kayıtlar).
    {
      const fazlaBekleyen = (a.bekleyen || []).filter(b => {
        const lbl = (b.kaynak && b.kaynak.label) ? String(b.kaynak.label).toUpperCase() : '';
        return !(lbl.includes('DEPO') || lbl.includes('MERKEZ') || lbl.includes('SHOWROOM'));
      });
      if (fazlaBekleyen.length) {
        const grup = {};
        for (const b of fazlaBekleyen) {
          const key = b.urunKodu + '|' + (b.renkKodu || b.renk);
          if (!grup[key]) grup[key] = {
            urunAdi: b.urunAdi, urunKodu: b.urunKodu, renk: b.renk,
            anaGrup: b.anaGrup || '', altGrup: b.altGrup || '',
            sezonTipi: b.sezonTipi, kaynak: (b.kaynak && b.kaynak.label) || '',
            bedenler: [], toplamAdet: 0,
          };
          grup[key].bedenler.push(b.beden);
          grup[key].toplamAdet += (b.stok || 0);
        }
        const d3 = sortByName(Object.values(grup)).map(g => ({
          'Sezon': g.sezonTipi,
          'Ana Grup': g.anaGrup,
          'Alt Grup': g.altGrup,
          'Ürün Adı': g.urunAdi,
          'Ürün Kodu': g.urunKodu,
          'Renk': g.renk,
          'Beden Sayısı': g.bedenler.length,
          'Toplam Envanter': g.toplamAdet,
          'Bedenler': g.bedenler.join(' - '),
        }));
        const ws3 = XLSX.utils.json_to_sheet(d3);
        setColWidths(ws3, [8, 14, 16, 24, 22, 14, 12, 14, 24]);
        XLSX.utils.book_append_sheet(wb, ws3, 'Depoda Fazla Bekleyen');
      }
    }

    
    const dateStr = new Date().toLocaleDateString('tr').replace(/\./g, '-');
    XLSX.writeFile(wb, 'UTOPIAN_Transfer_' + dateStr + '.xlsx');
  }

  function exportBekleyen() {
    if (!state.lastAnalysis) {
      alert('Önce analiz yapın');
      return;
    }
    const wb = XLSX.utils.book_new();
    const d = state.lastAnalysis.bekleyen.map(b => ({
      'Sezon': b.sezonTipi,
      'Ürün Kodu': b.urunKodu,
      'Kategori': b.kategori?.label || '',
      'Alt Grup': b.altGrup,
      'Ürün Adı': b.urunAdi,
      'Renk': b.renk,
      'Beden Sayısı': b.bedenSayisi,
      'Toplam Adet': b.toplamAdet,
      'Bedenler': b.bedenler,
      'Durum': b.durum,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), 'Bekleyen');
    XLSX.writeFile(wb, `Bekleyen_${new Date().toLocaleDateString('tr').replace(/\./g, '-')}.xlsx`);
  }

  function setColWidths(ws, widths) {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  }

  // ========== INIT ==========
  
  // ========== v8.12 — MAĞAZA × KATEGORİ DNA KALICILIĞI ==========
  // DNA tablosu IndexedDB'de saklanır; her veri yüklemesinde güncellenir.
  // Sayfa açılışında belleğe (state.cachedDNA) yüklenir, analiz buna katar.
  async function saveDNA(dna) {
    try {
      await dbPut('categoryDNA', dna, 'current');
      await dbPut('categoryDNA', new Date().toISOString(), 'lastUpdate');
      state.cachedDNA = dna;
    } catch (e) { console.warn('DNA kaydedilemedi:', e); }
  }
  async function loadDNA() {
    try {
      const dna = await dbGet('categoryDNA', 'current');
      if (dna && typeof dna === 'object') {
        state.cachedDNA = dna;
        console.log('Mağaza × kategori DNA belleğe yüklendi.');
      }
    } catch (e) { /* ilk kez — DNA yok */ }
  }
  
  async function init() {
    await openDB();
    await loadTakimFromCache();
    await loadDNA();
  }

  // ========== PUBLIC API ==========
  return {
    state,
    get rawData() { return state.rawData; },
    get takimMap() { return state.takimMap; },
    get lastAnalysis() { return state.lastAnalysis; },
    set lastAnalysis(v) { state.lastAnalysis = v; },
    set lastAnalysisDate(v) { state.lastAnalysisDate = v; },
    get cachedDNA() { return state.cachedDNA; },
    set cachedDNA(v) { state.cachedDNA = v; },
    saveDNA,
    loadDNA,
    
    init,
    openDB,
    getDB,
    dbGet,
    dbPut,
    dbDelete,
    dbGetAll,
    dbGetAllKeys,
    
    loadNebim,
    loadTakim,
    loadIrsaliye,
    loadTakimFromCache,
    
    exportExcel,
    exportBekleyen,
  };
})();

// Global erişim için window objesine ekle
if (typeof window !== "undefined") window.DATA = DATA;
