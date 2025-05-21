document.addEventListener("DOMContentLoaded", () => {
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
}