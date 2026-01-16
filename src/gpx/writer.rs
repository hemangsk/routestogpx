use crate::types::Route;
use quick_xml::events::{BytesDecl, BytesEnd, BytesStart, BytesText, Event};
use quick_xml::Writer;
use std::io::Cursor;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GpxError {
    #[error("XML writing error: {0}")]
    XmlError(String),
    #[error("IO error: {0}")]
    IoError(String),
}

impl From<quick_xml::Error> for GpxError {
    fn from(e: quick_xml::Error) -> Self {
        GpxError::XmlError(e.to_string())
    }
}

impl From<std::io::Error> for GpxError {
    fn from(e: std::io::Error) -> Self {
        GpxError::IoError(e.to_string())
    }
}

pub fn write(route: &Route) -> Result<String, GpxError> {
    let mut writer = Writer::new(Cursor::new(Vec::new()));

    writer.write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))?;

    let mut gpx = BytesStart::new("gpx");
    gpx.push_attribute(("version", "1.1"));
    gpx.push_attribute(("creator", "maps-to-gpx"));
    gpx.push_attribute(("xmlns", "http://www.topografix.com/GPX/1/1"));
    gpx.push_attribute((
        "xmlns:xsi",
        "http://www.w3.org/2001/XMLSchema-instance",
    ));
    gpx.push_attribute((
        "xsi:schemaLocation",
        "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd",
    ));
    writer.write_event(Event::Start(gpx))?;

    write_metadata(&mut writer, route)?;

    for waypoint in &route.waypoints {
        let mut wpt = BytesStart::new("wpt");
        wpt.push_attribute(("lat", waypoint.coord.lat.to_string().as_str()));
        wpt.push_attribute(("lon", waypoint.coord.lon.to_string().as_str()));
        writer.write_event(Event::Start(wpt))?;

        if let Some(ele) = waypoint.coord.ele {
            writer.write_event(Event::Start(BytesStart::new("ele")))?;
            writer.write_event(Event::Text(BytesText::new(&ele.to_string())))?;
            writer.write_event(Event::End(BytesEnd::new("ele")))?;
        }

        if let Some(ref name) = waypoint.name {
            writer.write_event(Event::Start(BytesStart::new("name")))?;
            writer.write_event(Event::Text(BytesText::new(name)))?;
            writer.write_event(Event::End(BytesEnd::new("name")))?;
        }

        writer.write_event(Event::End(BytesEnd::new("wpt")))?;
    }

    for track in &route.tracks {
        writer.write_event(Event::Start(BytesStart::new("trk")))?;

        if let Some(ref name) = track.name {
            writer.write_event(Event::Start(BytesStart::new("name")))?;
            writer.write_event(Event::Text(BytesText::new(name)))?;
            writer.write_event(Event::End(BytesEnd::new("name")))?;
        }

        for segment in &track.segments {
            writer.write_event(Event::Start(BytesStart::new("trkseg")))?;

            for point in &segment.points {
                let mut trkpt = BytesStart::new("trkpt");
                trkpt.push_attribute(("lat", point.lat.to_string().as_str()));
                trkpt.push_attribute(("lon", point.lon.to_string().as_str()));
                writer.write_event(Event::Start(trkpt))?;

                if let Some(ele) = point.ele {
                    writer.write_event(Event::Start(BytesStart::new("ele")))?;
                    writer.write_event(Event::Text(BytesText::new(&ele.to_string())))?;
                    writer.write_event(Event::End(BytesEnd::new("ele")))?;
                }

                writer.write_event(Event::End(BytesEnd::new("trkpt")))?;
            }

            writer.write_event(Event::End(BytesEnd::new("trkseg")))?;
        }

        writer.write_event(Event::End(BytesEnd::new("trk")))?;
    }

    writer.write_event(Event::End(BytesEnd::new("gpx")))?;

    let result = writer.into_inner().into_inner();
    String::from_utf8(result).map_err(|e| GpxError::XmlError(e.to_string()))
}

