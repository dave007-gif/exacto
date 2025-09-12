// Refactored SMM7 categories and work sections with codes and default bill numbers
export const SMM7_CATEGORIES = {
  "a. preliminaries / general conditions": {
    mainCategory: "Preliminaries",
    sections: [
      {
        code: "A26",
        title: "Employer's requirements / Facilities / Temporary works / Services",
        defaultBillNo: "1",
        components: [
          "mobilization and demobilization",
          "site office and facilities",
          "temporary fencing",
          "water for works",
          "electricity for works"
        ]
      },
      {
        code: "A40",
        title: "Contractor's general cost items",
        defaultBillNo: "1",
        components: [
          "insurance",
          "health and safety",
          "setting out",
          "project signboard",
          "other preliminaries"
        ]
      }
    ]
  },

  "d. groundworks": {
    mainCategory: "Substructure",
    sections: [
      {
        code: "D20",
        title: "Excavating and filling",
        defaultBillNo: "2A",
        components: [
          "tree cutting",
          "site clearance",
          "topsoil excavation",
          "retain topsoil",
          "trench excavation",
          "fill material"
        ]
      }
    ]
  },

  "e. in-situ concrete": {
    mainCategory: "Substructure",
    sections: [
      {
        code: "F10",
        title: "Mixing/Casting/Curing In-situ Concrete",
        defaultBillNo: "2A",
        components: [
          "foundations",
          "ground beams",
          "blinding"
        ]
      }
    ]
  },

  "f. masonry": {
    mainCategory: "Superstructure",
    sections: [
      {
        code: "F30",
        title: "Reinforcement for In-situ Concrete",
        defaultBillNo: "2B",
        components: [
          "blockwork",
          "brickwork",
          "stonework"
        ]
      }
    ]
  },

 /* "mep": {
    mainCategory: "MEP",
    sections: [
      {
        code: "N13",
        title: "Sanitary appliances/fittings",
        defaultBillNo: "3",
        components: [
          "wc suite",
          "wash hand basin",
          "urinal",
          "bath",
          "shower"
        ]
      }
    ]
  },

  "external works": {
    mainCategory: "External",
    sections: [
      {
        code: "Q10",
        title: "Kerbs/Paths/Pavings",
        defaultBillNo: "4",
        components: [
          "paving",
          "kerbs"
        ]
      }
    ]
  },*/

  "z. unclassified works": {
    mainCategory: "Other",
    sections: []
  }
};

// --- Helpers/compatibility ---
function normKey(s) {
  return String(s || "").trim().toLowerCase();
}

// Derive flat components array per category (backwards compatibility)
Object.keys(SMM7_CATEGORIES).forEach(catKey => {
  const cat = SMM7_CATEGORIES[catKey];
  const comps = (cat.sections || []).flatMap(sec => sec.components || []);
  cat.components = comps.map(normKey); // keep normalized for matching
});

// Fast lookup: component -> section meta
export const COMPONENT_TO_SECTION = {};
Object.keys(SMM7_CATEGORIES).forEach(catKey => {
  const cat = SMM7_CATEGORIES[catKey];
  (cat.sections || []).forEach(sec => {
    (sec.components || []).forEach(c => {
      COMPONENT_TO_SECTION[normKey(c)] = {
        sectionCode: sec.code,
        sectionTitle: sec.title,
        mainCategory: cat.mainCategory,
        defaultBillNo: sec.defaultBillNo
      };
    });
  });
});