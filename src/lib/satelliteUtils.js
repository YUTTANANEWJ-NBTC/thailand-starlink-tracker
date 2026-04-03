import * as satellite from 'satellite.js';

// Get ECI position directly
export function getSatelliteEci(tleLine1, tleLine2, date = new Date()) {
  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  const positionAndVelocity = satellite.propagate(satrec, date);
  return positionAndVelocity.position; // returns ECI coordinates or false
}

// Calculate Lat/Lon/Alt from TLE
export function getSatellitePosition(tleLine1, tleLine2, date = new Date()) {
  const positionEci = getSatelliteEci(tleLine1, tleLine2, date);
  
  if (!positionEci) {
    return null;
  }

  const gmst = satellite.gstime(date);
  const positionGd = satellite.eciToGeodetic(positionEci, gmst);
  
  const longitude = satellite.degreesLong(positionGd.longitude);
  const latitude = satellite.degreesLat(positionGd.latitude);
  const height = positionGd.height; // in km
  
  return { lat: latitude, lng: longitude, alt: height };
}

// Convert Alt/Az coordinates for Observer View
export function getObserverCoordinates(observerLat, observerLng, observerAlt, satEciPos, date = new Date()) {
    if (!satEciPos) return null;
    
    const observerGd = {
        longitude: satellite.degreesToRadians(observerLng),
        latitude: satellite.degreesToRadians(observerLat),
        height: observerAlt
    };
    
    const gmst = satellite.gstime(date);
    const positionEcf = satellite.eciToEcf(satEciPos, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
    
    return {
        azimuth: lookAngles.azimuth, // Radians (0 to 2PI)
        elevation: lookAngles.elevation, // Radians (-PI/2 to PI/2)
        rangeSat: lookAngles.rangeSat // km
    };
}
