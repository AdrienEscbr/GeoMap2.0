import BaseTool from './BaseTool.js';
import Point from '../class/Point.js';

class ConnectTool extends BaseTool {
  activate() {
    super.activate();
    this.setStatus('Cliquez successivement sur des points pour les relier.');
  }

  deactivate() {
    super.deactivate();
  }

  /** Called by UIManager after selection has been toggled for a point. */
  onPointSelected() {
    const pts = this.selection.getAll().filter(e => e instanceof Point);
    if (pts.length < 2) return;

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    if (!this.lineManager.hasLine(prev, last)) {
      this.lineManager.addLine(prev, last, true);
      this.redraw();
    }
  }
}

export default ConnectTool;
