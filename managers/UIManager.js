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
    this.stretchMode = false;
    this.stretchLayers = []; // pour stocker les lignes fantômes affichées

    // this.activeCircle = null; // cercle temporaire pendant le redimensionnement
    // this.radiusLabel = null;  // label HTML qui suit la souris
    this.circleTool = {
      active: false, // bouton actif/inactif
      center: null, // Point choisi comme centre
      tempCircle: null, // L.circle temporaire
      moveHandler: null, // listener mousemove
      labelEl: null, // div du label "NNN m"
    };

    this.structureAngleMode = {
      active: false,
      pivot: null,
      elements: [], // tous les points/lignes/cercle du groupe
      originalPositions: new Map(), // sauvegarde des coords originales
      uiBox: null,  // div contenant le slider
      currentAngle: 0
    };


    this.addPointMode = false;
    this.coordLabelEl = null;
    this.ghostMarker = null;
    this.nextPointIndex = this.pointManager.points.length + 1;
    this.snapTolerance = 100000; // mètres (tolérance d'aimantation)
    this.mouseLabel = null; // label qui affiche les coordonnÃ©es

    // Initialisation UI
    this.setUpAddPointMode();
    this.setUpAddPointForm();
    this.setUpToolbar();
    this.setUpImportExportModal();
    this.setUpPointsList();
    this.setUpPointsToConnect();
    this.setUpEraseTool();
    this.setUpDistanceToggle();
    this.setUpEditPointModal();

    this.redraw();

    // Clic sur la carte désélectionner tout
    this.map.on("click", (e) => {
      if (this.addPointMode) return;
      // cercle en cours à valider sur latlng
      if (
        this.circleTool.active &&
        this.circleTool.center &&
        this.circleTool.tempCircle
      ) {
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
      this.renderer.drawCircle(c, this.selection.isSelected(c), (circle, e) => {
        // En mode ajout de points: crÃ©er un point au clic sur le bord
        if (this.addPointMode && e && e.latlng) {
          const snapped = this.getSnappedLatLngImproved(e.latlng);
          const desc = `Nouveau point ${this.pointManager.points.length + 1}`;
          const color = "#3388ff";
          this.pointManager.addPoint(
            null,
            desc,
            snapped.lat,
            snapped.lng,
            color,
            true
          );
          this.redraw();
          this.setUpPointsList();
          this.setUpPointsToConnect();
          return;
        }
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
      this.renderer.drawLine(
        l,
        this.selection.isSelected(l),
        (line, e) => {
          // En mode ajout de points: crÃ©er un point directement sur la ligne cliquÃ©e
          if (this.addPointMode && e && e.latlng) {
            const snapped = this.getSnappedLatLngImproved(e.latlng);
            const desc = `Nouveau point ${this.pointManager.points.length + 1}`;
            const color = "#3388ff";
            this.pointManager.addPoint(
              null,
              desc,
              snapped.lat,
              snapped.lng,
              color,
              true
            );
            this.redraw();
            this.setUpPointsList();
            this.setUpPointsToConnect();
            return;
          }
          if (this.isEraseMode) {
            this.lineManager.removeLine(line.startPoint, line.endPoint, true);
            this.redraw();
            this.setUpPointsList();
            this.setUpPointsToConnect();
            return;
          }

          // === Mode stretch actif ===
          if (this.stretchMode) {
            this.showStretchedGeodesic(line);
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
      if (this.showNames) {
        this.renderer.addNameLabel(p);
      }
    });
  }

  setUpDistanceToggle() {
    tbDistanceBtn.addEventListener("click", () => {
      this.showDistances = !this.showDistances;

      if (this.showDistances) {
        tbDistanceBtn.classList.add("active");
      } else {
        tbDistanceBtn.classList.remove("active");
      }

      this.redraw();
    });
  }

  // === Toolbar ===
  disabledDeleteSelectionButton(value) {
    tbDeleteBtn.disabled = value;
    tbChangeColorBtn.disabled = !this.selection.hasSelection();
  }

  setUpAddPointForm() {
    sbNewPointFormContainer.addEventListener("submit", (e) => {
      e.preventDefault();

      // Nettoyer tout ancien message d’erreur
      sbNewPointErrorMsg.innerHTML = "";

      // Récupération des valeurs
      const desc = sbNewPointDescriptionInput.value.trim();
      const coordStr = sbNewPointCoordinatesInput.value.trim();
      const color = sbNewPointColorInput.value;

      // Vérification format "lat, lng"
      const parts = coordStr.split(",");
      if (parts.length !== 2) {
        sbNewPointErrorMsg.innerHTML =
          '<div class="text-danger">Erreur : veuillez saisir “latitude, longitude” séparées par une virgule.</div>';
        return;
      }

      // Conversion
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());

      // Validation numérique
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
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
      sbNewPointErrorMsg.innerHTML = "";
      sbNewPointColorInput.value = color; // garde la dernière couleur utilisée
    });
  }

  setUpEraseTool() {
    tbEraseBtn.addEventListener("click", () => {
      this.isEraseMode = !this.isEraseMode; // toggle l’état
      this.updateModeState();
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
      this.updateModeState();
    });

    tbNameBtn.addEventListener("click", () => {
      this.showNames = !this.showNames;

      if (this.showNames) {
        tbNameBtn.classList.add("active");
      } else {
        tbNameBtn.classList.remove("active");
      }

      if (this.showNames) {
        this.pointManager.points.forEach((p) => this.renderer.addNameLabel(p));
      } else {
        this.renderer.clearNameLabels();
      }
    });

    // === Bouton pour créer des cercles ===
    tbAddCircleBtn.addEventListener("click", () => {
      this.circleTool.active = !this.circleTool.active;
      this.updateModeState();
    });

    tbChangeColorBtn.addEventListener("click", () => {
      if (!this.selection.hasSelection()) return;
      this.showColorOverlay();
    });

    tbStretchLineBtn.addEventListener("click", () => {
      this.stretchMode = !this.stretchMode;
      this.updateModeState();
    });

    tbStructureAngleBtn.addEventListener("click", () => {
      this.structureAngleMode.active = !this.structureAngleMode.active;
      this.updateModeState();
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
      dragHandle.innerHTML = "";
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
      const img = document.createElement("img");
      img.src = "../assets/bin.png";
      img.alt = "Delete";
      img.style.width = "16px"; // Adjust size as needed
      img.style.height = "16px";
      btnDel.appendChild(img);
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
      
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-sm btn-warning me-2";
      btnEdit.textContent = "Modifier";
      btnEdit.addEventListener("click", () => {
        this.openEditPointModal(p);
      });
      li.appendChild(btnEdit);
      li.appendChild(btnDel);

      sbPointsList.appendChild(li);
    });

    if (this.structureAngleMode.active) {
      this.exitStructureAngleMode();
    }
    
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
    this.circleTool.tempCircle = L.circle(
      [centerPoint.latitude, centerPoint.longitude],
      {
        radius: 0,
        color: centerPoint.color,
        weight: 2,
        fillOpacity: 0,
        // Let clicks pass through to underlying point markers during preview
        interactive: false,
        bubblingMouseEvents: false,
      }
    ).addTo(map);

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
      zIndex: "9999",
    });
    document.body.appendChild(label);
    this.circleTool.labelEl = label;

    // suivi souris
    const moveHandler = (e) => {
      if (!this.circleTool.tempCircle) return;
      const latlng = e.latlng;
      const r = map.distance(latlng, [
        centerPoint.latitude,
        centerPoint.longitude,
      ]);
      this.circleTool.tempCircle.setRadius(r);

      label.textContent = `${Math.round(r)} m`;
      const pos = map.latLngToContainerPoint(latlng);
      label.style.left = `${pos.x + 15}px`;
      label.style.top = `${pos.y + 15}px`;
      label.style.display = "block";
    };
    map.on("mousemove", moveHandler);
    this.circleTool.moveHandler = moveHandler;
  }

  // validation par clic sur la carte (latlng arbitraire)
  validateCircle(e) {
    if (
      !this.circleTool.active ||
      !this.circleTool.center ||
      !this.circleTool.tempCircle
    )
      return;
    const c = this.circleTool.center;
    const r = this.map.distance([c.latitude, c.longitude], e.latlng);
    this._finalizeCircle(r);
  }

  // validation par clic sur un 2e point (centre → point2)
  finalizeCircleWithPoint(point2) {
    if (
      !this.circleTool.active ||
      !this.circleTool.center ||
      !this.circleTool.tempCircle
    )
      return;
    if (point2 === this.circleTool.center) return; // rien à faire
    const c = this.circleTool.center;
    const r = this.map.distance(
      [c.latitude, c.longitude],
      [point2.latitude, point2.longitude]
    );
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
    this.circleManager.addCircle(
      radius,
      c.latitude,
      c.longitude,
      c.color,
      true
    );

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
      linesToRemove.forEach((line) =>
        this.lineManager.removeLine(line.startPoint, line.endPoint, true)
      );
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

    if (this.structureAngleMode.active) {
      this.startStructureRotation(point);
      return;
    }
    

    // 3) Mode normal : sélection / connect
    this.selection.toggle(point);
    this.redraw();
    this.disabledDeleteSelectionButton(!this.selection.hasSelection());

    if (this.connectMode) {
      const selectedPoints = this.selection
        .getAll()
        .filter((e) => e instanceof Point);
      if (selectedPoints.length >= 2) {
        const last = selectedPoints[selectedPoints.length - 1];
        const prev = selectedPoints[selectedPoints.length - 2];

        const already = this.lineManager.lines.some(
          (l) =>
            (l.startPoint === last && l.endPoint === prev) ||
            (l.startPoint === prev && l.endPoint === last)
        );
        if (!already) {
          this.lineManager.addLine(prev, last, true);
          this.redraw();
        }
      }
    }
  }

  startAddPointMode() {
    const map = this.map;

    // Ghost marker
    this.ghostMarker = L.circleMarker([0, 0], {
      radius: 6,
      color: "#000",
      fillColor: "#ff0",
      fillOpacity: 0.6,
      opacity: 0.8,
      interactive: false,
    }).addTo(map);

    // Label coord
    this.mouseLabel = document.createElement("div");
    this.mouseLabel.className = "coord-label";
    Object.assign(this.mouseLabel.style, {
      position: "absolute",
      background: "white",
      border: "1px solid #ccc",
      borderRadius: "4px",
      padding: "2px 6px",
      fontSize: "12px",
      pointerEvents: "none",
      boxShadow: "0 1px 4px rgba(0,0,0,.2)",
      transform: "translate(12px, 12px)",
      zIndex: "9999",
    });
    document.body.appendChild(this.mouseLabel);

    // Handlers
    this._onMouseMoveAddPoint = (e) => this.handleMouseMoveAddPoint(e);
    this._onClickAddPoint = (e) => this.handleClickAddPoint(e);

    map.on("mousemove", this._onMouseMoveAddPoint);
    map.on("click", this._onClickAddPoint);
  }

  stopAddPointMode() {
    const map = this.map;
    if (this.ghostMarker) {
      map.removeLayer(this.ghostMarker);
      this.ghostMarker = null;
    }
    if (this.mouseLabel) {
      this.mouseLabel.remove();
      this.mouseLabel = null;
    }
    // ✅ Supprime proprement les écouteurs
    if (this._onMouseMoveAddPoint) {
      map.off("mousemove", this._onMouseMoveAddPoint);
      this._onMouseMoveAddPoint = null;
    }

    if (this._onClickAddPoint) {
      map.off("click", this._onClickAddPoint);
      this._onClickAddPoint = null;
    }
  }

  handleMouseMoveAddPoint(e) {
    if (!this.ghostMarker || !this.mouseLabel) return;

    const snapped = this.getSnappedLatLngImproved(e.latlng);
    if (snapped && snapped.lat != null && snapped.lng != null) {
      this.ghostMarker.setLatLng(snapped);
      const pos = this.map.latLngToContainerPoint(snapped);
      this.mouseLabel.style.left = `${pos.x}px`;
      this.mouseLabel.style.top = `${pos.y}px`;
      this.mouseLabel.innerText = `${snapped.lat.toFixed(5)}, ${snapped.lng.toFixed(5)}`;
    }
  }

  handleClickAddPoint(e) {
    const snapped = this.getSnappedLatLngImproved(e.latlng);
    if (!snapped || snapped.lat == null || snapped.lng == null) return;
    const desc = `Nouveau point ${this.pointManager.points.length + 1}`;
    const color = "#3388ff";
    // Vérifie si on est suffisamment proche d'une ligne géodésique
    const near = this.getNearestLineInfo(e.latlng);
    if (near && near.dist <= this.snapTolerance && near.line) {
      // 1) Créer le point
      const newPoint = this.pointManager.addPoint(
        null,
        desc,
        snapped.lat,
        snapped.lng,
        color,
        true
      );
      // 2) Scinder la ligne en deux
      this.lineManager.removeLine(
        near.line.startPoint,
        near.line.endPoint,
        true
      );
      this.lineManager.addLine(near.line.startPoint, newPoint, true);
      this.lineManager.addLine(newPoint, near.line.endPoint, true);
    } else {
      // Création simple
      this.pointManager.addPoint(
        null,
        desc,
        snapped.lat,
        snapped.lng,
        color,
        true
      );
    }
    this.redraw();
    this.setUpPointsList();
    this.setUpPointsToConnect();
  }

  getSnappedLatLng(cursorLatLng) {
    return this.getSnappedLatLngImproved(cursorLatLng);
  }
  // Trouve la ligne la plus proche et le vertex le plus proche (approche test.html)
  getNearestLineInfo(cursorLatLng) {
    const map = this.map;
    let bestLine = null;
    let bestDist = Infinity;
    let bestPt = null;
    this.lineManager.lines.forEach((line) => {
      const layer = this.renderer.layers.get(line);
      if (!layer || typeof layer.getLatLngs !== "function") return;
      let latlngs = layer.getLatLngs();
      if (!latlngs || latlngs.length === 0) return;
      if (Array.isArray(latlngs[0]) && latlngs.length === 1)
        latlngs = latlngs[0];
      latlngs.forEach((pt) => {
        const d = map.distance(cursorLatLng, pt);
        if (d < bestDist) {
          bestDist = d;
          bestPt = pt;
          bestLine = line;
        }
      });
    });
    if (bestLine) {
      return { line: bestLine, pt: bestPt, dist: bestDist };
    }
    return null;
  }

  setUpAddPointMode() {
    tbAddPointBtn.addEventListener("click", () => {
      this.addPointMode = !this.addPointMode;
      this.updateModeState();

      if (this.addPointMode) {
        this.startAddPointMode();
      } 
    });
  }

  // Nouvelle version améliorée du snapping (segments + cercle)
  getSnappedLatLngImproved(cursorLatLng) {
    const map = this.map;
    const TOL = this.snapTolerance; // mètres
    if (!cursorLatLng || cursorLatLng.lat == null || cursorLatLng.lng == null)
      return cursorLatLng; // sécurité
  
    let best = cursorLatLng;
    let bestDist = Infinity;
  
    // --- Lignes réelles ---
    this.lineManager.lines.forEach((line) => {
      const layer = this.renderer.layers.get(line);
      if (!layer || typeof layer.getLatLngs !== "function") return;
      let latlngs = layer.getLatLngs();
      if (!latlngs || latlngs.length === 0) return;
      if (Array.isArray(latlngs[0])) {
        if (typeof latlngs.flat === "function") {
          latlngs = latlngs.flat(Infinity);
        } else {
          const stack = [...latlngs];
          latlngs = [];
          while (stack.length) {
            const item = stack.shift();
            if (Array.isArray(item)) stack.push(...item);
            else latlngs.push(item);
          }
        }
      }
  
      latlngs.forEach((pt) => {
        if (!pt || pt.lat == null || pt.lng == null) return; // ← sécurité
        const d = map.distance(cursorLatLng, pt);
        if (d < bestDist && d < TOL) {
          best = pt;
          bestDist = d;
        }
      });
    });
  
    // --- Lignes fantômes actives (stretch mode) ---
    if (this.stretchLayers && this.stretchLayers.length > 0) {
      this.stretchLayers.forEach((layer) => {
        if (!layer || typeof layer.getLatLngs !== "function") return;
        let latlngs = layer.getLatLngs();
        if (!latlngs || latlngs.length === 0) return;
        if (Array.isArray(latlngs[0])) {
          if (typeof latlngs.flat === "function") {
            latlngs = latlngs.flat(Infinity);
          } else {
            const stack = [...latlngs];
            latlngs = [];
            while (stack.length) {
              const item = stack.shift();
              if (Array.isArray(item)) stack.push(...item);
              else latlngs.push(item);
            }
          }
        }
  
        latlngs.forEach((pt) => {
          if (!pt || pt.lat == null || pt.lng == null) return; // ← sécurité
          const d = map.distance(cursorLatLng, pt);
          if (d < bestDist && d < TOL) {
            best = pt;
            bestDist = d;
          }
        });
      });
    }
  
    // --- Cercles ---
    this.circleManager.circles.forEach((c) => {
      if (!c || c.latitude == null || c.longitude == null || c.radius == null) return;
      const center = L.latLng(c.latitude, c.longitude);
      const dCenter = map.distance(center, cursorLatLng);
      const diff = Math.abs(dCenter - c.radius);
      if (diff < TOL && diff < bestDist) {
        const R = 6371000;
        const phi1 = (Math.PI / 180) * center.lat;
        const lambda1 = (Math.PI / 180) * center.lng;
        const phib = (Math.PI / 180) * cursorLatLng.lat;
        const lambdab = (Math.PI / 180) * cursorLatLng.lng;
        const yb = Math.sin(lambdab - lambda1) * Math.cos(phib);
        const xb =
          Math.cos(phi1) * Math.sin(phib) -
          Math.sin(phi1) * Math.cos(phib) * Math.cos(lambdab - lambda1);
        const theta = Math.atan2(yb, xb);
        const delta = c.radius / R;
        const sinphi2 =
          Math.sin(phi1) * Math.cos(delta) +
          Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
        const phi2 = Math.asin(sinphi2);
        const y2 = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
        const x2 = Math.cos(delta) - Math.sin(phi1) * sinphi2;
        const lambda2 = lambda1 + Math.atan2(y2, x2);
        const edge = L.latLng(
          (180 / Math.PI) * phi2,
          (((180 / Math.PI) * lambda2 + 540) % 360) - 180
        );
        best = edge;
        bestDist = diff;
      }
    });
  
    return best;
  }
  

  // --- Helpers gÃ©odÃ©siques (dans UIManager) ---
  toRad(x) {
    return (x * Math.PI) / 180;
  }
  toDeg(x) {
    return (x * 180) / Math.PI;
  }

  // Bearing (de a -> b) en degrÃ©s
  bearing(a, b) {
    const d1 = this.toRad(a.lat),
      d3 = this.toRad(b.lat);
    const d2 = this.toRad(a.lng),
      d4 = this.toRad(b.lng);
    const y = Math.sin(d4 - d2) * Math.cos(d3);
    const x =
      Math.cos(d1) * Math.sin(d3) -
      Math.sin(d1) * Math.cos(d3) * Math.cos(d4 - d2);
    return (this.toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  // Destination Ã  partir de start, bearingÂ° et distance en mÃ¨tres (sphÃ¨re)
  destination(start, bearingDeg, distance) {
    const R = 6371000; // rayon terrestre moyen
    const d5 = distance / R;
    const d6 = this.toRad(bearingDeg);
    const d1 = this.toRad(start.lat);
    const d2 = this.toRad(start.lng);

    const sind1 = Math.sin(d1),
      cosd1 = Math.cos(d1);
    const sind5 = Math.sin(d5),
      cosd5 = Math.cos(d5);

    const sind3 = sind1 * cosd5 + cosd1 * sind5 * Math.cos(d6);
    const d3 = Math.asin(sind3);
    const y = Math.sin(d6) * sind5 * cosd1;
    const x = cosd5 - sind1 * sind3;
    const d4 = d2 + Math.atan2(y, x);

    return L.latLng(this.toDeg(d3), ((this.toDeg(d4) + 540) % 360) - 180);
  }

  showColorOverlay() {
    // Supprimer un ancien overlay si déjà présent
    if (this._colorOverlay) this._colorOverlay.remove();

    // Créer l'overlay flottant
    const overlay = document.createElement("div");
    overlay.className = "color-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#fff",
      border: "1px solid #ccc",
      borderRadius: "8px",
      padding: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,.2)",
      zIndex: 99999,
      textAlign: "center",
      width: "250px",
    });

    overlay.innerHTML = `
    <h6>Changer la couleur</h6>
    <input type="color" id="colorPicker" style="width: 100%; height: 40px; margin-bottom: 8px;">
    <input type="text" id="colorInput" placeholder="#3388ff ou rgb(50,50,50)" style="width: 100%; margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between;">
      <button id="applyColor" class="btn btn-primary btn-sm">Appliquer</button>
      <button id="cancelColor" class="btn btn-secondary btn-sm">Annuler</button>
    </div>
  `;

    document.body.appendChild(overlay);
    this._colorOverlay = overlay;

    const picker = overlay.querySelector("#colorPicker");
    const input = overlay.querySelector("#colorInput");

    // Synchronisation des champs
    picker.addEventListener("input", () => {
      input.value = picker.value;
    });
    input.addEventListener("input", () => {
      picker.value = input.value.startsWith("#") ? input.value : picker.value;
    });

    // Bouton appliquer
    overlay.querySelector("#applyColor").addEventListener("click", () => {
      const color = input.value.trim() || picker.value;
      this.applyColorToSelection(color);
      overlay.remove();
      this._colorOverlay = null;
    });

    // Bouton annuler
    overlay.querySelector("#cancelColor").addEventListener("click", () => {
      overlay.remove();
      this._colorOverlay = null;
    });
  }

  applyColorToSelection(color) {
    const selected = this.selection.getAll();

    selected.forEach((el) => {
      if (el instanceof Point) {
        el.color = color;
      } else if (el instanceof Line) {
        el.startPoint.color = color;
        el.endPoint.color = color;
      } else if (el instanceof Circle) {
        el.color = color;
      }
    });

    this.pointManager.saveToStorage();
    this.lineManager.saveToStorage();
    this.circleManager.saveToStorage();

    this.redraw();
  }

  clearStretchLines() {
    this.stretchLayers.forEach((layer) => this.map.removeLayer(layer));
    this.stretchLayers = [];
  }

  showStretchedGeodesic(line) {
    this.clearStretchLines();

    const start = L.latLng(line.startPoint.latitude, line.startPoint.longitude);
    const end = L.latLng(line.endPoint.latitude, line.endPoint.longitude);

    // Fonction d’interpolation géodésique complète (360°)
    const points = [];
    const numPoints = 720; // résolution plus fine pour améliorer l'aimantation
    const totalDist = this.map.distance(start, end);
    const bearing1 = this.bearing(start, end);
    const bearing2 = (bearing1 + 180) % 360;

    // Prolongement dans les deux directions jusqu’à tour complet (~40 000 km)
    const step = 40000_000 / numPoints;

    // Aller dans la direction 1
    for (let i = 0; i <= numPoints / 2; i++) {
      points.push(this.destination(start, bearing1, step * i));
    }

    // Aller dans la direction opposée
    const reverse = [];
    for (let i = 0; i <= numPoints / 2; i++) {
      reverse.push(this.destination(start, bearing2, step * i));
    }
    reverse.reverse();
    const fullCircle = reverse.concat(points);

    // Ajouter la ligne pointillée
    const ghost = L.geodesic(fullCircle, {
      color: "#888",
      weight: 2,
      dashArray: "6, 8",
      opacity: 0.6,
      interactive: false,
    }).addTo(this.map);

    this.stretchLayers.push(ghost);
  }

  updateModeState() {
    // --- GESTION DES CONFLITS ---
    if (this.isEraseMode) {
      // Quand la gomme est active → on désactive tout le reste
      this.addPointMode = false;
      this.connectMode = false;
      this.circleTool.active = false;
      this.stretchMode = false;
      this.structureAngleMode.active = false
    } else {
      // Si un des modes exclusifs est actif → désactive les autres
      if (this.addPointMode) {
        this.connectMode = false;
        this.circleTool.active = false;
        this.structureAngleMode.active = false;
      } else if (this.connectMode) {
        this.addPointMode = false;
        this.circleTool.active = false;
        this.structureAngleMode.active = false;
      } else if (this.circleTool.active) {
        this.addPointMode = false;
        this.connectMode = false;
        this.structureAngleMode.active = false;
      }
      else if(this.structureAngleMode.active){
        this.addPointMode = false;
        this.connectMode = false;
        this.stretchMode = false;
        this.circleTool.active = false;
      }
      else if (this.stretchMode) {
        this.structureAngleMode.active = false;
      }
    }
  
    // --- MISE À JOUR VISUELLE DES BOUTONS ---
    tbAddPointBtn.classList.toggle("active", this.addPointMode);
    tbAddLineBtn.classList.toggle("active", this.connectMode);
    tbAddCircleBtn.classList.toggle("active", this.circleTool.active);
    tbEraseBtn.classList.toggle("active", this.isEraseMode);
    tbStretchLineBtn.classList.toggle("active", this.stretchMode);
    tbStructureAngleBtn.classList.toggle("active", this.structureAngleMode.active);

    const structureActive = this.structureAngleMode.active;

    tbAddLineBtn.disabled = this.addPointMode || this.circleTool.active || this.isEraseMode || structureActive;
    tbAddPointBtn.disabled = this.connectMode || this.circleTool.active || this.isEraseMode || structureActive;
    tbAddCircleBtn.disabled = this.connectMode || this.addPointMode || this.isEraseMode || structureActive;
    tbStretchLineBtn.disabled = this.isEraseMode || structureActive;
    tbStructureAngleBtn.disabled = this.addPointMode || this.connectMode || this.stretchMode || this.circleTool.active || this.isEraseMode
    tbChangeColorBtn.disabled = structureActive;
    tbDeleteBtn.disabled = structureActive;

    // --- CURSEUR ---
    const mapContainer = this.map.getContainer();
    if (this.isEraseMode) {
      mapContainer.style.cursor = "url('./assets/rubber.png') 8 8, auto";
    } else if (this.addPointMode || this.circleTool.active || this.connectMode) {
      mapContainer.style.cursor = "crosshair";
    } else {
      mapContainer.style.cursor = "auto";
    }
  
    // --- NETTOYAGE DES MODES DÉSACTIVÉS ---
    if (!this.addPointMode) this.stopAddPointMode();
    if (!this.circleTool.active) this.cleanupActiveCircle();
    if (!this.stretchMode) this.clearStretchLines();
    if(!this.structureAngleMode.active) this.exitStructureAngleMode();
  }

  openEditPointModal(point) {
    // Sauvegarder le point en cours d'édition
    this.pointBeingEdited = point;
  
    // Pré-remplir les champs du modal
    document.getElementById("edit-desc").value = point.description;
    document.getElementById("edit-coords").value = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    document.getElementById("edit-color").value = point.color;
    document.getElementById("edit-feedback").innerText = "";
  
    // Ouvrir le modal Bootstrap
    const modal = new bootstrap.Modal(document.getElementById("editPointModal"));
    modal.show();
  }
  
  setUpEditPointModal() {
    const saveBtn = document.getElementById("save-edit-btn");
    const feedback = document.getElementById("edit-feedback");
  
    saveBtn.addEventListener("click", () => {
      const point = this.pointBeingEdited;
      if (!point) return;
  
      const desc = document.getElementById("edit-desc").value.trim();
      const coordStr = document.getElementById("edit-coords").value.trim();
      const color = document.getElementById("edit-color").value;
  
      // Validation du format des coordonnées
      const parts = coordStr.split(",");
      if (parts.length !== 2) {
        feedback.innerText = "Format invalide : latitude, longitude attendus.";
        return;
      }
  
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        feedback.innerText = "Coordonnées invalides.";
        return;
      }
  
      // Mise à jour du point
      point.description = desc;
      point.latitude = lat;
      point.longitude = lng;
      point.color = color;
  
      // Sauvegarde et redraw
      this.pointManager.saveToStorage();
      this.redraw();
      this.setUpPointsList();
      this.setUpPointsToConnect();
  
      // Fermer le modal
      const modalEl = document.getElementById("editPointModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
  
      feedback.innerText = "";
      this.pointBeingEdited = null;
    });
  }

  getConnectedElements(startPoint) {
    const connectedPoints = new Set([startPoint]);
    const connectedLines = new Set();
    const connectedCircles = new Set();
  
    let changed = true;
    while (changed) {
      changed = false;
      // trouver les lignes connectées
      this.lineManager.lines.forEach(l => {
        if (connectedPoints.has(l.startPoint) || connectedPoints.has(l.endPoint)) {
          if (!connectedLines.has(l)) {
            connectedLines.add(l);
            if (!connectedPoints.has(l.startPoint)) {
              connectedPoints.add(l.startPoint); changed = true;
            }
            if (!connectedPoints.has(l.endPoint)) {
              connectedPoints.add(l.endPoint); changed = true;
            }
          }
        }
      });
      // trouver les cercles dont le centre est dans les points connectés
      this.circleManager.circles.forEach(c => {
        const centerPoint = this.pointManager.points.find(p =>
          Math.abs(p.latitude - c.latitude) < 1e-9 &&
          Math.abs(p.longitude - c.longitude) < 1e-9
        );
        if (centerPoint && connectedPoints.has(centerPoint)) {
          connectedCircles.add(c);
        }
      });
    }
  
    return {
      points: Array.from(connectedPoints),
      lines: Array.from(connectedLines),
      circles: Array.from(connectedCircles)
    };
  }

  startStructureRotation(pivotPoint) {
    // si une rotation est déjà en cours, on ne fait rien
    if (this.structureAngleMode.pivot) return;
  
    const { points, lines, circles } = this.getConnectedElements(pivotPoint);
    const mode = this.structureAngleMode;
  
    mode.pivot = pivotPoint;
    mode.elements = { points, lines, circles };
    mode.originalPositions.clear();
    mode.currentAngle = 0;
  
    // sauvegarder les positions d'origine
    points.forEach(p => mode.originalPositions.set(p, { lat: p.latitude, lng: p.longitude }));
  
    // afficher l'UI du slider
    this.showRotationUI();
  }
  
  showRotationUI() {
    const mode = this.structureAngleMode;
  
    const box = document.createElement("div");
    box.className = "rotation-ui";
      
    box.innerHTML = `
      <label for="rotation-slider" style="font-weight:bold;">Rotation :</label>
      <span class="mx-2" id="rotation-value">0°</span>
      <input type="range" id="rotation-slider" min="-180" max="180" step="1" value="0" style="width:100%;">
      
      <div class="d-flex justify-content-between mt-2">
        <button class="btn btn-sm btn-success" id="rotation-validate">Valider</button>
        <button class="btn btn-sm btn-danger" id="rotation-cancel">Annuler</button>
      </div>
    `;
    document.body.appendChild(box);
    mode.uiBox = box;
  
    // handlers
    const slider = box.querySelector("#rotation-slider");
    const label = box.querySelector("#rotation-value");
  
    slider.addEventListener("input", (e) => {
      const angle = parseFloat(e.target.value);
      label.textContent = `${angle}°`;
      this.applyRotation(angle);
    });
  
    box.querySelector("#rotation-validate").addEventListener("click", () => {
      this.validateRotation();
    });
  
    box.querySelector("#rotation-cancel").addEventListener("click", () => {
      this.cancelRotation();
    });
  }
  
  applyRotation(angleDeg) {
    const mode = this.structureAngleMode;
    if (!mode.pivot) return;
  
    mode.currentAngle = angleDeg;
    const pivot = L.latLng(mode.pivot.latitude, mode.pivot.longitude);
    const R = 6371000;
  
    mode.elements.points.forEach(p => {
      if (p === mode.pivot) return;
  
      const original = mode.originalPositions.get(p);
      const d = this.map.distance(pivot, [original.lat, original.lng]);
      const bearing = this.bearing(pivot, L.latLng(original.lat, original.lng));
      const newBearing = bearing + angleDeg;
      const newPos = this.destination(pivot, newBearing, d);
  
      p.latitude = newPos.lat;
      p.longitude = newPos.lng;
    });
  
    this.redraw();
  }
  
  validateRotation() {
    const mode = this.structureAngleMode;
    if (!mode.pivot) return;
    this.pointManager.saveToStorage();
    this.exitStructureAngleMode();
  }
  
  cancelRotation() {
    const mode = this.structureAngleMode;
    if (!mode.pivot) return;
    // remettre les positions d'origine
    for (const [p, pos] of mode.originalPositions.entries()) {
      p.latitude = pos.lat;
      p.longitude = pos.lng;
    }
    this.redraw();
    this.exitStructureAngleMode();
  }
  
  exitStructureAngleMode() {
    const mode = this.structureAngleMode;
    if (mode.uiBox) mode.uiBox.remove();
    mode.uiBox = null;
    mode.pivot = null;
    mode.elements = [];
    mode.originalPositions.clear();
    mode.currentAngle = 0;
    mode.active = false;
  
    // réactiver boutons
    tbAddPointBtn.disabled = false;
    tbAddLineBtn.disabled = false;
    tbAddCircleBtn.disabled = false;
    tbStretchLineBtn.disabled = false;
    tbChangeColorBtn.disabled = false;
    tbDeleteBtn.disabled = false;
  
    tbStructureAngleBtn.classList.remove("active");
  }
  
  
}

export default UIManager;
