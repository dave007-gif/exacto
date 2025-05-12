// Scroll Fade-In Animation
const faders = document.querySelectorAll('.fade-in');

const appearOptions = {
  threshold: 0.3,
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

// Typewriter Text Effect
const text = "Exact Estimates for Builders and Planners...";
let i = 0;
const speed = 60;

function typeWriter() {
  if (i < text.length) {
    document.getElementById("typewriter").innerHTML += text.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}

window.addEventListener('load', typeWriter);

document.addEventListener("DOMContentLoaded", function () {
    let username = localStorage.getItem("username") || "Guest";
    document.getElementById("usernameGreeting").textContent = `Hi, ${username}`;
  
    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      window.location.href = "index.html"; // or redirect to login page
    });
  });
  
  