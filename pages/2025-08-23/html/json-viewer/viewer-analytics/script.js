class AnalyticsJSONViewer {
    constructor() {
        this.jsonData = null;
        this.currentView = 'dashboard';
        this.charts = {};
        this.metrics = {
            totalNodes: 0,
            uniqueKeys: 0,
            maxDepth: 0,
            complexity: 'Low'
        };
        this.queryHistory = [];
        this.selectedNode = null;
        this.breadcrumbs = ['Root'];
        
        this.initializeComponents();
        this.attachEventListeners();
        this.setupCharts();
        this.loadSampleData();
    }

    initializeComponents() {
        // Navigation elements
        this.navItems = document.querySelectorAll('.nav-item');
        this.views = document.querySelectorAll('.view');
        
        // Dashboard elements
        this.globalSearch = document.getElementById('globalSearch');
        this.metricsElements = {
            totalNodes: document.getElementById('totalNodes'),
            uniqueKeys: document.getElementById('uniqueKeys'),
            maxDepth: document.getElementById('maxDepth'),
            dataComplexity: document.getElementById('dataComplexity')
        };
        
        // Import elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.urlInput = document.getElementById('urlInput');
        this.rawJsonInput = document.getElementById('rawJsonInput');
        
        // Explorer elements
        this.breadcrumb = document.getElementById('breadcrumb');
        this.treeContent = document.getElementById('treeContent');
        this.detailsContent = document.getElementById('detailsContent');
        this.detailsTitle = document.getElementById('detailsTitle');
        
        // Query builder elements
        this.queryModes = document.querySelectorAll('.mode-btn');
        this.visualQuery = document.getElementById('visualQuery');
        this.codeQuery = document.getElementById('codeQuery');
        this.queryCodeEditor = document.getElementById('queryCodeEditor');
        this.resultsContent = document.getElementById('resultsContent');
        this.resultsCount = document.getElementById('resultsCount');
        this.queryTime = document.getElementById('queryTime');
        
        // Status elements
        this.dataStatus = document.getElementById('dataStatus');
        this.recordCount = document.getElementById('recordCount');
        this.fileSize = document.getElementById('fileSize');
        
        // Context menu
        this.contextMenu = document.getElementById('contextMenu');
    }

    attachEventListeners() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
        
        // Global search
        this.globalSearch.addEventListener('input', _.debounce((e) => {
            this.performGlobalSearch(e.target.value);
        }, 300));
        
        // Import events
        this.setupImportEvents();
        
        // Explorer events
        this.setupExplorerEvents();
        
        // Query builder events
        this.setupQueryBuilderEvents();
        
        // Context menu events
        this.setupContextMenu();
        
        // Header controls
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // Auto refresh
        document.getElementById('autoRefreshBtn').addEventListener('click', () => this.toggleAutoRefresh());
        
        // View mode toggles
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchViewMode(mode);
            });
        });
        
        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeunload', () => this.saveState());
    }

    setupImportEvents() {
        // File upload
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFilesDrop(e.dataTransfer.files);
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFilesSelect(e.target.files);
        });
        
        // URL import
        document.getElementById('importUrlBtn').addEventListener('click', () => {
            this.importFromURL();
        });
        
        // Raw JSON
        document.getElementById('formatJsonBtn').addEventListener('click', () => {
            this.formatRawJSON();
        });
        document.getElementById('validateJsonBtn').addEventListener('click', () => {
            this.validateRawJSON();
        });
        document.getElementById('importRawBtn').addEventListener('click', () => {
            this.importRawJSON();
        });
        
        // Database connection
        document.getElementById('connectDbBtn').addEventListener('click', () => {
            this.connectToDatabase();
        });
    }

    setupExplorerEvents() {
        document.getElementById('backBtn').addEventListener('click', () => this.navigateBack());
        document.getElementById('homeBtn').addEventListener('click', () => this.navigateHome());
        document.getElementById('expandAllTree').addEventListener('click', () => this.expandAllNodes());
        document.getElementById('collapseAllTree').addEventListener('click', () => this.collapseAllNodes());
        document.getElementById('copyPathBtn').addEventListener('click', () => this.copyCurrentPath());
        document.getElementById('copyValueBtn').addEventListener('click', () => this.copyCurrentValue());
    }

    setupQueryBuilderEvents() {
        this.queryModes.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchQueryMode(btn.dataset.mode);
            });
        });
        
        document.getElementById('addConditionBtn').addEventListener('click', () => {
            this.addQueryCondition();
        });
        
        document.getElementById('executeQueryBtn').addEventListener('click', () => {
            this.executeQuery();
        });
        
        document.getElementById('clearQueryBtn').addEventListener('click', () => {
            this.clearQuery();
        });
        
        document.getElementById('saveQueryBtn').addEventListener('click', () => {
            this.saveQuery();
        });
        
        document.getElementById('loadQueryBtn').addEventListener('click', () => {
            this.loadQuery();
        });
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.tree-node, .data-cell')) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, e.target);
            }
        });
        
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
        
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.menu-item')?.dataset.action;
            if (action) {
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            }
        });
    }

    setupCharts() {
        // Initialize Chart.js charts
        const ctx1 = document.getElementById('typeChart');
        const ctx2 = document.getElementById('frequencyChart');
        
        if (ctx1) {
            this.charts.typeChart = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        if (ctx2) {
            this.charts.frequencyChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Frequency',
                        data: [],
                        backgroundColor: '#0ea5e9',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            ticks: {
                                maxRotation: 45
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    async loadSampleData() {
        try {
            this.updateStatus('Loading sample data...', 'loading');
            const response = await fetch('../data/data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setJSONData(data, 'Sample Data');
            this.updateStatus('Sample data loaded successfully', 'success');
        } catch (error) {
            this.updateStatus('Failed to load sample data', 'error');
            console.error('Load error:', error);
        }
    }

    setJSONData(data, source = 'Unknown') {
        this.jsonData = data;
        this.selectedNode = null;
        this.breadcrumbs = ['Root'];
        
        // Analyze data
        this.analyzeData();
        
        // Update status
        this.updateDataStatus();
        
        // Update views
        this.updateDashboard();
        this.updateExplorer();
        
        // Log for audit
        console.log(`[${new Date().toISOString()}] Data loaded from: ${source}`);
    }

    analyzeData() {
        if (!this.jsonData) return;
        
        const analysis = this.performDeepAnalysis(this.jsonData);
        this.metrics = analysis;
        
        // Update charts
        this.updateCharts(analysis);
    }

    performDeepAnalysis(data) {
        const analysis = {
            totalNodes: 0,
            uniqueKeys: new Set(),
            maxDepth: 0,
            typeDistribution: {},
            keyFrequency: {},
            valuePatterns: {},
            anomalies: [],
            complexity: 0
        };
        
        const traverse = (obj, depth = 0, path = '') => {
            analysis.totalNodes++;
            analysis.maxDepth = Math.max(analysis.maxDepth, depth);
            
            if (obj === null) {
                analysis.typeDistribution.null = (analysis.typeDistribution.null || 0) + 1;
            } else if (Array.isArray(obj)) {
                analysis.typeDistribution.array = (analysis.typeDistribution.array || 0) + 1;
                obj.forEach((item, index) => {
                    traverse(item, depth + 1, `${path}[${index}]`);
                });
            } else if (typeof obj === 'object') {
                analysis.typeDistribution.object = (analysis.typeDistribution.object || 0) + 1;
                Object.entries(obj).forEach(([key, value]) => {
                    analysis.uniqueKeys.add(key);
                    analysis.keyFrequency[key] = (analysis.keyFrequency[key] || 0) + 1;
                    
                    // Detect patterns
                    this.detectPatterns(key, value, analysis);
                    
                    traverse(value, depth + 1, path ? `${path}.${key}` : key);
                });
            } else {
                const type = typeof obj;
                analysis.typeDistribution[type] = (analysis.typeDistribution[type] || 0) + 1;
                
                // Detect anomalies
                this.detectAnomalies(obj, path, analysis);
            }
        };
        
        traverse(data);
        
        // Calculate complexity score
        analysis.complexity = this.calculateComplexity(analysis);
        analysis.complexityLabel = this.getComplexityLabel(analysis.complexity);
        
        return analysis;
    }

    detectPatterns(key, value, analysis) {
        // Detect common patterns
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                analysis.valuePatterns.date = (analysis.valuePatterns.date || 0) + 1;
            } else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                analysis.valuePatterns.email = (analysis.valuePatterns.email || 0) + 1;
            } else if (/^https?:\/\//.test(value)) {
                analysis.valuePatterns.url = (analysis.valuePatterns.url || 0) + 1;
            } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                analysis.valuePatterns.uuid = (analysis.valuePatterns.uuid || 0) + 1;
            }
        }
        
        // Detect key patterns
        if (key.toLowerCase().includes('id')) {
            analysis.valuePatterns.id_field = (analysis.valuePatterns.id_field || 0) + 1;
        }
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
            analysis.valuePatterns.sensitive = (analysis.valuePatterns.sensitive || 0) + 1;
        }
    }

    detectAnomalies(value, path, analysis) {
        // Detect potential anomalies
        if (typeof value === 'string' && value.length > 10000) {
            analysis.anomalies.push({
                type: 'large_string',
                path,
                value: 'String length > 10,000 characters'
            });
        }
        
        if (typeof value === 'number' && !isFinite(value)) {
            analysis.anomalies.push({
                type: 'invalid_number',
                path,
                value: value
            });
        }
    }

    calculateComplexity(analysis) {
        let score = 0;
        
        // Depth complexity
        score += analysis.maxDepth * 10;
        
        // Node complexity
        score += Math.log10(analysis.totalNodes + 1) * 20;
        
        // Key diversity
        score += analysis.uniqueKeys.size * 2;
        
        // Type diversity
        score += Object.keys(analysis.typeDistribution).length * 5;
        
        return Math.min(100, Math.round(score));
    }

    getComplexityLabel(score) {
        if (score < 30) return 'Low';
        if (score < 60) return 'Medium';
        if (score < 80) return 'High';
        return 'Very High';
    }

    updateCharts(analysis) {
        // Update type distribution chart
        if (this.charts.typeChart) {
            const types = Object.keys(analysis.typeDistribution);
            const counts = Object.values(analysis.typeDistribution);
            
            this.charts.typeChart.data.labels = types.map(t => 
                t.charAt(0).toUpperCase() + t.slice(1)
            );
            this.charts.typeChart.data.datasets[0].data = counts;
            this.charts.typeChart.update();
        }
        
        // Update frequency chart
        if (this.charts.frequencyChart) {
            const sortedKeys = Object.entries(analysis.keyFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            this.charts.frequencyChart.data.labels = sortedKeys.map(([key]) => key);
            this.charts.frequencyChart.data.datasets[0].data = sortedKeys.map(([, count]) => count);
            this.charts.frequencyChart.update();
        }
    }

    updateDashboard() {
        if (!this.metrics) return;
        
        // Update metric cards
        if (this.metricsElements.totalNodes) {
            this.animateMetric(this.metricsElements.totalNodes, this.metrics.totalNodes);
        }
        if (this.metricsElements.uniqueKeys) {
            this.animateMetric(this.metricsElements.uniqueKeys, this.metrics.uniqueKeys.size);
        }
        if (this.metricsElements.maxDepth) {
            this.animateMetric(this.metricsElements.maxDepth, this.metrics.maxDepth);
        }
        if (this.metricsElements.dataComplexity) {
            this.metricsElements.dataComplexity.textContent = this.metrics.complexityLabel;
        }
        
        // Update data table preview
        this.updateDataTable();
    }

    updateDataTable() {
        const container = document.getElementById('dataTableContainer');
        if (!container || !this.jsonData) return;
        
        // Create a flattened view for table display
        const flatData = this.flattenJSON(this.jsonData);
        
        if (flatData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-table"></i>
                    <h4>No tabular data</h4>
                    <p>The JSON structure cannot be displayed as a table</p>
                </div>
            `;
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Headers
        const headers = Object.keys(flatData[0] || {});
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                ${headers.map(header => `<th>${this.escapeHtml(header)}</th>`).join('')}
            </tr>
        `;
        table.appendChild(thead);
        
        // Body (limit to first 100 rows for performance)
        const tbody = document.createElement('tbody');
        flatData.slice(0, 100).forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = this.formatCellValue(row[header]);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // Add pagination if needed
        if (flatData.length > 100) {
            const pagination = document.createElement('div');
            pagination.className = 'table-pagination';
            pagination.innerHTML = `
                <span>Showing 100 of ${flatData.length.toLocaleString()} records</span>
                <button class="btn btn-sm btn-outline">Load More</button>
            `;
            container.appendChild(pagination);
        }
    }

    flattenJSON(obj, prefix = '') {
        const result = [];
        
        if (Array.isArray(obj)) {
            // If root is array, treat each item as a row
            obj.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    result.push(this.flattenObject(item, `${prefix}[${index}]`));
                } else {
                    result.push({ [`${prefix}[${index}]`]: item });
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            result.push(this.flattenObject(obj, prefix));
        }
        
        return result;
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};
        
        Object.entries(obj).forEach(([key, value]) => {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            } else {
                flattened[newKey] = value;
            }
        });
        
        return flattened;
    }

    updateExplorer() {
        if (!this.jsonData) {
            this.treeContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sitemap"></i>
                    <p>No data structure to display</p>
                </div>
            `;
            return;
        }
        
        // Build tree structure
        this.renderTree(this.jsonData, this.treeContent);
        
        // Update breadcrumb
        this.updateBreadcrumb();
    }

    renderTree(data, container, path = [], level = 0) {
        container.innerHTML = '';
        
        const treeNode = document.createElement('div');
        treeNode.className = 'tree-structure';
        
        this.createTreeNodes(data, treeNode, path, level);
        container.appendChild(treeNode);
    }

    createTreeNodes(data, container, path = [], level = 0) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    const nodeElement = this.createTreeNode(
                        `[${index}]`, 
                        item, 
                        [...path, index], 
                        level,
                        'array-item'
                    );
                    container.appendChild(nodeElement);
                });
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    const nodeElement = this.createTreeNode(
                        key, 
                        value, 
                        [...path, key], 
                        level,
                        'object-key'
                    );
                    container.appendChild(nodeElement);
                });
            }
        }
    }

    createTreeNode(label, value, path, level, type) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.style.paddingLeft = `${level * 20}px`;
        node.dataset.path = path.join('.');
        
        const nodeContent = document.createElement('div');
        nodeContent.className = 'node-content';
        
        const nodeLabel = document.createElement('span');
        nodeLabel.className = `node-label ${type}`;
        nodeLabel.textContent = label;
        
        const nodeType = document.createElement('span');
        nodeType.className = 'node-type';
        nodeType.textContent = this.getValueType(value);
        
        const nodeValue = document.createElement('span');
        nodeValue.className = 'node-value';
        
        if (typeof value === 'object' && value !== null) {
            const count = Array.isArray(value) ? value.length : Object.keys(value).length;
            nodeValue.textContent = Array.isArray(value) ? 
                `[${count} items]` : `{${count} keys}`;
            
            // Add expand/collapse button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'node-toggle';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTreeNode(node, value, path, level + 1);
            });
            nodeContent.appendChild(toggleBtn);
        } else {
            nodeValue.textContent = this.formatValue(value, 50);
        }
        
        nodeContent.appendChild(nodeLabel);
        nodeContent.appendChild(nodeType);
        nodeContent.appendChild(nodeValue);
        
        // Add click handler for node selection
        nodeContent.addEventListener('click', () => {
            this.selectTreeNode(node, value, path);
        });
        
        node.appendChild(nodeContent);
        
        return node;
    }

    toggleTreeNode(node, value, path, level) {
        const toggle = node.querySelector('.node-toggle i');
        const existing = node.querySelector('.tree-children');
        
        if (existing) {
            existing.remove();
            toggle.style.transform = 'rotate(0deg)';
        } else {
            const children = document.createElement('div');
            children.className = 'tree-children';
            this.createTreeNodes(value, children, path, level);
            node.appendChild(children);
            toggle.style.transform = 'rotate(90deg)';
        }
    }

    selectTreeNode(node, value, path) {
        // Update selection
        document.querySelectorAll('.tree-node.selected').forEach(n => {
            n.classList.remove('selected');
        });
        node.classList.add('selected');
        
        this.selectedNode = { value, path };
        
        // Update details panel
        this.showNodeDetails(value, path);
        
        // Update navigation state
        document.getElementById('backBtn').disabled = path.length === 0;
    }

    showNodeDetails(value, path) {
        this.detailsTitle.textContent = path.length > 0 ? path.join('.') : 'Root';
        
        const details = document.createElement('div');
        details.className = 'node-details';
        
        // Basic info
        const info = document.createElement('div');
        info.className = 'detail-section';
        info.innerHTML = `
            <h4>Basic Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Type:</label>
                    <span>${this.getValueType(value)}</span>
                </div>
                <div class="detail-item">
                    <label>Path:</label>
                    <span>${path.join('.') || 'root'}</span>
                </div>
                <div class="detail-item">
                    <label>Size:</label>
                    <span>${this.getValueSize(value)}</span>
                </div>
            </div>
        `;
        details.appendChild(info);
        
        // Value preview
        const preview = document.createElement('div');
        preview.className = 'detail-section';
        preview.innerHTML = `
            <h4>Value Preview</h4>
            <pre class="value-preview"><code>${this.formatValue(value, 500)}</code></pre>
        `;
        details.appendChild(preview);
        
        // Statistics for objects/arrays
        if (typeof value === 'object' && value !== null) {
            const stats = this.getNodeStatistics(value);
            const statsSection = document.createElement('div');
            statsSection.className = 'detail-section';
            statsSection.innerHTML = `
                <h4>Statistics</h4>
                <div class="stats-grid">
                    ${stats.map(stat => `
                        <div class="stat-item">
                            <div class="stat-value">${stat.value}</div>
                            <div class="stat-label">${stat.label}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            details.appendChild(statsSection);
        }
        
        this.detailsContent.innerHTML = '';
        this.detailsContent.appendChild(details);
    }

    getNodeStatistics(value) {
        const stats = [];
        
        if (Array.isArray(value)) {
            stats.push({ label: 'Length', value: value.length.toLocaleString() });
            
            const types = {};
            value.forEach(item => {
                const type = this.getValueType(item);
                types[type] = (types[type] || 0) + 1;
            });
            
            stats.push({ 
                label: 'Unique Types', 
                value: Object.keys(types).length 
            });
        } else {
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
            
            stats.push({ 
                label: 'Max Depth', 
                value: Math.max(...depths) 
            });
        }
        
        return stats;
    }

    // Query Builder Methods
    switchQueryMode(mode) {
        this.queryModes.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (mode === 'visual') {
            this.visualQuery.style.display = 'block';
            this.codeQuery.style.display = 'none';
        } else {
            this.visualQuery.style.display = 'none';
            this.codeQuery.style.display = 'block';
        }
    }

    addQueryCondition() {
        const container = document.getElementById('conditionsContainer');
        const conditionId = Date.now();
        
        const condition = document.createElement('div');
        condition.className = 'query-condition';
        condition.dataset.id = conditionId;
        condition.innerHTML = `
            <div class="condition-row">
                <select class="field-select">
                    <option value="">Select field...</option>
                    ${this.getAvailableFields().map(field => 
                        `<option value="${field}">${field}</option>`
                    ).join('')}
                </select>
                <select class="operator-select">
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts with</option>
                    <option value="endsWith">Ends with</option>
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="exists">Exists</option>
                </select>
                <input type="text" class="value-input" placeholder="Value...">
                <button class="btn btn-sm btn-ghost remove-condition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        condition.querySelector('.remove-condition').addEventListener('click', () => {
            condition.remove();
        });
        
        container.appendChild(condition);
    }

    getAvailableFields() {
        if (!this.jsonData) return [];
        
        const fields = new Set();
        
        const extractFields = (obj, prefix = '') => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        extractFields(item, `${prefix}[${index}]`);
                    });
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        const fieldPath = prefix ? `${prefix}.${key}` : key;
                        fields.add(fieldPath);
                        extractFields(value, fieldPath);
                    });
                }
            }
        };
        
        extractFields(this.jsonData);
        return Array.from(fields).sort();
    }

    executeQuery() {
        const startTime = performance.now();
        
        try {
            let results;
            const activeMode = document.querySelector('.mode-btn.active').dataset.mode;
            
            if (activeMode === 'visual') {
                results = this.executeVisualQuery();
            } else {
                results = this.executeCodeQuery();
            }
            
            const endTime = performance.now();
            const queryTime = Math.round(endTime - startTime);
            
            this.displayQueryResults(results, queryTime);
            
        } catch (error) {
            this.showError('Query execution failed: ' + error.message);
        }
    }

    executeVisualQuery() {
        const conditions = Array.from(document.querySelectorAll('.query-condition')).map(condition => ({
            field: condition.querySelector('.field-select').value,
            operator: condition.querySelector('.operator-select').value,
            value: condition.querySelector('.value-input').value
        })).filter(c => c.field && c.operator);
        
        if (conditions.length === 0) {
            return this.jsonData;
        }
        
        return this.filterData(this.jsonData, conditions);
    }

    executeCodeQuery() {
        const query = this.queryCodeEditor.value.trim();
        if (!query) {
            return this.jsonData;
        }
        
        // Simple JSONPath-like query execution
        return this.evaluateJSONPath(query, this.jsonData);
    }

    filterData(data, conditions) {
        const results = [];
        
        const traverse = (obj, path = '') => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        traverse(item, `${path}[${index}]`);
                    });
                } else {
                    // Check if current object matches all conditions
                    const matches = conditions.every(condition => {
                        const fieldValue = this.getFieldValue(obj, condition.field);
                        return this.evaluateCondition(fieldValue, condition.operator, condition.value);
                    });
                    
                    if (matches) {
                        results.push({ path, value: obj });
                    }
                    
                    Object.entries(obj).forEach(([key, value]) => {
                        traverse(value, path ? `${path}.${key}` : key);
                    });
                }
            }
        };
        
        traverse(data);
        return results;
    }

    getFieldValue(obj, field) {
        const parts = field.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current && typeof current === 'object') {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }

    evaluateCondition(value, operator, expected) {
        switch (operator) {
            case 'equals':
                return value == expected;
            case 'contains':
                return String(value).toLowerCase().includes(expected.toLowerCase());
            case 'startsWith':
                return String(value).toLowerCase().startsWith(expected.toLowerCase());
            case 'endsWith':
                return String(value).toLowerCase().endsWith(expected.toLowerCase());
            case 'gt':
                return Number(value) > Number(expected);
            case 'lt':
                return Number(value) < Number(expected);
            case 'exists':
                return value !== undefined && value !== null;
            default:
                return false;
        }
    }

    displayQueryResults(results, queryTime) {
        this.resultsCount.textContent = `${results.length.toLocaleString()} results`;
        this.queryTime.textContent = `${queryTime}ms`;
        
        if (results.length === 0) {
            this.resultsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h4>No results found</h4>
                    <p>Try adjusting your query conditions</p>
                </div>
            `;
            return;
        }
        
        // Display results as cards
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-grid';
        
        results.slice(0, 50).forEach(result => { // Limit to first 50 for performance
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="result-header">
                    <span class="result-path">${result.path || 'root'}</span>
                    <button class="btn btn-sm btn-ghost" onclick="this.closest('.result-card').classList.toggle('expanded')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="result-preview">
                    <pre><code>${this.formatValue(result.value, 200)}</code></pre>
                </div>
                <div class="result-full" style="display: none;">
                    <pre><code>${JSON.stringify(result.value, null, 2)}</code></pre>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
        
        if (results.length > 50) {
            const moreInfo = document.createElement('div');
            moreInfo.className = 'results-info';
            moreInfo.innerHTML = `
                <p>Showing first 50 of ${results.length.toLocaleString()} results</p>
                <button class="btn btn-outline btn-sm">Load More</button>
            `;
            resultsContainer.appendChild(moreInfo);
        }
        
        this.resultsContent.innerHTML = '';
        this.resultsContent.appendChild(resultsContainer);
    }

    // Import Methods
    async handleFilesSelect(files) {
        for (const file of files) {
            await this.processFile(file);
        }
    }

    async handleFilesDrop(files) {
        await this.handleFilesSelect(files);
    }

    async processFile(file) {
        if (!file.name.endsWith('.json')) {
            this.showError(`${file.name} is not a JSON file`);
            return;
        }
        
        try {
            this.updateStatus('Processing file...', 'loading');
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            this.setJSONData(data, file.name);
            this.switchView('dashboard');
            this.updateStatus('File processed successfully', 'success');
            
        } catch (error) {
            this.updateStatus('Failed to process file', 'error');
            this.showError(`Error processing ${file.name}: ${error.message}`);
        }
    }

    async importFromURL() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a valid URL');
            return;
        }
        
        try {
            this.updateStatus('Importing from URL...', 'loading');
            
            const method = document.getElementById('httpMethod').value;
            const response = await fetch(url, { method });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setJSONData(data, url);
            this.switchView('dashboard');
            this.updateStatus('Data imported successfully', 'success');
            
        } catch (error) {
            this.updateStatus('Import failed', 'error');
            this.showError('Failed to import from URL: ' + error.message);
        }
    }

    formatRawJSON() {
        try {
            const raw = this.rawJsonInput.value.trim();
            if (!raw) return;
            
            const parsed = JSON.parse(raw);
            this.rawJsonInput.value = JSON.stringify(parsed, null, 2);
            this.showSuccess('JSON formatted successfully');
        } catch (error) {
            this.showError('Invalid JSON: ' + error.message);
        }
    }

    validateRawJSON() {
        try {
            const raw = this.rawJsonInput.value.trim();
            if (!raw) {
                this.showError('Please enter JSON data');
                return;
            }
            
            JSON.parse(raw);
            this.showSuccess('JSON is valid');
        } catch (error) {
            this.showError('Invalid JSON: ' + error.message);
        }
    }

    importRawJSON() {
        try {
            const raw = this.rawJsonInput.value.trim();
            if (!raw) {
                this.showError('Please enter JSON data');
                return;
            }
            
            const data = JSON.parse(raw);
            this.setJSONData(data, 'Raw Input');
            this.switchView('dashboard');
            this.showSuccess('Raw JSON imported successfully');
            this.rawJsonInput.value = '';
        } catch (error) {
            this.showError('Invalid JSON: ' + error.message);
        }
    }

    // Navigation Methods
    switchView(viewName) {
        // Update navigation
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Update views
        this.views.forEach(view => {
            view.classList.toggle('active', view.id === viewName + 'View');
        });
        
        this.currentView = viewName;
        
        // Trigger view-specific updates
        this.onViewSwitch(viewName);
    }

    onViewSwitch(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'explorer':
                this.updateExplorer();
                break;
            case 'structure':
                this.updateStructureAnalysis();
                break;
            case 'patterns':
                this.updatePatternAnalysis();
                break;
        }
    }

    // Utility Methods
    updateStatus(message, type = 'info') {
        this.dataStatus.textContent = message;
        
        const indicator = document.querySelector('.indicator');
        indicator.className = 'indicator';
        
        switch (type) {
            case 'loading':
                indicator.classList.add('loading');
                break;
            case 'success':
                indicator.classList.add('active');
                break;
            case 'error':
                indicator.classList.add('error');
                break;
        }
    }

    updateDataStatus() {
        if (!this.jsonData) {
            this.recordCount.textContent = '0 records';
            this.fileSize.textContent = '0 MB';
            return;
        }
        
        const size = JSON.stringify(this.jsonData).length;
        const sizeInMB = (size / (1024 * 1024)).toFixed(2);
        
        this.recordCount.textContent = `${this.metrics.totalNodes.toLocaleString()} nodes`;
        this.fileSize.textContent = `${sizeInMB} MB`;
    }

    animateMetric(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
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

    formatValue(value, maxLength = 100) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        let str;
        if (typeof value === 'object') {
            str = JSON.stringify(value, null, 2);
        } else if (typeof value === 'string') {
            str = `"${value}"`;
        } else {
            str = String(value);
        }
        
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }

    formatCellValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return '';
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // Style and position
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '1000',
            padding: '12px 16px',
            background: type === 'error' ? '#fee2e2' : type === 'success' ? '#d1fae5' : '#dbeafe',
            color: type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#1d4ed8',
            border: `1px solid ${type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : '#93c5fd'}`,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideInRight 0.3s ease-out'
        });
        
        // Add close handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Context menu methods
    showContextMenu(x, y, target) {
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.add('active');
        this.contextMenuTarget = target;
    }

    hideContextMenu() {
        this.contextMenu.classList.remove('active');
        this.contextMenuTarget = null;
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'copy-path':
                this.copyCurrentPath();
                break;
            case 'copy-value':
                this.copyCurrentValue();
                break;
            case 'analyze-node':
                this.analyzeSelectedNode();
                break;
            case 'export-node':
                this.exportSelectedNode();
                break;
        }
    }

    copyCurrentPath() {
        if (this.selectedNode) {
            navigator.clipboard.writeText(this.selectedNode.path.join('.'));
            this.showSuccess('Path copied to clipboard');
        }
    }

    copyCurrentValue() {
        if (this.selectedNode) {
            navigator.clipboard.writeText(JSON.stringify(this.selectedNode.value, null, 2));
            this.showSuccess('Value copied to clipboard');
        }
    }

    // Additional methods for completeness
    refreshData() {
        if (this.jsonData) {
            this.analyzeData();
            this.updateDashboard();
            this.updateExplorer();
            this.showSuccess('Data refreshed');
        }
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    handleResize() {
        // Update charts on resize
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }

    saveState() {
        // Save current state to localStorage for persistence
        const state = {
            currentView: this.currentView,
            queryHistory: this.queryHistory
        };
        localStorage.setItem('analytics-json-viewer-state', JSON.stringify(state));
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
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
    
    .tree-node {
        margin: 2px 0;
        border-radius: 4px;
        transition: background-color 0.15s;
    }
    
    .tree-node:hover {
        background: var(--gray-50);
    }
    
    .tree-node.selected {
        background: var(--primary-100);
        color: var(--primary-700);
    }
    
    .node-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
    }
    
    .node-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: var(--gray-500);
        transition: transform 0.2s;
    }
    
    .node-label {
        font-weight: 500;
        color: var(--primary-600);
    }
    
    .node-type {
        font-size: 11px;
        color: var(--gray-500);
        background: var(--gray-100);
        padding: 1px 6px;
        border-radius: 10px;
    }
    
    .node-value {
        color: var(--gray-600);
        font-family: var(--font-mono);
        font-size: 12px;
    }
    
    .detail-section {
        margin-bottom: 24px;
    }
    
    .detail-section h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--gray-900);
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--gray-200);
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
    }
    
    .detail-item label {
        font-weight: 500;
        color: var(--gray-600);
        font-size: 13px;
    }
    
    .detail-item span {
        color: var(--gray-900);
        font-size: 13px;
    }
    
    .value-preview {
        background: var(--gray-50);
        padding: 12px;
        border-radius: 6px;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--gray-200);
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 12px;
    }
    
    .stat-item {
        text-align: center;
        padding: 8px;
        background: var(--gray-50);
        border-radius: 6px;
    }
    
    .stat-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--primary-600);
        line-height: 1;
        margin-bottom: 4px;
    }
    
    .stat-label {
        font-size: 11px;
        color: var(--gray-500);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .results-grid {
        display: grid;
        gap: 16px;
    }
    
    .result-card {
        background: white;
        border: 1px solid var(--gray-200);
        border-radius: 8px;
        overflow: hidden;
    }
    
    .result-header {
        padding: 12px 16px;
        background: var(--gray-50);
        border-bottom: 1px solid var(--gray-200);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .result-path {
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--primary-600);
        font-weight: 500;
    }
    
    .result-preview {
        padding: 16px;
    }
    
    .result-preview pre {
        margin: 0;
        font-size: 12px;
        max-height: 150px;
        overflow-y: auto;
    }
`;
document.head.appendChild(style);

// Initialize the analytics viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsJSONViewer();
});