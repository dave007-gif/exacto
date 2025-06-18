import { SMM7_2023 } from './formulas.js';
import { SMM7_CATEGORIES } from './smm7_categories.js';
import { COMPONENT_TO_FORMULA_MAP } from './component_to_formula_map.js';
import { INPUT_UNITS } from './input_units.js'; // If in a separate file, else skip this line
// --- Currency Service Imports and Setup ---
import { fetchCurrencyRates, convertAmount, getLastRateTimestamp } from './currencyService.js';
import { boqData, addToBOQ, addBill, setProjectDetails, calculateSummary, initBillsFromTemplate, resetBOQ, prepareBOQForExport, validateBOQ } from './boqData.js';

// --- Debug: Script loaded ---
console.log("script.js loaded");

// Clear all saved projects from localStorage on calculation page load
localStorage.removeItem('projects');

let currencyRates = { GHS: 1 };
let lastRateTimestamp = null;
let lastUsedCurrency = 'GHS'
let lastMeanGirth = 0;

/*// --- Role-based currency UI gating ---
function setupCurrencyUI(userRoles) {
    const currencySelect = document.getElementById('currency-select');
    const refreshBtn = document.getElementById('refresh-rates-btn');
    if (!currencySelect || !refreshBtn) return;
    if (userRoles.includes('student')) {
        currencySelect.style.display = 'none';
        refreshBtn.style.display = 'none';
    } else {
        currencySelect.style.display = 'inline-block';
        refreshBtn.style.display = 'inline-block';
    }
}*/

// ...existing imports...

// --- Auto-save, Restore, and Version Warning Logic ---

let currentProjectId = null;
let currentFormulaVersion = null;
let projectFormulaVersion = null;
let autoSaveTimer = null;
let lastSavedData = null;

// Define your standard bill template (ACECoR/SMM7 style)
const billTemplate = [
    { billNo: "1", title: "Preliminaries / General Conditions" },
    { billNo: "2A", title: "Substructure" },
    { billNo: "2B", title: "Superstructure" },
    { billNo: "PS", title: "Provisional Sums" },
    { billNo: "CONT", title: "Contingencies" }
];

// Initialize bills at project start or when starting a new project
initBillsFromTemplate(billTemplate);


// Fetch the current formula version from backend
async function fetchCurrentFormulaVersion() {
    const res = await fetch('/api/version');
    const data = await res.json();
    return data.version;
}

function gatherCalculationData() {
    const data = {};
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name) data[input.name] = input.value;
    });
    // Save selected components as their value (not label)
    const componentSelect = document.getElementById('elements');
    if (componentSelect) {
        data.selectedComponents = Array.from(componentSelect.selectedOptions).map(opt => opt.value);
    }
    return data;
}

// Show version warning if needed
function showVersionWarning(projectVersion, currentVersion) {
    let warning = document.getElementById('version-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'version-warning';
        warning.style.background = '#ffe0b2';
        warning.style.color = '#b26a00';
        warning.style.padding = '10px';
        warning.style.marginBottom = '10px';
        warning.style.fontWeight = 'bold';
        document.body.prepend(warning);
    }
    warning.textContent = `Warning: This project uses formula version ${projectVersion}, but the current version is ${currentVersion}. Results are frozen.`;
    warning.style.display = 'block';
}

// Auto-save logic
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveProjectAuto, 2000); // Save 2s after last change
}

async function saveProjectAuto() {
    if (!currentProjectId) return;
    const calculationData = gatherCalculationData();
    if (JSON.stringify(calculationData) === JSON.stringify(lastSavedData)) return;
    lastSavedData = calculationData;

    await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            calculation_data: JSON.stringify(calculationData)
        })
    });
}

// Prompt on page unload if unsaved changes
window.addEventListener('beforeunload', (e) => {
    const calculationData = gatherCalculationData();
    if (JSON.stringify(calculationData) !== JSON.stringify(lastSavedData)) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Listen for changes to trigger auto-save
document.addEventListener('input', scheduleAutoSave);
document.addEventListener('change', scheduleAutoSave);

/*// On page load, restore project if project_id is present
async function loadProjectIfNeeded() {
    const params = new URLSearchParams(window.location.search);
    currentProjectId = params.get('project_id');
    if (!currentProjectId) return;

    // Fetch project
    const res = await fetch(`/api/projects/${currentProjectId}`, { credentials: 'include' });
    if (!res.ok) {
        alert('Could not load project.');
        return;
    }
    const project = await res.json();
    projectFormulaVersion = project.formula_version;
    lastSavedData = project.calculation_data ? JSON.parse(project.calculation_data) : {};

    // Restore UI from lastSavedData
    restoreCalculationUI(lastSavedData);

    // Version warning
    currentFormulaVersion = await fetchCurrentFormulaVersion();
    if (projectFormulaVersion !== currentFormulaVersion) {
        showVersionWarning(projectFormulaVersion, currentFormulaVersion);
    }
}
document.addEventListener('DOMContentLoaded', loadProjectIfNeeded);*/


export async function loadProjectDetails(projectId) {
    try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project');
        const project = await res.json();
        setProjectDetails(project.details);
        boqData.bills = project.bills || [];
        // Optionally, recalculate summary if needed
        // calculateSummary();
        console.log('[loadProjectDetails] Loaded project:', boqData);
    } catch (err) {
        console.error('[loadProjectDetails] Error:', err);
    }
}

function restoreCalculationUI(data) {
    if (!data) return;
    // Restore input values
    for (const [key, value] of Object.entries(data)) {
        if (key === "selectedComponents") continue; // handled below
        const input = document.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    }
    // Restore selected components in dropdown
    const componentSelect = document.getElementById('elements');
    let selected = data.selectedComponents;
    // Fallback for old data: try to map label to value
    if ((!selected || !selected.length) && data.elements) {
        // Try to find the option whose label matches data.elements
        selected = [];
        Array.from(componentSelect.options).forEach(opt => {
            if (opt.text.trim().toLowerCase() === data.elements.trim().toLowerCase()) {
                selected.push(opt.value);
            }
        });
    }
    if (componentSelect && selected && selected.length) {
        Array.from(componentSelect.options).forEach(opt => {
            opt.selected = selected.includes(opt.value);
        });
        // Trigger change event to show fieldsets
        componentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        // Wait for DOM updates, then trigger calculate buttons
        setTimeout(() => {
            selected.forEach(component => {
                const btn = document.querySelector(`.calculate-btn[data-component="${component}"]`);
                if (btn) {
                    console.log(`[RestoreProject] Triggering calculate for: ${component}`);
                    btn.click();
                } else {
                    console.warn(`[RestoreProject] No calculate button found for: ${component}`);
                }
            });
        }, 100);
    }
}

function updateSectionAndGrandTotals() {
    const output = document.getElementById('output');
    // Remove old totals if present
    const oldTotals = output.querySelectorAll('.section-total, .grand-total');
    oldTotals.forEach(el => el.remove());

    // Group result-items by section
    const sectionMap = {};
    let grandTotal = 0;

    document.querySelectorAll('.result-item').forEach(item => {
        // Get component type and total cost
        const componentType = item.querySelector('h4')?.textContent;
        const totalCostP = item.querySelector('.result-total-cost');
        let totalCost = 0;
        if (totalCostP) {
            // Extract the GHS value (before any slash)
            const match = totalCostP.textContent.match(/GHS\s*([\d,.]+)/);
            if (match) totalCost = parseFloat(match[1].replace(/,/g, '')) || 0;
        }
        // Find section for this component
        let section = "Other";
        for (const [sectionKey, sectionObj] of Object.entries(SMM7_CATEGORIES)) {
            if (sectionObj.components.includes(componentType)) {
                section = sectionKey;
                break;
            }
        }
        if (!sectionMap[section]) sectionMap[section] = 0;
        sectionMap[section] += totalCost;
        grandTotal += totalCost;
    });

    // Get selected currency and rates
    const currencySelect = document.getElementById('currency-select');
    const selectedCurrency = currencySelect ? currencySelect.value : 'GHS';
    const fxEnabled = selectedCurrency && selectedCurrency !== 'GHS' && currencyRates[selectedCurrency];

    console.log('[SectionTotals] selectedCurrency:', selectedCurrency, 'fxEnabled:', fxEnabled, 'currencyRates:', currencyRates);

    // Render section totals
    Object.entries(sectionMap).forEach(([section, total]) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-total';
        sectionDiv.style.fontWeight = 'bold';
        sectionDiv.style.marginTop = '10px';

        let text = `${section} Section Total: GHS ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (fxEnabled) {
            const fxTotal = convertAmount(total, 'GHS', selectedCurrency);
            text += ` / ${selectedCurrency} ${fxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log(`[SectionTotals] ${section} FX:`, fxTotal);
        }
        sectionDiv.textContent = text;
        output.appendChild(sectionDiv);
    });

    // Render grand total
    const grandDiv = document.createElement('div');
    grandDiv.className = 'grand-total';
    grandDiv.style.fontWeight = 'bold';
    grandDiv.style.marginTop = '10px';
    grandDiv.style.fontSize = '1.1em';

    let grandText = `GRAND TOTAL: GHS ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (fxEnabled) {
        const fxGrand = convertAmount(grandTotal, 'GHS', selectedCurrency);
        grandText += ` / ${selectedCurrency} ${fxGrand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        console.log('[SectionTotals] Grand FX:', fxGrand);
    }
    grandDiv.textContent = grandText;
    output.appendChild(grandDiv);
}

