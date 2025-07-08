// Fleet Management - Core Logic
// Contient les fonctionnalités de base et la configuration du tableau

// Variables globales
let table; // Instance Tabulator
let tableData = []; // Données du tableau
let excelData = []; // Données Excel temporaires pour l'import
let currentFleetId = null; // ID de la flotte actuelle
let currentFleetName = null; // Nom de la flotte actuelle

// Structure des colonnes organisées par catégorie (basée sur fleet_fields.xlsx)
const columnCategories = [
    {
        name: "Identification & Technique",
        icon: "tag",
        columns: [
            { field: "fleetnumber", label_en: "Fleet Number", label_fr: "N° de parc", format: "text", default_display: true },
            { field: "designation", label_en: "Equipment", label_fr: "Désignation", format: "text", default_display: true },
            { field: "type", label_en: "Type", label_fr: "Type (VL, PL, Engin...)", format: "text", default_display: true },
            { field: "fleet", label_en: "fleet type", label_fr: "Parc Engins", format: "text", default_display: true },
            { field: "brand", label_en: "Brand", label_fr: "Marque", format: "text", default_display: true },
            { field: "model", label_en: "Model", label_fr: "Modèle", format: "text", default_display: true },
            { field: "serialnumber", label_en: "Serial Number", label_fr: "N° de série", format: "text", default_display: true }
        ]
    },
    {
        name: "Affectation & Localisation",
        icon: "map-pin",
        columns: [
            { field: "affectation", label_en: "Assignment", label_fr: "Affectation", format: "text", default_display: true }
        ]
    },
    {
        name: "Utilisation & Entretien",
        icon: "tool",
        columns: [
            { field: "hours", label_en: "Usage Hours", label_fr: "Heures d'utilisation", format: "number (h)", default_display: true },
            { field: "mileage", label_en: "Mileage", label_fr: "Kilométrage", format: "number (Km)", default_display: true }
        ]
    },
    {
        name: "Administration & Documents",
        icon: "file-text",
        columns: [
            // À compléter selon le fichier Excel
        ]
    },
    {
        name: "Coûts & Performances",
        icon: "bar-chart-2",
        columns: [
            // À compléter selon le fichier Excel
        ]
    },
    {
        name: "Historique",
        icon: "clock",
        columns: [
            // À compléter selon le fichier Excel
        ]
    },
    {
        name: "Systèmes & Alertes",
        icon: "alert-triangle",
        columns: [
            // À compléter selon le fichier Excel
        ]
    }
];

// Liste des colonnes masquées par défaut
const hiddenColumns = [];

// Initialiser la liste des colonnes masquées à partir de la structure
columnCategories.forEach(category => {
    category.columns.forEach(column => {
        if (!column.default_display) {
            hiddenColumns.push(column.field);
        }
    });
});

// Correspondance entre les noms de colonnes Excel et les champs du tableau
const excelFieldMapping = {
    "ID": "id",
    "N° de parc": "fleetnumber",
    "Désignation": "designation",
    "Type": "type",
    "Parc Engins": "fleet",
    "Marque": "brand",
    "Modèle": "model",
    "N° de série": "serialnumber",
    "Affectation": "affectation",
    "Heures d'utilisation": "hours",
    "Kilométrage": "mileage"
};

// Définition des colonnes du tableau basée sur fleet_fields.xlsx
const tableColumns = [
    {title:"", field:"rowSelection", formatter:"rowSelection", titleFormatter:"rowSelection", hozAlign:"center", headerSort:false, width:40},
    {title:"ID", field:"id", width:80, sorter:"number"},
    {title:"N° de parc", field:"fleetnumber", width:100},
    {title:"Désignation", field:"designation"},
    {title:"Type", field:"type", width:100},
    {title:"Parc Engins", field:"fleet", width:120},
    {title:"Marque", field:"brand", width:120},
    {title:"Modèle", field:"model", width:120},
    {title:"N° de série", field:"serialnumber", width:120},
    {title:"Affectation", field:"affectation", width:120},
    {title:"Heures d'utilisation", field:"hours", width:120, sorter:"number", hozAlign:"right"},
    {title:"Kilométrage", field:"mileage", width:120, sorter:"number", hozAlign:"right"},
    {title:"Actions", field:"actions", formatter:function(cell, formatterParams, onRendered){
        return '<div class="flex space-x-1"><i data-lucide="eye" class="w-4 h-4 cursor-pointer"></i><i data-lucide="edit" class="w-4 h-4 cursor-pointer"></i></div>';
    }, width:100, headerSort:false}
];

