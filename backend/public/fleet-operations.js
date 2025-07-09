// Fleet Management - Operations Logic
// Contient les fonctionnalités d'interaction utilisateur et les opérations

// Initialisation des événements
function initializeEvents() {
    console.log('Initialisation des événements');
    
    // Recherche globale améliorée avec debounce
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        let searchTimeout = null;
        
        function performSearch() {
            const searchValue = searchInput.value;
            table.setFilter(matchAny, {value: searchValue});
        }
        
        searchInput.addEventListener("input", function() {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            searchTimeout = setTimeout(performSearch, 200);
        });
        
        searchInput.addEventListener("search", function() {
            performSearch();
        });
    }
    
    // Bouton de synchronisation manuelle
    const syncNowBtn = document.getElementById("sync-now-btn");
    if (syncNowBtn) {
        syncNowBtn.addEventListener("click", function() {
            // Vérifier si le module de synchronisation est disponible
            if (window.fleetSync) {
                // Afficher un indicateur de synchronisation en cours
                const syncIcon = syncNowBtn.querySelector('[data-lucide="refresh-cw"]');
                if (syncIcon) {
                    syncIcon.classList.add('animate-spin');
                }
                
                // Lancer la synchronisation
                window.fleetSync.syncWithServer()
                    .then(result => {
                        console.log('Synchronisation manuelle réussie:', result);
                        // Mettre à jour l'interface utilisateur
                        updateSyncUI();
                        // Afficher une notification de succès
                        showNotification('Synchronisation réussie', 'success');
                    })
                    .catch(error => {
                        console.error('Erreur lors de la synchronisation manuelle:', error);
                        // Afficher une notification d'erreur
                        showNotification('Erreur de synchronisation: ' + error.message, 'error');
                    })
                    .finally(() => {
                        // Arrêter l'animation de l'icône
                        if (syncIcon) {
                            syncIcon.classList.remove('animate-spin');
                        }
                    });
            } else {
                console.error('Module de synchronisation non disponible');
                showNotification('Module de synchronisation non disponible', 'error');
            }
        });
    }
    
    // Bouton Activer modification
    const editModeBtn = document.getElementById("edit-mode-btn");
    if (editModeBtn) {
        editModeBtn.addEventListener("click", toggleEditMode);
    }
    
    // Bouton NOUVEAU
    const addBtn = document.getElementById("add-btn");
    if (addBtn) {
        addBtn.addEventListener("click", addNewVehicle);
    }
    
    // Références au bouton NOUVEAU
    
    // Références à l'overlay du modal des colonnes supprimées
    
    // Bouton d'import Excel
    const importBtn = document.getElementById("import-btn");
    if (importBtn) {
        importBtn.addEventListener("click", openImportModal);
    }
    
    // Gestion du fichier Excel sélectionné
    const excelFileInput = document.getElementById("excel-file");
    if (excelFileInput) {
        console.log('Input fichier Excel trouvé et événement ajouté');
        excelFileInput.addEventListener("change", function() {
            console.log('=== CHANGEMENT DE FICHIER EXCEL ===');
            console.log('Nombre de fichiers sélectionnés:', this.files.length);
            if (this.files.length > 0) {
                console.log('Fichier sélectionné:', this.files[0].name);
                processExcelFile(this.files[0]);
            } else {
                console.log('Aucun fichier sélectionné');
            }
        });
    } else {
        console.error('Input fichier Excel NON TROUVÉ avec ID: excel-file');
    }
    
    // Boutons du modal d'import
    const previewImportBtn = document.getElementById("preview-import-btn");
    if (previewImportBtn) {
        console.log('Bouton aperçu trouvé et événement ajouté');
        previewImportBtn.addEventListener("click", function() {
            console.log('=== CLIC SUR BOUTON APERÇU ===');
            console.log('État du bouton:', {
                disabled: previewImportBtn.disabled,
                classList: previewImportBtn.classList.toString()
            });
            console.log('excelData avant appel previewExcelData:', excelData);
            previewExcelData();
        });
    } else {
        console.error('Bouton aperçu NON TROUVÉ avec ID: preview-import-btn');
    }
    
    const confirmImportBtn = document.getElementById("confirm-import-btn");
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener("click", importData);
    }
    
    const cancelImportBtn = document.getElementById("cancel-import-btn");
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener("click", closeImportModal);
    }
    
    // Fermeture du modal d'import en cliquant sur l'overlay
    const importModalOverlay = document.getElementById("import-modal-overlay");
    if (importModalOverlay) {
        importModalOverlay.addEventListener("click", closeImportModal);
    }
    
    // Bouton d'export
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", function() {
            table.download("xlsx", "parc_machines.xlsx");
        });
    }
    
    // Bouton de suppression des lignes sélectionnées
    const deleteSelectedBtn = document.getElementById("delete-selected-button");
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener("click", deleteSelectedRows);
    }
    
    // Bouton d'ajout
    const addMachineBtn = document.getElementById("add-machine-btn");
    if (addMachineBtn) {
        addMachineBtn.addEventListener("click", function() {
            alert("Fonctionnalité d'ajout en cours de développement");
        });
    }
    
    // Bouton de sauvegarde
    const saveFleetBtn = document.getElementById("save-fleet-button");
    if (saveFleetBtn) {
        saveFleetBtn.addEventListener("click", function() {
            if (saveFleetData()) {
                // Message de confirmation
                const saveMessage = document.createElement('div');
                saveMessage.className = 'save-message';
                saveMessage.textContent = 'Données sauvegardées';
                document.body.appendChild(saveMessage);
                
                setTimeout(() => {
                    saveMessage.remove();
                }, 2000);
            }
        });
    }
    
    // Ajustement de la hauteur du tableau lors du redimensionnement
    window.addEventListener("resize", function() {
        table.redraw();
    });
    

    
    // Initialisation des onglets de catégories
    initializeCategoryTabs();
}