// --- Render result item with data attributes ---
function renderResultItem(componentType, description, quantity, unit, totalMaterialCost, labor, finalPlantCost, inputs) {
    const output = document.getElementById('output');

    // Check if a result for this component already exists
    const existing = Array.from(output.querySelectorAll('.result-item')).find(
        item => item.querySelector('h4')?.textContent === componentType
    );

    // Always show GHS values
    let materialCostGHS = totalMaterialCost.toFixed(2);
    let laborCostGHS = labor.laborCost.toFixed(2);
    let plantCostGHS = finalPlantCost.toFixed(2);
    let totalCostGHS = (totalMaterialCost + labor.laborCost + finalPlantCost).toFixed(2);

    let currency = lastUsedCurrency || 'GHS';
    let materialCostConverted = '';
    let laborCostConverted = '';
    let plantCostConverted = '';
    let totalCostConverted = '';

    if (currency !== 'GHS' && currencyRates[currency]) {
        materialCostConverted = `${currency} ${convertAmount(totalMaterialCost, 'GHS', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        laborCostConverted = `${currency} ${convertAmount(labor.laborCost, 'GHS', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        plantCostConverted = `${currency} ${convertAmount(finalPlantCost, 'GHS', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        totalCostConverted = `${currency} ${convertAmount(totalMaterialCost + labor.laborCost + finalPlantCost, 'GHS', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.setAttribute('data-material-cost', totalMaterialCost);
    resultItem.setAttribute('data-labor-cost', labor.laborCost);
    resultItem.setAttribute('data-plant-cost', finalPlantCost);
    resultItem.setAttribute('data-currency', 'GHS');
    resultItem.setAttribute('data-inputs', JSON.stringify(inputs));
    resultItem.innerHTML = `
        <h4>${componentType}</h4>
        <p>Description: ${description}</p>
        <p>Quantity: ${quantity.toFixed(2)} ${unit}</p>
        <p class="result-material-cost">Total Material Cost: GHS ${materialCostGHS}${materialCostConverted ? ' / ' + materialCostConverted : ''}</p>
        <p>Total Days: ${labor.totalDays ? labor.totalDays.toFixed(2) : 'N/A'} days</p>
        <p class="result-labor-cost">Labor Cost: GHS ${laborCostGHS}${laborCostConverted ? ' / ' + laborCostConverted : ''}</p>
        <p class="result-plant-cost">Plant Cost: GHS ${plantCostGHS}${plantCostConverted ? ' / ' + plantCostConverted : ''}</p>
        <p class="result-total-cost">Total Cost: GHS ${totalCostGHS}${totalCostConverted ? ' / ' + totalCostConverted : ''}</p>
    `;

    if (existing) {
        output.replaceChild(resultItem, existing);
    } else {
        output.appendChild(resultItem);
    }

    // Reset currency selector to GHS for new results, but do not overwrite lastUsedCurrency
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.value = 'GHS';
    }
}

// --- UI conversion logic with fallback warning ---
async function updateCurrencyDisplay(selectedCurrency) {
    try {
        console.log('[Currency] updateCurrencyDisplay called with:', selectedCurrency);
        if (!currencyRates[selectedCurrency]) {
            console.log('[Currency] Fetching rates for:', selectedCurrency);
            currencyRates = await fetchCurrencyRates('GHS');
            lastRateTimestamp = getLastRateTimestamp();
            console.log('[Currency] New rates fetched:', currencyRates);
        }
        document.getElementById('rate-timestamp').textContent =
            `Rates as of: ${lastRateTimestamp?.toLocaleString() || 'N/A'}`;
        lastUsedCurrency = selectedCurrency;

        document.querySelectorAll('.result-item').forEach((item, idx) => {
            console.log(`[Currency] Updating result-item #${idx + 1}`);
            // Material Cost
            const materialCostP = item.querySelector('.result-material-cost');
            if (materialCostP) {
                const baseValue = parseFloat(item.getAttribute('data-material-cost'));
                const ghsStr = `GHS ${baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                if (selectedCurrency !== 'GHS' && currencyRates[selectedCurrency]) {
                    const converted = convertAmount(baseValue, 'GHS', selectedCurrency);
                    const convStr = `${selectedCurrency} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    materialCostP.textContent = `Total Material Cost: ${ghsStr} / ${convStr}`;
                    console.log(`[Currency] Material: ${ghsStr} / ${convStr}`);
                } else {
                    materialCostP.textContent = `Total Material Cost: ${ghsStr}`;
                    console.log(`[Currency] Material: ${ghsStr}`);
                }
            }
            // Labor Cost
            const laborCostP = item.querySelector('.result-labor-cost');
            if (laborCostP) {
                const baseValue = parseFloat(item.getAttribute('data-labor-cost'));
                const ghsStr = `GHS ${baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                if (selectedCurrency !== 'GHS' && currencyRates[selectedCurrency]) {
                    const converted = convertAmount(baseValue, 'GHS', selectedCurrency);
                    const convStr = `${selectedCurrency} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    laborCostP.textContent = `Labor Cost: ${ghsStr} / ${convStr}`;
                    console.log(`[Currency] Labor: ${ghsStr} / ${convStr}`);
                } else {
                    laborCostP.textContent = `Labor Cost: ${ghsStr}`;
                    console.log(`[Currency] Labor: ${ghsStr}`);
                }
            }
            // Plant Cost
            const plantCostP = item.querySelector('.result-plant-cost');
            if (plantCostP) {
                const baseValue = parseFloat(item.getAttribute('data-plant-cost'));
                const ghsStr = `GHS ${baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                if (selectedCurrency !== 'GHS' && currencyRates[selectedCurrency]) {
                    const converted = convertAmount(baseValue, 'GHS', selectedCurrency);
                    const convStr = `${selectedCurrency} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    plantCostP.textContent = `Plant Cost: ${ghsStr} / ${convStr}`;
                    console.log(`[Currency] Plant: ${ghsStr} / ${convStr}`);
                } else {
                    plantCostP.textContent = `Plant Cost: ${ghsStr}`;
                    console.log(`[Currency] Plant: ${ghsStr}`);
                }
            }
            // Total Cost
            const total = ['material', 'labor', 'plant'].reduce((sum, type) =>
                sum + convertAmount(parseFloat(item.getAttribute(`data-${type}-cost`)), 'GHS', selectedCurrency), 0);
            const totalGHS = ['material', 'labor', 'plant'].reduce((sum, type) =>
                sum + parseFloat(item.getAttribute(`data-${type}-cost`)), 0);
            const totalCostP = item.querySelector('.result-total-cost');
            if (totalCostP) {
                const ghsStr = `GHS ${totalGHS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                if (selectedCurrency !== 'GHS' && currencyRates[selectedCurrency]) {
                    const convStr = `${selectedCurrency} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    totalCostP.textContent = `Total Cost: ${ghsStr} / ${convStr}`;
                    console.log(`[Currency] Total: ${ghsStr} / ${convStr}`);
                } else {
                    totalCostP.textContent = `Total Cost: ${ghsStr}`;
                    console.log(`[Currency] Total: ${ghsStr}`);
                }
            }
            item.setAttribute('data-currency', selectedCurrency);
        });

        // --- Add this line to update section and grand totals in FX ---
        updateSectionAndGrandTotals();

    } catch (e) {
        console.error('[Currency] updateCurrencyDisplay error:', e);
        alert('Currency conversion failed. Showing values in GHS. Rates may be outdated.');
        // Fallback: revert to GHS
        document.getElementById('currency-select').value = 'GHS';
        updateCurrencyDisplay('GHS');
    }
}

// --- Event listeners for currency UI ---
document.getElementById('currency-select')?.addEventListener('change', (e) => {
    updateCurrencyDisplay(e.target.value);
});
document.getElementById('refresh-rates-btn')?.addEventListener('click', async () => {
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) await updateCurrencyDisplay(currencySelect.value);
});


// Function to validate consistency between SMM7_CATEGORIES and SMM7_2023
function validateSMM7Data() {
    const missingFormulas = [];
    Object.keys(SMM7_CATEGORIES).forEach((category) => {
        SMM7_CATEGORIES[category].components.forEach((component) => {
            const formulaKey = COMPONENT_TO_FORMULA_MAP[component];
            if (!formulaKey || !SMM7_2023[formulaKey]) {
                missingFormulas.push(component);
            }
        });
    });

    if (missingFormulas.length > 0) {
        console.error("Missing formulas for components:", missingFormulas);
        throw new Error(`The following components are missing formulas: ${missingFormulas.join(", ")}`);
    }
}
validateSMM7Data();

let haulageMultiplier = 1.0;

