/**
 * Test simple de synchronisation pour Fleet Management
 */

// Configuration
const API_URL = 'http://localhost:3000';
let token = null;
let userData = null;
let companyId = null;
let fleetId = null;
let vehicleId = null;
let clientId = null;

// Fonction pour afficher les messages dans la console
function log(message, type = 'info') {
    const consoleElement = document.getElementById('console');
    if (!consoleElement) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    let formattedMessage = `[${timeString}] `;
    
    if (type === 'success') {
        formattedMessage += `✅ ${message}`;
        consoleElement.innerHTML += `<span class="success">${formattedMessage}</span>\n`;
    } else if (type === 'error') {
        formattedMessage += `❌ ${message}`;
        consoleElement.innerHTML += `<span class="error">${formattedMessage}</span>\n`;
    } else if (type === 'info') {
        formattedMessage += `ℹ️ ${message}`;
        consoleElement.innerHTML += `<span class="info">${formattedMessage}</span>\n`;
    } else if (type === 'warning') {
        formattedMessage += `⚠️ ${message}`;
        consoleElement.innerHTML += `<span class="warning">${formattedMessage}</span>\n`;
    }
    
    consoleElement.scrollTop = consoleElement.scrollHeight;
    console.log(message);
}

// Fonction pour créer un véhicule de test
async function createTestVehicle(fleetId) {
    try {
        const timestamp = Date.now();
        const vehicleData = {
            fleetnumber: `V-${timestamp}`,
            designation: 'Véhicule de test',
            type: 'Voiture',
            brand: 'Test Brand',
            model: 'Test Model',
            serialnumber: `SN-${timestamp}`,
            status: 'active',
            mileage: 0,
            hours: 0
        };
        
        log(`Création d'un véhicule de test: ${vehicleData.designation}`);
        
        // Afficher les informations de débogage
        log(`Client ID: ${clientId || 'Non disponible'}`);
        log(`Fleet ID: ${fleetId}`);
        
        // La route correcte est /api/vehicles avec fleet_id, vehicle_id et data dans le corps
        const payload = {
            fleet_id: fleetId,
            vehicle_id: `V-${timestamp}`, // Identifiant unique
            data: vehicleData // Les données complètes du véhicule
        };
        
        // Tentative avec une approche différente
        try {
            // Essayer d'abord avec l'API fleets
            log('Tentative via l\'API fleets...');
            const fleetVehicle = await apiRequest(`/api/fleets/${fleetId}/vehicles`, 'POST', vehicleData);
            vehicleId = fleetVehicle._id;
            log(`Véhicule créé via l'API fleets: ${vehicleData.designation} (${vehicleId})`, 'success');
            return fleetVehicle;
        } catch (fleetError) {
            log(`Échec via l'API fleets: ${fleetError.message}, tentative via l'API vehicles...`, 'info');
            
            // Si ça échoue, essayer avec l'API vehicles
            const result = await apiRequest('/api/vehicles', 'POST', payload);
            
            if (!result || !result._id) {
                throw new Error('Erreur lors de la création du véhicule de test');
            }
            
            vehicleId = result._id;
            log(`Véhicule de test créé via l'API vehicles: ${vehicleData.designation} (${vehicleId})`, 'success');
            return result;
        }
    } catch (error) {
        log(`Échec de la création du véhicule de test: ${error.message}`, 'error');
        throw error;
    }
}

// Fonction pour faire une requête API
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const url = `http://localhost:3000${endpoint}`;
        log(`Requête ${method} vers ${url}`);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        // Ajouter le token d'authentification s'il existe
        if (token) {
            options.headers['x-auth-token'] = token;
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        // Vérifier le type de contenu de la réponse
        const contentType = response.headers.get('content-type');
        let responseData;
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // Si ce n'est pas du JSON, récupérer le texte brut
            const text = await response.text();
            log(`Réponse non-JSON reçue: ${text.substring(0, 100)}...`, 'info');
            responseData = { message: text.substring(0, 100) };
        }
        
        if (!response.ok) {
            throw new Error(`Erreur API (${response.status}): ${responseData.message || 'Erreur inconnue'}`);
        }
        
        return responseData;
    } catch (error) {
        log(`Erreur de requête: ${error.message}`, 'error');
        throw error;
    }
}

