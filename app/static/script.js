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
      closeModal(modal.id);
    }
  });
});

// ✅ Close modal with ESC key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal").forEach(modal => {
      closeModal(modal.id);
    });
  }
});

// ✅ Auto-open login/signup/reset modal from URL (?show=login / signup / reset)
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const show = urlParams.get("show");
  if (show === "login") openModal('login-modal');
  if (show === "signup") openModal('signup-modal');
  if (show === "reset") openModal('resetPasswordModal');
});

// ✅ Scroll Fade-in Animation
const faders = document.querySelectorAll('.fade-in');
const appearOptions = { threshold: 0.5, rootMargin: "0px 0px -50px 0px" };

const appearOnScroll = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("appear");
    observer.unobserve(entry.target);
  });
}, appearOptions);

faders.forEach(fader => appearOnScroll.observe(fader));

// ✅ Toast Notification
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

// ✅ Prevent errors if form not present
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function () {
      const spinner = document.getElementById('login-spinner');
      if (spinner) spinner.style.display = 'block';
    });
  }
});

// ✅ Validate signup form
function validateSignupForm() {
  const password = document.getElementById("password")?.value;
  const confirm = document.getElementById("confirm_password")?.value;

  if (password && confirm && password !== confirm) {
    alert("Passwords do not match!");
    return false;
  }
  return true;
}

// ✅ User dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.getElementById('userTrigger');
  if (!trigger) return;

  const container = trigger.closest('.user-dropdown-container');
  document.addEventListener('click', (e) => {
    if (container.contains(e.target)) {
      container.classList.toggle('show');
    } else {
      container.classList.remove('show');
    }
  });
});

// ✅ Signup loader
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", function () {
      const btn = document.getElementById("signupBtn");
      const loader = document.getElementById("signupLoader");
      if (btn) btn.disabled = true;
      if (loader) loader.style.display = "block";
    });
  }
});

// ✅ Forgot Password from Login modal
document.addEventListener("DOMContentLoaded", () => {
  const forgotLink = document.getElementById("forgot-link"); 
  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchModal("login-modal", "forgotPasswordModal");
    });
  }

  const forgotBack = document.getElementById("forgot-back");
  if (forgotBack) {
    forgotBack.addEventListener("click", (e) => {
      e.preventDefault();
      switchModal("forgotPasswordModal", "login-modal");
    });
  }
});
