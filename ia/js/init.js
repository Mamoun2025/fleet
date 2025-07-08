/**
 * Module d'initialisation pour Deadalia
 * Coordonne tous les composants de l'IA vocale
 */

class DeadaliaAI {
    constructor() {
        console.log('🤖 Initialisation de Deadalia...');
        
        this.voice = null;
        this.synthesis = null;
        this.query = null;
        this.responder = null;
        this.isInitialized = false;
        this.isActive = false;
        this.currentQuestion = '';
        
        // Éléments DOM
        this.elements = {
            container: null,
            mainBtn: null,
            chatDrawer: null,
            voiceBtn: null,
            textInput: null,
            sendBtn: null,
            closeBtn: null,
            voiceModal: null,
            statusIndicator: null
        };
        
        // Configuration
        this.config = {
            language: 'fr-FR',
            autoSpeak: true,
            quickResponses: true,
            hotkey: 'ctrl+shift+d'
        };
        
        // Initialiser automatiquement
        this.init();
    }
    
    // Initialisation principale
    async init() {
        try {
            console.log('🔧 Initialisation des composants...');
            
            // Initialiser les éléments DOM
            this.initializeElements();
            
            // Initialiser les modules
            await this.initializeModules();
            
            // Configurer les événements
            this.setupEventListeners();
            
            // Configurer les raccourcis clavier
            this.setupHotkeys();
            
            this.isInitialized = true;
            console.log('✅ Deadalia initialisé avec succès!');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showErrorState();
        }
    }
    
    // Initialiser les éléments DOM
    initializeElements() {
        this.elements.container = document.getElementById('deadalia-container');
        this.elements.mainBtn = document.getElementById('deadalia-btn');
        this.elements.chatDrawer = document.getElementById('chat-drawer');
        this.elements.voiceBtn = document.getElementById('voice-btn');
        this.elements.textInput = document.getElementById('text-input');
        this.elements.sendBtn = document.getElementById('send-btn');
        this.elements.closeBtn = document.getElementById('close-chat');
        this.elements.voiceModal = document.getElementById('voice-modal');
        this.elements.statusIndicator = document.getElementById('chat-status');
        
        // Vérifier que les éléments essentiels sont présents
        if (!this.elements.mainBtn) {
            throw new Error('Bouton principal Deadalia non trouvé');
        }
        
        console.log('✅ Éléments DOM initialisés');
    }
    
    // Initialiser les modules
    async initializeModules() {
        console.log('🔧 Initialisation des modules...');
        console.log('🔧 VoiceRecognition disponible:', typeof VoiceRecognition !== 'undefined');
        
        // Initialiser la reconnaissance vocale
        if (typeof VoiceRecognition !== 'undefined') {
            console.log('🎤 Création de VoiceRecognition...');
            this.voice = new VoiceRecognition();
            
            // Configurer les callbacks
            this.voice.onResult((text, isInterim) => this.handleVoiceResult(text, isInterim));
            this.voice.onStart(() => this.handleVoiceStart());
            this.voice.onEnd(() => this.handleVoiceEnd());
            this.voice.onError((error) => this.handleVoiceError(error));
            
            // Configurer la langue
            this.voice.setLanguage(this.config.language);
            
            console.log('🎤 VoiceRecognition créé:', this.voice);
            console.log('🎤 Supporté:', this.voice.isSupported);
        } else {
            console.error('❌ VoiceRecognition non disponible!');
        }
        
        // Initialiser la synthèse vocale
        if (typeof VoiceSynthesis !== 'undefined') {
            console.log('🔊 Création de VoiceSynthesis...');
            this.synthesis = new VoiceSynthesis();
            console.log('🔊 VoiceSynthesis créé:', this.synthesis);
        } else {
            console.error('❌ VoiceSynthesis non disponible!');
        }
        
        // Initialiser les requêtes IA
        if (typeof IAQuery !== 'undefined') {
            this.query = new IAQuery({
                onStart: () => this.handleQueryStart(),
                onSuccess: (response) => this.handleQuerySuccess(response),
                onError: (error) => this.handleQueryError(error),
                onComplete: () => this.handleQueryComplete()
            });
        }
        
        // Initialiser le système de réponses
        if (typeof IAResponder !== 'undefined') {
            this.responder = new IAResponder({
                messagesContainer: document.getElementById('chat-messages'),
                onActionClick: (button) => this.handleActionButton(button)
            });
        }
        
        console.log('✅ Modules initialisés');
    }
    
