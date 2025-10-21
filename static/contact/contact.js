document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector('.contact-form');
  const statusMsg = document.getElementById('form-status');

  if (form && statusMsg) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = form.querySelector('button');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      const formData = new FormData(form);

      try {
        // Later you can replace `"#"` with your real backend endpoint URL
        const response = await fetch("#", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          showStatus("✅ Message sent successfully!", "success");
          form.reset();
        } else {
          showStatus("❌ Failed to send. Try again later.", "error");
        }
      } catch (error) {
        showStatus("⚠️ Network error. Please check your connection.", "error");
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    });

    function showStatus(message, type) {
      statusMsg.textContent = message;
      statusMsg.style.display = 'block';
      statusMsg.style.color = type === 'success' ? 'green' : 'red';
      
      // Optional fade effect
      statusMsg.classList.add('show');
      setTimeout(() => {
        statusMsg.classList.remove('show');
        statusMsg.style.display = 'none';
      }, 4000);
    }
  }
});
