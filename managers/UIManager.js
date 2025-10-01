
class UIManager {
  constructor(map, storageManager, pointManager = [], lineManager = [], circleManager = []) {
    this.map = map.getMapInstance();
    this.storage = storageManager;
    this.pointManager = pointManager;
    this.lineManager = lineManager;
    this.circleManager = circleManager;

    this.click = false;

    this.draw()

    this.setUpImportExportModal();
    this.setUpPointsList();
    this.setUpPointsToConnect();

    this.setUpToolbar();


    // Unselect items when clicking on map 
    this.map.addEventListener('click', () => {
      if(this.click == false){
        if (this.lineManager.hasSelectedLine() || this.pointManager.hasSelectedPoint()) {
          this.lineManager.unselectAll();
          this.pointManager.unselectAll();
          this.removeAll();
          this.draw();
          this.disabledDeleteSelectionButton(true);
        }
      }
      this.click = false;
    });

  }

  setUpImportExportModal(){
    importExportModal.addEventListener('show.bs.modal', () => {
      // S'il n'y a pas de données sauvegardées, on garde Export désactivé
      iemCopyBtn.disabled = !this.storage.hasData();
      iemTextInput.value = '';
      iemErrorMsg.innerHTML = '';
      iemImportBtn.disabled = true;
    });

    // Lorsque la textarea change, on active/désactive Import
    iemTextInput.addEventListener('input', () => {
      iemImportBtn.disabled = iemTextInput.value.trim() === '';
    });

    // Effacer la textarea
    iemClearBtn.addEventListener('click', () => {
      iemTextInput.value = '';
      iemErrorMsg.innerHTML = '';
      iemImportBtn.disabled = true;
    });

    /** Génére l’objet à exporter, sérialise et affiche dans la textarea */
    iemCopyBtn.addEventListener('click', () => {
      const data = {
        points: this.pointManager.points.map(p => ({
          id: p.id, 
          desc: p.description, 
          lat: p.latitude, 
          lng: p.longitude, 
          color: p.color,
        })),
        lines: this.lineManager.lines.map(l => ({           
          id1: l.startPoint.id, 
          id2: l.endPoint.id, 
        })),
        circles: this.circleManager.circles.map(c => ({
          lat: c.longitude,
          lng: c.longitude,
          radius: c.radius,
          color: c.color
        }))
      };
      const json = JSON.stringify(data, null, 2);
      iemTextInput.value = json;
      navigator.clipboard.writeText(json)
        .then(() => {
          iemErrorMsg.innerHTML = '<div class="text-success">Données copiées !</div>';
        })
        .catch(() => {
          iemErrorMsg.innerHTML = '<div class="text-danger">Échec copie.</div>';
        });
      // On peut importer immédiatement après export
      iemImportBtn.disabled = false;
    });

    /** Importe les données depuis la textarea sans écraser l’existant */
    iemImportBtn.addEventListener('click', () => {
      iemErrorMsg.innerHTML = '';
      let data;
      try {
        data = JSON.parse(iemTextInput.value);
      } catch {
        iemErrorMsg.innerHTML = '<div class="text-danger">JSON invalide.</div>';
        return;
      }
      if (!data.points || !Array.isArray(data.points) ||
          !data.lines || !Array.isArray(data.lines) ||
          !data.circles || !Array.isArray(data.circles)) {
        iemErrorMsg.innerHTML = '<div class="text-danger">Format attendu : { points: […], lines: […], circles: […] }.</div>';
        return;
      }

      // Importer les points uniques
      let added = 0;
      data.points.forEach((pt, index) => {
        if (
          typeof pt.id === 'number' &&
          typeof pt.desc === 'string' &&
          typeof pt.lat === 'number' &&
          typeof pt.lng === 'number' &&
          typeof pt.color === 'string' &&
          !this.pointManager.points.some(e => (e.id === pt.id))
        ) {
          this.pointManager.addPoint(pt.id, pt.desc, pt.lat, pt.lng, pt.color, true);
          added++;
        }
      });

      this.drawPoints();

      // Importer les lignes uniques
      let addedLines = 0;
      data.lines.forEach(ln => {
        if (
          this.pointManager.points &&
          typeof ln.id1 === 'number' &&
          typeof ln.id2 === 'number' &&
          !this.lineManager.lines.some(e => (e.startPoint.id === ln.id1 && e.endPoint.id === ln.id2) || (e.startPoint.id === ln.id2 && e.endPoint.id === ln.id1))
        ) {
          const p1 = this.pointManager.getPointById(ln.id1);
          const p2 = this.pointManager.getPointById(ln.id2);
          if (p1 && p2) {
            this.lineManager.addLine(p1, p2, true);
            addedLines++;
            // if(distanceButton.checked){
            //   showLinesDistance(line);
            // }        
          }
        }
      });
      this.drawLines();

      // Importer les cercles
      let addedCircles = 0;
      if (Array.isArray(data.circles)) {
        data.circles.forEach(c => {
          if (
            typeof c.lat === 'number' &&
            typeof c.lng === 'number' &&
            typeof c.radius === 'number' &&
            typeof c.color === 'string' &&
            !this.circleManager.circles.some(e => (e.latitude === c.lat && e.longitude === c.lng && e.radius === c.radius && e.color === c.color))
          ) {
              this.circleManager.addCircle(
              c.radius,
              c.lat,
              c.lng,
              c.color,
              true
            );
            addedCircles++;
          }
        });

        this.drawCircles();
        // saveCirclesToLocalStorage(); // mettre à jour le stockage
      }

      this.setUpPointsList();

      // Régénérer la liste et sauvegarder
      // renderPointList();
      // saveToLocalStorage();

      iemErrorMsg.innerHTML =
        `<div class="text-success">${added} point(s) et ${addedLines} tracé(s) et ${addedCircles} cercle(s) ajoutés.</div>`;
    });
  }

