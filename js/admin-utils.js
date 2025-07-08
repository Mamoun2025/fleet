// Fichier admin-utils.js - Fonctions utilitaires pour la page d'administration

/**
 * Met à jour les statistiques des utilisateurs dans l'interface
 */
function updateUserStats() {
    // Vérifier que les données des utilisateurs sont disponibles
    if (!users || !Array.isArray(users)) {
        console.warn('Impossible de mettre à jour les statistiques des utilisateurs: données non disponibles');
        return;
    }
    
    console.log('Mise à jour des statistiques des utilisateurs:', users.length, 'utilisateurs');
    
    // Calculer les statistiques
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.isAdmin).length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    
    // Mettre à jour l'élément HTML pour le nombre total d'utilisateurs
    document.getElementById('stats-users').textContent = totalUsers;
    
    console.log('Statistiques des utilisateurs mises à jour:', {
        totalUsers,
        adminUsers,
        activeUsers
    });
}

/**
 * Charge les données des utilisateurs depuis l'API
 * @returns {Promise} - Promise résolue avec les données des utilisateurs
 */
function loadUsers() {
    const token = localStorage.getItem('token');
    console.log('Chargement des utilisateurs avec token:', token);
    
    // S'assurer que le tableau est initialisé
    if (!usersTable) {
        initUsersTable();
    }
    
    // Afficher un message de chargement
    showInfo('Chargement des utilisateurs en cours...');
    
    return new Promise((resolve, reject) => {
        fetch(`${API_URL}/api/auth/users`, {
            method: 'GET',
            headers: {
                'x-auth-token': token
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur ${response.status} lors du chargement des utilisateurs`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Utilisateurs chargés:', data.length);
            users = data;
            
            // Mettre à jour le tableau des utilisateurs
            usersTable.setData(users);
            
            // Mettre à jour les statistiques
            updateUserStats();
            
            // Afficher un message de succès
            showSuccess(`${users.length} utilisateurs chargés avec succès`);
            resolve(users);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des utilisateurs:', error);
            showError('Erreur lors du chargement des utilisateurs');
            reject(error);
        });
    });
}

/**
 * Initialise le tableau des utilisateurs
 */
function initUsersTable() {
    // Détruire le tableau existant s'il existe
    if (usersTable) {
        usersTable.destroy();
    }
    
    // Formateur pour les dates
    var dateFormatter = function(cell, formatterParams) {
        var value = cell.getValue();
        
        // Vérifier si la valeur est nulle ou vide
        if (!value) {
            return "<span class='text-gray-400'>Jamais</span>";
        }
        
        try {
            var date = new Date(value);
            // Vérifier si la date est valide
            if (isNaN(date.getTime())) {
                return "<span class='text-gray-400'>Date invalide</span>";
            }
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            console.error('Erreur de formatage de date:', e, value);
            return "<span class='text-gray-400'>Format invalide</span>";
        }
    };
    
    // Formateur pour le statut
    var statusFormatter = function(cell, formatterParams) {
        var value = cell.getValue();
        var color, icon;
        
        switch(value) {
            case 'active':
                color = 'badge-success';
                icon = 'check-circle';
                break;
            case 'inactive':
                color = 'badge-warning';
                icon = 'alert-circle';
                break;
            case 'suspended':
                color = 'badge-error';
                icon = 'x-circle';
                break;
            default:
                color = 'badge-ghost';
                icon = 'help-circle';
        }
        
        return `<div class="badge ${color} gap-1"><i data-lucide="${icon}" class="w-3 h-3"></i> ${value.charAt(0).toUpperCase() + value.slice(1)}</div>`;
    };
    
    // Initialiser le tableau
    usersTable = new Tabulator("#users-table", {
        layout: "fitColumns",
        pagination: "local",
        paginationSize: 10,
        placeholder: "Aucun utilisateur trouvé",
        columns: [
            { title: "Nom", field: "name", sorter: "string", width: 200 },
            { title: "Email", field: "email", sorter: "string", width: 250 },
            { title: "Entreprise", field: "companyName", sorter: "string", width: 200 },
            { title: "Statut", field: "status", formatter: statusFormatter, width: 120, sorter: "string" },
            { title: "Admin", field: "isAdmin", formatter: "tickCross", width: 100, hozAlign: "center" },
            { title: "Inscription", field: "created_at", sorter: "date", formatter: dateFormatter, width: 150 },
            {
                title: "Actions",
                formatter: function(cell, formatterParams, onRendered) {
                    const rowData = cell.getRow().getData();
                    return `
                        <div class="flex justify-center gap-2">
                            <button onclick="editUser('${rowData._id}')" class="btn btn-sm btn-circle btn-ghost" title="Modifier">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button onclick="resetUserPassword('${rowData._id}')" class="btn btn-sm btn-circle btn-warning" title="Réinitialiser le mot de passe">
                                <i data-lucide="key" class="w-4 h-4"></i>
                            </button>
                            <button onclick="deleteUser('${rowData._id}')" class="btn btn-sm btn-circle btn-error" title="Supprimer">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `;
                },
                width: 150,
                hozAlign: "center"
            }
        ],
        renderComplete: function() {
            // Initialiser les icônes Lucide après le rendu du tableau
            lucide.createIcons();
            console.log("Tableau des utilisateurs rendu avec succès");
        }
    });
    
    console.log("Tableau des utilisateurs initialisé");
}
