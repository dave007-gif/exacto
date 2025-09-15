document.addEventListener("DOMContentLoaded", () => {
  // === SIGNUP ===
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    document.getElementById("signup-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      const fullName = signupForm.querySelector("[name='full_name']").value.trim();
      const username = signupForm.querySelector("[name='username']").value.trim();
      const email = signupForm.querySelector("[name='email']").value.trim();
      const password = signupForm.querySelector("[name='password']").value.trim();
      const confirmPassword = signupForm.querySelector("[name='confirm_password']").value.trim();
      const userTypeEl = signupForm.querySelector("[name='user_type']");
      const userType = userTypeEl ? userTypeEl.value : "student"; // default

      if (!fullName || !username || !email || !password || !confirmPassword) {
        alert("Please fill in all required fields.");
        return;
      }
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      try {
        const response = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: fullName, username, email, password, role: userType }),
        });
        const data = await response.json();

        if (response.ok) {
          alert("Signup successful! Please check your email to verify your account.");
          closeModal("signup-modal");
          openModal("login-modal");
        } else {
          alert(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error("Error during signup:", error);
        alert("An unexpected error occurred. Please try again.");
      }
    });
  }

  // === LOGIN ===
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    document.getElementById("login-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      const identifier = loginForm.querySelector("[name='identifier']").value.trim();
      const password = loginForm.querySelector("[name='password']").value.trim();

      if (!identifier || !password) {
        alert("Please enter both email/username and password.");
        return;
      }

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json();

        if (response.ok) {
          alert("Login successful!");
          window.location.href = data.redirect || "/dashboard";
        } else if (data.message?.includes("verify your email")) {
          alert("Your account is not verified. Please check your email.");
        } else {
          alert("Login failed: " + (data.message || "Unknown error"));
        }
      } catch (err) {
        console.error("Error during login:", err);
        alert("An unexpected error occurred. Please try again.");
      }
    });
  }
});
