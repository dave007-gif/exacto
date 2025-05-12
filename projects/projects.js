document.addEventListener("DOMContentLoaded", function () {
    const filterButtons = document.querySelectorAll(".filter-btn");
    const projectCards = document.querySelectorAll(".project-card");
  
    filterButtons.forEach(button => {
      button.addEventListener("click", () => {
        // Remove 'active' from all buttons
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
  
        const category = button.textContent.toLowerCase();
  
        projectCards.forEach(card => {
          const tags = card.dataset.tags.toLowerCase();
  
          if (category === "all" || tags.includes(category)) {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  });
  
function addNewProject(event) {
  event.preventDefault();
  const name = document.getElementById('projectName').value;
  const location = document.getElementById('location').value;
  const type = document.getElementById('type').value;
  const client = document.getElementById('clientName').value;

  const projectCard = document.createElement('div');
  projectCard.classList.add('project-card');
  projectCard.setAttribute('data-tags', `${type} ongoing`);

  projectCard.innerHTML = `
    <img src="./uploads/placeholder.jpg" alt="New Project">
    <div class="project-info">
      <h3>${name}</h3>
      <p>${location}</p>
      <div class="progress-bar"><div style="width: 0%"></div></div>
      <span>Ongoing</span>
    </div>
  `;

  document.querySelector('.project-grid').appendChild(projectCard);
  document.getElementById('new-project-form').reset();

  alert(`New project "${name}" for ${client} added!`);
}

function renderTestimonials() {
  const container = document.getElementById('dynamic-testimonials');
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  container.innerHTML = '';

  reviews.forEach(review => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    const stars = '⭐'.repeat(review.rating || 0); // Build star string

    card.innerHTML = `
      <p>“${review.comment || 'No comment provided.'}”</p>
      <h4>${stars} – ${review.name || 'Anonymous'}, ${review.location}</h4>
    `;
    container.appendChild(card);
  });
}
