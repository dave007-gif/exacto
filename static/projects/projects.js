document.addEventListener("DOMContentLoaded", () => {
  // Filter buttons logic
  const filterButtons = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      const category = button.textContent.toLowerCase();

      projectCards.forEach(card => {
        const tags = card.dataset.tags.toLowerCase();
        card.style.display = category === "all" || tags.includes(category) ? "block" : "none";
      });
    });
  });

  // Render testimonials from localStorage
  renderTestimonials();

  // Attach click listeners to project cards for saving and redirecting
  const projects = window.projects || []; // projects array should be global or imported

  projectCards.forEach((card, index) => {
    card.addEventListener("click", e => {
      e.preventDefault(); // prevent default anchor if any
      if (projects[index]) {
        localStorage.setItem("selectedProject", JSON.stringify(projects[index]));
        window.location.href = "project-details.html";
      }
    });
  });

  // If on the project-details page, populate project details
  if (window.location.pathname.includes("project-details.html")) {
    const project = JSON.parse(localStorage.getItem("selectedProject"));
    if (project) {
      document.getElementById("title").textContent = project.title;
      document.getElementById("location").textContent = project.location;
      const img = document.getElementById("image");
      img.src = project.image;
      img.alt = project.title;
      document.getElementById("description").textContent = project.description;
      document.getElementById("progress-bar-fill").style.width = project.progress + "%";

      const materialsList = document.getElementById("materials-list");
      materialsList.innerHTML = "";
      project.materials.forEach(material => {
        const li = document.createElement("li");
        li.textContent = material;
        materialsList.appendChild(li);
      });

      document.getElementById("materials-cost").textContent = `$${project.materialCost.toLocaleString()}`;
      document.getElementById("labor-cost").textContent = `$${project.laborCost.toLocaleString()}`;
      document.getElementById("total-cost").textContent = `$${(project.materialCost + project.laborCost).toLocaleString()}`;
    }
  }
});

// Function to render testimonials from localStorage
function renderTestimonials() {
  const container = document.getElementById('dynamic-testimonials');
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  container.innerHTML = '';

  reviews.forEach(review => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    const stars = '⭐'.repeat(review.rating || 0);

    card.innerHTML = `
      <p>“${review.comment || 'No comment provided.'}”</p>
      <h4>${stars} – ${review.name || 'Anonymous'}, ${review.location || ''}</h4>
    `;
    container.appendChild(card);
  });
}

window.projects = [
  // your full projects array here
];