// Ouvrir le modal de sélection des colonnes
function openColumnsModal() {
    document.getElementById('columns-modal').classList.remove('hidden');
    document.getElementById('columns-modal-backdrop').classList.remove('hidden');
    
    // Afficher la première catégorie par défaut
    if (columnCategories.length > 0) {
        showCategoryColumns(columnCategories[0].name);
    }
}

// Fermer le modal de sélection des colonnes
function closeColumnsModal() {
    document.getElementById('columns-modal').classList.add('hidden');
    document.getElementById('columns-modal-backdrop').classList.add('hidden');
}

// Ouvrir le modal d'import Excel
function openImportModal() {
    console.log('Ouverture du modal d\'import Excel');
    const modal = document.getElementById('import-modal');
    if (!modal) {
        console.error('Modal d\'import non trouvé');
        return;
    }
    
    // Réinitialiser les champs
    const excelFileInput = document.getElementById('excel-file');
    if (excelFileInput) {
        excelFileInput.value = '';
    }
    
    const importPreview = document.getElementById('import-preview');
    if (importPreview) {
        importPreview.classList.add('hidden');
    }
    
    const previewBtn = document.getElementById('preview-import-btn');
    if (previewBtn) {
        previewBtn.disabled = true;
    }
    
    const confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
    
    // Afficher le modal
    modal.classList.add('active');
    document.body.classList.add('overflow-hidden');
    
    // Réinitialiser les données Excel
    excelData = [];
    
    // Réinitialiser les icônes Lucide
    setTimeout(() => {
        if (window.lucide) {
            lucide.createIcons();
        }
    }, 100);
}

// Fermer le modal d'import Excel
function closeImportModal() {
    console.log('Fermeture du modal d\'import Excel');
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    }
}

// Traiter le fichier Excel sélectionné
function processExcelFile(file) {
    console.log('=== DEBUT processExcelFile ===');
    console.log('Fichier sélectionné:', file.name, file.size, 'bytes');
    
    if (!file) {
        console.error('Aucun fichier fourni');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('Fichier lu, taille des données:', e.target.result.byteLength);
        
        try {
            // Lire le fichier Excel avec SheetJS
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('Workbook lu, feuilles disponibles:', workbook.SheetNames);
            
            // Prendre la première feuille
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir en JSON avec les en-têtes
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log('Données JSON extraites:', jsonData.length, 'lignes');
            
            if (jsonData.length === 0) {
                alert('Le fichier Excel semble vide.');
                return;
            }
            
            // Première ligne = en-têtes
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            console.log('En-têtes:', headers);
            console.log('Nombre de lignes de données:', rows.length);
            
            // Mapper les données
            const mappedData = mapExcelData(headers, rows);
            console.log('Données mappées:', mappedData.length, 'enregistrements');
            
            if (mappedData.length === 0) {
                alert('Aucune donnée valide trouvée dans le fichier Excel.');
                return;
            }
            
            // Vérifier les doublons
            const duplicateInfo = checkDuplicates(mappedData);
            console.log('Informations sur les doublons:', duplicateInfo);
            
            // Stocker les données pour l'aperçu et l'import
            excelData = duplicateInfo.filteredData;
            
            // Mettre à jour l'interface
            const importPreview = document.getElementById('import-preview');
            if (importPreview) {
                importPreview.classList.remove('hidden');
            }
            
            // Mettre à jour les compteurs
            const previewCount = document.getElementById('preview-count');
            if (previewCount) {
                previewCount.textContent = `${excelData.length} enregistrement(s) à importer`;
            }
            
            const duplicateCount = document.getElementById('duplicate-count');
            if (duplicateCount && duplicateInfo.duplicates > 0) {
                duplicateCount.textContent = `${duplicateInfo.duplicates} doublon(s) détecté(s)`;
                duplicateCount.classList.remove('hidden');
            }
            
            // Activer les boutons
            const previewBtn = document.getElementById('preview-import-btn');
            if (previewBtn) {
                previewBtn.disabled = false;
                console.log('Bouton aperçu activé');
            }
            
            const confirmBtn = document.getElementById('confirm-import-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                console.log('Bouton import activé');
            }
            
            console.log('=== FIN processExcelFile - Succès ===');
            
        } catch (error) {
            console.error('Erreur lors du traitement du fichier Excel:', error);
            alert('Erreur lors de la lecture du fichier Excel: ' + error.message);
        }
    };
    
    reader.onerror = function(error) {
        console.error('Erreur de lecture du fichier:', error);
        alert('Erreur lors de la lecture du fichier.');
    };
    
    // Lire le fichier comme ArrayBuffer
    reader.readAsArrayBuffer(file);
}