fn write_metadata<W: std::io::Write>(
    writer: &mut Writer<W>,
    route: &Route,
) -> Result<(), GpxError> {
    writer.write_event(Event::Start(BytesStart::new("metadata")))?;

    if let Some(ref name) = route.name {
        writer.write_event(Event::Start(BytesStart::new("name")))?;
        writer.write_event(Event::Text(BytesText::new(name)))?;
        writer.write_event(Event::End(BytesEnd::new("name")))?;
    }

    writer.write_event(Event::End(BytesEnd::new("metadata")))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Coordinate, Track, TrackSegment, Waypoint};

    #[test]
    fn test_write_simple_gpx() {
        let mut route = Route::with_name("Test Route".to_string());
        route.add_waypoint(Waypoint::with_name(
            Coordinate::new(37.7749, -122.4194),
            "San Francisco".to_string(),
        ));

        let gpx = write(&route).unwrap();
        assert!(gpx.contains("Test Route"));
        assert!(gpx.contains("37.7749"));
        assert!(gpx.contains("-122.4194"));
        assert!(gpx.contains("San Francisco"));
    }

    #[test]
    fn test_write_track() {
        let mut route = Route::new();
        let segment = TrackSegment::new(vec![
            Coordinate::new(37.7749, -122.4194),
            Coordinate::new(37.7835, -122.4089),
        ]);
        route.add_track(Track::new(vec![segment]));

        let gpx = write(&route).unwrap();
        assert!(gpx.contains("<trk>"));
        assert!(gpx.contains("<trkseg>"));
        assert!(gpx.contains("<trkpt"));
    }

    #[test]
    fn test_write_gpx_header() {
        let route = Route::new();
        let gpx = write(&route).unwrap();
        assert!(gpx.starts_with("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
        assert!(gpx.contains("version=\"1.1\""));
        assert!(gpx.contains("creator=\"maps-to-gpx\""));
        assert!(gpx.contains("xmlns=\"http://www.topografix.com/GPX/1/1\""));
    }

    #[test]
    fn test_write_waypoint_with_elevation() {
        let mut route = Route::new();
        route.add_waypoint(Waypoint::new(Coordinate::with_elevation(37.7749, -122.4194, 100.5)));

        let gpx = write(&route).unwrap();
        assert!(gpx.contains("<ele>100.5</ele>"));
    }

    #[test]
    fn test_write_track_with_name() {
        let mut route = Route::new();
        let segment = TrackSegment::new(vec![Coordinate::new(37.7749, -122.4194)]);
        route.add_track(Track::with_name("My Ride".to_string(), vec![segment]));

        let gpx = write(&route).unwrap();
        assert!(gpx.contains("<name>My Ride</name>"));
    }

    #[test]
    fn test_write_empty_route() {
        let route = Route::new();
        let gpx = write(&route).unwrap();
        assert!(gpx.contains("<gpx"));
        assert!(gpx.contains("</gpx>"));
        assert!(gpx.contains("<metadata>"));
    }

    #[test]
    fn test_write_multiple_tracks() {
        let mut route = Route::new();
        let segment1 = TrackSegment::new(vec![Coordinate::new(37.7749, -122.4194)]);
        let segment2 = TrackSegment::new(vec![Coordinate::new(40.7128, -74.0060)]);
        route.add_track(Track::new(vec![segment1]));
        route.add_track(Track::new(vec![segment2]));

        let gpx = write(&route).unwrap();
        let trk_count = gpx.matches("<trk>").count();
        assert_eq!(trk_count, 2);
    }

    #[test]
    fn test_write_track_multiple_segments() {
        let mut route = Route::new();
        let segment1 = TrackSegment::new(vec![Coordinate::new(37.7749, -122.4194)]);
        let segment2 = TrackSegment::new(vec![Coordinate::new(37.7835, -122.4089)]);
        route.add_track(Track::new(vec![segment1, segment2]));

        let gpx = write(&route).unwrap();
        let trkseg_count = gpx.matches("<trkseg>").count();
        assert_eq!(trkseg_count, 2);
    }
}

