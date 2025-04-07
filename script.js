// Toggle Mobile Menu
function toggleMenu() {
    const menu = document.getElementById('menu-links');
    menu.classList.toggle('show');
}

function showForm(type) {
    const formContainer = document.getElementById('form-container');
    const formTitle = document.getElementById('form-title');
    const formFields = document.getElementById('form-fields');
    
    const formTemplates = {
        'excavation': `<label for="depth">Excavation Depth (m):</label>
                       <input type="number" id="depth" name="depth" required>`,
        'trench': `<label for="length">Trench Length (m):</label>
                   <input type="number" id="length" name="length" required>
                   <label for="width">Trench Width (m):</label>
                   <input type="number" id="width" name="width" required>`,
        'column': `<label for="count">Number of Columns:</label>
                   <input type="number" id="count" name="count" required>
                   <label for="size">Column Size (cm x cm):</label>
                   <input type="text" id="size" name="size" placeholder="e.g., 30x30" required>`,
        'iron_rod': `<label for="iron_weight">Iron Rod Weight (kg):</label>
                     <input type="number" id="iron_weight" name="iron_weight" required>`,
        'pillar': `<label for="pillar_count">Number of Pillars:</label>
                   <input type="number" id="pillar_count" name="pillar_count" required>`,
        'concrete': `<label for="concrete_volume">Concrete Volume (cubic meters):</label>
                     <input type="number" id="concrete_volume" name="concrete_volume" required>`,
        'slab': `<label for="slab_thickness">Slab Thickness (cm):</label>
                 <input type="number" id="slab_thickness" name="slab_thickness" required>`,
        'upper_slab': `<label for="upper_slab_thickness">Upper Slab Thickness (cm):</label>
                       <input type="number" id="upper_slab_thickness" name="upper_slab_thickness" required>`,
        'block_work': `<label for="block_count">Number of Blocks Used:</label>
                      <input type="number" id="block_count" name="block_count" required>`,
        'dpm': `<label for="dpm_area">Damp Proof Membrane Area (sqm):</label>
                <input type="number" id="dpm_area" name="dpm_area" required>`,
        'wall_block': `<label for="wall_block_count">Number of Wall Blocks:</label>
                       <input type="number" id="wall_block_count" name="wall_block_count" required>`,
        'roofing': `<label for="roof_area">Roof Area (sqm):</label>
                    <input type="number" id="roof_area" name="roof_area" required>`,
        'plastering': `<label for="plaster_area">Wall Plastering Area (sqm):</label>
                       <input type="number" id="plaster_area" name="plaster_area" required>`,
        'interior': `<label for="interior_details">Interior Finish Details:</label>
                     <textarea id="interior_details" name="interior_details" required></textarea>`
    };
    
    formTitle.textContent = type.replace('_', ' ').toUpperCase();
    formFields.innerHTML = formTemplates[type] || '<p>No form available.</p>';
    formContainer.style.display = 'block';
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
  }

  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }

  function switchModal(currentId, targetId) {
    closeModal(currentId);
    openModal(targetId);
  }

  // Close modal if click outside the modal content
  window.onclick = function(event) {
    document.querySelectorAll(".modal").forEach(modal => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }