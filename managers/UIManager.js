import Point from "../class/Point.js";
import Line from "../class/Line.js";
import Circle from "../class/Circle.js";

class UIManager {
  constructor(
    map,
    storageManager,
    pointManager,
    lineManager,
    circleManager,
    renderer,
    selection
  ) {
    this.map = map.getMapInstance();
    this.storage = storageManager;
    this.pointManager = pointManager;
    this.lineManager = lineManager;
    this.circleManager = circleManager;
    this.renderer = renderer;
    this.selection = selection;

    this.connectMode = false;
    this.isEraseMode = false;
    this.showDistances = false;
    this.showNames = false;
    this.circleCreationMode = false;
    // this.activeCircle = null; // cercle temporaire pendant le redimensionnement
    // this.radiusLabel = null;  // label HTML qui suit la souris
    this.circleTool = {
      active: false,      // bouton actif/inactif
      center: null,       // Point choisi comme centre
      tempCircle: null,   // L.circle temporaire
      moveHandler: null,  // listener mousemove
      labelEl: null       // div du label "NNN m"
    };
    

    // Initialisation UI
    this.setUpAddPointForm();
    this.setUpToolbar();
    this.setUpImportExportModal();
    this.setUpPointsList();
    this.setUpPointsToConnect();
    this.setUpEraseTool();
    this.setUpDistanceToggle();

    this.redraw();

    // Clic sur la carte → désélectionner tout
    this.map.on("click", (e) => {
      // cercle en cours → valider sur latlng
      if (this.circleTool.active && this.circleTool.center && this.circleTool.tempCircle) {
        this.validateCircle(e);
        return;
      }
    
      // le reste : comme avant
      if (this.connectMode || this.isEraseMode) return;
      if (!this.selection.hasSelection()) return;
    
      this.selection.clear();
      this.redraw();
      this.disabledDeleteSelectionButton(true);
    });
    
    
  }

  // Redessine tout
  redraw() {
    this.renderer.clear();
    this.renderer.clearNameLabels();
    this.renderer.clearDistanceLabels();

    // Cercles
    this.circleManager.circles.forEach((c) => {
      this.renderer.drawCircle(c, this.selection.isSelected(c), (circle) => {
        if (this.isEraseMode) {
          this.circleManager.removeCircle(circle.id, true);
          this.redraw();
          this.setUpPointsList();
          this.setUpPointsToConnect();
          return;
        }

        this.selection.toggle(circle);
        this.redraw();
        this.disabledDeleteSelectionButton(!this.selection.hasSelection());
      });
    });

    // Lignes
    this.lineManager.lines.forEach((l) => {
      this.renderer.drawLine(l, this.selection.isSelected(l), (line) => {
        if (this.isEraseMode) {
          this.lineManager.removeLine(line.startPoint, line.endPoint, true);
          this.redraw();
          this.setUpPointsList();
          this.setUpPointsToConnect();
          return;
        }

        this.selection.toggle(line);
        this.redraw();
        this.disabledDeleteSelectionButton(!this.selection.hasSelection());
      }, 
      this.showDistances
      );
    });

    // === Points ===
    this.pointManager.points.forEach((p) => {
      this.renderer.drawPoint(p, this.selection.isSelected(p), (point) => {
        if (this.isEraseMode) {
          // 🔹 Supprimer toutes les lignes reliées au point
          const linesToRemove = this.lineManager.getLinesWithPoint(point);
          linesToRemove.forEach((line) =>
            this.lineManager.removeLine(line.startPoint, line.endPoint, true)
          );

          // 🔹 Supprimer le point lui-même
          this.pointManager.removePoint(point, true);

          // 🔹 Nettoyer la sélection
          this.selection.remove(point);

          // 🔹 Rafraîchir l’UI
          this.redraw();
          this.setUpPointsList();
          this.setUpPointsToConnect();
          return; // ⬅️ Empêche le reste (sélection)
        }

        // === Sinon comportement normal ===
        this.selection.toggle(point);
        this.redraw();
        this.disabledDeleteSelectionButton(!this.selection.hasSelection());

        // 🔹 Mode connect actif → création automatique de ligne
        if (this.connectMode) {
          const selectedPoints = this.selection
            .getAll()
            .filter((e) => e instanceof Point);
          if (selectedPoints.length >= 2) {
            const last = selectedPoints[selectedPoints.length - 1];
            const prev = selectedPoints[selectedPoints.length - 2];

            if (last !== prev) {
              const alreadyExists = this.lineManager.lines.some(
                (l) =>
                  (l.startPoint === last && l.endPoint === prev) ||
                  (l.startPoint === prev && l.endPoint === last)
              );

              if (!alreadyExists) {
                this.lineManager.addLine(prev, last, true);
                this.redraw();
              }
            }
          }
        }
      });
      if(this.showNames){
        this.renderer.addNameLabel(p);
      }
    });
  }

