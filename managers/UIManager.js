import Point from '../class/Point.js';
import Line  from '../class/Line.js';
import Circle from '../class/Circle.js';
import { dom } from '../config/dom.js';
import { GeoUtils } from '../utils/GeoUtils.js';

import AddPointTool  from '../tools/AddPointTool.js';
import ConnectTool   from '../tools/ConnectTool.js';
import CircleTool    from '../tools/CircleTool.js';
import StretchTool   from '../tools/StretchTool.js';
import RotationTool  from '../tools/RotationTool.js';
import EraseTool        from '../tools/EraseTool.js';
import ResizeCircleTool from '../tools/ResizeCircleTool.js';

class UIManager {
  #activeTool  = null;
  #showDist    = false;
  #showNames   = false;
  #sortable    = null;
  #editTarget  = null;
  #colorOverlay = null;

  constructor(mapManager, storage, points, lines, circles, renderer, selection) {
    this.mapManager    = mapManager;
    this.map           = mapManager.getMapInstance();
    this.storage       = storage;
    this.pointManager  = points;
    this.lineManager   = lines;
    this.circleManager = circles;
    this.renderer      = renderer;
    this.selection     = selection;

    const ctx = {
      map:            this.map,
      pointManager:   this.pointManager,
      lineManager:    this.lineManager,
      circleManager:  this.circleManager,
      renderer:       this.renderer,
      selection:      this.selection,
      redraw:         () => this.redraw(),
      setStatus:      msg => this.#setStatus(msg),
    };

    this.tools = {
      addPoint: new AddPointTool(ctx),
      connect:  new ConnectTool(ctx),
      circle:   new CircleTool(ctx),
      stretch:  new StretchTool(ctx),
      rotate:   new RotationTool(ctx),
      erase:       new EraseTool(ctx),
      resizeCircle: new ResizeCircleTool(ctx),
    };

    this.#bindToolbar();
    this.#bindSidebar();
    this.#bindImportExport();
    this.#bindEditModal();
    this.#bindMapClick();
    this.#bindKeyboard();

    this.redraw();
    this.#refreshPointList();
    this.#refreshConnectSelects();
  }

  // ── Redraw ──────────────────────────────────────────────────────────────────

  redraw() {
    this.renderer.clear();
    this.renderer.clearNameLabels();

    this.circleManager.circles.forEach(c =>
      this.renderer.drawCircle(c, this.selection.isSelected(c), (circle, e) =>
        this.#onCircleClick(circle, e))
    );

    this.lineManager.lines.forEach(l =>
      this.renderer.drawLine(l, this.selection.isSelected(l), (line, e) =>
        this.#onLineClick(line, e), this.#showDist)
    );

    this.pointManager.points.forEach(p => {
      this.renderer.drawPoint(p, this.selection.isSelected(p), (point, e) =>
        this.#onPointClick(point, e));
      if (this.#showNames) this.renderer.addNameLabel(p);
    });

    this.#syncToolbarState();
  }

  // ── Click routing ────────────────────────────────────────────────────────────

  #onPointClick(point, e) {
    const tool = this.#activeTool;
    if (tool instanceof EraseTool)    { tool.onPointClick(point); return; }
    if (tool instanceof CircleTool)   { tool.onPointClick(point); return; }
    if (tool instanceof RotationTool) { tool.onPointClick(point); return; }
    if (tool instanceof AddPointTool) { tool.onPointClick(point, e); return; }

    this.selection.toggle(point);
    this.redraw();
    this.#syncDeleteBtn();

    if (tool instanceof ConnectTool) tool.onPointSelected();
  }

  #onLineClick(line, e) {
    const tool = this.#activeTool;
    if (tool instanceof EraseTool)   { tool.onLineClick(line); return; }
    if (tool instanceof StretchTool) { tool.onLineClick(line); return; }
    if (tool instanceof AddPointTool){ tool.onLineClick(line, e); return; }

    this.selection.toggle(line);
    this.redraw();
    this.#syncDeleteBtn();
  }

  #onCircleClick(circle, e) {
    const tool = this.#activeTool;
    if (tool instanceof EraseTool)        { tool.onCircleClick(circle); return; }
    if (tool instanceof ResizeCircleTool) { tool.onCircleClick(circle); return; }
    if (tool instanceof AddPointTool && e?.latlng) {
      tool.onPointClick({ latitude: e.latlng.lat, longitude: e.latlng.lng }, e);
      return;
    }

    this.selection.toggle(circle);
    this.redraw();
    this.#syncDeleteBtn();
  }

  // ── Tool management ──────────────────────────────────────────────────────────

  #activateTool(name) {
    if (this.#activeTool) this.#activeTool.deactivate();
    const tool = name ? this.tools[name] : null;
    this.#activeTool = tool;
    if (tool) tool.activate();
    this.#syncToolbarState();
    if (!name) this.#setStatus('');
  }

  #toggleTool(name) {
    const currentName = this.#toolName(this.#activeTool);
    this.#activateTool(currentName === name ? null : name);
  }