export async function generateBOQPDF() {
    console.log('[generateBOQPDF] Starting PDF generation...');
    try {
        if (!boqData || !Array.isArray(boqData.bills) || boqData.bills.length === 0) {
            console.error('[generateBOQPDF] No BOQ data or bills found:', boqData);
            alert("No BOQ data available to generate PDF.");
            return;
        }
        // --- PDFLib setup ---
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const pageSize = [595, 842];
        const margin = 40;
        // 1. Wider description column and padding
        const colWidths = [40, 260, 45, 40, 65, 65]; // Adjust as needed
        const descPadding = 6; // Padding for description column

        // --- Embed fonts ---
        const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // --- Helper: Draw vertical column lines (with double lines for outer columns) ---
        function drawColumnLines(page, yTop, yBottom) {
            let x = margin;
            for (let i = 0; i <= colWidths.length; i++) {
                const isOuter = (i === 0 || i === colWidths.length);
                if (isOuter) {
                    // Double line for outer columns
                    page.drawLine({ start: { x, y: yTop }, end: { x, y: yBottom }, thickness: 1.2, color: rgb(0,0,0) });
                    page.drawLine({ start: { x: x + 2, y: yTop }, end: { x: x + 2, y: yBottom }, thickness: 1.2, color: rgb(0,0,0) });
                } else {
                    // Single line for inner columns
                    page.drawLine({ start: { x, y: yTop }, end: { x, y: yBottom }, thickness: 0.5, color: rgb(0,0,0) });
                }
                x += colWidths[i] || 0;
            }
        }

        // --- Helper: Draw double horizontal line ---
        function drawDoubleHorizontalLine(page, y) {
            const totalWidth = colWidths.reduce((a, b) => a + b, 0);
            page.drawLine({ start: { x: margin, y }, end: { x: margin + totalWidth, y }, thickness: 1.2, color: rgb(0,0,0) });
            page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: margin + totalWidth, y: y - 2 }, thickness: 1.2, color: rgb(0,0,0) });
        }

        // --- Header function (unchanged) ---
        function drawHeader(page, yStart) {
            let y = yStart;
            const d = boqData.projectDetails || {};
            try {
                page.drawText(d.companyName || '', { x: margin, y, size: 12, color: rgb(0,0,0) });
                y -= 15;
                (d.companyAddress || '').split('\n').forEach(line => {
                    page.drawText(line, { x: margin, y, size: fontSize, color: rgb(0,0,0) });
                    y -= 12;
                });
                page.drawText(d.contactInfo || '', { x: margin, y, size: fontSize });
                y -= 15;
                page.drawText(d.projectTitle || '', { x: margin, y, size: 13, color: rgb(0,0,0) });
                y -= 15;
                page.drawText(`FOR ${d.clientName || ''}`, { x: margin, y, size: 12, color: rgb(0,0,0) });
                y -= 15;
                page.drawText(d.projectPhase || '', { x: margin, y, size: 11, color: rgb(0,0,0) });
                y -= 20;
            } catch (err) {
                console.error('[generateBOQPDF] Error drawing header:', err, d);
            }
            return y;
        }

        // --- Table header with double horizontal line below ---
        function drawTableHeader(page, y) {
            const headers = ["ITEM", "DESCRIPTION", "QTY", "UNIT", "RATE (GHe)", "AMOUNT (GHe)"];
            let x = margin;
            headers.forEach((h, i) => {
                page.drawText(h, { x, y, size: fontSize, color: rgb(0,0,0) });
                x += colWidths[i];
            });
            // Draw double horizontal line below header
            drawDoubleHorizontalLine(page, y - 3);
            // Draw vertical column lines for the table area (header row height: 15)
            drawColumnLines(page, y + 3, y - 15);
            return y - 15;
        }

        // 2. Word-wrap helper
        function wrapText(text, font, fontSize, maxWidth) {
            const words = text.split(' ');
            let lines = [];
            let currentLine = '';
            for (let word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                if (testWidth > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        }

        // 3. Improved row rendering with word-wrap and padding
        function drawBOQItemRow(page, yPos, item, itemCode, normalFont, boldFont) {
            let x = margin;

            // Draw item code (A, B, ...)
            page.drawText(itemCode, { x, y: yPos, size: fontSize, font: normalFont, color: rgb(0,0,0) });
            x += colWidths[0];

            // Draw Description: Component name (bold, underlined), then description (word-wrapped)
            let descY = yPos;
            page.drawText(item.category, { x: x + descPadding, y: descY, size: fontSize, font: boldFont, color: rgb(0,0,0) });
            const compWidth = boldFont.widthOfTextAtSize(item.category, fontSize);
            page.drawLine({
                start: { x: x + descPadding, y: descY - 2 },
                end: { x: x + descPadding + compWidth, y: descY - 2 },
                thickness: 0.7,
                color: rgb(0,0,0)
            });
            descY -= fontSize + 2;

            // --- Word-wrap the description ---
            const descLines = wrapText(item.description, normalFont, fontSize, colWidths[1] - 2 * descPadding);
            for (const line of descLines) {
                page.drawText(line, { x: x + descPadding, y: descY, size: fontSize, font: normalFont, color: rgb(0,0,0) });
                descY -= fontSize + 1;
            }

            // Draw other columns (Qty, Unit, Rate, Amount) aligned with the first line
            let colX = margin + colWidths[0] + colWidths[1];
            const columns = [
                item.quantity ?? '',
                item.unit || '',
                typeof item.rate === 'number' ? item.rate.toFixed(2) : '',
                typeof item.amount === 'number' ? item.amount.toFixed(2) : ''
            ];
            columns.forEach((cell, i) => {
                page.drawText(String(cell), { x: colX, y: yPos, size: fontSize, font: normalFont, color: rgb(0,0,0) });
                colX += colWidths[i + 2];
            });

            // Adjust row height for wrapped description
            const rowHeight = (fontSize + 1) * (descLines.length + 1) + 6;
            drawColumnLines(page, yPos + 3, yPos - rowHeight);

            // Return new yPos (move down by the row height)
            return yPos - rowHeight;
        }

        // --- PDF page and yPos setup ---
        let page = pdfDoc.addPage(pageSize);
        let fontSize = 10;
        let yPos = pageSize[1] - margin; // <-- Initialize yPos at the start

        // --- Draw each bill ---
        for (const bill of boqData.bills) {
            if (!bill || !bill.items) continue;
            if (yPos < 120) {
                page = pdfDoc.addPage(pageSize);
                yPos = drawHeader(page, pageSize[1] - margin);
            }
            page.drawText(`BILL No. ${bill.billNo || ''}: ${bill.title || ''}`, { x: margin, y: yPos, size: 11, color: rgb(0,0,0) });
            yPos -= 18;
            yPos = drawTableHeader(page, yPos);

            let itemCodeChar = 0;
            for (const item of bill.items) {
                if (!item) continue;
                if (yPos < 60) {
                    page = pdfDoc.addPage(pageSize);
                    yPos = drawHeader(page, pageSize[1] - margin);
                    yPos = drawTableHeader(page, yPos);
                    itemCodeChar = 0;
                }
                const itemCode = String.fromCharCode(65 + itemCodeChar);
                yPos = drawBOQItemRow(page, yPos, item, itemCode, normalFont, boldFont);
                itemCodeChar++;
                if (itemCodeChar > 25) itemCodeChar = 0;
            }

            yPos -= 8;
            page.drawText(`SUMMARY OF BILL No.${bill.billNo || ''}`, { x: margin, y: yPos, size: fontSize, color: rgb(0,0,0) });
            page.drawText((typeof bill.total === 'number' ? bill.total.toFixed(2) : '0.00'), { x: margin + 420, y: yPos, size: fontSize, color: rgb(0,0,0) });
            yPos -= 20;
        }

        // Grand summary (unchanged)
        let subtotal = 0, contingency = 0, grandTotal = 0;
        try {
            subtotal = boqData.bills.reduce((sum, b) => sum + (b.total || 0), 0);
            contingency = boqData.bills.some(bill => bill.items && bill.items.some(i => i.type === 'contingency'))
                ? boqData.bills.flatMap(bill => (bill.items || []).filter(i => i.type === 'contingency')).reduce((sum, i) => sum + (i.amount || 0), 0)
                : subtotal * 0.15;
            grandTotal = subtotal + contingency;
        } catch (err) {
            console.error('[generateBOQPDF] Error calculating summary:', err);
        }

        page.drawText("GENERAL SUMMARY", { x: margin, y: yPos, size: 11, color: rgb(0,0,0) });
        yPos -= 15;
        page.drawText(`SUB-TOTAL`, { x: margin, y: yPos, size: fontSize });
        page.drawText(subtotal.toFixed(2), { x: margin + 420, y: yPos, size: fontSize });
        yPos -= 13;
        page.drawText(`ADD For Contingencies (15%)`, { x: margin, y: yPos, size: fontSize });
        page.drawText(contingency.toFixed(2), { x: margin + 420, y: yPos, size: fontSize });
        yPos -= 13;
        page.drawText(`TOTAL ESTIMATE`, { x: margin, y: yPos, size: fontSize, color: rgb(0,0,0) });
        page.drawText(grandTotal.toFixed(2), { x: margin + 420, y: yPos, size: fontSize, color: rgb(0,0,0) });

        // Download (unchanged)
        try {
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `BOQ-${(boqData.projectDetails.projectTitle || 'Project')}.pdf`;
            link.click();
            alert("BOQ Report has been successfully generated!"); // <-- Success alert only here
        } catch (err) {
            console.error('[generateBOQPDF] Error saving or downloading PDF:', err);
            alert('Failed to generate or download PDF. See console for details.');
        }
    } catch (error) {
        console.error('[generateBOQPDF] PDF generation failed:', error);
        alert("Failed to generate BOQ PDF. See console for details.");
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOMContentLoaded event fired");
    try {
        await checkAuthentication();
        const userRoles = await fetchUserRoles();
        console.log("User roles:", userRoles);
        console.log("User roles array:", userRoles, typeof userRoles[0]); // <-- Add here
        checkRoleVisibility(userRoles);

        await loadLocations();
        await checkFormulaVersion();
        await fetchInitialRates();

        setupInputValidation();
        setupComponentDropdown();
        setupCalculateButtons();
        setupSaveProjectButton();
        // REMOVE or COMMENT OUT this line:
        // setupGenerateBOQButton();
        setupLogoutButton();

        // On page load, restore project if project_id is present
        const params = new URLSearchParams(window.location.search);
        currentProjectId = params.get('project_id');
        console.log('[RestoreProject] URL params:', Array.from(params.entries()));
        if (currentProjectId) {
            console.log('[RestoreProject] Found project_id:', currentProjectId);
            // Fetch project
            const res = await fetch(`/api/projects/${currentProjectId}`, { credentials: 'include' });
            console.log('[RestoreProject] Fetch response:', res);
            if (res.ok) {
                const project = await res.json();
                console.log('[RestoreProject] Loaded project:', project);
                projectFormulaVersion = project.formula_version;
                lastSavedData = project.calculation_data ? JSON.parse(project.calculation_data) : {};
                console.log('[RestoreProject] Parsed calculation_data:', lastSavedData);
                restoreCalculationUI(lastSavedData);

                // Version warning
                currentFormulaVersion = await fetchCurrentFormulaVersion();
                if (projectFormulaVersion !== currentFormulaVersion) {
                    showVersionWarning(projectFormulaVersion, currentFormulaVersion);
                }
            } else {
                alert('Could not load project.');
                console.error('[RestoreProject] Failed to fetch project. Status:', res.status);
            }
        }

        displayProjects();
    } catch (error) {
        console.error("Initialization failed:", error);
        alert("A critical error occurred during initialization. Please reload the page.");
    }
});