  setUpDistanceToggle() {
    tbDistanceBtn.addEventListener('click', () => {
      this.showDistances = !this.showDistances;
      
      if(this.showDistances){
        tbDistanceBtn.classList.add("active");
      }
      else{
        tbDistanceBtn.classList.remove("active")
      }
  
      this.redraw();
    });
  }
  

  // === Toolbar ===
  disabledDeleteSelectionButton(value) {
    tbDeleteBtn.disabled = value;
  }

  setUpAddPointForm() {
    sbNewPointFormContainer.addEventListener('submit', (e) => {
      e.preventDefault();
  
      // Nettoyer tout ancien message d’erreur
      sbNewPointErrorMsg.innerHTML = '';
  
      // Récupération des valeurs
      const desc = sbNewPointDescriptionInput.value.trim();
      const coordStr = sbNewPointCoordinatesInput.value.trim();
      const color = sbNewPointColorInput.value;
  
      // Vérification format "lat, lng"
      const parts = coordStr.split(',');
      if (parts.length !== 2) {
        sbNewPointErrorMsg.innerHTML =
          '<div class="text-danger">Erreur : veuillez saisir “latitude, longitude” séparées par une virgule.</div>';
        return;
      }
  
      // Conversion
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
  
      // Validation numérique
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        sbNewPointErrorMsg.innerHTML =
          '<div class="text-danger">Erreur : latitude doit être entre -90 et 90, longitude entre -180 et 180.</div>';
        return;
      }
  
      // Ajout du point via PointManager
      this.pointManager.addPoint(null, desc, lat, lng, color, true);
  
      // Rafraîchissement de l’UI
      this.redraw();
      this.setUpPointsList();
      this.setUpPointsToConnect();
  
      // Réinitialisation du formulaire
      sbNewPointFormContainer.reset();
      sbNewPointErrorMsg.innerHTML = '';
      sbNewPointColorInput.value = color; // garde la dernière couleur utilisée
    });
  }
  

  setUpEraseTool() {
    tbEraseBtn.addEventListener("click", () => {
      this.isEraseMode = !this.isEraseMode; // toggle l’état

      if (this.isEraseMode) {
        // Changement visuel
        tbEraseBtn.classList.add("active");
        this.map.getContainer().style.cursor =
          "url('./assets/rubber.png') 8 8, auto";
      } else {
        tbEraseBtn.classList.remove("active");
        this.map.getContainer().style.cursor = "auto";
      }

      // On redessine pour que les click handlers s’adaptent au mode actif
      this.redraw();
    });
  }

  setUpToolbar() {
    this.disabledDeleteSelectionButton(true);

    tbDeleteBtn.addEventListener("click", () => {
      const selected = this.selection.getAll();
      selected.forEach((entity) => {
        if (entity instanceof Point) {
          const linkedLines = this.lineManager.getLinesWithPoint(entity);
          linkedLines.forEach((line) => {
            this.lineManager.removeLine(line.startPoint, line.endPoint, true);
          });
          this.pointManager.removePoint(entity, true);
        } else if (entity instanceof Line) {
          this.lineManager.removeLine(entity.startPoint, entity.endPoint, true);
        } else if (entity instanceof Circle) {
          this.circleManager.removeCircle(entity.id, true);
        }
      });
      this.selection.clear();
      this.redraw();
      this.setUpPointsList();
      this.setUpPointsToConnect();
      this.disabledDeleteSelectionButton(true);
    });

    tbAddLineBtn.addEventListener("click", () => {
      this.connectMode = !this.connectMode;

      if(this.connectMode){
        tbAddLineBtn.classList.add("active");
      }
      else{
        tbAddLineBtn.classList.remove("active");
      }

      // === Si on vient d'activer le mode ===
      if (this.connectMode) {
        const selectedPoints = this.selection
          .getAll()
          .filter((e) => e instanceof Point);

        if (selectedPoints.length > 1) {
          for (let i = 0; i < selectedPoints.length - 1; i++) {
            const p1 = selectedPoints[i];
            const p2 = selectedPoints[i + 1];

            const alreadyExists = this.lineManager.lines.some(
              (l) =>
                (l.startPoint === p1 && l.endPoint === p2) ||
                (l.startPoint === p2 && l.endPoint === p1)
            );

            if (!alreadyExists) {
              this.lineManager.addLine(p1, p2, true);
            }
          }

          this.redraw();
        }
      }
    });

    tbNameBtn.addEventListener("click", () => {
      this.showNames = !this.showNames;
    
      if(this.showNames){
        tbNameBtn.classList.add("active");
      }
      else{
        tbNameBtn.classList.remove("active");
      }
    
      if (this.showNames) {
        this.pointManager.points.forEach(p => this.renderer.addNameLabel(p));
      } else {
        this.renderer.clearNameLabels();
      }
    });

    // === Bouton pour créer des cercles ===
    tbAddCircleBtn.addEventListener("click", () => {
      this.circleTool.active = !this.circleTool.active;
    
      tbAddCircleBtn.classList.toggle("active", this.circleTool.active);
    
      if (this.circleTool.active) {
        this.isEraseMode = false;
        this.connectMode = false;
        this.map.getContainer().style.cursor = "crosshair";
      } else {
        this.map.getContainer().style.cursor = "auto";
        // annuler un cercle en cours (si l'utilisateur désactive au milieu)
        if (this.circleTool.moveHandler) this.map.off("mousemove", this.circleTool.moveHandler);
        if (this.circleTool.labelEl) this.circleTool.labelEl.remove();
        if (this.circleTool.tempCircle) this.circleTool.tempCircle.remove();
        this.circleTool.center = null;
        this.circleTool.tempCircle = null;
        this.circleTool.moveHandler = null;
        this.circleTool.labelEl = null;
      }
    });
    

    
  }

  // === Import/Export modal ===
  setUpImportExportModal() {
    importExportModal.addEventListener("show.bs.modal", () => {
      iemCopyBtn.disabled = !this.storage.hasData();
      iemTextInput.value = "";
      iemErrorMsg.innerHTML = "";
      iemImportBtn.disabled = true;
    });

    iemTextInput.addEventListener("input", () => {
      iemImportBtn.disabled = iemTextInput.value.trim() === "";
    });

    iemClearBtn.addEventListener("click", () => {
      iemTextInput.value = "";
      iemErrorMsg.innerHTML = "";
      iemImportBtn.disabled = true;
    });

    iemCopyBtn.addEventListener("click", () => {
      const data = {
        points: this.pointManager.points.map((p) => p.datas()),
        lines: this.lineManager.lines.map((l) => l.datas()),
        circles: this.circleManager.circles.map((c) => c.datas()),
      };
      const json = JSON.stringify(data, null, 2);
      iemTextInput.value = json;
      navigator.clipboard
        .writeText(json)
        .then(() => {
          iemErrorMsg.innerHTML =
            '<div class="text-success">Données copiées !</div>';
        })
        .catch(() => {
          iemErrorMsg.innerHTML = '<div class="text-danger">Échec copie.</div>';
        });
      iemImportBtn.disabled = false;
    });

    iemImportBtn.addEventListener("click", () => {
      iemErrorMsg.innerHTML = "";
      let data;
      try {
        data = JSON.parse(iemTextInput.value);
      } catch {
        iemErrorMsg.innerHTML = '<div class="text-danger">JSON invalide.</div>';
        return;
      }

      if (
        !data.points ||
        !Array.isArray(data.points) ||
        !data.lines ||
        !Array.isArray(data.lines) ||
        !data.circles ||
        !Array.isArray(data.circles)
      ) {
        iemErrorMsg.innerHTML =
          '<div class="text-danger">Format attendu : { points: […], lines: […], circles: […] }.</div>';
        return;
      }

      // Points
      data.points.forEach((pt) => {
        if (!this.pointManager.getPointById(pt.id)) {
          this.pointManager.addPoint(
            pt.id,
            pt.desc,
            pt.lat,
            pt.lng,
            pt.color,
            true
          );
        }
      });

      // Lines
      data.lines.forEach((ln) => {
        const p1 = this.pointManager.getPointById(ln.id1);
        const p2 = this.pointManager.getPointById(ln.id2);
        if (p1 && p2) {
          this.lineManager.addLine(p1, p2, true);
        }
      });

      // Circles
      data.circles.forEach((c) => {
        this.circleManager.addCircle(c.radius, c.lat, c.lng, c.color, true);
      });

      this.redraw();
      this.setUpPointsList();

      iemErrorMsg.innerHTML = '<div class="text-success">Import réussi.</div>';
    });
  }

  // === Liste des points ===
  setUpPointsList() {
    Sortable.create(sbPointsList, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: () => {
        const idsInOrder = Array.from(sbPointsList.children).map((li) =>
          parseInt(li.getAttribute("data-id"))
        );
        this.pointManager.points.sort(
          (a, b) => idsInOrder.indexOf(a.id) - idsInOrder.indexOf(b.id)
        );
      },
    });

    sbPointsList.innerHTML = "";
    console.log(this.pointManager.points);
    this.pointManager.points.forEach((p) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex align-items-center";
      li.setAttribute("data-id", p.id);

      const dragHandle = document.createElement("span");
      dragHandle.innerHTML = "☰";
      dragHandle.className = "drag-handle";
      li.appendChild(dragHandle);

      const colorBox = document.createElement("span");
      colorBox.className = "color-box";
      colorBox.style.backgroundColor = p.color;
      li.appendChild(colorBox);

      const infoDiv = document.createElement("div");
      infoDiv.className = "flex-grow-1";
      infoDiv.innerHTML = `<strong>${p.description}</strong><br>
        (${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)})`;
      li.appendChild(infoDiv);

      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-sm btn-danger";
      btnDel.textContent = "Supprimer";
      btnDel.addEventListener("click", () => {
        const linkedLines = this.lineManager.getLinesWithPoint(p);
        linkedLines.forEach((line) => {
          this.lineManager.removeLine(line.startPoint, line.endPoint, true);
        });
        this.pointManager.removePoint(p, true);
        sbPointsList.removeChild(li);
        this.redraw();
        this.setUpPointsList();
        this.setUpPointsToConnect();
      });
      li.appendChild(btnDel);

      sbPointsList.appendChild(li);
    });
  }

  // === Connexion de points ===
  setUpPointsToConnect() {
    sbConnectBtn.disabled = true;
    sbFirstPointToConnect.innerHTML =
      '<option value="" disabled>Choisir...</option>';
    sbSecondPointToConnect.innerHTML =
      '<option value="" disabled>Choisir...</option>';

    this.pointManager.points.forEach((p) => {
      const opt1 = document.createElement("option");
      opt1.value = p.id;
      opt1.textContent = p.description;
      sbFirstPointToConnect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = p.id;
      opt2.textContent = p.description;
      sbSecondPointToConnect.appendChild(opt2);
    });

    const checkSelection = () => {
      const id1 = parseInt(sbFirstPointToConnect.value);
      const id2 = parseInt(sbSecondPointToConnect.value);
      sbConnectBtn.disabled = !(id1 && id2 && id1 !== id2);
    };

    sbFirstPointToConnect.addEventListener("change", checkSelection);
    sbSecondPointToConnect.addEventListener("change", checkSelection);
  }

  startCircleAtPoint(centerPoint) {
    const map = this.map;
  
    // état
    this.circleTool.center = centerPoint;
  
    // cercle temporaire (bordure seule)
    this.circleTool.tempCircle = L.circle([centerPoint.latitude, centerPoint.longitude], {
      radius: 0,
      color: centerPoint.color,
      weight: 2,
      fillOpacity: 0,
      // Let clicks pass through to underlying point markers during preview
      interactive: false,
      bubblingMouseEvents: false,
    }).addTo(map);
  
    // label HTML
    const label = document.createElement("div");
    label.className = "radius-label";
    Object.assign(label.style, {
      position: "absolute",
      background: "white",
      border: "1px solid #ccc",
      borderRadius: "4px",
      padding: "2px 6px",
      fontSize: "12px",
      pointerEvents: "none",
      zIndex: "9999"
    });
    document.body.appendChild(label);
    this.circleTool.labelEl = label;
  
    // suivi souris
    const moveHandler = (e) => {
      if (!this.circleTool.tempCircle) return;
      const latlng = e.latlng;
      const r = map.distance(latlng, [centerPoint.latitude, centerPoint.longitude]);
      this.circleTool.tempCircle.setRadius(r);
  
      label.textContent = `${Math.round(r)} m`;
      const pos = map.latLngToContainerPoint(latlng);
      label.style.left = `${pos.x + 15}px`;
      label.style.top  = `${pos.y + 15}px`;
      label.style.display = "block";
    };
    map.on("mousemove", moveHandler);
    this.circleTool.moveHandler = moveHandler;
  }
  
  
  // validation par clic sur la carte (latlng arbitraire)
