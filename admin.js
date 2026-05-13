// Authentication
const ADMIN_PASS = 'admin123'; // Senha simples para proteção
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos de inatividade

function checkLoginState() {
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    const lastActivity = sessionStorage.getItem('adminLastActivity');
    
    if (loggedIn === 'true' && lastActivity) {
        const now = Date.now();
        if (now - parseInt(lastActivity) < INACTIVITY_TIMEOUT) {
            updateActivity();
            showDashboard();
            return;
        } else {
            logout();
        }
    }
}

function updateActivity() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        sessionStorage.setItem('adminLastActivity', Date.now().toString());
    }
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    initAdmin();
}

function performLogin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === ADMIN_PASS) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        updateActivity();
        showDashboard();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminLastActivity');
    window.location.reload();
}

document.getElementById('btn-login').addEventListener('click', performLogin);

document.getElementById('admin-password').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        performLogin();
    }
});

// Atualiza a atividade a cada clique ou tecla para evitar logout enquanto estiver em uso
document.addEventListener('click', updateActivity);
document.addEventListener('keyup', updateActivity);

checkLoginState();

// Navigation
const navs = ['dashboard', 'categories', 'scenarios', 'backup'];
navs.forEach(nav => {
    document.getElementById(`nav-${nav}`).addEventListener('click', (e) => {
        e.preventDefault();
        // Update active nav
        document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
        e.currentTarget.classList.add('active');
        // Update section
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(`sec-${nav}`).classList.remove('hidden');
    });
});

document.getElementById('btn-logout').addEventListener('click', logout);

// Admin Logic
async function initAdmin() {
    await DB.init();
    await refreshDashboard();
    await renderCategories();
    await renderScenarios();
}

async function refreshDashboard() {
    const cats = await DB.getAllCategories();
    const scens = await DB.getAllScenarios();
    document.getElementById('stat-categories').textContent = cats.length;
    document.getElementById('stat-scenarios').textContent = scens.length;
}

