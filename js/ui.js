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
  
  // ========== GÖRSEL YÖNETİMİ (v8.10 — kalıcı + artımlı) ==========
  // Tasarım:
  //  - Klasör seçilince TÜM ürün klasörleri taranır.
  //  - Bellekte (IndexedDB) OLMAYAN fotoğraflar otomatik kaydedilir (artımlı).
  //  - Bir kez yüklenen fotoğraf kalıcıdır; tarayıcı/güncelleme silmez.
  //  - Son güncelleme tarihi saklanır ve ekranda gösterilir.
  //  - 2 hafta sonra yeni ürün gelirse: aynı klasör seçilir, SADECE yeni
  //    (bellekte olmayan) fotoğraflar eklenir — tümü yeniden yüklenmez.

  let pickerBusy = false;   // showDirectoryPicker çift-tık kilidi

  async function pickFolder() {
    // KİLİT: "File picker already active" hatasını önler
    if (pickerBusy) return;
    pickerBusy = true;
    const btn = $('btnFolder');
    const origLabel = btn ? btn.textContent : '';
    try {
      if (!window.showDirectoryPicker) {
        alert('Tarayıcınız klasör seçmeyi desteklemiyor. Lütfen Chrome veya Edge kullanın.');
        return;
      }
      const dh = await window.showDirectoryPicker({ mode: 'read' });
      if (btn) btn.textContent = '⏳ Taranıyor...';

      // Bellekte zaten kayıtlı SKU anahtarları (artımlı yükleme için)
      let mevcutKeys = new Set();
      try {
        const keys = await DATA.dbGetAllKeys('images');
        mevcutKeys = new Set(keys);
      } catch (e) { /* ilk kez — boş */ }

      const photoRegex = /\.(jpg|jpeg|png|webp|gif|tiff|tif|bmp|svg|heic|heif|ico)$/i;
      imageHandles = {};
      let bulunan = 0;

      // Bir klasör handle'ından ilk fotoğrafı bul (alt klasörler dahil)
      async function ilkFotograf(handle) {
        try {
          for await (const [fn, fh] of handle.entries()) {
            if (fh.kind === 'file' && photoRegex.test(fn)) return fh;
          }
        } catch (e) {}
        for (const sub of ['ColorPhotos', 'MiscPhotos']) {
          try {
            const sd = await handle.getDirectoryHandle(sub).catch(() => null);
            if (sd) {
              for await (const [fn, fh] of sd.entries()) {
                if (fh.kind === 'file' && photoRegex.test(fn)) return fh;
              }
            }
          } catch (e) {}
        }
        try {
          for await (const [sn, sh] of handle.entries()) {
            if (sh.kind === 'directory') {
              for await (const [fn, fh] of sh.entries()) {
                if (fh.kind === 'file' && photoRegex.test(fn)) return fh;
              }
            }
          }
        } catch (e) {}
        return null;
      }

      // Klasördeki TÜM ürün klasörlerini tara
      for await (const [name, handle] of dh.entries()) {
        let found = null, baseName = null;
        if (handle.kind === 'directory') {
          found = await ilkFotograf(handle);
          baseName = name;
        } else if (handle.kind === 'file' && photoRegex.test(name)) {
          found = handle;
          baseName = name.replace(/\.[^.]+$/, '');
        }
        if (found && baseName) {
          const up = baseName.toUpperCase();
          imageHandles[up] = found;
          const noColor = baseName.replace(/-[A-Za-z0-9]+$/, '').toUpperCase();
          if (noColor !== up) imageHandles[noColor] = found;
          const shortB = baseName.replace(/-([A-Za-z])([A-Za-z]+)$/, '-$1').toUpperCase();
          if (shortB !== up) imageHandles[shortB] = found;
          bulunan++;
        }
      }

      folderOk = true;

      // ARTIMLI KAYDETME: sadece bellekte OLMAYAN fotoğrafları kaydet
      const tumKeyler = Object.keys(imageHandles);
      const yeniKeyler = tumKeyler.filter(k => !mevcutKeys.has(k));

      if (yeniKeyler.length === 0) {
        $('imgCnt').innerHTML = `<b>${mevcutKeys.size}</b> fotoğraf bellekte · yeni fotoğraf yok ✓`;
        if (btn) btn.textContent = '✅ Güncel';
        await gosterGuncellemeTarihi();
        return;
      }

      if (btn) btn.textContent = `💾 ${yeniKeyler.length} yeni kaydediliyor...`;
      let kaydedilen = 0;
      for (const key of yeniKeyler) {
        try {
          const f = await imageHandles[key].getFile();
          const blob = await f.arrayBuffer();
          await DATA.dbPut('images', blob, key);
          kaydedilen++;
          if (kaydedilen % 25 === 0 && btn) {
            btn.textContent = `💾 ${kaydedilen}/${yeniKeyler.length}...`;
          }
        } catch (e) { /* tek dosya hatası — atla */ }
      }

      // Son güncelleme tarihini sakla
      const simdi = new Date().toISOString();
      await DATA.dbPut('imageMeta', simdi, 'lastUpdate');
      const toplam = mevcutKeys.size + kaydedilen;
      await DATA.dbPut('imageMeta', toplam, 'count');

      dbImagesReady = true;
      $('imgCnt').innerHTML = `<b>${toplam}</b> fotoğraf bellekte · <b>${kaydedilen}</b> yeni eklendi ✓`;
      if (btn) btn.textContent = '✅ Klasör yüklendi';
      $('btnCache').style.display = 'none';
      $('btnCached').style.display = 'inline-flex';
      $('imgAct').classList.add('done');
      await gosterGuncellemeTarihi();
      console.log(`Fotoğraf: ${bulunan} bulundu, ${kaydedilen} yeni kaydedildi, toplam ${toplam} bellekte.`);

    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('pickFolder hatası:', e);
        alert('Klasör okuma hatası: ' + e.message);
      }
      if (btn) btn.textContent = origLabel || '📁 Klasör Seç';
    } finally {
      pickerBusy = false;   // KİLİDİ AÇ
    }
  }

  // cacheImages artık pickFolder içinde otomatik — buton geriye dönük dursun
  async function cacheImages() {
    // Yeni akışta kaydetme pickFolder içinde otomatik yapılıyor.
    $('btnCache').style.display = 'none';
  }

  // Son güncelleme tarihini ekranda göster
  async function gosterGuncellemeTarihi() {
    try {
      const iso = await DATA.dbGet('imageMeta', 'lastUpdate');
      if (iso) {
        const d = new Date(iso);
        const el = $('imgDate');
        if (el) {
          el.textContent = '📅 Son fotoğraf güncellemesi: ' + d.toLocaleString('tr');
          el.style.display = 'block';
        }
      }
    } catch (e) { /* skip */ }
  }

  async function showImage(productCode) {
    const img = $('imgEl'), no = $('imgNo');
    $('imgKod').textContent = productCode;
    const key = productCode.toUpperCase();

    // 1) IndexedDB — kalıcı bellek
    if (dbImagesReady) {
      try {
        let blob = await DATA.dbGet('images', key);
        if (!blob) {
          // Renk eki olmadan dene
          const noColor = key.replace(/-[A-Za-z0-9]+$/, '');
          if (noColor !== key) blob = await DATA.dbGet('images', noColor);
        }
        if (!blob) {
          // Prefix eşleşmesi (tüm anahtarlar arasında)
          const keys = await DATA.dbGetAllKeys('images');
          const m = keys.find(k => k.startsWith(key) || key.startsWith(k));
          if (m) blob = await DATA.dbGet('images', m);
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

    // 2) Yerel klasör (oturum içi)
    if (folderOk) {
      let h = imageHandles[key];
      if (!h) {
        for (const [ik, ih] of Object.entries(imageHandles)) {
          if (ik.startsWith(key) || key.startsWith(ik)) { h = ih; break; }
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
    no.innerHTML = (dbImagesReady || folderOk) ? '<b>GÖRSEL YOK</b>' : 'Klasör seçin';
  }

  // Başlangıçta önbellek durumunu kontrol et
  async function checkImageCache() {
    try {
      const keys = await DATA.dbGetAllKeys('images');
      if (keys && keys.length > 0) {
        dbImagesReady = true;
        $('imgCnt').innerHTML = `<b>${keys.length}</b> fotoğraf bellekte ✓`;
        $('btnCached').style.display = 'inline-flex';
        $('btnCache').style.display = 'none';
        $('btnFolder').textContent = '📁 Yeni Fotoğraf Ekle';
        await gosterGuncellemeTarihi();
      }
    } catch (e) { /* skip */ }
  }
  
  // ========== TRANSFER MODU (v8.13) ==========
  // İki kutucuk: "Sadece Depodan" + "Mağaza Arası + Kırık".
  //   - İkisi de seçili → depo + mağaza + kırık (tam analiz)
  //   - Sadece depo → yalnızca depodan beden tamamlama
  //   - Sadece mağaza → mağaza arası + kırık (depo atlanır)
  function updateTransferMode() {
    const cd = $('chkDepo'), cm = $('chkMag');
    if (!cd || !cm) return;
    if (!cd.checked && !cm.checked) cd.checked = true;  // en az biri açık
    const ld = $('lblDepo'), lm = $('lblMag');
    if (ld) ld.classList.toggle('on', cd.checked);
    if (lm) lm.classList.toggle('on', cm.checked);
  }
  
  function getTransferMode() {
    const cd = $('chkDepo'), cm = $('chkMag');
    return { depo: cd ? cd.checked : true, magaza: cm ? cm.checked : true };
  }
  
  // ========== SEZON BAŞLANGIÇ TARİHİ (v8.13) ==========
  // Kullanıcı her sezon için başlangıç tarihini girer (Y26 → 16.02.2026,
  //   K27 → 31.08.2026 gibi). Sezon kodu↔tarih eşlemesi kalıcı saklanır.
  async function saveSeasonStart() {
    const kod = ($('newSeasonInput') ? $('newSeasonInput').value : 'Y26').toUpperCase().trim() || 'Y26';
    const tarih = $('seasonStartInput') ? $('seasonStartInput').value : '';
    if (!tarih) return;
    // Etiketi güncelle
    const lbl = $('seasonStartLabel');
    if (lbl) {
      const d = new Date(tarih);
      lbl.textContent = isNaN(d) ? tarih : d.toLocaleDateString('tr');
    }
    // Kalıcı sakla: { sezonKodu: ISOtarih }
    try {
      let harita = await DATA.dbGet('settings', 'seasonStarts');
      if (!harita || typeof harita !== 'object') harita = {};
      harita[kod] = tarih;
      await DATA.dbPut('settings', harita, 'seasonStarts');
      console.log('Sezon başlangıcı kaydedildi:', kod, '→', tarih);
    } catch (e) { console.warn('Sezon tarihi kaydedilemedi:', e); }
  }
  
  // Sayfa açılışında kayıtlı sezon tarihini yükle
  async function loadSeasonStart() {
    try {
      const harita = await DATA.dbGet('settings', 'seasonStarts');
      if (!harita) return;
      const kod = ($('newSeasonInput') ? $('newSeasonInput').value : 'Y26').toUpperCase().trim() || 'Y26';
      if (harita[kod] && $('seasonStartInput')) {
        $('seasonStartInput').value = harita[kod];
        const lbl = $('seasonStartLabel');
        if (lbl) {
          const d = new Date(harita[kod]);
          lbl.textContent = isNaN(d) ? harita[kod] : d.toLocaleDateString('tr');
        }
      }
    } catch (e) { /* ilk kez */ }
  }
  
  // ========== TAB SWITCH ==========
  
  function switchTab(tab) {
    currentTab = tab;
    const tabs = ['all', 'bek', 'hata', 'env', 'dna', 'perf'];
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
    if (tab === 'dna') renderDna();
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
  
  // ========== ÇALIŞMAYI KAYDET (v8.11) ==========
  // Mevcut analizi geçmişe (IndexedDB) kaydeder. Sayfa yenilense bile
  //   kayıt kalır; "Önceki Transfer Çalışmaları" listesinden çift
  //   tıklayarak geri açılabilir, Excel'i yeniden indirilebilir.
  async function saveCurrentAnalysis() {
    if (!DATA.lastAnalysis) {
      alert('Kaydedilecek bir analiz yok. Önce transfer analizi çalıştırın.');
      return;
    }
    try {
      const ok = await HISTORY.saveCurrent(DATA.lastAnalysis);
      if (ok) {
        alert('✅ Transfer çalışması kaydedildi.\n\n"Önceki Transfer Çalışmaları" listesinde görebilir,\nüzerine çift tıklayarak tekrar açabilirsiniz.');
      } else {
        alert('Kayıt sırasında bir sorun oluştu. F12 → Console kontrol edin.');
      }
    } catch (e) {
      alert('Kayıt hatası: ' + e.message);
    }
  }
  
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
  
  // ========== MAĞAZA × KATEGORİ DNA ==========
  
  function renderDna() {
    if (!DATA.lastAnalysis || !DATA.lastAnalysis.stats) return;
    const dna = DATA.lastAnalysis.stats.categoryDNA;
    const head = $('dnaHead');
    const tb = $('tbDna');
    if (!dna || Object.keys(dna).length === 0) {
      tb.innerHTML = '<tr><td style="padding:20px;color:var(--mt)">DNA verisi yok — bir analiz çalıştırın.</td></tr>';
      return;
    }
    // Mağaza listesini topla (DNA'da geçen tüm mağazalar)
    const stores = [];
    const seen = new Set();
    for (const ag of Object.keys(dna)) {
      for (const sk of Object.keys(dna[ag])) {
        if (!seen.has(sk)) { seen.add(sk); stores.push(sk); }
      }
    }
    // ALGO.STORES sırasına göre düzenle (rank)
    const ordered = (typeof ALGO !== 'undefined' && ALGO.STORES)
      ? ALGO.STORES.filter(s => seen.has(s.key))
      : stores.map(k => ({ key: k, label: k }));
    
    // Başlık
    head.innerHTML = '<th>KATEGORİ (ANA GRUP)</th>' +
      ordered.map(s => `<th style="text-align:center">${s.label}</th>`).join('');
    
    // Satırlar — kategori bazında
    const cats = Object.keys(dna).sort();
    tb.innerHTML = cats.map(ag => {
      const cells = ordered.map(s => {
        const d = dna[ag][s.key];
        if (!d) return '<td style="text-align:center;color:#cbd5e1">—</td>';
        const v = d.dna;
        // Renk: güçlü=yeşil, ortalama=nötr, zayıf=kırmızı
        let bg = '#f1f5f9', col = '#475569';
        if (v >= 1.25) { bg = '#d1fae5'; col = '#065f46'; }
        else if (v >= 1.05) { bg = '#ecfdf5'; col = '#047857'; }
        else if (v <= 0.75) { bg = '#fee2e2'; col = '#991b1b'; }
        else if (v <= 0.95) { bg = '#fef3c7'; col = '#92400e'; }
        return `<td style="text-align:center;background:${bg};color:${col};font-weight:700;font-family:var(--fm)">${v.toFixed(2)}<br><span style="font-size:8px;font-weight:400">%${d.pay} pay</span></td>`;
      }).join('');
      return `<tr><td style="font-weight:700">${ag}</td>${cells}</tr>`;
    }).join('');
  }
  
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
    saveCurrentAnalysis,
    updateTransferMode,
    getTransferMode,
    saveSeasonStart,
    loadSeasonStart,
    getVisibleRows: getFilteredAll,
    renderAll,
    renderBek,
    renderHata,
    renderEnv,
    renderDna,
    gotoPage,
  };
})();

// Global erişim için window objesine ekle
if (typeof window !== "undefined") window.UI = UI;
