function q(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`[dom] Element #${id} not found`);
  return el;
}

export const dom = {
  map: q('map'),

  navbar: {
    root: q('navbarNav'),
  },

  sidebar: {
    root:            q('sidebar'),
    form:            q('add-point-form'),
    descInput:       q('new-desc'),
    coordsInput:     q('new-coords'),
    feedback:        q('coord-feedback'),
    colorInput:      q('new-color'),
    addBtn:          q('add-point-form-btn'),
    pointList:       q('point-list'),
    connectPoint1:   q('select-point1'),
    connectPoint2:   q('select-point2'),
    connectBtn:      q('connect-btn'),
  },

  toolbar: {
    deleteBtn:       q('delete-btn'),
    addLineBtn:      q('add-line-btn'),
    eraseBtn:        q('erase-btn'),
    distanceBtn:     q('show-distances-btn'),
    nameBtn:         q('show-names-btn'),
    circleBtn:       q('circle-btn'),
    addPointBtn:     q('add-point-btn'),
    colorBtn:        q('element-color'),
    stretchBtn:      q('stretch-btn'),
    rotateBtn:       q('structure-angle'),
    resizeCircleBtn: q('resize-circle-btn'),
  },

  modals: {
    importExport:    q('importExportModal'),
    copyBtn:         q('export-btn'),
    clearBtn:        q('clear-area-btn'),
    textArea:        q('import-export-area'),
    importBtn:       q('import-btn'),
    feedback:        q('import-feedback'),

    editPoint:       q('editPointModal'),
    editDesc:        q('edit-desc'),
    editCoords:      q('edit-coords'),
    editColor:       q('edit-color'),
    editFeedback:    q('edit-feedback'),
    editSaveBtn:     q('save-edit-btn'),
  },

  statusBar: q('status-bar'),
};
