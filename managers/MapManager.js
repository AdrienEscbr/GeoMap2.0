class MapManager {
  constructor(container, options = {}) {
    this.container   = container; // accepts a DOM element or id string
    this.options     = options;
    this.map         = null;
    this.tileLayers  = {};
    this.currentTile = null;
    this.defaultView = [48.8566, 2.3522];
  }

  initMap() {
    this.map = L.map(this.container, this.options).setView(this.defaultView, 2);

    const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.tileLayers['default'] = tile;
    this.currentTile = tile;

    this.map.on('contextmenu', e => L.DomEvent.preventDefault(e.originalEvent));
  }

  setTileLayer(name) {
    if (!this.tileLayers[name] || !this.map) return;
    if (this.currentTile) this.map.removeLayer(this.currentTile);
    this.tileLayers[name].addTo(this.map);
    this.currentTile = this.tileLayers[name];
  }

  addTileLayer(name, urlTemplate, options = {}) {
    this.tileLayers[name] = L.tileLayer(urlTemplate, options);
  }

  getMapInstance() { return this.map; }
}

export default MapManager;
