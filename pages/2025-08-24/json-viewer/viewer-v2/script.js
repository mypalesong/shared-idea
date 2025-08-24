// Global State Management
class DataManager {
    constructor() {
        this.rawData = null;
        this.currentData = null;
        this.schema = null;
        this.currentView = 'table';
        this.filters = [];
        this.sortConfig = null;
        this.pagination = {
            page: 1,
            pageSize: 50,
            total: 0
        };
        this.charts = new Map();
        this.compareData = { first: null, second: null };
    }

    setData(data) {
        this.rawData = data;
        this.currentData = data;
        this.schema = this.analyzeSchema(data);
        this.pagination.total = this.getRowCount();
        this.updateStats();
    }

    analyzeSchema(data, path = '') {
        const schema = {
            type: this.getDataType(data),
            path: path,
            nullable: false,
            children: {}
        };

        if (Array.isArray(data)) {
            schema.length = data.length;
            if (data.length > 0) {
                // Analyze first few items to determine structure
                const sample = data.slice(0, Math.min(5, data.length));
                const childSchema = {};
                
                sample.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        Object.keys(item).forEach(key => {
                            if (!childSchema[key]) {
                                childSchema[key] = this.analyzeSchema(item[key], `${path}[].${key}`);
                            }
                        });
                    }
                });
                
                schema.children = childSchema;
            }
        } else if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => {
                const childPath = path ? `${path}.${key}` : key;
                schema.children[key] = this.analyzeSchema(data[key], childPath);
            });
        }

        return schema;
    }

    getDataType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        return typeof value;
    }

    getRowCount() {
        if (Array.isArray(this.currentData)) {
            return this.currentData.length;
        }
        if (typeof this.currentData === 'object' && this.currentData !== null) {
            return Object.keys(this.currentData).length;
        }
        return 0;
    }

    updateStats() {
        const stats = {
            totalRows: this.getRowCount(),
            totalColumns: this.getColumnCount(),
            dataSize: JSON.stringify(this.rawData).length
        };

        document.getElementById('totalRows').textContent = stats.totalRows.toLocaleString();
        document.getElementById('totalColumns').textContent = stats.totalColumns;
        document.getElementById('dataSize').textContent = this.formatBytes(stats.dataSize);
    }

    getColumnCount() {
        if (Array.isArray(this.currentData) && this.currentData.length > 0) {
            const firstItem = this.currentData[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                return Object.keys(firstItem).length;
            }
        }
        if (typeof this.currentData === 'object' && this.currentData !== null) {
            return Object.keys(this.currentData).length;
        }
        return 0;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    applyFilters() {
        let filtered = this.rawData;
        
        this.filters.forEach(filter => {
            filtered = this.filterData(filtered, filter);
        });
        
        if (this.sortConfig) {
            filtered = this.sortData(filtered, this.sortConfig);
        }
        
        this.currentData = filtered;
        this.pagination.total = this.getRowCount();
        this.pagination.page = 1;
    }

    filterData(data, filter) {
        // Implement filtering logic based on filter configuration
        return data;
    }

    sortData(data, sortConfig) {
        // Implement sorting logic
        return data;
    }

    getTableData(page = 1, pageSize = 50) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        
        if (Array.isArray(this.currentData)) {
            return this.currentData.slice(start, end);
        }
        
        const entries = Object.entries(this.currentData);
        return entries.slice(start, end).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    }
}

// Global instances
const dataManager = new DataManager();
let currentChart = null;

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeApplication();
    bindEventListeners();
    loadDefaultData();
});

function initializeApplication() {
    // Initialize view switching
    setupViewSwitching();
    
    // Initialize modals
    setupModals();
    
    // Initialize pagination
    setupPagination();
    
    // Initialize chart system
    setupChartSystem();
}

