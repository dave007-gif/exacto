export const SMM7_2023 = {
    'concrete in trench': {
        formula: (L, W, H, concrete_waste_factor) => L * W * H * concrete_waste_factor,
        materials: ['cement', 'sand', 'aggregate'],
        laborTasks: ['concreting'],
        reference: 'SMM7 Clause E20'
    },
    'blockwork in foundation': {
        formula: (L, H, thickness) => L * H * 0.2,
        materials: ['blocks', 'mortar'],
        laborTasks: ['bricklaying'],
        reference: 'SMM7 Clause F10'
    },
    calculateLaborCost: (volume, laborHoursPerUnit, labour_efficiency, efficiency, hoursPerDay, dailyRate) => {
        const totalHours = volume * laborHoursPerUnit / efficiency;
        const totalDays = totalHours / hoursPerDay;
        const laborCost = totalDays * dailyRate;
        return { totalDays, laborCost };
    }
};