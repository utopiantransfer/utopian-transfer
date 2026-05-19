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
      
      console.log('✓ UTOPIAN Transfer v7.0 hazır');
    } catch (e) {
      console.error('Init hatası:', e);
    }
  });
})();
