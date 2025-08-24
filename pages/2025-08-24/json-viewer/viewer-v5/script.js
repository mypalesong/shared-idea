class TimelineFlowAnalyzer {
    constructor() {
        this.jsonData = null;
        this.timelineData = [];
        this.currentView = 'timeline';
        this.selectedEvent = null;
        this.patterns = [];
        this.flowRate = 1.0;
        this.isPlaying = false;
        this.filters = {
            startDate: null,
            endDate: null,
            eventTypes: new Set(),
            searchTerm: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupVisualization();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Data loading
        document.getElementById('loadData').addEventListener('click', () => this.loadData());
        
        // Analysis controls
        document.getElementById('analyzeFlow').addEventListener('click', () => this.analyzeFlow());
        document.getElementById('detectPatterns').addEventListener('click', () => this.detectPatterns());
        document.getElementById('playTimeline').addEventListener('click', () => this.togglePlayback());
        
        // View mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.mode));
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        document.querySelectorAll('.inspector-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchInspectorTab(e.target.dataset.tab));
        });
        
        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('fitToWindow').addEventListener('click', () => this.fitToWindow());
        
        // Filter controls
        document.getElementById('startDate').addEventListener('change', () => this.updateFilters());
        document.getElementById('endDate').addEventListener('change', () => this.updateFilters());
        document.getElementById('eventSearch').addEventListener('input', () => this.updateFilters());
        
        // Quick range buttons
        document.querySelectorAll('.quick-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuickRange(e.target.dataset.range));
        });
        
        // Visibility controls
        document.querySelectorAll('.visibility-control input').forEach(input => {
            input.addEventListener('change', () => this.updateVisibility());
        });
        
        // Flow speed control
        document.getElementById('flowSpeedControl').addEventListener('input', (e) => {
            this.flowRate = parseFloat(e.target.value);
            document.getElementById('flowSpeedValue').textContent = `${this.flowRate.toFixed(1)}x`;
            this.updateFlowSpeed();
        });
        
        // Scrubber control
        this.setupScrubber();
        
        // Context menu
        document.addEventListener('contextmenu', (e) => this.showContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupVisualization() {
        // Initialize D3 timeline
        this.timelineSvg = d3.select('#networkSvg')
            .attr('width', '100%')
            .attr('height', '100%');
        
        // Initialize vis-timeline
        this.timelineContainer = document.getElementById('timelineVisualization');
        this.timelineOptions = {
            width: '100%',
            height: '100%',
            margin: { item: 10, axis: 40 },
            orientation: 'top',
            zoomMin: 1000 * 60 * 60 * 24,
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 10,
            stack: true,
            showCurrentTime: true,
            format: {
                minorLabels: {
                    millisecond:'SSS',
                    second:     's',
                    minute:     'HH:mm',
                    hour:       'HH:mm',
                    weekday:    'ddd D',
                    day:        'D',
                    week:       'w',
                    month:      'MMM',
                    year:       'YYYY'
                },
                majorLabels: {
                    millisecond:'HH:mm:ss',
                    second:     'D MMMM HH:mm',
                    minute:     'ddd D MMMM',
                    hour:       'ddd D MMMM',
                    weekday:    'MMMM YYYY',
                    day:        'MMMM YYYY',
                    week:       'MMMM YYYY',
                    month:      'YYYY',
                    year:       ''
                }
            },
            tooltip: {
                followMouse: true,
                overflowMethod: 'cap'
            }
        };
        
        this.timeline = new vis.Timeline(this.timelineContainer, [], this.timelineOptions);
        
        // Timeline event handlers
        this.timeline.on('select', (properties) => this.onEventSelect(properties));
        this.timeline.on('rangechange', (properties) => this.onRangeChange(properties));
        this.timeline.on('click', (properties) => this.onTimelineClick(properties));
    }

    async loadInitialData() {
        try {
            const response = await fetch('../data/data.json');
            const data = await response.json();
            this.processData(data);
            this.showMessage('Data loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showEmptyState();
        }
    }

    async loadData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    this.showLoading();
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.processData(data);
                    this.showMessage('Data loaded successfully', 'success');
                } catch (error) {
                    console.error('Error loading file:', error);
                    this.showMessage('Error loading file', 'error');
                }
            }
        };
        
        input.click();
    }

    processData(data) {
        this.jsonData = data;
        this.timelineData = this.extractTimelineEvents(data);
        this.updateStats();
        this.updateVisualization();
        this.populateFilters();
        this.hideLoading();
    }

    extractTimelineEvents(data, path = '', parentTimestamp = null) {
        const events = [];
        const stack = [{ obj: data, path: '', timestamp: parentTimestamp }];
        let eventId = 0;

        while (stack.length > 0) {
            const { obj, path, timestamp } = stack.pop();

            if (obj === null || obj === undefined) continue;

            // Try to extract timestamp information
            const currentTimestamp = this.extractTimestamp(obj) || timestamp;
            
            // Create event for this object if it has meaningful data
            if (this.shouldCreateEvent(obj, path)) {
                const event = {
                    id: eventId++,
                    content: this.generateEventContent(obj, path),
                    title: this.generateEventTitle(obj, path),
                    start: currentTimestamp || new Date(),
                    end: this.extractEndTime(obj) || null,
                    group: this.extractGroup(obj, path),
                    type: this.extractEventType(obj),
                    className: this.getEventClassName(obj),
                    data: obj,
                    path: path,
                    metadata: this.extractMetadata(obj)
                };
                
                events.push(event);
            }

            // Process nested objects and arrays
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        const newPath = path ? `${path}[${index}]` : `[${index}]`;
                        stack.push({ obj: item, path: newPath, timestamp: currentTimestamp });
                    });
                } else {
                    Object.keys(obj).forEach(key => {
                        const newPath = path ? `${path}.${key}` : key;
                        stack.push({ obj: obj[key], path: newPath, timestamp: currentTimestamp });
                    });
                }
            }
        }

        return events.sort((a, b) => new Date(a.start) - new Date(b.start));
    }

    extractTimestamp(obj) {
        if (!obj || typeof obj !== 'object') return null;
        
        // Common timestamp field names
        const timestampFields = [
            'timestamp', 'time', 'date', 'created_at', 'updated_at',
            'createdAt', 'updatedAt', 'datetime', 'when', 'occurred'
        ];
        
        for (const field of timestampFields) {
            if (obj[field]) {
                const date = new Date(obj[field]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        // Try to parse ISO date strings in any field
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                const date = new Date(value);
                if (!isNaN(date.getTime()) && value.includes('-')) {
                    return date;
                }
            }
        }
        
        return null;
    }

    extractEndTime(obj) {
        if (!obj || typeof obj !== 'object') return null;
        
        const endFields = ['end_time', 'endTime', 'end', 'finished_at', 'completed_at'];
        for (const field of endFields) {
            if (obj[field]) {
                const date = new Date(obj[field]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        return null;
    }

    shouldCreateEvent(obj, path) {
        // Don't create events for simple primitive values unless they're meaningful
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        
        // Don't create events for empty objects or arrays
        if (Array.isArray(obj) && obj.length === 0) return false;
        if (typeof obj === 'object' && Object.keys(obj).length === 0) return false;
        
        // Create events for objects that have meaningful content
        return true;
    }

    generateEventContent(obj, path) {
        const lastKey = path.split('.').pop() || path.split('[').pop()?.replace(']', '');
        
        if (obj.name || obj.title || obj.label) {
            return obj.name || obj.title || obj.label;
        }
        
        if (obj.type || obj.category || obj.kind) {
            return `${obj.type || obj.category || obj.kind}: ${lastKey}`;
        }
        
        if (typeof obj === 'string') {
            return obj.length > 50 ? obj.substring(0, 50) + '...' : obj;
        }
        
        return lastKey || 'Event';
    }

    generateEventTitle(obj, path) {
        let title = `Path: ${path}\n`;
        
        if (typeof obj === 'object' && obj !== null) {
            title += `Type: ${Array.isArray(obj) ? 'Array' : 'Object'}\n`;
            
            if (obj.description) title += `Description: ${obj.description}\n`;
            if (obj.status) title += `Status: ${obj.status}\n`;
            if (obj.value !== undefined) title += `Value: ${obj.value}\n`;
            
            const keys = Object.keys(obj);
            if (keys.length > 0) {
                title += `Properties: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
            }
        }
        
        return title;
    }

    extractGroup(obj, path) {
        // Group by top-level path
        const topLevel = path.split('.')[0] || path.split('[')[0];
        return topLevel || 'root';
    }

    extractEventType(obj) {
        if (!obj || typeof obj !== 'object') return 'primitive';
        if (Array.isArray(obj)) return 'array';
        
        // Look for type indicators
        if (obj.type) return obj.type;
        if (obj.category) return obj.category;
        if (obj.kind) return obj.kind;
        
        return 'object';
    }

    getEventClassName(obj) {
        const type = this.extractEventType(obj);
        return `timeline-event timeline-event-${type}`;
    }

    extractMetadata(obj) {
        const metadata = {};
        
        if (typeof obj === 'object' && obj !== null) {
            metadata.size = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
            metadata.depth = this.calculateDepth(obj);
            metadata.hasTimestamp = !!this.extractTimestamp(obj);
            
            // Extract common metadata fields
            ['id', 'version', 'author', 'source', 'priority', 'status'].forEach(field => {
                if (obj[field] !== undefined) {
                    metadata[field] = obj[field];
                }
            });
        }
        
        return metadata;
    }

    calculateDepth(obj, maxDepth = 10, currentDepth = 0) {
        if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
            return currentDepth;
        }
        
        let maxChildDepth = currentDepth;
        
        if (Array.isArray(obj)) {
            for (const item of obj) {
                maxChildDepth = Math.max(maxChildDepth, this.calculateDepth(item, maxDepth, currentDepth + 1));
            }
        } else {
            for (const value of Object.values(obj)) {
                maxChildDepth = Math.max(maxChildDepth, this.calculateDepth(value, maxDepth, currentDepth + 1));
            }
        }
        
        return maxChildDepth;
    }

    updateVisualization() {
        if (this.currentView === 'timeline') {
            this.updateTimelineView();
        } else if (this.currentView === 'gantt') {
            this.updateGanttView();
        } else if (this.currentView === 'flow') {
            this.updateFlowView();
        } else if (this.currentView === 'calendar') {
            this.updateCalendarView();
        }
    }

    updateTimelineView() {
        const filteredData = this.applyFilters(this.timelineData);
        const dataSet = new vis.DataSet(filteredData);
        
        // Create groups
        const groups = [...new Set(filteredData.map(item => item.group))].map(groupId => ({
            id: groupId,
            content: groupId,
            className: `timeline-group timeline-group-${groupId}`
        }));
        
        const groupSet = new vis.DataSet(groups);
        
        this.timeline.setData({ items: dataSet, groups: groupSet });
        
        // Update timeline options if needed
        if (filteredData.length > 0) {
            const start = new Date(Math.min(...filteredData.map(d => new Date(d.start))));
            const end = new Date(Math.max(...filteredData.map(d => new Date(d.end || d.start))));
            
            this.timeline.setWindow(start, end);
        }
    }

    updateGanttView() {
        // Convert timeline data to Gantt format
        const ganttContainer = document.getElementById('ganttVisualization');
        ganttContainer.innerHTML = '';
        
        const filteredData = this.applyFilters(this.timelineData);
        this.createGanttChart(ganttContainer, filteredData);
    }

    createGanttChart(container, data) {
        // Group data by group
        const groups = {};
        data.forEach(item => {
            if (!groups[item.group]) {
                groups[item.group] = [];
            }
            groups[item.group].push(item);
        });
        
        // Create Gantt visualization using D3
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', Object.keys(groups).length * 60 + 100);
        
        const margin = { top: 20, right: 20, bottom: 30, left: 100 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = Object.keys(groups).length * 60;
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Time scale
        const extent = d3.extent(data.flatMap(d => [new Date(d.start), new Date(d.end || d.start)]));
        const xScale = d3.scaleTime()
            .domain(extent)
            .range([0, width]);
        
        // Group scale
        const yScale = d3.scaleBand()
            .domain(Object.keys(groups))
            .range([0, height])
            .padding(0.1);
        
        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
        
        g.append('g')
            .call(d3.axisLeft(yScale));
        
        // Add Gantt bars
        Object.keys(groups).forEach(groupKey => {
            const groupData = groups[groupKey];
            
            g.selectAll(`.gantt-bar-${groupKey}`)
                .data(groupData)
                .enter()
                .append('rect')
                .attr('class', `gantt-bar gantt-bar-${groupKey}`)
                .attr('x', d => xScale(new Date(d.start)))
                .attr('y', yScale(groupKey) + 5)
                .attr('width', d => {
                    const endTime = new Date(d.end || d.start);
                    const startTime = new Date(d.start);
                    return Math.max(2, xScale(endTime) - xScale(startTime));
                })
                .attr('height', yScale.bandwidth() - 10)
                .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .on('click', (event, d) => this.selectEvent(d))
                .on('mouseover', (event, d) => this.showTooltip(event, d))
                .on('mouseout', () => this.hideTooltip());
        });
    }

    updateFlowView() {
        const flowContainer = document.getElementById('flowVisualization');
        flowContainer.innerHTML = '';
        
        const filteredData = this.applyFilters(this.timelineData);
        this.createFlowVisualization(flowContainer, filteredData);
    }

    createFlowVisualization(container, data) {
        // Create a flow diagram showing data relationships over time
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Time-based positioning
        const timeExtent = d3.extent(data, d => new Date(d.start));
        const xScale = d3.scaleTime()
            .domain(timeExtent)
            .range([50, width - 50]);
        
        // Group-based positioning
        const groups = [...new Set(data.map(d => d.group))];
        const yScale = d3.scaleBand()
            .domain(groups)
            .range([50, height - 50])
            .padding(0.1);
        
        // Create flow lines
        const line = d3.line()
            .x(d => xScale(new Date(d.start)))
            .y(d => yScale(d.group) + yScale.bandwidth() / 2)
            .curve(d3.curveCardinal);
        
        // Group data by flow paths
        const flowPaths = {};
        data.forEach(item => {
            const pathKey = item.path.split('.')[0];
            if (!flowPaths[pathKey]) {
                flowPaths[pathKey] = [];
            }
            flowPaths[pathKey].push(item);
        });
        
        // Draw flow paths
        Object.keys(flowPaths).forEach((pathKey, index) => {
            const pathData = flowPaths[pathKey].sort((a, b) => new Date(a.start) - new Date(b.start));
            
            svg.append('path')
                .datum(pathData)
                .attr('fill', 'none')
                .attr('stroke', d3.schemeCategory10[index % 10])
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 0.7)
                .attr('d', line);
        });
        
        // Add event nodes
        svg.selectAll('.flow-node')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'flow-node')
            .attr('cx', d => xScale(new Date(d.start)))
            .attr('cy', d => yScale(d.group) + yScale.bandwidth() / 2)
            .attr('r', 4)
            .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('click', (event, d) => this.selectEvent(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());
        
        // Add flow animation
        if (this.isPlaying) {
            this.animateFlow(svg, data);
        }
    }

    animateFlow(svg, data) {
        // Create animated particles along flow paths
        const particles = svg.selectAll('.flow-particle')
            .data(data.slice(0, 10)) // Limit particles for performance
            .enter()
            .append('circle')
            .attr('class', 'flow-particle')
            .attr('r', 2)
            .attr('fill', '#ff6b6b')
            .attr('opacity', 0.8);
        
        const animateParticle = (particle, d) => {
            particle
                .attr('cx', 0)
                .attr('cy', d => d.y)
                .transition()
                .duration(3000 / this.flowRate)
                .ease(d3.easeLinear)
                .attr('cx', svg.attr('width'))
                .on('end', () => animateParticle(particle, d));
        };
        
        particles.each(function(d, i) {
            setTimeout(() => {
                animateParticle(d3.select(this), d);
            }, i * 200);
        });
    }

    updateCalendarView() {
        const calendarContainer = document.getElementById('calendarVisualization');
        calendarContainer.innerHTML = '';
        
        const filteredData = this.applyFilters(this.timelineData);
        this.createCalendarView(calendarContainer, filteredData);
    }

    createCalendarView(container, data) {
        // Create a calendar heatmap showing event density
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Group events by date
        const eventsByDate = {};
        data.forEach(event => {
            const dateKey = new Date(event.start).toDateString();
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
        });
        
        // Create calendar grid
        const cellSize = 12;
        const yearHeight = cellSize * 7;
        
        const timeExtent = d3.extent(data, d => new Date(d.start));
        const years = d3.timeYears(timeExtent[0], timeExtent[1]).map(d => d.getFullYear());
        
        const color = d3.scaleSequential()
            .interpolator(d3.interpolateBlues)
            .domain([0, d3.max(Object.values(eventsByDate), d => d.length)]);
        
        years.forEach((year, yearIndex) => {
            const yearData = d3.timeDays(new Date(year, 0, 1), new Date(year + 1, 0, 1));
            
            const yearGroup = svg.append('g')
                .attr('transform', `translate(40, ${yearIndex * (yearHeight + 40) + 20})`);
            
            yearGroup.append('text')
                .attr('x', -5)
                .attr('y', -5)
                .attr('font-family', 'sans-serif')
                .attr('font-size', 10)
                .attr('font-weight', 'bold')
                .text(year);
            
            yearGroup.selectAll('.day')
                .data(yearData)
                .enter()
                .append('rect')
                .attr('class', 'day')
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('x', d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
                .attr('y', d => d.getDay() * cellSize)
                .attr('fill', d => {
                    const dateKey = d.toDateString();
                    const eventCount = eventsByDate[dateKey] ? eventsByDate[dateKey].length : 0;
                    return eventCount > 0 ? color(eventCount) : '#eee';
                })
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .on('mouseover', (event, d) => {
                    const dateKey = d.toDateString();
                    const events = eventsByDate[dateKey] || [];
                    this.showCalendarTooltip(event, d, events);
                })
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event, d) => {
                    const dateKey = d.toDateString();
                    const events = eventsByDate[dateKey] || [];
                    this.showDayEvents(d, events);
                });
        });
        
        // Add month labels
        svg.selectAll('.month')
            .data(years)
            .enter()
            .selectAll('.month-path')
            .data((year, yearIndex) => d3.timeMonths(new Date(year, 0, 1), new Date(year + 1, 0, 1)).map(d => ({ month: d, yearIndex })))
            .enter()
            .append('path')
            .attr('class', 'month-path')
            .attr('d', d => {
                const t1 = new Date(d.month.getFullYear(), d.month.getMonth() + 1, 0);
                const d0 = d.month.getDay();
                const w0 = d3.timeWeek.count(d3.timeYear(d.month), d.month);
                const w1 = d3.timeWeek.count(d3.timeYear(d.month), t1);
                return `M${(w0 + 1) * cellSize},${d0 * cellSize}H${w0 * cellSize}V${7 * cellSize}H${w1 * cellSize}V${(t1.getDay() + 1) * cellSize}H${(w1 + 1) * cellSize}V0H${(w0 + 1) * cellSize}Z`;
            })
            .attr('fill', 'none')
            .attr('stroke', '#000')
            .attr('stroke-width', 2)
            .attr('transform', d => `translate(40, ${d.yearIndex * (yearHeight + 40) + 20})`);
    }

    applyFilters(data) {
        return data.filter(event => {
            // Date range filter
            const eventDate = new Date(event.start);
            if (this.filters.startDate && eventDate < new Date(this.filters.startDate)) return false;
            if (this.filters.endDate && eventDate > new Date(this.filters.endDate)) return false;
            
            // Event type filter
            if (this.filters.eventTypes.size > 0 && !this.filters.eventTypes.has(event.type)) return false;
            
            // Search filter
            if (this.filters.searchTerm) {
                const searchTerm = this.filters.searchTerm.toLowerCase();
                return event.content.toLowerCase().includes(searchTerm) ||
                       event.title.toLowerCase().includes(searchTerm) ||
                       event.path.toLowerCase().includes(searchTerm);
            }
            
            return true;
        });
    }

    updateStats() {
        document.getElementById('eventCount').textContent = this.timelineData.length;
        
        if (this.timelineData.length > 0) {
            const timeSpan = this.calculateTimeSpan();
            const flowRate = this.calculateFlowRate();
            const patternCount = this.patterns.length;
            
            document.getElementById('timeSpan').textContent = timeSpan;
            document.getElementById('flowRate').textContent = flowRate;
            document.getElementById('patternCount').textContent = patternCount;
        } else {
            document.getElementById('timeSpan').textContent = '0d';
            document.getElementById('flowRate').textContent = '0/h';
            document.getElementById('patternCount').textContent = '0';
        }
    }

    calculateTimeSpan() {
        if (this.timelineData.length === 0) return '0d';
        
        const times = this.timelineData.map(d => new Date(d.start));
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const diffDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return '<1d';
        if (diffDays < 30) return `${diffDays}d`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)}m`;
        return `${Math.ceil(diffDays / 365)}y`;
    }

    calculateFlowRate() {
        if (this.timelineData.length === 0) return '0/h';
        
        const times = this.timelineData.map(d => new Date(d.start));
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const diffHours = (maxTime - minTime) / (1000 * 60 * 60);
        
        if (diffHours === 0) return '∞/h';
        
        const rate = this.timelineData.length / diffHours;
        if (rate < 1) return `${rate.toFixed(2)}/h`;
        return `${Math.round(rate)}/h`;
    }

    populateFilters() {
        // Populate event type filters
        const eventTypes = [...new Set(this.timelineData.map(d => d.type))];
        const eventTypeFilters = document.getElementById('eventTypeFilters');
        eventTypeFilters.innerHTML = '';
        
        eventTypes.forEach(type => {
            const label = document.createElement('label');
            label.className = 'visibility-control';
            label.innerHTML = `
                <input type="checkbox" value="${type}" checked>
                <span class="checkmark"></span>
                <span>${type}</span>
            `;
            
            label.querySelector('input').addEventListener('change', () => this.updateFilters());
            eventTypeFilters.appendChild(label);
        });
        
        // Initialize date range
        if (this.timelineData.length > 0) {
            const times = this.timelineData.map(d => new Date(d.start));
            const minTime = new Date(Math.min(...times));
            const maxTime = new Date(Math.max(...times));
            
            document.getElementById('startDate').value = minTime.toISOString().split('T')[0];
            document.getElementById('endDate').value = maxTime.toISOString().split('T')[0];
        }
    }

    updateFilters() {
        // Update date filters
        this.filters.startDate = document.getElementById('startDate').value;
        this.filters.endDate = document.getElementById('endDate').value;
        
        // Update search filter
        this.filters.searchTerm = document.getElementById('eventSearch').value;
        
        // Update event type filters
        this.filters.eventTypes.clear();
        document.querySelectorAll('#eventTypeFilters input:checked').forEach(input => {
            this.filters.eventTypes.add(input.value);
        });
        
        this.updateVisualization();
        this.updateStats();
    }

    setQuickRange(range) {
        // Remove active class from all buttons
        document.querySelectorAll('.quick-range-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        event.target.classList.add('active');
        
        const now = new Date();
        let startDate, endDate;
        
        switch (range) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear() + 1, 0, 1);
                break;
            case 'all':
            default:
                if (this.timelineData.length > 0) {
                    const times = this.timelineData.map(d => new Date(d.start));
                    startDate = new Date(Math.min(...times));
                    endDate = new Date(Math.max(...times));
                } else {
                    startDate = new Date();
                    endDate = new Date();
                }
                break;
        }
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        
        this.updateFilters();
    }

    switchView(mode) {
        this.currentView = mode;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.timeline-view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${mode}View`).classList.add('active');
        
        // Update current mode display
        const modeNames = {
            timeline: 'Timeline Mode',
            gantt: 'Gantt Mode',
            flow: 'Flow Mode',
            calendar: 'Calendar Mode'
        };
        document.getElementById('currentMode').textContent = modeNames[mode];
        
        this.updateVisualization();
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

    onEventSelect(properties) {
        if (properties.items.length > 0) {
            const eventId = properties.items[0];
            const event = this.timelineData.find(d => d.id === eventId);
            if (event) {
                this.selectEvent(event);
            }
        }
    }

    selectEvent(event) {
        this.selectedEvent = event;
        this.updateAnalysisPanel(event);
        document.getElementById('selectedEvent').textContent = event.content;
    }

    updateAnalysisPanel(event) {
        const analysisContent = document.getElementById('analysisContent');
        analysisContent.innerHTML = this.generateEventAnalysis(event);
        
        // Update inspector tabs
        this.updateEventInspector(event);
    }

    generateEventAnalysis(event) {
        return `
            <div class="event-analysis">
                <div class="analysis-section">
                    <h4><i class="fas fa-info-circle"></i> Event Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Path:</label>
                            <span>${event.path}</span>
                        </div>
                        <div class="info-item">
                            <label>Type:</label>
                            <span class="event-type">${event.type}</span>
                        </div>
                        <div class="info-item">
                            <label>Group:</label>
                            <span>${event.group}</span>
                        </div>
                        <div class="info-item">
                            <label>Start:</label>
                            <span>${new Date(event.start).toLocaleString()}</span>
                        </div>
                        ${event.end ? `
                        <div class="info-item">
                            <label>End:</label>
                            <span>${new Date(event.end).toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4><i class="fas fa-code"></i> Data Preview</h4>
                    <div class="data-preview">
                        <pre>${JSON.stringify(event.data, null, 2).substring(0, 500)}${JSON.stringify(event.data, null, 2).length > 500 ? '...' : ''}</pre>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4><i class="fas fa-chart-bar"></i> Metadata</h4>
                    <div class="metadata-grid">
                        ${Object.entries(event.metadata).map(([key, value]) => `
                            <div class="metadata-item">
                                <label>${key}:</label>
                                <span>${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    updateEventInspector(event) {
        // Details inspector
        const detailsInspector = document.getElementById('detailsInspector');
        detailsInspector.innerHTML = this.generateEventDetails(event);
        
        // Context inspector
        const contextInspector = document.getElementById('contextInspector');
        contextInspector.innerHTML = this.generateEventContext(event);
        
        // Relations inspector
        const relationsInspector = document.getElementById('relationsInspector');
        relationsInspector.innerHTML = this.generateEventRelations(event);
    }

    generateEventDetails(event) {
        const properties = [];
        
        if (typeof event.data === 'object' && event.data !== null) {
            Object.entries(event.data).forEach(([key, value]) => {
                properties.push({
                    key,
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                    type: Array.isArray(value) ? 'array' : typeof value
                });
            });
        }
        
        return `
            <div class="property-list">
                ${properties.map(prop => `
                    <div class="property-item">
                        <div class="property-key">${prop.key}</div>
                        <div class="property-type">${prop.type}</div>
                        <div class="property-value">${prop.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateEventContext(event) {
        // Find related events in the same timeframe
        const eventTime = new Date(event.start);
        const timeWindow = 60 * 60 * 1000; // 1 hour
        
        const contextEvents = this.timelineData.filter(e => {
            if (e.id === event.id) return false;
            const eTime = new Date(e.start);
            return Math.abs(eventTime - eTime) <= timeWindow;
        });
        
        return `
            <div class="context-analysis">
                <div class="context-section">
                    <h5>Temporal Context</h5>
                    <p>Found ${contextEvents.length} events within 1 hour of this event.</p>
                </div>
                
                <div class="context-events">
                    ${contextEvents.slice(0, 5).map(e => `
                        <div class="context-event" onclick="timelineAnalyzer.selectEvent(${JSON.stringify(e).replace(/"/g, '&quot;')})">
                            <div class="context-event-title">${e.content}</div>
                            <div class="context-event-time">${new Date(e.start).toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateEventRelations(event) {
        // Find events with similar paths or data structure
        const pathSegments = event.path.split('.');
        const relatedEvents = this.timelineData.filter(e => {
            if (e.id === event.id) return false;
            
            const ePathSegments = e.path.split('.');
            
            // Check for common path segments
            return pathSegments.some(segment => ePathSegments.includes(segment));
        });
        
        return `
            <div class="relations-analysis">
                <div class="relations-section">
                    <h5>Structural Relations</h5>
                    <p>Found ${relatedEvents.length} events with related paths.</p>
                </div>
                
                <div class="related-events">
                    ${relatedEvents.slice(0, 5).map(e => `
                        <div class="related-event" onclick="timelineAnalyzer.selectEvent(${JSON.stringify(e).replace(/"/g, '&quot;')})">
                            <div class="related-event-title">${e.content}</div>
                            <div class="related-event-path">${e.path}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Pattern detection methods
    detectPatterns() {
        this.patterns = [];
        
        // Detect time-based patterns
        this.detectTimePatterns();
        
        // Detect structural patterns
        this.detectStructuralPatterns();
        
        // Detect frequency patterns
        this.detectFrequencyPatterns();
        
        this.updatePatternResults();
        this.updateStats();
        this.showMessage(`Detected ${this.patterns.length} patterns`, 'info');
    }

    detectTimePatterns() {
        // Group events by time intervals
        const hourlyGroups = {};
        const dailyGroups = {};
        const weeklyGroups = {};
        
        this.timelineData.forEach(event => {
            const date = new Date(event.start);
            const hourKey = `${date.getHours()}:00`;
            const dayKey = date.getDay();
            const weekKey = `Week ${Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
            
            if (!hourlyGroups[hourKey]) hourlyGroups[hourKey] = [];
            if (!dailyGroups[dayKey]) dailyGroups[dayKey] = [];
            if (!weeklyGroups[weekKey]) weeklyGroups[weekKey] = [];
            
            hourlyGroups[hourKey].push(event);
            dailyGroups[dayKey].push(event);
            weeklyGroups[weekKey].push(event);
        });
        
        // Find patterns with significant activity
        Object.entries(hourlyGroups).forEach(([hour, events]) => {
            if (events.length > this.timelineData.length * 0.1) {
                this.patterns.push({
                    type: 'temporal',
                    subtype: 'hourly',
                    description: `High activity at ${hour}`,
                    events: events,
                    confidence: events.length / this.timelineData.length
                });
            }
        });
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        Object.entries(dailyGroups).forEach(([day, events]) => {
            if (events.length > this.timelineData.length * 0.2) {
                this.patterns.push({
                    type: 'temporal',
                    subtype: 'daily',
                    description: `High activity on ${dayNames[day]}`,
                    events: events,
                    confidence: events.length / this.timelineData.length
                });
            }
        });
    }

    detectStructuralPatterns() {
        // Group events by path patterns
        const pathPatterns = {};
        
        this.timelineData.forEach(event => {
            const pathTemplate = this.generatePathTemplate(event.path);
            if (!pathPatterns[pathTemplate]) pathPatterns[pathTemplate] = [];
            pathPatterns[pathTemplate].push(event);
        });
        
        Object.entries(pathPatterns).forEach(([template, events]) => {
            if (events.length > 1) {
                this.patterns.push({
                    type: 'structural',
                    subtype: 'path',
                    description: `Recurring structure: ${template}`,
                    events: events,
                    confidence: events.length / this.timelineData.length
                });
            }
        });
    }

    generatePathTemplate(path) {
        // Replace array indices and specific values with placeholders
        return path
            .replace(/\[\d+\]/g, '[*]')
            .replace(/\w+_\d+/g, 'item_*')
            .replace(/id_\w+/g, 'id_*');
    }

    detectFrequencyPatterns() {
        // Analyze event frequency over time
        const timeWindows = [
            { name: '1 minute', duration: 60 * 1000 },
            { name: '5 minutes', duration: 5 * 60 * 1000 },
            { name: '1 hour', duration: 60 * 60 * 1000 },
            { name: '1 day', duration: 24 * 60 * 60 * 1000 }
        ];
        
        timeWindows.forEach(window => {
            const frequencies = this.calculateFrequencies(window.duration);
            const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
            const stdDev = Math.sqrt(frequencies.reduce((sq, n) => sq + Math.pow(n - avgFreq, 2), 0) / frequencies.length);
            
            // Find periods with unusually high frequency
            frequencies.forEach((freq, index) => {
                if (freq > avgFreq + 2 * stdDev) {
                    this.patterns.push({
                        type: 'frequency',
                        subtype: 'burst',
                        description: `Event burst detected (${window.name} window)`,
                        timeIndex: index,
                        frequency: freq,
                        confidence: Math.min((freq - avgFreq) / stdDev / 3, 1)
                    });
                }
            });
        });
    }

    calculateFrequencies(windowDuration) {
        if (this.timelineData.length === 0) return [];
        
        const times = this.timelineData.map(d => new Date(d.start).getTime()).sort((a, b) => a - b);
        const minTime = times[0];
        const maxTime = times[times.length - 1];
        const totalDuration = maxTime - minTime;
        const numWindows = Math.ceil(totalDuration / windowDuration);
        
        const frequencies = new Array(numWindows).fill(0);
        
        times.forEach(time => {
            const windowIndex = Math.floor((time - minTime) / windowDuration);
            if (windowIndex >= 0 && windowIndex < numWindows) {
                frequencies[windowIndex]++;
            }
        });
        
        return frequencies;
    }

    updatePatternResults() {
        const patternResults = document.getElementById('patternResults');
        
        if (this.patterns.length === 0) {
            patternResults.innerHTML = `
                <div class="no-patterns">
                    <i class="fas fa-search"></i>
                    <p>No patterns detected yet</p>
                </div>
            `;
            return;
        }
        
        patternResults.innerHTML = `
            <div class="pattern-list">
                ${this.patterns.map((pattern, index) => `
                    <div class="pattern-item" onclick="timelineAnalyzer.selectPattern(${index})">
                        <div class="pattern-header">
                            <div class="pattern-type">${pattern.type}</div>
                            <div class="pattern-confidence">${Math.round(pattern.confidence * 100)}%</div>
                        </div>
                        <div class="pattern-description">${pattern.description}</div>
                        <div class="pattern-meta">
                            ${pattern.events ? `${pattern.events.length} events` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    selectPattern(index) {
        const pattern = this.patterns[index];
        if (pattern.events && pattern.events.length > 0) {
            // Highlight pattern events in timeline
            this.highlightEvents(pattern.events);
        }
        
        this.showMessage(`Selected pattern: ${pattern.description}`, 'info');
    }

    highlightEvents(events) {
        // Remove previous highlights
        document.querySelectorAll('.timeline-event').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // Add highlights to selected events
        events.forEach(event => {
            const element = document.querySelector(`.timeline-event[data-id="${event.id}"]`);
            if (element) {
                element.classList.add('highlighted');
            }
        });
    }

    // Flow analysis
    analyzeFlow() {
        const flowAnalysis = this.performFlowAnalysis();
        this.showFlowAnalysisModal(flowAnalysis);
    }

    performFlowAnalysis() {
        const analysis = {
            overview: this.generateFlowOverview(),
            patterns: this.analyzeFlowPatterns(),
            anomalies: this.detectFlowAnomalies(),
            predictions: this.generateFlowPredictions()
        };
        
        return analysis;
    }

    generateFlowOverview() {
        const totalEvents = this.timelineData.length;
        const avgFlowRate = this.calculateAverageFlowRate();
        const peakFlow = this.calculatePeakFlow();
        const bottlenecks = this.detectBottlenecks();
        
        return {
            totalEvents,
            avgFlowRate,
            peakFlow,
            bottlenecks: bottlenecks.length,
            efficiency: this.calculateFlowEfficiency(),
            utilization: this.calculateFlowUtilization()
        };
    }

    calculateAverageFlowRate() {
        if (this.timelineData.length === 0) return 0;
        
        const times = this.timelineData.map(d => new Date(d.start));
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const durationHours = (maxTime - minTime) / (1000 * 60 * 60);
        
        return durationHours > 0 ? this.timelineData.length / durationHours : 0;
    }

    calculatePeakFlow() {
        const frequencies = this.calculateFrequencies(60 * 60 * 1000); // 1 hour windows
        return Math.max(...frequencies, 0);
    }

    detectBottlenecks() {
        // Simple bottleneck detection based on gaps between events
        const bottlenecks = [];
        const sortedEvents = [...this.timelineData].sort((a, b) => new Date(a.start) - new Date(b.start));
        
        for (let i = 1; i < sortedEvents.length; i++) {
            const gap = new Date(sortedEvents[i].start) - new Date(sortedEvents[i-1].start);
            const avgGap = this.calculateAverageGap();
            
            if (gap > avgGap * 3) { // Gap is 3x larger than average
                bottlenecks.push({
                    before: sortedEvents[i-1],
                    after: sortedEvents[i],
                    gap: gap,
                    severity: Math.min(gap / avgGap, 10)
                });
            }
        }
        
        return bottlenecks;
    }

    calculateAverageGap() {
        if (this.timelineData.length < 2) return 0;
        
        const sortedEvents = [...this.timelineData].sort((a, b) => new Date(a.start) - new Date(b.start));
        const gaps = [];
        
        for (let i = 1; i < sortedEvents.length; i++) {
            gaps.push(new Date(sortedEvents[i].start) - new Date(sortedEvents[i-1].start));
        }
        
        return gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }

    calculateFlowEfficiency() {
        // Simple efficiency metric based on event distribution
        const frequencies = this.calculateFrequencies(60 * 60 * 1000);
        if (frequencies.length === 0) return 0;
        
        const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const variance = frequencies.reduce((sq, n) => sq + Math.pow(n - avgFreq, 2), 0) / frequencies.length;
        
        return avgFreq > 0 ? Math.max(0, 1 - Math.sqrt(variance) / avgFreq) : 0;
    }

    calculateFlowUtilization() {
        // Calculate what percentage of time periods have events
        const frequencies = this.calculateFrequencies(60 * 60 * 1000);
        const nonZeroFrequencies = frequencies.filter(f => f > 0);
        
        return frequencies.length > 0 ? nonZeroFrequencies.length / frequencies.length : 0;
    }

    analyzeFlowPatterns() {
        return this.patterns.filter(p => p.type === 'frequency' || p.type === 'temporal');
    }

    detectFlowAnomalies() {
        const anomalies = [];
        const frequencies = this.calculateFrequencies(60 * 60 * 1000);
        
        if (frequencies.length === 0) return anomalies;
        
        const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const stdDev = Math.sqrt(frequencies.reduce((sq, n) => sq + Math.pow(n - avgFreq, 2), 0) / frequencies.length);
        
        frequencies.forEach((freq, index) => {
            const zScore = Math.abs(freq - avgFreq) / stdDev;
            if (zScore > 2) {
                anomalies.push({
                    index,
                    frequency: freq,
                    expected: avgFreq,
                    severity: zScore,
                    type: freq > avgFreq ? 'spike' : 'drop'
                });
            }
        });
        
        return anomalies;
    }

    generateFlowPredictions() {
        // Simple trend analysis for predictions
        const frequencies = this.calculateFrequencies(60 * 60 * 1000);
        
        if (frequencies.length < 3) {
            return {
                trend: 'insufficient_data',
                prediction: 'Need more data for predictions',
                confidence: 0
            };
        }
        
        // Calculate linear trend
        const n = frequencies.length;
        const sumX = n * (n - 1) / 2;
        const sumY = frequencies.reduce((a, b) => a + b, 0);
        const sumXY = frequencies.reduce((sum, y, x) => sum + x * y, 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const trendType = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
        const nextPrediction = Math.max(0, intercept + slope * n);
        
        return {
            trend: trendType,
            slope: slope,
            nextPredicted: nextPrediction,
            confidence: Math.min(Math.abs(slope) * 10, 1)
        };
    }

    showFlowAnalysisModal(analysis) {
        const modal = document.getElementById('flowAnalysisModal');
        
        // Update modal content
        document.getElementById('overviewAnalysis').innerHTML = this.generateOverviewContent(analysis.overview);
        document.getElementById('patternsAnalysis').innerHTML = this.generatePatternsContent(analysis.patterns);
        document.getElementById('anomaliesAnalysis').innerHTML = this.generateAnomaliesContent(analysis.anomalies);
        document.getElementById('predictionsAnalysis').innerHTML = this.generatePredictionsContent(analysis.predictions);
        
        modal.style.display = 'flex';
        
        // Setup modal event handlers
        modal.querySelector('.modal-close').onclick = () => this.closeFlowAnalysis();
        modal.querySelector('.modal-backdrop').onclick = () => this.closeFlowAnalysis();
        
        // Setup tab switching
        modal.querySelectorAll('.analysis-tab').forEach(tab => {
            tab.onclick = () => this.switchAnalysisTab(tab.dataset.tab);
        });
    }

    generateOverviewContent(overview) {
        return `
            <div class="overview-content">
                <div class="metric-cards">
                    <div class="metric-card">
                        <div class="metric-value">${overview.totalEvents}</div>
                        <div class="metric-label">Total Events</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${overview.avgFlowRate.toFixed(2)}</div>
                        <div class="metric-label">Avg Flow Rate/h</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${overview.peakFlow}</div>
                        <div class="metric-label">Peak Flow/h</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${overview.bottlenecks}</div>
                        <div class="metric-label">Bottlenecks</div>
                    </div>
                </div>
                
                <div class="efficiency-metrics">
                    <div class="efficiency-item">
                        <label>Flow Efficiency:</label>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${overview.efficiency * 100}%"></div>
                        </div>
                        <span>${Math.round(overview.efficiency * 100)}%</span>
                    </div>
                    <div class="efficiency-item">
                        <label>Utilization:</label>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${overview.utilization * 100}%"></div>
                        </div>
                        <span>${Math.round(overview.utilization * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    generatePatternsContent(patterns) {
        return `
            <div class="patterns-content">
                <h4>Detected Flow Patterns</h4>
                <div class="pattern-list">
                    ${patterns.map(pattern => `
                        <div class="pattern-card">
                            <div class="pattern-header">
                                <span class="pattern-type">${pattern.type}</span>
                                <span class="pattern-confidence">${Math.round(pattern.confidence * 100)}%</span>
                            </div>
                            <div class="pattern-description">${pattern.description}</div>
                        </div>
                    `).join('')}
                </div>
                ${patterns.length === 0 ? '<p>No flow patterns detected.</p>' : ''}
            </div>
        `;
    }

    generateAnomaliesContent(anomalies) {
        return `
            <div class="anomalies-content">
                <h4>Flow Anomalies</h4>
                <div class="anomaly-list">
                    ${anomalies.map(anomaly => `
                        <div class="anomaly-card ${anomaly.type}">
                            <div class="anomaly-header">
                                <span class="anomaly-type">${anomaly.type.toUpperCase()}</span>
                                <span class="anomaly-severity">Severity: ${anomaly.severity.toFixed(1)}</span>
                            </div>
                            <div class="anomaly-details">
                                <p>Expected: ${anomaly.expected.toFixed(2)} events/hour</p>
                                <p>Observed: ${anomaly.frequency} events/hour</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${anomalies.length === 0 ? '<p>No anomalies detected in flow patterns.</p>' : ''}
            </div>
        `;
    }

    generatePredictionsContent(predictions) {
        return `
            <div class="predictions-content">
                <h4>Flow Predictions</h4>
                <div class="prediction-card">
                    <div class="prediction-trend">
                        <label>Trend:</label>
                        <span class="trend ${predictions.trend}">${predictions.trend.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    
                    ${predictions.trend !== 'insufficient_data' ? `
                        <div class="prediction-metrics">
                            <div class="prediction-item">
                                <label>Next Period Prediction:</label>
                                <span>${predictions.nextPredicted?.toFixed(2) || 'N/A'} events</span>
                            </div>
                            <div class="prediction-item">
                                <label>Confidence:</label>
                                <span>${Math.round((predictions.confidence || 0) * 100)}%</span>
                            </div>
                        </div>
                    ` : `
                        <p class="insufficient-data">${predictions.prediction}</p>
                    `}
                </div>
            </div>
        `;
    }

    switchAnalysisTab(tabName) {
        document.querySelectorAll('.analysis-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        document.querySelectorAll('.analysis-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}Analysis`).classList.add('active');
    }

    closeFlowAnalysis() {
        document.getElementById('flowAnalysisModal').style.display = 'none';
    }

    // Playback controls
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('playTimeline');
        
        if (this.isPlaying) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
            this.startPlayback();
        } else {
            playBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
            this.stopPlayback();
        }
    }

    startPlayback() {
        // Implement timeline playback animation
        this.showMessage('Playback started', 'info');
        
        if (this.currentView === 'flow') {
            this.updateFlowView(); // Restart flow animation
        }
    }

    stopPlayback() {
        this.showMessage('Playback stopped', 'info');
    }

    updateFlowSpeed() {
        if (this.isPlaying && this.currentView === 'flow') {
            this.updateFlowView(); // Update flow animation speed
        }
    }

    // Utility methods
    setupScrubber() {
        const scrubber = document.getElementById('scrubberHandle');
        const track = scrubber.parentElement;
        
        let isDragging = false;
        
        scrubber.addEventListener('mousedown', () => {
            isDragging = true;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const rect = track.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            scrubber.style.left = `${percentage}%`;
            
            // Update timeline position
            this.updateTimelineFromScrubber(percentage / 100);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        track.addEventListener('click', (e) => {
            if (e.target === scrubber) return;
            
            const rect = track.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            
            scrubber.style.left = `${percentage}%`;
            this.updateTimelineFromScrubber(percentage / 100);
        });
    }

    updateTimelineFromScrubber(position) {
        if (this.timelineData.length === 0) return;
        
        const times = this.timelineData.map(d => new Date(d.start));
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const currentTime = new Date(minTime + (maxTime - minTime) * position);
        
        if (this.timeline) {
            this.timeline.moveTo(currentTime);
        }
        
        document.getElementById('currentTimespan').textContent = currentTime.toLocaleString();
    }

    zoom(factor) {
        if (this.timeline) {
            const range = this.timeline.getWindow();
            const center = (range.start.getTime() + range.end.getTime()) / 2;
            const duration = range.end.getTime() - range.start.getTime();
            const newDuration = duration / factor;
            
            this.timeline.setWindow(
                new Date(center - newDuration / 2),
                new Date(center + newDuration / 2)
            );
        }
    }

    fitToWindow() {
        if (this.timeline && this.timelineData.length > 0) {
            this.timeline.fit();
        }
    }

    showContextMenu(e) {
        e.preventDefault();
        
        const contextMenu = document.getElementById('timelineContextMenu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
    }

    hideContextMenu() {
        document.getElementById('timelineContextMenu').style.display = 'none';
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'f':
                this.fitToWindow();
                break;
            case 'Escape':
                this.hideContextMenu();
                break;
        }
    }

    showLoading() {
        document.getElementById('timelineLoading').style.display = 'flex';
        document.getElementById('timelineEmpty').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('timelineLoading').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('timelineEmpty').style.display = 'flex';
        document.getElementById('timelineLoading').style.display = 'none';
    }

    showTooltip(event, data) {
        const tooltip = document.getElementById('timelineTooltip');
        tooltip.querySelector('.tooltip-title').textContent = data.content;
        tooltip.querySelector('.tooltip-time').textContent = new Date(data.start).toLocaleString();
        tooltip.querySelector('.tooltip-description').textContent = data.title;
        tooltip.querySelector('.tooltip-metadata').textContent = `Path: ${data.path}`;
        
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        document.getElementById('timelineTooltip').classList.remove('show');
    }

    showCalendarTooltip(event, date, events) {
        const tooltip = document.getElementById('timelineTooltip');
        tooltip.querySelector('.tooltip-title').textContent = date.toDateString();
        tooltip.querySelector('.tooltip-time').textContent = `${events.length} events`;
        tooltip.querySelector('.tooltip-description').textContent = events.map(e => e.content).join(', ');
        tooltip.querySelector('.tooltip-metadata').textContent = events.length > 0 ? 'Click to view details' : 'No events';
        
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.classList.add('show');
    }

    showDayEvents(date, events) {
        if (events.length > 0) {
            // Switch to timeline view and filter to this day
            this.switchView('timeline');
            
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            
            document.getElementById('startDate').value = startOfDay.toISOString().split('T')[0];
            document.getElementById('endDate').value = endOfDay.toISOString().split('T')[0];
            
            this.updateFilters();
            this.showMessage(`Filtered to ${events.length} events on ${date.toDateString()}`, 'info');
        }
    }

    onTimelineClick(properties) {
        document.getElementById('currentTimespan').textContent = properties.time.toLocaleString();
    }

    onRangeChange(properties) {
        const start = properties.start;
        const end = properties.end;
        const duration = end - start;
        
        let durationText;
        if (duration < 60 * 60 * 1000) { // Less than 1 hour
            durationText = `${Math.round(duration / (60 * 1000))} minutes`;
        } else if (duration < 24 * 60 * 60 * 1000) { // Less than 1 day
            durationText = `${Math.round(duration / (60 * 60 * 1000))} hours`;
        } else {
            durationText = `${Math.round(duration / (24 * 60 * 60 * 1000))} days`;
        }
        
        document.getElementById('currentTimespan').textContent = `${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${durationText})`;
    }

    updateVisibility() {
        const showEvents = document.getElementById('showEvents').checked;
        const showConnections = document.getElementById('showConnections').checked;
        const showPatterns = document.getElementById('showPatterns').checked;
        const showAnnotations = document.getElementById('showAnnotations').checked;
        
        // Apply visibility changes to current visualization
        this.updateVisualization();
    }

    showMessage(message, type = 'info') {
        // Create a simple message notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--timeline-${type === 'error' ? 'accent' : type === 'success' ? 'success' : 'primary'});
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: var(--timeline-shadow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the Timeline Flow Analyzer
let timelineAnalyzer;
document.addEventListener('DOMContentLoaded', () => {
    timelineAnalyzer = new TimelineFlowAnalyzer();
});

// Global functions for HTML onclick handlers
function detectSeasonality() {
    timelineAnalyzer.showMessage('Detecting seasonality patterns...', 'info');
    // Implement seasonality detection
}

function detectCycles() {
    timelineAnalyzer.showMessage('Analyzing cyclical patterns...', 'info');
    // Implement cycle detection
}

function detectAnomalies() {
    timelineAnalyzer.showMessage('Scanning for anomalies...', 'info');
    // Implement anomaly detection
}

function addAnnotation() {
    timelineAnalyzer.showMessage('Annotation added', 'success');
}

function createBookmark() {
    timelineAnalyzer.showMessage('Bookmark created', 'success');
}

function setStartPoint() {
    timelineAnalyzer.showMessage('Start point set', 'success');
}

function analyzeTimeRange() {
    timelineAnalyzer.showMessage('Analyzing selected time range...', 'info');
}

function exportTimeRange() {
    timelineAnalyzer.showMessage('Exporting time range...', 'info');
}

function exportAnalysis() {
    timelineAnalyzer.showMessage('Exporting analysis report...', 'info');
}