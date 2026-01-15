use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coordinate {
    pub lat: f64,
    pub lon: f64,
    pub ele: Option<f64>,
}

impl Coordinate {
    pub fn new(lat: f64, lon: f64) -> Self {
        Self { lat, lon, ele: None }
    }

    pub fn with_elevation(lat: f64, lon: f64, ele: f64) -> Self {
        Self {
            lat,
            lon,
            ele: Some(ele),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Waypoint {
    pub coord: Coordinate,
    pub name: Option<String>,
}

impl Waypoint {
    pub fn new(coord: Coordinate) -> Self {
        Self { coord, name: None }
    }

    pub fn with_name(coord: Coordinate, name: String) -> Self {
        Self {
            coord,
            name: Some(name),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackSegment {
    pub points: Vec<Coordinate>,
}

impl TrackSegment {
    pub fn new(points: Vec<Coordinate>) -> Self {
        Self { points }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub name: Option<String>,
    pub segments: Vec<TrackSegment>,
}

impl Track {
    pub fn new(segments: Vec<TrackSegment>) -> Self {
        Self {
            name: None,
            segments,
        }
    }

    pub fn with_name(name: String, segments: Vec<TrackSegment>) -> Self {
        Self {
            name: Some(name),
            segments,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    pub name: Option<String>,
    pub waypoints: Vec<Waypoint>,
    pub tracks: Vec<Track>,
}

impl Route {
    pub fn new() -> Self {
        Self {
            name: None,
            waypoints: Vec::new(),
            tracks: Vec::new(),
        }
    }

    pub fn with_name(name: String) -> Self {
        Self {
            name: Some(name),
            waypoints: Vec::new(),
            tracks: Vec::new(),
        }
    }

    pub fn add_waypoint(&mut self, waypoint: Waypoint) {
        self.waypoints.push(waypoint);
    }

    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
    }

    pub fn all_coordinates(&self) -> Vec<[f64; 2]> {
        let mut coords = Vec::new();
        for track in &self.tracks {
            for segment in &track.segments {
                for point in &segment.points {
                    coords.push([point.lon, point.lat]);
                }
            }
        }
        coords
    }
}

impl Default for Route {
    fn default() -> Self {
        Self::new()
    }
}

