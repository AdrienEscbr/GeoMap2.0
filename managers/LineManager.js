import Line from "../class/Line.js";

class LineManager {
  constructor(map, storageManager, pointManager) {
    this.map = map;
    this.storage = storageManager;
    this.pointManager = pointManager;
    this._lines = [];
    
    this.loadFromStorage();
  }

  get lines(){
    return this._lines;
  }

  set lines(lines){
    this._lines = lines;
  }

  addLine(startPoint, endPoint, save = false) {
    this._lines.push(new Line(startPoint, endPoint));
    if(save){
      this.saveToStorage();      
    }
  }
  
  removeLine(startPoint, endPoint, save = false) {
    this._lines = this._lines.filter(l => l.startPoint !== startPoint && l.endPoint !== endPoint);
    if(save){
      this.saveToStorage();
    }    
  }

  unselectAll(){
    if(this._lines){
      this._lines.forEach(line => {
        line.selected = false;
      })
    }
  }

  selectAll(){
    if(this._lines){
      this._lines.forEach(line => {
        line.selected = true;
      })
    }
  }

  hasSelectedLine(){
    return this._lines.some( line => line.selected == true);
  }

  getSelectedLines(){
    const selectedLines = this._lines.filter(l => l.selected == true);
    return selectedLines;
  }

  removeLinesByPoint(point, save = false) {
    // Supprimer toutes les lignes où le point est startPoint ou endPoint
    this._lines = this._lines.filter(l => l.startPoint !== point && l.endPoint !== point);
  
    if (save) {
      this.saveToStorage();
    }
  }

  // getLinesWithPoint(point){
  //   const allLines = this._lines.filter(line => line.startPoint == point || line.endPoint == point);
  //   return allLines;
  // }

  getLinesWithPoint(point) {
    const seen = new Set();
    return this._lines.filter(line => {
      if (line.startPoint === point || line.endPoint === point) {
        // Construire une clé unique indépendante de l’ordre
        const key = line.startPoint.id <= line.endPoint.id
          ? `${line.startPoint.id}-${line.endPoint.id}`
          : `${line.endPoint.id}-${line.startPoint.id}`;
  
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
      return false;
    });
  }
  

  getLine(startPoint, endPoint){
    return this._lines.find(l => l.startPoint === startPoint && l.endPoint === endPoint);
  }

  loadFromStorage() {
    const lines = this.storage.load("lines");
    // console.log("lines loaded : ", lines);

    lines.forEach(l => {
      const start = this.pointManager.getPointById(l.startPoint);
      const end = this.pointManager.getPointById(l.endPoint);
      if(start && end){
        this.addLine(start, end);
      }      
    });
  }

  saveToStorage() {
    let linesToSave = [];
    this._lines.forEach(l =>{
      linesToSave.push(l.datas());
    })
    this.storage.save("lines", linesToSave);
  }
}

export default LineManager;