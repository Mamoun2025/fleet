/**
 * Fleet Management - Tests MVP
 * Script de test pour valider les fonctionnalités essentielles avant déploiement
 */

// Configuration
const API_URL = 'http://localhost:3000';
let token = null;
let companyId = null;
let fleetId = null;
let vehicleId = null;

// Statistiques des tests
const testStats = {
    total: 0,
    passed: 0,
    failed: 0
};

// Fonction pour exécuter un test
async function runTest(name, testFn) {
    testStats.total++;
    console.log(`\n🔍 TEST: ${name}`);
    try {
        await testFn();
        console.log(`✅ SUCCÈS: ${name}`);
        testStats.passed++;
    } catch (error) {
        console.error(`❌ ÉCHEC: ${name}`);
        console.error(`   Erreur: ${error.message}`);
        testStats.failed++;
    }
}

// Fonction pour afficher le rapport final
function showTestReport() {
    console.log('\n==================================');
    console.log('📊 RAPPORT DE TESTS MVP');
    console.log('==================================');
    console.log(`Tests exécutés: ${testStats.total}`);
    console.log(`Tests réussis: ${testStats.passed}`);
    console.log(`Tests échoués: ${testStats.failed}`);
    console.log(`Taux de réussite: ${Math.round((testStats.passed / testStats.total) * 100)}%`);
    console.log('==================================');
    
    if (testStats.failed === 0) {
        console.log('🎉 TOUS LES TESTS ONT RÉUSSI - MVP PRÊT POUR DÉPLOIEMENT!');
    } else {
        console.log('⚠️ CERTAINS TESTS ONT ÉCHOUÉ - CORRECTION NÉCESSAIRE AVANT DÉPLOIEMENT');
    }
}

