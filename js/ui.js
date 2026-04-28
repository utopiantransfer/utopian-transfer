// ============================================================
// UTOPIAN TRANSFER v7.0 — UI MODÜLÜ
// Tablo render, filtreler, görsel paneli
// ============================================================

const UI = (function() {
  
  const PAGE_SIZE = 50;
  let currentTab = 'depo';
  let currentPage = { depo: 1, mag: 1, kirik: 1, bek: 1, hata: 1 };
  
  // Görsel cache
  let imageHandles = {};
  let folderOk = false;
  let dbImagesReady = false;
  
  function $(id) { return document.getElementById(id); }
  
  // ========== GÖRSEL YÖNETİMİ ==========
  
  async function pickFolder() {
    try {
      const dh = await window.showDirectoryPicker({ mode: 'read' });
      imageHandles = {};
      let cnt = 0;
      for await (const [name, handle] of dh.entries()) {
        if (handle.kind === 'directory') {
          for await (const [fn, fh] of handle.entries()) {
            if (fh.kind === 'file' && /\.(jpg|jpeg|png|webp)$/i.test(fn)) {
              imageHandles[name.toUpperCase()] = fh;
              const base = name.replace(/-[A-Za-z]+$/, '');
              if (base !== name) imageHandles[base.toUpperCase()] = fh;
              cnt++;
              break;
            }
          }
        }
      }
      folderOk = true;
      $('imgCnt').textContent = `${cnt} fotoğraf bulundu`;
      $('btnCache').style.display = 'inline-flex';
      $('btnFolder').textContent = '✅ Klasör yüklendi';
    } catch (e) {
      if (e.name !== 'AbortError') alert(e.message);
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
    const tabs = ['depo', 'mag', 'kirik', 'bek', 'hata', 'env', 'perf'];
    document.querySelectorAll('.tab').forEach((el, i) => {
      el.classList.toggle('active', tabs[i] === tab);
    });
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = $(`p${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (target) target.classList.remove('hidden');
    
    if (tab === 'depo') renderDepo();
    if (tab === 'mag') renderMag();
    if (tab === 'kirik') renderKirik();
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
    
    populateFilters(r);
    
    // Özet kartlar
    $('s1').textContent = r.stats.merkezStok.toLocaleString('tr');
    $('s2').textContent = r.depoTransfers.length;
    $('s3').textContent = r.magTransfers.length;
    $('s4').textContent = r.kirikBeden.length;
    $('s5').textContent = r.stats.yeniSezonAdet.toLocaleString('tr');
    $('s6').textContent = r.stats.virmanAdet.toLocaleString('tr');
    if ($('catTekstil')) $('catTekstil').textContent = (r.categoryOzet?.TEKSTIL_DIS || 0).toLocaleString('tr');
    if ($('catCanta')) $('catCanta').textContent = (r.categoryOzet?.CANTA || 0).toLocaleString('tr');
    if ($('catAyakkabi')) $('catAyakkabi').textContent = (r.categoryOzet?.AYAKKABI || 0).toLocaleString('tr');
    if ($('catAksesuar')) $('catAksesuar').textContent = (r.categoryOzet?.AKSESUAR || 0).toLocaleString('tr');
    if ($('seasonSenderSummary')) {
      const ss = Object.values(r.seasonSenderOzet || {});
      $('seasonSenderSummary').innerHTML = ss.length
        ? '<b>Sezon / Gönderici Depo:</b> ' + ss.map(x => `<span class="chip">${x.sezonTipi === 'YENI' ? 'Y26' : 'Virman'} · ${x.gonderen}: <b>${Number(x.adet).toLocaleString('tr')}</b></span>`).join(' ')
        : '';
    }
    
    const totalAdet = r.depoTransfers.reduce((s, t) => s + t.distrib.reduce((x, d) => x + d.qty, 0), 0)
      + r.magTransfers.reduce((s, t) => s + t.adet, 0);
    
    $('hsTotal').textContent = (r.depoTransfers.length + r.magTransfers.length).toLocaleString('tr');
    $('hsDepo').textContent = r.depoTransfers.length.toLocaleString('tr');
    $('hsMag').textContent = r.magTransfers.length.toLocaleString('tr');
    $('hsAdet').textContent = totalAdet.toLocaleString('tr');
    
    $('tcDepo').textContent = r.depoTransfers.length;
    $('tcMag').textContent = r.magTransfers.length;
    $('tcKirik').textContent = r.kirikBeden.length;
    $('tcBek').textContent = r.bekleyen.length;
    $('tcHata').textContent = r.hataliTarih.length;
    
    $('stTxt').textContent = `${DATA.rawData.length.toLocaleString('tr')} satır işlendi · Performans bazlı dağıtım v8.0`;
    if (DATA.state.lastAnalysisDate) {
      $('stHistory').textContent = 'Son analiz: ' + DATA.state.lastAnalysisDate.toLocaleString('tr');
    }
    
    updateDashboard(r);
    renderDepo();
    renderMag();
    renderKirik();
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
      <div class="dash-row"><span class="lbl">Hatalı Tarih</span><span class="val er">${r.hataliTarih.length}</span></div>
    `;
    
    let storesHtml = '';
    for (const env of r.envanterOzet) {
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
  
  // ========== FİLTRELER ==========
  
  function populateFilters(r) {
    // Alt Grup
    const altGruplar = [...new Set([
      ...r.depoTransfers.map(t => t.altGrup),
      ...r.magTransfers.map(t => t.altGrup),
    ].filter(Boolean))].sort();
    const fA = $('fAltGrup');
    fA.innerHTML = '<option value="">Tümü</option>';
    altGruplar.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g; opt.textContent = g;
      fA.appendChild(opt);
    });
    
    // Hedef
    const fH = $('fHedef');
    fH.innerHTML = '<option value="">Tümü</option>';
    ALGO.STORES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.key; opt.textContent = s.label;
      fH.appendChild(opt);
    });
    
    // Gönderen
    const fG = $('fGonderen');
    fG.innerHTML = '<option value="">Tümü</option><option value="MERKEZ">Merkez Depo</option>';
    ALGO.STORES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.key; opt.textContent = s.label;
      fG.appendChild(opt);
    });
  }
  
  function getFilters() {
    return {
      sezon: $('fSezon').value,
      kategori: $('fKategori').value,
      altGrup: $('fAltGrup').value,
      takim: $('fTakim').value,
      hedef: $('fHedef').value,
      gonderen: $('fGonderen').value,
      search: $('fSearch').value.toLowerCase().trim(),
    };
  }
  
  function applyFilters() {
    currentPage.depo = 1;
    currentPage.mag = 1;
    currentPage.kirik = 1;
    currentPage.bek = 1;
    renderDepo();
    renderMag();
    renderKirik();
    renderBek();
    if (DATA.lastAnalysis) updateDashboard(DATA.lastAnalysis);
  }
  
  function resetFilters() {
    ['fSezon', 'fKategori', 'fAltGrup', 'fTakim', 'fHedef', 'fGonderen', 'fSearch'].forEach(id => {
      $(id).value = '';
    });
    applyFilters();
  }
  
  function getFilteredDepo() {
    if (!DATA.lastAnalysis) return [];
    const f = getFilters();
    return DATA.lastAnalysis.depoTransfers.filter(t => {
      if (f.sezon && t.sezonTipi !== f.sezon) return false;
      if (f.kategori && t.kategori?.code !== f.kategori) return false;
      if (f.altGrup && t.altGrup !== f.altGrup) return false;
      if (f.takim) {
        const isT = t.takimDurumu === 'TAKIM';
        if (f.takim === 'TAKIM' && !isT) return false;
        if (f.takim === 'DEGIL' && isT) return false;
      }
      if (f.hedef && !t.distrib.some(d => d.store.key === f.hedef)) return false;
      if (f.gonderen && f.gonderen !== 'MERKEZ') return false;
      if (f.search && !(t.urunAdi || '').toLowerCase().includes(f.search) && !(t.urunKodu || '').toLowerCase().includes(f.search)) return false;
      return true;
    });
  }
  
  function getFilteredMag() {
    if (!DATA.lastAnalysis) return [];
    const f = getFilters();
    return DATA.lastAnalysis.magTransfers.filter(t => {
      if (f.sezon && t.sezonTipi !== f.sezon) return false;
      if (f.kategori && t.kategori?.code !== f.kategori) return false;
      if (f.altGrup && t.altGrup !== f.altGrup) return false;
      if (f.takim) {
        const isT = t.takimDurumu === 'TAKIM';
        if (f.takim === 'TAKIM' && !isT) return false;
        if (f.takim === 'DEGIL' && isT) return false;
      }
      if (f.hedef && t.hedef.key !== f.hedef) return false;
      if (f.gonderen && f.gonderen !== 'MERKEZ' && t.gonderen.key !== f.gonderen) return false;
      if (f.search && !(t.urunAdi || '').toLowerCase().includes(f.search) && !(t.urunKodu || '').toLowerCase().includes(f.search)) return false;
      return true;
    });
  }
  


  function getFilteredKirik() {
    if (!DATA.lastAnalysis) return [];
    const f = getFilters();
    return DATA.lastAnalysis.kirikBeden.filter(t => {
      if (f.sezon && t.sezonTipi !== f.sezon) return false;
      if (f.kategori && t.kategori?.code !== f.kategori) return false;
      if (f.altGrup && t.altGrup !== f.altGrup) return false;
      if (f.hedef && t.hedef.key !== f.hedef) return false;
      if (f.gonderen && f.gonderen !== 'MERKEZ' && t.gonderen?.key !== f.gonderen) return false;
      if (f.search && !(t.urunAdi || '').toLowerCase().includes(f.search) && !(t.urunKodu || '').toLowerCase().includes(f.search)) return false;
      return true;
    });
  }

  function getFilteredBek() {
    if (!DATA.lastAnalysis) return [];
    const f = getFilters();
    return DATA.lastAnalysis.bekleyen.filter(t => {
      if (f.sezon && t.sezonTipi !== f.sezon) return false;
      if (f.kategori && t.kategori?.code !== f.kategori) return false;
      if (f.altGrup && t.altGrup !== f.altGrup) return false;
      if (f.search && !(t.urunAdi || '').toLowerCase().includes(f.search) && !(t.urunKodu || '').toLowerCase().includes(f.search)) return false;
      return true;
    });
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
  
  // ========== RENDER: DEPO TRANSFER ==========
  
  function renderDepo() {
    const filtered = getFilteredDepo();
    $('tcDepo').textContent = filtered.length;
    
    const page = currentPage.depo;
    const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbDepo');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="17" style="text-align:center;padding:20px;color:var(--mt)">Sonuç yok</td></tr>';
      renderPagination('depo', filtered.length);
      return;
    }
    
    for (const t of slice) {
      // Mağaza durumu satırı
      const sH = t.storeStatus.map(s => {
        const stColor = s.stok > 0 ? '#d1fae5' : '#fee2e2';
        const brColor = s.stok > 0 ? '#6ee7b7' : '#fca5a5';
        return `<span title="${s.store.label} | Stok:${s.stok} Satış:${s.satis} Perf:%${Math.round(s.totalPerf*100)}" 
          style="display:inline-flex;align-items:center;gap:1px;font-family:var(--fm);font-size:7px;padding:0 3px;border-radius:2px;background:${stColor};border:1px solid ${brColor};margin:1px">
          <span class="rd r${s.store.rank}" style="width:3px;height:3px"></span>${s.stok > 0 ? s.stok : '✗'}${s.satis > 0 ? `<sub>${s.satis}↑</sub>` : ''}
        </span>`;
      }).join('');
      
      // Transfer önerisi
      const dH = t.distrib.map(d => `<span class="chip">
        <span class="rd r${d.store.rank}" style="width:3px;height:3px"></span>
        ${d.qty}ad. ${d.store.label} <small>(%${Math.round(d.performance * 100)})</small>
      </span>`).join(' ');
      
      // Skor (en iyi performansa göre)
      const score = t.distrib[0] ? Math.round(t.distrib[0].performance * 100) : 0;
      const scoreCls = score >= 70 ? 'perf-good' : score >= 40 ? 'perf-mid' : 'perf-bad';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sezonBadge(t.sezonTipi)}</td>
        <td><span class="badge bm">${t.malGrubu || '-'}</span></td>
        <td><span class="badge bm">${t.anaGrup || '-'}</span></td>
        <td>${categoryBadge(t.kategori)}</td>
        <td><span class="badge bm">${t.altGrup || '-'}</span></td>
        <td style="font-weight:600">${t.urunAdi}</td>
        <td>${productLink(t.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${t.renk}</td>
        <td style="font-family:var(--fm);font-weight:700">${t.beden}</td>
        <td style="font-family:var(--fm);color:var(--ok);font-weight:700">${t.depoStok}</td>
        <td><span class="badge bm">${t.gonderenDepoAdi || 'Merkez Depo'}</span></td>
        <td>${takimBadge(t.takimDurumu)}</td>
        <td><span class="badge bm">${t.takimKod || '-'}</span></td>
        <td>${sH}</td>
        <td>${dH}</td>
        <td><span class="perf-num ${scoreCls}">%${score}</span></td>
        <td style="font-size:8px;color:var(--mt);font-style:italic">${t.neden}</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('depo', filtered.length);
  }
  
  // ========== RENDER: MAĞAZA ARASI ==========
  
  function renderMag() {
    const filtered = getFilteredMag();
    $('tcMag').textContent = filtered.length;
    
    const page = currentPage.mag;
    const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbMag');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="17" style="text-align:center;padding:20px;color:var(--mt)">Sonuç yok</td></tr>';
      renderPagination('mag', filtered.length);
      return;
    }
    
    for (const t of slice) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sezonBadge(t.sezonTipi)}</td>
        <td><span class="sb2"><span class="rd r${t.gonderen.rank}"></span>${t.gonderen.label}</span></td>
        <td><span class="badge bm">${t.malGrubu || '-'}</span></td>
        <td><span class="badge bm">${t.anaGrup || '-'}</span></td>
        <td>${categoryBadge(t.kategori)}</td>
        <td><span class="badge bm">${t.altGrup || '-'}</span></td>
        <td style="font-weight:600">${t.urunAdi}</td>
        <td>${productLink(t.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${t.renk}</td>
        <td style="font-family:var(--fm);font-weight:700">${t.beden}</td>
        <td style="font-family:var(--fm);color:var(--ok);font-weight:700">${t.adet}</td>
        <td style="font-size:8px">${formatDate(t.giris)}</td>
        <td>${takimBadge(t.takimDurumu)}</td>
        <td><span class="badge bm">${t.takimKod || '-'}</span></td>
        <td><span class="chip"><span class="rd r${t.hedef.rank}" style="width:3px;height:3px"></span>${t.adet}ad. ${t.hedef.label}</span></td>
        <td><span class="perf-num ${t.confidence >= 70 ? 'perf-good' : 'perf-mid'}">%${t.confidence}</span></td>
        <td style="font-size:8px;color:var(--mt);font-style:italic">${t.neden}</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('mag', filtered.length);
  }
  
  // ========== RENDER: KIRIK BEDEN ==========
  
  function renderKirik() {
    if (!DATA.lastAnalysis) return;
    const data = getFilteredKirik();
    const page = currentPage.kirik;
    const slice = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbKirik');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--mt)">Kırık beden yok</td></tr>';
      renderPagination('kirik', data.length);
      return;
    }
    
    for (const k of slice) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sezonBadge(k.sezonTipi)}</td>
        <td><span class="sb2"><span class="rd r${k.gonderen.rank || 0}"></span>${k.gonderen.label}</span></td>
        <td style="font-family:var(--fm);font-size:8px">${k.lokasyonKey || '-'}</td>
        <td><span class="badge bm">${k.malGrubu || '-'}</span></td>
        <td><span class="badge bm">${k.anaGrup || '-'}</span></td>
        <td><span class="badge bm">${k.altGrup || '-'}</span></td>
        <td style="font-weight:600">${k.urunAdi}</td>
        <td>${productLink(k.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${k.renk}</td>
        <td style="font-family:var(--fm);font-weight:700">${k.beden}</td>
        <td><span class="badge br">${k.adet}</span></td>
        <td><span class="badge by">${k.mevcutBedenSayisi || 1}/${k.uretilenBedenSayisi || '-'}</span></td>
        <td><span class="chip"><span class="rd r${k.hedef.rank}" style="width:3px;height:3px"></span>${k.hedef.label}</span></td>
        <td style="font-size:8px;color:var(--mt);font-style:italic">${k.neden}</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('kirik', data.length);
  }
  
  // ========== RENDER: BEKLEYEN ==========
  
  function renderBek() {
    if (!DATA.lastAnalysis) return;
    const data = getFilteredBek();
    const page = currentPage.bek;
    const slice = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbBek');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--mt)">Bekleyen ürün yok</td></tr>';
      renderPagination('bek', data.length);
      return;
    }
    
    for (const b of slice) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sezonBadge(b.sezonTipi)}</td>
        <td>${productLink(b.urunKodu)}</td>
        <td><span class="badge bm">${b.malGrubu || '-'}</span></td>
        <td><span class="badge bm">${b.anaGrup || '-'}</span></td>
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
    const data = DATA.lastAnalysis.hataliTarih;
    const page = currentPage.hata;
    const slice = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const tb = $('tbHata');
    tb.innerHTML = '';
    
    if (!slice.length) {
      tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--mt)">Hatalı tarih yok ✓</td></tr>';
      renderPagination('hata', data.length);
      return;
    }
    
    for (const h of slice) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.depo}</td>
        <td style="font-weight:600">${h.urunAdi}</td>
        <td>${productLink(h.urunKodu)}</td>
        <td style="font-family:var(--fm);color:var(--ac2);font-size:9px">${h.renk}</td>
        <td style="font-family:var(--fm);font-weight:700">${h.beden}</td>
        <td style="color:var(--er);font-weight:600">${h.tarih}</td>
        <td style="text-align:center">${h.stok}</td>
        <td style="text-align:center;color:var(--ac)">${h.satis}</td>
        <td style="font-size:9px;color:var(--mt)">${h.sebep}</td>
      `;
      tb.appendChild(tr);
    }
    
    renderPagination('hata', data.length);
  }
  
  // ========== RENDER: ENVANTER ==========
  
  function renderEnv() {
    if (!DATA.lastAnalysis) return;
    const data = DATA.lastAnalysis.envanterOzet;
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
    if (tab === 'depo') renderDepo();
    if (tab === 'mag') renderMag();
    if (tab === 'kirik') renderKirik();
    if (tab === 'bek') renderBek();
    if (tab === 'hata') renderHata();
  }
  
  // ========== PUBLIC API ==========
  return {
    pickFolder,
    cacheImages,
    showImage,
    checkImageCache,
    switchTab,
    showLoading,
    hideLoading,
    showResults,
    populateFilters,
    getFilters,
    applyFilters,
    resetFilters,
    getFilteredDepo,
    getFilteredMag,
    getFilteredKirik,
    getFilteredBek,
    renderDepo,
    renderMag,
    renderKirik,
    renderBek,
    renderHata,
    renderEnv,
    gotoPage,
  };
})();
