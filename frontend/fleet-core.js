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
async function loadFleetData() {
    // Si aucune flotte n'est sélectionnée, ne rien faire
    if (!currentFleetId) {
        console.error('Aucune flotte sélectionnée');
        return [];
    }
    
    // Clé de stockage spécifique à la flotte
    const storageKey = `fleetData_${currentFleetId}`;
    const demoMode = localStorage.getItem('demoMode') === 'true';
    const token = localStorage.getItem('token');
    
    // Si nous sommes en mode normal (pas démo) et que le module de synchronisation est disponible
    if (!demoMode && window.fleetSync && window.fleetSync.syncConfig && window.fleetSync.syncConfig.syncEnabled && token) {
        try {
            console.log('Tentative de récupération des données depuis le serveur...');
            
            // Afficher un indicateur de chargement
            const syncButton = document.getElementById('sync-now-btn');
            if (syncButton) {
                const syncIcon = syncButton.querySelector('[data-lucide="refresh-cw"]');
                if (syncIcon) syncIcon.classList.add('animate-spin');
                document.getElementById('sync-text').textContent = 'Chargement...';
            }
            
            // Synchroniser avec le serveur pour obtenir les dernières données
            const syncResult = await window.fleetSync.syncWithServer();
            console.log('Résultat de la synchronisation:', syncResult);
            
            // Mettre à jour l'interface utilisateur après synchronisation
            updateSyncUI(true);
        } catch (error) {
            console.error('Erreur lors de la synchronisation avec le serveur:', error);
            // En cas d'erreur, on continue avec les données locales et on met à jour l'UI
            updateSyncUI(false);
        }
    }
    
    // Essayer de charger depuis le stockage local (même après une synchronisation réussie)
    try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            tableData = JSON.parse(storedData);
            window.tableData = tableData; // Rendre accessible globalement
            console.log(`Données chargées depuis le stockage local pour la flotte ${currentFleetId}:`, tableData.length, 'enregistrements');
        } else {
            // Aucune donnée trouvée, initialisation avec un tableau vide
            tableData = [];
            window.tableData = tableData;
            console.log(`Aucune donnée trouvée pour la flotte ${currentFleetId}, initialisation avec un tableau vide`);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        tableData = [];
        window.tableData = tableData;
    }
    
    // Assurer que les IDs sont des nombres
    ensureNumericIds();
    
    return tableData;
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

