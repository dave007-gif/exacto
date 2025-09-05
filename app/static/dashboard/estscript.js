// estimate.js
document.addEventListener('DOMContentLoaded', () => {
  // utility: format number
  const fmt = n => Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  // initial recalc of all tables
  function recalcRow(row) {
    const qty = parseFloat(row.querySelector('.qty')?.value || 0);
    const rate = parseFloat(row.querySelector('.rate')?.value || 0);
    const amountCell = row.querySelector('.amount');
    const amount = qty * rate;
    amountCell.textContent = fmt(amount);
    return amount;
  }

  function recalcTable(table) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    let subtotal = 0;
    rows.forEach(r => subtotal += recalcRow(r));
    const subCell = table.querySelector('.cat-subtotal');
    if (subCell) subCell.textContent = fmt(subtotal);
    return subtotal;
  }

  function recalcAll() {
    const tables = Array.from(document.querySelectorAll('.estimate-table'));
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = '';
    let grand = 0;
    tables.forEach(table => {
      const subtotal = recalcTable(table);
      grand += subtotal;
      // category label:
      const cat = table.dataset.cat || 'category';
      const item = document.createElement('div');
      item.className = 'summary-item';
      const label = document.createElement('div');
      label.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      const value = document.createElement('div');
      value.textContent = fmt(subtotal);
      item.appendChild(label);
      item.appendChild(value);
      summaryList.appendChild(item);
    });
    document.getElementById('grand-total-usd').textContent = fmt(grand);
    return grand;
  }

  // recalc on input changes
  document.querySelectorAll('.estimate-table').forEach(table => {
    table.addEventListener('input', e => {
      if (e.target.matches('.qty') || e.target.matches('.rate')) {
        recalcAll();
      }
    });
    // row-add: add empty row template
    table.addEventListener('click', e => {
      if (e.target.matches('.row-add')) {
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        const idx = rows.length + 1;
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
        const tr = e.target.closest('tr');
        tr.remove();
      }
    });
  });

  // accordion toggles
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.accordion-item');
      item.classList.toggle('open');
      const panel = item.querySelector('.accordion-panel');
      if (item.classList.contains('open')) panel.style.display = 'block';
      else panel.style.display = 'none';
    });
    // start collapsed
    const p = btn.closest('.accordion-item').querySelector('.accordion-panel');
    p.style.display = 'none';
  });

  // initial calculation and populate summary
  recalcAll();

  // convert to GHS
  document.getElementById('convert-btn').addEventListener('click', () => {
    const rate = parseFloat(document.getElementById('fx-rate').value) || 1;
    const grand = parseFloat(document.getElementById('grand-total-usd').textContent.replace(/,/g,'')) || 0;
    const ghs = grand * rate;
    document.getElementById('grand-total-ghs-val').textContent = Number(ghs).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById('grand-total-ghs').style.display = 'block';
  });

  // Save / Export stubs
  document.getElementById('save-estimate').addEventListener('click', () => {
    // Gather data (simple example) — you can POST to backend here
    const tables = Array.from(document.querySelectorAll('.estimate-table')).map(table => {
      const cat = table.dataset.cat;
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(r => ({
        description: (r.querySelector('.desc') && r.querySelector('.desc').value) || r.cells[1].innerText,
        unit: (r.querySelector('.unit') && r.querySelector('.unit').value) || r.cells[2].innerText,
        qty: parseFloat(r.querySelector('.qty')?.value || 0),
        rate: parseFloat(r.querySelector('.rate')?.value || 0),
        amount: parseFloat((r.querySelector('.qty')?.value || 0) * (r.querySelector('.rate')?.value || 0))
      }));
      return { category: cat, rows };
    });
    // Send via fetch POST to your Flask endpoint if you add one
    console.log('Saving estimate payload', tables);
    alert('Estimate data prepared in console (implement POST to save).');
  });

  document.getElementById('export-pdf').addEventListener('click', () => {
    alert('Export PDF not implemented in this demo. Server-side rendering or client PDF library required.');
  });

});
