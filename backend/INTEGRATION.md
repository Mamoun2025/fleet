# Guide d'intégration du backend MongoDB avec l'application Fleet

Ce document explique comment intégrer le backend MongoDB avec l'application frontend Fleet existante.

## Architecture hybride

L'architecture hybride que nous avons mise en place permet de :
1. Continuer à utiliser le stockage local (`localStorage`) pour un fonctionnement hors ligne
2. Synchroniser les données avec le serveur MongoDB lorsque la connexion est disponible
3. Gérer les conflits de synchronisation
4. Supporter l'authentification des utilisateurs

## Étapes d'intégration

### 1. Créer un service de synchronisation

Créez un nouveau fichier `fleet-sync.js` dans le répertoire principal :

```javascript
// fleet-sync.js
let syncConfig = {
    serverUrl: 'http://localhost:3000',
    token: null,
    clientId: null,
    fleetId: null,
    lastSyncTimestamp: null,
    syncInterval: 60000, // 1 minute
    syncEnabled: false
};

// Initialiser la synchronisation
function initSync(token, clientId, fleetId) {
    syncConfig.token = token;
    syncConfig.clientId = clientId;
    syncConfig.fleetId = fleetId;
    syncConfig.lastSyncTimestamp = localStorage.getItem('lastSyncTimestamp') || new Date().toISOString();
    syncConfig.syncEnabled = true;
    
    // Démarrer la synchronisation périodique
    startPeriodicSync();
    
    console.log('Synchronisation initialisée');
}

// Démarrer la synchronisation périodique
function startPeriodicSync() {
    if (syncConfig.syncEnabled) {
        setInterval(() => {
            syncWithServer();
        }, syncConfig.syncInterval);
    }
}

// Synchroniser avec le serveur
async function syncWithServer() {
    if (!syncConfig.syncEnabled || !syncConfig.token) {
        console.log('Synchronisation désactivée ou non configurée');
        return;
    }
    
    try {
        // 1. Envoyer les modifications locales
        const unsyncedChanges = getUnsyncedChanges();
        if (unsyncedChanges.length > 0) {
            await uploadChanges(unsyncedChanges);
        }
        
        // 2. Récupérer les modifications du serveur
        await downloadChanges();
        
        // 3. Mettre à jour le timestamp de dernière synchronisation
        updateLastSyncTimestamp();
        
        console.log('Synchronisation réussie');
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
    }
}

// Récupérer les modifications non synchronisées
function getUnsyncedChanges() {
    const unsyncedChanges = JSON.parse(localStorage.getItem(`unsyncedChanges_${syncConfig.clientId}`) || '[]');
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
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Gérer les conflits
        if (result.conflicts && result.conflicts.length > 0) {
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
        const response = await fetch(`${syncConfig.serverUrl}/api/sync/changes?fleetId=${syncConfig.fleetId}&lastSyncTimestamp=${syncConfig.lastSyncTimestamp}`, {
            method: 'GET',
            headers: {
                'x-auth-token': syncConfig.token
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Appliquer les modifications
        if (result.changes && result.changes.length > 0) {
            applyServerChanges(result.changes);
        }
        
        return result;
    } catch (error) {
        console.error('Erreur lors de la récupération des modifications:', error);
        throw error;
    }
}

// Appliquer les modifications du serveur
function applyServerChanges(changes) {
    // Charger les données actuelles
    let tableData = JSON.parse(localStorage.getItem(`fleetData_${syncConfig.clientId}`) || '[]');
    
    // Appliquer chaque modification
    changes.forEach(change => {
        if (change.change_type === 'new') {
            // Ajouter un nouveau véhicule
            tableData.push(change.data);
        } else if (change.change_type === 'edit') {
            // Mettre à jour un véhicule existant
            const index = tableData.findIndex(item => item.id === change.vehicle_id);
            if (index !== -1) {
                tableData[index] = change.data;
            }
        } else if (change.change_type === 'delete') {
            // Supprimer un véhicule
            tableData = tableData.filter(item => item.id !== change.vehicle_id);
        }
    });
    
    // Sauvegarder les données mises à jour
    localStorage.setItem(`fleetData_${syncConfig.clientId}`, JSON.stringify(tableData));
    
    // Recharger le tableau si nécessaire
    if (typeof reloadTable === 'function') {
        reloadTable();
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
    notification.textContent = `${count} conflit(s) détecté(s). Veuillez les résoudre.`;
    
    // Ajouter un bouton pour résoudre les conflits
    const resolveButton = document.createElement('button');
    resolveButton.textContent = 'Résoudre';
    resolveButton.onclick = showConflictResolutionDialog;
    notification.appendChild(resolveButton);
    
    document.body.appendChild(notification);
    
    // Supprimer la notification après 10 secondes
    setTimeout(() => {
        notification.remove();
    }, 10000);
}

// Afficher le dialogue de résolution des conflits
function showConflictResolutionDialog() {
    // Implémenter cette fonction pour afficher un dialogue permettant à l'utilisateur de résoudre les conflits
    console.log('Affichage du dialogue de résolution des conflits');
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

// Exporter les fonctions
window.fleetSync = {
    initSync,
    syncWithServer,
    syncConfig
};
```

