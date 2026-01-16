use crate::types::Coordinate;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PolylineError {
    #[error("Invalid polyline encoding")]
    InvalidEncoding,
    #[error("Unexpected end of input")]
    UnexpectedEnd,
}

pub fn decode(encoded: &str) -> Result<Vec<Coordinate>, PolylineError> {
    let mut coordinates = Vec::new();
    let mut index = 0;
    let mut lat: i64 = 0;
    let mut lng: i64 = 0;
    let bytes = encoded.as_bytes();

    while index < bytes.len() {
        let (delta_lat, new_index) = decode_value(bytes, index)?;
        index = new_index;
        lat += delta_lat;

        let (delta_lng, new_index) = decode_value(bytes, index)?;
        index = new_index;
        lng += delta_lng;

        coordinates.push(Coordinate::new(lat as f64 / 1e5, lng as f64 / 1e5));
    }

    Ok(coordinates)
}

fn decode_value(bytes: &[u8], start: usize) -> Result<(i64, usize), PolylineError> {
    let mut result: i64 = 0;
    let mut shift = 0;
    let mut index = start;

    loop {
        if index >= bytes.len() {
            return Err(PolylineError::UnexpectedEnd);
        }

        let byte = bytes[index];
        if byte < 63 || byte > 127 {
            return Err(PolylineError::InvalidEncoding);
        }

        let chunk = (byte - 63) as i64;
        index += 1;

        result |= (chunk & 0x1F) << shift;
        shift += 5;

        if chunk < 32 {
            break;
        }
    }

    let value = if result & 1 != 0 {
        !(result >> 1)
    } else {
        result >> 1
    };

    Ok((value, index))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_simple() {
        let encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
        let coords = decode(encoded).unwrap();
        assert_eq!(coords.len(), 3);
        assert!((coords[0].lat - 38.5).abs() < 0.001);
        assert!((coords[0].lon - (-120.2)).abs() < 0.001);
    }

    #[test]
    fn test_decode_single_point() {
        let encoded = "_p~iF~ps|U";
        let coords = decode(encoded).unwrap();
        assert_eq!(coords.len(), 1);
    }

    #[test]
    fn test_decode_empty_string() {
        let encoded = "";
        let coords = decode(encoded).unwrap();
        assert!(coords.is_empty());
    }

    #[test]
    fn test_decode_invalid_characters() {
        let encoded = "!!!invalid!!!";
        let result = decode(encoded);
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_coordinate_precision() {
        let encoded = "_p~iF~ps|U";
        let coords = decode(encoded).unwrap();
        assert!((coords[0].lat - 38.5).abs() < 0.00001);
        assert!((coords[0].lon - (-120.2)).abs() < 0.00001);
    }
}

