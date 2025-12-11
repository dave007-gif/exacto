// Replace the app root detection with a simple empty string
// No longer need to detect mount points since we're serving from root
function detectAppRoot() {
  return ''; // Always return empty string since we're at root
}

const APP_ROOT = '';  // Directly set to empty string
console.debug('[APP] root detected: (root)');

// Centralized API paths - simplified without APP_ROOT variable
const API = {
  projects: '/api/projects',
  activity: '/api/activity',
  uploaderStatus: '/api/uploader/status',
  uploadPrices: (category) => `/api/upload-prices/${encodeURIComponent(category)}`,
  uploaderRequest: '/api/uploader/request',
  logoutExacto: '/logout',
  logout: '/logout',
  calculation: (pid) => `/calculation?project_id=${encodeURIComponent(pid)}`
};

// Helpers for rendering
function normalizeTotalCost(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
function parseDateLike(val) {
  try {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val) ? null : val;
    if (typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d) ? null : d;
    }
    if (typeof val === 'string') {
      const iso = val.includes('T') ? val : val.replace(' ', 'T');
      const d = new Date(iso);
      return isNaN(d) ? null : d;
    }
    return null;
  } catch { return null; }
}
function formatDateSafe(val) {
  const d = parseDateLike(val);
  if (!d) return '';
  const ds = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  const ts = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${ds} ${ts}`;
}

// Lightweight toast (scoped to dashboard)
function ensureToastStyles() {
  if (document.getElementById('dash-toast-styles')) return;
  const s = document.createElement('style');
  s.id = 'dash-toast-styles';
  s.textContent = `
    #dash-toast { position: fixed; top: 16px; right: 16px; z-index: 2000; }
    .dash-toast-item { min-width: 240px; max-width: 420px; margin: 8px 0; padding: 10px 12px;
      border-radius: 6px; color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,0.15); font-size: 14px; }
    .dash-toast-item.success { background:#16a34a; }
    .dash-toast-item.error { background:#dc2626; }
    .dash-toast-item.info { background:#2563eb; }
  `;
  document.head.appendChild(s);
}
function showToast(msg, type='info', timeout=3200) {
  ensureToastStyles();
  let c = document.getElementById('dash-toast');
  if (!c) { c = document.createElement('div'); c.id = 'dash-toast'; document.body.appendChild(c); }
  const el = document.createElement('div');
  el.className = `dash-toast-item ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

// Add these functions before the DOMContentLoaded event handler

// Get unique project name that increments
async function generateUniqueName() {
  try {
    console.log('[Dashboard] Generating unique project name...');
    // Fetch all projects first
    const res = await fetch(`${API.projects}?filter=all&sort=date&order=desc&page=1&page_size=200`, 
      { credentials: 'include' });
    if (!res.ok) return 'Untitled Project';
    
    const data = await res.json();
    // Handle different response formats
    let projects = Array.isArray(data) ? data : 
                  (data.projects || data.data || data.results || []);
    
    console.log('[Dashboard] Found projects:', projects.length);
    
    // Find max suffix used
    let max = 0;
    const re = /^untitled project(?:\s*(\d+))?$/i;
    let hasBaseUntitled = false;
    
    projects.forEach(p => {
      const name = String(p.project_name || '').trim();
      const m = name.match(re);
      if (m) {
        if (!m[1]) {
          // Found "Untitled Project" with no number
          hasBaseUntitled = true;
          max = Math.max(max, 1); 
        } else {
          // Found "Untitled Project X" with a number
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
    });
    
    console.log('[Dashboard] Max number found:', max);
    console.log('[Dashboard] Has base untitled:', hasBaseUntitled);
    
    // If we found any untitled projects, always return the next number
    const result = (max > 0 || hasBaseUntitled) ? 
      `Untitled Project ${max + 1}` : 'Untitled Project';
    
    console.log('[Dashboard] Generated name:', result);
    return result;
  } catch (error) {
    console.error('[Dashboard] Error generating name:', error);
    return 'Untitled Project'; // Fallback
  }
}

// Skeletons
function renderProjectSkeleton(container, n = 4) {
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'project-row skeleton';
    row.innerHTML = `
      <div class="skeleton-line" style="width: 60%"></div>
    `;
    container.appendChild(row);
  }
}

// Set active filter button
function setActiveFilter(filter) {
  const wrap = document.getElementById('project-filters');
  if (!wrap) return;
  wrap.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', !!isActive);
    btn.setAttribute('aria-pressed', String(!!isActive));
  });
}

// Debounced search
let searchTimer = null;
function searchProjects() {
  const el = document.getElementById('project-search');
  const q = el ? el.value.trim() : '';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProjects(currentFilter, q), 220);
}

// Add these functions to handle project deletion

let projectToDelete = null;

function showDeleteConfirmation(projectId, projectName) {
  const modal = document.getElementById('delete-confirm-modal');
  const projectNameEl = document.getElementById('delete-project-name');
  
  projectToDelete = projectId;
  projectNameEl.textContent = projectName;
  
  modal.style.display = 'block';
}

async function deleteProject(projectId) {
  try {
    const res = await fetch(`${API.projects}/${projectId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete (${res.status})`);
    }
    
    // Remove from UI
    const projectElement = document.querySelector(`.project-row[data-project-id="${projectId}"]`);
    if (projectElement) {
      projectElement.style.animation = 'fadeOut 0.3s';
      setTimeout(() => projectElement.remove(), 300);
    }
    
    showToast('Project deleted successfully', 'success');
    
    // Refresh list after a short delay
    setTimeout(() => loadProjects(currentFilter), 500);
    
  } catch (error) {
    console.error('Delete project error:', error);
    showToast(`Error: ${error.message || 'Could not delete project'}`, 'error');
  }
}


