# Google Maps to GPX Converter - Technical Plan

## Overview

A browser-only tool that converts Google Maps route URLs into GPX files with a live map preview. Built with Rust/WebAssembly, deployable on GitHub Pages with zero backend requirements.

## Core Requirements

| Requirement | Solution |
|-------------|----------|
| No backend server | Pure client-side Rust/WASM |
| No paid maps / API keys | OpenFreeMap + MapLibre GL JS |
| Static hosting | GitHub Pages compatible |
| Route preview | MapLibre GL JS with free vector tiles |
| GPX generation | Rust WASM module |

## Input Methods

The tool supports two input methods:

1. **Google Maps URL** - Paste the directions URL directly
2. **KML File Upload** - Import exported KML from Google My Maps

KML is the more reliable option since it's a documented XML format, while Google Maps URLs can change without notice.

## UI Design

**Philosophy:** Brutalist, minimal, functional. No decoration.

**Color Palette:**
- Background: `#ffffff` (white)
- Text/borders: `#000000` (black)
- No grays, no accent colors

**Typography:**
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Single font weight for body
- Bold for headings only

**Layout:**
```
┌─────────────────────────────────────────────┐
│  MAPS TO GPX                                │
├─────────────────────────────────────────────┤
│                                             │
│  [________________________] [Parse URL]     │
│                                             │
│  ─────────── or ───────────                 │
│                                             │
│  [Choose KML File]                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│           ┌─────────────────┐               │
│           │                 │               │
│           │   Map Preview   │               │
│           │                 │               │
│           └─────────────────┘               │
│                                             │
│            [Download GPX]                   │
│                                             │
└─────────────────────────────────────────────┘
```

**Component Styles:**
- Buttons: Black border (1px), white fill, black text. Invert on hover.
- Inputs: Black border (1px), no border-radius
- Map: Black border (1px)
- No shadows, no gradients, no rounded corners

**CSS Variables:**
```css
:root {
    --bg: #ffffff;
    --fg: #000000;
    --border: 1px solid #000000;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   HTML/CSS  │    │  MapLibre   │    │   Rust/WASM     │  │
│  │     UI      │◄──►│   GL JS     │◄──►│     Core        │  │
│  │             │    │  (Map View) │    │  (Parser/GPX)   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│                   ┌─────────────────┐                       │
│                   │  OpenFreeMap    │                       │
│                   │  Vector Tiles   │                       │
│                   │  (Free, No Key) │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Map Tiles (Free, No API Key Required)

**Primary: OpenFreeMap**
- URL: `https://tiles.openfreemap.org/`
- Provides: Free vector tiles globally, MapLibre-compatible styles
- License: OpenStreetMap data (ODbL), free for any use
- No API key, no rate limits for reasonable usage
- Includes fonts and sprites

**Fallback Options:**
1. **Protomaps** - PMTiles format, can self-host a single static file
2. **Stadia Maps** - Free tier available
3. **Self-hosted PMTiles** - Download region extract, host as static file

### Frontend Map Rendering

**MapLibre GL JS** (not Rust)
- Open-source fork of Mapbox GL JS
- No API key required
- Works with any vector tile source
- Excellent route overlay support via GeoJSON
- Well-documented, battle-tested

Rationale: While maplibre-rs exists for Rust, MapLibre GL JS is more mature, has better browser support, and integrates seamlessly with vector tile sources. The Rust/WASM handles parsing and GPX generation where it provides real value.

### Rust/WASM Core

**Build Tooling:**
- `wasm-pack` for compilation
- `wasm-bindgen` for JS interop
- Target: `wasm32-unknown-unknown`

**Crate Dependencies:**
```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
url = "2.5"
base64 = "0.21"
quick-xml = "0.31"
thiserror = "1.0"
console_error_panic_hook = "0.1"

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

Note: `quick-xml` handles both KML parsing (input) and GPX writing (output) - no need for separate XML crates.

## Google Maps URL Parsing

### URL Formats to Support

1. **Share Link Format:**
   ```
   https://www.google.com/maps/dir/Start+Location/End+Location/@lat,lng,zoom
   ```

2. **Directions with Data Parameter:**
   ```
   https://www.google.com/maps/dir/...?data=!4m...
   ```
   The `data=` parameter contains protobuf-encoded route information.

3. **Waypoint Format:**
   ```
   https://www.google.com/maps/dir/Start/Waypoint1/Waypoint2/End/
   ```

### Parsing Strategy

1. **Extract coordinates from URL path** - Parse location names and coordinates
2. **Decode `data=` parameter** - Contains base64-encoded protobuf with:
   - Waypoint coordinates
   - Encoded polyline (route geometry)
   - Travel mode
3. **Decode polyline** - Google's polyline encoding algorithm

### Reference Implementation

The `google-maps-data-parameter-parser` JS library provides guidance on parsing the data parameter. Port relevant logic to Rust.

## KML Parsing

### How Users Export KML from Google Maps

1. Create route in Google Maps
2. Save to Google My Maps (click "Save" or share menu)
3. Open in My Maps (mymaps.google.com)
4. Click three dots menu -> "Export to KML/KMZ"
5. Select "Export as KML" (not KMZ)
6. Upload the .kml file to this tool

### KML Structure (Relevant Elements)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Route Name</name>
    <Placemark>
      <name>Waypoint Name</name>
      <Point>
        <coordinates>-122.4194,37.7749,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Route</name>
      <LineString>
        <coordinates>
          -122.4194,37.7749,0
          -122.4089,37.7835,0
          -122.4000,37.7900,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
```

### KML Parser Implementation

Extract from KML:
- `<Point>` elements -> waypoints
- `<LineString>` elements -> track segments
- `<name>` elements -> labels

