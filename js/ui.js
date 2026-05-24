// ============================================================
// UTOPIAN TRANSFER v8.1 — UI MODÜLÜ
// Tablo render, filtreler, görsel paneli
// ============================================================

const UI = (function() {
  
  const PAGE_SIZE = 50;
  let currentTab = 'all';
  let currentPage = { all: 1, bek: 1, hata: 1 };
  // Birleşik transfer satırları (depo + mağaza + kırık normalize edilmiş)
  let allRows = [];
  
  // Görsel cache
  let imageHandles = {};
  let folderOk = false;
  let dbImagesReady = false;
  
  function $(id) { return document.getElementById(id); }
  
  // ========== SÜRÜKLE-BIRAK ==========
  
  function dragOver(e, boxId) {
    e.preventDefault();
    e.stopPropagation();
    const el = $(boxId);
    if (el) el.style.borderColor = 'var(--ac)';
  }
  
  function dragLeave(e, boxId) {
    e.preventDefault();
    e.stopPropagation();
    const el = $(boxId);
    if (el) el.style.borderColor = '';
  }
  
  function dropFile(e, type) {
    e.preventDefault();
    e.stopPropagation();
    
    // Box border'ını sıfırla
    const boxIds = { nebim: 'u1', takim: 'u2', irsaliye: 'u3' };
    const el = $(boxIds[type]);
    if (el) el.style.borderColor = '';
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    // Excel kontrolü
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      alert('Lütfen Excel dosyası (.xlsx veya .xls) yükleyin');
      return;
    }
    
    // İlgili input'a dosya ata + tetikle
    const inputIds = { nebim: 'f1', takim: 'f2', irsaliye: 'f3' };
    const input = $(inputIds[type]);
    
    // Doğrudan loadXxx çağır
    const fakeEvent = { target: { files: [file] } };
    if (type === 'nebim') DATA.loadNebim(fakeEvent);
    else if (type === 'takim') DATA.loadTakim(fakeEvent);
    else if (type === 'irsaliye') DATA.loadIrsaliye(fakeEvent);
  }
  
  // ========== GÖRSEL YÖNETİMİ ==========
  
  async function pickFolder() {
    try {
      const dh = await window.showDirectoryPicker({ mode: 'read' });
      imageHandles = {};
      let cnt = 0;
      const photoRegex = /\.(jpg|jpeg|png|webp|gif|tiff|tif|bmp|svg|heic|heif|ico|psd|raw|cr2|nef|arw|dng|eps|ai|pdf)$/i;
      
      // NEBIMSRV klasör yapısı: 
      // OfficialForms/
      //   Y26111614907430-CA/        <- ürün+renk klasörü (klasör adı = SKU)
      //     Y26111614907430-CA.jpg   <- DOĞRUDAN BU klasörde dosya (öncelik!)
      //     ColorPhotos/             <- altklasör
      //     MiscPhotos/              <- altklasör
      
      for await (const [name, handle] of dh.entries()) {
        if (handle.kind === 'directory') {
          let found = null;
          
          // 1. ÖNCE doğrudan klasörün içine bak (Y26....jpg gibi)
          try {
            for await (const [fn, fh] of handle.entries()) {
              if (fh.kind === 'file' && photoRegex.test(fn)) {
                found = fh;
                break;
              }
            }
          } catch (err) { /* erişim yoksa devam */ }
          
          // 2. Bulunmadıysa ColorPhotos altklasörüne bak
          if (!found) {
            try {
              const cp = await handle.getDirectoryHandle('ColorPhotos').catch(() => null);
              if (cp) {
                for await (const [fn, fh] of cp.entries()) {
                  if (fh.kind === 'file' && photoRegex.test(fn)) {
                    found = fh;
                    break;
                  }
                }
              }
            } catch (err) {}
          }
          
          // 3. Hala yoksa MiscPhotos'a bak
          if (!found) {
            try {
              const mp = await handle.getDirectoryHandle('MiscPhotos').catch(() => null);
              if (mp) {
                for await (const [fn, fh] of mp.entries()) {
                  if (fh.kind === 'file' && photoRegex.test(fn)) {
                    found = fh;
                    break;
                  }
                }
              }
            } catch (err) {}
          }
          
          // 4. Tüm altklasörlere bak (son çare)
          if (!found) {
            try {
              for await (const [subName, subHandle] of handle.entries()) {
                if (subHandle.kind === 'directory') {
                  for await (const [fn, fh] of subHandle.entries()) {
                    if (fh.kind === 'file' && photoRegex.test(fn)) {
                      found = fh;
                      break;
                    }
                  }
                  if (found) break;
                }
              }
            } catch (err) {}
          }
          
          if (found) {
            // Birden fazla varyasyon olarak kaydet (renk eki olabilir veya olmayabilir)
            const upperName = name.toUpperCase();
            imageHandles[upperName] = found;
            
            // Y26111614907430-CA → Y26111614907430 (renk eki olmadan)
            const noColorBase = name.replace(/-[A-Za-z0-9]+$/, '');
            if (noColorBase !== name) imageHandles[noColorBase.toUpperCase()] = found;
            
            // Y26111614907430-CA → Y26111614907430-C (kısaltma)
            const shortBase = name.replace(/-([A-Za-z])([A-Za-z]+)$/, '-$1');
            if (shortBase !== name) imageHandles[shortBase.toUpperCase()] = found;
            
            cnt++;
          }
        } else if (handle.kind === 'file' && photoRegex.test(name)) {
          // Doğrudan dosya seçilmişse (örnek: Y26111614907430-CA.jpg)
          const baseName = name.replace(/\.[^.]+$/, ''); // uzantı kaldır
          imageHandles[baseName.toUpperCase()] = handle;
          const noColorBase = baseName.replace(/-[A-Za-z0-9]+$/, '');
          if (noColorBase !== baseName) imageHandles[noColorBase.toUpperCase()] = handle;
          cnt++;
        }
      }
      
      folderOk = true;
      $('imgCnt').textContent = `${cnt} fotoğraf bulundu`;
      $('btnCache').style.display = 'inline-flex';
      $('btnFolder').textContent = '✅ Klasör yüklendi';
      console.log('Fotoğraflar yüklendi:', cnt, 'ürün. İlk 5 anahtar:', Object.keys(imageHandles).slice(0,5));
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('pickFolder hatası:', e);
        alert('Klasör okuma hatası: ' + e.message);
      }
    }
  }
  
  async function cacheImages() {
    if (!folderOk) return;
    $('btnCache').textContent = '💾 Kaydediliyor...';
    let saved = 0;
    for (const [key, handle] of Object.entries(imageHandles)) {
      try {
        const f = await handle.getFile();
        const blob = await f.arrayBuffer();
        await DATA.dbPut('images', blob, key);
        saved++;
      } catch (e) { /* skip */ }
    }
    dbImagesReady = true;
    $('imgCnt').textContent = `${saved} fotoğraf önbellekte`;
    $('btnCache').style.display = 'none';
    $('btnCached').style.display = 'inline-flex';
    $('imgAct').classList.add('done');
  }
  
  async function showImage(productCode) {
    const img = $('imgEl'), no = $('imgNo');
    $('imgKod').textContent = productCode;
    const key = productCode.toUpperCase();
    
    // IndexedDB
    if (dbImagesReady) {
      try {
        let blob = await DATA.dbGet('images', key);
        if (!blob) {
          // Prefix match
          const allKeys = await DATA.dbGetAll('images');
          // Bu yöntem all keys'i getirmez, prefix match için ayrı yöntem lazım
        }
        if (blob) {
          const u = URL.createObjectURL(new Blob([blob]));
          img.onload = () => URL.revokeObjectURL(u);
          img.src = u;
          img.style.display = 'block';
          no.style.display = 'none';
          return;
        }
      } catch (e) { /* skip */ }
    }
    
    // Yerel klasör
    if (folderOk) {
      let h = imageHandles[key];
      if (!h) {
        for (const [ik, ih] of Object.entries(imageHandles)) {
          if (ik.startsWith(key)) { h = ih; break; }
        }
      }
      if (h) {
        try {
          const f = await h.getFile();
          const u = URL.createObjectURL(f);
          img.onload = () => URL.revokeObjectURL(u);
          img.src = u;
          img.style.display = 'block';
          no.style.display = 'none';
          return;
        } catch (e) { /* skip */ }
      }
    }
    
    img.style.display = 'none';
    no.style.display = 'block';
    no.innerHTML = (dbImagesReady || folderOk) ? '<b>GÖRSEL YOK</b>' : 'Klasör seçin veya<br>önbellek yükleyin';
  }
  
  // Cache bilgisi başlangıçta kontrol
  async function checkImageCache() {
    try {
      const d = await DATA.getDB();
      const tx = d.transaction('images', 'readonly');
      const r = tx.objectStore('images').count();
      r.onsuccess = () => {
        if (r.result > 0) {
          dbImagesReady = true;
          $('imgCnt').textContent = `${r.result} fotoğraf önbellekte`;
          $('btnCached').style.display = 'inline-flex';
          $('btnCache').style.display = 'none';
        }
      };
    } catch (e) { /* skip */ }
  }
  
  // ========== TAB SWITCH ==========
  
  function switchTab(tab) {
    currentTab = tab;
    const tabs = ['all', 'bek', 'hata', 'env', 'perf'];
    document.querySelectorAll('.tab').forEach((el, i) => {
      el.classList.toggle('active', tabs[i] === tab);
    });
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = $(`p${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (target) target.classList.remove('hidden');
    
    if (tab === 'all') renderAll();
    if (tab === 'bek') renderBek();
    if (tab === 'hata') renderHata();
    if (tab === 'env') renderEnv();
  }
  
  // ========== LOADING ==========
  
  function showLoading(msg) {
    $('loadingTxt').textContent = msg || 'Yükleniyor...';
    $('loadingOverlay').classList.remove('hidden');
  }
  
  function hideLoading() {
    $('loadingOverlay').classList.add('hidden');
  }
  
  // ========== ANA SONUÇ GÖSTERİMİ ==========
  
  function showResults(r) {
    $('uploadSection').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('hdStats').style.display = 'flex';
    
    buildAllRows(r);
    populateColFilters();
    
    // Özet kartlar
    $('s1').textContent = r.stats.merkezStok.toLocaleString('tr');
    $('s2').textContent = r.depoTransfers.length;
    $('s3').textContent = r.magTransfers.length;
    $('s4').textContent = r.kirikBeden.length;
    $('s5').textContent = r.stats.yeniSezonAdet.toLocaleString('tr');
    $('s6').textContent = r.stats.virmanAdet.toLocaleString('tr');
    if (document.getElementById('s7')) {
      document.getElementById('s7').textContent = '%' + (r.stats.guvenOrtalama || 0);
      if (document.getElementById('s7sub')) document.getElementById('s7sub').textContent = (r.stats.guvenUstu90 || 0) + '/' + (r.stats.guvenToplam || 0) + ' yüksek';
    }
    
    const totalAdet = r.depoTransfers.reduce((s, t) => s + t.distrib.reduce((x, d) => x + d.qty, 0), 0)
      + r.magTransfers.reduce((s, t) => s + t.adet, 0);
    
    $('hsTotal').textContent = (r.depoTransfers.length + r.magTransfers.length).toLocaleString('tr');
    $('hsDepo').textContent = r.depoTransfers.length.toLocaleString('tr');
    $('hsMag').textContent = r.magTransfers.length.toLocaleString('tr');
    $('hsAdet').textContent = totalAdet.toLocaleString('tr');
    
    if ($('tcAll')) $('tcAll').textContent = allRows.length;
    $('tcBek').textContent = r.bekleyen.length;
    $('tcHata').textContent = r.hataliTarih.length;
    
    $('stTxt').textContent = `${DATA.rawData.length.toLocaleString('tr')} satır işlendi · Butik Modele Özel Dağıtım v8.6 (Y26:15g · Virman:30g · Bayes)`;
    if (DATA.state && (DATA.state && DATA.state.lastAnalysisDate)) {
      $('stHistory').textContent = 'Son analiz: ' + (DATA.state && DATA.state.lastAnalysisDate).toLocaleString('tr');
    } else if (DATA.lastAnalysisDate) {
      $('stHistory').textContent = 'Son analiz: ' + new Date(DATA.lastAnalysisDate).toLocaleString('tr');
    }
    
    updateDashboard(r);
    renderAll();
    renderBek();
    renderHata();
    renderEnv();
  }
  
  function updateDashboard(r) {
    const totalAdet = r.depoTransfers.reduce((s, t) => s + t.distrib.reduce((x, d) => x + d.qty, 0), 0)
      + r.magTransfers.reduce((s, t) => s + t.adet, 0);
    
    $('dSum').innerHTML = `
      <div class="dash-row"><span class="lbl">Yeni Sezon Y26</span><span class="val ok">${r.stats.yeniSezonAdet}</span></div>
      <div class="dash-row"><span class="lbl">Virman</span><span class="val">${r.stats.virmanAdet}</span></div>
      <div class="dash-row"><span class="lbl dash-total">TOPLAM TRANSFER</span><span class="val dash-total">${totalAdet}</span></div>
      <div class="dash-row"><span class="lbl">Yeni Giriş / Yolda</span><span class="val by">${r.hataliTarih.length}</span></div>
    `;
    
    let storesHtml = '';
    for (const env of r.envanter) {
      const dot = `<span class="rd r${env.store.rank}"></span>`;
      const netCls = env.net > 0 ? 'ok' : env.net < 0 ? 'er' : '';
      storesHtml += `<div class="dash-row">
        <span class="lbl">${dot} ${env.store.label}</span>
        <span class="val">
          <span class="ok">↓${env.depoGelen + env.magGelen}</span>
          <span class="er">↑${env.giden}</span>
          <b class="${netCls}">${env.net > 0 ? '+' : ''}${env.net}</b>
        </span>
      </div>`;
    }
    $('dStores').innerHTML = storesHtml;
    
    // History
    if (typeof HISTORY !== 'undefined') HISTORY.renderDashboardList();
  }
  
  // ========== BİRLEŞİK TRANSFER SATIRLARI ==========
  // Depo + Mağaza Arası + Kırık Beden → tek normalize satır listesi.
  
  function buildAllRows(r) {
    allRows = [];
    
    // 1) DEPO TRANSFER
    for (const t of (r.depoTransfers || [])) {
      const hedefStore = t.distrib && t.distrib[0] ? t.distrib[0].store : t.hedef;
      allRows.push({
        tur: 'Depo',
        gonderen: t.gonderici ? t.gonderici.label : 'Merkez Depo',
        gonderenRank: 0,
        sezonTipi: t.sezonTipi, sezonDurum: t.sezonDurum || '',
        anaGrup: t.anaGrup || '-', altGrup: t.altGrup || '-',
        urunAdi: t.urunAdi || '', urunKodu: t.urunKodu || '',
        renk: t.renk || '', beden: String(t.beden || ''),
        takimDurumu: t.takimDurumu,
        guven: t.guvenEndeksi || t.confidence || 0,
        neden: t.neden || '', adet: t.adet || 0,
        hedef: hedefStore ? hedefStore.label : '-',
        hedefRank: hedefStore ? hedefStore.rank : 0,
        kategori: t.kategori,
      });
    }
    // 2) MAĞAZA ARASI
    for (const t of (r.magTransfers || [])) {
      allRows.push({
        tur: 'Mağaza',
        gonderen: t.gonderen ? t.gonderen.label : '-',
        gonderenRank: t.gonderen ? t.gonderen.rank : 0,
        sezonTipi: t.sezonTipi, sezonDurum: t.sezonDurum || '',
        anaGrup: t.anaGrup || '-', altGrup: t.altGrup || '-',
        urunAdi: t.urunAdi || '', urunKodu: t.urunKodu || '',
        renk: t.renk || '', beden: String(t.beden || ''),
        takimDurumu: t.takimDurumu,
        guven: t.guvenEndeksi || t.confidence || 0,
        neden: t.neden || '', adet: t.adet || 0,
        hedef: t.hedef ? t.hedef.label : '-',
        hedefRank: t.hedef ? t.hedef.rank : 0,
        kategori: t.kategori,
      });
    }
    // 3) KIRIK BEDEN (v8.8: FAZLA STOK ayrı tür olarak gösterilir)
    for (const k of (r.kirikBeden || [])) {
      const tur = k.transferTipi === 'FAZLA_STOK' ? 'Fazla Stok' : 'Kırık';
      allRows.push({
        tur,
        gonderen: k.gonderen ? k.gonderen.label : '-',
        gonderenRank: k.gonderen ? (k.gonderen.rank || 0) : 0,
        sezonTipi: k.sezonTipi, sezonDurum: k.sezonDurum || '',
        anaGrup: k.anaGrup || '-', altGrup: k.altGrup || '-',
        urunAdi: k.urunAdi || '', urunKodu: k.urunKodu || '',
        renk: k.renk || '', beden: String(k.beden || ''),
        takimDurumu: k.takimDurumu,
        guven: k.guvenEndeksi || k.confidence || 0,
        neden: (k.ikinciTur ? '🔄 İkinci-Tur · ' : (k.postTransfer ? '⚡ Transfer Sonrası · ' : '')) + (k.neden || ''),
        adet: k.adet || 0,
        hedef: k.hedef ? k.hedef.label : '-',
        hedefRank: k.hedef ? k.hedef.rank : 0,
        kategori: k.kategori,
      });
    }
  }
  
  // ========== SÜTUN FİLTRELERİ ==========
  
  function fillSelect(sel, values) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tümü</option>';
    [...new Set(values.filter(v => v !== undefined && v !== null && v !== ''))]
      .sort((a, b) => String(a).localeCompare(String(b), 'tr'))
      .forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = v;
        sel.appendChild(o);
      });
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }
  
  function populateColFilters() {
    document.querySelectorAll('.cf').forEach(el => {
      if (el.tagName !== 'SELECT') return;
      const col = el.getAttribute('data-col');
      if (col === 'guven') return; // sabit aralık seçenekleri
      if (col === 'takim') { fillSelect(el, ['Takım', 'Tek']); return; }
      if (col === 'tur') { fillSelect(el, ['Depo', 'Mağaza', 'Kırık', 'Fazla Stok']); return; }
      if (col === 'sezon') { fillSelect(el, ['YENI', 'VIRMAN']); return; }
      fillSelect(el, allRows.map(row => {
        if (col === 'takim') return row.takimDurumu === 'TAKIM' ? 'Takım' : 'Tek';
        return row[col];
      }));
    });
  }
  
  function getColFilters() {
    const f = {};
    document.querySelectorAll('.cf').forEach(el => {
      const col = el.getAttribute('data-col');
      const v = (el.value || '').trim();
      if (v) f[col] = el.tagName === 'SELECT' ? v : v.toLowerCase();
    });
    const s = (($('fSearch') && $('fSearch').value) || '').toLowerCase().trim();
    if (s) f._search = s;
    return f;
  }
  
  function getFilteredAll() {
    const f = getColFilters();
    return allRows.filter(row => {
      if (f.tur && row.tur !== f.tur) return false;
      if (f.gonderen && row.gonderen !== f.gonderen) return false;
      if (f.sezon && row.sezonTipi !== f.sezon) return false;
      if (f.sezonDurum && row.sezonDurum !== f.sezonDurum) return false;
      if (f.anaGrup && row.anaGrup !== f.anaGrup) return false;
      if (f.altGrup && row.altGrup !== f.altGrup) return false;
      if (f.renk && row.renk !== f.renk) return false;
      if (f.beden && row.beden !== f.beden) return false;
      if (f.hedef && row.hedef !== f.hedef) return false;
      if (f.takim) {
        const t = row.takimDurumu === 'TAKIM' ? 'Takım' : 'Tek';
        if (t !== f.takim) return false;
      }
      if (f.guven) {
        const g = row.guven || 0;
        if (f.guven === '90' && g < 90) return false;
        if (f.guven === '75' && (g < 75 || g >= 90)) return false;
        if (f.guven === '0' && g >= 75) return false;
      }
      if (f.urunAdi && !(row.urunAdi || '').toLowerCase().includes(f.urunAdi)) return false;
      if (f.urunKodu && !(row.urunKodu || '').toLowerCase().includes(f.urunKodu)) return false;
      if (f.neden && !(row.neden || '').toLowerCase().includes(f.neden)) return false;
      if (f._search && !(row.urunAdi || '').toLowerCase().includes(f._search)
          && !(row.urunKodu || '').toLowerCase().includes(f._search)) return false;
      return true;
    });
  }
  
  function applyColFilters() {
    currentPage.all = 1;
    renderAll();
  }
  
  function resetFilters() {
    document.querySelectorAll('.cf').forEach(el => { el.value = ''; });
    if ($('fSearch')) $('fSearch').value = '';
    applyColFilters();
  }
  
  // Geriye dönük uyumluluk (init.js / başka yerden çağrılırsa)
  function applyFilters() { applyColFilters(); }
  
  // ========== RENDER YARDIMCI ==========
  
  function categoryBadge(c) {
    if (!c) return '';
    return `<span class="ct ${c.cls}">${c.label}</span>`;
  }
  
  function sezonBadge(s) {
    if (s === 'YENI') return '<span class="badge bg" style="font-size:8px">Y26</span>';
    return '<span class="badge bv" style="font-size:8px">Virman</span>';
  }
  
  function takimBadge(v) {
    if (v === 'TAKIM') return '<span class="badge bg" style="font-size:7px">Takım</span>';
    return '<span class="badge bm" style="font-size:7px">Tek</span>';
  }
  
  function productLink(kod) {
    return `<span class="prod-link" onclick="UI.showImage('${kod}')">${kod}</span>`;
  }
  
  function performanceCell(perf) {
    const pct = Math.round(perf * 100);
    const cls = pct >= 70 ? 'perf-good' : pct >= 40 ? 'perf-mid' : 'perf-bad';
    return `<span class="perf-num ${cls}">%${pct}</span>`;
  }
  
  function formatDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d;
    try { return d.toLocaleDateString('tr'); } catch (e) { return ''; }
  }
  
  // ========== RENDER: TÜM TRANSFERLER (BİRLEŞİK) ==========
  
  function turBadge(tur) {
    const map = {
      'Depo':       { bg:'#EDE9FE', col:'#5B21B6', br:'#C4B5FD', ic:'📦' },
      'Mağaza':     { bg:'#DBEAFE', col:'#1E40AF', br:'#93C5FD', ic:'🔄' },
      'Kırık':      { bg:'#FEE2E2', col:'#991B1B', br:'#FCA5A5', ic:'⚠️' },
      'Fazla Stok': { bg:'#FEF3C7', col:'#92400E', br:'#FCD34D', ic:'📊' },
    };
    const m = map[tur] || map['Depo'];
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:${m.bg};color:${m.col};border:1px solid ${m.br};padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;white-space:nowrap">${m.ic} ${tur}</span>`;
  }
  
  function renderAll() {
    if (!DATA.lastAnalysis) return;
    const filtered = getFilteredAll();
    if ($('tcAll')) $('tcAll').textContent = filtered.length;
    
    const page = currentPage.all;
    const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbAll');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:20px;color:var(--mt)">Sonuç yok</td></tr>';
      renderPagination('all', filtered.length);
      return;
    }
    
    for (const row of slice) {
      const conf = row.guven || 0;
      const confColor = conf >= 90 ? '#059669' : conf >= 75 ? '#D97706' : '#DC2626';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${turBadge(row.tur)}</td>
        <td style="background:#FEF3C7;border-left:3px solid #B8864F;padding:4px 8px;font-weight:800;font-size:11px;color:#1F2937;text-transform:uppercase;letter-spacing:0.5px"><span class="rd r${row.gonderenRank}" style="display:inline-block;margin-right:4px"></span>${row.gonderen}</td>
        <td>${sezonBadge(row.sezonTipi)}</td>
        <td><span class="badge ${row.sezonTipi === 'YENI' ? 'bg' : 'bv'}" style="font-size:7px">${row.sezonDurum || ''}</span></td>
        <td><span class="badge bb" style="font-size:7px">${row.anaGrup || '-'}</span></td>
        <td><span class="badge bm" style="font-size:7px">${row.altGrup || '-'}</span></td>
        <td style="font-weight:600">${row.urunAdi}</td>
        <td>${productLink(row.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${row.renk}</td>
        <td style="font-family:var(--fm);font-weight:700${row.tur === 'Kırık' ? ';color:var(--er)' : ''}">${row.beden}</td>
        <td>${takimBadge(row.takimDurumu)}</td>
        <td><span class="perf-num" style="background:${confColor};color:white;padding:3px 6px;border-radius:4px;font-weight:700;font-size:11px;display:inline-block;min-width:42px;text-align:center">%${conf}</span></td>
        <td style="font-size:8px;color:var(--mt);font-style:italic">${row.neden}</td>
        <td style="font-family:var(--fm);color:var(--ok);font-weight:800;font-size:13px;text-align:center">${row.adet}</td>
        <td style="background:#D1FAE5;border-right:3px solid #059669;padding:4px 8px;font-weight:800;font-size:11px;color:#1F2937;text-transform:uppercase;letter-spacing:0.5px;text-align:right"><span class="rd r${row.hedefRank}" style="display:inline-block;margin-right:4px"></span>${row.hedef}</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('all', filtered.length);
  }

  
  // ========== RENDER: BEKLEYEN ==========
  
  function renderBek() {
    if (!DATA.lastAnalysis) return;
    const data = DATA.lastAnalysis.bekleyen;
    const page = currentPage.bek;
    const slice = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbBek');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--mt)">Bekleyen ürün yok</td></tr>';
      renderPagination('bek', data.length);
      return;
    }
    
    for (const b of slice) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sezonBadge(b.sezonTipi)}</td>
        <td>${productLink(b.urunKodu)}</td>
        <td>${categoryBadge(b.kategori)}</td>
        <td><span class="badge bm">${b.altGrup || '-'}</span></td>
        <td style="font-weight:600">${b.urunAdi}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${b.renk}</td>
        <td style="text-align:center">${b.bedenSayisi}</td>
        <td style="text-align:center;font-weight:700;color:var(--ok)">${b.toplamAdet}</td>
        <td style="font-size:8px;color:var(--mt);font-family:var(--fm)">${b.bedenler}</td>
        <td><span class="badge ${b.durum === 'Kırık Beden' ? 'br' : 'bb'}">${b.durum}</span></td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('bek', data.length);
  }
  
  // ========== RENDER: HATALI TARİH ==========
  
  function renderHata() {
    if (!DATA.lastAnalysis) return;
    const data = DATA.lastAnalysis.yolda || DATA.lastAnalysis.hataliTarih || [];
    const page = currentPage.hata;
    const slice = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbHata');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--mt)">Yolda/yeni giriş ürün yok ✓</td></tr>';
      renderPagination('hata', data.length);
      return;
    }
    
    for (const h of slice) {
      const tarihStr = h.magazaGiris
        ? new Date(h.magazaGiris).toLocaleDateString('tr')
        : (h.tarih || '1.1.1900');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600">${(h.store && h.store.label) || h.depo || '-'}</td>
        <td style="font-weight:600">${h.urunAdi || ''}</td>
        <td>${productLink(h.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${h.renk || ''}</td>
        <td style="font-family:var(--fm);font-weight:700">${h.beden || ''}</td>
        <td style="color:var(--warn);font-weight:600">${tarihStr}</td>
        <td style="text-align:center">${h.stok || 0}</td>
        <td style="text-align:center;color:var(--ac)">${h.satis || 0}</td>
        <td style="font-size:9px;color:var(--mt)">🚚 Yolda — mağaza henüz teslim almadı</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('hata', data.length);
  }
  
  // ========== RENDER: ENVANTER ==========
  
  function renderEnv() {
    if (!DATA.lastAnalysis) return;
    const data = DATA.lastAnalysis.envanter;
    const tb = $('tbEnv');
    tb.innerHTML = '';
    
    for (const e of data) {
      const perf = Math.round(e.performance * 100);
      const perfCls = perf >= 70 ? 'perf-good' : perf >= 40 ? 'perf-mid' : 'perf-bad';
      const netCls = e.net > 0 ? 'ok' : e.net < 0 ? 'er' : '';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700">${e.store.label}</td>
        <td><span class="sb2"><span class="rd r${e.store.rank}"></span>#${e.store.rank}</span></td>
        <td style="font-family:var(--fm);font-weight:600">${e.totalStok.toLocaleString('tr')}</td>
        <td style="font-family:var(--fm);color:var(--ac);font-weight:600">${e.totalSatis.toLocaleString('tr')}</td>
        <td><div class="perf-bar">
          <div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;min-width:40px">
            <div style="width:${perf}%;height:100%;background:var(--ac)"></div>
          </div>
          <span class="perf-num ${perfCls}">%${perf}</span>
        </div></td>
        <td><span class="badge ${e.eksikBeden > 10 ? 'br' : e.eksikBeden > 5 ? 'by' : 'bm'}">${e.eksikBeden}</span></td>
        <td class="ok" style="font-family:var(--fm);font-weight:600">${e.depoGelen > 0 ? '+' + e.depoGelen : '-'}</td>
        <td class="ok" style="font-family:var(--fm);font-weight:600">${e.magGelen > 0 ? '+' + e.magGelen : '-'}</td>
        <td class="er" style="font-family:var(--fm);font-weight:600">${e.giden > 0 ? '-' + e.giden : '-'}</td>
        <td class="${netCls}" style="font-family:var(--fm);font-weight:700">${e.net > 0 ? '+' : ''}${e.net}</td>
      `;
      tb.appendChild(tr);
    }
  }
  
  // ========== PAGINATION ==========
  
  function renderPagination(tab, total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const el = $(`pg${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (!el) return;
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    
    const p = currentPage[tab];
    let h = `<span class="pi">${(p - 1) * PAGE_SIZE + 1}-${Math.min(p * PAGE_SIZE, total)} / ${total}</span>`;
    h += `<button class="pb" ${p === 1 ? 'disabled' : ''} onclick="UI.gotoPage('${tab}', ${p - 1})">←</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - p) <= 2) {
        h += `<button class="pb ${i === p ? 'ac' : ''}" onclick="UI.gotoPage('${tab}', ${i})">${i}</button>`;
      } else if (Math.abs(i - p) === 3) {
        h += '…';
      }
    }
    
    h += `<button class="pb" ${p >= totalPages ? 'disabled' : ''} onclick="UI.gotoPage('${tab}', ${p + 1})">→</button>`;
    el.innerHTML = h;
  }
  
  function gotoPage(tab, page) {
    currentPage[tab] = page;
    if (tab === 'all') renderAll();
    if (tab === 'bek') renderBek();
    if (tab === 'hata') renderHata();
  }
  
  // ========== PUBLIC API ==========
  return {
    pickFolder,
    cacheImages,
    showImage,
    checkImageCache,
    dragOver,
    dragLeave,
    dropFile,
    switchTab,
    showLoading,
    hideLoading,
    showResults,
    applyColFilters,
    applyFilters,
    resetFilters,
    getVisibleRows: getFilteredAll,
    renderAll,
    renderBek,
    renderHata,
    renderEnv,
    gotoPage,
  };
})();

// Global erişim için window objesine ekle
if (typeof window !== "undefined") window.UI = UI;
