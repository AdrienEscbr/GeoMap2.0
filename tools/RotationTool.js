import BaseTool from './BaseTool.js';
import { GeoUtils } from '../utils/GeoUtils.js';

class RotationTool extends BaseTool {
  #pivot        = null;
  #elements     = null;
  #originals    = new Map();
  #uiBox        = null;

  activate() {
    super.activate();
    this.setStatus('Cliquez sur un point pivot pour faire tourner sa structure connectée.');
  }

  deactivate() {
    super.deactivate();
    this.#exit();
  }

  /** Called when a point is clicked while tool is active. */
  onPointClick(point) {
    if (this.#pivot) return; // rotation already in progress
    const { points, circles } = this.#connectedElements(point);
    this.#pivot     = point;
    this.#elements  = { points, circles };
    this.#originals.clear();
    points.forEach(p => this.#originals.set(p, { lat: p.latitude, lng: p.longitude }));
    this.#showUI();
  }

  // ── private ────────────────────────────────────────────────────────────────

  #connectedElements(startPoint) {
    const pts  = new Set([startPoint]);
    const lns  = new Set();
    const crcs = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      this.lineManager.lines.forEach(l => {
        if (!pts.has(l.startPoint) && !pts.has(l.endPoint)) return;
        if (lns.has(l)) return;
        lns.add(l);
        if (!pts.has(l.startPoint)) { pts.add(l.startPoint); changed = true; }
        if (!pts.has(l.endPoint))   { pts.add(l.endPoint);   changed = true; }
      });
      this.circleManager.circles.forEach(c => {
        const cp = this.pointManager.points.find(p =>
          Math.abs(p.latitude - c.latitude) < 1e-9 &&
          Math.abs(p.longitude - c.longitude) < 1e-9
        );
        if (cp && pts.has(cp)) crcs.add(c);
      });
    }
    return { points: [...pts], lines: [...lns], circles: [...crcs] };
  }

  #applyRotation(angleDeg) {
    const pivot = L.latLng(this.#pivot.latitude, this.#pivot.longitude);
    this.#elements.points.forEach(p => {
      if (p === this.#pivot) return;
      const orig    = this.#originals.get(p);
      const dist    = this.map.distance(pivot, [orig.lat, orig.lng]);
      const brg     = GeoUtils.bearing(pivot, L.latLng(orig.lat, orig.lng));
      const newPos  = GeoUtils.destination(pivot, brg + angleDeg, dist);
      p.latitude  = newPos.lat;
      p.longitude = newPos.lng;
    });
    this.redraw();
  }

  #showUI() {
    this.setStatus('Ajustez la rotation, puis validez ou annulez.');
    const box = document.createElement('div');
    box.className = 'rotation-ui';
    box.innerHTML = `
      <div class="rotation-ui__header">
        <span>Rotation</span>
        <span id="rot-value" class="rotation-ui__value">0°</span>
      </div>
      <input type="range" id="rot-slider" min="-180" max="180" step="1" value="0">
      <div class="rotation-ui__actions">
        <button class="btn btn-sm btn-success" id="rot-ok">Valider</button>
        <button class="btn btn-sm btn-outline-secondary" id="rot-cancel">Annuler</button>
      </div>`;
    document.body.appendChild(box);
    this.#uiBox = box;

    const slider = box.querySelector('#rot-slider');
    const label  = box.querySelector('#rot-value');

    slider.addEventListener('input', e => {
      label.textContent = `${e.target.value}°`;
      this.#applyRotation(parseFloat(e.target.value));
    });
    box.querySelector('#rot-ok').addEventListener('click', () => {
      this.pointManager.saveToStorage();
      this.#exit();
    });
    box.querySelector('#rot-cancel').addEventListener('click', () => {
      for (const [p, pos] of this.#originals) {
        p.latitude  = pos.lat;
        p.longitude = pos.lng;
      }
      this.redraw();
      this.#exit();
    });
  }

  #exit() {
    if (this.#uiBox) { this.#uiBox.remove(); this.#uiBox = null; }
    this.#pivot    = null;
    this.#elements = null;
    this.#originals.clear();
  }
}

export default RotationTool;
