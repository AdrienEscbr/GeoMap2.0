class MapManager {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.globalEventListeners = {};
    this.tileLayers = {}; // Stocke les fonds de carte disponibles
    this.currentTileLayer = null;
    this.defaultViewCoordinates = [48.8566, 2.3522];
  }

  initMap() {
    this.map = L.map(this.containerId, this.options).setView(this.defaultViewCoordinates, 2);

    // Exemple : fond de carte par défaut
    const defaultTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.tileLayers['default'] = defaultTile;
    this.currentTileLayer = defaultTile;

    this.map.on('contextmenu', (e) => {
      L.DomEvent.preventDefault(e.originalEvent);
    });
  }

  // Ajouter un fond de carte disponible
  addTileLayer(name, urlTemplate, options = {}) {
    const layer = L.tileLayer(urlTemplate, options);
    this.tileLayers[name] = layer;
  }

  // Changer le fond de carte actif
  setTileLayer(name) {
    if (!this.tileLayers[name] || !this.map) return;

    // Retirer le fond actuel
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    // Ajouter le nouveau fond
    this.tileLayers[name].addTo(this.map);
    this.currentTileLayer = this.tileLayers[name];
  }

  setCursor(cursorType) {
    if (this.map) {
      this.map.getContainer().style.cursor = cursorType;
    }
  }

  showCoordinates(lat, lng) {
    // Implémentation selon UI (tooltip, div flottante, etc.)
  }

  addGlobalEventListener(eventName, callback) {
    if (!this.map) return;
    this.map.on(eventName, callback);
    if (!this.globalEventListeners[eventName]) {
      this.globalEventListeners[eventName] = [];
    }
    this.globalEventListeners[eventName].push(callback);
  }

  removeGlobalEventListener(eventName, callback) {
    if (!this.map) return;
    this.map.off(eventName, callback);
    if (this.globalEventListeners[eventName]) {
      this.globalEventListeners[eventName] = this.globalEventListeners[eventName].filter(fn => fn !== callback);
    }
  }

  getMapInstance() {
    return this.map;
  }
}

export default MapManager;
