class EnterpriseJSONViewer {
    constructor() {
        this.jsonData = null;
        this.compareDataA = null;
        this.compareDataB = null;
        this.selectedPath = null;
        this.hideEmptyValues = true;
        this.showLineNumbers = false;
        this.searchQuery = '';
        this.currentSection = 'load';
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeKeyboardShortcuts();
        this.loadSampleData();
    }

    initializeElements() {
        // Navigation elements
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.contentSections = document.querySelectorAll('.content-section');
        
        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearch');
        
        // Load section elements
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.loadUrlBtn = document.getElementById('loadUrlBtn');
        this.rawInputBtn = document.getElementById('rawInputBtn');
        this.loadSampleBtn = document.getElementById('loadSampleBtn');
        this.urlInput = document.getElementById('urlInput');
        
        // View section elements
        this.hideEmptyCheckbox = document.getElementById('hideEmptyValues');
        this.showLineNumbersCheckbox = document.getElementById('showLineNumbers');
        this.expandAllBtn = document.getElementById('expandAllBtn');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.copyPathBtn = document.getElementById('copyPathBtn');
        this.jsonContainer = document.getElementById('jsonContainer');
        this.detailContainer = document.getElementById('detailContainer');
        this.detailTitle = document.getElementById('detailTitle');
        this.dataStats = document.getElementById('dataStats');
        
        // Compare section elements
        this.loadCompareA = document.getElementById('loadCompareA');
        this.loadCompareB = document.getElementById('loadCompareB');
        this.fileNameA = document.getElementById('fileNameA');
        this.fileNameB = document.getElementById('fileNameB');
        this.comparisonResults = document.getElementById('comparisonResults');
        this.diffSummary = document.getElementById('diffSummary');
        this.diffViewer = document.getElementById('diffViewer');
        
        // Analysis section elements
        this.analysisGrid = document.getElementById('analysisGrid');
        this.structureAnalysis = document.getElementById('structureAnalysis');
        this.typeAnalysis = document.getElementById('typeAnalysis');
        this.keyAnalysis = document.getElementById('keyAnalysis');
        this.valueAnalysis = document.getElementById('valueAnalysis');
        
        // Modal elements
        this.rawInputModal = document.getElementById('rawInputModal');
        this.rawJsonTextarea = document.getElementById('rawJsonTextarea');
        this.helpModal = document.getElementById('helpModal');
        
        // File input elements
        this.fileInput = document.getElementById('fileInput');
        this.compareFileA = document.getElementById('compareFileA');
        this.compareFileB = document.getElementById('compareFileB');
        
        // Header action buttons
        this.exportBtn = document.getElementById('exportBtn');
        this.printBtn = document.getElementById('printBtn');
        this.helpBtn = document.getElementById('helpBtn');
    }

