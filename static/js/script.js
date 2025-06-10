import { SMM7_2023 } from './formulas.js';
import { SMM7_CATEGORIES } from './smm7_categories.js';
import { COMPONENT_TO_FORMULA_MAP } from './component_to_formula_map.js';
import { INPUT_UNITS } from './input_units.js'; // If in a separate file, else skip this line
// --- Currency Service Imports and Setup ---
import { fetchCurrencyRates, convertAmount, getLastRateTimestamp } from './currencyService.js';


// --- Debug: Script loaded ---
console.log("script.js loaded");

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

let boqData = {
    workSections: {},
    mainCategories: {
        "Substructure": { items: [], total: 0 },
        "Superstructure": { items: [], total: 0 },
        "Other": { items: [], total: 0 }
    },
    summary: {},
    haulage: {
        multiplier: 1.0,
        band: ''
    }
};

// Function to add an item to the BOQ
// Modified addToBOQ to match your data structure
// Modified addToBOQ with haulage calculation
function addToBOQ(component, quantity, unitCost, inputs) {
    const formulaKey = COMPONENT_TO_FORMULA_MAP[component];
    if (!formulaKey || !SMM7_2023[formulaKey]) return;

    const formulaObj = SMM7_2023[formulaKey];
    // Use dynamic description if available, else fallback
    const description = typeof formulaObj.description === 'function'
        ? formulaObj.description(inputs)
        : (formulaObj.reference || component);

    const { workSection, mainCategory } = classifyComponent(component);
    console.log(`[addToBOQ] Adding "${component}" to section "${workSection}"`);
    const total = quantity * unitCost * haulageMultiplier;

    const boqItem = {
        itemCode: `ITEM-${Date.now().toString(36)}`,
        category: component,
        description, // <-- use the dynamic description
        quantity: Number(quantity.toFixed(2)),
        unit: formulaObj.unit || "m³",
        rate: Number(unitCost.toFixed(2)),
        total: Number(total.toFixed(2)),
        haulageMultiplier
    };

    // Initialize section if needed
    if (!boqData.workSections[workSection]) {
        boqData.workSections[workSection] = {
            description: SMM7_CATEGORIES[workSection]?.description || "Unclassified",
            items: [],
            total: 0
        };
    }

    // Add to structures
    boqData.workSections[workSection].items.push(boqItem);
    boqData.workSections[workSection].total += boqItem.total;
    boqData.mainCategories[mainCategory].total += boqItem.total;
}

