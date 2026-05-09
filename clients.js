const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwNG2S1-QVKJhPCWzFArxIcRCEZyX5A8LJdZJ-UgZzIERvGNiZ001Va_Z4qJXCXxn7u/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadClients();
});

async function loadClients() {
    const loading = document.getElementById('loading');
    const listContainer = document.getElementById('clients-list');
    const totalElement = document.getElementById('total-clients');
    
    // Afficher le chargement
    loading.style.display = 'flex';
    
    try {
        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getClientsData" }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        
        const result = await response.json();
        
        if (result.status === "Success") {
            const data = result.data;
            listContainer.innerHTML = ''; // Nettoyer la liste
            
            let total = 0;
            
            // Générer les lignes HTML
            data.forEach(row => {
                const nom = row[0] || '';
                const solde = parseFloat(row[1]) || 0;
                total += solde;
                
                const rowEl = document.createElement('div');
                rowEl.className = 'client-row';
                
                const nomEl = document.createElement('div');
                nomEl.className = 'client-name';
                nomEl.textContent = nom;
                
                const soldeEl = document.createElement('div');
                soldeEl.className = 'client-solde';
                soldeEl.textContent = solde.toFixed(2);
                
                rowEl.appendChild(nomEl);
                rowEl.appendChild(soldeEl);
                
                listContainer.appendChild(rowEl);
            });
            
            // Afficher le total
            totalElement.textContent = total.toFixed(2);
        } else {
            console.error("Erreur serveur:", result.message);
            alert("Erreur lors du chargement des clients: " + result.message);
        }
    } catch (error) {
        console.error("Erreur réseau:", error);
        alert("Erreur de connexion au serveur Google.");
    } finally {
        // Masquer le chargement
        loading.style.display = 'none';
    }
}

// === Logique du Modal d'ajout de client ===
const btnAdd = document.querySelector('.btn-add');
const modal = document.getElementById('add-client-modal');
const btnCloseModal = document.getElementById('close-modal');
const clientTypeSelect = document.getElementById('client-type');
const iceGroup = document.getElementById('ice-group');
const btnSaveClient = document.getElementById('btn-save-client');

// Inputs
const inputNom = document.getElementById('client-nom');
const inputIce = document.getElementById('client-ice');
const inputAdresse = document.getElementById('client-adresse');
const inputTel = document.getElementById('client-tel');
const inputEmail = document.getElementById('client-email');
const inputSolde = document.getElementById('client-solde');
const inputPlafond = document.getElementById('client-plafond');

// Ouvrir le modal
btnAdd.addEventListener('click', () => {
    modal.classList.add('active');
    inputNom.focus();
});

// Fermer le modal
btnCloseModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

// Fermer en cliquant en dehors
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Gérer l'affichage de l'ICE selon le type
clientTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'societe') {
        iceGroup.classList.remove('hidden');
    } else {
        iceGroup.classList.add('hidden');
        inputIce.value = ''; // Réinitialiser si on repasse en physique
    }
});

// Validation et Enregistrement
btnSaveClient.addEventListener('click', () => {
    const type = clientTypeSelect.value;
    const nom = inputNom.value.trim();
    const ice = inputIce.value.trim();
    const adresse = inputAdresse.value.trim();
    const tel = inputTel.value.trim();
    const email = inputEmail.value.trim();
    const soldeStr = inputSolde.value.trim();
    const plafondStr = inputPlafond.value.trim();

    // Validation des champs obligatoires
    if (!nom) {
        alert("Le nom est obligatoire.");
        inputNom.focus();
        return;
    }
    if (type === 'societe' && !ice) {
        alert("L'ICE est obligatoire pour une société.");
        inputIce.focus();
        return;
    }
    if (!adresse) {
        alert("L'adresse est obligatoire.");
        inputAdresse.focus();
        return;
    }
    if (!tel) {
        alert("Le téléphone est obligatoire.");
        inputTel.focus();
        return;
    }
    if (soldeStr === '') {
        alert("Le solde est obligatoire.");
        inputSolde.focus();
        return;
    }
    if (plafondStr === '') {
        alert("Le plafond est obligatoire.");
        inputPlafond.focus();
        return;
    }

    const solde = parseFloat(soldeStr);
    const plafond = parseFloat(plafondStr);

    const newClientData = {
        type, 
        nom, 
        ice: type === 'societe' ? ice : null, 
        adresse, 
        tel, 
        email,
        solde,
        plafond
    };

    // Pour le moment, on affiche un message et on nettoie le formulaire
    console.log("Nouveau client à enregistrer :", newClientData);
    alert("Les informations du client ont été validées !\n(L'enregistrement réel vers la base de données sera ajouté ultérieurement)");
    
    // Réinitialiser le formulaire
    inputNom.value = '';
    inputIce.value = '';
    inputAdresse.value = '';
    inputTel.value = '';
    inputEmail.value = '';
    inputSolde.value = '0.00';
    inputPlafond.value = '100000.00';
    clientTypeSelect.value = 'physique';
    iceGroup.classList.add('hidden');
    
    // Fermer le modal
    modal.classList.remove('active');
});
