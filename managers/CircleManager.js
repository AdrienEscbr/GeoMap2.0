import Circle from "../class/Circle.js";

export class CircleManager {
  constructor(map, storageManager) {
    this.map = map;
    this.storage = storageManager;
    this._circles = [];
    
    this.loadFromStorage();
  }

  get circles(){
    return this._circles;
  }

  set circles(circles){
    this._circles = circles
  }

  addCircle(radius, lat, lng, color, save = false) {
    const id = this._circles.length > 0 ? this._circles[this._circles.length - 1].id + 1 : 1;
    this._circles.push(new Circle(id, radius, lat, lng, color));
    if(save){
      this.saveToStorage();
    }
  }

  removeCircle(id, save = false) {
    this._circles = this._circles.filter(c => c.id !== id);
    if(save){
      this.saveToStorage();
    }
  }

  loadFromStorage() {
    const circles = this.storage.load("circles");
    // console.log("circles loaded : ", circles);

    circles.forEach(c => {
      this.addCircle(c.radius, c.latitude, c.longitude, c.color);
    });
  }

  saveToStorage() {
    let circlesToSave = [];
    this._circles.forEach(c =>{
      circlesToSave.push(c.datas());
    })
    this.storage.save("circles", circlesToSave);
  }
}

export default CircleManager