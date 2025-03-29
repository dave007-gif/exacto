// 1. Get DOM elements
const componentSelect = document.getElementById("elements");
const trenchFieldset = document.getElementById("trenchField");
const blockworkFieldset = document.getElementById("blockworkField");


// 2. Hide trench & blockwork fields by default on page load

trenchFieldset.style.display = "none";
blockworkFieldset.style.display = "none";

// 3. Event listener for dropdown changes
componentSelect.addEventListener("change", function() {
    // Get all selected options
    const selectedOptions = componentSelect.selectedOptions;
    
    // Check for trench selection
    let isTrenchSelected = false;
    let isBlockworkSelected = false;

    // Check all selected options
    for (let i = 0; i < selectedOptions.length; i++) {
        const optionValue = selectedOptions[i].value;
        
        if (optionValue === "concrete in trench") {
            isTrenchSelected = true;
        }
        if (optionValue === "blockwork in foundation") {
            isBlockworkSelected = true;
        }
    }

    // Handle trench fields
    if (isTrenchSelected) {
        trenchFieldset.style.display = "block";
        trenchFieldset.querySelectorAll("input").forEach(input => {
            input.required = true;
        });
    } else {
        trenchFieldset.style.display = "none";
        trenchFieldset.querySelectorAll("input").forEach(input => {
            input.required = false;
        });
    }

    // Handle blockwork fields
    if (isBlockworkSelected) {
        blockworkFieldset.style.display = "block";
        blockworkFieldset.querySelectorAll("input").forEach(input => {
            input.required = true;
        });
    } else {
        blockworkFieldset.style.display = "none";
        blockworkFieldset.querySelectorAll("input").forEach(input => {
            input.required = false;
        });
    }
});