/**
 * Fleet Drawer - Menu latéral pliable pour Fleet Management
 * Permet d'accéder aux différents modules de l'application
 */

class FleetDrawer {
  constructor() {
    this.isOpen = false;
    this.currentModule = 'fleet'; // Module par défaut
    
    this.init();
  }
  
  init() {
    // Création des éléments du drawer
    this.createDrawerElements();
    
    // Initialisation des événements
    this.initEvents();
    
    // Vérification du module actif
    this.checkActiveModule();
  }
  
  createDrawerElements() {
    // Création du drawer
    const drawer = document.createElement('div');
    drawer.className = 'fleet-drawer';
    drawer.id = 'fleet-drawer';
    
    // En-tête du drawer
    const header = document.createElement('div');
    header.className = 'fleet-drawer-header';
    
    const logo = document.createElement('div');
    logo.className = 'fleet-drawer-logo';
    logo.innerHTML = '<i data-lucide="truck" class="w-5 h-5"></i> Fleet Management';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'fleet-drawer-close';
    closeBtn.id = 'fleet-drawer-close';
    closeBtn.innerHTML = '<i data-lucide="x" class="w-5 h-5"></i>';
    
    header.appendChild(logo);
    header.appendChild(closeBtn);
    
    // Contenu du drawer
    const content = document.createElement('div');
    content.className = 'fleet-drawer-content';
    
    const menu = document.createElement('ul');
    menu.className = 'fleet-drawer-menu';
    
    // Définition des items du menu
    const menuItems = [
      { id: 'fleet', icon: 'truck', text: 'Flotte', href: 'fleet.html' },
      { id: 'planning', icon: 'calendar', text: 'Planning', href: '#planning' },
      { id: 'map', icon: 'map', text: 'Carte', href: '#map' },
      { id: 'history', icon: 'history', text: 'Historique', href: '#history' },
      { id: 'stats', icon: 'bar-chart-2', text: 'Statistiques', href: '#stats' },
      { id: 'maintenance', icon: 'tool', text: 'Entretien', href: '#maintenance' },
      { id: 'settings', icon: 'settings', text: 'Paramètres', href: '#settings' },
    ];
    
    menuItems.forEach(item => {
      const li = document.createElement('li');
      li.className = 'fleet-drawer-item';
      
      const a = document.createElement('a');
      a.className = 'fleet-drawer-link';
      a.id = `drawer-link-${item.id}`;
      a.href = item.href;
      a.dataset.module = item.id;
      
      a.innerHTML = `
        <i data-lucide="${item.icon}" class="fleet-drawer-icon"></i>
        <span class="fleet-drawer-text">${item.text}</span>
      `;
      
      li.appendChild(a);
      menu.appendChild(li);
    });
    
    content.appendChild(menu);
    
    // Pied de page du drawer
    const footer = document.createElement('div');
    footer.className = 'fleet-drawer-footer';
    footer.textContent = '© 2025 Fleet Management';
    
    // Assemblage du drawer
    drawer.appendChild(header);
    drawer.appendChild(content);
    drawer.appendChild(footer);
    
    // Création du bouton toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'fleet-drawer-toggle';
    toggleBtn.id = 'fleet-drawer-toggle';
    toggleBtn.innerHTML = '<i data-lucide="menu" class="w-5 h-5"></i>';
    
    // Création de l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'fleet-drawer-overlay';
    overlay.id = 'fleet-drawer-overlay';
    
    // Ajout des éléments au DOM
    document.body.appendChild(drawer);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(overlay);
    
    // Initialisation des icônes Lucide
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  initEvents() {
    // Ouverture du drawer
    const toggleBtn = document.getElementById('fleet-drawer-toggle');
    toggleBtn.addEventListener('click', () => this.toggleDrawer());
    
    // Fermeture du drawer
    const closeBtn = document.getElementById('fleet-drawer-close');
    closeBtn.addEventListener('click', () => this.closeDrawer());
    
    // Fermeture en cliquant sur l'overlay
    const overlay = document.getElementById('fleet-drawer-overlay');
    overlay.addEventListener('click', () => this.closeDrawer());
    
    // Navigation entre les modules
    const links = document.querySelectorAll('.fleet-drawer-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Si le lien pointe vers une ancre, empêcher la navigation par défaut
        if (link.getAttribute('href').startsWith('#')) {
          e.preventDefault();
          this.setActiveModule(link.dataset.module);
          
          // Fermer le drawer sur mobile
          if (window.innerWidth < 768) {
            this.closeDrawer();
          }
          
          // Ici, vous pourriez implémenter la logique pour charger le module correspondant
          console.log(`Module ${link.dataset.module} sélectionné`);
        }
      });
    });
    
    // Gestion du responsive
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1200 && this.isOpen) {
        document.querySelector('.main-content').classList.add('drawer-open');
      } else {
        document.querySelector('.main-content').classList.remove('drawer-open');
      }
    });
    
    // Raccourci clavier (Ctrl+B) pour ouvrir/fermer le drawer
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.toggleDrawer();
      }
      
      // Échap pour fermer le drawer
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDrawer();
      }
    });
  }
  
  toggleDrawer() {
    if (this.isOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }
  
  openDrawer() {
    const drawer = document.getElementById('fleet-drawer');
    const overlay = document.getElementById('fleet-drawer-overlay');
    const mainContent = document.querySelector('.main-content');
    
    drawer.classList.add('open');
    overlay.classList.add('active');
    
    if (window.innerWidth > 1200) {
      mainContent.classList.add('drawer-open');
    }
    
    this.isOpen = true;
  }
  
  closeDrawer() {
    const drawer = document.getElementById('fleet-drawer');
    const overlay = document.getElementById('fleet-drawer-overlay');
    const mainContent = document.querySelector('.main-content');
    
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    mainContent.classList.remove('drawer-open');
    
    this.isOpen = false;
  }
  
  setActiveModule(moduleId) {
    // Retirer la classe active de tous les liens
    document.querySelectorAll('.fleet-drawer-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Ajouter la classe active au lien sélectionné
    const activeLink = document.getElementById(`drawer-link-${moduleId}`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
    
    this.currentModule = moduleId;
    
    // Déclencher un événement personnalisé pour informer l'application du changement de module
    const event = new CustomEvent('moduleChanged', {
      detail: { moduleId }
    });
    document.dispatchEvent(event);
  }
  
  checkActiveModule() {
    // Déterminer le module actif en fonction de l'URL
    const currentPath = window.location.pathname;
    let activeModule = 'fleet'; // Par défaut
    
    if (currentPath.includes('fleet.html')) {
      activeModule = 'fleet';
    } else if (currentPath.includes('planning.html')) {
      activeModule = 'planning';
    } else if (currentPath.includes('map.html')) {
      activeModule = 'map';
    } else if (currentPath.includes('history.html')) {
      activeModule = 'history';
    } else if (currentPath.includes('stats.html')) {
      activeModule = 'stats';
    } else if (currentPath.includes('maintenance.html')) {
      activeModule = 'maintenance';
    } else if (currentPath.includes('settings.html')) {
      activeModule = 'settings';
    }
    
    this.setActiveModule(activeModule);
  }
}

// Initialisation du drawer quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter la classe main-content au contenu principal
  const mainContent = document.querySelector('body > :not(.fleet-drawer, .fleet-drawer-toggle, .fleet-drawer-overlay, .fleet-fab-container)');
  if (mainContent) {
    mainContent.classList.add('main-content');
  }
  
  // Initialiser le drawer
  window.fleetDrawer = new FleetDrawer();
});