// --- Modularized Functions ---

async function checkAuthentication() {
    try {
        const res = await fetch('/api/verify-auth', { credentials: 'include' });
        if (!res.ok) throw new Error("Not authenticated");
        console.log("Authentication verified");
    } catch (err) {
        console.error("Authentication check failed:", err);
        window.location.href = '/login';
        throw new Error("Redirecting to login");
    }
}

async function fetchUserRoles() {
    try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        if (!res.ok) throw new Error("Profile fetch failed");
        const profile = await res.json();
        console.log("Fetched profile:", profile);
        return profile.roles || [];
    } catch (error) {
        console.error('Error fetching profile:', error);
        return [];
    }
}

function checkRoleVisibility(userRoles) {
    console.log("Checking role-based visibility for:", userRoles);
    const roleElements = document.querySelectorAll('[data-role]');
    roleElements.forEach(element => {
        const requiredRoles = element.dataset.role.split(',');
        const shouldShow = requiredRoles.some(role => userRoles.includes(role.trim()));
        element.style.display = shouldShow ? 'block' : 'none';
        console.log(`Element with data-role="${element.dataset.role}" set to display: ${shouldShow ? 'block' : 'none'}`);
    });
}



async function loadLocations() {
    try {
        const res = await fetch('/api/locations');
        if (!res.ok) throw new Error("Locations fetch failed");
        const locations = await res.json();
        console.log("Loaded locations:", locations);

        // Populate the existing select elements
        ['project-location', 'supplier-location'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '';
                locations.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc.zone;
                    option.textContent = `${loc.zone} (${loc.region})`;
                    select.appendChild(option);
                });
                select.addEventListener('change', updateHaulage);
                console.log(`Populated location select for ${selectId}`);
            } else {
                console.warn(`Select element not found for ${selectId}`);
            }
        });
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function checkFormulaVersion() {
    try {
        const res = await fetch('/api/version');
        if (!res.ok) throw new Error("Version fetch failed");
        const { version } = await res.json();
        const storedVersion = localStorage.getItem('formulaVersion');
        if (version !== storedVersion) {
            alert('New calculation methods are available. Please refresh the page.');
            localStorage.setItem('formulaVersion', version);
        }
        console.log("Formula version checked:", version);
    } catch (error) {
        console.error('Error checking formula version:', error);
    }
}

async function fetchInitialRates() {
    try {
        const materials = ['cement', 'sand', 'aggregate', 'blocks', 'mortar'];
        for (const mat of materials) {
            const data = await fetchMaterialRate(mat);
            if (data) console.log(`${mat} rate: ${data.unit_cost} GHS`);
        }

        const laborTasks = [
            'bricklaying',
            'concreting',
            'site clearance',
            'excavation',
            'tree cutting 600-1500',
            'tree cutting 1500-3000',
            'tree cutting over 3000'
        ];
        for (const task of laborTasks) {
            const data = await fetchLaborRate(task);
            if (data) console.log(`${task} rate: ${data.rate} GHS`);
        }
    } catch (error) {
        console.error('Error fetching initial rates:', error);
    }
}

function setupInputValidation() {
    console.log("Setting up input validation");
    const inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', function () { validateInput(this); });
        inputs[i].addEventListener('blur', function () { validateInput(this); });
    }
}

function addInternalTrenchInput(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Determine type for placeholder
    let type = '';
    if (containerId === 'int_hor_trenches') type = 'Horizontal trench (mm)';
    else if (containerId === 'int_ver_trenches') type = 'Vertical trench (mm)';
    else type = 'Internal trench (mm)';

    // Create a new input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'internal-trench-input';
    input.placeholder = type;
    input.pattern = '[0-9]+([\\.,][0-9]+)?';
    input.autocomplete = 'off';

    // Optional: add validation/error span
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-message';

    // Wrap input and error in a <p>
    const p = document.createElement('p');
    p.appendChild(input);
    p.appendChild(errorSpan);

    container.appendChild(p);
}
// Make it available globally for inline onclick handlers
window.addInternalTrenchInput = addInternalTrenchInput;

function setupComponentDropdown() {
    console.log("Setting up component dropdown");
    const componentSelect = document.getElementById("elements");
    const allFieldsets = document.querySelectorAll('fieldset[data-component]');
    if (!componentSelect || allFieldsets.length === 0) {
        console.warn("Component dropdown or component fieldsets not found");
        return;
    }

    componentSelect.addEventListener("change", function () {
        const selectedValues = Array.from(componentSelect.selectedOptions).map(opt => opt.value);

        allFieldsets.forEach(fieldset => {
            const component = fieldset.getAttribute('data-component');
            const shouldShow = selectedValues.includes(component);
            fieldset.classList.toggle('hidden', !shouldShow);
            // Set required only for visible fieldset inputs
            fieldset.querySelectorAll("input").forEach(input => input.required = shouldShow);

            // Attach mix ratio handler if this is the trench fieldset and it's being shown
            if (component === "concrete in trench" && shouldShow) {
                const mixRatioSelect = fieldset.querySelector('#mix_ratio');
                const customMixRow = fieldset.querySelector('#custom-mix-ratio-row');
                const customMixInput = fieldset.querySelector('#custom_mix_ratio');
                if (mixRatioSelect && customMixRow && customMixInput && !mixRatioSelect._handlerAttached) {
                    mixRatioSelect.addEventListener('change', function() {
                        if (this.value === 'custom') {
                            customMixRow.style.display = '';
                            customMixInput.required = true;
                        } else {
                            customMixRow.style.display = 'none';
                            customMixInput.required = false;
                            customMixInput.value = '';
                        }
                    });
                    // Also trigger the handler once to set initial state
                    if (mixRatioSelect.value === 'custom') {
                        customMixRow.style.display = '';
                        customMixInput.required = true;
                    } else {
                        customMixRow.style.display = 'none';
                        customMixInput.required = false;
                        customMixInput.value = '';
                    }
                    mixRatioSelect._handlerAttached = true;
                }
            }
        });

        console.log("Dropdown changed. Showing:", selectedValues);
    });

    // --- Add this block ---
    componentSelect.addEventListener("change", function () {
        const selectedOptions = componentSelect.selectedOptions;
        let isTrenchSelected = false;
        let isBlockworkSelected = false;

        for (let i = 0; i < selectedOptions.length; i++) {
            const optionValue = selectedOptions[i].value;
            if (optionValue === "concrete in trench") isTrenchSelected = true;
            if (optionValue === "blockwork in foundation") isBlockworkSelected = true;
        }

        trenchFieldset.style.display = isTrenchSelected ? "block" : "none";
        trenchFieldset.querySelectorAll("input").forEach(input => input.required = isTrenchSelected);
        blockworkFieldset.style.display = isBlockworkSelected ? "block" : "none";
        blockworkFieldset.querySelectorAll("input").forEach(input => input.required = isBlockworkSelected);

        // --- Add this block ---
        if (isTrenchSelected) {
            const meanGirthInput = document.getElementById('mean_girth');
            if (meanGirthInput) meanGirthInput.value = (lastMeanGirth * 1000).toFixed(2); // show in mm
        }
        // --- end block ---

        console.log("Dropdown changed. Trench:", isTrenchSelected, "Blockwork:", isBlockworkSelected);
    });
    // --- end block ---
}

// Special labor fetch handlers for scalable special-case logic
const SPECIAL_LABOR_FETCH_HANDLERS = {
    'tree cutting': async (component) => {
        const girthTasks = [
            'tree cutting 600-1500',
            'tree cutting 1500-3000',
            'tree cutting over 3000'
        ];
        const laborRates = {};
        for (const task of girthTasks) {
            const laborData = await fetchLaborRate(task);
            if (laborData) {
                laborRates[task] = laborData.rate;
            }
        }
        return laborRates;
    },
    // Add more special cases here as needed
};

