export const SMM7_2023 = {
  // 1. Tree/Tree Stump Removal
  'tree cutting': {
    formula: (inputs) => Number(inputs.num_trees) || 0,
    unit: 'nr',
    girthBands: {
      '600-1500': 'average girth 600mm-1.5m',
      '1500-3000': 'average girth 1.5-3.0m',
      '>3000': 'average girth over 3.0m'
    },
    getLaborTask: (inputs) => {
      if (inputs.tree_girth === '600-1500') return 'tree cutting 600-1500';
      if (inputs.tree_girth === '1500-3000') return 'tree cutting 1500-3000';
      if (inputs.tree_girth === '>3000') return 'tree cutting over 3000';
      return 'tree cutting 600-1500'; // default
    },
    description: (inputs) =>
      `Cutting down and removal of ${inputs.num_trees} tree(s)/stump(s) of ${SMM7_2023['tree cutting'].girthBands[inputs.tree_girth]}`,
    reference: 'SMM7 D10',
    materials: [],
    laborTasks: [], // handled dynamically
    calculateMaterialCost: () => 0,
    calculateLaborCost: (inputs, laborRates) => {
      const task = SMM7_2023['tree cutting'].getLaborTask(inputs);
      const rate = laborRates[task] || 0;
      const quantity = Number(inputs.num_trees) || 0;
      return {
        totalDays: quantity, // 1 tree per day (adjust as needed)
        laborCost: rate * quantity
      };
    }
  },

  // 2. Site Clearance
  'site clearance': {
    formula: (inputs) => (inputs.site_length || 0) * (inputs.site_width || 0),
    unit: 'm²',
    description: (inputs) =>
      `Site clearance of area ${(inputs.site_length || 0)}m x ${(inputs.site_width || 0)}m`,
    reference: 'SMM7 D20',
    materials: [],
    laborTasks: ['site clearance'],
    calculateMaterialCost: () => 0
  },

  // 3. Topsoil Excavation
  'topsoil excavation': {
    formula: (inputs) =>
      (2 * (inputs.spread || 0) + (inputs.gf_length || 0)) *
      (2 * (inputs.spread || 0) + (inputs.gf_width || 0)),
    unit: 'm²',
    description: (inputs) =>
      `Excavation and removal of topsoil over area calculated as [2×spread + length] × [2×spread + width]`,
    reference: 'SMM7 D30',
    materials: [],
    laborTasks: ['excavation'],
    calculateMaterialCost: () => 0
  },

  // 4. Retaining Topsoil
  'retain topsoil': {
    formula: (inputs) =>
      (2 * (inputs.spread_r || 0) + (inputs.gf_length_r || 0)) *
      (2 * (inputs.spread_r || 0) + (inputs.gf_width_r || 0)) *
      (inputs.topsoil_depth || 0),
    unit: 'm³',
    description: (inputs) =>
      `Retaining topsoil to depth ${(inputs.topsoil_depth || 0)}m over area as [2×spread + length] × [2×spread + width]`,
    reference: 'SMM7 D40',
    materials: [],
    laborTasks: ['excavation'],
    calculateMaterialCost: () => 0
  },

  // 5. Trench Excavation
  'trench excavation': {
    formula: (inputs) => {
      // Helper: mean girth
      const extGirth = 2 * ((inputs.ext_len || 0) + (inputs.ext_width || 0)) - 4 * (inputs.spread_trench || 0);
      const intHor = (inputs.int_hor_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
      const intVer = (inputs.int_ver_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
      const meanGirth = extGirth + intHor + intVer;
      return meanGirth * (inputs.trench_width || 0) * (inputs.trench_depth || 0);
    },
    unit: 'm³',
    description: (inputs) => {
      const extGirth = 2 * ((inputs.ext_len || 0) + (inputs.ext_width || 0)) - 4 * (inputs.spread_trench || 0);
      const intHor = (inputs.int_hor_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
      const intVer = (inputs.int_ver_trenches || []).reduce((a, b) => a + Number(b || 0), 0);
      const meanGirth = extGirth + intHor + intVer;
      return `Trench excavation: mean girth ${meanGirth.toFixed(2)}m × width ${(inputs.trench_width || 0)}m × depth ${(inputs.trench_depth || 0)}m`;
    },
    reference: 'SMM7 D50',
    materials: [],
    laborTasks: ['excavation'],
    calculateMaterialCost: () => 0

  },
  // 6. Concrete in Trench;
    'concrete in trench': {
        formula: (inputs, concrete_waste_factor) =>
            inputs.trench_length * inputs.trench_width * inputs.trench_height * concrete_waste_factor,
        materials: ['cement', 'sand', 'aggregate'],
        laborTasks: ['concreting'],
        equipment: ['Mixer'], // Specify the equipment required
        reference: 'SMM7 Clause E20',
        calculateMaterialCost: (quantity, materialPrices) => {
            let totalCost = 0;
            for (const material of ['cement', 'sand', 'aggregate']) {
                totalCost += (materialPrices[material] || 0) * quantity;
            }
            return totalCost;
        }
    },
    'blockwork in foundation': {
        formula: (inputs, thickness) => 
            inputs.blockwork_length * inputs.blockwork_height * thickness,
        materials: ['blocks', 'mortar'],
        laborTasks: ['bricklaying'],
        reference: 'SMM7 Clause F10',
        calculateMaterialCost: (quantity, materialPrices, thickness) => {
            const blockCost = (materialPrices['blocks'] || 0) * quantity / thickness; // Blocks per m³
            const mortarCost = (materialPrices['mortar'] || 0) * quantity; // Mortar per m³
            return blockCost + mortarCost;
        }
    },
    calculateLaborCost: (volume, laborHoursPerUnit, efficiency, hoursPerDay, dailyRate) => {
        const totalHours = volume * laborHoursPerUnit / efficiency;
        const totalDays = totalHours / hoursPerDay;
        const laborCost = totalDays * dailyRate;
        return { totalDays, laborCost };
    },
    calculatePlantCost: (quantity, plants) => {
        let totalCost = 0;
        for (const plant of plants) {
            const plantCost = plant.dailyRate * (plant.durationPerUnit * quantity);
            totalCost += plantCost;
        }
        return totalCost;
    }
};