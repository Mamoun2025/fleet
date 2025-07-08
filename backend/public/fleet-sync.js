/**
 * Fleet Sync - Module de synchronisation pour Fleet Management
 * 
 * Ce module gère la synchronisation bidirectionnelle entre le stockage local
 * et le serveur MongoDB, permettant un fonctionnement hybride de l'application.
 */

// Configuration de la synchronisation
let syncConfig = {
    serverUrl: 'http://localhost:3000',
    token: null,
    clientId: null,
    fleetId: null,
    lastSyncTimestamp: null,
    syncInterval: 60000, // 1 minute par défaut
    syncEnabled: false,
    autoSync: true,
    syncInProgress: false
};

// Initialiser la synchronisation
function initSync(token, clientId, fleetId) {
    console.log('Initialisation de la synchronisation...');
    
    // Si mode démo, ne pas initialiser la synchronisation
    if (localStorage.getItem('demoMode') === 'true') {
        console.log('Mode démo actif, synchronisation désactivée');
        return;
    }
    
    if (!token || !clientId) {
        console.log('Token ou ID client manquant, synchronisation désactivée');
        return;
    }
    
    syncConfig.token = token;
    syncConfig.clientId = clientId;
    syncConfig.fleetId = fleetId || localStorage.getItem('currentFleetId');
    syncConfig.lastSyncTimestamp = localStorage.getItem('lastSyncTimestamp') || new Date().toISOString();
    syncConfig.syncEnabled = true;
    
    // Démarrer la synchronisation périodique si activée
    if (syncConfig.autoSync) {
        startPeriodicSync();
    }
    
    console.log('Synchronisation initialisée pour le client:', clientId);
}

// Démarrer la synchronisation périodique
function startPeriodicSync() {
    if (syncConfig.syncEnabled) {
        console.log('Démarrage de la synchronisation périodique...');
        
        // Synchroniser immédiatement au démarrage
        syncWithServer();
        
        // Puis toutes les X minutes
        setInterval(() => {
            if (!syncConfig.syncInProgress) {
                syncWithServer();
            }
        }, syncConfig.syncInterval);
    }
}

// Synchroniser avec le serveur
async function syncWithServer() {
    if (!syncConfig.syncEnabled || !syncConfig.token || syncConfig.syncInProgress) {
        console.log('Synchronisation désactivée, non configurée ou déjà en cours');
        return;
    }
    
    try {
        syncConfig.syncInProgress = true;
        console.log('Début de la synchronisation...');
        
        // 1. Envoyer les modifications locales
        const unsyncedChanges = getUnsyncedChanges();
        if (unsyncedChanges.length > 0) {
            console.log(`Envoi de ${unsyncedChanges.length} modifications au serveur...`);
            await uploadChanges(unsyncedChanges);
        } else {
            console.log('Aucune modification locale à synchroniser');
        }
        
        // 2. Récupérer les modifications du serveur
        console.log('Récupération des modifications du serveur...');
        const serverChanges = await downloadChanges();
        
        // 3. Mettre à jour le timestamp de dernière synchronisation
        updateLastSyncTimestamp();
        
        // Afficher un message de succès
        showSyncNotification('success', 'Synchronisation réussie');
        console.log('Synchronisation terminée avec succès');
        
        return {
            uploaded: unsyncedChanges.length,
            downloaded: serverChanges ? serverChanges.length : 0
        };
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        showSyncNotification('error', 'Erreur de synchronisation');
        return {
            error: error.message
        };
    } finally {
        syncConfig.syncInProgress = false;
    }
}

// Récupérer les modifications non synchronisées
function getUnsyncedChanges() {
    const key = `unsyncedChanges_${syncConfig.clientId}`;
    const unsyncedChanges = JSON.parse(localStorage.getItem(key) || '[]');
    return unsyncedChanges;
}