// Mapper les données Excel vers la structure du tableau
function mapExcelData(headers, rows) {
    console.log('Mapping des données Excel:', { headers, rowCount: rows.length });
    
    // Mapping des en-têtes Excel vers les champs de notre tableau
    const fieldMapping = {
        'ID': 'id',
        'N° de parc': 'fleetnumber',
        'Désignation': 'designation',
        'Parc Engins': 'fleet',
        'Marque': 'brand',
        'Modèle': 'model',
        'N° de série': 'serialnumber',
        'Affectation': 'affectation',
        'Heures d\'utilisation': 'hours'
    };
    
    const mappedData = [];
    
    rows.forEach((row, rowIndex) => {
        // Ignorer les lignes vides
        if (!row || row.every(cell => !cell && cell !== 0)) {
            return;
        }
        
        const mappedRow = {};
        let hasValidData = false;
        
        headers.forEach((header, colIndex) => {
            const fieldName = fieldMapping[header];
            if (fieldName && row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '') {
                let value = row[colIndex];
                
                // Traitement spécial pour certains champs
                if (fieldName === 'id') {
                    value = parseInt(value, 10);
                    if (isNaN(value)) {
                        console.warn(`Ligne ${rowIndex + 2}: ID invalide (${row[colIndex]})`);
                        return; // Ignorer cette ligne si l'ID n'est pas valide
                    }
                } else if (fieldName === 'hours') {
                    value = parseFloat(value);
                    if (isNaN(value)) {
                        value = 0; // Valeur par défaut pour les heures
                    }
                } else {
                    value = String(value).trim();
                }
                
                mappedRow[fieldName] = value;
                hasValidData = true;
            }
        });
        
        // Ajouter seulement si on a des données valides et un ID
        if (hasValidData && mappedRow.id) {
            mappedData.push(mappedRow);
        } else if (hasValidData) {
            console.warn(`Ligne ${rowIndex + 2}: Ignorée car pas d'ID valide`);
        }
    });
    
    console.log(`${mappedData.length} enregistrements mappés avec succès`);
    return mappedData;
}

// Vérifier les doublons dans les données Excel
function checkDuplicates(excelData) {
    console.log('Vérification des doublons pour', excelData.length, 'enregistrements');
    
    const existingIds = new Set(tableData.map(item => item.id));
    const filteredData = [];
    const updatedData = [];
    let duplicates = 0;
    
    excelData.forEach(item => {
        if (existingIds.has(item.id)) {
            // C'est un doublon - sera mis à jour
            duplicates++;
            updatedData.push(item);
        } else {
            // Nouvel enregistrement
            filteredData.push(item);
        }
    });
    
    console.log(`Doublons détectés: ${duplicates}, Nouveaux: ${filteredData.length}`);
    
    return {
        filteredData: filteredData,
        duplicates: duplicates,
        updatedData: updatedData
    };
}

