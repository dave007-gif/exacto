// ✅ Burger Menu Toggle
function toggleMenu() {
  const menu = document.getElementById('menu-links');
  const burger = document.getElementById('burger');

  menu.classList.toggle('show');
  burger.classList.toggle('open');
}

// ✅ Modal Controls
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

function switchModal(currentId, targetId) {
  closeModal(currentId);
  openModal(targetId);
}

// ✅ Close modal when clicking outside the modal content
window.addEventListener('click', function (event) {
  document.querySelectorAll(".modal").forEach(modal => {
    if (event.target === modal) {
      modal.style.display = "none";
      document.body.classList.remove('modal-open');
    }
  });
});

// ✅ Close modal with ESC key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal").forEach(modal => {
      modal.style.display = "none";
      document.body.classList.remove('modal-open');
    });
  }
});

// ✅ Auto-open login/signup modal from URL (e.g. ?show=login)
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const show = urlParams.get("show");
  if (show === "login") openModal('login-modal');
  if (show === "signup") openModal('signup-modal');
});

// ✅ Scroll Fade-in Animation
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

// ✅ Toast Notification (Optional Flash Placeholder)
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

document.querySelector('form').addEventListener('submit', function () {
  document.getElementById('login-spinner').style.display = 'block';
});

function validateSignupForm() {
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm_password").value;

  if (password !== confirm) {
    alert("Passwords do not match!");
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const nextPage = params.get("next");
  const show = params.get("show");

  // Show login modal if redirected to login
  if (nextPage) {
    openModal("login-modal");
  }

  // Optionally show login or signup manually via ?show=login or ?show=signup
  if (show === "login") {
    openModal("login-modal");
  } else if (show === "signup") {
    openModal("signup-modal");
  }
});