    // Configurer les événements
    setupEventListeners() {
        // Bouton principal
        if (this.elements.mainBtn) {
            this.elements.mainBtn.addEventListener('click', () => this.toggleChat());
        }
        
        // Bouton vocal
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.addEventListener('click', () => this.toggleVoice());
        }
        
        // Bouton d'envoi
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendTextMessage());
        }
        
        // Input texte
        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendTextMessage();
                }
            });
        }
        
        // Bouton de fermeture
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        }
        
        // Clic extérieur pour fermer
        document.addEventListener('click', (e) => {
            if (this.isActive && !this.elements.container.contains(e.target)) {
                this.closeChat();
            }
        });
        
        console.log('✅ Événements configurés');
    }
    
    // Configurer les raccourcis clavier
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D pour ouvrir/fermer
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleChat();
            }
            
            // Échap pour fermer
            if (e.key === 'Escape' && this.isActive) {
                this.closeChat();
            }
            
            // Barre d'espace pour activer la voix (si le chat est ouvert)
            if (e.key === ' ' && this.isActive && !this.elements.textInput.matches(':focus')) {
                e.preventDefault();
                this.toggleVoice();
            }
        });
        
        console.log('✅ Raccourcis clavier configurés');
    }
    
    // Basculer l'affichage du chat
    toggleChat() {
        if (this.isActive) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    // Ouvrir le chat
    openChat() {
        if (!this.elements.chatDrawer) return;
        
        this.isActive = true;
        this.elements.chatDrawer.classList.remove('translate-y-4', 'opacity-0', 'pointer-events-none');
        this.elements.chatDrawer.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
        
        // Focus sur l'input
        setTimeout(() => {
            if (this.elements.textInput) {
                this.elements.textInput.focus();
            }
        }, 300);
        
        console.log('💬 Chat ouvert');
    }
    
    // Fermer le chat
    closeChat() {
        if (!this.elements.chatDrawer) return;
        
        this.isActive = false;
        this.elements.chatDrawer.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none');
        this.elements.chatDrawer.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        
        // Arrêter la reconnaissance vocale si active
        if (this.voice && this.voice.isListening) {
            this.voice.stop();
        }
        
        console.log('💬 Chat fermé');
    }
    
    // Basculer la reconnaissance vocale
    toggleVoice() {
        console.log('🎤 toggleVoice appelé');
        console.log('🎤 Voice object:', this.voice);
        
        if (!this.voice) {
            console.warn('⚠️ Reconnaissance vocale non disponible');
            if (this.responder) {
                this.responder.showErrorMessage('Reconnaissance vocale non disponible. Vérifiez que votre navigateur supporte cette fonctionnalité.');
            }
            return;
        }
        
        console.log('🎤 Voice status:', this.voice.getStatus());
        console.log('🎤 Is listening:', this.voice.isListening);
        
        if (this.voice.isListening) {
            console.log('🎤 Arrêt de l\'écoute...');
            this.voice.stop();
        } else {
            console.log('🎤 Démarrage de l\'écoute...');
            const started = this.voice.start();
            console.log('🎤 Démarrage réussi:', started);
            
            if (!started) {
                if (this.responder) {
                    this.responder.showErrorMessage('Impossible de démarrer la reconnaissance vocale. Vérifiez les permissions du microphone.');
                }
            }
        }
    }
    
    // Envoyer un message texte
    sendTextMessage() {
        const text = this.elements.textInput.value.trim();
        if (!text) return;
        
        // Vider l'input
        this.elements.textInput.value = '';
        
        // Traiter la question
        this.processQuestion(text, false);
    }
    
    // Traiter une question
    async processQuestion(question, isVoice = false) {
        if (!question.trim()) return;
        
        this.currentQuestion = question;
        
        // Afficher le message utilisateur
        if (this.responder) {
            this.responder.showUserMessage(question, isVoice);
        }
        
        // Vérifier s'il y a une réponse rapide
        if (this.config.quickResponses && this.query) {
            const quickResponse = this.query.generateQuickResponse(question);
            if (quickResponse) {
                this.handleQuickResponse(quickResponse);
                return;
            }
        }
        
        // Envoyer à l'IA
        if (this.query) {
            await this.query.ask(question);
        }
    }
    
    // Gérer une réponse rapide
    handleQuickResponse(response) {
        setTimeout(() => {
            if (this.responder) {
                this.responder.showAIMessage(response, { isTyping: true });
            }
            
            if (this.config.autoSpeak && this.synthesis) {
                setTimeout(() => {
                    this.synthesis.speak(response);
                }, 1000);
            }
        }, 500);
    }
    
    // Gestionnaires d'événements vocaux
    handleVoiceResult(text, isInterim) {
        if (isInterim) {
            this.updateVoicePreview(text);
        } else {
            this.processQuestion(text, true);
        }
    }
    
    handleVoiceStart() {
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.classList.add('recording');
        }
        this.updateStatus('listening');
        console.log('🎤 Écoute démarrée');
    }
    
    handleVoiceEnd() {
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.classList.remove('recording');
        }
        this.updateStatus('ready');
        console.log('🎤 Écoute terminée');
    }
    
    handleVoiceError(error) {
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.classList.remove('recording');
        }
        this.updateStatus('ready');
        
        let errorMessage = 'Erreur de reconnaissance vocale.';
        switch (error) {
            case 'not-allowed':
                errorMessage = 'Accès au microphone refusé.';
                break;
            case 'no-speech':
                errorMessage = 'Aucune parole détectée.';
                break;
        }
        
        if (this.responder) {
            this.responder.showErrorMessage(errorMessage);
        }
    }
    
    // Gestionnaires d'événements de requête
    handleQueryStart() {
        this.updateStatus('processing');
        if (this.responder) {
            this.responder.showTypingIndicator();
        }
    }
    
    handleQuerySuccess(response) {
        this.updateStatus('ready');
        
        if (response && response.answer && this.responder) {
            this.responder.showAIMessage(response.answer, {
                isTyping: true,
                hasActions: response.actions && response.actions.length > 0,
                actions: response.actions
            });
            
            if (this.config.autoSpeak && this.synthesis) {
                setTimeout(() => {
                    this.synthesis.speak(response.answer);
                }, 1500);
            }
        }
    }
    
    handleQueryError(error) {
        this.updateStatus('ready');
        if (this.responder) {
            this.responder.showErrorMessage(error.message || error);
        }
    }
    
    handleQueryComplete() {
        this.updateStatus('ready');
        if (this.responder) {
            this.responder.hideTypingIndicator();
        }
    }
    
    // Gérer les boutons d'action
    handleActionButton(button) {
        const action = button.dataset.action;
        const value = button.dataset.value;
        
        switch (action) {
            case 'retry':
                if (this.currentQuestion) {
                    this.processQuestion(this.currentQuestion);
                }
                break;
            default:
                console.log('Action:', action, value);
        }
    }
    
    // Mettre à jour le statut
    updateStatus(status) {
        if (!this.elements.statusIndicator) return;
        
        const colors = {
            ready: 'bg-green-400',
            listening: 'bg-blue-400',
            processing: 'bg-yellow-400',
            error: 'bg-red-400'
        };
        
        this.elements.statusIndicator.className = `w-2 h-2 rounded-full ${colors[status] || colors.ready}`;
    }
    
    // Mettre à jour l'aperçu vocal
    updateVoicePreview(text) {
        const voiceText = document.getElementById('voice-text');
        if (voiceText) {
            voiceText.textContent = text || 'Parlez maintenant...';
        }
    }
    
    // Afficher l'état d'erreur
    showErrorState() {
        if (this.elements.mainBtn) {
            this.elements.mainBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            this.elements.mainBtn.title = 'Erreur d\'initialisation';
        }
    }
    
    // Obtenir le statut
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isActive: this.isActive,
            voiceSupported: this.voice ? this.voice.isSupported : false,
            isListening: this.voice ? this.voice.isListening : false
        };
    }
}

// Initialisation automatique quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeadalia);
} else {
    initDeadalia();
}

function initDeadalia() {
    // Attendre un peu pour que tous les scripts soient chargés
    setTimeout(() => {
        try {
            window.deadalia = new DeadaliaAI();
            console.log('🚀 Deadalia prêt!');
        } catch (error) {
            console.error('❌ Erreur d\'initialisation Deadalia:', error);
        }
    }, 100);
}

// Export
window.DeadaliaAI = DeadaliaAI;
