import Point from '../class/Point.js';

class PointManager {
  #points = [];

  constructor(storageManager) {
    this.storage = storageManager;
    this.#loadFromStorage();
  }

  get points() { return this.#points; }

  addPoint(id = null, desc, lat, lng, color, save = false) {
    const nextId = id ?? (this.#points.length > 0
      ? this.#points[this.#points.length - 1].id + 1
      : 1);
    const p = new Point(nextId, desc, lat, lng, color);
    this.#points.push(p);
    if (save) this.saveToStorage();
    return p;
  }

  removePoint(point, save = false) {
    this.#points = this.#points.filter(p => p !== point);
    if (save) this.saveToStorage();
  }

  getPointById(id) {
    return this.#points.find(p => p.id === id);
  }

  getPointAt(lat, lng) {
    return this.#points.find(p => p.latitude === lat && p.longitude === lng);
  }

  reorder(orderedIds) {
    this.#points.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
  }

  #loadFromStorage() {
    this.storage.load('points').forEach(p => {
      this.addPoint(p.id, p.desc, p.lat, p.lng, p.color);
    });
  }

  saveToStorage() {
    this.storage.save('points', this.#points.map(p => p.datas()));
  }
}

export default PointManager;
