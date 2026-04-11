// ============================================================
//  admin.js — Updated with Mark-as-Found flow
// ============================================================

const API = {
    items      : 'api/items.php',
    logs       : 'api/logs.php',
    claims     : 'api/claims.php',
    lostClaims : 'api/lost_item_claims.php',
    lostItems  : 'api/lost_items.php',
};

const currentUser = JSON.parse(sessionStorage.getItem('tuklas_user') || '{}');
const ADMIN_ID    = currentUser.id || 1;

let currentClaimFilter = 'all';
let selectedClaimId    = null;

document.addEventListener('DOMContentLoaded', () => {
    renderItems();
    renderHistory();
    renderClaims();
    renderAccounts();
    loadLostItemsForModal();
});

// ── View Switching ─────────────────────────────────────────
function showView(id, el) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-link-custom').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');
    if (id === 'claims') renderClaims();
}

// ── LOAD LOST ITEMS INTO REGISTER MODAL ───────────────────
async function loadLostItemsForModal() {
    try {
        const res  = await fetch(API.lostItems + '?status=Lost');
        const data = await res.json();
        const items = (data.items || []).filter(i => i.status === 'Lost');
        const container = document.getElementById('lostItemsList');

        if (items.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No lost items to mark as found.</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="border rounded p-3 mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${item.item_name}</div>
                    <small class="text-muted">📍 ${item.location} &nbsp;|&nbsp; 👤 ${item.reporter_name || '—'}</small>
                </div>
                <button class="btn btn-sm btn-success fw-bold" onclick="markAsFound(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">
                    ✔ Mark as Found
                </button>
            </div>`).join('');
    } catch (e) {
        document.getElementById('lostItemsList').innerHTML = '<p class="text-danger">Failed to load lost items.</p>';
    }
}

// ── MARK LOST ITEM AS FOUND ────────────────────────────────
async function markAsFound(id, name) {
    if (!confirm(`Mark "${name}" as Found? This will enable users to claim it.`)) return;

    const res  = await fetch(`${API.lostItems}?id=${id}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ status: 'Found', updated_by: ADMIN_ID }),
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Failed to update item.'); return; }

    // Log to activity history
    try {
        await fetch(API.logs, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ action: `Admin marked "${name}" as Found`, performed_by: ADMIN_ID }),
        });
    } catch(e) {}

    alert(`"${name}" has been marked as Found. Users can now claim it.`);
    bootstrap.Modal.getInstance(document.getElementById('regModal')).hide();
    renderHistory();
    loadLostItemsForModal();
}

