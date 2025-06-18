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

// --- Helper: Classify component ---
export function classifyComponent(component) {
    const workSection = Object.keys(SMM7_CATEGORIES).find((section) =>
        SMM7_CATEGORIES[section].components.includes(component)
    );
    console.log(`[classifyComponent] "${component}" mapped to section "${workSection}"`);
    return {
        workSection: workSection || "Z. Unclassified Works",
        mainCategory: workSection
            ? SMM7_CATEGORIES[workSection].mainCategory
            : "Other",
    };
}

// --- Component to BillNo mapping ---
export const COMPONENT_TO_BILLNO = {
    // Preliminaries
    "Mobilization and Demobilization": "1",
    "Site Office and Facilities": "1",
    "Temporary Fencing": "1",
    "Water for Works": "1",
    "Electricity for Works": "1",
    "Insurance": "1",
    "Health and Safety": "1",
    "Setting Out": "1",
    "Project Signboard": "1",
    "Other Preliminaries": "1",

    // Substructure
    "Tree Cutting": "2A",
    "Site Clearance": "2A",
    "Topsoil Excavation": "2A",
    "Retaining Topsoil": "2A",
    "Trench Excavation": "2A",
    "Concrete in Trench": "2A",
    "Blockwork in Foundation": "2A",
    // ...add mappings for all components
};

// --- Add all Preliminaries to BOQ if missing ---
export function ensurePreliminariesInBOQ() {
    const prelimComponents = Object.keys(COMPONENT_TO_BILLNO).filter(
        c => COMPONENT_TO_BILLNO[c] === "1"
    );
    const prelimBill = boqData.bills.find(b => b.billNo === "1");
    if (!prelimBill) return;
    prelimComponents.forEach(component => {
        const alreadyAdded = prelimBill.items.some(item => item.category === component);
        if (!alreadyAdded) {
            // Add as "item" with quantity 1, unit "item", rate 0, amount 0
            prelimBill.items.push({
                itemCode: `ITEM-${Date.now().toString(36)}`,
                category: component,
                description: component,
                quantity: 1,
                unit: "item",
                rate: 0,
                amount: 0,
                haulageMultiplier: 1,
                type: "item"
            });
        }
    });
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
    // 1. Determine correct billNo using mapping
    if (!billNo) {
        billNo = COMPONENT_TO_BILLNO[component];
        if (!billNo) {
            // Fallback: use first bill in boqData.bills
            if (boqData.bills.length > 0) {
                billNo = boqData.bills[0].billNo;
            } else {
                console.error(`[addToBOQ] No bill mapping for component "${component}" and no bills initialized.`);
                return;
            }
        }
    }

    // 2. Find the bill in boqData.bills
    let bill = boqData.bills.find(b => b.billNo === billNo);
    if (!bill) {
        console.error(`[addToBOQ] Bill with billNo "${billNo}" not found. Make sure you called initBillsFromTemplate first.`);
        return;
    }

    // 3. Description and unit
    const formulaKey = COMPONENT_TO_FORMULA_MAP[component];
    const formulaObj = SMM7_2023[formulaKey];
    console.log('addToBOQ:', { component, formulaKey, formulaObj, inputs });

    if (!description) {
        if (formulaObj && typeof formulaObj.description === 'function') {
            description = formulaObj.description(inputs);
        } else if (formulaObj?.reference) {
            description = formulaObj.reference;
        } else {
            description = component;
        }
        unit = unit || (formulaObj?.unit || "m³");
    }

    // 4. Apply haulage multiplier
    const multiplier = boqData.haulage?.multiplier || 1.0;
    const rate = Number((unitCost * multiplier).toFixed(2));
    const total = Number((quantity * unitCost * multiplier).toFixed(2));

    // 5. Create item
    const boqItem = {
        itemCode: `ITEM-${Date.now().toString(36)}`,
        category: component,
        description,
        quantity: Number(quantity?.toFixed?.(2) ?? 1),
        unit,
        rate,
        amount: total,
        haulageMultiplier: multiplier,
        type
    };

    // 6. Add item to bill
    bill.items.push(boqItem);
    bill.total += boqItem.amount;
    console.log(`[addToBOQ] Added "${component}" to bill "${billNo}" (${bill.title}). Item:`, boqItem);
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