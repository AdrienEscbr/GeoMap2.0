import { EARTH_RADIUS_M } from '../config/constants.js';

export class GeoUtils {
  static toRad(deg) { return (deg * Math.PI) / 180; }
  static toDeg(rad) { return (rad * 180) / Math.PI; }

  static bearing(a, b) {
    const lat1 = GeoUtils.toRad(a.lat);
    const lat2 = GeoUtils.toRad(b.lat);
    const dLng = GeoUtils.toRad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
             - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (GeoUtils.toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  static destination(start, bearingDeg, distanceM) {
    const d  = distanceM / EARTH_RADIUS_M;
    const br = GeoUtils.toRad(bearingDeg);
    const lat1 = GeoUtils.toRad(start.lat);
    const lng1 = GeoUtils.toRad(start.lng);
    const sinLat2 = Math.sin(lat1) * Math.cos(d)
                  + Math.cos(lat1) * Math.sin(d) * Math.cos(br);
    const lat2 = Math.asin(sinLat2);
    const y = Math.sin(br) * Math.sin(d) * Math.cos(lat1);
    const x = Math.cos(d) - Math.sin(lat1) * sinLat2;
    const lng2 = lng1 + Math.atan2(y, x);
    return L.latLng(
      GeoUtils.toDeg(lat2),
      ((GeoUtils.toDeg(lng2) + 540) % 360) - 180
    );
  }

  /** Project cursorLatLng onto the circumference of a circle. */
  static snapToCircleEdge(circle, cursorLatLng) {
    const center = L.latLng(circle.latitude, circle.longitude);
    const brg    = GeoUtils.bearing(center, cursorLatLng);
    return GeoUtils.destination(center, brg, circle.radius);
  }

  static formatDistance(metres) {
    return metres >= 1000
      ? `${(metres / 1000).toFixed(2)} km`
      : `${metres.toFixed(0)} m`;
  }

  static parseCoords(str) {
    const parts = str.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  static escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
