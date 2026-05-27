import BaseTool from './BaseTool.js';

class CircleTool extends BaseTool {
  #center      = null;
  #tempCircle  = null;
  #label       = null;
  #onMove      = null;

  activate() {
    super.activate();
    this.setStatus('Cliquez sur un point pour définir le centre du cercle.');
  }

  deactivate() {
    super.deactivate();
    this.#cleanup();
  }

  /** Called when a point is clicked while tool is active. */
  onPointClick(point) {
    if (!this.#center) {
      this.#startAt(point);
    } else if (this.#center !== point) {
      const r = this.map.distance(
        [this.#center.latitude, this.#center.longitude],
        [point.latitude, point.longitude]
      );
      this.#finalize(r);
    }
  }

  /** Called when map canvas is clicked (no point hit) while tool is active. */
  onMapClick(e) {
    if (!this.#center || !this.#tempCircle) return;
    const r = this.map.distance(
      [this.#center.latitude, this.#center.longitude],
      e.latlng
    );
    this.#finalize(r);
  }

  // ── private ────────────────────────────────────────────────────────────────

  #startAt(centerPoint) {
    this.#center = centerPoint;
    this.setStatus('Déplacez la souris pour définir le rayon, puis cliquez.');

    this.#tempCircle = L.circle(
      [centerPoint.latitude, centerPoint.longitude],
      { radius: 0, color: centerPoint.color, weight: 2, fillOpacity: 0, interactive: false }
    ).addTo(this.map);

    this.#label = document.createElement('div');
    this.#label.className = 'cursor-label';
    document.body.appendChild(this.#label);

    this.map.on('mousemove', this.#onMove = e => {
      const r = this.map.distance(e.latlng,
        [this.#center.latitude, this.#center.longitude]);
      this.#tempCircle.setRadius(r);
      const pos = this.map.latLngToContainerPoint(e.latlng);
      this.#label.style.left = `${pos.x + 14}px`;
      this.#label.style.top  = `${pos.y + 14}px`;
      this.#label.textContent = `${Math.round(r)} m`;
      this.#label.style.display = 'block';
    });
  }

  #finalize(radius) {
    const c = this.#center;
    this.#cleanup();
    this.circleManager.addCircle(radius, c.latitude, c.longitude, c.color, true);
    this.redraw();
    this.setStatus('Cliquez sur un point pour définir le centre du cercle.');
  }

  #cleanup() {
    if (this.#onMove) { this.map.off('mousemove', this.#onMove); this.#onMove = null; }
    if (this.#tempCircle) { this.#tempCircle.remove(); this.#tempCircle = null; }
    if (this.#label)      { this.#label.remove();      this.#label      = null; }
    this.#center = null;
  }
}

export default CircleTool;
