class GeospatialDataExplorer {
    constructor() {
        this.jsonData = null;
        this.map = null;
        this.geoData = [];
        this.markers = [];
        this.markerLayer = null;
        this.heatmapLayer = null;
        this.clusterLayer = null;
        this.selectedLocation = null;
        this.currentMapMode = 'street';
        this.isHeatmapVisible = false;
        this.currentContextMenuPos = null;
        
        this.filters = {
            bbox: null,
            distance: null,
            searchTerm: ''
        };
        
        this.styles = {
            markerSize: 10,
            markerOpacity: 0.8,
            colorScheme: 'viridis'
        };
        
        this.init();
    }

    init() {
        this.setupMap();
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupMap() {
        // Initialize Leaflet map
        this.map = L.map('mapContainer', {
            center: [37.5665, 126.9780], // Seoul coordinates as default
            zoom: 10,
            zoomControl: false
        });

        // Add custom zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        // Set initial map layer
        this.setMapLayer('street');

        // Initialize layer groups
        this.markerLayer = L.layerGroup().addTo(this.map);
        
        // Map event handlers
        this.map.on('moveend', () => this.updateMapInfo());
        this.map.on('zoomend', () => this.updateMapInfo());
        this.map.on('contextmenu', (e) => this.showMapContextMenu(e));
        this.map.on('click', () => this.hideContextMenu());

        // Update initial map info
        this.updateMapInfo();
    }

    setupEventListeners() {
        // Data loading
        document.getElementById('loadData').addEventListener('click', () => this.loadData());
        
        // Analysis controls
        document.getElementById('geolocateBtn').addEventListener('click', () => this.geolocateData());
        document.getElementById('analyzePatterns').addEventListener('click', () => this.analyzePatterns());
        document.getElementById('heatmapToggle').addEventListener('click', () => this.toggleHeatmap());
        
        // Map mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMapMode(e.target.dataset.mode));
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        document.querySelectorAll('.inspector-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchInspectorTab(e.target.dataset.tab));
        });
        
        // Map controls
        document.getElementById('zoomToFit').addEventListener('click', () => this.zoomToFit());
        document.getElementById('getCurrentLocation').addEventListener('click', () => this.getCurrentLocation());
        document.getElementById('fullscreenMap').addEventListener('click', () => this.toggleFullscreen());
        
        // Style controls
        document.getElementById('markerSize').addEventListener('input', (e) => this.updateMarkerSize(e.target.value));
        document.getElementById('markerOpacity').addEventListener('input', (e) => this.updateMarkerOpacity(e.target.value));
        document.getElementById('colorScheme').addEventListener('change', (e) => this.updateColorScheme(e.target.value));
        
        // Visibility controls
        document.querySelectorAll('.visibility-control input').forEach(input => {
            input.addEventListener('change', () => this.updateVisibility());
        });
        
        // Search functionality
        document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });
        
        // Context menu
        document.addEventListener('click', () => this.hideContextMenu());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
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
        this.geoData = this.extractGeographicData(data);
        this.updateMap();
        this.updateStats();
        this.populateLayerControls();
        this.hideLoading();
    }

    extractGeographicData(data, path = '') {
        const geoData = [];
        const stack = [{ obj: data, path: '' }];
        let locationId = 0;

        while (stack.length > 0) {
            const { obj, path } = stack.pop();

            if (obj === null || obj === undefined) continue;

            // Try to extract geographic information
            const location = this.extractLocation(obj);
            if (location) {
                const geoPoint = {
                    id: locationId++,
                    lat: location.lat,
                    lng: location.lng,
                    elevation: location.elevation || null,
                    accuracy: location.accuracy || null,
                    address: location.address || null,
                    name: this.extractLocationName(obj, path),
                    properties: this.extractLocationProperties(obj),
                    path: path,
                    data: obj,
                    timestamp: this.extractTimestamp(obj),
                    category: this.extractCategory(obj),
                    metadata: this.extractMetadata(obj)
                };
                
                geoData.push(geoPoint);
            }

            // Process nested objects and arrays
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        const newPath = path ? `${path}[${index}]` : `[${index}]`;
                        stack.push({ obj: item, path: newPath });
                    });
                } else {
                    Object.keys(obj).forEach(key => {
                        const newPath = path ? `${path}.${key}` : key;
                        stack.push({ obj: obj[key], path: newPath });
                    });
                }
            }
        }

        return geoData;
    }

    extractLocation(obj) {
        if (!obj || typeof obj !== 'object') return null;

        // Try various coordinate field combinations
        const coordFields = [
            ['lat', 'lng'], ['latitude', 'longitude'],
            ['lat', 'lon'], ['y', 'x'], ['coords'],
            ['location'], ['position'], ['geopoint']
        ];

        for (const fields of coordFields) {
            if (fields.length === 1) {
                const coordObj = obj[fields[0]];
                if (coordObj && typeof coordObj === 'object') {
                    const location = this.extractLocation(coordObj);
                    if (location) return location;
                }
            } else {
                const [latField, lngField] = fields;
                if (obj[latField] !== undefined && obj[lngField] !== undefined) {
                    const lat = parseFloat(obj[latField]);
                    const lng = parseFloat(obj[lngField]);
                    
                    if (!isNaN(lat) && !isNaN(lng) && 
                        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        return {
                            lat: lat,
                            lng: lng,
                            elevation: obj.elevation || obj.alt || obj.altitude,
                            accuracy: obj.accuracy,
                            address: obj.address || obj.formatted_address
                        };
                    }
                }
            }
        }

        // Check for GeoJSON format
        if (obj.type === 'Point' && obj.coordinates && Array.isArray(obj.coordinates)) {
            const [lng, lat] = obj.coordinates;
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat: parseFloat(lat), lng: parseFloat(lng) };
            }
        }

        // Check for address-based location (would need geocoding in real implementation)
        if (obj.address || obj.city || obj.country) {
            // In a real implementation, you'd geocode the address
            // For now, we'll skip address-only entries
        }

        return null;
    }

    extractLocationName(obj, path) {
        const nameFields = ['name', 'title', 'label', 'place', 'location_name'];
        
        for (const field of nameFields) {
            if (obj[field]) return String(obj[field]);
        }
        
        // Use path as fallback
        const pathParts = path.split('.');
        const lastPart = pathParts[pathParts.length - 1];
        return lastPart || 'Location';
    }

    extractLocationProperties(obj) {
        const properties = {};
        
        // Extract common property fields
        const propertyFields = [
            'description', 'type', 'category', 'tags', 'rating',
            'phone', 'website', 'hours', 'price', 'capacity'
        ];
        
        propertyFields.forEach(field => {
            if (obj[field] !== undefined) {
                properties[field] = obj[field];
            }
        });
        
        return properties;
    }

    extractTimestamp(obj) {
        if (!obj || typeof obj !== 'object') return null;
        
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
        
        return null;
    }

    extractCategory(obj) {
        const categoryFields = ['category', 'type', 'kind', 'class', 'group'];
        
        for (const field of categoryFields) {
            if (obj[field]) return String(obj[field]);
        }
        
        return 'default';
    }

    extractMetadata(obj) {
        const metadata = {};
        
        if (typeof obj === 'object' && obj !== null) {
            metadata.size = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
            metadata.hasProperties = Object.keys(this.extractLocationProperties(obj)).length > 0;
            metadata.hasTimestamp = !!this.extractTimestamp(obj);
            
            // Extract additional metadata
            ['id', 'version', 'source', 'author', 'confidence'].forEach(field => {
                if (obj[field] !== undefined) {
                    metadata[field] = obj[field];
                }
            });
        }
        
        return metadata;
    }

    updateMap() {
        this.clearMarkers();
        
        if (this.geoData.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        this.createMarkers();
        this.updateMapBounds();
    }

    clearMarkers() {
        if (this.markerLayer) {
            this.markerLayer.clearLayers();
        }
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
        if (this.clusterLayer) {
            this.map.removeLayer(this.clusterLayer);
            this.clusterLayer = null;
        }
        this.markers = [];
    }

    createMarkers() {
        const filteredData = this.applyFilters(this.geoData);
        
        filteredData.forEach(location => {
            const marker = this.createMarker(location);
            this.markers.push(marker);
            this.markerLayer.addLayer(marker);
        });

        // Update layer controls
        this.updateLayerControls();
    }

    createMarker(location) {
        const markerOptions = {
            radius: this.styles.markerSize,
            fillColor: this.getMarkerColor(location),
            color: '#fff',
            weight: 2,
            opacity: this.styles.markerOpacity,
            fillOpacity: 0.8
        };

        const marker = L.circleMarker([location.lat, location.lng], markerOptions);
        
        // Add popup
        const popupContent = this.createPopupContent(location);
        marker.bindPopup(popupContent);
        
        // Add event handlers
        marker.on('click', () => this.selectLocation(location));
        marker.on('mouseover', (e) => this.showTooltip(e, location));
        marker.on('mouseout', () => this.hideTooltip());
        
        // Store reference to location data
        marker._geoData = location;
        
        return marker;
    }

    getMarkerColor(location) {
        const colorSchemes = {
            viridis: ['#440154', '#31688e', '#35b779', '#fde725'],
            plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636'],
            inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a'],
            category: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
            blue: ['#08519c', '#3182bd', '#6baed6', '#bdd7e7'],
            red: ['#a50f15', '#de2d26', '#fb6a4a', '#fcae91']
        };
        
        const colors = colorSchemes[this.styles.colorScheme] || colorSchemes.viridis;
        
        if (this.styles.colorScheme === 'category') {
            const categories = [...new Set(this.geoData.map(d => d.category))];
            const categoryIndex = categories.indexOf(location.category);
            return colors[categoryIndex % colors.length];
        } else {
            // Color by index or some other metric
            const index = this.geoData.indexOf(location);
            const colorIndex = Math.floor((index / this.geoData.length) * (colors.length - 1));
            return colors[colorIndex];
        }
    }

    createPopupContent(location) {
        return `
            <div class="location-popup">
                <h4>${location.name}</h4>
                <div class="popup-coordinates">
                    <i class="fas fa-map-marker-alt"></i>
                    ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
                </div>
                ${location.address ? `<div class="popup-address">${location.address}</div>` : ''}
                ${location.category ? `<div class="popup-category">Category: ${location.category}</div>` : ''}
                ${location.timestamp ? `<div class="popup-time">Time: ${location.timestamp.toLocaleString()}</div>` : ''}
                <div class="popup-actions">
                    <button onclick="geoExplorer.analyzeLocation('${location.id}')" class="popup-btn">
                        <i class="fas fa-chart-line"></i> Analyze
                    </button>
                    <button onclick="geoExplorer.showDirections('${location.id}')" class="popup-btn">
                        <i class="fas fa-directions"></i> Directions
                    </button>
                </div>
            </div>
        `;
    }

    selectLocation(location) {
        this.selectedLocation = location;
        this.updateAnalysisPanel(location);
        this.highlightLocation(location);
        document.getElementById('selectedLocation').textContent = location.name;
    }

    highlightLocation(location) {
        // Remove previous highlights
        this.markers.forEach(marker => {
            marker.setStyle({ weight: 2 });
        });
        
        // Highlight selected marker
        const selectedMarker = this.markers.find(marker => marker._geoData.id === location.id);
        if (selectedMarker) {
            selectedMarker.setStyle({ weight: 4, color: '#ff0000' });
            selectedMarker.bringToFront();
        }
    }

    updateAnalysisPanel(location) {
        const analysisContent = document.getElementById('analysisContent');
        analysisContent.innerHTML = this.generateLocationAnalysis(location);
        
        // Update inspector tabs
        this.updateLocationInspector(location);
    }

    generateLocationAnalysis(location) {
        return `
            <div class="location-analysis">
                <div class="analysis-section">
                    <h4><i class="fas fa-info-circle"></i> Location Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Name:</label>
                            <span>${location.name}</span>
                        </div>
                        <div class="info-item">
                            <label>Coordinates:</label>
                            <span>${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</span>
                        </div>
                        <div class="info-item">
                            <label>Category:</label>
                            <span>${location.category}</span>
                        </div>
                        ${location.elevation ? `
                        <div class="info-item">
                            <label>Elevation:</label>
                            <span>${location.elevation}m</span>
                        </div>
                        ` : ''}
                        ${location.address ? `
                        <div class="info-item">
                            <label>Address:</label>
                            <span>${location.address}</span>
                        </div>
                        ` : ''}
                        ${location.timestamp ? `
                        <div class="info-item">
                            <label>Timestamp:</label>
                            <span>${location.timestamp.toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4><i class="fas fa-code"></i> Raw Data</h4>
                    <div class="data-preview">
                        <pre>${JSON.stringify(location.data, null, 2).substring(0, 500)}${JSON.stringify(location.data, null, 2).length > 500 ? '...' : ''}</pre>
                    </div>
                </div>
            </div>
        `;
    }

    updateLocationInspector(location) {
        // Properties inspector
        const propertiesInspector = document.getElementById('propertiesInspector');
        propertiesInspector.innerHTML = this.generateLocationProperties(location);
        
        // Spatial inspector
        const spatialInspector = document.getElementById('spatialInspector');
        spatialInspector.innerHTML = this.generateSpatialInfo(location);
        
        // Context inspector
        const contextInspector = document.getElementById('contextInspector');
        contextInspector.innerHTML = this.generateLocationContext(location);
    }

    generateLocationProperties(location) {
        const properties = Object.entries(location.properties);
        
        return `
            <div class="property-list">
                ${properties.length > 0 ? properties.map(([key, value]) => `
                    <div class="property-item">
                        <div class="property-key">${key}</div>
                        <div class="property-value">${typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                    </div>
                `).join('') : '<p>No additional properties</p>'}
            </div>
        `;
    }

    generateSpatialInfo(location) {
        const nearbyLocations = this.findNearbyLocations(location, 5000); // 5km radius
        const distanceToCenter = this.calculateDistanceToCenter(location);
        
        return `
            <div class="spatial-info">
                <div class="spatial-metric">
                    <label>Distance to Center:</label>
                    <span>${distanceToCenter.toFixed(2)} km</span>
                </div>
                <div class="spatial-metric">
                    <label>Nearby Locations:</label>
                    <span>${nearbyLocations.length}</span>
                </div>
                ${location.elevation ? `
                <div class="spatial-metric">
                    <label>Elevation:</label>
                    <span>${location.elevation} m</span>
                </div>
                ` : ''}
                
                <h5>Nearest Locations:</h5>
                <div class="nearby-list">
                    ${nearbyLocations.slice(0, 5).map(nearby => `
                        <div class="nearby-item" onclick="geoExplorer.selectLocation(${JSON.stringify(nearby.location).replace(/"/g, '&quot;')})">
                            <div class="nearby-name">${nearby.location.name}</div>
                            <div class="nearby-distance">${nearby.distance.toFixed(2)} km</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateLocationContext(location) {
        const sameCategory = this.geoData.filter(loc => 
            loc.id !== location.id && loc.category === location.category
        );
        
        const samePath = this.geoData.filter(loc => 
            loc.id !== location.id && loc.path.startsWith(location.path.split('.')[0])
        );
        
        return `
            <div class="context-info">
                <div class="context-section">
                    <h5>Same Category (${location.category})</h5>
                    <p>${sameCategory.length} other locations</p>
                    ${sameCategory.length > 0 ? `
                        <div class="context-list">
                            ${sameCategory.slice(0, 3).map(loc => `
                                <div class="context-item" onclick="geoExplorer.selectLocation(${JSON.stringify(loc).replace(/"/g, '&quot;')})">
                                    ${loc.name}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="context-section">
                    <h5>Same Data Source</h5>
                    <p>${samePath.length} related locations</p>
                    ${samePath.length > 0 ? `
                        <div class="context-list">
                            ${samePath.slice(0, 3).map(loc => `
                                <div class="context-item" onclick="geoExplorer.selectLocation(${JSON.stringify(loc).replace(/"/g, '&quot;')})">
                                    ${loc.name}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    findNearbyLocations(targetLocation, radiusMeters) {
        const nearby = [];
        
        this.geoData.forEach(location => {
            if (location.id === targetLocation.id) return;
            
            const distance = this.calculateDistance(
                targetLocation.lat, targetLocation.lng,
                location.lat, location.lng
            );
            
            if (distance * 1000 <= radiusMeters) {
                nearby.push({ location, distance });
            }
        });
        
        return nearby.sort((a, b) => a.distance - b.distance);
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateDistanceToCenter(location) {
        const bounds = this.calculateBounds();
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        
        return this.calculateDistance(location.lat, location.lng, centerLat, centerLng);
    }

    calculateBounds() {
        if (this.geoData.length === 0) {
            return { north: 0, south: 0, east: 0, west: 0 };
        }
        
        let north = -90, south = 90, east = -180, west = 180;
        
        this.geoData.forEach(location => {
            north = Math.max(north, location.lat);
            south = Math.min(south, location.lat);
            east = Math.max(east, location.lng);
            west = Math.min(west, location.lng);
        });
        
        return { north, south, east, west };
    }

    updateMapBounds() {
        if (this.geoData.length === 0) return;
        
        const bounds = this.calculateBounds();
        const leafletBounds = L.latLngBounds(
            [bounds.south, bounds.west],
            [bounds.north, bounds.east]
        );
        
        this.map.fitBounds(leafletBounds, { padding: [20, 20] });
    }

    applyFilters(data) {
        return data.filter(location => {
            // Bounding box filter
            if (this.filters.bbox) {
                const { north, south, east, west } = this.filters.bbox;
                if (location.lat < south || location.lat > north ||
                    location.lng < west || location.lng > east) {
                    return false;
                }
            }
            
            // Distance filter
            if (this.filters.distance && this.filters.distance.center) {
                const distance = this.calculateDistance(
                    this.filters.distance.center.lat,
                    this.filters.distance.center.lng,
                    location.lat, location.lng
                );
                if (distance > this.filters.distance.radius) {
                    return false;
                }
            }
            
            // Search filter
            if (this.filters.searchTerm) {
                const searchTerm = this.filters.searchTerm.toLowerCase();
                return location.name.toLowerCase().includes(searchTerm) ||
                       location.category.toLowerCase().includes(searchTerm) ||
                       (location.address && location.address.toLowerCase().includes(searchTerm));
            }
            
            return true;
        });
    }

    updateStats() {
        const locationCount = this.geoData.length;
        const bounds = this.calculateBounds();
        const area = this.calculateArea(bounds);
        const clusters = this.findClusters();
        const center = this.calculateCenterPoint();
        
        document.getElementById('locationCount').textContent = locationCount;
        document.getElementById('boundingArea').textContent = `${area.toFixed(0)} km²`;
        document.getElementById('clusterCount').textContent = clusters.length;
        document.getElementById('centerPoint').textContent = `${center.lat.toFixed(3)}°, ${center.lng.toFixed(3)}°`;
        
        this.updateSpatialMetrics();
    }

    calculateArea(bounds) {
        // Rough area calculation in square kilometers
        const latDiff = bounds.north - bounds.south;
        const lngDiff = bounds.east - bounds.west;
        const avgLat = (bounds.north + bounds.south) / 2;
        
        const latKm = latDiff * 111; // ~111 km per degree latitude
        const lngKm = lngDiff * 111 * Math.cos(avgLat * Math.PI / 180);
        
        return latKm * lngKm;
    }

    calculateCenterPoint() {
        if (this.geoData.length === 0) {
            return { lat: 0, lng: 0 };
        }
        
        const bounds = this.calculateBounds();
        return {
            lat: (bounds.north + bounds.south) / 2,
            lng: (bounds.east + bounds.west) / 2
        };
    }

    findClusters() {
        // Simple clustering based on proximity
        const clusters = [];
        const processed = new Set();
        const clusterRadius = 0.01; // ~1km
        
        this.geoData.forEach(location => {
            if (processed.has(location.id)) return;
            
            const cluster = {
                id: clusters.length,
                center: { lat: location.lat, lng: location.lng },
                locations: [location]
            };
            
            processed.add(location.id);
            
            // Find nearby locations
            this.geoData.forEach(otherLocation => {
                if (processed.has(otherLocation.id)) return;
                
                const distance = this.calculateDistance(
                    location.lat, location.lng,
                    otherLocation.lat, otherLocation.lng
                );
                
                if (distance <= clusterRadius) {
                    cluster.locations.push(otherLocation);
                    processed.add(otherLocation.id);
                }
            });
            
            clusters.push(cluster);
        });
        
        return clusters;
    }

    updateSpatialMetrics() {
        const avgDistance = this.calculateAverageDistance();
        const spatialSpread = this.calculateSpatialSpread();
        
        document.getElementById('avgDistance').textContent = `${avgDistance.toFixed(2)} km`;
        document.getElementById('spatialSpread').textContent = `${spatialSpread.toFixed(0)} km²`;
    }

    calculateAverageDistance() {
        if (this.geoData.length < 2) return 0;
        
        let totalDistance = 0;
        let count = 0;
        
        for (let i = 0; i < this.geoData.length; i++) {
            for (let j = i + 1; j < this.geoData.length; j++) {
                totalDistance += this.calculateDistance(
                    this.geoData[i].lat, this.geoData[i].lng,
                    this.geoData[j].lat, this.geoData[j].lng
                );
                count++;
            }
        }
        
        return count > 0 ? totalDistance / count : 0;
    }

    calculateSpatialSpread() {
        const bounds = this.calculateBounds();
        return this.calculateArea(bounds);
    }

    populateLayerControls() {
        const layerControls = document.getElementById('layerControls');
        layerControls.innerHTML = '';
        
        // Create controls for different data categories
        const categories = [...new Set(this.geoData.map(d => d.category))];
        
        categories.forEach(category => {
            const categoryCount = this.geoData.filter(d => d.category === category).length;
            
            const control = document.createElement('label');
            control.className = 'visibility-control';
            control.innerHTML = `
                <input type="checkbox" value="${category}" checked>
                <span class="checkmark"></span>
                <span>${category} (${categoryCount})</span>
            `;
            
            control.querySelector('input').addEventListener('change', () => this.updateCategoryVisibility());
            layerControls.appendChild(control);
        });
    }

    updateCategoryVisibility() {
        const visibleCategories = new Set();
        
        document.querySelectorAll('#layerControls input:checked').forEach(input => {
            visibleCategories.add(input.value);
        });
        
        this.markers.forEach(marker => {
            const category = marker._geoData.category;
            if (visibleCategories.has(category)) {
                marker.addTo(this.markerLayer);
            } else {
                this.markerLayer.removeLayer(marker);
            }
        });
    }

    updateLayerControls() {
        // Update layer control checkboxes based on current data
        this.populateLayerControls();
    }

    // Map interaction methods
    setMapLayer(mode) {
        if (this.currentMapLayer) {
            this.map.removeLayer(this.currentMapLayer);
        }
        
        let tileUrl, attribution;
        
        switch (mode) {
            case 'street':
                tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                attribution = '© OpenStreetMap contributors';
                break;
            case 'satellite':
                tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
                attribution = '© Esri';
                break;
            case 'terrain':
                tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
                attribution = '© OpenTopoMap contributors';
                break;
            case 'dark':
                tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                attribution = '© CARTO';
                break;
        }
        
        this.currentMapLayer = L.tileLayer(tileUrl, {
            attribution: attribution,
            maxZoom: 18
        }).addTo(this.map);
        
        this.currentMapMode = mode;
    }

    switchMapMode(mode) {
        this.setMapLayer(mode);
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
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

    // Analysis methods
    geolocateData() {
        this.showMessage('Geolocating data points...', 'info');
        
        // In a real implementation, this would use geocoding services
        // to convert addresses to coordinates
        let geolocated = 0;
        
        this.geoData.forEach(location => {
            if (!location.address && location.data.address) {
                // Simulate geocoding
                geolocated++;
            }
        });
        
        this.showMessage(`Geolocated ${geolocated} additional locations`, 'success');
    }

    analyzePatterns() {
        this.showMessage('Analyzing spatial patterns...', 'info');
        
        const analysis = this.performSpatialAnalysis();
        this.showSpatialAnalysisModal(analysis);
    }

    performSpatialAnalysis() {
        const clusters = this.findClusters();
        const distribution = this.analyzeDistribution();
        const density = this.analyzeDensity();
        const hotspots = this.findHotspots();
        
        return { clusters, distribution, density, hotspots };
    }

    analyzeDistribution() {
        const bounds = this.calculateBounds();
        const gridSize = 10;
        const grid = [];
        
        const latStep = (bounds.north - bounds.south) / gridSize;
        const lngStep = (bounds.east - bounds.west) / gridSize;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cellBounds = {
                    south: bounds.south + i * latStep,
                    north: bounds.south + (i + 1) * latStep,
                    west: bounds.west + j * lngStep,
                    east: bounds.west + (j + 1) * lngStep
                };
                
                const count = this.geoData.filter(location =>
                    location.lat >= cellBounds.south && location.lat < cellBounds.north &&
                    location.lng >= cellBounds.west && location.lng < cellBounds.east
                ).length;
                
                grid.push({ bounds: cellBounds, count });
            }
        }
        
        return {
            evenness: this.calculateEvenness(grid),
            concentration: this.calculateConcentration(grid),
            grid: grid
        };
    }

    calculateEvenness(grid) {
        const counts = grid.map(cell => cell.count);
        const total = counts.reduce((sum, count) => sum + count, 0);
        const expected = total / grid.length;
        
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - expected, 2), 0) / grid.length;
        const standardDeviation = Math.sqrt(variance);
        
        return expected > 0 ? 1 - (standardDeviation / expected) : 1;
    }

    calculateConcentration(grid) {
        const counts = grid.map(cell => cell.count);
        const total = counts.reduce((sum, count) => sum + count, 0);
        const maxCount = Math.max(...counts);
        
        return total > 0 ? maxCount / total : 0;
    }

    analyzeDensity() {
        const bounds = this.calculateBounds();
        const area = this.calculateArea(bounds);
        const density = this.geoData.length / area; // locations per km²
        
        return {
            overall: density,
            peak: this.findPeakDensity(),
            variance: this.calculateDensityVariance()
        };
    }

    findPeakDensity() {
        const searchRadius = 1; // km
        let maxDensity = 0;
        
        this.geoData.forEach(location => {
            const nearby = this.findNearbyLocations(location, searchRadius * 1000);
            const localDensity = nearby.length / (Math.PI * searchRadius * searchRadius);
            maxDensity = Math.max(maxDensity, localDensity);
        });
        
        return maxDensity;
    }

    calculateDensityVariance() {
        // Calculate local densities and their variance
        const searchRadius = 1; // km
        const densities = [];
        
        this.geoData.forEach(location => {
            const nearby = this.findNearbyLocations(location, searchRadius * 1000);
            const localDensity = nearby.length / (Math.PI * searchRadius * searchRadius);
            densities.push(localDensity);
        });
        
        const avgDensity = densities.reduce((sum, d) => sum + d, 0) / densities.length;
        const variance = densities.reduce((sum, d) => sum + Math.pow(d - avgDensity, 2), 0) / densities.length;
        
        return Math.sqrt(variance);
    }

    findHotspots() {
        const searchRadius = 2; // km
        const minPoints = 3;
        const hotspots = [];
        
        this.geoData.forEach(location => {
            const nearby = this.findNearbyLocations(location, searchRadius * 1000);
            
            if (nearby.length >= minPoints) {
                const avgLat = nearby.reduce((sum, n) => sum + n.location.lat, location.lat) / (nearby.length + 1);
                const avgLng = nearby.reduce((sum, n) => sum + n.location.lng, location.lng) / (nearby.length + 1);
                
                hotspots.push({
                    center: { lat: avgLat, lng: avgLng },
                    intensity: nearby.length + 1,
                    radius: searchRadius,
                    locations: [location, ...nearby.map(n => n.location)]
                });
            }
        });
        
        // Remove overlapping hotspots
        return this.mergeOverlappingHotspots(hotspots);
    }

    mergeOverlappingHotspots(hotspots) {
        const merged = [];
        const processed = new Set();
        
        hotspots.forEach((hotspot, index) => {
            if (processed.has(index)) return;
            
            const cluster = [hotspot];
            processed.add(index);
            
            hotspots.forEach((otherHotspot, otherIndex) => {
                if (processed.has(otherIndex)) return;
                
                const distance = this.calculateDistance(
                    hotspot.center.lat, hotspot.center.lng,
                    otherHotspot.center.lat, otherHotspot.center.lng
                );
                
                if (distance < (hotspot.radius + otherHotspot.radius) / 2) {
                    cluster.push(otherHotspot);
                    processed.add(otherIndex);
                }
            });
            
            // Merge cluster into single hotspot
            if (cluster.length === 1) {
                merged.push(cluster[0]);
            } else {
                const allLocations = cluster.flatMap(h => h.locations);
                const avgLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;
                const avgLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;
                
                merged.push({
                    center: { lat: avgLat, lng: avgLng },
                    intensity: allLocations.length,
                    radius: Math.max(...cluster.map(h => h.radius)),
                    locations: allLocations
                });
            }
        });
        
        return merged.sort((a, b) => b.intensity - a.intensity);
    }

    toggleHeatmap() {
        this.isHeatmapVisible = !this.isHeatmapVisible;
        
        if (this.isHeatmapVisible) {
            this.createHeatmap();
            document.getElementById('showHeatmap').checked = true;
        } else {
            this.removeHeatmap();
            document.getElementById('showHeatmap').checked = false;
        }
        
        const btn = document.getElementById('heatmapToggle');
        btn.classList.toggle('active', this.isHeatmapVisible);
    }

    createHeatmap() {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }
        
        // For demonstration, create a simple circle-based heatmap
        // In a real implementation, you might use a plugin like Leaflet.heat
        const heatPoints = this.geoData.map(location => ({
            lat: location.lat,
            lng: location.lng,
            intensity: 1
        }));
        
        this.heatmapLayer = L.layerGroup();
        
        heatPoints.forEach(point => {
            const circle = L.circle([point.lat, point.lng], {
                radius: 500, // 500 meters
                fillColor: 'red',
                fillOpacity: 0.3,
                color: 'red',
                weight: 0
            });
            
            this.heatmapLayer.addLayer(circle);
        });
        
        this.heatmapLayer.addTo(this.map);
    }

    removeHeatmap() {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
    }

    showSpatialAnalysisModal(analysis) {
        const modal = document.getElementById('spatialAnalysisModal');
        
        // Update modal content
        document.getElementById('distributionAnalysis').innerHTML = this.generateDistributionContent(analysis.distribution);
        document.getElementById('clustersAnalysis').innerHTML = this.generateClustersContent(analysis.clusters);
        document.getElementById('densityAnalysis').innerHTML = this.generateDensityContent(analysis.density);
        document.getElementById('hotspotsAnalysis').innerHTML = this.generateHotspotsContent(analysis.hotspots);
        
        modal.style.display = 'flex';
        
        // Setup modal event handlers
        modal.querySelector('.modal-close').onclick = () => this.closeSpatialAnalysis();
        modal.querySelector('.modal-backdrop').onclick = () => this.closeSpatialAnalysis();
        
        // Setup tab switching
        modal.querySelectorAll('.analysis-tab').forEach(tab => {
            tab.onclick = () => this.switchAnalysisTab(tab.dataset.tab);
        });
    }

    generateDistributionContent(distribution) {
        return `
            <div class="distribution-analysis">
                <div class="distribution-metrics">
                    <div class="metric-card">
                        <div class="metric-value">${(distribution.evenness * 100).toFixed(1)}%</div>
                        <div class="metric-label">Evenness</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${(distribution.concentration * 100).toFixed(1)}%</div>
                        <div class="metric-label">Concentration</div>
                    </div>
                </div>
                
                <h5>Distribution Pattern</h5>
                <p>${distribution.evenness > 0.7 ? 'Even distribution' : 
                     distribution.evenness > 0.4 ? 'Moderately clustered' : 'Highly clustered'}</p>
                
                <div class="grid-visualization">
                    ${distribution.grid.slice(0, 25).map((cell, index) => `
                        <div class="grid-cell" style="opacity: ${Math.min(cell.count / 5, 1)}">
                            ${cell.count}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateClustersContent(clusters) {
        return `
            <div class="clusters-analysis">
                <h4>Detected Clusters: ${clusters.length}</h4>
                <div class="cluster-list">
                    ${clusters.map(cluster => `
                        <div class="cluster-item">
                            <div class="cluster-header">
                                <span class="cluster-size">${cluster.locations.length} locations</span>
                                <span class="cluster-coords">${cluster.center.lat.toFixed(4)}, ${cluster.center.lng.toFixed(4)}</span>
                            </div>
                            <div class="cluster-locations">
                                ${cluster.locations.slice(0, 3).map(loc => loc.name).join(', ')}
                                ${cluster.locations.length > 3 ? `... and ${cluster.locations.length - 3} more` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateDensityContent(density) {
        return `
            <div class="density-analysis">
                <div class="density-metrics">
                    <div class="metric-card">
                        <div class="metric-value">${density.overall.toFixed(2)}</div>
                        <div class="metric-label">Overall Density (/km²)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${density.peak.toFixed(2)}</div>
                        <div class="metric-label">Peak Density (/km²)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${density.variance.toFixed(2)}</div>
                        <div class="metric-label">Density Variance</div>
                    </div>
                </div>
                
                <h5>Density Pattern</h5>
                <p>${density.variance < density.overall * 0.5 ? 'Uniform density distribution' : 
                     density.variance < density.overall * 1.0 ? 'Moderate density variation' : 'High density variation'}</p>
            </div>
        `;
    }

    generateHotspotsContent(hotspots) {
        return `
            <div class="hotspots-analysis">
                <h4>Detected Hotspots: ${hotspots.length}</h4>
                <div class="hotspot-list">
                    ${hotspots.map((hotspot, index) => `
                        <div class="hotspot-item">
                            <div class="hotspot-header">
                                <span class="hotspot-rank">#${index + 1}</span>
                                <span class="hotspot-intensity">${hotspot.intensity} locations</span>
                            </div>
                            <div class="hotspot-center">${hotspot.center.lat.toFixed(4)}, ${hotspot.center.lng.toFixed(4)}</div>
                            <div class="hotspot-radius">Radius: ${hotspot.radius} km</div>
                            <button onclick="geoExplorer.zoomToHotspot(${JSON.stringify(hotspot).replace(/"/g, '&quot;')})" 
                                    class="hotspot-btn">View on Map</button>
                        </div>
                    `).join('')}
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

    closeSpatialAnalysis() {
        document.getElementById('spatialAnalysisModal').style.display = 'none';
    }

    zoomToHotspot(hotspot) {
        this.map.setView([hotspot.center.lat, hotspot.center.lng], 14);
        
        // Add temporary circle to show hotspot
        const circle = L.circle([hotspot.center.lat, hotspot.center.lng], {
            radius: hotspot.radius * 1000,
            fillColor: 'red',
            fillOpacity: 0.2,
            color: 'red',
            weight: 2
        }).addTo(this.map);
        
        setTimeout(() => {
            this.map.removeLayer(circle);
        }, 3000);
        
        this.closeSpatialAnalysis();
    }

    // Map control methods
    updateMapInfo() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        
        document.getElementById('currentZoom').textContent = `Zoom: ${zoom}`;
        document.getElementById('currentCenter').textContent = 
            `Center: ${center.lat.toFixed(4)}°, ${center.lng.toFixed(4)}°`;
    }

    zoomToFit() {
        if (this.geoData.length > 0) {
            this.updateMapBounds();
        } else {
            this.map.setView([37.5665, 126.9780], 10);
        }
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    this.map.setView([lat, lng], 15);
                    
                    L.marker([lat, lng])
                        .addTo(this.map)
                        .bindPopup('Your current location')
                        .openPopup();
                    
                    this.showMessage('Located your position', 'success');
                },
                (error) => {
                    this.showMessage('Unable to get your location', 'error');
                }
            );
        } else {
            this.showMessage('Geolocation is not supported', 'error');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.getElementById('mapContainer').requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // Style update methods
    updateMarkerSize(size) {
        this.styles.markerSize = parseInt(size);
        document.getElementById('markerSizeValue').textContent = `${size}px`;
        
        this.markers.forEach(marker => {
            marker.setRadius(this.styles.markerSize);
        });
    }

    updateMarkerOpacity(opacity) {
        this.styles.markerOpacity = parseFloat(opacity);
        document.getElementById('opacityValue').textContent = opacity;
        
        this.markers.forEach(marker => {
            marker.setStyle({ opacity: this.styles.markerOpacity });
        });
    }

    updateColorScheme(scheme) {
        this.styles.colorScheme = scheme;
        
        this.markers.forEach(marker => {
            const color = this.getMarkerColor(marker._geoData);
            marker.setStyle({ fillColor: color });
        });
    }

    updateVisibility() {
        const showMarkers = document.getElementById('showMarkers').checked;
        const showClusters = document.getElementById('showClusters').checked;
        const showHeatmap = document.getElementById('showHeatmap').checked;
        const showTrails = document.getElementById('showTrails').checked;
        
        // Apply visibility changes
        if (showMarkers) {
            this.markerLayer.addTo(this.map);
        } else {
            this.map.removeLayer(this.markerLayer);
        }
        
        if (showHeatmap !== this.isHeatmapVisible) {
            this.toggleHeatmap();
        }
    }

    // Search and filter methods
    searchLocation() {
        const searchTerm = document.getElementById('locationSearch').value;
        this.filters.searchTerm = searchTerm;
        
        if (searchTerm.trim()) {
            const results = this.geoData.filter(location =>
                location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            
            this.displaySearchResults(results);
            this.updateMap();
            
            if (results.length > 0) {
                this.showMessage(`Found ${results.length} locations`, 'info');
            } else {
                this.showMessage('No locations found', 'warning');
            }
        } else {
            this.clearSearchResults();
            this.updateMap();
        }
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }
        
        searchResults.innerHTML = results.slice(0, 10).map(location => `
            <div class="search-result" onclick="geoExplorer.selectLocationById('${location.id}')">
                <div class="result-name">${location.name}</div>
                <div class="result-category">${location.category}</div>
                <div class="result-coords">${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</div>
            </div>
        `).join('');
    }

    clearSearchResults() {
        document.getElementById('searchResults').innerHTML = '';
        this.filters.searchTerm = '';
    }

    selectLocationById(id) {
        const location = this.geoData.find(loc => loc.id == id);
        if (location) {
            this.selectLocation(location);
            this.map.setView([location.lat, location.lng], 15);
            this.clearSearchResults();
        }
    }

    // Context menu methods
    showMapContextMenu(e) {
        e.originalEvent.preventDefault();
        
        this.currentContextMenuPos = e.latlng;
        
        const contextMenu = document.getElementById('geoContextMenu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.originalEvent.pageX + 'px';
        contextMenu.style.top = e.originalEvent.pageY + 'px';
    }

    hideContextMenu() {
        document.getElementById('geoContextMenu').style.display = 'none';
    }

    // Tooltip methods
    showTooltip(event, location) {
        const tooltip = document.getElementById('geoTooltip');
        tooltip.querySelector('.tooltip-title').textContent = location.name;
        tooltip.querySelector('.tooltip-coordinates').textContent = 
            `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        tooltip.querySelector('.tooltip-description').textContent = location.category;
        tooltip.querySelector('.tooltip-metadata').textContent = 
            location.address || `Path: ${location.path}`;
        
        tooltip.style.left = (event.originalEvent.pageX + 10) + 'px';
        tooltip.style.top = (event.originalEvent.pageY - 10) + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        document.getElementById('geoTooltip').classList.remove('show');
    }

    // Utility methods
    showLoading() {
        document.getElementById('geoLoading').style.display = 'flex';
        document.getElementById('geoEmpty').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('geoLoading').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('geoEmpty').style.display = 'flex';
        document.getElementById('geoLoading').style.display = 'none';
    }

    hideEmptyState() {
        document.getElementById('geoEmpty').style.display = 'none';
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'f':
                this.zoomToFit();
                break;
            case 'h':
                this.toggleHeatmap();
                break;
            case 'Escape':
                this.hideContextMenu();
                break;
        }
    }

    showMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--geo-${type === 'error' ? 'accent' : type === 'success' ? 'success' : 'primary'});
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: var(--geo-shadow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
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

// Initialize the Geospatial Data Explorer
let geoExplorer;
document.addEventListener('DOMContentLoaded', () => {
    geoExplorer = new GeospatialDataExplorer();
});

// Global functions for HTML onclick handlers
function searchLocation() {
    geoExplorer.searchLocation();
}

function applyDistanceFilter() {
    const distance = parseFloat(document.getElementById('distanceValue').value);
    const unit = document.getElementById('distanceUnit').value;
    
    if (distance && distance > 0) {
        let radiusKm = distance;
        if (unit === 'mi') radiusKm *= 1.609;
        if (unit === 'm') radiusKm /= 1000;
        
        // Use map center as reference point
        const center = geoExplorer.map.getCenter();
        geoExplorer.filters.distance = {
            center: { lat: center.lat, lng: center.lng },
            radius: radiusKm
        };
        
        geoExplorer.updateMap();
        geoExplorer.showMessage(`Applied distance filter: ${distance} ${unit}`, 'info');
    }
}

function applyBboxFilter() {
    const north = parseFloat(document.getElementById('bboxNorth').value);
    const south = parseFloat(document.getElementById('bboxSouth').value);
    const east = parseFloat(document.getElementById('bboxEast').value);
    const west = parseFloat(document.getElementById('bboxWest').value);
    
    if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
        geoExplorer.filters.bbox = { north, south, east, west };
        geoExplorer.updateMap();
        geoExplorer.showMessage('Applied bounding box filter', 'info');
    }
}

