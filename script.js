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


