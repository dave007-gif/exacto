// Show only selected category form
function selectCategory(category) {
  const categories = ['preliminaries', 'demolitions', 'groundworks', 'concrete', 'masonry', 'carpentry', 'roofing', 'finishes', 'mechanical', 'electrical'];
  categories.forEach(cat => {
    const form = document.getElementById(cat + "Form");
    if (form) form.style.display = (cat === category) ? "block" : "none";
  });
  document.getElementById("resultArea").style.display = "none"; // hide results on category change
}

function showWarnings(messages) {
  const warningBox = `
    <div class="warning-box" style="color:#b22222; background:#fee; padding:10px; margin-bottom:10px;">
      <h4>⚠️ Issues Detected:</h4>
      <ul>${messages.map(msg => `<li>${msg}</li>`).join("")}</ul>
    </div>
  `;
  document.getElementById("resultArea").style.display = "block";
  document.getElementById("resultArea").innerHTML = warningBox;
}

function renderEstimate(title, materials, totalCost) {
  const materialList = materials.map(m => `<li>${m}</li>`).join("");
  const resultHTML = `
    <h3>${title} Estimate</h3>
    <ul>${materialList}</ul>
    <strong>Total Cost: GHS ${totalCost.toFixed(2)}</strong>
  `;
  document.getElementById("resultArea").style.display = "block";
  document.getElementById("resultArea").innerHTML = resultHTML;
}

function calculatePreliminaries() {
  const duration = parseFloat(document.getElementById("projectDuration").value);
  const area = parseFloat(document.getElementById("siteArea").value);
  const type = document.getElementById("projectType").value;
  const issues = [];

  if (isNaN(duration) || duration < 1 || duration > 60)
    issues.push("Project duration should be between 1 and 60 months.");
  if (isNaN(area) || area < 50 || area > 50000)
    issues.push("Site area should be between 50 and 50,000 m².");
  if (!type)
    issues.push("Please select a valid project type.");

  if (issues.length > 0) return showWarnings(issues);

  // Send to backend for calculation (if preferred)
  fetch('/estimate/preliminaries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      duration: duration,
      area: area,
      project_type: type
    })
  })
  .then(response => response.json())
  .then(data => {
    renderEstimate("Preliminaries", data.breakdown, data.total_cost);
  })
  .catch(error => {
    console.error('Estimation error:', error);
    showWarnings(['Server error while estimating preliminaries.']);
  });
}



function calculateConcrete() {
  const volume = parseFloat(document.getElementById("concreteVolume").value);
  const grade = document.getElementById("concreteGrade").value;
  const formwork = document.getElementById("formworkRequired").value;

  const issues = [];
  if (isNaN(volume) || volume < 0.1 || volume > 1000) issues.push("Volume should be between 0.1 and 1000 m³.");
  if (!grade) issues.push("Select a concrete grade.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/concrete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ volume, grade, formwork })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      showWarnings([data.error]);
      return;
    }

    const breakdown = data.breakdown || [];
    const totalCost = data.total_cost || 0;

    renderEstimate("Concrete", breakdown, totalCost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}


function calculateMasonry() {
  const area = parseFloat(document.getElementById("masonryArea").value);
  const material = document.getElementById("masonryMaterial").value;
  const thickness = document.getElementById("wallThickness").value;

  const issues = [];
  if (isNaN(area) || area < 1 || area > 10000) issues.push("Wall area should be between 1 and 10,000 m².");
  if (!material) issues.push("Select masonry material.");
  if (!thickness) issues.push("Select wall thickness.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/masonry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ area, material, thickness })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Masonry", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}


function calculateCarpentry() {
  const type = document.getElementById("carpentryType").value;
  const quantity = parseInt(document.getElementById("carpentryQuantity").value);
  const material = document.getElementById("carpentryMaterial").value;

  const issues = [];
  if (!type) issues.push("Select carpentry work type.");
  if (isNaN(quantity) || quantity < 1) issues.push("Enter a valid quantity.");
  if (!material) issues.push("Select carpentry material.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/carpentry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, quantity, material })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Carpentry", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}


function calculateRoofing() {
  const sheetCount = parseInt(document.getElementById("roofingSheets").value);
  const sheetType = document.getElementById("roofingSheetType").value;

  const issues = [];
  if (isNaN(sheetCount) || sheetCount < 1) issues.push("Enter valid number of roofing sheets.");
  if (!sheetType) issues.push("Select roofing sheet type.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/roofing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sheet_count: sheetCount, sheet_type: sheetType })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Roofing", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}

function calculateFinishes() {
  const paintLiters = parseFloat(document.getElementById("paintLiters").value);
  const tileCount = parseInt(document.getElementById("tileCount").value);

  const issues = [];
  if (isNaN(paintLiters) || paintLiters < 0) issues.push("Enter valid paint liters.");
  if (isNaN(tileCount) || tileCount < 0) issues.push("Enter valid tile quantity.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/finishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paint_liters: paintLiters, tile_count: tileCount })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Finishes", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}


function calculateMechanical() {
  const hvacUnits = parseInt(document.getElementById("hvacUnits").value);
  const plumbingFixtures = parseInt(document.getElementById("plumbingFixtures").value);

  const issues = [];
  if (isNaN(hvacUnits) || hvacUnits < 0) issues.push("Enter valid HVAC units.");
  if (isNaN(plumbingFixtures) || plumbingFixtures < 0) issues.push("Enter valid plumbing fixtures count.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/mechanical', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hvac_units: hvacUnits, plumbing_fixtures: plumbingFixtures })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Mechanical", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}

// Electrical
function calculateElectrical() {
  const lights = parseInt(document.getElementById("lightFixtures").value);
  const outlets = parseInt(document.getElementById("powerOutlets").value);
  const securitySystems = parseInt(document.getElementById("securitySystems").value);

  const issues = [];
  if (isNaN(lights) || lights < 0) issues.push("Enter valid lighting fixtures count.");
  if (isNaN(outlets) || outlets < 0) issues.push("Enter valid power outlets count.");
  if (isNaN(securitySystems) || securitySystems < 0) issues.push("Enter valid security systems count.");
  if (issues.length) return showWarnings(issues);

  fetch('/estimate/electrical', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lights: lights,
      outlets: outlets,
      security_systems: securitySystems
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return showWarnings([data.error]);
    }

    renderEstimate("Electrical", data.breakdown, data.total_cost);
  })
  .catch(() => {
    showWarnings(["Something went wrong. Please try again."]);
  });
}