validateCircle(e) {
  if (!this.circleTool.active || !this.circleTool.center || !this.circleTool.tempCircle) return;
  const c = this.circleTool.center;
  const r = this.map.distance([c.latitude, c.longitude], e.latlng);
  this._finalizeCircle(r);
}

// validation par clic sur un 2e point (centre → point2)
finalizeCircleWithPoint(point2) {
  if (!this.circleTool.active || !this.circleTool.center || !this.circleTool.tempCircle) return;
  if (point2 === this.circleTool.center) return; // rien à faire
  const c = this.circleTool.center;
  const r = this.map.distance([c.latitude, c.longitude], [point2.latitude, point2.longitude]);
  this._finalizeCircle(r);
}

// factorisation
_finalizeCircle(radius) {
  // retirer mousemove
  if (this.circleTool.moveHandler) {
    this.map.off("mousemove", this.circleTool.moveHandler);
  }

  // enlever label
  if (this.circleTool.labelEl) {
    this.circleTool.labelEl.remove();
  }

  // enlever cercle temporaire
  if (this.circleTool.tempCircle) {
    this.circleTool.tempCircle.remove();
  }

  // créer cercle persistant (stocké) — bordure seule
  const c = this.circleTool.center;
  this.circleManager.addCircle(radius, c.latitude, c.longitude, c.color, true);

  // reset état de traçage (outil reste actif, prêt pour un nouveau cercle)
  this.circleTool.center = null;
  this.circleTool.tempCircle = null;
  this.circleTool.moveHandler = null;
  this.circleTool.labelEl = null;

  // redraw
  this.redraw();
}

  
  cleanupActiveCircle() {
    if (this.activeCircle) {
      this.map.off("mousemove", this.activeCircle._onMouseMove);
      this.activeCircle.remove();
      this.activeCircle = null;
    }
    if (this.radiusLabel) {
      this.radiusLabel.remove();
      this.radiusLabel = null;
    }
  }

  handlePointClick(point, e) {
    // 1) Mode gomme
    if (this.isEraseMode) {
      // même logique que dans redraw() quand eraseMode=true
      const linesToRemove = this.lineManager.getLinesWithPoint(point);
      linesToRemove.forEach(line => this.lineManager.removeLine(line.startPoint, line.endPoint, true));
      this.pointManager.removePoint(point, true);
      this.selection.remove(point);
      this.redraw();
      this.setUpPointsList();
      this.setUpPointsToConnect();
      return;
    }
  
    // 2) Mode cercle
    if (this.circleTool.active) {
      // a) pas encore de centre -> on commence à ce point
      if (!this.circleTool.center) {
        this.startCircleAtPoint(point);
        return;
      }
  
      // b) on a déjà un centre, on clique sur un 2e point différent -> finaliser avec p2
      if (this.circleTool.center !== point) {
        this.finalizeCircleWithPoint(point);
        return;
      }
  
      // c) on reclique sur le même centre -> ignorer (continuer le dimensionnement)
      return;
    }
  
    // 3) Mode normal : sélection / connect
    this.selection.toggle(point);
    this.redraw();
    this.disabledDeleteSelectionButton(!this.selection.hasSelection());
  
    if (this.connectMode) {
      const selectedPoints = this.selection.getAll().filter(e => e instanceof Point);
      if (selectedPoints.length >= 2) {
        const last = selectedPoints[selectedPoints.length - 1];
        const prev = selectedPoints[selectedPoints.length - 2];
  
        const already = this.lineManager.lines.some(
          l => (l.startPoint === last && l.endPoint === prev) ||
               (l.startPoint === prev && l.endPoint === last)
        );
        if (!already) {
          this.lineManager.addLine(prev, last, true);
          this.redraw();
        }
      }
    }
  }
  
}

export default UIManager;
