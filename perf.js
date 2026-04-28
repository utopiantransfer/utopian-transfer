// ============================================================
// UTOPIAN TRANSFER v7.0 — INIT MODÜLÜ
// Sayfa yüklendiğinde çalışan başlangıç kodu
// ============================================================

(function init() {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // 1. IndexedDB'yi aç
      await DATA.init();
      
      // 2. Görsel cache kontrolü
      await UI.checkImageCache();
      
      // 3. Geçmiş listesini yükle
      await HISTORY.renderDashboardList();
      await HISTORY.renderMainList();
      
      // 4. Service Worker kaydı (PWA)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW kayıt:', e));
      }
      

      // 5. Excel sürükle-bırak alanları
      document.querySelectorAll('.drop-target').forEach(box => {
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag-over'); });
        box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
        box.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          box.classList.remove('drag-over');
          DATA.loadDroppedFiles(e.dataTransfer.files, box.dataset.loadtype);
        });
      });
      document.addEventListener('dragover', (e) => e.preventDefault());
      document.addEventListener('drop', (e) => {
        const inDrop = e.target.closest && e.target.closest('.drop-target');
        if (!inDrop) {
          e.preventDefault();
          DATA.loadDroppedFiles(e.dataTransfer.files);
        }
      });

      console.log('✓ UTOPIAN Transfer v8.0 hazır');
    } catch (e) {
      console.error('Init hatası:', e);
    }
  });
})();
