// Global State and Configuration
class VisualInspector {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.currentView = 'graph';
        this.selectedNode = null;
        this.filters = {
            types: new Set(['string', 'number', 'boolean', 'array', 'object']),
            hideEmpty: true,
            hideNulls: false,
            maxDepth: 10
        };
        this.settings = {
            nodeSize: 8,
            linkStrength: 1,
            animationSpeed: 1,
            enablePhysics: true,
            enableAnimations: true,
            enableTooltips: true,
            theme: 'light'
        };
        this.visualization = {
            svg: null,
            simulation: null,
            nodes: [],
            links: [],
            zoom: null
        };
        this.threeScene = null;
        this.stats = {
            nodeCount: 0,
            linkCount: 0,
            maxDepth: 0
        };
    }

    init() {
        this.setupEventListeners();
        this.setupVisualization();
        this.loadDefaultData();
    }

    setupEventListeners() {
        // Data loading
        document.getElementById('loadDataBtn').addEventListener('click', () => {
            document.getElementById('loadDropdown').style.display = 
                document.getElementById('loadDropdown').style.display === 'block' ? 'none' : 'block';
        });

        // View switching
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('fitToScreen').addEventListener('click', () => this.fitToScreen());

        // Search
        document.getElementById('nodeSearch').addEventListener('input', (e) => {
            this.searchNodes(e.target.value);
        });
        document.getElementById('clearSearch').addEventListener('click', () => {
            document.getElementById('nodeSearch').value = '';
            this.clearSearch();
        });

        // Filters
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Settings
        document.getElementById('nodeSizeRange').addEventListener('input', (e) => {
            this.settings.nodeSize = parseFloat(e.target.value);
            this.updateVisualization();
        });

        document.getElementById('linkStrengthRange').addEventListener('input', (e) => {
            this.settings.linkStrength = parseFloat(e.target.value);
            this.updateVisualization();
        });

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.visualization-container')) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Close events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
                this.hideModals();
            }
        });
    }

    async loadDefaultData() {
        try {
            const response = await fetch('../data/data.json');
            const data = await response.json();
            this.setData(data);
            this.showNotification('Default data loaded successfully', 'success');
        } catch (error) {
            console.log('No default data available');
            this.showEmptyState();
        }
    }

    setData(data) {
        this.rawData = data;
        this.processedData = this.processDataForVisualization(data);
        this.updateStats();
        this.renderCurrentView();
        this.updateHierarchy();
    }

    processDataForVisualization(data, path = '', depth = 0) {
        const nodes = [];
        const links = [];
        const idCounter = { value: 0 };

        const processNode = (obj, currentPath, currentDepth, parentId = null) => {
            const nodeId = `node_${idCounter.value++}`;
            const nodeType = this.getDataType(obj);
            
            // Create node
            const node = {
                id: nodeId,
                data: obj,
                path: currentPath,
                depth: currentDepth,
                type: nodeType,
                label: this.getNodeLabel(obj, currentPath),
                size: this.calculateNodeSize(obj),
                color: this.getNodeColor(nodeType),
                parentId: parentId
            };

            // Apply filters
            if (!this.shouldShowNode(node)) {
                return { nodes: [], links: [] };
            }

            nodes.push(node);

            // Create link to parent
            if (parentId !== null) {
                links.push({
                    id: `link_${parentId}_${nodeId}`,
                    source: parentId,
                    target: nodeId,
                    type: 'parent-child',
                    strength: this.settings.linkStrength
                });
            }

            // Process children
            if (typeof obj === 'object' && obj !== null && currentDepth < this.filters.maxDepth) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        const childPath = `${currentPath}[${index}]`;
                        const childResult = processNode(item, childPath, currentDepth + 1, nodeId);
                        nodes.push(...childResult.nodes);
                        links.push(...childResult.links);
                    });
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        const childPath = currentPath ? `${currentPath}.${key}` : key;
                        const childResult = processNode(value, childPath, currentDepth + 1, nodeId);
                        nodes.push(...childResult.nodes);
                        links.push(...childResult.links);
                    });
                }
            }

            return { nodes: [], links: [] };
        };

        const result = processNode(data, path, depth);
        
        // Ensure we include the root node
        processNode(data, '', 0);

        return { nodes, links };
    }

    getDataType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    getNodeLabel(data, path) {
        if (path === '') return 'root';
        const parts = path.split(/[.\[\]]+/).filter(Boolean);
        const lastPart = parts[parts.length - 1];
        
        if (typeof data === 'object' && data !== null) {
            const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
            return `${lastPart} (${itemCount})`;
        }
        
        if (typeof data === 'string' && data.length > 20) {
            return `${lastPart}: "${data.substring(0, 17)}..."`;
        }
        
        return `${lastPart}: ${JSON.stringify(data)}`;
    }

    calculateNodeSize(data) {
        const baseSize = this.settings.nodeSize;
        if (typeof data === 'object' && data !== null) {
            const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
            return Math.max(baseSize, Math.min(baseSize * 2, baseSize + Math.log(itemCount + 1) * 2));
        }
        return baseSize;
    }

    getNodeColor(type) {
        const colors = {
            string: '#3b82f6',
            number: '#10b981',
            boolean: '#f59e0b',
            array: '#8b5cf6',
            object: '#ec4899',
            null: '#6b7280'
        };
        return colors[type] || colors.string;
    }

    shouldShowNode(node) {
        // Type filter
        if (!this.filters.types.has(node.type)) {
            return false;
        }

        // Empty value filter
        if (this.filters.hideEmpty && this.isEmpty(node.data)) {
            return false;
        }

        // Null filter
        if (this.filters.hideNulls && node.data === null) {
            return false;
        }

        // Depth filter
        if (node.depth > this.filters.maxDepth) {
            return false;
        }

        return true;
    }

    isEmpty(value) {
        return value === '' || 
               value === false || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
    }

    updateStats() {
        if (this.processedData) {
            this.stats.nodeCount = this.processedData.nodes.length;
            this.stats.linkCount = this.processedData.links.length;
            this.stats.maxDepth = Math.max(...this.processedData.nodes.map(n => n.depth));
            
            document.getElementById('nodeCount').textContent = this.stats.nodeCount;
            document.getElementById('linkCount').textContent = this.stats.linkCount;
            document.getElementById('depthLevel').textContent = this.stats.maxDepth;
        }
    }

    setupVisualization() {
        this.setupGraphView();
        this.setupTreeView();
        this.setupForceView();
        this.setupMatrixView();
        this.setup3DView();
    }

    setupGraphView() {
        const svg = d3.select('#graphSvg');
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;

        // Clear existing content
        svg.selectAll('*').remove();

        // Setup zoom
        this.visualization.zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                svg.select('.graph-container').attr('transform', event.transform);
            });

        svg.call(this.visualization.zoom);

        // Create main container
        const container = svg.append('g').attr('class', 'graph-container');
        
        // Create groups for links and nodes
        container.append('g').attr('class', 'links');
        container.append('g').attr('class', 'nodes');

        this.visualization.svg = svg;
    }

    setupTreeView() {
        const svg = d3.select('#treeSvg');
        svg.selectAll('*').remove();
        
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;
        
        const container = svg.append('g').attr('class', 'tree-container');
        container.append('g').attr('class', 'links');
        container.append('g').attr('class', 'nodes');
    }

    setupForceView() {
        const svg = d3.select('#forceSvg');
        svg.selectAll('*').remove();
        
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;
        
        // Create force simulation
        this.visualization.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).strength(this.settings.linkStrength))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 2));

        const container = svg.append('g').attr('class', 'force-container');
        container.append('g').attr('class', 'links');
        container.append('g').attr('class', 'nodes');
    }

    setupMatrixView() {
        const container = d3.select('#matrixContainer');
        container.selectAll('*').remove();
    }

    setup3DView() {
        if (typeof THREE === 'undefined') return;
        
        const container = document.getElementById('threeContainer');
        container.innerHTML = '';

        // Setup Three.js scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        scene.add(directionalLight);

        camera.position.set(0, 0, 100);

        this.threeScene = { scene, camera, renderer, container };
    }

    switchView(viewName) {
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update active view
        document.querySelectorAll('.viz-view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');

        this.currentView = viewName;
        document.getElementById('currentViewType').textContent = 
            viewName.charAt(0).toUpperCase() + viewName.slice(1) + ' View';
        
        this.renderCurrentView();
    }

    renderCurrentView() {
        if (!this.processedData) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyStates();
        
        switch (this.currentView) {
            case 'graph':
                this.renderGraphView();
                break;
            case 'tree':
                this.renderTreeView();
                break;
            case 'force':
                this.renderForceView();
                break;
            case 'matrix':
                this.renderMatrixView();
                break;
            case '3d':
                this.render3DView();
                break;
        }
    }

    renderGraphView() {
        const svg = this.visualization.svg;
        const container = svg.select('.graph-container');
        const { nodes, links } = this.processedData;

        // Create hierarchical layout
        const root = d3.hierarchy({ children: this.buildHierarchy(nodes) });
        const treeLayout = d3.tree()
            .size([svg.node().clientHeight - 100, svg.node().clientWidth - 100]);
        
        treeLayout(root);

        // Update links
        const linkSelection = container.select('.links')
            .selectAll('.link')
            .data(links, d => d.id);

        linkSelection.exit().remove();

        const linkEnter = linkSelection.enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1);

        linkSelection.merge(linkEnter)
            .attr('x1', d => {
                const sourceNode = nodes.find(n => n.id === d.source);
                return sourceNode ? sourceNode.x || 0 : 0;
            })
            .attr('y1', d => {
                const sourceNode = nodes.find(n => n.id === d.source);
                return sourceNode ? sourceNode.y || 0 : 0;
            })
            .attr('x2', d => {
                const targetNode = nodes.find(n => n.id === d.target);
                return targetNode ? targetNode.x || 0 : 0;
            })
            .attr('y2', d => {
                const targetNode = nodes.find(n => n.id === d.target);
                return targetNode ? targetNode.y || 0 : 0;
            });

        // Update nodes
        const nodeSelection = container.select('.nodes')
            .selectAll('.node')
            .data(nodes, d => d.id);

        nodeSelection.exit().remove();

        const nodeEnter = nodeSelection.enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d))
            );

        nodeEnter.append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('dy', '.35em')
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#2d3748')
            .text(d => this.getTruncatedLabel(d.label, 15));

        const nodeUpdate = nodeSelection.merge(nodeEnter);

        nodeUpdate
            .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
            .on('click', (event, d) => this.selectNode(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Position nodes in hierarchy
        root.descendants().forEach((d, i) => {
            if (nodes[i]) {
                nodes[i].x = d.y + 50;
                nodes[i].y = d.x + 50;
            }
        });

        nodeUpdate.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
    }

    renderForceView() {
        const svg = d3.select('#forceSvg');
        const container = svg.select('.force-container');
        const { nodes, links } = this.processedData;

        // Update simulation
        this.visualization.simulation
            .nodes(nodes)
            .force('link').links(links);

        // Update links
        const linkSelection = container.select('.links')
            .selectAll('.link')
            .data(links, d => d.id);

        linkSelection.exit().remove();

        const linkEnter = linkSelection.enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', d => Math.sqrt(d.strength || 1));

        const linkUpdate = linkSelection.merge(linkEnter);

        // Update nodes
        const nodeSelection = container.select('.nodes')
            .selectAll('.node')
            .data(nodes, d => d.id);

        nodeSelection.exit().remove();

        const nodeEnter = nodeSelection.enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) this.visualization.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) this.visualization.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );

        nodeEnter.append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        const nodeUpdate = nodeSelection.merge(nodeEnter);

        nodeUpdate
            .on('click', (event, d) => this.selectNode(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Update positions on tick
        this.visualization.simulation.on('tick', () => {
            linkUpdate
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodeUpdate.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        this.visualization.simulation.alpha(1).restart();
    }

    renderTreeView() {
        const svg = d3.select('#treeSvg');
        const container = svg.select('.tree-container');
        const { nodes } = this.processedData;

        const hierarchy = this.buildHierarchy(nodes);
        const root = d3.hierarchy(hierarchy);

        const treeLayout = d3.tree()
            .size([svg.node().clientHeight - 100, svg.node().clientWidth - 100]);
        
        treeLayout(root);

        // Render links
        const links = root.links();
        const linkSelection = container.select('.links')
            .selectAll('.link')
            .data(links);

        linkSelection.exit().remove();

        const linkEnter = linkSelection.enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1);

        linkSelection.merge(linkEnter)
            .attr('d', d3.linkHorizontal()
                .x(d => d.y + 50)
                .y(d => d.x + 50)
            );

        // Render nodes
        const nodeSelection = container.select('.nodes')
            .selectAll('.node')
            .data(root.descendants());

        nodeSelection.exit().remove();

        const nodeEnter = nodeSelection.enter()
            .append('g')
            .attr('class', 'node');

        nodeEnter.append('circle')
            .attr('r', 6)
            .attr('fill', d => this.getNodeColor(this.getDataType(d.data.data || d.data)))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        nodeEnter.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children ? -10 : 10)
            .style('text-anchor', d => d.children ? 'end' : 'start')
            .style('font-size', '10px')
            .text(d => this.getTruncatedLabel(d.data.label || String(d.data), 20));

        const nodeUpdate = nodeSelection.merge(nodeEnter);

        nodeUpdate
            .attr('transform', d => `translate(${d.y + 50}, ${d.x + 50})`)
            .on('click', (event, d) => this.selectNode(d.data))
            .on('mouseover', (event, d) => this.showTooltip(event, d.data))
            .on('mouseout', () => this.hideTooltip());
    }

    renderMatrixView() {
        const container = d3.select('#matrixContainer');
        const { nodes } = this.processedData;

        // Create a simple grid layout
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        const cellSize = Math.min(
            container.node().clientWidth / gridSize,
            container.node().clientHeight / gridSize
        ) - 2;

        const svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

        const cells = svg.selectAll('.cell')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'cell')
            .attr('transform', (d, i) => {
                const x = (i % gridSize) * (cellSize + 2);
                const y = Math.floor(i / gridSize) * (cellSize + 2);
                return `translate(${x}, ${y})`;
            });

        cells.append('rect')
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('click', (event, d) => this.selectNode(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        cells.append('text')
            .attr('x', cellSize / 2)
            .attr('y', cellSize / 2)
            .attr('dy', '.35em')
            .style('text-anchor', 'middle')
            .style('font-size', Math.min(cellSize / 8, 10) + 'px')
            .style('fill', 'white')
            .text(d => this.getTruncatedLabel(d.label, Math.floor(cellSize / 8)));
    }

    render3DView() {
        if (!this.threeScene) return;

        const { scene, camera, renderer } = this.threeScene;
        const { nodes } = this.processedData;

        // Clear existing objects
        scene.children = scene.children.filter(child => 
            child.type === 'AmbientLight' || child.type === 'DirectionalLight'
        );

        // Create 3D nodes
        nodes.forEach((node, i) => {
            const geometry = new THREE.SphereGeometry(node.size / 4, 16, 16);
            const material = new THREE.MeshPhongMaterial({ 
                color: node.color,
                transparent: true,
                opacity: 0.8
            });
            const sphere = new THREE.Mesh(geometry, material);

            // Position nodes in 3D space
            const radius = 50;
            const phi = Math.acos(-1 + (2 * i) / nodes.length);
            const theta = Math.sqrt(nodes.length * Math.PI) * phi;

            sphere.position.x = radius * Math.cos(theta) * Math.sin(phi);
            sphere.position.y = radius * Math.sin(theta) * Math.sin(phi);
            sphere.position.z = radius * Math.cos(phi);

            sphere.userData = node;
            scene.add(sphere);
        });

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            scene.rotation.y += 0.005;
            renderer.render(scene, camera);
        };

        animate();
    }

    buildHierarchy(nodes) {
        const nodeMap = new Map();
        const roots = [];

        // Create node map
        nodes.forEach(node => {
            nodeMap.set(node.id, { ...node, children: [] });
        });

        // Build hierarchy
        nodes.forEach(node => {
            const nodeObj = nodeMap.get(node.id);
            if (node.parentId && nodeMap.has(node.parentId)) {
                nodeMap.get(node.parentId).children.push(nodeObj);
            } else {
                roots.push(nodeObj);
            }
        });

        return roots.length === 1 ? roots[0] : { children: roots };
    }

    selectNode(node) {
        this.selectedNode = node;
        this.updateSelectedNodeInfo(node);
        this.updateDetailsPanel(node);
        this.highlightNode(node);
    }

    updateSelectedNodeInfo(node) {
        const info = document.getElementById('selectedNodeInfo');
        if (node) {
            info.textContent = `Selected: ${node.path || 'root'} (${node.type})`;
        } else {
            info.textContent = 'Select a node to view details';
        }
    }

    updateDetailsPanel(node) {
        const content = document.getElementById('detailsContent');
        const title = document.getElementById('detailsTitle');

        if (!node) {
            content.innerHTML = `
                <div class="detail-empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <h4>Select a Node</h4>
                    <p>Click on any node to view details</p>
                </div>
            `;
            return;
        }

        title.innerHTML = `<i class="fas fa-info-circle"></i> ${node.path || 'Root'}`;

        content.innerHTML = `
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Path:</span>
                        <span class="value">${node.path || 'root'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Type:</span>
                        <span class="value">
                            <span class="type-badge type-${node.type}">${node.type}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Depth:</span>
                        <span class="value">${node.depth}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Size:</span>
                        <span class="value">${node.size}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Value</h4>
                <div class="detail-value">
                    <pre>${JSON.stringify(node.data, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    highlightNode(node) {
        // Remove previous highlights
        document.querySelectorAll('.node.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add highlight to selected node
        if (node) {
            document.querySelectorAll('.node').forEach(nodeEl => {
                const nodeData = d3.select(nodeEl).datum();
                if (nodeData && nodeData.id === node.id) {
                    nodeEl.classList.add('selected');
                }
            });
        }
    }

    showTooltip(event, node) {
        if (!this.settings.enableTooltips) return;

        const tooltip = document.getElementById('tooltip');
        const rect = event.target.getBoundingClientRect();

        tooltip.querySelector('.tooltip-title').textContent = node.label;
        tooltip.querySelector('.tooltip-type').textContent = node.type;
        tooltip.querySelector('.tooltip-value').textContent = JSON.stringify(node.data);
        tooltip.querySelector('.tooltip-path').textContent = node.path;

        tooltip.style.left = rect.right + 10 + 'px';
        tooltip.style.top = rect.top + 'px';
        tooltip.classList.remove('hidden');
    }

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
    }

    hideContextMenu() {
        document.getElementById('contextMenu').classList.add('hidden');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    searchNodes(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }

        const matchingNodes = this.processedData.nodes.filter(node => {
            const searchIn = {
                keys: document.getElementById('searchKeys').checked,
                values: document.getElementById('searchValues').checked,
                paths: document.getElementById('searchPaths').checked
            };

            const searchText = query.toLowerCase();
            
            if (searchIn.keys && node.label.toLowerCase().includes(searchText)) {
                return true;
            }
            
            if (searchIn.values && JSON.stringify(node.data).toLowerCase().includes(searchText)) {
                return true;
            }
            
            if (searchIn.paths && node.path.toLowerCase().includes(searchText)) {
                return true;
            }
            
            return false;
        });

        this.highlightSearchResults(matchingNodes);
    }

    highlightSearchResults(nodes) {
        // Remove previous search highlights
        document.querySelectorAll('.node.search-highlight').forEach(el => {
            el.classList.remove('search-highlight');
        });

        // Add search highlights
        nodes.forEach(node => {
            document.querySelectorAll('.node').forEach(nodeEl => {
                const nodeData = d3.select(nodeEl).datum();
                if (nodeData && nodeData.id === node.id) {
                    nodeEl.classList.add('search-highlight');
                }
            });
        });
    }

    clearSearch() {
        document.querySelectorAll('.node.search-highlight').forEach(el => {
            el.classList.remove('search-highlight');
        });
    }

    applyFilters() {
        // Update filter settings
        this.filters.types.clear();
        ['showStrings', 'showNumbers', 'showBooleans', 'showArrays', 'showObjects', 'showNulls'].forEach(id => {
            if (document.getElementById(id).checked) {
                const type = id.replace('show', '').toLowerCase().slice(0, -1);
                this.filters.types.add(type === 'string' ? 'string' : 
                                      type === 'number' ? 'number' : 
                                      type === 'boolean' ? 'boolean' : 
                                      type === 'array' ? 'array' : 
                                      type === 'object' ? 'object' : 'null');
            }
        });

        this.filters.hideEmpty = document.getElementById('hideEmpty').checked;
        this.filters.hideNulls = document.getElementById('hideNulls').checked;
        this.filters.maxDepth = parseInt(document.getElementById('depthRange').value);

        // Reprocess data with new filters
        if (this.rawData) {
            this.processedData = this.processDataForVisualization(this.rawData);
            this.updateStats();
            this.renderCurrentView();
        }

        this.showNotification('Filters applied', 'success');
    }

    resetFilters() {
        // Reset filter controls
        document.getElementById('showStrings').checked = true;
        document.getElementById('showNumbers').checked = true;
        document.getElementById('showBooleans').checked = true;
        document.getElementById('showArrays').checked = true;
        document.getElementById('showObjects').checked = true;
        document.getElementById('showNulls').checked = false;
        document.getElementById('hideEmpty').checked = true;
        document.getElementById('hideNulls').checked = false;
        document.getElementById('depthRange').value = 10;

        this.applyFilters();
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    updateHierarchy() {
        const hierarchy = document.getElementById('dataHierarchy');
        if (!this.rawData) {
            hierarchy.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sitemap"></i>
                    <p>Load data to explore structure</p>
                </div>
            `;
            return;
        }

        hierarchy.innerHTML = this.buildHierarchyHTML(this.rawData, '', 0);
    }

    buildHierarchyHTML(data, path = '', depth = 0) {
        const indent = '  '.repeat(depth);
        const type = this.getDataType(data);
        const color = this.getNodeColor(type);
        
        let html = `<div class="hierarchy-item" style="margin-left: ${depth * 1rem}px;">`;
        html += `<span class="hierarchy-icon" style="color: ${color};">`;
        
        if (typeof data === 'object' && data !== null) {
            html += '<i class="fas fa-chevron-down"></i>';
        } else {
            html += '<i class="fas fa-circle"></i>';
        }
        
        html += '</span>';
        html += `<span class="hierarchy-label">${path || 'root'}</span>`;
        html += `<span class="type-badge type-${type}">${type}</span>`;
        html += '</div>';

        if (typeof data === 'object' && data !== null && depth < 5) {
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    const itemPath = `[${index}]`;
                    html += this.buildHierarchyHTML(item, itemPath, depth + 1);
                });
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    const itemPath = path ? `${path}.${key}` : key;
                    html += this.buildHierarchyHTML(value, itemPath, depth + 1);
                });
            }
        }

        return html;
    }

    showEmptyState() {
        document.querySelectorAll('.empty-state').forEach(state => {
            state.style.display = 'flex';
        });
    }

    hideEmptyStates() {
        document.querySelectorAll('.empty-state').forEach(state => {
            state.style.display = 'none';
        });
    }

    updateVisualization() {
        if (this.processedData) {
            this.renderCurrentView();
        }
    }

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

    resetView() {
        if (this.visualization.zoom) {
            this.visualization.svg.transition().call(
                this.visualization.zoom.transform,
                d3.zoomIdentity
            );
        }
    }

    fitToScreen() {
        // Implementation for fitting content to screen
        this.resetView();
    }

    getTruncatedLabel(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 600;
            z-index: 9999;
            animation: slideInRight 0.3s ease-out;
        `;
        
        const colors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            info: 'var(--info)'
        };
        
        notification.style.backgroundColor = colors[type];
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Drag handlers
    dragStarted(event, d) {
        if (!event.active && this.visualization.simulation) {
            this.visualization.simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active && this.visualization.simulation) {
            this.visualization.simulation.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;
    }
}

// Global functions for HTML event handlers
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
                inspector.setData(data);
                inspector.showNotification('File loaded successfully', 'success');
            } catch (error) {
                inspector.showNotification('Invalid JSON file', 'error');
            }
        }
    };
    input.click();
}

function loadFromUrl() {
    const url = prompt('Enter JSON URL:');
    if (url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                inspector.setData(data);
                inspector.showNotification('Data loaded from URL', 'success');
            })
            .catch(error => {
                inspector.showNotification('Failed to load from URL', 'error');
            });
    }
}

function loadRawData() {
    // Implementation for raw data input modal
    inspector.showNotification('Raw data input modal coming soon', 'info');
}

function loadSampleData() {
    // Generate sample data
    const sampleData = {
        users: [
            { id: 1, name: "Alice", age: 30, active: true, scores: [85, 92, 78] },
            { id: 2, name: "Bob", age: 25, active: false, scores: [90, 88, 94] },
            { id: 3, name: "Charlie", age: 35, active: true, scores: [76, 82, 89] }
        ],
        settings: {
            theme: "dark",
            notifications: true,
            privacy: {
                shareData: false,
                analytics: true
            }
        },
        metadata: {
            version: "1.0.0",
            lastUpdated: "2025-01-15",
            features: ["users", "settings", "analytics"]
        }
    };
    
    inspector.setData(sampleData);
    inspector.showNotification('Sample data loaded', 'success');
}

// Context menu functions
function focusOnNode() {
    if (inspector.selectedNode) {
        inspector.showNotification('Focusing on node...', 'info');
    }
}

function expandNode() {
    inspector.showNotification('Node expanded', 'info');
}

function collapseNode() {
    inspector.showNotification('Node collapsed', 'info');
}

function copyNodeData() {
    if (inspector.selectedNode) {
        navigator.clipboard.writeText(JSON.stringify(inspector.selectedNode.data, null, 2));
        inspector.showNotification('Node data copied', 'success');
    }
}

function exportNode() {
    inspector.showNotification('Export feature coming soon', 'info');
}

function bookmarkNode() {
    inspector.showNotification('Bookmark feature coming soon', 'info');
}

// Initialize application
const inspector = new VisualInspector();

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    inspector.init();
});

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
    
    .hierarchy-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0;
        cursor: pointer;
        border-radius: 0.25rem;
        transition: var(--transition);
    }
    
    .hierarchy-item:hover {
        background: var(--bg-tertiary);
    }
    
    .hierarchy-icon {
        font-size: 0.75rem;
        width: 1rem;
    }
    
    .hierarchy-label {
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .detail-section {
        margin-bottom: 2rem;
    }
    
    .detail-section h4 {
        margin-bottom: 1rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
    }
    
    .detail-grid {
        display: grid;
        gap: 0.75rem;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: var(--bg-tertiary);
        border-radius: var(--radius);
    }
    
    .detail-item .label {
        font-weight: 500;
        color: var(--text-secondary);
    }
    
    .detail-item .value {
        color: var(--text-primary);
        font-family: var(--font-mono);
    }
    
    .detail-value {
        background: var(--bg-tertiary);
        padding: 1rem;
        border-radius: var(--radius);
        overflow-x: auto;
    }
    
    .detail-value pre {
        margin: 0;
        color: var(--text-primary);
        font-size: 0.8125rem;
    }
    
    .node.search-highlight circle {
        stroke: var(--warning) !important;
        stroke-width: 3px !important;
        filter: drop-shadow(0 0 6px var(--warning));
    }
`;
document.head.appendChild(style);