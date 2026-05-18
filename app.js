/* ========================================
   BON DE LIVRAISON - Application Logic
   ======================================== */

// === State ===
let items = [];
let nextId = 1;
let selectedClientId = null;
let clientList = [];

// === Supabase Helper ===
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

// === DOM References ===
const qteInput = document.getElementById('qte');
const diamInput = document.getElementById('diam');
const longInput = document.getElementById('long');
const prixInput = document.getElementById('prix');
const srInput = document.getElementById('sr');
const colorInput = document.getElementById('color');
const dateBonInput = document.getElementById('date-bon');
const clientNomInput = document.getElementById('client-nom');
const clientAdresseInput = document.getElementById('client-adresse');
const autocompleteList = document.getElementById('autocomplete-list');
const numBonDisplay = document.getElementById('num-bon-display');
const btnValider = document.getElementById('btn-valider');
const btnPdf = document.getElementById('btn-pdf');
const itemsZone = document.getElementById('items-zone');
const totalSection = document.getElementById('total-section');
const totalGeneral = document.getElementById('total-general');

// === French Date Picker ===
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

let pickerDate = new Date();
let pickerMonth = pickerDate.getMonth();
let pickerYear = pickerDate.getFullYear();

// === Load / Init N° Bon ===
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwNG2S1-QVKJhPCWzFArxIcRCEZyX5A8LJdZJ-UgZzIERvGNiZ001Va_Z4qJXCXxn7u/exec";

let currentNumBon = '...';
function updateNumBonDisplay() {
    if (numBonDisplay) numBonDisplay.textContent = currentNumBon;
}
updateNumBonDisplay();

// Fetch current N° Bon from Google Sheets
async function fetchNumBon() {
    try {
        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL + "?action=getNumBon");
        const data = await response.json();
        if (data && data.numBon) {
            currentNumBon = parseInt(data.numBon);
            updateNumBonDisplay();
            localStorage.setItem('num-bon', currentNumBon);
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du numéro de bon:", e);
        // Fallback to local storage if network fails
        currentNumBon = parseInt(localStorage.getItem('num-bon')) || 100230;
        updateNumBonDisplay();
    }
}
fetchNumBon();

// === Load Clients and Autocomplete ===
async function fetchClients() {
    try {
        clientList = await supabase('GET', '/clients?select=id,nom,adresse&order=nom.asc');
    } catch (e) {
        console.error("Erreur lors de la récupération des clients:", e);
    }
}
fetchClients();

// Autocomplete UI logic
if (clientNomInput && autocompleteList) {
    clientNomInput.addEventListener('input', function() {
        const val = this.value.trim().toLowerCase();
        autocompleteList.innerHTML = '';
        if (!val) {
            autocompleteList.style.display = 'none';
            selectedClientId = null;
            return;
        }

        const matches = clientList.filter(c => c.nom.toLowerCase().includes(val));
        if (matches.length === 0) {
            autocompleteList.style.display = 'none';
            selectedClientId = null;
            return;
        }

        matches.forEach(client => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = client.nom;
            item.addEventListener('click', function() {
                clientNomInput.value = client.nom;
                clientAdresseInput.value = client.adresse || '';
                selectedClientId = client.id;
                autocompleteList.style.display = 'none';
            });
            autocompleteList.appendChild(item);
        });

        autocompleteList.style.display = 'block';
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== clientNomInput && e.target !== autocompleteList) {
            autocompleteList.style.display = 'none';
        }
    });
}

// Set today's date
function formatDateFR(d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
dateBonInput.value = formatDateFR(new Date());
dateBonInput.readOnly = true;
dateBonInput.style.cursor = 'pointer';

// Create calendar popup
const calendarOverlay = document.createElement('div');
calendarOverlay.id = 'calendar-overlay';
calendarOverlay.innerHTML = `
    <div class="cal-popup" id="cal-popup">
        <div class="cal-header">
            <button class="cal-nav" id="cal-prev">◀</button>
            <span class="cal-title" id="cal-title"></span>
            <button class="cal-nav" id="cal-next">▶</button>
        </div>
        <div class="cal-days-header"></div>
        <div class="cal-grid" id="cal-grid"></div>
    </div>
`;
document.body.appendChild(calendarOverlay);

// Fill days header
const daysHeader = calendarOverlay.querySelector('.cal-days-header');
JOURS.forEach(j => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = j;
    daysHeader.appendChild(el);
});

