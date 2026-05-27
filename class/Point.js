import { POINT_RADIUS, COLORS } from '../config/constants.js';

class Point {
  #id;
  #description;
  #latitude;
  #longitude;
  #color;
  #radius;

  constructor(id, desc, lat, lng, color = COLORS.defaultNew) {
    this.#id          = id;
    this.#description = desc;
    this.#latitude    = lat;
    this.#longitude   = lng;
    this.#color       = color;
    this.#radius      = POINT_RADIUS;
  }

  get id()          { return this.#id; }
  get description() { return this.#description; }
  get latitude()    { return this.#latitude; }
  get longitude()   { return this.#longitude; }
  get color()       { return this.#color; }
  get radius()      { return this.#radius; }

  set description(v) { this.#description = v; }
  set latitude(v)    { this.#latitude    = v; }
  set longitude(v)   { this.#longitude   = v; }
  set color(v)       { this.#color       = v; }
  set radius(v)      { this.#radius      = v; }

  datas() {
    return {
      id:     this.#id,
      desc:   this.#description,
      lat:    this.#latitude,
      lng:    this.#longitude,
      color:  this.#color,
      radius: this.#radius,
    };
  }
}

export default Point;
