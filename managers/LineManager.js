import Line from '../class/Line.js';

class LineManager {
  #lines = [];

  constructor(storageManager, pointManager) {
    this.storage      = storageManager;
    this.pointManager = pointManager;
    this.#loadFromStorage();
  }

  get lines() { return this.#lines; }

  addLine(startPoint, endPoint, save = false) {
    this.#lines.push(new Line(startPoint, endPoint));
    if (save) this.saveToStorage();
  }

  removeLine(startPoint, endPoint, save = false) {
    this.#lines = this.#lines.filter(l =>
      !((l.startPoint === startPoint && l.endPoint === endPoint) ||
        (l.startPoint === endPoint   && l.endPoint === startPoint))
    );
    if (save) this.saveToStorage();
  }

  removeLinesByPoint(point, save = false) {
    this.#lines = this.#lines.filter(l => l.startPoint !== point && l.endPoint !== point);
    if (save) this.saveToStorage();
  }

  hasLine(p1, p2) {
    return this.#lines.some(l =>
      (l.startPoint === p1 && l.endPoint === p2) ||
      (l.startPoint === p2 && l.endPoint === p1)
    );
  }

  getLinesWithPoint(point) {
    const seen = new Set();
    return this.#lines.filter(line => {
      if (line.startPoint !== point && line.endPoint !== point) return false;
      const key = line.startPoint.id <= line.endPoint.id
        ? `${line.startPoint.id}-${line.endPoint.id}`
        : `${line.endPoint.id}-${line.startPoint.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  #loadFromStorage() {
    this.storage.load('lines').forEach(l => {
      const start = this.pointManager.getPointById(l.id1);
      const end   = this.pointManager.getPointById(l.id2);
      if (start && end) this.addLine(start, end);
    });
  }

  saveToStorage() {
    this.storage.save('lines', this.#lines.map(l => l.datas()));
  }
}

export default LineManager;
