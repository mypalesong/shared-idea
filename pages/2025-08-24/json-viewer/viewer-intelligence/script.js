class IntelligenceJSONViewer {
    constructor() {
        this.currentData = null;
        this.analysisResults = {};
        this.conversationHistory = [];
        this.sampleDatasets = {
            ecommerce: this.generateEcommerceData(),
            users: this.generateUserData(),
            financial: this.generateFinancialData(),
            iot: this.generateIoTData()
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeAIAssistant();
        this.showWelcomeInsights();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchSection(e.target.closest('.nav-item').dataset.section);
            });
        });

        // File imports
        document.getElementById('fileInput').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('urlImportBtn').addEventListener('click', this.handleUrlImport.bind(this));
        document.getElementById('rawImportBtn').addEventListener('click', this.handleRawImport.bind(this));

        // Sample datasets
        document.querySelectorAll('.sample-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.loadSampleDataset(e.target.closest('.sample-card').dataset.sample);
            });
        });

        // AI interactions
        document.getElementById('generateInsights').addEventListener('click', this.generateInsights.bind(this));
        document.getElementById('askBtn').addEventListener('click', this.handleNaturalLanguageQuery.bind(this));
        document.getElementById('nlqInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleNaturalLanguageQuery();
        });

        // Query suggestions
        document.querySelectorAll('.suggestion-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.getElementById('nlqInput').value = e.target.dataset.query;
                this.handleNaturalLanguageQuery();
            });
        });

        // Diff functionality
        document.getElementById('performDiff').addEventListener('click', this.performIntelligentDiff.bind(this));

        // Chat functionality
        document.getElementById('expandChat').addEventListener('click', () => {
            document.getElementById('chatModal').classList.add('active');
        });
        
        document.getElementById('closeChatModal').addEventListener('click', () => {
            document.getElementById('chatModal').classList.remove('active');
        });

        document.getElementById('sendChatBtn').addEventListener('click', this.sendChatMessage.bind(this));
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Viewer controls
        document.getElementById('expandAll').addEventListener('click', this.expandAll.bind(this));
        document.getElementById('collapseAll').addEventListener('click', this.collapseAll.bind(this));
        document.getElementById('downloadJson').addEventListener('click', this.downloadJSON.bind(this));
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Switch content
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section).classList.add('active');

        // Section-specific actions
        if (section === 'insights' && this.currentData) {
            this.updateInsights();
        } else if (section === 'patterns' && this.currentData) {
            this.analyzePatterns();
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            this.loadJSONData(data, file.name);
        } catch (error) {
            this.showNotification('Error parsing JSON file: ' + error.message, 'error');
        }
    }

    async handleUrlImport() {
        const url = document.getElementById('urlInput').value.trim();
        if (!url) return;

        try {
            this.showNotification('Fetching data from URL...', 'info');
            const response = await fetch(url);
            const data = await response.json();
            this.loadJSONData(data, 'URL Import');
        } catch (error) {
            this.showNotification('Error fetching from URL: ' + error.message, 'error');
        }
    }

    handleRawImport() {
        const rawData = document.getElementById('rawInput').value.trim();
        if (!rawData) return;

        try {
            const data = JSON.parse(rawData);
            this.loadJSONData(data, 'Raw Input');
        } catch (error) {
            this.showNotification('Error parsing JSON: ' + error.message, 'error');
        }
    }

    loadSampleDataset(type) {
        if (this.sampleDatasets[type]) {
            this.loadJSONData(this.sampleDatasets[type], `Sample: ${type}`);
        }
    }

    loadJSONData(data, source) {
        this.currentData = data;
        this.displayJSON(data);
        this.showViewerPanel();
        this.performAIAnalysis(data);
        this.showNotification(`Successfully loaded JSON from ${source}`, 'success');
        
        // Auto-switch to insights
        setTimeout(() => {
            this.switchSection('insights');
        }, 500);
    }

    displayJSON(data) {
        const viewer = document.getElementById('jsonViewer');
        viewer.innerHTML = this.renderJSONTree(data);
    }

    renderJSONTree(obj, path = '', level = 0) {
        let html = '';
        const isArray = Array.isArray(obj);
        const entries = isArray ? obj.entries() : Object.entries(obj);

        for (const [key, value] of entries) {
            const currentPath = path ? `${path}.${key}` : key;
            const indent = '  '.repeat(level);
            
            if (typeof value === 'object' && value !== null) {
                const isValueArray = Array.isArray(value);
                const bracket = isValueArray ? '[' : '{';
                const closeBracket = isValueArray ? ']' : '}';
                const itemCount = isValueArray ? value.length : Object.keys(value).length;
                
                html += `
                    <div class="json-node" data-path="${currentPath}">
                        <div class="json-key-container" onclick="this.parentElement.classList.toggle('collapsed')">
                            <span class="json-toggle">▼</span>
                            <span class="json-key">${isArray ? key : `"${key}"`}:</span>
                            <span class="json-preview">${bracket}${itemCount} items${closeBracket}</span>
                        </div>
                        <div class="json-children">
                            ${this.renderJSONTree(value, currentPath, level + 1)}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="json-node json-leaf" data-path="${currentPath}">
                        <span class="json-key">${isArray ? key : `"${key}"`}:</span>
                        <span class="json-value json-${typeof value}">${this.formatValue(value)}</span>
                    </div>
                `;
            }
        }

        return html;
    }

    formatValue(value) {
        if (typeof value === 'string') {
            return `"${value}"`;
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (value === null) {
            return 'null';
        }
        return String(value);
    }

    showViewerPanel() {
        document.getElementById('viewerPanel').classList.add('active');
    }

    async performAIAnalysis(data) {
        this.showNotification('AI is analyzing your data...', 'info');
        
        // Simulate AI analysis with realistic delays
        await this.delay(1000);
        
        this.analysisResults = {
            structure: this.analyzeStructure(data),
            patterns: this.detectPatterns(data),
            anomalies: this.detectAnomalies(data),
            insights: this.generateDataInsights(data)
        };

        this.showNotification('AI analysis complete!', 'success');
    }

    analyzeStructure(data) {
        const analysis = {
            type: Array.isArray(data) ? 'array' : 'object',
            depth: this.calculateDepth(data),
            totalFields: this.countFields(data),
            dataTypes: this.analyzeDataTypes(data),
            schemaConsistency: this.checkSchemaConsistency(data)
        };

        return analysis;
    }

    calculateDepth(obj, currentDepth = 0) {
        if (typeof obj !== 'object' || obj === null) return currentDepth;
        
        let maxDepth = currentDepth;
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                maxDepth = Math.max(maxDepth, this.calculateDepth(value, currentDepth + 1));
            }
        }
        return maxDepth;
    }

    countFields(obj) {
        let count = 0;
        
        function traverse(current) {
            if (typeof current === 'object' && current !== null) {
                count += Object.keys(current).length;
                Object.values(current).forEach(traverse);
            }
        }
        
        traverse(obj);
        return count;
    }

    analyzeDataTypes(data) {
        const types = {};
        
        function traverse(obj) {
            if (Array.isArray(obj)) {
                obj.forEach(traverse);
            } else if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => {
                    const type = value === null ? 'null' : typeof value;
                    types[type] = (types[type] || 0) + 1;
                    if (typeof value === 'object') traverse(value);
                });
            }
        }
        
        traverse(data);
        return types;
    }

    checkSchemaConsistency(data) {
        if (!Array.isArray(data)) return 100;
        
        if (data.length === 0) return 100;
        
        const firstSchema = this.extractSchema(data[0]);
        let consistentCount = 1;
        
        for (let i = 1; i < data.length; i++) {
            const currentSchema = this.extractSchema(data[i]);
            if (this.schemasMatch(firstSchema, currentSchema)) {
                consistentCount++;
            }
        }
        
        return Math.round((consistentCount / data.length) * 100);
    }

    extractSchema(obj) {
        if (typeof obj !== 'object' || obj === null) return typeof obj;
        
        const schema = {};
        for (const [key, value] of Object.entries(obj)) {
            schema[key] = typeof value === 'object' ? this.extractSchema(value) : typeof value;
        }
        return schema;
    }

    schemasMatch(schema1, schema2) {
        const keys1 = Object.keys(schema1).sort();
        const keys2 = Object.keys(schema2).sort();
        
        if (keys1.length !== keys2.length) return false;
        
        for (let i = 0; i < keys1.length; i++) {
            if (keys1[i] !== keys2[i]) return false;
            if (typeof schema1[keys1[i]] === 'object') {
                if (!this.schemasMatch(schema1[keys1[i]], schema2[keys1[i]])) return false;
            } else if (schema1[keys1[i]] !== schema2[keys1[i]]) {
                return false;
            }
        }
        
        return true;
    }

    detectPatterns(data) {
        const patterns = [];
        
        // ID patterns
        patterns.push(...this.detectIdPatterns(data));
        
        // Relationship patterns
        patterns.push(...this.detectRelationshipPatterns(data));
        
        // Value patterns
        patterns.push(...this.detectValuePatterns(data));
        
        return patterns;
    }

    detectIdPatterns(data) {
        const patterns = [];
        const idFields = this.findIdFields(data);
        
        if (idFields.length > 0) {
            patterns.push({
                type: 'ID Fields',
                description: `Found ${idFields.length} identifier field(s): ${idFields.join(', ')}`,
                confidence: 90,
                fields: idFields
            });
        }
        
        return patterns;
    }

    findIdFields(data) {
        const idFields = new Set();
        
        function traverse(obj, path = '') {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (key.toLowerCase().includes('id') || 
                        key.toLowerCase().includes('uuid') ||
                        key.toLowerCase().includes('key')) {
                        idFields.add(path ? `${path}.${key}` : key);
                    }
                    
                    if (typeof value === 'object') {
                        traverse(value, path ? `${path}.${key}` : key);
                    }
                });
            }
        }
        
        traverse(data);
        return Array.from(idFields);
    }

    detectRelationshipPatterns(data) {
        const patterns = [];
        
        // Look for foreign key relationships
        const foreignKeys = this.findForeignKeyPatterns(data);
        if (foreignKeys.length > 0) {
            patterns.push({
                type: 'Foreign Key Relationships',
                description: `Detected ${foreignKeys.length} potential relationship(s)`,
                confidence: 85,
                relationships: foreignKeys
            });
        }
        
        return patterns;
    }

    findForeignKeyPatterns(data) {
        const relationships = [];
        const allIds = new Set();
        
        // First pass: collect all IDs
        function collectIds(obj) {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (key.toLowerCase().includes('id') && 
                        (typeof value === 'string' || typeof value === 'number')) {
                        allIds.add(value);
                    }
                    if (typeof value === 'object') collectIds(value);
                });
            }
        }
        
        collectIds(data);
        
        // Second pass: find references
        function findReferences(obj, path = '') {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (key.toLowerCase().includes('ref') || 
                        key.toLowerCase().includes('parent') ||
                        key.toLowerCase().includes('link')) {
                        if (allIds.has(value)) {
                            relationships.push({
                                field: path ? `${path}.${key}` : key,
                                referencedId: value
                            });
                        }
                    }
                    if (typeof value === 'object') findReferences(value, path ? `${path}.${key}` : key);
                });
            }
        }
        
        findReferences(data);
        return relationships;
    }

    detectValuePatterns(data) {
        const patterns = [];
        
        // Detect email patterns
        const emailCount = this.countEmailFields(data);
        if (emailCount > 0) {
            patterns.push({
                type: 'Email Addresses',
                description: `Found ${emailCount} field(s) containing email addresses`,
                confidence: 95
            });
        }
        
        // Detect date patterns
        const dateCount = this.countDateFields(data);
        if (dateCount > 0) {
            patterns.push({
                type: 'Date/Time Fields',
                description: `Found ${dateCount} field(s) containing date/time values`,
                confidence: 90
            });
        }
        
        return patterns;
    }

    countEmailFields(data) {
        let count = 0;
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        
        function traverse(obj) {
            if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => {
                    if (typeof value === 'string' && emailRegex.test(value)) {
                        count++;
                    } else if (typeof value === 'object') {
                        traverse(value);
                    }
                });
            }
        }
        
        traverse(data);
        return count;
    }

    countDateFields(data) {
        let count = 0;
        
        function traverse(obj) {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (typeof value === 'string' && 
                        (key.toLowerCase().includes('date') || 
                         key.toLowerCase().includes('time') ||
                         !isNaN(Date.parse(value)))) {
                        count++;
                    } else if (typeof value === 'object') {
                        traverse(value);
                    }
                });
            }
        }
        
        traverse(data);
        return count;
    }

    detectAnomalies(data) {
        const anomalies = [];
        
        // Check for missing values
        const missingValues = this.findMissingValues(data);
        if (missingValues.length > 0) {
            anomalies.push({
                type: 'Missing Values',
                description: `Found ${missingValues.length} field(s) with missing values`,
                severity: 'medium',
                fields: missingValues
            });
        }
        
        // Check for inconsistent types
        const typeInconsistencies = this.findTypeInconsistencies(data);
        if (typeInconsistencies.length > 0) {
            anomalies.push({
                type: 'Type Inconsistencies',
                description: `Found ${typeInconsistencies.length} field(s) with inconsistent types`,
                severity: 'high',
                fields: typeInconsistencies
            });
        }
        
        return anomalies;
    }

    findMissingValues(data) {
        const missing = [];
        
        function traverse(obj, path = '') {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (value === null || value === undefined || value === '') {
                        missing.push(currentPath);
                    } else if (typeof value === 'object') {
                        traverse(value, currentPath);
                    }
                });
            }
        }
        
        traverse(data);
        return missing;
    }

    findTypeInconsistencies(data) {
        if (!Array.isArray(data)) return [];
        
        const fieldTypes = {};
        const inconsistencies = [];
        
        data.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([key, value]) => {
                    const type = value === null ? 'null' : typeof value;
                    if (!fieldTypes[key]) {
                        fieldTypes[key] = new Set([type]);
                    } else {
                        fieldTypes[key].add(type);
                    }
                });
            }
        });
        
        Object.entries(fieldTypes).forEach(([field, types]) => {
            if (types.size > 1) {
                inconsistencies.push({
                    field,
                    types: Array.from(types)
                });
            }
        });
        
        return inconsistencies;
    }

    generateDataInsights(data) {
        const insights = [];
        const analysis = this.analysisResults.structure;
        
        // Data size insights
        if (Array.isArray(data)) {
            insights.push(`Dataset contains ${data.length} records`);
            if (data.length > 1000) {
                insights.push('Large dataset detected - consider pagination for better performance');
            }
        }
        
        // Complexity insights
        if (analysis.depth > 5) {
            insights.push('Deep nested structure detected - consider flattening for better analysis');
        }
        
        // Schema insights
        if (analysis.schemaConsistency < 90) {
            insights.push('Inconsistent schema detected - data cleaning may be needed');
        }
        
        return insights;
    }

    async generateInsights() {
        if (!this.currentData) {
            this.showNotification('Please load JSON data first', 'warning');
            return;
        }
        
        this.showNotification('Generating AI insights...', 'info');
        await this.delay(1500);
        
        this.updateInsights();
        this.showNotification('New insights generated!', 'success');
    }

    updateInsights() {
        const container = document.querySelector('.insights-container');
        container.innerHTML = this.renderInsights();
    }

    renderInsights() {
        if (!this.analysisResults.structure) return '';
        
        const { structure, patterns, anomalies, insights } = this.analysisResults;
        
        return `
            <div class="insight-card">
                <div class="insight-header">
                    <i class="fas fa-chart-pie"></i>
                    <h3>Data Structure Analysis</h3>
                    <span class="confidence-score">98%</span>
                </div>
                <div class="insight-content">
                    <p>Your JSON contains <strong>${structure.type === 'array' ? 'array-based' : 'object-based'}</strong> data with ${structure.schemaConsistency}% schema consistency.</p>
                    <ul>
                        <li>Structure type: ${structure.type}</li>
                        <li>Nesting depth: ${structure.depth}</li>
                        <li>Total fields: ${structure.totalFields}</li>
                        <li>Data types: ${Object.keys(structure.dataTypes).length}</li>
                    </ul>
                </div>
            </div>
            
            <div class="insight-card">
                <div class="insight-header">
                    <i class="fas fa-search"></i>
                    <h3>Pattern Analysis</h3>
                    <span class="confidence-score">92%</span>
                </div>
                <div class="insight-content">
                    <p>Detected <strong>${patterns.length} patterns</strong> in your data structure.</p>
                    ${patterns.map(p => `<p>• ${p.description} (${p.confidence}% confidence)</p>`).join('')}
                </div>
            </div>
            
            ${anomalies.length > 0 ? `
            <div class="insight-card">
                <div class="insight-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Anomaly Detection</h3>
                    <span class="confidence-score">89%</span>
                </div>
                <div class="insight-content">
                    <p>Found <strong>${anomalies.length} potential anomalies</strong> in your data.</p>
                    ${anomalies.map(a => `<p>• ${a.description} (${a.severity} severity)</p>`).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="insight-card">
                <div class="insight-header">
                    <i class="fas fa-lightbulb"></i>
                    <h3>AI Recommendations</h3>
                    <span class="confidence-score">95%</span>
                </div>
                <div class="insight-content">
                    ${insights.map(i => `<p>• ${i}</p>`).join('')}
                </div>
            </div>
        `;
    }

    analyzePatterns() {
        if (!this.analysisResults.patterns) return;
        
        const schemaContainer = document.getElementById('schemaPatterns');
        const relationshipContainer = document.getElementById('relationshipPatterns');
        
        schemaContainer.innerHTML = this.analysisResults.patterns
            .filter(p => p.type.includes('ID') || p.type.includes('Schema'))
            .map(p => `
                <div class="pattern-item">
                    <span class="pattern-name">${p.description}</span>
                    <span class="pattern-confidence">${p.confidence}%</span>
                </div>
            `).join('') || '<div class="pattern-item"><span class="pattern-name">No schema patterns detected</span></div>';
        
        relationshipContainer.innerHTML = this.analysisResults.patterns
            .filter(p => p.type.includes('Relationship'))
            .map(p => `
                <div class="pattern-item">
                    <span class="pattern-name">${p.description}</span>
                    <span class="pattern-confidence">${p.confidence}%</span>
                </div>
            `).join('') || '<div class="pattern-item"><span class="pattern-name">No relationship patterns detected</span></div>';
    }

    async handleNaturalLanguageQuery() {
        const query = document.getElementById('nlqInput').value.trim();
        if (!query || !this.currentData) return;
        
        const resultsContainer = document.getElementById('nlqResults');
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading">AI is processing your query...</div>';
        
        await this.delay(1000);
        
        const response = this.processNaturalLanguageQuery(query);
        resultsContainer.innerHTML = `
            <div class="nlq-response">
                <h4>Query: "${query}"</h4>
                <div class="nlq-answer">
                    ${response.answer}
                </div>
                ${response.code ? `
                    <div class="nlq-code">
                        <h5>Generated Query:</h5>
                        <pre><code>${response.code}</code></pre>
                    </div>
                ` : ''}
                ${response.results ? `
                    <div class="nlq-results-data">
                        <h5>Results:</h5>
                        <pre><code>${JSON.stringify(response.results, null, 2)}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    processNaturalLanguageQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
            return this.handleCountQuery(query);
        } else if (lowerQuery.includes('find') || lowerQuery.includes('show') || lowerQuery.includes('get')) {
            return this.handleFindQuery(query);
        } else if (lowerQuery.includes('missing') || lowerQuery.includes('null') || lowerQuery.includes('empty')) {
            return this.handleMissingQuery(query);
        } else if (lowerQuery.includes('pattern') || lowerQuery.includes('structure')) {
            return this.handlePatternQuery(query);
        } else if (lowerQuery.includes('average') || lowerQuery.includes('mean') || lowerQuery.includes('sum')) {
            return this.handleAggregationQuery(query);
        } else {
            return {
                answer: `I analyzed your query "${query}" and here's what I found about your data structure. Your JSON contains ${this.analysisResults.structure?.totalFields || 'multiple'} fields with ${this.analysisResults.structure?.depth || 'several'} levels of nesting. Would you like me to analyze specific patterns or values?`,
                code: null,
                results: null
            };
        }
    }

    handleCountQuery(query) {
        if (Array.isArray(this.currentData)) {
            const count = this.currentData.length;
            return {
                answer: `Your dataset contains ${count} records.`,
                code: `data.length`,
                results: count
            };
        } else {
            const fieldCount = Object.keys(this.currentData).length;
            return {
                answer: `Your JSON object contains ${fieldCount} top-level fields.`,
                code: `Object.keys(data).length`,
                results: fieldCount
            };
        }
    }

    handleFindQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('email')) {
            const emails = this.findValuesByPattern(this.currentData, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            return {
                answer: `Found ${emails.length} email address(es) in your data.`,
                code: `// Search for email patterns`,
                results: emails.slice(0, 5) // Limit results
            };
        }
        
        if (lowerQuery.includes('date')) {
            const dates = this.findDateFields(this.currentData);
            return {
                answer: `Found ${dates.length} date field(s) in your data.`,
                code: `// Search for date fields`,
                results: dates.slice(0, 5)
            };
        }
        
        return {
            answer: `I searched your data but need more specific criteria. Try asking about specific field names or value types.`,
            code: null,
            results: null
        };
    }

    handleMissingQuery(query) {
        const missing = this.analysisResults.anomalies?.find(a => a.type === 'Missing Values');
        if (missing) {
            return {
                answer: `Found ${missing.fields.length} field(s) with missing values: ${missing.fields.slice(0, 5).join(', ')}`,
                code: `// Fields with null/empty values`,
                results: missing.fields.slice(0, 10)
            };
        }
        
        return {
            answer: `No missing values detected in your data structure.`,
            code: null,
            results: null
        };
    }

    handlePatternQuery(query) {
        const patterns = this.analysisResults.patterns || [];
        const patternSummary = patterns.map(p => p.description).join(', ');
        
        return {
            answer: `Detected ${patterns.length} patterns in your data: ${patternSummary}`,
            code: `// Pattern analysis results`,
            results: patterns
        };
    }

    handleAggregationQuery(query) {
        const numbers = this.findNumberFields(this.currentData);
        if (numbers.length > 0) {
            const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
            const sum = numbers.reduce((a, b) => a + b, 0);
            
            return {
                answer: `Found ${numbers.length} numeric values. Average: ${avg.toFixed(2)}, Sum: ${sum}`,
                code: `// Numeric field aggregation`,
                results: { count: numbers.length, average: avg, sum: sum }
            };
        }
        
        return {
            answer: `No numeric fields found for aggregation.`,
            code: null,
            results: null
        };
    }

    findValuesByPattern(data, pattern) {
        const matches = [];
        
        function traverse(obj) {
            if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => {
                    if (typeof value === 'string' && pattern.test(value)) {
                        matches.push(value);
                    } else if (typeof value === 'object') {
                        traverse(value);
                    }
                });
            }
        }
        
        traverse(data);
        return matches;
    }

    findDateFields(data) {
        const dates = [];
        
        function traverse(obj, path = '') {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                        dates.push({ field: path ? `${path}.${key}` : key, value });
                    } else if (typeof value === 'object') {
                        traverse(value, path ? `${path}.${key}` : key);
                    }
                });
            }
        }
        
        traverse(data);
        return dates;
    }

    findNumberFields(data) {
        const numbers = [];
        
        function traverse(obj) {
            if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => {
                    if (typeof value === 'number') {
                        numbers.push(value);
                    } else if (typeof value === 'object') {
                        traverse(value);
                    }
                });
            }
        }
        
        traverse(data);
        return numbers;
    }

    performIntelligentDiff() {
        if (!this.diffData1 || !this.diffData2) {
            this.showNotification('Please load two JSON files to compare', 'warning');
            return;
        }
        
        const diffResults = document.getElementById('diffResults');
        diffResults.style.display = 'block';
        
        const analysis = this.analyzeJsonDifferences(this.diffData1, this.diffData2);
        
        document.getElementById('diffStats').innerHTML = `
            <div class="diff-stat">
                <strong>${analysis.changes.length}</strong>
                <span>Changes</span>
            </div>
            <div class="diff-stat">
                <strong>${analysis.additions.length}</strong>
                <span>Additions</span>
            </div>
            <div class="diff-stat">
                <strong>${analysis.deletions.length}</strong>
                <span>Deletions</span>
            </div>
            <div class="diff-stat">
                <strong>${analysis.similarity}%</strong>
                <span>Similarity</span>
            </div>
        `;
        
        document.getElementById('diffOriginal').innerHTML = this.renderJSONTree(this.diffData1);
        document.getElementById('diffModified').innerHTML = this.renderJSONTree(this.diffData2);
    }

    analyzeJsonDifferences(obj1, obj2) {
        const changes = [];
        const additions = [];
        const deletions = [];
        
        function compare(o1, o2, path = '') {
            if (typeof o1 !== typeof o2) {
                changes.push({ path, type: 'type_change', from: typeof o1, to: typeof o2 });
                return;
            }
            
            if (typeof o1 === 'object' && o1 !== null && o2 !== null) {
                const keys1 = new Set(Object.keys(o1));
                const keys2 = new Set(Object.keys(o2));
                
                // Deletions
                keys1.forEach(key => {
                    if (!keys2.has(key)) {
                        deletions.push({ path: path ? `${path}.${key}` : key, value: o1[key] });
                    }
                });
                
                // Additions
                keys2.forEach(key => {
                    if (!keys1.has(key)) {
                        additions.push({ path: path ? `${path}.${key}` : key, value: o2[key] });
                    }
                });
                
                // Changes
                keys1.forEach(key => {
                    if (keys2.has(key)) {
                        compare(o1[key], o2[key], path ? `${path}.${key}` : key);
                    }
                });
            } else if (o1 !== o2) {
                changes.push({ path, type: 'value_change', from: o1, to: o2 });
            }
        }
        
        compare(obj1, obj2);
        
        const totalFields = this.countFields(obj1) + this.countFields(obj2);
        const changedFields = changes.length + additions.length + deletions.length;
        const similarity = Math.round(((totalFields - changedFields) / totalFields) * 100);
        
        return { changes, additions, deletions, similarity };
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        this.addChatMessage(message, 'user');
        input.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addChatMessage(response, 'ai');
        }, 1000);
    }

    addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const icon = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        messageDiv.innerHTML = `
            ${icon}
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm here to help you analyze your JSON data. What would you like to explore?";
        }
        
        if (lowerMessage.includes('help')) {
            return "I can help you with:\n• Understanding data structure and patterns\n• Finding specific values or fields\n• Detecting anomalies and inconsistencies\n• Generating insights and recommendations\n• Comparing JSON files\n\nWhat specific aspect would you like to explore?";
        }
        
        if (lowerMessage.includes('analyze') || lowerMessage.includes('data')) {
            if (!this.currentData) {
                return "I'd love to analyze your data! Please upload a JSON file first, and then I can provide detailed insights about its structure, patterns, and potential issues.";
            }
            
            const structure = this.analysisResults.structure;
            return `I've analyzed your data! Here's what I found:\n• Structure: ${structure?.type || 'Unknown'} with ${structure?.depth || 0} levels of nesting\n• ${structure?.totalFields || 0} total fields detected\n• Schema consistency: ${structure?.schemaConsistency || 0}%\n\nWould you like me to dive deeper into any specific aspect?`;
        }
        
        if (lowerMessage.includes('pattern')) {
            const patterns = this.analysisResults.patterns || [];
            if (patterns.length === 0) {
                return "I haven't detected any specific patterns yet. Make sure you have JSON data loaded, and I'll analyze it for patterns like ID fields, relationships, and value distributions.";
            }
            
            return `I found ${patterns.length} patterns in your data:\n${patterns.map(p => `• ${p.description} (${p.confidence}% confidence)`).join('\n')}\n\nWould you like details on any specific pattern?`;
        }
        
        return "That's an interesting question! I'm constantly learning about JSON data analysis. Could you be more specific about what aspect of your data you'd like me to examine?";
    }

    initializeAIAssistant() {
        // Simulate AI initialization
        setTimeout(() => {
            this.addChatPreviewMessage("Welcome! Upload your JSON data and I'll provide intelligent analysis.", 'ai');
        }, 1000);
    }

    addChatPreviewMessage(message, sender) {
        const preview = document.getElementById('chatPreview');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${sender === 'ai' ? 'robot' : 'user'}"></i>
            <span>${message}</span>
        `;
        preview.appendChild(messageDiv);
        preview.scrollTop = preview.scrollHeight;
    }

    showWelcomeInsights() {
        const container = document.querySelector('.insights-container');
        container.innerHTML = `
            <div class="insight-card">
                <div class="insight-header">
                    <i class="fas fa-rocket"></i>
                    <h3>Welcome to AI-Powered Analysis</h3>
                    <span class="confidence-score">Ready</span>
                </div>
                <div class="insight-content">
                    <p>Upload your JSON data to unlock powerful AI-driven insights:</p>
                    <ul>
                        <li>Automated structure analysis</li>
                        <li>Pattern and relationship detection</li>
                        <li>Anomaly identification</li>
                        <li>Natural language querying</li>
                        <li>Intelligent data recommendations</li>
                    </ul>
                    <p>Get started by importing your data from the sidebar!</p>
                </div>
            </div>
        `;
    }

    expandAll() {
        document.querySelectorAll('.json-node').forEach(node => {
            node.classList.remove('collapsed');
        });
    }

    collapseAll() {
        document.querySelectorAll('.json-node').forEach(node => {
            if (!node.classList.contains('json-leaf')) {
                node.classList.add('collapsed');
            }
        });
    }

    downloadJSON() {
        if (!this.currentData) return;
        
        const blob = new Blob([JSON.stringify(this.currentData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analyzed_data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Sample data generators
    generateEcommerceData() {
        return {
            "products": Array.from({length: 50}, (_, i) => ({
                "id": `prod_${i + 1}`,
                "name": `Product ${i + 1}`,
                "price": Math.round(Math.random() * 500 + 10),
                "category": ["electronics", "clothing", "books", "home"][Math.floor(Math.random() * 4)],
                "inStock": Math.random() > 0.2,
                "rating": Math.round(Math.random() * 50) / 10,
                "reviews": Math.floor(Math.random() * 1000),
                "tags": Array.from({length: Math.floor(Math.random() * 5) + 1}, () => 
                    ["popular", "sale", "new", "trending", "bestseller"][Math.floor(Math.random() * 5)]
                )
            })),
            "categories": [
                { "id": "electronics", "name": "Electronics", "count": 15 },
                { "id": "clothing", "name": "Clothing", "count": 12 },
                { "id": "books", "name": "Books", "count": 8 },
                { "id": "home", "name": "Home & Garden", "count": 15 }
            ]
        };
    }

    generateUserData() {
        return {
            "users": Array.from({length: 30}, (_, i) => ({
                "id": `user_${i + 1}`,
                "email": `user${i + 1}@example.com`,
                "name": `User ${i + 1}`,
                "age": Math.floor(Math.random() * 50) + 18,
                "location": {
                    "country": ["US", "UK", "DE", "FR", "CA"][Math.floor(Math.random() * 5)],
                    "city": `City ${i + 1}`,
                    "timezone": ["UTC", "EST", "PST", "GMT"][Math.floor(Math.random() * 4)]
                },
                "preferences": {
                    "newsletter": Math.random() > 0.5,
                    "notifications": Math.random() > 0.3,
                    "theme": Math.random() > 0.5 ? "dark" : "light"
                },
                "lastLogin": new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                "purchases": Math.floor(Math.random() * 20)
            }))
        };
    }

    generateFinancialData() {
        return {
            "transactions": Array.from({length: 100}, (_, i) => ({
                "id": `txn_${i + 1}`,
                "amount": Math.round((Math.random() * 2000 - 500) * 100) / 100,
                "currency": ["USD", "EUR", "GBP"][Math.floor(Math.random() * 3)],
                "type": Math.random() > 0.6 ? "credit" : "debit",
                "category": ["food", "transport", "shopping", "bills", "entertainment"][Math.floor(Math.random() * 5)],
                "date": new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                "merchant": `Merchant ${Math.floor(Math.random() * 20) + 1}`,
                "account_id": `acc_${Math.floor(Math.random() * 5) + 1}`
            })),
            "accounts": Array.from({length: 5}, (_, i) => ({
                "id": `acc_${i + 1}`,
                "name": `Account ${i + 1}`,
                "type": ["checking", "savings", "credit"][Math.floor(Math.random() * 3)],
                "balance": Math.round(Math.random() * 10000 * 100) / 100,
                "currency": "USD"
            }))
        };
    }

    generateIoTData() {
        return {
            "sensors": Array.from({length: 200}, (_, i) => ({
                "id": `sensor_${i + 1}`,
                "type": ["temperature", "humidity", "pressure", "light"][Math.floor(Math.random() * 4)],
                "location": {
                    "room": `Room ${Math.floor(Math.random() * 10) + 1}`,
                    "floor": Math.floor(Math.random() * 5) + 1,
                    "building": `Building ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`
                },
                "value": Math.round(Math.random() * 100 * 100) / 100,
                "unit": {
                    "temperature": "°C",
                    "humidity": "%",
                    "pressure": "hPa",
                    "light": "lux"
                }[["temperature", "humidity", "pressure", "light"][Math.floor(Math.random() * 4)]],
                "timestamp": new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
                "status": Math.random() > 0.1 ? "online" : "offline",
                "battery": Math.floor(Math.random() * 100)
            }))
        };
    }
}

// CSS for notifications
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 300px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-info {
        background: linear-gradient(135deg, #667eea, #764ba2);
    }
    
    .notification-success {
        background: linear-gradient(135deg, #10b981, #059669);
    }
    
    .notification-warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    
    .notification-error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    
    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: #667eea;
        font-style: italic;
    }
    
    .nlq-response {
        background: rgba(102, 126, 234, 0.05);
        border-radius: 0.5rem;
        padding: 1.5rem;
    }
    
    .nlq-response h4 {
        color: #374151;
        margin-bottom: 1rem;
        font-size: 1.125rem;
    }
    
    .nlq-answer {
        background: white;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
        color: #374151;
    }
    
    .nlq-code, .nlq-results-data {
        background: #f8fafc;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .nlq-code h5, .nlq-results-data h5 {
        color: #64748b;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .nlq-code pre, .nlq-results-data pre {
        background: none;
        margin: 0;
        padding: 0;
        font-family: 'Fira Code', monospace;
        font-size: 0.875rem;
        color: #374151;
    }
    
    .json-node {
        margin-left: 1rem;
    }
    
    .json-node.collapsed .json-children {
        display: none;
    }
    
    .json-node.collapsed .json-toggle::before {
        content: "▶";
    }
    
    .json-key-container {
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        transition: background-color 0.2s ease;
    }
    
    .json-key-container:hover {
        background-color: rgba(102, 126, 234, 0.1);
    }
    
    .json-toggle {
        display: inline-block;
        width: 12px;
        color: #64748b;
    }
    
    .json-key {
        color: #dc2626;
        font-weight: 500;
        margin-right: 0.5rem;
    }
    
    .json-value {
        margin-left: 0.5rem;
    }
    
    .json-string {
        color: #059669;
    }
    
    .json-number {
        color: #2563eb;
    }
    
    .json-boolean {
        color: #7c2d12;
    }
    
    .json-null {
        color: #64748b;
        font-style: italic;
    }
    
    .json-preview {
        color: #64748b;
        font-size: 0.875rem;
        font-style: italic;
    }
    
    .json-leaf {
        margin-left: 1rem;
        padding: 1px 0;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new IntelligenceJSONViewer();
});