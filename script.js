// get elements id for the dropdown in html


const showInputFields = () => { 
    console.log("fdfsdsd")
    // code to show the corresponding input field of selected component type
    console.log(dropdown)
    console.log(dropdown.value);
    let selectedOption = dropdown.value;
    console.log(selectedOption)
    for (let i = 0; i < storeField.length; i++) {
        if (selectedOption == "concrete in trench") {
            storeField[i].style.display = "block";
        } else {
            storeField[i].style.display = "none";
        }
    }
    
}


let dropdown = document.getElementById("elements");
console.log("fdgfgfdg")
dropdown.addEventListener("change", showInputFields);
console.log("ghgfghfhg")
let trenchFields = document.getElementById("trenchField")
const trenchFieldId = ["length", "width", "height"]


const storeField = []
for (let i = 0; i < trenchFieldId.length; i++) {
   storeField.push(document.getElementById(trenchFieldId[i]))

}
console.log(storeField)

// code for calculating quantity for each component
document.addEventListener('DOMContentLoaded', () => {
    // Simulated database
    const SMM7_FORMULAS = { /* ... keep same ... */ };
    const MATERIAL_PRICES = { /* ... keep same ... */ };
  
    // Get all buttons
    const buttons = document.querySelectorAll('.calculate-btn');
    
    // Add click handlers with for loop
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function() {
        // Get component type
        const componentType = this.dataset.component;
        
        // Get parent fieldset
        const fieldset = this.closest('fieldset');
        
        // Collect inputs with for loop
        const inputs = {};
        const inputElements = fieldset.querySelectorAll('input');
        for (let j = 0; j < inputElements.length; j++) {
          const input = inputElements[j];
          inputs[input.name] = parseFloat(input.value) || 0;
        }
  
        // Calculate quantity
        const quantity = SMM7_FORMULAS[componentType].quantity(inputs);
        
        // Calculate cost (simple version)
        let totalCost = 0;
        const materials = SMM7_FORMULAS[componentType].materials;
        for (let k = 0; k < materials.length; k++) {
          const material = materials[k];
          totalCost += quantity * MATERIAL_PRICES[material];
        }
  
        // Display results
        const output = document.getElementById('output');
        output.innerHTML += `
          <div class="result-item">
            <h4>${componentType}</h4>
            <p>Quantity: ${quantity.toFixed(2)} m³</p>
            <p>Total Cost: GHS ${totalCost.toFixed(2)}</p>
          </div>
        `;
      });
    }
  });


