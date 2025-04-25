export const SMM7_2023 = {
    'concrete in trench': {
        formula: (inputs, concrete_waste_factor) => 
            inputs.trench_length * inputs.trench_width * inputs.trench_height * concrete_waste_factor,
        materials: ['cement', 'sand', 'aggregate'],
        laborTasks: ['concreting'],
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
    }
};