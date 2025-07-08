// fleet-buttons.js
// Ce fichier est dédié à la gestion des boutons de fleet.html

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Initialisation des boutons de fleet.html ===');
    
    // Fonction pour ajouter un nouveau véhicule
    window.addNewVehicleButton = function() {
        console.log('Fonction addNewVehicleButton appelée');
        
        // Demander l'ID du nouveau véhicule
        const newId = prompt("Entrez l'ID du nouveau véhicule :");
        
        // Vérifier si l'ID est valide
        if (!newId || newId.trim() === "") {
            alert("L'ID ne peut pas être vide.");
            return;
        }
        
        // Vérifier si les variables globales sont disponibles
        if (typeof window.tableData === 'undefined') {
            console.error('tableData n\'est pas défini');
            alert('Erreur: Les données du tableau ne sont pas disponibles.');
            return;
        }
        
        if (typeof window.table === 'undefined') {
            console.error('table n\'est pas défini');
            alert('Erreur: Le tableau n\'est pas initialisé.');
            return;
        }
        
        // Convertir en nombre si possible
        const numericId = parseInt(newId);
        const idToUse = isNaN(numericId) ? newId : numericId;
        
        // Vérifier si l'ID existe déjà
        const existingRow = window.tableData.find(row => {
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
        window.tableData.unshift(newRow);
        
        // Mettre à jour le tableau
        window.table.setData(window.tableData);
        
        // Sauvegarder les données
        if (typeof window.saveFleetData === 'function') {
            window.saveFleetData();
        } else {
            console.error('La fonction saveFleetData n\'est pas disponible');
            alert('Les données ont été ajoutées au tableau mais n\'ont pas pu être sauvegardées.');
        }
        
        // Notification de succès
        alert(`Nouveau véhicule avec ID ${newId} ajouté avec succès.`);
        
        // Faire défiler vers le haut du tableau pour voir la nouvelle ligne
        window.table.scrollToRow(window.table.getRows()[0]);
    };
    
    // Fonction pour supprimer les lignes sélectionnées
    window.deleteSelectedRowsButton = function() {
        console.log('Fonction deleteSelectedRowsButton appelée');
        
        // Vérifier si les variables globales sont disponibles
        if (typeof window.table === 'undefined') {
            console.error('table n\'est pas défini');
            alert('Erreur: Le tableau n\'est pas initialisé.');
            return;
        }
        
        if (typeof window.tableData === 'undefined') {
            console.error('tableData n\'est pas défini');
            alert('Erreur: Les données du tableau ne sont pas disponibles.');
            return;
        }
        
        try {
            // Récupérer les lignes sélectionnées
            const selectedRows = window.table.getSelectedRows();
            console.log('Lignes sélectionnées:', selectedRows.length);
            
            if (selectedRows.length === 0) {
                alert('Aucune ligne sélectionnée');
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
                window.tableData = window.tableData.filter(item => !selectedIds.includes(item.id));
                console.log('Données mises à jour, reste:', window.tableData.length, 'enregistrements');
                
                // Sauvegarder les modifications
                if (typeof window.saveFleetData === 'function') {
                    window.saveFleetData();
                    
                    // Afficher un message de confirmation
                    alert(`${selectedRows.length} ligne(s) supprimée(s) avec succès`);
                } else {
                    console.error('La fonction saveFleetData n\'est pas disponible');
                    alert('Les lignes ont été supprimées du tableau mais les modifications n\'ont pas pu être sauvegardées.');
                }
            } else {
                console.log('Suppression annulée par l\'utilisateur');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression des lignes:', error);
            alert('Erreur lors de la suppression des lignes: ' + error.message);
        }
    };
    
    // Attacher les gestionnaires d'événements aux boutons
    const attachButtonHandlers = function() {
        console.log('Attachement des gestionnaires aux boutons');
        
        // Bouton Nouveau
        const addBtn = document.getElementById('add-btn');
        if (addBtn) {
            console.log('Bouton NOUVEAU trouvé');
            addBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Bouton NOUVEAU cliqué');
                window.addNewVehicleButton();
            };
        } else {
            console.error('Bouton NOUVEAU non trouvé dans le DOM');
        }
        
        // Bouton Supprimer
        const deleteBtn = document.getElementById('delete-selected-button');
        if (deleteBtn) {
            console.log('Bouton SUPPRIMER trouvé');
            deleteBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Bouton SUPPRIMER cliqué');
                window.deleteSelectedRowsButton();
            };
        } else {
            console.error('Bouton SUPPRIMER non trouvé dans le DOM');
        }
    };
    
    // Attacher les gestionnaires immédiatement
    attachButtonHandlers();
    
    // Et aussi après un court délai pour s'assurer que le DOM est complètement chargé
    setTimeout(attachButtonHandlers, 1000);
});
