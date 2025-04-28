import { SMM7_2023 } from './formulas.js';

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
    const SMM7_FORMULAS = {
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
            const prices = await fetchPricesForComponent(componentType);
            if (!prices) {
                alert(`Failed to fetch prices for ${componentType}. Please try again.`);
                return;
            }

            const { materialPrices, laborRates } = prices;

            // Perform calculation
            const formula = SMM7_2023[componentType].formula;
            const quantity = formula(inputValues, adjustments.concrete_waste_factor || 1);
            if (isNaN(quantity)) {
                console.error("Failed to calculate quantity. Check input values:", inputValues);
                alert("Failed to calculate quantity. Please check your inputs.");
                return;
            }
            console.log("Formula inputs:", inputValues.length, inputValues.width, inputValues.height, adjustments.concrete_waste_factor);
            console.log("Calculated quantity:", quantity); // Debugging line here

            // Calculate total material cost
            let totalMaterialCost = 0;

            if (componentType === 'concrete in trench') {
                // Calculate material cost based on volume
                for (const material of SMM7_2023[componentType].materials) {
                    totalMaterialCost += (materialPrices[material] || 0) * quantity;
                }
            } else if (componentType === 'blockwork in foundation') {
                // Calculate material cost based on blocks and mortar
                const blockCost = (materialPrices['blocks'] || 0) * quantity / adjustments.thickness; // Blocks per m³
                const mortarCost = (materialPrices['mortar'] || 0) * quantity; // Mortar per m³
                totalMaterialCost = blockCost + mortarCost;
            } else {
                console.error(`Unknown component type for material cost calculation: ${componentType}`);
            }
            console.log("Material Prices:", materialPrices);
            console.log("Total Material Cost:", totalMaterialCost); // Debugging line here

            // Calculate labor cost
            const labor = SMM7_2023.calculateLaborCost(
                quantity,
                8, // Example labor hours per unit
                adjustments.labor_efficiency || 1, // Default to 1 if undefined
                8, // Hours per day
                laborRates[SMM7_2023[componentType].laborTasks[0]] || 0, // Daily rate
                SMM7_2023[componentType].laborTasks[0] // Task type (e.g., 'bricklaying' or 'concreting')
            );

            if (isNaN(labor.laborCost)) {
                console.error("Failed to calculate labor cost. Check inputs:", {
                    quantity,
                    laborHoursPerUnit: 8,
                    efficiency: adjustments.labor_efficiency,
                    hoursPerDay: 8,
                    dailyRate: laborRates[SMM7_2023[componentType].laborTasks[0]],
                    taskType: SMM7_2023[componentType].laborTasks[0]
                });
                alert("Failed to calculate labor cost. Please check your inputs.");
                return;
            }

            console.log("Labor Rates:", laborRates);
            console.log("Calculated labor cost:", labor); // Debugging line here
           
           
            // Display the results
            const output = document.getElementById('output');
            const resultHTML = `
                <div class="result-item">
                    <h4>${componentType}</h4>
                    <p>Quantity: ${quantity.toFixed(2)} m³</p>
                    <p>Total Material Cost: GHS ${totalMaterialCost.toFixed(2)}</p>
                    <p>Total Days: ${labor.totalDays.toFixed(2)} days</p>
                    <p>Labor Cost: GHS ${labor.laborCost.toFixed(2)}</p>
                    <p>Total Cost: GHS ${(totalMaterialCost + labor.laborCost).toFixed(2)}</p>
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
    if (!response.ok) {
        console.error(`Failed to fetch material rate for ${material}:`, response.statusText);
        return null;
    }
    const data = await response.json();
    console.log(`Material Rate for ${material}:`, data);
    return data; // Example: { material: 'cement', unit_cost: 85.00, valid_from: '2023-04-01', valid_to: '2023-10-01' }
}

// Fetch labor rate for a specific trade
async function fetchLaborRate(trade) {
    const response = await fetch(`/api/labor/${trade}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) {
        console.error(`Failed to fetch labor rate for ${trade}:`, response.statusText);
        return null;
    }
    const data = await response.json();
    console.log(`Labor Rate for ${trade}:`, data);
    return data; // Example: { trade: 'bricklaying', rate: 25.00, valid_from: '2023-04-01', valid_to: '2023-10-01' }
}

// Fetch all materials
async function fetchMaterials() {
    const response = await fetch('/materials', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) {
        console.error('Failed to fetch materials:', response.statusText);
        return [];
    }
    const data = await response.json();
    console.log('Materials:', data.materials);
    return data.materials;
}

// Fetch all labor rates
async function fetchLaborRates() {
    const response = await fetch('/labor-rates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) {
        console.error('Failed to fetch labor rates:', response.statusText);
        return [];
    }
    const data = await response.json();
    console.log('Labor Rates:', data.labor_rates);
    return data.labor_rates;
}

async function fetchPricesForComponent(componentType) {
    const component = SMM7_2023[componentType];
    if (!component) {
        console.error(`Unknown component type: ${componentType}`);
        return null;
    }

    // Fetch material prices
    const materialPrices = {};
    for (const material of component.materials) {
        const materialData = await fetchMaterialRate(material);
        if (materialData) {
            materialPrices[material] = materialData.unit_cost;
        }
    }
    console.log(`Material Prices for ${componentType}:`, materialPrices);

    // Fetch labor rates
    const laborRates = {};
    for (const task of component.laborTasks || []) {
        const laborData = await fetchLaborRate(task);
        if (laborData) {
            laborRates[task] = laborData.rate;
        }
    }
    console.log(`Labor Rates for ${componentType}:`, laborRates);

    return { materialPrices, laborRates };
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
            <p>Total Cost: GHS ${project.totalCost}</p>
            <p>Date: ${project.date}</p>
        `;
        projectList.appendChild(projectItem);
    });
}

// Function to save a project
function saveProject(projectName, componentType, quantity, totalMaterialCost, laborCost, totalCost) {
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
        totalCost: totalCost.toFixed(2),
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('projects', JSON.stringify(projects));
    console.log("Saved projects:", projects); // Debugging line
}

document.getElementById('save-project-btn').addEventListener('click', function () {
    const projectName = prompt("Enter a name for this project:");
    if (!projectName) {
        alert("Project name is required.");
        return;
    }

    // Collect all results
    const results = document.querySelectorAll('.result-item');
    let totalCost = 0;

    results.forEach(result => {
        const component = result.querySelector('h4').textContent;
        const quantity = parseFloat(result.querySelector('p:nth-child(2)').textContent.split(': ')[1]);
        const materialCost = parseFloat(result.querySelector('p:nth-child(3)').textContent.split(': ')[1].replace('GHS ', ''));
        const laborCost = parseFloat(result.querySelector('p:nth-child(5)').textContent.split(': ')[1].replace('GHS ', ''));
        totalCost += materialCost + laborCost;

        saveProject(projectName, component, quantity, materialCost, laborCost, materialCost + laborCost);
    });

    alert(`Project "${projectName}" saved successfully! Total Cost: GHS ${totalCost.toFixed(2)}`);

    // Call displayProjects to update the DOM
    displayProjects();
});

