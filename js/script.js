// 1. Get DOM elements
const componentSelect = document.getElementById("elements");
const trenchFieldset = document.getElementById("trenchField");

// 2. Hide trench fields by default on page load
trenchFieldset.style.display = "none";

// 3. Event listener for dropdown changes
componentSelect.addEventListener("change", function() {
    // Check if "concrete in trench" is selected
    let isTrenchSelected = false;
    const selectedOptions = componentSelect.selectedOptions;
    
    for (let i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i].value === "concrete in trench") {
            isTrenchSelected = true;
            break;
        }
    }

    // Toggle visibility using if/else
    if (isTrenchSelected) {
        trenchFieldset.style.display = "block";
    } else {
        trenchFieldset.style.display = "none";
    }
    
    // Toggle required attribute
    const inputs = trenchFieldset.querySelectorAll("input");
    for (let i = 0; i < inputs.length; i++) {
        if (isTrenchSelected) {
            inputs[i].required = true;
        } else {
            inputs[i].required = false;
        }
    }
});