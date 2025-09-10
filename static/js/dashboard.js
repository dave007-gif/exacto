let currentFilter = 'recent';

async function loadProjects(filter = 'recent', search = '') {
    currentFilter = filter;
    const projectList = document.getElementById('project-list');
    if (!projectList) return;

    projectList.innerHTML = '<p>Loading projects...</p>';

    let url = `/api/projects?filter=${filter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
            projectList.innerHTML = '<p>Could not load projects.</p>';
            return;
        }
        const data = await res.json();

        // Accept multiple shapes from backend
        const projects = Array.isArray(data) ? data : (data.projects || data.results || []);
        if (!projects || projects.length === 0) {
            console.debug('loadProjects: backend returned no projects', data);
            projectList.innerHTML = '<p>No projects found.</p>';
            return;
        }

        projectList.innerHTML = '';
        projects.forEach(project => {
            const pid = project.id || project.project_id || project.projectId || project._id;
            const name = project.project_name || project.name || project.projectName || 'Untitled Project';
            const lastModifiedRaw = project.last_modified || project.updated_at || project.modified || project.lastModified;
            const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw).toLocaleString() : '';

            if (!pid) return;
            const link = document.createElement('a');
            link.href = `/calculation?project_id=${encodeURIComponent(pid)}`;
            link.textContent = `${name}${ lastModified ? ' (Last modified: ' + lastModified + ')' : '' }`;
            link.className = 'project-link';
            link.style.display = 'block';
            projectList.appendChild(link);
        });
    } catch (err) {
        console.error('loadProjects error:', err);
        projectList.innerHTML = '<p>Error loading projects.</p>';
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/activity', { credentials: 'include' });
        if (!response.ok) return;
        const activities = await response.json();
        const feed = document.getElementById('activity-list');
        if (!feed) return;
        feed.innerHTML = '';
        activities.forEach(activity => {
            feed.innerHTML += `
                <div class="activity-item">
                    <small>${new Date(activity.timestamp).toLocaleString()}</small>
                    <p>${activity.description}</p>
                </div>
            `;
        });
    } catch (e) {
        console.debug('loadRecentActivity failed:', e);
    }
}

function searchProjects() {
    const search = document.getElementById('project-search')?.value || '';
    loadProjects(currentFilter, search);
}

document.addEventListener('DOMContentLoaded', () => {
    // Role-based visibility (guard userRoles)
    try {
        const roleElements = document.querySelectorAll('[data-role]');
        roleElements.forEach(el => {
            const requiredRole = el.dataset.role;
            el.style.display = (window.userRoles || []).includes(requiredRole) ? 'block' : 'none';
        });
    } catch (e) {
        console.debug('role visibility skipped:', e);
    }

    // Activity stream (guard errors)
    const activityList = document.getElementById('activity-list');
    try {
        const eventSource = new EventSource('/api/activity/stream');
        eventSource.onmessage = (event) => {
            try {
                const activity = JSON.parse(event.data);
                const div = document.createElement('div');
                div.className = 'activity-item';
                div.innerHTML = `
                    <span class="activity-time">${new Date(activity.timestamp).toLocaleString()}</span>
                    <span class="activity-type">${activity.type}</span>
                    <p>${activity.description}</p>
                `;
                if (activityList) activityList.prepend(div);
            } catch (err) {
                console.debug('Invalid activity message', err);
            }
        };
        eventSource.onerror = (err) => {
            console.debug('EventSource error (activity stream):', err);
            eventSource.close();
        };
    } catch (err) {
        console.debug('Could not open activity stream:', err);
    }

    // Load initial data
    loadProjects('recent');
    loadRecentActivity();

    // Preferred supplier display
    const supplier = JSON.parse(localStorage.getItem('preferred_supplier') || 'null');
    const display = document.getElementById('preferred-supplier-name');
    if (display) display.textContent = supplier?.name || 'None selected';

    // Logout (guarded)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const resp = await fetch('/logout', { method: 'POST', credentials: 'include' });
                if (resp.ok) window.location.href = '/login';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    } else {
        console.debug('logout-btn not found in DOM');
    }

    // Create project (guarded)
    const createBtn = document.getElementById('create-project-btn');
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const name = prompt('Enter a name for your new project:');
            if (!name) return;

            const supplier = JSON.parse(localStorage.getItem('preferred_supplier') || 'null');
            const supplierId = supplier?.id || supplier?.supplier_id || null;

            try {
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ project_name: name, name, supplier_id: supplierId })
                });

                if (!res.ok) {
                    alert('Failed to create project');
                    return;
                }

                const data = await res.json();
                const newId = data.id || data.project_id || data.projectId || data._id;
                if (!newId) {
                    await loadProjects(currentFilter);
                    alert('Project created but no id returned. You should see it in the list.');
                    return;
                }

                window.location.href = `/calculation?project_id=${encodeURIComponent(newId)}`;
            } catch (err) {
                console.error('create project error:', err);
                alert('Failed to create project');
            }
        });
    } else {
        console.debug('create-project-btn not present for this role/view');
    }
});

// Expose for inline handlers if used
window.searchProjects = searchProjects;