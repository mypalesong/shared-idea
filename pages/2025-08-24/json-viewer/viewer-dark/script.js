class CyberJSONViewer {
    constructor() {
        this.jsonData = null;
        this.diffData1 = null;
        this.diffData2 = null;
        this.selectedPath = null;
        this.filterEmptyEnabled = true;
        this.glowEffectsEnabled = true;
        this.matrixModeEnabled = false;
        this.currentMode = 'single';
        this.isHackMode = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeEffects();
        this.loadSampleData();
        this.updateSystemStatus('READY');
    }

    initializeElements() {
        // Main elements
        this.jsonViewer = document.getElementById('jsonViewer');
        this.detailViewer = document.getElementById('detailViewer');
        this.searchInput = document.getElementById('searchInput');
        this.filterEmptyCheckbox = document.getElementById('filterEmpty');
        this.glowEffectCheckbox = document.getElementById('glowEffect');
        this.matrixModeCheckbox = document.getElementById('matrixMode');
        
        // Mode containers
        this.singleViewMode = document.getElementById('singleViewMode');
        this.diffViewMode = document.getElementById('diffViewMode');
        
        // Stats elements
        this.statsHologram = document.getElementById('statsHologram');
        this.statsGrid = document.getElementById('statsGrid');
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
        
        // System elements
        this.systemStatus = document.getElementById('systemStatus');
        this.currentModeDisplay = document.getElementById('currentMode');
    }

    attachEventListeners() {
        // File operations
        document.getElementById('loadFileBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.fileInput.click();
        });
        document.getElementById('loadSampleBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.loadSampleData();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        
        // Raw input
        document.getElementById('rawInputBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.showRawInputModal();
        });
        document.getElementById('closeRawInput').addEventListener('click', () => this.hideRawInputModal());
        document.getElementById('parseRawJson').addEventListener('click', () => this.parseRawJSON());
        document.getElementById('clearRawInput').addEventListener('click', () => this.clearRawInput());
        
        // Diff operations
        document.getElementById('diffBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.showDiffMode();
        });
        document.getElementById('closeDiff').addEventListener('click', () => this.showSingleMode());
        document.getElementById('loadDiffFile1').addEventListener('click', () => this.diffFile1Input.click());
        document.getElementById('loadDiffFile2').addEventListener('click', () => this.diffFile2Input.click());
        this.diffFile1Input.addEventListener('change', (e) => this.handleDiffFile1Load(e));
        this.diffFile2Input.addEventListener('change', (e) => this.handleDiffFile2Load(e));
        
        // Special modes
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.performDeepAnalysis();
        });
        document.getElementById('hackBtn').addEventListener('click', () => {
            this.playCommandSound();
            this.toggleHackMode();
        });
        
        // View controls
        document.getElementById('expandAll').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAll').addEventListener('click', () => this.collapseAll());
        document.getElementById('clearData').addEventListener('click', () => this.clearData());
        document.getElementById('closeDetail').addEventListener('click', () => this.clearDetailView());
        
        // Search and filter
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.filterEmptyCheckbox.addEventListener('change', (e) => this.handleFilterChange(e.target.checked));
        this.glowEffectCheckbox.addEventListener('change', (e) => this.toggleGlowEffects(e.target.checked));
        this.matrixModeCheckbox.addEventListener('change', (e) => this.toggleMatrixMode(e.target.checked));
        
        // Stats panel
        document.getElementById('toggleStats').addEventListener('click', () => this.toggleStatsPanel());
        
        // Modal overlay click
        this.rawInputModal.addEventListener('click', (e) => {
            if (e.target === this.rawInputModal) this.hideRawInputModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    initializeEffects() {
        // Initialize cyber effects
        this.createMatrixRain();
        this.startSystemMonitoring();
    }

    playCommandSound() {
        // Create a cyber-style beep sound
        if (this.glowEffectsEnabled) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    }

    updateSystemStatus(status) {
        this.systemStatus.textContent = status;
        this.systemStatus.style.animation = 'none';
        setTimeout(() => {
            this.systemStatus.style.animation = 'pulse 2s ease-in-out infinite';
        }, 10);
    }

    updateCurrentMode(mode) {
        this.currentModeDisplay.textContent = mode.toUpperCase();
        this.currentMode = mode;
    }

    async loadSampleData() {
        this.updateSystemStatus('LOADING...');
        try {
            const response = await fetch('../data/data.json');
            const data = await response.json();
            this.setJSONData(data);
            this.updateSystemStatus('LOADED');
        } catch (error) {
            this.updateSystemStatus('ERROR');
            this.showCyberError('SAMPLE_DATA_LOAD_FAILED: ' + error.message);
        }
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.updateSystemStatus('PARSING...');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.setJSONData(data);
                this.updateSystemStatus('PARSED');
            } catch (error) {
                this.updateSystemStatus('PARSE_ERROR');
                this.showCyberError('JSON_PARSE_FAILED: ' + error.message);
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
        this.updateSystemStatus('ACTIVE');
    }

    renderJSON(searchTerm = '') {
        if (!this.jsonData) {
            this.showBootSequence();
            return;
        }
        
        this.jsonViewer.innerHTML = '';
        const element = this.createJSONElement(this.jsonData, '', searchTerm, []);
        
        if (element) {
            this.jsonViewer.appendChild(element);
        } else {
            this.showCyberMessage('NO_DATA_MATCHES_FILTER', 'warning');
        }
    }

    showBootSequence() {
        this.jsonViewer.innerHTML = `
            <div class="terminal-boot">
                <div class="boot-line">CYBER_JSON_VIEWER v2.1.0</div>
                <div class="boot-line">INITIALIZING SYSTEMS...</div>
                <div class="boot-line">NEURAL_INTERFACE: ONLINE</div>
                <div class="boot-line">DATA_STREAM: READY</div>
                <div class="boot-line">> LOAD JSON FILE TO BEGIN ANALYSIS</div>
            </div>
        `;
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
                    this.playCommandSound();
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

    showDetailView(data, path) {
        this.selectedPath = path;
        const detailTitle = document.getElementById('detailTitle');
        
        detailTitle.textContent = `ANALYZING: ${path || 'ROOT_OBJECT'}`;
        
        const detailContent = this.detailViewer.querySelector('.detail-content');
        detailContent.innerHTML = '';
        
        if (!data || typeof data !== 'object') {
            this.showCyberMessage('NOT_AN_OBJECT_OR_ARRAY', 'error', detailContent);
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
        
        detailContent.appendChild(table);
        
        // Add cyber summary
        const summary = document.createElement('div');
        summary.style.cssText = 'margin-top: 20px; padding: 16px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); color: var(--cyber-primary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;';
        summary.innerHTML = `<strong>ANALYSIS_COMPLETE:</strong> ${items.length} ENTITIES_PROCESSED`;
        detailContent.appendChild(summary);
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
            valueDiv.style.color = 'var(--text-dim)';
        } else if (typeof value === 'string') {
            valueDiv.textContent = `"${value}"`;
            valueDiv.style.color = 'var(--cyber-accent)';
        } else if (typeof value === 'number') {
            valueDiv.textContent = value;
            valueDiv.style.color = 'var(--cyber-warning)';
        } else if (typeof value === 'boolean') {
            valueDiv.textContent = value.toString();
            valueDiv.style.color = 'var(--cyber-secondary)';
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
        detailTitle.textContent = 'OBJECT_ANALYZER';
        
        const detailContent = this.detailViewer.querySelector('.detail-content');
        detailContent.innerHTML = `
            <div class="waiting-message">
                <div class="scanning-text">SCANNING...</div>
                <div class="scan-instruction">SELECT OBJECT TO ANALYZE</div>
            </div>
        `;
        
        this.selectedPath = null;
        
        document.querySelectorAll('.json-key.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    updateStats() {
        if (!this.jsonData) {
            Object.values(this.statsElements).forEach(el => el.textContent = '0');
            return;
        }
        
        const stats = this.analyzeJSON(this.jsonData);
        
        // Animate stat updates
        this.animateStatUpdate(this.statsElements.totalKeys, stats.totalKeys);
        this.animateStatUpdate(this.statsElements.totalValues, stats.totalValues);
        this.animateStatUpdate(this.statsElements.emptyValues, stats.emptyValues);
        this.animateStatUpdate(this.statsElements.maxDepth, stats.maxDepth);
        this.animateStatUpdate(this.statsElements.arrayCount, stats.arrayCount);
        this.statsElements.dataSize.textContent = this.formatBytes(stats.dataSize);
        
        // Update stat bars
        this.updateStatBars(stats);
    }

    animateStatUpdate(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);
        let current = currentValue;
        
        const updateInterval = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                current = targetValue;
                clearInterval(updateInterval);
            }
            element.textContent = current.toLocaleString();
        }, 50);
    }

    updateStatBars(stats) {
        const maxVal = Math.max(stats.totalKeys, stats.totalValues, stats.emptyValues, stats.arrayCount, stats.maxDepth * 10);
        
        setTimeout(() => {
            document.querySelectorAll('.stat-fill').forEach((fill, index) => {
                const values = [stats.totalKeys, stats.totalValues, stats.emptyValues, stats.dataSize / 1000, stats.maxDepth * 10, stats.arrayCount];
                const percentage = maxVal > 0 ? (values[index] / maxVal) * 100 : 0;
                fill.style.width = Math.min(percentage, 100) + '%';
            });
        }, 500);
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

    formatBytes(bytes) {
        if (bytes === 0) return '0B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
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

    toggleGlowEffects(enabled) {
        this.glowEffectsEnabled = enabled;
        if (enabled) {
            document.body.classList.remove('no-glow');
        } else {
            document.body.classList.add('no-glow');
        }
    }

    toggleMatrixMode(enabled) {
        this.matrixModeEnabled = enabled;
        if (enabled) {
            document.body.classList.add('matrix-mode');
            this.updateSystemStatus('MATRIX_MODE_ACTIVE');
        } else {
            document.body.classList.remove('matrix-mode');
            this.updateSystemStatus('MATRIX_MODE_DISABLED');
        }
    }

    toggleHackMode() {
        this.isHackMode = !this.isHackMode;
        if (this.isHackMode) {
            this.updateSystemStatus('HACK_MODE_ACTIVE');
            this.startHackSequence();
        } else {
            this.updateSystemStatus('HACK_MODE_DISABLED');
            this.stopHackSequence();
        }
    }

    startHackSequence() {
        // Add some fun hack mode effects
        const hackBtn = document.getElementById('hackBtn');
        hackBtn.style.animation = 'hackPulse 0.5s ease-in-out infinite alternate';
        
        // Random stat fluctuations
        this.hackInterval = setInterval(() => {
            if (this.jsonData) {
                Object.values(this.statsElements).forEach(el => {
                    if (el.id !== 'dataSize') {
                        const current = parseInt(el.textContent) || 0;
                        const fluctuation = Math.floor(Math.random() * 10) - 5;
                        el.textContent = Math.max(0, current + fluctuation).toLocaleString();
                    }
                });
            }
        }, 200);
    }

    stopHackSequence() {
        const hackBtn = document.getElementById('hackBtn');
        hackBtn.style.animation = '';
        
        if (this.hackInterval) {
            clearInterval(this.hackInterval);
            this.hackInterval = null;
            this.updateStats(); // Restore real stats
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

    clearData() {
        this.jsonData = null;
        this.showBootSequence();
        this.updateStats();
        this.clearDetailView();
        this.updateSystemStatus('CLEARED');
    }

    toggleStatsPanel() {
        const button = document.getElementById('toggleStats');
        this.statsGrid.classList.toggle('collapsed');
        
        if (this.statsGrid.classList.contains('collapsed')) {
            button.style.transform = 'rotate(180deg)';
        } else {
            button.style.transform = 'rotate(0deg)';
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
            this.showCyberError('NO_INPUT_DATA_PROVIDED');
            return;
        }
        
        this.updateSystemStatus('PARSING_RAW_INPUT...');
        try {
            const data = JSON.parse(rawText);
            this.setJSONData(data);
            this.hideRawInputModal();
            this.showSingleMode();
            this.updateSystemStatus('RAW_INPUT_PARSED');
        } catch (error) {
            this.updateSystemStatus('PARSE_ERROR');
            this.showCyberError('INVALID_JSON_SYNTAX: ' + error.message);
        }
    }

    clearRawInput() {
        this.rawJsonInput.value = '';
    }

    showSingleMode() {
        this.updateCurrentMode('single');
        this.singleViewMode.style.display = 'flex';
        this.diffViewMode.style.display = 'none';
    }

    showDiffMode() {
        this.updateCurrentMode('diff');
        this.singleViewMode.style.display = 'none';
        this.diffViewMode.style.display = 'block';
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
        
        this.updateSystemStatus(`LOADING_DIFF_${fileNumber}...`);
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
                this.updateSystemStatus(`DIFF_${fileNumber}_LOADED`);
            } catch (error) {
                this.updateSystemStatus('DIFF_LOAD_ERROR');
                this.showCyberError(`DIFF_FILE_${fileNumber}_INVALID: ` + error.message);
            }
        };
        reader.readAsText(file);
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
        
        this.updateSystemStatus('ANALYZING_DIFFERENCES...');
        const differences = this.findDifferences(this.diffData1, this.diffData2);
        this.renderDiffResult(differences);
        this.updateSystemStatus('DIFF_ANALYSIS_COMPLETE');
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
            this.showCyberMessage('NO_DIFFERENCES_DETECTED', 'success', this.diffResult);
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
            this.showCyberError('NO_DATA_TO_ANALYZE');
            return;
        }
        
        this.updateSystemStatus('DEEP_ANALYSIS_RUNNING...');
        const analysis = this.deepAnalyzeJSON(this.jsonData);
        this.showAnalysisResults(analysis);
        this.updateSystemStatus('ANALYSIS_COMPLETE');
    }

    deepAnalyzeJSON(data) {
        const analysis = {
            structure: {},
            patterns: {},
            security: {},
            recommendations: []
        };
        
        const typeCount = {};
        const keyFrequency = {};
        const valuePatterns = {};
        const suspiciousPatterns = [];
        
        const analyzeValue = (value, key = '') => {
            const type = Array.isArray(value) ? 'array' : typeof value;
            typeCount[type] = (typeCount[type] || 0) + 1;
            
            if (key) {
                keyFrequency[key] = (keyFrequency[key] || 0) + 1;
                
                // Security analysis
                if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key')) {
                    suspiciousPatterns.push(`SENSITIVE_KEY_DETECTED: ${key}`);
                }
            }
            
            if (typeof value === 'string') {
                const pattern = this.detectStringPattern(value);
                valuePatterns[pattern] = (valuePatterns[pattern] || 0) + 1;
                
                // Security patterns
                if (value.length > 100 && /[A-Za-z0-9+/=]/.test(value)) {
                    suspiciousPatterns.push(`POSSIBLE_ENCODED_DATA: ${value.substring(0, 50)}...`);
                }
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
        analysis.security.suspiciousPatterns = suspiciousPatterns;
        
        // Generate cyber recommendations
        if (typeCount.string > typeCount.number * 2) {
            analysis.recommendations.push('OPTIMIZATION_NEEDED: Excessive string data detected');
        }
        
        if (Object.keys(keyFrequency).length > 50) {
            analysis.recommendations.push('COMPLEXITY_WARNING: High key diversity detected');
        }
        
        if (suspiciousPatterns.length > 0) {
            analysis.recommendations.push('SECURITY_ALERT: Sensitive patterns detected');
        }
        
        return analysis;
    }

    detectStringPattern(str) {
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'DATE_FORMAT';
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) return 'EMAIL_ADDRESS';
        if (/^https?:\/\//.test(str)) return 'URL_LINK';
        if (/^\d+$/.test(str)) return 'NUMERIC_STRING';
        if (/^[A-Fa-f0-9]+$/.test(str)) return 'HEX_DATA';
        if (str.length > 100) return 'LONG_TEXT';
        return 'SHORT_TEXT';
    }

    showAnalysisResults(analysis) {
        const analysisModal = document.createElement('div');
        analysisModal.className = 'terminal-modal active';
        analysisModal.innerHTML = `
            <div class="terminal-window">
                <div class="terminal-titlebar">
                    <div class="terminal-title">DEEP_ANALYSIS_RESULTS.dat</div>
                    <div class="terminal-buttons">
                        <button class="terminal-btn close" onclick="this.closest('.terminal-modal').remove()">×</button>
                    </div>
                </div>
                <div class="terminal-content">
                    <div class="terminal-header">
                        <div class="prompt-line">> ANALYSIS COMPLETE</div>
                        <div class="prompt-line">> GENERATING REPORT...</div>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto; font-family: var(--font-mono); font-size: 12px; color: var(--cyber-primary);">
                        <h4 style="color: var(--cyber-accent); margin: 20px 0 10px 0;">DATA_TYPE_DISTRIBUTION:</h4>
                        <pre style="color: var(--text-secondary);">${JSON.stringify(analysis.structure.typeDistribution, null, 2)}</pre>
                        
                        <h4 style="color: var(--cyber-accent); margin: 20px 0 10px 0;">TOP_KEYS_FREQUENCY:</h4>
                        <pre style="color: var(--text-secondary);">${JSON.stringify(Object.entries(analysis.structure.keyFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10), null, 2)}</pre>
                        
                        <h4 style="color: var(--cyber-accent); margin: 20px 0 10px 0;">VALUE_PATTERNS:</h4>
                        <pre style="color: var(--text-secondary);">${JSON.stringify(analysis.patterns.valuePatterns, null, 2)}</pre>
                        
                        ${analysis.security.suspiciousPatterns.length > 0 ? `
                            <h4 style="color: var(--cyber-danger); margin: 20px 0 10px 0;">SECURITY_ALERTS:</h4>
                            <ul style="color: var(--cyber-danger);">
                                ${analysis.security.suspiciousPatterns.map(alert => `<li>${alert}</li>`).join('')}
                            </ul>
                        ` : ''}
                        
                        ${analysis.recommendations.length > 0 ? `
                            <h4 style="color: var(--cyber-warning); margin: 20px 0 10px 0;">RECOMMENDATIONS:</h4>
                            <ul style="color: var(--cyber-warning);">
                                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(analysisModal);
    }

    showCyberMessage(message, type = 'info', container = null) {
        const colors = {
            info: 'var(--cyber-primary)',
            warning: 'var(--cyber-warning)',
            error: 'var(--cyber-danger)',
            success: 'var(--cyber-success)'
        };
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            padding: 20px;
            text-align: center;
            color: ${colors[type]};
            font-family: var(--font-cyber);
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: pulse 2s ease-in-out infinite;
        `;
        messageDiv.textContent = message;
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(messageDiv);
        } else {
            // Show as notification
            this.showCyberNotification(message, type);
        }
    }

    showCyberError(message) {
        this.showCyberNotification(message, 'error');
    }

    showCyberNotification(message, type = 'info') {
        const colors = {
            info: 'var(--cyber-primary)',
            warning: 'var(--cyber-warning)',
            error: 'var(--cyber-danger)',
            success: 'var(--cyber-success)'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid ${colors[type]};
            color: ${colors[type]};
            padding: 16px 24px;
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            z-index: 1001;
            box-shadow: 0 0 20px ${colors[type]};
            animation: cyberSlideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'cyberSlideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    createMatrixRain() {
        // This could be enhanced with canvas-based matrix rain effect
        // For now, we use the CSS grid background
    }

    startSystemMonitoring() {
        // Update system status periodically
        setInterval(() => {
            if (this.jsonData && !this.isHackMode) {
                const statuses = ['MONITORING', 'ACTIVE', 'SCANNING', 'READY'];
                const currentStatus = this.systemStatus.textContent;
                if (statuses.includes(currentStatus)) {
                    this.updateSystemStatus(statuses[Math.floor(Math.random() * statuses.length)]);
                }
            }
        }, 5000);
    }

    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'o':
                    event.preventDefault();
                    this.fileInput.click();
                    break;
                case 'f':
                    event.preventDefault();
                    this.searchInput.focus();
                    break;
                case 'r':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.showRawInputModal();
                    }
                    break;
                case 'd':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.showDiffMode();
                    }
                    break;
            }
        }
        
        if (event.key === 'Escape') {
            this.hideRawInputModal();
        }
        
        if (event.ctrlKey && event.key === 'Enter' && this.rawInputModal.classList.contains('active')) {
            this.parseRawJSON();
        }
    }
}

// Add necessary CSS animations
const cyberStyle = document.createElement('style');
cyberStyle.textContent = `
    @keyframes cyberSlideIn {
        from { 
            transform: translateX(100%); 
            opacity: 0; 
        }
        to { 
            transform: translateX(0); 
            opacity: 1; 
        }
    }
    
    @keyframes cyberSlideOut {
        from { 
            transform: translateX(0); 
            opacity: 1; 
        }
        to { 
            transform: translateX(100%); 
            opacity: 0; 
        }
    }
    
    @keyframes hackPulse {
        from { 
            box-shadow: var(--glow-danger);
            border-color: var(--cyber-danger);
        }
        to { 
            box-shadow: 0 0 30px var(--cyber-danger);
            border-color: var(--cyber-warning);
        }
    }
`;
document.head.appendChild(cyberStyle);

// Initialize the cyber viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CyberJSONViewer();
});