// TODO antes de producción: confirma que estas son las coordenadas EXACTAS del
// negocio (abre Google Maps, click derecho sobre la ubicación real, copia el
// par de coordenadas) y ajusta el radio a algo realista para el terreno
// (típicamente 50-150m; 1000m prácticamente no filtra nada).
const BUSINESS_LOCATION = {
  latitude: -34.439167,
  longitude: -71.075833
};

const ALLOWED_RADIUS_METERS = 150;

/**
 * Calculates distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isWithinGeofence = (lat: number, lon: number): { isAllowed: boolean; distance: number } => {
  const distance = calculateDistance(
    lat,
    lon,
    BUSINESS_LOCATION.latitude,
    BUSINESS_LOCATION.longitude
  );

  return {
    isAllowed: distance <= ALLOWED_RADIUS_METERS,
    distance
  };
};

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada por el navegador.'));
    } else {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true, // Critical for attendance
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  });
};
