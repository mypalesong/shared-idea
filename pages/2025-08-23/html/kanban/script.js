/**
 * Enterprise Kanban Board Application
 * Advanced project management with real-time collaboration features
 */

class EnterpriseKanbanBoard {
    constructor() {
        // Core data structures
        this.projects = JSON.parse(localStorage.getItem('kanban-projects')) || this.getDefaultProjects();
        this.currentProject = localStorage.getItem('kanban-current-project') || 'default';
        this.tasks = JSON.parse(localStorage.getItem(`kanban-tasks-${this.currentProject}`)) || [];
        this.columns = JSON.parse(localStorage.getItem(`kanban-columns-${this.currentProject}`)) || this.getDefaultColumns();
        this.users = this.getDefaultUsers();
        this.labels = JSON.parse(localStorage.getItem('kanban-labels')) || this.getDefaultLabels();
        this.selectedTasks = new Set();
        this.filters = {
            assignee: [],
            priority: [],
            labels: [],
            dueDate: ''
        };
        
        // State management
        this.taskIdCounter = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
        this.columnIdCounter = this.columns.length > 0 ? Math.max(...this.columns.map(c => c.id)) + 1 : 1;
        this.isLoading = true;
        this.currentView = 'board';
        this.isFullscreen = false;
        this.editingTask = null;
        this.draggedTask = null;
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.showLoadingScreen();
            await this.setupEventListeners();
            await this.loadProject(this.currentProject);
            await this.renderBoard();
            await this.updateAnalytics();
            await this.hideLoadingScreen();
            
            this.showNotification('Welcome to ProjectFlow', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    // Loading and UI Management
    async showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        loadingScreen.classList.remove('hidden');
        app.classList.add('hidden');
        
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    async hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        loadingScreen.classList.add('hidden');
        app.classList.remove('hidden');
        
        this.isLoading = false;
    }

    // Event Management
    setupEventListeners() {
        // Navigation events
        this.addEventListeners([
            ['#project-select', 'change', (e) => this.switchProject(e.target.value)],
            ['#global-search', 'input', (e) => this.handleGlobalSearch(e.target.value)],
            ['#filter-btn', 'click', () => this.toggleFiltersPanel()],
            ['#analytics-btn', 'click', () => this.showAnalyticsModal()],
            ['#settings-btn', 'click', () => this.showSettingsModal()],
            
            // Toolbar events
            ['#add-task-btn', 'click', () => this.showTaskModal()],
            ['#add-column-btn', 'click', () => this.showColumnModal()],
            ['#bulk-actions-btn', 'click', () => this.showBulkActionsMenu()],
            ['#board-view', 'click', () => this.switchView('board')],
            ['#list-view', 'click', () => this.switchView('list')],
            ['#timeline-view', 'click', () => this.switchView('timeline')],
            ['#export-btn', 'click', () => this.exportData()],
            ['#fullscreen-btn', 'click', () => this.toggleFullscreen()],
            
            // Filter events
            ['#apply-filters', 'click', () => this.applyFilters()],
            ['#clear-filters', 'click', () => this.clearFilters()],
            
            // Modal events
            ['.close-btn', 'click', (e) => this.closeModal(e.target.closest('.modal'))],
            ['#save-task-btn', 'click', () => this.saveTask()],
            ['#cancel-btn', 'click', () => this.closeTaskModal()],
            ['#delete-task-btn', 'click', () => this.deleteCurrentTask()],
            
            // Column modal events
            ['#save-column-btn', 'click', () => this.saveColumn()],
            ['#cancel-column-btn', 'click', () => this.closeColumnModal()],
            
            // Task form events
            ['#task-labels', 'keypress', (e) => this.handleLabelInput(e)],
            ['#add-subtask-btn', 'click', () => this.addSubtask()],
            ['#add-comment-btn', 'click', () => this.addComment()],
            ['#task-attachments', 'change', (e) => this.handleFileUpload(e)],
            
            // Column placeholder
            ['#add-column-placeholder', 'click', () => this.showColumnModal()],
            
            // Global events
            [document, 'keydown', (e) => this.handleKeyboardShortcuts(e)],
            [document, 'click', (e) => this.handleGlobalClick(e)],
            [window, 'resize', () => this.handleWindowResize()],
            [window, 'beforeunload', () => this.handleBeforeUnload()]
        ]);

        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Setup context menu
        this.setupContextMenu();
    }

    addEventListeners(listeners) {
        listeners.forEach(([selector, event, handler]) => {
            const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector];
            elements.forEach(element => {
                if (element) {
                    element.addEventListener(event, handler);
                    
                    // Store for cleanup
                    const key = `${selector}-${event}`;
                    if (!this.eventListeners.has(key)) {
                        this.eventListeners.set(key, []);
                    }
                    this.eventListeners.get(key).push({ element, handler });
                }
            });
        });
    }

    // Project Management
    getDefaultProjects() {
        return {
            'default': { name: 'Default Project', description: 'Default project workspace' },
            'web-app': { name: 'Web Application', description: 'Frontend web application development' },
            'mobile-app': { name: 'Mobile App', description: 'Mobile application project' },
            'api-service': { name: 'API Service', description: 'Backend API service development' }
        };
    }

    getDefaultColumns() {
        return [
            { id: 1, name: 'Backlog', color: '#94a3b8', wipLimit: null, position: 0 },
            { id: 2, name: 'To Do', color: '#3b82f6', wipLimit: 5, position: 1 },
            { id: 3, name: 'In Progress', color: '#f59e0b', wipLimit: 3, position: 2 },
            { id: 4, name: 'Review', color: '#8b5cf6', wipLimit: 2, position: 3 },
            { id: 5, name: 'Done', color: '#10b981', wipLimit: null, position: 4 }
        ];
    }

