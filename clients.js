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

    // Reset tabs state
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    const infoTab = document.getElementById('tab-infos');
    if (infoTab) infoTab.classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    const infoPanel = document.getElementById('panel-infos');
    if (infoPanel) infoPanel.style.display = 'block';

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

// === Tabs and Relevé System ===

function switchDetailTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.detail-tab').forEach(tab => tab.classList.remove('active'));
    // Add active class to selected tab
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');

    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(panel => panel.style.display = 'none');
    // Show selected panel
    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) targetPanel.style.display = 'block';

    // If "releve" is clicked, fetch and render transactions
    if (tabName === 'releve') {
        loadClientReleve(currentClient);
    }
    
    // If "paiement" is clicked, set default date
    if (tabName === 'paiement') {
        document.getElementById('pay-date').valueAsDate = new Date();
        document.getElementById('pay-amount').value = '';
        document.getElementById('pay-ref').value = '';
        const imgGroup = document.getElementById('pay-image-group');
        if (imgGroup) imgGroup.style.display = 'none';
        clearUploadedImage();
    }
}
window.switchDetailTab = switchDetailTab;

async function loadClientReleve(client) {
    const list = document.getElementById('releve-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-weight: bold;">Chargement de l\'historique...</div>';
    
    try {
        const [bons, paiements] = await Promise.all([
            supabase('GET', `/bons?client_id=eq.${client.id}&order=date_bon.asc,created_at.asc`),
            supabase('GET', `/paiements?client_id=eq.${client.id}&order=date_paiement.asc,created_at.asc`)
        ]);

        // Calculate Initial Balance dynamically:
        // Initial Balance = Current Solde - Sum(Bons) + Sum(Paiements)
        const totalBons = bons.reduce((sum, b) => sum + (parseFloat(b.total_general) || 0), 0);
        const totalPaiements = paiements.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
        const currentSolde = parseFloat(client.solde) || 0;
        const initialBalance = currentSolde - totalBons + totalPaiements;

        const transactions = [];

        // Add initial balance row
        transactions.push({
            date: '', // Will sort first
            ref: 'INITIAL',
            type: 'Solde initial',
            debit: initialBalance >= 0 ? initialBalance : 0,
            credit: initialBalance < 0 ? -initialBalance : 0,
            isInitial: true
        });

        bons.forEach(b => {
            transactions.push({
                date: b.date_bon,
                ref: `BL ${b.num_bon}`,
                type: 'Livraison',
                debit: parseFloat(b.total_general) || 0,
                credit: 0,
                timestamp: new Date(b.created_at || b.date_bon).getTime()
            });
        });

        paiements.forEach(p => {
            transactions.push({
                date: p.date_paiement,
                ref: p.reference || 'Reg',
                type: `Paiement (${p.mode_paiement})`,
                debit: 0,
                credit: parseFloat(p.montant) || 0,
                timestamp: new Date(p.created_at || p.date_paiement).getTime(),
                image_data: p.image_data || null
            });
        });

        // Sort transactions
        transactions.sort((a, b) => {
            if (a.isInitial) return -1;
            if (b.isInitial) return 1;
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        list.innerHTML = '';
        let runningBalance = 0;

        transactions.forEach(t => {
            const row = document.createElement('div');
            row.className = 'releve-row';
            if (t.isInitial) row.classList.add('initial-row');

            runningBalance += t.debit - t.credit;

            let displayDate = '—';
            if (t.date) {
                const parts = t.date.split('-');
                if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else if (t.isInitial) {
                displayDate = 'Départ';
            }

            const dateDiv = document.createElement('div');
            dateDiv.textContent = displayDate;

            const refDiv = document.createElement('div');
            refDiv.style.display = 'flex';
            refDiv.style.alignItems = 'center';
            refDiv.style.justifyContent = 'center';
            
            const refText = document.createElement('span');
            refText.textContent = t.ref;
            refDiv.appendChild(refText);
            
            if (t.image_data) {
                const camIcon = document.createElement('span');
                camIcon.className = 'releve-cam-icon';
                camIcon.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
                camIcon.title = "Voir le chèque / effet";
                
                camIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openImageViewer(t.image_data, t.ref);
                });
                refDiv.appendChild(camIcon);
            }
            
            refDiv.title = t.type;
            refDiv.style.cursor = 'help';

            const debitDiv = document.createElement('div');
            debitDiv.className = 'releve-debit';
            debitDiv.textContent = t.debit > 0 ? t.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

            const creditDiv = document.createElement('div');
            creditDiv.className = 'releve-credit';
            creditDiv.textContent = t.credit > 0 ? t.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

            const soldeDiv = document.createElement('div');
            soldeDiv.className = 'releve-solde-val';
            soldeDiv.textContent = runningBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            row.appendChild(dateDiv);
            row.appendChild(refDiv);
            row.appendChild(debitDiv);
            row.appendChild(creditDiv);
            row.appendChild(soldeDiv);

            list.appendChild(row);
        });

        if (transactions.length <= 1 && initialBalance === 0) {
            list.innerHTML = '<div class="releve-empty">Aucun historique de transaction.</div>';
        }

    } catch (e) {
        console.error("Erreur historique:", e);
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444; font-weight: bold;">Erreur de chargement.</div>';
    }
}

// === Save Payment / Règlement ===
const btnSavePayment = document.getElementById('btn-save-payment');
if (btnSavePayment) {
    btnSavePayment.addEventListener('click', async () => {
        const amountVal = document.getElementById('pay-amount').value.trim();
        const methodVal = document.getElementById('pay-method').value;
        const refVal = document.getElementById('pay-ref').value.trim();
        const dateVal = document.getElementById('pay-date').value;

        if (!amountVal || parseFloat(amountVal) <= 0) {
            alert("Veuillez saisir un montant de règlement valide.");
            return;
        }

        if (!dateVal) {
            alert("Veuillez choisir une date.");
            return;
        }

        btnSavePayment.textContent = 'Enregistrement...';
        btnSavePayment.disabled = true;

        try {
            const newPayment = {
                client_id: currentClient.id,
                date_paiement: dateVal,
                montant: parseFloat(amountVal),
                mode_paiement: methodVal,
                reference: refVal || null,
                image_data: uploadedImageBase64 || null
            };

            await supabase('POST', '/paiements', newPayment);

            // Update client's local balance (trigger took care of DB, we update local object)
            currentClient.solde = (parseFloat(currentClient.solde) || 0) - parseFloat(amountVal);

            showToast('✓ Règlement enregistré avec succès !');
            
            clearUploadedImage();

            // Switch to Relevé tab to see the updated transaction
            switchDetailTab('releve');

            // Reload background client list to update amounts and totals
            await loadClients();

        } catch (e) {
            console.error("Erreur règlement:", e);
            alert("Une erreur s'est produite lors de l'enregistrement du règlement : " + e.message);
        } finally {
            btnSavePayment.textContent = 'Enregistrer le règlement';
            btnSavePayment.disabled = false;
        }
    });
}

// ==========================================
//   GESTION DES IMAGES ET DE LA COMPRESSION
// ==========================================

let uploadedImageBase64 = null;

const uploadContainer = document.getElementById('upload-container');
const payImageFile = document.getElementById('pay-image-file');
const uploadPrompt = document.getElementById('upload-prompt');
const uploadPreview = document.getElementById('upload-preview');
const previewImg = document.getElementById('preview-img');
const btnRemoveImg = document.getElementById('btn-remove-img');
const payMethodSelect = document.getElementById('pay-method');

if (payMethodSelect) {
    payMethodSelect.addEventListener('change', () => {
        const selected = payMethodSelect.value;
        const imgGroup = document.getElementById('pay-image-group');
        if (imgGroup) {
            if (selected === 'Chèque' || selected === 'Effet') {
                imgGroup.style.display = 'block';
            } else {
                imgGroup.style.display = 'none';
                clearUploadedImage();
            }
        }
    });
}

if (uploadContainer && payImageFile) {
    uploadContainer.addEventListener('click', (e) => {
        if (e.target !== btnRemoveImg && !btnRemoveImg.contains(e.target)) {
            payImageFile.click();
        }
    });
}

if (payImageFile) {
    payImageFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const promptText = uploadPrompt.querySelector('span');
        const origText = promptText.textContent;
        promptText.textContent = 'Compression en cours...';

        try {
            const rawBase64 = await readFileAsBase64(file);
            
            try {
                // Compresseur Python via microservice local
                uploadedImageBase64 = await sendToPythonCompressor(rawBase64);
                console.log("Image compressée avec succès via Python.");
            } catch (pyErr) {
                console.warn("Le microservice Python local est indisponible. Utilisation du compresseur Canvas HTML5 local...", pyErr);
                // Fallback direct en Canvas HTML5 si le script Python n'est pas démarré
                uploadedImageBase64 = await compressImageJS(file);
            }

            previewImg.src = uploadedImageBase64;
            uploadPrompt.style.display = 'none';
            uploadPreview.style.display = 'flex';
        } catch (err) {
            console.error("Erreur compression image :", err);
            alert("Impossible de traiter cette image. Veuillez réessayer.");
            clearUploadedImage();
        } finally {
            promptText.textContent = origText;
        }
    });
}

