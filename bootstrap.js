/* Keep startup recovery usable before the main application has initialized. */
(function () {
  function showError() {
    var status = document.getElementById('status');
    if (status) status.textContent = '页面加载异常，请点击“检查更新”安装修复版；学习进度不会被清除。';
  }
  window.addEventListener('error', function () { if (!window.APP_READY) showError(); }, true);
  document.addEventListener('DOMContentLoaded', function () {
    if (window.APP_READY) return;
    showError();
    var button = document.getElementById('update');
    if (button) button.onclick = function () {
      if (window.AndroidApp && typeof window.AndroidApp.checkUpdates === 'function') {
        window.AndroidApp.checkUpdates();
      } else {
        window.location.href = 'https://github.com/Qiumu0o0/RealLifeEnglish/releases/latest';
      }
    };
  });
}());
