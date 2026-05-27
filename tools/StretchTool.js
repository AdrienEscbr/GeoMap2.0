import BaseTool from './BaseTool.js';
import { GeoUtils } from '../utils/GeoUtils.js';

const EARTH_CIRCUMFERENCE_M = 40_075_000;

class StretchTool extends BaseTool {
  #ghostLayers = [];

  activate() {
    super.activate();
    this.setStatus('Cliquez sur une ligne pour prolonger sa trajectoire géodésique.');
  }

  deactivate() {
    super.deactivate();
    this.#clearGhost();
  }

  /** Called when a line is clicked while tool is active. */
  onLineClick(line) {
    this.#clearGhost();
    this.#drawGeodesic(line);
  }

  getGhostLayers() { return this.#ghostLayers; }

  // ── private ────────────────────────────────────────────────────────────────

  #drawGeodesic(line) {
    const start    = L.latLng(line.startPoint.latitude, line.startPoint.longitude);
    const bearing1 = GeoUtils.bearing(start, L.latLng(line.endPoint.latitude, line.endPoint.longitude));
    const bearing2 = (bearing1 + 180) % 360;
    const numPts   = 720;
    const step     = EARTH_CIRCUMFERENCE_M / numPts;

    const fwd = [], rev = [];
    for (let i = 0; i <= numPts / 2; i++) fwd.push(GeoUtils.destination(start, bearing1, step * i));
    for (let i = 0; i <= numPts / 2; i++) rev.push(GeoUtils.destination(start, bearing2, step * i));
    rev.reverse();

    const ghost = L.geodesic(rev.concat(fwd), {
      color: '#7f8c8d', weight: 2, dashArray: '6 8', opacity: 0.7, interactive: false,
    }).addTo(this.map);

    this.#ghostLayers.push(ghost);
  }

  #clearGhost() {
    this.#ghostLayers.forEach(l => this.map.removeLayer(l));
    this.#ghostLayers = [];
  }
}

export default StretchTool;