function bindEventListeners() {
    // Data loading
    document.getElementById('loadDataBtn').addEventListener('click', handleDataLoad);
    document.getElementById('dataSourceType').addEventListener('change', updateLoadButton);
    
    // Comparison
    document.getElementById('compareBtn').addEventListener('click', () => showComparison());
    document.getElementById('closeComparison').addEventListener('click', () => hideComparison());
    document.getElementById('runComparison').addEventListener('click', runDataComparison);
    
    // View switching
    document.getElementById('tableViewBtn').addEventListener('click', () => switchView('table'));
    document.getElementById('chartViewBtn').addEventListener('click', () => switchView('chart'));
    document.getElementById('rawViewBtn').addEventListener('click', () => switchView('raw'));
    
    // Search and filters
    document.getElementById('globalSearch').addEventListener('input', handleGlobalSearch);
    document.getElementById('advancedFilter').addEventListener('click', () => showModal('filterModal'));
    document.getElementById('hideEmptyValues').addEventListener('change', handleHideEmpty);
    
    // Table controls
    document.getElementById('addColumn').addEventListener('click', addCalculatedColumn);
    document.getElementById('sortData').addEventListener('click', showSortDialog);
    document.getElementById('filterData').addEventListener('click', () => showModal('filterModal'));
    
    // Chart controls
    document.getElementById('generateChart').addEventListener('click', generateChart);
    document.getElementById('addChartTab').addEventListener('click', addChartTab);
    
    // Raw editor
    document.getElementById('formatJson').addEventListener('click', formatRawJson);
    document.getElementById('minifyJson').addEventListener('click', minifyRawJson);
    document.getElementById('validateJson').addEventListener('click', validateRawJson);
    document.getElementById('copyRaw').addEventListener('click', copyRawData);
    document.getElementById('saveRaw').addEventListener('click', saveRawData);
    
    // Export
    document.getElementById('exportData').addEventListener('click', showExportOptions);
    
    // Schema tree
    document.getElementById('refreshSchema').addEventListener('click', refreshSchema);
    
    // Modal actions
    document.getElementById('executeQuery').addEventListener('click', executeQuery);
    document.getElementById('applyFilters').addEventListener('click', applyAdvancedFilters);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
}

// Data Loading Functions
async function loadDefaultData() {
    try {
        const response = await fetch('../data/data.json');
        const data = await response.json();
        dataManager.setData(data);
        renderCurrentView();
        showNotification('Default data loaded successfully', 'success');
    } catch (error) {
        console.log('No default data available');
    }
}

function handleDataLoad() {
    const sourceType = document.getElementById('dataSourceType').value;
    
    switch (sourceType) {
        case 'file':
            loadFromFile();
            break;
        case 'raw':
            showRawInputDialog();
            break;
        case 'url':
            loadFromURL();
            break;
        case 'sample':
            loadSampleData();
            break;
    }
}

function loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                dataManager.setData(data);
                renderCurrentView();
                showNotification('File loaded successfully', 'success');
            } catch (error) {
                showNotification('Invalid JSON file', 'error');
            }
        }
    };
    input.click();
}

function showRawInputDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-code"></i> Raw JSON Input</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea id="rawInput" style="width: 100%; height: 300px; font-family: monospace;" placeholder="Paste your JSON here..."></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="loadRawInput()">Load Data</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function loadRawInput() {
    const input = document.getElementById('rawInput').value;
    try {
        const data = JSON.parse(input);
        dataManager.setData(data);
        renderCurrentView();
        document.querySelector('.modal').remove();
        showNotification('Raw JSON loaded successfully', 'success');
    } catch (error) {
        showNotification('Invalid JSON format', 'error');
    }
}

function loadFromURL() {
    const url = prompt('Enter JSON URL:');
    if (url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                dataManager.setData(data);
                renderCurrentView();
                showNotification('Data loaded from URL', 'success');
            })
            .catch(error => {
                showNotification('Failed to load from URL', 'error');
            });
    }
}

function loadSampleData() {
    const sampleData = generateSampleData();
    dataManager.setData(sampleData);
    renderCurrentView();
    showNotification('Sample data loaded', 'success');
}

