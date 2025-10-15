import Point from "../class/Point.js";

class PointManager {
  constructor(map, storageManager) {
    this.map = map;
    this.storage = storageManager;
    this._points = [];
    
    this.loadFromStorage();
  }

  set points(points){
    this._points = points;
  }

  get points(){
    return this._points;
  }

  addPoint(id = null, desc, lat, lng, color, save = false) {
    let idt = id;
    if(idt === null){
      idt = this._points.length > 0 ? this._points[this._points.length - 1].id + 1 : 1;
    }
    this._points.push(new Point(idt, desc, lat, lng, color));
    if(save){
      this.saveToStorage();
    }
  }

  removePoint(point, save = false) {
    this._points = this._points.filter(p => p !== point);
    if(save){
      this.saveToStorage();
    }    
  }

  unselectAll(){
    if(this._points){
      this._points.forEach(point => {
        point.selected = false;
      })
    }
  }

  selectAll(){
    if(this._points){
      this._points.forEach(point => {
        point.selected = true;
      })
    }
  }

  hasSelectedPoint(){
    return this._points.some( point => point.selected == true);
  }

  getSelectedPoints(){
    const selectedPoints = this._points.filter(p => p.selected == true);
    return selectedPoints;
  }

  getPoint(point){
    const foundPoints = this._points.filter(p => p === point);
    if(foundPoints){
      return foundPoints[0];
    }
    return null;
  }

  getIndex(pointId){
    const idx = this._points.findIndex((p) => p.id === pointId);
    return idx;
  }

  getPointById(id) {
    return this._points.find(p => p.id === id);
  }

  getPointAt(lat, lng) {
    return this._points.find(p => p.lat === lat && p.lng === lng);
  }

  loadFromStorage() {
    const points = this.storage.load("points");
    console.log("points loaded : ", points);

    points.forEach(p => {
      this.addPoint(p.id, p.desc, p.lat, p.lng, p.color);
    });
  }

  saveToStorage() {
    let pointsToSave = [];
    this._points.forEach(p =>{
      pointsToSave.push(p.datas());
    })
    this.storage.save("points", pointsToSave);
  }
}

export default PointManager;