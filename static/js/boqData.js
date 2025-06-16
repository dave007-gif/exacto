import { SMM7_CATEGORIES } from './smm7_categories.js';

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

/*// Add an item to a bill (applies haulage multiplier)
export function addBOQItem({ billNo, title, item }) {
    let bill = boqData.bills.find(b => b.billNo === billNo);
    if (!bill) {
        bill = { billNo, title, items: [], total: 0 };
        boqData.bills.push(bill);
    }
    // Apply haulage multiplier to rate and amount
    const multiplier = boqData.haulage.multiplier || 1.0;
    const adjustedItem = {
        ...item,
        rate: Number((item.rate * multiplier).toFixed(2)),
        amount: Number((item.amount * multiplier).toFixed(2)),
        haulageMultiplier: multiplier
    };
    bill.items.push(adjustedItem);
    bill.total += adjustedItem.amount;
}*/

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

// --- Generic, bill-centric addToBOQ ---
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
    // 1. Classify component (for calculated items)
    let workSection, mainCategory;
    if (!billNo || !billTitle) {
        const sectionInfo = classifyComponent(component);
        workSection = sectionInfo.workSection;
        mainCategory = sectionInfo.mainCategory;
        billNo = workSection; // Use section as billNo if not provided
        billTitle = workSection; // Use section as billTitle if not provided
    }

    // 2. Description and unit
    if (!description) {
        // Use dynamic description if available, else fallback
        const formulaKey = window.COMPONENT_TO_FORMULA_MAP?.[component];
        const formulaObj = window.SMM7_2023?.[formulaKey];
        description = (formulaObj && typeof formulaObj.description === 'function')
            ? formulaObj.description(inputs)
            : (formulaObj?.reference || component);
        unit = unit || (formulaObj?.unit || "m³");
    }

    // 3. Apply haulage multiplier
    const multiplier = boqData.haulage?.multiplier || 1.0;
    const rate = Number((unitCost * multiplier).toFixed(2));
    const total = Number((quantity * unitCost * multiplier).toFixed(2));

    // 4. Create item
    const boqItem = {
        itemCode: `ITEM-${Date.now().toString(36)}`,
        category: component,
        description,
        quantity: Number(quantity.toFixed(2)),
        unit,
        rate,
        amount: total,
        haulageMultiplier: multiplier,
        type
    };

    // 5. Find or create bill
    let bill = boqData.bills.find(b => b.billNo === billNo);
    if (!bill) {
        bill = { billNo, title: billTitle, items: [], total: 0 };
        boqData.bills.push(bill);
        console.log(`[addToBOQ] Created new bill: ${billNo} - ${billTitle}`);
    }

    // 6. Add item to bill
    bill.items.push(boqItem);
    bill.total += boqItem.amount;
    console.log(`[addToBOQ] Added "${component}" to bill "${billNo}" (${billTitle}). Item:`, boqItem);
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