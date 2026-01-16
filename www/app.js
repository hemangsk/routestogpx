import init, { parse_google_maps_url, parse_kml, route_to_gpx } from './pkg/routes_to_gpx.js';

let wasm;
let map;
let currentRoute = null;

async function initApp() {
    try {
        wasm = await init();
        setupEventListeners();
        initMap();
    } catch (e) {
        showError('Failed to initialize: ' + e.message);
    }
}

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [0, 0],
        zoom: 1
    });
}

function setupEventListeners() {
    document.getElementById('parse-url-btn').addEventListener('click', handleParseUrl);
    document.getElementById('url-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleParseUrl();
    });
    document.getElementById('kml-upload').addEventListener('change', handleKmlUpload);
    document.getElementById('download-btn').addEventListener('click', handleDownload);
}

async function handleParseUrl() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a Google Maps URL');
        return;
    }

    hideError();
    
    try {
        currentRoute = parse_google_maps_url(url);
        displayRoute(currentRoute);
    } catch (e) {
        showError('Failed to parse URL: ' + e);
    }
}

async function handleKmlUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('file-name').textContent = file.name;
    hideError();

    try {
        const content = await file.text();
        currentRoute = parse_kml(content);
        displayRoute(currentRoute);
    } catch (e) {
        showError('Failed to parse KML: ' + e);
    }
}

function displayRoute(route) {
    const mapSection = document.getElementById('map-section');
    const downloadSection = document.getElementById('download-section');
    
    mapSection.classList.add('visible');
    downloadSection.classList.add('visible');

    if (map.getSource('route')) {
        map.removeLayer('route-line');
        map.removeSource('route');
    }

    if (map.getSource('waypoints')) {
        map.removeLayer('waypoints');
        map.removeSource('waypoints');
    }

    const coordinates = getAllCoordinates(route);
    
    if (coordinates.length === 0) {
        showError('No coordinates found in route');
        return;
    }

    map.addSource('route', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        }
    });

    map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
            'line-color': '#000000',
            'line-width': 3
        }
    });

    if (route.waypoints && route.waypoints.length > 0) {
        const waypointFeatures = route.waypoints.map(wp => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [wp.coord.lon, wp.coord.lat]
            },
            properties: {
                name: wp.name || ''
            }
        }));

        map.addSource('waypoints', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: waypointFeatures
            }
        });

        map.addLayer({
            id: 'waypoints',
            type: 'circle',
            source: 'waypoints',
            paint: {
                'circle-radius': 6,
                'circle-color': '#ffffff',
                'circle-stroke-color': '#000000',
                'circle-stroke-width': 2
            }
        });
    }

    const bounds = new maplibregl.LngLatBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    
    map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
    });
}

function getAllCoordinates(route) {
    const coords = [];
    
    if (route.tracks) {
        for (const track of route.tracks) {
            if (track.segments) {
                for (const segment of track.segments) {
                    if (segment.points) {
                        for (const point of segment.points) {
                            coords.push([point.lon, point.lat]);
                        }
                    }
                }
            }
        }
    }
    
    if (coords.length === 0 && route.waypoints) {
        for (const wp of route.waypoints) {
            coords.push([wp.coord.lon, wp.coord.lat]);
        }
    }
    
    return coords;
}

function handleDownload() {
    if (!currentRoute) {
        showError('No route to download');
        return;
    }

    try {
        const gpx = route_to_gpx(currentRoute);
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'route.gpx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        showError('Failed to generate GPX: ' + e);
    }
}

function showError(message) {
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    errorSection.classList.add('visible');
}

function hideError() {
    document.getElementById('error-section').classList.remove('visible');
}

initApp();

