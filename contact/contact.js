document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector('.contact-form');
  const statusMsg = document.getElementById('form-status');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      
      // Optional: Handle form data here if needed

      statusMsg.style.display = 'block';
      statusMsg.textContent = "Message sent!";
      form.reset();
    });
  }
});
