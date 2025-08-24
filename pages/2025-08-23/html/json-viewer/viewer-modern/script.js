class ModernJSONViewer {
    constructor() {
        this.jsonData = null;
        this.diffData1 = null;
        this.diffData2 = null;
        this.selectedPath = null;
        this.filterEmptyEnabled = true;
        this.currentMode = 'single'; // 'single' or 'diff'
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeTheme();
        this.loadSampleData();
    }

    initializeElements() {
        // Main elements
        this.jsonViewer = document.getElementById('jsonViewer');
        this.detailViewer = document.getElementById('detailViewer');
        this.searchInput = document.getElementById('searchInput');
        this.filterEmptyCheckbox = document.getElementById('filterEmpty');
        
        // Mode containers
        this.singleViewMode = document.getElementById('singleViewMode');
        this.diffViewMode = document.getElementById('diffViewMode');
        
        // Stats elements
        this.statsPanel = document.getElementById('statsPanel');
        this.statsContent = document.getElementById('statsContent');
        this.statsElements = {
            totalKeys: document.getElementById('totalKeys'),
            totalValues: document.getElementById('totalValues'),
            emptyValues: document.getElementById('emptyValues'),
            dataSize: document.getElementById('dataSize'),
            maxDepth: document.getElementById('maxDepth'),
            arrayCount: document.getElementById('arrayCount')
        };
        
        // Diff elements
        this.diffViewer1 = document.getElementById('diffViewer1');
        this.diffViewer2 = document.getElementById('diffViewer2');
        this.diffResult = document.getElementById('diffResult');
        
        // Modal elements
        this.rawInputModal = document.getElementById('rawInputModal');
        this.rawJsonInput = document.getElementById('rawJsonInput');
        
        // File inputs
        this.fileInput = document.getElementById('fileInput');
        this.diffFile1Input = document.getElementById('diffFile1Input');
        this.diffFile2Input = document.getElementById('diffFile2Input');
    }

    attachEventListeners() {
        // File operations
        document.getElementById('loadFileBtn').addEventListener('click', () => this.fileInput.click());
        document.getElementById('loadSampleBtn').addEventListener('click', () => this.loadSampleData());
        this.fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        
        // Raw input
        document.getElementById('rawInputBtn').addEventListener('click', () => this.showRawInputModal());
        document.getElementById('closeRawInput').addEventListener('click', () => this.hideRawInputModal());
        document.getElementById('parseRawJson').addEventListener('click', () => this.parseRawJSON());
        document.getElementById('clearRawInput').addEventListener('click', () => this.clearRawInput());
        
        // Diff operations
        document.getElementById('diffBtn').addEventListener('click', () => this.showDiffMode());
        document.getElementById('closeDiff').addEventListener('click', () => this.showSingleMode());
        document.getElementById('loadDiffFile1').addEventListener('click', () => this.diffFile1Input.click());
        document.getElementById('loadDiffFile2').addEventListener('click', () => this.diffFile2Input.click());
        this.diffFile1Input.addEventListener('change', (e) => this.handleDiffFile1Load(e));
        this.diffFile2Input.addEventListener('change', (e) => this.handleDiffFile2Load(e));
        
        // View controls
        document.getElementById('expandAll').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAll').addEventListener('click', () => this.collapseAll());
        document.getElementById('closeDetail').addEventListener('click', () => this.clearDetailView());
        
        // Search and filter
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.filterEmptyCheckbox.addEventListener('change', (e) => this.handleFilterChange(e.target.checked));
        
        // Stats panel
        document.getElementById('collapseStats').addEventListener('click', () => this.toggleStatsPanel());
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Analysis
        document.getElementById('analyzeBtn').addEventListener('click', () => this.performDeepAnalysis());
        
        // Modal overlay click
        this.rawInputModal.addEventListener('click', (e) => {
            if (e.target === this.rawInputModal) this.hideRawInputModal();
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('json-viewer-theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('json-viewer-theme', theme);
        
        const themeIcon = document.querySelector('#themeToggle .material-icons');
        themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    async loadSampleData() {
        try {
            const response = await fetch('../data/data.json');
            const data = await response.json();
            this.setJSONData(data);
        } catch (error) {
            this.showError('Error loading sample data: ' + error.message);
        }
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.setJSONData(data);
            } catch (error) {
                this.showError('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    handleDiffFile1Load(event) {
        this.loadDiffFile(event, 1);
    }

    handleDiffFile2Load(event) {
        this.loadDiffFile(event, 2);
    }

    loadDiffFile(event, fileNumber) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (fileNumber === 1) {
                    this.diffData1 = data;
                    this.renderDiffViewer(this.diffViewer1, data);
                } else {
                    this.diffData2 = data;
                    this.renderDiffViewer(this.diffViewer2, data);
                }
                
                if (this.diffData1 && this.diffData2) {
                    this.performDiff();
                }
            } catch (error) {
                this.showError(`Invalid JSON file ${fileNumber}: ` + error.message);
            }
        };
        reader.readAsText(file);
    }

    setJSONData(data) {
        this.jsonData = data;
        this.renderJSON();
        this.updateStats();
        this.clearDetailView();
        this.selectedPath = null;
    }

    renderJSON(searchTerm = '') {
        if (!this.jsonData) {
            this.showEmptyState(this.jsonViewer, 'upload_file', 'Load a JSON file to start exploring');
            return;
        }
        
        this.jsonViewer.innerHTML = '';
        const element = this.createJSONElement(this.jsonData, '', searchTerm, []);
        
        if (element) {
            this.jsonViewer.appendChild(element);
        } else {
            this.showEmptyState(this.jsonViewer, 'search_off', 'No data matches the current filters');
        }
    }

    createJSONElement(data, parentKey = '', searchTerm = '', path = []) {
        if (data === null) {
            return this.createValueElement('null', 'json-null');
        }
        
        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                return this.createArrayElement(data, parentKey, searchTerm, path);
            } else {
                return this.createObjectElement(data, parentKey, searchTerm, path);
            }
        }
        
        if (typeof data === 'string') {
            return this.createValueElement(`"${data}"`, 'json-string');
        }
        
        if (typeof data === 'number') {
            return this.createValueElement(data, 'json-number');
        }
        
        if (typeof data === 'boolean') {
            return this.createValueElement(data.toString(), 'json-boolean');
        }
        
        return this.createValueElement(String(data));
    }

    createValueElement(value, className = '') {
        const span = document.createElement('span');
        span.className = `json-value ${className}`;
        span.textContent = value;
        return span;
    }

    createArrayElement(arr, parentKey, searchTerm, path) {
        const container = document.createElement('div');
        container.className = 'json-array';
        
        const openBracket = document.createElement('span');
        openBracket.className = 'bracket';
        openBracket.textContent = '[';
        container.appendChild(openBracket);
        
        let hasVisibleItems = false;
        
        arr.forEach((item, index) => {
            const itemPath = [...path, index];
            if (!this.shouldShowValue(item, `${parentKey}[${index}]`, searchTerm)) {
                return;
            }
            
            hasVisibleItems = true;
            
            const itemContainer = document.createElement('div');
            itemContainer.className = 'json-item';
            
            const indexSpan = document.createElement('span');
            indexSpan.className = 'array-index';
            indexSpan.textContent = `[${index}]`;
            itemContainer.appendChild(indexSpan);
            
            const element = this.createJSONElement(item, `${parentKey}[${index}]`, searchTerm, itemPath);
            if (element) {
                itemContainer.appendChild(element);
            }
            
            if (index < arr.length - 1) {
                const comma = document.createElement('span');
                comma.className = 'comma';
                comma.textContent = ',';
                itemContainer.appendChild(comma);
            }
            
            container.appendChild(itemContainer);
        });
        
        const closeBracket = document.createElement('span');
        closeBracket.className = 'bracket';
        closeBracket.textContent = ']';
        container.appendChild(closeBracket);
        
        return hasVisibleItems || !this.filterEmptyEnabled ? container : null;
    }

    createObjectElement(obj, parentKey, searchTerm, path) {
        const container = document.createElement('div');
        container.className = 'json-object';
        
        const openBrace = document.createElement('span');
        openBrace.className = 'bracket';
        openBrace.textContent = '{';
        container.appendChild(openBrace);
        
        const keys = Object.keys(obj);
        let visibleKeys = [];
        
        keys.forEach(key => {
            if (this.shouldShowValue(obj[key], key, searchTerm) || 
                (typeof obj[key] === 'object' && obj[key] !== null && this.hasVisibleChildren(obj[key], searchTerm))) {
                visibleKeys.push(key);
            }
        });
        
        visibleKeys.forEach((key, index) => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'json-item';
            
            const keyElement = document.createElement('span');
            keyElement.className = 'json-key';
            keyElement.textContent = `"${key}": `;
            
            const value = obj[key];
            const currentPath = [...path, key];
            
            if (typeof value === 'object' && value !== null) {
                keyElement.classList.add('selectable');
                
                keyElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleObjectSelect(keyElement, value, currentPath);
                });
                
                itemContainer.appendChild(keyElement);
                const element = this.createJSONElement(value, key, searchTerm, currentPath);
                if (element) {
                    itemContainer.appendChild(element);
                }
            } else {
                keyElement.style.paddingLeft = '0';
                itemContainer.appendChild(keyElement);
                const element = this.createJSONElement(value, key, searchTerm, currentPath);
                if (element) {
                    itemContainer.appendChild(element);
                }
            }
            
            if (index < visibleKeys.length - 1) {
                const comma = document.createElement('span');
                comma.className = 'comma';
                comma.textContent = ',';
                itemContainer.appendChild(comma);
            }
            
            if (searchTerm && key.toLowerCase().includes(searchTerm)) {
                keyElement.innerHTML = keyElement.innerHTML.replace(
                    new RegExp(`(${searchTerm})`, 'gi'),
                    '<span class="highlight">$1</span>'
                );
            }
            
            container.appendChild(itemContainer);
        });
        
        const closeBrace = document.createElement('span');
        closeBrace.className = 'bracket';
        closeBrace.textContent = '}';
        container.appendChild(closeBrace);
        
        return visibleKeys.length > 0 || !this.filterEmptyEnabled ? container : null;
    }

    handleObjectSelect(keyElement, value, currentPath) {
        // Remove previous selection
        document.querySelectorAll('.json-key.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current
        keyElement.classList.add('selected');
        
        // Show detail view
        this.showDetailView(value, currentPath.join('.'));
        
        // Toggle collapse
        keyElement.classList.toggle('collapsed');
        const nextSibling = keyElement.nextElementSibling;
        if (nextSibling && (nextSibling.classList.contains('json-object') || 
            nextSibling.classList.contains('json-array'))) {
            nextSibling.classList.toggle('collapsed');
        }
    }

    shouldShowValue(value, key, searchTerm) {
        if (this.filterEmptyEnabled && this.isEmptyValue(value)) {
            return false;
        }
        
        if (searchTerm) {
            const keyMatch = key.toLowerCase().includes(searchTerm);
            const valueMatch = JSON.stringify(value).toLowerCase().includes(searchTerm);
            return keyMatch || valueMatch;
        }
        
        return true;
    }

    isEmptyValue(value) {
        return value === null || 
               value === "" || 
               value === false || 
               (Array.isArray(value) && value.length === 0);
    }

    hasVisibleChildren(obj, searchTerm) {
        if (!obj || typeof obj !== 'object') return false;
        
        if (Array.isArray(obj)) {
            return obj.some(item => this.shouldShowValue(item, '', searchTerm) || 
                (typeof item === 'object' && item !== null && this.hasVisibleChildren(item, searchTerm)));
        }
        
        return Object.entries(obj).some(([key, value]) => 
            this.shouldShowValue(value, key, searchTerm) || 
            (typeof value === 'object' && value !== null && this.hasVisibleChildren(value, searchTerm))
        );
    }

    showDetailView(data, path) {
        this.selectedPath = path;
        const detailTitle = document.getElementById('detailTitle');
        
        detailTitle.innerHTML = `<span class="material-icons">info</span>${path || 'Root Object'}`;
        this.detailViewer.innerHTML = '';
        
        if (!data || typeof data !== 'object') {
            this.showEmptyState(this.detailViewer, 'error', 'Not an object or array');
            return;
        }
        
        const table = document.createElement('div');
        table.className = 'detail-table';
        
        let items = [];
        
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                if (!this.filterEmptyEnabled || !this.isEmptyValue(item)) {
                    items.push({key: `[${index}]`, value: item});
                }
            });
        } else {
            Object.entries(data).forEach(([key, value]) => {
                if (!this.filterEmptyEnabled || !this.isEmptyValue(value)) {
                    items.push({key, value});
                }
            });
            items.sort((a, b) => a.key.localeCompare(b.key));
        }
        
        items.forEach(({key, value}) => {
            const itemDiv = this.createDetailItem(key, value);
            if (itemDiv) table.appendChild(itemDiv);
        });
        
        this.detailViewer.appendChild(table);
        
        // Add summary
        const summary = document.createElement('div');
        summary.style.cssText = 'margin-top: 20px; padding: 16px; background: var(--surface-variant); border-radius: 8px; color: var(--text-secondary); font-size: 14px;';
        summary.innerHTML = `<strong>Summary:</strong> ${items.length} items displayed`;
        this.detailViewer.appendChild(summary);
    }

    createDetailItem(key, value) {
        if (this.filterEmptyEnabled && this.isEmptyValue(value)) {
            return null;
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'detail-item';
        
        const keyDiv = document.createElement('div');
        keyDiv.className = 'detail-key';
        keyDiv.textContent = key;
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'detail-value';
        
        if (value === null) {
            valueDiv.textContent = 'null';
            valueDiv.style.color = 'var(--text-hint)';
        } else if (typeof value === 'string') {
            valueDiv.textContent = `"${value}"`;
            valueDiv.style.color = 'var(--success-color)';
        } else if (typeof value === 'number') {
            valueDiv.textContent = value;
            valueDiv.style.color = 'var(--info-color)';
        } else if (typeof value === 'boolean') {
            valueDiv.textContent = value.toString();
            valueDiv.style.color = 'var(--secondary-color)';
        } else {
            const jsonString = JSON.stringify(value, null, 2);
            valueDiv.textContent = jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString;
            valueDiv.style.color = 'var(--text-secondary)';
        }
        
        itemDiv.appendChild(keyDiv);
        itemDiv.appendChild(valueDiv);
        
        return itemDiv;
    }

    clearDetailView() {
        const detailTitle = document.getElementById('detailTitle');
        detailTitle.innerHTML = '<span class="material-icons">info</span>Select an object to view details';
        this.showEmptyState(this.detailViewer, 'touch_app', 'Click on any object key in the left panel to view its contents here');
        this.selectedPath = null;
        
        document.querySelectorAll('.json-key.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    updateStats() {
        if (!this.jsonData) {
            Object.values(this.statsElements).forEach(el => el.textContent = '-');
            return;
        }
        
        const stats = this.analyzeJSON(this.jsonData);
        
        this.statsElements.totalKeys.textContent = stats.totalKeys.toLocaleString();
        this.statsElements.totalValues.textContent = stats.totalValues.toLocaleString();
        this.statsElements.emptyValues.textContent = stats.emptyValues.toLocaleString();
        this.statsElements.dataSize.textContent = this.formatBytes(stats.dataSize);
        this.statsElements.maxDepth.textContent = stats.maxDepth;
        this.statsElements.arrayCount.textContent = stats.arrayCount.toLocaleString();
    }

    analyzeJSON(data) {
        let totalKeys = 0;
        let totalValues = 0;
        let emptyValues = 0;
        let arrayCount = 0;
        let maxDepth = 0;
        
        const traverse = (obj, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            
            if (obj === null || typeof obj !== 'object') {
                totalValues++;
                if (this.isEmptyValue(obj)) emptyValues++;
                return;
            }
            
            if (Array.isArray(obj)) {
                arrayCount++;
                obj.forEach(item => traverse(item, depth + 1));
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    totalKeys++;
                    traverse(value, depth + 1);
                });
            }
        };
        
        traverse(data);
        
        return {
            totalKeys,
            totalValues,
            emptyValues,
            arrayCount,
            maxDepth,
            dataSize: JSON.stringify(data).length
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    handleSearch(searchTerm) {
        if (this.jsonData) {
            this.renderJSON(searchTerm.toLowerCase());
        }
    }

    handleFilterChange(checked) {
        this.filterEmptyEnabled = checked;
        if (this.jsonData) {
            this.renderJSON(this.searchInput.value.toLowerCase());
            if (this.selectedPath) {
                const pathParts = this.selectedPath.split('.');
                let currentData = this.jsonData;
                for (const part of pathParts) {
                    currentData = currentData[part];
                }
                this.showDetailView(currentData, this.selectedPath);
            }
        }
    }

    expandAll() {
        document.querySelectorAll('.json-key').forEach(key => {
            key.classList.remove('collapsed');
            const sibling = key.nextElementSibling;
            if (sibling && (sibling.classList.contains('json-object') || sibling.classList.contains('json-array'))) {
                sibling.classList.remove('collapsed');
            }
        });
    }

    collapseAll() {
        document.querySelectorAll('.json-key').forEach(key => {
            key.classList.add('collapsed');
            const sibling = key.nextElementSibling;
            if (sibling && (sibling.classList.contains('json-object') || sibling.classList.contains('json-array'))) {
                sibling.classList.add('collapsed');
            }
        });
    }

    toggleStatsPanel() {
        const button = document.getElementById('collapseStats');
        const icon = button.querySelector('.material-icons');
        
        this.statsContent.classList.toggle('collapsed');
        
        if (this.statsContent.classList.contains('collapsed')) {
            icon.textContent = 'expand_more';
        } else {
            icon.textContent = 'expand_less';
        }
    }

    showRawInputModal() {
        this.rawInputModal.classList.add('active');
        this.rawJsonInput.focus();
    }

    hideRawInputModal() {
        this.rawInputModal.classList.remove('active');
    }

    parseRawJSON() {
        const rawText = this.rawJsonInput.value.trim();
        if (!rawText) {
            this.showError('Please enter some JSON data');
            return;
        }
        
        try {
            const data = JSON.parse(rawText);
            this.setJSONData(data);
            this.hideRawInputModal();
            this.showSingleMode();
        } catch (error) {
            this.showError('Invalid JSON: ' + error.message);
        }
    }

    clearRawInput() {
        this.rawJsonInput.value = '';
    }

    showSingleMode() {
        this.currentMode = 'single';
        this.singleViewMode.style.display = 'flex';
        this.diffViewMode.style.display = 'none';
    }

    showDiffMode() {
        this.currentMode = 'diff';
        this.singleViewMode.style.display = 'none';
        this.diffViewMode.style.display = 'block';
    }

    renderDiffViewer(container, data) {
        container.innerHTML = '';
        const element = this.createJSONElement(data, '', '', []);
        if (element) {
            container.appendChild(element);
        }
    }

    performDiff() {
        if (!this.diffData1 || !this.diffData2) return;
        
        const differences = this.findDifferences(this.diffData1, this.diffData2);
        this.renderDiffResult(differences);
    }

    findDifferences(obj1, obj2, path = '') {
        const differences = [];
        
        const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const val1 = obj1?.[key];
            const val2 = obj2?.[key];
            
            if (!(key in (obj1 || {}))) {
                differences.push({ type: 'added', path: currentPath, value: val2 });
            } else if (!(key in (obj2 || {}))) {
                differences.push({ type: 'removed', path: currentPath, value: val1 });
            } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
                differences.push(...this.findDifferences(val1, val2, currentPath));
            } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                differences.push({ type: 'changed', path: currentPath, oldValue: val1, newValue: val2 });
            }
        }
        
        return differences;
    }

    renderDiffResult(differences) {
        this.diffResult.innerHTML = '';
        
        if (differences.length === 0) {
            this.showEmptyState(this.diffResult, 'check_circle', 'No differences found');
            return;
        }
        
        differences.forEach(diff => {
            const diffItem = document.createElement('div');
            diffItem.className = `diff-${diff.type}`;
            
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
            
            diffItem.innerHTML = content;
            this.diffResult.appendChild(diffItem);
        });
    }

    performDeepAnalysis() {
        if (!this.jsonData) {
            this.showError('No JSON data loaded');
            return;
        }
        
        const analysis = this.deepAnalyzeJSON(this.jsonData);
        this.showAnalysisResults(analysis);
    }

    deepAnalyzeJSON(data) {
        const analysis = {
            structure: {},
            patterns: {},
            recommendations: []
        };
        
        const typeCount = {};
        const keyFrequency = {};
        const valuePatterns = {};
        
        const analyzeValue = (value, key = '') => {
            const type = Array.isArray(value) ? 'array' : typeof value;
            typeCount[type] = (typeCount[type] || 0) + 1;
            
            if (key) {
                keyFrequency[key] = (keyFrequency[key] || 0) + 1;
            }
            
            if (typeof value === 'string') {
                const pattern = this.detectStringPattern(value);
                valuePatterns[pattern] = (valuePatterns[pattern] || 0) + 1;
            }
        };
        
        const traverse = (obj, parentKey = '') => {
            if (obj === null || typeof obj !== 'object') {
                analyzeValue(obj, parentKey);
                return;
            }
            
            if (Array.isArray(obj)) {
                analyzeValue(obj, parentKey);
                obj.forEach((item, index) => traverse(item, `${parentKey}[${index}]`));
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    traverse(value, key);
                });
            }
        };
        
        traverse(data);
        
        analysis.structure.typeDistribution = typeCount;
        analysis.structure.keyFrequency = keyFrequency;
        analysis.patterns.valuePatterns = valuePatterns;
        
        // Generate recommendations
        if (typeCount.string > typeCount.number * 2) {
            analysis.recommendations.push('Consider data type optimization - many string values detected');
        }
        
        if (Object.keys(keyFrequency).length > 50) {
            analysis.recommendations.push('Large number of unique keys detected - consider data structure review');
        }
        
        return analysis;
    }

    detectStringPattern(str) {
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) return 'email';
        if (/^https?:\/\//.test(str)) return 'url';
        if (/^\d+$/.test(str)) return 'numeric_string';
        if (str.length > 100) return 'long_text';
        return 'short_text';
    }

    showAnalysisResults(analysis) {
        // Create a modal or panel to show analysis results
        const analysisModal = document.createElement('div');
        analysisModal.className = 'modal active';
        analysisModal.innerHTML = `
            <div class="modal-content card">
                <div class="modal-header">
                    <h3><span class="material-icons">analytics</span>Deep Analysis Results</h3>
                    <button class="btn btn-icon" onclick="this.closest('.modal').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="max-height: 400px; overflow-y: auto;">
                        <h4>Data Type Distribution</h4>
                        <pre>${JSON.stringify(analysis.structure.typeDistribution, null, 2)}</pre>
                        
                        <h4>Most Common Keys</h4>
                        <pre>${JSON.stringify(Object.entries(analysis.structure.keyFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10), null, 2)}</pre>
                        
                        <h4>Value Patterns</h4>
                        <pre>${JSON.stringify(analysis.patterns.valuePatterns, null, 2)}</pre>
                        
                        ${analysis.recommendations.length > 0 ? `
                            <h4>Recommendations</h4>
                            <ul>
                                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(analysisModal);
    }

    showEmptyState(container, icon, message) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">${icon}</span>
                <p>${message}</p>
            </div>
        `;
    }

    showError(message) {
        // Create a temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: var(--shadow-3);
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }
}

// Add necessary CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModernJSONViewer();
});