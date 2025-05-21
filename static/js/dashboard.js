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

async function loadProjects() {
    try {
        const res = await fetch('/api/projects', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch projects');
        const projects = await res.json();
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = '';
        projects.forEach(project => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.innerHTML = `
                <h4>${project.project_name}</h4>
                <p>Total Cost: GHS ${project.total_cost}</p>
                <p>Date: ${project.created_at || ''}</p>
            `;
            projectList.appendChild(div);
        });
        // Update active projects count
        const activeCount = document.getElementById('active-projects-count');
        if (activeCount) activeCount.textContent = projects.length;
    } catch (err) {
        console.error('Error loading projects:', err);
    }
}

// In dashboard.js
const createProjectBtn = document.getElementById('create-project-btn');
if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => {
        window.location.href = '/calculation'; // or whatever your calculation page route is
    });
}