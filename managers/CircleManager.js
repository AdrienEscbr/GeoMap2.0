import Circle from '../class/Circle.js';

class CircleManager {
  #circles = [];

  constructor(storageManager) {
    this.storage = storageManager;
    this.#loadFromStorage();
  }

  get circles() { return this.#circles; }

  addCircle(radius, lat, lng, color, save = false) {
    const id = this.#circles.length > 0
      ? this.#circles[this.#circles.length - 1].id + 1
      : 1;
    this.#circles.push(new Circle(id, radius, lat, lng, color));
    if (save) this.saveToStorage();
  }

  removeCircle(id, save = false) {
    this.#circles = this.#circles.filter(c => c.id !== id);
    if (save) this.saveToStorage();
  }

  #loadFromStorage() {
    this.storage.load('circles').forEach(c => {
      this.addCircle(c.radius, c.lat, c.lng, c.color);
    });
  }

  saveToStorage() {
    this.storage.save('circles', this.#circles.map(c => c.datas()));
  }
}

export default CircleManager;
