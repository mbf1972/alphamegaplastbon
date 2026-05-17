const SUPABASE_URL = 'https://jhzfnatsshpohnoswxcd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JBix_f2SunAeMawTs9Y4TQ_NjXLrmfa';

async function supabase(method, path, body) {
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'POST' ? 'return=representation' : '',
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

// === Toast Notification ===
function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-family: 'Nunito', sans-serif;
        font-weight: 800;
        font-size: 0.85rem;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        z-index: 9999;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadClients();
});

async function loadClients() {
    const loading = document.getElementById('loading');
    const listContainer = document.getElementById('clients-list');
    const totalElement = document.getElementById('total-clients');

    loading.style.display = 'flex';

    try {
        const data = await supabase('GET', '/clients?select=id,type,nom,ice,adresse,tel,email,solde,plafond&order=nom.asc');

        listContainer.innerHTML = '';

        let total = 0;

        data.forEach(row => {
            const nom = row.nom || '';
            const solde = parseFloat(row.solde) || 0;
            const type = row.type === 'societe' ? 'Société' : 'Physique';
            const initial = nom.charAt(0).toUpperCase();
            total += solde;

            const rowEl = document.createElement('div');
            rowEl.className = 'client-row';
            rowEl._clientData = row;

            const avatarEl = document.createElement('div');
            avatarEl.className = 'client-avatar';
            avatarEl.textContent = initial;

            const infoEl = document.createElement('div');
            infoEl.className = 'client-info';
            
            const nomEl = document.createElement('div');
            nomEl.className = 'client-name';
            nomEl.textContent = nom;

            const subEl = document.createElement('div');
            subEl.className = 'client-sub';
            subEl.textContent = type;

            infoEl.appendChild(nomEl);
            infoEl.appendChild(subEl);

            const amountEl = document.createElement('div');
            amountEl.className = 'client-amount-box';

            const soldeEl = document.createElement('div');
            soldeEl.className = 'client-solde';
            if (solde < 0) soldeEl.classList.add('negative');
            // Format number with spaces
            soldeEl.textContent = solde.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';

            const soldeLabelEl = document.createElement('div');
            soldeLabelEl.className = 'client-solde-label';
            soldeLabelEl.textContent = 'Solde';

            amountEl.appendChild(soldeEl);
            amountEl.appendChild(soldeLabelEl);

            rowEl.appendChild(avatarEl);
            rowEl.appendChild(infoEl);
            rowEl.appendChild(amountEl);

            // Click to open detail modal
            rowEl.addEventListener('click', () => openDetailModal(row));

            listContainer.appendChild(rowEl);
        });

        totalElement.textContent = total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
    } catch (error) {
        console.error("Erreur Supabase:", error);
        alert("Erreur de connexion à la base de données.");
    } finally {
        loading.style.display = 'none';
    }
}

// === Logique du Modal d'ajout de client ===
const btnAdd = document.getElementById('btn-add-client');
const modal = document.getElementById('add-client-modal');
const btnCloseModal = document.getElementById('close-modal');
const clientTypeSelect = document.getElementById('client-type');
const iceGroup = document.getElementById('ice-group');
const btnSaveClient = document.getElementById('btn-save-client');

const inputNom = document.getElementById('client-nom');
const inputIce = document.getElementById('client-ice');
const inputAdresse = document.getElementById('client-adresse');
const inputTel = document.getElementById('client-tel');
const inputEmail = document.getElementById('client-email');
const inputSolde = document.getElementById('client-solde');
const inputPlafond = document.getElementById('client-plafond');

btnAdd.addEventListener('click', () => {
    modal.classList.add('active');
    inputNom.focus();
});

btnCloseModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

clientTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'societe') {
        iceGroup.classList.remove('hidden');
    } else {
        iceGroup.classList.add('hidden');
        inputIce.value = '';
    }
});