  #toolName(tool) {
    if (!tool) return null;
    return Object.keys(this.tools).find(k => this.tools[k] === tool) ?? null;
  }

  // ── Toolbar bindings ─────────────────────────────────────────────────────────

  #bindToolbar() {
    const tb = dom.toolbar;

    tb.addPointBtn.addEventListener('click', () => this.#toggleTool('addPoint'));
    tb.addLineBtn .addEventListener('click', () => this.#toggleTool('connect'));
    tb.circleBtn  .addEventListener('click', () => this.#toggleTool('circle'));
    tb.stretchBtn .addEventListener('click', () => this.#toggleTool('stretch'));
    tb.rotateBtn  .addEventListener('click', () => this.#toggleTool('rotate'));
    tb.eraseBtn        .addEventListener('click', () => this.#toggleTool('erase'));
    tb.resizeCircleBtn .addEventListener('click', () => this.#toggleTool('resizeCircle'));

    tb.distanceBtn.addEventListener('click', () => {
      this.#showDist = !this.#showDist;
      tb.distanceBtn.classList.toggle('active', this.#showDist);
      this.redraw();
    });

    tb.nameBtn.addEventListener('click', () => {
      this.#showNames = !this.#showNames;
      tb.nameBtn.classList.toggle('active', this.#showNames);
      this.redraw();
    });

    tb.colorBtn.addEventListener('click', () => {
      if (!this.selection.hasSelection()) return;
      this.#showColorOverlay();
    });

    tb.deleteBtn.addEventListener('click', () => {
      this.selection.getAll().forEach(entity => {
        if (entity instanceof Point) {
          this.lineManager.getLinesWithPoint(entity)
            .forEach(l => this.lineManager.removeLine(l.startPoint, l.endPoint, true));
          this.pointManager.removePoint(entity, true);
        } else if (entity instanceof Line) {
          this.lineManager.removeLine(entity.startPoint, entity.endPoint, true);
        } else if (entity instanceof Circle) {
          this.circleManager.removeCircle(entity.id, true);
        }
      });
      this.selection.clear();
      this.redraw();
      this.#refreshPointList();
      this.#refreshConnectSelects();
      this.#syncDeleteBtn();
    });
  }

  #syncToolbarState() {
    const tb          = dom.toolbar;
    const activeName  = this.#toolName(this.#activeTool);
    const isErase     = activeName === 'erase';
    const isRotate    = activeName === 'rotate';
    const hasSelection = this.selection.hasSelection();

    Object.entries({
      addPoint:     tb.addPointBtn,
      connect:      tb.addLineBtn,
      circle:       tb.circleBtn,
      stretch:      tb.stretchBtn,
      rotate:       tb.rotateBtn,
      erase:        tb.eraseBtn,
      resizeCircle: tb.resizeCircleBtn,
    }).forEach(([name, btn]) => {
      btn.classList.toggle('active', activeName === name);
    });

    tb.deleteBtn.disabled = !hasSelection || isErase || isRotate;
    tb.colorBtn .disabled = !hasSelection || isErase || isRotate;

    const cursor = activeName === 'erase'
      ? "url('./assets/rubber.cur'), auto"
      : (activeName === 'addPoint' || activeName === 'circle' || activeName === 'connect')
        ? 'crosshair'
        : '';
    this.map.getContainer().style.cursor = cursor;
  }

  #syncDeleteBtn() {
    dom.toolbar.deleteBtn.disabled = !this.selection.hasSelection();
    dom.toolbar.colorBtn .disabled = !this.selection.hasSelection();
  }

  // ── Map click (deselect / circle validate) ───────────────────────────────────

  #bindMapClick() {
    this.map.on('click', e => {
      if (this.#activeTool instanceof AddPointTool) return;
      if (this.#activeTool instanceof CircleTool) {
        this.#activeTool.onMapClick(e);
        return;
      }
      if (this.#activeTool instanceof EraseTool ||
          this.#activeTool instanceof ConnectTool) return;

      if (this.selection.hasSelection()) {
        this.selection.clear();
        this.redraw();
        this.#syncDeleteBtn();
      }
    });
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  #bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.#activeTool) this.#activateTool(null);
        else if (this.selection.hasSelection()) {
          this.selection.clear();
          this.redraw();
          this.#syncDeleteBtn();
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          !e.target.closest('input, textarea')) {
        dom.toolbar.deleteBtn.click();
      }
    });
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────────

  #bindSidebar() {
    const sb = dom.sidebar;

    sb.form.addEventListener('submit', e => {
      e.preventDefault();
      const desc   = sb.descInput.value.trim();
      const coords = GeoUtils.parseCoords(sb.coordsInput.value);
      if (!coords) {
        sb.feedback.innerHTML = '<span class="text-danger">Coordonnées invalides (lat, lng).</span>';
        return;
      }
      this.pointManager.addPoint(null, desc, coords.lat, coords.lng, sb.colorInput.value, true);
      this.redraw();
      this.#refreshPointList();
      this.#refreshConnectSelects();
      sb.form.reset();
      sb.feedback.innerHTML = '';
    });
  }

  // ── Point list ───────────────────────────────────────────────────────────────

  #refreshPointList() {
    const list = dom.sidebar.pointList;

    if (this.#sortable) { this.#sortable.destroy(); this.#sortable = null; }
    list.innerHTML = '';

    this.pointManager.points.forEach(p => {
      const li = document.createElement('li');
      li.className = 'point-list-item';
      li.dataset.id = p.id;

      const drag = document.createElement('span');
      drag.className = 'drag-handle';
      drag.title = 'Réordonner';
      drag.innerHTML = '⠿';

      const info = document.createElement('span');
      info.className = 'point-info';
      info.textContent = p.description;

      const coords = document.createElement('span');
      coords.className = 'point-coords';
      coords.textContent = `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`;

      const body = document.createElement('div');
      body.className = 'point-list-item__body';
      body.append(info, coords);

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-icon';
      btnEdit.title = 'Modifier';
      btnEdit.innerHTML = '<img src="./assets/edit.png" alt="Modifier">';
      btnEdit.addEventListener('click', () => this.#openEditModal(p));

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icon btn-icon--danger';
      btnDel.title = 'Supprimer';
      btnDel.innerHTML = '<img src="./assets/bin.png" alt="Supprimer">';

      const actions = document.createElement('div');
      actions.className = 'point-list-item__actions';
      actions.append(btnEdit, btnDel);

      // Inline confirmation row (hidden until bin is clicked)
      const confirm = document.createElement('div');
      confirm.className = 'point-list-item__confirm';
      confirm.innerHTML = `
        <span>Supprimer&nbsp;?</span>
        <button class="btn btn-danger btn-sm py-0 px-2" style="font-size:.75rem">Oui</button>
        <button class="btn btn-outline-secondary btn-sm py-0 px-2" style="font-size:.75rem">Non</button>`;

      btnDel.addEventListener('click', () => li.classList.add('point-list-item--confirming'));
      confirm.querySelector('.btn-outline-secondary').addEventListener('click',
        () => li.classList.remove('point-list-item--confirming'));
      confirm.querySelector('.btn-danger').addEventListener('click', () => {
        this.lineManager.getLinesWithPoint(p)
          .forEach(l => this.lineManager.removeLine(l.startPoint, l.endPoint, true));
        this.pointManager.removePoint(p, true);
        this.selection.remove(p);
        this.redraw();
        this.#refreshPointList();
        this.#refreshConnectSelects();
      });

      const bar = document.createElement('span');
      bar.className = 'point-list-item__bar';
      bar.style.backgroundColor = p.color;

      li.append(drag, body, confirm, actions, bar);
      list.appendChild(li);
    });

    this.#sortable = Sortable.create(list, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: () => {
        const ids = [...list.children].map(li => parseInt(li.dataset.id));
        this.pointManager.reorder(ids);
      },
    });
  }

  // ── Connect selects ──────────────────────────────────────────────────────────

  #refreshConnectSelects() {
    const { connectPoint1, connectPoint2, connectBtn } = dom.sidebar;
    const fill = sel => {
      sel.innerHTML = '<option value="" disabled selected>Choisir…</option>';
      this.pointManager.points.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = p.description;
        sel.appendChild(o);
      });
    };
    fill(connectPoint1);
    fill(connectPoint2);
    connectBtn.disabled = true;

    const check = () => {
      const id1 = parseInt(connectPoint1.value);
      const id2 = parseInt(connectPoint2.value);
      connectBtn.disabled = !(id1 && id2 && id1 !== id2);
    };

    // Remove old listeners by replacing nodes
    const p1New = connectPoint1.cloneNode(true);
    const p2New = connectPoint2.cloneNode(true);
    const cbNew = connectBtn.cloneNode(true);
    connectPoint1.replaceWith(p1New);
    connectPoint2.replaceWith(p2New);
    connectBtn.replaceWith(cbNew);

    // Re-fill after replace
    fill(p1New); fill(p2New);
    p1New.addEventListener('change', check);
    p2New.addEventListener('change', check);
    cbNew.addEventListener('click', () => {
      const p1 = this.pointManager.getPointById(parseInt(p1New.value));
      const p2 = this.pointManager.getPointById(parseInt(p2New.value));
      if (p1 && p2 && !this.lineManager.hasLine(p1, p2)) {
        this.lineManager.addLine(p1, p2, true);
        this.redraw();
      }
    });
    // Update the dom references
    dom.sidebar.connectPoint1 = p1New;
    dom.sidebar.connectPoint2 = p2New;
    dom.sidebar.connectBtn    = cbNew;
  }

  // ── Edit point modal ─────────────────────────────────────────────────────────

  #openEditModal(point) {
    this.#editTarget = point;
    const m = dom.modals;
    m.editDesc.value   = point.description;
    m.editCoords.value = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    m.editColor.value  = point.color;
    m.editFeedback.textContent = '';
    bootstrap.Modal.getOrCreateInstance(m.editPoint).show();
  }

  #bindEditModal() {
    dom.modals.editSaveBtn.addEventListener('click', () => {
      const m      = dom.modals;
      const point  = this.#editTarget;
      if (!point) return;

      const desc   = m.editDesc.value.trim();
      const coords = GeoUtils.parseCoords(m.editCoords.value);
      if (!coords) { m.editFeedback.textContent = 'Coordonnées invalides.'; return; }

      point.description = desc;
      point.latitude    = coords.lat;
      point.longitude   = coords.lng;
      point.color       = m.editColor.value;

      this.pointManager.saveToStorage();
      this.redraw();
      this.#refreshPointList();
      this.#refreshConnectSelects();

      bootstrap.Modal.getInstance(m.editPoint).hide();
      this.#editTarget = null;
    });
  }

  // ── Import / Export ──────────────────────────────────────────────────────────

  #bindImportExport() {
    const m = dom.modals;

    dom.modals.importExport?.addEventListener('show.bs.modal', () => {
      m.copyBtn.disabled  = !this.storage.hasData();
      m.textArea.value    = '';
      m.feedback.innerHTML = '';
      m.importBtn.disabled = true;
    });

    m.textArea.addEventListener('input', () => {
      m.importBtn.disabled = m.textArea.value.trim() === '';
    });

    m.clearBtn.addEventListener('click', () => {
      m.textArea.value = '';
      m.feedback.innerHTML = '';
      m.importBtn.disabled = true;
    });

    m.copyBtn.addEventListener('click', () => {
      const json = JSON.stringify({
        points:  this.pointManager.points.map(p => p.datas()),
        lines:   this.lineManager.lines.map(l => l.datas()),
        circles: this.circleManager.circles.map(c => c.datas()),
      }, null, 2);
      m.textArea.value = json;
      navigator.clipboard.writeText(json)
        .then(() => m.feedback.innerHTML = '<span class="text-success">Copié !</span>')
        .catch(() => m.feedback.innerHTML = '<span class="text-danger">Échec copie.</span>');
      m.importBtn.disabled = false;
    });

    m.importBtn.addEventListener('click', () => {
      m.feedback.innerHTML = '';
      let data;
      try { data = JSON.parse(m.textArea.value); }
      catch { m.feedback.innerHTML = '<span class="text-danger">JSON invalide.</span>'; return; }

      if (!Array.isArray(data.points) || !Array.isArray(data.lines) || !Array.isArray(data.circles)) {
        m.feedback.innerHTML = '<span class="text-danger">Format attendu : { points, lines, circles }.</span>';
        return;
      }

      data.points.forEach(pt => {
        if (!this.pointManager.getPointById(pt.id))
          this.pointManager.addPoint(pt.id, pt.desc, pt.lat, pt.lng, pt.color, true);
      });

      data.lines.forEach(ln => {
        const p1 = this.pointManager.getPointById(ln.id1);
        const p2 = this.pointManager.getPointById(ln.id2);
        if (p1 && p2 && !this.lineManager.hasLine(p1, p2))
          this.lineManager.addLine(p1, p2, true);
      });

      data.circles.forEach(c =>
        this.circleManager.addCircle(c.radius, c.lat, c.lng, c.color, true)
      );

      this.redraw();
      this.#refreshPointList();
      m.feedback.innerHTML = '<span class="text-success">Import réussi.</span>';
    });
  }

  // ── Color overlay ─────────────────────────────────────────────────────────────

  #showColorOverlay() {
    if (this.#colorOverlay) this.#colorOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'color-overlay';
    overlay.innerHTML = `
      <h6 class="color-overlay__title">Couleur</h6>
      <input type="color" class="color-overlay__picker" id="colorPicker">
      <div class="color-overlay__actions">
        <button class="btn btn-sm btn-primary" id="applyColor">Appliquer</button>
        <button class="btn btn-sm btn-outline-secondary" id="cancelColor">Annuler</button>
      </div>`;
    document.body.appendChild(overlay);
    this.#colorOverlay = overlay;

    const picker = overlay.querySelector('#colorPicker');
    overlay.querySelector('#applyColor').addEventListener('click', () => {
      this.#applyColorToSelection(picker.value);
      overlay.remove();
      this.#colorOverlay = null;
    });
    overlay.querySelector('#cancelColor').addEventListener('click', () => {
      overlay.remove();
      this.#colorOverlay = null;
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#colorOverlay) {
        this.#colorOverlay.remove();
        this.#colorOverlay = null;
      }
    }, { once: true });
  }

  #applyColorToSelection(color) {
    this.selection.getAll().forEach(el => {
      if (el instanceof Point)  el.color = color;
      else if (el instanceof Line) {
        el.startPoint.color = color;
        el.endPoint.color   = color;
      } else if (el instanceof Circle) el.color = color;
    });
    this.pointManager.saveToStorage();
    this.lineManager.saveToStorage();
    this.circleManager.saveToStorage();
    this.redraw();
  }

  // ── Status bar ────────────────────────────────────────────────────────────────

  #setStatus(msg) {
    if (dom.statusBar) dom.statusBar.textContent = msg;
  }
}

export default UIManager;
