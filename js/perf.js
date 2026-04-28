// ============================================================
// UTOPIAN TRANSFER v7.0 — PERFORMANS RAPOR MODÜLÜ
// Önerilen vs Gerçek (Mağaza Transfer İrsaliyesi karşılaştırması)
// ============================================================

const PERF = (function() {
  
  function $(id) { return document.getElementById(id); }
  
  // İrsaliye dosyasından mağaza transferlerini çıkar
  function parseIrsaliye(rawData) {
    if (!rawData || rawData.length === 0) return [];
    const keys = Object.keys(rawData[0]);
    
    // Tipik kolonlar (Nebim irsaliye raporu)
    const colMap = {
      gonderen: findColumn(keys, ['GÖNDEREN']) || findColumn(keys, ['KAYNAK', 'DEPO']) || findColumn(keys, ['DEPO']),
      hedef: findColumn(keys, ['ALICI']) || findColumn(keys, ['HEDEF']) || findColumn(keys, ['VARIŞ']),
      urunKodu: findColumn(keys, ['ÜRÜN', 'KODU']),
      renk: findColumn(keys, ['RENK']),
      beden: findColumn(keys, ['BEDEN']),
      miktar: findColumn(keys, ['MİKTAR']) || findColumn(keys, ['ADET']),
      tarih: findColumn(keys, ['TARİH']),
    };
    
    return rawData.map(r => ({
      gonderen: String(r[colMap.gonderen] || ''),
      hedef: String(r[colMap.hedef] || ''),
      urunKodu: String(r[colMap.urunKodu] || '').trim(),
      renk: String(r[colMap.renk] || ''),
      beden: String(r[colMap.beden] || ''),
      miktar: Number(r[colMap.miktar]) || 0,
      tarih: r[colMap.tarih] || '',
    })).filter(r => r.urunKodu && r.miktar > 0);
  }
  
  function findColumn(keys, mustHave) {
    for (const k of keys) {
      const c = String(k).replace(/[\n\r\s]/g, '').toUpperCase();
      if (mustHave.every(m => c.includes(m.toUpperCase()))) return k;
    }
    return null;
  }
  
  // Karşılaştır: Önerilen vs Gerçek
  function compare(analysis, irsaliyeRawData) {
    const irsaliye = parseIrsaliye(irsaliyeRawData);
    
    // Önerilen transferler için lookup oluştur
    // key: urunKodu|||renk|||beden|||hedefStoreKey
    const suggested = {};
    
    for (const t of analysis.depoTransfers) {
      for (const d of t.distrib) {
        const key = `${t.urunKodu}|||${t.renk}|||${t.beden}|||${d.store.label}`;
        suggested[key] = (suggested[key] || 0) + d.qty;
      }
    }
    
    for (const t of analysis.magTransfers) {
      const key = `${t.urunKodu}|||${t.renk}|||${t.beden}|||${t.hedef.label}`;
      suggested[key] = (suggested[key] || 0) + t.adet;
    }
    
    // Gerçek transferler için lookup
    const actual = {};
    for (const i of irsaliye) {
      // Mağaza adı eşleştir
      const targetStore = ALGO.STORES.find(s => 
        s.patterns.some(p => i.hedef.toUpperCase().includes(p.toUpperCase()))
      );
      const label = targetStore ? targetStore.label : i.hedef;
      const key = `${i.urunKodu}|||${i.renk}|||${i.beden}|||${label}`;
      actual[key] = (actual[key] || 0) + i.miktar;
    }
    
    // Karşılaştırma sonucu
    const allKeys = new Set([...Object.keys(suggested), ...Object.keys(actual)]);
    const rows = [];
    let okCount = 0, partialCount = 0, missCount = 0, extraCount = 0;
    
    for (const key of allKeys) {
      const [urunKodu, renk, beden, hedef] = key.split('|||');
      const sug = suggested[key] || 0;
      const act = actual[key] || 0;
      
      let durum, color;
      if (sug > 0 && act === 0) {
        durum = 'YAPILMADI';
        color = '#fee2e2';
        missCount++;
      } else if (sug === 0 && act > 0) {
        durum = 'EKSTRA';
        color = '#fef3c7';
        extraCount++;
      } else if (sug === act) {
        durum = 'TAM';
        color = '#d1fae5';
        okCount++;
      } else {
        durum = 'KISMEN';
        color = '#fef3c7';
        partialCount++;
      }
      
      rows.push({ urunKodu, renk, beden, hedef, sug, act, durum, color });
    }
    
    rows.sort((a, b) => {
      const order = { 'YAPILMADI': 1, 'KISMEN': 2, 'EKSTRA': 3, 'TAM': 4 };
      return order[a.durum] - order[b.durum];
    });
    
    renderResults(rows, { okCount, partialCount, missCount, extraCount });
  }
  
  function renderResults(rows, stats) {
    const total = stats.okCount + stats.partialCount + stats.missCount + stats.extraCount;
    const pctOk = total > 0 ? Math.round((stats.okCount / total) * 100) : 0;
    
    let html = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
        <div class="sm-card" style="border-color:#6ee7b7"><div class="sm-l">Tam Eşleşme</div><div class="sm-v ok">${stats.okCount}</div><div class="sm-s">%${pctOk}</div></div>
        <div class="sm-card" style="border-color:#fde68a"><div class="sm-l">Kısmen</div><div class="sm-v" style="color:var(--wr)">${stats.partialCount}</div></div>
        <div class="sm-card" style="border-color:#fca5a5"><div class="sm-l">Yapılmadı</div><div class="sm-v er">${stats.missCount}</div></div>
        <div class="sm-card"><div class="sm-l">Ekstra (Plan dışı)</div><div class="sm-v" style="color:var(--ac)">${stats.extraCount}</div></div>
      </div>
      
      <div class="alert alert-info">
        📊 Toplam ${total} satır karşılaştırıldı. <b>%${pctOk} tam başarı oranı.</b>
        <br>Yapılmayan transferler kırmızı, eksik miktarlar sarı ile vurgulandı. Mağazalarla paylaşabilirsiniz.
      </div>
      
      <div class="tw" style="max-height:500px;overflow-y:auto">
        <table>
          <thead><tr>
            <th>ÜRÜN KODU</th><th>RENK</th><th>BEDEN</th><th>HEDEF</th>
            <th>ÖNERİLEN</th><th>GERÇEK</th><th>DURUM</th>
          </tr></thead>
          <tbody>
    `;
    
    for (const r of rows.slice(0, 200)) {
      html += `<tr style="background:${r.color}">
        <td style="font-family:var(--fm);font-size:9px">${r.urunKodu}</td>
        <td style="color:var(--ac2)">${r.renk}</td>
        <td style="font-weight:700">${r.beden}</td>
        <td>${r.hedef}</td>
        <td style="text-align:center;font-weight:600">${r.sug}</td>
        <td style="text-align:center;font-weight:600">${r.act}</td>
        <td><span class="badge ${r.durum === 'TAM' ? 'bg' : r.durum === 'YAPILMADI' ? 'br' : 'by'}">${r.durum}</span></td>
      </tr>`;
    }
    
    html += '</tbody></table></div>';
    
    if (rows.length > 200) {
      html += `<div class="muted" style="text-align:center;padding:8px">İlk 200 satır gösteriliyor. Excel ile tam liste indirebilirsiniz.</div>`;
    }
    
    html += `<button class="btn btn-ok" onclick="PERF.exportReport()" style="margin-top:10px">⬇ Performans Raporunu İndir</button>`;
    
    $('perfContent').innerHTML = html;
    
    // Save for export
    PERF._lastRows = rows;
    PERF._lastStats = stats;
  }
  
  function exportReport() {
    if (!PERF._lastRows) return;
    const wb = XLSX.utils.book_new();
    const data = PERF._lastRows.map(r => ({
      'Ürün Kodu': r.urunKodu,
      'Renk': r.renk,
      'Beden': r.beden,
      'Hedef Mağaza': r.hedef,
      'Önerilen': r.sug,
      'Gerçek Çıkış': r.act,
      'Fark': r.sug - r.act,
      'Durum': r.durum,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Performans');
    XLSX.writeFile(wb, `Transfer_Performans_${new Date().toLocaleDateString('tr').replace(/\./g, '-')}.xlsx`);
  }
  
  return {
    parseIrsaliye,
    compare,
    exportReport,
    _lastRows: null,
    _lastStats: null,
  };
})();
