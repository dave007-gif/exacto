import { SMM7_CATEGORIES } from './smm7_categories.js';
import { COMPONENT_TO_FORMULA_MAP } from './component_to_formula_map.js';
import { SMM7_2023 } from './formulas.js'; // <-- ADD THIS LINE


// Bill-centric BOQ data model
export let boqData = {
    projectDetails: {}, // Populated from backend or user input
    bills: [],          // Array of bill objects
    summary: {
        subtotal: 0,
        contingency: 0,
        grandTotal: 0
    },
    haulage: {
        multiplier: 1.0,
        band: ''
    }
};

// Set haulage multiplier and band
export function setHaulage(multiplier, band) {
    boqData.haulage.multiplier = multiplier;
    boqData.haulage.band = band;
}

// Add a bill (if not already present)
export function addBill(billNo, title) {
    if (!boqData.bills.find(b => b.billNo === billNo)) {
        boqData.bills.push({ billNo, title, items: [], total: 0 });
    }
}

// Initialize bills from a template (array of {billNo, title})
export function initBillsFromTemplate(template) {
    boqData.bills = template.map(b => ({ ...b, items: [], total: 0 }));
}

// Set project details (from backend or user input)
export function setProjectDetails(details) {
    boqData.projectDetails = details;
}

// Calculate summary totals
export function calculateSummary() {
    boqData.summary.subtotal = boqData.bills.reduce((sum, b) => sum + b.total, 0);
    boqData.summary.contingency = boqData.summary.subtotal * 0.15; // or custom logic
    boqData.summary.grandTotal = boqData.summary.subtotal + boqData.summary.contingency;
}

// Reset BOQ data
export function resetBOQ() {
    boqData.bills = [];
    boqData.summary = { subtotal: 0, contingency: 0, grandTotal: 0 };
    boqData.projectDetails = {};
    boqData.haulage = { multiplier: 1.0, band: '' };
}

// --- Normalizer ---
function normKey(s) {
    return String(s || '').trim().toLowerCase();
}
// --- Fast lookup: component -> section meta (built at module load) ---
export const COMPONENT_TO_SECTION = {};
Object.keys(SMM7_CATEGORIES).forEach(catKey => {
    const cat = SMM7_CATEGORIES[catKey];
    (cat.sections || []).forEach(sec => {
        (sec.components || []).forEach(c => {
            COMPONENT_TO_SECTION[normKey(c)] = {
                sectionCode: sec.code,
                sectionTitle: sec.title,
                mainCategory: cat.mainCategory,
                defaultBillNo: sec.defaultBillNo
            };
        });
    });
});

// --- Helper: Classify component ---
export function classifyComponent(component) {
    const ck = normKey(component);
    const workSection = Object.keys(SMM7_CATEGORIES).find((section) => {
        const comps = (SMM7_CATEGORIES[section]?.components || []).map(normKey);
        return comps.includes(ck);
    });
    console.log(`[classifyComponent] "${component}" (ck="${ck}") mapped to section "${workSection}"`);
    return {
        workSection: workSection || "Z. Unclassified Works",
        mainCategory: workSection
            ? SMM7_CATEGORIES[workSection].mainCategory
            : "Other",
    };
}

// --- Component to BillNo mapping (lower-case). Others use section defaultBillNo ---
export const COMPONENT_TO_BILLNO = {
    // Preliminaries (explicitly force Bill 1)
    "mobilization and demobilization": "1",
    "site office and facilities": "1",
    "temporary fencing": "1",
    "water for works": "1",
    "electricity for works": "1",
    "insurance": "1",
    "health and safety": "1",
    "setting out": "1",
    "project signboard": "1",
    "other preliminaries": "1",

    // Optional explicit overrides (keep only if you need to override section defaults)
    // "tree cutting": "2A",
    // "trench excavation": "2A",
    // "foundations": "2A",
    // "concrete in trench": "2A",
    // "blockwork in foundation": "2A",
};

