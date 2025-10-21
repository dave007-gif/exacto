document.addEventListener("DOMContentLoaded", () => {
  // Change API_BASE to empty string to use root URLs directly
  const API_BASE = "";

  // --- Toast UI ---
  function ensureToastStyles() {
    if (document.getElementById('toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      #toast-container { position: fixed; top: 16px; right: 16px; z-index: 9999; }
      .toast {
        min-width: 260px; max-width: 420px; margin: 8px 0; padding: 12px 14px;
        border-radius: 6px; color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,0.15);
        font-size: 14px; display:flex; align-items:center; gap:8px; opacity:0; transform:translateY(-8px);
        animation: toast-in 180ms ease-out forwards;
      }
      .toast.success { background: #16a34a; }
      .toast.error { background: #dc2626; }
      .toast.info { background: #2563eb; }
      .toast .close { margin-left:auto; cursor:pointer; opacity:.9; }
      @keyframes toast-in { to { opacity:1; transform:translateY(0);} }
    `;
    document.head.appendChild(style);
  }
  function getToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    return c;
  }
  function showToast(message, type = 'info', timeout = 4500) {
    ensureToastStyles();
    const container = getToastContainer();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${message}</span><span class="close" aria-label="Close">✕</span>`;
    el.querySelector('.close').onclick = () => el.remove();
    container.appendChild(el);
    if (timeout > 0) setTimeout(() => el.remove(), timeout);
  }
  // Handle redirect toasts (?toast=success&msg=...)
  (function handleRedirectToast() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('toast');
    const msg = params.get('msg');
    if (t || msg) {
      const defMsg = t === 'success' ? 'Action completed successfully.' : t === 'error' ? 'An error occurred.' : 'Notice';
      showToast(decodeURIComponent(msg || defMsg), t || 'info');
    }
    // If reset flow (?open=reset&reset_token=...)
    const open = params.get('open');
    const token = params.get('reset_token');
    if (open === 'reset' && token) {
      const setToken = () => {
        const input = document.getElementById('reset-token');
        if (input) input.value = token;
        if (window.openModal) openModal('reset-modal');
      };
      if (document.readyState === 'complete') setToken(); else window.addEventListener('load', setToken);
    }
    // Clean URL
    if (t || msg || open || token) {
      params.delete('toast'); params.delete('msg'); params.delete('open'); params.delete('reset_token');
      const clean = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}${location.hash}`;
      history.replaceState({}, '', clean);
    }
  })();

  const setEstimateTargets = (authed) => {
    // Update to use direct paths
    const target = authed ? `/dashboard` : `/login`;
    document.getElementById("estimate-nav")?.setAttribute("href", target);
    document.getElementById("estimate-cta")?.setAttribute("href", target);
    document.getElementById("estimate-link")?.setAttribute("href", target);
  };

  async function isAuthenticated() {
    try {
      // Simplified to use direct API URL
      const res = await fetch(`/api/verify-auth`, {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      
      if (res.status !== 200) return false;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json")) return false;
      const data = await res.json().catch(() => null);
      return !!(data && data.valid === true);
    } catch {
      return false;
    }
  }

  async function getProfile() {
    try {
      // Simplified to use direct API URL
      const res = await fetch(`/api/profile`, {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function renderUserChip(profile) {
    const chip = document.getElementById("user-chip");
    const li = document.getElementById("nav-user");
    if (!chip || !li) return;
    const email = (profile?.email || "").trim();
    const initials = email ? email.charAt(0).toUpperCase() : "U";
    chip.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;justify-content:center;align-items:center;width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;font-weight:700;">${initials}</span>
        <span style="opacity:.9;">${email || 'Signed in'}</span>
      </span>
    `;
    li.style.display = "";
    // Optionally show Dashboard link if present
    const navDash = document.getElementById("nav-dashboard");
    if (navDash) navDash.style.display = "";
  }

  async function refreshNav() {
    const authed = await isAuthenticated();
    const loginLi = document.getElementById("nav-login");
    const signupLi = document.getElementById("nav-signup");
    const logoutLi = document.getElementById("nav-logout");
    const userLi = document.getElementById("nav-user");
    const navDash = document.getElementById("nav-dashboard");

    if (loginLi) loginLi.style.display = authed ? "none" : "";
    if (signupLi) signupLi.style.display = authed ? "none" : "";
    // Always keep old Logout hidden
    if (logoutLi) logoutLi.style.display = "none";

    if (!authed) {
      if (userLi) userLi.style.display = "none";
      if (navDash) navDash.style.display = "none";
      setEstimateTargets(false);
      return;
    }

    const profile = await getProfile();
    renderUserChip(profile);
    setEstimateTargets(true);
  }

  window.initAuthUI = refreshNav;

  document.getElementById("logout-link")?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      // Simplified to use direct path
      await fetch(`/logout`, { method: "POST", credentials: "include" });
    } catch {}
    showToast("Logged out.", "info");
    // Navigate home
    window.location.href = "/";
  });

  const preventSubmit = (form) => form && form.addEventListener("submit", (e) => e.preventDefault());

  const signupForm = document.getElementById("signup-form");
  preventSubmit(signupForm);
  if (signupForm) {
    document.getElementById("signup-btn")?.addEventListener("click", async () => {
      const email = (signupForm.querySelector('#signup-email, [name="email"]')?.value || '').trim();
      const password = (signupForm.querySelector('#signup-password, [name="password"]')?.value || '').trim();
      const role = (signupForm.querySelector('#user_type, [name="user_type"]')?.value || '').trim() || 'student';
      if (!email || !password) return showToast("Please fill in email and password.", "error");
      try {
        // Updated to use direct path
        const res = await fetch(`/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email, password, role }),
          credentials: "include"
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.closeModal && window.closeModal("signup-modal");
          showToast(data.message || "Signup successful. Check your email to verify.", "success");
        } else {
          showToast(data.message || "Signup failed", "error");
        }
      } catch { showToast("Network error. Try again.", "error"); }
    });
  }

  const loginForm = document.getElementById("login-form");
  preventSubmit(loginForm);
  if (loginForm) {
    document.getElementById("login-btn")?.addEventListener("click", async () => {
      const email = (loginForm.querySelector('#login-email, [name="email"], [name="identifier"]')?.value || '').trim();
      const password = (loginForm.querySelector('#login-password, [name="password"]')?.value || '').trim();
      if (!email || !password) return showToast("Please enter both email and password.", "error");
      try {
        // Updated to use direct path
        const res = await fetch(`/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include"
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.closeModal && window.closeModal("login-modal");
          showToast("Login successful.", "success");
          await refreshNav();
        } else {
          showToast(data.message || "Login failed", "error");
        }
      } catch { showToast("Network error. Try again.", "error"); }
    });
  }

  // Resend verification handlers
  const resendForm = document.getElementById("resend-form");
  preventSubmit(resendForm);
  if (resendForm) {
    document.getElementById("resend-btn")?.addEventListener("click", async () => {
      const email = (document.getElementById("resend-email")?.value || '').trim();
      if (!email) return showToast("Enter your email.", "error");
      try {
        // Updated to use direct path
        const res = await fetch(`/resend-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        window.closeModal && window.closeModal("resend-modal");
        showToast(data.message || "If your email exists, a new verification link has been sent.", "info");
      } catch {
        showToast("Could not send verification email. Try again.", "error");
      }
    });
  }

  // Forgot password
  const forgotForm = document.getElementById("forgot-form");
  preventSubmit(forgotForm);
  if (forgotForm) {
    document.getElementById("forgot-btn")?.addEventListener("click", async () => {
      const email = (document.getElementById("forgot-email")?.value || "").trim();
      if (!email) return showToast("Enter your email.", "error");
      try {
        // Updated to use direct path
        const res = await fetch(`/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        window.closeModal && window.closeModal("forgot-modal");
        showToast(data.message || "If the email exists, a reset link has been sent.", "info");
      } catch {
        showToast("Could not send reset email. Try again.", "error");
      }
    });
  }

  // Reset password submit
  const resetForm = document.getElementById("reset-form");
  preventSubmit(resetForm);
  if (resetForm) {
    document.getElementById("submit-reset")?.addEventListener("click", async () => {
      const token = (document.getElementById("reset-token")?.value || "").trim();
      const p1 = (document.getElementById("reset-password")?.value || "").trim();
      const p2 = (document.getElementById("reset-password2")?.value || "").trim();
      if (!p1 || !p2) return showToast("Enter and confirm your new password.", "error");
      if (p1 !== p2) return showToast("Passwords do not match.", "error");
      if (p1.length < 8) return showToast("Password must be at least 8 characters.", "error");
      try {
        // Updated to use direct path
        const res = await fetch(`/reset-password/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ password: p1 })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          window.closeModal && window.closeModal("reset-modal");
          showToast(data.message || "Password reset successful. You can now log in.", "success");
          // Optionally open login modal
          setTimeout(() => window.openModal && openModal('login-modal'), 250);
        } else {
          showToast(data.message || "Reset failed. The link may be invalid or expired.", "error");
        }
      } catch {
        showToast("Network error. Try again.", "error");
      }
    });
  }

  refreshNav();
});

(function () {
  const originalInit = window.initAuthUI;

  function setupUserMenuToggle() {
    const chip = document.getElementById('user-chip');
    const menu = document.getElementById('user-menu');
    if (!chip || !menu) return;

    const container = chip.closest('li');
    if (container) container.style.position = 'relative';

    const close = () => {
      menu.hidden = true;
      chip.setAttribute('aria-expanded', 'false');
    };

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      // close any other open menus
      document.querySelectorAll('.user-menu').forEach(m => (m.hidden = true));
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      chip.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (e) => {
      if (!container || container.contains(e.target)) return;
      close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const menuLogout = document.getElementById('user-menu-logout');
    if (menuLogout) {
      menuLogout.addEventListener('click', (e) => {
        e.preventDefault();
        // Reuse existing logout handler
        const hiddenLogout = document.getElementById('logout-link');
        if (hiddenLogout) hiddenLogout.click();
      });
    }
  }

  window.initAuthUI = async function (...args) {
    const ret = originalInit ? await originalInit.apply(this, args) : undefined;

    // Never show the old Logout link
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) navLogout.style.display = 'none';

    // If authenticated, show chip and fill email
    try {
      // Already using direct path here - good!
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (res.ok) {
        const profile = await res.json().catch(() => ({}));
        const navUser = document.getElementById('nav-user');
        const emailEl = document.getElementById('user-email');
        if (navUser) navUser.style.display = 'inline-block';
        if (emailEl && profile?.email) emailEl.textContent = profile.email;
        setupUserMenuToggle();
      } else {
        const navUser = document.getElementById('nav-user');
        if (navUser) navUser.style.display = 'none';
      }
    } catch {}
    return ret;
  };
})();

