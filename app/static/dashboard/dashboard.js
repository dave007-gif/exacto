// static/js/dashboard.js
function showTab(tabId) {
  const contents = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-buttons button');

  contents.forEach(c => c.style.display = 'none');
  buttons.forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).style.display = 'block';
  event.target.classList.add('active');
}
