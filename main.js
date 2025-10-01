import StorageManager from "./managers/StorageManager.js";
import MapManager from "./managers/MapManager.js";
import PointManager from "./managers/PointManager.js";
import LineManager from "./managers/LineManager.js";
import CircleManager from "./managers/CircleManager.js";
import UIManager from "./managers/UIManager.js";

const storageManager = new StorageManager()
// storageManager.clearAll()

const map = new MapManager(mapSection, {zoomControl: false});
map.initMap();

const pointManager = new PointManager(map, storageManager);
const lineManager = new LineManager(map, storageManager, pointManager);
const circlesManager = new CircleManager(map, storageManager);

const uiManager = new UIManager(map, storageManager, pointManager, lineManager, circlesManager);
