/**
 * Module de requêtes IA pour Deadalia
 * Gère l'envoi des questions à l'API et le traitement des réponses
 */

class IAQuery {
    constructor() {
        this.apiEndpoint = '/api/ia-query';
        this.isProcessing = false;
        this.requestTimeout = 30000; // 30 secondes
        this.retryAttempts = 3;
        this.callbacks = {
            onStart: null,
            onSuccess: null,
            onError: null,
            onComplete: null
        };
    }
    
    // Envoyer une question à l'IA
    async ask(question, context = {}) {
        if (this.isProcessing) {
            console.warn('⚠️ Une requête IA est déjà en cours');
            return null;
        }
        
        this.isProcessing = true;
        
        if (this.callbacks.onStart) {
            this.callbacks.onStart();
        }
        
        try {
            console.log('🤖 Envoi de la question à l\'IA:', question);
            
            // Préparer les données de contexte
            const requestData = {
                question: question.trim(),
                context: {
                    ...context,
                    fleetData: this.getFleetContext(),
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                }
            };
            
            // Envoyer la requête avec retry
            const response = await this.sendWithRetry(requestData);
            
            if (this.callbacks.onSuccess) {
                this.callbacks.onSuccess(response);
            }
            
            console.log('✅ Réponse IA reçue:', response);
            return response;
            
        } catch (error) {
            console.error('❌ Erreur requête IA:', error);
            
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            
            return null;
            
        } finally {
            this.isProcessing = false;
            
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete();
            }
        }
    }
    
    // Envoyer la requête avec retry
    async sendWithRetry(data, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erreur inconnue de l\'API');
            }
            
            return result;
            
        } catch (error) {
            if (attempt < this.retryAttempts && !error.name === 'AbortError') {
                console.warn(`⚠️ Tentative ${attempt} échouée, retry...`);
                await this.delay(1000 * attempt); // Délai progressif
                return this.sendWithRetry(data, attempt + 1);
            }
            
            throw error;
        }
    }
    
    // Obtenir le contexte de la flotte
    getFleetContext() {
        try {
            // Récupérer les données de la flotte depuis les variables globales
            const context = {
                totalVehicles: 0,
                vehicleTypes: {},
                locations: {},
                brands: {},
                totalHours: 0,
                availableVehicles: 0
            };
            
            if (typeof tableData !== 'undefined' && Array.isArray(tableData)) {
                context.totalVehicles = tableData.length;
                
                tableData.forEach(vehicle => {
                    // Types de véhicules
                    if (vehicle.fleet) {
                        context.vehicleTypes[vehicle.fleet] = (context.vehicleTypes[vehicle.fleet] || 0) + 1;
                    }
                    
                    // Localisations
                    if (vehicle.affectation) {
                        context.locations[vehicle.affectation] = (context.locations[vehicle.affectation] || 0) + 1;
                    }
                    
                    // Marques
                    if (vehicle.brand) {
                        context.brands[vehicle.brand] = (context.brands[vehicle.brand] || 0) + 1;
                    }
                    
                    // Heures totales
                    if (vehicle.hours && !isNaN(vehicle.hours)) {
                        context.totalHours += parseInt(vehicle.hours);
                    }
                    
                    // Véhicules disponibles
                    if (vehicle.affectation === 'Disponible') {
                        context.availableVehicles++;
                    }
                });
            }
            
            return context;
            
        } catch (error) {
            console.error('❌ Erreur récupération contexte flotte:', error);
            return {};
        }
    }
    
    // Analyser une question pour détecter l'intention
    analyzeIntent(question) {
        const intents = {
            count: ['combien', 'nombre', 'total', 'quantité'],
            search: ['trouve', 'cherche', 'recherche', 'où est', 'localise'],
            status: ['état', 'statut', 'disponible', 'maintenance'],
            hours: ['heures', 'utilisation', 'temps', 'durée'],
            location: ['chantier', 'affectation', 'lieu', 'site'],
            brand: ['marque', 'fabricant', 'constructeur'],
            type: ['type', 'catégorie', 'genre', 'bulldozer', 'excavatrice', 'camion']
        };
        
        const questionLower = question.toLowerCase();
        const detectedIntents = [];
        
        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => questionLower.includes(keyword))) {
                detectedIntents.push(intent);
            }
        }
        
        return detectedIntents;
    }
    
    // Générer une réponse rapide pour les questions simples
    generateQuickResponse(question) {
        const context = this.getFleetContext();
        const intents = this.analyzeIntent(question);
        const questionLower = question.toLowerCase();
        
        // Questions sur le nombre total
        if (intents.includes('count') && (questionLower.includes('véhicule') || questionLower.includes('machine'))) {
            return `Vous avez actuellement ${context.totalVehicles} véhicules dans votre flotte.`;
        }
        
        // Questions sur les véhicules disponibles
        if (intents.includes('count') && questionLower.includes('disponible')) {
            return `Il y a ${context.availableVehicles} véhicules disponibles sur ${context.totalVehicles} au total.`;
        }
        
        // Questions sur les types
        if (intents.includes('type')) {
            const types = Object.entries(context.vehicleTypes)
                .map(([type, count]) => `${count} ${type}`)
                .join(', ');
            return `Répartition par type : ${types}.`;
        }
        
        // Questions sur les heures
        if (intents.includes('hours')) {
            return `Total des heures d'utilisation : ${context.totalHours.toLocaleString()} heures.`;
        }
        
        return null; // Pas de réponse rapide possible
    }
    
    // Définir les callbacks
    onStart(callback) {
        this.callbacks.onStart = callback;
    }
    
    onSuccess(callback) {
        this.callbacks.onSuccess = callback;
    }
    
    onError(callback) {
        this.callbacks.onError = callback;
    }
    
    onComplete(callback) {
        this.callbacks.onComplete = callback;
    }
    
    // Utilitaire pour délai
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Obtenir le statut
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            apiEndpoint: this.apiEndpoint,
            timeout: this.requestTimeout,
            retryAttempts: this.retryAttempts
        };
    }
    
    // Annuler la requête en cours
    cancel() {
        if (this.isProcessing) {
            this.isProcessing = false;
            console.log('🚫 Requête IA annulée');
        }
    }
}

// Export de la classe
window.IAQuery = IAQuery;
