import { SMM7_2023 } from './formulas.js';
import { SMM7_CATEGORIES } from './smm7_categories.js';
import { COMPONENT_TO_FORMULA_MAP } from './component_to_formula_map.js';
import { INPUT_UNITS } from './input_units.js'; // If in a separate file, else skip this line
// --- Currency Service Imports and Setup ---
import { fetchCurrencyRates, convertAmount, getLastRateTimestamp } from './currencyService.js';
import { boqData, addToBOQ, addBill, setProjectDetails, calculateSummary, initBillsFromTemplate, resetBOQ, prepareBOQForExport, validateBOQ } from './boqData.js';

// --- Debug: Script loaded ---
console.log("script.js loaded");

document.getElementById('project-details-modal').style.display = 'none';
// --- Project Context Enforcement ---
// Extract project_id from URL and set currentProjectId
// Replace getProjectIdFromURL function:
function getProjectIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('project_id');
    return id ? parseInt(id, 10) : null; // Convert to integer
}
let currentProjectId = getProjectIdFromURL();

// If calculation page is loaded without a project_id, redirect or show modal

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

let currentFormulaVersion = null;
let projectFormulaVersion = null;
let autoSaveTimer = null;
let lastSavedData = null;
let suppressFallbackUI = true;

// For all pricing logic — normalized, lowercase
function getNormalizedRegion() {
    const supplier = JSON.parse(localStorage.getItem('preferred_supplier'));
    if (supplier?.region) return supplier.region.toLowerCase();

    const select = document.getElementById('supplier-location');
    const selected = select?.options[select.selectedIndex];
    return (selected?.getAttribute('data-region') || 'default').toLowerCase();
}

// Optional: for display purposes only
function getPreferredRegionDisplayName() {
    const supplier = JSON.parse(localStorage.getItem('preferred_supplier'));
    return supplier?.region || 'Default Region';
}

// --- Project Details Banner/Editing Logic ---
function updateProjectDetailsUI() {
    const details = boqData.projectDetails;
    const banner = document.getElementById('project-details-banner');
    const summary = document.getElementById('project-details-summary');
    const title = document.getElementById('summary-project-title');
    const client = document.getElementById('summary-client-name');
    const company = document.getElementById('summary-company-name');

    if (details && details.companyName && details.projectTitle && details.clientName) {
        // Show summary, hide banner
        if (banner) banner.style.display = 'none';
        if (summary) summary.style.display = '';
        if (title) title.textContent = details.projectTitle;
        if (client) client.textContent = details.clientName;
        if (company) company.textContent = details.companyName;
    } else {
        // Show banner, hide summary
        if (banner) banner.style.display = '';
        if (summary) summary.style.display = 'none';
    }
}

// Attach edit button logic (both in banner and summary)
function setupEditProjectDetailsButtons() {
    const editBtns = [
        document.getElementById('edit-project-details-btn'),
        document.getElementById('edit-project-details-btn2')
    ];
    editBtns.forEach(btn => {
        if (btn) {
            btn.onclick = function() {
                // Pre-fill modal if possible
                const details = boqData.projectDetails || {};
                document.getElementById('company-name').value = details.companyName || '';
                document.getElementById('company-address').value = details.companyAddress || '';
                document.getElementById('contact-info').value = details.contactInfo || '';
                document.getElementById('project-title').value = details.projectTitle || '';
                document.getElementById('client-name').value = details.clientName || '';
                document.getElementById('project-phase').value = details.projectPhase || '';
                showProjectDetailsModal();
            };
        }
    });
}

// Call this after any details change or on page load
function refreshProjectDetailsUI() {
    updateProjectDetailsUI();
    setupEditProjectDetailsButtons();
}

// --- Patch: After setting project details, update UI ---
function setProjectDetailsAndUI(details) {
    setProjectDetails(details);
    boqData.projectDetails = details;
    refreshProjectDetailsUI();
}

// --- Project Details Modal Logic ---

// Add these utility functions to your script.js
function showLoading() {
  const loader = document.getElementById('loading');
  if (loader) loader.style.display = 'flex';
}

function hideLoading() {
  const loader = document.getElementById('loading');
  if (loader) loader.style.display = 'none';
}

function centerProjectDetailsModal() {
  const modal = document.getElementById('project-details-modal');
  if (modal && modal.style.display === 'flex') {
    modal.scrollTop = 0; // Scroll to top when shown
  }
}


function showProjectDetailsModal() {
    console.trace('[DEBUG] Showing project details modal');
    console.log('[Modal] showProjectDetailsModal called');
    console.trace('Modal visibility changed - SHOWING');
    const modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.style.display = 'flex';
        centerProjectDetailsModal();
    }
    }
function hideProjectDetailsModal() {
    console.trace('[DEBUG] Hiding project details modal');
    console.log('[Modal] hideProjectDetailsModal called');
    console.trace('Modal visibility changed - HIDING');
    document.getElementById('project-details-modal').style.display = 'none';
}


// --- LocalStorage Fallback for Project Details Modal ---
// Update flag functions:
function setProjectDetailsSavedFlag(projectId) {
    if (projectId) {
        const id = parseInt(projectId, 10); // Ensure numeric
        localStorage.setItem(`projectDetailsSaved_${id}`, '1');
    }
}

function clearProjectDetailsSavedFlag(projectId) {
    if (projectId) {
        const id = parseInt(projectId, 10); // Ensure numeric
        localStorage.removeItem(`projectDetailsSaved_${id}`);
    }
}

function isProjectDetailsSavedFlag(projectId) {
    if (!projectId) return false;
    const id = parseInt(projectId, 10); // Ensure numeric
    return !!localStorage.getItem(`projectDetailsSaved_${id}`);
}

// --- Patch: Use setProjectDetailsAndUI everywhere you set details ---
async function loadProjectDetailsWithLoading(projectId) {
  showLoading();
  try {
    const details = await fetchProjectDetails(projectId);
    console.log('Fetched project details:', details);

    if (
      details &&		
      typeof details === 'object' &&
      Object.keys(details).length > 0 &&
      details.companyName &&
      details.projectTitle &&
      details.clientName
    ) {
      setProjectDetailsAndUI(details); // <-- Use new function
      console.log('Project details complete - hiding modal');
      hideProjectDetailsModal();
      clearProjectDetailsSavedFlag(projectId);
    } else {
      boqData.projectDetails = details || {};
      refreshProjectDetailsUI();
      console.warn('Incomplete project details - showing modal');
      // Don't force modal here; let user edit via banner/button
    }

    return details;
  } catch (error) {
    console.error("Project details load failed", error);
    boqData.projectDetails = {};
    refreshProjectDetailsUI();
    // Don't force modal here
    return null;
  } finally {
    hideLoading();
  }
}


// Define your standard bill template (ACECoR/SMM7 style)

// Define your standard bill template (ACECoR/SMM7 style)
const billTemplate = [
  { billNo: "1",  title: "Preliminaries / General Conditions" },
  { billNo: "2A", title: "Substructure" },
  { billNo: "2B", title: "Superstructure – Ground Floor" },
  { billNo: "2C", title: "Superstructure – First Floor" },
  { billNo: "2D", title: "Superstructure – Second Floor" },
  { billNo: "3",  title: "Mechanical, Electrical and Plumbing (MEP)" },
  { billNo: "4",  title: "External Works" },
  { billNo: "PS", title: "Provisional Sums" },
  { billNo: "CONT", title: "Contingencies" }
];

// Initialize bills at project start or when starting a new project
initBillsFromTemplate(billTemplate);

const DRAFT_KEY = 'boq_autosave_draft_v1';