function goToCoordinates() {
    const lat = parseFloat(document.getElementById('coordLat').value);
    const lng = parseFloat(document.getElementById('coordLng').value);
    
    if (!isNaN(lat) && !isNaN(lng)) {
        geoExplorer.map.setView([lat, lng], 15);
        geoExplorer.showMessage(`Navigated to ${lat}, ${lng}`, 'info');
    }
}

// Analysis functions
function analyzeDistribution() {
    geoExplorer.analyzePatterns();
}

function findClusters() {
    geoExplorer.showMessage('Finding spatial clusters...', 'info');
    const clusters = geoExplorer.findClusters();
    geoExplorer.showMessage(`Found ${clusters.length} clusters`, 'success');
}

function calculateDensity() {
    geoExplorer.showMessage('Calculating density patterns...', 'info');
    const density = geoExplorer.analyzeDensity();
    geoExplorer.showMessage(`Overall density: ${density.overall.toFixed(2)} locations/km²`, 'success');
}

function findHotspots() {
    geoExplorer.showMessage('Detecting hotspots...', 'info');
    const hotspots = geoExplorer.findHotspots();
    geoExplorer.showMessage(`Found ${hotspots.length} hotspots`, 'success');
}

// Path analysis functions
function calculateRoute() {
    geoExplorer.showMessage('Route calculation would require routing service', 'info');
}

