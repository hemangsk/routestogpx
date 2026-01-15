use crate::types::{Coordinate, Route, Track, TrackSegment, Waypoint};
use quick_xml::events::Event;
use quick_xml::Reader;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum KmlError {
    #[error("XML parsing error: {0}")]
    XmlError(String),
    #[error("Invalid coordinate format")]
    InvalidCoordinate,
    #[error("Missing required element")]
    MissingElement,
}

impl From<quick_xml::Error> for KmlError {
    fn from(e: quick_xml::Error) -> Self {
        KmlError::XmlError(e.to_string())
    }
}

pub fn parse(kml_content: &str) -> Result<Route, KmlError> {
    let mut reader = Reader::from_str(kml_content);
    let mut route = Route::new();

    let mut current_element = String::new();
    let mut current_name: Option<String> = None;
    let mut in_placemark = false;
    let mut in_point = false;
    let mut in_linestring = false;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                current_element = name.clone();

                match name.as_str() {
                    "Placemark" => {
                        in_placemark = true;
                        current_name = None;
                    }
                    "Point" => in_point = true,
                    "LineString" => in_linestring = true,
                    "Document" => {}
                    _ => {}
                }
            }
            Ok(Event::End(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match name.as_str() {
                    "Placemark" => {
                        in_placemark = false;
                        current_name = None;
                    }
                    "Point" => in_point = false,
                    "LineString" => in_linestring = false,
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default().trim().to_string();
                if text.is_empty() {
                    continue;
                }

                match current_element.as_str() {
                    "name" => {
                        if in_placemark {
                            current_name = Some(text.clone());
                        } else {
                            route.name = Some(text);
                        }
                    }
                    "coordinates" => {
                        if in_point {
                            if let Some(coord) = parse_single_coordinate(&text) {
                                let waypoint = match &current_name {
                                    Some(n) => Waypoint::with_name(coord, n.clone()),
                                    None => Waypoint::new(coord),
                                };
                                route.add_waypoint(waypoint);
                            }
                        } else if in_linestring {
                            let coords = parse_coordinates(&text);
                            if !coords.is_empty() {
                                let segment = TrackSegment::new(coords);
                                let track = match &current_name {
                                    Some(n) => Track::with_name(n.clone(), vec![segment]),
                                    None => Track::new(vec![segment]),
                                };
                                route.add_track(track);
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(KmlError::XmlError(e.to_string())),
            _ => {}
        }
        buf.clear();
    }

    Ok(route)
}

fn parse_single_coordinate(text: &str) -> Option<Coordinate> {
    let parts: Vec<&str> = text.split(',').collect();
    if parts.len() >= 2 {
        let lon = parts[0].trim().parse::<f64>().ok()?;
        let lat = parts[1].trim().parse::<f64>().ok()?;
        let ele = parts.get(2).and_then(|e| e.trim().parse::<f64>().ok());

        Some(match ele {
            Some(e) => Coordinate::with_elevation(lat, lon, e),
            None => Coordinate::new(lat, lon),
        })
    } else {
        None
    }
}

fn parse_coordinates(text: &str) -> Vec<Coordinate> {
    text.split_whitespace()
        .filter_map(parse_single_coordinate)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_kml() {
        let kml = r#"<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Route</name>
    <Placemark>
      <name>Start</name>
      <Point>
        <coordinates>-122.4194,37.7749,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Route Path</name>
      <LineString>
        <coordinates>
          -122.4194,37.7749,0
          -122.4089,37.7835,0
          -122.4000,37.7900,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>"#;

        let route = parse(kml).unwrap();
        assert_eq!(route.name, Some("Test Route".to_string()));
        assert_eq!(route.waypoints.len(), 1);
        assert_eq!(route.tracks.len(), 1);
        assert_eq!(route.tracks[0].segments[0].points.len(), 3);
    }
}

