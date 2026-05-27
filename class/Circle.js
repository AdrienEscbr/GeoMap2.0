import { COLORS } from '../config/constants.js';

class Circle {
  #id;
  #radius;
  #latitude;
  #longitude;
  #color;

  constructor(id, radius, lat, lng, color = COLORS.defaultNew) {
    this.#id        = id;
    this.#radius    = radius;
    this.#latitude  = lat;
    this.#longitude = lng;
    this.#color     = color;
  }

  get id()        { return this.#id; }
  get radius()    { return this.#radius; }
  get latitude()  { return this.#latitude; }
  get longitude() { return this.#longitude; }
  get color()     { return this.#color; }

  set radius(v)    { this.#radius    = v; }
  set latitude(v)  { this.#latitude  = v; }
  set longitude(v) { this.#longitude = v; }
  set color(v)     { this.#color     = v; }

  datas() {
    return {
      id:     this.#id,
      lat:    this.#latitude,
      lng:    this.#longitude,
      radius: this.#radius,
      color:  this.#color,
    };
  }
}

export default Circle;