// Fonction pour mettre à jour l'interface après une synchronisation réussie
function updateSyncUI(success = true) {
    // Mettre à jour l'indicateur de synchronisation
    const syncStatus = document.getElementById('sync-status');
    const syncButton = document.getElementById('sync-now-btn');
    const syncIcon = syncButton ? syncButton.querySelector('[data-lucide="refresh-cw"]') : null;
    
    if (syncIcon) {
        syncIcon.classList.remove('animate-spin');
    }
    
    if (document.getElementById('sync-text')) {
        document.getElementById('sync-text').textContent = 'Sync';
    }
    
    if (syncStatus) {
        // Supprimer la classe needs-sync si la synchronisation est réussie
        if (success) {
            syncStatus.classList.remove('needs-sync');
        }
        
        // Mettre à jour l'infobulle avec la date de dernière synchronisation
        const lastSync = localStorage.getItem('lastSyncTimestamp');
        if (lastSync) {
            const date = new Date(lastSync);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            syncStatus.setAttribute('data-tip', 'Dernière synchronisation: ' + formattedDate);
        } else {
            syncStatus.setAttribute('data-tip', 'Jamais synchronisé');
        }
    }
    
    // Afficher un message de notification
    if (success) {
        const notification = document.createElement('div');
        notification.className = 'sync-notification sync-success';
        notification.textContent = 'Synchronisation réussie';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.backgroundColor = '#28a745';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '9999';
        notification.style.animation = 'fadeInOut 3s forwards';
        
        // Ajouter l'animation CSS si elle n'existe pas déjà
        if (!document.getElementById('sync-animations')) {
            const style = document.createElement('style');
            style.id = 'sync-animations';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Supprimer la notification après l'animation
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    const demoMode = localStorage.getItem('demoMode') === 'true';
    const clientId = localStorage.getItem('currentCompanyId') || localStorage.getItem('currentClientId');
    
    // Récupérer l'ID de la flotte depuis localStorage ou l'URL
    currentFleetId = localStorage.getItem('currentFleetId');
    currentFleetName = localStorage.getItem('currentFleetName') || localStorage.getItem('clientName');
    
    // Afficher le mode démo si actif
    if (demoMode) {
        document.getElementById('demo-badge').classList.remove('hidden');
        document.getElementById('demo-mode-indicator').classList.remove('hidden');
    }
    
    // Initialiser le module de synchronisation si disponible
    if (window.fleetSync && !demoMode && token && clientId && currentFleetId) {
        console.log('Initialisation du module de synchronisation...');
        try {
            window.fleetSync.initSync(token, clientId, currentFleetId);
            
            // Configurer le bouton de synchronisation manuelle
            const syncButton = document.getElementById('sync-now-btn');
            if (syncButton) {
                syncButton.addEventListener('click', function() {
                    // Afficher un indicateur visuel
                    const syncIcon = syncButton.querySelector('[data-lucide="refresh-cw"]');
                    if (syncIcon) syncIcon.classList.add('animate-spin');
                    document.getElementById('sync-text').textContent = 'Synchronisation...';
                    
                    // Lancer la synchronisation
                    window.fleetSync.syncWithServer()
                        .then(result => {
                            console.log('Synchronisation réussie:', result);
                            // Mettre à jour l'interface
                            updateSyncUI(true);
                        })
                        .catch(error => {
                            console.error('Erreur de synchronisation:', error);
                            // Mettre à jour l'interface avec erreur
                            updateSyncUI(false);
                        });
                });
            }
            
            // Mettre à jour l'indicateur de dernière synchronisation
            updateSyncUI(true);
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la synchronisation:', error);
        }
    } else {
        console.log('Module de synchronisation non disponible ou mode démo actif');
    }
    
    // Mettre à jour le titre de la page avec le nom de la flotte
    updateFleetTitle();
    
    // Charger les données de la flotte
    loadFleetData();
    
    // Afficher les données dans la console pour débogage
    console.log('Données de la flotte chargées:', window.tableData ? window.tableData.length : 0, 'véhicules');
    console.table(window.tableData);
    
    // Initialisation des icônes Lucide
    lucide.createIcons();
    
    // Initialisation du tableau
    initializeTable();
    
    // Initialisation des événements
    initializeEvents();
});

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
        cellEdited: function(cell){
            const field = cell.getField();
            const row = cell.getRow();
            const rowData = row.getData();
            const newValue = cell.getValue();
            
            console.log(`Cellule modifiée - Champ: ${field}, ID: ${rowData.id}, Nouvelle valeur: ${newValue}`);
            
            // Mettre à jour les données dans le tableau
            const index = tableData.findIndex(item => item.id === rowData.id);
            if (index !== -1) {
                tableData[index][field] = newValue;
                
                // Vérifier si nous sommes en mode démo
                const demoMode = localStorage.getItem('demoMode') === 'true';
                
                // Si le module de synchronisation est disponible et que nous ne sommes pas en mode démo
                if (window.fleetSync && !demoMode && window.fleetSync.trackChange) {
                    // Enregistrer la modification individuelle pour synchronisation ultérieure
                    const vehicleId = rowData.id;
                    const vehicleData = tableData[index];
                    
                    // Créer un objet contenant uniquement le champ modifié pour optimiser la synchronisation
                    const changeData = {
                        id: vehicleId,
                        [field]: newValue,
                        lastModified: new Date().toISOString()
                    };
                    
                    // Suivre la modification
                    window.fleetSync.trackChange(vehicleId, changeData, 'update');
                    console.log(`Modification du véhicule ${vehicleId} enregistrée pour synchronisation ultérieure`);
                }
                
                // Sauvegarder les modifications dans le stockage local
                saveFleetData();
            }
            
            // Mettre en évidence la ligne modifiée
            row.getElement().classList.add('row-modified');
            setTimeout(() => {
                row.getElement().classList.remove('row-modified');
            }, 2000);
            
            // Mettre à jour l'indicateur de synchronisation
            const syncStatus = document.getElementById('sync-status');
            if (syncStatus) {
                // Ajouter une classe pour indiquer des modifications non synchronisées
                syncStatus.classList.add('needs-sync');
                
                // Ajouter un style si nécessaire
                if (!document.getElementById('sync-status-style')) {
                    const style = document.createElement('style');
                    style.id = 'sync-status-style';
                    style.textContent = `
                        .needs-sync {
                            animation: pulse 1.5s infinite;
                        }
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.6; }
                            100% { opacity: 1; }
                        }
                    `;
                    document.head.appendChild(style);
                }
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
async function saveFleetData() {
    try {
        // Clé de stockage spécifique à la flotte
        const storageKey = `fleetData_${currentFleetId}`;
        
        // Sauvegarder dans le stockage local
        localStorage.setItem(storageKey, JSON.stringify(tableData));
        console.log(`Données sauvegardées pour la flotte ${currentFleetId}:`, tableData.length, 'enregistrements');
        
        // Vérifier si nous sommes en mode démo
        const demoMode = localStorage.getItem('demoMode') === 'true';
        const token = localStorage.getItem('token');
        
        // Si le module de synchronisation est disponible et que nous ne sommes pas en mode démo
        if (window.fleetSync && !demoMode && window.fleetSync.syncConfig && window.fleetSync.syncConfig.syncEnabled && token) {
            try {
                // Afficher un indicateur de sauvegarde
                const syncButton = document.getElementById('sync-now-btn');
                if (syncButton) {
                    const syncIcon = syncButton.querySelector('[data-lucide="refresh-cw"]');
                    if (syncIcon) syncIcon.classList.add('animate-spin');
                    document.getElementById('sync-text').textContent = 'Sauvegarde...';
                }
                
                // Synchroniser avec le serveur
                const syncResult = await window.fleetSync.syncWithServer();
                console.log('Synchronisation réussie:', syncResult);
                
                // Mettre à jour l'interface utilisateur après synchronisation
                updateSyncUI(true);
            } catch (syncError) {
                console.error('Erreur lors de la synchronisation:', syncError);
                
                // Mettre à jour l'interface utilisateur avec erreur
                updateSyncUI(false);
                
                // Enregistrer la modification pour synchronisation ultérieure
                if (window.fleetSync.trackChange) {
                    tableData.forEach(vehicle => {
                        window.fleetSync.trackChange(vehicle.id, vehicle, 'update');
                    });
                    console.log('Modifications enregistrées pour synchronisation ultérieure');
                }
            }
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
        
        // Afficher un message d'erreur
        const errorMessage = document.createElement('div');
        errorMessage.className = 'save-message error-message';
        errorMessage.textContent = 'Erreur lors de la sauvegarde';
        document.body.appendChild(errorMessage);
        
        // Supprimer le message après 3 secondes
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
        
        return false;
    }
}
