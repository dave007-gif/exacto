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

        if (response.ok) {
          const data = await response.json();
          alert("Signup successful! Redirecting to the calculation page...");
          console.log("Token:", data.token); // Log the token for debugging
          // Save the token to localStorage for future use
          localStorage.setItem("authToken", data.token);
          // Redirect to the calculation page
          window.location.href = "/calculation";
        } else {
          const error = await response.json();
          alert("Signup failed: " + error.message);
        }
      } catch (err) {
        console.error("Error during signup:", err);
        alert("An error occurred during signup. Please try again.");
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
          const data = await response.json();
          alert("Login successful!");
          // Save the token to localStorage for future use
          localStorage.setItem("authToken", data.token);
          // Redirect to the calculation page
          window.location.href = "/calculation";
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

  // Handle Logout
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      // Remove the token from localStorage
      localStorage.removeItem("authToken");
      alert("You have been logged out.");
      // Redirect to the login page
      window.location.href = "/login";
    });
  }

  // Handle loading the calculation page
  if (window.location.pathname === "/calculation") {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to access this page.");
      window.location.href = "/login";
      return;
    }

    // Fetch the calculation page content with the token
    fetch("/calculation", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }, // Correct format for Authorization header
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Unauthorized access. Please log in again.");
        }
      })
      .then((data) => {
        // Dynamically display the calculation page content
        document.body.innerHTML = `
          <h1>${data.message}</h1>
          <p>Here you can calculate building costs.</p>
        `;
      })
      .catch((err) => {
        console.error(err);
        alert(err.message);
        window.location.href = "/login";
      });
  }
});