let currentFilter = 'recent';

async function loadProjects(filter = 'recent', search = '') {
  currentFilter = filter;
  setActiveFilter(filter);

  const projectList = document.getElementById('project-list');
  if (!projectList) {
    console.warn('[UI] #project-list not found; cannot render projects');
    return;
  }

  const base = API.projects;
  const params = new URLSearchParams({
    filter,
    q: search || '',
    page: '1',
    page_size: '50'
  });

  projectList.setAttribute('aria-busy', 'true');
  renderProjectSkeleton(projectList, 5);

  try {
    const res = await fetch(`${base}?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`http=${res.status}`);
    const data = await res.json();

    const items = Array.isArray(data)
      ? data
      : Array.isArray(data.projects)
        ? data.projects
        : [];

    projectList.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-title">No projects found</div>
        <div class="empty-sub">Try a different filter or create your first project.</div>
        <div><button class="primary" id="empty-create">Create Project</button></div>
      `;
      projectList.appendChild(empty);
      document.getElementById('empty-create')?.addEventListener('click', () => {
        document.getElementById('create-project-btn')?.click();
      });
      return;
    }

    for (const project of items) {
      try {
        const pid = project.id ?? project.project_id ?? project.projectId ?? project._id;
        if (!pid) continue;

        const name = project.project_name || project.name || 'Untitled Project';
        const lastModified = formatDateSafe(project.last_modified || project.updated_at);
        const total = normalizeTotalCost(project.total_cost);
        const totalStr = total == null ? '' : ` • Total: ${total.toLocaleString()}`;

        const row = document.createElement('div');
        row.className = 'project-row';
        row.dataset.projectId = pid;
        row.dataset.projectName = name;

        // Create the project link
        const link = document.createElement('a');
        link.href = API.calculation(pid);
        link.textContent = `${name}${ lastModified ? ' • ' + lastModified : '' }${totalStr}`;
        link.className = 'project-link';
        
        // Create actions container with delete button
        const actions = document.createElement('div');
        actions.className = 'project-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-project-btn';
        deleteBtn.innerHTML = '🗑️ Delete';
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showDeleteConfirmation(pid, name);
        });
        
        actions.appendChild(deleteBtn);
        
        // Add both elements to the row
        row.appendChild(link);
        row.appendChild(actions);
        projectList.appendChild(row);
      } catch (rowErr) {
        console.debug('Skipping project due to render error:', rowErr, project);
      }
    }
  } catch (err) {
    console.error('loadProjects error:', err);
    projectList.innerHTML = '<p class="error-text">Error loading projects.</p>';
    showToast('Failed to load projects', 'error');
  } finally {
    projectList.setAttribute('aria-busy', 'false');
  }
}


// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Scope styles to dashboard only
  document.body.classList.add('dashboard-page');

  // Mark active nav link
  const nav = document.querySelector('body.dashboard-page nav');
  if (nav) {
    const here = location.pathname.replace(/\/+$/, '');
    nav.querySelectorAll('a[href]').forEach(a => {
      const p = new URL(a.href, location.href).pathname.replace(/\/+$/, '');
      if (p && (here === p || (here.startsWith(p) && p !== '/'))) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  console.log('[BOOT] DOM ready. roles=', window.userRoles);
  loadProjects('recent', '');

  const homeBtn = document.getElementById('go-home-btn');
  if (homeBtn) {
    const homeUrl = (homeBtn.dataset.homeUrl || '').trim();
    homeBtn.addEventListener('click', () => {
      const target = homeUrl || '/';  // Simplified to just use root
      window.location.assign(target);
    });
  }

  // Hide uploader request for admins
  if (Array.isArray(window.userRoles) && window.userRoles.includes('admin')) {
    const reqBtn = document.getElementById('request-uploader-btn');
    if (reqBtn) reqBtn.style.display = 'none';
  }

  // Uploader status badge
  (async function updateUploaderBadge() {
    const badge = document.getElementById('uploader-status-badge');
    if (!badge) return;
    try {
      const res = await fetch(API.uploaderStatus, { credentials: 'include' });
      if (!res.ok) throw 0;
      const data = await res.json().catch(() => ({}));
      const status = (data.status || '').toLowerCase();
      if (!status) return;
      badge.textContent = status === 'approved' ? 'Uploader: Approved'
        : status === 'pending' ? 'Uploader: Pending'
        : 'Uploader: Not enabled';
      badge.className = `status-badge ${status || 'none'}`;
    } catch {}
  })();

  // Create Project
  const createBtn = document.getElementById('create-project-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      try {
        createBtn.disabled = true;
        const prev = createBtn.textContent;
        createBtn.textContent = 'Creating...';

        // Get a unique name instead of hardcoding
        const uniqueName = await generateUniqueName();
        console.log('[Dashboard] Creating project with name:', uniqueName);
        
        const body = { project_name: uniqueName, total_cost: 0 };
        const res = await fetch(API.projects, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body)
        });
        
        // Parse the response and handle redirection
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.message || `Create failed (${res.status})`, 'error');
          return;
        }
        
        const pid = data.project_id ?? data.id ?? data.projectId;
        if (!pid) {
          showToast('Project created but no id returned.', 'error');
          return;
        }
        
        showToast('Project created', 'success');
        window.location.assign(API.calculation(pid));
      } catch (e) {
        console.error('Create project error:', e);
        showToast('Network error creating project.', 'error');
      } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Project';
      }
    });
  }

  // Setup delete confirmation modal
  const deleteModal = document.getElementById('delete-confirm-modal');
  const confirmBtn = document.getElementById('delete-confirm');
  const cancelBtn = document.getElementById('delete-cancel');
  
  confirmBtn?.addEventListener('click', () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      deleteModal.style.display = 'none';
      projectToDelete = null;
    }
  });
  
  cancelBtn?.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    projectToDelete = null;
  });
  
  // Close modal when clicking outside
  deleteModal?.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = 'none';
      projectToDelete = null;
    }
  });

  // Admin nav/link targets - simplified paths
  const navUR = document.getElementById('nav-uploader-requests');
  if (navUR) {
    navUR.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.assign('/admin/uploader/requests-ui');
    });
  }
  const goByTarget = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      let p = el.dataset.target || '';
      if (p === '/admin/uploader/requests') p = '/admin/uploader/requests-ui';
      window.location.assign(p.startsWith('/') ? p : '/' + p);
    });
  };

  goByTarget('review-staged-btn');
  goByTarget('review-uploader-requests-btn');

  // Bulk CSV Upload modal wiring
  const bulkBtn = document.getElementById('bulk-upload-btn');
  const modal = document.getElementById('bulk-upload-modal');
  const submitBtn = document.getElementById('upload-submit');
  const uploadCancelBtn = document.getElementById('upload-cancel');
  const fileInput = document.getElementById('upload-file');
  const catSelect = document.getElementById('upload-category');

  if (bulkBtn && modal) {
    bulkBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });
  }
  uploadCancelBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
    if (fileInput) fileInput.value = '';
  });

  submitBtn?.addEventListener('click', async () => {
    try {
      const file = fileInput?.files?.[0];
      const category = catSelect?.value || 'materials';
      if (!file) {
        alert('Select a CSV file first.');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      // fd.append('category', category);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
      // Simplified URL construction using API object
      const url = API.uploadPrices(category);

      const res = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Upload failed', res.status, data);
        showToast(data.message || `Upload failed (${res.status})`, 'error');
        return;
      }
      showToast('File staged for review.', 'success');
      modal.style.display = 'none';
      if (fileInput) fileInput.value = '';
    } catch (e) {
      console.error('Upload error', e);
      showToast('Network error during upload.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    }          
  });
});
