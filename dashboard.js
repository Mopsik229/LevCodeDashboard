document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    const { data, error: authError } = await supabaseClient.auth.getSession();
    
    if (authError) {
        console.error('Auth error:', authError);
    }
    
    const session = data?.session;
    
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Установка email пользователя в профиль
    const userEmailSpan = document.getElementById('current-user-email');
    if (userEmailSpan && session.user.email) {
        // Берем часть до @ как имя
        userEmailSpan.textContent = session.user.email.split('@')[0];
    }

    // Логаут
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // 2. Initial State & Supabase
    let leads = [];

    // Stages mapping
    const STAGE_NAMES = {
        'new': 'Новые заявки',
        'brief': '01 / Бриф',
        'prototype': '02 / Прототип',
        'design': '03 / Дизайн',
        'dev': '04 / Разработка',
        'launch': '05 / Запуск',
        'completed': 'Завершено'
    };

    // 3. Tab Routing
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-tab]');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            const targetTab = item.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            pageTitle.textContent = item.textContent.trim();
        });
    });

    // 4. Data Fetching (Supabase)
    async function fetchLeads() {
        const { data, error } = await supabaseClient
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Ошибка загрузки лидов:', error);
            return;
        }

        leads = data || [];
        renderAll();
    }

    // Подписка на изменения в реальном времени (WebSockets)
    supabaseClient
        .channel('public:leads')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
            console.log('Изменение в базе:', payload);
            fetchLeads(); // Перезапрашиваем данные при любых изменениях
        })
        .subscribe();

    // 5. Helpers
    function renderAll() {
        renderOverview();
        renderProjectsTable();
        renderClientsTables();
    }

    function formatBudget(b) {
        if (b === '5000') return 'до 5000 ₽';
        if (b === '5000-10000') return '5-10k ₽';
        if (b === '10000-20000') return '10-20k ₽';
        if (b === 'other') return 'Обсуждаемо';
        return b;
    }

    // 6. Renders
    function renderOverview() {
        const activeLeads = leads.filter(l => l.stage !== 'completed');
        const newLeads = leads.filter(l => l.stage === 'new');
        const completedLeads = leads.filter(l => l.stage === 'completed');

        let revenue = 0;
        activeLeads.forEach(l => {
            if (l.budget === '5000') revenue += 5000;
            else if (l.budget === '5000-10000') revenue += 7500;
            else if (l.budget === '10000-20000') revenue += 15000;
            else if (l.budget === 'other') revenue += 20000; // Примерная оценка
        });

        document.getElementById('metric-leads').textContent = newLeads.length;
        document.getElementById('metric-active').textContent = activeLeads.length;
        document.getElementById('metric-completed').textContent = completedLeads.length;
        document.getElementById('metric-revenue').textContent = revenue.toLocaleString('ru-RU') + ' ₽';

        // Recent Leads list
        const recentList = document.getElementById('recent-leads-list');
        recentList.innerHTML = '';
        const sortedNew = [...newLeads].slice(0, 5); // Уже отсортировано по created_at
        if (sortedNew.length === 0) recentList.innerHTML = '<div class="empty-state">Нет новых заявок</div>';

        sortedNew.forEach(lead => {
            const dateStr = new Date(lead.created_at).toLocaleDateString('ru-RU');
            recentList.innerHTML += `
                <div class="list-item">
                    <div class="li-info">
                        <span class="li-name">${lead.name}</span>
                        <span class="li-desc">${lead.type} • ${dateStr}</span>
                    </div>
                    <span class="li-badge ${lead.stage === 'new' ? 'new' : ''}">${STAGE_NAMES[lead.stage] || lead.stage}</span>
                </div>
            `;
        });

        // Active projects list
        const activeList = document.getElementById('active-projects-list');
        activeList.innerHTML = '';
        const inProgress = activeLeads.filter(l => l.stage !== 'new').slice(0, 5);
        if (inProgress.length === 0) activeList.innerHTML = '<div class="empty-state">Нет активных проектов</div>';

        inProgress.forEach(lead => {
            activeList.innerHTML += `
                <div class="list-item">
                    <div class="li-info">
                        <span class="li-name">${lead.name}</span>
                        <span class="li-desc">${lead.type}</span>
                    </div>
                    <span class="li-badge active">${STAGE_NAMES[lead.stage] || lead.stage}</span>
                </div>
            `;
        });
    }

    function renderProjectsTable() {
        const tbody = document.getElementById('projects-table-body');
        tbody.innerHTML = '';

        const activeLeads = leads.filter(l => l.stage !== 'completed');

        if (activeLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет активных проектов</td></tr>';
            return;
        }

        activeLeads.forEach(lead => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td style="font-weight: 600;">${lead.name}</td>
                <td class="mono">${lead.contact}</td>
                <td>${lead.type}</td>
                <td><span class="li-badge ${lead.stage === 'new' ? 'new' : 'active'}">${STAGE_NAMES[lead.stage] || lead.stage}</span></td>
                <td class="mono" style="color: var(--accent);">${formatBudget(lead.budget)}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon" title="Заметки" onclick="openNotesModal('${lead.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                        <button class="btn-icon" title="Редактировать" onclick="openLeadModal('${lead.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button class="btn-icon success" title="Завершить проект" onclick="closeLead('${lead.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function createClientRow(lead) {
        const dateStr = new Date(lead.created_at).toLocaleDateString('ru-RU');
        const tr = document.createElement('tr');

        let optionsHtml = '';
        Object.entries(STAGE_NAMES).forEach(([val, label]) => {
            optionsHtml += `<option value="${val}" ${lead.stage === val ? 'selected' : ''}>${label}</option>`;
        });

        tr.innerHTML = `
            <td style="font-weight: 600;">${lead.name}</td>
            <td class="mono">${lead.contact}</td>
            <td>${lead.type}</td>
            <td class="mono" style="color: var(--accent);">${formatBudget(lead.budget)}</td>
            <td>
                <select class="status-select" onchange="changeLeadStatus('${lead.id}', this.value)">
                    ${optionsHtml}
                </select>
            </td>
            <td style="color: var(--text-dim);">${dateStr}</td>
            <td>
                <div class="action-group">
                    <button class="btn-icon" style="color: #ff5e5e; border-color: rgba(255, 94, 94, 0.3);" title="Удалить" onclick="deleteClient('${lead.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
        return tr;
    }

    function renderClientsTables() {
        const tbodyActive = document.getElementById('clients-table-active');
        const tbodyCompleted = document.getElementById('clients-table-completed');

        tbodyActive.innerHTML = '';
        tbodyCompleted.innerHTML = '';

        const queryActive = document.getElementById('client-search-active').value.toLowerCase();
        const queryCompleted = document.getElementById('client-search-completed').value.toLowerCase();

        const activeLeads = leads.filter(l => l.stage !== 'completed' && (l.name.toLowerCase().includes(queryActive) || l.contact.toLowerCase().includes(queryActive)));
        const completedLeads = leads.filter(l => l.stage === 'completed' && (l.name.toLowerCase().includes(queryCompleted) || l.contact.toLowerCase().includes(queryCompleted)));

        document.getElementById('clients-active-count').textContent = activeLeads.length;
        document.getElementById('clients-completed-count').textContent = completedLeads.length;

        if (activeLeads.length === 0) tbodyActive.innerHTML = '<tr><td colspan="7" class="empty-state">Нет данных</td></tr>';
        else activeLeads.forEach(l => tbodyActive.appendChild(createClientRow(l)));

        if (completedLeads.length === 0) tbodyCompleted.innerHTML = '<tr><td colspan="7" class="empty-state">Нет данных</td></tr>';
        else completedLeads.forEach(l => tbodyCompleted.appendChild(createClientRow(l)));
    }

    // 7. Global Handlers (for inline onclicks)
    window.closeLead = async function (id) {
        if (confirm('Закрыть лид и перенести в завершенные?')) {
            await changeLeadStatus(id, 'completed');
        }
    };

    window.changeLeadStatus = async function (id, newStatus) {
        // Optimistic UI update
        const idx = leads.findIndex(l => l.id === id);
        if (idx > -1) {
            leads[idx].stage = newStatus;
            renderAll();
        }

        // Database update
        const { error } = await supabaseClient
            .from('leads')
            .update({ stage: newStatus })
            .eq('id', id);
        
        if (error) {
            console.error('Ошибка изменения статуса:', error);
            fetchLeads(); // revert optimistic update on error
        }
    };

    window.deleteClient = async function (id) {
        if (confirm('Точно удалить?')) {
            // Optimistic
            leads = leads.filter(l => l.id !== id);
            renderAll();

            // DB
            const { error } = await supabaseClient
                .from('leads')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Ошибка удаления:', error);
                fetchLeads(); // revert on error
            }
        }
    };

    // 8. Lead Edit Modal Logic
    const leadModal = document.getElementById('leadModal');
    const leadForm = document.getElementById('leadForm');
    const leadModalTitle = document.getElementById('leadModalTitle');

    document.getElementById('btn-add-lead').addEventListener('click', () => {
        leadForm.reset();
        document.getElementById('l-id').value = '';
        document.getElementById('l-stage').value = 'new';
        leadModalTitle.textContent = 'Добавить проект / лид';
        leadModal.classList.add('is-open');
    });

    document.querySelector('#leadModal .modal-close').addEventListener('click', () => {
        leadModal.classList.remove('is-open');
    });

    window.openLeadModal = function (id) {
        const lead = leads.find(l => l.id === id);
        if (!lead) return;

        document.getElementById('l-id').value = lead.id;
        document.getElementById('l-stage').value = lead.stage;
        document.getElementById('l-name').value = lead.name;
        document.getElementById('l-contact').value = lead.contact;
        document.getElementById('l-type').value = lead.type;
        document.getElementById('l-budget').value = lead.budget;
        document.getElementById('l-desc').value = lead.description || '';

        leadModalTitle.textContent = 'Редактировать проект';
        leadModal.classList.add('is-open');
    };

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const origText = btnSubmit.textContent;
        btnSubmit.textContent = 'Сохранение...';
        btnSubmit.disabled = true;

        const idVal = document.getElementById('l-id').value;
        const leadData = {
            name: document.getElementById('l-name').value,
            contact: document.getElementById('l-contact').value,
            type: document.getElementById('l-type').value,
            budget: document.getElementById('l-budget').value,
            description: document.getElementById('l-desc').value,
            stage: document.getElementById('l-stage').value
        };

        if (idVal) {
            // Update
            const { error } = await supabaseClient
                .from('leads')
                .update(leadData)
                .eq('id', idVal);
            if (error) console.error('Error updating lead:', error);
        } else {
            // Insert
            const { data: { session } } = await supabaseClient.auth.getSession();
            const { error } = await supabaseClient
                .from('leads')
                .insert([{
                    ...leadData,
                    user_id: session.user.id,
                    notes: [] // default empty jsonb array
                }]);
            if (error) console.error('Error creating lead:', error);
        }

        // Подписка на вебсокеты сама вызовет fetchLeads() и перерисует дашборд.
        // Если без вебсокетов: await fetchLeads();
        
        btnSubmit.textContent = origText;
        btnSubmit.disabled = false;
        leadModal.classList.remove('is-open');
    });

    document.getElementById('btn-delete-lead').addEventListener('click', async () => {
        const idVal = document.getElementById('l-id').value;
        if (idVal && confirm('Точно удалить проект?')) {
            await deleteClient(idVal);
            leadModal.classList.remove('is-open');
        }
    });

    // 9. Notes Modal Logic
    const notesModal = document.getElementById('notesModal');
    const noteForm = document.getElementById('noteForm');

    document.querySelector('#notesModal .modal-close').addEventListener('click', () => {
        notesModal.classList.remove('is-open');
        resetNoteForm();
    });

    function resetNoteForm() {
        noteForm.reset();
        document.getElementById('n-note-id').value = '';
        document.getElementById('btn-submit-note').textContent = 'Отправить';
        document.getElementById('btn-cancel-note').style.display = 'none';
    }

    document.getElementById('btn-cancel-note').addEventListener('click', resetNoteForm);

    window.deleteNote = async function (leadId, noteDate) {
        if (!confirm('Точно удалить заметку?')) return;
        
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        
        const newNotes = (lead.notes || []).filter(n => n.date !== noteDate);
        
        // Optimistic
        lead.notes = newNotes;
        openNotesModal(leadId);

        // DB Update
        const { error } = await supabaseClient
            .from('leads')
            .update({ notes: newNotes })
            .eq('id', leadId);
            
        if (error) {
            console.error('Error deleting note:', error);
            fetchLeads();
        }
    };

    window.editNote = function (leadId, noteDate) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const note = lead.notes.find(n => n.date === noteDate);
        if (!note) return;

        document.getElementById('n-note-id').value = note.date;
        document.getElementById('n-stage').value = note.stage;
        document.getElementById('n-text').value = note.text;

        document.getElementById('btn-submit-note').textContent = 'Сохранить';
        document.getElementById('btn-cancel-note').style.display = 'block';
    };

    window.openNotesModal = function (id) {
        const lead = leads.find(l => l.id === id);
        if (!lead) return;

        document.getElementById('n-lead-id').value = lead.id;
        document.getElementById('notesProjectName').textContent = `Проект: ${lead.name}`;

        const timeline = document.getElementById('notesTimeline');
        timeline.innerHTML = '';

        const notes = lead.notes || [];
        if (notes.length === 0) {
            timeline.innerHTML = '<div class="empty-state" style="padding: 20px;">Нет заметок. Добавьте первую!</div>';
        } else {
            const sortedNotes = [...notes].sort((a, b) => b.date - a.date);
            sortedNotes.forEach(note => {
                const d = new Date(note.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                timeline.innerHTML += `
                    <div class="note-item">
                        <div class="note-header">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span class="note-stage">${STAGE_NAMES[note.stage] || note.stage}</span>
                                <span class="note-date">${d}</span>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button type="button" class="btn-icon" style="width: 26px; height: 26px;" title="Редактировать" onclick="editNote('${lead.id}', ${note.date})">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button type="button" class="btn-icon" style="width: 26px; height: 26px; color: #ff5e5e; border-color: rgba(255, 94, 94, 0.3);" title="Удалить" onclick="deleteNote('${lead.id}', ${note.date})">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="note-text">${note.text}</div>
                    </div>
                `;
            });
        }

        notesModal.classList.add('is-open');
    };

    noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const origText = btnSubmit.textContent;
        btnSubmit.textContent = 'Сохранение...';
        btnSubmit.disabled = true;

        const leadIdVal = document.getElementById('n-lead-id').value;
        const noteIdVal = document.getElementById('n-note-id').value;
        const text = document.getElementById('n-text').value;
        const stage = document.getElementById('n-stage').value;

        const lead = leads.find(l => l.id === leadIdVal); // ID is UUID string in DB usually
        if (lead) {
            let currentNotes = lead.notes ? [...lead.notes] : [];

            if (noteIdVal) {
                const noteIdx = currentNotes.findIndex(n => n.date === parseInt(noteIdVal));
                if (noteIdx > -1) {
                    currentNotes[noteIdx].text = text;
                    currentNotes[noteIdx].stage = stage;
                }
            } else {
                currentNotes.push({
                    date: Date.now(),
                    text: text,
                    stage: stage
                });
            }

            // DB Update
            const { error } = await supabaseClient
                .from('leads')
                .update({ notes: currentNotes })
                .eq('id', leadIdVal);

            if (error) {
                console.error('Error saving note:', error);
            } else {
                // Оптимистичное обновление
                lead.notes = currentNotes;
                resetNoteForm();
                openNotesModal(leadIdVal); // re-render modal
            }
        }
        
        btnSubmit.textContent = origText;
        btnSubmit.disabled = false;
    });

    // Search listeners
    document.getElementById('client-search-active').addEventListener('input', renderClientsTables);
    document.getElementById('client-search-completed').addEventListener('input', renderClientsTables);

    // Accordion toggle for Completed clients
    const completedHeader = document.getElementById('completed-clients-header');
    if (completedHeader) {
        completedHeader.addEventListener('click', () => {
            const body = document.getElementById('completed-clients-body');
            const icon = document.getElementById('completed-toggle-icon');
            if (body.style.display === 'none') {
                body.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }

    // Запускаем первую загрузку данных
    fetchLeads();
});