// ── EDIT ITEM ──────────────────────────────────────────────
async function editItem(id) {
    const res  = await fetch(API.items);
    const data = await res.json();
    const item = (data.items || []).find(i => i.id == id);
    if (!item) return;

    document.getElementById('editIndex').value    = id;
    document.getElementById('editItemName').value = item.item_name;
    document.getElementById('editFounder').value  = item.founder;
    document.getElementById('editLoc').value      = item.location;

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

document.getElementById('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editIndex').value;

    const payload = {
        item_name : document.getElementById('editItemName').value,
        founder   : document.getElementById('editFounder').value,
        location  : document.getElementById('editLoc').value,
        status    : 'Found',
        updated_by: ADMIN_ID,
    };

    const res  = await fetch(`${API.items}?id=${id}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Failed to update item.'); return; }

    renderItems();
    renderHistory();
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
});

// ── DELETE ITEM ────────────────────────────────────────────
async function deleteItem(id, name) {
    if (!confirm(`Delete "${name}" permanently?`)) return;

    const res  = await fetch(`${API.items}?id=${id}`, {
        method : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ deleted_by: ADMIN_ID }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Failed to delete item.'); return; }

    renderItems();
    renderHistory();
}

// ── RENDER ITEMS TABLE ─────────────────────────────────────
async function renderItems() {
    const res   = await fetch(API.items);
    const data  = await res.json();
    const items = data.items || [];
    const table = document.getElementById('itemTable');

    if (items.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items registered.</td></tr>';
        return;
    }

    table.innerHTML = items.map(item => `
        <tr>
            <td class="fw-bold">${item.item_name}</td>
            <td>${item.founder}</td>
            <td>${item.location}</td>
            <td><span class="badge bg-success">${item.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editItem(${item.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');
}

// ── RENDER CLAIMS ──────────────────────────────────────────
async function renderClaims() {
    const table = document.getElementById('claimTable');
    table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Loading...</td></tr>';

    try {
        const res  = await fetch(API.lostClaims);
        const data = await res.json();
        let claims = data.claims || [];

        const pending = claims.filter(c => c.status === 'Pending').length;
        const badge   = document.getElementById('pendingBadge');
        badge.textContent   = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';

        if (currentClaimFilter !== 'all') {
            claims = claims.filter(c => c.status === currentClaimFilter);
        }

        if (claims.length === 0) {
            table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No claim requests found.</td></tr>';
            return;
        }

        table.innerHTML = claims.map(c => {
            const statusColor = c.status === 'Approved' ? 'success' : c.status === 'Rejected' ? 'danger' : 'warning';
            const date        = new Date(c.created_at).toLocaleDateString();
            return `
            <tr>
                <td class="fw-bold">${c.item_name || 'Unknown Item'}</td>
                <td>${c.claimant_name || 'Unknown'}</td>
                <td>${c.contact_info}</td>
                <td>${c.description.length > 40 ? c.description.substring(0,40)+'...' : c.description}</td>
                <td>${date}</td>
                <td><span class="badge bg-${statusColor}">${c.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewClaim(${c.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        table.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load claims.</td></tr>';
    }
}

// ── FILTER CLAIMS ──────────────────────────────────────────
function filterClaims(status, btn) {
    currentClaimFilter = status;
    renderClaims();
}

// ── VIEW CLAIM DETAIL ──────────────────────────────────────
async function viewClaim(id) {
    const res   = await fetch(API.lostClaims);
    const data  = await res.json();
    const claim = (data.claims || []).find(c => c.id == id);
    if (!claim) return;

    selectedClaimId = id;

    const statusColor = claim.status === 'Approved' ? 'success' : claim.status === 'Rejected' ? 'danger' : 'warning';
    const date        = new Date(claim.created_at).toLocaleString();

    let itemDetails = '';
    try {
        const lostRes  = await fetch(API.lostItems + '?id=' + claim.lost_item_id);
        const lostData = await lostRes.json();
        const items    = lostData.items || [];
        const item     = items.find(i => i.id == claim.lost_item_id);
        if (item && item.description) {
            itemDetails = `
            <tr><td colspan="2"><hr class="my-1"></td></tr>
            <tr><th colspan="2" class="text-muted" style="font-size:0.8rem;">ORIGINAL REPORT DETAILS</th></tr>
            <tr><th>Location Lost</th><td>${item.location || '—'}</td></tr>
            <tr><th>Date Lost</th><td>${item.date_reported || '—'}</td></tr>
            <tr><th>Item Description</th><td style="white-space:pre-line">${item.description || '—'}</td></tr>
            <tr><th>🔒 Private Description</th><td style="white-space:pre-line;color:#b30000;font-weight:600;">${item.private_description || '—'}</td></tr>`;
        }
    } catch(e) {}

    document.getElementById('claimDetailBody').innerHTML = `
        <table class="table table-borderless">
            <tr><th width="35%">Item</th><td><strong>${claim.item_name || 'Unknown'}</strong></td></tr>
            <tr><th>Claimant</th><td>${claim.claimant_name || 'Unknown'}</td></tr>
            <tr><th>Contact Info</th><td>${claim.contact_info}</td></tr>
            <tr><th>Claim Description</th><td style="color:#b30000;font-weight:600;">${claim.description}</td></tr>
            <tr><th>Submitted</th><td>${date}</td></tr>
            <tr><th>Status</th><td><span class="badge bg-${statusColor}">${claim.status}</span></td></tr>
            ${itemDetails}
        </table>`;

    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn  = document.getElementById('rejectBtn');
    if (claim.status === 'Pending') {
        approveBtn.style.display = 'inline-block';
        rejectBtn.style.display  = 'inline-block';
    } else {
        approveBtn.style.display = 'none';
        rejectBtn.style.display  = 'none';
    }

    new bootstrap.Modal(document.getElementById('claimDetailModal')).show();
}

// ── UPDATE CLAIM STATUS ────────────────────────────────────
async function updateClaimStatus(status) {
    if (!selectedClaimId) return;

    const res  = await fetch(`${API.lostClaims}?id=${selectedClaimId}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ status, updated_by: ADMIN_ID }),
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || 'Failed to update claim.'); return; }

    bootstrap.Modal.getInstance(document.getElementById('claimDetailModal')).hide();
    renderClaims();
    renderHistory();
    alert(`Claim has been ${status.toLowerCase()} successfully!`);
}

// ── RENDER HISTORY ─────────────────────────────────────────
async function renderHistory() {
    const res       = await fetch(API.logs);
    const data      = await res.json();
    const logs      = data.logs || [];
    const container = document.getElementById('histLogs');

    if (logs.length === 0) {
        container.innerHTML = '<p class="text-muted">No activity yet.</p>';
        return;
    }

    container.innerHTML = logs.map(log => `
        <div class="history-item">
            <span>${log.action}</span>
            <small class="text-muted">${new Date(log.created_at).toLocaleString()}</small>
        </div>`).join('');
}

// ── CLEAR HISTORY ──────────────────────────────────────────
async function clearHistory() {
    if (!confirm('Clear all logs?')) return;
    await fetch(API.logs, { method: 'DELETE' });
    renderHistory();
}

// ── RENDER ACCOUNTS ───────────────────────────────────────
async function renderAccounts() {
    const res  = await fetch('/api/auth.php?users=1');
    const data = await res.json();
    const users = data.users || [];
    const table = document.getElementById('accTable');

    table.innerHTML = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.id_number}</td>
            <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.role}</span></td>
        </tr>
    `).join('');
}