function renderCalendar() {
    const title = calendarOverlay.querySelector('#cal-title');
    const grid = calendarOverlay.querySelector('#cal-grid');
    title.textContent = MOIS[pickerMonth] + ' ' + pickerYear;
    grid.innerHTML = '';

    const firstDay = new Date(pickerYear, pickerMonth, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const today = new Date();

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-cell empty';
        grid.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.textContent = d;
        if (d === today.getDate() && pickerMonth === today.getMonth() && pickerYear === today.getFullYear()) {
            cell.classList.add('today');
        }
        cell.addEventListener('click', () => {
            const selected = new Date(pickerYear, pickerMonth, d);
            dateBonInput.value = formatDateFR(selected);
            closeCalendar();
        });
        grid.appendChild(cell);
    }
}

function openCalendar() {
    // Parse current value to set picker position
    const parts = dateBonInput.value.split('/');
    if (parts.length === 3) {
        pickerMonth = parseInt(parts[1]) - 1;
        pickerYear = parseInt(parts[2]);
    }
    renderCalendar();
    calendarOverlay.classList.add('open');
}

function closeCalendar() {
    calendarOverlay.classList.remove('open');
}

dateBonInput.addEventListener('click', openCalendar);
calendarOverlay.addEventListener('click', (e) => {
    if (e.target === calendarOverlay) closeCalendar();
});

calendarOverlay.querySelector('#cal-prev').addEventListener('click', () => {
    pickerMonth--;
    if (pickerMonth < 0) { pickerMonth = 11; pickerYear--; }
    renderCalendar();
});

calendarOverlay.querySelector('#cal-next').addEventListener('click', () => {
    pickerMonth++;
    if (pickerMonth > 11) { pickerMonth = 0; pickerYear++; }
    renderCalendar();
});

// === Format Number (no currency) ===
function formatNumber(amount) {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// === Valider Button ===
btnValider.addEventListener('click', function () {
    const qte = parseFloat(qteInput.value);
    const diam = parseFloat(diamInput.value);
    const long = parseFloat(longInput.value);
    const prix = parseFloat(prixInput.value);
    const sr = srInput.value.trim();
    const color = colorInput.value.trim();

    // Basic validation: at least qte and prix
    if (!qte || !prix) {
        shakeButton(btnValider);
        return;
    }

    const total = qte * prix * (long || 0);

    const item = {
        id: nextId++,
        qte,
        diam: diam || 0,
        long: long || 0,
        prix,
        sr: sr || '-',
        color: color || '-',
        total
    };

    items.push(item);

    // Clear inputs
    qteInput.value = '';
    diamInput.value = '';
    longInput.value = '';
    prixInput.value = '';
    colorInput.value = '';

    // Focus first input
    qteInput.focus();

    // Update display
    renderItems();
    updateTotal();
});

// === Render Items ===
function renderItems() {
    totalSection.style.display = items.length > 0 ? 'block' : 'none';

    let html = '';

    // Ligne d'entête (Header) - Toujours visible
    html += `
        <div class="item-row header">
            <div class="item-desc">Désignation</div>
            <div class="item-qte">Qté</div>
            <div class="item-prix">P.U.</div>
            <div class="item-total">Total</div>
            <div></div>
        </div>
    `;

    // Articles réels
    items.forEach(item => {
        const colorUpper = item.color !== '-' ? item.color.toUpperCase() : '';
        const srText = item.sr !== '-' ? ` · ${item.sr}` : '';
        const colorText = colorUpper ? ` · ${colorUpper}` : '';
        const desc = `Tube PVC Ø${item.diam}${colorText} — ${item.long}m${srText}`;
        html += `
            <div class="item-row" id="row-${item.id}">
                <div class="item-desc">${desc}</div>
                <div class="item-qte">${item.qte}</div>
                <div class="item-prix">${formatNumber(item.prix)}</div>
                <div class="item-total">${formatNumber(item.total)}</div>
                <button class="btn-remove" onclick="removeItem(${item.id})" aria-label="Supprimer">✕</button>
            </div>
        `;
    });

    // Lignes vides pour remplir l'espace
    const minRows = 5;
    const currentRows = items.length;
    if (currentRows < minRows) {
        for (let i = 0; i < (minRows - currentRows); i++) {
            html += `
                <div class="item-row empty-row">
                    <div class="item-desc">&nbsp;</div>
                    <div class="item-qte">&nbsp;</div>
                    <div class="item-prix">&nbsp;</div>
                    <div class="item-total">&nbsp;</div>
                    <div></div>
                </div>
            `;
        }
    }

    itemsZone.innerHTML = html;
}

// === Remove Item ===
function removeItem(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) {
        row.style.opacity = '0';
        row.style.transform = 'translateX(30px)';
        row.style.transition = 'all 0.25s ease';
        setTimeout(() => {
            items = items.filter(i => i.id !== id);
            renderItems();
            updateTotal();
        }, 250);
    }
}

