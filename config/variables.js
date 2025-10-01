/* Navbar variables */
const navbarSection = document.getElementById('navbarNav');
// Show/hide distance button
const nbDistanceBtn = document.getElementById('toggle-measure');
// Target button
const nbTargetBtn = document.getElementById('add-point-button');

/* Sidebar */
const sidebarSection = document.getElementById('sidebar');
// New point section
const sbNewPointFormContainer = document.getElementById('add-point-form');
const sbNewPointDescriptionInput = document.getElementById('new-desc');
const sbNewPointCoordinatesInput = document.getElementById('new-coords');
const sbNewPointErrorMsg = document.getElementById('coord-feedback');
const sbNewPointColorInput = document.getElementById('new-color');
// Points list section
const sbPointsList = document.getElementById('point-list');
// Connect points section
const sbFirstPointToConnect = document.getElementById('select-point1');
const sbSecondPointToConnect = document.getElementById('select-point2');
const sbConnectBtn = document.getElementById('connect-btn')

/* Map */
const mapSection = document.getElementById('map');

/* Import/Export modal */
const importExportModal = document.getElementById('importExportModal');
const iemCopyBtn = document.getElementById('export-btn');
const iemClearBtn = document.getElementById('clear-area-btn');
const iemTextInput = document.getElementById('import-export-area');
const iemImportBtn = document.getElementById('import-btn');
const iemErrorMsg = document.getElementById('import-feedback');

/* Toolbar */
const tbDeleteBtn = document.getElementById('delete-btn');