import BaseTool from './BaseTool.js';

class ResizeCircleTool extends BaseTool {
  #circle         = null;
  #originalRadius = null;
  #uiBox          = null;

  activate() {
    super.activate();
    this.setStatus('Cliquez sur un cercle pour modifier son rayon.');
  }

  deactivate() {
    super.deactivate();
    this.#exit(true);
  }

  /** Called by UIManager when a circle is clicked while this tool is active. */
  onCircleClick(circle) {
    if (this.#circle) return; // resize already in progress
    this.#circle         = circle;
    this.#originalRadius = circle.radius;
    this.#showUI();
  }

  // ── private ────────────────────────────────────────────────────────────────

  #showUI() {
    const current = Math.round(this.#circle.radius);
    this.setStatus('Saisissez le nouveau rayon, prévisualisez, puis validez ou annulez.');

    const box = document.createElement('div');
    box.className = 'resize-ui';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Modifier le rayon du cercle');
    box.innerHTML = `
      <div class="resize-ui__header">
        <span class="resize-ui__title">Rayon du cercle</span>
        <span class="resize-ui__value" id="resize-display">${current}&nbsp;m</span>
      </div>
      <div class="resize-ui__field">
        <input type="number" id="resize-input" class="form-control form-control-sm"
               value="${current}" min="1" step="1"
               aria-label="Nouveau rayon en mètres" />
        <span class="resize-ui__unit">m</span>
      </div>
      <div class="resize-ui__hint">Rayon original&nbsp;: ${current}&nbsp;m</div>
      <div class="resize-ui__actions">
        <button class="btn btn-sm btn-success" id="resize-ok">Valider</button>
        <button class="btn btn-sm btn-outline-secondary" id="resize-cancel">Annuler</button>
      </div>`;

    document.body.appendChild(box);
    this.#uiBox = box;

    const input   = box.querySelector('#resize-input');
    const display = box.querySelector('#resize-display');

    // Live preview on every keystroke
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      const valid = v > 0 && isFinite(v);
      input.classList.toggle('is-invalid', !valid);
      if (!valid) return;
      display.textContent = `${Math.round(v)} m`;
      this.#circle.radius = v;
      this.redraw();
    });

    // Keyboard: Enter = validate, Escape = cancel
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); box.querySelector('#resize-ok').click(); }
      if (e.key === 'Escape') { e.preventDefault(); box.querySelector('#resize-cancel').click(); }
    });

    box.querySelector('#resize-ok').addEventListener('click', () => {
      const v = parseFloat(input.value);
      if (!(v > 0)) { input.classList.add('is-invalid'); input.focus(); return; }
      this.#circle.radius = v;
      this.circleManager.saveToStorage();
      this.#exit(false);
    });

    box.querySelector('#resize-cancel').addEventListener('click', () => this.#exit(true));

    // Auto-focus + select so user can type immediately
    input.focus();
    input.select();
  }

  #exit(cancel) {
    if (cancel && this.#circle !== null) {
      this.#circle.radius = this.#originalRadius;
      this.redraw();
    }
    if (this.#uiBox) { this.#uiBox.remove(); this.#uiBox = null; }
    this.#circle         = null;
    this.#originalRadius = null;
    this.setStatus('');
  }
}

export default ResizeCircleTool;