// Scalable price fetcher
async function fetchPricesForComponent(componentKey) {
    const component = SMM7_2023[componentKey];
    if (!component) {
        console.error(`Unknown component type: ${componentKey}`);
        return null;
    }

    // Fetch material prices
    const materialPrices = {};
    for (const material of component.materials || []) {
        const materialData = await fetchMaterialRate(material);
        if (materialData) {
            materialPrices[material] = materialData.unit_cost;
        }
    }
    console.log(`Material Prices for ${componentKey}:`, materialPrices);

    // Fetch labor rates (use special handler if exists)
    let laborRates = {};
    if (SPECIAL_LABOR_FETCH_HANDLERS[componentKey]) {
        laborRates = await SPECIAL_LABOR_FETCH_HANDLERS[componentKey](component);
    } else {
        for (const task of component.laborTasks || []) {
            const laborData = await fetchLaborRate(task);
            if (laborData) {
                laborRates[task] = laborData.rate;
            }
        }
    }
    console.log(`Labor Rates for ${componentKey}:`, laborRates);

    return { materialPrices, laborRates };
}

function setupCalculateButtons() {
    console.log("Setting up calculate buttons");
    const buttons = document.querySelectorAll('.calculate-btn');
    if (!buttons.length) {
        console.warn("No calculate buttons found");
        return;
    }
    let calculatedComponents = new Set();
    const componentSelect = document.getElementById("elements");
    const adjustments = window.adjustments || {};

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', async function () {
            console.log("Calculate button clicked:", this.dataset.component);
            const componentType = this.dataset.component;
            const fieldset = this.closest('fieldset');
            const inputs = fieldset.querySelectorAll('input, select');
            let isValid = true;

            // --- 1. VALIDATION LOOP (do NOT set inputValues here) ---
            for (let j = 0; j < inputs.length; j++) {
                const input = inputs[j];
                // Only validate if input is visible and required
                if (
                    input.offsetParent !== null && // visible
                    input.required !== false // required
                ) {
                    // Special case for custom mix ratio
                    if (input.id === "custom_mix_ratio") {
                        const mixRatioSelect = fieldset.querySelector('#mix_ratio');
                        if (mixRatioSelect && mixRatioSelect.value === 'custom') {
                            // Validate as a ratio string
                            const pattern = /^\d+(\.\d+)?:\d+(\.\d+)?:\d+(\.\d+)?$/;
                            if (!input.value.trim() || !pattern.test(input.value.trim())) {
                                showError(input, input.parentElement.querySelector('.error-message'), 'Enter a valid custom mix ratio (e.g. 1:2:3)');
                                isValid = false;
                            }
                        }
                        continue; // Skip numeric validation for this field
                    } else if (input.type === "text" && input.id === "mix_ratio") {
                        // Skip numeric validation for the mix_ratio select
                        continue;
                    } else {
                        if (!validateInput(input)) isValid = false;
                    }
                }
            }

            if (!isValid) {
                console.warn("Input validation failed");
                return;
            }

            // --- 2. GATHER VALUES LOOP ---
            const inputValues = {};
            for (let j = 0; j < inputs.length; j++) {
                const input = inputs[j];
                const inputName = input.name;

                // Special handling for custom_mix_ratio
                if (input.id === "custom_mix_ratio") {
                    const mixRatioSelect = fieldset.querySelector('#mix_ratio');
                    if (mixRatioSelect && mixRatioSelect.value === 'custom') {
                        inputValues[inputName] = input.value.trim(); // Always as string
                    }
                    continue; // Skip numeric validation for this field
                }

                // For mix_ratio select, store as string
                if (input.id === "mix_ratio") {
                    inputValues[inputName] = input.value;
                    continue;
                }

                if (input.type === "number" || input.type === "text") {
                    const val = parseFloat(input.value);
                    if (isNaN(val)) {
                        alert(`Please enter a valid number for ${inputName}`);
                        return;
                    }
                    inputValues[inputName] = val;
                } else if (input.tagName === "SELECT") {
                    inputValues[inputName] = input.value;
                }
            }
            // For dynamic trench fields, collect arrays
            if (fieldset.querySelectorAll('.internal-trench-input').length) {
                inputValues.int_hor_trenches = Array.from(fieldset.querySelectorAll('#int_hor_trenches input')).map(inp => parseFloat(inp.value) || 0);
                inputValues.int_ver_trenches = Array.from(fieldset.querySelectorAll('#int_ver_trenches input')).map(inp => parseFloat(inp.value) || 0);
            }

            // --- 3. SET mix_ratio CORRECTLY ---
            if (componentType === "concrete in trench") {
                const mixRatioSelect = fieldset.querySelector('#mix_ratio');
                let mix_ratio = mixRatioSelect ? mixRatioSelect.value : "1:2:4";
                if (mix_ratio === 'custom') {
                    const customMixInput = fieldset.querySelector('#custom_mix_ratio');
                    if (customMixInput && customMixInput.value.trim()) {
                        mix_ratio = customMixInput.value.trim();
                    }
                }
                inputValues.mix_ratio = mix_ratio;
            }
            // --- END BLOCK ---

            // Convert units from mm to meters if applicable
            Object.keys(inputValues).forEach(field => {
                if (INPUT_UNITS[field] === 'mm') {
                    if (Array.isArray(inputValues[field])) {
                        inputValues[field] = inputValues[field].map(val => val / 1000);
                    } else {
                        inputValues[field] = inputValues[field] / 1000;
                    }
                }
            });

            console.log("Input values for calculation:", inputValues);

            const formulaKey = COMPONENT_TO_FORMULA_MAP[componentType];
            if (!formulaKey || !SMM7_2023[formulaKey]) {
                alert(`No formula found for component: ${componentType}. Please check your inputs.`);
                return;
            }

            // --- Add this block for trench excavation ---
            if (formulaKey === "trench excavation") {
                // Replicate the mean girth logic from your formulas.js
                const extGirth = 2 * ((inputValues.ext_len || 0) + (inputValues.ext_width || 0)) - 4 * (inputValues.spread_trench || 0);
                const intHor = (inputValues.int_hor_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
                const intVer = (inputValues.int_ver_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
                lastMeanGirth = extGirth + intHor + intVer;
                // Optionally, update the mean girth field if visible
                const meanGirthInput = document.getElementById('mean_girth');
                if (meanGirthInput) meanGirthInput.value = (lastMeanGirth * 1000).toFixed(2); // show in mm
            }
            // --- end block ---

            const prices = await fetchPricesForComponent(formulaKey);
            if (!prices) {
                alert(`Failed to fetch prices for ${componentType}. Please try again.`);
                return;
            }

            const { materialPrices, laborRates } = prices;
            const formula = SMM7_2023[formulaKey].formula;
            const quantity = formula(inputValues, adjustments.concrete_waste_factor || 1);
            if (isNaN(quantity)) {
                alert("Failed to calculate quantity. Please check your inputs.");
                return;
            }

            // Material cost
            let totalMaterialCost = 0;
            for (const material of SMM7_2023[formulaKey].materials || []) {
                totalMaterialCost += (materialPrices[material] || 0) * quantity;
            }

            // Determine correct labor task (dynamic for tree cutting, static for others)
            let laborTask;
            if (typeof SMM7_2023[formulaKey].getLaborTask === 'function') {
                laborTask = SMM7_2023[formulaKey].getLaborTask(inputValues);
            } else if (Array.isArray(SMM7_2023[formulaKey].laborTasks) && SMM7_2023[formulaKey].laborTasks.length > 0) {
                laborTask = SMM7_2023[formulaKey].laborTasks[0];
            } else {
                laborTask = null;
            }

            // Labor cost calculation
            let labor;
            if (laborTask && typeof SMM7_2023[formulaKey].calculateLaborCost === 'function') {
                labor = SMM7_2023[formulaKey].calculateLaborCost(inputValues, laborRates);
            } else {
                labor = SMM7_2023.calculateLaborCost(
                    quantity,
                    8,
                    adjustments.labor_efficiency || 1,
                    8,
                    laborRates[laborTask] || 0,
                    laborTask
                );
            }
            if (!labor || isNaN(labor.laborCost)) {
                alert("Failed to calculate labor cost. Please check your inputs.");
                return;
            }

            // Plant cost
            const plantData = await fetchPlantData();
            const equipmentList = SMM7_2023[formulaKey].equipment || [];
            const relevantPlants = plantData.filter(plant =>
                equipmentList.includes(plant.equipment)
            );
            const plantCost = SMM7_2023.calculatePlantCost(quantity, relevantPlants);

            // Apply haulage multiplier
            totalMaterialCost *= haulageMultiplier;
            labor.laborCost *= haulageMultiplier;
            const finalPlantCost = plantCost * haulageMultiplier;

            // Add these lines before renderResultItem:
            const unit = SMM7_2023[formulaKey].unit || "m³";
            const description = typeof SMM7_2023[formulaKey].description === 'function'
                ? SMM7_2023[formulaKey].description(inputValues)
                : (SMM7_2023[formulaKey].reference || componentType);

            renderResultItem(
                componentType,
                description,
                quantity,
                unit,
                totalMaterialCost,
                labor,
                finalPlantCost,
                inputValues // <-- pass original inputs here
            );

            updateSectionAndGrandTotals();

            calculatedComponents.add(componentType);

            const selectedComponents = Array.from(componentSelect.selectedOptions).map(option => option.value);
            if (selectedComponents.every(component => calculatedComponents.has(component))) {
                const saveBtn = document.getElementById('save-project-btn');
                if (saveBtn) saveBtn.style.display = 'block';
            }
            const saveBtn = document.getElementById('save-project-btn');
            if (saveBtn) saveBtn.style.display = 'block';
        });
    }
}

