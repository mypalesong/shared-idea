let jsonData = null;
let filterEmptyEnabled = true;
let selectedPath = null;

document.addEventListener('DOMContentLoaded', () => {
    const loadBtn = document.getElementById('loadBtn');
    const filterCheckbox = document.getElementById('filterEmpty');
    const searchInput = document.getElementById('searchInput');
    const expandAllBtn = document.getElementById('expandAll');
    const collapseAllBtn = document.getElementById('collapseAll');
    const closeDetailBtn = document.getElementById('closeDetail');
    
    loadBtn.addEventListener('click', loadJSON);
    filterCheckbox.addEventListener('change', (e) => {
        filterEmptyEnabled = e.target.checked;
        if (jsonData) {
            renderJSON(jsonData);
            // Re-render detail view if something is selected
            if (selectedPath) {
                const pathParts = selectedPath.split('.');
                let currentData = jsonData;
                for (const part of pathParts) {
                    currentData = currentData[part];
                }
                showDetailView(currentData, selectedPath);
            }
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        if (jsonData) {
            renderJSON(jsonData, e.target.value.toLowerCase());
        }
    });
    
    expandAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.json-key').forEach(key => {
            key.classList.remove('collapsed');
            const sibling = key.nextElementSibling;
            if (sibling && (sibling.classList.contains('json-object') || sibling.classList.contains('json-array'))) {
                sibling.classList.remove('collapsed');
            }
        });
    });
    
    collapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.json-key').forEach(key => {
            key.classList.add('collapsed');
            const sibling = key.nextElementSibling;
            if (sibling && (sibling.classList.contains('json-object') || sibling.classList.contains('json-array'))) {
                sibling.classList.add('collapsed');
            }
        });
    });
    
    closeDetailBtn.addEventListener('click', () => {
        clearDetailView();
        selectedPath = null;
        document.querySelectorAll('.json-key.selected').forEach(el => {
            el.classList.remove('selected');
        });
    });
    
    // Auto-load on page load
    loadJSON();
});

async function loadJSON() {
    try {
        const response = await fetch('data/data.json');
        jsonData = await response.json();
        renderJSON(jsonData);
        updateStats(jsonData);
    } catch (error) {
        document.getElementById('jsonViewer').innerHTML = `
            <div style="color: red; padding: 20px;">
                Error loading JSON: ${error.message}
            </div>
        `;
    }
}

function updateStats(data) {
    const stats = document.getElementById('stats');
    const totalKeys = countKeys(data);
    const emptyValues = countEmptyValues(data);
    
    stats.innerHTML = `
        <strong>Statistics:</strong> 
        Total keys: ${totalKeys} | 
        Empty values: ${emptyValues} | 
        Data size: ${JSON.stringify(data).length.toLocaleString()} bytes
    `;
}

function countKeys(obj) {
    let count = 0;
    
    function traverse(o) {
        if (o && typeof o === 'object') {
            if (Array.isArray(o)) {
                o.forEach(item => traverse(item));
            } else {
                Object.keys(o).forEach(key => {
                    count++;
                    traverse(o[key]);
                });
            }
        }
    }
    
    traverse(obj);
    return count;
}

function countEmptyValues(obj) {
    let count = 0;
    
    function traverse(o) {
        if (o === null || o === "" || o === false || 
            (Array.isArray(o) && o.length === 0)) {
            count++;
        } else if (o && typeof o === 'object') {
            if (Array.isArray(o)) {
                o.forEach(item => traverse(item));
            } else {
                Object.values(o).forEach(value => traverse(value));
            }
        }
    }
    
    traverse(obj);
    return count;
}

function renderJSON(data, searchTerm = '') {
    const viewer = document.getElementById('jsonViewer');
    viewer.innerHTML = '';
    
    const element = createJSONElement(data, '', searchTerm, []);
    if (element) {
        viewer.appendChild(element);
    } else {
        viewer.innerHTML = '<div style="color: #999;">No data to display (all values filtered)</div>';
    }
}

function isEmptyValue(value) {
    return value === null || 
           value === "" || 
           value === false || 
           (Array.isArray(value) && value.length === 0);
}

function shouldShowValue(value, key, searchTerm) {
    // Check empty filter
    if (filterEmptyEnabled && isEmptyValue(value)) {
        return false;
    }
    
    // Check search term
    if (searchTerm) {
        const keyMatch = key.toLowerCase().includes(searchTerm);
        const valueMatch = JSON.stringify(value).toLowerCase().includes(searchTerm);
        
        if (!keyMatch && !valueMatch) {
            return false;
        }
    }
    
    return true;
}