// Afficher un aperçu des données Excel
function previewExcelData() {
    console.log('=== DEBUT previewExcelData ===');
    console.log('excelData:', excelData);
    console.log('excelData.length:', excelData ? excelData.length : 'undefined');
    
    if (!excelData || excelData.length === 0) {
        alert('Aucune donnée à prévisualiser. Veuillez d\'abord sélectionner un fichier Excel.');
        return;
    }
    
    // Créer une fenêtre d'aperçu
    const previewWindow = window.open('', 'Preview', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!previewWindow) {
        alert('Impossible d\'ouvrir la fenêtre d\'aperçu. Vérifiez que les pop-ups ne sont pas bloqués.');
        return;
    }
    
    previewWindow.document.write('<html><head><title>Aperçu des données Excel</title>');
    previewWindow.document.write('<style>');
    previewWindow.document.write('body { font-family: Arial, sans-serif; margin: 20px; }');
    previewWindow.document.write('h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }');
    previewWindow.document.write('table { border-collapse: collapse; width: 100%; margin-top: 20px; }');
    previewWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    previewWindow.document.write('th { background-color: #f2f2f2; font-weight: bold; }');
    previewWindow.document.write('tr:nth-child(even) { background-color: #f9f9f9; }');
    previewWindow.document.write('tr:hover { background-color: #f5f5f5; }');
    previewWindow.document.write('.info { background-color: #e7f3ff; padding: 10px; border-radius: 5px; margin-bottom: 20px; }');
    previewWindow.document.write('</style>');
    previewWindow.document.write('</head><body>');
    
    previewWindow.document.write(`<h1>Aperçu des données Excel</h1>`);
    previewWindow.document.write(`<div class="info">`);
    previewWindow.document.write(`<strong>Nombre total d'enregistrements :</strong> ${excelData.length}<br>`);
    previewWindow.document.write(`<strong>Aperçu :</strong> Affichage des ${Math.min(10, excelData.length)} premiers enregistrements`);
    previewWindow.document.write(`</div>`);
    
    // Créer le tableau
    previewWindow.document.write('<table>');
    
    // En-têtes
    previewWindow.document.write('<tr>');
    const headers = ['ID', 'N° de parc', 'Désignation', 'Parc Engins', 'Marque', 'Modèle', 'N° de série', 'Affectation', 'Heures'];
    headers.forEach(header => {
        previewWindow.document.write(`<th>${header}</th>`);
    });
    previewWindow.document.write('</tr>');
    
    // Données (limiter à 10 pour l'aperçu)
    const previewData = excelData.slice(0, 10);
    previewData.forEach(item => {
        previewWindow.document.write('<tr>');
        previewWindow.document.write(`<td>${item.id || ''}</td>`);
        previewWindow.document.write(`<td>${item.fleetnumber || ''}</td>`);
        previewWindow.document.write(`<td>${item.designation || ''}</td>`);
        previewWindow.document.write(`<td>${item.fleet || ''}</td>`);
        previewWindow.document.write(`<td>${item.brand || ''}</td>`);
        previewWindow.document.write(`<td>${item.model || ''}</td>`);
        previewWindow.document.write(`<td>${item.serialnumber || ''}</td>`);
        previewWindow.document.write(`<td>${item.affectation || ''}</td>`);
        previewWindow.document.write(`<td>${item.hours || 0}</td>`);
        previewWindow.document.write('</tr>');
    });
    
    previewWindow.document.write('</table>');
    
    if (excelData.length > 10) {
        previewWindow.document.write(`<p style="margin-top: 20px; font-style: italic; color: #666;">`);
        previewWindow.document.write(`... et ${excelData.length - 10} autres enregistrements non affichés dans cet aperçu.`);
        previewWindow.document.write(`</p>`);
    }
    
    previewWindow.document.write('</body></html>');
    previewWindow.document.close();
    
    console.log('Fenêtre d\'aperçu ouverte avec', excelData.length, 'enregistrements');
}

// Importer les données Excel dans le tableau
function importData() {
    console.log('Import des données Excel dans le tableau');
    
    if (!excelData || excelData.length === 0) {
        alert('Aucune donnée à importer. Veuillez d\'abord sélectionner un fichier Excel.');
        return;
    }
    
    try {
        const updateExisting = document.getElementById('prevent-duplicates').checked;
        let addedCount = 0;
        let updatedCount = 0;
        
        if (updateExisting) {
            // Mode mise à jour : remplacer les doublons et ajouter les nouveaux
            const existingIds = new Map();
            tableData.forEach((item, index) => {
                existingIds.set(item.id, index);
            });
            
            excelData.forEach(newItem => {
                if (existingIds.has(newItem.id)) {
                    // Mettre à jour l'enregistrement existant
                    const existingIndex = existingIds.get(newItem.id);
                    tableData[existingIndex] = { ...tableData[existingIndex], ...newItem };
                    updatedCount++;
                } else {
                    // Ajouter un nouvel enregistrement
                    tableData.push(newItem);
                    addedCount++;
                }
            });
        } else {
            // Mode ajout simple : ajouter toutes les données
            tableData.push(...excelData);
            addedCount = excelData.length;
        }
        
        // Sauvegarder les données
        saveFleetData();
        
        // Recharger le tableau
        table.setData(tableData);
        
        // Fermer le modal
        closeImportModal();
        
        // Message de succès
        let message = `Import terminé avec succès !\n`;
        if (addedCount > 0) {
            message += `${addedCount} nouvel(s) enregistrement(s) ajouté(s).\n`;
        }
        if (updatedCount > 0) {
            message += `${updatedCount} enregistrement(s) mis à jour.`;
        }
        
        alert(message);
        
    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        alert('Erreur lors de l\'import des données. Consultez la console pour plus de détails.');
    }
}