function setupSaveProjectButton() {
    console.log("Setting up save project button");
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) {
        console.warn("Save project button not found");
        return;
    }
    saveBtn.addEventListener('click', async function () {
        const projectName = prompt("Enter a name for this project:");
        if (!projectName) {
            alert("Project name is required.");
            return;
        }

        // Collect all results
        const results = document.querySelectorAll('.result-item');
        let totalCost = 0;

        results.forEach(result => {
            const materialCost = parseFloat(result.querySelector('p:nth-child(3)').textContent.split(': ')[1].replace('GHS ', ''));
            const laborCost = parseFloat(result.querySelector('p:nth-child(5)').textContent.split(': ')[1].replace('GHS ', ''));
            const plantCost = parseFloat(result.querySelector('p:nth-child(6)').textContent.split(': ')[1].replace('GHS ', ''));
            totalCost += materialCost + laborCost + plantCost;
        });

        // Save the project ONCE
        try {
            await saveProject({
                project_name: projectName,
                total_cost: totalCost
            });
            alert(`Project "${projectName}" saved successfully! Total Cost: GHS ${totalCost.toFixed(2)}`);
            displayProjects();
        } catch (e) {
            alert("Failed to save project.");
        }
    });
}

function setupLogoutButton() {
    console.log("Setting up dashboard button");
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (!dashboardBtn) {
        console.warn("Dashboard button not found");
        return;
    }
    dashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });
}

// Validation functions
function validateInput(input) {
    const errorSpan = input.parentElement.querySelector('.error-message');
    const value = input.value.trim();

    input.classList.remove('invalid');
    errorSpan.style.display = 'none';

    if (value === '') {
        showError(input, errorSpan, 'This field is required');
        return false;
    }

    // Skip numeric validation for select fields
    if (input.tagName === "SELECT") {
        return true;
    }

    // --- SKIP numeric validation for custom_mix_ratio ---
    if (input.id === "custom_mix_ratio") {
        // Validation is handled separately in setupCalculateButtons
        return true;
    }

    // Convert value to number here, so it can be used later
    const numericValue = parseFloat(value);

    // Check for valid number using html 5 validation
    if (!input.checkValidity() || isNaN(numericValue)) {
        showError(input, errorSpan, 'Please enter a valid number');
        return false;
    }

    if (numericValue < 0) {
        showError(input, errorSpan, 'Value cannot be negative');
        return false;
    }
    console.log("Input value is valid:", numericValue); // Debugging line here

    return true;
}

function showError(input, errorSpan, message) {
    input.classList.add('invalid');
    errorSpan.textContent = message;
    errorSpan.style.display = 'block';
}

// Haulage calculation handler
const updateHaulage = async () => {
    const projectLoc = document.getElementById('project-location').value;
    const supplierLoc = document.getElementById('supplier-location').value;

    try {
        const response = await fetch('/api/haulage-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_location: projectLoc, supplier_location: supplierLoc }),
            credentials: 'include'
        });

        const data = await response.json();
        haulageMultiplier = data.multiplier;
        boqData.haulage = {
            multiplier: data.multiplier,
            band: data.band
        };
        
        document.getElementById('haulage-multiplier').textContent = data.multiplier;
        document.getElementById('haulage-cost').style.display = 'block';
    } catch (error) {
        console.error('Haulage calculation failed:', error);
    }
};

// Check formula version
const response = await fetch('/api/version');
const { version } = await response.json();
const storedVersion = localStorage.getItem('formulaVersion');

if (version !== storedVersion) {
    alert('New calculation methods are available. Please refresh the page.');
    localStorage.setItem('formulaVersion', version);
}

// Fetch dynamic adjustments
const region = 'greater-accra'; // Example region
const adjustmentsResponse = await fetch(`/api/adjustments?region=${region}`);
const adjustments = await adjustmentsResponse.json();
console.log("Adjustments:", adjustments);


// Remove any logout logic for this button
const dashboardBtn = document.getElementById('dashboard-btn');
if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });
}



// DOM Elements
const componentSelect = document.getElementById("elements");
const trenchFieldset = document.getElementById("trenchField");
const blockworkFieldset = document.getElementById("blockworkField");

// Hide fields by default
trenchFieldset.style.display = "none";
blockworkFieldset.style.display = "none";



// Setup input validation
const inputs = document.getElementsByTagName('input');
for (let i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener('input', function () {
        validateInput(this);
    });
    inputs[i].addEventListener('blur', function () {
        validateInput(this);
    });
}

// Dropdown change handler
componentSelect.addEventListener("change", function () {
    const selectedOptions = componentSelect.selectedOptions;
    let isTrenchSelected = false;
    let isBlockworkSelected = false;

    for (let i = 0; i < selectedOptions.length; i++) {
        const optionValue = selectedOptions[i].value;
        if (optionValue === "concrete in trench") isTrenchSelected = true;
        if (optionValue === "blockwork in foundation") isBlockworkSelected = true;
    }

    trenchFieldset.style.display = isTrenchSelected ? "block" : "none";
    trenchFieldset.querySelectorAll("input").forEach(input => input.required = isTrenchSelected);
    blockworkFieldset.style.display = isBlockworkSelected ? "block" : "none";
    blockworkFieldset.querySelectorAll("input").forEach(input => input.required = isBlockworkSelected);

    // --- Add this block ---
    if (isTrenchSelected) {
        const meanGirthInput = document.getElementById('mean_girth');
        if (meanGirthInput) meanGirthInput.value = (lastMeanGirth * 1000).toFixed(2); // show in mm
    }
    // --- end block ---

    console.log("Dropdown changed. Trench:", isTrenchSelected, "Blockwork:", isBlockworkSelected);
});

// Call displayProjects on page load
displayProjects();

// Fetch material rate for a specific material
async function fetchMaterialRate(material) {
    const response = await fetch(`/api/prices/${material}?region=greater-accra`, {
        credentials: 'include'
    });/*{
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });*/

    console.log("Response for fetchMaterialRate:", response);

    if (!response.ok) {
        console.error(`Failed to fetch material rate for ${material}:`, response.statusText);
        return null;
    }

    try {
        const data = await response.json();
        console.log(`Material Rate for ${material}:`, data);
        return data; // Example: { material: 'cement', unit_cost: 85.00, valid_from: '2023-04-01', valid_to: '2023-10-01' }
    } catch (error) {
        console.error("Error parsing JSON in fetchMaterialRate:", error);
        return null;
    }
}

// Fetch labor rate for a specific trade
async function fetchLaborRate(trade) {
    const response = await fetch(`/api/labor/${trade}`, {
        credentials: 'include'
    });/*{
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });*/

    console.log("Response for fetchLaborRate:", response);

    if (!response.ok) {
        console.error(`Failed to fetch labor rate for ${trade}:`, response.statusText);
        return null;
    }

    try {
        const data = await response.json();
        console.log(`Labor Rate for ${trade}:`, data);
        return data; // Example: { trade: 'bricklaying', rate: 25.00, valid_from: '2023-04-01', valid_to: '2023-10-01' }
    } catch (error) {
        console.error("Error parsing JSON in fetchLaborRate:", error);
        return null;
    }
}

// Clear invalid projects from local storage
function clearInvalidProjects() {
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    const validProjects = projects.filter(project => project.totalCost && !isNaN(project.totalCost) && project.totalCost > 0);
    localStorage.setItem('projects', JSON.stringify(validProjects));
    console.log("Cleared invalid projects. Remaining projects:", validProjects);
}
clearInvalidProjects();

// Function to display saved projects
function displayProjects() {
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    console.log("Displaying projects:", projects); // Debugging line

    const projectList = document.getElementById('project-list');
    projectList.innerHTML = ''; // Clear existing projects

    projects.forEach(project => {
        if (!project.totalCost || isNaN(project.totalCost)) {
            console.error("Invalid project data:", project);
            return; // Skip invalid projects
        }

        const projectItem = document.createElement('div');
        projectItem.classList.add('project-item');
        projectItem.innerHTML = `
            <h4>${project.name} (${project.component})</h4>
            <p>Quantity: ${project.quantity} m³</p>
            <p>Material Cost: GHS ${project.materialCost}</p>
            <p>Labor Cost: GHS ${project.laborCost}</p>
            <p>Plant Cost: GHS ${project.plantCost}</p>
            <p>Total Cost: GHS ${project.totalCost}</p>
            <p>Date: ${project.date}</p>
        `;
        projectList.appendChild(projectItem);
    });
}

// Modified project saving with locations
async function saveProject(projectData) {
    const projectLoc = document.getElementById('project-location').value;
    const supplierLoc = document.getElementById('supplier-location').value;

    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...projectData,
                project_location: projectLoc,
                supplier_location: supplierLoc
                // Add user_id here if your backend requires it
            }),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Project save failed');
        return await response.json();
    } catch (error) {
        console.error('Error saving project:', error);
        throw error;
    }
}

async function saveProjectState() {
    const projectId = getProjectIdFromUrl();
    if (!projectId) return;
    const components = Array.from(document.querySelectorAll('.result-item')).map(item => ({
        type: item.querySelector('h4').textContent,
        inputs: JSON.parse(item.getAttribute('data-inputs'))
        // Add more fields as needed
    }));
    await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ components })
    });
}