// --- New session/draft helpers ---
function isNewCalculationRequested() {
    const params = new URLSearchParams(window.location.search);
    return params.get('new') === '1' || window.location.hash.includes('new');
}
function cameFromDashboard() {
    try {
        const ref = document.referrer || '';
        // Treat plain navigation from dashboard (without project_id) as a "new" request
        return ref.includes('/dashboard') && !new URLSearchParams(window.location.search).get('project_id');
    } catch { return false; }
}
function hasMeaningfulProgress(calculationData, totalCost = null) {
    try {
        // Any rendered result item
        if (document.querySelectorAll('.result-item').length > 0) return true;
        // Any non-zero cost
        if (totalCost !== null && Number(totalCost) > 0) return true;

        const data = calculationData || gatherCalculationData();
        if (Array.isArray(data?.selectedComponents) && data.selectedComponents.length > 0) return true;
        if (data?.componentData && Object.values(data.componentData).some(obj => obj && Object.keys(obj).length > 0)) return true;

        return false;
    } catch { return false; }
}
async function fetchUserProjectsSimple(pageSize = 200) {
    try {
        const res = await fetch(`/api/projects?filter=all&sort=date&order=desc&page=1&page_size=${pageSize}`, { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.projects || []);
    } catch { return []; }
}
async function generateUntitledName() {
    const projects = await fetchUserProjectsSimple();
    const names = new Set(projects.map(p => String(p.project_name || '').trim().toLowerCase()));
    // Find max suffix used
    let max = 0;
    const re = /^untitled project(?:\s*(\d+))?$/i;
    projects.forEach(p => {
        const m = String(p.project_name || '').trim().match(re);
        if (m) {
            if (!m[1]) { max = Math.max(max, 1); } else { max = Math.max(max, parseInt(m[1], 10)); }
        }
    });
    if (!names.has('untitled project')) return 'Untitled Project';
    return `Untitled Project ${max + 1}`;
}
async function ensureDraftProjectUnique(totalCost = 0) {
    if (currentProjectId) return currentProjectId;
    try {
        const project_name = await generateUntitledName();
        const resp = await saveProject({ project_name, total_cost: totalCost });
        const newId = resp?.project_id || resp?.id || resp?.projectId || null;
        if (newId) {
            currentProjectId = newId;
            console.log('[Autosave] Created draft project on backend:', currentProjectId, `(${project_name})`);
            return currentProjectId;
        }
    } catch (e) {
        console.warn('[Autosave] Could not create draft project on backend (offline or error). Falling back to local draft only.');
    }
    return null;
}


// --- Helpers for autosave drafts ---
function computeTotalCostFromUI() {
    let totalCost = 0;
    document.querySelectorAll('.result-item').forEach(result => {
        const materialCost = parseFloat(result.getAttribute('data-material-cost')) || 0;
        const laborCost = parseFloat(result.getAttribute('data-labor-cost')) || 0;
        const plantCost = parseFloat(result.getAttribute('data-plant-cost')) || 0;
        totalCost += materialCost + laborCost + plantCost;
    });
    return totalCost;
}

function buildCalculationSnapshot() {
    return {
        results: Array.from(document.querySelectorAll('.result-item')).map(item => {
            // Prefer attributes; fall back to parsing Quantity: text if needed
            let qty = parseFloat(item.getAttribute('data-quantity'));
            let unit = item.getAttribute('data-unit') || '';
            if (!qty || Number.isNaN(qty)) {
                const quantityP = Array.from(item.querySelectorAll('p')).find(p => p.textContent.trim().startsWith('Quantity:'));
                if (quantityP) {
                    const m = quantityP.textContent.match(/Quantity:\s*([\d.,]+)\s*(\S+)?/i);
                    if (m) {
                        qty = parseFloat((m[1] || '0').replace(/,/g, '')) || 0;
                        unit = m[2] || unit || '';
                    }
                }
            }
            const desc = item.getAttribute('data-description') || '';

            return {
                type: item.querySelector('h4').textContent,
                description: desc,
                quantity: qty || 0,
                unit,
                inputs: JSON.parse(item.getAttribute('data-inputs') || '{}'),
                outputs: {
                    materialCost: parseFloat(item.getAttribute('data-material-cost')),
                    laborCost: parseFloat(item.getAttribute('data-labor-cost')),
                    plantCost: parseFloat(item.getAttribute('data-plant-cost'))
                }
            };
        }),
        formula_version: currentFormulaVersion,
        timestamp: new Date().toISOString()
    };
}


function persistDraftLocally(calculationData, snapshot, totalCost) {
    try {
        const details = boqData?.projectDetails || {};
        const draft = {
            project_name: details.projectTitle || 'Untitled Project',
            calculation_data: calculationData,
            calculation_snapshot: snapshot,
            total_cost: totalCost,
            formula_version: currentFormulaVersion,
            saved_at: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        console.log('[Autosave] Draft persisted locally');
    } catch (e) {
        console.warn('[Autosave] Failed to persist draft locally:', e);
    }
}

function loadDraftFromLocal() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function ensureDraftProject(totalCost = 0) {
    if (currentProjectId) return currentProjectId;
    try {
        const resp = await saveProject({
            project_name: 'Untitled Project',
            total_cost: totalCost
        });
        const newId = resp?.project_id || resp?.id || resp?.projectId || null;
        if (newId) {
            currentProjectId = newId;
            console.log('[Autosave] Created draft project on backend:', currentProjectId);
            return currentProjectId;
        }
    } catch (e) {
        console.warn('[Autosave] Could not create draft project on backend (offline or error). Falling back to local draft only.');
    }
    return null;
}

// Ensure we await restore when resuming local drafts so banner logic can run in sequence
async function tryResumeDraftFromLocal() {
    const draft = loadDraftFromLocal();
    if (!draft) return;

    console.log('[Autosave] Local draft found. Restoring UI...');
    try {
        if (draft.calculation_snapshot) {
            await restoreCalculationUI(draft.calculation_data || {}, draft.calculation_snapshot, draft.formula_version);
        } else {
            await restoreCalculationUI(draft.calculation_data || {}, null, draft.formula_version);
        }
    } catch (e) {
        console.warn('[Autosave] Failed to restore draft UI:', e);
    }

    if (!currentProjectId) {
        try {
            const resp = await saveProject({
                project_name: draft.project_name || 'Untitled Project',
                total_cost: draft.total_cost || 0
            });
            currentProjectId = resp?.project_id || resp?.id || resp?.projectId || null;
            console.log('[Autosave] Draft promoted to backend with id:', currentProjectId);
        } catch (e) {
            console.warn('[Autosave] Could not promote draft to backend yet.');
        }
    }
}

// Fetch the current formula version from backend
async function fetchCurrentFormulaVersion() {
    const res = await fetch('/api/version');
    const data = await res.json();
    return data.version;
}

function showFallbackWarning(taskOrMaterial, fallbackRegion) {
    const fallbackDiv = document.getElementById('fallback-warning');
    if (!fallbackDiv) return;

    // Ensure the container is visible
    fallbackDiv.style.display = 'block';

    // Create a unique ID to avoid duplicates
    const id = `warn-${taskOrMaterial.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;

    // Create message box
    const message = document.createElement('div');
    message.id = id;
    message.className = 'fallback-message';
    message.style.marginBottom = '8px';
    message.style.padding = '10px';
    message.style.borderLeft = '4px solid #f0ad4e';
    message.style.backgroundColor = '#fcf8e3';
    message.style.color = '#8a6d3b';
    message.style.position = 'relative';
    message.innerHTML = `
        ⚠️ <strong>${taskOrMaterial}</strong> is using fallback rate from <strong>${fallbackRegion}</strong>.
    `;

    // Dismiss button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.color = '#8a6d3b';

    closeBtn.addEventListener('click', () => {
        fallbackDiv.removeChild(message);
        if (fallbackDiv.children.length === 0) {
            fallbackDiv.style.display = 'none';
        }
    });

    message.appendChild(closeBtn);
    fallbackDiv.appendChild(message);
}


function gatherCalculationData() {
    const data = {};
    // Save global inputs (if any)
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name) data[input.name] = input.value;
    });
    // Save selected components
    const componentSelect = document.getElementById('elements');
    if (componentSelect) {
        data.selectedComponents = Array.from(componentSelect.selectedOptions).map(opt => opt.value.toLowerCase());
    }
    // Save per-component input data
    data.componentData = {};
    document.querySelectorAll('fieldset[data-component]').forEach(fieldset => {
        const component = fieldset.dataset.component.toLowerCase();
        data.componentData[component] = {};
        fieldset.querySelectorAll('input, select').forEach(input => {
            if (input.name) data.componentData[component][input.name] = input.value;
        });
    });
    return data;
}


async function calculateComponentFromData(componentType, inputs) {
    const key = componentType.toLowerCase();
    const formulaKey = COMPONENT_TO_FORMULA_MAP[key];
    if (!formulaKey || !SMM7_2023[formulaKey]) {
        console.warn(`No formula found for component: ${componentType}`);
        return null;
    }

    // Convert mm to meters where needed and coerce numeric strings
    const processedInputs = { ...inputs };
    Object.keys(processedInputs).forEach(k => {
        const v = processedInputs[k];
        if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
            processedInputs[k] = Number(v);
        }
        if (INPUT_UNITS[k] === 'mm') {
            processedInputs[k] = parseFloat(processedInputs[k]) / 1000;
        }
    });

    // --- Robust Preliminaries handling (lump-sum) ---
    if (formulaKey === 'preliminaries_item') {
        // Prefer common amount keys; otherwise choose the largest positive numeric as fallback.
        const keys = Object.keys(processedInputs);
        const priority = /(value|amount|sum|price|cost|lump)/i;
        const numericEntries = keys
            .map(k => [k, Number(processedInputs[k])])
            .filter(([, n]) => Number.isFinite(n));

        let value = 0;
        // find by priority
        const prioEntry = numericEntries.find(([k]) => priority.test(k));
        if (prioEntry) {
            value = prioEntry[1] || 0;
        } else if (numericEntries.length) {
            // fallback: pick the largest positive numeric
            value = numericEntries.sort((a, b) => (b[1] - a[1]))[0][1] || 0;
        }

        // description detection
        const descKey = keys.find(k => /(description|desc|note|title|name)/i.test(k));
        const description = (descKey && String(processedInputs[descKey])) ||
            (typeof SMM7_2023[formulaKey].description === 'function'
                ? SMM7_2023[formulaKey].description({ value })
                : 'Preliminaries Item');

        const quantity = 1;
        const unit = SMM7_2023[formulaKey].unit || 'item';
        const totalMaterialCost = Number(value) || 0;
        const labor = { totalDays: 0, laborCost: 0 };
        const finalPlantCost = 0;

        return {
            componentType,
            description,
            quantity,
            unit,
            totalMaterialCost,
            labor,
            finalPlantCost,
            inputs: processedInputs
        };
    }

    // Special case: mean girth for trench excavation
    if (componentType === "trench excavation") {
        const extGirth = 2 * ((processedInputs.ext_len || 0) + (processedInputs.ext_width || 0)) - 4 * (processedInputs.spread_trench || 0);
        const intHor = (processedInputs.int_hor_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
        const intVer = (processedInputs.int_ver_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
        processedInputs.mean_girth = extGirth + intHor + intVer;
    }

    const formula = SMM7_2023[formulaKey].formula;
    const adjustments = window.adjustments || {};
    const quantity = formula(processedInputs, adjustments.concrete_waste_factor || 1);

    // Clear previous fallback messages
    const fallbackNotice = document.getElementById('fallback-warning');
    if (fallbackNotice) {
        fallbackNotice.innerHTML = '';
        fallbackNotice.style.display = 'none';
    }
    suppressFallbackUI = false;

    const region = getNormalizedRegion();
    const prices = await fetchPricesForComponent(formulaKey, region);
    if (!prices) return null;
    const { materialPrices, laborRates } = prices;

    // Material cost
    let totalMaterialCost = 0;
    for (const material of SMM7_2023[formulaKey].materials || []) {
        totalMaterialCost += (materialPrices[material] || 0) * quantity;
    }

    // Labor cost
    let laborTask;
    if (typeof SMM7_2023[formulaKey].getLaborTask === 'function') {
        laborTask = SMM7_2023[formulaKey].getLaborTask(processedInputs);
    } else if (Array.isArray(SMM7_2023[formulaKey].laborTasks) && SMM7_2023[formulaKey].laborTasks.length > 0) {
        laborTask = SMM7_2023[formulaKey].laborTasks[0];
    } else {
        laborTask = null;
    }
    let labor;
    if (laborTask && typeof SMM7_2023[formulaKey].calculateLaborCost === 'function') {
        labor = SMM7_2023[formulaKey].calculateLaborCost(processedInputs, laborRates);
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

    // Plant cost
    const plantData = await fetchPlantData();
    const equipmentList = SMM7_2023[formulaKey].equipment || [];
    const relevantPlants = plantData.filter(plant => equipmentList.includes(plant.equipment));
    const plantCost = SMM7_2023.calculatePlantCost(quantity, relevantPlants);

    // Apply haulage multiplier
    const haulageMultiplier = window.haulageMultiplier || 1.0;
    totalMaterialCost *= haulageMultiplier;
    labor.laborCost *= haulageMultiplier;
    const finalPlantCost = plantCost * haulageMultiplier;

    const unit = SMM7_2023[formulaKey].unit || "m³";
    const description = typeof SMM7_2023[formulaKey].description === 'function'
        ? SMM7_2023[formulaKey].description(processedInputs)
        : (SMM7_2023[formulaKey].reference || componentType);

    return {
        componentType,
        description,
        quantity,
        unit,
        totalMaterialCost,
        labor,
        finalPlantCost,
        inputs: processedInputs
    };
}



function showVersionWarning(savedVersion, currentVersion, isSnapshot) {
    let warning = document.getElementById('version-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'version-warning';
        document.body.prepend(warning);
    }

    // Inline “banner + button” layout
    Object.assign(warning.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#ffe0b2',
        color: '#b26a00',
        padding: '10px',
        marginBottom: '10px',
        fontWeight: 'bold'
    });

    const same = String(savedVersion ?? '') === String(currentVersion ?? '');
    const msg = same
        ? `Calculated with formula version ${savedVersion}.`
        : (isSnapshot
            ? `This project was calculated with version ${savedVersion}.`
            : `Warning: This project uses formula version ${savedVersion}, but the current version is ${currentVersion}. Results are frozen.`);

    // Build content: message + right-aligned button
    warning.innerHTML = '';
    const msgSpan = document.createElement('span');
    msgSpan.textContent = msg;

    const btn = document.createElement('button');
    btn.id = 'recalc-btn';
    btn.textContent = 'Recalculate with latest formulas/prices';
    Object.assign(btn.style, {
        marginLeft: 'auto',
        background: '#b26a00',
        color: '#fff',
        border: 'none',
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer'
    });

    btn.onclick = async () => {
        try {
            btn.disabled = true;
            btn.textContent = 'Recalculating...';
            await recalculateProject();
        } finally {
            btn.disabled = false;
            btn.textContent = 'Recalculate with latest formulas/prices';
        }
    };

    warning.appendChild(msgSpan);
    warning.appendChild(btn);
    warning.style.display = 'flex';
}

async function fetchPricesMeta(region = getNormalizedRegion()) {
    try {
        const res = await fetch(`/api/pricing-bundle?region=${encodeURIComponent(region)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('meta fetch failed');
        const bundle = await res.json();
        return {
            datasetVersion: bundle.version || bundle.dataset_version || null,
            lastUpdated: bundle.last_updated || bundle.updated_at || res.headers.get('Date') || null,
            regionUsed: (bundle.region || region || '').toLowerCase(),
            source: localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown',
            fallback: bundle.fallback || null
        };
    } catch {
        return {
            datasetVersion: null,
            lastUpdated: null,
            regionUsed: (region || '').toLowerCase(),
            source: localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown',
            fallback: null
        };
    }
}

function showRatesBanner(meta) {
    let el = document.getElementById('rates-banner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'rates-banner';
        document.body.prepend(el);
    }

    Object.assign(el.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#e8f5e9',
        color: '#1b5e20',
        padding: '8px 10px',
        marginBottom: '10px',
        fontWeight: 'bold'
    });

    const parts = [];
    parts.push(`Rates${meta.datasetVersion ? ' v' + meta.datasetVersion : ''}`);
    if (meta.lastUpdated) parts.push(`as of ${new Date(meta.lastUpdated).toLocaleString()}`);
    parts.push(`region: ${meta.regionUsed}`);
    parts.push(`source: ${meta.source}`);
    if (meta.fallback) parts.push(`fallback: ${meta.fallback}`);

    el.innerHTML = '';
    const msg = document.createElement('span');
    msg.textContent = parts.join(' • ');

    const refresh = document.createElement('button');
    refresh.textContent = 'Refresh rates';
    Object.assign(refresh.style, {
        marginLeft: 'auto',
        background: '#1b5e20',
        color: '#fff',
        border: 'none',
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    refresh.onclick = async () => {
        refresh.disabled = true;
        refresh.textContent = 'Refreshing...';
        try {
            await fetchInitialRates(); // re-pull base rates
            const m = await fetchPricesMeta();
            showRatesBanner(m);       // update banner text
        } finally {
            refresh.disabled = false;
            refresh.textContent = 'Refresh rates';
        }
    };

    el.appendChild(msg);
    el.appendChild(refresh);
    el.style.display = 'flex';
}


async function recalculateProject() {
    // Use current calculation data and recalculate all components
    const calculationData = gatherCalculationData();
    const selected = (calculationData.selectedComponents || []).map(c => c.toLowerCase());

    // Clear previous results
    const output = document.getElementById('output');
    if (output) output.innerHTML = '';

    if (calculationData.componentData) {
        for (const component of selected) {
            const fieldset = document.querySelector(`fieldset[data-component="${component}"]`);
            if (fieldset) {
                fieldset.classList.remove('hidden');
                // Fill inputs for this component
                const compInputs = calculationData.componentData[component] || {};
                for (const [name, value] of Object.entries(compInputs)) {
                    const input = fieldset.querySelector(`[name="${name}"]`);
                    if (input) input.value = value;
                }
            }
            // Calculate and render result for this component
            const result = await calculateComponentFromData(component, calculationData.componentData[component] || {});
            if (result) {
                renderResultItem(
                    result.componentType,
                    result.description,
                    result.quantity,
                    result.unit,
                    result.totalMaterialCost,
                    result.labor,
                    result.finalPlantCost,
                    result.inputs
                );
                updateSectionAndGrandTotals();
            }
        }
    }
}


// --- REPLACE saveProjectAuto with progress-aware autosave and unique untitled naming ---
async function saveProjectAuto() {
    try {
        const calculationData = gatherCalculationData();
        const snapshot = buildCalculationSnapshot();
        const totalCost = computeTotalCostFromUI();
        const progressed = hasMeaningfulProgress(calculationData, totalCost);

        // Always persist locally as a safety net
        persistDraftLocally(calculationData, snapshot, totalCost);

        // Skip backend activity if no meaningful progress (prevents empty "Untitled Project")
        if (!progressed) {
            console.log('[Autosave] Skipping backend save (no progress). Local draft updated.');
            return;
        }

        // Ensure we have a backend project; create Untitled/Untitled N if missing
        if (!currentProjectId) {
            await ensureDraftProjectUnique(totalCost);
        }
        if (!currentProjectId) {
            // Still no backend id (offline). Exit after local draft persisted.
            return;
        }

        await fetch(`/api/projects/${currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                calculation_data: JSON.stringify(calculationData),
                calculation_snapshot: JSON.stringify({
                    ...snapshot,
                    prices: await fetchCurrentPrices().catch(() => null)
                }),
                total_cost: totalCost,
                formula_version: currentFormulaVersion
            })
        });
        console.log('[Autosave] Backend autosave complete');
    } catch (e) {
        console.warn('[Autosave] Backend autosave failed; local draft persisted.', e);
    }
}


// Debounced autosave trigger
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveProjectAuto, 1500);
}

// Persist draft on tab hide/close and keep existing unload warning
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        saveProjectAuto();
    }
});
window.addEventListener('beforeunload', (e) => {
    // Keep existing change-warning logic
    const calculationData = gatherCalculationData();
    if (JSON.stringify(calculationData) !== JSON.stringify(lastSavedData)) {
        // Persist last snapshot locally to be safe
        persistDraftLocally(calculationData, buildCalculationSnapshot(), computeTotalCostFromUI());
        e.preventDefault();
        e.returnValue = '';
    }
});

// Hook autosave to edits
document.addEventListener('input', scheduleAutoSave);
document.addEventListener('change', scheduleAutoSave);

export async function loadProjectDetails(projectId) {
    try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project');
        const project = await res.json();
        // Fetch project/company details from backend
        const details = await fetchProjectDetails(projectId);
        console.log('Fetched project details:', details);
        if (details) setProjectDetails(details);
        boqData.bills = project.bills || [];
        // Optionally, recalculate summary if needed
        // calculateSummary();
        console.log('[loadProjectDetails] Loaded project:', boqData);
    } catch (err) {
        console.error('[loadProjectDetails] Error:', err);
    }
}

async function fetchCurrentPrices() {
    const requestedRegion = getNormalizedRegion(); // ✅ always preferred supplier or dropdown
    const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';
    console.log(`📦 [fetchCurrentPrices] Requested region: ${requestedRegion} (source: ${regionSource})`);

    const prices = { materials: {}, labor: {}, special: {} };

    // --- Materials ---
    const materials = ['cement', 'sand', 'aggregate', 'blocks', 'mortar', 'water'];
    for (const mat of materials) {
        const res = await fetch(`/api/prices/${encodeURIComponent(mat)}?region=${encodeURIComponent(requestedRegion)}`, {
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            prices.materials[mat] = data.unit_cost;
            console.log(`✅ Material "${mat}" → requested: ${requestedRegion}, used: ${data.region}${data.fallback ? ` (fallback: ${data.fallback})` : ''}`);
        } else {
            console.error(`❌ Failed to fetch material: ${mat}`);
        }
    }

    // --- Standard Labor Tasks ---
    const laborTasks = [
        'bricklaying',
        'concreting',
        'site clearance',
        'excavation'
    ];
    for (const task of laborTasks) {
        const res = await fetch(`/api/labor/${encodeURIComponent(task)}?region=${encodeURIComponent(requestedRegion)}`, {
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            prices.labor[task] = data.rate;
            console.log(`✅ Labor "${task}" → requested: ${requestedRegion}, used: ${data.region}${data.fallback ? ` (fallback: ${data.fallback})` : ''}`);
        } else {
            console.error(`❌ Failed to fetch labor: ${task}`);
        }
    }

    // --- Special-case Labor Rates ---
    const treeCuttingBands = [
        'tree cutting 600-1500',
        'tree cutting 1500-3000',
        'tree cutting over 3000'
    ];
    prices.special.treeCutting = {};
    for (const band of treeCuttingBands) {
        const res = await fetch(`/api/labor/${encodeURIComponent(band)}?region=${encodeURIComponent(requestedRegion)}`, {
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            prices.special.treeCutting[band] = data.rate;
            console.log(`🌳 Special labor "${band}" → requested: ${requestedRegion}, used: ${data.region}${data.fallback ? ` (fallback: ${data.fallback})` : ''}`);
        } else {
            console.error(`❌ Failed to fetch special labor: ${band}`);
        }
    }

    return prices;
}

async function restoreCalculationUI(data, snapshot, projectVersion) {
    if (!data) return;

    // 1) Always hydrate global inputs + selected components + fieldset values from calculation_data
    for (const [key, value] of Object.entries(data)) {
        if (key === "selectedComponents" || key === "componentData") continue;
        const input = document.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    }
    const componentSelect = document.getElementById('elements');
    const selected = (data.selectedComponents || []).map(c => c.toLowerCase());
    if (componentSelect && selected.length) {
        Array.from(componentSelect.options).forEach(opt => {
            opt.selected = selected.includes(opt.value.toLowerCase());
        });
        componentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (data.componentData) {
        for (const comp of selected) {
            const fieldset = document.querySelector(`fieldset[data-component="${comp}"]`);
            if (fieldset) {
                fieldset.classList.remove('hidden');
                const compInputs = data.componentData[comp] || {};
                for (const [name, value] of Object.entries(compInputs)) {
                    const input = fieldset.querySelector(`[name="${name}"]`);
                    if (input) input.value = value;
                }
            }
        }
    }

    // Ensure currentFormulaVersion is known for version banner
    if (!currentFormulaVersion) {
        try { currentFormulaVersion = await fetchCurrentFormulaVersion(); } catch {}
    }

    // Always show banner (info if same, warning if different)
    try {
        const savedVersion = projectVersion || snapshot?.formula_version || data?.formula_version || null;
        const hasSnapshotResults = !!(snapshot && Array.isArray(snapshot.results) && snapshot.results.length > 0);
        if (savedVersion && currentFormulaVersion) {
            console.log('[VersionBanner] saved=', savedVersion, 'current=', currentFormulaVersion, 'snapshotResults=', hasSnapshotResults);
            showVersionWarning(savedVersion, currentFormulaVersion, hasSnapshotResults);
        }
    } catch (e) {
        console.debug('[restoreCalculationUI] version banner check skipped:', e);
    }

    // 2) Prefer snapshot render for speed
    if (snapshot && Array.isArray(snapshot.results) && snapshot.results.length > 0) {
        renderResultsFromSnapshot(snapshot.results);

        // 2b) Recalculate any components saved in calculation_data but missing in snapshot
        const snapshotTypes = new Set(snapshot.results.map(r => String(r.type || '').toLowerCase()));
        const componentSelect = document.getElementById('elements');
        const selected = (data.selectedComponents || []).map(c => c.toLowerCase());
        for (const comp of selected) {
            if (!snapshotTypes.has(comp)) {
                try {
                    const result = await calculateComponentFromData(comp, (data.componentData || {})[comp] || {});
                    if (result) {
                        renderResultItem(
                            result.componentType,
                            result.description,
                            result.quantity,
                            result.unit,
                            result.totalMaterialCost,
                            result.labor,
                            result.finalPlantCost,
                            result.inputs
                        );
                    }
                } catch (e) {
                    console.warn('[restoreCalculationUI] Failed to recalc missing component:', comp, e);
                }
            }
        }

        // Force preliminaries to re-render to ensure visibility from dashboard
        try {
            for (const comp of Object.keys(data.componentData || {})) {
                if (COMPONENT_TO_FORMULA_MAP[comp] === 'preliminaries_item') {
                    const result = await calculateComponentFromData(comp, (data.componentData || {})[comp] || {});
                    if (result) {
                        renderResultItem(
                            result.componentType,
                            result.description,
                            result.quantity,
                            result.unit,
                            result.totalMaterialCost,
                            result.labor,
                            result.finalPlantCost,
                            result.inputs
                        );
                    }
                }
            }
        } catch (e) {
            console.debug('[restoreCalculationUI] preliminaries refresh skipped:', e);
        }

        updateSectionAndGrandTotals();
        return;
    }

    // 4) No snapshot → full recompute
    if (data.componentData) {
        for (const comp of selected) {
            const result = await calculateComponentFromData(comp, data.componentData[comp] || {});
            if (result) {
                renderResultItem(
                    result.componentType,
                    result.description,
                    result.quantity,
                    result.unit,
                    result.totalMaterialCost,
                    result.labor,
                    result.finalPlantCost,
                    result.inputs
                );
            }
        }
        updateSectionAndGrandTotals();
    }
}

function renderResultsFromSnapshot(results) {
    const output = document.getElementById('output');
    output.innerHTML = '';
    results.forEach(result => {
        // Use saved quantity/unit/description if present
        const qty = typeof result.quantity === 'number' ? result.quantity : (result.outputs.quantity || 0);
        const unit = result.unit || result.outputs.unit || '';
        const desc = result.description || '';
        renderResultItem(
            result.type,
            desc,
            qty,
            unit,
            result.outputs.materialCost,
            { laborCost: result.outputs.laborCost, totalDays: 0 },
            result.outputs.plantCost,
            result.inputs
        );
    });
}


// --- PROJECT LIST FILTERING, SORTING, PAGINATION, ROLE-BASED DISPLAY ---

async function fetchProjects({filter='all', sort='date', order='desc', page=1, pageSize=10}) {
    const params = new URLSearchParams({filter, sort, order, page, page_size: pageSize});
    const res = await fetch(`/api/projects?${params.toString()}`, {credentials: 'include'});
    return await res.json();
}

function getCurrentUserRole() {
    // You may want to cache/fetch this from /api/profile or template context
    return window.currentUserRole || 'professional'; // fallback
}

async function renderProjectList(role) {
    const filter = document.getElementById('filter-select').value;
    const sort = document.getElementById('sort-select').value;
    const order = document.getElementById('order-select').value;
    const page = parseInt(document.getElementById('page-input').value, 10) || 1;

    // Show loading spinner
    const list = document.getElementById('project-list');
    list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    const {projects, total, page_size} = await fetchProjects({filter, sort, order, page, pageSize: 10});
    list.innerHTML = '';

    projects.forEach(project => {
        const div = document.createElement('div');
        div.className = 'project-item' + (project.archived ? ' archived' : '') + (project.starred ? ' starred' : '');
        div.innerHTML = `<span style="font-weight:bold">${project.project_name}</span>`;
        if (role !== 'student') {
            div.innerHTML += `
                <span style="margin-left:1em;">GHS ${Number(project.total_cost).toLocaleString()}</span>
                <span style="margin-left:1em;">${new Date(project.last_modified).toLocaleString()}</span>
                <span style="margin-left:1em;">v${project.formula_version}</span>
                <button onclick="starProject(${project.id}, this)">${project.starred ? '★' : '☆'}</button>
                <button onclick="archiveProject(${project.id}, this)">Archive</button>
            `;
        } else {
            div.innerHTML += `<button onclick="showProjectDetails(${project.id})" style="margin-left:1em;">Details</button>`;
        }
        list.appendChild(div);
    });

    renderPaginationControls(page, Math.ceil(total / page_size));
}

// --- Pagination controls ---
function renderPaginationControls(currentPage, totalPages) {
    document.getElementById('page-input').value = currentPage;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

// --- Star/Archive handlers ---
window.starProject = async function(projectId, btn) {
    await fetch(`/api/projects/${projectId}/star`, {method: 'POST', credentials: 'include'});
    btn.textContent = '★';
};
window.archiveProject = async function(projectId, btn) {
    await fetch(`/api/projects/${projectId}/archive`, {method: 'POST', credentials: 'include'});
    btn.closest('.project-item').classList.add('archived');
};

// --- Details handler for students ---
window.showProjectDetails = function(projectId) {
    alert('Show details for project ' + projectId);
};

// --- Event listeners for controls ---
['filter-select', 'sort-select', 'order-select'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => renderProjectList(getCurrentUserRole()));
});
document.getElementById('prev-page').addEventListener('click', () => {
    let page = parseInt(document.getElementById('page-input').value, 10) || 1;
    if (page > 1) {
        document.getElementById('page-input').value = page - 1;
        renderProjectList(getCurrentUserRole());
    }
});
document.getElementById('next-page').addEventListener('click', () => {
    let page = parseInt(document.getElementById('page-input').value, 10) || 1;
    document.getElementById('page-input').value = page + 1;
    renderProjectList(getCurrentUserRole());
});
document.getElementById('page-input').addEventListener('change', () => renderProjectList(getCurrentUserRole()));


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
    // NEW: persist quantity/unit/description for robust snapshots
    resultItem.setAttribute('data-quantity', Number(quantity) || 0);
    resultItem.setAttribute('data-unit', unit || '');
    resultItem.setAttribute('data-description', description || '');
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

    // Always fetch latest details from backend before generating BOQ
    let details = null;
    if (currentProjectId) {
        details = await fetchProjectDetails(currentProjectId);
        if (details && details.companyName && details.projectTitle && details.clientName) {
            boqData.projectDetails = details;
        } else {
            const d = boqData.projectDetails || {};
            document.getElementById('company-name').value = d.companyName || '';
            document.getElementById('company-address').value = d.companyAddress || '';
            document.getElementById('contact-info').value = d.contactInfo || '';
            document.getElementById('project-title').value = d.projectTitle || '';
            document.getElementById('client-name').value = d.clientName || '';
            document.getElementById('project-phase').value = d.projectPhase || '';
            showProjectDetailsModal();
            alert('Please fill in project details before exporting BOQ.');
            return;
        }
    } else {
        details = boqData.projectDetails;
        if (!details || !details.companyName || !details.projectTitle || !details.clientName) {
            const d = boqData.projectDetails || {};
            document.getElementById('company-name').value = d.companyName || '';
            document.getElementById('company-address').value = d.companyAddress || '';
            document.getElementById('contact-info').value = d.contactInfo || '';
            document.getElementById('project-title').value = d.projectTitle || '';
            document.getElementById('client-name').value = d.clientName || '';
            document.getElementById('project-phase').value = d.projectPhase || '';
            showProjectDetailsModal();
            alert('Please fill in project details before exporting BOQ.');
            return;
        }
    }

    try {
        if (!boqData || !Array.isArray(boqData.bills) || boqData.bills.length === 0) {
            console.error('[generateBOQPDF] No BOQ data or bills found:', boqData);
            alert("No BOQ data available to generate PDF.");
            return;
        }

        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const pageSize = [595, 842];
        const margin = 40;
        const colWidths = [40, 260, 45, 40, 65, 65];
        const descPadding = 6;

        // Fonts
        const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Helpers
        function drawCenteredUnderlinedText(page, text, y, font, fontSize) {
            const t = String(text || '');
            const textWidth = font.widthOfTextAtSize(t, fontSize);
            const x = (pageSize[0] - textWidth) / 2;
            page.drawText(t, { x, y, size: fontSize, font, color: rgb(0,0,0) });
            page.drawLine({ start: { x, y: y - 2 }, end: { x: x + textWidth, y: y - 2 }, thickness: 1, color: rgb(0,0,0) });
        }
        // Title-case helper for display only
        function toTitleCase(s) {
            return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }
        function drawHeaderFooter(page, yStart, billNo, pageNo) {
            const d = boqData.projectDetails || {};
            let y = yStart;
            page.drawText(d.companyName || '', { x: margin, y, size: 11, font: boldFont, color: rgb(0,0,0) });
            y -= 13;
            (d.companyAddress || '').split('\n').forEach(line => {
                page.drawText(line, { x: margin, y, size: 9, font: normalFont, color: rgb(0,0,0) });
                y -= 11;
            });
            page.drawText(d.contactInfo || '', { x: margin, y, size: 9, font: normalFont, color: rgb(0,0,0) });
            const billText = billNo ? `Bill No: ${billNo}` : '';
            const pageText = `Page ${pageNo}`;
            const rightText = [billText, pageText].filter(Boolean).join('   ');
            const rightTextWidth = normalFont.widthOfTextAtSize(rightText, 9);
            page.drawText(rightText, { x: pageSize[0] - margin - rightTextWidth, y: yStart, size: 9, font: normalFont, color: rgb(0,0,0) });
        }
        function drawProjectTitle(page, y) {
            const d = boqData.projectDetails || {};
            drawCenteredUnderlinedText(page, d.projectTitle || '', y, boldFont, 15);
            return y - 22;
        }
        function drawProjectPhase(page, y) {
            const d = boqData.projectDetails || {};
            if (d.projectPhase) {
                drawCenteredUnderlinedText(page, d.projectPhase, y, boldFont, 12);
                return y - 18;
            }
            return y;
        }
        function drawDoubleHorizontalLine(page, y) {
            const totalWidth = colWidths.reduce((a, b) => a + b, 0);
            page.drawLine({ start: { x: margin, y }, end: { x: margin + totalWidth, y }, thickness: 1.2, color: rgb(0,0,0) });
            page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: margin + totalWidth, y: y - 2 }, thickness: 1.2, color: rgb(0,0,0) });
        }
        function drawColumnLines(page, yTop, yBottom) {
            let x = margin;
            for (let i = 0; i < colWidths.length + 1; i++) {
                page.drawLine({ start: { x, y: yTop }, end: { x, y: yBottom }, thickness: 0.7, color: rgb(0,0,0) });
                if (i < colWidths.length) x += colWidths[i];
            }
        }
        function drawTableHeader(page, y) {
            const headers = ["ITEM", "DESCRIPTION", "QTY", "UNIT", "RATE (GHe)", "AMOUNT (GHe)"];
            let x = margin;
            headers.forEach((h, i) => {
                page.drawText(h, { x, y, size: 10, font: boldFont, color: rgb(0,0,0) });
                x += colWidths[i];
            });
            drawDoubleHorizontalLine(page, y - 3);
            drawColumnLines(page, y + 3, y - 15);
            return y - 15;
        }
        function wrapText(text, font, fontSize, maxWidth) {
            const words = String(text || '').split(' ');
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
        function drawBOQItemRow(page, yPos, item, itemCode, normalFont, boldFont) {
            let x = margin;

            // Item code
            page.drawText(itemCode, { x, y: yPos, size: fontSize, font: normalFont, color: rgb(0,0,0) });
            x += colWidths[0];

            // Category (Title Case for display only)
            let descY = yPos;
            const category = String(item.category || '');
            const displayCategory = toTitleCase(category);
            page.drawText(displayCategory, { x: x + descPadding, y: descY, size: fontSize, font: boldFont, color: rgb(0,0,0) });
            const compWidth = boldFont.widthOfTextAtSize(displayCategory, fontSize);
            page.drawLine({ start: { x: x + descPadding, y: descY - 2 }, end: { x: x + descPadding + compWidth, y: yPos - 2 }, thickness: 0.7, color: rgb(0,0,0) });
            descY -= fontSize + 2;

            // Description (wrap)
            const descLines = wrapText(item.description, normalFont, fontSize, colWidths[1] - 2 * descPadding);
            for (const line of descLines) {
                page.drawText(line, { x: x + descPadding, y: descY, size: fontSize, font: normalFont, color: rgb(0,0,0) });
                descY -= fontSize + 1;
            }

            // Other columns
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

            // Row boundary
            const rowHeight = (fontSize + 1) * (descLines.length + 1) + 6;
            drawColumnLines(page, yPos + 3, yPos - rowHeight);

            return yPos - rowHeight;
        }

        // Page setup
        let page = pdfDoc.addPage(pageSize);
        let fontSize = 10;
        let yPos = pageSize[1] - margin;
        yPos = drawProjectTitle(page, yPos);

        let pageNo = 1;
        let isFirstBill = true;

        // Bills
        for (const bill of boqData.bills) {
            if (!bill || !bill.items) continue;

            // New page for each bill (except the first)
            if (!isFirstBill) {
                page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                page.drawText(`Page ${++pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                page = pdfDoc.addPage(pageSize);
                yPos = pageSize[1] - margin;
            }
            isFirstBill = false;

            drawHeaderFooter(page, pageSize[1] - margin + 10, bill.billNo, pageNo);
            yPos = drawProjectPhase(page, yPos);

            const billHeading = `BILL No. ${bill.billNo || ''}: ${bill.title || ''}`;
            drawCenteredUnderlinedText(page, billHeading, yPos, boldFont, 12);
            yPos -= 20;

            yPos = drawTableHeader(page, yPos);

            // Group by section with section headings/subtotals
            const items = (bill.items || [])
                .slice()
                .filter(Boolean)
                .sort((a, b) => (a.sectionCode || '').localeCompare(b.sectionCode || ''));

            let currentSection = null;
            let sectionTotal = 0;
            let itemCodeChar = 0;

            for (const item of items) {
                const itemSection = item.sectionCode || 'Z';
                if (currentSection !== itemSection) {
                    if (currentSection !== null) {
                        yPos -= 6;
                        page.drawText(`Subtotal for ${currentSection}: ${sectionTotal.toFixed(2)}`, {
                            x: margin + 260, y: yPos, size: fontSize, font: boldFont, color: rgb(0,0,0)
                        });
                        yPos -= 14;
                        sectionTotal = 0;
                    }
                    // Page break before new section header if low space
                    if (yPos < 120) {
                        page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                        page.drawText(`Page ${++pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                        page = pdfDoc.addPage(pageSize);
                        yPos = pageSize[1] - margin;

                        drawHeaderFooter(page, pageSize[1] - margin + 10, bill.billNo, pageNo);
                        yPos = drawProjectPhase(page, yPos);
                        drawCenteredUnderlinedText(page, billHeading, yPos, boldFont, 12);
                        yPos -= 20;
                        yPos = drawTableHeader(page, yPos);
                        itemCodeChar = 0; // restart item codes per page
                    }

                    currentSection = itemSection;
                    const secTitle = `${item.sectionCode || 'Z'}. ${item.sectionTitle || 'Unclassified'}`;
                    page.drawText(secTitle, { x: margin, y: yPos, size: 11, font: boldFont, color: rgb(0,0,0) });
                    yPos -= 14;
                }

                // Page break before item row if near bottom
                if (yPos < 100) {
                    page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                    page.drawText(`Page ${++pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                    page = pdfDoc.addPage(pageSize);
                    yPos = pageSize[1] - margin;

                    drawHeaderFooter(page, pageSize[1] - margin + 10, bill.billNo, pageNo);
                    yPos = drawProjectPhase(page, yPos);
                    drawCenteredUnderlinedText(page, billHeading, yPos, boldFont, 12);
                    yPos -= 20;
                    yPos = drawTableHeader(page, yPos);
                    itemCodeChar = 0;

                    // Reprint current section header
                    const secTitle = `${item.sectionCode || 'Z'}. ${item.sectionTitle || 'Unclassified'}`;
                    page.drawText(secTitle, { x: margin, y: yPos, size: 11, font: boldFont, color: rgb(0,0,0) });
                    yPos -= 14;
                }

                const itemCode = String.fromCharCode(65 + (itemCodeChar % 26));
                yPos = drawBOQItemRow(page, yPos, item, itemCode, normalFont, boldFont);
                itemCodeChar++;
                sectionTotal += (item.amount || 0);
            }

            // Close last section subtotal
            if (currentSection !== null) {
                yPos -= 6;
                page.drawText(`Subtotal for ${currentSection}: ${sectionTotal.toFixed(2)}`, {
                    x: margin + 260, y: yPos, size: fontSize, font: boldFont, color: rgb(0,0,0)
                });
                yPos -= 14;
            }

            // Bill summary
            yPos -= 8;
            page.drawText(`SUMMARY OF BILL No.${bill.billNo || ''}`, { x: margin, y: yPos, size: fontSize, color: rgb(0,0,0) });
            page.drawText((typeof bill.total === 'number' ? bill.total.toFixed(2) : '0.00'), { x: margin + 420, y: yPos, size: fontSize, color: rgb(0,0,0) });
            yPos -= 20;
        }

        // Optional: GENERAL SUMMARY – BILL No. 2 (2A..2D)
        const bill2Bills = (boqData.bills || []).filter(b => /^2[A-D]$/.test(b.billNo));
        if (bill2Bills.length > 0) {
            const bill2Sum = bill2Bills.reduce((s, b) => s + (b.total || 0), 0);

            if (yPos < 120) {
                page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                page.drawText(`Page ${++pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
                page = pdfDoc.addPage(pageSize);
                yPos = pageSize[1] - margin;
                drawHeaderFooter(page, pageSize[1] - margin + 10, null, pageNo);
            }

            page.drawText("GENERAL SUMMARY – BILL No. 2 (2A..2D)", { x: margin, y: yPos, size: 11, font: boldFont, color: rgb(0,0,0) });
            yPos -= 15;
            page.drawText(`TOTAL FOR BILL No. 2`, { x: margin, y: yPos, size: fontSize, font: normalFont, color: rgb(0,0,0) });
            page.drawText(bill2Sum.toFixed(2), { x: margin + 420, y: yPos, size: fontSize, font: normalFont, color: rgb(0,0,0) });
            yPos -= 20;
        }

        // Grand summary
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

        // Page break before general summary if needed
        if (yPos < 120) {
            page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
            page.drawText(`Page ${++pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
            page = pdfDoc.addPage(pageSize);
            yPos = pageSize[1] - margin;
            drawHeaderFooter(page, pageSize[1] - margin + 10, null, pageNo);
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

        // Footer last page
        page.drawText(boqData.projectDetails.companyName || '', { x: margin, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });
        page.drawText(`Page ${pageNo}`, { x: pageSize[0] - margin - 40, y: 20, size: 9, font: normalFont, color: rgb(0,0,0) });

        // Download
        try {
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `BOQ-${(boqData.projectDetails.projectTitle || 'Project')}.pdf`;
            link.click();
            alert("BOQ Report has been successfully generated!");
        } catch (err) {
            console.error('[generateBOQPDF] Error saving or downloading PDF:', err);
            alert('Failed to generate or download PDF. See console for details.');
        }
    } catch (error) {
        console.error('[generateBOQPDF] PDF generation failed:', error);
        alert("Failed to generate BOQ PDF. See console for details.");
    }
}


// Save project/company details to backend
export async function saveProjectDetails(projectId, details) {
    try {
        const res = await fetch(`/api/projects/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(details)
        });
        console.log('[saveProjectDetails] Response status:', res.status, res.statusText);
        let data = null;
        try {
            data = await res.json();
        } catch (jsonErr) {
            console.warn('[saveProjectDetails] Could not parse JSON:', jsonErr);
        }
        console.log('[saveProjectDetails] Response data:', data);
        if (!res.ok) throw new Error('Failed to save project details');
        // Defensive: check for empty object or missing fields
        if (!data || Object.keys(data).length === 0) {
            console.warn('[saveProjectDetails] Warning: Empty response object after saving project details.');
        }
        if (data && (!data.companyName || !data.projectTitle || !data.clientName)) {
            console.warn('[saveProjectDetails] Warning: Missing required fields in saved project details:', data);
        }
        return data;
    } catch (err) {
        console.error('[saveProjectDetails] Error:', err);
        throw err;
    }
}

// Fetch project/company details from backend
export async function fetchProjectDetails(projectId) {
    try {
        const res = await fetch(`/api/projects/${projectId}/details`, {
            credentials: 'include'
        });
        console.log('[fetchProjectDetails] Response status:', res.status, res.statusText);
        let data = null;
        try {
            data = await res.json();
        } catch (jsonErr) {
            console.warn('[fetchProjectDetails] Could not parse JSON:', jsonErr);
        }
        console.log('[fetchProjectDetails] Response data:', data);
        if (!res.ok) throw new Error('Failed to fetch project details');
        // Defensive: check for empty object or missing fields
        if (!data || Object.keys(data).length === 0) {
            console.warn('[fetchProjectDetails] Warning: Empty response object when fetching project details.');
        }
        if (data && (!data.companyName || !data.projectTitle || !data.clientName)) {
            console.warn('[fetchProjectDetails] Warning: Missing required fields in fetched project details:', data);
        }
        return data;
    } catch (err) {
        console.error('[fetchProjectDetails] Error:', err);
        return null;
    }
}


document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOMContentLoaded event fired');
    refreshProjectDetailsUI();

    try {
        // Auth + profile
        await checkAuthentication();
        const userRoles = await fetchUserRoles();
        console.log('User roles:', userRoles);
        console.log('User roles array:', userRoles, typeof userRoles[0]);
        checkRoleVisibility(userRoles);

        // Role-based project list (dashboard controls on calc page)
        const role = (userRoles && userRoles[0]) || 'professional';
        window.currentUserRole = role;
        renderProjectList(role);

        // Locations + versions + initial rates
        await loadLocations();
        try { currentFormulaVersion = await fetchCurrentFormulaVersion(); } catch (e) { console.debug('version fetch failed early:', e); }
        await checkFormulaVersion();
        await fetchInitialRates();

        // Show price dataset/version banner
        try {
            const meta = await fetchPricesMeta();
            showRatesBanner(meta);
        } catch (e) {
            console.debug('[RatesBanner] skipped:', e);
        }

        // UI setup
        setupInputValidation();
        setupComponentDropdown();
        setupCalculateButtons();
        setupSaveProjectButton();
        setupUpdateProjectButton();
        setupLogoutButton();

        // Resolve project_id
        const params = new URLSearchParams(window.location.search);
        const pidFromURL =
            (typeof getProjectIdFromURL === 'function' && getProjectIdFromURL()) ||
            (typeof getProjectIdFromUrl === 'function' && getProjectIdFromUrl()) ||
            null;
        currentProjectId = pidFromURL;
        console.log('[RestoreProject] URL params:', Array.from(params.entries()));

        // New calc vs resume local draft
        if (!currentProjectId && typeof isNewCalculationRequested === 'function' && isNewCalculationRequested()) {
            console.log('[RestoreProject] New calculation requested. Clearing local draft and skipping resume.');
            localStorage.removeItem(DRAFT_KEY);
        } else if (!currentProjectId) {
            await tryResumeDraftFromLocal();
        }

        // Initialize Save/Update visibility
        (function initSaveUpdateButtons() {
            const saveBtn = document.getElementById('save-project-btn');
            const updateBtn = document.getElementById('update-project-btn');
            if (currentProjectId) {
                if (saveBtn) saveBtn.style.display = 'none';
                if (updateBtn) updateBtn.style.display = 'inline-block';
            } else {
                if (document.querySelectorAll('.result-item').length > 0) {
                    if (saveBtn) saveBtn.style.display = 'inline-block';
                }
                if (updateBtn) updateBtn.style.display = 'none';
            }
        })();

        // Load and restore existing project (with banner guarantees)
        if (currentProjectId) {
            console.log('[RestoreProject] Found project_id:', currentProjectId);
            showLoading();
            try {
                const res = await fetch(`/api/projects/${currentProjectId}`, { credentials: 'include' });
                console.log('[RestoreProject] Fetch response:', res);

                if (res.ok) {
                    const project = await res.json();
                    projectFormulaVersion = project.formula_version;
                    lastSavedData = project.calculation_data ? JSON.parse(project.calculation_data) : {};
                    const calculationSnapshot = project.calculation_snapshot ? JSON.parse(project.calculation_snapshot) : null;

                    // Ensure current version is known
                    if (!currentFormulaVersion) { try { currentFormulaVersion = await fetchCurrentFormulaVersion(); } catch {} }
                    console.log('[VersionBanner] projectFormulaVersion=', projectFormulaVersion, 'current=', currentFormulaVersion, 'hasSnapshot=', !!calculationSnapshot);

                    // Restore UI first (hydrates fields and may render snapshot)
                    await restoreCalculationUI(lastSavedData, calculationSnapshot, projectFormulaVersion);

                    // Also show banner if restore path didn’t
                    const savedVersion = projectFormulaVersion || calculationSnapshot?.formula_version || lastSavedData?.formula_version;
                    if (savedVersion && currentFormulaVersion) {
                        const hasSnapshotResults = !!(calculationSnapshot && Array.isArray(calculationSnapshot.results) && calculationSnapshot.results.length);
                        showVersionWarning(savedVersion, currentFormulaVersion, hasSnapshotResults);
                    }
                } else {
                    alert('Could not load project.');
                    console.error('[RestoreProject] Failed to fetch project. Status:', res.status);
                }

                await loadProjectDetailsWithLoading(currentProjectId);
            } catch (error) {
                console.error('Project load error:', error);
            } finally {
                hideLoading();
            }
        }

        // Populate projects list in sidebar/dashboard section
        displayProjects();

    } catch (error) {
        console.error('Initialization failed:', error);
        alert('A critical error occurred during initialization. Please reload the page.');
    } finally {
        hideLoading();
    }

    window.addEventListener('resize', centerProjectDetailsModal);
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
                    option.setAttribute('data-region', loc.region?.toLowerCase());
                    //option.setAttribute('data-region', loc.region); // 👈 add region for JS use
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
        const region = getNormalizedRegion();
        const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';
        console.log(`📊 [Init] Fetching initial rates for region: ${region} (source: ${regionSource})`);

        const materials = ['cement', 'sand', 'aggregate', 'blocks', 'mortar'];
        for (const mat of materials) {
            const data = await fetchMaterialRate(mat, region);
            if (data) {
                console.log(`✅ ${mat}: ${data.unit_cost} GHS (requested: ${region}, actual: ${data.region || 'unknown'})`);
            }
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
            const data = await fetchLaborRate(task, region);
            if (data) {
                console.log(`✅ ${task}: ${data.rate} GHS (requested: ${region}, actual: ${data.region || 'unknown'})`);
            }
        }

        // --- Plants ---
        const plants = await fetchPlantData(region);
        plants.slice(0, 3).forEach(p => {
            console.log(
                `🌱 Init Plant: ${p.equipment}, rate: ${p.dailyRate} ` +
                `(requested: ${p.requestedRegion || region}, actual: ${p.region})`
            );
            if (p.haulageCost && p.haulageCost > 0) {
                console.warn(
                    `🚚 Haulage cost applied for ${p.equipment}: ${p.haulageCost} GHS ` +
                    `(anchor city: ${p.anchorCity}, distance: ${p.distanceKm} km)`
                );
            }
        });

    } catch (error) {
        console.error('❌ Error fetching initial rates:', error);
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
/*const SPECIAL_LABOR_FETCH_HANDLERS = {
    'tree cutting': async (component, region) => {
        const girthTasks = [
            'tree cutting 600-1500',
            'tree cutting 1500-3000',
            'tree cutting over 3000'
        ];
        const laborRates = {};
        for (const task of girthTasks) {
            const laborData = await fetchLaborRate(task, getNormalizedRegion());
            if (laborData) {
                laborRates[task] = laborData.rate;

                // 👇 Optional fallback warning display
                if (laborData.warning) {
                    const fallbackNotice = document.getElementById('fallback-warning');
                    fallbackNotice.textContent = `Fallback for "${task}" from ${laborData.region || 'unknown region'}: ${laborData.warning}`;
                    fallbackNotice.style.display = 'block';
                }
            }
        }
        return laborRates;
    },
    // Add more special cases here as needed
};*/

/*const SPECIAL_LABOR_FETCH_HANDLERS = {
    'tree cutting': async (component) => {
        const girthTasks = [
            'tree cutting 600-1500',
            'tree cutting 1500-3000',
            'tree cutting over 3000'
        ];
        const laborRates = {};
        const region = getNormalizedRegion();
        const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';

        console.log(`🌳 [tree cutting] Using region: ${region} (source: ${regionSource})`);

        for (const task of girthTasks) {
            const laborData = await fetchLaborRate(task, region);
            if (laborData) {
                laborRates[task] = laborData.rate;

                if (laborData.fallback) {
                    const fallbackNotice = document.getElementById('fallback-warning');
                    fallbackNotice.textContent = `Fallback for "${task}": requested "${region}", used "${laborData.fallback}"`;
                    fallbackNotice.style.display = 'block';
                }
            }
        }
        return laborRates;
    }
};*/

const SPECIAL_LABOR_FETCH_HANDLERS = {
    'tree cutting': async () => {
        const girthTasks = [
            'tree cutting 600-1500',
            'tree cutting 1500-3000',
            'tree cutting over 3000'
        ];
        const laborRates = {};

        const requestedRegion = (getNormalizedRegion() || 'default').toLowerCase();
        const anchorCity = typeof get_anchor_city === 'function' ? get_anchor_city(requestedRegion) : null;

        function extractRate(val) {
            if (!val) return 0;
            if (typeof val.rate === 'number') return val.rate;
            if (val.rate && typeof val.rate === 'object' && 'parsedValue' in val.rate) return val.rate.parsedValue;
            if (typeof val === 'number') return val;
            return Number(val.rate) || 0;
        }

        async function getLaborRateWithFallback(task) {
            // 1) Requested region
            try {
                const res = await fetchLaborRate(task, requestedRegion);
                const rate = extractRate(res);
                if (rate > 0) {
                    if (res?.fallback && !suppressFallbackUI) {
                        showFallbackWarning(`${task} (labor)`, `Requested ${requestedRegion}, used ${res.fallback}`);
                    }
                    return rate;
                }
            } catch (e) {
                console.debug(`[tree cutting] requested-region fetch failed for "${task}"`, e);
            }

            // 2) Anchor city
            if (anchorCity && anchorCity.toLowerCase() !== requestedRegion) {
                try {
                    const res = await fetchLaborRate(task, anchorCity.toLowerCase());
                    const rate = extractRate(res);
                    if (rate > 0) {
                        if (!suppressFallbackUI) {
                            showFallbackWarning(`${task} (labor)`, `anchor: ${anchorCity}`);
                        }
                        return rate;
                    }
                } catch (e) {
                    console.debug(`[tree cutting] anchor fetch failed for "${task}" (${anchorCity})`, e);
                }
            }

            // 3) National
            try {
                const res = await fetchLaborRate(task, 'national');
                const rate = extractRate(res);
                if (rate > 0) {
                    if (!suppressFallbackUI) {
                        showFallbackWarning(`${task} (labor)`, 'national');
                    }
                    return rate;
                }
            } catch (e) {
                console.debug(`[tree cutting] national fetch failed for "${task}"`, e);
            }

            console.warn(`[tree cutting] No rate found for "${task}" after fallbacks`);
            return 0;
        }

        console.log(`🌳 [tree cutting] Using region: ${requestedRegion} (anchor: ${anchorCity || 'n/a'})`);
        for (const task of girthTasks) {
            laborRates[task] = await getLaborRateWithFallback(task);
        }

        return laborRates;
    }
};


// Scalable price fetcher
/*async function fetchPricesForComponent(componentKey) {
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
}*/

/*async function fetchPricesForComponent(componentKey) {
    const component = SMM7_2023[componentKey];
    if (!component) {
        console.error(`Unknown component type: ${componentKey}`);
        return null;
    }

    const region = getNormalizedRegion();  // uses hybrid logic
    const materialPrices = {};
    const fallbackNotice = document.getElementById('fallback-warning');
    fallbackNotice.innerHTML = '';  // Clear old warnings
    fallbackNotice.style.display = 'none';

    for (const material of component.materials || []) {
        const materialData = await fetchMaterialRate(material, region);
        if (materialData) {
            materialPrices[material] = materialData.unit_cost;

            if (materialData.fallback) {
                fallbackNotice.innerHTML += `
                    ⚠️ Material <strong>${material}</strong> used fallback region: <em>${materialData.region}</em><br>
                `;
                fallbackNotice.style.display = 'block';
            }
        }
    }

    let laborRates = {};
    if (SPECIAL_LABOR_FETCH_HANDLERS[componentKey]) {
        laborRates = await SPECIAL_LABOR_FETCH_HANDLERS[componentKey](component, region);
    } else {
        for (const task of component.laborTasks || []) {
            const laborData = await fetchLaborRate(task, region);
            if (laborData) {
                laborRates[task] = laborData.rate;

                if (laborData.fallback) {
                    fallbackNotice.innerHTML += `
                        ⚠️ Labor task <strong>${task}</strong> used fallback region: <em>${laborData.region}</em><br>
                    `;
                    fallbackNotice.style.display = 'block';
                }
            }
        }
    }

    console.log(`Fetched material + labor for "${componentKey}" from region: ${region}`);
    return { materialPrices, laborRates };
}*/

async function fetchPricesForComponent(componentKey) {
    const component = SMM7_2023[componentKey];
    if (!component) {
        console.error(`Unknown component type: ${componentKey}`);
        return null;
    }

    const region = getNormalizedRegion();
    const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';
    console.log(`📦 [${componentKey}] Fetching prices using region: ${region} (source: ${regionSource})`);

    const materialPrices = {};
    const fallbackNotice = document.getElementById('fallback-warning');
    fallbackNotice.innerHTML = '';
    fallbackNotice.style.display = 'none';

    // --- Materials ---
    for (const material of component.materials || []) {
        const materialData = await fetchMaterialRate(material, region);
        if (materialData) {
            materialPrices[material] = materialData.unit_cost;
            if (materialData.fallback) {
                fallbackNotice.innerHTML += `
                    ⚠️ Material <strong>${material}</strong>: requested "${region}", used "${materialData.fallback}"<br>
                `;
                fallbackNotice.style.display = 'block';
            }
        }
    }

    // --- Labor ---
    let laborRates = {};
    if (SPECIAL_LABOR_FETCH_HANDLERS[componentKey]) {
        laborRates = await SPECIAL_LABOR_FETCH_HANDLERS[componentKey](component);
    } else {
        for (const task of component.laborTasks || []) {
            const laborData = await fetchLaborRate(task, region);
            if (laborData) {
                laborRates[task] = laborData.rate;
                if (laborData.fallback) {
                    fallbackNotice.innerHTML += `
                        ⚠️ Labor task <strong>${task}</strong>: requested "${region}", used "${laborData.fallback}"<br>
                    `;
                    fallbackNotice.style.display = 'block';
                }
            }
        }
    }

    // --- Plants ---
    if (component.equipment && component.equipment.length > 0) {
        const plantData = await fetchPlantData();
        const availablePlants = plantData.filter(p => component.equipment.includes(p.equipment));
        availablePlants.forEach(p => {
            if (p.haulageCost && p.haulageCost > 0) {
                fallbackNotice.innerHTML += `
                    🚚 Plant <strong>${p.equipment}</strong>: requested "${p.requestedRegion}", 
                    used "${p.region}" + haulage from ${p.anchorCity} (${p.distanceKm} km)<br>
                `;
                fallbackNotice.style.display = 'block';
            }
        });
    }

    console.log(`✅ Done fetching materials, labor, and plants for ${componentKey} from region: ${region}`);
    return { materialPrices, laborRates };
}

function showSaveOrUpdateButton() {
    const saveBtn = document.getElementById('save-project-btn');
    const updateBtn = document.getElementById('update-project-btn');
    if (currentProjectId) {
        if (saveBtn) saveBtn.style.display = 'none';
        if (updateBtn) updateBtn.style.display = 'inline-block';
    } else {
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (updateBtn) updateBtn.style.display = 'none';
    }
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

            // --- Preliminaries short-circuit (lump-sum) ---
            if (formulaKey === 'preliminaries_item') {
                const valueKey = Object.keys(inputValues).find(k => /_value$|^value$/i.test(k));
                const descKey  = Object.keys(inputValues).find(k => /_description$|^description$/i.test(k));
                const amount = Number(inputValues[valueKey] ?? inputValues.value) || 0;

                const unit = SMM7_2023[formulaKey].unit || 'item';
                // Prefer explicit description input, else show the component name
                const description =
                    (descKey && inputValues[descKey]) ||
                    (typeof SMM7_2023[formulaKey].description === 'function'
                        ? SMM7_2023[formulaKey].description({ description: componentType })
                        : componentType);

                const quantity = 1;
                const totalMaterialCost = amount;
                const labor = { totalDays: 0, laborCost: 0 };
                const finalPlantCost = 0;

                renderResultItem(
                    componentType,
                    description,
                    quantity,
                    unit,
                    totalMaterialCost,
                    labor,
                    finalPlantCost,
                    inputValues
                );

                updateSectionAndGrandTotals();
                calculatedComponents.add(componentType);
                showSaveOrUpdateButton();
                return; // ⛔ do not proceed to pricing/materials/labor path
            }
            // --- end prelim short-circuit ---


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

            // Clear previous fallback messages
            const fallbackNotice = document.getElementById('fallback-warning');
            if (fallbackNotice) {
                fallbackNotice.innerHTML = '';
                fallbackNotice.style.display = 'none';
            }

            // Un-suppress fallback UI so warnings can be shown
            suppressFallbackUI = false;

            const region = getNormalizedRegion();

            const prices = await fetchPricesForComponent(formulaKey, region);

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
            // Show appropriate Save/Update button depending on whether a project exists
            if (selectedComponents.every(component => calculatedComponents.has(component))) {
                showSaveOrUpdateButton();
            } else {
                // Even if not all selected components calculated, ensure correct button shown
                showSaveOrUpdateButton();
            }

            // remove unconditional saveBtn display to avoid re-showing Save over Update
            // const saveBtn = document.getElementById('save-project-btn');
            // if (saveBtn) saveBtn.style.display = 'block';
        });
    }
}


// Ensure globals
//let currentProjectId = currentProjectId || null;

// Setup initial Save button (existing) — augment to reveal Update after save
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

        // Collect results and totalCost
        const results = document.querySelectorAll('.result-item');
        let totalCost = 0;
        results.forEach(result => {
            const materialCost = parseFloat(result.getAttribute('data-material-cost')) || 0;
            const laborCost = parseFloat(result.getAttribute('data-labor-cost')) || 0;
            const plantCost = parseFloat(result.getAttribute('data-plant-cost')) || 0;
            totalCost += materialCost + laborCost + plantCost;
        });

        try {
            const response = await saveProject({
                project_name: projectName,
                total_cost: totalCost
            });

            // Ensure currentProjectId reflects backend
            const newId = response.project_id || response.id || response.projectId || null;
            if (newId) currentProjectId = newId;

            // Toggle buttons: hide initial save, show update
            saveBtn.style.display = 'none';
            const updateBtn = document.getElementById('update-project-btn');
            if (updateBtn) updateBtn.style.display = 'inline-block';

            alert(`Project "${projectName}" saved successfully! Total Cost: GHS ${totalCost.toFixed(2)}`);
            await displayProjects();
        } catch (e) {
            alert("Failed to save project.");
        }
    });
}

// New: setup Update button for subsequent saves (PUT)
function setupUpdateProjectButton() {
    console.log("Setting up update project button");
    const updateBtn = document.getElementById('update-project-btn');
    if (!updateBtn) {
        console.warn("Update project button not found");
        return;
    }

    updateBtn.addEventListener('click', async function () {
        if (!currentProjectId) {
            alert('No existing saved project to update. Use Save Project first.');
            // Show Save button as fallback
            const saveBtn = document.getElementById('save-project-btn');
            if (saveBtn) saveBtn.style.display = 'inline-block';
            updateBtn.style.display = 'none';
            return;
        }

        // Recompute total cost
        const results = document.querySelectorAll('.result-item');
        let totalCost = 0;
        results.forEach(result => {
            const materialCost = parseFloat(result.getAttribute('data-material-cost')) || 0;
            const laborCost = parseFloat(result.getAttribute('data-labor-cost')) || 0;
            const plantCost = parseFloat(result.getAttribute('data-plant-cost')) || 0;
            totalCost += materialCost + laborCost + plantCost;
        });

        try {
            // Call saveProject with id to trigger update path
            const resp = await saveProject({
                project_id: currentProjectId,
                project_name: (document.getElementById('project-title')?.value || undefined),
                total_cost: totalCost
            });

            // Update UI and projects list
            alert(`Project updated. New Total: GHS ${totalCost.toFixed(2)}`);
            await displayProjects();
        } catch (err) {
            console.error('Failed to update project:', err);
            alert('Failed to update project.');
        }
    });
}

// --- Add these lines near the top (after your imports) ---
let pendingBOQExportFn = null;

// --- PATCH handleBOQExport to set pending export if details missing ---
async function handleBOQExport(exportFn) {
    prepareBOQForExport();
    const errors = validateBOQ();
    if (errors.length > 0) {
        alert("BOQ Validation Error:\n" + errors.join('\n'));
        return;
    }
    // Check if project details are filled
    const details = boqData.projectDetails;
    if (!details || !details.companyName || !details.projectTitle || !details.clientName) {
        pendingBOQExportFn = exportFn; // Save for later
        // Show modal (will be shown by generateBOQPDF, but ensure here too)
        showProjectDetailsModal();
        alert('Please fill in project details before exporting BOQ.');
        return;
    }
    await exportFn();
}

// --- Unified save-and-continue handler ---
document.getElementById('save-and-continue-project-details').onclick = async function() {
    const details = {
        companyName: document.getElementById('company-name').value.trim(),
        companyAddress: document.getElementById('company-address').value.trim(),
        contactInfo: document.getElementById('contact-info').value.trim(),
        projectTitle: document.getElementById('project-title').value.trim(),
        clientName: document.getElementById('client-name').value.trim(),
        projectPhase: document.getElementById('project-phase').value.trim(),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    if (!details.companyName || !details.companyAddress || !details.projectTitle || !details.clientName) {
        alert('Please fill all required fields.');
        return;
    }

    setProjectDetailsAndUI(details);

    try {
        // ✅ Always create project using saveProject()
        if (!currentProjectId) {
            const response = await saveProject({
                projectTitle: details.projectTitle,
                total_cost: 0
            });
            currentProjectId = response.project_id;  // backend returns { project_id }
        }

        setProjectDetailsSavedFlag(currentProjectId);

        console.log('[ProjectDetailsModal] Saving project details for projectId:', currentProjectId);
        await saveProjectDetails(currentProjectId, details);

        // Fetch latest details from backend and update UI
        const latestDetails = await fetchProjectDetails(currentProjectId);
        if (latestDetails) {
            boqData.projectDetails = latestDetails;
            refreshProjectDetailsUI();
        }

        alert('Project details saved!');
        hideProjectDetailsModal();

        // Resume BOQ export if pending
        if (pendingBOQExportFn) {
            const fn = pendingBOQExportFn;
            pendingBOQExportFn = null;
            await fn();
        }

    } catch (err) {
        console.error("Failed to save project details:", err);
        alert('Failed to save project details to backend.');
    }
};


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
    if (errorSpan) errorSpan.style.display = 'none';

    if (value === '') {
        if (errorSpan) showError(input, errorSpan, 'This field is required');
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
        if (errorSpan) showError(input, errorSpan, 'Please enter a valid number');
        return false;
    }

    if (numericValue < 0) {
        if (errorSpan) showError(input, errorSpan, 'Value cannot be negative');
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
const region = getNormalizedRegion();
//const region = getEffectiveRegion(); // Example region
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



async function fetchMaterialRate(material, region = null) {
    const requestedRegion = (region || getNormalizedRegion()).toLowerCase();
    const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';

    console.log(`🌍 Fetching material rate for "${material}" in region: ${requestedRegion} (source: ${regionSource})`);

    const response = await fetch(`/api/prices/${encodeURIComponent(material)}?region=${encodeURIComponent(requestedRegion)}`, {
        credentials: 'include'
    });

    if (!response.ok) {
        console.error(`❌ Failed to fetch material rate for ${material}:`, response.statusText);
        return null;
    }

    try {
        const data = await response.json();
        if (data.fallback) {
            console.warn(`⚠️ Fallback for "${material}": requested "${requestedRegion}", used "${data.fallback}"`);
            if (!suppressFallbackUI) {
                showFallbackWarning(`${material} (material)`, `Requested ${requestedRegion}, used ${data.fallback}`);
            }
        }
        return data;
    } catch (error) {
        console.error("❌ JSON parse error in fetchMaterialRate:", error);
        return null;
    }
}


async function fetchLaborRate(trade, region = null) {
    const requestedRegion = (region || getNormalizedRegion()).toLowerCase();
    const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';

    console.log(`🔧 Fetching labor rate for "${trade}" in region: ${requestedRegion} (source: ${regionSource})`);

    const response = await fetch(`/api/labor/${encodeURIComponent(trade)}?region=${encodeURIComponent(requestedRegion)}`, {
        credentials: 'include'
    });

    if (!response.ok) {
        console.error(`❌ Failed to fetch labor rate for ${trade}:`, response.statusText);
        return null;
    }

    try {
        const data = await response.json();
        if (data.fallback) {
            console.warn(`⚠️ Fallback for "${trade}": requested "${requestedRegion}", used "${data.fallback}"`);
            if (!suppressFallbackUI) {
                showFallbackWarning(`${trade} (labor)`, `Requested ${requestedRegion}, used ${data.fallback}`);
            }
        }
        return data;
    } catch (error) {
        console.error("❌ JSON parse error in fetchLaborRate:", error);
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

// Modified project saving with locations
async function saveProject(projectData) {
    const projectLoc = document.getElementById('project-location')?.value || null;
    const supplierLoc = document.getElementById('supplier-location')?.value || null;
    const calculationData = gatherCalculationData();
    let totalCost = 0;
    document.querySelectorAll('.result-item').forEach(result => {
        const materialCost = parseFloat(result.getAttribute('data-material-cost')) || 0;
        const laborCost = parseFloat(result.getAttribute('data-labor-cost')) || 0;
        const plantCost = parseFloat(result.getAttribute('data-plant-cost')) || 0;
        totalCost += materialCost + laborCost + plantCost;
    });

    // Normalize project name keys (accept projectName, project_name, projectTitle)
    const projectName = projectData.projectName || projectData.project_name || projectData.projectTitle || projectData.project_name || 'Untitled Project';

    try {
        const payload = {
            ...projectData,
            project_name: projectName,
            project_location: projectLoc,
            supplier_location: supplierLoc,
            supplier_id: localStorage.getItem('preferredSupplierId') || null,
            calculation_data: JSON.stringify(calculationData),
            total_cost: typeof projectData.total_cost === 'number' ? projectData.total_cost : totalCost
        };

        // If a project_id exists in projectData or global currentProjectId, update instead of create
        const createUrl = '/api/projects';
        const updateId = projectData.project_id || projectData.id || currentProjectId || null;

        let response;
        if (updateId) {
            response = await fetch(`/api/projects/${encodeURIComponent(updateId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) throw new Error('Project save failed');
        const json = await response.json();

        // If backend returned a new id, set currentProjectId
        const returnedId = json.project_id || json.id || json.projectId || null;
        if (returnedId) currentProjectId = returnedId;

        return json;
    } catch (error) {
        console.error('Error saving project:', error);
        throw error;
    }
}


// --- Unified project list display ---
async function displayProjects() {
    try {
        const response = await fetch('/api/projects', { credentials: 'include' });
        if (!response.ok) {
            console.error("Failed to fetch projects from backend:", response.statusText);
            return;
        }
        const data = await response.json();
        const projects = Array.isArray(data) ? data : data.projects;
        console.log("Displaying projects from backend:", projects);

        const projectList = document.getElementById('project-list');
        projectList.innerHTML = ''; // Clear existing

        if (Array.isArray(projects)) {
            projects.forEach(project => {
                const projectItem = document.createElement('div');
                projectItem.classList.add('project-item');

                // Mark incomplete if missing critical details
                const incomplete = project.project_details
                    ? !(project.project_details.companyName && project.project_details.projectTitle && project.project_details.clientName)
                    : true;
                if (incomplete) projectItem.classList.add('incomplete');

                projectItem.innerHTML = `
                    <h4>${project.project_name || 'Untitled Project'}</h4>
                    <p>Total Cost: GHS ${project.total_cost}</p>
                    <p>Date: ${project.last_modified || ''}</p>
                `;
                projectList.appendChild(projectItem);
            });
        } else {
            console.error("Projects data is not an array:", projects);
        }
    } catch (error) {
        console.error("Error displaying projects:", error);
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

// Add this helper at the top of calculateCompositeRate:
function normalizeRates(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (v && typeof v === 'object' && 'parsedValue' in v) {
            out[k] = v.parsedValue;
        } else if (v && typeof v === 'object') {
            // Handle nested tree cutting rates
            out[k] = normalizeRates(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}


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

    // --- Preliminaries: treat as lump-sum, no markups ---
    if (formulaKey === 'preliminaries_item') {
        const valueKey = Object.keys(inputs || {}).find(k => /_value$|^value$/i.test(k));
        const amount = Number(inputs?.[valueKey] ?? inputs?.value) || 0;
        if (amount <= 0) {
            console.warn(`Skipping ${componentType} - prelim value is zero/invalid.`);
            return null;
        }
        return {
            materialCost: Number(amount.toFixed(2)),
            laborCost: 0,
            plantCost: 0,
            overheads: 0,
            profit: 0,
            totalCost: Number(amount.toFixed(2))
        };
    }

    const region = getNormalizedRegion().toLowerCase();

    // Fetch bundle for requested region (may contain partial data)
    let pricingResponse = await fetch(`/api/pricing-bundle?region=${encodeURIComponent(region)}`, { credentials: 'include' });
    let bundle = pricingResponse.ok ? await pricingResponse.json() : {};
    let usedFallback = false;

    // If bundle totally empty, keep existing anchor/national bundle fallback behavior
    if (
        (!bundle.materials || Object.values(bundle.materials).every(v => !v)) &&
        (!bundle.labor || Object.values(bundle.labor).every(v => !v))
    ) {
        let anchorCity = typeof get_anchor_city === "function" ? get_anchor_city(region) : null;
        if (anchorCity && anchorCity.toLowerCase() !== region) {
            pricingResponse = await fetch(`/api/pricing-bundle?region=${encodeURIComponent(anchorCity.toLowerCase())}`, { credentials: 'include' });
            bundle = pricingResponse.ok ? await pricingResponse.json() : {};
            usedFallback = true;
        }
        if (
            (!bundle.materials || Object.values(bundle.materials).every(v => !v)) &&
            (!bundle.labor || Object.values(bundle.labor).every(v => !v))
        ) {
            pricingResponse = await fetch(`/api/pricing-bundle?region=national`, { credentials: 'include' });
            bundle = pricingResponse.ok ? await pricingResponse.json() : {};
            usedFallback = true;
        }
    }

    if (usedFallback) {
        showFallbackWarning(componentType, bundle.region || 'fallback');
    }

    // Raw bundle objects (may contain nested parsedValue shapes)
    const materialsRaw = bundle.materials || {};
    const laborRaw = bundle.labor || {};

    // Normalize parsedValue shapes -> numeric or nested numeric objects
    const materials = normalizeRates(materialsRaw);
    const labor = normalizeRates(laborRaw);

    // --- Per-task fallback helpers (use existing fetchMaterialRate / fetchLaborRate) ---
    async function extractMaterialValueFromFetch(data) {
        if (!data) return 0;
        if (typeof data.unit_cost === 'number') return data.unit_cost;
        if (data.unit_cost && typeof data.unit_cost === 'object' && 'parsedValue' in data.unit_cost) return data.unit_cost.parsedValue;
        // fallback if direct number present
        if (typeof data === 'number') return data;
        return data.unit_cost ?? 0;
    }

    async function extractLaborValueFromFetch(data) {
        if (!data) return 0;
        if (typeof data.rate === 'number') return data.rate;
        if (data.rate && typeof data.rate === 'object' && 'parsedValue' in data.rate) return data.rate.parsedValue;
        if (typeof data === 'number') return data;
        return data.rate ?? 0;
    }

    async function getMaterialRateWithFallback(material) {
        // If already present and truthy (number), return it
        const cur = materials[material];
        if (typeof cur === 'number' && cur > 0) return cur;

        // Try anchor city
        const anchorCity = typeof get_anchor_city === "function" ? get_anchor_city(region) : null;
        if (anchorCity && anchorCity.toLowerCase() !== region) {
            const dataAnchor = await fetchMaterialRate(material, anchorCity.toLowerCase());
            const val = await extractMaterialValueFromFetch(dataAnchor);
            if (val && val > 0) {
                if (!suppressFallbackUI) showFallbackWarning(`${material} (material)`, `anchor: ${anchorCity}`);
                return val;
            }
        }

        // Try national
        const dataNational = await fetchMaterialRate(material, 'national');
        const valNat = await extractMaterialValueFromFetch(dataNational);
        if (valNat && valNat > 0) {
            if (!suppressFallbackUI) showFallbackWarning(`${material} (material)`, 'national');
            return valNat;
        }

        return 0;
    }

    async function getLaborRateWithFallback(task) {
        // If already present and truthy (number), return it
        const cur = labor[task];
        if (typeof cur === 'number' && cur > 0) return cur;

        // Try anchor city
        const anchorCity = typeof get_anchor_city === "function" ? get_anchor_city(region) : null;
        if (anchorCity && anchorCity.toLowerCase() !== region) {
            const dataAnchor = await fetchLaborRate(task, anchorCity.toLowerCase());
            const val = await extractLaborValueFromFetch(dataAnchor);
            if (val && val > 0) {
                if (!suppressFallbackUI) showFallbackWarning(`${task} (labor)`, `anchor: ${anchorCity}`);
                return val;
            }
        }

        // Try national
        const dataNational = await fetchLaborRate(task, 'national');
        const valNat = await extractLaborValueFromFetch(dataNational);
        if (valNat && valNat > 0) {
            if (!suppressFallbackUI) showFallbackWarning(`${task} (labor)`, 'national');
            return valNat;
        }

        return 0;
    }

    // --- Ensure every required material/labor has a numeric value (use per-task fallback) ---
    const requiredMaterials = formulaConfig.materials || [];
    const requiredLaborTasks = formulaConfig.laborTasks || [];

    for (const m of requiredMaterials) {
        if (!materials[m] || materials[m] === 0) {
            try {
                const v = await getMaterialRateWithFallback(m);
                materials[m] = v || 0;
            } catch (err) {
                console.error(`Error fetching fallback material rate for ${m}:`, err);
                materials[m] = materials[m] || 0;
            }
        }
    }

    for (const t of requiredLaborTasks) {
        if (!labor[t] || labor[t] === 0) {
            try {
                const r = await getLaborRateWithFallback(t);
                labor[t] = r || 0;
            } catch (err) {
                console.error(`Error fetching fallback labor rate for ${t}:`, err);
                labor[t] = labor[t] || 0;
            }
        }
    }

    // Recompute missing lists after per-task fallback
    const missingMaterials = requiredMaterials.filter(m => !materials[m] || materials[m] === 0);
    const missingLabor = requiredLaborTasks.filter(l => !labor[l] || labor[l] === 0);

    // --- Ensure grouped tree cutting rates exist (requested → anchor → national) ---
    if (componentType.toLowerCase() === 'tree cutting') {
        // Fetch using API task names, store under normalized band keys without prefix
        const bandMap = [
            { task: 'tree cutting 600-1500', key: '600-1500' },
            { task: 'tree cutting 1500-3000', key: '1500-3000' },
            { task: 'tree cutting over 3000', key: 'over 3000' }
        ];
        if (!labor['tree cutting'] || typeof labor['tree cutting'] !== 'object') {
            labor['tree cutting'] = {};
        }
        for (const { task, key } of bandMap) {
            if (!labor['tree cutting'][key] || labor['tree cutting'][key] === 0) {
                try {
                    const r = await getLaborRateWithFallback(task);
                    labor['tree cutting'][key] = r || 0;
                } catch (e) {
                    console.warn(`[tree cutting] failed to fetch band "${task}" with fallbacks`, e);
                    labor['tree cutting'][key] = labor['tree cutting'][key] || 0;
                }
            }
        }
    }


    // --- Material cost ---
    let materialCost = 0;
    if (typeof formulaConfig.calculateMaterialCost === 'function') {
        materialCost = formulaConfig.calculateMaterialCost(quantity, materials, inputs);
    } else {
        materialCost = formulaConfig.calculateMaterialCost?.(quantity, materials) || 0;
    }

    // --- Labor cost ---
    let laborCost = 0;
    if (typeof formulaConfig.calculateLaborCost === 'function') {
        if (componentType.toLowerCase() === 'site clearance') {
            console.log('Calling calculateLaborCost for site clearance with:', { laborRates: labor, inputs });
        }
        const laborResult = formulaConfig.calculateLaborCost(inputs, labor);
        if (typeof laborResult === 'object' && laborResult !== null) {
            laborCost = laborResult.laborCost || 0;
        } else if (typeof laborResult === 'number') {
            laborCost = laborResult;
        }
    } else {
        const laborTask = formulaConfig.laborTasks?.[0];
        if (laborTask) {
            const dailyRate = labor[laborTask] || 0;
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
    }

    // Special handling for grouped tree cutting rates
    if (componentType.toLowerCase() === "tree cutting" && labor["tree cutting"]) {
        const normalizeGirth = (g) => {
            const s = String(g || '').toLowerCase();
            if (s.includes('>3000') || s.includes('over 3000')) return 'over 3000';
            if (s.includes('1500-3000')) return '1500-3000';
            if (s.includes('600-1500')) return '600-1500';
            return s;
        };

        const groupedRates = labor["tree cutting"];
        const bandKey = normalizeGirth(inputs.tree_girth);
        // Prefer normalized keys; tolerate prefixed keys if present
        const rate = groupedRates[bandKey] ?? groupedRates[`tree cutting ${bandKey}`] ?? 0;
        const qty = Number(inputs.num_trees) || quantity;
        laborCost = rate * qty;
    }

    // --- Plant cost ---
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

                availablePlants.forEach(p => {
                    if (p.haulageCost && p.haulageCost > 0) {
                        showFallbackWarning(
                            `${p.equipment} (plant)`,
                            `${p.region} + haulage from ${p.anchorCity} (${p.distanceKm} km)`
                        );
                    }
                });
            } else {
                console.warn(`⚠️ No available plants found for ${componentType}`);
            }
        } catch (plantError) {
            console.error(`Plant data error for ${componentType}:`, plantError);
        }
    } else {
        console.log(`No equipment required for ${componentType}`);
    }

    // --- Financials ---
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

    // --- Enhanced error reporting ---
    if (!result.totalCost || result.totalCost === 0) {
        let msg = `Skipping ${componentType} - invalid composite rate.`;
        if (missingMaterials.length > 0) msg += ` Missing materials: ${missingMaterials.join(', ')}.`;
        if (missingLabor.length > 0) msg += ` Missing labor: ${missingLabor.join(', ')}.`;
        console.warn(msg, result);
        showFallbackWarning(componentType, msg);
        return null;
    }

    console.log('Composite rate result:', result);
    return result;
}


// Add better error logging to identify which components are failing
async function generateSMM7BOQ() {
    resetBOQ();
    initBillsFromTemplate(billTemplate);

    try {
        const components = await fetchCalculatedComponents();
        if (!components?.length) {
            alert("No components found to generate BOQ");
            return;
        }

        let validComponents = 0;

        for (const component of components) {
            try {
                console.log(`Processing ${component.type} for BOQ...`);
                const compositeRate = await calculateCompositeRate(component.type, component.quantity, component.inputs);

                if (!compositeRate?.totalCost || compositeRate.totalCost === 0) {
                    // The warning and UI message are now handled in calculateCompositeRate
                    continue;
                }

                addToBOQ({
                    component: component.type,
                    quantity: component.quantity,
                    unitCost: compositeRate.totalCost / component.quantity,
                    inputs: component.inputs
                });
                validComponents++;
                console.log(`Added ${component.type} to BOQ successfully`);
            } catch (componentError) {
                console.error(`Error processing ${component.type}:`, componentError, component);
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
        console.log("BOQ generated successfully");

    } catch (globalError) {
        console.error("BOQ generation failed:", globalError);
        alert("Failed to generate BOQ. See console for details.");
    }
}

// Only Preliminaries are compulsory. All Preliminaries items must be present (even if amount 0).
// Other bills/items are optional and not validated for presence or content.
function validateBOQStructure() {
    // Always ensure Preliminaries are present before validation
    prepareBOQForExport();
    console.log('[validateBOQStructure] Validating BOQ structure...');
    const errors = [];

    // Local normalizer
    const normKey = s => String(s || '').trim().toLowerCase();

    // Find the Preliminaries bill (by billNo or title)
    const prelimBill = (boqData.bills || []).find(
        bill =>
            (bill.billNo && String(bill.billNo).toLowerCase().startsWith('1')) ||
            (bill.title && bill.title.toLowerCase().includes('prelim'))
    );
    console.log('[validateBOQStructure] Preliminaries bill found:', prelimBill);

    if (!prelimBill) {
        errors.push("Preliminaries bill is missing.");
    } else {
        // Expected prelims (normalize to lower-case for matching)
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
        const expectedSet = new Set(expectedPrelimCategories.map(normKey));

        const presentLower = (prelimBill.items || []).map(it => normKey(it.category));
        console.log('[validateBOQStructure] Present prelim categories (normalized):', presentLower);

        // Missing any required prelims?
        const missing = Array.from(expectedSet).filter(req => !presentLower.includes(req));
        missing.forEach(m => errors.push(`Preliminaries item missing: ${m}`));

        // Validate preliminaries item fields
        (prelimBill.items || []).forEach(item => {
            if (!item.category) {
                errors.push(`Preliminaries item missing category`);
            }
            if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
                errors.push(`Invalid quantity for preliminaries item: ${item.category}`);
            }
            if (typeof item.rate !== 'number' || isNaN(item.rate)) {
                errors.push(`Invalid rate for preliminaries item: ${item.category}`);
            }
            if (typeof item.amount !== 'number' || isNaN(item.amount)) {
                errors.push(`Invalid amount for preliminaries item: ${item.category}`);
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
    const region = getNormalizedRegion();
    const regionSource = localStorage.getItem('preferred_supplier') ? 'preferred supplier' : 'dropdown';

    const response = await fetch(`/api/plants?region=${encodeURIComponent(region)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

    if (!response.ok) {
        console.error('❌ Failed to fetch plant data:', response.statusText);
        return [];
    }

    try {
        const data = await response.json();

        data.forEach(p => {
            console.log(
                `✅ Plant: ${p.equipment}, dailyRate: ${p.dailyRate} ` +
                `(requested: ${region}, used: ${p.region || 'unknown'})`
            );
            if (p.haulageCost && p.haulageCost > 0) {
                console.warn(
                    `🚚 Haulage cost applied for ${p.equipment}: ${p.haulageCost} GHS ` +
                    `(anchor city: ${p.anchorCity}, distance: ${p.distanceKm} km, ` +
                    `rate: ${p.haulageRatePerKm} GHS/km)`
                );
            }
        });

        return data;
    } catch (error) {
        console.error("❌ Error parsing JSON in fetchPlantData:", error);
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

// --- Modal logic for BOQ export (bill-centric, with Preliminaries validation) ---
console.log('[BOQ Modal] Initializing modal export logic');

const boqBtn = document.getElementById('generate-boq');
const boqModal = document.getElementById('boq-format-modal');
const closeModalBtn = document.getElementById('close-boq-modal');
const pdfBtn = document.getElementById('download-pdf');
const xlsxBtn = document.getElementById('download-xlsx');
const csvBtn = document.getElementById('download-csv');

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

    function toTitleCase(s) {
        return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
    // A, B, ..., Z, AA, AB, ...
    function getItemCode(n) {
        let s = '';
        n = Number(n) || 0;
        do {
            s = String.fromCharCode(65 + (n % 26)) + s;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return s;
    }

    if (format === 'csv') {
        // Simple CSV fallback (flat). XLSX below draws the table like the PDF.
        const rows = [];
        (boqData.bills || []).forEach(bill => {
            if (!bill || !Array.isArray(bill.items) || bill.items.length === 0) return;
            rows.push([boqData.projectTitle || boqData.project || boqData.title || 'Project']);
            rows.push([`Bill No.: ${bill.billNo || ''}`, '', 'Heading:', bill.title || '']);
            rows.push(['Item', 'Description', 'Unit', 'Qty', 'Rate (GHS)', 'Amount (GHS)', 'Type']);

            const items = bill.items.slice().filter(Boolean).sort(
                (a, b) => String(a.sectionCode || '').localeCompare(String(b.sectionCode || ''))
            );

            // Group by section
            const sections = [];
            let current = null;
            for (const it of items) {
                const secCode = it.sectionCode || 'Z';
                if (!current || current.code !== secCode) {
                    current = { code: secCode, title: it.sectionTitle || 'Unclassified', items: [] };
                    sections.push(current);
                }
                current.items.push(it);
            }

            let billTotal = 0;
            for (const sec of sections) {
                rows.push(['', `SECTION ${sec.code}. ${sec.title}`, '', '', '', '', '']);
                let idx = 0;
                let sectionSubtotal = 0;
                for (const it of sec.items) {
                    const qty = (typeof it.quantity === 'number') ? it.quantity : '';
                    const rate = (typeof it.rate === 'number') ? it.rate : '';
                    const amt = (typeof it.amount === 'number') ? it.amount : (qty && rate ? qty * rate : '');
                    sectionSubtotal += Number(amt || 0);
                    billTotal += Number(amt || 0);
                    rows.push([
                        getItemCode(idx++),
                        `${toTitleCase(it.category || '')}\n\n${it.description || ''}`,
                        it.unit || '',
                        qty,
                        rate,
                        amt,
                        it.type || ''
                    ]);
                }
                rows.push(['', `Subtotal for ${sec.code}`, '', '', '', sectionSubtotal, '']);
            }
            rows.push(['', `Bill ${bill.billNo} Total`, '', '', '', (typeof bill.total === 'number') ? bill.total : billTotal, '']);
            rows.push([]);
        });

        const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `BOQ-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    if (format !== 'xlsx') {
        console.warn(`[BOQ Export] Unknown format requested: ${format}`);
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('Excel export requires SheetJS (XLSX) library. Please include it in your HTML.');
        console.error('[BOQ Export] XLSX library not found');
        return;
    }

    // Build one sheet "BOQ" with a bill-by-bill layout, like the PDF
    const ws = {};
    ws['!cols'] = [
        { wch: 8 },   // A Item
        { wch: 66 },  // B Description
        { wch: 10 },  // C Unit
        { wch: 10 },  // D Qty
        { wch: 14 },  // E Rate (GHS)
        { wch: 16 },  // F Amount (GHS)
        { wch: 12 }   // G Type
    ];
    ws['!merges'] = [];
    ws['!rows'] = [];

    const A1 = XLSX.utils.encode_cell;
    const decode = XLSX.utils.decode_cell;
    const encode_range = XLSX.utils.encode_range;

    // Column indices
    const COL = {
        ITEM: 0,        // A
        DESC: 1,        // B
        UNIT: 2,        // C
        QTY: 3,         // D
        RATE: 4,        // E
        AMOUNT: 5,      // F
        TYPE: 6         // G
    };

    // Helpers to write cells with number formats and minimal style
    function setCell(r, c, v, opts = {}) {
        const addr = A1({ r, c });
        const cell = {};
        if (typeof v === 'number') {
            cell.t = 'n';
            cell.v = v;
        } else if (v && typeof v === 'object' && v.f) {
            // formula object { f: 'E5*D5', v?: number, z?: string }
            cell.t = (typeof v.v === 'number') ? 'n' : 'n';
            cell.f = v.f;
            if (typeof v.v === 'number') cell.v = v.v;
        } else {
            cell.t = 's';
            cell.v = String(v ?? '');
        }

        if (opts.z) cell.z = opts.z;        // number format
        if (opts.b) cell.s = Object.assign(cell.s || {}, { font: { bold: true } }); // bold
        if (opts.halign || opts.valign) {
            cell.s = cell.s || {};
            cell.s.alignment = cell.s.alignment || {};
            if (opts.halign) cell.s.alignment.horizontal = opts.halign;
            if (opts.valign) cell.s.alignment.vertical = opts.valign;
        }
        ws[addr] = cell;
        // track row height if specified
        if (opts.height) ws['!rows'][r] = Object.assign(ws['!rows'][r] || {}, { hpt: opts.height });
        return addr;
    }

    function merge(r1, c1, r2, c2) {
        ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    }

    // Number formats
    const fmtQty = '#,##0.00';
    const fmtMoney = '"GHS" #,##0.00';

    let row = 0;
    const projectTitle = boqData.projectTitle || boqData.project || boqData.title || 'Project';

    const billTotalCells = [];

    (boqData.bills || []).forEach((bill, billIdx) => {
        if (!bill || !Array.isArray(bill.items) || bill.items.length === 0) return;

        if (billIdx > 0) row += 2; // spacing between bills

        // Project Title heading across A:G
        setCell(row, COL.ITEM, projectTitle, { b: true, halign: 'center' });
        merge(row, 0, row, 6);
        ws['!rows'][row] = { hpt: 20 };
        row += 1;

        // Bill header: "Bill No." and "Heading"
        setCell(row, COL.ITEM, 'Bill No.:', { b: true });
        setCell(row, COL.ITEM + 1, String(bill.billNo || ''), { b: true });
        merge(row, COL.ITEM + 1, row, COL.ITEM + 2); // B:C
        setCell(row, COL.UNIT + 1, 'Heading:', { b: true }); // D label position
        setCell(row, COL.UNIT + 2, String(bill.title || ''), { b: true }); // E value
        merge(row, COL.UNIT + 2, row, COL.TYPE); // E:G
        row += 1;

        // Column headers
        setCell(row, COL.ITEM,   'Item',        { b: true });
        setCell(row, COL.DESC,   'Description', { b: true });
        setCell(row, COL.UNIT,   'Unit',        { b: true });
        setCell(row, COL.QTY,    'Qty',         { b: true });
        setCell(row, COL.RATE,   'Rate (GHS)',  { b: true });
        setCell(row, COL.AMOUNT, 'Amount (GHS)',{ b: true });
        setCell(row, COL.TYPE,   'Type',        { b: true });
        const headerRow = row;
        row += 1;

        // Sort and group by section like PDF
        const items = bill.items.slice().filter(Boolean).sort(
            (a, b) => String(a.sectionCode || '').localeCompare(String(b.sectionCode || ''))
        );

        const sections = [];
        let current = null;
        for (const it of items) {
            const code = it.sectionCode || 'Z';
            if (!current || current.code !== code) {
                current = {
                    code,
                    title: it.sectionTitle || 'Unclassified',
                    items: []
                };
                sections.push(current);
            }
            current.items.push(it);
        }

        const sectionSubtotalCells = [];

        for (const sec of sections) {
            // Section header row (in Description)
            setCell(row, COL.DESC, `SECTION ${sec.code}. ${sec.title}`, { b: true });
            row += 1;

            let itemIdx = 0;
            const sectionItemAmountCells = [];
            for (const it of sec.items) {
                const thisRow = row;
                // Item code
                setCell(thisRow, COL.ITEM, getItemCode(itemIdx++));
                // Description: Category title case + description
                const cat = toTitleCase(it.category || '');
                let desc = cat ? `${cat}\n\n${it.description || ''}` : (it.description || '');
                setCell(thisRow, COL.DESC, desc);

                // Unit
                setCell(thisRow, COL.UNIT, it.unit || '');

                // Qty
                if (typeof it.quantity === 'number') {
                    setCell(thisRow, COL.QTY, it.quantity, { z: fmtQty });
                } else {
                    setCell(thisRow, COL.QTY, '');
                }

                // Rate
                if (typeof it.rate === 'number') {
                    setCell(thisRow, COL.RATE, it.rate, { z: fmtMoney });
                } else {
                    setCell(thisRow, COL.RATE, '', { z: fmtMoney });
                }

                // Amount: prefer provided amount; else formula = Qty * Rate
                let amtAddr;
                if (typeof it.amount === 'number') {
                    amtAddr = setCell(thisRow, COL.AMOUNT, it.amount, { z: fmtMoney });
                } else {
                    const qtyAddr = A1({ r: thisRow, c: COL.QTY });
                    const rateAddr = A1({ r: thisRow, c: COL.RATE });
                    amtAddr = A1({ r: thisRow, c: COL.AMOUNT });
                    ws[amtAddr] = { t: 'n', f: `${qtyAddr}*${rateAddr}`, z: fmtMoney };
                }

                // Type
                setCell(thisRow, COL.TYPE, it.type || '');

                sectionItemAmountCells.push(amtAddr);
                row += 1;
            }

            // Section subtotal row
            const subRow = row;
            setCell(subRow, COL.DESC, `Subtotal for ${sec.code}`, { b: true });
            if (sectionItemAmountCells.length > 0) {
                const start = decode(sectionItemAmountCells[0]);
                const end = decode(sectionItemAmountCells[sectionItemAmountCells.length - 1]);
                const rng = encode_range({ s: { r: start.r, c: COL.AMOUNT }, e: { r: end.r, c: COL.AMOUNT } });
                const subAddr = A1({ r: subRow, c: COL.AMOUNT });
                ws[subAddr] = { t: 'n', f: `SUM(${rng})`, z: fmtMoney };
                sectionSubtotalCells.push(subAddr);
            }
            row += 1;
        }

        // Bill total row
        const billTotalRow = row;
        setCell(billTotalRow, COL.DESC, `Bill ${bill.billNo} Total`, { b: true });
        if (sectionSubtotalCells.length > 0) {
            const first = sectionSubtotalCells[0];
            const last = sectionSubtotalCells[sectionSubtotalCells.length - 1];
            const fStart = decode(first), fEnd = decode(last);
            const rng = encode_range({ s: { r: fStart.r, c: COL.AMOUNT }, e: { r: fEnd.r, c: COL.AMOUNT } });
            const billTotalAddr = A1({ r: billTotalRow, c: COL.AMOUNT });
            if (typeof bill.total === 'number') {
                ws[billTotalAddr] = { t: 'n', v: bill.total, z: fmtMoney };
            } else {
                ws[billTotalAddr] = { t: 'n', f: `SUM(${rng})`, z: fmtMoney };
            }
            billTotalCells.push(billTotalAddr);
        }
        row += 1;
    });

    // Grand total (if multiple bills)
    if (billTotalCells.length > 1) {
        row += 1;
        setCell(row, COL.DESC, 'GRAND TOTAL', { b: true });
        const parts = billTotalCells.map(addr => addr).join(',');
        const grandAddr = A1({ r: row, c: COL.AMOUNT });
        ws[grandAddr] = { t: 'n', f: `SUM(${parts})`, z: fmtMoney };
        row += 1;
    }

    // Freeze panes at the first bill’s column header row if present
    // (Excel only supports one freeze; this freezes top 3 rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 3, topLeftCell: 'A4', activePane: 'bottomLeft', state: 'frozen' };

    // Define the sheet range
    ws['!ref'] = `A1:${A1({ r: Math.max(row, 1), c: COL.TYPE })}`;

    // Optional: light borders and header fill (requires styles-enabled SheetJS build)
    try {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 0; R <= range.e.r; ++R) {
            for (let C = 0; C <= range.e.c; ++C) {
                const addr = A1({ r: R, c: C });
                if (!ws[addr]) continue;
                ws[addr].s = ws[addr].s || {};
                ws[addr].s.border = {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                };
                // Make obvious header rows bold (already set) and with a light fill
                if (R === 0 || (ws[A1({ r: R, c: COL.ITEM })]?.v === 'Item' && ws[A1({ r: R, c: COL.DESC })]?.v === 'Description')) {
                    ws[addr].s.fill = { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } };
                }
            }
        }
    } catch (e) {
        // ignore styling if not supported
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
    XLSX.writeFile(wb, `BOQ-${new Date().toISOString().slice(0,10)}.xlsx`);
    console.log('[BOQ Export] Excel file generated and download triggered');
}

