import { COLORS } from '../config/constants.js';
import { GeoUtils } from '../utils/GeoUtils.js';

class Renderer {
  constructor(map) {
    this.map          = map;
    this.layers       = new Map();
    this.distLabels   = new Map();
    this.nameLabels   = new Map();

    // Single off-screen element reused for all text measurements
    this._measurer = document.createElement('div');
    Object.assign(this._measurer.style, {
      position:   'absolute',
      visibility: 'hidden',
      whiteSpace: 'nowrap',
      left:       '-9999px',
    });
    document.body.appendChild(this._measurer);
  }

  clear() {
    this.layers.forEach(l => this.map.removeLayer(l));
    this.layers.clear();
    this.clearDistLabels();
  }

  // ── Points ──────────────────────────────────────────────────────────────────

  drawPoint(point, isSelected = false, onClick = null) {
    const border = isSelected ? COLORS.selected : COLORS.unselected;
    const marker = L.circleMarker([point.latitude, point.longitude], {
      radius:      point.radius,
      fillColor:   point.color,
      color:       border,
      weight:      isSelected ? 3 : 1.5,
      fillOpacity: 0.9,
      bubblingMouseEvents: false,
    }).addTo(this.map);

    if (onClick) {
      marker.on('click', e => {
        L.DomEvent.stopPropagation(e);
        onClick(point, e);
      });
    }

    this.layers.set(point, marker);
  }

  // ── Lines ───────────────────────────────────────────────────────────────────

  drawLine(line, isSelected = false, onClick = null, showDistance = false) {
    const color = isSelected ? COLORS.selected : COLORS.unselected;
    const poly  = L.geodesic(
      [[line.startPoint.latitude, line.startPoint.longitude],
       [line.endPoint.latitude,   line.endPoint.longitude]],
      { color, weight: isSelected ? 4 : 2.5, steps: 256 }
    ).addTo(this.map);

    if (onClick) {
      poly.on('click', e => {
        L.DomEvent.stopPropagation(e);
        onClick(line, e);
      });
    }

    this.layers.set(line, poly);

    if (showDistance) this._addDistLabel(line);
  }

  // ── Circles ─────────────────────────────────────────────────────────────────

  drawCircle(circle, isSelected = false, onClick = null) {
    const color  = isSelected ? COLORS.selected : circle.color;
    const marker = L.circle([circle.latitude, circle.longitude], {
      radius:      circle.radius,
      color,
      weight:      isSelected ? 3 : 2,
      fillOpacity: 0,
      bubblingMouseEvents: false,
    }).addTo(this.map);

    if (onClick) {
      marker.on('click', e => {
        L.DomEvent.stopPropagation(e);
        onClick(circle, e);
      });
    }

    this.layers.set(circle, marker);
  }

  // ── Remove single entity ────────────────────────────────────────────────────

  remove(entity) {
    const layer = this.layers.get(entity);
    if (layer) { this.map.removeLayer(layer); this.layers.delete(entity); }
  }

  // ── Distance labels ─────────────────────────────────────────────────────────

  _addDistLabel(line) {
    const midLat = (line.startPoint.latitude  + line.endPoint.latitude)  / 2;
    const midLng = (line.startPoint.longitude + line.endPoint.longitude) / 2;
    const dist   = L.latLng(line.startPoint.latitude, line.startPoint.longitude)
                    .distanceTo(L.latLng(line.endPoint.latitude, line.endPoint.longitude));
    const text   = GeoUtils.formatDistance(dist);

    const { w, h } = this._measure(text);
    const icon = L.divIcon({
      className: 'dist-label',
      html:      GeoUtils.escapeHtml(text),
      iconSize:  [w, h],
      iconAnchor:[w / 2, h / 2],
    });

    const marker = L.marker(L.latLng(midLat, midLng), { icon, interactive: false })
                    .addTo(this.map);
    this.distLabels.set(line, marker);
  }

  removeDistLabel(line) {
    const lbl = this.distLabels.get(line);
    if (lbl) { this.map.removeLayer(lbl); this.distLabels.delete(line); }
  }

  clearDistLabels() {
    this.distLabels.forEach(l => this.map.removeLayer(l));
    this.distLabels.clear();
  }

  // ── Name labels ─────────────────────────────────────────────────────────────

  addNameLabel(point) {
    const text   = point.description || 'Sans nom';
    const { w, h } = this._measure(text);
    const icon = L.divIcon({
      className:  'name-label',
      html:       GeoUtils.escapeHtml(text),
      iconSize:   [w + 10, h],
      iconAnchor: [(w + 10) / 2, h + 10],
    });

    const marker = L.marker(L.latLng(point.latitude, point.longitude),
                            { icon, interactive: false }).addTo(this.map);
    this.nameLabels.set(point, marker);
  }

  removeNameLabel(point) {
    const lbl = this.nameLabels.get(point);
    if (lbl) { this.map.removeLayer(lbl); this.nameLabels.delete(point); }
  }

  clearNameLabels() {
    this.nameLabels.forEach(l => this.map.removeLayer(l));
    this.nameLabels.clear();
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  /** Measure text width/height using the shared off-screen element (no forced reflow per call). */
  _measure(text) {
    this._measurer.textContent = text;
    return { w: this._measurer.offsetWidth, h: this._measurer.offsetHeight };
  }

  getLayer(entity) {
    return this.layers.get(entity);
  }
}

export default Renderer;
