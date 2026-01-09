document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskInput = document.getElementById('task-input');
    const dateInput = document.getElementById('date-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const searchInput = document.getElementById('search-input');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    const filterBtn = document.getElementById('filter-btn');
    const filterMenu = document.getElementById('filter-menu');
    const filterItems = document.querySelectorAll('#filter-menu .dropdown-item');
    
    const sortBtn = document.getElementById('sort-btn');
    const sortMenu = document.getElementById('sort-menu');
    const sortItems = document.querySelectorAll('#sort-menu .dropdown-item');

    const totalTasksEl = document.getElementById('total-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    const pendingTasksEl = document.getElementById('pending-tasks');
    const progressPercentEl = document.getElementById('progress-percent');
    const progressBar = document.getElementById('progress-bar');

    const editModal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close-modal');
    const editTaskInput = document.getElementById('edit-task-input');
    const editDateInput = document.getElementById('edit-date-input');
    const saveEditBtn = document.getElementById('save-edit-btn');

    // --- State ---
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all'; 
    let currentSort = 'newest';
    let isEditingSubtask = false;
    let editTargetId = null;
    let editParentId = null; 
    let expandedTasks = new Set(); 

    // --- Functions ---

    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const updateStats = () => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        totalTasksEl.innerText = total;
        completedTasksEl.innerText = completed;
        pendingTasksEl.innerText = pending;
        progressPercentEl.innerText = `${percent}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;
    };

    const renderTasks = () => {
        todoList.innerHTML = '';
        const searchText = searchInput.value.toLowerCase();

        let filteredTasks = tasks.filter(task => {
            const matchesSearch = task.text.toLowerCase().includes(searchText);
            let matchesFilter = true;
            if (currentFilter === 'pending') matchesFilter = !task.completed;
            else if (currentFilter === 'completed') matchesFilter = task.completed;
            return matchesSearch && matchesFilter;
        });

        filteredTasks.sort((a, b) => {
            if (currentSort === 'newest') return b.id - a.id;
            if (currentSort === 'oldest') return a.id - b.id;
            if (currentSort === 'az') return a.text.localeCompare(b.text);
            if (currentSort === 'za') return b.text.localeCompare(a.text);
            return 0;
        });

        if (filteredTasks.length === 0) {
            todoList.innerHTML = '<div style="text-align:center; padding: 40px; color: #888;">No tasks found.</div>';
            updateStats();
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'todo-item-container';

            const isExpanded = expandedTasks.has(task.id);
            const subtaskCount = task.subtasks ? task.subtasks.length : 0;
            const hasSubtasks = subtaskCount > 0;
            
            // Logika cek subtask untuk tombol utama
            const hasUnfinishedSubtasks = task.subtasks && task.subtasks.some(sub => !sub.completed);

            let actionBtnClass, actionBtnIcon, actionBtnTitle;

            if (task.completed) {
                actionBtnClass = 'btn-undo';
                actionBtnIcon = 'fa-rotate-left';
                actionBtnTitle = 'Undo';
            } else if (hasUnfinishedSubtasks) {
                actionBtnClass = 'btn-blocked';
                actionBtnIcon = 'fa-xmark';
                actionBtnTitle = 'Complete all subtasks first';
            } else {
                actionBtnClass = 'btn-check';
                actionBtnIcon = 'fa-check';
                actionBtnTitle = 'Complete';
            }

            let subtasksHtml = '';
            if (hasSubtasks) {
                task.subtasks.forEach(sub => {
                    subtasksHtml += `
                        <div class="todo-row sub-row">
                            <div class="task-name-wrapper">
                                <span class="task-text ${sub.completed ? 'completed-text' : ''}">${sub.text}</span>
                            </div>
                            <div class="task-date">${formatDate(sub.date)}</div>
                            <div class="task-status">
                                <span class="status-badge ${sub.completed ? 'status-completed' : 'status-pending'}">
                                    ${sub.completed ? 'Completed' : 'Pending'}
                                </span>
                            </div>
                            <div class="actions">
                                <button class="action-btn btn-edit" onclick="openEditModal(${sub.id}, ${task.id})">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="action-btn ${sub.completed ? 'btn-undo' : 'btn-check'}" onclick="toggleSubtask(${task.id}, ${sub.id})">
                                    <i class="fa-solid ${sub.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
                                </button>
                                <button class="action-btn btn-delete" onclick="deleteSubtask(${task.id}, ${sub.id})">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            li.innerHTML = `
                <div class="todo-row main-row">
                    <div class="task-name-wrapper">
                        <button class="toggle-sub-btn ${isExpanded ? 'rotated' : ''}" 
                                style="visibility: ${hasSubtasks ? 'visible' : 'hidden'}"
                                onclick="toggleExpand(${task.id})">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                        <span class="task-text ${task.completed ? 'completed-text' : ''}">
                            ${task.text} 
                            ${hasSubtasks ? `<small style="color:#bbb; font-size:10px; margin-left:5px;">(${subtaskCount})</small>` : ''}
                        </span>
                    </div>
                    <div class="task-date">${formatDate(task.date)}</div>
                    <div class="task-status">
                        <span class="status-badge ${task.completed ? 'status-completed' : 'status-pending'}">
                            ${task.completed ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                    <div class="actions">
                        <button class="action-btn btn-subtask" title="Add Subtask" onclick="addSubtask(${task.id})">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <button class="action-btn btn-edit" title="Edit Task" onclick="openEditModal(${task.id})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        
                        <button class="action-btn ${actionBtnClass}" title="${actionBtnTitle}" onclick="toggleTask(${task.id})">
                            <i class="fa-solid ${actionBtnIcon}"></i>
                        </button>

                        <button class="action-btn btn-delete" title="Delete" onclick="deleteTask(${task.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="subtasks-container ${isExpanded ? 'show-subtasks' : ''}" id="sub-container-${task.id}">
                    ${subtasksHtml}
                </div>
            `;
            todoList.appendChild(li);
        });
        updateStats();
    };

    // --- Core Logic ---

    const addTask = () => {
        const text = taskInput.value.trim();
        const date = dateInput.value;

        // Validasi 1: Cek apakah input teks kosong
        if (text === '') {
            alert("Please enter a task description");
            return;
        }

        // Validasi 2: Cek apakah input tanggal kosong (PERMINTAAN ANDA)
        if (date === '') {
            alert("Please select a due date first");
            return;
        }

        tasks.push({ id: Date.now(), text, date, completed: false, subtasks: [] });
        saveTasks();
        taskInput.value = '';
        dateInput.value = '';
    };

    window.toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        
        if (!task.completed) {
            const hasUnfinished = task.subtasks && task.subtasks.some(sub => !sub.completed);
            if (hasUnfinished) {
                alert("Please complete all your activities first");
                return;
            }
        }
        task.completed = !task.completed;
        saveTasks();
    };

    window.addSubtask = (parentId) => {
        const subText = prompt("Enter subtask description:");
        if (!subText || subText.trim() === "") return;

        const parentTask = tasks.find(t => t.id === parentId);
        
        const isDuplicate = parentTask.subtasks.some(sub => 
            sub.text.trim().toLowerCase() === subText.trim().toLowerCase()
        );

        if (isDuplicate) {
            const confirmAdd = confirm("The to do list has already been registered, are you sure you want to add it again?");
            if (!confirmAdd) return;
        }

        parentTask.subtasks.push({
            id: Date.now(),
            text: subText,
            date: parentTask.date,
            completed: false
        });
        expandedTasks.add(parentId);
        saveTasks();
    };

    window.toggleSubtask = (parentId, subId) => {
        const parent = tasks.find(t => t.id === parentId);
        const sub = parent.subtasks.find(s => s.id === subId);
        sub.completed = !sub.completed;
        saveTasks();
    };

    window.deleteSubtask = (parentId, subId) => {
        if(confirm('Remove this subtask?')) {
            const parent = tasks.find(t => t.id === parentId);
            parent.subtasks = parent.subtasks.filter(s => s.id !== subId);
            saveTasks();
        }
    };

    window.deleteTask = (id) => {
        if(confirm('Delete this task and its subtasks?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
        }
    };

    window.toggleExpand = (id) => {
        expandedTasks.has(id) ? expandedTasks.delete(id) : expandedTasks.add(id);
        renderTasks();
    };

    // --- Modal Edit ---
    window.openEditModal = (id, parentId = null) => {
        editTargetId = id;
        editParentId = parentId;
        isEditingSubtask = !!parentId;
        const data = isEditingSubtask 
            ? tasks.find(t => t.id === parentId).subtasks.find(s => s.id === id)
            : tasks.find(t => t.id === id);
        
        editTaskInput.value = data.text;
        editDateInput.value = data.date || '';
        editModal.style.display = 'block';
    };

    saveEditBtn.addEventListener('click', () => {
        const text = editTaskInput.value.trim();
        if (!text) return;
        if (isEditingSubtask) {
            const sub = tasks.find(t => t.id === editParentId).subtasks.find(s => s.id === editTargetId);
            sub.text = text; sub.date = editDateInput.value;
        } else {
            const task = tasks.find(t => t.id === editTargetId);
            task.text = text; task.date = editDateInput.value;
        }
        saveTasks();
        editModal.style.display = 'none';
    });

    // --- Filter & Sort Events ---
    const closeAllDropdowns = () => document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show-dropdown'));
    
    filterBtn.onclick = (e) => { e.stopPropagation(); closeAllDropdowns(); filterMenu.classList.toggle('show-dropdown'); };
    sortBtn.onclick = (e) => { e.stopPropagation(); closeAllDropdowns(); sortMenu.classList.toggle('show-dropdown'); };
    
    filterItems.forEach(item => {
        item.onclick = () => {
            filterItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            renderTasks();
        };
    });

    sortItems.forEach(item => {
        item.onclick = () => {
            sortItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentSort = item.dataset.sort;
            renderTasks();
        };
    });

    window.onclick = () => closeAllDropdowns();
    closeModal.onclick = () => editModal.style.display = 'none';

    deleteAllBtn.onclick = () => { if(confirm('Delete ALL?')) { tasks = []; saveTasks(); } };
    addBtn.onclick = addTask;
    taskInput.onkeypress = (e) => { if(e.key === 'Enter') addTask(); };
    searchInput.oninput = renderTasks;

    renderTasks();
});