// ============================================================
// UTOPIAN TRANSFER v7.0 — TARİHÇE MODÜLÜ
// IndexedDB tabanlı transfer geçmişi
// ============================================================

const HISTORY = (function() {
  
  function $(id) { return document.getElementById(id); }
  
  // Hafta numarasını hesapla (yılın kaçıncı haftası)
  function getWeekNumber(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }
  
  function generateName(date) {
    const d = date || new Date();
    const week = getWeekNumber(d);
    const dStr = d.toLocaleDateString('tr');
    return `${week}. HAFTA UTOPIAN TRANSFER (${dStr})`;
  }
  
  // ========== KAYDET ==========
  
  async function saveCurrent(analysis) {
    if (!analysis) return;
    
    const date = new Date();
    const id = 'transfer_' + date.getTime();
    const name = generateName(date);
    
    // Sadece özet bilgileri sakla (büyük olmaması için)
    const summary = {
      id,
      name,
      date: date.toISOString(),
      week: getWeekNumber(date),
      stats: analysis.stats,
      counts: {
        depoTransfer: analysis.depoTransfers.length,
        magTransfer: analysis.magTransfers.length,
        kirikBeden: analysis.kirikBeden.length,
        bekleyen: analysis.bekleyen.length,
        hataliTarih: analysis.hataliTarih.length,
      },
      // Mağaza dağılımı
      storeDistribution: analysis.envanterOzet.map(e => ({
        store: e.store.label,
        rank: e.store.rank,
        depoGelen: e.depoGelen,
        magGelen: e.magGelen,
        giden: e.giden,
        net: e.net,
      })),
      // Virman ürün takibi (sonraki transferde kullanılacak)
      virmanProducts: extractVirmanProducts(analysis),
    };
    
    try {
      await DATA.dbPut('history', summary);
      console.log('Transfer kaydı:', name);
      renderDashboardList();
      renderMainList();
    } catch (e) {
      console.error('Kayıt hatası:', e);
    }
  }
  
  function extractVirmanProducts(analysis) {
    // Virman ürünlerinin transfer edilenlerini sakla — sonraki haftada baz tarih güncellemesi için
    const virmans = {};
    for (const t of analysis.depoTransfers) {
      if (t.sezonTipi === 'VIRMAN') {
        const key = `${t.urunKodu}|||${t.renk}`;
        if (!virmans[key]) virmans[key] = { urunAdi: t.urunAdi, transferDate: new Date().toISOString() };
      }
    }
    for (const t of analysis.magTransfers) {
      if (t.sezonTipi === 'VIRMAN') {
        const key = `${t.urunKodu}|||${t.renk}`;
        if (!virmans[key]) virmans[key] = { urunAdi: t.urunAdi, transferDate: new Date().toISOString() };
      }
    }
    return virmans;
  }
  
  // ========== LİSTELE ==========
  
  async function getAll() {
    try {
      return await DATA.dbGetAll('history');
    } catch (e) {
      return [];
    }
  }
  
  async function renderDashboardList() {
    const items = await getAll();
    const sorted = items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const el = $('dHistory');
    if (!el) return;
    
    if (sorted.length === 0) {
      el.innerHTML = '<span class="muted">Henüz kayıt yok</span>';
      return;
    }
    
    el.innerHTML = sorted.map(h => {
      const d = new Date(h.date);
      return `<div class="hist-item" onclick="HISTORY.viewDetails('${h.id}')">
        <div class="hist-item-name">${h.week}. Hafta</div>
        <div class="hist-item-date">${d.toLocaleDateString('tr')} • ${h.counts.depoTransfer + h.counts.magTransfer} transfer</div>
      </div>`;
    }).join('');
  }
  
  async function renderMainList() {
    const items = await getAll();
    const sorted = items.sort((a, b) => new Date(b.date) - new Date(a.date));
    const el = $('histItems');
    if (!el) return;
    
    if (sorted.length === 0) {
      el.innerHTML = '<span class="muted">Henüz kayıt yok. İlk transferinizi yapın!</span>';
      return;
    }
    
    el.innerHTML = sorted.map(h => {
      const d = new Date(h.date);
      const total = h.counts.depoTransfer + h.counts.magTransfer;
      return `<div class="hist-row">
        <div class="name">${h.name}</div>
        <div class="meta">${total} transfer • ${h.counts.kirikBeden} kırık • ${h.counts.bekleyen} bekleyen</div>
        <div class="actions">
          <button class="hist-action view" onclick="HISTORY.viewDetails('${h.id}')">👁 İncele</button>
          <button class="hist-action del" onclick="HISTORY.deleteHistory('${h.id}')">🗑 Sil</button>
        </div>
      </div>`;
    }).join('');
  }
  
  // ========== DETAY GÖSTER ==========
  
  async function viewDetails(id) {
    try {
      const h = await DATA.dbGet('history', id);
      if (!h) { alert('Kayıt bulunamadı'); return; }
      
      // Modal popup
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
      
      let storesHtml = h.storeDistribution.map(s => `
        <tr>
          <td><span class="rd r${s.rank}"></span> ${s.store}</td>
          <td class="ok">+${s.depoGelen}</td>
          <td class="ok">+${s.magGelen}</td>
          <td class="er">-${s.giden}</td>
          <td><b class="${s.net > 0 ? 'ok' : 'er'}">${s.net > 0 ? '+' : ''}${s.net}</b></td>
        </tr>
      `).join('');
      
      modal.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:10px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="margin:0;color:#1e3a5f">${h.name}</h3>
            <button onclick="this.closest('div[style*=position]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer">✕</button>
          </div>
          <div style="font-family:var(--fm);font-size:11px;color:#6b7280;margin-bottom:12px">
            ${new Date(h.date).toLocaleString('tr')} · ${h.counts.depoTransfer + h.counts.magTransfer} transfer
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px">
            <div class="sm-card"><div class="sm-l">Depo Tr</div><div class="sm-v">${h.counts.depoTransfer}</div></div>
            <div class="sm-card"><div class="sm-l">Mğz Tr</div><div class="sm-v">${h.counts.magTransfer}</div></div>
            <div class="sm-card"><div class="sm-l">Kırık</div><div class="sm-v">${h.counts.kirikBeden}</div></div>
            <div class="sm-card"><div class="sm-l">Bekleyen</div><div class="sm-v">${h.counts.bekleyen}</div></div>
            <div class="sm-card"><div class="sm-l">Hata</div><div class="sm-v">${h.counts.hataliTarih}</div></div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr><th>Mağaza</th><th>Depo</th><th>Mağaza</th><th>Giden</th><th>Net</th></tr></thead>
            <tbody>${storesHtml}</tbody>
          </table>
          <div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:5px;font-size:10px">
            <b>Virman ürün kaydı:</b> ${Object.keys(h.virmanProducts || {}).length} ürün-renk takip ediliyor.
            Bir sonraki transferde bu ürünlerin baz tarihi olarak <b>bu transfer tarihi</b> kullanılacak.
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (e) {
      alert('Kayıt yükleme hatası: ' + e.message);
    }
  }
  
  // ========== SİL ==========
  
  async function deleteHistory(id) {
    if (!confirm('Bu transfer kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await DATA.dbDelete('history', id);
      renderDashboardList();
      renderMainList();
    } catch (e) {
      alert('Silme hatası: ' + e.message);
    }
  }
  
  // ========== VIRMAN BAZ TARİHİ AL ==========
  
  // Bir ürünün son transfer tarihini döndürür (virman için baz tarih güncellemesi)
  async function getVirmanLastTransferDate(urunKodu, renk) {
    const items = await getAll();
    const sorted = items.sort((a, b) => new Date(b.date) - new Date(a.date));
    const key = `${urunKodu}|||${renk}`;
    for (const h of sorted) {
      if (h.virmanProducts && h.virmanProducts[key]) {
        return new Date(h.virmanProducts[key].transferDate);
      }
    }
    return null;
  }
  
  // ========== EXPORT / IMPORT (yedekleme) ==========
  
  async function exportAll() {
    const items = await getAll();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utopian_history_${new Date().toLocaleDateString('tr').replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async function importJson(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const items = JSON.parse(e.target.result);
          for (const item of items) {
            await DATA.dbPut('history', item);
          }
          renderDashboardList();
          renderMainList();
          res(items.length);
        } catch (er) { rej(er); }
      };
      reader.readAsText(file);
    });
  }
  
  return {
    saveCurrent,
    getAll,
    viewDetails,
    deleteHistory,
    renderDashboardList,
    renderMainList,
    getVirmanLastTransferDate,
    exportAll,
    importJson,
    getWeekNumber,
    generateName,
  };
})();