function showDetailView(data, path) {
    selectedPath = path;
    const detailViewer = document.getElementById('detailViewer');
    const detailTitle = document.getElementById('detailTitle');
    
    // Update title
    detailTitle.textContent = path || 'Root Object';
    
    // Clear previous content
    detailViewer.innerHTML = '';
    
    if (!data || typeof data !== 'object') {
        detailViewer.innerHTML = '<div class="empty-state">Not an object or array</div>';
        return;
    }
    
    // Create table view
    const table = document.createElement('div');
    table.className = 'detail-table';
    
    // Analyze data to determine best layout
    let items = [];
    let hasLongValues = false;
    let totalItems = 0;
    
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (!filterEmptyEnabled || !isEmptyValue(item)) {
                items.push({key: `[${index}]`, value: item});
                totalItems++;
                if (typeof item === 'object' && item !== null) {
                    hasLongValues = true;
                }
            }
        });
    } else {
        Object.entries(data).forEach(([key, value]) => {
            if (!filterEmptyEnabled || !isEmptyValue(value)) {
                items.push({key, value});
                totalItems++;
                if (typeof value === 'object' && value !== null) {
                    hasLongValues = true;
                }
            }
        });
        
        // Sort items by key name
        items.sort((a, b) => a.key.localeCompare(b.key));
    }
    
    // Always use 3-column grid layout
    
    // Add items to table
    items.forEach(({key, value}) => {
        // Apply filter for detail view as well
        if (!filterEmptyEnabled || !isEmptyValue(value)) {
            const itemDiv = createDetailItem(key, value, totalItems > 20);
            if (itemDiv) table.appendChild(itemDiv);
        }
    });
    
    // Add summary info
    const summary = document.createElement('div');
    summary.style.cssText = 'padding: 10px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 10px;';
    summary.textContent = `Total items: ${totalItems}`;
    
    detailViewer.appendChild(table);
    detailViewer.appendChild(summary);
}

function createDetailItem(key, value, isCompact = false) {
    // Apply filter
    if (filterEmptyEnabled && isEmptyValue(value)) {
        return null;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'detail-item';
    
    if (isCompact) {
        itemDiv.classList.add('compact');
    }
    
    const keyDiv = document.createElement('div');
    keyDiv.className = 'detail-key';
    keyDiv.textContent = key;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'detail-value';
    
    if (value === null) {
        valueDiv.textContent = 'null';
        valueDiv.classList.add('null');
    } else if (typeof value === 'string') {
        const displayValue = `"${value}"`;
        valueDiv.textContent = displayValue;
        valueDiv.classList.add('string');
        
        // Truncate long strings in compact mode
        if (isCompact && displayValue.length > 50) {
            valueDiv.classList.add('truncated');
            valueDiv.title = displayValue; // Show full value on hover
        }
    } else if (typeof value === 'number') {
        valueDiv.textContent = value;
        valueDiv.classList.add('number');
    } else if (typeof value === 'boolean') {
        valueDiv.textContent = value.toString();
        valueDiv.classList.add('boolean');
    } else if (Array.isArray(value)) {
        const jsonString = JSON.stringify(value, null, 2);
        
        if (isCompact && jsonString.length > 100) {
            // Show array length and preview for compact mode
            valueDiv.textContent = `[${value.length} items] ${JSON.stringify(value).substring(0, 60)}...`;
            valueDiv.classList.add('truncated');
            valueDiv.title = jsonString;
        } else {
            valueDiv.textContent = jsonString;
        }
        valueDiv.classList.add('array');
    } else if (typeof value === 'object') {
        const jsonString = JSON.stringify(value, null, 2);
        const keyCount = Object.keys(value).length;
        
        if (isCompact && jsonString.length > 100) {
            // Show key count and preview for compact mode
            valueDiv.textContent = `{${keyCount} keys} ${JSON.stringify(value).substring(0, 60)}...`;
            valueDiv.classList.add('truncated');
            valueDiv.title = jsonString;
        } else {
            valueDiv.textContent = jsonString;
        }
        valueDiv.classList.add('object');
    } else {
        const stringValue = String(value);
        valueDiv.textContent = stringValue;
        
        if (isCompact && stringValue.length > 50) {
            valueDiv.classList.add('truncated');
            valueDiv.title = stringValue;
        }
    }
    
    itemDiv.appendChild(keyDiv);
    itemDiv.appendChild(valueDiv);
    
    return itemDiv;
}

function clearDetailView() {
    const detailViewer = document.getElementById('detailViewer');
    const detailTitle = document.getElementById('detailTitle');
    
    detailTitle.textContent = 'Select an object to view details';
    detailViewer.innerHTML = `
        <div class="empty-state">
            Click on any object key in the left panel to view its contents here
        </div>
    `;
}

function createJSONElement(data, parentKey = '', searchTerm = '', path = []) {
    if (data === null) {
        return createValueElement('null', 'json-null');
    }
    
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            return createArrayElement(data, parentKey, searchTerm, path);
        } else {
            return createObjectElement(data, parentKey, searchTerm, path);
        }
    }
    
    if (typeof data === 'string') {
        return createValueElement(`"${data}"`, 'json-string');
    }
    
    if (typeof data === 'number') {
        return createValueElement(data, 'json-number');
    }
    
    if (typeof data === 'boolean') {
        return createValueElement(data.toString(), 'json-boolean');
    }
    
    return createValueElement(String(data));
}