// Variable pour stocker le nombre de doublons
let duplicatesCount = 0;

// Fonction pour s'assurer que les ID sont des nombres
function ensureNumericIds() {
    tableData.forEach(item => {
        if (item.id && typeof item.id === 'string') {
            const numericId = parseInt(item.id, 10);
            if (!isNaN(numericId)) {
                item.id = numericId;
            }
        }
        if (item.hours && typeof item.hours === 'string') {
            const numericHours = parseFloat(item.hours);
            if (!isNaN(numericHours)) {
                item.hours = numericHours;
            }
        }
    });
}

// Fonction pour charger les données de la flotte depuis le stockage local ou le serveur
function loadFleetData() {
    try {
        // Récupérer l'ID de la flotte actuelle
        currentFleetId = localStorage.getItem('currentFleetId') || 'demo';
        currentFleetName = localStorage.getItem('currentFleetName') || 'Flotte de démonstration';
        
        // Mettre à jour le titre de la page avec le nom de la flotte
        updateFleetTitle();
        
        // Vérifier si nous sommes en mode démo
        const demoMode = localStorage.getItem('demoMode') === 'true';
        
        // Clé de stockage spécifique à la flotte
        const storageKey = `fleetData_${currentFleetId}`;
        
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            tableData = JSON.parse(savedData);
            // S'assurer que les ID sont des nombres pour le tri
            ensureNumericIds();
            console.log(`Données chargées pour la flotte ${currentFleetId}:`, tableData.length, 'enregistrements');
        } else {
            console.log(`Aucune donnée trouvée pour la flotte ${currentFleetId}. Initialisation avec un tableau vide.`);
            tableData = [];
        }
        
        // Si le module de synchronisation est disponible et que nous ne sommes pas en mode démo
        if (window.fleetSync && !demoMode) {
            console.log('Initialisation de la synchronisation avec le serveur...');
            window.fleetSync.initSync(currentFleetId);
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        tableData = [];
        return false;
    }
}

// Fonction pour mettre à jour le titre de la page avec le nom de la flotte
function updateFleetTitle() {
    // Mettre à jour le titre dans la navbar
    const fleetTitle = document.getElementById('fleet-title');
    if (fleetTitle) {
        fleetTitle.textContent = currentFleetName || 'Flotte';
    }
    
    // Mettre à jour le titre de l'onglet du navigateur
    document.title = `${currentFleetName || 'Flotte'} - Fleet Management`;
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    const demoMode = localStorage.getItem('demoMode') === 'true';
    
    if (!token && !demoMode) {
        // Rediriger vers la page de connexion si non connecté
        window.location.href = 'login.html';
        return;
    }
    
    // Vérifier si une flotte est sélectionnée
    currentFleetId = localStorage.getItem('currentFleetId');
    if (!currentFleetId) {
        // Créer une flotte temporaire
        currentFleetId = 'temp-' + Date.now();
        localStorage.setItem('currentFleetId', currentFleetId);
        localStorage.setItem('currentFleetName', 'Ma Flotte');
        console.log('Flotte temporaire créée:', currentFleetId);
    }
    
    // Chargement des données depuis le stockage local
    window.loadFleetData();
    
    console.log('Données chargées:', window.tableData);
    console.table(window.tableData);
    
    // Initialisation des icônes Lucide
    lucide.createIcons();
    
    // Initialisation du tableau
    initializeTable();
    
    // Initialisation des événements
    initializeEvents();
});

// Initialisation du module de synchronisation
function initializeSyncModule() {
    console.log('Initialisation du module de synchronisation...');
    
    // Vérifier si le module fleetSync est disponible
    if (!window.fleetSync) {
        console.error('Module fleetSync non disponible');
        return false;
    }
    
    // Récupérer les informations nécessaires
    const token = localStorage.getItem('token');
    const demoMode = localStorage.getItem('demoMode') === 'true';
    const clientId = localStorage.getItem('currentClientId');
    const fleetId = localStorage.getItem('currentFleetId');
    
    // Ne pas initialiser en mode démo
    if (demoMode) {
        console.log('Mode démo actif, synchronisation désactivée');
        return false;
    }
    
    // Vérifier que les informations nécessaires sont disponibles
    if (!token || !clientId || !fleetId) {
        console.warn('Informations manquantes pour la synchronisation:', {
            token: token ? 'présent' : 'manquant',
            clientId: clientId ? clientId : 'manquant',
            fleetId: fleetId ? fleetId : 'manquant'
        });
        return false;
    }
    
    // Initialiser le module de synchronisation
    try {
        window.fleetSync.initSync(token, clientId, fleetId);
        console.log('Module de synchronisation initialisé avec succès');
        
        // Mettre à jour l'interface utilisateur
        updateSyncUI();
        
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du module de synchronisation:', error);
        return false;
    }
}

