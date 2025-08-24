// Global State
let jsonData = null;
let diffData1 = null;
let diffData2 = null;
let currentMode = 'normal'; // 'normal' or 'diff'
let selectedPath = null;
let bookmarks = JSON.parse(localStorage.getItem('jsonViewer_bookmarks') || '[]');
let history = JSON.parse(localStorage.getItem('jsonViewer_history') || '[]');
let filterSettings = {
    hideEmpty: true,
    showTypes: false,
    searchKeys: true,
    searchValues: true,
    searchPaths: false,
    types: ['string', 'number', 'boolean', 'object', 'array', 'null'],
    regex: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    bindEvents();
    loadFromDataFolder();
});

function initializeApp() {
    // Initialize tabs
    initializeTabs();
    
    // Load saved settings
    const savedFilters = localStorage.getItem('jsonViewer_filters');
    if (savedFilters) {
        filterSettings = { ...filterSettings, ...JSON.parse(savedFilters) };
        applyFilterSettings();
    }
    
    // Render bookmarks and history
    renderBookmarks();
    renderHistory();
    renderStats();
}

function bindEvents() {
    // Data loading events
    document.getElementById('loadBtn').addEventListener('click', handleLoadData);
    document.getElementById('dataSource').addEventListener('change', handleDataSourceChange);
    
    // Mode switching
    document.getElementById('diffBtn').addEventListener('click', () => switchMode('diff'));
    
    // Search and filter events
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchAdvanced').addEventListener('click', () => showModal('advancedSearchModal'));
    document.getElementById('hideEmpty').addEventListener('change', (e) => {
        filterSettings.hideEmpty = e.target.checked;
        saveFilterSettings();
        if (jsonData) refreshView();
    });
    document.getElementById('showTypes').addEventListener('change', (e) => {
        filterSettings.showTypes = e.target.checked;
        saveFilterSettings();
        if (jsonData) refreshView();
    });
    
    // Tree controls
    document.getElementById('expandAll').addEventListener('click', expandAll);
    document.getElementById('collapseAll').addEventListener('click', collapseAll);
    document.getElementById('refreshTree').addEventListener('click', refreshView);
    
    // Detail panel controls
    document.getElementById('bookmarkCurrent').addEventListener('click', bookmarkCurrent);
    document.getElementById('copyPath').addEventListener('click', copyCurrentPath);
    document.getElementById('closeDetail').addEventListener('click', closeDetail);
    
    // Diff controls
    document.getElementById('diffFile1').addEventListener('change', (e) => handleDiffFile(e, 1));
    document.getElementById('diffFile2').addEventListener('change', (e) => handleDiffFile(e, 2));
    document.getElementById('diffPaste1').addEventListener('click', () => showDiffPasteModal(1));
    document.getElementById('diffPaste2').addEventListener('click', () => showDiffPasteModal(2));
    document.getElementById('runDiff').addEventListener('click', runDiffComparison);
    
    // Modal events
    bindModalEvents();
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', showExportOptions);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Tab Management
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tabId}Tab`).classList.add('active');
    
    // Trigger specific tab logic
    if (tabId === 'stats') renderStats();
    else if (tabId === 'bookmarks') renderBookmarks();
    else if (tabId === 'history') renderHistory();
}

// Data Loading
async function loadFromDataFolder() {
    try {
        const response = await fetch('../data/data.json');
        jsonData = await response.json();
        renderJSON();
        addToHistory('Loaded from data folder', new Date().toISOString());
        renderStats();
    } catch (error) {
        console.log('No default data file found');
    }
}

function handleLoadData() {
    const source = document.getElementById('dataSource').value;
    
    switch (source) {
        case 'file':
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) loadJSONFile(file);
            };
            input.click();
            break;
            
        case 'raw':
            showModal('rawInputModal');
            break;
            
        case 'url':
            const url = prompt('Enter JSON URL:');
            if (url) loadFromURL(url);
            break;
    }
}

function handleDataSourceChange() {
    const source = document.getElementById('dataSource').value;
    const loadBtn = document.getElementById('loadBtn');
    
    switch (source) {
        case 'file':
            loadBtn.innerHTML = '<i class="fas fa-upload"></i> Load File';
            break;
        case 'raw':
            loadBtn.innerHTML = '<i class="fas fa-code"></i> Input JSON';
            break;
        case 'url':
            loadBtn.innerHTML = '<i class="fas fa-link"></i> Load URL';
            break;
    }
}

async function loadJSONFile(file) {
    try {
        const text = await file.text();
        jsonData = JSON.parse(text);
        renderJSON();
        addToHistory(`Loaded file: ${file.name}`, new Date().toISOString());
        renderStats();
        showNotification('File loaded successfully', 'success');
    } catch (error) {
        showNotification('Invalid JSON file', 'error');
    }
}

async function loadFromURL(url) {
    try {
        showLoading();
        const response = await fetch(url);
        jsonData = await response.json();
        renderJSON();
        addToHistory(`Loaded from URL: ${url}`, new Date().toISOString());
        renderStats();
        showNotification('Data loaded from URL', 'success');
    } catch (error) {
        showNotification('Failed to load from URL', 'error');
    } finally {
        hideLoading();
    }
}

// JSON Rendering
function renderJSON() {
    const viewer = document.getElementById('jsonViewer');
    viewer.innerHTML = '';
    
    if (!jsonData) {
        viewer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-file-alt"></i>
                <p>Load JSON data to begin analysis</p>
            </div>
        `;
        return;
    }
    
    const element = createJSONElement(jsonData, '', [], '');
    if (element) {
        viewer.appendChild(element);
    } else {
        viewer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>No data matches current filters</p>
                <small>Try adjusting your filter settings</small>
            </div>
        `;
    }
}

function createJSONElement(data, key, path, parentType) {
    if (!shouldShowValue(data, key, path)) {
        return null;
    }
    
    const container = document.createElement('div');
    container.className = 'json-item';
    
    if (data === null) {
        container.innerHTML = createValueHTML(key, 'null', 'json-null', path);
        return container;
    }
    
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            return createArrayElement(data, key, path);
        } else {
            return createObjectElement(data, key, path);
        }
    }
    
    // Primitive values
    const type = typeof data;
    const className = `json-${type}`;
    let displayValue = data;
    
    if (type === 'string') {
        displayValue = `"${data}"`;
    }
    
    container.innerHTML = createValueHTML(key, displayValue, className, path);
    return container;
}

function createObjectElement(obj, key, path) {
    const container = document.createElement('div');
    container.className = 'json-object';
    
    const keyElement = document.createElement('div');
    keyElement.className = 'json-key selectable';
    keyElement.innerHTML = `${key ? `"${key}": ` : ''}<span class="bracket">{</span>`;
    
    if (key) {
        keyElement.addEventListener('click', (e) => handleKeyClick(e, obj, path.join('.')));
        keyElement.addEventListener('contextmenu', (e) => handleKeyRightClick(e, obj, path.join('.')));
    }
    
    container.appendChild(keyElement);
    
    const content = document.createElement('div');
    content.className = 'json-content';
    
    const keys = Object.keys(obj);
    let visibleItems = 0;
    
    keys.forEach((objKey, index) => {
        const newPath = [...path, objKey];
        const element = createJSONElement(obj[objKey], objKey, newPath, 'object');
        if (element) {
            content.appendChild(element);
            visibleItems++;
            
            // Add comma except for last item
            if (index < keys.length - 1 && visibleItems > 0) {
                const comma = document.createElement('span');
                comma.className = 'comma';
                comma.textContent = ',';
                element.appendChild(comma);
            }
        }
    });
    
    container.appendChild(content);
    
    const closeBrace = document.createElement('span');
    closeBrace.className = 'bracket';
    closeBrace.textContent = '}';
    container.appendChild(closeBrace);
    
    // Add type info if enabled
    if (filterSettings.showTypes) {
        const typeInfo = document.createElement('span');
        typeInfo.className = 'type-info';
        typeInfo.textContent = ` (object, ${keys.length} keys)`;
        keyElement.appendChild(typeInfo);
    }
    
    return visibleItems > 0 ? container : null;
}

function createArrayElement(arr, key, path) {
    const container = document.createElement('div');
    container.className = 'json-array';
    
    const keyElement = document.createElement('div');
    keyElement.className = 'json-key selectable';
    keyElement.innerHTML = `${key ? `"${key}": ` : ''}<span class="bracket">[</span>`;
    
    if (key) {
        keyElement.addEventListener('click', (e) => handleKeyClick(e, arr, path.join('.')));
        keyElement.addEventListener('contextmenu', (e) => handleKeyRightClick(e, arr, path.join('.')));
    }
    
    container.appendChild(keyElement);
    
    const content = document.createElement('div');
    content.className = 'json-content';
    
    let visibleItems = 0;
    
    arr.forEach((item, index) => {
        const newPath = [...path, index];
        const element = createJSONElement(item, `[${index}]`, newPath, 'array');
        if (element) {
            content.appendChild(element);
            visibleItems++;
            
            // Add comma except for last item
            if (index < arr.length - 1 && visibleItems > 0) {
                const comma = document.createElement('span');
                comma.className = 'comma';
                comma.textContent = ',';
                element.appendChild(comma);
            }
        }
    });
    
    container.appendChild(content);
    
    const closeBracket = document.createElement('span');
    closeBracket.className = 'bracket';
    closeBracket.textContent = ']';
    container.appendChild(closeBracket);
    
    // Add type info if enabled
    if (filterSettings.showTypes) {
        const typeInfo = document.createElement('span');
        typeInfo.className = 'type-info';
        typeInfo.textContent = ` (array, ${arr.length} items)`;
        keyElement.appendChild(typeInfo);
    }
    
    return visibleItems > 0 ? container : null;
}

function createValueHTML(key, value, className, path) {
    const keyHTML = key ? `<span class="json-key">"${key}": </span>` : '';
    const typeInfo = filterSettings.showTypes ? ` <span class="type-info">(${className.replace('json-', '')})</span>` : '';
    
    return `${keyHTML}<span class="json-value ${className}">${value}</span>${typeInfo}`;
}

// Key Click Handlers
function handleKeyClick(e, data, path) {
    e.stopPropagation();
    
    // Remove previous selections
    document.querySelectorAll('.json-key.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to current
    e.currentTarget.classList.add('selected');
    
    // Show detail view
    showDetailView(data, path);
    
    // Toggle collapse/expand
    toggleCollapse(e.currentTarget);
    
    // Add to history
    addToHistory(`Selected: ${path}`, new Date().toISOString(), path);
}

function handleKeyRightClick(e, data, path) {
    e.preventDefault();
    showContextMenu(e, data, path);
}

function toggleCollapse(keyElement) {
    keyElement.classList.toggle('collapsed');
    const content = keyElement.nextElementSibling;
    if (content && content.classList.contains('json-content')) {
        content.style.display = keyElement.classList.contains('collapsed') ? 'none' : 'block';
    }
}

// Detail View
function showDetailView(data, path) {
    selectedPath = path;
    const detailViewer = document.getElementById('detailViewer');
    const detailTitle = document.getElementById('detailTitle');
    
    detailTitle.innerHTML = `<i class="fas fa-info-circle"></i> ${path || 'Root Object'}`;
    
    detailViewer.innerHTML = '';
    
    if (!data || typeof data !== 'object') {
        detailViewer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info"></i>
                <p>Primitive value</p>
                <small>Value: ${JSON.stringify(data)}</small>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('div');
    table.className = 'detail-table';
    
    let items = [];
    
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (shouldShowValue(item, `[${index}]`, [...path.split('.'), index])) {
                items.push({ key: `[${index}]`, value: item });
            }
        });
    } else {
        Object.entries(data)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, value]) => {
                if (shouldShowValue(value, key, [...path.split('.'), key])) {
                    items.push({ key, value });
                }
            });
    }
    
    items.forEach(({ key, value }) => {
        const item = createDetailItem(key, value);
        table.appendChild(item);
    });
    
    detailViewer.appendChild(table);
    
    // Add summary
    const summary = document.createElement('div');
    summary.style.cssText = 'margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius); font-size: 0.875rem; color: var(--text-secondary);';
    summary.innerHTML = `
        <strong>Summary:</strong> ${items.length} visible items
        ${Array.isArray(data) ? ` of ${data.length} total` : ` of ${Object.keys(data).length} total`}
    `;
    detailViewer.appendChild(summary);
}

function createDetailItem(key, value) {
    const item = document.createElement('div');
    item.className = 'detail-item';
    
    const keyDiv = document.createElement('div');
    keyDiv.className = 'detail-key';
    keyDiv.textContent = key;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'detail-value';
    
    if (value === null) {
        valueDiv.textContent = 'null';
        valueDiv.classList.add('json-null');
    } else if (typeof value === 'string') {
        valueDiv.textContent = `"${value}"`;
        valueDiv.classList.add('json-string');
    } else if (typeof value === 'number') {
        valueDiv.textContent = value;
        valueDiv.classList.add('json-number');
    } else if (typeof value === 'boolean') {
        valueDiv.textContent = value.toString();
        valueDiv.classList.add('json-boolean');
    } else if (typeof value === 'object') {
        const preview = JSON.stringify(value, null, 2);
        if (preview.length > 100) {
            valueDiv.textContent = preview.substring(0, 100) + '...';
            valueDiv.title = preview;
        } else {
            valueDiv.textContent = preview;
        }
        valueDiv.classList.add(Array.isArray(value) ? 'json-array' : 'json-object');
    }
    
    item.appendChild(keyDiv);
    item.appendChild(valueDiv);
    
    return item;
}

// Filtering and Search
function shouldShowValue(value, key, path) {
    // Empty filter
    if (filterSettings.hideEmpty && isEmptyValue(value)) {
        return false;
    }
    
    // Type filter
    const valueType = getValueType(value);
    if (!filterSettings.types.includes(valueType)) {
        return false;
    }
    
    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        let matches = false;
        
        if (filterSettings.searchKeys && key && key.toLowerCase().includes(searchTerm)) {
            matches = true;
        }
        
        if (filterSettings.searchValues && JSON.stringify(value).toLowerCase().includes(searchTerm)) {
            matches = true;
        }
        
        if (filterSettings.searchPaths && Array.isArray(path) && path.join('.').toLowerCase().includes(searchTerm)) {
            matches = true;
        }
        
        if (!matches) return false;
    }
    
    // Regex filter
    if (filterSettings.regex) {
        try {
            const regex = new RegExp(filterSettings.regex, 'i');
            const testString = `${key} ${JSON.stringify(value)}`;
            if (!regex.test(testString)) {
                return false;
            }
        } catch (e) {
            // Invalid regex, ignore
        }
    }
    
    return true;
}

function isEmptyValue(value) {
    return value === null || 
           value === '' || 
           value === false || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
}

function getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function handleSearch(e) {
    if (jsonData) {
        refreshView();
    }
}

// Statistics
function renderStats() {
    const statsGrid = document.getElementById('statsGrid');
    
    if (!jsonData) {
        statsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>Load data to view statistics</p>
            </div>
        `;
        return;
    }
    
    const stats = analyzeData(jsonData);
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <h4><i class="fas fa-key"></i> Total Keys</h4>
            <div class="value">${stats.totalKeys.toLocaleString()}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-database"></i> Data Size</h4>
            <div class="value">${formatBytes(stats.dataSize)}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-layer-group"></i> Max Depth</h4>
            <div class="value">${stats.maxDepth}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-list"></i> Arrays</h4>
            <div class="value">${stats.arrays}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-cube"></i> Objects</h4>
            <div class="value">${stats.objects}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-font"></i> Strings</h4>
            <div class="value">${stats.strings}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-hashtag"></i> Numbers</h4>
            <div class="value">${stats.numbers}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-toggle-on"></i> Booleans</h4>
            <div class="value">${stats.booleans}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-ban"></i> Null Values</h4>
            <div class="value">${stats.nulls}</div>
        </div>
        
        <div class="stat-card">
            <h4><i class="fas fa-eye-slash"></i> Empty Values</h4>
            <div class="value">${stats.empties}</div>
        </div>
    `;
}

function analyzeData(data) {
    const stats = {
        totalKeys: 0,
        dataSize: JSON.stringify(data).length,
        maxDepth: 0,
        arrays: 0,
        objects: 0,
        strings: 0,
        numbers: 0,
        booleans: 0,
        nulls: 0,
        empties: 0
    };
    
    function traverse(obj, depth = 0) {
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        
        if (obj === null) {
            stats.nulls++;
        } else if (typeof obj === 'string') {
            stats.strings++;
            if (obj === '') stats.empties++;
        } else if (typeof obj === 'number') {
            stats.numbers++;
        } else if (typeof obj === 'boolean') {
            stats.booleans++;
            if (obj === false) stats.empties++;
        } else if (Array.isArray(obj)) {
            stats.arrays++;
            if (obj.length === 0) stats.empties++;
            obj.forEach(item => traverse(item, depth + 1));
        } else if (typeof obj === 'object') {
            stats.objects++;
            const keys = Object.keys(obj);
            stats.totalKeys += keys.length;
            if (keys.length === 0) stats.empties++;
            keys.forEach(key => traverse(obj[key], depth + 1));
        }
    }
    
    traverse(data);
    return stats;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Bookmarks
function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarksList');
    
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bookmark"></i>
                <p>No bookmarks yet</p>
                <small>Right-click on any key to bookmark</small>
            </div>
        `;
        return;
    }
    
    bookmarksList.innerHTML = bookmarks.map(bookmark => `
        <div class="bookmark-item" data-path="${bookmark.path}">
            <div class="bookmark-info">
                <div class="bookmark-path">${bookmark.path}</div>
                <div class="bookmark-date">${new Date(bookmark.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="bookmark-actions">
                <button class="btn-icon" onclick="navigateToBookmark('${bookmark.path}')">
                    <i class="fas fa-external-link-alt"></i>
                </button>
                <button class="btn-icon" onclick="removeBookmark('${bookmark.path}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function bookmarkCurrent() {
    if (!selectedPath) {
        showNotification('No selection to bookmark', 'warning');
        return;
    }
    
    const existing = bookmarks.find(b => b.path === selectedPath);
    if (existing) {
        showNotification('Already bookmarked', 'info');
        return;
    }
    
    bookmarks.push({
        path: selectedPath,
        timestamp: new Date().toISOString(),
        title: selectedPath
    });
    
    localStorage.setItem('jsonViewer_bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
    showNotification('Bookmark added', 'success');
}

function removeBookmark(path) {
    bookmarks = bookmarks.filter(b => b.path !== path);
    localStorage.setItem('jsonViewer_bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
    showNotification('Bookmark removed', 'success');
}

function navigateToBookmark(path) {
    if (!jsonData) {
        showNotification('No data loaded', 'warning');
        return;
    }
    
    // Navigate to the bookmarked path
    const pathParts = path.split('.');
    let currentData = jsonData;
    
    for (const part of pathParts) {
        if (currentData && typeof currentData === 'object') {
            currentData = currentData[part];
        } else {
            showNotification('Bookmark path not found', 'error');
            return;
        }
    }
    
    showDetailView(currentData, path);
    addToHistory(`Navigated to bookmark: ${path}`, new Date().toISOString(), path);
}

// History
function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No navigation history</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.slice(-10).reverse().map(item => `
        <div class="history-item" ${item.path ? `data-path="${item.path}"` : ''}>
            <div class="history-info">
                <div class="history-action">${item.action}</div>
                <div class="history-date">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
            ${item.path ? `
                <button class="btn-icon" onclick="navigateToBookmark('${item.path}')">
                    <i class="fas fa-redo"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

function addToHistory(action, timestamp, path = null) {
    history.push({ action, timestamp, path });
    
    // Keep only last 50 items
    if (history.length > 50) {
        history = history.slice(-50);
    }
    
    localStorage.setItem('jsonViewer_history', JSON.stringify(history));
    
    // Update history tab if active
    if (document.getElementById('historyTab').classList.contains('active')) {
        renderHistory();
    }
}

// Utility Functions
function refreshView() {
    if (currentMode === 'normal') {
        renderJSON();
        if (selectedPath) {
            // Re-render detail view
            const pathParts = selectedPath.split('.');
            let currentData = jsonData;
            for (const part of pathParts) {
                currentData = currentData[part];
            }
            showDetailView(currentData, selectedPath);
        }
    }
    renderStats();
}

function expandAll() {
    document.querySelectorAll('.json-key').forEach(key => {
        key.classList.remove('collapsed');
        const content = key.nextElementSibling;
        if (content && content.classList.contains('json-content')) {
            content.style.display = 'block';
        }
    });
}

function collapseAll() {
    document.querySelectorAll('.json-key').forEach(key => {
        key.classList.add('collapsed');
        const content = key.nextElementSibling;
        if (content && content.classList.contains('json-content')) {
            content.style.display = 'none';
        }
    });
}

function closeDetail() {
    selectedPath = null;
    document.querySelectorAll('.json-key.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    const detailViewer = document.getElementById('detailViewer');
    const detailTitle = document.getElementById('detailTitle');
    
    detailTitle.innerHTML = '<i class="fas fa-info-circle"></i> Select an object';
    detailViewer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-mouse-pointer"></i>
            <p>Click on any object key to view details</p>
            <small>Use right-click for additional options</small>
        </div>
    `;
}

function copyCurrentPath() {
    if (!selectedPath) {
        showNotification('No path to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(selectedPath).then(() => {
        showNotification('Path copied to clipboard', 'success');
    });
}

// Mode Management
function switchMode(mode) {
    currentMode = mode;
    
    document.getElementById('normalMode').classList.toggle('hidden', mode !== 'normal');
    document.getElementById('diffMode').classList.toggle('hidden', mode !== 'diff');
    
    // Update button states
    document.getElementById('diffBtn').classList.toggle('active', mode === 'diff');
}

// Modal Management
function bindModalEvents() {
    // Raw input modal
    document.getElementById('validateJson').addEventListener('click', validateRawJson);
    document.getElementById('loadRawJson').addEventListener('click', loadRawJson);
    
    // Advanced search modal
    document.getElementById('applyFilters').addEventListener('click', applyAdvancedFilters);
    document.getElementById('clearFilters').addEventListener('click', clearAdvancedFilters);
    
    // Modal close events
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function validateRawJson() {
    const input = document.getElementById('rawJsonInput').value;
    try {
        JSON.parse(input);
        showNotification('Valid JSON', 'success');
    } catch (error) {
        showNotification('Invalid JSON: ' + error.message, 'error');
    }
}

function loadRawJson() {
    const input = document.getElementById('rawJsonInput').value;
    try {
        jsonData = JSON.parse(input);
        renderJSON();
        hideModal('rawInputModal');
        addToHistory('Loaded raw JSON', new Date().toISOString());
        renderStats();
        showNotification('JSON loaded successfully', 'success');
    } catch (error) {
        showNotification('Invalid JSON: ' + error.message, 'error');
    }
}

function applyAdvancedFilters() {
    // This would implement the advanced filter logic
    // For now, just close the modal
    hideModal('advancedSearchModal');
    refreshView();
}

function clearAdvancedFilters() {
    // Reset all filter settings
    filterSettings = {
        hideEmpty: true,
        showTypes: false,
        searchKeys: true,
        searchValues: true,
        searchPaths: false,
        types: ['string', 'number', 'boolean', 'object', 'array', 'null'],
        regex: null
    };
    
    saveFilterSettings();
    applyFilterSettings();
    refreshView();
    hideModal('advancedSearchModal');
    showNotification('Filters cleared', 'success');
}

function saveFilterSettings() {
    localStorage.setItem('jsonViewer_filters', JSON.stringify(filterSettings));
}

function applyFilterSettings() {
    document.getElementById('hideEmpty').checked = filterSettings.hideEmpty;
    document.getElementById('showTypes').checked = filterSettings.showTypes;
}

// Notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Loading States
function showLoading() {
    // Implementation for loading spinner
}

function hideLoading() {
    // Implementation to hide loading spinner
}

// Export Functionality
function showExportOptions() {
    const options = [
        { label: 'Export as JSON', action: () => exportAsJSON() },
        { label: 'Export Statistics', action: () => exportStats() },
        { label: 'Export Bookmarks', action: () => exportBookmarks() }
    ];
    
    // Show export menu (simplified)
    const choice = prompt('Export options:\n1. JSON\n2. Statistics\n3. Bookmarks\nEnter choice (1-3):');
    
    if (choice >= 1 && choice <= 3) {
        options[choice - 1].action();
    }
}

function exportAsJSON() {
    if (!jsonData) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exported_data.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('JSON exported successfully', 'success');
}

function exportStats() {
    if (!jsonData) {
        showNotification('No data to analyze', 'warning');
        return;
    }
    
    const stats = analyzeData(jsonData);
    const statsStr = JSON.stringify(stats, null, 2);
    const dataBlob = new Blob([statsStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data_statistics.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Statistics exported successfully', 'success');
}

function exportBookmarks() {
    if (bookmarks.length === 0) {
        showNotification('No bookmarks to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmarks.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Bookmarks exported successfully', 'success');
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'o':
                e.preventDefault();
                handleLoadData();
                break;
            case 'f':
                e.preventDefault();
                document.getElementById('searchInput').focus();
                break;
            case 'b':
                e.preventDefault();
                if (selectedPath) bookmarkCurrent();
                break;
            case 'e':
                e.preventDefault();
                showExportOptions();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        // Close modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            hideModal(modal.id);
        });
        
        // Clear selection
        if (selectedPath) closeDetail();
    }
}

// Context Menu (simplified)
function showContextMenu(e, data, path) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        padding: 0.5rem 0;
        min-width: 150px;
    `;
    
    const options = [
        { icon: 'bookmark', label: 'Bookmark', action: () => bookmarkPath(path) },
        { icon: 'copy', label: 'Copy Path', action: () => copyPath(path) },
        { icon: 'code', label: 'Copy JSON', action: () => copyJSON(data) }
    ];
    
    menu.innerHTML = options.map(option => `
        <div class="context-menu-item" onclick="${option.action.toString().match(/\w+/)[0]}('${path}')">
            <i class="fas fa-${option.icon}"></i>
            <span>${option.label}</span>
        </div>
    `).join('');
    
    document.body.appendChild(menu);
    
    // Remove on click outside
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
}

function bookmarkPath(path) {
    if (!bookmarks.find(b => b.path === path)) {
        bookmarks.push({
            path: path,
            timestamp: new Date().toISOString(),
            title: path
        });
        localStorage.setItem('jsonViewer_bookmarks', JSON.stringify(bookmarks));
        showNotification('Bookmark added', 'success');
    }
}

function copyPath(path) {
    navigator.clipboard.writeText(path);
    showNotification('Path copied', 'success');
}

function copyJSON(data) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showNotification('JSON copied', 'success');
}

// Diff functionality (basic implementation)
function handleDiffFile(e, fileNumber) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (fileNumber === 1) {
                    diffData1 = JSON.parse(event.target.result);
                } else {
                    diffData2 = JSON.parse(event.target.result);
                }
                showNotification(`File ${fileNumber} loaded for comparison`, 'success');
            } catch (error) {
                showNotification(`Invalid JSON in file ${fileNumber}`, 'error');
            }
        };
        reader.readAsText(file);
    }
}

function runDiffComparison() {
    if (!diffData1 || !diffData2) {
        showNotification('Please load both JSON files for comparison', 'warning');
        return;
    }
    
    // Render both JSONs
    const viewer1 = document.getElementById('diffViewer1');
    const viewer2 = document.getElementById('diffViewer2');
    const results = document.getElementById('diffResults');
    
    viewer1.innerHTML = JSON.stringify(diffData1, null, 2);
    viewer2.innerHTML = JSON.stringify(diffData2, null, 2);
    
    // Simple diff implementation
    const differences = findDifferences(diffData1, diffData2);
    results.innerHTML = `
        <div class="diff-summary">
            <h4>Comparison Results</h4>
            <p>Found ${differences.length} differences</p>
        </div>
        <div class="diff-list">
            ${differences.map(diff => `
                <div class="diff-item diff-${diff.type}">
                    <div class="diff-path">${diff.path}</div>
                    <div class="diff-description">${diff.description}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    showNotification('Comparison completed', 'success');
}

function findDifferences(obj1, obj2, path = '') {
    const differences = [];
    
    // Simple implementation - in a real app, you'd want a more sophisticated diff algorithm
    const keys1 = new Set(Object.keys(obj1 || {}));
    const keys2 = new Set(Object.keys(obj2 || {}));
    
    // Find added keys
    for (const key of keys2) {
        if (!keys1.has(key)) {
            differences.push({
                type: 'added',
                path: path ? `${path}.${key}` : key,
                description: `Key "${key}" was added`
            });
        }
    }
    
    // Find removed keys
    for (const key of keys1) {
        if (!keys2.has(key)) {
            differences.push({
                type: 'removed',
                path: path ? `${path}.${key}` : key,
                description: `Key "${key}" was removed`
            });
        }
    }
    
    // Find modified values
    for (const key of keys1) {
        if (keys2.has(key)) {
            const val1 = obj1[key];
            const val2 = obj2[key];
            
            if (typeof val1 === 'object' && typeof val2 === 'object') {
                differences.push(...findDifferences(val1, val2, path ? `${path}.${key}` : key));
            } else if (val1 !== val2) {
                differences.push({
                    type: 'modified',
                    path: path ? `${path}.${key}` : key,
                    description: `Value changed from "${val1}" to "${val2}"`
                });
            }
        }
    }
    
    return differences;
}