function createValueElement(value, className = '') {
    const span = document.createElement('span');
    span.className = `json-value ${className}`;
    span.textContent = value;
    return span;
}

function createArrayElement(arr, parentKey, searchTerm, path) {
    const container = document.createElement('div');
    container.className = 'json-array';
    
    const openBracket = document.createElement('span');
    openBracket.className = 'bracket';
    openBracket.textContent = '[';
    container.appendChild(openBracket);
    
    let hasVisibleItems = false;
    
    arr.forEach((item, index) => {
        const itemPath = [...path, index];
        if (!shouldShowValue(item, `${parentKey}[${index}]`, searchTerm)) {
            return;
        }
        
        hasVisibleItems = true;
        
        const itemContainer = document.createElement('div');
        itemContainer.className = 'json-item';
        
        const indexSpan = document.createElement('span');
        indexSpan.className = 'array-index';
        indexSpan.textContent = `[${index}]`;
        itemContainer.appendChild(indexSpan);
        
        const element = createJSONElement(item, `${parentKey}[${index}]`, searchTerm, itemPath);
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
    
    return hasVisibleItems || !filterEmptyEnabled ? container : null;
}

function createObjectElement(obj, parentKey, searchTerm, path) {
    const container = document.createElement('div');
    container.className = 'json-object';
    
    const openBrace = document.createElement('span');
    openBrace.className = 'bracket';
    openBrace.textContent = '{';
    container.appendChild(openBrace);
    
    const keys = Object.keys(obj);
    let visibleKeys = [];
    
    keys.forEach(key => {
        if (shouldShowValue(obj[key], key, searchTerm) || 
            (typeof obj[key] === 'object' && obj[key] !== null && hasVisibleChildren(obj[key], searchTerm))) {
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
            
            // Add click handler for object selection
            keyElement.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove previous selection
                document.querySelectorAll('.json-key.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selection to current
                keyElement.classList.add('selected');
                
                // Show detail view
                showDetailView(value, currentPath.join('.'));
                
                // Also toggle collapse
                keyElement.classList.toggle('collapsed');
                const nextSibling = keyElement.nextElementSibling;
                if (nextSibling && (nextSibling.classList.contains('json-object') || 
                    nextSibling.classList.contains('json-array'))) {
                    nextSibling.classList.toggle('collapsed');
                }
            });
            
            itemContainer.appendChild(keyElement);
            
            const element = createJSONElement(value, key, searchTerm, currentPath);
            if (element) {
                itemContainer.appendChild(element);
            }
        } else {
            keyElement.classList.add('no-collapse');
            keyElement.style.paddingLeft = '0';
            itemContainer.appendChild(keyElement);
            
            const element = createJSONElement(value, key, searchTerm, currentPath);
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
    
    return visibleKeys.length > 0 || !filterEmptyEnabled ? container : null;
}

function hasVisibleChildren(obj, searchTerm) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    
    if (Array.isArray(obj)) {
        return obj.some(item => shouldShowValue(item, '', searchTerm) || 
            (typeof item === 'object' && item !== null && hasVisibleChildren(item, searchTerm)));
    }
    
    return Object.entries(obj).some(([key, value]) => 
        shouldShowValue(value, key, searchTerm) || 
        (typeof value === 'object' && value !== null && hasVisibleChildren(value, searchTerm))
    );
}