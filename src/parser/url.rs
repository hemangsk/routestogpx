use crate::parser::polyline;
use crate::types::{Coordinate, Route, Track, TrackSegment, Waypoint};
use thiserror::Error;
use url::Url;

#[derive(Error, Debug)]
pub enum UrlParseError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    #[error("Not a Google Maps URL")]
    NotGoogleMaps,
    #[error("No route data found in URL")]
    NoRouteData,
    #[error("Failed to decode route: {0}")]
    DecodeError(String),
}

pub fn parse(url_str: &str) -> Result<Route, UrlParseError> {
    let url = Url::parse(url_str).map_err(|e| UrlParseError::InvalidUrl(e.to_string()))?;

    let host = url.host_str().unwrap_or("");
    if !host.contains("google.com") && !host.contains("goo.gl") && !host.contains("maps.app.goo.gl")
    {
        return Err(UrlParseError::NotGoogleMaps);
    }

    let mut route = Route::new();

    if let Some(coords) = extract_coordinates_from_path(&url) {
        for (i, coord) in coords.iter().enumerate() {
            let name = if i == 0 {
                "Start".to_string()
            } else if i == coords.len() - 1 {
                "End".to_string()
            } else {
                format!("Waypoint {}", i)
            };
            route.add_waypoint(Waypoint::with_name(coord.clone(), name));
        }

        if coords.len() >= 2 {
            let segment = TrackSegment::new(coords);
            route.add_track(Track::new(vec![segment]));
        }
    }

    if let Some(encoded_polyline) = extract_polyline_from_data(&url) {
        if let Ok(coords) = polyline::decode(&encoded_polyline) {
            if !coords.is_empty() {
                let segment = TrackSegment::new(coords);
                if route.tracks.is_empty() {
                    route.add_track(Track::new(vec![segment]));
                } else {
                    route.tracks[0].segments = vec![segment];
                }
            }
        }
    }

    if route.waypoints.is_empty() && route.tracks.is_empty() {
        return Err(UrlParseError::NoRouteData);
    }

    Ok(route)
}

fn extract_coordinates_from_path(url: &Url) -> Option<Vec<Coordinate>> {
    let path = url.path();

    if !path.contains("/dir/") {
        return None;
    }

    let dir_part = path.split("/dir/").nth(1)?;
    let segments: Vec<&str> = dir_part.split('/').filter(|s| !s.is_empty()).collect();

    let mut coordinates = Vec::new();

    for segment in segments {
        if segment.starts_with('@') || segment.starts_with("data=") {
            continue;
        }

        if let Some(coord) = parse_coordinate_segment(segment) {
            coordinates.push(coord);
        }
    }

    if coordinates.is_empty() {
        None
    } else {
        Some(coordinates)
    }
}

fn parse_coordinate_segment(segment: &str) -> Option<Coordinate> {
    let decoded = urlencoding_decode(segment);
    let cleaned = decoded.replace('+', " ");

    let coord_pattern: Vec<&str> = cleaned.split(',').collect();
    if coord_pattern.len() >= 2 {
        let lat = coord_pattern[0].trim().parse::<f64>().ok()?;
        let lon = coord_pattern[1].trim().parse::<f64>().ok()?;

        if (-90.0..=90.0).contains(&lat) && (-180.0..=180.0).contains(&lon) {
            return Some(Coordinate::new(lat, lon));
        }
    }

    None
}

fn urlencoding_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                    continue;
                }
            }
            result.push('%');
            result.push_str(&hex);
        } else {
            result.push(c);
        }
    }

    result
}

fn extract_polyline_from_data(url: &Url) -> Option<String> {
    for (key, value) in url.query_pairs() {
        if key == "data" {
            return find_polyline_in_data(&value);
        }
    }

    let path = url.path();
    if let Some(data_start) = path.find("data=") {
        let data_part = &path[data_start + 5..];
        let data_end = data_part.find('/').unwrap_or(data_part.len());
        return find_polyline_in_data(&data_part[..data_end]);
    }

    None
}

fn find_polyline_in_data(data: &str) -> Option<String> {
    let parts: Vec<&str> = data.split('!').collect();

    for (i, part) in parts.iter().enumerate() {
        if part.starts_with("1m") || part.starts_with("2m") {
            if let Some(next) = parts.get(i + 1) {
                if next.starts_with("1s") || next.starts_with("2s") {
                    let encoded = &next[2..];
                    if encoded.len() > 10 && is_likely_polyline(encoded) {
                        return Some(encoded.to_string());
                    }
                }
            }
        }
    }

    None
}

fn is_likely_polyline(s: &str) -> bool {
    s.chars()
        .all(|c| c.is_ascii_graphic() && c != '!' && c != '/')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_dir_url() {
        let url = "https://www.google.com/maps/dir/37.7749,-122.4194/37.7835,-122.4089/@37.78,-122.41,14z";
        let route = parse(url).unwrap();
        assert!(!route.waypoints.is_empty());
    }

    #[test]
    fn test_not_google_maps() {
        let url = "https://www.example.com/maps/dir/";
        let result = parse(url);
        assert!(matches!(result, Err(UrlParseError::NotGoogleMaps)));
    }
}

