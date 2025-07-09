document.addEventListener("DOMContentLoaded", () => {
  // Dummy dashboard data (replace with AJAX or Flask API later)
  const dashboardData = {
    totalProjects: 5,
    totalEstimates: 12,
    totalMaterials: 88,
    totalCost: "₵ 23,500",
    recentEstimates: [
      { project: "Plastering", method: "Interior Finishes", cost: "₵ 1,500", status: "✔️ Completed" },
      { project: "Blockwork", method: "Masonry", cost: "₵ 3,200", status: "⏳ In Progress" },
      { project: "Foundation", method: "Groundwork", cost: "₵ 5,000", status: "✔️ Completed" }
    ]
  };

  // Update stats
  document.getElementById("total-projects").textContent = dashboardData.totalProjects;
  document.getElementById("total-estimates").textContent = dashboardData.totalEstimates;
  document.getElementById("total-materials").textContent = dashboardData.totalMaterials;
  document.getElementById("total-cost").textContent = dashboardData.totalCost;

  // Populate recent estimates table
  const tbody = document.querySelector("#recent-estimates tbody");
  dashboardData.recentEstimates.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.project}</td>
      <td>${entry.method}</td>
      <td>${entry.cost}</td>
      <td>${entry.status}</td>
    `;
    tbody.appendChild(row);
  });
});
