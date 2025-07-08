/**
 * Module de réponses pour Deadalia
 * Gère l'affichage des messages et les interactions utilisateur
 */

class IAResponder {
    constructor() {
        this.chatContainer = null;
        this.messagesContainer = null;
        this.typingIndicator = null;
        this.messageHistory = [];
        this.maxMessages = 50;
        this.autoScroll = true;
        this.soundEnabled = true;
        
        this.init();
    }
    
    init() {
        // Récupérer les éléments DOM
        this.chatContainer = document.getElementById('chat-drawer');
        this.messagesContainer = document.getElementById('chat-messages');
        
        if (!this.messagesContainer) {
            console.error('❌ Container de messages non trouvé');
            return;
        }
        
        // Créer l'indicateur de frappe
        this.createTypingIndicator();
        
        // Charger l'historique depuis localStorage
        this.loadHistory();
        
        console.log('💬 Module de réponses initialisé');
    }
    
    // Afficher un message utilisateur
    showUserMessage(message, isVoice = false) {
        const messageData = {
            id: this.generateMessageId(),
            type: 'user',
            content: message,
            timestamp: new Date(),
            isVoice: isVoice
        };
        
        this.addMessage(messageData);
        this.saveToHistory(messageData);
        
        return messageData.id;
    }
    
    // Afficher un message de l'IA
    showAIMessage(message, options = {}) {
        const messageData = {
            id: this.generateMessageId(),
            type: 'ai',
            content: message,
            timestamp: new Date(),
            isTyping: options.isTyping || false,
            hasActions: options.hasActions || false,
            actions: options.actions || []
        };
        
        if (options.isTyping) {
            this.showTypingEffect(messageData);
        } else {
            this.addMessage(messageData);
            this.saveToHistory(messageData);
        }
        
        // Son de notification
        if (this.soundEnabled && !options.silent) {
            this.playNotificationSound();
        }
        
        return messageData.id;
    }
    
    // Afficher l'effet de frappe
    showTypingEffect(messageData) {
        // Afficher l'indicateur de frappe
        this.showTypingIndicator();
        
        // Simuler un délai de frappe
        const typingDelay = Math.min(messageData.content.length * 30, 2000);
        
        setTimeout(() => {
            this.hideTypingIndicator();
            this.addMessage(messageData);
            this.saveToHistory(messageData);
        }, typingDelay);
    }
    
    // Ajouter un message au chat
    addMessage(messageData) {
        const messageElement = this.createMessageElement(messageData);
        this.messagesContainer.appendChild(messageElement);
        
        // Limiter le nombre de messages
        this.limitMessages();
        
        // Scroll automatique
        if (this.autoScroll) {
            this.scrollToBottom();
        }
        
        // Animation d'entrée
        requestAnimationFrame(() => {
            messageElement.classList.add('animate-slide-in-message');
        });
    }
    
