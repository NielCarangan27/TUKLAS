document.addEventListener('DOMContentLoaded', () => {
    renderItems();
    renderHistory();
});

// View Switching
function showView(id) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-link-custom').forEach(l => l.classList.remove('active'));
    if(window.event) window.event.currentTarget.classList.add('active');
}

// REGISTER ITEM
document.getElementById('regForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newItem = {
        name: document.getElementById('itemName').value,
        fnd: document.getElementById('founder').value,
        lc: document.getElementById('loc').value,
        status: 'Found'
    };

    saveToStorage('tuklas_items', newItem);
    saveToStorage('tuklas_history', { message: `Registered: ${newItem.name}`, time: new Date().toLocaleString() });

    renderItems();
    renderHistory();
    bootstrap.Modal.getInstance(document.getElementById('regModal')).hide();
    this.reset();
});

// EDIT ITEM - Open Modal and Load Data
function editItem(index) {
    const items = JSON.parse(localStorage.getItem('tuklas_items')) || [];
    const item = items[index];

    document.getElementById('editIndex').value = index;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editFounder').value = item.fnd;
    document.getElementById('editLoc').value = item.lc;

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

// UPDATE ITEM (Edit Form Submit)
document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById('editIndex').value;
    let items = JSON.parse(localStorage.getItem('tuklas_items')) || [];

    const oldName = items[index].name;
    items[index] = {
        name: document.getElementById('editItemName').value,
        fnd: document.getElementById('editFounder').value,
        lc: document.getElementById('editLoc').value,
        status: 'Found'
    };

    localStorage.setItem('tuklas_items', JSON.stringify(items));
    saveToStorage('tuklas_history', { message: `Updated: ${oldName} to ${items[index].name}`, time: new Date().toLocaleString() });

    renderItems();
    renderHistory();
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
});

// DELETE ITEM
function deleteItem(index) {
    let items = JSON.parse(localStorage.getItem('tuklas_items')) || [];
    const name = items[index].name;

    if(confirm(`Delete "${name}" permanently?`)) {
        items.splice(index, 1);
        localStorage.setItem('tuklas_items', JSON.stringify(items));
        saveToStorage('tuklas_history', { message: `Deleted: ${name}`, time: new Date().toLocaleString() });
        renderItems();
        renderHistory();
    }
}

// STORAGE HELPERS
function saveToStorage(key, data) {
    let current = JSON.parse(localStorage.getItem(key)) || [];
    current.push(data);
    localStorage.setItem(key, JSON.stringify(current));
}

function renderItems() {
    const items = JSON.parse(localStorage.getItem('tuklas_items')) || [];
    const table = document.getElementById('itemTable');
    table.innerHTML = items.length === 0 ? '<tr><td colspan="5" class="text-center text-muted">No items registered.</td></tr>' : "";
    
    items.forEach((item, index) => {
        table.innerHTML += `
            <tr>
                <td class="fw-bold">${item.name}</td>
                <td>${item.fnd}</td>
                <td>${item.lc}</td>
                <td><span class="badge bg-success">${item.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editItem(${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${index})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

function renderHistory() {
    const logs = JSON.parse(localStorage.getItem('tuklas_history')) || [];
    const container = document.getElementById('histLogs');
    container.innerHTML = "";
    [...logs].reverse().forEach(log => {
        container.innerHTML += `<div class="history-item"><span>${log.message}</span><small class="text-muted">${log.time}</small></div>`;
    });
}

function clearHistory() {
    if(confirm("Clear all logs?")) { localStorage.removeItem('tuklas_history'); renderHistory(); }
}