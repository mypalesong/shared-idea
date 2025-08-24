class CollaborativeJSONViewer {
    constructor() {
        this.jsonData = null;
        this.currentUser = this.generateUser();
        this.sessionId = this.generateSessionId();
        this.users = new Map();
        this.versions = [];
        this.comments = [];
        this.selectedNode = null;
        this.currentView = 'explorer';
        this.searchQuery = '';
        this.cursors = new Map();
        this.isConnected = false;
        
        // Simulated real-time features
        this.mockSocket = null;
        this.collaborationEnabled = true;
        
        this.initializeApp();
        this.setupEventListeners();
        this.initializeCollaboration();
        this.loadSampleData();
    }

    generateUser() {
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: names[Math.floor(Math.random() * names.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            avatar: names[Math.floor(Math.random() * names.length)][0],
            isOnline: true,
            lastActivity: Date.now()
        };
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 12);
    }

    initializeApp() {
        // Initialize UI elements
        this.elements = {
            // Connection status
            connectionStatus: document.getElementById('connectionStatus'),
            userAvatars: document.getElementById('userAvatars'),
            userCount: document.getElementById('userCount'),
            
            // Session info
            sessionId: document.getElementById('sessionId'),
            sessionCreated: document.getElementById('sessionCreated'),
            dataSize: document.getElementById('dataSize'),
            currentUserName: document.getElementById('currentUserName'),
            currentUserAvatar: document.getElementById('currentUserAvatar'),
            
            // Content areas
            jsonTree: document.getElementById('jsonTree'),
            propertyContent: document.getElementById('propertyContent'),
            propertyTitle: document.getElementById('propertyTitle'),
            tableContent: document.getElementById('tableContent'),
            rawEditor: document.getElementById('rawEditor'),
            diffContent: document.getElementById('diffContent'),
            
            // Activity
            activityFeed: document.getElementById('activityFeed'),
            activitySidebar: document.getElementById('activitySidebar'),
            commentsList: document.getElementById('commentsList'),
            commentInput: document.getElementById('commentInput'),
            versionList: document.getElementById('versionList'),
            
            // Search and filters
            searchInput: document.getElementById('searchInput'),
            breadcrumb: document.getElementById('breadcrumb'),
            
            // Modals
            shareModal: document.getElementById('shareModal'),
            pasteModal: document.getElementById('pasteModal'),
            urlModal: document.getElementById('urlModal'),
            sessionLink: document.getElementById('sessionLink'),
            pasteArea: document.getElementById('pasteArea'),
            urlInput: document.getElementById('urlInput'),
            
            // File input
            fileInput: document.getElementById('fileInput'),
            
            // Status elements
            cursorPos: document.getElementById('cursorPos'),
            jsonSize: document.getElementById('jsonSize'),
            validationStatus: document.getElementById('validationStatus')
        };
        
        // Set initial values
        this.updateUserInfo();
        this.updateSessionInfo();
        this.updateConnectionStatus(false);
    }

    setupEventListeners() {
        // Data source buttons
        document.getElementById('uploadBtn').addEventListener('click', () => this.elements.fileInput.click());
        document.getElementById('urlBtn').addEventListener('click', () => this.showModal('urlModal'));
        document.getElementById('pasteBtn').addEventListener('click', () => this.showModal('pasteModal'));
        document.getElementById('sampleBtn').addEventListener('click', () => this.loadSampleData());
        
        // File input
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Share functionality
        document.getElementById('shareBtn').addEventListener('click', () => this.showShareModal());
        
        // View modes
        document.querySelectorAll('.view-mode').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.mode));
        });
        
        // Search
        this.elements.searchInput.addEventListener('input', _.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));
        
        // Tree operations
        document.getElementById('expandAll').addEventListener('click', () => this.expandAllNodes());
        document.getElementById('collapseAll').addEventListener('click', () => this.collapseAllNodes());
        
        // Comments
        document.getElementById('sendComment').addEventListener('click', () => this.sendComment());
        this.elements.commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendComment();
        });
        
        // Activity sidebar
        document.getElementById('toggleActivity').addEventListener('click', () => this.toggleActivitySidebar());
        
        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.hideModal(e.target.dataset.target));
        });
        
        // Modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(overlay.id);
                }
            });
        });
        
        // Paste modal actions
        document.getElementById('validatePaste').addEventListener('click', () => this.validatePastedJSON());
        document.getElementById('formatPaste').addEventListener('click', () => this.formatPastedJSON());
        document.getElementById('importPaste').addEventListener('click', () => this.importPastedJSON());
        
        // URL modal actions
        document.getElementById('testUrl').addEventListener('click', () => this.testURL());
        document.getElementById('importUrl').addEventListener('click', () => this.importFromURL());
        
        // Raw editor actions
        document.getElementById('formatJson').addEventListener('click', () => this.formatRawJSON());
        document.getElementById('validateJson').addEventListener('click', () => this.validateRawJSON());
        document.getElementById('saveChanges').addEventListener('click', () => this.saveRawChanges());
        
        // Raw editor events
        if (this.elements.rawEditor) {
            this.elements.rawEditor.addEventListener('input', () => this.onRawEditorChange());
            this.elements.rawEditor.addEventListener('selectionchange', () => this.updateCursorPosition());
            this.elements.rawEditor.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
        }
        
        // Copy session ID
        document.getElementById('copySessionId').addEventListener('click', () => this.copySessionId());
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        
        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e.target.dataset.action));
        });
        
        // Sidebar collapse
        document.getElementById('collapseSidebar').addEventListener('click', () => this.toggleSidebar());
        
        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('resize', () => this.handleResize());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    initializeCollaboration() {
        // Simulate connection
        setTimeout(() => {
            this.updateConnectionStatus(true);
            this.addUser(this.currentUser);
            this.simulateCollaborativeActivity();
        }, 1500);
        
        // Add some mock users
        setTimeout(() => {
            this.addMockUsers();
        }, 3000);
    }

    addMockUsers() {
        const mockUsers = [
            { id: 'user2', name: 'Sarah', color: '#f5576c', avatar: 'S', isOnline: true },
            { id: 'user3', name: 'Mike', color: '#4facfe', avatar: 'M', isOnline: true },
            { id: 'user4', name: 'Emma', color: '#43e97b', avatar: 'E', isOnline: false }
        ];
        
        mockUsers.forEach(user => {
            this.addUser(user);
            if (user.isOnline) {
                this.addActivityItem(user.name, 'joined the session', 'join');
            }
        });
    }

    simulateCollaborativeActivity() {
        // Simulate periodic activity
        setInterval(() => {
            if (this.users.size > 1 && Math.random() > 0.7) {
                const users = Array.from(this.users.values()).filter(u => u.id !== this.currentUser.id);
                const user = users[Math.floor(Math.random() * users.length)];
                
                const activities = [
                    'expanded a JSON node',
                    'added a comment',
                    'updated the data',
                    'bookmarked a path',
                    'shared cursor position'
                ];
                
                const activity = activities[Math.floor(Math.random() * activities.length)];
                this.addActivityItem(user.name, activity, 'activity');
            }
        }, 8000);
        
        // Simulate cursor movements
        setInterval(() => {
            this.simulateCursorMovements();
        }, 2000);
    }

    simulateCursorMovements() {
        const users = Array.from(this.users.values()).filter(u => u.id !== this.currentUser.id && u.isOnline);
        
        users.forEach(user => {
            if (Math.random() > 0.6) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                this.updateUserCursor(user.id, x, y);
            }
        });
    }

    updateUserCursor(userId, x, y) {
        const user = this.users.get(userId);
        if (!user || !user.isOnline) return;
        
        let cursor = this.cursors.get(userId);
        if (!cursor) {
            cursor = this.createUserCursor(user);
            this.cursors.set(userId, cursor);
        }
        
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        cursor.style.display = 'block';
        
        // Hide cursor after 3 seconds
        clearTimeout(cursor.hideTimeout);
        cursor.hideTimeout = setTimeout(() => {
            cursor.style.display = 'none';
        }, 3000);
    }

    createUserCursor(user) {
        const cursor = document.createElement('div');
        cursor.className = 'user-cursor';
        cursor.innerHTML = `
            <div class="cursor-icon" style="background: ${user.color}"></div>
            <div class="cursor-label" style="background: ${user.color}">${user.name}</div>
        `;
        
        document.getElementById('cursorsOverlay').appendChild(cursor);
        return cursor;
    }

    async loadSampleData() {
        try {
            this.showToast('Loading sample data...', 'info');
            
            const response = await fetch('../data/data.json');
            if (!response.ok) throw new Error('Failed to load sample data');
            
            const data = await response.json();
            this.setJSONData(data, 'Sample Data');
            
            this.showToast('Sample data loaded successfully', 'success');
            this.addActivityItem('System', 'loaded sample data', 'system');
            
        } catch (error) {
            this.showToast('Failed to load sample data: ' + error.message, 'error');
        }
    }

    setJSONData(data, source = 'Unknown') {
        const previousData = this.jsonData;
        this.jsonData = data;
        
        // Create version history entry
        this.addVersion(data, source);
        
        // Update all views
        this.updateAllViews();
        
        // Update session info
        this.updateDataSize();
        
        // Broadcast change to collaborators
        if (this.collaborationEnabled) {
            this.broadcastDataChange(data, source);
        }
        
        // Show success message
        this.showToast(`Data updated from ${source}`, 'success');
        
        // Add activity
        this.addActivityItem(this.currentUser.name, `imported data from ${source}`, 'data');
    }

    addVersion(data, source) {
        const version = {
            id: Date.now().toString(),
            data: JSON.parse(JSON.stringify(data)), // Deep copy
            source: source,
            author: this.currentUser.name,
            timestamp: Date.now(),
            size: JSON.stringify(data).length
        };
        
        this.versions.unshift(version);
        
        // Keep only last 10 versions
        if (this.versions.length > 10) {
            this.versions = this.versions.slice(0, 10);
        }
        
        this.updateVersionList();
    }

    updateVersionList() {
        if (!this.elements.versionList) return;
        
        if (this.versions.length === 0) {
            this.elements.versionList.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-history"></i>
                    <span>No versions yet</span>
                </div>
            `;
            return;
        }
        
        this.elements.versionList.innerHTML = this.versions.map(version => `
            <div class="version-item" data-version-id="${version.id}">
                <div class="version-avatar">${version.author[0]}</div>
                <div class="version-info">
                    <div class="version-title">${version.source}</div>
                    <div class="version-meta">
                        ${this.formatRelativeTime(version.timestamp)} • ${this.formatBytes(version.size)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        this.elements.versionList.querySelectorAll('.version-item').forEach(item => {
            item.addEventListener('click', () => {
                const versionId = item.dataset.versionId;
                this.restoreVersion(versionId);
            });
        });
    }

    restoreVersion(versionId) {
        const version = this.versions.find(v => v.id === versionId);
        if (!version) return;
        
        this.setJSONData(version.data, `Version: ${version.source}`);
        this.showToast('Version restored successfully', 'success');
    }

    updateAllViews() {
        this.updateExplorerView();
        this.updateTableView();
        this.updateRawView();
        this.updatePropertyPanel();
    }

    updateExplorerView() {
        if (!this.jsonData) {
            this.elements.jsonTree.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <h4>No JSON Data</h4>
                    <p>Upload a file or paste JSON to start collaborating</p>
                </div>
            `;
            return;
        }
        
        this.elements.jsonTree.innerHTML = '';
        const treeNode = this.createTreeNode('root', this.jsonData, []);
        this.elements.jsonTree.appendChild(treeNode);
        
        this.updateBreadcrumb([]);
    }

    createTreeNode(key, value, path, level = 0) {
        const node = document.createElement('div');
        node.className = 'json-node';
        node.dataset.path = path.join('.');
        
        const content = document.createElement('div');
        content.className = 'json-node-content';
        content.style.paddingLeft = `${level * 20}px`;
        
        // Toggle button for objects/arrays
        if (typeof value === 'object' && value !== null) {
            const toggle = document.createElement('button');
            toggle.className = 'node-toggle';
            toggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(node, key, value, path, level);
            });
            content.appendChild(toggle);
        } else {
            content.appendChild(document.createElement('span')); // Spacer
        }
        
        // Key
        const keyElement = document.createElement('span');
        keyElement.className = 'node-key';
        keyElement.textContent = key;
        content.appendChild(keyElement);
        
        // Type badge
        const typeElement = document.createElement('span');
        typeElement.className = 'node-type';
        typeElement.textContent = this.getValueType(value);
        content.appendChild(typeElement);
        
        // Value preview
        const valueElement = document.createElement('span');
        valueElement.className = 'node-value';
        valueElement.textContent = this.getValuePreview(value);
        content.appendChild(valueElement);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'node-actions';
        actions.innerHTML = `
            <button class="btn-icon" title="Copy path"><i class="fas fa-copy"></i></button>
            <button class="btn-icon" title="Add comment"><i class="fas fa-comment"></i></button>
        `;
        content.appendChild(actions);
        
        // Click handler for selection
        content.addEventListener('click', () => {
            this.selectNode(node, key, value, path);
        });
        
        node.appendChild(content);
        return node;
    }

    toggleNode(node, key, value, path, level) {
        const toggle = node.querySelector('.node-toggle i');
        const existing = node.querySelector('.node-children');
        
        if (existing) {
            existing.remove();
            toggle.style.transform = 'rotate(0deg)';
        } else {
            const children = document.createElement('div');
            children.className = 'node-children';
            
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    const childNode = this.createTreeNode(`[${index}]`, item, [...path, index], level + 1);
                    children.appendChild(childNode);
                });
            } else if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([childKey, childValue]) => {
                    const childNode = this.createTreeNode(childKey, childValue, [...path, childKey], level + 1);
                    children.appendChild(childNode);
                });
            }
            
            node.appendChild(children);
            toggle.style.transform = 'rotate(90deg)';
        }
        
        // Broadcast node toggle to collaborators
        this.broadcastNodeToggle(path.join('.'), !existing);
    }

    selectNode(node, key, value, path) {
        // Remove previous selection
        document.querySelectorAll('.json-node-content.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current node
        node.querySelector('.json-node-content').classList.add('selected');
        
        this.selectedNode = { key, value, path };
        
        // Update property panel
        this.updatePropertyPanel();
        
        // Update breadcrumb
        this.updateBreadcrumb(path);
        
        // Broadcast selection to collaborators
        this.broadcastNodeSelection(path.join('.'));
    }

    updatePropertyPanel() {
        if (!this.selectedNode) {
            this.elements.propertyTitle.textContent = 'Properties';
            this.elements.propertyContent.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Select a node to view properties</span>
                </div>
            `;
            return;
        }
        
        const { key, value, path } = this.selectedNode;
        this.elements.propertyTitle.textContent = key || 'Root';
        
        const sections = [];
        
        // Basic info
        sections.push(`
            <div class="property-section">
                <h4>Basic Information</h4>
                <div class="property-grid">
                    <div class="property-item">
                        <div class="property-label">Path</div>
                        <div class="property-value">${path.join('.') || 'root'}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">Type</div>
                        <div class="property-value">${this.getValueType(value)}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">Size</div>
                        <div class="property-value">${this.getValueSize(value)}</div>
                    </div>
                </div>
            </div>
        `);
        
        // Value preview
        sections.push(`
            <div class="property-section">
                <h4>Value</h4>
                <div class="property-value">${this.formatValue(value, 200)}</div>
            </div>
        `);
        
        // Statistics for objects/arrays
        if (typeof value === 'object' && value !== null) {
            const stats = this.getValueStats(value);
            sections.push(`
                <div class="property-section">
                    <h4>Statistics</h4>
                    <div class="property-grid">
                        ${stats.map(stat => `
                            <div class="property-item">
                                <div class="property-label">${stat.label}</div>
                                <div class="property-value">${stat.value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
        }
        
        this.elements.propertyContent.innerHTML = sections.join('');
    }

    updateTableView() {
        if (!this.jsonData) {
            this.elements.tableContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-table"></i>
                    <h4>No Tabular Data</h4>
                    <p>JSON structure cannot be displayed as a table</p>
                </div>
            `;
            return;
        }
        
        const tableData = this.extractTableData(this.jsonData);
        if (tableData.length === 0) {
            this.elements.tableContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-table"></i>
                    <h4>No Tabular Data</h4>
                    <p>JSON structure cannot be displayed as a table</p>
                </div>
            `;
            return;
        }
        
        const table = this.createTable(tableData);
        this.elements.tableContent.innerHTML = '';
        this.elements.tableContent.appendChild(table);
    }

    extractTableData(data) {
        const rows = [];
        
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    rows.push({ ...item, _index: index });
                } else {
                    rows.push({ _index: index, value: item });
                }
            });
        } else if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    rows.push({ ...value, _key: key });
                } else {
                    rows.push({ _key: key, value: value });
                }
            });
        }
        
        return rows;
    }

    createTable(data) {
        if (data.length === 0) return document.createElement('div');
        
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Headers
        const headers = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => headers.add(key));
        });
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        Array.from(headers).forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        data.slice(0, 100).forEach(row => { // Limit to 100 rows
            const tr = document.createElement('tr');
            Array.from(headers).forEach(header => {
                const td = document.createElement('td');
                td.textContent = this.formatCellValue(row[header]);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        return table;
    }

    updateRawView() {
        if (this.jsonData && this.elements.rawEditor) {
            this.elements.rawEditor.value = JSON.stringify(this.jsonData, null, 2);
            this.updateJsonSize();
            this.validateRawJSON();
        }
    }

    updateBreadcrumb(path) {
        if (!this.elements.breadcrumb) return;
        
        const crumbs = ['Root'];
        for (let i = 0; i < path.length; i++) {
            crumbs.push(path.slice(0, i + 1).join('.'));
        }
        
        this.elements.breadcrumb.innerHTML = crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return `<span class="crumb ${isLast ? 'active' : ''}" data-path="${crumb === 'Root' ? '' : crumb}">${crumb}</span>`;
        }).join('');
        
        // Add click handlers
        this.elements.breadcrumb.querySelectorAll('.crumb').forEach(crumb => {
            crumb.addEventListener('click', () => {
                const path = crumb.dataset.path;
                this.navigateToPath(path);
            });
        });
    }

    switchView(viewMode) {
        // Update view mode buttons
        document.querySelectorAll('.view-mode').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === viewMode);
        });
        
        // Update content views
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewMode + 'View');
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewMode;
            
            // Trigger view-specific updates
            switch (viewMode) {
                case 'table':
                    this.updateTableView();
                    break;
                case 'raw':
                    this.updateRawView();
                    break;
                case 'diff':
                    this.updateDiffView();
                    break;
            }
        }
        
        // Broadcast view change
        this.broadcastViewChange(viewMode);
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        
        if (!query) {
            // Clear search highlights
            this.clearSearchHighlights();
            return;
        }
        
        // Perform search and highlight results
        this.performSearch(query);
        
        // Broadcast search to collaborators
        this.broadcastSearch(query);
    }

    performSearch(query) {
        const results = [];
        this.searchInObject(this.jsonData, [], query, results);
        
        // Clear previous highlights
        this.clearSearchHighlights();
        
        // Highlight search results
        results.forEach(result => {
            this.highlightSearchResult(result.path);
        });
        
        this.showToast(`Found ${results.length} results for "${query}"`, 'info');
    }

    searchInObject(obj, path, query, results) {
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    this.searchInObject(item, [...path, index], query, results);
                });
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    // Check key match
                    if (key.toLowerCase().includes(query)) {
                        results.push({ path: [...path, key], type: 'key', value: key });
                    }
                    
                    // Check value match
                    if (typeof value === 'string' && value.toLowerCase().includes(query)) {
                        results.push({ path: [...path, key], type: 'value', value: value });
                    }
                    
                    this.searchInObject(value, [...path, key], query, results);
                });
            }
        }
    }

    clearSearchHighlights() {
        document.querySelectorAll('.json-node-content.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    }

    highlightSearchResult(path) {
        const pathStr = path.join('.');
        const node = document.querySelector(`[data-path="${pathStr}"] .json-node-content`);
        if (node) {
            node.classList.add('highlighted');
        }
    }

    // File handling methods
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showToast('Please select a JSON file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.setJSONData(data, file.name);
            } catch (error) {
                this.showToast('Invalid JSON file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // Modal methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showShareModal() {
        this.elements.sessionLink.value = window.location.href + '?session=' + this.sessionId;
        this.showModal('shareModal');
        
        // Generate QR code (placeholder)
        const qrCode = document.getElementById('qrCode');
        qrCode.innerHTML = `
            <div class="qr-placeholder">
                <i class="fas fa-qrcode"></i>
                <span>QR Code for session</span>
            </div>
        `;
    }

    // Paste JSON methods
    validatePastedJSON() {
        const text = this.elements.pasteArea.value.trim();
        if (!text) {
            this.showToast('Please paste JSON data first', 'warning');
            return;
        }
        
        try {
            JSON.parse(text);
            this.showToast('JSON is valid', 'success');
        } catch (error) {
            this.showToast('Invalid JSON: ' + error.message, 'error');
        }
    }

    formatPastedJSON() {
        const text = this.elements.pasteArea.value.trim();
        if (!text) return;
        
        try {
            const parsed = JSON.parse(text);
            this.elements.pasteArea.value = JSON.stringify(parsed, null, 2);
            this.showToast('JSON formatted', 'success');
        } catch (error) {
            this.showToast('Cannot format invalid JSON', 'error');
        }
    }

    importPastedJSON() {
        const text = this.elements.pasteArea.value.trim();
        if (!text) {
            this.showToast('Please paste JSON data first', 'warning');
            return;
        }
        
        try {
            const data = JSON.parse(text);
            this.setJSONData(data, 'Pasted JSON');
            this.hideModal('pasteModal');
            this.elements.pasteArea.value = '';
        } catch (error) {
            this.showToast('Invalid JSON: ' + error.message, 'error');
        }
    }

    // URL import methods
    async testURL() {
        const url = this.elements.urlInput.value.trim();
        if (!url) {
            this.showToast('Please enter a URL', 'warning');
            return;
        }
        
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                this.showToast('URL is accessible', 'success');
            } else {
                this.showToast(`URL returned status ${response.status}`, 'warning');
            }
        } catch (error) {
            this.showToast('URL is not accessible: ' + error.message, 'error');
        }
    }

    async importFromURL() {
        const url = this.elements.urlInput.value.trim();
        if (!url) {
            this.showToast('Please enter a URL', 'warning');
            return;
        }
        
        try {
            this.showToast('Importing from URL...', 'info');
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setJSONData(data, url);
            this.hideModal('urlModal');
            this.elements.urlInput.value = '';
            
        } catch (error) {
            this.showToast('Import failed: ' + error.message, 'error');
        }
    }

    // Raw editor methods
    onRawEditorChange() {
        this.updateJsonSize();
        _.debounce(() => this.validateRawJSON(), 500)();
    }

    updateCursorPosition() {
        if (!this.elements.rawEditor || !this.elements.cursorPos) return;
        
        const textarea = this.elements.rawEditor;
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        const lines = text.substring(0, cursorPos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        
        this.elements.cursorPos.textContent = `Ln ${line}, Col ${col}`;
    }

    updateJsonSize() {
        if (!this.elements.rawEditor || !this.elements.jsonSize) return;
        
        const text = this.elements.rawEditor.value;
        const bytes = new TextEncoder().encode(text).length;
        this.elements.jsonSize.textContent = this.formatBytes(bytes);
    }

    validateRawJSON() {
        if (!this.elements.rawEditor || !this.elements.validationStatus) return;
        
        const text = this.elements.rawEditor.value.trim();
        if (!text) {
            this.elements.validationStatus.innerHTML = '<i class="fas fa-minus"></i> No content';
            this.elements.validationStatus.className = 'status-invalid';
            return;
        }
        
        try {
            JSON.parse(text);
            this.elements.validationStatus.innerHTML = '<i class="fas fa-check"></i> Valid JSON';
            this.elements.validationStatus.className = 'status-valid';
        } catch (error) {
            this.elements.validationStatus.innerHTML = '<i class="fas fa-times"></i> Invalid JSON';
            this.elements.validationStatus.className = 'status-invalid';
        }
    }

    formatRawJSON() {
        if (!this.elements.rawEditor) return;
        
        const text = this.elements.rawEditor.value.trim();
        if (!text) return;
        
        try {
            const parsed = JSON.parse(text);
            this.elements.rawEditor.value = JSON.stringify(parsed, null, 2);
            this.showToast('JSON formatted', 'success');
        } catch (error) {
            this.showToast('Cannot format invalid JSON', 'error');
        }
    }

    saveRawChanges() {
        if (!this.elements.rawEditor) return;
        
        const text = this.elements.rawEditor.value.trim();
        if (!text) {
            this.showToast('No content to save', 'warning');
            return;
        }
        
        try {
            const data = JSON.parse(text);
            this.setJSONData(data, 'Raw Editor');
            this.showToast('Changes saved', 'success');
        } catch (error) {
            this.showToast('Cannot save invalid JSON: ' + error.message, 'error');
        }
    }

    handleEditorKeydown(event) {
        // Handle common editor shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.saveRawChanges();
                    break;
                case 'f':
                    event.preventDefault();
                    this.formatRawJSON();
                    break;
            }
        }
    }

    // Comments methods
    sendComment() {
        const text = this.elements.commentInput.value.trim();
        if (!text) return;
        
        const comment = {
            id: Date.now().toString(),
            author: this.currentUser.name,
            avatar: this.currentUser.avatar,
            text: text,
            timestamp: Date.now(),
            path: this.selectedNode ? this.selectedNode.path.join('.') : null
        };
        
        this.comments.unshift(comment);
        this.updateCommentsList();
        this.elements.commentInput.value = '';
        
        // Broadcast comment
        this.broadcastComment(comment);
        
        this.addActivityItem(this.currentUser.name, 'added a comment', 'comment');
    }

    updateCommentsList() {
        if (this.comments.length === 0) {
            this.elements.commentsList.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-comments"></i>
                    <span>No comments yet</span>
                </div>
            `;
            return;
        }
        
        this.elements.commentsList.innerHTML = this.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-avatar">${comment.avatar}</div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-time">${this.formatRelativeTime(comment.timestamp)}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    ${comment.path ? `<div class="comment-path">on ${comment.path}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Activity methods
    addActivityItem(author, activity, type = 'activity') {
        const item = {
            id: Date.now().toString(),
            author: author,
            activity: activity,
            type: type,
            timestamp: Date.now()
        };
        
        const activityElement = document.createElement('div');
        activityElement.className = `activity-item ${type}`;
        activityElement.innerHTML = `
            <div class="activity-avatar ${type === 'system' ? 'system' : ''}">
                ${type === 'system' ? '<i class="fas fa-robot"></i>' : author[0]}
            </div>
            <div class="activity-content">
                <div class="activity-text">${author} ${activity}</div>
                <div class="activity-time">${this.formatRelativeTime(item.timestamp)}</div>
            </div>
        `;
        
        this.elements.activityFeed.insertBefore(activityElement, this.elements.activityFeed.firstChild);
        
        // Keep only last 50 items
        const items = this.elements.activityFeed.querySelectorAll('.activity-item');
        if (items.length > 50) {
            items[items.length - 1].remove();
        }
    }

    toggleActivitySidebar() {
        this.elements.activitySidebar.classList.toggle('active');
    }

    // User management methods
    addUser(user) {
        this.users.set(user.id, user);
        this.updateUsersList();
        this.updateUserCount();
    }

    removeUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            this.users.delete(userId);
            this.updateUsersList();
            this.updateUserCount();
            
            // Remove cursor
            const cursor = this.cursors.get(userId);
            if (cursor) {
                cursor.remove();
                this.cursors.delete(userId);
            }
            
            this.addActivityItem(user.name, 'left the session', 'leave');
        }
    }

    updateUsersList() {
        const users = Array.from(this.users.values());
        this.elements.userAvatars.innerHTML = users.map(user => `
            <div class="user-avatar ${user.isOnline ? 'online' : ''}" style="background: ${user.color}" title="${user.name}">
                ${user.avatar}
            </div>
        `).join('');
    }

    updateUserCount() {
        this.elements.userCount.textContent = this.users.size;
    }

    updateUserInfo() {
        this.elements.currentUserName.textContent = this.currentUser.name;
        this.elements.currentUserAvatar.innerHTML = this.currentUser.avatar;
        this.elements.currentUserAvatar.style.background = this.currentUser.color;
    }

    updateSessionInfo() {
        this.elements.sessionId.textContent = this.sessionId;
        this.elements.sessionCreated.textContent = 'just now';
    }

    updateConnectionStatus(isConnected) {
        this.isConnected = isConnected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = this.elements.connectionStatus.querySelector('span');
        
        if (isConnected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Connecting...';
        }
    }

    updateDataSize() {
        if (this.jsonData && this.elements.dataSize) {
            const bytes = JSON.stringify(this.jsonData).length;
            this.elements.dataSize.textContent = this.formatBytes(bytes);
        }
    }

    // Collaboration broadcast methods (simulated)
    broadcastDataChange(data, source) {
        // Simulate broadcasting to other users
        setTimeout(() => {
            const users = Array.from(this.users.values()).filter(u => u.id !== this.currentUser.id);
            if (users.length > 0) {
                const user = users[Math.floor(Math.random() * users.length)];
                this.addActivityItem(user.name, 'received data update', 'sync');
            }
        }, 1000);
    }

    broadcastNodeToggle(path, expanded) {
        // Simulate broadcasting node toggle
    }

    broadcastNodeSelection(path) {
        // Simulate broadcasting node selection
    }

    broadcastViewChange(viewMode) {
        // Simulate broadcasting view change
    }

    broadcastSearch(query) {
        // Simulate broadcasting search
    }

    broadcastComment(comment) {
        // Simulate broadcasting comment
    }

    // Utility methods
    getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    getValuePreview(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) return `Array[${value.length}]`;
        if (typeof value === 'object') return `Object{${Object.keys(value).length}}`;
        return String(value);
    }

    getValueSize(value) {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return `${value.length} items`;
            } else {
                return `${Object.keys(value).length} keys`;
            }
        }
        return `${JSON.stringify(value).length} chars`;
    }

    getValueStats(value) {
        const stats = [];
        
        if (Array.isArray(value)) {
            stats.push({ label: 'Length', value: value.length.toLocaleString() });
            
            const types = {};
            value.forEach(item => {
                const type = this.getValueType(item);
                types[type] = (types[type] || 0) + 1;
            });
            
            stats.push({ label: 'Types', value: Object.keys(types).length });
        } else if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value);
            stats.push({ label: 'Keys', value: keys.length.toLocaleString() });
            
            const depths = [];
            const analyze = (obj, depth = 0) => {
                depths.push(depth);
                if (typeof obj === 'object' && obj !== null) {
                    Object.values(obj).forEach(v => analyze(v, depth + 1));
                }
            };
            analyze(value);
            
            stats.push({ label: 'Max Depth', value: Math.max(...depths) });
        }
        
        return stats;
    }

    formatValue(value, maxLength = 100) {
        if (value === null) return 'null';
        if (typeof value === 'object') {
            const str = JSON.stringify(value, null, 2);
            return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
        }
        const str = String(value);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }

    formatCellValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    // Quick actions
    handleQuickAction(action) {
        switch (action) {
            case 'cursor':
                this.shareCursorPosition();
                break;
            case 'selection':
                this.shareSelection();
                break;
            case 'annotation':
                this.addAnnotation();
                break;
        }
    }

    shareCursorPosition() {
        // Simulate sharing cursor position
        this.addActivityItem(this.currentUser.name, 'shared cursor position', 'cursor');
        this.showToast('Cursor position shared', 'success');
    }

    shareSelection() {
        if (this.selectedNode) {
            this.addActivityItem(this.currentUser.name, `shared selection: ${this.selectedNode.path.join('.')}`, 'selection');
            this.showToast('Selection shared', 'success');
        } else {
            this.showToast('No selection to share', 'warning');
        }
    }

    addAnnotation() {
        // Placeholder for annotation functionality
        this.showToast('Annotation feature coming soon', 'info');
    }

    // Other utility methods
    copySessionId() {
        navigator.clipboard.writeText(this.sessionId).then(() => {
            this.showToast('Session ID copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Failed to copy session ID', 'error');
        });
    }

    exportData() {
        if (!this.jsonData) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(this.jsonData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'collaborative-session-data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully', 'success');
    }

    expandAllNodes() {
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            const icon = toggle.querySelector('i');
            if (icon && !icon.style.transform.includes('90deg')) {
                toggle.click();
            }
        });
    }

    collapseAllNodes() {
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            const icon = toggle.querySelector('i');
            if (icon && icon.style.transform.includes('90deg')) {
                toggle.click();
            }
        });
    }

    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    }

    navigateToPath(pathStr) {
        // Navigate to specific path in the JSON tree
        if (!pathStr) {
            this.selectedNode = null;
            this.updatePropertyPanel();
            return;
        }
        
        const path = pathStr.split('.');
        let current = this.jsonData;
        
        for (const segment of path) {
            if (current && typeof current === 'object') {
                current = current[segment];
            } else {
                this.showToast('Invalid path', 'error');
                return;
            }
        }
        
        // Select the node
        this.selectedNode = {
            key: path[path.length - 1],
            value: current,
            path: path
        };
        
        this.updatePropertyPanel();
        this.updateBreadcrumb(path);
    }

    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'f':
                    event.preventDefault();
                    this.elements.searchInput.focus();
                    break;
                case 's':
                    event.preventDefault();
                    this.exportData();
                    break;
                case 'e':
                    event.preventDefault();
                    this.expandAllNodes();
                    break;
                case 'r':
                    event.preventDefault();
                    this.collapseAllNodes();
                    break;
            }
        }
        
        if (event.key === 'Escape') {
            // Close modals
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    }

    handleResize() {
        // Handle responsive layout changes
        if (window.innerWidth < 1024) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    }

    cleanup() {
        // Cleanup when page is unloaded
        if (this.mockSocket) {
            // Cleanup mock socket
        }
        
        // Clear intervals
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
        }
    }

    updateDiffView() {
        // Populate version selectors
        const version1Select = document.getElementById('version1');
        const version2Select = document.getElementById('version2');
        
        const options = this.versions.map(version => 
            `<option value="${version.id}">${version.source} - ${this.formatRelativeTime(version.timestamp)}</option>`
        ).join('');
        
        version1Select.innerHTML = '<option value="">Select version 1...</option>' + options;
        version2Select.innerHTML = '<option value="">Select version 2...</option>' + options;
        
        // Add compare functionality
        document.getElementById('compareDiff').addEventListener('click', () => {
            const v1Id = version1Select.value;
            const v2Id = version2Select.value;
            
            if (!v1Id || !v2Id) {
                this.showToast('Please select both versions to compare', 'warning');
                return;
            }
            
            this.performDiff(v1Id, v2Id);
        });
    }

    performDiff(version1Id, version2Id) {
        const v1 = this.versions.find(v => v.id === version1Id);
        const v2 = this.versions.find(v => v.id === version2Id);
        
        if (!v1 || !v2) {
            this.showToast('Selected versions not found', 'error');
            return;
        }
        
        // Simple diff implementation
        const differences = this.findDifferences(v1.data, v2.data);
        this.displayDiff(differences);
    }

    findDifferences(obj1, obj2, path = '') {
        const differences = [];
        
        // Simple implementation - in a real app, you'd use a proper diff library
        const keys1 = Object.keys(obj1 || {});
        const keys2 = Object.keys(obj2 || {});
        const allKeys = new Set([...keys1, ...keys2]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const val1 = obj1?.[key];
            const val2 = obj2?.[key];
            
            if (!(key in (obj1 || {}))) {
                differences.push({ type: 'added', path: currentPath, value: val2 });
            } else if (!(key in (obj2 || {}))) {
                differences.push({ type: 'removed', path: currentPath, value: val1 });
            } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
                    differences.push(...this.findDifferences(val1, val2, currentPath));
                } else {
                    differences.push({ type: 'changed', path: currentPath, oldValue: val1, newValue: val2 });
                }
            }
        }
        
        return differences;
    }

    displayDiff(differences) {
        if (differences.length === 0) {
            this.elements.diffContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-equals"></i>
                    <h4>No Differences</h4>
                    <p>The selected versions are identical</p>
                </div>
            `;
            return;
        }
        
        const diffHtml = differences.map(diff => {
            const className = `diff-item diff-${diff.type}`;
            let content = `<strong>${diff.path}</strong><br>`;
            
            switch (diff.type) {
                case 'added':
                    content += `+ ${JSON.stringify(diff.value)}`;
                    break;
                case 'removed':
                    content += `- ${JSON.stringify(diff.value)}`;
                    break;
                case 'changed':
                    content += `- ${JSON.stringify(diff.oldValue)}<br>+ ${JSON.stringify(diff.newValue)}`;
                    break;
            }
            
            return `<div class="${className}">${content}</div>`;
        }).join('');
        
        this.elements.diffContent.innerHTML = `
            <div class="diff-summary">
                <h4>${differences.length} differences found</h4>
            </div>
            <div class="diff-items">${diffHtml}</div>
        `;
    }
}

// Add CSS for diff items
const diffStyles = document.createElement('style');
diffStyles.textContent = `
    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    
    .data-table th,
    .data-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid var(--gray-200);
    }
    
    .data-table th {
        background: var(--gray-50);
        font-weight: 600;
        position: sticky;
        top: 0;
    }
    
    .diff-summary {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--gray-200);
    }
    
    .diff-items {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .diff-item {
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid;
        font-family: var(--font-mono);
        font-size: 13px;
        line-height: 1.6;
    }
    
    .diff-added {
        background: rgba(16, 220, 96, 0.1);
        border-color: var(--success-color);
        color: #0d7c2a;
    }
    
    .diff-removed {
        background: rgba(245, 87, 108, 0.1);
        border-color: var(--error-color);
        color: #c53030;
    }
    
    .diff-changed {
        background: rgba(255, 206, 0, 0.1);
        border-color: var(--warning-color);
        color: #975a16;
    }
`;
document.head.appendChild(diffStyles);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CollaborativeJSONViewer();
});