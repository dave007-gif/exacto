function toggleMenu() {
  const menu = document.getElementById('menu-links');
  const burger = document.getElementById('burger');

  menu.classList.toggle('show');
  burger.classList.toggle('open');
}


function openModal(id) {
    document.getElementById(id).style.display = 'block';
  }

  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }

  function switchModal(currentId, targetId) {
    closeModal(currentId);
    openModal(targetId);
  }

  // Close modal if click outside the modal content
  window.onclick = function(event) {
    document.querySelectorAll(".modal").forEach(modal => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  // Scroll Fade-In Effect
const faders = document.querySelectorAll('.fade-in');

const appearOptions = {
  threshold: 0.5,
  rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("appear");
    observer.unobserve(entry.target);
  });
}, appearOptions);

faders.forEach(fader => appearOnScroll.observe(fader));
