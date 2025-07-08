/**
 * Script de test pour vérifier l'intégration avec MongoDB
 * Ce script permet de :
 * 1. Vérifier la connexion à MongoDB
 * 2. Créer un client de test avec une entreprise et une flotte
 * 3. Ajouter quelques véhicules à cette flotte
 * 4. Vérifier que les données sont correctement stockées et récupérées
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Chargement des modèles
const Client = require('./models/Client');
const Company = require('./models/Company');
const Fleet = require('./models/Fleet');
const Vehicle = require('./models/Vehicle');

// Chargement des variables d'environnement
dotenv.config();

// Fonction principale asynchrone
async function testMongoDB() {
    try {
        console.log('Démarrage du test MongoDB...');
        
        // 1. Connexion à MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connexion à MongoDB réussie');
        
        // 2. Création d'un client de test
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'password123';
        
        // Vérifier si le client existe déjà
        let testClient = await Client.findOne({ email: testEmail });
        
        if (!testClient) {
            // Hachage du mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(testPassword, salt);
            
            // Créer le client
            testClient = new Client({
                name: 'Client Test',
                email: testEmail,
                password: hashedPassword,
                isAdmin: false
            });
            
            await testClient.save();
            console.log(`✅ Client de test créé: ${testEmail}`);
        } else {
            console.log(`⚠️ Client de test existe déjà: ${testEmail}`);
        }
        
        // 3. Création d'une entreprise pour l'client
        let testCompany = await Company.findOne({ name: 'Entreprise Test' });
        
        if (!testCompany) {
            testCompany = new Company({
                name: 'Entreprise Test',
                address: '123 Rue de Test',
                phone: '0123456789',
                email: 'contact@entreprise-test.com'
            });
            
            await testCompany.save();
            console.log('✅ Entreprise de test créée');
        } else {
            console.log('⚠️ Entreprise de test existe déjà');
        }
        
        // 4. Création d'une flotte pour l'entreprise
        let testFleet = await Fleet.findOne({ company_id: testCompany._id });
        
        if (!testFleet) {
            testFleet = new Fleet({
                name: 'Flotte Test',
                company_id: testCompany._id,
                description: 'Flotte de test pour vérification MongoDB'
            });
            
            await testFleet.save();
            console.log('✅ Flotte de test créée');
        } else {
            console.log('⚠️ Flotte de test existe déjà');
        }
        
        // 5. Associer le client à l'entreprise
        testClient.companyId = testCompany._id;
        await testClient.save();
        console.log('✅ Client associé à l\'entreprise');
        
        // 6. Ajouter quelques véhicules à la flotte
        const testVehicles = [
            {
                fleet_id: testFleet._id,
                client_id: testClient._id,
                vehicle_id: 'VEH001',
                data: {
                    make: 'Renault',
                    model: 'Clio',
                    registration: 'AA-123-BB',
                    year: 2022,
                    status: 'Actif'
                }
            },
            {
                fleet_id: testFleet._id,
                client_id: testClient._id,
                vehicle_id: 'VEH002',
                data: {
                    make: 'Peugeot',
                    model: '308',
                    registration: 'CC-456-DD',
                    year: 2021,
                    status: 'Maintenance'
                }
            },
            {
                fleet_id: testFleet._id,
                client_id: testClient._id,
                vehicle_id: 'VEH003',
                data: {
                    make: 'Citroën',
                    model: 'C3',
                    registration: 'EE-789-FF',
                    year: 2023,
                    status: 'Actif'
                }
            }
        ];
        
        // Vérifier si les véhicules existent déjà
        for (const vehicleData of testVehicles) {
            const existingVehicle = await Vehicle.findOne({ vehicle_id: vehicleData.vehicle_id, client_id: vehicleData.client_id });
            
            if (!existingVehicle) {
                const vehicle = new Vehicle(vehicleData);
                await vehicle.save();
                console.log(`✅ Véhicule créé: ${vehicleData.data.make} ${vehicleData.data.model} (${vehicleData.data.registration})`);
            } else {
                console.log(`⚠️ Véhicule existe déjà: ${vehicleData.vehicle_id}`);
            }
        }
        
        // 7. Vérifier que les données sont correctement stockées
        const vehiclesInFleet = await Vehicle.find({ fleet_id: testFleet._id });
        console.log(`\n📊 Nombre de véhicules dans la flotte: ${vehiclesInFleet.length}`);
        
        // Afficher les véhicules
        console.log('\n📋 Liste des véhicules:');
        vehiclesInFleet.forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle.data.make} ${vehicle.data.model} (${vehicle.data.registration}) - ${vehicle.data.status}`);
        });
        
        // 8. Vérifier l'association client-entreprise
        const clientWithRelations = await Client.findById(testClient._id)
            .populate('companyId');
            
        console.log('\n👤 Informations client:');
        console.log(`Nom: ${clientWithRelations.name}`);
        console.log(`Email: ${clientWithRelations.email}`);
        console.log(`Entreprise: ${clientWithRelations.companyId ? clientWithRelations.companyId.name : 'Non associée'}`);
        
        console.log('\n✅ Test MongoDB terminé avec succès!');
        console.log(`\nVous pouvez maintenant vous connecter avec:\nEmail: ${testEmail}\nMot de passe: ${testPassword}`);
        
    } catch (error) {
        console.error('❌ Erreur lors du test MongoDB:', error);
    } finally {
        // Fermer la connexion MongoDB
        await mongoose.disconnect();
        console.log('Connexion MongoDB fermée');
    }
}

// Exécuter le test
testMongoDB();
