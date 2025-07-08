/**
 * Module de reconnaissance vocale pour Deadalia
 * Utilise l'API Web Speech Recognition
 */

class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.language = 'fr-FR';
        this.callbacks = {
            onResult: null,
            onStart: null,
            onEnd: null,
            onError: null
        };
        
        this.init();
    }
    
    init() {
        // Vérifier le support de l'API
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.isSupported = true;
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
        } else {
            console.warn('Speech Recognition API non supportée');
            this.isSupported = false;
            return;
        }
        
        // Configuration de la reconnaissance
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;
        this.recognition.maxAlternatives = 1;
        
        // Événements
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('🎤 Reconnaissance vocale démarrée');
            if (this.callbacks.onStart) this.callbacks.onStart();
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (finalTranscript && this.callbacks.onResult) {
                this.callbacks.onResult(finalTranscript.trim(), false);
            } else if (interimTranscript && this.callbacks.onResult) {
                this.callbacks.onResult(interimTranscript.trim(), true);
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('🎤 Reconnaissance vocale terminée');
            if (this.callbacks.onEnd) this.callbacks.onEnd();
        };
        
        this.recognition.onerror = (event) => {
            this.isListening = false;
            console.error('❌ Erreur reconnaissance vocale:', event.error);
            if (this.callbacks.onError) this.callbacks.onError(event.error);
        };
    }
    
    // Démarrer l'écoute
    start() {
        if (!this.isSupported) {
            console.error('❌ Reconnaissance vocale non supportée');
            return false;
        }
        
        if (this.isListening) {
            console.warn('⚠️ Reconnaissance vocale déjà en cours');
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('❌ Erreur démarrage reconnaissance:', error);
            return false;
        }
    }
    
    // Arrêter l'écoute
    stop() {
        if (!this.isSupported || !this.isListening) {
            return;
        }
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('❌ Erreur arrêt reconnaissance:', error);
        }
    }
    
    // Définir les callbacks
    onResult(callback) {
        this.callbacks.onResult = callback;
    }
    
    onStart(callback) {
        this.callbacks.onStart = callback;
    }
    
    onEnd(callback) {
        this.callbacks.onEnd = callback;
    }
    
    onError(callback) {
        this.callbacks.onError = callback;
    }
    
    // Changer la langue
    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }
    
    // Vérifier le support
    isSupported() {
        return this.isSupported;
    }
    
    // Obtenir le statut
    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            language: this.language
        };
    }
}

// Classe pour la synthèse vocale (Text-to-Speech)
class VoiceSynthesis {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.isSupported = 'speechSynthesis' in window;
        
        this.init();
    }
    
    init() {
        if (!this.isSupported) {
            console.warn('Speech Synthesis API non supportée');
            return;
        }
        
        // Charger les voix disponibles
        this.loadVoices();
        
        // Écouter les changements de voix
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }
    }
    
    loadVoices() {
        this.voices = this.synth.getVoices();
        
        // Sélectionner une voix française par défaut
        this.selectedVoice = this.voices.find(voice => 
            voice.lang.startsWith('fr') && voice.name.includes('Female')
        ) || this.voices.find(voice => 
            voice.lang.startsWith('fr')
        ) || this.voices[0];
        
        console.log('🔊 Voix disponibles:', this.voices.length);
        if (this.selectedVoice) {
            console.log('🔊 Voix sélectionnée:', this.selectedVoice.name);
        }
    }
    
    // Parler un texte
    speak(text, options = {}) {
        if (!this.isSupported) {
            console.error('❌ Synthèse vocale non supportée');
            return false;
        }
        
        // Arrêter toute synthèse en cours
        this.stop();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configuration
        utterance.voice = this.selectedVoice;
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 0.8;
        
        // Événements
        utterance.onstart = () => {
            console.log('🔊 Synthèse vocale démarrée');
            if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
            console.log('🔊 Synthèse vocale terminée');
            if (options.onEnd) options.onEnd();
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Erreur synthèse vocale:', event.error);
            if (options.onError) options.onError(event.error);
        };
        
        // Lancer la synthèse
        this.synth.speak(utterance);
        return true;
    }
    
    // Arrêter la synthèse
    stop() {
        if (this.isSupported) {
            this.synth.cancel();
        }
    }
    
    // Mettre en pause
    pause() {
        if (this.isSupported) {
            this.synth.pause();
        }
    }
    
    // Reprendre
    resume() {
        if (this.isSupported) {
            this.synth.resume();
        }
    }
    
    // Obtenir les voix disponibles
    getVoices() {
        return this.voices;
    }
    
    // Changer de voix
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            console.log('🔊 Voix changée:', voice.name);
            return true;
        }
        return false;
    }
}

// Export des classes
window.VoiceRecognition = VoiceRecognition;
window.VoiceSynthesis = VoiceSynthesis;
