import { SMM7_2023 } from './formulas.js';
import { SMM7_CATEGORIES } from './smm7_categories.js';
import { COMPONENT_TO_FORMULA_MAP } from './component_to_formula_map.js';

// Function to validate consistency between SMM7_CATEGORIES and SMM7_2023
function validateSMM7Data() {
    const missingFormulas = [];
    Object.keys(SMM7_CATEGORIES).forEach((category) => {
        SMM7_CATEGORIES[category].components.forEach((component) => {
            const formulaKey = COMPONENT_TO_FORMULA_MAP[component]; // Use the mapping layer
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

// Call the validation function during initialization
validateSMM7Data();

// BOQ Data Structure
let boqData = {
    workSections: {},
    mainCategories: {
        "Substructure": { items: [], total: 0 },
        "Superstructure": { items: [], total: 0 },
        "Other": { items: [], total: 0 }
    },
    summary: {}
};

// Function to add an item to the BOQ
function addToBOQ(component, quantity, unitCost) {
// Map the component to its corresponding formula key
    const formulaKey = COMPONENT_TO_FORMULA_MAP[component];
    if (!formulaKey) {
        console.warn(`No mapping found for component: ${component}. Skipping.`);
        return;
    }

    if (!SMM7_2023[formulaKey]) {
        console.warn(`No formula found for mapped key: ${formulaKey}. Skipping.`);
        return;
    }

    const { workSection, mainCategory } = classifyComponent(component);
    const totalCost = quantity * unitCost;

    if (!boqData.workSections[workSection]) {
        boqData.workSections[workSection] = {
            description: SMM7_CATEGORIES[workSection]?.description || "Unclassified",
            items: {},
            total: 0,
        };
    }

    const itemId = `item-${Date.now()}`;
    boqData.workSections[workSection].items[itemId] = {
        category: component,
        quantity,
        unitCost,
        totalCost,
    };

    boqData.workSections[workSection].total += totalCost;
    boqData.mainCategories[mainCategory].total += totalCost;
}

// Function to generate the BOQ PDF
async function generateBOQPDF() {
    const { PDFDocument, rgb } = PDFLib;
    if (!boqData || Object.keys(boqData.workSections).length === 0) {
        console.warn("No BOQ data available to generate the PDF.");
        alert("No BOQ data available to generate the PDF.");
        return;
    }

    const pdfDoc = await document.create();
    let page = pdfDoc.addPage([595, 842]);
    let yPos = 800;
    const margin = 50;

    page.drawText("SMM7 BOQ Report", { x: margin, y: yPos, size: 18, color: rgb(0, 0, 0) });
    yPos -= 30;

    Object.entries(boqData.workSections).forEach(([section, data]) => {
        page.drawText(`${section}: ${data.description}`, { x: margin, y: yPos, size: 14, color: rgb(0, 0, 0) });
        yPos -= 20;

        page.drawText("Item | Description | Qty | Unit | Rate (GHS) | Total (GHS)", { x: margin, y: yPos, size: 12, color: rgb(0, 0, 0) });
        yPos -= 20;

        Object.values(data.items).forEach((item) => {
            const row = `${item.category} | N/A | ${item.quantity.toFixed(2)} | Unit | ${item.unitCost.toFixed(2)} | ${item.totalCost.toFixed(2)}`;
            page.drawText(row, { x: margin, y: yPos, size: 10, color: rgb(0, 0, 0) });
            yPos -= 20;

            if (yPos < 50) {
                page = pdfDoc.addPage([595, 842]);
                yPos = 800;
            }
        });

        page.drawText(`Subtotal for ${section}: GHS ${data.total.toFixed(2)}`, { x: margin, y: yPos, size: 12, color: rgb(0, 0, 0) });
        yPos -= 30;
    });

    const grandTotal = Object.values(boqData.workSections).reduce((sum, section) => sum + section.total, 0);
    page.drawText(`GRAND TOTAL: GHS ${grandTotal.toFixed(2)}`, { x: margin, y: yPos, size: 14, color: rgb(0, 0, 0) });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "SMM7-BOQ.pdf";
    link.click();
}

// Export functions for use in other modules
//export { addToBOQ, generateBOQPDF };

document.addEventListener('DOMContentLoaded', async function () {
    // Check for authentication token
    const token = localStorage.getItem("authToken");
    if (!token) {
        alert("You must be logged in to access this page.");
        window.location.href = "/login"; // Redirect to login page
    }

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

    // Example: Fetch the rate for cement
    fetchMaterialRate('cement').then(data => {
        if (data) {
            console.log(`Cement rate: ${data.unit_cost} GHS`);
        }
    });

    // Example: Fetch the labor rate for bricklaying
    fetchLaborRate('bricklaying').then(data => {
        if (data) {
            console.log(`Bricklaying rate: ${data.rate} GHS`);
        }
    });

    // Handle Logout
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                alert("You have been logged out.");
                window.location.href = "/login"; // Redirect to login page
            } catch (err) {
                console.error("Error during logout:", err);
                alert("An error occurred during logout. Please try again.");
            }
        });
    }

    // DOM Elements
    const componentSelect = document.getElementById("elements");
    const trenchFieldset = document.getElementById("trenchField");
    const blockworkFieldset = document.getElementById("blockworkField");

    // Hide fields by default
    trenchFieldset.style.display = "none";
    blockworkFieldset.style.display = "none";

    // Simulated database
    /*const SMM7_FORMULAS = {
        'concrete in trench': {
            quantity: (inputs) => inputs.trench_length * inputs.trench_width * inputs.trench_height,
            materials: ['cement', 'sand', 'aggregate']
        },
        'blockwork in foundation': {
            quantity: (inputs) => inputs.blockwork_length * inputs.blockwork_height * 0.2,
            materials: ['blocks', 'mortar']
        }
    };

    const MATERIAL_PRICES = {
        cement: 85.00,
        sand: 30.00,
        aggregate: 60.00,
        blocks: 5.50,
        mortar: 40.00
    };

    const LABOR_RATES = {
        'bricklaying': 25.00, // GHS per m²
        'concreting': 30.00  // GHS per m³
    };

    // Labor calculation function
    function calculateLaborCost(volume, laborHoursPerUnit, workers, hoursPerDay, dailyRate) {
        const totalDays = (volume * laborHoursPerUnit) / (workers * hoursPerDay);
        const laborCost = totalDays * dailyRate * workers;
        return { totalDays, laborCost };
    }*/

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

// Toggle trench fieldset
        trenchFieldset.style.display = isTrenchSelected ? "block" : "none";
        trenchFieldset.querySelectorAll("input").forEach(input => {
            input.required = isTrenchSelected;
        });

// Toggle blockwork fieldset
        blockworkFieldset.style.display = isBlockworkSelected ? "block" : "none";
        blockworkFieldset.querySelectorAll("input").forEach(input => {
            input.required = isBlockworkSelected;
        });
    });

    // Track calculated components
    let calculatedComponents = new Set();

    // Calculate button handlers
    const buttons = document.querySelectorAll('.calculate-btn');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', async function () {
            const componentType = this.dataset.component; // Get the component type from the button's data attribute
            console.log("Button clicked for component:", componentType); // Debugging line

            const fieldset = this.closest('fieldset');
            const inputs = fieldset.querySelectorAll('input');
            let isValid = true;

            // Validate all inputs
            for (let j = 0; j < inputs.length; j++) {
                if (!validateInput(inputs[j])) isValid = false;
            }

            console.log("Input is valid:", isValid); // Debugging line here

            if (!isValid) return;

            // Collect input values
            const inputValues = {};
            for (let j = 0; j < inputs.length; j++) {
                const inputName = inputs[j].name;
                const inputValue = parseFloat(inputs[j].value);
                if (isNaN(inputValue)) {
                    console.error(`Invalid input for ${inputName}:`, inputs[j].value);
                    alert(`Please enter a valid number for ${inputName}`);
                    return;
                }
                inputValues[inputName] = inputValue;
            }
            console.log("Collected input values:", inputValues);

            // Fetch material and labor prices for the selected component type
            const formulaKey = COMPONENT_TO_FORMULA_MAP[componentType];
            if (!formulaKey) {
                console.warn(`No mapping found for component: ${componentType}. Skipping.`);
                alert(`No mapping found for component: ${componentType}. Please check your inputs.`);
                return;
            }

            if (!SMM7_2023[formulaKey]) {
                console.warn(`No formula found for mapped key: ${formulaKey}. Skipping.`);
                alert(`No formula found for component: ${componentType}. Please check your inputs.`);
                return;
            }

            const prices = await fetchPricesForComponent(formulaKey);
            if (!prices) {
                alert(`Failed to fetch prices for ${componentType}. Please try again.`);
                return;
            }

            const { materialPrices, laborRates } = prices;

            // Perform calculation
            const formula = SMM7_2023[formulaKey].formula;
            const quantity = formula(inputValues, adjustments.concrete_waste_factor || 1);
            if (isNaN(quantity)) {
                console.error("Failed to calculate quantity. Check input values:", inputValues);
                alert("Failed to calculate quantity. Please check your inputs.");
                return;
            }
            console.log("Formula inputs:", inputValues, adjustments.concrete_waste_factor);
            console.log("Calculated quantity:", quantity);

            // Calculate total material cost
            let totalMaterialCost = 0;
            for (const material of SMM7_2023[formulaKey].materials) {
                totalMaterialCost += (materialPrices[material] || 0) * quantity;
            }
            console.log("Material Prices:", materialPrices);
            console.log("Total Material Cost:", totalMaterialCost);

            // Calculate labor cost
            const labor = SMM7_2023.calculateLaborCost(
                quantity,
                8, // Example labor hours per unit
                adjustments.labor_efficiency || 1, // Default to 1 if undefined
                8, // Hours per day
                laborRates[SMM7_2023[formulaKey].laborTasks[0]] || 0, // Daily rate
                SMM7_2023[formulaKey].laborTasks[0] // Task type (e.g., 'bricklaying' or 'concreting')
            );

            if (isNaN(labor.laborCost)) {
                console.error("Failed to calculate labor cost. Check inputs:", {
                    quantity,
                    laborHoursPerUnit: 8,
                    efficiency: adjustments.labor_efficiency,
                    hoursPerDay: 8,
                    dailyRate: laborRates[SMM7_2023[formulaKey].laborTasks[0]],
                    taskType: SMM7_2023[formulaKey].laborTasks[0]
                });
                alert("Failed to calculate labor cost. Please check your inputs.");
                return;
            }

            console.log("Labor Rates:", laborRates);
            console.log("Calculated labor cost:", labor);

            // Fetch plant data and calculate plant cost
            const plantData = await fetchPlantData();
            const relevantPlants = plantData.filter(plant =>
                SMM7_2023[formulaKey].equipment.includes(plant.equipment)
            );
            const plantCost = SMM7_2023.calculatePlantCost(quantity, relevantPlants);

            console.log("Plant Data:", relevantPlants);
            console.log("Calculated Plant Cost:", plantCost);

            // Display the results
            const output = document.getElementById('output');
            const resultHTML = `
                <div class="result-item">
                    <h4>${componentType}</h4>
                    <p>Quantity: ${quantity.toFixed(2)} m³</p>
                    <p>Total Material Cost: GHS ${totalMaterialCost.toFixed(2)}</p>
                    <p>Total Days: ${labor.totalDays.toFixed(2)} days</p>
                    <p>Labor Cost: GHS ${labor.laborCost.toFixed(2)}</p>
                    <p>Plant Cost: GHS ${plantCost.toFixed(2)}</p>
                    <p>Total Cost: GHS ${(totalMaterialCost + labor.laborCost + plantCost).toFixed(2)}</p>
                </div>
            `;
            output.insertAdjacentHTML('beforeend', resultHTML);

            // Track calculated components
            calculatedComponents.add(componentType);

            // Show the "Save Project" button if all selected components are calculated
            const selectedComponents = Array.from(componentSelect.selectedOptions).map(option => option.value);
            if (selectedComponents.every(component => calculatedComponents.has(component))) {
                document.getElementById('save-project-btn').style.display = 'block';
            }

            // Show the "Save Project" button after any calculation
            document.getElementById('save-project-btn').style.display = 'block';

            // Save the project
            //const totalCost = totalMaterialCost + labor.laborCost;
            //if (isNaN(totalCost)) {
            //    console.error("Failed to calculate total cost. Check material and labor costs.");
            //    alert("Failed to calculate total cost. Please try again.");
            //    return;
            //}

            //const projectName = prompt("Enter a name for this project:");
            //if (projectName) {
            //    saveProject(projectName, componentType, quantity, totalMaterialCost, labor.laborCost, totalCost);
            //    displayProjects();
            //}
        });
    }

    // Call displayProjects on page load
    displayProjects();
});

// Fetch material rate for a specific material
async function fetchMaterialRate(material) {
    const response = await fetch(`/api/prices/${material}?region=greater-accra`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

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
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });

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

// Fetch all materials
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
}

// Fetch all labor rates
async function fetchLaborRates() {
    const response = await fetch('/labor-rates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();
    console.log('Labor Rates:', data.labor_rates);
    return data.labor_rates;
}

async function fetchSMMRules() {
    const response = await fetch('/smm-rules', {
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

// Handle the "Generate BOQ" button click
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
});

async function fetchCalculatedComponents() {
    const selectedComponents = Array.from(document.querySelectorAll('.result-item')).map(result => {
        const component = result.querySelector('h4').textContent;
        const quantity = parseFloat(result.querySelector('p:nth-child(2)').textContent.split(': ')[1]);
        const unit = "m³"; // Example unit, adjust as needed
        const description = component; // Use the component name as the description
        const itemNumber = `item-${Date.now()}`; // Generate a unique item number

        return {
            type: component,
            quantity,
            unit,
            description,
            itemNumber
        };
    });

    return selectedComponents;
}