    getDefaultUsers() {
        return {
            'john.doe': { name: 'John Doe', email: 'john.doe@example.com', avatar: 'JD', color: '#667eea' },
            'jane.smith': { name: 'Jane Smith', email: 'jane.smith@example.com', avatar: 'JS', color: '#f093fb' },
            'bob.wilson': { name: 'Bob Wilson', email: 'bob.wilson@example.com', avatar: 'BW', color: '#4facfe' },
            'alice.brown': { name: 'Alice Brown', email: 'alice.brown@example.com', avatar: 'AB', color: '#43e97b' }
        };
    }

    getDefaultLabels() {
        return [
            { name: 'Bug', color: '#ef4444' },
            { name: 'Feature', color: '#3b82f6' },
            { name: 'Enhancement', color: '#8b5cf6' },
            { name: 'Documentation', color: '#06b6d4' },
            { name: 'Testing', color: '#f59e0b' },
            { name: 'Security', color: '#dc2626' },
            { name: 'Performance', color: '#059669' },
            { name: 'UI/UX', color: '#ec4899' }
        ];
    }

    async switchProject(projectId) {
        if (projectId === this.currentProject) return;
        
        this.showNotification('Switching project...', 'info');
        
        // Save current project state
        this.saveToLocalStorage();
        
        // Load new project
        this.currentProject = projectId;
        localStorage.setItem('kanban-current-project', projectId);
        
        await this.loadProject(projectId);
        await this.renderBoard();
        await this.updateAnalytics();
        
        this.showNotification(`Switched to ${this.projects[projectId].name}`, 'success');
    }

    async loadProject(projectId) {
        this.tasks = JSON.parse(localStorage.getItem(`kanban-tasks-${projectId}`)) || [];
        this.columns = JSON.parse(localStorage.getItem(`kanban-columns-${projectId}`)) || this.getDefaultColumns();
        this.taskIdCounter = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
        this.columnIdCounter = this.columns.length > 0 ? Math.max(...this.columns.map(c => c.id)) + 1 : 1;
        
        // Add demo data if empty
        if (this.tasks.length === 0) {
            this.addDemoTasks();
        }
    }

    // Board Rendering
    async renderBoard() {
        const boardContainer = document.getElementById('board');
        boardContainer.innerHTML = '';
        
        // Sort columns by position
        const sortedColumns = [...this.columns].sort((a, b) => a.position - b.position);
        
        sortedColumns.forEach(column => {
            const columnElement = this.createColumnElement(column);
            boardContainer.appendChild(columnElement);
        });
        
        this.updateTaskCounts();
        this.checkWipLimits();
    }

    createColumnElement(column) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnId = column.id;
        columnDiv.innerHTML = `
            <div class="column-header">
                <div class="column-title" onclick="kanban.editColumn(${column.id})">
                    <div class="column-color" style="background: ${column.color}"></div>
                    <span>${this.escapeHtml(column.name)}</span>
                </div>
                <div class="column-stats">
                    <span class="task-count">0</span>
                    ${column.wipLimit ? `<span class="wip-limit" data-limit="${column.wipLimit}">/ ${column.wipLimit}</span>` : ''}
                </div>
                <div class="column-actions">
                    <button class="column-action-btn" onclick="kanban.editColumn(${column.id})" title="Edit Column">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="column-action-btn" onclick="kanban.deleteColumn(${column.id})" title="Delete Column">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="task-list" data-column-id="${column.id}"></div>
        `;
        
        // Get tasks for this column
        const columnTasks = this.getFilteredTasks().filter(task => task.column === column.id);
        const taskList = columnDiv.querySelector('.task-list');
        
        columnTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });
        
        return columnDiv;
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        taskDiv.draggable = true;
        taskDiv.dataset.taskId = task.id;
        
        const user = this.users[task.assignee];
        const dueClass = this.getDueDateClass(task.dueDate);
        const progress = this.getTaskProgress(task);
        
        taskDiv.innerHTML = `
            <div class="task-priority-indicator ${task.priority}"></div>
            <div class="task-header">
                <span class="task-id">#${task.id}</span>
            </div>
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            ${task.labels && task.labels.length > 0 ? `
                <div class="task-labels">
                    ${task.labels.map(label => `<span class="task-label" style="background: ${this.getLabelColor(label)}">${label}</span>`).join('')}
                </div>
            ` : ''}
            <div class="task-meta">
                <div class="task-meta-left">
                    ${task.assignee && user ? `
                        <div class="task-assignee">
                            <div class="task-assignee-avatar" style="background: ${user.color}">${user.avatar}</div>
                        </div>
                    ` : ''}
                    ${task.dueDate ? `
                        <div class="task-due-date ${dueClass}">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDate(task.dueDate)}
                        </div>
                    ` : ''}
                </div>
                <div class="task-meta-right">
                    ${task.storyPoints ? `<span class="task-story-points">${task.storyPoints}</span>` : ''}
                    ${task.attachments && task.attachments.length > 0 ? `
                        <div class="task-attachments">
                            <i class="fas fa-paperclip"></i>
                            <span>${task.attachments.length}</span>
                        </div>
                    ` : ''}
                    ${task.comments && task.comments.length > 0 ? `
                        <div class="task-comments">
                            <i class="fas fa-comment"></i>
                            <span>${task.comments.length}</span>
                        </div>
                    ` : ''}
                    ${task.subtasks && task.subtasks.length > 0 ? `
                        <div class="task-subtasks">
                            <i class="fas fa-list-ul"></i>
                            <span>${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            ${progress > 0 ? `
                <div class="task-progress">
                    <div class="task-progress-bar" style="width: ${progress}%"></div>
                </div>
            ` : ''}
        `;
        
        // Add event listeners
        this.attachTaskEventListeners(taskDiv, task);
        
        return taskDiv;
    }

    attachTaskEventListeners(taskElement, task) {
        taskElement.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                this.clearTaskSelection();
            }
            this.selectTask(task.id);
            this.showTaskModal(task);
        });
        
        taskElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, task);
        });
        
        taskElement.addEventListener('dragstart', (e) => {
            this.handleTaskDragStart(e, task);
        });
        
        taskElement.addEventListener('dragend', (e) => {
            this.handleTaskDragEnd(e, task);
        });
    }

    // Task Management
    showTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        
        this.editingTask = task;
        modalTitle.textContent = task ? 'Edit Task' : 'Create New Task';
        
        if (task) {
            this.populateTaskForm(task);
        } else {
            this.clearTaskForm();
        }
        
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.getElementById('task-title').focus();
    }

    populateTaskForm(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-size').value = task.storyPoints || '';
        document.getElementById('task-assignee').value = task.assignee || '';
        document.getElementById('task-due-date').value = task.dueDate || '';
        
        // Populate labels
        this.renderSelectedLabels(task.labels || []);
        
        // Populate attachments
        this.renderAttachments(task.attachments || []);
        
        // Populate subtasks
        this.renderSubtasks(task.subtasks || []);
        
        // Populate comments
        this.renderComments(task.comments || []);
    }

    clearTaskForm() {
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-size').value = '';
        document.getElementById('task-assignee').value = '';
        document.getElementById('task-due-date').value = '';
        document.getElementById('task-labels').value = '';
        
        this.renderSelectedLabels([]);
        this.renderAttachments([]);
        this.renderSubtasks([]);
        this.renderComments([]);
    }

    async saveTask() {
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const storyPoints = document.getElementById('task-size').value;
        const assignee = document.getElementById('task-assignee').value;
        const dueDate = document.getElementById('task-due-date').value;
        
        if (!title) {
            this.showNotification('Task title is required', 'error');
            document.getElementById('task-title').focus();
            return;
        }
        
        const labels = Array.from(document.querySelectorAll('.selected-label')).map(el => el.textContent.replace('×', '').trim());
        const attachments = this.getCurrentAttachments();
        const subtasks = this.getCurrentSubtasks();
        const comments = this.getCurrentComments();
        
        const taskData = {
            title,
            description,
            priority,
            storyPoints: storyPoints ? parseInt(storyPoints) : null,
            assignee,
            dueDate,
            labels,
            attachments,
            subtasks,
            comments,
            updatedAt: new Date().toISOString()
        };
        
        if (this.editingTask) {
            // Update existing task
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTask.id);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                this.showNotification('Task updated successfully', 'success');
            }
        } else {
            // Create new task
            const newTask = {
                id: this.taskIdCounter++,
                ...taskData,
                column: this.columns[0].id, // Add to first column
                createdAt: new Date().toISOString(),
                createdBy: 'john.doe' // Current user
            };
            
            this.tasks.push(newTask);
            this.showNotification('Task created successfully', 'success');
        }
        
        this.saveToLocalStorage();
        await this.renderBoard();
        await this.updateAnalytics();
        this.closeTaskModal();
    }

    deleteCurrentTask() {
        if (!this.editingTask) return;
        
        if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            this.tasks = this.tasks.filter(t => t.id !== this.editingTask.id);
            this.saveToLocalStorage();
            this.renderBoard();
            this.updateAnalytics();
            this.closeTaskModal();
            this.showNotification('Task deleted successfully', 'success');
        }
    }

    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
        this.editingTask = null;
    }

    // Column Management
    showColumnModal(column = null) {
        const modal = document.getElementById('column-modal');
        const modalTitle = document.getElementById('column-modal-title');
        
        this.editingColumn = column;
        modalTitle.textContent = column ? 'Edit Column' : 'Add Column';
        
        if (column) {
            document.getElementById('column-name').value = column.name;
            document.getElementById('column-wip-limit').value = column.wipLimit || '';
            document.getElementById('column-color').value = column.color;
        } else {
            document.getElementById('column-name').value = '';
            document.getElementById('column-wip-limit').value = '';
            document.getElementById('column-color').value = '#667eea';
        }
        
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.getElementById('column-name').focus();
    }

    saveColumn() {
        const name = document.getElementById('column-name').value.trim();
        const wipLimit = document.getElementById('column-wip-limit').value;
        const color = document.getElementById('column-color').value;
        
        if (!name) {
            this.showNotification('Column name is required', 'error');
            return;
        }
        
        const columnData = {
            name,
            wipLimit: wipLimit ? parseInt(wipLimit) : null,
            color
        };
        
        if (this.editingColumn) {
            // Update existing column
            const columnIndex = this.columns.findIndex(c => c.id === this.editingColumn.id);
            if (columnIndex !== -1) {
                this.columns[columnIndex] = { ...this.columns[columnIndex], ...columnData };
                this.showNotification('Column updated successfully', 'success');
            }
        } else {
            // Create new column
            const newColumn = {
                id: this.columnIdCounter++,
                ...columnData,
                position: this.columns.length
            };
            
            this.columns.push(newColumn);
            this.showNotification('Column created successfully', 'success');
        }
        
        this.saveToLocalStorage();
        this.renderBoard();
        this.closeColumnModal();
    }

    editColumn(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (column) {
            this.showColumnModal(column);
        }
    }

    deleteColumn(columnId) {
        if (this.columns.length <= 1) {
            this.showNotification('Cannot delete the last column', 'error');
            return;
        }
        
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        const tasksInColumn = this.tasks.filter(t => t.column === columnId);
        
        let confirmMessage = `Are you sure you want to delete the "${column.name}" column?`;
        if (tasksInColumn.length > 0) {
            confirmMessage += `\n\nThis column contains ${tasksInColumn.length} task(s). They will be moved to the first column.`;
        }
        
        if (confirm(confirmMessage)) {
            // Move tasks to first column
            if (tasksInColumn.length > 0) {
                const firstColumn = this.columns.find(c => c.id !== columnId);
                tasksInColumn.forEach(task => {
                    task.column = firstColumn.id;
                });
            }
            
            // Delete column
            this.columns = this.columns.filter(c => c.id !== columnId);
            
            // Reorder positions
            this.columns.forEach((col, index) => {
                col.position = index;
            });
            
            this.saveToLocalStorage();
            this.renderBoard();
            this.showNotification('Column deleted successfully', 'success');
        }
    }

    closeColumnModal() {
        const modal = document.getElementById('column-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
        this.editingColumn = null;
    }

    // Drag and Drop
    setupDragAndDrop() {
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleTaskDragStart(e, task) {
        this.draggedTask = task;
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', task.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    }

    handleTaskDragEnd(e, task) {
        e.target.classList.remove('dragging');
        this.draggedTask = null;
        
        // Remove drag-over class from all columns
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const taskList = e.target.closest('.task-list');
        if (taskList && this.draggedTask) {
            taskList.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        const taskList = e.target.closest('.task-list');
        if (!taskList || !this.draggedTask) return;
        
        taskList.classList.remove('drag-over');
        
        const newColumnId = parseInt(taskList.dataset.columnId);
        const oldColumnId = this.draggedTask.column;
        
        if (newColumnId !== oldColumnId) {
            // Check WIP limits
            const newColumn = this.columns.find(c => c.id === newColumnId);
            if (newColumn.wipLimit) {
                const tasksInColumn = this.tasks.filter(t => t.column === newColumnId);
                if (tasksInColumn.length >= newColumn.wipLimit) {
                    this.showNotification(`WIP limit exceeded for "${newColumn.name}" column`, 'warning');
                    this.showWipWarning();
                    return;
                }
            }
            
            // Move task
            this.moveTask(this.draggedTask.id, newColumnId);
            
            // Log activity
            this.logActivity('task_moved', {
                taskId: this.draggedTask.id,
                from: this.columns.find(c => c.id === oldColumnId)?.name,
                to: this.columns.find(c => c.id === newColumnId)?.name
            });
        }
    }

    moveTask(taskId, newColumnId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const oldColumnId = task.column;
        task.column = newColumnId;
        task.updatedAt = new Date().toISOString();
        
        // Add to activity log
        task.activity = task.activity || [];
        task.activity.push({
            type: 'moved',
            from: oldColumnId,
            to: newColumnId,
            timestamp: new Date().toISOString(),
            user: 'john.doe' // Current user
        });
        
        this.saveToLocalStorage();
        this.renderBoard();
        this.updateAnalytics();
    }

    // Search and Filters
    handleGlobalSearch(query) {
        const searchResults = document.getElementById('search-results');
        
        if (!query.trim()) {
            searchResults.style.display = 'none';
            return;
        }
        
        const results = this.searchTasks(query);
        this.renderSearchResults(results);
        searchResults.style.display = results.length > 0 ? 'block' : 'none';
    }

    searchTasks(query) {
        const searchTerm = query.toLowerCase();
        return this.tasks.filter(task => {
            return (
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                (task.labels && task.labels.some(label => label.toLowerCase().includes(searchTerm))) ||
                (task.assignee && this.users[task.assignee]?.name.toLowerCase().includes(searchTerm)) ||
                task.id.toString().includes(searchTerm)
            );
        }).slice(0, 10); // Limit results
    }

    renderSearchResults(results) {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = results.map(task => {
            const user = this.users[task.assignee];
            const column = this.columns.find(c => c.id === task.column);
            
            return `
                <div class="search-result-item" onclick="kanban.showTaskModal(kanban.tasks.find(t => t.id === ${task.id}))">
                    <div class="search-result-title">#${task.id} ${this.escapeHtml(task.title)}</div>
                    <div class="search-result-meta">
                        ${column ? `<span class="search-result-column">${column.name}</span>` : ''}
                        ${user ? `<span class="search-result-assignee">${user.name}</span>` : ''}
                        <span class="search-result-priority priority-${task.priority}">${task.priority}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleFiltersPanel() {
        const filtersPanel = document.getElementById('filters-panel');
        const filterBtn = document.getElementById('filter-btn');
        
        filtersPanel.classList.toggle('show');
        filterBtn.classList.toggle('active');
        
        if (filtersPanel.classList.contains('show')) {
            this.populateFilterOptions();
        }
    }

    populateFilterOptions() {
        // Populate assignee filter
        const assigneeFilter = document.getElementById('filter-assignee');
        assigneeFilter.innerHTML = '<option value="">All Assignees</option>' +
            Object.entries(this.users).map(([id, user]) => `<option value="${id}">${user.name}</option>`).join('');
        
        // Populate labels filter
        const labelsFilter = document.getElementById('filter-labels');
        const allLabels = new Set();
        this.tasks.forEach(task => {
            if (task.labels) {
                task.labels.forEach(label => allLabels.add(label));
            }
        });
        
        labelsFilter.innerHTML = '<option value="">All Labels</option>' +
            Array.from(allLabels).map(label => `<option value="${label}">${label}</option>`).join('');
    }

    applyFilters() {
        const assigneeFilter = Array.from(document.getElementById('filter-assignee').selectedOptions).map(o => o.value).filter(v => v);
        const priorityFilter = Array.from(document.getElementById('filter-priority').selectedOptions).map(o => o.value).filter(v => v);
        const labelsFilter = Array.from(document.getElementById('filter-labels').selectedOptions).map(o => o.value).filter(v => v);
        const dueDateFilter = document.getElementById('filter-due-date').value;
        
        this.filters = {
            assignee: assigneeFilter,
            priority: priorityFilter,
            labels: labelsFilter,
            dueDate: dueDateFilter
        };
        
        this.renderBoard();
        this.showNotification(`Filters applied - ${this.getFilteredTasks().length} tasks shown`, 'info');
    }

    clearFilters() {
        this.filters = {
            assignee: [],
            priority: [],
            labels: [],
            dueDate: ''
        };
        
        // Reset filter controls
        document.getElementById('filter-assignee').selectedIndex = 0;
        document.getElementById('filter-priority').selectedIndex = 0;
        document.getElementById('filter-labels').selectedIndex = 0;
        document.getElementById('filter-due-date').selectedIndex = 0;
        
        this.renderBoard();
        this.showNotification('Filters cleared', 'info');
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            // Assignee filter
            if (this.filters.assignee.length > 0 && !this.filters.assignee.includes(task.assignee || '')) {
                return false;
            }
            
            // Priority filter
            if (this.filters.priority.length > 0 && !this.filters.priority.includes(task.priority)) {
                return false;
            }
            
            // Labels filter
            if (this.filters.labels.length > 0) {
                const hasMatchingLabel = this.filters.labels.some(label => 
                    task.labels && task.labels.includes(label)
                );
                if (!hasMatchingLabel) return false;
            }
            
            // Due date filter
            if (this.filters.dueDate) {
                const now = new Date();
                const taskDue = task.dueDate ? new Date(task.dueDate) : null;
                
                switch (this.filters.dueDate) {
                    case 'overdue':
                        if (!taskDue || taskDue >= now) return false;
                        break;
                    case 'today':
                        if (!taskDue || !this.isSameDay(taskDue, now)) return false;
                        break;
                    case 'this-week':
                        if (!taskDue || !this.isThisWeek(taskDue)) return false;
                        break;
                    case 'next-week':
                        if (!taskDue || !this.isNextWeek(taskDue)) return false;
                        break;
                }
            }
            
            return true;
        });
    }

    // Analytics and Reporting
    async updateAnalytics() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => {
            const column = this.columns.find(c => c.id === t.column);
            return column && column.name.toLowerCase() === 'done';
        }).length;
        
        const overdueTasks = this.tasks.filter(t => {
            return t.dueDate && new Date(t.dueDate) < new Date() && 
                   !this.columns.find(c => c.id === t.column)?.name.toLowerCase().includes('done');
        }).length;
        
        const avgCycleTime = this.calculateAverageCycleTime();
        
        // Update stats if analytics modal is open
        const totalTasksEl = document.getElementById('total-tasks');
        const completedTasksEl = document.getElementById('completed-tasks');
        const avgCycleTimeEl = document.getElementById('avg-cycle-time');
        const overdueTasksEl = document.getElementById('overdue-tasks');
        
        if (totalTasksEl) totalTasksEl.textContent = totalTasks;
        if (completedTasksEl) completedTasksEl.textContent = completedTasks;
        if (avgCycleTimeEl) avgCycleTimeEl.textContent = avgCycleTime.toFixed(1);
        if (overdueTasksEl) overdueTasksEl.textContent = overdueTasks;
    }

    calculateAverageCycleTime() {
        const completedTasks = this.tasks.filter(t => {
            const column = this.columns.find(c => c.id === t.column);
            return column && column.name.toLowerCase() === 'done' && t.createdAt && t.updatedAt;
        });
        
        if (completedTasks.length === 0) return 0;
        
        const totalCycleTime = completedTasks.reduce((sum, task) => {
            const created = new Date(task.createdAt);
            const completed = new Date(task.updatedAt);
            const cycleTime = (completed - created) / (1000 * 60 * 60 * 24); // Days
            return sum + cycleTime;
        }, 0);
        
        return totalCycleTime / completedTasks.length;
    }

    showAnalyticsModal() {
        const modal = document.getElementById('analytics-modal');
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        this.updateAnalytics();
        this.renderAnalyticsCharts();
    }

    renderAnalyticsCharts() {
        // Placeholder for chart rendering
        // In a real implementation, you would use a charting library like Chart.js
        this.renderTaskDistributionChart();
        this.renderCompletionRateChart();
        this.renderTeamPerformanceChart();
        this.renderCycleTimeChart();
    }

    renderTaskDistributionChart() {
        const chartContainer = document.getElementById('task-distribution-chart');
        const columnCounts = this.columns.map(column => ({
            name: column.name,
            count: this.tasks.filter(t => t.column === column.id).length,
            color: column.color
        }));
        
        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                ${columnCounts.map(col => `
                    <div class="chart-bar" style="background: ${col.color}; height: ${Math.max(col.count * 10, 5)}px;">
                        <div class="chart-label">${col.name}: ${col.count}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCompletionRateChart() {
        const chartContainer = document.getElementById('completion-rate-chart');
        const completedTasks = this.tasks.filter(t => {
            const column = this.columns.find(c => c.id === t.column);
            return column && column.name.toLowerCase() === 'done';
        }).length;
        
        const completionRate = this.tasks.length > 0 ? (completedTasks / this.tasks.length * 100) : 0;
        
        chartContainer.innerHTML = `
            <div class="progress-ring">
                <div class="progress-circle" style="--progress: ${completionRate}%">
                    <span class="progress-text">${completionRate.toFixed(1)}%</span>
                </div>
                <div class="progress-label">Completion Rate</div>
            </div>
        `;
    }

    renderTeamPerformanceChart() {
        const chartContainer = document.getElementById('team-performance-chart');
        const userStats = Object.entries(this.users).map(([id, user]) => ({
            name: user.name,
            assigned: this.tasks.filter(t => t.assignee === id).length,
            completed: this.tasks.filter(t => t.assignee === id && 
                this.columns.find(c => c.id === t.column)?.name.toLowerCase() === 'done').length
        }));
        
        chartContainer.innerHTML = `
            <div class="team-stats">
                ${userStats.map(user => `
                    <div class="user-stat">
                        <div class="user-name">${user.name}</div>
                        <div class="user-counts">
                            <span class="assigned">${user.assigned} assigned</span>
                            <span class="completed">${user.completed} completed</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCycleTimeChart() {
        const chartContainer = document.getElementById('cycle-time-chart');
        const avgCycleTime = this.calculateAverageCycleTime();
        
        chartContainer.innerHTML = `
            <div class="cycle-time-metric">
                <div class="metric-value">${avgCycleTime.toFixed(1)}</div>
                <div class="metric-label">Days Average</div>
                <div class="metric-trend">
                    <i class="fas fa-chart-line"></i>
                    Cycle time trend over last 30 days
                </div>
            </div>
        `;
    }

    // Utility Functions
    updateTaskCounts() {
        this.columns.forEach(column => {
            const count = this.getFilteredTasks().filter(t => t.column === column.id).length;
            const countElement = document.querySelector(`[data-column-id="${column.id}"] .task-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    checkWipLimits() {
        let hasExceeded = false;
        
        this.columns.forEach(column => {
            if (column.wipLimit) {
                const taskCount = this.tasks.filter(t => t.column === column.id).length;
                const columnElement = document.querySelector(`[data-column-id="${column.id}"]`);
                const wipLimitElement = columnElement?.querySelector('.wip-limit');
                
                if (taskCount >= column.wipLimit) {
                    columnElement?.classList.add('wip-exceeded');
                    wipLimitElement?.classList.add('exceeded');
                    hasExceeded = true;
                } else {
                    columnElement?.classList.remove('wip-exceeded');
                    wipLimitElement?.classList.remove('exceeded');
                }
            }
        });
        
        if (hasExceeded) {
            this.showWipWarning();
        } else {
            this.hideWipWarning();
        }
    }

    showWipWarning() {
        const warning = document.getElementById('wip-warning');
        warning.classList.remove('hidden');
        
        setTimeout(() => {
            this.hideWipWarning();
        }, 5000);
    }

    hideWipWarning() {
        const warning = document.getElementById('wip-warning');
        warning.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // Context Menu
    setupContextMenu() {
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('context-menu');
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('show');
            }
        });
    }

    showContextMenu(e, task) {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.add('show');
        
        // Store current task for context actions
        this.contextTask = task;
        
        // Add event listeners to context menu items
        contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = () => this.handleContextAction(item.dataset.action);
        });
    }

    handleContextAction(action) {
        if (!this.contextTask) return;
        
        switch (action) {
            case 'edit':
                this.showTaskModal(this.contextTask);
                break;
            case 'clone':
                this.cloneTask(this.contextTask);
                break;
            case 'move':
                this.showMoveTaskDialog(this.contextTask);
                break;
            case 'archive':
                this.archiveTask(this.contextTask);
                break;
            case 'delete':
                this.deleteTaskById(this.contextTask.id);
                break;
        }
        
        document.getElementById('context-menu').classList.remove('show');
    }

    cloneTask(task) {
        const clonedTask = {
            ...task,
            id: this.taskIdCounter++,
            title: `${task.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.tasks.push(clonedTask);
        this.saveToLocalStorage();
        this.renderBoard();
        this.showNotification('Task cloned successfully', 'success');
    }

    deleteTaskById(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToLocalStorage();
            this.renderBoard();
            this.updateAnalytics();
            this.showNotification('Task deleted successfully', 'success');
        }
    }

    // Task Selection
    selectTask(taskId) {
        this.selectedTasks.add(taskId);
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        taskElement?.classList.add('selected');
    }

    clearTaskSelection() {
        this.selectedTasks.clear();
        document.querySelectorAll('.task-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    // Label Management
    handleLabelInput(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = e.target;
            const label = input.value.trim();
            
            if (label && !this.hasLabel(label)) {
                this.addLabel(label);
                input.value = '';
            }
        }
    }

    addLabel(labelName) {
        const selectedLabels = document.getElementById('selected-labels');
        const labelElement = document.createElement('span');
        labelElement.className = 'selected-label';
        labelElement.innerHTML = `
            ${labelName}
            <button type="button" class="remove-label" onclick="this.parentElement.remove()">×</button>
        `;
        selectedLabels.appendChild(labelElement);
    }

    hasLabel(labelName) {
        return Array.from(document.querySelectorAll('.selected-label')).some(el => 
            el.textContent.replace('×', '').trim() === labelName
        );
    }

    renderSelectedLabels(labels) {
        const container = document.getElementById('selected-labels');
        container.innerHTML = labels.map(label => `
            <span class="selected-label">
                ${label}
                <button type="button" class="remove-label" onclick="this.parentElement.remove()">×</button>
            </span>
        `).join('');
    }

    getLabelColor(labelName) {
        const label = this.labels.find(l => l.name === labelName);
        return label ? label.color : '#94a3b8';
    }

    // File Upload and Attachments
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            this.addAttachment({
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString()
            });
        });
    }

    addAttachment(attachment) {
        const attachmentList = document.getElementById('attachment-list');
        const attachmentElement = document.createElement('div');
        attachmentElement.className = 'attachment-item';
        attachmentElement.innerHTML = `
            <div class="attachment-info">
                <i class="fas fa-${this.getFileIcon(attachment.type)}"></i>
                <span class="attachment-name">${attachment.name}</span>
                <span class="attachment-size">(${this.formatFileSize(attachment.size)})</span>
            </div>
            <button type="button" class="remove-attachment" onclick="this.parentElement.remove()">×</button>
        `;
        attachmentList.appendChild(attachmentElement);
    }

    renderAttachments(attachments) {
        const container = document.getElementById('attachment-list');
        container.innerHTML = attachments.map(attachment => `
            <div class="attachment-item">
                <div class="attachment-info">
                    <i class="fas fa-${this.getFileIcon(attachment.type)}"></i>
                    <span class="attachment-name">${attachment.name}</span>
                    <span class="attachment-size">(${this.formatFileSize(attachment.size)})</span>
                </div>
                <button type="button" class="remove-attachment" onclick="this.parentElement.remove()">×</button>
            </div>
        `).join('');
    }

    getCurrentAttachments() {
        return Array.from(document.querySelectorAll('.attachment-item')).map(el => {
            return {
                name: el.querySelector('.attachment-name').textContent,
                size: parseInt(el.querySelector('.attachment-size').textContent.match(/\d+/)?.[0] || '0'),
                type: 'application/octet-stream', // Default type
                uploadedAt: new Date().toISOString()
            };
        });
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'music';
        if (mimeType.includes('pdf')) return 'file-pdf';
        if (mimeType.includes('word')) return 'file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
        return 'file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Subtasks Management
    addSubtask() {
        const subtasksList = document.getElementById('subtasks-list');
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'subtask-item';
        subtaskElement.innerHTML = `
            <input type="checkbox" class="subtask-checkbox">
            <input type="text" class="subtask-text" placeholder="Enter subtask...">
            <button type="button" class="remove-subtask" onclick="this.parentElement.remove()">×</button>
        `;
        subtasksList.appendChild(subtaskElement);
        
        // Focus the new input
        subtaskElement.querySelector('.subtask-text').focus();
    }

    renderSubtasks(subtasks) {
        const container = document.getElementById('subtasks-list');
        container.innerHTML = subtasks.map(subtask => `
            <div class="subtask-item">
                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
                <input type="text" class="subtask-text" value="${subtask.text}">
                <button type="button" class="remove-subtask" onclick="this.parentElement.remove()">×</button>
            </div>
        `).join('');
    }

    getCurrentSubtasks() {
        return Array.from(document.querySelectorAll('.subtask-item')).map(el => ({
            text: el.querySelector('.subtask-text').value.trim(),
            completed: el.querySelector('.subtask-checkbox').checked
        })).filter(subtask => subtask.text);
    }

    // Comments Management
    addComment() {
        const commentText = document.getElementById('new-comment').value.trim();
        if (!commentText) return;
        
        const comment = {
            id: Date.now(),
            text: commentText,
            author: 'john.doe', // Current user
            timestamp: new Date().toISOString()
        };
        
        const commentsList = document.getElementById('comments-list');
        const commentElement = this.createCommentElement(comment);
        commentsList.appendChild(commentElement);
        
        document.getElementById('new-comment').value = '';
    }

    createCommentElement(comment) {
        const user = this.users[comment.author];
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            <div class="comment-avatar" style="background: ${user?.color || '#94a3b8'}">
                ${user?.avatar || 'U'}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${user?.name || 'Unknown User'}</span>
                    <span class="comment-time">${this.formatRelativeTime(comment.timestamp)}</span>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `;
        return commentDiv;
    }

    renderComments(comments) {
        const container = document.getElementById('comments-list');
        container.innerHTML = comments.map(comment => {
            const user = this.users[comment.author];
            return `
                <div class="comment-item">
                    <div class="comment-avatar" style="background: ${user?.color || '#94a3b8'}">
                        ${user?.avatar || 'U'}
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${user?.name || 'Unknown User'}</span>
                            <span class="comment-time">${this.formatRelativeTime(comment.timestamp)}</span>
                        </div>
                        <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCurrentComments() {
        return Array.from(document.querySelectorAll('.comment-item')).map(el => ({
            id: Date.now() + Math.random(),
            text: el.querySelector('.comment-text').textContent,
            author: 'john.doe', // Current user
            timestamp: new Date().toISOString()
        }));
    }

    // View Management
    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        
        // Switch view implementation
        switch (view) {
            case 'board':
                this.showBoardView();
                break;
            case 'list':
                this.showListView();
                break;
            case 'timeline':
                this.showTimelineView();
                break;
        }
    }

    showBoardView() {
        const boardContainer = document.querySelector('.board-container');
        boardContainer.style.display = 'block';
        this.renderBoard();
    }

    showListView() {
        // Placeholder for list view
        this.showNotification('List view not implemented yet', 'info');
    }

    showTimelineView() {
        // Placeholder for timeline view  
        this.showNotification('Timeline view not implemented yet', 'info');
    }

    // Export and Import
    exportData() {
        const data = {
            project: this.projects[this.currentProject],
            columns: this.columns,
            tasks: this.tasks,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kanban-${this.currentProject}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
    }

    // Keyboard Shortcuts
    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't handle shortcuts when typing
        }
        
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    this.showTaskModal();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('global-search').focus();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveToLocalStorage();
                    this.showNotification('Data saved', 'success');
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportData();
                    break;
            }
        }
        
        switch (e.key) {
            case 'Escape':
                this.closeAllModals();
                this.clearTaskSelection();
                break;
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.isFullscreen = true;
            document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
            document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
    }

    closeModal(modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    // Global Event Handlers
    handleGlobalClick(e) {
        // Close search results when clicking outside
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            document.getElementById('search-results').style.display = 'none';
        }
        
        // Close filters panel when clicking outside
        const filtersPanel = document.getElementById('filters-panel');
        const filterBtn = document.getElementById('filter-btn');
        if (!filtersPanel.contains(e.target) && !filterBtn.contains(e.target)) {
            filtersPanel.classList.remove('show');
            filterBtn.classList.remove('active');
        }
    }

    handleWindowResize() {
        // Handle responsive layout changes
        this.checkMobileLayout();
    }

    checkMobileLayout() {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-layout', isMobile);
    }

    handleBeforeUnload() {
        this.saveToLocalStorage();
    }

    // Data Persistence
    saveToLocalStorage() {
        localStorage.setItem('kanban-projects', JSON.stringify(this.projects));
        localStorage.setItem(`kanban-tasks-${this.currentProject}`, JSON.stringify(this.tasks));
        localStorage.setItem(`kanban-columns-${this.currentProject}`, JSON.stringify(this.columns));
        localStorage.setItem('kanban-labels', JSON.stringify(this.labels));
        localStorage.setItem('kanban-current-project', this.currentProject);
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatRelativeTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    getDueDateClass(dueDate) {
        if (!dueDate) return '';
        
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 2) return 'due-soon';
        return '';
    }

    getTaskProgress(task) {
        if (!task.subtasks || task.subtasks.length === 0) return 0;
        
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        return Math.round((completedSubtasks / task.subtasks.length) * 100);
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isThisWeek(date) {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return date >= startOfWeek && date <= endOfWeek;
    }

    isNextWeek(date) {
        const now = new Date();
        const startOfNextWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        const endOfNextWeek = new Date(now.setDate(now.getDate() - now.getDay() + 13));
        return date >= startOfNextWeek && date <= endOfNextWeek;
    }

    logActivity(type, data) {
        // Activity logging for audit trail
        const activity = {
            type,
            data,
            timestamp: new Date().toISOString(),
            user: 'john.doe' // Current user
        };
        
        console.log('Activity logged:', activity);
    }

    // Demo Data
    addDemoTasks() {
        const demoTasks = [
            {
                id: this.taskIdCounter++,
                title: "Design user authentication flow",
                description: "Create wireframes and mockups for the login, registration, and password reset flows. Include responsive designs for mobile and desktop.",
                priority: "high",
                storyPoints: 8,
                assignee: "jane.smith",
                dueDate: "2025-08-30",
                labels: ["Feature", "UI/UX"],
                column: this.columns[1].id,
                createdAt: "2025-08-20T10:00:00.000Z",
                updatedAt: "2025-08-20T10:00:00.000Z",
                createdBy: "john.doe",
                attachments: [],
                subtasks: [
                    { text: "Research competitor auth flows", completed: true },
                    { text: "Create user journey map", completed: true },
                    { text: "Design login screen mockup", completed: false },
                    { text: "Design registration form", completed: false }
                ],
                comments: [
                    {
                        id: 1,
                        text: "Let's make sure we follow the latest accessibility guidelines for form design.",
                        author: "john.doe",
                        timestamp: "2025-08-21T09:15:00.000Z"
                    }
                ]
            },
            {
                id: this.taskIdCounter++,
                title: "Implement JWT authentication",
                description: "Set up JWT-based authentication system with refresh tokens. Include middleware for protected routes.",
                priority: "critical",
                storyPoints: 13,
                assignee: "bob.wilson",
                dueDate: "2025-08-28",
                labels: ["Feature", "Security"],
                column: this.columns[2].id,
                createdAt: "2025-08-18T14:30:00.000Z",
                updatedAt: "2025-08-22T16:45:00.000Z",
                createdBy: "alice.brown",
                attachments: [
                    { name: "auth-spec.pdf", size: 245760, type: "application/pdf" }
                ],
                subtasks: [
                    { text: "Setup JWT library", completed: true },
                    { text: "Create authentication middleware", completed: true },
                    { text: "Implement token refresh logic", completed: false },
                    { text: "Add rate limiting", completed: false },
                    { text: "Write unit tests", completed: false }
                ],
                comments: []
            },
            {
                id: this.taskIdCounter++,
                title: "Fix mobile responsive layout issues",
                description: "Several layout issues reported on mobile devices. Fix responsive breakpoints and ensure proper mobile experience.",
                priority: "medium",
                storyPoints: 5,
                assignee: "jane.smith",
                dueDate: "2025-08-26",
                labels: ["Bug", "UI/UX"],
                column: this.columns[3].id,
                createdAt: "2025-08-19T11:20:00.000Z",
                updatedAt: "2025-08-23T08:30:00.000Z",
                createdBy: "john.doe",
                attachments: [],
                subtasks: [
                    { text: "Test on various mobile devices", completed: true },
                    { text: "Fix navigation menu overflow", completed: true },
                    { text: "Adjust form field spacing", completed: false }
                ],
                comments: [
                    {
                        id: 2,
                        text: "I've tested this on iPhone 12 and Pixel 5. The navigation looks good now.",
                        author: "jane.smith",
                        timestamp: "2025-08-23T08:15:00.000Z"
                    }
                ]
            },
            {
                id: this.taskIdCounter++,
                title: "Setup CI/CD pipeline",
                description: "Configure GitHub Actions for automated testing, building, and deployment to staging and production environments.",
                priority: "medium",
                storyPoints: 8,
                assignee: "alice.brown",
                dueDate: "2025-09-02",
                labels: ["Enhancement", "DevOps"],
                column: this.columns[0].id,
                createdAt: "2025-08-21T13:45:00.000Z",
                updatedAt: "2025-08-21T13:45:00.000Z",
                createdBy: "bob.wilson",
                attachments: [],
                subtasks: [],
                comments: []
            },
            {
                id: this.taskIdCounter++,
                title: "Update API documentation",
                description: "Update OpenAPI specifications and generate comprehensive API documentation for the new authentication endpoints.",
                priority: "low",
                storyPoints: 3,
                assignee: "bob.wilson",
                dueDate: "2025-09-05",
                labels: ["Documentation"],
                column: this.columns[4].id,
                createdAt: "2025-08-15T09:00:00.000Z",
                updatedAt: "2025-08-22T17:20:00.000Z",
                createdBy: "alice.brown",
                attachments: [],
                subtasks: [
                    { text: "Update OpenAPI spec", completed: true },
                    { text: "Generate HTML documentation", completed: true },
                    { text: "Review with team", completed: true }
                ],
                comments: [
                    {
                        id: 3,
                        text: "Documentation looks great! Ready for review.",
                        author: "bob.wilson",
                        timestamp: "2025-08-22T17:18:00.000Z"
                    }
                ]
            }
        ];
        
        this.tasks = demoTasks;
        this.saveToLocalStorage();
    }

    // Cleanup
    destroy() {
        // Clean up event listeners
        this.eventListeners.forEach((listeners, key) => {
            listeners.forEach(({ element, handler }) => {
                element.removeEventListener(key.split('-')[1], handler);
            });
        });
        this.eventListeners.clear();
        
        // Save final state
        this.saveToLocalStorage();
    }
}

// Initialize the application
let kanban;

document.addEventListener('DOMContentLoaded', () => {
    kanban = new EnterpriseKanbanBoard();
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    if (kanban) {
        kanban.showNotification('An error occurred. Please refresh the page.', 'error');
    }
});

// Prevent data loss
window.addEventListener('beforeunload', (e) => {
    if (kanban) {
        kanban.saveToLocalStorage();
    }
});

// Export for global access
window.kanban = kanban;