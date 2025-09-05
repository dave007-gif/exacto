// materials.js
document.addEventListener('DOMContentLoaded', () => {
  // initial sample data (SMM7 Western Sahara, USD)
  const defaultMaterials = [
    { id: 1, name: 'OPC 42.5R Cement (50kg)', unit: 'Bag', price: 8.50, category: 'Concrete' },
    { id: 2, name: 'Ready-Mix Concrete (25MPa)', unit: 'm³', price: 110.00, category: 'Concrete' },
    { id: 3, name: 'Rebar Ø12mm', unit: 'Ton', price: 780.00, category: 'Concrete' },
    { id: 4, name: 'Sandcrete Block (225mm)', unit: 'Each', price: 1.20, category: 'Masonry' },
    { id: 5, name: 'Mortar Sand (Fine)', unit: 'm³', price: 22.00, category: 'Masonry' },
    { id: 6, name: 'Floor Tile (Ceramic 400x400)', unit: 'm²', price: 9.50, category: 'Finishes' },
    { id: 7, name: 'Aluzinc Roofing Sheet (0.5mm)', unit: 'm²', price: 6.80, category: 'Roofing' },
    { id: 8, name: 'Emulsion Paint (Premium)', unit: 'Gallon', price: 14.00, category: 'Finishes' }
  ];

  const storageKey = 'materials_data_v1';
  const tableBody = document.querySelector('#materials-table tbody');
  const searchInput = document.getElementById('materials-search');

  // load from localStorage or default
  let materials = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultMaterials;

  // render table rows
  function renderRows(filter = '') {
    tableBody.innerHTML = '';
    const rows = materials.filter(m => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
    });

    rows.forEach((m, index) => {
      const tr = document.createElement('tr');
      tr.dataset.id = m.id;
      tr.innerHTML = `
        <td class="idx">${index + 1}</td>
        <td><input class="materials-input name" value="${escapeHtml(m.name)}"></td>
        <td><input class="materials-input unit" value="${escapeHtml(m.unit)}"></td>
        <td><input class="materials-input price" type="number" step="0.01" value="${Number(m.price).toFixed(2)}"></td>
        <td><input class="materials-input category" value="${escapeHtml(m.category)}"></td>
        <td>
          <button class="action-btn save-row" title="Save row">💾</button>
          <button class="action-btn danger delete-row" title="Delete row">🗑</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // escape for HTML attributes
  function escapeHtml(s = '') {
    return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  }

  // add material
  document.getElementById('add-material').addEventListener('click', () => {
    const newId = materials.length ? Math.max(...materials.map(m=>m.id)) + 1 : 1;
    const newMat = { id: newId, name: 'New material', unit: 'unit', price: 0.00, category: 'Uncategorized' };
    materials.push(newMat);
    renderRows(searchInput.value);
    saveToLocal(); // keep immediate
    // focus on new row name input
    setTimeout(() => {
      const lastRow = tableBody.querySelector('tr[data-id="'+newId+'"]');
      lastRow && lastRow.querySelector('.name').focus();
    }, 50);
  });

  // row click handlers (save/delete)
  tableBody.addEventListener('click', (e) => {
    if (e.target.matches('.delete-row')) {
      const tr = e.target.closest('tr');
      const id = Number(tr.dataset.id);
      materials = materials.filter(m => m.id !== id);
      renderRows(searchInput.value);
      saveToLocal();
    }
    if (e.target.matches('.save-row')) {
      const tr = e.target.closest('tr');
      const id = Number(tr.dataset.id);
      const name = tr.querySelector('.name').value.trim();
      const unit = tr.querySelector('.unit').value.trim();
      const price = parseFloat(tr.querySelector('.price').value) || 0;
      const category = tr.querySelector('.category').value.trim();
      const idx = materials.findIndex(m => m.id === id);
      if (idx > -1) {
        materials[idx] = { id, name, unit, price, category };
      } else {
        materials.push({ id, name, unit, price, category });
      }
      renderRows(searchInput.value);
      saveToLocal();
    }
  });

  // live editing (save on blur)
  tableBody.addEventListener('blur', (e) => {
    if (e.target.closest('tr')) {
      const tr = e.target.closest('tr');
      const id = Number(tr.dataset.id);
      const idx = materials.findIndex(m => m.id === id);
      if (idx > -1) {
        materials[idx].name = tr.querySelector('.name').value.trim();
        materials[idx].unit = tr.querySelector('.unit').value.trim();
        materials[idx].price = parseFloat(tr.querySelector('.price').value) || 0;
        materials[idx].category = tr.querySelector('.category').value.trim();
        saveToLocal();
      }
    }
  }, true);

  // search
  searchInput.addEventListener('input', () => renderRows(searchInput.value));

  // save to localStorage
  function saveToLocal() {
    localStorage.setItem(storageKey, JSON.stringify(materials));
  }

  // Save button -> POST to backend stub
  document.getElementById('save-materials').addEventListener('click', async () => {
    // Example payload
    const payload = { materials };
    // replace /api/materials with your actual endpoint
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Materials saved to server.');
      } else {
        const txt = await res.text();
        alert('Server error: ' + txt);
      }
    } catch (err) {
      console.warn('Save failed (no backend)', err);
      alert('Saved locally. To persist to server, implement POST /api/materials.');
    }
  });

  // export CSV
  document.getElementById('export-materials').addEventListener('click', () => {
    const rows = [['Material','Unit','Price (USD)','Category'], ...materials.map(m=>[m.name,m.unit,m.price.toFixed(2),m.category])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'materials.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  // initial render
  renderRows();

});
