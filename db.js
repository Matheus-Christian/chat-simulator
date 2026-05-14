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

// ─── Autenticação de Colaboradores ───────────────────────────────────────────
const AUTH = {

    PALAVRA_CHAVE: '$ebrateL2026',

    /**
     * Registra um novo colaborador no Firebase.
     * Retorna { ok: true, codigo } ou { ok: false, error }
     */
    registerColaborador: async function({ nomeCompleto, dataNascimento, matricula }) {
        const primeiroNome = nomeCompleto.trim().split(' ')[0];
        const codigo = `${primeiroNome}${matricula.trim()}`;
        const ref = database.ref(`users/colaboradores/${encodeURIComponent(codigo)}`);

        // Bloqueia matrícula duplicada
        const existing = await database
            .ref('users/colaboradores')
            .orderByChild('matricula')
            .equalTo(matricula.trim())
            .once('value');

        if (existing.exists()) {
            return { ok: false, error: 'Matrícula já cadastrada no sistema.' };
        }

        await ref.set({
            nomeCompleto: nomeCompleto.trim(),
            dataNascimento: dataNascimento.trim(),
            matricula: matricula.trim(),
            codigoIdentificacao: codigo,
            criadoEm: Date.now()
        });

        return { ok: true, codigo };
    },

    /**
     * Valida um código de identificação.
     * Retorna { ok: true, role, nome } ou { ok: false }
     */
    validateCodigo: async function(codigo) {
        // Verifica admin
        if (codigo === ADMIN_PASS) {
            return { ok: true, role: 'admin', nome: 'Administrador' };
        }

        // Verifica colaborador
        const snap = await database
            .ref(`users/colaboradores/${encodeURIComponent(codigo)}`)
            .once('value');

        if (snap.exists()) {
            const data = snap.val();
            return { ok: true, role: 'colaborador', nome: data.nomeCompleto };
        }

        return { ok: false };
    },

    /**
     * Busca código pelo conjunto dataNascimento + matricula para recuperação.
     * Retorna { ok: true, codigo } ou { ok: false }
     */
    recoverCodigo: async function({ dataNascimento, matricula }) {
        const snap = await database
            .ref('users/colaboradores')
            .orderByChild('matricula')
            .equalTo(matricula.trim())
            .once('value');

        if (!snap.exists()) return { ok: false };

        let found = null;
        snap.forEach(child => {
            const data = child.val();
            if (data.dataNascimento === dataNascimento.trim()) {
                found = data;
            }
        });

        if (found) return { ok: true, codigo: found.codigoIdentificacao };
        return { ok: false };
    },

    /**
     * Retorna todos os colaboradores cadastrados.
     */
    getAllColaboradores: async function() {
        const snap = await database.ref('users/colaboradores').once('value');
        const result = [];
        snap.forEach(child => result.push(child.val()));
        return result;
    }
};

// ─── Sessão ───────────────────────────────────────────────────────────────────
const SESSION = {
    TIMEOUT: 30 * 60 * 1000, // 30 min

    save: function(codigo, role, nome) {
        sessionStorage.setItem('userSession', JSON.stringify({ codigo, role, nome, lastActivity: Date.now() }));
    },

    get: function() {
        try { return JSON.parse(sessionStorage.getItem('userSession')); } catch { return null; }
    },

    isValid: function() {
        const s = this.get();
        if (!s) return false;
        return (Date.now() - s.lastActivity) < this.TIMEOUT;
    },

    touch: function() {
        const s = this.get();
        if (s) { s.lastActivity = Date.now(); sessionStorage.setItem('userSession', JSON.stringify(s)); }
    },

    clear: function() {
        sessionStorage.removeItem('userSession');
    }
};
