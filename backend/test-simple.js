const axios = require('axios');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}`;

// Test simple de l'API
async function testSimpleAPI() {
  try {
    console.log('=== Test simple de l\'API Fleet Management ===');
    
    // Test de la route de base
    console.log('\n1. Test de la route de base');
    const baseResponse = await axios.get(API_URL);
    console.log('Réponse:', baseResponse.data);
    
    console.log('\n=== Test simple terminé avec succès ===');
  } catch (error) {
    console.log('Erreur lors du test simple:');
    if (error.code === 'ECONNREFUSED') {
      console.log('Impossible de se connecter au serveur. Vérifiez que le serveur est en cours d\'exécution sur le port', process.env.PORT || 3000);
    } else {
      console.log('Message d\'erreur:', error.message);
    }
  }
}

// Exécuter le test
testSimpleAPI();
