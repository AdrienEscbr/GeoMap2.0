class SelectionManager {
  constructor() {
    this.selected = new Set();
  }

  toggle(entity) {
    if (this.selected.has(entity)) {
      this.selected.delete(entity);
    } else {
      this.selected.add(entity);
    }
  }

  clear() {
    this.selected.clear();
  }

  isSelected(entity) {
    return this.selected.has(entity);
  }

  getAll() {
    return [...this.selected];
  }

  hasSelection() {
    return this.selected.size > 0;
  }

  remove(entity) {
    this.selected.delete(entity);
  }  
  
}

export default SelectionManager;
