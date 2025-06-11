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

  // Example estimation logic
  const prelimCostPerM2 = 15;
  const totalCost = area * prelimCostPerM2;

  const materials = [
    `Temporary Site Office: 1 unit`,
    `Perimeter Fencing: ${(area * 1.2).toFixed(0)} m`,
    `Site Staff (monthly): ${duration} staff-months`,
    `Utilities Setup (Water & Power): 1 setup`
  ];

  renderEstimate("Preliminaries", [
    `Duration: ${duration} months`,
    `Site Area: ${area} m²`,
    `Project Type: ${type}`,
    ...materials
  ], totalCost);
}


// Concrete
function calculateConcrete() {
  const volume = parseFloat(document.getElementById("concreteVolume").value);
  const grade = document.getElementById("concreteGrade").value;
  const formwork = document.getElementById("formworkRequired").value;
  const issues = [];

  if (isNaN(volume) || volume < 0.1 || volume > 1000) issues.push("Volume should be between 0.1 and 1000 m³.");
  if (!grade) issues.push("Select a concrete grade.");

  if (issues.length) return showWarnings(issues);

  // Materials quantities (example ratios)
  const cementBags = volume * 6.5;
  const sandM3 = volume * 0.45;
  const gravelM3 = volume * 0.85;
  const cost = volume * 500; // Assume GHS 500 per m3 concrete

  renderEstimate("Concrete", [
    `Volume: ${volume} m³`,
    `Concrete Grade: ${grade}`,
    `Formwork Required: ${formwork}`,
    `Cement (50kg bags): ${cementBags.toFixed(0)}`,
    `Sand (m³): ${sandM3.toFixed(2)}`,
    `Gravel (m³): ${gravelM3.toFixed(2)}`
  ], cost);
}

// Masonry
function calculateMasonry() {
  const area = parseFloat(document.getElementById("masonryArea").value);
  const material = document.getElementById("masonryMaterial").value;
  const thickness = document.getElementById("wallThickness").value;
  const issues = [];

  if (isNaN(area) || area < 1 || area > 10000) issues.push("Wall area should be between 1 and 10,000 m².");
  if (!material) issues.push("Select masonry material.");
  if (!thickness) issues.push("Select wall thickness.");

  if (issues.length) return showWarnings(issues);

  // Approximate bricks/blocks per m² by thickness (sample estimates)
  let unitsPerM2 = 0;
  if (material === "brick") unitsPerM2 = thickness === "215mm" ? 60 : 80;
  else if (material === "block") unitsPerM2 = thickness === "215mm" ? 12 : 18;
  else if (material === "stone") unitsPerM2 = 10;

  const totalUnits = area * unitsPerM2;
  const costPerUnit = material === "brick" ? 3 : material === "block" ? 4 : 5; // GHS/unit example
  const totalCost = totalUnits * costPerUnit;

  renderEstimate("Masonry", [
    `Wall Area: ${area} m²`,
    `Material: ${material}`,
    `Wall Thickness: ${thickness}`,
    `Material Quantity: ${totalUnits.toFixed(0)} units`,
  ], totalCost);
}

// Carpentry
function calculateCarpentry() {
  const type = document.getElementById("carpentryType").value;
  const quantity = parseInt(document.getElementById("carpentryQuantity").value);
  const material = document.getElementById("carpentryMaterial").value;
  const issues = [];

  if (!type) issues.push("Select carpentry work type.");
  if (isNaN(quantity) || quantity < 1) issues.push("Enter a valid quantity.");
  if (!material) issues.push("Select carpentry material.");

  if (issues.length) return showWarnings(issues);

  // Cost per unit example (GHS)
  const costPerUnit = {
    wood: { doors: 300, windows: 250, frames: 200 },
    metal: { doors: 400, windows: 350, frames: 300 }
  };

  const unitCost = (costPerUnit[material] && costPerUnit[material][type]) || 0;
  const totalCost = unitCost * quantity;

  renderEstimate("Carpentry", [
    `Work Type: ${type}`,
    `Material: ${material}`,
    `Quantity: ${quantity} units`
  ], totalCost);
}

// Roofing
function calculateRoofing() {
  const sheetCount = parseInt(document.getElementById("roofingSheets").value);
  const sheetType = document.getElementById("roofingSheetType").value;
  const issues = [];

  if (isNaN(sheetCount) || sheetCount < 1) issues.push("Enter valid number of roofing sheets.");
  if (!sheetType) issues.push("Select roofing sheet type.");

  if (issues.length) return showWarnings(issues);

  // Cost per sheet example (GHS)
  const costPerSheet = sheetType === "metal" ? 150 : 100;
  const totalCost = costPerSheet * sheetCount;

  renderEstimate("Roofing", [
    `Roofing Sheets: ${sheetCount}`,
    `Sheet Type: ${sheetType}`,
    `Material Quantity: ${sheetCount} sheets`
  ], totalCost);
}

// Finishes
function calculateFinishes() {
  const paintLiters = parseFloat(document.getElementById("paintLiters").value);
  const tileCount = parseInt(document.getElementById("tileCount").value);
  const issues = [];

  if (isNaN(paintLiters) || paintLiters < 0) issues.push("Enter valid paint liters.");
  if (isNaN(tileCount) || tileCount < 0) issues.push("Enter valid tile quantity.");

  if (issues.length) return showWarnings(issues);

  // Prices per unit example (GHS)
  const paintCostPerLiter = 50;
  const tileCostPerUnit = 30;

  const totalCost = (paintLiters * paintCostPerLiter) + (tileCount * tileCostPerUnit);

  renderEstimate("Finishes", [
    `Paint: ${paintLiters.toFixed(2)} liters`,
    `Tiles: ${tileCount} units`
  ], totalCost);
}

// Mechanical
function calculateMechanical() {
  const hvacUnits = parseInt(document.getElementById("hvacUnits").value);
  const plumbingFixtures = parseInt(document.getElementById("plumbingFixtures").value);
  const issues = [];

  if (isNaN(hvacUnits) || hvacUnits < 0) issues.push("Enter valid HVAC units.");
  if (isNaN(plumbingFixtures) || plumbingFixtures < 0) issues.push("Enter valid plumbing fixtures count.");

  if (issues.length) return showWarnings(issues);

  // Prices (GHS)
  const hvacUnitCost = 4000;
  const plumbingFixtureCost = 800;

  const totalCost = (hvacUnits * hvacUnitCost) + (plumbingFixtures * plumbingFixtureCost);

  renderEstimate("Mechanical", [
    `HVAC Units: ${hvacUnits}`,
    `Plumbing Fixtures: ${plumbingFixtures}`
  ], totalCost);
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

  // Prices (GHS)
  const lightCost = 250;
  const outletCost = 150;
  const securityCost = 3000;

  const totalCost = (lights * lightCost) + (outlets * outletCost) + (securitySystems * securityCost);

  renderEstimate("Electrical", [
    `Lighting Fixtures: ${lights}`,
    `Power Outlets: ${outlets}`,
    `Security Systems: ${securitySystems}`
  ], totalCost);
}

