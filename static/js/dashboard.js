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

            const row = document.createElement('div');
            row.className = 'project-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.margin = '6px 0';

            const link = document.createElement('a');
            link.href = `/calculation?project_id=${encodeURIComponent(pid)}`;
            link.textContent = `${name}${ lastModified ? ' (Last modified: ' + lastModified + ')' : '' }`;
            link.className = 'project-link';
            link.style.flex = '1';

            const archiveBtn = document.createElement('button');
            archiveBtn.textContent = 'Archive';
            archiveBtn.title = 'Archive project';
            archiveBtn.onclick = async () => {
                if (!confirm('Archive this project?')) return;
                try {
                    const r = await fetch(`/api/projects/${encodeURIComponent(pid)}/archive`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                    if (r.ok) {
                        row.remove();
                    } else {
                        alert('Failed to archive project');
                    }
                } catch (e) {
                    console.error('archive error:', e);
                    alert('Network error archiving project');
                }
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.title = 'Delete project permanently';
            deleteBtn.style.color = '#b00020';
            deleteBtn.onclick = async () => {
                if (!confirm('Delete this project permanently? This cannot be undone.')) return;
                try {
                    const r = await fetch(`/api/projects/${encodeURIComponent(pid)}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    if (r.ok || r.status === 204) {
                        row.remove();
                    } else if (r.status === 405 || r.status === 404) {
                        // If hard delete not supported, fallback to archive
                        const ar = await fetch(`/api/projects/${encodeURIComponent(pid)}/archive`, {
                            method: 'POST',
                            credentials: 'include'
                        });
                        if (ar.ok) row.remove();
                        else alert('Delete not supported and archive failed.');
                    } else {
                        alert('Failed to delete project');
                    }
                } catch (e) {
                    console.error('delete error:', e);
                    alert('Network error deleting project');
                }
            };

            row.appendChild(link);
            row.appendChild(archiveBtn);
            row.appendChild(deleteBtn);
            projectList.appendChild(row);
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

// Uploader UX: status + staged upload modal
async function getUploaderStatus() {
  try {
    console.log('[UPLOADER] fetching status...');
    const res = await fetch('/api/uploader/status', { credentials: 'include' });
    if (!res.ok) throw new Error(`status http=${res.status}`);
    const json = await res.json();
    console.log('[UPLOADER] status ok:', json);
    return json;
  } catch (e) {
    const fallback = { has_role: (window.userRoles || []).includes('uploader'), latest_request: null };
    console.warn('[UPLOADER] status fallback (likely unauth route or missing token):', e, '→', fallback);
    return fallback;
  }
}

function setUploaderControls(state) {
  console.log('[UPLOADER] set controls with state:', state, 'roles:', window.userRoles);
  const statusBadge = document.getElementById('uploader-status-badge');
  const reqBtn = document.getElementById('request-uploader-btn');
  const uploadBtn = document.getElementById('bulk-upload-btn');
  const navBtn = document.getElementById('open-bulk-upload-nav');
  const container = document.getElementById('uploader-controls');

  const roles = window.userRoles || [];
  const isAdmin = roles.includes('admin');
  const isUploader = state.has_role || roles.includes('uploader');

  if (container) container.style.display = (isAdmin || isUploader || roles.includes('professional') || roles.includes('firm')) ? 'block' : 'none';

  let label = 'Uploader: ';
  if (isUploader || isAdmin) {
    label += 'Approved ✅';
    if (reqBtn) reqBtn.style.display = 'none';
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Bulk CSV Upload'; }
    if (navBtn) { navBtn.disabled = false; }
  } else {
    const status = state.latest_request?.status;
    if (status === 'pending') {
      label += 'Pending ⏳';
      if (reqBtn) { reqBtn.disabled = true; reqBtn.textContent = 'Request Pending'; reqBtn.style.display = 'inline-block'; }
      if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = 'Awaiting Approval'; }
      if (navBtn) { navBtn.disabled = true; }
    } else {
      label += 'Not requested ❌';
      if (reqBtn) { reqBtn.disabled = false; reqBtn.textContent = 'Request Uploader Access'; reqBtn.style.display = 'inline-block'; }
      if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = 'Upload (requires approval)'; }
      if (navBtn) { navBtn.disabled = true; }
    }
  }
  if (statusBadge) statusBadge.textContent = label;
  console.log('[UPLOADER] controls set. label=', label, 'disabled upload=', uploadBtn?.disabled, 'nav disabled=', navBtn?.disabled);
}

async function submitStagedUpload() {
  const fileEl = document.getElementById('upload-file');
  const catEl = document.getElementById('upload-category');
  const file = fileEl?.files?.[0];
  const category = catEl?.value;

  console.log('[UPLOAD] submit clicked. file?', !!file, 'category=', category);
  if (!file) return alert('Select a CSV file.');
  if (!category) return alert('Select a category.');

  const form = new FormData();
  form.append('file', file);

  try {
    const res = await fetch(`/api/upload-prices/${encodeURIComponent(category)}`, {
      method: 'POST',
      body: form,
      credentials: 'include'
    });
    let data = {};
    try { data = await res.json(); } catch {}
    console.log('[UPLOAD] response http=', res.status, 'payload=', data);

    if (res.status === 202 || res.ok) {
      alert(data.message || 'File staged for validation/approval.');
      closeUploadModal();
    } else if (res.status === 403) {
      alert('You are not approved to upload. Please request uploader access.');
    } else {
      alert(data.message || 'Upload failed.');
    }
  } catch (e) {
    console.error('[UPLOAD] network error:', e);
    alert('Network error during upload.');
  }
}

async function requestUploaderAccess() {
  const reason = prompt('Briefly explain why you need uploader access (optional):') || '';
  console.log('[UPLOADER] request access clicked. reason length=', reason.length);
  try {
    const res = await fetch('/api/uploader/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    let data = {};
    try { data = await res.json(); } catch {}
    console.log('[UPLOADER] request response http=', res.status, 'payload=', data);
    alert(data.message || (res.ok ? 'Request submitted' : 'Request failed'));
    const status = await getUploaderStatus();
    setUploaderControls(status);
  } catch (e) {
    console.error('[UPLOADER] request error:', e);
    alert('Network error. Try again.');
  }
}

async function generateUntitledName() {
  try {
    // Fetch enough to cover common cases
    const res = await fetch('/api/projects?filter=all&page=1&page_size=300', { credentials: 'include' });
    if (!res.ok) return 'Untitled Project';
    const data = await res.json();
    const projects = Array.isArray(data) ? data : (data.projects || data.results || []);
    const names = new Set(projects.map(p => String(p.project_name || p.name || '').trim().toLowerCase()));

    // Find max suffix used
    let max = 0;
    const re = /^untitled project(?:\s*(\d+))?$/i;
    for (const p of projects) {
      const m = String(p.project_name || p.name || '').trim().match(re);
      if (m) {
        max = Math.max(max, m[1] ? parseInt(m[1], 10) : 1);
      }
    }
    if (!names.has('untitled project')) return 'Untitled Project';
    return `Untitled Project ${max + 1}`;
  } catch {
    return 'Untitled Project';
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  console.log('[BOOT] DOM ready. roles=', window.userRoles);
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

  // Wire uploader controls
  const uploadBtn = document.getElementById('bulk-upload-btn');
  const navBtn = document.getElementById('open-bulk-upload-nav');
  const requestBtn = document.getElementById('request-uploader-btn');
  const submitBtn = document.getElementById('upload-submit');
  const cancelBtn = document.getElementById('upload-cancel');

  try {
    const status = await getUploaderStatus();
    setUploaderControls(status);
  } catch (e) {
    console.warn('[UPLOADER] status unavailable:', e);
  }

  if (uploadBtn) uploadBtn.addEventListener('click', () => { console.log('[UI] bulk-upload-btn click'); openUploadModal(); });
  if (navBtn) navBtn.addEventListener('click', () => { console.log('[UI] open-bulk-upload-nav click'); openUploadModal(); });
  if (requestBtn) requestBtn.addEventListener('click', () => { console.log('[UI] request-uploader-btn click'); requestUploaderAccess(); });
  if (submitBtn) submitBtn.addEventListener('click', () => { console.log('[UI] upload-submit click'); submitStagedUpload(); });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { console.log('[UI] upload-cancel click'); closeUploadModal(); });

  // ...existing code...
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

 // Create project (guarded) — no prompt, auto-untitled unique name
  const createBtn = document.getElementById('create-project-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      try {
        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';

        const name = await generateUntitledName();
        const supplier = JSON.parse(localStorage.getItem('preferred_supplier') || 'null');
        const supplierId = supplier?.id || supplier?.supplier_id || null;

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

        // Open the calculator with the new project_id
        window.location.href = `/calculation?project_id=${encodeURIComponent(newId)}`;
      } catch (err) {
        console.error('create project error:', err);
        alert('Failed to create project');
      } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Project';
      }
    });
  } else {
    console.debug('create-project-btn not present for this role/view');
  }

});
// Expose for inline handlers if used
window.searchProjects = searchProjects;