    attachEventListeners() {
        // Navigation
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.nav-btn').dataset.section;
                this.switchSection(section);
            });
        });
        
        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        
        // Load section
        this.uploadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.loadUrlBtn.addEventListener('click', () => this.loadFromURL());
        this.rawInputBtn.addEventListener('click', () => this.showRawInputModal());
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleData());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // View section
        this.hideEmptyCheckbox.addEventListener('change', (e) => this.toggleEmptyValues(e.target.checked));
        this.showLineNumbersCheckbox.addEventListener('change', (e) => this.toggleLineNumbers(e.target.checked));
        this.expandAllBtn.addEventListener('click', () => this.expandAll());
        this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        this.copyPathBtn.addEventListener('click', () => this.copySelectedPath());
        document.getElementById('closeDetailBtn').addEventListener('click', () => this.clearDetailView());
        
        // Compare section
        this.loadCompareA.addEventListener('click', () => this.compareFileA.click());
        this.loadCompareB.addEventListener('click', () => this.compareFileB.click());
        this.compareFileA.addEventListener('change', (e) => this.handleCompareFileA(e));
        this.compareFileB.addEventListener('change', (e) => this.handleCompareFileB(e));
        
        // Modal events
        document.getElementById('parseJsonBtn').addEventListener('click', () => this.parseRawJSON());
        document.getElementById('cancelRawBtn').addEventListener('click', () => this.hideRawInputModal());
        document.getElementById('closeRawModal').addEventListener('click', () => this.hideRawInputModal());
        document.getElementById('closeHelpModal').addEventListener('click', () => this.hideHelpModal());
        
        // Header actions
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.printBtn.addEventListener('click', () => this.printView());
        this.helpBtn.addEventListener('click', () => this.showHelpModal());
        
        // Modal overlay clicks
        this.rawInputModal.addEventListener('click', (e) => {
            if (e.target === this.rawInputModal) this.hideRawInputModal();
        });
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) this.hideHelpModal();
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'o':
                        e.preventDefault();
                        this.fileInput.click();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.searchInput.focus();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.expandAll();
                        break;
                    case 'c':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.collapseAll();
                        }
                        break;
                    case 'p':
                        e.preventDefault();
                        this.printView();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.hideRawInputModal();
                this.hideHelpModal();
            }
            
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelpModal();
            }
        });
    }

    switchSection(sectionName) {
        // Update navigation
        this.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
        
        // Update content sections
        this.contentSections.forEach(section => {
            section.classList.toggle('active', section.id === sectionName + 'Section');
        });
        
        this.currentSection = sectionName;
        
        // Trigger section-specific logic
        if (sectionName === 'analyze' && this.jsonData) {
            this.performAnalysis();
        }
    }

    async loadSampleData() {
        try {
            this.showLoadingState('Loading sample data...');
            const response = await fetch('../data/data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setJSONData(data, 'Sample Data');
            this.showSuccessMessage('Sample data loaded successfully');
            this.switchSection('view');
        } catch (error) {
            this.showErrorMessage('Failed to load sample data: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showErrorMessage('Please select a JSON file');
            return;
        }
        
        this.showLoadingState(`Loading ${file.name}...`);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.setJSONData(data, file.name);
                this.showSuccessMessage(`File ${file.name} loaded successfully`);
                this.switchSection('view');
            } catch (error) {
                this.showErrorMessage('Invalid JSON file: ' + error.message);
            } finally {
                this.hideLoadingState();
            }
        };
        
        reader.onerror = () => {
            this.showErrorMessage('Failed to read file');
            this.hideLoadingState();
        };
        
        reader.readAsText(file);
    }

    async loadFromURL() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showErrorMessage('Please enter a URL');
            return;
        }
        
        if (!this.isValidURL(url)) {
            this.showErrorMessage('Please enter a valid URL');
            return;
        }
        
        try {
            this.showLoadingState('Loading data from URL...');
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Content-Type is not application/json, attempting to parse anyway');
            }
            
            const data = await response.json();
            this.setJSONData(data, url);
            this.showSuccessMessage('Data loaded successfully from URL');
            this.switchSection('view');
        } catch (error) {
            this.showErrorMessage('Failed to load from URL: ' + error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    showRawInputModal() {
        this.rawInputModal.classList.add('active');
        this.rawJsonTextarea.focus();
    }

    hideRawInputModal() {
        this.rawInputModal.classList.remove('active');
        this.rawJsonTextarea.value = '';
    }

    parseRawJSON() {
        const rawText = this.rawJsonTextarea.value.trim();
        if (!rawText) {
            this.showErrorMessage('Please enter JSON data');
            return;
        }
        
        try {
            const data = JSON.parse(rawText);
            this.setJSONData(data, 'Raw Input');
            this.hideRawInputModal();
            this.showSuccessMessage('JSON data parsed successfully');
            this.switchSection('view');
        } catch (error) {
            this.showErrorMessage('Invalid JSON: ' + error.message);
        }
    }

    setJSONData(data, source = 'Unknown') {
        this.jsonData = data;
        this.selectedPath = null;
        this.renderJSON();
        this.updateDataStats();
        this.clearDetailView();
        
        // Log data loading for audit purposes
        console.log(`[${new Date().toISOString()}] JSON data loaded from: ${source}`);
    }

    renderJSON() {
        if (!this.jsonData) {
            this.showEmptyState(this.jsonContainer, 'No data loaded', 'Use the Load Data section to import JSON data');
            return;
        }
        
        this.jsonContainer.innerHTML = '';
        const treeElement = this.createJSONTree(this.jsonData, '', 0, []);
        
        if (treeElement) {
            this.jsonContainer.appendChild(treeElement);
        } else {
            this.showEmptyState(this.jsonContainer, 'No data to display', 'All values are filtered out');
        }
    }

    createJSONTree(data, key = '', depth = 0, path = []) {
        const container = document.createElement('div');
        container.className = 'json-tree';
        
        this.processJSONNode(data, key, depth, path, container);
        return container;
    }

    processJSONNode(data, key, depth, path, container, lineNumber = { value: 1 }) {
        if (this.hideEmptyValues && this.isEmptyValue(data)) {
            return;
        }
        
        if (this.searchQuery && !this.matchesSearch(data, key, this.searchQuery)) {
            return;
        }
        
        const line = document.createElement('div');
        line.className = 'json-line';
        line.dataset.path = path.join('.');
        
        // Line number
        if (this.showLineNumbers) {
            const lineNum = document.createElement('span');
            lineNum.className = 'line-number';
            lineNum.textContent = lineNumber.value++;
            line.appendChild(lineNum);
        }
        
        const content = document.createElement('div');
        content.className = 'json-content';
        
        // Indentation
        const indent = document.createElement('span');
        indent.className = 'json-indent';
        indent.style.width = `${depth * 16}px`;
        content.appendChild(indent);
        
        if (key) {
            const keyElement = document.createElement('span');
            keyElement.className = 'json-key';
            keyElement.textContent = `"${key}": `;
            
            if (typeof data === 'object' && data !== null) {
                keyElement.classList.add('expandable');
                keyElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleNode(keyElement, data, path.concat(key));
                });
            }
            
            content.appendChild(keyElement);
        }
        
        // Value
        const valueElement = this.createValueElement(data, key, path.concat(key));
        content.appendChild(valueElement);
        
        line.appendChild(content);
        container.appendChild(line);
        
        // Handle object/array expansion
        if (typeof data === 'object' && data !== null) {
            const childContainer = document.createElement('div');
            childContainer.className = 'json-children';
            childContainer.style.display = 'none';
            
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    this.processJSONNode(item, `[${index}]`, depth + 1, path.concat(key, index), childContainer, lineNumber);
                });
            } else {
                Object.entries(data).forEach(([childKey, childValue]) => {
                    this.processJSONNode(childValue, childKey, depth + 1, path.concat(key, childKey), childContainer, lineNumber);
                });
            }
            
            container.appendChild(childContainer);
        }
    }

    createValueElement(data, key, path) {
        const wrapper = document.createElement('span');
        
        if (data === null) {
            wrapper.innerHTML = '<span class="json-null">null</span>';
        } else if (typeof data === 'string') {
            wrapper.innerHTML = `<span class="json-string">"${this.escapeHtml(data)}"</span>`;
        } else if (typeof data === 'number') {
            wrapper.innerHTML = `<span class="json-number">${data}</span>`;
        } else if (typeof data === 'boolean') {
            wrapper.innerHTML = `<span class="json-boolean">${data}</span>`;
        } else if (Array.isArray(data)) {
            const length = data.length;
            wrapper.innerHTML = `<span class="json-punctuation">[</span> <em>${length} items</em> <span class="json-punctuation">]</span>`;
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectObject(data, path, `Array (${length} items)`);
            });
            wrapper.style.cursor = 'pointer';
        } else if (typeof data === 'object') {
            const keys = Object.keys(data);
            wrapper.innerHTML = `<span class="json-punctuation">{</span> <em>${keys.length} keys</em> <span class="json-punctuation">}</span>`;
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectObject(data, path, `Object (${keys.length} keys)`);
            });
            wrapper.style.cursor = 'pointer';
        } else {
            wrapper.innerHTML = `<span class="json-value">${this.escapeHtml(String(data))}</span>`;
        }
        
        return wrapper;
    }

    toggleNode(keyElement, data, path) {
        const line = keyElement.closest('.json-line');
        const container = line.parentElement;
        const childContainer = container.querySelector('.json-children');
        
        if (childContainer) {
            const isExpanded = childContainer.style.display !== 'none';
            childContainer.style.display = isExpanded ? 'none' : 'block';
            keyElement.classList.toggle('expanded', !isExpanded);
        }
    }

    selectObject(data, path, title) {
        // Update selected state
        document.querySelectorAll('.json-line.selected').forEach(line => {
            line.classList.remove('selected');
        });
        
        const currentLine = document.querySelector(`[data-path="${path.join('.')}"]`);
        if (currentLine) {
            currentLine.classList.add('selected');
        }
        
        this.selectedPath = path.join('.');
        this.showDetailView(data, title);
        this.copyPathBtn.disabled = false;
    }

    showDetailView(data, title) {
        this.detailTitle.textContent = title;
        this.detailContainer.innerHTML = '';
        
        if (!data || typeof data !== 'object') {
            this.showEmptyState(this.detailContainer, 'Not an object', 'Selected item is not an object or array');
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'detail-table';
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Key</th>
                <th>Type</th>
                <th>Value</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        
        let entries = [];
        if (Array.isArray(data)) {
            entries = data.map((item, index) => [`[${index}]`, item]);
        } else {
            entries = Object.entries(data);
        }
        
        entries.forEach(([key, value]) => {
            if (this.hideEmptyValues && this.isEmptyValue(value)) return;
            
            const row = document.createElement('tr');
            
            const keyCell = document.createElement('td');
            keyCell.innerHTML = `<span class="detail-key">${this.escapeHtml(key)}</span>`;
            
            const typeCell = document.createElement('td');
            typeCell.innerHTML = `<span class="detail-type">${this.getValueType(value)}</span>`;
            
            const valueCell = document.createElement('td');
            valueCell.innerHTML = `<span class="detail-value">${this.formatValue(value)}</span>`;
            
            row.appendChild(keyCell);
            row.appendChild(typeCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        this.detailContainer.appendChild(table);
    }

    clearDetailView() {
        this.detailTitle.textContent = 'Object Details';
        this.showEmptyState(this.detailContainer, 'Select an object', 'Click on any object key to view detailed information');
        this.selectedPath = null;
        this.copyPathBtn.disabled = true;
        
        document.querySelectorAll('.json-line.selected').forEach(line => {
            line.classList.remove('selected');
        });
    }

    updateDataStats() {
        if (!this.jsonData) {
            this.dataStats.innerHTML = '<span class="stat-item">Keys: <strong>0</strong></span><span class="stat-item">Size: <strong>0 KB</strong></span><span class="stat-item">Depth: <strong>0</strong></span>';
            return;
        }
        
        const stats = this.analyzeJSONStructure(this.jsonData);
        this.dataStats.innerHTML = `
            <span class="stat-item">Keys: <strong>${stats.totalKeys.toLocaleString()}</strong></span>
            <span class="stat-item">Size: <strong>${this.formatBytes(stats.dataSize)}</strong></span>
            <span class="stat-item">Depth: <strong>${stats.maxDepth}</strong></span>
        `;
    }

    analyzeJSONStructure(data) {
        let totalKeys = 0;
        let maxDepth = 0;
        
        const traverse = (obj, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            
            if (obj && typeof obj === 'object') {
                if (Array.isArray(obj)) {
                    obj.forEach(item => traverse(item, depth + 1));
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        totalKeys++;
                        traverse(value, depth + 1);
                    });
                }
            }
        };
        
        traverse(data);
        
        return {
            totalKeys,
            maxDepth,
            dataSize: JSON.stringify(data).length
        };
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.clearSearchBtn.style.display = query ? 'block' : 'none';
        
        if (this.jsonData) {
            this.renderJSON();
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.clearSearchBtn.style.display = 'none';
        
        if (this.jsonData) {
            this.renderJSON();
        }
    }

    matchesSearch(data, key, query) {
        if (!query) return true;
        
        const keyMatch = key.toLowerCase().includes(query);
        const valueMatch = JSON.stringify(data).toLowerCase().includes(query);
        
        return keyMatch || valueMatch;
    }

    toggleEmptyValues(hide) {
        this.hideEmptyValues = hide;
        if (this.jsonData) {
            this.renderJSON();
        }
    }

    toggleLineNumbers(show) {
        this.showLineNumbers = show;
        if (this.jsonData) {
            this.renderJSON();
        }
    }

    expandAll() {
        document.querySelectorAll('.json-children').forEach(container => {
            container.style.display = 'block';
        });
        document.querySelectorAll('.json-key.expandable').forEach(key => {
            key.classList.add('expanded');
        });
    }

    collapseAll() {
        document.querySelectorAll('.json-children').forEach(container => {
            container.style.display = 'none';
        });
        document.querySelectorAll('.json-key.expandable').forEach(key => {
            key.classList.remove('expanded');
        });
    }

    copySelectedPath() {
        if (!this.selectedPath) return;
        
        navigator.clipboard.writeText(this.selectedPath).then(() => {
            this.showSuccessMessage('Path copied to clipboard');
        }).catch(() => {
            this.showErrorMessage('Failed to copy path to clipboard');
        });
    }

    // Comparison functions
    handleCompareFileA(event) {
        this.loadCompareFile(event, 'A');
    }

    handleCompareFileB(event) {
        this.loadCompareFile(event, 'B');
    }

    loadCompareFile(event, side) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (side === 'A') {
                    this.compareDataA = data;
                    this.fileNameA.textContent = file.name;
                } else {
                    this.compareDataB = data;
                    this.fileNameB.textContent = file.name;
                }
                
                if (this.compareDataA && this.compareDataB) {
                    this.performComparison();
                }
            } catch (error) {
                this.showErrorMessage(`Invalid JSON file ${side}: ` + error.message);
            }
        };
        
        reader.readAsText(file);
    }

    performComparison() {
        const differences = this.findDifferences(this.compareDataA, this.compareDataB);
        this.displayComparisonResults(differences);
    }

    findDifferences(objA, objB, path = '') {
        const differences = [];
        const allKeys = new Set([
            ...Object.keys(objA || {}), 
            ...Object.keys(objB || {})
        ]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const valueA = objA?.[key];
            const valueB = objB?.[key];
            
            if (!(key in (objA || {}))) {
                differences.push({
                    type: 'added',
                    path: currentPath,
                    value: valueB
                });
            } else if (!(key in (objB || {}))) {
                differences.push({
                    type: 'removed',
                    path: currentPath,
                    value: valueA
                });
            } else if (typeof valueA === 'object' && typeof valueB === 'object' && valueA !== null && valueB !== null) {
                differences.push(...this.findDifferences(valueA, valueB, currentPath));
            } else if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
                differences.push({
                    type: 'changed',
                    path: currentPath,
                    oldValue: valueA,
                    newValue: valueB
                });
            }
        }
        
        return differences;
    }

    displayComparisonResults(differences) {
        this.comparisonResults.style.display = 'block';
        
        // Summary
        const added = differences.filter(d => d.type === 'added').length;
        const removed = differences.filter(d => d.type === 'removed').length;
        const changed = differences.filter(d => d.type === 'changed').length;
        
        this.diffSummary.innerHTML = `
            <div class="diff-count added">+${added} added</div>
            <div class="diff-count removed">-${removed} removed</div>
            <div class="diff-count changed">${changed} changed</div>
        `;
        
        // Differences
        this.diffViewer.innerHTML = '';
        
        if (differences.length === 0) {
            this.showEmptyState(this.diffViewer, 'No differences found', 'The JSON files are identical');
            return;
        }
        
        differences.forEach(diff => {
            const item = document.createElement('div');
            item.className = `diff-item ${diff.type}`;
            
            const pathElement = document.createElement('div');
            pathElement.className = 'diff-path';
            pathElement.textContent = diff.path;
            
            const valueElement = document.createElement('div');
            valueElement.className = 'diff-value';
            
            switch (diff.type) {
                case 'added':
                    valueElement.textContent = `+ ${this.formatValue(diff.value)}`;
                    break;
                case 'removed':
                    valueElement.textContent = `- ${this.formatValue(diff.value)}`;
                    break;
                case 'changed':
                    valueElement.innerHTML = `
                        <div>- ${this.formatValue(diff.oldValue)}</div>
                        <div>+ ${this.formatValue(diff.newValue)}</div>
                    `;
                    break;
            }
            
            item.appendChild(pathElement);
            item.appendChild(valueElement);
            this.diffViewer.appendChild(item);
        });
    }

    // Analysis functions
    performAnalysis() {
        if (!this.jsonData) {
            this.showAnalysisPlaceholders();
            return;
        }
        
        const analysis = this.deepAnalyze(this.jsonData);
        this.displayAnalysisResults(analysis);
    }

    deepAnalyze(data) {
        const analysis = {
            structure: {
                totalNodes: 0,
                totalKeys: 0,
                maxDepth: 0,
                arrays: 0,
                objects: 0
            },
            types: {},
            keys: {},
            values: {
                strings: 0,
                numbers: 0,
                booleans: 0,
                nulls: 0,
                arrays: 0,
                objects: 0
            }
        };
        
        const traverse = (obj, depth = 0) => {
            analysis.structure.totalNodes++;
            analysis.structure.maxDepth = Math.max(analysis.structure.maxDepth, depth);
            
            if (obj === null) {
                analysis.values.nulls++;
            } else if (Array.isArray(obj)) {
                analysis.values.arrays++;
                analysis.structure.arrays++;
                obj.forEach(item => traverse(item, depth + 1));
            } else if (typeof obj === 'object') {
                analysis.values.objects++;
                analysis.structure.objects++;
                Object.entries(obj).forEach(([key, value]) => {
                    analysis.structure.totalKeys++;
                    analysis.keys[key] = (analysis.keys[key] || 0) + 1;
                    traverse(value, depth + 1);
                });
            } else {
                const type = typeof obj;
                analysis.types[type] = (analysis.types[type] || 0) + 1;
                analysis.values[type + 's'] = (analysis.values[type + 's'] || 0) + 1;
            }
        };
        
        traverse(data);
        return analysis;
    }

    displayAnalysisResults(analysis) {
        // Structure analysis
        this.structureAnalysis.innerHTML = `
            <div class="analysis-metric">
                <span class="metric-label">Total Nodes</span>
                <span class="metric-value">${analysis.structure.totalNodes.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Total Keys</span>
                <span class="metric-value">${analysis.structure.totalKeys.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Max Depth</span>
                <span class="metric-value">${analysis.structure.maxDepth}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Objects</span>
                <span class="metric-value">${analysis.structure.objects.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Arrays</span>
                <span class="metric-value">${analysis.structure.arrays.toLocaleString()}</span>
            </div>
        `;
        
        // Type analysis
        const typeEntries = Object.entries(analysis.types).sort((a, b) => b[1] - a[1]);
        this.typeAnalysis.innerHTML = typeEntries.map(([type, count]) => `
            <div class="analysis-metric">
                <span class="metric-label">${type}</span>
                <span class="metric-value">${count.toLocaleString()}</span>
            </div>
        `).join('');
        
        // Key analysis
        const topKeys = Object.entries(analysis.keys)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        this.keyAnalysis.innerHTML = topKeys.map(([key, count]) => `
            <div class="analysis-metric">
                <span class="metric-label">${this.escapeHtml(key)}</span>
                <span class="metric-value">${count.toLocaleString()}</span>
            </div>
        `).join('');
        
        // Value analysis
        this.valueAnalysis.innerHTML = `
            <div class="analysis-metric">
                <span class="metric-label">Strings</span>
                <span class="metric-value">${analysis.values.strings.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Numbers</span>
                <span class="metric-value">${analysis.values.numbers.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Booleans</span>
                <span class="metric-value">${analysis.values.booleans.toLocaleString()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Null values</span>
                <span class="metric-value">${analysis.values.nulls.toLocaleString()}</span>
            </div>
        `;
    }

    showAnalysisPlaceholders() {
        [this.structureAnalysis, this.typeAnalysis, this.keyAnalysis, this.valueAnalysis].forEach(container => {
            container.innerHTML = '<p class="analysis-placeholder">No data to analyze</p>';
        });
    }

    // Export and print functions
    exportData() {
        if (!this.jsonData) {
            this.showErrorMessage('No data to export');
            return;
        }
        
        const exportOptions = [
            { label: 'JSON', format: 'json' },
            { label: 'CSV (flattened)', format: 'csv' },
            { label: 'Analysis Report', format: 'report' }
        ];
        
        // For now, just export as JSON
        this.downloadJSON(this.jsonData, 'data.json');
        this.showSuccessMessage('Data exported successfully');
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    printView() {
        window.print();
    }

    showHelpModal() {
        this.helpModal.classList.add('active');
    }

    hideHelpModal() {
        this.helpModal.classList.remove('active');
    }

    // Utility functions
    isEmptyValue(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
    }

    getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    formatValue(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${this.escapeHtml(value)}"`;
        if (typeof value === 'object') {
            const str = JSON.stringify(value);
            return str.length > 100 ? str.substring(0, 100) + '...' : str;
        }
        return String(value);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showEmptyState(container, title, message) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                </div>
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
    }

    showLoadingState(message) {
        // Implementation would show a loading indicator
        console.log('Loading:', message);
    }

    hideLoadingState() {
        // Implementation would hide loading indicator
        console.log('Loading complete');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
        console.error('Enterprise JSON Viewer Error:', message);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? 'var(--red-500)' : 'var(--green-500)'};
            color: white;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add necessary CSS animations
const enterpriseStyle = document.createElement('style');
enterpriseStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(enterpriseStyle);

// Initialize the enterprise viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EnterpriseJSONViewer();
});