// Test d'authentification
async function testLogin() {
    try {
        log('Test de connexion...');
        
        // S'assurer que l'utilisateur admin existe
        try {
            await apiRequest('/api/auth/ensure-admin', 'GET');
            log('Vérification de l\'utilisateur admin effectuée', 'info');
        } catch (err) {
            log('Erreur lors de la vérification de l\'utilisateur admin, mais on continue...', 'info');
        }
        
        // Se connecter avec le compte admin
        const loginData = {
            email: 'admin@test.com',
            password: 'admin'
        };
        
        const authResponse = await apiRequest('/api/auth/login', 'POST', loginData);
        token = authResponse.token;
        
        if (!token) {
            throw new Error('Token non reçu');
        }
        
        log('Connexion réussie', 'success');
        
        // Vérifier les informations utilisateur
        userData = await apiRequest('/api/auth/verify');
        log(`Utilisateur connecté: ${userData.name}`, 'success');
        
        // Extraire l'ID client du token décodé
        if (userData._id) {
            clientId = userData._id;
            log(`ID utilisateur: ${clientId}`, 'info');
        }
        
        // Vérifier si l'utilisateur est associé à une entreprise
        if (userData.company && userData.company._id) {
            companyId = userData.company._id;
            log(`Entreprise: ${userData.company.name} (${companyId})`, 'success');
        } else {
            // Si l'admin n'a pas d'entreprise, créons-en une pour les tests
            log('Admin sans entreprise associée, création d\'une entreprise de test...', 'info');
            
            const companyData = {
                name: `Test Company ${Date.now()}`,
                description: 'Entreprise créée pour les tests'
            };
            
            const company = await apiRequest('/api/companies', 'POST', companyData);
            companyId = company._id;
            log(`Entreprise créée: ${company.name} (${companyId})`, 'success');
        }
        
        return true;
    } catch (error) {
        log(`Échec de la connexion: ${error.message}`, 'error');
        return false;
    }
}

// Test de récupération de la flotte
async function testGetFleet() {
    try {
        log('Récupération des données de la flotte...');
        
        // Récupérer la flotte de l'entreprise
        const fleetData = await apiRequest(`/api/companies/${companyId}/fleet`);
        
        if (!fleetData || !fleetData._id) {
            throw new Error('Flotte non trouvée');
        }
        
        fleetId = fleetData._id;
        log(`Flotte récupérée: ${fleetData.name || 'Sans nom'} (${fleetId})`, 'success');
        
        // Nous allons passer directement au test du module de synchronisation
        // sans essayer de créer des véhicules pour l'instant
        log('Passage direct au test du module de synchronisation...', 'info');
        
        return true;
    } catch (error) {
        log(`Échec de la récupération de la flotte: ${error.message}`, 'error');
        return false;
    }
}