// Fonction pour faire une requête API
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        options.headers['x-auth-token'] = token;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(`Erreur API (${response.status}): ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
}

// Fonction pour tester le stockage local
function testLocalStorage(key, expectedType) {
    const value = localStorage.getItem(key);
    if (!value) {
        throw new Error(`Clé '${key}' non trouvée dans localStorage`);
    }
    
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && expectedType === 'array') {
            return parsed;
        } else if (typeof parsed === 'object' && parsed !== null && expectedType === 'object') {
            return parsed;
        } else {
            throw new Error(`Type de données incorrect pour '${key}'`);
        }
    } catch (e) {
        if (expectedType === 'string') {
            return value;
        }
        throw new Error(`Impossible de parser les données de '${key}'`);
    }
}

// Fonction pour générer des données de test uniques
function generateTestData() {
    const timestamp = Date.now();
    return {
        email: `test${timestamp}@example.com`,
        password: 'Test123!',
        companyName: `Test Company ${timestamp}`,
        fleetName: `Test Fleet ${timestamp}`,
        vehicleData: {
            fleetnumber: `V-${timestamp}`,
            designation: 'Test Vehicle',
            type: 'Car',
            brand: 'Test Brand',
            model: 'Test Model',
            serialnumber: `SN-${timestamp}`
        }
    };
}

// Tests d'authentification
async function testAuthentication() {
    const testData = generateTestData();
    
    await runTest('Inscription d\'un nouvel utilisateur', async () => {
        const userData = {
            name: 'Test User',
            email: testData.email,
            password: testData.password,
            company: {
                name: testData.companyName
            }
        };
        
        const result = await apiRequest('/api/auth/register', 'POST', userData);
        if (!result.token) {
            throw new Error('Token non reçu après inscription');
        }
        token = result.token;
        console.log('   Token JWT reçu');
    });
    
    await runTest('Connexion utilisateur', async () => {
        const loginData = {
            email: testData.email,
            password: testData.password
        };
        
        const result = await apiRequest('/api/auth/login', 'POST', loginData);
        if (!result.token) {
            throw new Error('Token non reçu après connexion');
        }
        token = result.token;
        console.log('   Connexion réussie');
    });
    
    await runTest('Vérification du token', async () => {
        const userData = await apiRequest('/api/auth/verify');
        if (!userData.name || !userData.email) {
            throw new Error('Données utilisateur incomplètes');
        }
        
        if (!userData.company || !userData.company._id) {
            throw new Error('Données entreprise manquantes');
        }
        
        companyId = userData.company._id;
        console.log(`   Utilisateur vérifié: ${userData.name}`);
        console.log(`   Entreprise: ${userData.company.name} (${companyId})`);
    });
}

// Tests de gestion des flottes
async function testFleetManagement() {
    await runTest('Récupération des données de la flotte', async () => {
        const company = await apiRequest(`/api/companies/${companyId}`);
        if (!company) {
            throw new Error('Entreprise non trouvée');
        }
        
        const fleetData = await apiRequest(`/api/companies/${companyId}/fleet`);
        if (!fleetData || !fleetData._id) {
            throw new Error('Flotte non trouvée');
        }
        
        fleetId = fleetData._id;
        console.log(`   Flotte récupérée: ${fleetData.name || 'Sans nom'} (${fleetId})`);
    });
    
    await runTest('Création d\'un véhicule', async () => {
        const testData = generateTestData();
        const vehicleData = testData.vehicleData;
        
        const result = await apiRequest(`/api/fleets/${fleetId}/vehicles`, 'POST', vehicleData);
        if (!result._id) {
            throw new Error('ID du véhicule non reçu après création');
        }
        
        vehicleId = result._id;
        console.log(`   Véhicule créé: ${vehicleData.designation} (${vehicleId})`);
    });
    
    await runTest('Récupération des véhicules', async () => {
        const vehicles = await apiRequest(`/api/fleets/${fleetId}/vehicles`);
        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            throw new Error('Aucun véhicule trouvé');
        }
        
        console.log(`   ${vehicles.length} véhicule(s) récupéré(s)`);
    });
    
    await runTest('Modification d\'un véhicule', async () => {
        const updateData = {
            designation: 'Test Vehicle Updated',
            hours: 100,
            mileage: 5000
        };
        
        const result = await apiRequest(`/api/fleets/${fleetId}/vehicles/${vehicleId}`, 'PUT', updateData);
        if (!result._id || result.designation !== updateData.designation) {
            throw new Error('Mise à jour du véhicule échouée');
        }
        
        console.log(`   Véhicule mis à jour: ${result.designation}`);
    });
}

// Tests de synchronisation
async function testSynchronization() {
    await runTest('Initialisation de la synchronisation', () => {
        // Vérifier que le module de synchronisation est disponible
        if (!window.fleetSync) {
            throw new Error('Module de synchronisation non disponible');
        }
        
        // Initialiser la synchronisation
        window.fleetSync.initSync(token, companyId, fleetId);
        
        if (!window.fleetSync.syncConfig.syncEnabled) {
            throw new Error('Synchronisation non activée après initialisation');
        }
        
        console.log('   Module de synchronisation initialisé');
    });
    
    await runTest('Synchronisation avec le serveur', async () => {
        const result = await window.fleetSync.syncWithServer();
        
        if (!result || result.error) {
            throw new Error(`Erreur de synchronisation: ${result?.error || 'Inconnue'}`);
        }
        
        console.log(`   Synchronisation réussie: ${result.uploaded} envoyés, ${result.downloaded} reçus`);
    });
    
    await runTest('Stockage local des véhicules', () => {
        const storageKey = `fleetData_${fleetId}`;
        const localData = testLocalStorage(storageKey, 'array');
        
        if (!Array.isArray(localData) || localData.length === 0) {
            throw new Error('Données de véhicules non trouvées dans le stockage local');
        }
        
        console.log(`   ${localData.length} véhicule(s) trouvé(s) dans le stockage local`);
    });
    
    await runTest('Suivi des modifications', async () => {
        // Simuler une modification
        const testData = {
            id: vehicleId,
            hours: 150,
            lastModified: new Date().toISOString()
        };
        
        // Enregistrer la modification
        window.fleetSync.trackChange(vehicleId, testData, 'update');
        
        // Vérifier que la modification est enregistrée
        const unsyncedChangesKey = `unsyncedChanges_${companyId}`;
        const unsyncedChanges = JSON.parse(localStorage.getItem(unsyncedChangesKey) || '[]');
        
        if (!Array.isArray(unsyncedChanges) || unsyncedChanges.length === 0) {
            throw new Error('Modification non enregistrée');
        }
        
        const lastChange = unsyncedChanges[unsyncedChanges.length - 1];
        if (lastChange.vehicle_id !== vehicleId) {
            throw new Error('ID du véhicule incorrect dans la modification enregistrée');
        }
        
        console.log('   Modification correctement enregistrée pour synchronisation ultérieure');
        
        // Synchroniser à nouveau
        await window.fleetSync.syncWithServer();
        console.log('   Synchronisation des modifications réussie');
    });
}

// Tests d'interface utilisateur
async function testUserInterface() {
    await runTest('Chargement de la page de flotte', () => {
        // Stocker les données nécessaires pour la page de flotte
        localStorage.setItem('token', token);
        localStorage.setItem('currentClientId', companyId);
        localStorage.setItem('currentFleetId', fleetId);
        
        // Vérifier que la page peut être chargée
        const fleetPage = document.createElement('iframe');
        fleetPage.style.display = 'none';
        fleetPage.src = 'fleet.html';
        
        return new Promise((resolve, reject) => {
            fleetPage.onload = () => {
                try {
                    const doc = fleetPage.contentDocument || fleetPage.contentWindow.document;
                    if (!doc) {
                        reject(new Error('Impossible d\'accéder au document de la page de flotte'));
                        return;
                    }
                    
                    // Vérifier que les éléments essentiels sont présents
                    const table = doc.getElementById('machines-table');
                    if (!table) {
                        reject(new Error('Tableau des véhicules non trouvé'));
                        return;
                    }
                    
                    console.log('   Page de flotte chargée avec succès');
                    document.body.removeChild(fleetPage);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            fleetPage.onerror = () => {
                reject(new Error('Erreur lors du chargement de la page de flotte'));
            };
            
            document.body.appendChild(fleetPage);
        });
    });
}

// Nettoyage après les tests
async function cleanupTests() {
    if (vehicleId) {
        await runTest('Suppression du véhicule de test', async () => {
            await apiRequest(`/api/fleets/${fleetId}/vehicles/${vehicleId}`, 'DELETE');
            console.log('   Véhicule supprimé');
        });
    }
}

// Exécuter tous les tests
async function runAllTests() {
    console.log('🚀 DÉMARRAGE DES TESTS MVP FLEET MANAGEMENT');
    console.log('==========================================');
    
    try {
        console.log('📋 Démarrage des tests d\'authentification...');
        await testAuthentication();
        
        console.log('📋 Démarrage des tests de gestion des flottes...');
        await testFleetManagement();
        
        console.log('📋 Démarrage des tests de synchronisation...');
        await testSynchronization();
        
        console.log('📋 Démarrage des tests d\'interface utilisateur...');
        await testUserInterface();
        
        console.log('🧹 Nettoyage des données de test...');
        await cleanupTests();
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE:', error);
    } finally {
        showTestReport();
    }
}

// Exécuter les tests immédiatement
runAllTests();