### 2. Modifier `fleet-core.js` pour supporter le stockage multi-client

Modifiez la fonction `loadFleetData` dans `fleet-core.js` :

```javascript
// Fonction pour charger les données de la flotte depuis le stockage local
function loadFleetData() {
    try {
        const clientId = getCurrentClientId(); // À implémenter
        const savedData = localStorage.getItem(`fleetData_${clientId}`) || localStorage.getItem('fleetData');
        
        if (savedData) {
            tableData = JSON.parse(savedData);
            // S'assurer que les ID sont des nombres pour le tri
            ensureNumericIds();
            console.log('Données chargées depuis le stockage local:', tableData.length, 'enregistrements');
        } else {
            tableData = [];
            console.log('Aucune donnée sauvegardée trouvée, initialisation avec un tableau vide');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        tableData = [];
    }
    
    return tableData;
}
```

Modifiez la fonction `saveFleetData` dans `fleet-core.js` :

```javascript
// Sauvegarder les données dans le stockage local
function saveFleetData() {
    try {
        const clientId = getCurrentClientId(); // À implémenter
        
        // Sauvegarder dans le stockage local
        localStorage.setItem(`fleetData_${clientId}`, JSON.stringify(tableData));
        console.log('Données sauvegardées dans le stockage local:', tableData.length, 'enregistrements');
        
        // Stocker les modifications pour synchronisation ultérieure
        storeUnsyncedChanges(tableData);
        
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

// Stocker les modifications non synchronisées
function storeUnsyncedChanges(data) {
    if (!window.fleetSync || !window.fleetSync.syncConfig.syncEnabled) {
        return;
    }
    
    const clientId = getCurrentClientId();
    const unsyncedChanges = JSON.parse(localStorage.getItem(`unsyncedChanges_${clientId}`) || '[]');
    
    // Ajouter les données actuelles comme une modification
    unsyncedChanges.push({
        data,
        timestamp: Date.now()
    });
    
    localStorage.setItem(`unsyncedChanges_${clientId}`, JSON.stringify(unsyncedChanges));
}

// Obtenir l'ID du client actuel
function getCurrentClientId() {
    // À implémenter : récupérer l'ID du client connecté
    // Pour l'instant, retourner un ID par défaut
    return localStorage.getItem('currentClientId') || 'default';
}
```

### 3. Créer une page de connexion

