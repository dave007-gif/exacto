document.addEventListener('DOMContentLoaded', function () {
    // Check for authentication token
    const token = localStorage.getItem("authToken");
    if (!token) {
        alert("You must be logged in to access this page.");
        window.location.href = "/login"; // Redirect to login page
    }

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

    // Function to save a project
    function saveProject(projectName, totalCost) {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        projects.push({ name: projectName, cost: totalCost, date: new Date().toLocaleDateString() });
        localStorage.setItem('projects', JSON.stringify(projects));
    }

    // Function to display saved projects
    function displayProjects() {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = ''; // Clear existing projects

        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            const projectItem = document.createElement('div');
            projectItem.classList.add('project-item');
            projectItem.innerHTML = `
                <h4>${project.name}</h4>
                <p>Total Cost: GHS ${project.cost.toFixed(2)}</p>
                <p>Date: ${project.date}</p>
            `;
            projectList.appendChild(projectItem);
        }
    }

    // Calculate button handlers
    const buttons = document.querySelectorAll('.calculate-btn');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function () {
            const componentType = this.dataset.component;
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
                inputValues[inputs[j].name] = parseFloat(inputs[j].value);
            }

// Perform calculation
            const quantity = SMM7_FORMULAS[componentType].quantity(inputValues);
            let totalMaterialCost = 0;
            const materials = SMM7_FORMULAS[componentType].materials;

            for (let k = 0; k < materials.length; k++) {
                totalMaterialCost += quantity * MATERIAL_PRICES[materials[k]];
            }

            const laborHoursPerUnit = 8; // Example: 8 hours per unit
            const workers = 5; // Example: 5 workers
            const hoursPerDay = 8; // Example: 8 hours per day
            const dailyRate = LABOR_RATES[componentType === 'blockwork in foundation' ? 'bricklaying' : 'concreting'];

            const { totalDays, laborCost } = calculateLaborCost(quantity, laborHoursPerUnit, workers, hoursPerDay, dailyRate);

            const output = document.getElementById('output');
            const resultHTML = `
                <div class="result-item">
                    <h4>${componentType}</h4>
                    <p>Quantity: ${quantity.toFixed(2)} m³</p>
                    <p>Total Material Cost: GHS ${totalMaterialCost.toFixed(2)}</p>
                    <p>Total Days: ${totalDays.toFixed(2)} days</p>
                    <p>Labor Cost: GHS ${laborCost.toFixed(2)}</p>
                    <p>Total Cost: GHS ${(totalMaterialCost + laborCost).toFixed(2)}</p>
                </div>
            `;
            output.insertAdjacentHTML('beforeend', resultHTML);

            // Save the project
            const projectName = prompt("Enter a name for this project:");
            if (projectName) {
                saveProject(projectName, totalMaterialCost + laborCost);
                displayProjects();
            }
        });
    }

    // Call displayProjects on page load
    displayProjects();
});

async function fetchMaterials() {
    const response = await fetch('/materials', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();
    console.log('Materials:', data.materials);
    return data.materials;
}

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
    const data = await response.json();
    console.log('SMM Rules:', data.smm_rules);
    return data.smm_rules;
}