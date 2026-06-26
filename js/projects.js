// ============================================================
//  SHUROQ ERP – PROJECT MANAGEMENT MODULE
// ============================================================

let projPage = 1, projStatusFilter = '';

// ======================== PROJECT LIST ==========================
function renderProjects() {
  let list = DB.projects;
  if (projStatusFilter) list = list.filter(p => p.status === projStatusFilter);

  const total = list.length;
  const inProg = DB.projects.filter(p => p.status === 'In Progress').length;
  const completed = DB.projects.filter(p => p.status === 'Completed').length;
  const notStarted = DB.projects.filter(p => p.status === 'Not Started').length;

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Projects</h1>
        <p>Track all company projects and their progress</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddProjectModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="kpi-card"><div class="kpi-value">${DB.projects.length}</div><div class="kpi-label">Total Projects</div></div>
      <div class="kpi-card" style="--card-color:var(--teal)"><div class="kpi-value" style="color:var(--teal)">${inProg}</div><div class="kpi-label">In Progress</div></div>
      <div class="kpi-card" style="--card-color:var(--green)"><div class="kpi-value" style="color:var(--green)">${completed}</div><div class="kpi-label">Completed</div></div>
      <div class="kpi-card" style="--card-color:var(--text-muted)"><div class="kpi-value" style="color:var(--text-muted)">${notStarted}</div><div class="kpi-label">Not Started</div></div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      ${['', 'In Progress', 'Not Started', 'On Hold', 'Completed'].map(s => `
        <button class="btn ${projStatusFilter===s?'btn-primary':'btn-secondary'} btn-sm" onclick="projStatusFilter='${s}';refreshPage()">
          ${s || 'All Projects'}
        </button>
      `).join('')}
    </div>

    <div class="project-cards">
      ${list.length === 0 ? `<div class="empty-state"><h3>No projects found</h3></div>` :
      list.map(p => `
        <div class="project-card" onclick="viewProjectDetail('${p.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <span style="font-size:10.5px;background:var(--bg-input);color:var(--text-muted);padding:2px 8px;border-radius:4px;">${p.id}</span>
            ${badge(p.priority)}
          </div>
          <div class="project-card-title">${p.name}</div>
          <div class="project-card-desc">${p.description}</div>
          <div class="project-progress">
            <div class="progress-header">
              <span>Progress</span>
              <span>${p.progress}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${p.progress}%"></div>
            </div>
          </div>
          <div class="project-footer">
            ${badge(p.status)}
            <div style="font-size:12px;color:var(--text-muted);">
              ✅ ${p.tasksDone}/${p.tasksTotal} tasks &nbsp;·&nbsp; 📅 ${fmtDate(p.endDate)}
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            ${(p.tags || []).map(t => `<span style="font-size:10.5px;background:rgba(99,102,241,0.12);color:var(--accent-light);padding:2px 8px;border-radius:4px;">${t}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function viewProjectDetail(id) {
  navigate('project-detail', { id });
}

function renderProjectDetail(id) {
  const proj = DB.projects.find(p => p.id === id);
  if (!proj) return '<p>Project not found</p>';
  const tasks = DB.tasks.filter(t => t.projId === id);
  const statuses = ['Not Started', 'In Progress', 'Review', 'Done'];
  const colors = { 'Not Started': '#475569', 'In Progress': '#14b8a6', 'Review': '#f59e0b', 'Done': '#22c55e' };

  return `
    <div class="page-header">
      <div class="page-header-left">
        <button class="btn btn-secondary btn-sm" onclick="navigate('projects')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Projects
        </button>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openEditProjectModal('${id}')">Edit Project</button>
        <button class="btn btn-primary" onclick="openAddTaskModal('${id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>
    </div>

    <div class="section-card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:20px;font-weight:700;">${proj.name}</h2>
          <p style="color:var(--text-sec);font-size:13.5px;margin-top:4px;">${proj.description}</p>
          <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;">
            ${badge(proj.status)} ${badge(proj.priority)}
            <span style="font-size:12px;color:var(--text-muted);">Manager: <strong style="color:var(--text-sec);">${proj.manager}</strong></span>
            <span style="font-size:12px;color:var(--text-muted);">📅 ${fmtDate(proj.startDate)} → ${fmtDate(proj.endDate)}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:28px;font-weight:800;">${proj.progress}%</div>
          <div style="font-size:12px;color:var(--text-muted);">Complete</div>
        </div>
      </div>
      <div class="project-progress" style="margin-top:16px;margin-bottom:0;">
        <div class="progress-bar" style="height:8px;">
          <div class="progress-fill" style="width:${proj.progress}%"></div>
        </div>
      </div>
    </div>

    <div class="kanban-board" id="kanbanBoard">
      ${statuses.map(status => {
        const statusTasks = tasks.filter(t => t.status === status);
        return `
          <div class="kanban-col">
            <div class="kanban-col-header">
              <div class="kanban-col-title">
                <div style="width:8px;height:8px;border-radius:50%;background:${colors[status]};"></div>
                ${status}
              </div>
              <span class="kanban-col-count">${statusTasks.length}</span>
            </div>
            <div class="kanban-tasks">
              ${statusTasks.length === 0 ? '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:12px;">No tasks</div>' :
              statusTasks.map(t => `
                <div class="task-card">
                  <div class="task-card-title">${t.title}</div>
                  <div style="display:flex;gap:6px;margin-bottom:8px;">${badge(t.priority)}</div>
                  <div class="task-card-meta">
                    <span class="task-card-tag">${t.tag}</span>
                    <span class="task-card-assignee">👤 ${t.assignee.split(' ')[0]}</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">📅 ${fmtDate(t.dueDate)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ======================== ADD/EDIT PROJECT ==========================
function projectFormHTML(p = {}) {
  return `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Project Name <span class="required">*</span></label>
        <input class="form-input" id="pj_name" value="${p.name||''}" placeholder="Project name" />
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="pj_desc" placeholder="Project description…">${p.description||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="pj_status">
          <option ${p.status==='Not Started'||!p.status?'selected':''}>Not Started</option>
          <option ${p.status==='In Progress'?'selected':''}>In Progress</option>
          <option ${p.status==='On Hold'?'selected':''}>On Hold</option>
          <option ${p.status==='Completed'?'selected':''}>Completed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="pj_priority">
          <option ${p.priority==='Low'?'selected':''}>Low</option>
          <option ${p.priority==='Medium'||!p.priority?'selected':''}>Medium</option>
          <option ${p.priority==='High'?'selected':''}>High</option>
          <option ${p.priority==='Critical'?'selected':''}>Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input class="form-input" type="date" id="pj_start" value="${p.startDate||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input class="form-input" type="date" id="pj_end" value="${p.endDate||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Progress (%)</label>
        <input class="form-input" type="number" id="pj_progress" value="${p.progress||0}" min="0" max="100" />
      </div>
      <div class="form-group">
        <label class="form-label">Project Manager</label>
        <input class="form-input" id="pj_manager" value="${p.manager||''}" placeholder="Manager name" />
      </div>
    </div>
  `;
}

function getProjFormData() {
  return {
    name: document.getElementById('pj_name').value.trim(),
    description: document.getElementById('pj_desc').value.trim(),
    status: document.getElementById('pj_status').value,
    priority: document.getElementById('pj_priority').value,
    startDate: document.getElementById('pj_start').value,
    endDate: document.getElementById('pj_end').value,
    progress: +document.getElementById('pj_progress').value || 0,
    manager: document.getElementById('pj_manager').value.trim(),
  };
}

function openAddProjectModal() {
  openModal('New Project', projectFormHTML(),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveNewProject()">Create Project</button>`
  );
}

function saveNewProject() {
  const data = getProjFormData();
  if (!data.name) { showToast('Project name is required', 'error'); return; }
  DB.projects.push({ ...data, id: genId('PRJ', DB.projects), tasksTotal: 0, tasksDone: 0, team: [], tags: [] });
  saveData();
  closeModal();
  showToast('Project created!');
  refreshPage();
}

function openEditProjectModal(id) {
  const p = DB.projects.find(x => x.id === id);
  if (!p) return;
  openModal(`Edit – ${p.name}`, projectFormHTML(p),
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEditProject('${id}')">Save Changes</button>`
  );
}

function saveEditProject(id) {
  const idx = DB.projects.findIndex(x => x.id === id);
  if (idx === -1) return;
  const data = getProjFormData();
  if (!data.name) { showToast('Project name is required', 'error'); return; }
  DB.projects[idx] = { ...DB.projects[idx], ...data };
  saveData();
  closeModal();
  showToast('Project updated!');
  refreshPage();
}

// ======================== TASK BOARD ==========================
function renderTaskBoard() {
  const statuses = ['Not Started', 'In Progress', 'Review', 'Done'];
  const colors = { 'Not Started': '#475569', 'In Progress': '#14b8a6', 'Review': '#f59e0b', 'Done': '#22c55e' };

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Task Board</h1>
        <p>Kanban view of all tasks across projects</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddTaskModal('')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>
    </div>

    <div class="kanban-board">
      ${statuses.map(status => {
        const statusTasks = DB.tasks.filter(t => t.status === status);
        return `
          <div class="kanban-col">
            <div class="kanban-col-header">
              <div class="kanban-col-title">
                <div style="width:8px;height:8px;border-radius:50%;background:${colors[status]};"></div>
                ${status}
              </div>
              <span class="kanban-col-count">${statusTasks.length}</span>
            </div>
            <div class="kanban-tasks">
              ${statusTasks.map(t => {
                const proj = DB.projects.find(p => p.id === t.projId);
                return `
                  <div class="task-card">
                    <div class="task-card-title">${t.title}</div>
                    <div style="display:flex;gap:6px;margin-bottom:8px;">${badge(t.priority)}</div>
                    <div class="task-card-meta">
                      <span class="task-card-tag">${t.tag}</span>
                      <span class="task-card-assignee">👤 ${t.assignee.split(' ')[0]}</span>
                    </div>
                    ${proj ? `<div style="font-size:10.5px;color:var(--text-muted);margin-top:6px;background:var(--bg-input);padding:2px 7px;border-radius:4px;display:inline-block;">📁 ${proj.name}</div>` : ''}
                    <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">📅 ${fmtDate(t.dueDate)}</div>
                  </div>
                `;
              }).join('')}
              ${statusTasks.length === 0 ? '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px 12px;">No tasks here</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openAddTaskModal(projId = '') {
  const projOptions = DB.projects.map(p => `<option value="${p.id}" ${projId===p.id?'selected':''}>${p.name}</option>`).join('');
  const empOptions = DB.employees.filter(e => e.status === 'Active').map(e => `<option>${e.firstName} ${e.lastName}</option>`).join('');
  openModal('New Task', `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Task Title <span class="required">*</span></label>
        <input class="form-input" id="tk_title" placeholder="Task description…" />
      </div>
      <div class="form-group">
        <label class="form-label">Project</label>
        <select class="form-select" id="tk_proj"><option value="">No Project</option>${projOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Assignee</label>
        <select class="form-select" id="tk_assignee">${empOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="tk_status">
          <option>Not Started</option><option>In Progress</option><option>Review</option><option>Done</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="tk_priority">
          <option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tag</label>
        <input class="form-input" id="tk_tag" placeholder="e.g. Backend, Frontend" value="General" />
      </div>
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" type="date" id="tk_due" />
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewTask()">Create Task</button>`);
}

function saveNewTask() {
  const title = document.getElementById('tk_title').value.trim();
  if (!title) { showToast('Task title is required', 'error'); return; }
  const projId = document.getElementById('tk_proj').value;
  DB.tasks.push({
    id: genId('TSK', DB.tasks),
    projId,
    title,
    status: document.getElementById('tk_status').value,
    priority: document.getElementById('tk_priority').value,
    assignee: document.getElementById('tk_assignee').value,
    dueDate: document.getElementById('tk_due').value,
    tag: document.getElementById('tk_tag').value || 'General',
  });
  if (projId) {
    const proj = DB.projects.find(p => p.id === projId);
    if (proj) proj.tasksTotal++;
  }
  saveData();
  closeModal();
  showToast('Task created!');
  refreshPage();
}