// Validation et Enregistrement vers Supabase
btnSaveClient.addEventListener('click', async () => {
    const type = clientTypeSelect.value;
    const nom = inputNom.value.trim();
    const ice = inputIce.value.trim();
    const adresse = inputAdresse.value.trim();
    const tel = inputTel.value.trim();
    const email = inputEmail.value.trim();
    const soldeStr = inputSolde.value.trim();
    const plafondStr = inputPlafond.value.trim();

    if (!nom) { alert("Le nom est obligatoire."); inputNom.focus(); return; }
    if (type === 'societe' && !ice) { alert("L'ICE est obligatoire pour une société."); inputIce.focus(); return; }
    if (!adresse) { alert("L'adresse est obligatoire."); inputAdresse.focus(); return; }
    if (!tel) { alert("Le téléphone est obligatoire."); inputTel.focus(); return; }
    if (soldeStr === '') { alert("Le solde est obligatoire."); inputSolde.focus(); return; }
    if (plafondStr === '') { alert("Le plafond est obligatoire."); inputPlafond.focus(); return; }

    const newClient = {
        type,
        nom,
        ice: type === 'societe' ? ice : null,
        adresse,
        tel,
        email: email || null,
        solde: parseFloat(soldeStr),
        plafond: parseFloat(plafondStr),
    };

    btnSaveClient.textContent = 'Enregistrement...';
    btnSaveClient.disabled = true;

    try {
        await supabase('POST', '/clients', newClient);

        inputNom.value = '';
        inputIce.value = '';
        inputAdresse.value = '';
        inputTel.value = '';
        inputEmail.value = '';
        inputSolde.value = '0.00';
        inputPlafond.value = '100000.00';
        clientTypeSelect.value = 'physique';
        iceGroup.classList.add('hidden');

        modal.classList.remove('active');

        // Toast de succès
        showToast('✓ Client ajouté avec succès !');

        await loadClients();
    } catch (error) {
        console.error("Erreur Supabase:", error);
        alert("Erreur lors de l'enregistrement du client.");
    } finally {
        btnSaveClient.textContent = 'Enregistrer';
        btnSaveClient.disabled = false;
    }
});

// === Detail / Edit Modal Logic ===
const detailModal = document.getElementById('detail-modal');
const detailClose = document.getElementById('detail-close');
const detailTitle = document.getElementById('detail-client-name');
const btnEdit = document.getElementById('btn-edit-client');
const btnValidate = document.getElementById('btn-validate-client');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

let currentClient = null;
let isEditMode = false;

function openDetailModal(client) {
    currentClient = client;
    isEditMode = false;
    renderDetailView(client);
    btnEdit.style.display = 'block';
    btnValidate.style.display = 'none';
    btnCancelEdit.style.display = 'none';
    detailModal.classList.add('active');
}

function closeDetailModal() {
    detailModal.classList.remove('active');
    isEditMode = false;
    currentClient = null;
}

detailClose.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});

function renderDetailView(c) {
    detailTitle.textContent = c.nom || '—';

    const typeLabel = c.type === 'societe' ? 'Société' : 'Personne physique';
    document.getElementById('detail-type').textContent = typeLabel;

    const iceRow = document.getElementById('detail-ice-row');
    if (c.type === 'societe' && c.ice) {
        iceRow.style.display = '';
        document.getElementById('detail-ice').textContent = c.ice;
    } else {
        iceRow.style.display = 'none';
    }

    document.getElementById('detail-nom').textContent = c.nom || '—';
    document.getElementById('detail-adresse').textContent = c.adresse || '—';
    document.getElementById('detail-tel').textContent = c.tel || '—';
    document.getElementById('detail-email').textContent = c.email || '—';
    document.getElementById('detail-solde').textContent = parseFloat(c.solde || 0).toFixed(2);
    document.getElementById('detail-plafond').textContent = parseFloat(c.plafond || 0).toFixed(2);

    // Remove editable class
    document.querySelectorAll('.detail-field-value').forEach(el => el.classList.remove('editable'));
}