// Traiter le fichier Excel sélectionné
function processExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Prendre la première feuille
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir en JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            if (jsonData.length > 0) {
                // La première ligne contient les en-têtes
                const headers = jsonData[0];
                const rows = jsonData.slice(1);
                
                console.log('En-têtes détectés:', headers);
                console.log('Nombre de lignes de données:', rows.length);
                
                // Mapper les données selon notre structure
                const mappedData = mapExcelData(headers, rows);
                
                if (mappedData.length > 0) {
                    // Vérifier les doublons si l'option est activée
                    const updateExisting = document.getElementById('prevent-duplicates').checked;
                    let duplicatesCount = 0;
                    
                    if (updateExisting) {
                        const { filteredData, duplicates, updatedData } = checkDuplicates(mappedData);
                        excelData = filteredData;
                        duplicatesCount = duplicates;
                        
                        // Afficher le nombre d'enregistrements à mettre à jour
                        const duplicateCountElement = document.getElementById('duplicate-count');
                        if (duplicateCountElement) {
                            duplicateCountElement.textContent = duplicates;
                        }
                        const duplicateContainer = document.getElementById('duplicate-count-container');
                        if (duplicateContainer) {
                            duplicateContainer.classList.toggle('hidden', duplicates === 0);
                        }
                    } else {
                        excelData = mappedData;
                        const duplicateContainer = document.getElementById('duplicate-count-container');
                        if (duplicateContainer) {
                            duplicateContainer.classList.add('hidden');
                        }
                    }
                    
                    // Mettre à jour l'aperçu
                    const previewCount = document.getElementById('preview-count');
                    if (previewCount) {
                        previewCount.textContent = excelData.length;
                    }
                    const importPreview = document.getElementById('import-preview');
                    if (importPreview) {
                        importPreview.classList.remove('hidden');
                    }
                    
                    // Activer les boutons
                    const previewBtn = document.getElementById('preview-import-btn');
                    if (previewBtn) {
                        previewBtn.disabled = false;
                    }
                    const confirmBtn = document.getElementById('confirm-import-btn');
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                    }
                } else {
                    alert('Aucune donnée valide trouvée dans le fichier Excel.');
                    
                    // Désactiver les boutons
                    const previewBtn = document.getElementById('preview-import-btn');
                    if (previewBtn) {
                        previewBtn.disabled = true;
                    }
                    const confirmBtn = document.getElementById('confirm-import-btn');
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                    }
                }
            } else {
                alert('Le fichier Excel semble être vide.');
            }
        } catch (error) {
            console.error('Erreur lors de la lecture du fichier Excel:', error);
            alert('Erreur lors de la lecture du fichier Excel. Vérifiez le format du fichier.');
        }
    };
    
    reader.onerror = function() {
        alert('Erreur lors de la lecture du fichier.');
    };
    
    reader.readAsArrayBuffer(file);
}

// Mapper les données Excel selon notre structure
function mapExcelData(headers, rows) {
    const mappedData = [];
    
    rows.forEach((row, index) => {
        const item = {};
        let hasId = false;
        let hasData = false;
        
        headers.forEach((header, colIndex) => {
            const fieldName = excelFieldMapping[header];
            if (fieldName && row[colIndex] !== undefined && row[colIndex] !== '') {
                // Ne stocker que les valeurs non vides
                item[fieldName] = row[colIndex];
                if (fieldName === 'id') {
                    hasId = true;
                } else {
                    hasData = true; // Au moins un champ de données est rempli
                }
            }
        });
        
        // Vérifier si l'ID est présent
        if (hasId) {
            // Convertir l'ID en nombre si c'est une chaîne
            if (typeof item.id === 'string') {
                item.id = parseInt(item.id, 10);
                if (isNaN(item.id)) {
                    console.error('ID invalide détecté dans la ligne', index + 1);
                    return; // Ignorer cette ligne
                }
            }
            
            // N'ajouter que si l'ID est valide et qu'il y a au moins un champ à mettre à jour
            if (hasData || !tableData.some(existing => existing.id === item.id)) {
                mappedData.push(item);
            } else {
                console.log('Ligne ignorée car aucun champ à mettre à jour:', item.id);
            }
        } else {
            // Générer un ID automatique si manquant
            const maxId = Math.max(0, ...tableData.map(item => item.id || 0));
            item.id = maxId + index + 1;
            if (hasData) {
                mappedData.push(item);
            }
        }
    });
    
    console.log('Données mappées:', mappedData.length, 'enregistrements');
    return mappedData;
}

