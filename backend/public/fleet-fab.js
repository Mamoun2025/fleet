/**
 * Fleet FAB - Barre flottante contextuelle pour Fleet Management
 * Permet d'accéder rapidement aux actions principales
 */

class FleetFab {
  constructor() {
    this.isOpen = false;
    this.actions = [
      { id: 'add', icon: 'plus', label: 'Ajouter', action: 'addItem' },
      { id: 'map', icon: 'map-pin', label: 'Carte', action: 'openMap' },
      { id: 'maintenance', icon: 'tool', label: 'Entretien', action: 'openMaintenance' },
      { id: 'export', icon: 'download', label: 'Exporter', action: 'exportData' }
    ];
    
    this.init();
  }
  
  init() {
    // Création des éléments du FAB
    this.createFabElements();
    
    // Initialisation des événements
    this.initEvents();
  }
  
  createFabElements() {
    // Création du conteneur FAB
    const container = document.createElement('div');
    container.className = 'fleet-fab-container';
    container.id = 'fleet-fab-container';
    
    // Création du bouton principal
    const mainButton = document.createElement('button');
    mainButton.className = 'fleet-fab-main';
    mainButton.id = 'fleet-fab-main';
    mainButton.innerHTML = '<i data-lucide="plus" class="w-6 h-6"></i>';
    
    // Création du menu
    const menu = document.createElement('div');
    menu.className = 'fleet-fab-menu';
    menu.id = 'fleet-fab-menu';
    
    // Ajout des actions au menu
    this.actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'fleet-fab-item';
      
      const button = document.createElement('button');
      button.className = 'fleet-fab-button';
      button.id = `fleet-fab-${action.id}`;
      button.dataset.action = action.action;
      button.innerHTML = `<i data-lucide="${action.icon}" class="w-4 h-4"></i>`;
      
      const label = document.createElement('span');
      label.className = 'fleet-fab-label';
      label.textContent = action.label;
      
      item.appendChild(button);
      item.appendChild(label);
      menu.appendChild(item);
    });
    
    // Assemblage du FAB
    container.appendChild(menu);
    container.appendChild(mainButton);
    
    // Ajout au DOM
    document.body.appendChild(container);
    
    // Initialisation des icônes Lucide
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  initEvents() {
    // Toggle du menu FAB
    const mainButton = document.getElementById('fleet-fab-main');
    mainButton.addEventListener('click', () => this.toggleMenu());
    
    // Actions des boutons
    this.actions.forEach(action => {
      const button = document.getElementById(`fleet-fab-${action.id}`);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAction(action.action);
        this.closeMenu();
      });
    });
    
    // Fermeture du menu en cliquant ailleurs
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fleet-fab-container') && this.isOpen) {
        this.closeMenu();
      }
    });
    
    // Échap pour fermer le menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });
  }
  
  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  openMenu() {
    const mainButton = document.getElementById('fleet-fab-main');
    const menu = document.getElementById('fleet-fab-menu');
    
    mainButton.classList.add('open');
    menu.classList.add('open');
    
    this.isOpen = true;
  }
  
  closeMenu() {
    const mainButton = document.getElementById('fleet-fab-main');
    const menu = document.getElementById('fleet-fab-menu');
    
    mainButton.classList.remove('open');
    menu.classList.remove('open');
    
    this.isOpen = false;
  }
  
  handleAction(action) {
    console.log(`Action ${action} déclenchée`);
    
    // Mapper les actions aux fonctions existantes dans l'application
    switch (action) {
      case 'addItem':
        // Déclencher le clic sur le bouton d'ajout existant
        const addBtn = document.getElementById('add-btn');
        if (addBtn) {
          addBtn.click();
        } else {
          console.log('Bouton d\'ajout non trouvé');
        }
        break;
        
      case 'openMap':
        // Ouvrir la vue carte
        // À implémenter selon l'architecture de l'application
        this.showNotification('Carte', 'Ouverture de la carte...', 'map');
        break;
        
      case 'openMaintenance':
        // Ouvrir la vue entretien
        // À implémenter selon l'architecture de l'application
        this.showNotification('Entretien', 'Ouverture du module d\'entretien...', 'tool');
        break;
        
      case 'exportData':
        // Déclencher l'export
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
          exportBtn.click();
        } else {
          console.log('Bouton d\'export non trouvé');
        }
        break;
        
      default:
        console.log(`Action ${action} non implémentée`);
    }
  }
  
  showNotification(title, message, icon) {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = 'fleet-notification';
    notification.innerHTML = `
      <div class="fleet-notification-icon">
        <i data-lucide="${icon}" class="w-5 h-5"></i>
      </div>
      <div class="fleet-notification-content">
        <div class="fleet-notification-title">${title}</div>
        <div class="fleet-notification-message">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Initialiser l'icône
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Afficher avec animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Supprimer après un délai
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  // Méthode pour mettre à jour les actions en fonction du contexte
  updateActions(newActions) {
    this.actions = newActions;
    
    // Recréer le menu
    const menu = document.getElementById('fleet-fab-menu');
    menu.innerHTML = '';
    
    // Ajouter les nouvelles actions
    this.actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'fleet-fab-item';
      
      const button = document.createElement('button');
      button.className = 'fleet-fab-button';
      button.id = `fleet-fab-${action.id}`;
      button.dataset.action = action.action;
      button.innerHTML = `<i data-lucide="${action.icon}" class="w-4 h-4"></i>`;
      
      const label = document.createElement('span');
      label.className = 'fleet-fab-label';
      label.textContent = action.label;
      
      item.appendChild(button);
      item.appendChild(label);
      menu.appendChild(item);
    });
    
    // Réinitialiser les événements
    this.initEvents();
    
    // Initialiser les icônes Lucide
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

// Initialisation du FAB quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.fleetFab = new FleetFab();
  
  // Ajouter les styles pour les notifications
  const style = document.createElement('style');
  style.textContent = `
    .fleet-notification {
      position: fixed;
      bottom: 2rem;
      left: 2rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      padding: 1rem;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      max-width: 300px;
    }
    
    .fleet-notification.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .fleet-notification-icon {
      margin-right: 0.75rem;
      color: #4682B4;
    }
    
    .fleet-notification-content {
      flex: 1;
    }
    
    .fleet-notification-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .fleet-notification-message {
      font-size: 0.875rem;
      color: #64748b;
    }
  `;
  document.head.appendChild(style);
});
