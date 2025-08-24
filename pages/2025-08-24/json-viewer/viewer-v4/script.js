// Neural Network JSON Visualizer
class NeuralNetworkVisualizer {
    constructor() {
        this.rawData = null;
        this.neuralNetwork = {
            neurons: [],
            synapses: [],
            layers: [],
            patterns: [],
            insights: []
        };
        this.currentMode = 'network';
        this.selectedNeuron = null;
        this.animationFrame = null;
        this.isTraining = false;
        this.trainingProgress = 0;
        this.visualization = {
            svg: null,
            simulation: null,
            width: 0,
            height: 0
        };
        this.settings = {
            neuronSize: 8,
            connectionStrength: 0.3,
            animationSpeed: 1,
            showLabels: true,
            enablePhysics: true
        };
    }

    init() {
        this.setupEventListeners();
        this.setupVisualization();
        this.loadDefaultData();
        this.createSVGGradients();
    }

    setupEventListeners() {
        // Data loading
        document.getElementById('loadData').addEventListener('click', () => this.showDataLoadOptions());
        
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Analysis controls
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeData());
        document.getElementById('trainBtn').addEventListener('click', () => this.startTraining());

        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());
        document.getElementById('playAnimation').addEventListener('click', () => this.playAnimation());
        document.getElementById('pauseAnimation').addEventListener('click', () => this.pauseAnimation());

        // Tab switching
        this.setupTabSwitching();

        // Filters
        this.setupFilterControls();

        // Context menu
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    async loadDefaultData() {
        try {
            const response = await fetch('../data/data.json');
            const data = await response.json();
            this.setData(data);
            this.showNotification('Neural network initialized with default data', 'success');
        } catch (error) {
            console.log('No default data available');
            this.showEmptyState();
        }
    }

    setData(data) {
        this.rawData = data;
        this.hideEmptyState();
        this.showLoadingState();
        
        setTimeout(() => {
            this.convertToNeuralNetwork(data);
            this.updateStats();
            this.renderCurrentMode();
            this.hideLoadingState();
            this.generateInsights();
        }, 1000);
    }

    convertToNeuralNetwork(data, path = '', depth = 0, parentId = null) {
        const neuronId = `neuron_${this.neuralNetwork.neurons.length}`;
        
        // Create neuron based on data type and content
        const neuron = {
            id: neuronId,
            data: data,
            path: path || 'root',
            depth: depth,
            type: this.getDataType(data),
            activation: this.calculateActivation(data),
            weight: this.calculateWeight(data),
            bias: Math.random() * 0.2 - 0.1,
            position: this.calculatePosition(depth, this.neuralNetwork.neurons.length),
            connections: [],
            parentId: parentId,
            children: []
        };

        this.neuralNetwork.neurons.push(neuron);

        // Create synapse to parent
        if (parentId) {
            const synapse = {
                id: `synapse_${this.neuralNetwork.synapses.length}`,
                source: parentId,
                target: neuronId,
                weight: Math.random() * 2 - 1,
                strength: this.calculateSynapseStrength(data),
                type: 'hierarchical'
            };
            this.neuralNetwork.synapses.push(synapse);
            
            // Update parent's children
            const parent = this.neuralNetwork.neurons.find(n => n.id === parentId);
            if (parent) {
                parent.children.push(neuronId);
            }
        }

        // Process children
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    if (depth < 5) { // Limit depth to prevent overcrowding
                        this.convertToNeuralNetwork(item, `${path}[${index}]`, depth + 1, neuronId);
                    }
                });
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    if (depth < 5) {
                        const childPath = path ? `${path}.${key}` : key;
                        this.convertToNeuralNetwork(value, childPath, depth + 1, neuronId);
                    }
                });
            }
        }

        return neuron;
    }

    getDataType(data) {
        if (data === null) return 'null';
        if (Array.isArray(data)) return 'array';
        return typeof data;
    }

    calculateActivation(data) {
        if (typeof data === 'number') {
            return Math.tanh(data / 100); // Normalize and apply activation
        }
        if (typeof data === 'string') {
            return Math.tanh(data.length / 50);
        }
        if (typeof data === 'boolean') {
            return data ? 1 : -1;
        }
        if (Array.isArray(data)) {
            return Math.tanh(data.length / 10);
        }
        if (typeof data === 'object' && data !== null) {
            return Math.tanh(Object.keys(data).length / 10);
        }
        return 0;
    }

    calculateWeight(data) {
        if (typeof data === 'object' && data !== null) {
            const size = Array.isArray(data) ? data.length : Object.keys(data).length;
            return Math.max(0.5, Math.min(3, size / 5));
        }
        return 1;
    }

    calculatePosition(depth, index) {
        const radius = 50 + depth * 100;
        const angle = (index * 2 * Math.PI) / Math.max(1, Math.pow(2, depth));
        
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }

    calculateSynapseStrength(data) {
        if (typeof data === 'number') return Math.abs(data) / 100;
        if (typeof data === 'string') return data.length / 100;
        if (Array.isArray(data)) return data.length / 10;
        if (typeof data === 'object' && data !== null) return Object.keys(data).length / 10;
        return 0.5;
    }

    setupVisualization() {
        this.setupNetworkView();
        this.setupLayersView();
        this.setupFlowView();
        this.setupHeatmapView();
    }

    setupNetworkView() {
        const container = document.getElementById('networkView');
        const svg = d3.select('#networkSvg');
        
        this.visualization.width = container.clientWidth;
        this.visualization.height = container.clientHeight;
        
        svg.attr('width', this.visualization.width)
           .attr('height', this.visualization.height);

        // Create main group for zoom/pan
        const mainGroup = svg.append('g').attr('class', 'main-group');
        
        // Create groups for different elements
        mainGroup.append('g').attr('class', 'synapses');
        mainGroup.append('g').attr('class', 'neurons');
        mainGroup.append('g').attr('class', 'labels');

        // Setup zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                mainGroup.attr('transform', event.transform);
            });

        svg.call(zoom);
        this.visualization.zoom = zoom;
        this.visualization.svg = svg;
    }

    setupLayersView() {
        // Layer visualization setup
        const container = document.getElementById('layersContainer');
        container.innerHTML = '';
    }

    setupFlowView() {
        const svg = d3.select('#flowSvg');
        const container = document.getElementById('flowView');
        
        svg.attr('width', container.clientWidth)
           .attr('height', container.clientHeight);
    }

    setupHeatmapView() {
        const canvas = document.getElementById('heatmapCanvas');
        const container = document.getElementById('heatmapView');
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    createSVGGradients() {
        const svg = this.visualization.svg;
        const defs = svg.append('defs');

        // Neural gradient
        const neuralGradient = defs.append('linearGradient')
            .attr('id', 'neuralGradient')
            .attr('gradientUnits', 'userSpaceOnUse');

        neuralGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#00ff88');

        neuralGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#0088ff');

        // Synapse gradient
        const synapseGradient = defs.append('linearGradient')
            .attr('id', 'synapseGradient')
            .attr('gradientUnits', 'userSpaceOnUse');

        synapseGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(0, 255, 136, 0.8)');

        synapseGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(0, 136, 255, 0.3)');
    }

    switchMode(mode) {
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Update active view
        document.querySelectorAll('.neural-view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${mode}View`).classList.add('active');

        this.currentMode = mode;
        document.getElementById('currentMode').textContent = this.getModeDisplayName(mode);
        
        this.renderCurrentMode();
    }

    getModeDisplayName(mode) {
        const names = {
            network: 'Network Mode',
            layers: 'Layers Mode',
            flow: 'Flow Mode',
            heatmap: 'Heatmap Mode'
        };
        return names[mode] || mode;
    }

    renderCurrentMode() {
        if (!this.neuralNetwork.neurons.length) return;

        switch (this.currentMode) {
            case 'network':
                this.renderNetworkView();
                break;
            case 'layers':
                this.renderLayersView();
                break;
            case 'flow':
                this.renderFlowView();
                break;
            case 'heatmap':
                this.renderHeatmapView();
                break;
        }
    }

    renderNetworkView() {
        const svg = this.visualization.svg;
        const mainGroup = svg.select('.main-group');
        const { neurons, synapses } = this.neuralNetwork;

        // Center the network
        const centerX = this.visualization.width / 2;
        const centerY = this.visualization.height / 2;

        // Render synapses
        const synapseSelection = mainGroup.select('.synapses')
            .selectAll('.synapse')
            .data(synapses, d => d.id);

        synapseSelection.exit().remove();

        const synapseEnter = synapseSelection.enter()
            .append('line')
            .attr('class', 'synapse')
            .attr('stroke', 'url(#synapseGradient)')
            .attr('stroke-width', d => Math.max(1, d.strength * 3))
            .attr('opacity', 0.6);

        synapseSelection.merge(synapseEnter)
            .attr('x1', d => {
                const source = neurons.find(n => n.id === d.source);
                return source ? centerX + source.position.x : centerX;
            })
            .attr('y1', d => {
                const source = neurons.find(n => n.id === d.source);
                return source ? centerY + source.position.y : centerY;
            })
            .attr('x2', d => {
                const target = neurons.find(n => n.id === d.target);
                return target ? centerX + target.position.x : centerX;
            })
            .attr('y2', d => {
                const target = neurons.find(n => n.id === d.target);
                return target ? centerY + target.position.y : centerY;
            });

        // Render neurons
        const neuronSelection = mainGroup.select('.neurons')
            .selectAll('.neuron')
            .data(neurons, d => d.id);

        neuronSelection.exit().remove();

        const neuronEnter = neuronSelection.enter()
            .append('circle')
            .attr('class', 'neuron')
            .attr('r', d => this.settings.neuronSize * d.weight)
            .attr('fill', d => this.getNeuronColor(d))
            .attr('stroke', 'rgba(255, 255, 255, 0.3)')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('click', (event, d) => this.selectNeuron(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('contextmenu', (event, d) => this.showNeuronContextMenu(event, d));

        const neuronUpdate = neuronSelection.merge(neuronEnter);

        neuronUpdate
            .attr('cx', d => centerX + d.position.x)
            .attr('cy', d => centerY + d.position.y)
            .style('filter', d => d.activation > 0.5 ? 'drop-shadow(0 0 8px #00ff88)' : 'none');

        // Add pulsing animation for active neurons
        this.animateActiveNeurons();

        // Add neural particles
        this.createNeuralParticles();
    }

    renderLayersView() {
        const container = document.getElementById('layersContainer');
        container.innerHTML = '';

        // Group neurons by depth (layer)
        const layers = {};
        this.neuralNetwork.neurons.forEach(neuron => {
            if (!layers[neuron.depth]) {
                layers[neuron.depth] = [];
            }
            layers[neuron.depth].push(neuron);
        });

        // Create layer visualization
        Object.entries(layers).forEach(([depth, neurons], layerIndex) => {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'neural-layer';
            layerDiv.innerHTML = `
                <div class="layer-header">
                    <h4>Layer ${depth}</h4>
                    <span class="neuron-count">${neurons.length} neurons</span>
                </div>
                <div class="layer-neurons" id="layer-${depth}">
                    ${neurons.map(neuron => `
                        <div class="layer-neuron" data-neuron-id="${neuron.id}">
                            <div class="neuron-visual" style="background-color: ${this.getNeuronColor(neuron)}"></div>
                            <div class="neuron-info">
                                <div class="neuron-path">${neuron.path}</div>
                                <div class="neuron-activation">Activation: ${neuron.activation.toFixed(3)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(layerDiv);
        });
    }

    renderFlowView() {
        const svg = d3.select('#flowSvg');
        svg.selectAll('*').remove();

        // Create flow paths showing data flow through the network
        const flowPaths = this.generateFlowPaths();
        
        flowPaths.forEach((path, index) => {
            const pathElement = svg.append('path')
                .attr('d', path.d)
                .attr('stroke', 'url(#neuralGradient)')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('opacity', 0);

            // Animate the path
            pathElement
                .transition()
                .delay(index * 100)
                .duration(2000)
                .attr('opacity', 0.8)
                .attr('stroke-dasharray', '5,5')
                .attr('stroke-dashoffset', 0);
        });
    }

    renderHeatmapView() {
        const canvas = document.getElementById('heatmapCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create heatmap based on neuron activations
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        this.neuralNetwork.neurons.forEach(neuron => {
            const x = Math.floor((neuron.position.x + 400) / 800 * canvas.width);
            const y = Math.floor((neuron.position.y + 400) / 800 * canvas.height);
            
            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                const index = (y * canvas.width + x) * 4;
                const intensity = Math.abs(neuron.activation) * 255;
                
                data[index] = neuron.activation > 0 ? intensity : 0;     // Red
                data[index + 1] = intensity * 0.5;                      // Green
                data[index + 2] = neuron.activation < 0 ? intensity : 0; // Blue
                data[index + 3] = 255;                                   // Alpha
            }
        });

        ctx.putImageData(imageData, 0, 0);
    }

    getNeuronColor(neuron) {
        const colors = {
            string: '#00ff88',
            number: '#0088ff',
            boolean: '#ff8800',
            array: '#8800ff',
            object: '#ff0088',
            null: '#888888'
        };
        return colors[neuron.type] || colors.string;
    }

    animateActiveNeurons() {
        const activeNeurons = this.neuralNetwork.neurons.filter(n => n.activation > 0.5);
        
        activeNeurons.forEach(neuron => {
            d3.select(`circle[data-neuron-id="${neuron.id}"]`)
                .transition()
                .duration(1000)
                .attr('r', this.settings.neuronSize * neuron.weight * 1.2)
                .transition()
                .duration(1000)
                .attr('r', this.settings.neuronSize * neuron.weight);
        });
    }

    createNeuralParticles() {
        const particlesContainer = document.getElementById('neuralParticles');
        const particles = particlesContainer.querySelectorAll('.particle');
        
        // Remove old particles
        particles.forEach(p => p.remove());

        // Create new particles for active synapses
        this.neuralNetwork.synapses.forEach(synapse => {
            if (synapse.strength > 0.3) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                const source = this.neuralNetwork.neurons.find(n => n.id === synapse.source);
                const target = this.neuralNetwork.neurons.find(n => n.id === synapse.target);
                
                if (source && target) {
                    const centerX = this.visualization.width / 2;
                    const centerY = this.visualization.height / 2;
                    
                    particle.style.left = (centerX + source.position.x) + 'px';
                    particle.style.top = (centerY + source.position.y) + 'px';
                    
                    // Animate to target
                    particle.style.setProperty('--target-x', (centerX + target.position.x) + 'px');
                    particle.style.setProperty('--target-y', (centerY + target.position.y) + 'px');
                    
                    particlesContainer.appendChild(particle);
                    
                    // Remove after animation
                    setTimeout(() => particle.remove(), 3000);
                }
            }
        });
    }

    selectNeuron(neuron) {
        this.selectedNeuron = neuron;
        this.updateSelectedInfo(neuron);
        this.updateAnalysisPanel(neuron);
        this.highlightNeuron(neuron);
    }

    updateSelectedInfo(neuron) {
        const info = document.getElementById('selectedInfo');
        if (neuron) {
            info.textContent = `Selected: ${neuron.path} (${neuron.type})`;
        } else {
            info.textContent = 'Select a neuron';
        }
    }

    updateAnalysisPanel(neuron) {
        const content = document.getElementById('analysisContent');
        const title = document.getElementById('analysisTitle');

        if (!neuron) {
            content.innerHTML = `
                <div class="analysis-empty">
                    <i class="fas fa-crosshairs"></i>
                    <h4>Select a Neuron</h4>
                    <p>Click on any neuron to view analysis</p>
                </div>
            `;
            return;
        }

        title.innerHTML = `<i class="fas fa-microscope"></i> ${neuron.path}`;

        content.innerHTML = `
            <div class="neuron-analysis">
                <div class="analysis-section">
                    <h4>Neural Properties</h4>
                    <div class="property-grid">
                        <div class="property-item">
                            <span class="property-label">Type:</span>
                            <span class="property-value type-badge">${neuron.type}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Activation:</span>
                            <span class="property-value">${neuron.activation.toFixed(4)}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Weight:</span>
                            <span class="property-value">${neuron.weight.toFixed(4)}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Bias:</span>
                            <span class="property-value">${neuron.bias.toFixed(4)}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Depth:</span>
                            <span class="property-value">${neuron.depth}</span>
                        </div>
                        <div class="property-item">
                            <span class="property-label">Connections:</span>
                            <span class="property-value">${neuron.children.length}</span>
                        </div>
                    </div>
                </div>

                <div class="analysis-section">
                    <h4>Data Content</h4>
                    <div class="data-preview">
                        <pre>${JSON.stringify(neuron.data, null, 2)}</pre>
                    </div>
                </div>

                <div class="analysis-section">
                    <h4>Network Position</h4>
                    <div class="position-info">
                        <div>X: ${neuron.position.x.toFixed(2)}</div>
                        <div>Y: ${neuron.position.y.toFixed(2)}</div>
                        <div>Layer: ${neuron.depth}</div>
                    </div>
                </div>
            </div>
        `;
    }

    highlightNeuron(neuron) {
        // Remove previous highlights
        d3.selectAll('.neuron').classed('selected', false);
        
        // Highlight selected neuron
        if (neuron) {
            d3.selectAll('.neuron')
                .filter(d => d.id === neuron.id)
                .classed('selected', true);
        }
    }

    analyzeData() {
        this.showNotification('Analyzing neural patterns...', 'info');
        
        setTimeout(() => {
            this.detectPatterns();
            this.generateInsights();
            this.updatePatternResults();
            this.showNotification('Analysis complete', 'success');
        }, 2000);
    }

    detectPatterns() {
        const patterns = [];

        // Detect recurring structures
        const typeGroups = {};
        this.neuralNetwork.neurons.forEach(neuron => {
            if (!typeGroups[neuron.type]) {
                typeGroups[neuron.type] = [];
            }
            typeGroups[neuron.type].push(neuron);
        });

        Object.entries(typeGroups).forEach(([type, neurons]) => {
            if (neurons.length > 1) {
                patterns.push({
                    type: 'recurring_type',
                    name: `Recurring ${type} nodes`,
                    count: neurons.length,
                    confidence: neurons.length / this.neuralNetwork.neurons.length,
                    neurons: neurons
                });
            }
        });

        // Detect clustering patterns
        const clusters = this.detectClusters();
        clusters.forEach(cluster => {
            patterns.push({
                type: 'cluster',
                name: `Data cluster (${cluster.neurons.length} nodes)`,
                count: cluster.neurons.length,
                confidence: cluster.density,
                neurons: cluster.neurons
            });
        });

        this.neuralNetwork.patterns = patterns;
    }

    detectClusters() {
        const clusters = [];
        const visited = new Set();

        this.neuralNetwork.neurons.forEach(neuron => {
            if (visited.has(neuron.id)) return;

            const cluster = {
                neurons: [neuron],
                density: 0
            };

            // Find nearby neurons
            this.neuralNetwork.neurons.forEach(other => {
                if (other.id !== neuron.id && !visited.has(other.id)) {
                    const distance = Math.sqrt(
                        Math.pow(neuron.position.x - other.position.x, 2) +
                        Math.pow(neuron.position.y - other.position.y, 2)
                    );

                    if (distance < 100) {
                        cluster.neurons.push(other);
                    }
                }
            });

            if (cluster.neurons.length > 2) {
                cluster.density = cluster.neurons.length / 10; // Normalize
                clusters.push(cluster);
                cluster.neurons.forEach(n => visited.add(n.id));
            }
        });

        return clusters;
    }

    generateInsights() {
        const insights = [];
        const { neurons, synapses } = this.neuralNetwork;

        // Network structure insights
        insights.push({
            type: 'structure',
            title: 'Network Architecture',
            description: `The neural network consists of ${neurons.length} neurons organized in ${this.getMaxDepth()} layers with ${synapses.length} synaptic connections.`,
            confidence: 0.95
        });

        // Activation patterns
        const activeNeurons = neurons.filter(n => n.activation > 0.5);
        const inactiveNeurons = neurons.filter(n => n.activation < -0.5);
        
        if (activeNeurons.length > 0) {
            insights.push({
                type: 'activation',
                title: 'High Activation Detected',
                description: `${activeNeurons.length} neurons show high activation levels, indicating important data nodes or frequent access patterns.`,
                confidence: 0.8
            });
        }

        // Data distribution
        const typeDistribution = this.getTypeDistribution();
        const dominantType = Object.entries(typeDistribution)
            .sort(([,a], [,b]) => b - a)[0];

        if (dominantType) {
            insights.push({
                type: 'distribution',
                title: 'Data Type Distribution',
                description: `The network is dominated by ${dominantType[0]} type neurons (${dominantType[1]} nodes), suggesting ${this.getTypeCharacteristics(dominantType[0])}.`,
                confidence: 0.85
            });
        }

        this.neuralNetwork.insights = insights;
        this.updateInsightsPanel();
    }

    getMaxDepth() {
        return Math.max(...this.neuralNetwork.neurons.map(n => n.depth)) + 1;
    }

    getTypeDistribution() {
        const distribution = {};
        this.neuralNetwork.neurons.forEach(neuron => {
            distribution[neuron.type] = (distribution[neuron.type] || 0) + 1;
        });
        return distribution;
    }

    getTypeCharacteristics(type) {
        const characteristics = {
            string: 'text-heavy data structures',
            number: 'numerical computation focus',
            array: 'list-oriented data organization',
            object: 'complex hierarchical structures',
            boolean: 'binary decision patterns'
        };
        return characteristics[type] || 'mixed data patterns';
    }

    updateStats() {
        document.getElementById('nodeCount').textContent = this.neuralNetwork.neurons.length;
        document.getElementById('connectionCount').textContent = this.neuralNetwork.synapses.length;
        document.getElementById('layerCount').textContent = this.getMaxDepth();
        document.getElementById('accuracyScore').textContent = this.calculateAccuracy() + '%';
    }

    calculateAccuracy() {
        // Simulate accuracy based on network complexity and patterns
        const complexity = this.neuralNetwork.neurons.length / 100;
        const patternScore = this.neuralNetwork.patterns.length / 10;
        return Math.min(100, Math.round((complexity + patternScore) * 50 + 50));
    }

    updatePatternResults() {
        const container = document.getElementById('patternResults');
        const patterns = this.neuralNetwork.patterns;

        if (patterns.length === 0) {
            container.innerHTML = '<p>No patterns detected yet. Click "Scan for Patterns" to analyze.</p>';
            return;
        }

        container.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <div class="pattern-header">
                    <span class="pattern-name">${pattern.name}</span>
                    <span class="pattern-confidence">${(pattern.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="pattern-details">
                    <span class="pattern-count">${pattern.count} instances</span>
                    <span class="pattern-type">${pattern.type}</span>
                </div>
            </div>
        `).join('');
    }

    updateInsightsPanel() {
        const container = document.getElementById('aiInsights');
        const insights = this.neuralNetwork.insights;

        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-header">
                    <i class="fas fa-lightbulb"></i>
                    <span class="insight-title">${insight.title}</span>
                    <span class="insight-confidence">${(insight.confidence * 100).toFixed(0)}%</span>
                </div>
                <p class="insight-description">${insight.description}</p>
                <div class="insight-type">${insight.type}</div>
            </div>
        `).join('');
    }

    startTraining() {
        if (this.isTraining) return;

        this.isTraining = true;
        this.trainingProgress = 0;
        document.getElementById('trainingModal').classList.add('show');
        
        this.runTrainingSimulation();
    }

    runTrainingSimulation() {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.getElementById('trainingProgress');
        const epochText = document.getElementById('currentEpoch');
        const lossText = document.getElementById('currentLoss');
        const accuracyText = document.getElementById('currentAccuracy');

        let epoch = 0;
        const maxEpochs = 100;

        const trainingInterval = setInterval(() => {
            epoch++;
            this.trainingProgress = (epoch / maxEpochs) * 100;
            
            // Update UI
            const circumference = 2 * Math.PI * 40;
            const offset = circumference - (this.trainingProgress / 100) * circumference;
            progressBar.style.strokeDashoffset = offset;
            progressText.textContent = Math.round(this.trainingProgress) + '%';
            
            epochText.textContent = epoch;
            lossText.textContent = (Math.random() * 0.1).toFixed(3);
            accuracyText.textContent = Math.min(100, 50 + epoch * 0.5).toFixed(1) + '%';

            // Add training log entry
            this.addTrainingLogEntry(`Epoch ${epoch}: Loss decreased, accuracy improved`);

            // Update neuron activations
            this.updateNeuronActivations();

            if (epoch >= maxEpochs || !this.isTraining) {
                clearInterval(trainingInterval);
                this.isTraining = false;
                this.showNotification('Training completed successfully', 'success');
            }
        }, 100);
    }

    updateNeuronActivations() {
        this.neuralNetwork.neurons.forEach(neuron => {
            // Simulate learning by adjusting activations
            neuron.activation += (Math.random() - 0.5) * 0.01;
            neuron.activation = Math.max(-1, Math.min(1, neuron.activation));
        });
    }

    addTrainingLogEntry(message) {
        const logContent = document.querySelector('.log-content');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    // Event Handlers
    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.querySelectorAll('.inspector-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchInspectorTab(tab);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    switchInspectorTab(tabName) {
        document.querySelectorAll('.inspector-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.inspector-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}Inspector`).classList.add('active');
    }

    setupFilterControls() {
        const filters = ['showPrimitives', 'showObjects', 'showArrays', 'showConnections'];
        
        filters.forEach(filterId => {
            document.getElementById(filterId).addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        // Filter implementation
        this.renderCurrentMode();
        this.showNotification('Filters applied', 'info');
    }

    showDataLoadOptions() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.setData(data);
                    this.showNotification('Neural network data loaded', 'success');
                } catch (error) {
                    this.showNotification('Invalid JSON file', 'error');
                }
            }
        };
        input.click();
    }

    // Utility Methods
    showLoadingState() {
        document.getElementById('neuralLoading').style.display = 'flex';
    }

    hideLoadingState() {
        document.getElementById('neuralLoading').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('neuralEmpty').style.display = 'flex';
    }

    hideEmptyState() {
        document.getElementById('neuralEmpty').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `neural-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            background: var(--neural-gradient);
            box-shadow: var(--neural-shadow);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    handleResize() {
        this.visualization.width = document.getElementById('networkView').clientWidth;
        this.visualization.height = document.getElementById('networkView').clientHeight;
        
        if (this.visualization.svg) {
            this.visualization.svg
                .attr('width', this.visualization.width)
                .attr('height', this.visualization.height);
        }
        
        this.renderCurrentMode();
    }

    // Context Menu and Other Methods
    handleContextMenu(e) {
        if (e.target.classList.contains('neuron')) {
            e.preventDefault();
            this.showNeuronContextMenu(e, this.selectedNeuron);
        }
    }

    showNeuronContextMenu(event, neuron) {
        const menu = document.getElementById('neuralContextMenu');
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.classList.add('show');
        
        // Store selected neuron for context actions
        this.contextNeuron = neuron;
    }

    hideContextMenu() {
        document.getElementById('neuralContextMenu').classList.remove('show');
    }

    showTooltip(event, neuron) {
        const tooltip = document.getElementById('neuralTooltip');
        
        tooltip.querySelector('.tooltip-title').textContent = neuron.path;
        tooltip.querySelector('.tooltip-type').textContent = neuron.type;
        tooltip.querySelector('.tooltip-value').textContent = JSON.stringify(neuron.data);
        tooltip.querySelector('.tooltip-connections').textContent = `${neuron.children.length} connections`;
        
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        document.getElementById('neuralTooltip').classList.remove('show');
    }

    // Animation controls
    playAnimation() {
        this.animateActiveNeurons();
        this.createNeuralParticles();
    }

    pauseAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    // Zoom controls
    zoomIn() {
        if (this.visualization.zoom) {
            this.visualization.svg.transition().call(
                this.visualization.zoom.scaleBy, 1.5
            );
        }
    }

    zoomOut() {
        if (this.visualization.zoom) {
            this.visualization.svg.transition().call(
                this.visualization.zoom.scaleBy, 1 / 1.5
            );
        }
    }

    resetZoom() {
        if (this.visualization.zoom) {
            this.visualization.svg.transition().call(
                this.visualization.zoom.transform,
                d3.zoomIdentity
            );
        }
    }

    generateFlowPaths() {
        // Generate SVG paths for flow visualization
        return [];
    }
}

// Global functions for HTML event handlers
function scanPatterns() {
    neuralViz.analyzeData();
}

function activateNeuron() {
    if (neuralViz.contextNeuron) {
        neuralViz.contextNeuron.activation = 1;
        neuralViz.renderCurrentMode();
        neuralViz.showNotification('Neuron activated', 'success');
    }
}

function traceConnections() {
    neuralViz.showNotification('Tracing neural connections...', 'info');
}

function isolateCluster() {
    neuralViz.showNotification('Isolating neural cluster...', 'info');
}

function analyzeNeuron() {
    if (neuralViz.contextNeuron) {
        neuralViz.selectNeuron(neuralViz.contextNeuron);
    }
}

function exportNeuron() {
    neuralViz.showNotification('Export feature coming soon', 'info');
}

function pauseTraining() {
    neuralViz.isTraining = false;
    neuralViz.showNotification('Training paused', 'warning');
}

function stopTraining() {
    neuralViz.isTraining = false;
    document.getElementById('trainingModal').classList.remove('show');
    neuralViz.showNotification('Training stopped', 'info');
}

// Initialize the neural network visualizer
const neuralViz = new NeuralNetworkVisualizer();

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    neuralViz.init();
});

// Add animation keyframes to CSS
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

    .neural-layer {
        margin-bottom: 2rem;
        background: var(--neural-card);
        border-radius: var(--neural-radius);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .layer-header {
        padding: 1rem 1.5rem;
        background: var(--neural-surface);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .layer-header h4 {
        color: var(--neural-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .neuron-count {
        color: var(--neural-text-dim);
        font-size: 0.875rem;
    }

    .layer-neurons {
        padding: 1.5rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    .layer-neuron {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--neural-panel);
        border-radius: var(--neural-radius);
        cursor: pointer;
        transition: var(--neural-transition);
        border: 1px solid transparent;
    }

    .layer-neuron:hover {
        border-color: var(--neural-primary);
        box-shadow: var(--neural-glow) var(--neural-primary);
    }

    .neuron-visual {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .neuron-info {
        flex: 1;
    }

    .neuron-path {
        font-weight: 600;
        color: var(--neural-text);
        margin-bottom: 0.25rem;
        font-size: 0.875rem;
    }

    .neuron-activation {
        color: var(--neural-text-dim);
        font-size: 0.75rem;
    }

    .pattern-item {
        padding: 1rem;
        background: var(--neural-card);
        border-radius: var(--neural-radius);
        margin-bottom: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .pattern-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .pattern-name {
        font-weight: 600;
        color: var(--neural-primary);
    }

    .pattern-confidence {
        background: var(--neural-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 600;
    }

    .pattern-details {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: var(--neural-text-dim);
    }

    .insight-item {
        padding: 1.5rem;
        background: var(--neural-card);
        border-radius: var(--neural-radius);
        margin-bottom: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .insight-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .insight-title {
        flex: 1;
        font-weight: 600;
        color: var(--neural-primary);
    }

    .insight-confidence {
        background: var(--neural-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 600;
    }

    .insight-description {
        color: var(--neural-text);
        line-height: 1.6;
        margin-bottom: 0.5rem;
    }

    .insight-type {
        font-size: 0.75rem;
        color: var(--neural-text-dim);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;
document.head.appendChild(style);