// --- Add all Preliminaries to BOQ if missing ---
// Stores category as lower-case key; render title in PDF via toTitleCase(item.category)
export function ensurePreliminariesInBOQ() {
    const prelimComponents = Object.keys(COMPONENT_TO_BILLNO).filter(
        c => COMPONENT_TO_BILLNO[c] === "1"
    );
    const prelimBill = boqData.bills.find(b => b.billNo === "1");
    if (!prelimBill) return;

    prelimComponents.forEach(component => {
        const ck = normKey(component); // enforce lower-case key
        const alreadyAdded = prelimBill.items.some(item => normKey(item.category) === ck);
        if (!alreadyAdded) {
            const sec = COMPONENT_TO_SECTION[ck];
            prelimBill.items.push({
                itemCode: `ITEM-${Date.now().toString(36)}`,
                category: ck,                // lower-case key for consistency
                description: ck,             // keep data normalized; format on render
                quantity: 1,
                unit: "item",
                rate: 0,
                amount: 0,
                haulageMultiplier: 1,
                type: "item",
                // tag section for grouping
                sectionCode: sec?.sectionCode || "Z",
                sectionTitle: sec?.sectionTitle || "Unclassified",
                mainCategory: sec?.mainCategory || "Other",
            });
        }
    });
}

// Helper: derive bill number with storey routing for Superstructure
function deriveBillNo(component, inputs) {
    const ck = normKey(component);

    // 1) explicit mapping
    if (COMPONENT_TO_BILLNO[ck]) return COMPONENT_TO_BILLNO[ck];

    // 2) section default with category-based routing
    const sec = COMPONENT_TO_SECTION[ck];
    if (sec) {
        if (sec.mainCategory === "Superstructure") {
            const s = String(inputs?.storey ?? "").toLowerCase();
            if (s.includes("ground") || s === "0") return "2B";
            if (s.includes("first") || s === "1") return "2C";
            if (s.includes("second") || s === "2") return "2D";
            return "2B"; // default for superstructure
        }
        if (sec.mainCategory === "MEP") return "3";
        if (sec.mainCategory === "External") return "4";
        return sec.defaultBillNo || "PS";
    }

    // 3) last resort: classify by category
    const { mainCategory } = classifyComponent(ck);
    if (mainCategory === "Preliminaries") return "1";
    if (mainCategory === "Substructure") return "2A";
    if (mainCategory === "Superstructure") return "2B";
    if (mainCategory === "MEP") return "3";
    if (mainCategory === "External") return "4";
    return "PS";
}

// --- Modified addToBOQ ---
export function addToBOQ({ 
    component, 
    quantity, 
    unitCost, 
    inputs = {}, 
    type = "normal", 
    billNo = null, 
    billTitle = null, 
    description = null, 
    unit = null 
}) {
    const ck = normKey(component);

    // 1) Determine bill
    billNo = billNo || deriveBillNo(ck, inputs);
    const bill = boqData.bills.find(b => b.billNo === billNo);
    if (!bill) {
        console.error(`[addToBOQ] Bill ${billNo} not found. Make sure you called initBillsFromTemplate first.`);
        return;
    }

    // 2) Section metadata
    const sec = COMPONENT_TO_SECTION[ck];
    const sectionCode = sec?.sectionCode || "Z";
    const sectionTitle = sec?.sectionTitle || "Unclassified";

    // 3) Description/unit from formula
    const formulaKey = COMPONENT_TO_FORMULA_MAP[ck] || COMPONENT_TO_FORMULA_MAP[component];
    const formulaObj = SMM7_2023[formulaKey];
    if (!description) {
        description = (formulaObj?.description ? formulaObj.description(inputs) : (formulaObj?.reference || component));
    }
    unit = unit || (formulaObj?.unit || "m³");

    // 4) Rate/amount
    const multiplier = boqData.haulage?.multiplier || 1.0;
    const rate = Number((unitCost * multiplier).toFixed(2));
    const amount = Number((quantity * unitCost * multiplier).toFixed(2));

    // 5) Add item
    const item = {
        itemCode: `ITEM-${Date.now().toString(36)}`,
        category: component, // display label
        sectionCode, sectionTitle, mainCategory: sec?.mainCategory || "Other",
        description,
        quantity: Number(quantity?.toFixed?.(2) ?? 1),
        unit,
        rate,
        amount,
        haulageMultiplier: multiplier,
        type
    };
    bill.items.push(item);
    bill.total += item.amount;
    console.log(`[addToBOQ] Added "${component}" (ck="${ck}") to bill "${billNo}" (${bill.title}). Item:`, item);
}

// --- BOQ Validation: Only Preliminaries compulsory ---
export function validateBOQ() {
    const prelimBill = boqData.bills.find(b => b.billNo === "1");
    if (!prelimBill || prelimBill.items.length === 0) {
        return ["Preliminaries / General Conditions bill must have at least one item."];
    }
    // No validation for other bills
    return [];
}

// --- When generating BOQ, always ensure Preliminaries are present ---
export function prepareBOQForExport() {
    ensurePreliminariesInBOQ();
    calculateSummary();
}