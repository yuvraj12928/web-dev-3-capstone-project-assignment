(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { token: localStorage.getItem('campusToken'), user: null, page: 'dashboard', cache: {} };
  const titles = { dashboard: 'Overview', courses: 'Courses', announcements: 'Announcements', attendance: 'Attendance', people: 'People' };
  const initials = (s = '') => s.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'U';
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const prettyRole = s => s ? s[0].toUpperCase() + s.slice(1) : '';

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(path, { ...options, headers });
    let payload = {};
    try { payload = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401 && !path.startsWith('/api/auth/')) signOut(false);
      throw new Error(payload.message || `Request failed (${res.status})`);
    }
    return payload;
  }
  function toast(message, error = false) {
    const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  function showLogin(message = '') {
    $('#app').classList.add('hidden'); $('#login-screen').classList.remove('hidden'); $('#login-error').textContent = message;
  }
  function enterApp() {
    $('#login-screen').classList.add('hidden'); $('#app').classList.remove('hidden');
    const user = state.user || {};
    $('#profile').innerHTML = `<span class="avatar">${esc(initials(user.name))}</span><span class="profile-copy"><strong>${esc(user.name || 'Campus user')}</strong><small>${esc(prettyRole(user.role))}${user.department ? ` · ${esc(user.department)}` : ''}</small></span><button class="profile-menu" title="Profile">···</button>`;
    $('#top-avatar').textContent = initials(user.name);
    $$('.admin-only').forEach(el => el.classList.toggle('hidden', user.role !== 'admin'));
    $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    $('#footer-year').textContent = new Date().getFullYear();
    navigate(state.page);
  }
  function signOut(notify = true) {
    if (state.token) api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    state.token = null; state.user = null; localStorage.removeItem('campusToken');
    if (notify) toast('You have signed out'); showLogin();
  }
  async function login(email, password) {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    state.token = result.data.accessToken; state.user = result.data.user; localStorage.setItem('campusToken', state.token); enterApp();
  }
  async function get(path) { return api(path).then(r => r.data || []); }
  async function navigate(page) {
    state.page = page; $('#crumb-page').textContent = titles[page] || 'Overview';
    $$('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    const root = $('#page-content'); root.innerHTML = '<div class="empty-state">Loading your campus workspace…</div>';
    try {
      if (page === 'dashboard') await renderDashboard(root);
      if (page === 'courses') await renderCourses(root);
      if (page === 'announcements') await renderAnnouncements(root);
      if (page === 'attendance') await renderAttendance(root);
      if (page === 'people') await renderPeople(root);
    } catch (err) { root.innerHTML = `<div class="panel empty-state"><strong>Couldn’t load this view</strong>${esc(err.message)}<br><button class="button small" style="margin-top:14px" onclick="window.campusNavigate('${page}')">Try again</button></div>`; }
  }
  window.campusNavigate = navigate;
  function heading(kicker, title, desc, actions = '') {
    return `<div class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${desc}</p></div><div class="heading-actions">${actions}</div></div>`;
  }
  function stat(label, value, icon, note) {
    return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`;
  }
  function empty(text) { return `<div class="empty-state">${text}</div>`; }
  function announcementsList(items, limit = 4) {
    if (!items.length) return '<div class="notice-empty">No announcements yet. New campus updates will appear here.</div>';
    return items.slice(0, limit).map(a => `<article class="notice"><span class="notice-pin"></span><div><strong>${esc(a.title)}</strong><p>${esc(a.body)}</p><time>${esc(prettyRole(a.scope || 'university'))} · ${fmtDate(a.createdAt)}</time></div></article>`).join('');
  }
  function enrolmentChart(rows) {
    const data = rows.slice(0, 6), max = Math.max(1, ...data.map(r => r.students));
    if (!data.length) return '<div class="empty-chart">Enrollment data will appear when students join courses.</div>';
    const w = 570, h = 147, left = 35, right = 10, top = 8, bottom = 31, chartH = h - top - bottom;
    const barW = Math.min(43, (w - left - right) / (data.length * 1.7)), gap = (w - left - right - data.length * barW) / data.length;
    const grid = [0, .5, 1].map(v => { const y = top + chartH * (1 - v); return `<line class="gridline" x1="${left}" x2="${w-right}" y1="${y}" y2="${y}"/><text class="axis-label" x="${left-8}" y="${y+3}" text-anchor="end">${Math.round(max*v)}</text>`; }).join('');
    const bars = data.map((r, i) => { const x = left + gap/2 + i * (barW + gap), bh = Math.max(3, chartH * r.students/max), y = top + chartH - bh; return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="5" fill="${i === 0 ? '#27835e' : '#acd0b2'}"/><text class="axis-label" x="${x+barW/2}" y="${h-10}" text-anchor="middle">${esc(r.courseCode || 'Course')}</text>`; }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Students enrolled by course">${grid}${bars}</svg>`;
  }
  async function renderDashboard(root) {
    const role = state.user.role;
    const jobs = [get('/api/courses?limit=100'), get('/api/announcements?limit=100')];
    if (role === 'student') jobs.push(get('/api/attendance/my?limit=100'));
    else jobs.push(api('/api/reports/enrollments/summary').then(r => r.data || {}));
    if (role === 'admin') jobs.push(api('/api/users?limit=100').then(r => ({ total: r.total || 0, data: r.data || [] })));
    const results = await Promise.all(jobs); const courses = results[0], notices = results[1];
    const student = role === 'student';
    const attendance = student ? results[2] : [];
    const summary = student ? null : results[2];
    const people = role === 'admin' ? results[3] : null;
    const totalStudents = summary?.perCourse?.reduce((s, r) => s + r.students, 0) ?? summary?.data?.reduce((s,r) => s+r.students, 0) ?? 0;
    const enrollments = summary?.data || summary?.perCourse || [];
    const avg = attendance.length ? Math.round(attendance.filter(x => ['present','late'].includes(x.status)).length / attendance.length * 100) : 0;
    const subtitle = student ? 'A quick look at your classes and campus updates.' : role === 'faculty' ? 'Here’s what’s happening across your courses today.' : 'Here’s what’s happening across your campus today.';
    const actions = `<button class="button" id="dashboard-refresh">↻ &nbsp;Refresh</button>${role !== 'student' ? '<button class="button primary" id="new-announcement">＋ &nbsp;New announcement</button>' : ''}`;
    root.innerHTML = `${heading('CAMPUS AT A GLANCE', `Welcome back, ${esc((state.user.name || '').split(' ')[0])} <span style="color:#8cab81">✳</span>`, subtitle, actions)}
      <div class="stats-grid">${student ? `${stat('My courses', courses.length, '▤', 'Your current course list')}${stat('Classes recorded', attendance.length, '◷', 'Attendance records so far')}${stat('Attendance rate', `${avg}%`, '↗', '<span class="positive">Present or late</span> across classes')}${stat('Campus updates', notices.length, '◉', 'Announcements for you')}` : `${stat(role === 'admin' ? 'People on campus' : 'Course enrolments', role === 'admin' ? (people?.total ?? '—') : totalStudents, '♧', role === 'admin' ? 'Registered campus members' : 'Across your courses')}${stat('Active courses', courses.length, '▤', 'Courses in the catalog')}${stat('Total enrolments', totalStudents, '↗', 'Students enrolled in courses')}${stat('Announcements', notices.length, '◉', 'Campus-wide and course updates')}`}</div>
      <div class="overview-grid"><section class="panel chart-panel"><div class="panel-head"><div><div class="panel-title">Course enrolments</div><div class="panel-subtitle">Students currently enrolled by course</div></div><span class="chart-legend"><i class="legend-dot"></i> Students</span></div><div class="chart-wrap">${student ? `<div class="empty-chart">Your course progress is available in the attendance section.</div>` : enrolmentChart(enrollments)}</div></section><section class="panel quick-panel"><div class="panel-head"><div><div class="panel-title">Quick actions</div><div class="panel-subtitle">Shortcuts for your workspace</div></div></div><div class="quick-list">${role !== 'student' ? `<button class="quick-action" data-quick="announcements"><span class="quick-icon">＋</span><span><strong>Post an announcement</strong><small>Share a campus update</small></span><span class="quick-arrow">↗</span></button>` : ''}<button class="quick-action" data-quick="courses"><span class="quick-icon">▤</span><span><strong>Browse courses</strong><small>Explore the course catalog</small></span><span class="quick-arrow">↗</span></button><button class="quick-action" data-quick="attendance"><span class="quick-icon">◷</span><span><strong>View attendance</strong><small>Check class records</small></span><span class="quick-arrow">↗</span></button></div></section></div>
      <div class="lower-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">${student ? 'My courses' : 'Popular courses'}</div><div class="panel-subtitle">${student ? 'Courses available in your workspace' : 'Enrollment snapshot across the catalog'}</div></div><button class="panel-link" data-goto="courses">View all →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>COURSE</th><th>DEPARTMENT</th><th>${student ? 'SEMESTER' : 'STUDENTS'}</th></tr></thead><tbody>${courses.slice(0,5).map(c => { const row = enrollments.find(x => x.courseId === c._id || x.course?._id === c._id); return `<tr><td><div class="course-code">${esc(c.code)}</div><div class="course-name">${esc(c.title)}</div></td><td>${esc(c.department || '—')}</td><td>${student ? esc(c.semester || '—') : `<span class="percentage">${row?.students || 0}</span>`}</td></tr>`; }).join('') || `<tr><td colspan="3">${empty('No courses found.')}</td></tr>`}</tbody></table></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Latest announcements</div><div class="panel-subtitle">The latest from around campus</div></div><button class="panel-link" data-goto="announcements">See all →</button></div><div class="notice-list">${announcementsList(notices, 4)}</div></section></div>`;
    $('#dashboard-refresh').onclick = () => navigate('dashboard');
    $('#new-announcement')?.addEventListener('click', () => openAnnouncementModal());
    $$('[data-goto]', root).forEach(b => b.onclick = () => navigate(b.dataset.goto));
    $$('[data-quick]', root).forEach(b => b.onclick = () => navigate(b.dataset.quick));
  }
  async function renderCourses(root) {
    const courses = await get('/api/courses?limit=100'); state.cache.courses = courses;
    const canCreate = state.user.role === 'admin';
    root.innerHTML = `${heading('ACADEMIC CATALOG','Courses','Explore the courses offered across your university.',canCreate ? '<button class="button primary" id="create-course">＋ &nbsp;Add course</button>' : '')}<div class="filter-row"><input id="course-search" class="search-box" placeholder="⌕  Search courses by title or code"><select id="department-filter" class="select-box"><option value="">All departments</option>${[...new Set(courses.map(c => c.department).filter(Boolean))].sort().map(d => `<option>${esc(d)}</option>`).join('')}</select><span class="stat-note">${courses.length} courses</span></div><div id="course-results" class="course-grid"></div>`;
    const draw = () => { const q = $('#course-search').value.toLowerCase(), dep = $('#department-filter').value; const found = courses.filter(c => (!dep || c.department === dep) && (!q || `${c.code} ${c.title} ${c.department}`.toLowerCase().includes(q))); $('#course-results').innerHTML = found.map(c => `<article class="course-card"><div class="course-top"><span>${esc(c.code)}</span><span class="badge">${esc(c.department || 'General')}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.description || 'Course information and learning resources.')}</p><div class="course-foot"><span>Semester <strong>${esc(c.semester || '—')}</strong></span><span>${esc(c.credits ? `${c.credits} credits` : 'Course catalog')}</span></div></article>`).join('') || `<div class="panel" style="grid-column:1/-1">${empty('No courses match your search.')}</div>`; };
    $('#course-search').oninput = draw; $('#department-filter').onchange = draw; draw();
    $('#create-course')?.addEventListener('click', openCourseModal);
  }
  async function renderAnnouncements(root) {
    const items = await get('/api/announcements?limit=100');
    const canPost = ['admin','faculty'].includes(state.user.role);
    root.innerHTML = `${heading('CAMPUS BULLETIN','Announcements','Updates and notices for your campus community.',canPost ? '<button class="button primary" id="new-announcement">＋ &nbsp;New announcement</button>' : '')}<div class="filter-row"><span class="badge">${items.length} updates</span><span class="stat-note">Sorted by most recent</span></div><div class="announcement-grid">${items.map(a => `<article class="announcement-card"><div class="announcement-meta"><span class="badge">${esc(a.scope || 'university')}</span><span class="stat-note">${fmtDate(a.createdAt)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><div class="announcement-by"><span class="avatar">${esc(initials(a.createdBy?.name || 'Campus'))}</span><span>Posted by <strong>${esc(a.createdBy?.name || 'Campus team')}</strong></span></div></article>`).join('') || `<div class="panel" style="grid-column:1/-1">${empty('No announcements yet. Check back for campus updates.')}</div>`}</div>`;
    $('#new-announcement')?.addEventListener('click', openAnnouncementModal);
  }
  async function renderAttendance(root) {
    const student = state.user.role === 'student';
    const result = await api(student ? '/api/attendance/my?limit=100' : '/api/attendance?limit=100');
    const rows = result.data || [];
    const attended = rows.filter(x => ['present','late'].includes(x.status)).length;
    const pct = rows.length ? Math.round(attended / rows.length * 100) : 0;
    root.innerHTML = `${heading('CLASS RECORDS','Attendance',student ? 'Track your class attendance and course participation.' : 'Review attendance records across your assigned courses.')}<div class="stats-grid">${stat('Attendance rate',`${pct}%`,'↗','Present or late records')}${stat('Classes recorded',rows.length,'◷','Records available to you')}${stat('Present',rows.filter(x=>x.status==='present').length,'✓','Marked present')}${stat('Absent',rows.filter(x=>x.status==='absent').length,'−','Marked absent')}</div><div class="section-heading"><div><h2>${student ? 'My attendance history' : 'Recent attendance'}</h2><p>Latest records appear first.</p></div></div><div class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>COURSE</th><th>${student ? 'DATE' : 'STUDENT'}</th><th>DATE</th><th>SESSION</th><th>STATUS</th></tr></thead><tbody>${rows.map(r => `<tr><td><div class="course-name">${esc(r.course?.title || r.course?.code || 'Course')}</div><div class="course-code">${esc(r.course?.code || '')}</div></td><td>${student ? fmtDate(r.date) : `<div class="course-name">${esc(r.student?.name || 'Student')}</div><div class="course-code">${esc(r.student?.rollNumber || '')}</div>`}</td><td>${fmtDate(r.date)}</td><td>${esc(r.session || 1)}</td><td><span class="badge ${esc(r.status)}">${esc(r.status)}</span></td></tr>`).join('') || `<tr><td colspan="5">${empty('No attendance records are available yet.')}</td></tr>`}</tbody></table></div></div>`;
  }
  async function renderPeople(root) {
    if (state.user.role !== 'admin') throw new Error('Only administrators can view the people directory.');
    const result = await api('/api/users?limit=100'); const people = result.data || [];
    const counts = ['student','faculty','admin'].map(role => [role, people.filter(p => p.role === role).length]);
    root.innerHTML = `${heading('CAMPUS DIRECTORY','People','A directory of your campus community.')}<div class="people-summary">${counts.map(([role,count]) => `<span class="people-pill"><strong>${count}</strong>${prettyRole(role)}${count===1?'':'s'}</span>`).join('')}</div><div class="filter-row"><input id="people-search" class="search-box" placeholder="⌕  Search by name, email or department"><select id="role-filter" class="select-box"><option value="">All roles</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Administrators</option></select><span class="stat-note">${result.total ?? people.length} people</span></div><div class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>NAME</th><th>ROLE</th><th>DEPARTMENT</th><th>EMAIL</th><th>STATUS</th></tr></thead><tbody id="people-rows"></tbody></table></div></div>`;
    const draw = () => { const q = $('#people-search').value.toLowerCase(), role = $('#role-filter').value; const rows = people.filter(p => (!role || p.role === role) && (!q || `${p.name} ${p.email} ${p.department||''}`.toLowerCase().includes(q))); $('#people-rows').innerHTML = rows.map(p => `<tr><td><div class="course-name">${esc(p.name)}</div><div class="course-code">${esc(p.rollNumber || p.designation || '')}</div></td><td><span class="badge">${esc(p.role)}</span></td><td>${esc(p.department || '—')}</td><td>${esc(p.email)}</td><td><span class="badge ${p.isActive ? 'present' : 'absent'}">${p.isActive ? 'Active' : 'Inactive'}</span></td></tr>`).join('') || `<tr><td colspan="5">${empty('No people match your search.')}</td></tr>`; };
    $('#people-search').oninput = draw; $('#role-filter').onchange = draw; draw();
  }
  function openModal(title, subtitle, body, onSubmit) {
    const root = $('#modal-root'); root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="close-modal" aria-label="Close">×</button></div>${body}</div></div>`;
    const backdrop = $('.modal-backdrop', root); $('.close-modal', root).onclick = () => root.innerHTML = ''; backdrop.addEventListener('click', e => { if (e.target === backdrop) root.innerHTML = ''; });
    $('form', root).onsubmit = async e => { e.preventDefault(); const form = e.currentTarget, button = $('button[type="submit"]', form), error = $('.form-error', form); button.disabled = true; button.textContent = 'Saving…'; error.textContent = ''; try { await onSubmit(new FormData(form)); root.innerHTML = ''; toast('Saved successfully'); navigate(state.page); } catch (err) { error.textContent = err.message; button.disabled = false; button.textContent = 'Save'; } };
  }
  async function openAnnouncementModal() {
    const role = state.user.role;
    let courses = state.cache.courses || await get('/api/courses?limit=100'); state.cache.courses = courses;
    let sections = await get(role === 'faculty' ? `/api/sections?faculty=${encodeURIComponent(state.user._id)}&limit=100` : '/api/sections?limit=100');
    if (role === 'faculty') {
      const courseIds = new Set(sections.map(s => s.course?._id));
      courses = courses.filter(c => courseIds.has(c._id));
    }
    const options = list => list.map(x => `<option value="${esc(x._id)}">${esc(x.code ? `${x.code} — ${x.title}` : `${x.course?.code || 'Course'} — ${x.name}`)}</option>`).join('');
    openModal('New announcement','Share a useful update with your campus community.',`<form class="form-stack"><label>Title<input name="title" maxlength="120" placeholder="What’s the update about?" required></label><label>Message<textarea name="body" maxlength="2000" placeholder="Write your announcement…" required></textarea></label><label>Audience<select name="scope">${role === 'admin' ? '<option value="university">Entire university</option>' : ''}<option value="course">Course</option><option value="section">Section</option></select></label><label class="related-course" style="display:none">Course<select name="course">${options(courses)}</select></label><label class="related-section" style="display:none">Section<select name="section">${options(sections)}</select></label><p class="form-error"></p><button class="button primary" type="submit">Publish announcement</button></form>`, async data => {
      const scope = data.get('scope'); const payload = { title: data.get('title'), body: data.get('body'), scope };
      if (scope === 'course') { if (!courses.length) throw new Error('No courses are available for announcements.'); payload.course = data.get('course'); }
      if (scope === 'section') { if (!sections.length) throw new Error('No sections are available for announcements.'); payload.section = data.get('section'); }
      await api('/api/announcements', { method: 'POST', body: JSON.stringify(payload) });
    });
    const form = $('#modal-root form');
    const scope = $('select[name="scope"]', form);
    const syncAudience = () => {
      $('.related-course', form).style.display = scope.value === 'course' ? 'grid' : 'none';
      $('.related-section', form).style.display = scope.value === 'section' ? 'grid' : 'none';
      $('select[name="course"]', form).required = scope.value === 'course';
      $('select[name="section"]', form).required = scope.value === 'section';
    };
    scope.addEventListener('change', syncAudience); syncAudience();
  }
  function openCourseModal() {
    openModal('Add a course','Add a course to the university catalog.',`<form class="form-stack"><label>Course code<input name="code" placeholder="e.g. CSE-402" required></label><label>Course title<input name="title" placeholder="e.g. Human Computer Interaction" required></label><label>Department<input name="department" placeholder="e.g. Computer Science" required></label><label>Semester<input name="semester" type="number" min="1" max="12" placeholder="e.g. 4"></label><label>Credits<input name="credits" type="number" min="1" max="10" placeholder="e.g. 3"></label><p class="form-error"></p><button class="button primary" type="submit">Save course</button></form>`, async data => {
      const payload = { code: data.get('code'), title: data.get('title'), department: data.get('department') };
      if (data.get('semester')) payload.semester = Number(data.get('semester')); if (data.get('credits')) payload.credits = Number(data.get('credits'));
      await api('/api/courses', { method: 'POST', body: JSON.stringify(payload) });
    });
  }
  $('#login-form').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const button = $('button[type="submit"]', form); button.disabled = true; button.innerHTML = 'Signing in…'; $('#login-error').textContent = ''; try { await login(form.email.value.trim(), form.password.value); } catch (err) { $('#login-error').textContent = err.message; } finally { button.disabled = false; button.innerHTML = 'Sign in <span>→</span>'; } });
  $('#logout-button').addEventListener('click', () => signOut());
  $('#refresh-button').addEventListener('click', () => navigate(state.page));
  $('#main-nav').addEventListener('click', e => { const item = e.target.closest('[data-page]'); if (item && !item.classList.contains('hidden')) navigate(item.dataset.page); });
  $('#help-button').addEventListener('click', () => toast('Use the navigation to explore courses, attendance and campus updates.'));
  $('#page-content').addEventListener('click', e => { const link = e.target.closest('[data-goto]'); if (link) navigate(link.dataset.goto); });

  (async () => {
    if (!state.token) return showLogin();
    try { const result = await api('/api/users/me'); state.user = result.data; enterApp(); }
    catch (_) { localStorage.removeItem('campusToken'); state.token = null; showLogin(); }
  })();
})();