// Mettre à jour l'interface utilisateur de synchronisation
window.updateSyncUI = function() {
    const syncStatus = document.getElementById('sync-status');
    const syncText = document.getElementById('sync-text');
    
    if (!syncStatus || !syncText) return;
    
    // Récupérer le timestamp de dernière synchronisation
    const lastSync = localStorage.getItem('lastSyncTimestamp');
    
    if (lastSync) {
        // Formater la date pour l'affichage
        const lastSyncDate = new Date(lastSync);
        const formattedDate = lastSyncDate.toLocaleString();
        
        // Mettre à jour le tooltip et le texte
        syncStatus.setAttribute('data-tip', `Dernière synchronisation: ${formattedDate}`);
        syncText.textContent = 'Sync';
    } else {
        syncStatus.setAttribute('data-tip', 'Jamais synchronisé');
        syncText.textContent = 'Sync';
    }
}

// Initialisation du tableau Tabulator
function initializeTable() {
    console.log('Initialisation du tableau avec', tableData.length, 'enregistrements');
    
    // Configuration du tableau
    const tableConfig = {
        data: tableData,
        columns: tableColumns,
        layout: "fitDataFill",
        pagination: true,
        paginationSize: 25,
        selectable: true,
        height: "100%",
        movableColumns: true,
        responsiveLayout: "hide",
        headerFilterPlaceholder: "Filtrer...",
        placeholder: "Aucune donnée à afficher. Importez des données via le bouton 'Import Excel'.",
        dataLoaded: function() {
            // Réinitialiser les icônes Lucide après chargement des données
            if (window.lucide) {
                lucide.createIcons();
            }
        },
        renderComplete: function() {
            // Réinitialiser les icônes Lucide après rendu complet
            if (window.lucide) {
                lucide.createIcons();
            }
        },
        cellEdited: function(cell) {
            // Récupérer les informations sur la cellule modifiée
            const field = cell.getColumn().getField();
            const row = cell.getRow();
            const rowData = row.getData();
            const newValue = cell.getValue();
            
            // Sauvegarder les données après modification
            saveFleetData();
            
            // Vérifier si le module de synchronisation est disponible et que nous ne sommes pas en mode démo
            const demoMode = localStorage.getItem('demoMode') === 'true';
            if (window.fleetSync && !demoMode) {
                // Enregistrer la modification pour la synchronisation
                window.fleetSync.trackChange({
                    type: 'update',
                    vehicleId: rowData.id,
                    field: field,
                    value: newValue,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Mettre à jour l'affichage des filtres
            applyFilters();
        }
    };
    
    // Ajouter le tri initial seulement si nous avons des données
    if (tableData.length > 0) {
        tableConfig.initialSort = [{column:"id", dir:"asc"}];
    }
    
    // Initialiser le tableau
    table = new Tabulator("#machines-table", tableConfig);
    
    // Initialisation du sélecteur de colonnes
    table.on("tableBuilt", function() {
        initializeColumnSelector();
        
        // Initialisation des icônes Lucide dans le tableau
        lucide.createIcons();
    });
    
    // Ajouter un événement pour gérer la sélection des lignes
    table.on("rowSelectionChanged", function(data, rows){
        // Activer ou désactiver le bouton de suppression en fonction des lignes sélectionnées
        const deleteButton = document.getElementById('delete-selected-button');
        if (deleteButton) {
            if (data.length > 0) {
                deleteButton.removeAttribute('disabled');
                deleteButton.classList.remove('btn-disabled');
                console.log(data.length + ' ligne(s) sélectionnée(s)');
            } else {
                deleteButton.setAttribute('disabled', 'disabled');
                deleteButton.classList.add('btn-disabled');
                console.log('Aucune ligne sélectionnée');
            }
        }
    });
}

// Fonction initializeColumnSelector() supprimée

// Fonctions selectAllColumns() et unselectAllColumns() supprimées

// Fonction resetDefaultColumns() supprimée

// Appliquer les filtres combinés
function applyFilters() {
    const filterEtat = document.getElementById("filter-etat");
    const filterType = document.getElementById("filter-type");
    const filterChantier = document.getElementById("filter-chantier");
    
    let filters = [];
    
    if (filterEtat && filterEtat.value) {
        filters.push({field: "etat", type: "=", value: filterEtat.value});
    }
    
    if (filterType && filterType.value) {
        filters.push({field: "type", type: "=", value: filterType.value});
    }
    
    if (filterChantier && filterChantier.value) {
        filters.push({field: "chantier", type: "=", value: filterChantier.value});
    }
    
    if (filters.length > 0) {
        table.setFilter([filters]);
    } else {
        table.clearFilter();
    }
}

// Fonction de recherche améliorée sur toutes les colonnes
function matchAny(data, filterParams) {
    let value = filterParams.value.trim().toLowerCase();
    
    // Si vide, retourner tout
    if (!value) return true;
    
    // Gérer les recherches avec plusieurs mots
    const searchTerms = value.split(/\s+/).filter(term => term.length > 0);
    
    // Si aucun terme valide après filtrage, retourner tout
    if (searchTerms.length === 0) return true;
    
    // Vérifier si tous les termes sont présents dans au moins une propriété
    return searchTerms.every(term => {
        for (let key in data) {
            if (data[key] !== null && data[key] !== undefined) {
                const fieldValue = data[key].toString().toLowerCase();
                if (fieldValue.includes(term)) {
                    return true;
                }
            }
        }
        return false;
    });
}

// Fonction pour faire défiler vers une colonne spécifique
window.scrollToColumn = function(field) {
    const tableContainer = document.querySelector(".table-container");
    const columnEl = document.querySelector(`[tabulator-field='${field}']`);

    if (columnEl && tableContainer) {
        // Ajouter une classe pour l'animation de défilement
        tableContainer.classList.add('scrolling');
        
        // Calculer la position de la colonne
        const offsetLeft = columnEl.offsetLeft;
        const containerWidth = tableContainer.clientWidth;
        const columnWidth = columnEl.clientWidth;
        
        // Centrer la colonne dans la vue si possible
        const scrollPosition = offsetLeft - (containerWidth / 2) + (columnWidth / 2);
        
        // Effectuer le défilement
        tableContainer.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
        });
        
        // Mettre en évidence la colonne
        highlightColumnHeader(field);
        
        // Retirer la classe après l'animation
        setTimeout(() => {
            tableContainer.classList.remove('scrolling');
        }, 1000);
    }
}

// Fonction pour mettre en évidence l'en-tête d'une colonne
window.highlightColumnHeader = function(field) {
    const headerCell = document.querySelector(`.tabulator-col[tabulator-field="${field}"]`);
    
    if (headerCell) {
        headerCell.classList.add('column-highlight');
        
        setTimeout(() => {
            headerCell.classList.remove('column-highlight');
        }, 2000);
    }
}

// Fonction pour mettre en évidence une colonne
window.highlightColumn = function(field) {
    const column = table.getColumn(field);
    if (column) {
        // Récupérer tous les éléments de cette colonne
        const cells = document.querySelectorAll(`[tabulator-field='${field}']`);
        
        // Ajouter une classe pour l'animation
        cells.forEach(cell => {
            cell.classList.add('column-highlight');
            
            // Retirer la classe après l'animation
            setTimeout(() => {
                cell.classList.remove('column-highlight');
            }, 2000);
        });
        
        // Faire défiler vers la colonne (utilise la fonction existante)
        scrollToColumn(field);
    }
}

// Sauvegarder les données dans le stockage local et synchroniser avec le serveur
function saveFleetData() {
    try {
        // Clé de stockage spécifique à la flotte
        const storageKey = `fleetData_${currentFleetId}`;
        
        // Sauvegarder dans le stockage local
        localStorage.setItem(storageKey, JSON.stringify(tableData));
        console.log(`Données sauvegardées pour la flotte ${currentFleetId}:`, tableData.length, 'enregistrements');
        
        // Vérifier si nous sommes en mode démo
        const demoMode = localStorage.getItem('demoMode') === 'true';
        
        // Si le module de synchronisation est disponible et que nous ne sommes pas en mode démo
        if (window.fleetSync && !demoMode) {
            // Synchroniser avec le serveur
            window.fleetSync.syncWithServer()
                .then(result => {
                    console.log('Synchronisation réussie:', result);
                })
                .catch(error => {
                    console.error('Erreur de synchronisation:', error);
                });
        }
        
        // Afficher un message de confirmation discret
        const saveMessage = document.createElement('div');
        saveMessage.className = 'save-message';
        saveMessage.textContent = 'Données sauvegardées';
        document.body.appendChild(saveMessage);
        
        // Supprimer le message après 2 secondes
        setTimeout(() => {
            saveMessage.remove();
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données:', error);
        return false;
    }
}
