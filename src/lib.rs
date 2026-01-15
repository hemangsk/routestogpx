mod gpx;
mod parser;
mod types;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn parse_google_maps_url(url: &str) -> Result<JsValue, JsValue> {
    let route = parser::url::parse(url).map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_wasm_bindgen::to_value(&route).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn parse_kml(kml_content: &str) -> Result<JsValue, JsValue> {
    let route = parser::kml::parse(kml_content).map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_wasm_bindgen::to_value(&route).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn generate_gpx(route_json: &str) -> Result<String, JsValue> {
    let route: types::Route =
        serde_json::from_str(route_json).map_err(|e| JsValue::from_str(&e.to_string()))?;
    gpx::write(&route).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn route_to_gpx(route: JsValue) -> Result<String, JsValue> {
    let route: types::Route =
        serde_wasm_bindgen::from_value(route).map_err(|e| JsValue::from_str(&e.to_string()))?;
    gpx::write(&route).map_err(|e| JsValue::from_str(&e.to_string()))
}