  setUpPointsList(){
    // Initialisation de Sortable pour la liste
    Sortable.create(sbPointsList, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: (evt) => {
        // Mettre à jour l'ordre dans le tableau `points` selon l'ordre visuel
        const idsInOrder = Array.from(sbPointsList.children).map((li) =>
          parseInt(li.getAttribute('data-id'))
        );
        this.pointManager.points.sort(
          (a, b) => idsInOrder.indexOf(a.id) - idsInOrder.indexOf(b.id)
        );
      },
    });

    sbPointsList.innerHTML = '';
    this.pointManager.points.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center';
      li.setAttribute('data-id', p.id);

      // Poignée de déplacement
      const dragHandle = document.createElement('span');
      dragHandle.innerHTML = '☰';
      dragHandle.className = 'drag-handle';
      li.appendChild(dragHandle);

      // Boîte de couleur
      const colorBox = document.createElement('span');
      colorBox.className = 'color-box';
      colorBox.style.backgroundColor = p.color;
      li.appendChild(colorBox);

      // Description et coordonnées
      const infoDiv = document.createElement('div');
      infoDiv.className = 'flex-grow-1';
      infoDiv.innerHTML = `<strong>${p.description}</strong><br>
        (${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)})`;
      li.appendChild(infoDiv);

      // Bouton modifier
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-warning me-2';
      btnEdit.textContent = 'Modifier';
      // btnEdit.addEventListener('click', () => openEditModal(p.id));
      li.appendChild(btnEdit);

      // Bouton supprimer
      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-sm btn-danger';
      btnDel.textContent = 'Supprimer';
      btnDel.addEventListener('click', () => {
        console.log("Delete point")
        this.removePoint(p, false, true);
        sbPointsList.removeChild(li);
        // deletePoint(p.id);
        // reloadDistanceLabels();
        // closeAllConfigMenus();
      });
      li.appendChild(btnDel);

