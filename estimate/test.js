// SMM7 Template Database
const smm7Templates = {
  preliminaries: {
    title: "Preliminaries",
    fields: [
      { type: "text", label: "Project Title", id: "projectTitle", required: true },
      { type: "number", label: "Contract Duration (weeks)", id: "duration" }
    ]
  },
  concrete: {
    title: "Concrete Work (SMM7 Section 3)",
    fields: [
      { 
        type: "table", 
        label: "Concrete Elements",
        headers: ["Description", "Volume (m³)", "SMM7 Code"],
        rows: [
          ["Foundation", "", "3.1"],
          ["Columns", "", "3.2"],
          ["Beams", "", "3.3"]
        ]
      }
    ]
  }
};

// DOM Elements
let currentCategory = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  document.getElementById('saveTemplate').addEventListener('click', saveTemplate);
  document.getElementById('exportSMM7').addEventListener('click', exportSMM7);
});

// Category Selection
function selectCategory(category) {
  currentCategory = category;
  const template = smm7Templates[category] || {};
  
  document.getElementById('formTitle').textContent = template.title || "Estimation Form";
  
  const formContainer = document.getElementById('formContainer');
  formContainer.innerHTML = '';
  
  if (template.fields) {
    template.fields.forEach(field => {
      if (field.type === 'text' || field.type === 'number') {
        formContainer.appendChild(createInputField(field));
      } else if (field.type === 'table') {
        formContainer.appendChild(createTableField(field));
      }
    });
  }
}

function createInputField(field) {
  const div = document.createElement('div');
  div.className = 'form-group';
  
  const label = document.createElement('label');
  label.textContent = field.label;
  label.htmlFor = field.id;
  
  const input = document.createElement('input');
  input.type = field.type;
  input.id = field.id;
  input.required = field.required || false;
  
  div.appendChild(label);
  div.appendChild(input);
  return div;
}

function createTableField(field) {
  const div = document.createElement('div');
  div.className = 'form-table';
  
  const label = document.createElement('h3');
  label.textContent = field.label;
  div.appendChild(label);
  
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  
  // Create headers
  const headerRow = document.createElement('tr');
  field.headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  
  // Create rows
  field.rows.forEach(rowData => {
    const tr = document.createElement('tr');
    rowData.forEach((cellData, index) => {
      const td = document.createElement('td');
      if (index === 0) {
        td.textContent = cellData;
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = cellData;
        td.appendChild(input);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  
  table.appendChild(thead);
  table.appendChild(tbody);
  div.appendChild(table);
  
  // Add row button
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Add Row';
  addBtn.className = 'add-row';
  addBtn.onclick = () => addTableRow(tbody, field.headers.length);
  div.appendChild(addBtn);
  
  return div;
}

function addTableRow(tbody, colCount) {
  const tr = document.createElement('tr');
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    if (i === 0) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Description';
      td.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.type = i === colCount - 1 ? 'text' : 'number';
      input.placeholder = i === colCount - 1 ? 'SMM7 Code' : 'Qty';
      td.appendChild(input);
    }
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

// Modal Controls
function openAIModal(modalType) {
  const modal = document.getElementById('aiModal');
  const modalContent = document.getElementById('modalContent');
  
  modal.style.display = 'block';
  
  switch(modalType) {
    case 'takeoff':
      modalContent.innerHTML = `
        <h2><i class="fas fa-ruler-combined"></i> AI Quantity Takeoff</h2>
        <div class="upload-area" id="uploadArea">
          <p>Upload drawings or specifications</p>
          <input type="file" id="fileUpload" accept=".pdf,.dwg,.ifc" />
          <button onclick="processTakeoff()">Analyze</button>
        </div>
        <div id="takeoffResults" style="display:none;"></div>
      `;
      break;
    case 'risk':
      modalContent.innerHTML = `
        <h2><i class="fas fa-exclamation-triangle"></i> Risk Analysis</h2>
        <div id="riskAnalysisChart"></div>
      `;
      // Would integrate with Chart.js in real implementation
      break;
  }
}

function closeModal() {
  document.getElementById('aiModal').style.display = 'none';
}

// Core Functions
function saveTemplate() {
  // In a real app, would save to database
  alert('Template saved!');
}

function exportSMM7() {
  // Generate SMM7-compliant report
  alert('Exported in SMM7 format');
}