// Function to generate the BOQ PDF
async function generateBOQPDF() {
    const { PDFDocument, rgb } = PDFLib;
    
    // Validate BOQ data
    if (!boqData || Object.keys(boqData.workSections).length === 0) {
        console.warn("No BOQ data available");
        alert("No data to generate PDF");
        return;
    }

    try {
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([595, 842]);
        let yPos = 800;
        const margin = 50;

        // Header
        page.drawText("SMM7 BILL OF QUANTITIES", { 
            x: margin, y: yPos, size: 16, color: rgb(0, 0, 0) 
        });
        yPos -= 40;

        // Sections
        Object.entries(boqData.workSections).forEach(([section, data]) => {
            // Section header
            page.drawText(`${section}: ${data.description}`, { 
                x: margin, y: yPos, size: 12, color: rgb(0, 0, 0) 
            });
            yPos -= 25;

            // Add haulage information
            page.drawText(`Haulage Band: ${boqData.haulage.band} (Multiplier: ${boqData.haulage.multiplier}x)`, {
                x: margin, y: yPos, size: 10, color: rgb(0, 0, 0)
            });
            yPos -= 20;

            // Table headers
            const headers = ["Code", "Description", "Qty", "Unit", "Rate (GHS)", "Total (GHS)"];
            page.drawText(headers.join(" | "), { 
                x: margin, y: yPos, size: 10, color: rgb(0, 0, 0) 
            });
            yPos -= 20;

            // Items
            data.items.forEach(item => {
                const row = [
                    item.itemCode,
                    item.description,
                    item.quantity.toFixed(2),
                    item.unit,
                    `GHS ${item.rate.toFixed(2)}`,
                    `GHS ${item.total.toFixed(2)}`
                ].join(" | ");
                
                page.drawText(row, { 
                    x: margin, y: yPos, size: 10, color: rgb(0, 0, 0) 
                });
                yPos -= 15;

                // New page if needed
                if (yPos < 50) {
                    page = pdfDoc.addPage([595, 842]);
                    yPos = 800;
                }
            });

            // Section total
            page.drawText(`Section Total: GHS ${data.total.toFixed(2)}`, { 
                x: margin, y: yPos, size: 10, color: rgb(0, 0, 0) 
            });
            yPos -= 30;
        });

        // Grand total
        const grandTotal = Object.values(boqData.workSections)
            .reduce((sum, section) => sum + section.total, 0);
        page.drawText(`GRAND TOTAL: GHS ${grandTotal.toFixed(2)}`, { 
            x: margin, y: yPos, size: 12, color: rgb(0, 0, 0) 
        });

        // Generate and download
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `BOQ-${new Date().toISOString().slice(0,10)}.pdf`;
        link.click();

    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Check console for details.");
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

// REMOVE or COMMENT OUT this function and its call!
/*
function setupGenerateBOQButton() {
    console.log("Setting up generate BOQ button");
    const boqBtn = document.getElementById('generate-boq');
    if (!boqBtn) {
        console.warn("Generate BOQ button not found");
        return;
    }
    boqBtn.addEventListener('click', async function () {
        console.log("Generate BOQ button clicked");
        const button = this;
        button.disabled = true;
        button.textContent = "Generating...";
        try {
            await generateSMM7BOQ();
            alert("BOQ Report has been successfully generated!");
        } catch (error) {
            console.error("Error generating BOQ:", error);
            alert("An error occurred while generating the BOQ. Please try again.");
        } finally {
            button.disabled = false;
            button.textContent = "Generate BOQ Report";
        }
    });
}
*/

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

/*// Fetch all materials
async function fetchMaterials() {
    const response = await fetch('/materials', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

    console.log("Response for fetchMaterials:", response);

    if (!response.ok) {
        console.error('Failed to fetch materials:', response.statusText);
        return [];
    }

    try {
        const data = await response.json();
        console.log('Materials:', data.materials);
        return data.materials;
    } catch (error) {
        console.error("Error parsing JSON in fetchMaterials:", error);
        return [];
    }
}*/

/*// Fetch all labor rates
async function fetchLaborRates() {
    const response = await fetch('/labor-rates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

    console.log("Response for fetchLaborRates:", response);
y
    if (!response.ok) {
        console.error('Failed to fetch labor rates:', response.statusText);
        return [];
    }

    try {
        const data = await response.json();
        console.log('Labor Rates:', data.labor_rates);
        return data.labor_rates;
    } catch (error) {
        console.error("Error parsing JSON in fetchLaborRates:", error);
        return [];
    }
}*/


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

/*// Function to save a project
function saveProject(projectName, componentType, quantity, totalMaterialCost, laborCost, plantCost, totalCost) {
    if (!projectName || isNaN(totalCost)) {
        console.error("Invalid project data:", { projectName, totalCost });
        return;
    }

    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    projects.push({
        name: projectName,
        component: componentType,
        quantity: quantity.toFixed(2),
        materialCost: totalMaterialCost.toFixed(2),
        laborCost: laborCost.toFixed(2),
        plantCost: plantCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('projects', JSON.stringify(projects));
    console.log("Saved projects:", projects); // Debugging line
}*/

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

document.getElementById('save-project-btn').addEventListener('click', async function () {
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

// Function to classify a component
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
}

/*async function calculateCompositeRate(componentType, quantity) {
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
        // Single fetch for pricing bundle
        const pricingResponse = await fetch(`/api/pricing-bundle?region=greater-accra`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        if (!pricingResponse.ok) throw new Error(`Pricing fetch failed: ${pricingResponse.status}`);
        const { materials, labor } = await pricingResponse.json();

        // Material cost with null checks
        const materialCost = formulaConfig.calculateMaterialCost?.(quantity, materials) || 0;

        // Labor cost with fallbacks
        const laborTask = formulaConfig.laborTasks?.[0];
        const dailyRate = laborTask ? labor[laborTask] || 0 : 0;
        const laborCalc = SMM7_2023.calculateLaborCost(
            quantity,
            8,
            adjustments.labor_efficiency || 1,
            8,
            dailyRate,
            laborTask
        );
        const laborCost = laborCalc?.laborCost || 0;

        // Plant cost using SMM7_2023 method with equipment validation
        let plantCost = 0;
        const equipmentList = formulaConfig.equipment || [];

        if (equipmentList.length > 0) {
            try {
                const plantData = await fetchPlantData();
                const availablePlants = plantData.filter(p => 
                    SMM7_2023[formulaKey].equipment.includes(p.equipment)
                );

                // Validate equipment availability
                const missingEquipment = equipmentList.filter(e => 
                    !plantData.some(p => p.equipment === e)
                );

                if (missingEquipment.length > 0) {
                    console.warn(`Missing equipment for ${componentType}:`, missingEquipment);
                    // Optional: Add placeholder cost for missing equipment
                    // missingEquipment.forEach(e => {
                    //     console.warn(`Using default rate for missing equipment: ${e}`);
                    //     availablePlants.push({ equipment: e, dailyRate: 0, durationPerUnit: 0 });
                    // });
                }

                if (availablePlants.length > 0) {
                    plantCost = SMM7_2023.calculatePlantCost(quantity, availablePlants);
                } else {
                    console.warn(`No available plants found for ${componentType}`);
                }
            } catch (plantError) {
                console.error(`Plant data error for ${componentType}:`, plantError);
                // Consider whether to continue with plantCost=0 or abort
            }
        } else {
            console.log(`No equipment required for ${componentType}`);
        }

        // Financial calculations with safeguards
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
}*/

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

        // Material cost
        let materialCost = 0;
        if (typeof formulaConfig.calculateMaterialCost === 'function') {
            // Prefer (inputs, materials) signature
            materialCost = formulaConfig.calculateMaterialCost(inputs, materials);
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
    // Reset BOQ data on each generation
    boqData = {
        workSections: {},
        mainCategories: {
            "Substructure": { items: [], total: 0 },
            "Superstructure": { items: [], total: 0 },
            "Other": { items: [], total: 0 }
        },
        summary: {},
        haulage: boqData.haulage || { multiplier: 1.0, band: '' }
    };

    try {
        const components = await fetchCalculatedComponents();
        if (!components?.length) {
            alert("No components found to generate BOQ");
            return;
        }

        let validComponents = 0;

        for (const component of components) {
            try {
                // Pass inputs to calculateCompositeRate
                const compositeRate = await calculateCompositeRate(component.type, component.quantity, component.inputs);
                if (!compositeRate?.totalCost) {
                    console.warn(`Skipping ${component.type} - invalid composite rate`);
                    continue;
                }

                // Use addToBOQ instead of manual insertion
                addToBOQ(
                    component.type,
                    component.quantity,
                    compositeRate.totalCost / component.quantity,
                    component.inputs // pass inputs here
                );
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

        await generateBOQPDF();
        alert("BOQ Report has been successfully generated!");

    } catch (globalError) {
        console.error("BOQ generation failed:", globalError);
        alert("Failed to generate BOQ. See console for details.");
    }
}

function validateBOQStructure() {
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

/*// Handle the "Generate BOQ" button click
document.getElementById('generate-boq').addEventListener('click', async function () {
    const button = this;
    button.disabled = true; // Disable the button
    button.textContent = "Generating..."; // Update button text

    try {
        console.log("Generate BOQ button clicked"); // Debugging line

        // Call the function to generate the BOQ
        await generateSMM7BOQ();

        // Notify the user that the BOQ has been generated
        alert("BOQ Report has been successfully generated!");
    } catch (error) {
        console.error("Error generating BOQ:", error);
        alert("An error occurred while generating the BOQ. Please try again.");
    } finally {
        button.disabled = false; // Re-enable the button
        button.textContent = "Generate BOQ Report"; // Reset button text
    }
});*/

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

/*// script.js
async function loadRecentActivity() {
  const response = await fetch('/api/activity', { credentials: 'include' });
  const activities = await response.json();
  
  const feed = document.getElementById('activity-feed');
  activities.forEach(activity => {
    feed.innerHTML += `
      <div class="activity-item">
        <small>${new Date(activity.timestamp).toLocaleString()}</small>
        <p>${activity.description}</p>
      </div>
    `;
  });
}*/

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

// --- Modal logic for BOQ export ---
// Place this block after DOMContentLoaded or at the end of your main JS

console.log('[BOQ Modal] Initializing modal export logic');

const boqBtn = document.getElementById('generate-boq');
const boqModal = document.getElementById('boq-format-modal');
const closeModalBtn = document.getElementById('close-boq-modal');
const pdfBtn = document.getElementById('download-pdf');
const xlsxBtn = document.getElementById('download-xlsx');
const csvBtn = document.getElementById('download-csv');

if (boqBtn && boqModal && closeModalBtn && pdfBtn && xlsxBtn && csvBtn) {
    // Open modal on BOQ button click
    boqBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[BOQ Modal] Generate BOQ clicked, opening modal');
        boqModal.style.display = 'flex';
    });

    // Close modal handler


    closeModalBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] Modal closed');
    });

    // PDF export handler (reuse your existing PDF logic)
    pdfBtn.addEventListener('click', async function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] PDF export selected');
        await generateSMM7BOQ(); // This should trigger your PDF logic as before
    });

    // Excel export handler (requires SheetJS library)
    xlsxBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] Excel export selected');
        generateBOQSpreadsheet('xlsx');
    });

    // CSV export handler
    csvBtn.addEventListener('click', function () {
        boqModal.style.display = 'none';
        console.log('[BOQ Modal] CSV export selected');
        generateBOQSpreadsheet('csv');
    });
}

