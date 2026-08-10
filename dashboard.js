document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State & Local Storage
    const STORAGE_KEY = 'levcode_crm_leads';
    let leads = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

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

    // 2. Tab Routing
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

    // 3. Helpers
    function saveLeads() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
        renderAll();
    }

    function renderAll() {
        renderOverview();
        renderProjectsTable();
        renderClientsTables();
    }

    function formatBudget(b) {
        if(b === '5000') return 'до 5000 ₽';
        if(b === '5000-10000') return '5-10k ₽';
        if(b === '10000-20000') return '10-20k ₽';
        if(b === 'other') return 'Обсуждаемо';
        return b;
    }

    // 4. Renders
    function renderOverview() {
        const activeLeads = leads.filter(l => l.stage !== 'completed');
        const newLeads = leads.filter(l => l.stage === 'new');
        const completedLeads = leads.filter(l => l.stage === 'completed');
        
        let revenue = 0;
        activeLeads.forEach(l => {
            if(l.budget === '5000') revenue += 5000;
            else if(l.budget === '5000-10000') revenue += 7500;
            else if(l.budget === '10000-20000') revenue += 15000;
            else if(l.budget === 'other') revenue += 20000;
        });

        document.getElementById('metric-leads').textContent = newLeads.length;
        document.getElementById('metric-active').textContent = activeLeads.length;
        document.getElementById('metric-completed').textContent = completedLeads.length;
        document.getElementById('metric-revenue').textContent = revenue.toLocaleString('ru-RU') + ' ₽';

        // Recent Leads list
        const recentList = document.getElementById('recent-leads-list');
        recentList.innerHTML = '';
        const sortedNew = [...leads].sort((a,b) => b.createdAt - a.createdAt).slice(0, 5);
        if(sortedNew.length === 0) recentList.innerHTML = '<div class="empty-state">Нет новых заявок</div>';
        
        sortedNew.forEach(lead => {
            const dateStr = new Date(lead.createdAt).toLocaleDateString('ru-RU');
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
        if(inProgress.length === 0) activeList.innerHTML = '<div class="empty-state">Нет активных проектов</div>';

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
        
        // Show all non-completed projects here
        const activeLeads = leads.filter(l => l.stage !== 'completed');

        if(activeLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет активных проектов</td></tr>';
            return;
        }

        activeLeads.forEach(lead => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td style="font-weight: 600;">${lead.name}</td>
                <td class="mono">${lead.contact}</td>
                <td>${lead.type}</td>
                <td><span class="li-badge ${lead.stage==='new'?'new':'active'}">${STAGE_NAMES[lead.stage] || lead.stage}</span></td>
                <td class="mono" style="color: var(--accent);">${formatBudget(lead.budget)}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon" title="Заметки" onclick="openNotesModal(${lead.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                        <button class="btn-icon" title="Редактировать" onclick="openLeadModal(${lead.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button class="btn-icon success" title="Завершить проект" onclick="closeLead(${lead.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function createClientRow(lead) {
        const dateStr = new Date(lead.createdAt).toLocaleDateString('ru-RU');
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
                <select class="status-select" onchange="changeLeadStatus(${lead.id}, this.value)">
                    ${optionsHtml}
                </select>
            </td>
            <td style="color: var(--text-dim);">${dateStr}</td>
            <td>
                <div class="action-group">
                    <button class="btn-icon" style="color: #ff5e5e; border-color: rgba(255, 94, 94, 0.3);" title="Удалить" onclick="deleteClient(${lead.id})">
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

        if(activeLeads.length === 0) tbodyActive.innerHTML = '<tr><td colspan="7" class="empty-state">Нет данных</td></tr>';
        else activeLeads.forEach(l => tbodyActive.appendChild(createClientRow(l)));

        if(completedLeads.length === 0) tbodyCompleted.innerHTML = '<tr><td colspan="7" class="empty-state">Нет данных</td></tr>';
        else completedLeads.forEach(l => tbodyCompleted.appendChild(createClientRow(l)));
    }

    // Window global functions for inline onclick handlers
    window.closeLead = function(id) {
        if(confirm('Закрыть лид и перенести в завершенные?')) {
            changeLeadStatus(id, 'completed');
        }
    };

    window.changeLeadStatus = function(id, newStatus) {
        const idx = leads.findIndex(l => l.id === id);
        if(idx > -1) {
            leads[idx].stage = newStatus;
            saveLeads();
        }
    };

    window.deleteClient = function(id) {
        if(confirm('Точно удалить?')) {
            leads = leads.filter(l => l.id !== id);
            saveLeads();
        }
    };

    // 5. Lead Edit Modal Logic
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

    window.openLeadModal = function(id) {
        const lead = leads.find(l => l.id === id);
        if(!lead) return;

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

    leadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const idVal = document.getElementById('l-id').value;
        const leadData = {
            name: document.getElementById('l-name').value,
            contact: document.getElementById('l-contact').value,
            type: document.getElementById('l-type').value,
            budget: document.getElementById('l-budget').value,
            description: document.getElementById('l-desc').value,
            stage: document.getElementById('l-stage').value
        };

        if(idVal) {
            const idx = leads.findIndex(l => l.id === parseInt(idVal));
            if(idx > -1) leads[idx] = { ...leads[idx], ...leadData };
        } else {
            leads.push({
                id: Date.now(),
                createdAt: Date.now(),
                notes: [],
                ...leadData
            });
        }

        saveLeads();
        leadModal.classList.remove('is-open');
    });

    document.getElementById('btn-delete-lead').addEventListener('click', () => {
        const idVal = document.getElementById('l-id').value;
        if(idVal && confirm('Точно удалить проект?')) {
            leads = leads.filter(l => l.id !== parseInt(idVal));
            saveLeads();
            leadModal.classList.remove('is-open');
        }
    });

    // 6. Notes Modal Logic
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

    window.deleteNote = function(leadId, noteDate) {
        if(!confirm('Точно удалить заметку?')) return;
        const leadIdx = leads.findIndex(l => l.id === leadId);
        if(leadIdx > -1) {
            leads[leadIdx].notes = leads[leadIdx].notes.filter(n => n.date !== noteDate);
            saveLeads();
            openNotesModal(leadId);
        }
    };

    window.editNote = function(leadId, noteDate) {
        const lead = leads.find(l => l.id === leadId);
        if(!lead) return;
        const note = lead.notes.find(n => n.date === noteDate);
        if(!note) return;

        document.getElementById('n-note-id').value = note.date;
        document.getElementById('n-stage').value = note.stage;
        document.getElementById('n-text').value = note.text;
        
        document.getElementById('btn-submit-note').textContent = 'Сохранить';
        document.getElementById('btn-cancel-note').style.display = 'block';
    };

    window.openNotesModal = function(id) {
        const lead = leads.find(l => l.id === id);
        if(!lead) return;

        document.getElementById('n-lead-id').value = lead.id;
        document.getElementById('notesProjectName').textContent = `Проект: ${lead.name}`;
        
        // Render timeline
        const timeline = document.getElementById('notesTimeline');
        timeline.innerHTML = '';
        
        const notes = lead.notes || [];
        if(notes.length === 0) {
            timeline.innerHTML = '<div class="empty-state" style="padding: 20px;">Нет заметок. Добавьте первую!</div>';
        } else {
            // Sort newest first
            const sortedNotes = [...notes].sort((a,b) => b.date - a.date);
            sortedNotes.forEach(note => {
                const d = new Date(note.date).toLocaleString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});
                timeline.innerHTML += `
                    <div class="note-item">
                        <div class="note-header">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span class="note-stage">${STAGE_NAMES[note.stage] || note.stage}</span>
                                <span class="note-date">${d}</span>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button type="button" class="btn-icon" style="width: 26px; height: 26px;" title="Редактировать" onclick="editNote(${lead.id}, ${note.date})">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button type="button" class="btn-icon" style="width: 26px; height: 26px; color: #ff5e5e; border-color: rgba(255, 94, 94, 0.3);" title="Удалить" onclick="deleteNote(${lead.id}, ${note.date})">
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

    noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const leadIdVal = document.getElementById('n-lead-id').value;
        const noteIdVal = document.getElementById('n-note-id').value;
        const text = document.getElementById('n-text').value;
        const stage = document.getElementById('n-stage').value;

        const idx = leads.findIndex(l => l.id === parseInt(leadIdVal));
        if(idx > -1) {
            if(!leads[idx].notes) leads[idx].notes = [];
            
            if (noteIdVal) {
                const noteIdx = leads[idx].notes.findIndex(n => n.date === parseInt(noteIdVal));
                if (noteIdx > -1) {
                    leads[idx].notes[noteIdx].text = text;
                    leads[idx].notes[noteIdx].stage = stage;
                }
            } else {
                leads[idx].notes.push({
                    date: Date.now(),
                    text: text,
                    stage: stage
                });
            }

            saveLeads();
            resetNoteForm();
            openNotesModal(parseInt(leadIdVal));
        }
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

    // Initial render
    renderAll();
});
