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

// Global state variables
let allBons = [];
let allPaiements = [];
let salesChart = null;
let currentPeriod = 30; // 30 days default

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

async function initializeDashboard() {
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    try {
        // Fetch clients (to calculate total outstanding balance), bons, and payments in parallel
        const [clientsData, bonsData, paiementsData] = await Promise.all([
            supabase('GET', '/clients?select=solde'),
            supabase('GET', '/bons?select=id,num_bon,date_bon,total_general,created_at,clients(nom)&order=date_bon.desc,created_at.desc'),
            supabase('GET', '/paiements?select=id,date_paiement,montant,mode_paiement,reference,created_at,clients(nom)&order=date_paiement.desc,created_at.desc')
        ]);

        allBons = bonsData;
        allPaiements = paiementsData;

        // 1. Calculate and update KPI summaries
        const totalSales = allBons.reduce((sum, b) => sum + (parseFloat(b.total_general) || 0), 0);
        const totalPayments = allPaiements.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
        const totalOutstanding = clientsData.reduce((sum, c) => sum + (parseFloat(c.solde) || 0), 0);

        document.getElementById('kpi-sales').textContent = totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH';
        document.getElementById('kpi-payments').textContent = totalPayments.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH';
        document.getElementById('kpi-outstanding').textContent = totalOutstanding.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH';

        // 2. Render transaction journal feed (combined chronological activity)
        renderTransactionFeed();

        // 3. Build/update interactive charts for selected period
        updateChartData();

    } catch (e) {
        console.error("Erreur Dashboard:", e);
        alert("Erreur de chargement des statistiques. Veuillez actualiser.");
    } finally {
        loading.style.display = 'none';
    }
}

// Render Chronological Activity Feed
function renderTransactionFeed() {
    const feed = document.getElementById('journal-list');
    feed.innerHTML = '';

    const feedItems = [];

    allBons.forEach(b => {
        feedItems.push({
            type: 'bon',
            date: b.date_bon,
            ref: `BL ${b.num_bon}`,
            label: b.clients ? b.clients.nom : 'Client inconnu',
            amount: parseFloat(b.total_general) || 0,
            timestamp: new Date(b.created_at || b.date_bon).getTime()
        });
    });

    allPaiements.forEach(p => {
        feedItems.push({
            type: 'paiement',
            date: p.date_paiement,
            ref: `REGL (${p.mode_paiement})`,
            label: (p.clients ? p.clients.nom : 'Client inconnu') + (p.reference ? ` — Ref: ${p.reference}` : ''),
            amount: parseFloat(p.montant) || 0,
            timestamp: new Date(p.created_at || p.date_paiement).getTime()
        });
    });

    // Sort feed: Newest transactions first
    feedItems.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to latest 30 transactions to prevent UI cluttering
    const latestItems = feedItems.slice(0, 30);

    if (latestItems.length === 0) {
        feed.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.3); font-weight: 700;">Aucune transaction enregistrée.</div>';
        return;
    }

    latestItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'journal-row';

        const info = document.createElement('div');
        info.className = 'journal-info';

        const refSpan = document.createElement('span');
        refSpan.className = 'journal-ref';
        refSpan.textContent = item.ref;

        const labelSpan = document.createElement('span');
        labelSpan.style.color = 'rgba(255, 255, 255, 0.65)';
        labelSpan.textContent = item.label;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'journal-date';
        // Convert YYYY-MM-DD to DD/MM/YYYY
        let displayDate = item.date;
        if (item.date) {
            const parts = item.date.split('-');
            if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        dateSpan.textContent = displayDate;

        info.appendChild(refSpan);
        info.appendChild(labelSpan);
        info.appendChild(dateSpan);

        const amount = document.createElement('div');
        if (item.type === 'bon') {
            amount.className = 'journal-amount debit';
            amount.textContent = `+ ${item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH`;
        } else {
            amount.className = 'journal-amount credit';
            amount.textContent = `- ${item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH`;
        }

        row.appendChild(info);
        row.appendChild(amount);

        feed.appendChild(row);
    });
}

// Period filter tab switching
function changePeriod(days) {
    currentPeriod = days;

    // Toggle active classes on tab buttons
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    let activeBtnId = 'btn-all';
    if (days === 30) activeBtnId = 'btn-30d';
    else if (days === 7) activeBtnId = 'btn-7d';
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');

    // Update charts
    updateChartData();
}
window.changePeriod = changePeriod;

// Aggregate and structure chart data
function updateChartData() {
    // Generate dates timeline
    const dateMap = {};
    const today = new Date();

    let daysToInclude = currentPeriod;
    if (daysToInclude === 0) {
        // Find earliest transaction date
        const allDates = [...allBons.map(b => b.date_bon), ...allPaiements.map(p => p.date_paiement)].filter(Boolean);
        if (allDates.length > 0) {
            allDates.sort();
            const oldestDate = new Date(allDates[0]);
            daysToInclude = Math.ceil((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else {
            daysToInclude = 30; // fallback
        }
    }

    // Populate empty days array for timeline mapping
    for (let i = daysToInclude - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const isoString = d.toISOString().split('T')[0];
        dateMap[isoString] = { sales: 0, payments: 0 };
    }

    // Aggregate delivery notes totals by date
    allBons.forEach(b => {
        if (b.date_bon && dateMap[b.date_bon] !== undefined) {
            dateMap[b.date_bon].sales += parseFloat(b.total_general) || 0;
        }
    });

    // Aggregate payments totals by date
    allPaiements.forEach(p => {
        if (p.date_paiement && dateMap[p.date_paiement] !== undefined) {
            dateMap[p.date_paiement].payments += parseFloat(p.montant) || 0;
        }
    });

    const dates = Object.keys(dateMap).sort();
    const salesData = dates.map(d => dateMap[d].sales);
    const paymentsData = dates.map(d => dateMap[d].payments);
    
    // Format visual labels for chart (e.g. "17 Mai")
    const formattedLabels = dates.map(d => {
        const parts = d.split('-');
        if (parts.length !== 3) return d;
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
    });

    renderChart(formattedLabels, salesData, paymentsData);
}

// Setup and Draw Chart.js Graph
function renderChart(labels, sales, payments) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (salesChart) {
        salesChart.destroy();
    }

    Chart.defaults.font.family = "'Nunito', sans-serif";
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventes (DH)',
                    data: sales,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Recouvrements (DH)',
                    data: payments,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        font: { size: 10, weight: 'bold' },
                        boxWidth: 12,
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    padding: 8,
                    bodyFont: { weight: 'bold' }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        font: { size: 8, weight: 'bold' },
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        font: { size: 8, weight: 'bold' },
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' DH';
                        }
                    }
                }
            }
        }
    });
}