// --- Categories ---
async function renderCategories() {
    const cats = await DB.getAllCategories();
    const list = document.getElementById('categories-list');
    list.innerHTML = '';
    
    const select = document.getElementById('scen-category');
    select.innerHTML = '';
    const filter = document.getElementById('filter-category');
    filter.innerHTML = '<option value="">Todas as Categorias</option>';
    
    cats.forEach(cat => {
        // List item
        const div = document.createElement('div');
        div.className = 'list-card';
        div.innerHTML = `
            <span><strong>${cat.name}</strong></span>
            <div style="display: flex; gap: 0.5rem;">
                <button class="primary-btn small" onclick="editCategory('${cat.name}')"><i class="ph ph-pencil"></i></button>
                <button class="danger-btn" onclick="deleteCategory('${cat.name}')"><i class="ph ph-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
        
        // Select options
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
        
        const optFilter = document.createElement('option');
        optFilter.value = cat.name;
        optFilter.textContent = cat.name;
        filter.appendChild(optFilter);
    });
}

document.getElementById('btn-new-category').addEventListener('click', () => {
    document.getElementById('modal-cat-title').textContent = 'Nova Categoria';
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-original-name').value = '';
    
    document.getElementById('cat-practices-container').innerHTML = '';
    document.getElementById('cat-steps-container').innerHTML = '';
    document.getElementById('cat-suggestions-container').innerHTML = '';
    
    addCatGuidanceField('cat-practices-container', '');
    addCatGuidanceField('cat-steps-container', '');
    addCatGuidanceField('cat-suggestions-container', '');

    document.getElementById('modal-category').classList.remove('hidden');
});

document.getElementById('btn-save-cat').addEventListener('click', async () => {
    const name = document.getElementById('cat-name').value.trim();
    const originalName = document.getElementById('cat-original-name').value;
    
    if (name) {
        const practices = Array.from(document.querySelectorAll('#cat-practices-container .guidance-input')).map(inp => inp.value.trim()).filter(v => v);
        const steps = Array.from(document.querySelectorAll('#cat-steps-container .guidance-input')).map(inp => inp.value.trim()).filter(v => v);
        const suggestions = Array.from(document.querySelectorAll('#cat-suggestions-container .guidance-input')).map(inp => inp.value.trim()).filter(v => v);
        
        const category = {
            name: name,
            guidance: { practices, steps, suggestions }
        };
        
        if (originalName && originalName !== name) {
            await DB.deleteCategory(originalName);
        }
        
        await DB.addCategory(category);
        document.getElementById('modal-category').classList.add('hidden');
        await renderCategories();
        await refreshDashboard();
    }
});

// --- Dynamic Guidance Fields ---
function addCatGuidanceField(containerId, value = '') {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'step-row';
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';
    div.innerHTML = `
        <input type="text" class="guidance-input" value="${value}" placeholder="Digite a instrução..." style="flex:1">
        <button class="danger-btn small" onclick="this.parentElement.remove()"><i class="ph ph-trash"></i></button>
    `;
    container.appendChild(div);
}

document.getElementById('btn-add-cat-practice').addEventListener('click', () => addCatGuidanceField('cat-practices-container'));
document.getElementById('btn-add-cat-step').addEventListener('click', () => addCatGuidanceField('cat-steps-container'));
document.getElementById('btn-add-cat-suggestion').addEventListener('click', () => addCatGuidanceField('cat-suggestions-container'));

window.editCategory = async function(name) {
    const cats = await DB.getAllCategories();
    const cat = cats.find(c => c.name === name);
    if (!cat) return;

    document.getElementById('modal-cat-title').textContent = 'Editar Categoria';
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-original-name').value = cat.name;

    document.getElementById('cat-practices-container').innerHTML = '';
    document.getElementById('cat-steps-container').innerHTML = '';
    document.getElementById('cat-suggestions-container').innerHTML = '';

    const guidance = cat.guidance || { practices: [], steps: [], suggestions: [] };
    
    guidance.practices.forEach(val => addCatGuidanceField('cat-practices-container', val));
    guidance.steps.forEach(val => addCatGuidanceField('cat-steps-container', val));
    guidance.suggestions.forEach(val => addCatGuidanceField('cat-suggestions-container', val));

    document.getElementById('modal-category').classList.remove('hidden');
};

window.deleteCategory = async (name) => {
    if (confirm(`Tem certeza que deseja excluir a categoria '${name}'?`)) {
        await DB.deleteCategory(name);
        await renderCategories();
        await refreshDashboard();
    }
};

// --- Scenarios ---
document.getElementById('filter-category').addEventListener('change', renderScenarios);

async function renderScenarios() {
    let scens = await DB.getAllScenarios();
    const filterCat = document.getElementById('filter-category').value;
    
    if (filterCat) {
        scens = scens.filter(s => s.category === filterCat);
    }
    
    const list = document.getElementById('scenarios-list');
    list.innerHTML = '';
    
    scens.forEach(scen => {
        const div = document.createElement('div');
        div.className = 'scenario-card';
        div.innerHTML = `
            <span class="badge">${scen.category}</span>
            <h3>${scen.title}</h3>
            <p style="color:#666; font-size:0.8rem; margin-bottom:1rem;">ID: ${scen.id} | Passos: ${Object.keys(scen.steps).length}</p>
            <div style="display:flex; gap:0.5rem; margin-top:auto;">
                <button class="secondary-btn" onclick="editScenario('${scen.id}')" style="flex:1"><i class="ph ph-pencil"></i> Editar</button>
                <button class="danger-btn" onclick="deleteScenario('${scen.id}')"><i class="ph ph-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.deleteScenario = async (id) => {
    if (confirm(`Excluir cenário '${id}'?`)) {
        await DB.deleteScenario(id);
        await renderScenarios();
        await refreshDashboard();
    }
};

// --- Scenario Editor ---
let currentSteps = {};

document.getElementById('btn-new-scenario').addEventListener('click', () => {
    document.getElementById('scen-id').value = '';
    document.getElementById('scen-id').disabled = false;
    document.getElementById('scen-title').value = '';
    currentSteps = {
        'start': {
            clientMessage: '',
            options: [
                { text: '', points: 1, next: 'END' },
                { text: '', points: 0, next: 'END' }
            ]
        }
    };
    renderStepsEditor();
    document.getElementById('modal-scenario').classList.remove('hidden');
});

window.editScenario = async (id) => {
    const scen = await DB.getScenario(id);
    document.getElementById('scen-id').value = scen.id;
    document.getElementById('scen-id').disabled = true; // Prevent changing ID
    document.getElementById('scen-category').value = scen.category;
    document.getElementById('scen-title').value = scen.title;
    currentSteps = JSON.parse(JSON.stringify(scen.steps)); // Deep copy
    renderStepsEditor();
    document.getElementById('modal-scenario').classList.remove('hidden');
};

function renderStepsEditor() {
    const container = document.getElementById('scen-steps-container');
    container.innerHTML = '';
    
    // Lista de todos os nós disponíveis para seleção
    let availableNodes = ['END', 'END_VISITA', ...Object.keys(currentSteps)];
    
    // Garantir que destinos antigos ou desconhecidos também entrem na lista
    Object.keys(currentSteps).forEach(stepId => {
        const step = currentSteps[stepId];
        const opt1 = step.options[0] || {text:'', points:0, next:'END'};
        const opt2 = step.options[1] || {text:'', points:0, next:'END'};
        if (opt1.next && !availableNodes.includes(opt1.next)) availableNodes.push(opt1.next);
        if (opt2.next && !availableNodes.includes(opt2.next)) availableNodes.push(opt2.next);
    });

    Object.keys(currentSteps).forEach(stepId => {
        const step = currentSteps[stepId];
        const opt1 = step.options[0] || {text:'', points:0, next:'END'};
        const opt2 = step.options[1] || {text:'', points:0, next:'END'};
        
        // Helper function para gerar o dropdown de nós
        const buildSelect = (selectedValue, optIndex) => {
            let html = `<select onchange="updateOpt('${stepId}', ${optIndex}, 'next', this.value)">`;
            availableNodes.forEach(node => {
                const selected = (node === selectedValue) ? 'selected' : '';
                const displayName = node === 'END' ? 'FIM' : (node === 'END_VISITA' ? 'FIM (Visita)' : node);
                html += `<option value="${node}" ${selected}>${displayName}</option>`;
            });
            html += `</select>`;
            return html;
        };
        
        const div = document.createElement('div');
        div.className = 'step-block';
        div.innerHTML = `
            <div class="step-block-header">
                <span>Nó: ${stepId}</span>
                ${stepId !== 'start' ? `<button class="danger-btn small" onclick="deleteStep('${stepId}')"><i class="ph ph-x"></i></button>` : ''}
            </div>
            <div class="form-group">
                <label>Mensagem do Cliente</label>
                <textarea rows="2" onchange="updateStep('${stepId}', 'msg', this.value)">${step.clientMessage}</textarea>
            </div>
            <div style="background:#fff; padding:1rem; border-radius:4px; margin-bottom:0.5rem; border:1px solid #eee;">
                <strong>Opção 1</strong>
                <input type="text" placeholder="Texto da opção" value="${opt1.text}" onchange="updateOpt('${stepId}', 0, 'text', this.value)" style="width:100%; margin:0.5rem 0; padding:0.5rem;">
                <div class="form-row">
                    <div class="form-group">
                        <label>Pontos</label>
                        <input type="number" value="${opt1.points}" onchange="updateOpt('${stepId}', 0, 'points', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Próximo Nó</label>
                        ${buildSelect(opt1.next, 0)}
                    </div>
                </div>
            </div>
            <div style="background:#fff; padding:1rem; border-radius:4px; border:1px solid #eee;">
                <strong>Opção 2</strong>
                <input type="text" placeholder="Texto da opção" value="${opt2.text}" onchange="updateOpt('${stepId}', 1, 'text', this.value)" style="width:100%; margin:0.5rem 0; padding:0.5rem;">
                <div class="form-row">
                    <div class="form-group">
                        <label>Pontos</label>
                        <input type="number" value="${opt2.points}" onchange="updateOpt('${stepId}', 1, 'points', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Próximo Nó</label>
                        ${buildSelect(opt2.next, 1)}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.updateStep = (stepId, field, value) => {
    if (field === 'msg') currentSteps[stepId].clientMessage = value;
};

window.updateOpt = (stepId, optIndex, field, value) => {
    if (!currentSteps[stepId].options[optIndex]) {
        currentSteps[stepId].options[optIndex] = { text: '', points: 0, next: 'END' };
    }
    if (field === 'points') value = parseInt(value) || 0;
    currentSteps[stepId].options[optIndex][field] = value;
};

document.getElementById('btn-add-step').addEventListener('click', () => {
    const newId = prompt("Digite o ID deste novo passo (ex: p2, p3_ruim):");
    if (newId && !currentSteps[newId]) {
        currentSteps[newId] = {
            clientMessage: '',
            options: [
                { text: '', points: 1, next: 'END' },
                { text: '', points: 0, next: 'END' }
            ]
        };
        renderStepsEditor();
    }
});

window.deleteStep = (stepId) => {
    if (confirm(`Excluir nó ${stepId}?`)) {
        delete currentSteps[stepId];
        renderStepsEditor();
    }
};

document.getElementById('btn-save-scen').addEventListener('click', async () => {
    const id = document.getElementById('scen-id').value.trim();
    if (!id) return alert('ID é obrigatório');
    
    const scenario = {
        id: id,
        category: document.getElementById('scen-category').value,
        title: document.getElementById('scen-title').value,
        steps: currentSteps
    };
    
    await DB.addScenario(scenario);
    document.getElementById('modal-scenario').classList.add('hidden');
    await renderScenarios();
    await refreshDashboard();
});

// --- Modal Utils ---
document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    });
});

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

// --- Backup & Restore ---
document.getElementById('btn-export').addEventListener('click', async () => {
    const jsonStr = await DB.exportDatabase();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_sim_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const success = await DB.importDatabase(event.target.result);
        if (success) {
            alert('Banco de dados restaurado com sucesso!');
            await refreshDashboard();
            await renderCategories();
            await renderScenarios();
        } else {
            alert('Erro ao restaurar banco de dados. Arquivo inválido.');
        }
    };
    reader.readAsText(file);
});
