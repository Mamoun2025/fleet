// Script de diagnostic pour identifier les problèmes avec les boutons
console.log('=== DIAGNOSTIC DÉMARRÉ ===');

// Fonction qui s'exécute après le chargement complet de la page
window.addEventListener('load', function() {
    console.log('=== PAGE ENTIÈREMENT CHARGÉE ===');
    
    // 1. Vérifier les variables globales essentielles
    console.log('--- Variables globales ---');
    console.log('table existe:', typeof window.table !== 'undefined');
    console.log('tableData existe:', typeof window.tableData !== 'undefined');
    console.log('saveFleetData existe:', typeof window.saveFleetData === 'function');
    
    // 2. Vérifier les fonctions des boutons
    console.log('--- Fonctions des boutons ---');
    console.log('addNewVehicle existe:', typeof window.addNewVehicle === 'function');
    console.log('deleteSelectedRows existe:', typeof window.deleteSelectedRows === 'function');
    console.log('addNewVehicleButton existe:', typeof window.addNewVehicleButton === 'function');
    console.log('deleteSelectedRowsButton existe:', typeof window.deleteSelectedRowsButton === 'function');
    
    // 3. Vérifier les éléments DOM
    console.log('--- Éléments DOM ---');
    const addBtn = document.getElementById('add-btn');
    const deleteBtn = document.getElementById('delete-selected-button');
    console.log('Bouton NOUVEAU trouvé:', addBtn !== null);
    console.log('Bouton SUPPRIMER trouvé:', deleteBtn !== null);
    
    if (addBtn) {
        console.log('Attributs du bouton NOUVEAU:', {
            id: addBtn.id,
            className: addBtn.className,
            onclick: addBtn.onclick ? 'défini' : 'non défini',
            disabled: addBtn.disabled
        });
    }
    
    if (deleteBtn) {
        console.log('Attributs du bouton SUPPRIMER:', {
            id: deleteBtn.id,
            className: deleteBtn.className,
            onclick: deleteBtn.onclick ? 'défini' : 'non défini',
            disabled: deleteBtn.disabled
        });
    }
    
    // 4. Examiner l'instance Tabulator
    console.log('--- Instance Tabulator ---');
    if (typeof window.table !== 'undefined') {
        console.log('Propriétés de table:', {
            element: window.table.element ? 'défini' : 'non défini',
            initialized: window.table.initialized,
            rowManager: window.table.rowManager ? 'défini' : 'non défini',
            columnManager: window.table.columnManager ? 'défini' : 'non défini'
        });
        
        // Vérifier si les méthodes essentielles sont disponibles
        console.log('Méthodes de table:', {
            getSelectedRows: typeof window.table.getSelectedRows === 'function',
            setData: typeof window.table.setData === 'function',
            scrollToRow: typeof window.table.scrollToRow === 'function'
        });
    }
    
    // 5. Remplacer les gestionnaires d'événements des boutons
    console.log('--- Remplacement des gestionnaires d\'événements ---');
    
    if (addBtn) {
        addBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Bouton NOUVEAU cliqué (gestionnaire de diagnostic)');
            
            try {
                // Vérifier si table et tableData existent
                if (typeof window.table === 'undefined') {
                    throw new Error('La variable table n\'est pas définie');
                }
                
                if (typeof window.tableData === 'undefined') {
                    throw new Error('La variable tableData n\'est pas définie');
                }
                
                // Demander l'ID du nouveau véhicule
                const newId = prompt("Entrez l'ID du nouveau véhicule :");
                if (!newId || newId.trim() === "") {
                    alert("L'ID ne peut pas être vide.");
                    return;
                }
                
                // Créer un nouvel enregistrement
                const newRow = { id: parseInt(newId) || newId };
                
                // Ajouter la nouvelle ligne
                window.tableData.unshift(newRow);
                window.table.setData(window.tableData);
                
                // Sauvegarder si possible
                if (typeof window.saveFleetData === 'function') {
                    window.saveFleetData();
                } else {
                    console.error('Fonction saveFleetData non disponible');
                    // Sauvegarde de secours dans localStorage
                    localStorage.setItem('fleetData_' + (localStorage.getItem('currentFleetId') || 'temp'), 
                                        JSON.stringify(window.tableData));
                    console.log('Sauvegarde de secours effectuée dans localStorage');
                }
                
                alert(`Nouveau véhicule avec ID ${newId} ajouté avec succès.`);
                
            } catch (error) {
                console.error('Erreur lors de l\'ajout:', error);
                alert('Erreur lors de l\'ajout: ' + error.message);
            }
        };
        console.log('Gestionnaire d\'événement du bouton NOUVEAU remplacé');
    }
    
    if (deleteBtn) {
        deleteBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Bouton SUPPRIMER cliqué (gestionnaire de diagnostic)');
            
            try {
                // Vérifier si table et tableData existent
                if (typeof window.table === 'undefined') {
                    throw new Error('La variable table n\'est pas définie');
                }
                
                if (typeof window.tableData === 'undefined') {
                    throw new Error('La variable tableData n\'est pas définie');
                }
                
                // Récupérer les lignes sélectionnées
                const selectedRows = window.table.getSelectedRows();
                console.log('Lignes sélectionnées:', selectedRows.length);
                
                if (selectedRows.length === 0) {
                    alert('Aucune ligne sélectionnée');
                    return;
                }
                
                // Demander confirmation
                if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRows.length} ligne(s) ?`)) {
                    // Récupérer les IDs et supprimer
                    const selectedIds = selectedRows.map(row => row.getData().id);
                    selectedRows.forEach(row => row.delete());
                    
                    // Mettre à jour tableData
                    window.tableData = window.tableData.filter(item => !selectedIds.includes(item.id));
                    
                    // Sauvegarder si possible
                    if (typeof window.saveFleetData === 'function') {
                        window.saveFleetData();
                    } else {
                        console.error('Fonction saveFleetData non disponible');
                        // Sauvegarde de secours dans localStorage
                        localStorage.setItem('fleetData_' + (localStorage.getItem('currentFleetId') || 'temp'), 
                                            JSON.stringify(window.tableData));
                        console.log('Sauvegarde de secours effectuée dans localStorage');
                    }
                    
                    alert(`${selectedRows.length} ligne(s) supprimée(s) avec succès`);
                }
                
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                alert('Erreur lors de la suppression: ' + error.message);
            }
        };
        console.log('Gestionnaire d\'événement du bouton SUPPRIMER remplacé');
    }
    
    // 6. Créer un bouton de secours
    console.log('--- Création d\'un bouton de secours ---');
    const emergencyButton = document.createElement('button');
    emergencyButton.innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4 mr-1"></i> NOUVEAU (Secours)';
    emergencyButton.className = 'btn btn-sm btn-warning ml-2';
    emergencyButton.onclick = function() {
        console.log('Bouton de secours cliqué');
        
        try {
            // Code simplifié pour ajouter un véhicule
            const newId = prompt("Entrez l'ID du nouveau véhicule (secours):");
            if (!newId || newId.trim() === "") return;
            
            // Récupérer les données existantes
            let tableData;
            try {
                const storageKey = `fleetData_${localStorage.getItem('currentFleetId') || 'temp'}`;
                const storedData = localStorage.getItem(storageKey);
                tableData = storedData ? JSON.parse(storedData) : [];
            } catch (e) {
                tableData = [];
                console.error('Erreur lors de la récupération des données:', e);
            }
            
            // Ajouter le nouvel élément
            tableData.unshift({ id: parseInt(newId) || newId });
            
            // Sauvegarder
            const storageKey = `fleetData_${localStorage.getItem('currentFleetId') || 'temp'}`;
            localStorage.setItem(storageKey, JSON.stringify(tableData));
            
            alert(`Véhicule ajouté avec succès. Rechargez la page pour voir les changements.`);
            
        } catch (error) {
            console.error('Erreur avec le bouton de secours:', error);
            alert('Erreur: ' + error.message);
        }
    };
    
    // Ajouter le bouton de secours à côté du bouton NOUVEAU
    if (addBtn && addBtn.parentNode) {
        addBtn.parentNode.appendChild(emergencyButton);
        console.log('Bouton de secours ajouté au DOM');
    }
    
    // Initialiser les icônes Lucide
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
        console.log('Icônes Lucide réinitialisées');
    }
});

// Exécuter également un diagnostic immédiat
(function() {
    console.log('=== DIAGNOSTIC IMMÉDIAT ===');
    console.log('Document ready state:', document.readyState);
    
    // Vérifier les variables globales
    console.log('table:', typeof window.table);
    console.log('tableData:', typeof window.tableData);
    
    // Vérifier les éléments DOM
    const addBtn = document.getElementById('add-btn');
    const deleteBtn = document.getElementById('delete-selected-button');
    console.log('Bouton NOUVEAU trouvé:', addBtn !== null);
    console.log('Bouton SUPPRIMER trouvé:', deleteBtn !== null);
})();
