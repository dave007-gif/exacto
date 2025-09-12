/*document.addEventListener("DOMContentLoaded", () => {
  // Handle Signup Form Submission
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    document.getElementById("signup-btn").addEventListener("click", async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const userType = document.getElementById("user_type").value;

      try {
        const response = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, user_type: userType }),
        });

        const data = await response.json();

        if (response.ok) {
          alert("Signup successful! Redirecting to login...");
          window.location.href = "/login"; // Redirect to login page
        } else {
          alert(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error("Error during signup:", error);
        alert("An error occurred. Please try again.");
      }
    });
  }

  // Handle Login Form Submission
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    document.getElementById("login-btn").addEventListener("click", async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          alert("Login successful!");
          window.location.href = "/dashboard"; // Redirect
        } else {
          const error = await response.json();
          alert("Login failed: " + error.message);
        }
      } catch (err) {
        console.error("Error during login:", err);
        alert("An error occurred during login. Please try again.");
      }
    });
  }
});

// Add to existing auth.js
// Handle Forgot Password
const forgotPasswordForm = document.getElementById('forgot-password-form');
if (forgotPasswordForm) {
    document.getElementById('reset-btn').addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            alert(data.message);
            if (response.ok) window.location.href = '/login';
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        }
    });
}

// Handle Password Reset
const resetPasswordForm = document.getElementById('reset-password-form');
if (resetPasswordForm) {
    document.getElementById('submit-reset').addEventListener('click', async () => {
        const token = document.getElementById('token').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            alert(data.message);
            if (response.ok) window.location.href = '/login';
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        }
    });
}*/

document.addEventListener("DOMContentLoaded", () => {
  // Prevent accidental GET submits
  const preventSubmit = (form) => form && form.addEventListener("submit", (e) => e.preventDefault());

  // Signup
  const signupForm = document.getElementById("signup-form");
  preventSubmit(signupForm);
  if (signupForm) {
    document.getElementById("signup-btn").addEventListener("click", async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const userType = document.getElementById("user_type").value;
      if (!email || !password || !userType) return alert("Please fill in all required fields.");

      try {
        const res = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: userType }),
        });
        const data = await res.json();
        if (res.ok) {
          alert("Signup successful! Check your email to verify before logging in.");
          window.location.href = "/login";
        } else {
          alert(`Error: ${data.message}`);
        }
      } catch {
        alert("An unexpected error occurred. Please try again.");
      }
    });
  }

  // Login
  const loginForm = document.getElementById("login-form");
  preventSubmit(loginForm);
  if (loginForm) {
    document.getElementById("login-btn").addEventListener("click", async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      if (!email || !password) return alert("Please enter both email and password.");
	
      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          alert("Login successful!");
          window.location.href = data.redirect || "/dashboard";
        } else if (data.message?.includes("verify your email")) {
          alert("Your account is not verified. Check your email for the verification link.");
        } else {
          alert("Login failed: " + (data.message || "Unknown error"));
        }
      } catch {
        alert("An unexpected error occurred. Please try again.");
      }
    });
  }

  // Forgot Password -> POST /forgot-password
  const forgotForm = document.getElementById("forgot-password-form");
  preventSubmit(forgotForm);
  if (forgotForm) {
    document.getElementById("reset-btn").addEventListener("click", async () => {
      const email = document.getElementById("email").value.trim();
      if (!email) return alert("Please enter your email.");

      try {
        const res = await fetch("/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        alert(data.message || (res.ok ? "Reset link sent if email exists" : "Failed to send reset link"));
        if (res.ok) window.location.href = "/login";
      } catch {
        alert("Network error. Try again.");
      }
    });
  }

  // Reset Password -> POST /reset-password/<token>
  const resetForm = document.getElementById("reset-password-form");
  preventSubmit(resetForm);
  if (resetForm) {
    document.getElementById("submit-reset").addEventListener("click", async () => {
      const token = document.getElementById("token")?.value.trim();
      const password = document.getElementById("password")?.value.trim();
      if (!password) return alert("Please enter a new password.");

      try {
        const res = await fetch(`/reset-password/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = await res.json().catch(() => ({}));
        alert(data.message || (res.ok ? "Password updated successfully" : "Failed to update password"));
        if (res.ok) window.location.href = "/login";
      } catch {
        alert("Network error. Try again.");
      }
    });
  }

  // Resend verification
  const resendVerifyBtn = document.getElementById("resend-verify-btn");
  if (resendVerifyBtn) {
    resendVerifyBtn.addEventListener("click", async () => {
      const email = document.getElementById("resend-verify-email").value.trim();
      if (!email) return alert("Enter your email.");
      try {
        const res = await fetch("/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        alert(data.message);
      } catch {
        alert("Error resending verification.");
      }
    });
  }

  // Resend reset link
  const resendResetBtn = document.getElementById("resend-reset-btn");
  if (resendResetBtn) {
    resendResetBtn.addEventListener("click", async () => {
      const email = document.getElementById("resend-reset-email").value.trim();
      if (!email) return alert("Enter your email.");
      try {
        const res = await fetch("/resend-reset-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        alert(data.message);
      } catch {
        alert("Error resending reset link.");
      }
    });
  }
});

