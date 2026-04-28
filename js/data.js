// ============================================================
// UTOPIAN TRANSFER v7.0 — VERİ YÖNETİMİ MODÜLÜ
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
  };

  // ========== INDEXEDDB ==========
  
  const DB_NAME = 'utopian_transfer_v7';
  const DB_VERSION = 1;
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
    
    // Sayfa 1: Depo Transfer
    const d1 = (UI.getFilteredDepo ? UI.getFilteredDepo() : a.depoTransfers).map(t => ({
      'Sezon': t.sezonTipi,
      'Sezon Durum': t.sezonDurum || '',
      'Mal Grubu': t.malGrubu || '',
      'Ana Grup': t.anaGrup || '',
      'Alt Grup': t.altGrup,
      'Gönderici': t.gonderici ? t.gonderici.label : 'Merkez Depo',
      'Ürün Adı': t.urunAdi,
      'Ürün Kodu': t.urunKodu,
      'Renk': t.renk,
      'Beden': t.beden,
      'Depo Stok': t.depoStok,
      'Takım Durumu': t.takimDurumu,
      'Takım Kod': t.takimKod || '',
      'Hedef Mağaza(lar)': t.distrib.map(d => `${d.qty} ADET ${d.store.label.toUpperCase()}`).join(' · '),
      'Performans %': t.distrib[0] ? Math.round(t.distrib[0].performance * 100) : '',
      'Skor': t.confidence,
      'Neden': t.neden,
    }));
    const ws1 = XLSX.utils.json_to_sheet(d1);
    setColWidths(ws1, [8, 12, 12, 14, 16, 14, 22, 22, 14, 8, 8, 12, 10, 36, 10, 6, 30]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Depo Transfer');
    
    // Sayfa 2: Mağaza Arası
    const d2 = (UI.getFilteredMag ? UI.getFilteredMag() : a.magTransfers).map(t => ({
      'Sezon': t.sezonTipi,
      'Sezon Durum': t.sezonDurum || '',
      'Mal Grubu': t.malGrubu || '',
      'Ana Grup': t.anaGrup || '',
      'Alt Grup': t.altGrup,
      'Gönderen': t.gonderen.label,
      'Ürün Adı': t.urunAdi,
      'Ürün Kodu': t.urunKodu,
      'Renk': t.renk,
      'Beden': t.beden,
      'Adet': t.adet,
      'Giriş Tarihi': t.giris ? new Date(t.giris).toLocaleDateString('tr') : '',
      'Gün': t.days || '',
      'Takım Durumu': t.takimDurumu,
      'Takım Kod': t.takimKod || '',
      'Hedef': t.hedef.label,
      'Skor': t.confidence,
      'Neden': t.neden,
    }));
    const ws2 = XLSX.utils.json_to_sheet(d2);
    setColWidths(ws2, [8, 12, 12, 14, 16, 14, 22, 22, 14, 8, 6, 12, 6, 12, 10, 14, 6, 36]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Mağaza Arası');
    
    // Sayfa 3: Kırık Beden
    if (a.kirikBeden.length) {
      const d3 = a.kirikBeden.map(t => ({
        'Sezon': t.sezonTipi,
        'Sezon Durum': t.sezonDurum || '',
        'Mal Grubu': t.malGrubu || '',
        'Ana Grup': t.anaGrup || '',
        'Alt Grup': t.altGrup,
        'Gönderen': t.gonderen.label,
        'Ürün Adı': t.urunAdi,
        'Ürün Kodu': t.urunKodu,
        'Renk': t.renk,
        'Beden': t.beden,
        'Adet': t.adet,
        'Stoklu Beden / Toplam Beden': `${t.stokluBedenler || 1}/${t.toplamSize || '?'}`,
        'Takım Durumu': t.takimDurumu,
        'Hedef': t.hedef.label,
        'Neden': t.neden,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d3), 'Kırık Beden');
    }
    
    // Sayfa 4: Hatalı Tarih (önemli — kullanıcı uyarı için)
    if (a.hataliTarih.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.hataliTarih), 'Hatalı Tarih (1.1.1900)');
    }
    
    // Sayfa 5: Bekleyen
    if (a.bekleyen.length) {
      const dB = a.bekleyen.map(b => ({
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dB), 'Bekleyen');
    }
    
    // Sayfa 6: Mağaza Bazlı (her mağaza için ayrı sayfa - sadece o mağazaya gidenler)
    for (const store of ALGO.STORES) {
      const dt = a.depoTransfers.filter(t => t.distrib.some(d => d.store.key === store.key))
        .flatMap(t => t.distrib.filter(d => d.store.key === store.key).map(d => ({
          'Sezon': t.sezonTipi,
          'Kategori': t.kategori?.label || '',
          'Alt Grup': t.altGrup,
          'Ürün Adı': t.urunAdi,
          'Ürün Kodu': t.urunKodu,
          'Renk': t.renk,
          'Beden': t.beden,
          'Adet': d.qty,
          'Kaynak': 'MERKEZ DEPO',
          'Performans %': Math.round(d.performance * 100),
          'Neden': t.neden,
        })));
      const mt = a.magTransfers.filter(t => t.hedef.key === store.key).map(t => ({
        'Sezon': t.sezonTipi,
        'Kategori': t.kategori?.label || '',
        'Alt Grup': t.altGrup,
        'Ürün Adı': t.urunAdi,
        'Ürün Kodu': t.urunKodu,
        'Renk': t.renk,
        'Beden': t.beden,
        'Adet': t.adet,
        'Kaynak': t.gonderen.label.toUpperCase(),
        'Performans %': '',
        'Neden': t.neden,
      }));
      const allRows = [...dt, ...mt];
      if (allRows.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), `${store.label} Gelen`);
      }
    }
    
    const dateStr = new Date().toLocaleDateString('tr').replace(/\./g, '-');
    XLSX.writeFile(wb, `UTOPIAN_Transfer_${dateStr}.xlsx`);
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
  
  async function init() {
    await openDB();
    await loadTakimFromCache();
  }

  // ========== PUBLIC API ==========
  return {
    state,
    get rawData() { return state.rawData; },
    get takimMap() { return state.takimMap; },
    get lastAnalysis() { return state.lastAnalysis; },
    set lastAnalysis(v) { state.lastAnalysis = v; },
    set lastAnalysisDate(v) { state.lastAnalysisDate = v; },
    
    init,
    openDB,
    getDB,
    dbGet,
    dbPut,
    dbDelete,
    dbGetAll,
    
    loadNebim,
    loadTakim,
    loadIrsaliye,
    loadTakimFromCache,
    
    exportExcel,
    exportBekleyen,
  };
})();