// Envoyer les modifications au serveur
async function uploadChanges(changes) {
    try {
        const response = await fetch(`${syncConfig.serverUrl}/api/sync/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': syncConfig.token
            },
            body: JSON.stringify({
                fleetId: syncConfig.fleetId,
                data: changes,
                lastSyncTimestamp: syncConfig.lastSyncTimestamp
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Gérer les conflits
        if (result.conflicts && result.conflicts.length > 0) {
            console.log(`${result.conflicts.length} conflits détectés`);
            handleConflicts(result.conflicts);
        }
        
        // Supprimer les modifications synchronisées
        clearUnsyncedChanges();
        
        return result;
    } catch (error) {
        console.error('Erreur lors de l\'envoi des modifications:', error);
        throw error;
    }
}

// Récupérer les modifications du serveur
async function downloadChanges() {
    try {
        const url = `${syncConfig.serverUrl}/api/sync/changes?fleetId=${syncConfig.fleetId}&lastSyncTimestamp=${encodeURIComponent(syncConfig.lastSyncTimestamp)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-auth-token': syncConfig.token
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Appliquer les modifications
        if (result.changes && result.changes.length > 0) {
            console.log(`Application de ${result.changes.length} modifications du serveur...`);
            applyServerChanges(result.changes);
            return result.changes;
        } else {
            console.log('Aucune modification serveur à appliquer');
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des modifications:', error);
        throw error;
    }
}

// Appliquer les modifications du serveur
function applyServerChanges(changes) {
    // Charger les données actuelles
    let tableData = JSON.parse(localStorage.getItem(`fleetData_${syncConfig.clientId}`) || '[]');
    let modified = false;
    
    // Appliquer chaque modification
    changes.forEach(change => {
        if (change.change_type === 'new') {
            // Ajouter un nouveau véhicule
            tableData.push(change.data);
            modified = true;
        } else if (change.change_type === 'edit') {
            // Mettre à jour un véhicule existant
            const index = tableData.findIndex(item => item.id === change.vehicle_id);
            if (index !== -1) {
                tableData[index] = change.data;
                modified = true;
            }
        } else if (change.change_type === 'delete') {
            // Supprimer un véhicule
            const initialLength = tableData.length;
            tableData = tableData.filter(item => item.id !== change.vehicle_id);
            if (tableData.length !== initialLength) {
                modified = true;
            }
        }
    });
    
    if (modified) {
        // Sauvegarder les données mises à jour
        localStorage.setItem(`fleetData_${syncConfig.clientId}`, JSON.stringify(tableData));
        
        // Recharger le tableau si nécessaire
        if (typeof window.reloadTable === 'function') {
            window.reloadTable();
        } else if (typeof table !== 'undefined' && table) {
            table.setData(tableData);
        }
    }
}

// Gérer les conflits
function handleConflicts(conflicts) {
    // Stocker les conflits pour résolution ultérieure
    localStorage.setItem(`conflicts_${syncConfig.clientId}`, JSON.stringify(conflicts));
    
    // Afficher une notification à l'utilisateur
    showConflictNotification(conflicts.length);
}

// Afficher une notification de conflit
function showConflictNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'conflict-notification';
    notification.innerHTML = `
        <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>${count} conflit(s) détecté(s). Veuillez les résoudre.</span>
        </div>
        <button id="resolve-conflicts-btn" class="btn btn-sm btn-warning ml-4">Résoudre</button>
    `;
    
    // Styles pour la notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#ffc107';
    notification.style.color = '#212529';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '9999';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.justifyContent = 'space-between';
    
    document.body.appendChild(notification);
    
    // Ajouter l'événement au bouton de résolution
    document.getElementById('resolve-conflicts-btn').addEventListener('click', showConflictResolutionDialog);
    
    // Supprimer la notification après 30 secondes si non résolue
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 30000);
}

// Afficher le dialogue de résolution des conflits
function showConflictResolutionDialog() {
    // Récupérer les conflits
    const conflicts = JSON.parse(localStorage.getItem(`conflicts_${syncConfig.clientId}`) || '[]');
    
    if (conflicts.length === 0) {
        showSyncNotification('info', 'Aucun conflit à résoudre');
        return;
    }
    
    // Créer le modal de résolution
    const modal = document.createElement('div');
    modal.className = 'conflict-resolution-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Résolution des conflits (${conflicts.length})</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p class="text-sm mb-4">Des conflits ont été détectés lors de la synchronisation. Veuillez choisir quelle version conserver pour chaque conflit.</p>
                <div class="conflicts-container">
                    ${conflicts.map((conflict, index) => `
                        <div class="conflict-item mb-4 p-4 border rounded">
                            <h4 class="font-bold">Conflit #${index + 1} - Véhicule ID: ${conflict.vehicle_id}</h4>
                            <div class="grid grid-cols-2 gap-4 mt-2">
                                <div class="local-version p-2 bg-blue-50 rounded">
                                    <h5 class="font-semibold">Version locale</h5>
                                    <pre class="text-xs mt-2 overflow-auto max-h-40">${JSON.stringify(conflict.localData, null, 2)}</pre>
                                </div>
                                <div class="server-version p-2 bg-green-50 rounded">
                                    <h5 class="font-semibold">Version serveur</h5>
                                    <pre class="text-xs mt-2 overflow-auto max-h-40">${JSON.stringify(conflict.serverData, null, 2)}</pre>
                                </div>
                            </div>
                            <div class="resolution-buttons mt-3 flex justify-center">
                                <button class="btn btn-sm btn-outline btn-info keep-local" data-index="${index}">Garder version locale</button>
                                <button class="btn btn-sm btn-outline btn-success keep-server ml-2" data-index="${index}">Garder version serveur</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline cancel-btn">Annuler</button>
                <button class="btn btn-primary resolve-all-btn">Résoudre tous les conflits</button>
            </div>
        </div>
    `;
    
    // Styles pour le modal
    const style = document.createElement('style');
    style.textContent = `
        .conflict-resolution-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
        }
        .modal-content {
            position: relative;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
        }
        .modal-header {
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-body {
            padding: 1rem;
            overflow-y: auto;
            flex-grow: 1;
        }
        .modal-footer {
            padding: 1rem;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Gérer la fermeture du modal
    const closeModal = () => {
        modal.remove();
        style.remove();
    };
    
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    
    // Gérer la résolution des conflits
    const resolutions = new Array(conflicts.length).fill(null);
    
    // Boutons "Garder version locale"
    modal.querySelectorAll('.keep-local').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.dataset.index);
            resolutions[index] = 'local';
            button.classList.add('btn-info');
            button.classList.remove('btn-outline');
            const serverBtn = modal.querySelector(`.keep-server[data-index="${index}"]`);
            serverBtn.classList.add('btn-outline');
            serverBtn.classList.remove('btn-success');
        });
    });
    
    // Boutons "Garder version serveur"
    modal.querySelectorAll('.keep-server').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.dataset.index);
            resolutions[index] = 'server';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline');
            const localBtn = modal.querySelector(`.keep-local[data-index="${index}"]`);
            localBtn.classList.add('btn-outline');
            localBtn.classList.remove('btn-info');
        });
    });
    
    // Bouton "Résoudre tous les conflits"
    modal.querySelector('.resolve-all-btn').addEventListener('click', () => {
        // Vérifier que tous les conflits ont été résolus
        if (resolutions.some(r => r === null)) {
            alert('Veuillez résoudre tous les conflits avant de continuer.');
            return;
        }
        
        // Appliquer les résolutions
        resolveConflicts(conflicts, resolutions);
        closeModal();
    });
}

// Résoudre les conflits
async function resolveConflicts(conflicts, resolutions) {
    try {
        // Charger les données actuelles
        let tableData = JSON.parse(localStorage.getItem(`fleetData_${syncConfig.clientId}`) || '[]');
        let modified = false;
        
        // Appliquer chaque résolution
        conflicts.forEach((conflict, index) => {
            const resolution = resolutions[index];
            const vehicleId = conflict.vehicle_id;
            
            if (resolution === 'local') {
                // Garder la version locale, envoyer au serveur
                sendResolutionToServer(vehicleId, conflict.localData, 'local');
            } else if (resolution === 'server') {
                // Garder la version serveur, mettre à jour en local
                const dataIndex = tableData.findIndex(item => item.id === vehicleId);
                if (dataIndex !== -1) {
                    tableData[dataIndex] = conflict.serverData;
                    modified = true;
                }
            }
        });
        
        if (modified) {
            // Sauvegarder les données mises à jour
            localStorage.setItem(`fleetData_${syncConfig.clientId}`, JSON.stringify(tableData));
            
            // Recharger le tableau si nécessaire
            if (typeof window.reloadTable === 'function') {
                window.reloadTable();
            } else if (typeof table !== 'undefined' && table) {
                table.setData(tableData);
            }
        }
        
        // Supprimer les conflits résolus
        localStorage.removeItem(`conflicts_${syncConfig.clientId}`);
        
        // Afficher une notification de succès
        showSyncNotification('success', 'Conflits résolus avec succès');
    } catch (error) {
        console.error('Erreur lors de la résolution des conflits:', error);
        showSyncNotification('error', 'Erreur lors de la résolution des conflits');
    }
}

// Envoyer la résolution au serveur
async function sendResolutionToServer(vehicleId, data, resolution) {
    try {
        const response = await fetch(`${syncConfig.serverUrl}/api/sync/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': syncConfig.token
            },
            body: JSON.stringify({
                fleetId: syncConfig.fleetId,
                vehicleId,
                data,
                resolution
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la résolution au serveur:', error);
        throw error;
    }
}

// Mettre à jour le timestamp de dernière synchronisation
function updateLastSyncTimestamp() {
    const now = new Date().toISOString();
    syncConfig.lastSyncTimestamp = now;
    localStorage.setItem('lastSyncTimestamp', now);
}

// Supprimer les modifications synchronisées
function clearUnsyncedChanges() {
    localStorage.removeItem(`unsyncedChanges_${syncConfig.clientId}`);
}

// Afficher une notification de synchronisation
function showSyncNotification(type, message) {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `sync-notification sync-${type}`;
    notification.textContent = message;
    
    // Styles pour la notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '9999';
    notification.style.animation = 'fadeInOut 3s forwards';
    
    // Couleur selon le type
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else if (type === 'info') {
        notification.style.backgroundColor = '#17a2b8';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#ffc107';
        notification.style.color = '#212529';
    }
    
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

// Enregistrer une modification pour synchronisation ultérieure
function trackChange(vehicleId, data, changeType) {
    if (!syncConfig.syncEnabled || localStorage.getItem('demoMode') === 'true') {
        return;
    }
    
    const key = `unsyncedChanges_${syncConfig.clientId}`;
    const unsyncedChanges = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Ajouter la modification
    unsyncedChanges.push({
        vehicle_id: vehicleId,
        data,
        change_type: changeType,
        timestamp: new Date().toISOString(),
        user_info: {
            client_id: syncConfig.clientId,
            fleet_id: syncConfig.fleetId
        }
    });
    
    // Sauvegarder les modifications
    localStorage.setItem(key, JSON.stringify(unsyncedChanges));
    
    console.log(`Modification "${changeType}" enregistrée pour synchronisation ultérieure:`, vehicleId);
}

// Exporter les fonctions
window.fleetSync = {
    initSync,
    syncWithServer,
    trackChange,
    syncConfig
};
