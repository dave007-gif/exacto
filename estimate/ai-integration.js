// AI Service Integration
const AI_API_ENDPOINT = "https://your-ai-service.com/api";

async function askAI() {
  const query = document.getElementById('aiSearch').value;
  if (!query) return;
  
  try {
    const response = await axios.post(`${AI_API_ENDPOINT}/query`, {
      question: query,
      context: currentCategory 
        ? `SMM7 Section: ${currentCategory}` 
        : "General construction estimation"
    });
    
    displayAIResults(response.data);
  } catch (error) {
    console.error("AI Error:", error);
    alert("AI service unavailable. Please try later.");
  }
}

function displayAIResults(data) {
  const resultArea = document.getElementById('aiResults');
  resultArea.innerHTML = `
    <div class="ai-response">
      <h4>AI Analysis:</h4>
      <p>${data.text_response}</p>
      ${data.estimated_cost ? `<p><strong>Estimated Cost:</strong> £${data.estimated_cost.toLocaleString()}</p>` : ''}
    </div>
  `;
  
  // If the AI suggests form updates
  if (data.suggested_fields) {
    updateFormWithAI(data.suggested_fields);
  }
}

async function processTakeoff() {
  const fileInput = document.getElementById('fileUpload');
  if (!fileInput.files.length) return;
  
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('category', currentCategory);
  
  try {
    const response = await axios.post(`${AI_API_ENDPOINT}/takeoff`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    document.getElementById('takeoffResults').innerHTML = `
      <h3>Takeoff Results</h3>
      <pre>${JSON.stringify(response.data.quantities, null, 2)}</pre>
      <button onclick="importTakeoffData()">Import to Estimate</button>
    `;
  } catch (error) {
    console.error("Takeoff Error:", error);
  }
}

function importTakeoffData() {
  // Would map AI-extracted quantities to the form
  alert("Takeoff data imported to form!");
}