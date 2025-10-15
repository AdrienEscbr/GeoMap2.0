class Renderer {
  constructor(map) {
    this.map = map;
    this.layers = new Map(); // Map<entity, LeafletLayer>
    this.distanceLabels = new Map(); // Map<line, L.Marker> pour les distances
    this.nameLabels = new Map(); // Map<Point, L.Marker>
  }

  // Nettoyer la carte
  clear() {
    this.layers.forEach((layer) => this.map.removeLayer(layer));
    this.layers.clear();

    this.distanceLabels.forEach((label) => this.map.removeLayer(label));
    this.distanceLabels.clear();
  }

  // Dessiner un point
  drawPoint(point, isSelected = false, onClick = null) {
    const color = isSelected ? "#FF0000" : "#0000FF";

    const marker = L.circleMarker([point.latitude, point.longitude], {
      radius: point.radius || 8,
      fillColor: point.color,
      color,
      weight: 1,
      fillOpacity: 0.9,
      bubblingMouseEvents: false,
    }).addTo(this.map);

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      if (window.appUI && typeof window.appUI.handlePointClick === "function") {
        window.appUI.handlePointClick(point, e);
      } else {
        onClick(point); // fallback (sélection classique)
      }
    });
    

    this.layers.set(point, marker);
  }

  drawLine(line, isSelected = false, onClick = null, showDistance = false) {
    const color = isSelected ? "#FF0000" : "#0000FF";

    const poly = L.geodesic(
      [
        [line.startPoint.latitude, line.startPoint.longitude],
        [line.endPoint.latitude, line.endPoint.longitude],
      ],
      { color, weight: 3, steps: 256 }
    ).addTo(this.map);

    poly.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onClick && onClick(line, e);
    });

    this.layers.set(line, poly);

    if (showDistance) {
      this.addDistanceLabel(line);
    }
  }

  drawCircle(circle, isSelected = false, onClick = null) {
    
    const color = isSelected ? "#FF0000" : circle.color;

    const marker = L.circle([circle.latitude, circle.longitude], {
      radius: circle.radius,
      color: color,
      weight: 2,
      fillOpacity: 0, // ✅ toujours vide
      bubblingMouseEvents: false,
    }).addTo(this.map);

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onClick && onClick(circle, e);
    });

    this.layers.set(circle, marker);
  }

  // Supprimer un élément
  remove(entity) {
    const layer = this.layers.get(entity);
    if (layer) {
      this.map.removeLayer(layer);
      this.layers.delete(entity);
    }
  }

  addDistanceLabel(line) {
    // Calcul du milieu géographique
    const midLat = (line.startPoint.latitude + line.endPoint.latitude) / 2;
    const midLng = (line.startPoint.longitude + line.endPoint.longitude) / 2;
    const mid = L.latLng(midLat, midLng);
  
    // Calcul de la distance géodésique (mètres)
    const from = L.latLng(line.startPoint.latitude, line.startPoint.longitude);
    const to = L.latLng(line.endPoint.latitude, line.endPoint.longitude);
    const distance = from.distanceTo(to);
  
    // Format du texte (affiche en km si > 1000m)
    const formatted =
      distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
  
    // === Création du label avec mesure réelle ===
    const tempDiv = document.createElement('div');
    // tempDiv.className = 'distance-label-temp';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.innerHTML = formatted;
    document.body.appendChild(tempDiv);
  
    const width = tempDiv.offsetWidth;
    const height = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);
  
    // Création de l'icône label
    const icon = L.divIcon({
      className: 'distance-label',
      html: formatted,
      iconSize: [width, height],
      iconAnchor: [width / 2, height / 2],
    });
  
    const labelMarker = L.marker(mid, {
      icon,
      interactive: false,
    }).addTo(this.map);
  
    this.distanceLabels.set(line, labelMarker);
  }
  
  removeDistanceLabel(line) {
    const label = this.distanceLabels.get(line);
    if (label) {
      this.map.removeLayer(label);
      this.distanceLabels.delete(line);
    }
  }
  
  clearDistanceLabels() {
    this.distanceLabels.forEach(label => this.map.removeLayer(label));
    this.distanceLabels.clear();
  }

  addNameLabel(point) {
    const text = point.description || "Sans nom";
    const latlng = L.latLng(point.latitude, point.longitude);
  
    // Création d’un div invisible pour mesurer la taille
    const tempDiv = document.createElement('div');
    // tempDiv.className = 'name-label-temp';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.innerHTML = text;
    document.body.appendChild(tempDiv);
  
    const width = tempDiv.offsetWidth+10;
    const height = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);
  
    // Création du label visible
    const icon = L.divIcon({
      className: 'name-label',
      html: text,
      iconSize: [width, height],
      iconAnchor: [width / 2, height + 10], // positionné juste au-dessus du point
    });
  
    const labelMarker = L.marker(latlng, {
      icon,
      interactive: false,
    }).addTo(this.map);
  
    this.nameLabels.set(point, labelMarker);
  }
  
  removeNameLabel(point) {
    const label = this.nameLabels.get(point);
    if (label) {
      this.map.removeLayer(label);
      this.nameLabels.delete(point);
    }
  }

  clearNameLabels() {
    this.nameLabels.forEach(label => this.map.removeLayer(label));
    this.nameLabels.clear();
  }
  
  
  
}

export default Renderer;
