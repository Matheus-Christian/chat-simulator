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