Créez un nouveau fichier `login.html` dans le répertoire principal :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion - Fleet Management</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            max-width: 400px;
            width: 100%;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo img {
            max-width: 150px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .btn-primary {
            width: 100%;
            padding: 10px;
            background-color: #4a6cf7;
            border: none;
        }
        .btn-primary:hover {
            background-color: #3a5bd9;
        }
        .register-link {
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h2>Fleet Management</h2>
        </div>
        <div id="error-message" class="alert alert-danger" style="display: none;"></div>
        <form id="login-form">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" class="form-control" id="email" required>
            </div>
            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" class="form-control" id="password" required>
            </div>
            <button type="submit" class="btn btn-primary">Se connecter</button>
        </form>
        <div class="register-link">
            <p>Pas encore de compte ? <a href="#" id="register-link">S'inscrire</a></p>
        </div>
    </div>

    <!-- Modal d'inscription -->
    <div class="modal fade" id="register-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Inscription</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="register-error" class="alert alert-danger" style="display: none;"></div>
                    <form id="register-form">
                        <div class="form-group mb-3">
                            <label for="register-name">Nom</label>
                            <input type="text" class="form-control" id="register-name" required>
                        </div>
                        <div class="form-group mb-3">
                            <label for="register-email">Email</label>
                            <input type="email" class="form-control" id="register-email" required>
                        </div>
                        <div class="form-group mb-3">
                            <label for="register-password">Mot de passe</label>
                            <input type="password" class="form-control" id="register-password" required>
                        </div>
                        <div class="form-group mb-3">
                            <label for="register-confirm-password">Confirmer le mot de passe</label>
                            <input type="password" class="form-control" id="register-confirm-password" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">S'inscrire</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // URL de l'API
        const API_URL = 'http://localhost:3000';
        
        // Modal d'inscription
        let registerModal;
        
        document.addEventListener('DOMContentLoaded', function() {
            // Initialiser le modal d'inscription
            registerModal = new bootstrap.Modal(document.getElementById('register-modal'));
            
            // Vérifier si l'utilisateur est déjà connecté
            const token = localStorage.getItem('token');
            if (token) {
                // Vérifier si le token est valide
                verifyToken(token);
            }
            
            // Gérer le formulaire de connexion
            document.getElementById('login-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                login(email, password);
            });
            
            // Gérer le lien d'inscription
            document.getElementById('register-link').addEventListener('click', function(e) {
                e.preventDefault();
                registerModal.show();
            });
            
            // Gérer le formulaire d'inscription
            document.getElementById('register-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                if (password !== confirmPassword) {
                    showRegisterError('Les mots de passe ne correspondent pas');
                    return;
                }
                
                register(name, email, password);
            });
        });
        
        // Fonction de connexion
        async function login(email, password) {
            try {
                const response = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erreur de connexion');
                }
                
                const data = await response.json();
                
                // Stocker le token
                localStorage.setItem('token', data.token);
                
                // Vérifier le token pour obtenir les informations du client
                await verifyToken(data.token);
                
                // Rediriger vers la page principale
                window.location.href = 'fleet.html';
            } catch (error) {
                showError(error.message);
            }
        }
        
        // Fonction d'inscription
        async function register(name, email, password) {
            try {
                const response = await fetch(`${API_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erreur d\'inscription');
                }
                
                const data = await response.json();
                
                // Stocker le token
                localStorage.setItem('token', data.token);
                
                // Vérifier le token pour obtenir les informations du client
                await verifyToken(data.token);
                
                // Fermer le modal
                registerModal.hide();
                
                // Rediriger vers la page principale
                window.location.href = 'fleet.html';
            } catch (error) {
                showRegisterError(error.message);
            }
        }
        
        // Vérifier le token
        async function verifyToken(token) {
            try {
                const response = await fetch(`${API_URL}/api/auth/verify`, {
                    method: 'GET',
                    headers: {
                        'x-auth-token': token
                    }
                });
                
                if (!response.ok) {
                    // Token invalide, supprimer le token
                    localStorage.removeItem('token');
                    throw new Error('Token invalide');
                }
                
                const client = await response.json();
                
                // Stocker l'ID du client
                localStorage.setItem('currentClientId', client._id);
                
                // Rediriger vers la page principale si on est sur la page de connexion
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'fleet.html';
                }
                
                return client;
            } catch (error) {
                console.error('Erreur de vérification du token:', error);
                return null;
            }
        }
        
        // Afficher une erreur de connexion
        function showError(message) {
            const errorElement = document.getElementById('error-message');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Masquer l'erreur après 5 secondes
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
        
        // Afficher une erreur d'inscription
        function showRegisterError(message) {
            const errorElement = document.getElementById('register-error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Masquer l'erreur après 5 secondes
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>
```

### 4. Modifier `fleet.html` pour intégrer la synchronisation

Ajoutez les scripts nécessaires à la fin de `fleet.html`, juste avant la fermeture de la balise `</body>` :

```html
<!-- Scripts de synchronisation -->
<script src="fleet-sync.js"></script>
<script>
    // Vérifier si l'utilisateur est connecté
    document.addEventListener('DOMContentLoaded', function() {
        const token = localStorage.getItem('token');
        if (!token) {
            // Rediriger vers la page de connexion
            window.location.href = 'login.html';
            return;
        }
        
        // Vérifier le token
        fetch(`http://localhost:3000/api/auth/verify`, {
            method: 'GET',
            headers: {
                'x-auth-token': token
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Token invalide');
            }
            return response.json();
        })
        .then(client => {
            // Stocker l'ID du client
            localStorage.setItem('currentClientId', client._id);
            
            // Initialiser la synchronisation
            // Pour l'instant, utiliser un ID de flotte par défaut
            // Dans une version future, permettre la sélection de la flotte
            const fleetId = localStorage.getItem('currentFleetId') || 'default';
            
            // Initialiser la synchronisation
            window.fleetSync.initSync(token, client._id, fleetId);
            
            // Ajouter un bouton de synchronisation manuelle
            addSyncButton();
        })
        .catch(error => {
            console.error('Erreur de vérification du token:', error);
            // Rediriger vers la page de connexion
            window.location.href = 'login.html';
        });
    });
    
    // Ajouter un bouton de synchronisation manuelle
    function addSyncButton() {
        const navbar = document.querySelector('.navbar-nav');
        
        if (navbar) {
            const syncItem = document.createElement('li');
            syncItem.className = 'nav-item';
            
            const syncButton = document.createElement('button');
            syncButton.className = 'btn btn-outline-light ms-2';
            syncButton.innerHTML = '<i class="lucide-refresh-cw"></i> Sync';
            syncButton.onclick = function() {
                window.fleetSync.syncWithServer()
                    .then(() => {
                        // Afficher un message de succès
                        const syncMessage = document.createElement('div');
                        syncMessage.className = 'sync-message';
                        syncMessage.textContent = 'Synchronisation réussie';
                        document.body.appendChild(syncMessage);
                        
                        // Supprimer le message après 2 secondes
                        setTimeout(() => {
                            syncMessage.remove();
                        }, 2000);
                    })
                    .catch(error => {
                        console.error('Erreur de synchronisation:', error);
                        
                        // Afficher un message d'erreur
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'error-message';
                        errorMessage.textContent = 'Erreur de synchronisation';
                        document.body.appendChild(errorMessage);
                        
                        // Supprimer le message après 2 secondes
                        setTimeout(() => {
                            errorMessage.remove();
                        }, 2000);
                    });
            };
            
            syncItem.appendChild(syncButton);
            navbar.appendChild(syncItem);
        }
    }