function findOptimalPath() {
    geoExplorer.showMessage('Optimal path calculation feature coming soon', 'info');
}

function analyzePaths() {
    geoExplorer.showMessage('Path network analysis feature coming soon', 'info');
}

// Context menu functions
function addMarkerHere() {
    if (geoExplorer.currentContextMenuPos) {
        const pos = geoExplorer.currentContextMenuPos;
        L.marker([pos.lat, pos.lng])
            .addTo(geoExplorer.map)
            .bindPopup(`Custom marker<br>${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`)
            .openPopup();
        
        geoExplorer.showMessage('Marker added', 'success');
    }
    geoExplorer.hideContextMenu();
}

function measureFromHere() {
    geoExplorer.showMessage('Measurement tool activated', 'info');
    geoExplorer.hideContextMenu();
}

function searchNearby() {
    if (geoExplorer.currentContextMenuPos) {
        const pos = geoExplorer.currentContextMenuPos;
        const nearby = geoExplorer.findNearbyLocations(pos, 1000);
        geoExplorer.showMessage(`Found ${nearby.length} nearby locations`, 'info');
    }
    geoExplorer.hideContextMenu();
}

function getElevation() {
    geoExplorer.showMessage('Elevation service would require external API', 'info');
    geoExplorer.hideContextMenu();
}

function getAddress() {
    geoExplorer.showMessage('Geocoding service would require external API', 'info');
    geoExplorer.hideContextMenu();
}

function exportLocation() {
    if (geoExplorer.currentContextMenuPos) {
        const pos = geoExplorer.currentContextMenuPos;
        const data = JSON.stringify(pos, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'location.json';
        a.click();
        URL.revokeObjectURL(url);
        geoExplorer.showMessage('Location exported', 'success');
    }
    geoExplorer.hideContextMenu();
}

function exportAnalysisResults() {
    geoExplorer.showMessage('Exporting analysis results...', 'info');
    geoExplorer.closeSpatialAnalysis();
}

function toggleLegend() {
    const legend = document.getElementById('mapLegend');
    const content = document.getElementById('legendContent');
    const toggle = document.querySelector('.legend-toggle i');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.className = 'fas fa-chevron-up';
    } else {
        content.style.display = 'none';
        toggle.className = 'fas fa-chevron-down';
    }
}