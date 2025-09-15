// estimate.js (main controller)
// Load as a module in your HTML: <script type="module" src="{{ url_for('static', filename='dashboard/estimate.js') }}"></script>

// Imports
import { SMM7_CATEGORIES } from './smm7_categories.js';
import { convertUSDToGHS } from './currencyService.js';
import { calculateFormula } from './formulas.js';
import { UNITS } from './input_units.js';
import { BOQ_DATA } from './boqData.js';

// Utility: format numbers
const fmt = n => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

document.addEventListener('DOMContentLoaded', () => {
  const formArea = document.getElementById('estimate-form-area');
  let currentCategory = null;

  // =========================
  // CATEGORY SELECTION
  // =========================
  document.querySelectorAll('.estimate-sidebar button[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      currentCategory = cat;
      loadCategoryTable(cat);

      document.querySelectorAll('.estimate-sidebar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // =========================
  // LOAD TABLE BY CATEGORY
  // =========================
  function loadCategoryTable(category) {
    const smmCategory = Object.values(SMM7_CATEGORIES).find(c => c.mainCategory.toLowerCase().includes(category));
    const items = smmCategory ? smmCategory.components : [];

    let rows = items.map((desc, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><input class="desc" type="text" value="${desc}"></td>
        <td><input class="unit" type="text" value="${UNITS[desc] || 'unit'}"></td>
        <td><input class="qty" type="number" step="0.01" value="0"></td>
        <td><input class="rate" type="number" step="0.01" value="0"></td>
        <td class="amount">0.00</td>
        <td><button class="row-add">+</button></td>
      </tr>
    `).join('');

    formArea.innerHTML = `
      <h4>${category.charAt(0).toUpperCase() + category.slice(1)} Items</h4>
      <table class="estimate-table" data-cat="${category}">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5">Subtotal</td>
            <td class="cat-subtotal">0.00</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
    attachTableEvents();
  }

  // =========================
  // CALCULATIONS
  // =========================
  function recalcRow(row) {
    const qty = parseFloat(row.querySelector('.qty')?.value || 0);
    const rate = parseFloat(row.querySelector('.rate')?.value || 0);

    // Optional: call formulas.js
    const calcRate = calculateFormula(rate, qty);

    const amount = qty * calcRate;
    row.querySelector('.amount').textContent = fmt(amount);
    return amount;
  }

  function recalcTable(table) {
    let subtotal = 0;
    table.querySelectorAll('tbody tr').forEach(r => subtotal += recalcRow(r));
    table.querySelector('.cat-subtotal').textContent = fmt(subtotal);
    return subtotal;
  }

  function recalcAll() {
    const summaryList = document.getElementById('summary-list');
    if (summaryList) summaryList.innerHTML = '';
    let grand = 0;

    document.querySelectorAll('.estimate-table').forEach(table => {
      const subtotal = recalcTable(table);
      grand += subtotal;

      const cat = table.dataset.cat || 'category';
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<div>${cat}</div><div>${fmt(subtotal)}</div>`;
      summaryList?.appendChild(item);
    });

    document.getElementById('grand-total-usd').textContent = fmt(grand);
    return grand;
  }

  // =========================
  // EVENTS
  // =========================
  function attachTableEvents() {
    document.querySelectorAll('.estimate-table').forEach(table => {
      table.addEventListener('input', e => {
        if (e.target.matches('.qty, .rate')) recalcAll();
      });

      table.addEventListener('click', e => {
        if (e.target.matches('.row-add')) {
          const tbody = table.querySelector('tbody');
          const idx = tbody.querySelectorAll('tr').length + 1;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${idx}</td>
            <td><input class="desc" type="text" placeholder="New item"></td>
            <td><input class="unit" type="text" value="unit"></td>
            <td><input class="qty" type="number" step="0.01" value="0"></td>
            <td><input class="rate" type="number" step="0.01" value="0"></td>
            <td class="amount">0.00</td>
            <td><button class="row-remove">−</button></td>
          `;
          tbody.appendChild(tr);
        }
        if (e.target.matches('.row-remove')) {
          e.target.closest('tr').remove();
          recalcAll();
        }
      });
    });
    recalcAll();
  }

  // =========================
  // CURRENCY CONVERSION
  // =========================
  document.getElementById('convert-btn')?.addEventListener('click', () => {
    const rate = parseFloat(document.getElementById('fx-rate')?.value) || 1;
    const grand = parseFloat(document.getElementById('grand-total-usd')?.textContent.replace(/,/g, '')) || 0;
    const ghs = convertUSDToGHS(grand, rate);
    document.getElementById('grand-total-ghs-val').textContent = fmt(ghs);
    document.getElementById('grand-total-ghs').style.display = 'block';
  });

  // =========================
  // SAVE / EXPORT
  // =========================
  document.getElementById('save-estimate')?.addEventListener('click', () => {
    const tables = Array.from(document.querySelectorAll('.estimate-table')).map(table => {
      const cat = table.dataset.cat;
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(r => ({
        description: r.querySelector('.desc')?.value,
        unit: r.querySelector('.unit')?.value,
        qty: parseFloat(r.querySelector('.qty')?.value || 0),
        rate: parseFloat(r.querySelector('.rate')?.value || 0),
        amount: parseFloat(r.querySelector('.qty')?.value || 0) * parseFloat(r.querySelector('.rate')?.value || 0)
      }));
      return { category: cat, rows };
    });
    console.log('Saving estimate payload', tables);
    alert('Estimate data prepared in console (ready to POST).');
  });

  document.getElementById('export-pdf')?.addEventListener('click', () => {
    alert('Export PDF not implemented.');
  });

});