</script>
```

### 5. Ajouter des styles pour les notifications

Ajoutez ces styles à votre fichier CSS existant ou créez un nouveau fichier `fleet-sync.css` :

```css
/* Styles pour les notifications de synchronisation */
.sync-message, .error-message, .conflict-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 9999;
    animation: fadeIn 0.3s, fadeOut 0.3s 1.7s;
}

.sync-message {
    background-color: #28a745;
}

.error-message {
    background-color: #dc3545;
}

.conflict-notification {
    background-color: #ffc107;
    color: #212529;
    display: flex;
    align-items: center;
    gap: 10px;
}

.conflict-notification button {
    background-color: #212529;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
}
```

## Prochaines étapes

1. **Gestion des flottes** : Permettre à l'utilisateur de créer et gérer plusieurs flottes
2. **Gestion des conflits** : Implémenter une interface utilisateur pour résoudre les conflits de synchronisation
3. **Amélioration de la sécurité** : Ajouter des vérifications de sécurité supplémentaires
4. **Optimisation des performances** : Mettre en cache les données fréquemment utilisées
5. **Tests** : Effectuer des tests approfondis pour s'assurer que tout fonctionne correctement

## Conclusion

Cette intégration permet de combiner le meilleur des deux mondes : la rapidité et la disponibilité du stockage local avec la sécurité et la synchronisation d'une base de données MongoDB. Les utilisateurs peuvent travailler hors ligne et synchroniser leurs modifications lorsqu'ils sont connectés à Internet.