function generateSampleData() {
    const data = [];
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    const statuses = ['active', 'inactive', 'pending'];
    
    for (let i = 1; i <= 100; i++) {
        data.push({
            id: i,
            name: `Product ${i}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            price: Math.round(Math.random() * 1000 * 100) / 100,
            quantity: Math.floor(Math.random() * 100),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            active: Math.random() > 0.3,
            tags: Math.random() > 0.5 ? ['featured', 'popular'] : [],
            metadata: {
                views: Math.floor(Math.random() * 1000),
                rating: Math.round(Math.random() * 5 * 10) / 10
            }
        });
    }
    
    return data;
}

function updateLoadButton() {
    const sourceType = document.getElementById('dataSourceType').value;
    const button = document.getElementById('loadDataBtn');
    
    const labels = {
        file: '<i class="fas fa-upload"></i> Load File',
        raw: '<i class="fas fa-code"></i> Input JSON',
        url: '<i class="fas fa-link"></i> Load URL',
        sample: '<i class="fas fa-database"></i> Generate Sample'
    };
    
    button.innerHTML = labels[sourceType];
}

// View Management
function setupViewSwitching() {
    const viewButtons = document.querySelectorAll('[data-view]');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    // Update active button
    document.querySelectorAll('#tableViewBtn, #chartViewBtn, #rawViewBtn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${viewName}ViewBtn`).classList.add('active');
    
    // Update active panel
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${viewName}View`).classList.add('active');
    
    dataManager.currentView = viewName;
    renderCurrentView();
}

function renderCurrentView() {
    switch (dataManager.currentView) {
        case 'table':
            renderTableView();
            break;
        case 'chart':
            renderChartView();
            break;
        case 'raw':
            renderRawView();
            break;
    }
    
    renderSchema();
}

// Table View Rendering
function renderTableView() {
    if (!dataManager.currentData) {
        showTableEmptyState();
        return;
    }
    
    const tableContainer = document.getElementById('dataTable');
    const data = dataManager.getTableData(dataManager.pagination.page, dataManager.pagination.pageSize);
    
    if (Array.isArray(data) && data.length > 0) {
        renderDataTable(data);
    } else if (typeof data === 'object' && data !== null) {
        renderObjectTable(data);
    } else {
        showTableEmptyState();
    }
    
    updatePagination();
    updateTableInfo();
}

function renderDataTable(data) {
    const table = document.getElementById('dataTable');
    
    // Get all unique keys for columns
    const columns = new Set();
    data.forEach(row => {
        if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(key => columns.add(key));
        }
    });
    
    const columnArray = Array.from(columns);
    
    let html = '<table class="data-table"><thead><tr>';
    
    // Add row number column
    html += '<th style="width: 60px;">#</th>';
    
    columnArray.forEach(col => {
        html += `<th>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${col}
                <button class="btn-icon" style="opacity: 0.5;" onclick="sortByColumn('${col}')">
                    <i class="fas fa-sort"></i>
                </button>
            </div>
        </th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    data.forEach((row, index) => {
        const globalIndex = (dataManager.pagination.page - 1) * dataManager.pagination.pageSize + index + 1;
        html += `<tr>`;
        html += `<td style="color: var(--text-muted); font-weight: 500;">${globalIndex}</td>`;
        
        columnArray.forEach(col => {
            const value = row[col];
            html += `<td title="${escapeHtml(JSON.stringify(value))}">${formatCellValue(value)}</td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    table.innerHTML = html;
}

function renderObjectTable(data) {
    const table = document.getElementById('dataTable');
    const entries = Object.entries(data);
    
    let html = '<table class="data-table"><thead><tr>';
    html += '<th style="width: 60px;">#</th>';
    html += '<th>Key</th>';
    html += '<th>Value</th>';
    html += '<th>Type</th>';
    html += '</tr></thead><tbody>';
    
    entries.forEach(([key, value], index) => {
        const globalIndex = (dataManager.pagination.page - 1) * dataManager.pagination.pageSize + index + 1;
        html += `<tr>`;
        html += `<td style="color: var(--text-muted); font-weight: 500;">${globalIndex}</td>`;
        html += `<td style="font-weight: 600; color: var(--primary);">${key}</td>`;
        html += `<td title="${escapeHtml(JSON.stringify(value))}">${formatCellValue(value)}</td>`;
        html += `<td><span class="type-badge type-${dataManager.getDataType(value)}">${dataManager.getDataType(value)}</span></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    table.innerHTML = html;
}

function formatCellValue(value) {
    if (value === null) {
        return '<span style="color: var(--text-muted); font-style: italic;">null</span>';
    }
    
    if (typeof value === 'boolean') {
        const color = value ? 'var(--success)' : 'var(--danger)';
        return `<span style="color: ${color}; font-weight: 500;">${value}</span>`;
    }
    
    if (typeof value === 'number') {
        return `<span style="color: var(--info); font-weight: 500;">${value.toLocaleString()}</span>`;
    }
    
    if (typeof value === 'string') {
        if (value.length > 50) {
            return escapeHtml(value.substring(0, 47)) + '...';
        }
        return escapeHtml(value);
    }
    
    if (Array.isArray(value)) {
        return `<span style="color: var(--accent);">[${value.length} items]</span>`;
    }
    
    if (typeof value === 'object') {
        const keyCount = Object.keys(value).length;
        return `<span style="color: var(--warning);">{${keyCount} keys}</span>`;
    }
    
    return escapeHtml(String(value));
}

function showTableEmptyState() {
    document.getElementById('dataTable').innerHTML = `
        <div class="table-empty-state">
            <i class="fas fa-table"></i>
            <h3>No Data Available</h3>
            <p>Load JSON data to view in table format</p>
        </div>
    `;
}

function updateTableInfo() {
    const title = document.getElementById('tableTitle');
    const description = document.getElementById('tableDescription');
    
    if (dataManager.currentData) {
        title.textContent = 'Data Table';
        description.textContent = `${dataManager.getRowCount()} rows, ${dataManager.getColumnCount()} columns`;
    } else {
        title.textContent = 'No Data';
        description.textContent = 'Select data to view';
    }
}

// Schema Rendering
function renderSchema() {
    const schemaTree = document.getElementById('schemaTree');
    
    if (!dataManager.schema) {
        schemaTree.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <p>Load data to explore schema</p>
            </div>
        `;
        return;
    }
    
    schemaTree.innerHTML = renderSchemaNode(dataManager.schema, '');
    renderSchemaStats();
}

function renderSchemaNode(node, path, depth = 0) {
    const indent = '  '.repeat(depth);
    let html = '';
    
    const hasChildren = Object.keys(node.children || {}).length > 0;
    const expandIcon = hasChildren ? 'fa-chevron-down' : 'fa-circle';
    
    html += `<div class="schema-node" style="margin-left: ${depth * 1.5}rem;">`;
    html += `<div class="schema-item" onclick="selectSchemaPath('${path}')" title="Click to view as table">`;
    html += `<i class="fas ${expandIcon} schema-icon"></i>`;
    html += `<span class="schema-key">${path.split('.').pop() || 'root'}</span>`;
    html += `<span class="schema-type type-${node.type}">${node.type}</span>`;
    
    if (node.type === 'array' && node.length !== undefined) {
        html += `<span class="schema-info">[${node.length}]</span>`;
    } else if (node.type === 'object') {
        const keyCount = Object.keys(node.children || {}).length;
        html += `<span class="schema-info">{${keyCount}}</span>`;
    }
    
    html += `</div>`;
    
    if (hasChildren) {
        html += `<div class="schema-children">`;
        Object.entries(node.children).forEach(([key, childNode]) => {
            const childPath = path ? `${path}.${key}` : key;
            html += renderSchemaNode(childNode, childPath, depth + 1);
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    
    return html;
}

function renderSchemaStats() {
    const stats = document.getElementById('schemaStats');
    
    if (!dataManager.schema) {
        stats.innerHTML = '';
        return;
    }
    
    const analysis = analyzeSchemaStats(dataManager.schema);
    
    stats.innerHTML = `
        <div class="schema-stat">
            <span class="stat-label">Depth</span>
            <span class="stat-value">${analysis.maxDepth}</span>
        </div>
        <div class="schema-stat">
            <span class="stat-label">Arrays</span>
            <span class="stat-value">${analysis.arrayCount}</span>
        </div>
        <div class="schema-stat">
            <span class="stat-label">Objects</span>
            <span class="stat-value">${analysis.objectCount}</span>
        </div>
        <div class="schema-stat">
            <span class="stat-label">Primitives</span>
            <span class="stat-value">${analysis.primitiveCount}</span>
        </div>
    `;
}

function analyzeSchemaStats(schema, depth = 0) {
    let stats = {
        maxDepth: depth,
        arrayCount: 0,
        objectCount: 0,
        primitiveCount: 0
    };
    
    if (schema.type === 'array') {
        stats.arrayCount = 1;
    } else if (schema.type === 'object') {
        stats.objectCount = 1;
    } else {
        stats.primitiveCount = 1;
    }
    
    Object.values(schema.children || {}).forEach(child => {
        const childStats = analyzeSchemaStats(child, depth + 1);
        stats.maxDepth = Math.max(stats.maxDepth, childStats.maxDepth);
        stats.arrayCount += childStats.arrayCount;
        stats.objectCount += childStats.objectCount;
        stats.primitiveCount += childStats.primitiveCount;
    });
    
    return stats;
}

function selectSchemaPath(path) {
    let data = dataManager.rawData;
    
    if (path) {
        const pathParts = path.split('.');
        for (const part of pathParts) {
            if (data && typeof data === 'object') {
                data = data[part];
            } else {
                showNotification('Invalid path selected', 'error');
                return;
            }
        }
    }
    
    // Update current data to selected path
    dataManager.currentData = data;
    dataManager.pagination.total = dataManager.getRowCount();
    dataManager.pagination.page = 1;
    
    if (dataManager.currentView === 'table') {
        renderTableView();
    }
    
    showNotification(`Selected: ${path || 'root'}`, 'info');
}

// Chart Rendering
function renderChartView() {
    updateChartControls();
}

function updateChartControls() {
    if (!dataManager.currentData) return;
    
    const xAxis = document.getElementById('xAxis');
    const yAxis = document.getElementById('yAxis');
    
    // Clear existing options
    xAxis.innerHTML = '<option value="">Select field...</option>';
    yAxis.innerHTML = '<option value="">Select field...</option>';
    
    // Get available fields
    const fields = getAvailableFields(dataManager.currentData);
    
    fields.forEach(field => {
        xAxis.innerHTML += `<option value="${field.path}">${field.name} (${field.type})</option>`;
        yAxis.innerHTML += `<option value="${field.path}">${field.name} (${field.type})</option>`;
    });
}

function getAvailableFields(data) {
    const fields = [];
    
    if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        if (typeof sample === 'object' && sample !== null) {
            Object.keys(sample).forEach(key => {
                const value = sample[key];
                fields.push({
                    name: key,
                    path: key,
                    type: dataManager.getDataType(value)
                });
            });
        }
    }
    
    return fields;
}

function generateChart() {
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    const aggregation = document.getElementById('aggregation').value;
    
    if (!xAxis) {
        showNotification('Please select X-axis field', 'warning');
        return;
    }
    
    const chartData = prepareChartData(chartType, xAxis, yAxis, aggregation);
    renderChart(chartType, chartData);
}

function prepareChartData(chartType, xAxis, yAxis, aggregation) {
    if (!Array.isArray(dataManager.currentData)) {
        return null;
    }
    
    const data = dataManager.currentData;
    
    if (!yAxis) {
        // Count aggregation for single field
        const counts = {};
        data.forEach(row => {
            const value = row[xAxis];
            const key = String(value);
            counts[key] = (counts[key] || 0) + 1;
        });
        
        return {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Count',
                data: Object.values(counts),
                backgroundColor: generateColors(Object.keys(counts).length)
            }]
        };
    }
    
    // Two field aggregation
    const groups = {};
    data.forEach(row => {
        const xValue = String(row[xAxis]);
        const yValue = row[yAxis];
        
        if (!groups[xValue]) {
            groups[xValue] = [];
        }
        groups[xValue].push(yValue);
    });
    
    const result = {};
    Object.entries(groups).forEach(([key, values]) => {
        switch (aggregation) {
            case 'count':
                result[key] = values.length;
                break;
            case 'sum':
                result[key] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
                break;
            case 'avg':
                const sum = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
                result[key] = sum / values.length;
                break;
            case 'min':
                result[key] = Math.min(...values.map(v => Number(v) || 0));
                break;
            case 'max':
                result[key] = Math.max(...values.map(v => Number(v) || 0));
                break;
        }
    });
    
    return {
        labels: Object.keys(result),
        datasets: [{
            label: `${aggregation} of ${yAxis}`,
            data: Object.values(result),
            backgroundColor: generateColors(Object.keys(result).length)
        }]
    };
}

function renderChart(chartType, chartData) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Hide empty state
    document.querySelector('.chart-overlay').style.display = 'none';
    
    currentChart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Data Visualization'
                },
                legend: {
                    position: chartType === 'pie' || chartType === 'doughnut' ? 'right' : 'top'
                }
            },
            scales: chartType !== 'pie' && chartType !== 'doughnut' ? {
                y: {
                    beginAtZero: true
                }
            } : {}
        }
    });
    
    updateChartInsights(chartData);
}

function generateColors(count) {
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

function updateChartInsights(chartData) {
    const insights = document.getElementById('chartInsights');
    
    if (!chartData || !chartData.datasets[0]) {
        insights.innerHTML = '';
        return;
    }
    
    const data = chartData.datasets[0].data;
    const labels = chartData.labels;
    
    const total = data.reduce((sum, val) => sum + val, 0);
    const avg = total / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const maxIndex = data.indexOf(max);
    const minIndex = data.indexOf(min);
    
    insights.innerHTML = `
        <h4><i class="fas fa-lightbulb"></i> Chart Insights</h4>
        <div class="insights-grid">
            <div class="insight-item">
                <span class="insight-label">Total:</span>
                <span class="insight-value">${total.toLocaleString()}</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Average:</span>
                <span class="insight-value">${avg.toFixed(2)}</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Highest:</span>
                <span class="insight-value">${labels[maxIndex]} (${max})</span>
            </div>
            <div class="insight-item">
                <span class="insight-label">Lowest:</span>
                <span class="insight-value">${labels[minIndex]} (${min})</span>
            </div>
        </div>
    `;
}

// Raw View
function renderRawView() {
    const editor = document.getElementById('rawJsonEditor');
    
    if (dataManager.rawData) {
        editor.value = JSON.stringify(dataManager.rawData, null, 2);
    } else {
        editor.value = '';
    }
    
    updateRawViewStatus();
}

function updateRawViewStatus() {
    const editor = document.getElementById('rawJsonEditor');
    const content = editor.value;
    
    document.getElementById('jsonStatus').textContent = 'Valid JSON';
    document.getElementById('jsonSize').textContent = `${content.length} bytes`;
    document.getElementById('jsonLines').textContent = `${content.split('\n').length} lines`;
}

function formatRawJson() {
    const editor = document.getElementById('rawJsonEditor');
    try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed, null, 2);
        updateRawViewStatus();
        showNotification('JSON formatted', 'success');
    } catch (error) {
        showNotification('Invalid JSON', 'error');
    }
}

function minifyRawJson() {
    const editor = document.getElementById('rawJsonEditor');
    try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed);
        updateRawViewStatus();
        showNotification('JSON minified', 'success');
    } catch (error) {
        showNotification('Invalid JSON', 'error');
    }
}

function validateRawJson() {
    const editor = document.getElementById('rawJsonEditor');
    try {
        JSON.parse(editor.value);
        showNotification('JSON is valid', 'success');
    } catch (error) {
        showNotification(`Invalid JSON: ${error.message}`, 'error');
    }
}

function copyRawData() {
    const editor = document.getElementById('rawJsonEditor');
    navigator.clipboard.writeText(editor.value).then(() => {
        showNotification('JSON copied to clipboard', 'success');
    });
}

function saveRawData() {
    const editor = document.getElementById('rawJsonEditor');
    const blob = new Blob([editor.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('JSON file saved', 'success');
}

// Pagination
function setupPagination() {
    document.getElementById('prevPage').addEventListener('click', () => {
        if (dataManager.pagination.page > 1) {
            dataManager.pagination.page--;
            renderCurrentView();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(dataManager.pagination.total / dataManager.pagination.pageSize);
        if (dataManager.pagination.page < totalPages) {
            dataManager.pagination.page++;
            renderCurrentView();
        }
    });
}

function updatePagination() {
    const currentPage = dataManager.pagination.page;
    const pageSize = dataManager.pagination.pageSize;
    const total = dataManager.pagination.total;
    const totalPages = Math.ceil(total / pageSize);
    
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('rowStart').textContent = start;
    document.getElementById('rowEnd').textContent = end;
    document.getElementById('rowTotal').textContent = total;
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Comparison Mode
function showComparison() {
    document.getElementById('comparisonMode').classList.remove('hidden');
}

function hideComparison() {
    document.getElementById('comparisonMode').classList.add('hidden');
}

function runDataComparison() {
    // Implementation for data comparison
    showNotification('Comparison feature coming soon', 'info');
}

// Utility Functions
function setupModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('show');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
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

function setupChartSystem() {
    // Initialize Chart.js defaults
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.color = '#6b7280';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type];
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event Handlers (Placeholder implementations)
function handleGlobalSearch() {
    // Implementation for global search
}

function handleHideEmpty() {
    // Implementation for hiding empty values
}

function sortByColumn(column) {
    // Implementation for column sorting
}

function addCalculatedColumn() {
    showNotification('Add column feature coming soon', 'info');
}

function showSortDialog() {
    showNotification('Sort dialog feature coming soon', 'info');
}

function addChartTab() {
    showNotification('Multiple charts feature coming soon', 'info');
}

function showExportOptions() {
    showNotification('Export feature coming soon', 'info');
}

function refreshSchema() {
    renderSchema();
    showNotification('Schema refreshed', 'success');
}

function executeQuery() {
    showNotification('SQL query feature coming soon', 'info');
}

function applyAdvancedFilters() {
    hideModal('filterModal');
    showNotification('Advanced filters applied', 'success');
}

function clearAllFilters() {
    dataManager.filters = [];
    dataManager.applyFilters();
    renderCurrentView();
    hideModal('filterModal');
    showNotification('All filters cleared', 'success');
}

function applyTemplate(templateName) {
    showNotification(`Applied ${templateName} template`, 'success');
}

function insertQuery(query) {
    document.getElementById('sqlQuery').value = query;
}

// Add some CSS for notifications
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
    
    .schema-node {
        margin: 0.25rem 0;
    }
    
    .schema-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.15s;
    }
    
    .schema-item:hover {
        background: var(--bg-tertiary);
    }
    
    .schema-icon {
        width: 12px;
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .schema-key {
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .schema-type {
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.6875rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .type-string { background: #dbeafe; color: #1d4ed8; }
    .type-number { background: #dcfce7; color: #166534; }
    .type-boolean { background: #fef3c7; color: #92400e; }
    .type-array { background: #f3e8ff; color: #7c3aed; }
    .type-object { background: #fce7f3; color: #be185d; }
    .type-null { background: #f3f4f6; color: #6b7280; }
    
    .schema-info {
        color: var(--text-muted);
        font-size: 0.75rem;
    }
    
    .schema-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border-light);
    }
    
    .schema-stat:last-child {
        border-bottom: none;
    }
    
    .stat-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
    }
    
    .stat-value {
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .insights-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 0.75rem;
    }
    
    .insight-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .insight-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-weight: 500;
    }
    
    .insight-value {
        font-weight: 600;
        color: var(--text-primary);
    }
`;
document.head.appendChild(style);