if (btnRemoveImg) {
    btnRemoveImg.addEventListener('click', (e) => {
        e.stopPropagation();
        clearUploadedImage();
    });
}

function clearUploadedImage() {
    uploadedImageBase64 = null;
    if (payImageFile) payImageFile.value = '';
    if (uploadPrompt) uploadPrompt.style.display = 'flex';
    if (uploadPreview) uploadPreview.style.display = 'none';
    if (previewImg) previewImg.src = '';
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function sendToPythonCompressor(base64Image) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // 2 secondes de timeout

    const res = await fetch('http://127.0.0.1:5001/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal
    });
    clearTimeout(id);
    const result = await res.json();
    if (result.status === 'Success') {
        return result.webp_base64;
    } else {
        throw new Error(result.message);
    }
}

function compressImageJS(file, maxDimension = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const webpBase64 = canvas.toDataURL('image/webp', 0.70);
                resolve(webpBase64);
            };
            img.onerror = err => reject(err);
        };
        reader.onerror = err => reject(err);
    });
}

// ==========================================
//      VISIONNEUSE DE CHÈQUES (MODAL)
// ==========================================

const viewerOverlay = document.getElementById('viewer-overlay');
const viewerImg = document.getElementById('viewer-img');
const viewerClose = document.getElementById('viewer-close');
const viewerTitle = document.getElementById('viewer-title');

function openImageViewer(imageData, titleRef) {
    if (!viewerOverlay || !viewerImg) return;
    viewerImg.src = imageData;
    if (viewerTitle) viewerTitle.textContent = `Justificatif de règlement : ${titleRef}`;
    viewerOverlay.classList.add('active');
}

if (viewerClose) {
    viewerClose.addEventListener('click', closeImageViewer);
}
if (viewerOverlay) {
    viewerOverlay.addEventListener('click', (e) => {
        if (e.target === viewerOverlay) closeImageViewer();
    });
}

function closeImageViewer() {
    if (viewerOverlay) viewerOverlay.classList.remove('active');
    if (viewerImg) viewerImg.src = '';
}