Note: KML uses `longitude,latitude,altitude` order (opposite of GPX's `lat,lon`).

## GPX Generation

### GPX Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="maps-to-gpx">
  <metadata>
    <name>Route Name</name>
    <time>2026-01-15T00:00:00Z</time>
  </metadata>
  <trk>
    <name>Track Name</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>0</ele>
      </trkpt>
      <!-- more points -->
    </trkseg>
  </trk>
  <wpt lat="37.7749" lon="-122.4194">
    <name>Waypoint Name</name>
  </wpt>
</gpx>
```

### Rust GPX Writer

Build a minimal XML writer using `quick-xml` rather than pulling in a full GPX crate. This keeps WASM size small.

## Project Structure

```
maps_to_gpx/
├── Cargo.toml
├── src/
│   ├── lib.rs              # WASM entry point, exported functions
│   ├── parser/
│   │   ├── mod.rs
│   │   ├── url.rs          # Google Maps URL parsing
│   │   ├── kml.rs          # KML file parsing
│   │   ├── polyline.rs     # Polyline decoding
│   │   └── data_param.rs   # data= parameter parsing
│   ├── gpx/
│   │   ├── mod.rs
│   │   └── writer.rs       # GPX XML generation
│   └── types.rs            # Route, Waypoint, TrackPoint structs
├── www/
│   ├── index.html
│   ├── styles.css
│   ├── app.js              # MapLibre integration, WASM glue
│   └── pkg/                # wasm-pack output (generated)
├── tests/
│   ├── parser_tests.rs
│   └── kml_tests.rs
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deployment
```

## Implementation Phases

### Phase 1: Core Parsers (Week 1)

1. Set up Rust project with wasm-pack
2. Implement KML parser (easier, well-documented format)
   - Parse Point elements for waypoints
   - Parse LineString elements for tracks
   - Handle coordinate order conversion (KML is lon,lat vs GPX lat,lon)
3. Implement Google Maps URL parser
   - Extract origin/destination from path
   - Parse coordinates from path segments
   - Decode polyline algorithm
4. Unit tests with sample files and URLs

**Deliverable:** WASM module that parses both KML files and URLs, returns JSON with coordinates

### Phase 2: GPX Generation (Week 1-2)

1. Define Rust types for Route, Waypoint, TrackPoint
2. Implement GPX XML writer
3. Export function: `generate_gpx(route_json) -> gpx_string`

**Deliverable:** WASM module that outputs valid GPX XML

### Phase 3: Map Preview (Week 2)

1. Set up HTML/CSS UI
2. Integrate MapLibre GL JS with OpenFreeMap tiles
3. Wire up WASM module
4. Display route as GeoJSON overlay on map
5. Style route line and waypoint markers

**Deliverable:** Working preview in browser

### Phase 4: Polish & Deploy (Week 3)

1. Add GPX download functionality (Blob + download link)
2. Error handling and user feedback
3. Responsive design
4. Build pipeline with GitHub Actions
5. Deploy to GitHub Pages

**Deliverable:** Live site on GitHub Pages

### Phase 5: Enhancement (Week 4+)

1. Support more URL formats
2. Add route simplification for large routes
3. Multiple travel mode support

## Key Implementation Details

### WASM-JS Interface

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse_google_maps_url(url: &str) -> Result<JsValue, JsValue> {
    let route = parser::url::parse(url)?;
    Ok(serde_wasm_bindgen::to_value(&route)?)
}

#[wasm_bindgen]
pub fn parse_kml(kml_content: &str) -> Result<JsValue, JsValue> {
    let route = parser::kml::parse(kml_content)?;
    Ok(serde_wasm_bindgen::to_value(&route)?)
}

#[wasm_bindgen]
pub fn generate_gpx(route_json: &str) -> Result<String, JsValue> {
    let route: Route = serde_json::from_str(route_json)?;
    Ok(gpx::write(&route)?)
}
```

### MapLibre Integration

```javascript
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [0, 0],
    zoom: 2
});

function displayRoute(coordinates) {
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
}
```

### File Upload Handling (KML)

```javascript
const fileInput = document.getElementById('kml-upload');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const content = await file.text();
    const route = wasm.parse_kml(content);
    displayRoute(route.coordinates);
});
```

### GitHub Actions Deploy

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
        
      - name: Install wasm-pack
        run: cargo install wasm-pack
        
      - name: Build WASM
        run: wasm-pack build --target web --out-dir www/pkg
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./www
```

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google changes URL format | Medium | High | Modular parser, version detection, KML fallback, user-friendly error messages |
| OpenFreeMap downtime | Low | Medium | Fallback to OSM raster tiles |
| Large routes slow browser | Medium | Low | Implement point simplification algorithm |
| WASM bundle too large | Low | Medium | Minimal dependencies, optimize with wasm-opt |
| KML export unavailable | Low | Low | KML is a stable standard; Google My Maps has supported it for years |

## Success Criteria

1. Successfully parses KML files exported from Google My Maps
2. Successfully parses 90%+ of common Google Maps direction URLs
3. Generates valid GPX files that import into Garmin/Strava/etc
4. Map preview loads in under 2 seconds
5. Works on Chrome, Firefox, Safari
6. Total page weight under 2MB (excluding map tiles)
7. Zero backend dependencies

## Resources

- [OpenFreeMap](https://openfreemap.org/) - Free vector tiles
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)
- [Google Polyline Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
- [GPX 1.1 Schema](https://www.topografix.com/GPX/1/1/)
- [KML Reference](https://developers.google.com/kml/documentation/kmlreference) - Official KML specification
- [google-maps-data-parameter-parser](https://github.com/david-r-edgar/google-maps-data-parameter-parser) - Reference for data param parsing

