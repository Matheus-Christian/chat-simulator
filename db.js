const firebaseConfig = {
  apiKey: "AIzaSyBO207jXJOj9v7_GEh5fHnSRfVZ9ouId_8",
  authDomain: "chat-simulator-ac6a7.firebaseapp.com",
  databaseURL: "https://chat-simulator-ac6a7-default-rtdb.firebaseio.com",
  projectId: "chat-simulator-ac6a7",
  storageBucket: "chat-simulator-ac6a7.firebasestorage.app",
  messagingSenderId: "1055907327457",
  appId: "1:1055907327457:web:d0b73245b13704636af6a0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Helper to escape invalid Firebase keys
const safeKey = (str) => encodeURIComponent(str).replace(/\./g, '%2E');

const DB = {
    _updateCallbacks: [],

    init: function() {
        return new Promise((resolve) => {
            // Check if DB is empty, if so populate from default categories
            database.ref('categories').once('value').then(snapshot => {
                if (!snapshot.exists()) {
                    console.log("Banco na nuvem vazio. Inicializando com categorias padrão...");
                    const defaultCats = ["IPTV / TV Box", "Lentidão", "VoIP", "Teste de Velocidade", "LOS", "Câmeras"];
                    const promises = defaultCats.map(cat => this.addCategory({ name: cat }));
                    Promise.all(promises).then(() => resolve());
                } else {
                    resolve();
                }
            });
        });
    },

    // Realtime Hook
    onUpdate: function(callback) {
        if (this._updateCallbacks.length === 0) {
            // Setup Firebase listeners only once
            const triggerUpdate = () => {
                this._updateCallbacks.forEach(cb => cb());
            };
            
            // value event triggers initially and then on every child change
            database.ref('categories').on('value', triggerUpdate);
            database.ref('scenarios').on('value', triggerUpdate);
        }
        this._updateCallbacks.push(callback);
    },

    // --- Categorias CRUD ---
    getAllCategories: function() {
        return database.ref('categories').once('value').then(snap => {
            const result = [];
            snap.forEach(child => { result.push(child.val()); });
            return result;
        });
    },

    addCategory: function(category) {
        if (!category.guidance) {
            category.guidance = { practices: [], steps: [], suggestions: [] };
        }
        return database.ref('categories/' + safeKey(category.name)).set(category);
    },

    deleteCategory: function(name) {
        return database.ref('categories/' + safeKey(name)).remove();
    },

    // --- Cenários CRUD ---
    getAllScenarios: function() {
        return database.ref('scenarios').once('value').then(snap => {
            const result = [];
            snap.forEach(child => { result.push(child.val()); });
            return result;
        });
    },

    addScenario: function(scenario) {
        return database.ref('scenarios/' + safeKey(scenario.id)).set(scenario);
    },

    deleteScenario: function(id) {
        return database.ref('scenarios/' + safeKey(id)).remove();
    },

    getScenario: function(id) {
        return database.ref('scenarios/' + safeKey(id)).once('value').then(snap => snap.val());
    },
    
    // --- Backup & Restore ---
    exportDatabase: async function() {
        const categories = await this.getAllCategories();
        const scenarios = await this.getAllScenarios();
        return JSON.stringify({ categories, scenarios });
    },
    
    importDatabase: async function(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.categories && data.scenarios) {
                // Clear existing
                const updates = {};
                updates['categories'] = null;
                updates['scenarios'] = null;
                await database.ref().update(updates);
                
                // Prepare new structured objects
                const newCats = {};
                for (const cat of data.categories) {
                    newCats[safeKey(cat.name)] = cat;
                }
                const newScens = {};
                for (const scen of data.scenarios) {
                    newScens[safeKey(scen.id)] = scen;
                }
                
                await database.ref('categories').set(newCats);
                await database.ref('scenarios').set(newScens);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Import error:", e);
            return false;
        }
    }
};

// ─── Constante Admin (compartilhada com admin.js) ─────────────────────────────
const ADMIN_PASS = 'admin123';