// Vérifier et mettre à jour les données existantes
function checkDuplicates(newData) {
    const existingIds = tableData.map(item => item.id);
    const duplicates = [];
    const filteredData = [];
    const updatedData = [];
    
    newData.forEach(item => {
        if (item.id && existingIds.includes(item.id)) {
            // Trouver l'index de l'enregistrement existant
            const existingIndex = tableData.findIndex(existing => existing.id === item.id);
            if (existingIndex !== -1) {
                // Sauvegarder l'enregistrement pour la mise à jour
                duplicates.push({
                    oldData: tableData[existingIndex],
                    newData: item
                });
                updatedData.push(item);
            }
        } else {
            filteredData.push(item);
            if (item.id) {
                existingIds.push(item.id);
            }
        }
    });
    
    return { filteredData, count: duplicates.length, updatedData };
}

// Importer les données dans le tableau
function importData() {
    if (excelData.length === 0) {
        alert('Aucune donnée à importer.');
        return;
    }
    
    try {
        // Fusionner avec les données existantes
        const existingIds = tableData.map(item => item.id);
        let newCount = 0;
        let updateCount = 0;
        
        excelData.forEach(newItem => {
            const existingIndex = tableData.findIndex(item => item.id === newItem.id);
            
            if (existingIndex !== -1) {
                // Mettre à jour l'enregistrement existant
                tableData[existingIndex] = { ...tableData[existingIndex], ...newItem };
                updateCount++;
            } else {
                // Ajouter un nouvel enregistrement
                tableData.push(newItem);
                newCount++;
            }
        });
        
        // Mettre à jour le tableau
        table.setData(tableData);
        
        // Sauvegarder les données
        if (saveFleetData()) {
            // Afficher un message de succès
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success fixed bottom-4 right-4 w-auto shadow-lg z-50';
            successMessage.innerHTML = `
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Import réussi: ${newCount} nouveau(x), ${updateCount} mis à jour</span>
                </div>
            `;
            document.body.appendChild(successMessage);
            
            // Supprimer le message après 3 secondes
            setTimeout(() => {
                if (successMessage.parentNode) {
                    successMessage.parentNode.removeChild(successMessage);
                }
            }, 3000);
            
            // Fermer le modal
            closeImportModal();
            
            console.log(`Import terminé: ${newCount} nouveaux enregistrements, ${updateCount} mis à jour`);
        }
    } catch (error) {
        console.error('Erreur lors de l\'import des données:', error);
        alert('Erreur lors de l\'import des données.');
    }
}

// Afficher un aperçu des données à importer
function previewExcelData() {
    const previewContainer = document.getElementById('excel-preview');
    
    if (excelData.length === 0) {
        previewContainer.innerHTML = '<p class="text-gray-500">Aucune donnée à prévisualiser.</p>';
        return;
    }
    
    // Limiter l'aperçu aux 5 premiers enregistrements
    const previewData = excelData.slice(0, 5);
    
    let html = `
        <div class="overflow-x-auto">
            <table class="table table-compact w-full">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>N° de parc</th>
                        <th>Désignation</th>
                        <th>Parc Engins</th>
                        <th>Marque</th>
                        <th>Modèle</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    previewData.forEach(item => {
        html += `
            <tr>
                <td>${item.id || ''}</td>
                <td>${item.fleetnumber || ''}</td>
                <td>${item.designation || ''}</td>
                <td>${item.fleet || ''}</td>
                <td>${item.brand || ''}</td>
                <td>${item.model || ''}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    if (excelData.length > 5) {
        html += `<p class="text-sm text-gray-500 mt-2">... et ${excelData.length - 5} autre(s) enregistrement(s)</p>`;
    }
    
    previewContainer.innerHTML = html;
}