function renderEditView(c) {
    detailTitle.textContent = 'Modifier : ' + (c.nom || '');

    const typeEl = document.getElementById('detail-type');
    typeEl.classList.add('editable');
    typeEl.innerHTML = `<select id="edit-type">
        <option value="physique" ${c.type !== 'societe' ? 'selected' : ''}>Personne physique</option>
        <option value="societe" ${c.type === 'societe' ? 'selected' : ''}>Société</option>
    </select>`;

    const iceRow = document.getElementById('detail-ice-row');
    iceRow.style.display = '';
    const iceEl = document.getElementById('detail-ice');
    iceEl.classList.add('editable');
    iceEl.innerHTML = `<input type="text" id="edit-ice" value="${escHtml(c.ice || '')}" placeholder="ICE">`;

    // Toggle ICE visibility based on type
    const editTypeSelect = document.getElementById('edit-type');
    toggleIceVisibility(editTypeSelect.value);
    editTypeSelect.addEventListener('change', (e) => toggleIceVisibility(e.target.value));

    setEditableField('detail-nom', 'edit-nom', c.nom || '', 'text', 'Nom');
    setEditableField('detail-adresse', 'edit-adresse', c.adresse || '', 'text', 'Adresse');
    setEditableField('detail-tel', 'edit-tel', c.tel || '', 'tel', 'Téléphone');
    setEditableField('detail-email', 'edit-email', c.email || '', 'email', 'E-mail');
    setEditableField('detail-solde', 'edit-solde', parseFloat(c.solde || 0).toFixed(2), 'number', 'Solde');
    setEditableField('detail-plafond', 'edit-plafond', parseFloat(c.plafond || 0).toFixed(2), 'number', 'Plafond');
}

function toggleIceVisibility(type) {
    const iceRow = document.getElementById('detail-ice-row');
    iceRow.style.display = type === 'societe' ? '' : 'none';
}

function setEditableField(containerId, inputId, value, type, placeholder) {
    const el = document.getElementById(containerId);
    el.classList.add('editable');
    const step = type === 'number' ? ' step="0.01"' : '';
    el.innerHTML = `<input type="${type}" id="${inputId}" value="${escHtml(value)}"${step} placeholder="${placeholder}">`;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Edit button
btnEdit.addEventListener('click', () => {
    isEditMode = true;
    renderEditView(currentClient);
    btnEdit.style.display = 'none';
    btnValidate.style.display = 'block';
    btnCancelEdit.style.display = 'block';
});

// Cancel edit
btnCancelEdit.addEventListener('click', () => {
    isEditMode = false;
    renderDetailView(currentClient);
    btnEdit.style.display = 'block';
    btnValidate.style.display = 'none';
    btnCancelEdit.style.display = 'none';
});

// Validate / Save changes
btnValidate.addEventListener('click', async () => {
    const type = document.getElementById('edit-type').value;
    const nom = document.getElementById('edit-nom').value.trim();
    const ice = document.getElementById('edit-ice') ? document.getElementById('edit-ice').value.trim() : '';
    const adresse = document.getElementById('edit-adresse').value.trim();
    const tel = document.getElementById('edit-tel').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const solde = document.getElementById('edit-solde').value.trim();
    const plafond = document.getElementById('edit-plafond').value.trim();

    // Validation
    if (!nom) { alert("Le nom est obligatoire."); return; }
    if (type === 'societe' && !ice) { alert("L'ICE est obligatoire pour une société."); return; }
    if (!adresse) { alert("L'adresse est obligatoire."); return; }
    if (!tel) { alert("Le téléphone est obligatoire."); return; }

    const updated = {
        type,
        nom,
        ice: type === 'societe' ? ice : null,
        adresse,
        tel,
        email: email || null,
        solde: parseFloat(solde) || 0,
        plafond: parseFloat(plafond) || 0,
    };

    btnValidate.textContent = 'Enregistrement...';
    btnValidate.disabled = true;

    try {
        await supabase('PATCH', `/clients?id=eq.${currentClient.id}`, updated);

        // Update local reference
        Object.assign(currentClient, updated);

        // Back to view mode
        isEditMode = false;
        renderDetailView(currentClient);
        btnEdit.style.display = 'block';
        btnValidate.style.display = 'none';
        btnCancelEdit.style.display = 'none';

        showToast('✓ Client modifié avec succès !');

        await loadClients();
    } catch (error) {
        console.error('Erreur modification:', error);
        alert("Erreur lors de la modification du client.");
    } finally {
        btnValidate.textContent = '✓ Valider';
        btnValidate.disabled = false;
    }
});
