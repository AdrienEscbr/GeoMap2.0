import StorageManager  from './managers/StorageManager.js';
import MapManager      from './managers/MapManager.js';
import PointManager    from './managers/PointManager.js';
import LineManager     from './managers/LineManager.js';
import CircleManager   from './managers/CircleManager.js';
import Renderer        from './managers/Renderer.js';
import SelectionManager from './managers/SelectionManager.js';
import UIManager       from './managers/UIManager.js';
import { dom }         from './config/dom.js';

const storage  = new StorageManager();
const mapMgr   = new MapManager(dom.map, { zoomControl: false });
mapMgr.initMap();

const points   = new PointManager(storage);
const lines    = new LineManager(storage, points);
const circles  = new CircleManager(storage);

const renderer  = new Renderer(mapMgr.getMapInstance());
const selection = new SelectionManager();

new UIManager(mapMgr, storage, points, lines, circles, renderer, selection);
