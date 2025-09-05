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
        formula: (inputs, concrete_waste_factor = 1) =>
            (inputs.mean_girth || 0) * (inputs.trench_width || 0) * (inputs.concrete_thickness || 0) * concrete_waste_factor,
        unit: 'm³',
        description: (inputs) =>
            `Insitu concrete of cement:sand:aggregate ${inputs.mix_ratio || '1:2:4'} - 20mm agg in trench foundation (${inputs.mean_girth || 0}m × ${inputs.trench_width || 0}m × ${inputs.concrete_thickness || 0}m)`,
        reference: 'SMM7 E20',
        materials: ['cement', 'sand', 'aggregate', 'water'],
        laborTasks: ['concreting'],
        equipment: ['Mixer'],
        calculateMaterialCost: (quantity, materialPrices, inputs = {}) => {
            // 1. Mix ratio parsing
            let mix = (inputs.mix_ratio || "1:2:4").split(":").map(Number);
            if (mix.length !== 3 || mix.some(isNaN)) mix = [1, 2, 4];
            const [cementRatio, sandRatio, aggRatio] = mix;
            const totalRatio = cementRatio + sandRatio + aggRatio;

            // 2. Dry volume (54% increase)
            const dryVolume = quantity * 1.54;

            // 3. Cement
            const cementVolume = (cementRatio / totalRatio) * dryVolume;
            const cementDensity = 1440; // kg/m³
            const cementBagWeight = 50; // kg
            const cementMass = cementVolume * cementDensity;
            const cementBags = cementMass / cementBagWeight;
            const cementBagPrice = materialPrices['cement'] || 0;
            const cementCost = cementBags * cementBagPrice;

            // 4. Sand
            const sandVolume = (sandRatio / totalRatio) * dryVolume;
            const sandTripVolume = 18; // m³/trip
            const sandTrips = sandVolume / sandTripVolume;
            const sandTripPrice = materialPrices['sand'] || 0;
            const sandCost = sandTrips * sandTripPrice;

            // 5. Aggregate
            const aggVolume = (aggRatio / totalRatio) * dryVolume;
            const aggTripVolume = 18; // m³/trip
            const aggTrips = aggVolume / aggTripVolume;
            const aggTripPrice = materialPrices['aggregate'] || 0;
            const aggCost = aggTrips * aggTripPrice;

            // 6. Water (optional, if price available)
            // Typical water-cement ratio: 0.5 (by weight), or about 150-180 liters per m³
            // We'll use 180L per m³ wet volume as a standard
            const waterLitres = 180 * quantity;
            const waterDrumLitres = 200; // 1 drum = 200L
            const waterDrums = waterLitres / waterDrumLitres;
            const waterDrumPrice = materialPrices['water'] || 0;
            const waterCost = waterDrums * waterDrumPrice;

            // 7. Total
            const totalCost = cementCost + sandCost + aggCost + waterCost;

            return totalCost;
            
        },
        calculateLaborCost: (inputs, laborRates) => {
            const quantity = (inputs.mean_girth || 0) * (inputs.trench_width || 0) * (inputs.concrete_thickness || 0);
            const dailyRate = laborRates['concreting'] || 0;
            const totalHours = quantity * 8; // adjust as needed
            const totalDays = totalHours / 8;
            return {
                totalDays,
                laborCost: totalDays * dailyRate
            };
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
    'preliminaries_item': {
        formula: (inputs) => Number(inputs.value) || 0,
        unit: 'item',
        description: (inputs) => inputs.description || "Preliminaries Item",
        reference: 'SMM7 A10',
        materials: [],
        laborTasks: [],
        calculateMaterialCost: () => 0,
        calculateLaborCost: () => 0,
        calculatePlantCost: () => 0
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