// Supprimer les lignes sélectionnées
function deleteSelectedRows() {
    console.log('Tentative de suppression des lignes sélectionnées');
    
    try {
        // Récupérer les lignes sélectionnées
        const selectedRows = table.getSelectedRows();
        console.log('Lignes sélectionnées:', selectedRows.length);
        
        if (selectedRows.length === 0) {
            console.log('Aucune ligne sélectionnée');
            return;
        }
        
        // Demander confirmation
        const confirmMessage = selectedRows.length === 1 
            ? 'Êtes-vous sûr de vouloir supprimer cette ligne ?' 
            : `Êtes-vous sûr de vouloir supprimer ces ${selectedRows.length} lignes ?`;
            
        if (confirm(confirmMessage)) {
            console.log('Confirmation reçue, suppression en cours...');
            
            // Récupérer les IDs des lignes à supprimer
            const selectedIds = selectedRows.map(row => row.getData().id);
            console.log('IDs à supprimer:', selectedIds);
            
            // Supprimer les lignes du tableau
            selectedRows.forEach(row => row.delete());
            
            // Mettre à jour tableData en filtrant les éléments supprimés
            tableData = tableData.filter(item => !selectedIds.includes(item.id));
            console.log('Données mises à jour, reste:', tableData.length, 'enregistrements');
            
            // Sauvegarder les modifications
            if (saveFleetData()) {
                // Afficher un message de confirmation
                const deleteMessage = document.createElement('div');
                deleteMessage.className = 'alert alert-success fixed bottom-4 right-4 w-auto shadow-lg z-50';
                deleteMessage.innerHTML = `
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>${selectedRows.length === 1 ? '1 ligne supprimée' : `${selectedRows.length} lignes supprimées`}</span>
                    </div>
                `;
                document.body.appendChild(deleteMessage);
                
                // Supprimer le message après 2 secondes
                setTimeout(() => {
                    if (deleteMessage.parentNode) {
                        deleteMessage.parentNode.removeChild(deleteMessage);
                    }
                }, 2000);
                
                console.log(`${selectedRows.length} ligne(s) supprimée(s) avec succès`);
            }
        } else {
            console.log('Suppression annulée par l\'utilisateur');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des lignes:', error);
        alert('Erreur lors de la suppression des lignes.');
    }
}

// Initialiser les onglets de catégories
function initializeCategoryTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    columnCategories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = `tab tab-bordered ${index === 0 ? 'tab-active' : ''}`;
        tab.innerHTML = `<i data-lucide="${category.icon}" class="w-4 h-4 mr-2"></i>${category.name}`;
        tab.onclick = function() {
            // Retirer la classe active de tous les onglets
            tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
            // Ajouter la classe active à l'onglet cliqué
            this.classList.add('tab-active');
            // Afficher les colonnes de cette catégorie
            showCategoryColumns(category.name);
        };
        tabsContainer.appendChild(tab);
    });
    
    // Réinitialiser les icônes Lucide
    lucide.createIcons();
}

// Afficher les colonnes d'une catégorie spécifique
// Fonction showCategoryColumns() supprimée

// Fonction pour ajouter un nouveau véhicule
function addNewVehicle() {
    // Demander l'ID du nouveau véhicule
    const newId = prompt("Entrez l'ID du nouveau véhicule :");
    
    // Vérifier si l'ID est valide
    if (!newId || newId.trim() === "") {
        alert("L'ID ne peut pas être vide.");
        return;
    }
    
    // Convertir en nombre si possible
    const numericId = parseInt(newId);
    const idToUse = isNaN(numericId) ? newId : numericId;
    
    // Vérifier si l'ID existe déjà
    const existingRow = tableData.find(row => {
        const rowId = typeof row.id === 'number' ? row.id : parseInt(row.id);
        const compareId = typeof idToUse === 'number' ? idToUse : parseInt(idToUse);
        
        if (isNaN(rowId) || isNaN(compareId)) {
            // Si l'un des deux n'est pas un nombre, comparer comme des chaînes
            return String(row.id) === String(idToUse);
        } else {
            // Sinon comparer comme des nombres
            return rowId === compareId;
        }
    });
    
    if (existingRow) {
        alert(`L'ID ${newId} est déjà utilisé. Veuillez choisir un autre ID.`);
        return;
    }
    
    // Créer un nouvel enregistrement avec l'ID spécifié
    const newRow = {
        id: idToUse
        // Les autres champs seront vides
    };
    
    // Ajouter la nouvelle ligne au début du tableau
    tableData.unshift(newRow);
    
    // Mettre à jour le tableau
    table.setData(tableData);
    
    // Sauvegarder les données
    saveFleetData();
    
    // Notification de succès
    alert(`Nouveau véhicule avec ID ${newId} ajouté avec succès.`);
    
    // Faire défiler vers le haut du tableau pour voir la nouvelle ligne
    table.scrollToRow(table.getRows()[0]);
}

// Fonctions de recherche globale
function matchAny(data, filterParams) {
    const searchValue = filterParams.value.toLowerCase();
    
    // Rechercher dans tous les champs texte
    const searchableFields = ['fleetnumber', 'designation', 'fleet', 'brand', 'model', 'serialnumber', 'affectation'];
    
    return searchableFields.some(field => {
        const value = data[field];
        return value && value.toString().toLowerCase().includes(searchValue);
    });
}

// Variable pour suivre l'état d'édition
let editModeActive = false;