      sbPointsList.appendChild(li);
    });
    // mettreAJourSelects();


  }


  drawPoint(point){
    let color = '#0000FF'
    if(point.selected == true){
      color = '#FF0000'
    }
    const marker = L.circleMarker([point.latitude, point.longitude], {
      radius: point.radius, fillColor: point.color, color: color, weight: 1, fillOpacity: 0.9
    })
    .addTo(this.map)
    // .bindPopup(popupContent(point.description, point.latitude.toFixed(5), point.longitude.toFixed(5)));
    point.marker = marker;    
    point.marker.addEventListener('click', () =>{
      console.log("clicked on point marker", point, this.pointManager.points, point.selected)
      if(!point.selected){
        point.selected = true;
        this.disabledDeleteSelectionButton(false);
        this.removePoint(point, true, false);
        this.drawPoint(point);
        this.click = true;        
      }
      else{
        point.selected = false;
        this.disabledDeleteSelectionButton(true);
        this.removePoint(point, true, false);
        this.drawPoint(point);
        this.click = true;
      }
    })
  }

  drawPoints(){
    if(this.pointManager.points){
      this.pointManager.points.forEach(point => {
        this.drawPoint(point);
      })
    }
  }

  removePoint(point, keepLines = false, save=false){
    if (point === null) {
      console.error("Impossible de retirer le point.");
      return; 
    }
    
    if(point.marker !== null){
      this.map.removeLayer(point.marker);
    }   

    if(save){
      this.pointManager.removePoint(point, save);
    }

    if(!keepLines){
      const lines = this.lineManager.getLinesWithPoint(point)
      if(lines){
        lines.forEach(line => {
          this.removeLine(line, save);
        });      
      }
    }
      
  }

  removeLine(line, save=false){    
    if(line.marker !== null){
      this.map.removeLayer(line.marker);
    }   
    if(save){
      this.lineManager.removeLine(line.startPoint, line.endPoint, save);
    }
  }

  removeSelection(){
    const pointsSelected = this.pointManager.getSelectedPoints();
    console.log(pointsSelected)
    if(pointsSelected){
      pointsSelected.forEach(point => {
        this.removePoint(point, false, true);
      })
    }
    const linesSelected = this.lineManager.getSelectedLines();
    if(linesSelected){
      linesSelected.forEach(line => {
        this.removeLine(line, true);
      })
    }
  }

  drawLine(line){
    let color = '#0000FF'
    if(line.selected == true){
      color = '#FF0000'
    }
    const marker = L.geodesic([[line.startPoint.latitude, line.startPoint.longitude], [line.endPoint.latitude, line.endPoint.longitude]], { 
      color: color, weight: 3 
    })
    .addTo(this.map);
    line.marker = marker; 
    
    // TODO : unselect when click on selected line
    line.marker.addEventListener('click', () =>{
      console.log("clicked on line marker")
      
      if(!line.selected){
        line.selected = true;
        this.disabledDeleteSelectionButton(false)
        this.removeLines()
        this.drawLines();
        this.click = true;        
      }
      else{
        line.selected = false;
        this.disabledDeleteSelectionButton(true)
        this.removeLines()
        this.drawLines();
        this.click = true;
      }
    })
  }

  drawLines(){
    if(this.lineManager.lines){
      this.lineManager.lines.forEach(line => {
        this.drawLine(line);
      })
    }    
  }

  drawCircle(circle){
    const marker = L.circle([circle.latitude, circle.longitude], {
      radius: circle.radius,
      color: circle.color,
      fillOpacity: 0.3
    })
    .addTo(this.map);
    circle.marker = marker;
    // attachCircleEvent(circle); // pour permettre de configurer en cliquant dessus
  }

  drawCircles(){
    if(this.circleManager.circles){
      this.circleManager.circles.forEach(circle => {
        this.drawCircle(circle);
      })
    }
  }

  draw(){
    this.drawLines();
    this.drawCircles();
    this.drawPoints();
  }

  removeAll(){
    this.removeCircles();
    this.removeLines();
    this.removePoints();
  }

  removePoints(){
    if(this.pointManager.points){
      this.pointManager.points.forEach( point => {
        if(point.marker !== null){
          this.map.removeLayer(point.marker);
        }
      });     
    }
  }

  removeCircles(){
    if(this.circleManager.circles){
      this.circleManager.circles.forEach( circle => {
        if(circle.marker !== null){
          this.map.removeLayer(circle.marker);
        }
      });     
    }
  }

  removeLines(){
    if(this.lineManager.lines){
      this.lineManager.lines.forEach( line => {
        if(line.marker !== null){
          this.map.removeLayer(line.marker);
        }
      });     
    }
  }

  setUpPointsToConnect(){
    
    sbConnectBtn.disabled = true;
    sbFirstPointToConnect.innerHTML = '<option value="" disabled>Choisir...</option>';
    sbSecondPointToConnect.innerHTML = '<option value="" disabled>Choisir...</option>';
    // Remplir les selects
    this.pointManager.points.forEach((p) => {      
      const opt1 = document.createElement('option');
      opt1.value = p.id;
      opt1.textContent = p.description;
      sbFirstPointToConnect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p.id;
      opt2.textContent = p.description;
      sbSecondPointToConnect.appendChild(opt2);    
    });

    // Activer/désactiver le bouton selon les choix
    const checkSelection = () => {
      const id1 = parseInt(sbFirstPointToConnect.value);
      const id2 = parseInt(sbSecondPointToConnect.value);
      sbConnectBtn.disabled = !(id1 && id2 && id1 !== id2);
    };

    sbFirstPointToConnect.addEventListener('change', () => {
      checkSelection();
    });

    sbSecondPointToConnect.addEventListener('change', () => {
      checkSelection();
    });
  }

  disabledDeleteSelectionButton(value){
    if(!value){
      tbDeleteBtn.disabled = value;
    }
    else{
      if (!this.lineManager.hasSelectedLine() && !this.pointManager.hasSelectedPoint()){
        tbDeleteBtn.disabled = value
      }
    }
  }

  setUpToolbar(){    
    this.disabledDeleteSelectionButton(true)

    tbDeleteBtn.addEventListener('click', () => {
      this.removeSelection()
    })
  }

  showLineConfigPanel(line) { /* ... */ }
  hideLineConfigPanel() { /* ... */ }
  showPointCreationModal(callback) { /* ... */ }
  showCircleConfigPanel(circle) { /* ... */ }
}

export default UIManager;