// === Update Total ===
function updateTotal() {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    totalGeneral.textContent = formatNumber(total);
}

// === Escape HTML ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === Shake animation for validation feedback ===
function shakeButton(btn) {
    btn.style.animation = 'none';
    void btn.offsetWidth;
    btn.style.animation = 'shake 0.4s ease';
    setTimeout(() => { btn.style.animation = 'none'; }, 400);
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

// === PDF Button & Auto-Sync Sheets ===

btnPdf.addEventListener('click', async function () {
    if (items.length === 0) {
        shakeButton(btnPdf);
        return;
    }

    if (!selectedClientId) {
        alert("Veuillez sélectionner un client de la liste d'autocomplétion pour enregistrer le bon.");
        shakeButton(btnPdf);
        return;
    }

    const originalText = this.textContent;
    this.textContent = 'Enregistrement Supabase...';
    this.disabled = true;

    // Préparation des données
    const totalG = items.reduce((sum, item) => sum + item.total, 0);
    const dateParts = dateBonInput.value.split('/'); // DD/MM/YYYY
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // YYYY-MM-DD

    try {
        // Étape 1 : Enregistrer l'entête du Bon de livraison dans Supabase
        const bonHeader = {
            num_bon: parseInt(currentNumBon),
            date_bon: formattedDate,
            client_id: selectedClientId,
            client_nom: clientNomInput.value.trim(),
            client_adresse: clientAdresseInput.value.trim(),
            total_general: totalG
        };
        
        const createdBons = await supabase('POST', '/bons', bonHeader);
        if (!createdBons || createdBons.length === 0) {
            throw new Error("L'insertion dans la table 'bons' n'a pas retourné de résultat.");
        }
        const newBon = createdBons[0];

        // Étape 2 : Enregistrer les articles du Bon de livraison dans Supabase
        const bonLines = items.map(item => ({
            bon_id: newBon.id,
            qte: item.qte,
            diam: item.diam,
            long: item.long,
            prix: item.prix,
            sr: item.sr,
            color: item.color,
            total: item.total
        }));

        await supabase('POST', '/bon_items', bonLines);

        this.textContent = 'Génération PDF...';

        // Étape 3 : Envoyer vers Google Apps Script (remplit la feuille + génère le PDF)
        const payload = {
            dateBon: dateBonInput.value,
            numBon: currentNumBon,
            clientNom: clientNomInput.value || '-',
            clientAdresse: clientAdresseInput.value || '-',
            totalGeneral: totalG,
            items: items.map(item => ({
                desc: `Tube PVC D: ${item.diam} ${item.color.toUpperCase()} ${item.long}M ${item.sr === '-' ? '' : item.sr}`.trim(),
                qte: item.qte,
                metrage: item.qte * (item.long || 0),
                prix: item.prix,
                total: item.total
            }))
        };

        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.status === "Success") {
            // Téléchargement automatique du PDF reçu en Base64
            const linkSource = `data:application/pdf;base64,${result.base64}`;
            const downloadLink = document.createElement("a");
            downloadLink.href = linkSource;
            downloadLink.download = result.fileName;
            downloadLink.click();

            this.textContent = '✓ PDF Téléchargé !';
            this.style.background = '#2dc770';

            // Mettre à jour le numéro avec la nouvelle valeur renvoyée par le serveur ou l'incrémenter
            if (result.nextNumBon) {
                currentNumBon = parseInt(result.nextNumBon);
            } else {
                currentNumBon++;
            }
            localStorage.setItem('num-bon', currentNumBon);
            updateNumBonDisplay();

            // Clear items and inputs after successful save & download for a clean workflow
            items = [];
            selectedClientId = null;
            clientNomInput.value = '';
            clientAdresseInput.value = '';
            renderItems();
            updateTotal();
        } else {
            console.error("Erreur Script:", result.message);
            alert("Erreur de génération PDF : " + result.message);
            this.textContent = '❌ Erreur PDF';
            this.style.background = '#e74c3c';
        }
    } catch (e) {
        console.error("Erreur réseau/sauvegarde:", e);
        alert("Erreur lors de l'enregistrement ou de la génération : " + e.message);
        this.textContent = '❌ Erreur';
        this.style.background = '#e74c3c';
    }

    // Reset du bouton
    setTimeout(() => {
        this.textContent = originalText;
        this.style.background = '';
        this.disabled = false;
    }, 3000);
});

// === Initial Render ===
renderItems();