/*document.getElementById('save-project-btn').addEventListener('click', async function () {
    const projectName = prompt("Enter a name for this project:");
    if (!projectName) {
        alert("Project name is required.");
        return;
    }

    // Collect all results
    const results = document.querySelectorAll('.result-item');
    let totalCost = 0;

    results.forEach(result => {
        const materialCost = parseFloat(result.querySelector('p:nth-child(3)').textContent.split(': ')[1].replace('GHS ', ''));
        const laborCost = parseFloat(result.querySelector('p:nth-child(5)').textContent.split(': ')[1].replace('GHS ', ''));
        const plantCost = parseFloat(result.querySelector('p:nth-child(6)').textContent.split(': ')[1].replace('GHS ', ''));
        totalCost += materialCost + laborCost + plantCost;
    });

    // Save the project ONCE
    try {
        await saveProject({
            project_name: projectName,
            total_cost: totalCost
        });
        alert(`Project "${projectName}" saved successfully! Total Cost: GHS ${totalCost.toFixed(2)}`);
        displayProjects();
    } catch (e) {
        alert("Failed to save project.");
    }
});*/

/*// Function to classify a component
function classifyComponent(component) {
    const workSection = Object.keys(SMM7_CATEGORIES).find((section) =>
        SMM7_CATEGORIES[section].components.includes(component)
    );
    // Debug log:
    console.log(`[classifyComponent] "${component}" mapped to section "${workSection}"`);
    return {
        workSection: workSection || "Z. Unclassified Works",
        mainCategory: workSection
            ? SMM7_CATEGORIES[workSection].mainCategory
            : "Other",
    };
}*/

// ...existing code...

// Update calculateCompositeRate to use inputs for special-case logic
async function calculateCompositeRate(componentType, quantity, inputs = {}) {
    if (!componentType || !quantity || quantity <= 0) {
        console.error('Invalid input:', { componentType, quantity });
        return null;
    }

    const formulaKey = COMPONENT_TO_FORMULA_MAP[componentType];
    if (!formulaKey) {
        console.warn(`No mapping for component: ${componentType}`);
        return null;
    }

    const formulaConfig = SMM7_2023[formulaKey];
    if (!formulaConfig) {
        console.warn(`No formula config for key: ${formulaKey}`);
        return null;
    }

    try {
        // Fetch pricing bundle as before
        const pricingResponse = await fetch(`/api/pricing-bundle?region=greater-accra`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (!pricingResponse.ok) throw new Error(`Pricing fetch failed: ${pricingResponse.status}`);
        const { materials, labor } = await pricingResponse.json();
        console.log('Pricing bundle materials:', materials);
        console.log('Pricing bundle labor:', labor);

        // Material cost
        let materialCost = 0;
        if (typeof formulaConfig.calculateMaterialCost === 'function') {
            // Prefer (inputs, materials) signature
            materialCost = formulaConfig.calculateMaterialCost(quantity, materials, inputs);
        } else {
            // fallback to old signature if needed
            materialCost = formulaConfig.calculateMaterialCost?.(quantity, materials) || 0;
        }

        // Labor cost
        let laborCost = 0;
        if (typeof formulaConfig.calculateLaborCost === 'function') {
            // Prefer (inputs, labor) signature
            laborCost = formulaConfig.calculateLaborCost(inputs, labor).laborCost;
        } else {
            // fallback to generic logic
            const laborTask = formulaConfig.laborTasks?.[0];
            const dailyRate = laborTask ? labor[laborTask] || 0 : 0;
            const laborCalc = SMM7_2023.calculateLaborCost(
                quantity,
                8,
                1.0,
                8,
                dailyRate,
                laborTask
            );
            laborCost = laborCalc?.laborCost || 0;
        }

        // Plant cost as before
        let plantCost = 0;
        const equipmentList = formulaConfig.equipment || [];
        if (equipmentList.length > 0) {
            try {
                const plantData = await fetchPlantData();
                const availablePlants = plantData.filter(p =>
                    equipmentList.includes(p.equipment)
                );
                if (availablePlants.length > 0) {
                    plantCost = SMM7_2023.calculatePlantCost(quantity, availablePlants);
                } else {
                    console.warn(`No available plants found for ${componentType}`);
                }
            } catch (plantError) {
                console.error(`Plant data error for ${componentType}:`, plantError);
            }
        } else {
            console.log(`No equipment required for ${componentType}`);
        }

        // Financial calculations
        const baseCost = materialCost + laborCost + plantCost;
        const overheads = (baseCost * 0.15) || 0;
        const profit = ((baseCost + overheads) * 0.10) || 0;

        const result = {
            materialCost: Number(materialCost.toFixed(2)),
            laborCost: Number(laborCost.toFixed(2)),
            plantCost: Number(plantCost.toFixed(2)),
            overheads: Number(overheads.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            totalCost: Number((baseCost + overheads + profit).toFixed(2))
        };
        console.log('Composite rate result:', result);
        return result;
    } catch (error) {
        console.error(`Composite rate error for ${componentType}:`, error);
        return null;
    }
}

// In generateSMM7BOQ, pass inputs to calculateCompositeRate:
async function generateSMM7BOQ() {
    // Reset BOQ data using your model's reset function
    resetBOQ();
    initBillsFromTemplate(billTemplate); // Ensure standard bills are present

    try {
        const components = await fetchCalculatedComponents();
        if (!components?.length) {
            alert("No components found to generate BOQ");
            return;
        }

        let validComponents = 0;

        for (const component of components) {
            try {
                const compositeRate = await calculateCompositeRate(component.type, component.quantity, component.inputs);
                if (!compositeRate?.totalCost) {
                    console.warn(`Skipping ${component.type} - invalid composite rate`);
                    continue;
                }

                addToBOQ({
                    component: component.type,
                    quantity: component.quantity,
                    unitCost: compositeRate.totalCost / component.quantity,
                    inputs: component.inputs
                    // type, billNo, billTitle, description, unit are optional and auto-determined
                });
                validComponents++;
            } catch (componentError) {
                console.error(`Error processing ${component.type}:`, componentError);
                continue;
            }
        }

        if (validComponents === 0) {
            alert("No valid components to generate BOQ");
            return;
        }

        if (!validateBOQStructure()) {
            alert("Cannot generate PDF - invalid BOQ structure");
            return;
        }

        calculateSummary();

        await generateBOQPDF();
        alert("BOQ Report has been successfully generated!");

    } catch (globalError) {
        console.error("BOQ generation failed:", globalError);
        alert("Failed to generate BOQ. See console for details.");
    }
}

/*function validateBOQStructure() {
    const errors = [];
    
    // Validate work sections
    Object.entries(boqData.workSections).forEach(([sectionKey, section]) => {
        if (!SMM7_CATEGORIES[sectionKey]) {
            errors.push(`Invalid work section: ${sectionKey}`);
        }
        
        // Validate items
        section.items.forEach(item => {
            if (!COMPONENT_TO_FORMULA_MAP[item.category]) {
                errors.push(`Unmapped component: ${item.category}`);
            }
            if (isNaN(item.quantity)) {
                errors.push(`Invalid quantity for ${item.category}`);
            }
            if (isNaN(item.rate)) {
                errors.push(`Invalid rate for ${item.category}`);
            }
            if (isNaN(item.total)) {
                errors.push(`Invalid total cost for ${item.category}`);
            }
        });
    });

    // Validate main categories
    Object.keys(boqData.mainCategories).forEach(category => {
        if (!['Substructure', 'Superstructure', 'Other'].includes(category)) {
            errors.push(`Invalid main category: ${category}`);
        }
    });

    if (errors.length > 0) {
        console.error("BOQ Validation Errors:\n- " + errors.join("\n- "));
        return false;
    }
    return true;
}*/

// Only Preliminaries are compulsory. All Preliminaries items must be present (even if amount 0).
// Other bills/items are optional and not validated for presence or content.
function validateBOQStructure() {
    // Always ensure Preliminaries are present before validation
    prepareBOQForExport();
    console.log('[validateBOQStructure] Validating BOQ structure...');
    const errors = [];

    // Find the Preliminaries bill (by billNo or title)
    const prelimBill = (boqData.bills || []).find(
        bill =>
            (bill.billNo && bill.billNo.toString().toLowerCase().startsWith('1')) ||
            (bill.title && bill.title.toLowerCase().includes('prelim'))
    );

    console.log('[validateBOQStructure] Preliminaries bill found:', prelimBill);

    if (!prelimBill) {
        errors.push("Preliminaries bill is missing.");
    } else {
        // Use the actual Preliminaries categories from your UI
        const expectedPrelimCategories = [
            "Mobilization and Demobilization",
            "Site Office and Facilities",
            "Temporary Fencing",
            "Water for Works",
            "Electricity for Works",
            "Insurance",
            "Health and Safety",
            "Setting Out",
            "Project Signboard",
            "Other Preliminaries"
        ];
        const presentCategories = (prelimBill.items || []).map(item => item.category);
        console.log('[validateBOQStructure] Present prelim categories:', presentCategories);

        expectedPrelimCategories.forEach(cat => {
            if (!presentCategories.includes(cat)) {
                errors.push(`Preliminaries item missing: ${cat}`);
                console.warn(`[validateBOQStructure] Missing preliminaries item: ${cat}`);
            } else {
                console.log(`[validateBOQStructure] Found preliminaries item: ${cat}`);
            }
        });

        // Validate preliminaries item fields
        (prelimBill.items || []).forEach(item => {
            if (!item.category) {
                errors.push(`Preliminaries item missing category`);
                console.warn('[validateBOQStructure] Preliminaries item missing category:', item);
            }
            if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
                errors.push(`Invalid quantity for preliminaries item: ${item.category}`);
                console.warn('[validateBOQStructure] Invalid quantity for:', item);
            }
            if (typeof item.rate !== 'number' || isNaN(item.rate)) {
                errors.push(`Invalid rate for preliminaries item: ${item.category}`);
                console.warn('[validateBOQStructure] Invalid rate for:', item);
            }
            if (typeof item.amount !== 'number' || isNaN(item.amount)) {
                errors.push(`Invalid amount for preliminaries item: ${item.category}`);
                console.warn('[validateBOQStructure] Invalid amount for:', item);
            }
        });
    }

    if (errors.length > 0) {
        console.error("BOQ Validation Errors:\n- " + errors.join("\n- "));
        return false;
    }
    console.log('[validateBOQStructure] BOQ structure is valid.');
    return true;
}

async function fetchPlantData() {
    const response = await fetch('/api/plants', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

    console.log("Response for fetchPlantData:", response);

    if (!response.ok) {
        console.error('Failed to fetch plant data:', response.statusText);
        return [];
    }

    try {
        const data = await response.json();
        console.log('Plant Data:', data);
        return data;
    } catch (error) {
        console.error("Error parsing JSON in fetchPlantData:", error);
        return [];
    }
}

async function fetchCalculatedComponents() {
    const selectedComponents = Array.from(document.querySelectorAll('.result-item')).map(result => {
        const component = result.querySelector('h4').textContent;
        // Find the <p> that starts with "Quantity:"
        const quantityP = Array.from(result.querySelectorAll('p')).find(p => p.textContent.trim().startsWith('Quantity:'));
        let quantity = NaN;
        let unit = '';
        if (quantityP) {
            // e.g. "Quantity: 5.00 nr"
            const match = quantityP.textContent.match(/Quantity:\s*([\d.]+)\s*(\w+)?/i);
            if (match) {
                quantity = parseFloat(match[1]);
                unit = match[2] || '';
            }
        }
        const description = component; // Use the component name as the description
        const itemNumber = `item-${Date.now()}`; // Generate a unique item number
        const inputs = JSON.parse(result.getAttribute('data-inputs') || '{}'); // <-- get original inputs

        return {
            type: component,
            quantity,
            unit,
            description,
            itemNumber,
            inputs // <-- include in returned object
        };
    });

    return selectedComponents;
}

// script.js
function getProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('project_id');
}

/*async function loadProjectData() {
    const projectId = getProjectIdFromUrl();
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
    if (!res.ok) return;
    const project = await res.json();
    // Populate UI with project.components
    project.components.forEach(comp => {
        // For each component, set selected, fill inputs, and trigger calculation
        // You need to implement this logic based on your UI structure
    });
}
document.addEventListener('DOMContentLoaded', loadProjectData);*/

// static/js/dashboard.js
async function loadRecentActivity() {
  const response = await fetch('/api/activity', { credentials: 'include' });
  const activities = await response.json();
  const feed = document.getElementById('activity-list');
  feed.innerHTML = '';
  activities.forEach(activity => {
    feed.innerHTML += `
      <div class="activity-item">
        <small>${new Date(activity.timestamp).toLocaleString()}</small>
        <p>${activity.description}</p>
      </div>
    `;
  });
}
document.addEventListener('DOMContentLoaded', loadRecentActivity);

// --- Modal logic for BOQ export (bill-centric, with Preliminaries validation) ---
console.log('[BOQ Modal] Initializing modal export logic');

const boqBtn = document.getElementById('generate-boq');
const boqModal = document.getElementById('boq-format-modal');
const closeModalBtn = document.getElementById('close-boq-modal');
const pdfBtn = document.getElementById('download-pdf');
const xlsxBtn = document.getElementById('download-xlsx');
const csvBtn = document.getElementById('download-csv');

async function handleBOQExport(exportFn) {
    prepareBOQForExport();
    const errors = validateBOQ();
    if (errors.length > 0) {
        alert("BOQ Validation Error:\n" + errors.join('\n'));
        return;
    }
    await exportFn();
}

if (boqBtn && boqModal && closeModalBtn && pdfBtn && xlsxBtn && csvBtn) {
    boqBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[BOQ Modal] Generate BOQ clicked, opening modal');
        boqModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] Modal closed');
    });

    pdfBtn.addEventListener('click', async function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] PDF export selected');
        await handleBOQExport(generateSMM7BOQ);
    });

    xlsxBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] Excel export selected');
        handleBOQExport(() => generateBOQSpreadsheet('xlsx'));
    });

    csvBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] CSV export selected');
        handleBOQExport(() => generateBOQSpreadsheet('csv'));
    });
}

