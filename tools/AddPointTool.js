import BaseTool from './BaseTool.js';
import { COLORS, SNAP_TOLERANCE_M } from '../config/constants.js';
import { GeoUtils } from '../utils/GeoUtils.js';

class AddPointTool extends BaseTool {
  #ghostMarker  = null;
  #cursorLabel  = null;
  #onMove       = null;
  #onClick      = null;

  activate() {
    super.activate();
    this.setStatus('Cliquez sur la carte pour placer un point. Clic sur une ligne pour la scinder.');
    this.#startGhost();
    this.map.on('mousemove', this.#onMove = e => this.#handleMove(e));
    this.map.on('click',     this.#onClick = e => this.#handleClick(e));
  }

  deactivate() {
    super.deactivate();
    this.#stopGhost();
    if (this.#onMove)  this.map.off('mousemove', this.#onMove);
    if (this.#onClick) this.map.off('click', this.#onClick);
    this.#onMove  = null;
    this.#onClick = null;
  }

  /** Called by UIManager when a point marker is clicked while this tool is active. */
  onPointClick(point, e) {
    const snapped = this.#snap(e.latlng);
    this.#place(snapped);
  }

  /** Called by UIManager when a line marker is clicked while this tool is active. */
  onLineClick(line, e) {
    const snapped = this.#snap(e.latlng);
    this.#placeOnLine(snapped, line);
  }

  // ── private ────────────────────────────────────────────────────────────────

  #startGhost() {
    this.#ghostMarker = L.circleMarker([0, 0], {
      radius: 6, color: '#000', fillColor: '#f1c40f',
      fillOpacity: 0.85, opacity: 0.9, interactive: false,
    }).addTo(this.map);

    this.#cursorLabel = document.createElement('div');
    this.#cursorLabel.className = 'cursor-label';
    document.body.appendChild(this.#cursorLabel);
  }

  #stopGhost() {
    if (this.#ghostMarker) {
      this.map.removeLayer(this.#ghostMarker);
      this.#ghostMarker = null;
    }
    if (this.#cursorLabel) {
      this.#cursorLabel.remove();
      this.#cursorLabel = null;
    }
  }

  #handleMove(e) {
    if (!this.#ghostMarker) return;
    const snapped = this.#snap(e.latlng);
    this.#ghostMarker.setLatLng(snapped);
    const pos = this.map.latLngToContainerPoint(snapped);
    this.#cursorLabel.style.left = `${pos.x + 14}px`;
    this.#cursorLabel.style.top  = `${pos.y + 14}px`;
    this.#cursorLabel.textContent =
      `${snapped.lat.toFixed(5)}, ${snapped.lng.toFixed(5)}`;
  }

  #handleClick(e) {
    const snapped = this.#snap(e.latlng);
    const near = this.#nearestLine(e.latlng);
    if (near && near.dist <= SNAP_TOLERANCE_M) {
      this.#placeOnLine(snapped, near.line);
    } else {
      this.#place(snapped);
    }
  }

  #place(latlng) {
    const desc = `Point ${this.pointManager.points.length + 1}`;
    this.pointManager.addPoint(null, desc, latlng.lat, latlng.lng, COLORS.defaultNew, true);
    this.redraw();
  }

  #placeOnLine(latlng, line) {
    const desc     = `Point ${this.pointManager.points.length + 1}`;
    const newPoint = this.pointManager.addPoint(
      null, desc, latlng.lat, latlng.lng, COLORS.defaultNew, true);
    this.lineManager.removeLine(line.startPoint, line.endPoint, true);
    this.lineManager.addLine(line.startPoint, newPoint, true);
    this.lineManager.addLine(newPoint, line.endPoint, true);
    this.redraw();
  }

  #snap(cursorLatLng) {
    const TOL = SNAP_TOLERANCE_M;
    let best = cursorLatLng, bestDist = Infinity;

    this.lineManager.lines.forEach(line => {
      const layer = this.renderer.getLayer(line);
      if (!layer || typeof layer.getLatLngs !== 'function') return;
      let pts = layer.getLatLngs().flat(Infinity);
      for (const pt of pts) {
        if (!pt?.lat) continue;
        const d = this.map.distance(cursorLatLng, pt);
        if (d < bestDist && d < TOL) { best = pt; bestDist = d; }
      }
    });

    this.circleManager.circles.forEach(c => {
      if (c.latitude == null) return;
      const center  = L.latLng(c.latitude, c.longitude);
      const dCenter = this.map.distance(center, cursorLatLng);
      const diff    = Math.abs(dCenter - c.radius);
      if (diff < TOL && diff < bestDist) {
        best = GeoUtils.snapToCircleEdge(c, cursorLatLng);
        bestDist = diff;
      }
    });

    return best;
  }

  #nearestLine(cursorLatLng) {
    let bestLine = null, bestDist = Infinity, bestPt = null;
    this.lineManager.lines.forEach(line => {
      const layer = this.renderer.getLayer(line);
      if (!layer || typeof layer.getLatLngs !== 'function') return;
      const pts = layer.getLatLngs().flat(Infinity);
      pts.forEach(pt => {
        const d = this.map.distance(cursorLatLng, pt);
        if (d < bestDist) { bestDist = d; bestPt = pt; bestLine = line; }
      });
    });
    return bestLine ? { line: bestLine, pt: bestPt, dist: bestDist } : null;
  }
}

export default AddPointTool;