// ─── Autenticação de Colaboradores ───────────────────────────────────────────
const AUTH = {

    PALAVRA_CHAVE: '$ebrateL2026',

    // Gera chave Firebase segura e única a partir da matrícula
    _key: function(matricula) {
        return 'M_' + String(matricula).trim().replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Admin cria colaborador
    addColaborador: async function({ nomeCompleto, dataNascimento, matricula }) {
        const key = this._key(matricula);
        const ref = database.ref(`users/colaboradores/${key}`);
        const existing = await ref.once('value');
        if (existing.exists()) return { ok: false, error: 'Matrícula já cadastrada.' };

        const primeiroNome = nomeCompleto.trim().split(' ')[0];
        const codigo = `${primeiroNome}${matricula.trim()}`;
        await ref.set({
            nomeCompleto: nomeCompleto.trim(),
            dataNascimento: dataNascimento.trim(),
            matricula: matricula.trim(),
            codigoIdentificacao: codigo,
            codigoAlterado: false,
            criadoEm: Date.now()
        });
        return { ok: true, codigo };
    },

    // Admin edita colaborador
    updateColaborador: async function(matriculaOriginal, { nomeCompleto, dataNascimento, matricula }) {
        const oldKey = this._key(matriculaOriginal);
        const newKey = this._key(matricula);
        const oldRef = database.ref(`users/colaboradores/${oldKey}`);
        const oldSnap = await oldRef.once('value');
        if (!oldSnap.exists()) return { ok: false, error: 'Colaborador não encontrado.' };

        const primeiroNome = nomeCompleto.trim().split(' ')[0];
        const codigo = `${primeiroNome}${matricula.trim()}`;

        if (oldKey !== newKey) {
            const newRef = database.ref(`users/colaboradores/${newKey}`);
            if ((await newRef.once('value')).exists()) return { ok: false, error: 'Nova matrícula já cadastrada.' };
            const old = oldSnap.val();
            await oldRef.remove();
            await newRef.set({ ...old, nomeCompleto: nomeCompleto.trim(), dataNascimento: dataNascimento.trim(), matricula: matricula.trim(), codigoIdentificacao: codigo });
        } else {
            await oldRef.update({ nomeCompleto: nomeCompleto.trim(), dataNascimento: dataNascimento.trim(), codigoIdentificacao: codigo });
        }
        return { ok: true };
    },

    // Admin exclui colaborador
    deleteColaborador: async function(matricula) {
        await database.ref(`users/colaboradores/${this._key(matricula)}`).remove();
        return { ok: true };
    },

    // Valida login pelo codigoIdentificacao (query por campo)
    validateCodigo: async function(codigo) {
        if (codigo.trim() === ADMIN_PASS) {
            return { ok: true, role: 'admin', nome: 'Administrador' };
        }
        const snap = await database.ref('users/colaboradores')
            .orderByChild('codigoIdentificacao')
            .equalTo(codigo.trim())
            .once('value');
        if (snap.exists()) {
            let data = null;
            snap.forEach(c => { data = c.val(); });
            return { ok: true, role: 'colaborador', nome: data.nomeCompleto };
        }
        return { ok: false };
    },

    // Recupera código por data de nascimento + matrícula
    recoverCodigo: async function({ dataNascimento, matricula }) {
        const snap = await database.ref(`users/colaboradores/${this._key(matricula)}`).once('value');
        if (!snap.exists()) return { ok: false };
        const data = snap.val();
        if (data.dataNascimento === dataNascimento.trim()) {
            return { ok: true, codigo: data.codigoIdentificacao, codigoAlterado: data.codigoAlterado || false, matricula: data.matricula };
        }
        return { ok: false };
    },

    // Altera código — somente uma vez
    changeColaboradorCodigo: async function({ matricula, novoCodigo }) {
        const ref = database.ref(`users/colaboradores/${this._key(matricula)}`);
        const snap = await ref.once('value');
        if (!snap.exists()) return { ok: false, error: 'Colaborador não encontrado.' };
        if (snap.val().codigoAlterado) return { ok: false, error: 'O código já foi alterado. Solicite ao supervisor para redefini-lo.' };

        const check = await database.ref('users/colaboradores').orderByChild('codigoIdentificacao').equalTo(novoCodigo.trim()).once('value');
        if (check.exists()) return { ok: false, error: 'Este código já está em uso. Escolha outro.' };

        await ref.update({ codigoIdentificacao: novoCodigo.trim(), codigoAlterado: true });
        return { ok: true };
    },

    getAllColaboradores: async function() {
        const snap = await database.ref('users/colaboradores').once('value');
        const result = [];
        snap.forEach(c => result.push(c.val()));
        return result;
    }
};

// ─── Sessão ───────────────────────────────────────────────────────────────────
const SESSION = {
    TIMEOUT: 30 * 60 * 1000,

    save: function(codigo, role, nome) {
        sessionStorage.setItem('userSession', JSON.stringify({ codigo, role, nome, lastActivity: Date.now() }));
    },
    get: function() {
        try { return JSON.parse(sessionStorage.getItem('userSession')); } catch { return null; }
    },
    isValid: function() {
        const s = this.get();
        return s ? (Date.now() - s.lastActivity) < this.TIMEOUT : false;
    },
    touch: function() {
        const s = this.get();
        if (s) { s.lastActivity = Date.now(); sessionStorage.setItem('userSession', JSON.stringify(s)); }
    },
    clear: function() { sessionStorage.removeItem('userSession'); }
};
