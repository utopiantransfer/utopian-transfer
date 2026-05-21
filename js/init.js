// ============================================================
// UTOPIAN TRANSFER v8.1.6 — INIT MODÜLÜ
// Sayfa yüklendiğinde çalışan başlangıç kodu
// ============================================================

(function init() {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('⏳ UTOPIAN Transfer başlatılıyor...');
    
    // Modüllerin yüklendiğini doğrula
    const modules = { DATA: window.DATA, ALGO: window.ALGO, UI: window.UI, HISTORY: window.HISTORY };
    let eksik = [];
    for (const [name, mod] of Object.entries(modules)) {
      if (!mod) eksik.push(name);
    }
    if (eksik.length > 0) {
      console.error('❌ EKSİK MODÜLLER:', eksik.join(', '));
      alert('Bazı program dosyaları yüklenemedi: ' + eksik.join(', ') + '\nSayfayı yenileyin (Ctrl+Shift+R)');
      return;
    }
    console.log('✓ Tüm modüller yüklendi: DATA, ALGO, UI, HISTORY');
    
    try {
      // 1. IndexedDB
      if (DATA.init) await DATA.init();
      
      // 2. Görsel cache
      if (UI.checkImageCache) await UI.checkImageCache();
      
      // 3. Geçmiş listesi
      if (HISTORY.renderDashboardList) await HISTORY.renderDashboardList();
      if (HISTORY.renderMainList) await HISTORY.renderMainList();
      
      // 4. SÜRÜKLE-BIRAK bağlama (inline onclick yerine güvenli yöntem)
      setupDragDrop();
      
      // 5. Service Worker temizle (cache sorunlarını önle)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister());
        }).catch(() => {});
      }
      
      console.log('✅ UTOPIAN Transfer v8.1.6 HAZIR');
    } catch (e) {
      console.error('Init hatası:', e);
    }
  });
  
  // ===== SÜRÜKLE-BIRAK KURULUMU =====
  function setupDragDrop() {
    const zones = [
      { boxId: 'u1', inputId: 'f1', type: 'nebim' },
      { boxId: 'u2', inputId: 'f2', type: 'takim' },
      { boxId: 'u3', inputId: 'f3', type: 'irsaliye' },
    ];
    
    let bagli = 0;
    for (const z of zones) {
      const box = document.getElementById(z.boxId);
      if (!box) continue;
      
      // Dragover - sürükleme üzerine gelince
      box.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.style.borderColor = '#B8864F';
        box.style.background = '#FEF9E7';
      });
      
      // Dragleave - sürükleme ayrılınca
      box.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.style.borderColor = '';
        box.style.background = '';
      });
      
      // Drop - bırakınca
      box.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.style.borderColor = '';
        box.style.background = '';
        
        const files = e.dataTransfer && e.dataTransfer.files;
        if (!files || files.length === 0) {
          console.warn('Sürüklenen dosya yok');
          return;
        }
        
        const file = files[0];
        console.log('📁 Dosya bırakıldı:', file.name, '→', z.type);
        
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
          alert('Lütfen Excel dosyası (.xlsx veya .xls) sürükleyin.\nSürüklenen: ' + file.name);
          return;
        }
        
        // Input'a dosyayı ata ve change event tetikle
        const input = document.getElementById(z.inputId);
        if (input) {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          // change event tetikle
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Input yoksa direkt fonksiyon çağır
          const fakeEvent = { target: { files: [file] } };
          if (z.type === 'nebim' && DATA.loadNebim) DATA.loadNebim(fakeEvent);
          else if (z.type === 'takim' && DATA.loadTakim) DATA.loadTakim(fakeEvent);
          else if (z.type === 'irsaliye' && DATA.loadIrsaliye) DATA.loadIrsaliye(fakeEvent);
        }
      });
      
      bagli++;
    }
    console.log('✓ Sürükle-bırak kuruldu:', bagli, 'alan');
  }
})();