// --- Spreadsheet export function (SheetJS for Excel, native for CSV) ---
function generateBOQSpreadsheet(format) {
    console.log(`[BOQ Export] Generating spreadsheet in format: ${format}`);
    // Build rows: headers first
    const rows = [

        ["Section", "Code", "Description", "Qty", "Unit", "Rate (GHS)", "Total (GHS)"]
    ];
    Object.entries(boqData.workSections).forEach(([section, data]) => {
        data.items.forEach(item => {
            rows.push([
                section,
                item.itemCode,
                item.description,
                item.quantity,
                item.unit,
                item.rate,
                item.total
            ]);
        });
        rows.push([section + " Section Total", "", "", "", "", "", data.total]);
    });
    rows.push(["GRAND TOTAL", "", "", "", "", "", Object.values(boqData.workSections).reduce((sum, s) => sum + s.total, 0)]);

    if (format === 'xlsx') {
        if (typeof XLSX === 'undefined') {
            alert('Excel export requires SheetJS (XLSX) library. Please include it in your HTML.');
            console.error('[BOQ Export] XLSX library not found');
            return;
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BOQ");
        XLSX.writeFile(wb, `BOQ-${new Date().toISOString().slice(0,10)}.xlsx`);
        console.log('[BOQ Export] Excel file generated and download triggered');
    } else if (format === 'csv') {
        // Simple CSV export
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

/*// Custom mix ratio logic
document.addEventListener('DOMContentLoaded', function() {
    const mixRatioSelect = document.getElementById('mix_ratio');
    const customMixRow = document.getElementById('custom-mix-ratio-row');
    const customMixInput = document.getElementById('custom_mix_ratio');
    if (mixRatioSelect && customMixRow && customMixInput) {
        mixRatioSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customMixRow.style.display = '';
                customMixInput.required = true;
            } else {
                customMixRow.style.display = 'none';
                customMixInput.required = false;
                customMixInput.value = ''; // clear value to avoid accidental validation
            }
        });
    }
});*/

