const axios = require('axios');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}`;
let token = null;
let clientId = null;
let fleetId = null;
let vehicleId = null;

// Fonction pour tester l'API
async function testAPI() {
  try {
    console.log('=== Test de l\'API Fleet Management ===');
    
    // Test de la route de base
    console.log('\n1. Test de la route de base');
    const baseResponse = await axios.get(API_URL);
    console.log('Réponse:', baseResponse.data);
    
    // Test d'inscription
    console.log('\n2. Test d\'inscription');
    const registerData = {
      name: 'Client Test',
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const registerResponse = await axios.post(`${API_URL}/api/auth/register`, registerData);
      token = registerResponse.data.token;
      console.log('Inscription réussie, token reçu');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('Client déjà existant, tentative de connexion...');
        
        // Test de connexion
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
          email: registerData.email,
          password: registerData.password
        });
        
        token = loginResponse.data.token;
        console.log('Connexion réussie, token reçu');
      } else {
        throw error;
      }
    }
    
    // Vérification du token
    console.log('\n3. Vérification du token');
    const verifyResponse = await axios.get(`${API_URL}/api/auth/verify`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    clientId = verifyResponse.data._id;
    console.log('Token valide, client ID:', clientId);
    
    // Création d'une flotte
    console.log('\n4. Création d\'une flotte');
    const fleetData = {
      name: 'Flotte Test'
    };
    
    const fleetResponse = await axios.post(`${API_URL}/api/fleets`, fleetData, {
      headers: {
        'x-auth-token': token
      }
    });
    
    fleetId = fleetResponse.data._id;
    console.log('Flotte créée avec ID:', fleetId);
    
    // Ajout d'un véhicule
    console.log('\n5. Ajout d\'un véhicule');
    const vehicleData = {
      fleet_id: fleetId,
      vehicle_id: 'V001',
      data: {
        marque: 'Renault',
        modele: 'Clio',
        annee: 2020,
        immatriculation: 'AB-123-CD',
        etat: 'Disponible',
        type: 'Voiture',
        kilometrage: 15000
      }
    };
    
    const vehicleResponse = await axios.post(`${API_URL}/api/vehicles`, vehicleData, {
      headers: {
        'x-auth-token': token
      }
    });
    
    vehicleId = vehicleResponse.data._id;
    console.log('Véhicule ajouté avec ID:', vehicleId);
    
    // Récupération des véhicules de la flotte
    console.log('\n6. Récupération des véhicules de la flotte');
    const fleetVehiclesResponse = await axios.get(`${API_URL}/api/fleets/${fleetId}/vehicles`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('Nombre de véhicules dans la flotte:', fleetVehiclesResponse.data.length);
    
    // Mise à jour d'un véhicule
    console.log('\n7. Mise à jour d\'un véhicule');
    const updateData = {
      data: {
        ...vehicleData.data,
        etat: 'En maintenance',
        kilometrage: 16500
      }
    };
    
    await axios.put(`${API_URL}/api/vehicles/${vehicleId}`, updateData, {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('Véhicule mis à jour');
    
    // Test de synchronisation
    console.log('\n8. Test de synchronisation');
    const syncData = {
      fleetId,
      data: [
        {
          vehicle_id: 'V002',
          data: {
            marque: 'Peugeot',
            modele: '308',
            annee: 2019,
            immatriculation: 'EF-456-GH',
            etat: 'Disponible',
            type: 'Voiture',
            kilometrage: 25000
          }
        }
      ],
      lastSyncTimestamp: new Date().toISOString()
    };
    
    const syncResponse = await axios.post(`${API_URL}/api/sync/upload`, syncData, {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('Résultat de la synchronisation:', syncResponse.data);
    
    console.log('\n=== Tests terminés avec succès ===');
  } catch (error) {
    console.error('Erreur lors des tests:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Erreur de requête:', error.message);
    } else {
      console.error('Erreur:', error.message);
    }
    console.error('Stack:', error.stack);
  }
}

// Installer axios si nécessaire
const { execSync } = require('child_process');
try {
  require.resolve('axios');
  console.log('Axios est déjà installé, démarrage des tests...');
  testAPI();
} catch (e) {
  console.log('Installation d\'axios...');
  execSync('npm install axios', { stdio: 'inherit' });
  console.log('Axios installé, démarrage des tests...');
  testAPI();
}