// --- Spreadsheet export function (bill-centric, supports Excel and CSV) ---
function generateBOQSpreadsheet(format) {
    console.log(`[BOQ Export] Generating spreadsheet in format: ${format}`);

    // SheetJS rich text for Description (XLSX only)
    function getRichDescription(item) {
        return [
            { text: item.category + '\n', bold: true, underline: true },
            { text: item.description || '' }
        ];
    }

    // For CSV: add clear separation and padding
    function getCSVDescription(item) {
        // Two line breaks and a little indent for description
        return `${item.category}\n\n  ${item.description || ''}`;
    }

    // Helper for alphabetical item code per page (A-Z, restart per 40 rows)
    function getItemCode(rowIdx) {
        const code = String.fromCharCode(65 + (rowIdx % 26));
        return code;
    }

    // Build rows for SheetJS
    const rows = [
        ["Bill No.", "Bill Title", "Item Code", "Description", "Qty", "Unit", "Rate (GHS)", "Amount (GHS)", "Type"]
    ];

    // For XLSX, keep track of row for per-page item code
    let excelRowIdx = 0;
    boqData.bills.forEach(bill => {
        if (bill.items && bill.items.length > 0) {
            let itemCodeChar = 0;
            bill.items.forEach((item, idx) => {
                rows.push([
                    bill.billNo,
                    bill.title,
                    getItemCode(itemCodeChar),
                    format === 'xlsx' ? getRichDescription(item) : getCSVDescription(item),
                    item.quantity ?? '',
                    item.unit || '',
                    typeof item.rate === 'number' ? item.rate.toFixed(2) : '',
                    typeof item.amount === 'number' ? item.amount.toFixed(2) : '',
                    item.type || ''
                ]);
                itemCodeChar++;
                if (itemCodeChar > 25) itemCodeChar = 0; // Restart at 'A' after 'Z'
                excelRowIdx++;
            });
            // Bill subtotal row
            rows.push([
                bill.billNo,
                bill.title + " TOTAL",
                "", "", "", "", "", bill.total.toFixed(2), ""
            ]);
            excelRowIdx++;
        }
    });

    // Grand summary row
    const grandTotal = boqData.bills.reduce((sum, b) => sum + (b.total || 0), 0);
    rows.push(["", "GRAND TOTAL", "", "", "", "", "", grandTotal.toFixed(2), ""]);

    if (format === 'xlsx') {
        if (typeof XLSX === 'undefined') {
            alert('Excel export requires SheetJS (XLSX) library. Please include it in your HTML.');
            console.error('[BOQ Export] XLSX library not found');
            return;
        }
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Apply rich text and borders
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 1; R <= range.e.r; ++R) {
            // Rich text for Description
            if (ws[XLSX.utils.encode_cell({ r: R, c: 3 })] && Array.isArray(rows[R][3])) {
                ws[XLSX.utils.encode_cell({ r: R, c: 3 })].r = rows[R][3];
            }
            // Borders for all cells
            for (let C = 0; C <= 8; ++C) {
                const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell) {
                    cell.s = cell.s || {};
                    cell.s.border = {
                        top:    { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left:   { style: "thin", color: { rgb: "000000" } },
                        right:  { style: "thin", color: { rgb: "000000" } }
                    };
                    // Double border for outer columns and header
                    if (C === 0 || C === 8 || R === 0) {
                        cell.s.border.left = { style: "double", color: { rgb: "000000" } };
                        cell.s.border.right = { style: "double", color: { rgb: "000000" } };
                        if (R === 0) {
                            cell.s.border.top = { style: "double", color: { rgb: "000000" } };
                            cell.s.border.bottom = { style: "double", color: { rgb: "000000" } };
                        }
                    }
                }
            }
        }

        // Set column widths for better appearance (wider Description)
        ws['!cols'] = [
            { wch: 10 }, // Bill No.
            { wch: 25 }, // Bill Title
            { wch: 8 },  // Item Code
            { wch: 60 }, // Description (wider)
            { wch: 8 },  // Qty
            { wch: 8 },  // Unit
            { wch: 12 }, // Rate
            { wch: 14 }, // Amount
            { wch: 10 }  // Type
        ];

        // Create workbook and export
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BOQ");
        XLSX.writeFile(wb, `BOQ-${new Date().toISOString().slice(0,10)}.xlsx`);
        console.log('[BOQ Export] Excel file generated and download triggered');
    } else if (format === 'csv') {
        // CSV: plain text, no formatting, but keep category and description separated
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `BOQ-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('[BOQ Export] CSV file generated and download triggered');
    } else {
        console.warn(`[BOQ Export] Unknown format requested: ${format}`);
    }
}
