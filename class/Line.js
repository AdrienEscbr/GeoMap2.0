class Line {
  #startPoint;
  #endPoint;

  constructor(startPoint, endPoint) {
    this.#startPoint = startPoint;
    this.#endPoint   = endPoint;
  }

  get startPoint() { return this.#startPoint; }
  get endPoint()   { return this.#endPoint; }

  set startPoint(v) { this.#startPoint = v; }
  set endPoint(v)   { this.#endPoint   = v; }

  datas() {
    return {
      id1: this.#startPoint.id,
      id2: this.#endPoint.id,
    };
  }
}

export default Line;
