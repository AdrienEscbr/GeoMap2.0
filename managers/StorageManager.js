class StorageManager {
  constructor() {
    this.keys = {
      points: 'mapPoints',
      lines: 'mapPolylines',
      circles: 'circles'
    };
  }

  /**
   * Sauvegarde un tableau ou un objet dans le localStorage.
   * @param {string} keyName Nom logique : "points" | "lines" | "circles"
   * @param {*} data Données à sauvegarder
   */
  save(keyName, data) {
    if (!this.keys[keyName]) {
      console.error(`Clé "${keyName}" non reconnue pour le stockage.`);
      return;
    }
    try {
      localStorage.setItem(this.keys[keyName], JSON.stringify(data));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde dans le localStorage :', e);
    }
  }

  /**
   * Charge les données depuis le localStorage.
   * @param {string} keyName Nom logique : "points" | "lines" | "circles"
   * @returns {*} Données ou tableau vide si rien
   */
  load(keyName) {
    if (!this.keys[keyName]) {
      console.error(`Clé "${keyName}" non reconnue pour le stockage.`);
      return [];
    }
    try {
      const raw = localStorage.getItem(this.keys[keyName]);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erreur lors du chargement depuis le localStorage :', e);
      return [];
    }
  }

  /**
   * Supprime une clé précise du localStorage
   * @param {string} keyName Nom logique : "points" | "lines" | "circles"
   */
  clear(keyName) {
    if (!this.keys[keyName]) {
      console.error(`Clé "${keyName}" non reconnue pour le stockage.`);
      return;
    }
    localStorage.removeItem(this.keys[keyName]);
  }

  /**
   * Supprime toutes les données gérées par le StorageManager
   */
  clearAll() {
    for (let k in this.keys) {
      localStorage.removeItem(this.keys[k]);
    }
  }

  /**
   * Vérifie si au moins une des clés contient des données
   * @returns {boolean} true si une clé contient quelque chose, false sinon
   */
  hasData() {
    return Object.values(this.keys).some(
      key => localStorage.getItem(key) !== null
    );
  }
}

export default StorageManager;