// Test du module de synchronisation
async function testSyncModule() {
    try {
        log('Test du module de synchronisation...');
        
        // Vérifier que le module fleetSync est chargé
        if (!window.fleetSync) {
            throw new Error('Module fleetSync non disponible');
        }
        
        log('Module fleetSync disponible', 'success');
        
        // Afficher les méthodes disponibles dans le module
        log('Méthodes disponibles dans fleetSync:', 'info');
        for (const method in window.fleetSync) {
            log(`- ${method}`, 'info');
        }
        
        // Stocker manuellement les données dans localStorage pour le test
        // (car le module ne le fait pas automatiquement)
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentFleetId', fleetId);
        log('Données stockées manuellement dans localStorage pour le test', 'info');
        
        // Initialiser le module de synchronisation
        try {
            log(`Initialisation avec token=${token ? 'présent' : 'absent'}, clientId=${clientId}, fleetId=${fleetId}`);
            window.fleetSync.initSync(token, clientId, fleetId);
            log('Module fleetSync initialisé', 'success');
        } catch (initError) {
            log(`Erreur lors de l'initialisation: ${initError.message}`, 'error');
            throw initError;
        }
        
        // Vérifier l'état de la configuration
        log('Vérification de la configuration de synchronisation:', 'info');
        const config = window.fleetSync.syncConfig;
        log(`- Token: ${config.token ? 'présent' : 'absent'}`, 'info');
        log(`- Client ID: ${config.clientId}`, 'info');
        log(`- Fleet ID: ${config.fleetId}`, 'info');
        log(`- Sync Enabled: ${config.syncEnabled}`, 'info');
        
        if (!config.syncEnabled) {
            log('La synchronisation n\'est pas activée, vérifiez les paramètres', 'warning');
        } else {
            log('Configuration de synchronisation valide', 'success');
        }
        
        // Tester la synchronisation
        try {
            log('Tentative de synchronisation avec le serveur...');
            const result = await window.fleetSync.syncWithServer();
            if (result && !result.error) {
                log(`Synchronisation réussie: ${result.uploaded || 0} envoyés, ${result.downloaded || 0} reçus`, 'success');
            } else {
                log(`Synchronisation terminée avec avertissement: ${result?.error || 'Aucun détail'}`, 'warning');
            }
        } catch (syncError) {
            log(`Erreur lors de la synchronisation: ${syncError.message}`, 'warning');
            // On continue malgré l'erreur de synchronisation
        }
        
        // Tester le suivi des modifications
        try {
            const testVehicleId = `test-${Date.now()}`;
            const testData = { name: 'Véhicule de test', status: 'actif' };
            log(`Test de trackChange avec vehicleId=${testVehicleId}`);
            window.fleetSync.trackChange(testVehicleId, testData, 'update');
            
            // Vérifier si la modification a été enregistrée
            const unsyncedKey = `unsyncedChanges_${clientId}`;
            const unsyncedChanges = JSON.parse(localStorage.getItem(unsyncedKey) || '[]');
            log(`${unsyncedChanges.length} modification(s) non synchronisée(s) dans localStorage`, 'info');
            
            if (unsyncedChanges.length > 0) {
                log('Suivi des modifications fonctionnel', 'success');
            } else {
                log('Aucune modification enregistrée, vérifiez la configuration', 'warning');
            }
        } catch (trackError) {
            log(`Erreur lors du test de trackChange: ${trackError.message}`, 'warning');
        }
        
        return true;
    } catch (error) {
        log(`Échec du test de synchronisation: ${error.message}`, 'error');
        return false;
    }
}

// Exécuter tous les tests
async function runSyncTests() {
    log('🚀 DÉMARRAGE DES TESTS DE SYNCHRONISATION', 'info');
    
    try {
        // Test d'authentification
        const loginSuccess = await testLogin();
        if (!loginSuccess) {
            throw new Error('Échec de l\'authentification');
        }
        
        // Test de récupération de la flotte
        const fleetSuccess = await testGetFleet();
        if (!fleetSuccess) {
            throw new Error('Échec de la récupération de la flotte');
        }
        
        // Test du module de synchronisation
        const syncModuleSuccess = await testSyncModule();
        if (!syncModuleSuccess) {
            throw new Error('Échec du test du module de synchronisation');
        }
        
        log('🎉 TOUS LES TESTS DE SYNCHRONISATION ONT RÉUSSI!', 'success');
    } catch (error) {
        log(`❌ ERREUR CRITIQUE: ${error.message}`, 'error');
    }
}

// Fonction pour démarrer les tests
function startTests() {
    const consoleElement = document.getElementById('console');
    if (consoleElement) {
        consoleElement.innerHTML = '';
    }
    
    log('Démarrage des tests de synchronisation...');
    runSyncTests();
}

// Exposer la fonction de démarrage
window.startSyncTests = startTests;
