class Point {
  constructor(id, desc, lat, lng, color) {
    this._id = id;
    this._description = desc;
    this._latitude = lat;
    this._longitude = lng;
    this._color = color;
    this._radius = 8;
    this._marker = null;
    this._selected = false;
  }

  datas(){
    return {
        id : this._id,
        description : this._description,
        latitude : this._latitude,
        longitude : this.longitude,
        color : this._color,
        radius : this._radius,
    }
  }

  set id(id) {
    if (id !== this._id)
        this._id = id;
  }
  get id(){
    return this._id;
  }

  set description(desc) {
    if (desc !== this._description)
        this._description = desc;
  }
  get description(){
    return this._description;
  }

  set latitude(lat) {
    if (lat !== this._latitude)
        this._latitude = lat;
  }
  get latitude(){
    return this._latitude;
  }

  set longitude(lng) {
    if (lng !== this._longitude)
        this._longitude = lng;
  }
  get longitude(){
    return this._longitude;
  }

  set color(color) {
    if (color !== this._color)
        this._color = color;
  }
  get color(){
    return this._color;
  }
  
  set radius(radius) {
    if (radius !== this._radius)
        this._radius = radius;
  }
  get radius(){
    return this._radius;
  }

  set marker(marker){
    this._marker = marker;
  }
  get marker(){
    return this._marker;
  }

  set selected(selected){
    this._selected = selected;
  }
  get selected(){
    return this._selected;
  }
}

export default Point;