/**
 * All tools share activate/deactivate lifecycle and access to core services.
 * ctx = { map, pointManager, lineManager, circleManager, renderer, selection, redraw, setStatus }
 */
class BaseTool {
  constructor(ctx) {
    this.ctx    = ctx;
    this.active = false;
  }

  activate()   { this.active = true; }
  deactivate() { this.active = false; }

  get map()            { return this.ctx.map; }
  get pointManager()   { return this.ctx.pointManager; }
  get lineManager()    { return this.ctx.lineManager; }
  get circleManager()  { return this.ctx.circleManager; }
  get renderer()       { return this.ctx.renderer; }
  get selection()      { return this.ctx.selection; }
  redraw()             { this.ctx.redraw(); }
  setStatus(msg)       { this.ctx.setStatus(msg); }
}

export default BaseTool;