// Basculer le mode d'édition
function toggleEditMode() {
    const editModeBtn = document.getElementById("edit-mode-btn");
    
    if (editModeActive) {
        // Désactiver le mode d'édition
        editModeActive = false;
        document.body.classList.remove('edit-mode-active');
        editModeBtn.classList.remove("btn-success");
        editModeBtn.classList.add("btn-outline");
        editModeBtn.innerHTML = '<i data-lucide="edit"></i> Activer modification';
        deactivateEditableColumns();
        
        console.log('Mode édition DÉSACTIVÉ');
    } else {
        // Activer le mode d'édition
        editModeActive = true;
        document.body.classList.add('edit-mode-active');
        editModeBtn.classList.remove("btn-outline");
        editModeBtn.classList.add("btn-success");
        editModeBtn.innerHTML = '<i data-lucide="check"></i> Modification activée';
        activateEditableColumns();
        
        console.log('Mode édition ACTIVÉ');
    }
    
    // Rafraîchir les icônes
    lucide.createIcons();
    
    // Rafraîchir le tableau pour appliquer les changements visuels
    if (table) {
        table.redraw(true);
    }
}

// Activer l'édition sur les colonnes
function activateEditableColumns() {
    if (!table) return;
    
    const editableFields = ['fleetnumber', 'designation', 'fleet', 'brand', 'model', 'serialnumber', 'affectation', 'hours', 'mileage'];
    
    editableFields.forEach(field => {
        const column = table.getColumn(field);
        if (column) {
            // Déterminer le type d'éditeur selon le champ
            let editor = "input";
            
            if (field === 'fleet' || field === 'affectation') {
                editor = "select";
            } else if (field === 'hours' || field === 'mileage') {
                editor = "number";
            }
            
            // Mettre à jour la définition de la colonne
            column.updateDefinition({
                editor: editor,
                editorParams: getEditorParams(field),
                cellEdited: onCellEdited
            });
        }
    });
    
    // S'assurer que la colonne ID n'est jamais éditable
    const idColumn = table.getColumn('id');
    if (idColumn) {
        idColumn.updateDefinition({
            editor: false
        });
    }
}

// Désactiver l'édition sur les colonnes
function deactivateEditableColumns() {
    if (!table) return;
    
    const editableFields = ['fleetnumber', 'designation', 'fleet', 'brand', 'model', 'serialnumber', 'affectation', 'hours', 'mileage'];
    
    editableFields.forEach(field => {
        const column = table.getColumn(field);
        if (column) {
            // Supprimer l'éditeur
            column.updateDefinition({
                editor: false
            });
        }
    });
}

// Obtenir les paramètres d'éditeur selon le champ
function getEditorParams(field) {
    switch (field) {
        case 'fleet':
            return {
                values: ['Bulldozer', 'Excavatrice', 'Camion', 'Grue', 'Compacteur', 'Autre']
            };
        case 'affectation':
            return {
                values: ['Chantier A', 'Chantier B', 'Chantier C', 'Dépôt central', 'Maintenance', 'Disponible']
            };
        case 'hours':
            return {
                min: 0,
                max: 99999,
                step: 1
            };
        case 'mileage':
            return {
                min: 0,
                max: 999999,
                step: 1
            };
        default:
            return {};
    }
}

// Fonction de sauvegarde automatique après édition
function onCellEdited(cell) {
    console.log('Cellule éditée:', cell.getField(), '=', cell.getValue());
    
    // Sauvegarder automatiquement les données
    const rowData = cell.getRow().getData();
    const fieldName = cell.getField();
    const newValue = cell.getValue();
    
    // Mettre à jour les données dans tableData
    const dataIndex = tableData.findIndex(item => item.id === rowData.id);
    if (dataIndex !== -1) {
        tableData[dataIndex][fieldName] = newValue;
        
        // Sauvegarder dans le localStorage
        saveFleetData();
        
        // Ajouter une classe pour l'animation de mise à jour
        const element = cell.getElement();
        element.classList.add('tabulator-cell-updated');
        
        // Retirer la classe après l'animation
        setTimeout(() => {
            element.classList.remove('tabulator-cell-updated');
        }, 1500);
        
        console.log('Données sauvegardées automatiquement');
    }
}

// Fonction pour afficher des notifications à l'utilisateur
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Ajouter l'icône selon le type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i data-lucide="check-circle" class="w-5 h-5 mr-2"></i>';
            break;
        case 'error':
            icon = '<i data-lucide="alert-circle" class="w-5 h-5 mr-2"></i>';
            break;
        case 'warning':
            icon = '<i data-lucide="alert-triangle" class="w-5 h-5 mr-2"></i>';
            break;
        default:
            icon = '<i data-lucide="info" class="w-5 h-5 mr-2"></i>';
    }
    
    // Définir le contenu
    notification.innerHTML = `
        <div class="flex items-center">
            ${icon}
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Initialiser les icônes Lucide
    lucide.createIcons();
    
    // Ajouter le gestionnaire d'événements pour fermer la notification
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            notification.classList.add('notification-hide');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }
    
    // Afficher la notification avec animation
    setTimeout(() => {
        notification.classList.add('notification-show');
    }, 10);
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}
