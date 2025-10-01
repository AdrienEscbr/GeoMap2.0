class Line {
  constructor(startPoint, endPoint) {
    this._startPoint = startPoint;
    this._endPoint = endPoint;
    this._marker = null;
    this._selected = false;
  }

  datas(){
    return {
        startPoint : this._startPoint.id,
        endPoint : this._endPoint.id,
    }
  }

  set startPoint(startPoint) {
    if (startPoint !== this._startPoint)
        this._startPoint = startPoint;
  }
  get startPoint(){
    return this._startPoint;
  }

  set endPoint(desc) {
    if (desc !== this._endPoint)
        this._endPoint = desc;
  }
  get endPoint(){
    return this._endPoint;
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

export default Line;