    // Créer un élément de message
    createMessageElement(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item flex ${messageData.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`;
        messageDiv.dataset.messageId = messageData.id;
        
        if (messageData.type === 'user') {
            messageDiv.innerHTML = `
                <div class="message-bubble message-user bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg max-w-xs">
                    <p class="text-sm">${this.escapeHtml(messageData.content)}</p>
                    <div class="flex items-center justify-end mt-1 space-x-1">
                        ${messageData.isVoice ? '<i data-lucide="mic" class="w-3 h-3 opacity-70"></i>' : ''}
                        <span class="text-xs opacity-70">${this.formatTime(messageData.timestamp)}</span>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="flex items-start space-x-2">
                    <img src="deadalia-icon.png" alt="Deadalia" class="w-6 h-6 rounded-full flex-shrink-0 mt-1">
                    <div class="message-bubble message-ai bg-gray-100 px-4 py-2 rounded-lg max-w-xs">
                        <div class="message-content">
                            ${this.formatMessageContent(messageData.content)}
                        </div>
                        ${messageData.hasActions ? this.createActionButtons(messageData.actions) : ''}
                        <div class="flex items-center justify-start mt-1">
                            <span class="text-xs text-gray-500">${this.formatTime(messageData.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Réinitialiser les icônes Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
        
        return messageDiv;
    }
    
    // Formater le contenu du message
    formatMessageContent(content) {
        // Convertir les liens en liens cliquables
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-600 underline">$1</a>');
        
        // Convertir les retours à la ligne
        content = content.replace(/\n/g, '<br>');
        
        // Mettre en gras les mots importants
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Mettre en italique
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        return `<p class="text-sm text-gray-800">${content}</p>`;
    }
    
    // Créer les boutons d'action
    createActionButtons(actions) {
        if (!actions || actions.length === 0) return '';
        
        const buttonsHtml = actions.map(action => `
            <button class="action-btn btn btn-xs btn-outline mr-1 mt-2" data-action="${action.type}" data-value="${action.value}">
                ${action.icon ? `<i data-lucide="${action.icon}" class="w-3 h-3 mr-1"></i>` : ''}
                ${action.label}
            </button>
        `).join('');
        
        return `<div class="message-actions">${buttonsHtml}</div>`;
    }
    
    // Afficher l'indicateur de frappe
    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'flex';
        }
    }
    
    // Masquer l'indicateur de frappe
    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'none';
        }
    }
    
    // Créer l'indicateur de frappe
    createTypingIndicator() {
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'typing-indicator flex items-start space-x-2 mb-3';
        this.typingIndicator.style.display = 'none';
        this.typingIndicator.innerHTML = `
            <img src="deadalia-icon.png" alt="Deadalia" class="w-6 h-6 rounded-full flex-shrink-0 mt-1">
            <div class="bg-gray-100 px-4 py-2 rounded-lg">
                <div class="flex space-x-1">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        if (this.messagesContainer) {
            this.messagesContainer.appendChild(this.typingIndicator);
        }
    }
    
    // Afficher un message d'erreur
    showErrorMessage(error) {
        const errorMessage = typeof error === 'string' ? error : 'Une erreur est survenue lors du traitement de votre demande.';
        
        this.showAIMessage(`❌ ${errorMessage}`, {
            silent: true,
            hasActions: true,
            actions: [
                {
                    type: 'retry',
                    label: 'Réessayer',
                    icon: 'refresh-cw',
                    value: 'retry'
                }
            ]
        });
    }
    
    // Afficher un message de statut
    showStatusMessage(status, message) {
        const statusIcons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        const icon = statusIcons[status] || 'ℹ️';
        this.showAIMessage(`${icon} ${message}`, { silent: true });
    }
    
    // Vider le chat
    clearChat() {
        if (this.messagesContainer) {
            // Garder le message de bienvenue
            const welcomeMessage = this.messagesContainer.querySelector('.message-item');
            this.messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                this.messagesContainer.appendChild(welcomeMessage);
            }
            this.messagesContainer.appendChild(this.typingIndicator);
        }
        
        this.messageHistory = [];
        this.clearHistory();
    }
    
    // Scroll vers le bas
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    // Limiter le nombre de messages
    limitMessages() {
        if (!this.messagesContainer) return;
        
        const messages = this.messagesContainer.querySelectorAll('.message-item');
        if (messages.length > this.maxMessages) {
            const toRemove = messages.length - this.maxMessages;
            for (let i = 0; i < toRemove; i++) {
                messages[i].remove();
            }
        }
    }
    
    // Sauvegarder dans l'historique
    saveToHistory(messageData) {
        this.messageHistory.push(messageData);
        
        // Limiter l'historique
        if (this.messageHistory.length > this.maxMessages) {
            this.messageHistory = this.messageHistory.slice(-this.maxMessages);
        }
        
        // Sauvegarder dans localStorage
        try {
            localStorage.setItem('deadalia_chat_history', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.warn('⚠️ Impossible de sauvegarder l\'historique:', error);
        }
    }
    
    // Charger l'historique
    loadHistory() {
        try {
            const saved = localStorage.getItem('deadalia_chat_history');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
                console.log(`📚 Historique chargé: ${this.messageHistory.length} messages`);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger l\'historique:', error);
            this.messageHistory = [];
        }
    }
    
    // Vider l'historique
    clearHistory() {
        try {
            localStorage.removeItem('deadalia_chat_history');
        } catch (error) {
            console.warn('⚠️ Impossible de vider l\'historique:', error);
        }
    }
    
    // Jouer un son de notification
    playNotificationSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Créer un son simple avec Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('⚠️ Impossible de jouer le son:', error);
        }
    }
    
    // Utilitaires
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Configuration
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }
    
    setAutoScroll(enabled) {
        this.autoScroll = enabled;
    }
    
    setMaxMessages(max) {
        this.maxMessages = max;
    }
    
    // Obtenir l'historique
    getHistory() {
        return [...this.messageHistory];
    }
}

// Export de la classe
window.IAResponder = IAResponder;
