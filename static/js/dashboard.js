// static/js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Role-based element visibility
    const roleElements = document.querySelectorAll('[data-role]');
    roleElements.forEach(element => {
        const requiredRole = element.dataset.role;
        element.style.display = userRoles.includes(requiredRole) ? 'block' : 'none';
    });

    // Real-time activity updates
    const activityList = document.getElementById('activity-list');
    const eventSource = new EventSource('/api/activity/stream');
    
    eventSource.onmessage = (event) => {
        const activity = JSON.parse(event.data);
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <span class="activity-time">${new Date(activity.timestamp).toLocaleString()}</span>
            <span class="activity-type">${activity.type}</span>
            <p>${activity.description}</p>
        `;
        activityList.prepend(activityItem);
    };

    loadProjects();
});

// Enhanced logout handling
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

// Fetch and display user's projects
async function loadProjects() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;

    // Clear any existing content
    projectList.innerHTML = '<p>Loading projects...</p>';

    try {
        const res = await fetch('/api/projects', { credentials: 'include' });
        if (!res.ok) {
            projectList.innerHTML = '<p>Could not load projects.</p>';
            return;
        }
        const data = await res.json();
        const projects = data.projects || [];

        if (projects.length === 0) {
            projectList.innerHTML = '<p>No projects found.</p>';
            return;
        }

        // Build the list
        projectList.innerHTML = '';
        projects.forEach(project => {
            const link = document.createElement('a');
            link.href = `/calculation?project_id=${project.id}`;
            link.textContent = `${project.project_name} (Last modified: ${new Date(project.last_modified).toLocaleString()})`;
            link.className = 'project-link';
            link.style.display = 'block';
            projectList.appendChild(link);
        });
    } catch (err) {
        projectList.innerHTML = '<p>Error loading projects.</p>';
    }
}

// In dashboard.js
document.getElementById('create-project-btn').addEventListener('click', async () => {
    const name = prompt("Enter a name for your new project:");
    if (!name) return;
    // Create project in backend
    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ name })
    });
    if (!res.ok) {
        alert('Failed to create project');
        return;
    }
    const { id } = await res.json();
    // Redirect to calculation page with project_id
    window.location.href = `/calculation?project_id=${id}`;
});

// static/js/dashboard.js
async function loadRecentActivity() {
  const response = await fetch('/api/activity', { credentials: 'include' });
  const activities = await response.json();
  const feed = document.getElementById('activity-list');
  feed.innerHTML = '';
  activities.forEach(activity => {
    feed.innerHTML += `
      <div class="activity-item">
        <small>${new Date(activity.timestamp).toLocaleString()}</small>
        <p>${activity.description}</p>
      </div>
    `;
  });
}
document.addEventListener('DOMContentLoaded', loadRecentActivity);