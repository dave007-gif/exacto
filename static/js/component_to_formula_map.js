export const COMPONENT_TO_FORMULA_MAP = {
    // Preliminaries
    "mobilization and demobilization": "preliminaries_item",
    "site office and facilities": "preliminaries_item",
    "temporary fencing": "preliminaries_item",
    "water for works": "preliminaries_item",
    "electricity for works": "preliminaries_item",
    "insurance": "preliminaries_item",
    "health and safety": "preliminaries_item",
    "setting out": "preliminaries_item",
    "project signboard": "preliminaries_item",
    "other preliminaries": "preliminaries_item",

    // Components in "D. Groundworks"
    "tree cutting": "tree cutting",
    "site clearance": "site clearance",
    "topsoil excavation": "topsoil excavation",
    "retain topsoil": "retain topsoil",
    "trench excavation": "trench excavation",
    "fill material": "retain topsoil", // Add this if/when you have a formula for fill material

    // Components in "E. In-situ Concrete"
    "foundations": "concrete in trench",
    "ground beams": "concrete in trench",
    "blinding": "concrete in trench",

    // Components in "F. Masonry"
    "blockwork": "blockwork in foundation",
    "brickwork": "blockwork in foundation",
    "stonework": "blockwork in foundation",

    /*// Components in "D. Groundworks"
    "Site Clearance": "site clearance formula", // Example formula
    "Excavation": "excavation formula", // Example formula
    "Fill Material": "fill material formula", // Example formula*/
};