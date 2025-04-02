document.addEventListener('DOMContentLoaded', function() {
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
            
        
        // Check for valid number using html 5 validation
        if (!input.checkValidity()) {
            showError(input, errorSpan, 'Please enter a valid number');
            return false;
        }
        
        if (numericValue < 0) {
            showError(input, errorSpan, 'Value cannot be negative');
            return false;
        }

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
        inputs[i].addEventListener('input', function() {
            validateInput(this);
        });
        inputs[i].addEventListener('blur', function() {
            validateInput(this);
        });
    }

    // Dropdown change handler
    componentSelect.addEventListener("change", function() {
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

    // Calculate button handlers
    const buttons = document.querySelectorAll('.calculate-btn');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function() {
            const componentType = this.dataset.component;
            const fieldset = this.closest('fieldset');
            const inputs = fieldset.querySelectorAll('input');
            let isValid = true;

            // Validate all inputs
            for (let j = 0; j < inputs.length; j++) {
                if (!validateInput(inputs[j])) isValid = false;
            }

            if (!isValid) return;

            // Collect input values
            const inputValues = {};
            for (let j = 0; j < inputs.length; j++) {
                inputValues[inputs[j].name] = parseFloat(inputs[j].value);
            }

            // Perform calculation
            const quantity = SMM7_FORMULAS[componentType].quantity(inputValues);
            let totalCost = 0;
            const materials = SMM7_FORMULAS[componentType].materials;
            
            for (let k = 0; k < materials.length; k++) {
                totalCost += quantity * MATERIAL_PRICES[materials[k]];
            }

            // Display results
            const output = document.getElementById('output');
            
            //clear previous results for this component
            output.innerHTML = '';

            //display results
            output.innerHTML += `
                <div class="result-item">
                    <h4>${componentType}</h4>
                    <p>Quantity: ${quantity.toFixed(2)} m³</p>
                    <p>Total Cost: GHS ${totalCost.toFixed(2)}</p>
                </div>
            `;

            // either append or replace results
            output.insertAdjacentHTML('beforeend', resultHtml);
        });
    }
});