import BaseTool from './BaseTool.js';

class EraseTool extends BaseTool {
  activate() {
    super.activate();
    this.setStatus('Cliquez sur un élément pour l\'effacer.');
    this.map.getContainer().style.cursor = "url('./assets/rubber.cur'), auto";
  }

  deactivate() {
    super.deactivate();
    this.map.getContainer().style.cursor = '';
  }

  onPointClick(point) {
    this.lineManager.getLinesWithPoint(point).forEach(l =>
      this.lineManager.removeLine(l.startPoint, l.endPoint, true)
    );
    this.pointManager.removePoint(point, true);
    this.selection.remove(point);
    this.redraw();
  }

  onLineClick(line) {
    this.lineManager.removeLine(line.startPoint, line.endPoint, true);
    this.selection.remove(line);
    this.redraw();
  }

  onCircleClick(circle) {
    this.circleManager.removeCircle(circle.id, true);
    this.selection.remove(circle);
    this.redraw();
  }
}

export default EraseTool;
