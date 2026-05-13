// --- State Management ---
let currentScenario = null;
let currentStepId = null;
let score = 0;
let correctDecisions = 0;
let totalDecisions = 0;
let tmaInterval = null;
let startTime = null;
let soundEnabled = true;
let isMobileMode = window.innerWidth <= 768;

// --- Local Storage Ranking ---
function getHistory() {
    const data = localStorage.getItem('chat_sim_history');
    return data ? JSON.parse(data) : [];
}

function saveHistory(result) {
    const history = getHistory();
    history.push(result);
    localStorage.setItem('chat_sim_history', JSON.stringify(history));
    updateRankingUI();
}

function clearHistory() {
    localStorage.removeItem('chat_sim_history');
    updateRankingUI();
}

function updateRankingUI() {
    const history = getHistory();
    const rankLastEl = document.getElementById('rank-last');
    const rankBestEl = document.getElementById('rank-best');
    
    if (history.length === 0) {
        rankLastEl.textContent = '0%';
        rankBestEl.textContent = '0%';
        return;
    }
    
    const last = history[history.length - 1];
    const best = history.reduce((max, curr) => curr.accuracy > max.accuracy ? curr : max, history[0]);
    
    rankLastEl.textContent = `${last.accuracy}%`;
    rankBestEl.textContent = `${best.accuracy}%`;
}

// --- Audio ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'in') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'out') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    }
}

// --- Guidance Content ---
const guidanceData = {
    "IPTV / TV Box": {
        practices: [
            "Demonstre empatia e proatividade.",
            "Evite culpar o cliente de imediato.",
            "Mantenha um tom resolutivo."
        ],
        steps: [
            "Sonde qual aparelho está sendo afetado (TV, celular, etc).",
            "Verifique o tipo de conexão (Cabo ou Wi-Fi).",
            "Verifique se outros aplicativos funcionam."
        ],
        suggestions: [
            "Reiniciar roteador e TV Box.",
            "Mudar para a rede 5G se estiver no mesmo cômodo.",
            "Sugerir cabo de rede para maior estabilidade."
        ]
    },
    "Lentidão": {
        practices: [
            "Não conteste a percepção do cliente sem antes verificar.",
            "Entenda o padrão de uso (horários, aparelhos)."
        ],
        steps: [
            "Verifique se ocorre em um dispositivo específico ou em todos.",
            "Pergunte a distância do roteador e obstáculos.",
            "Consulte o consumo da banda no painel técnico."
        ],
        suggestions: [
            "Ajuste remoto de canal Wi-Fi.",
            "Orientar sobre alcance da rede 5G vs 2.4G.",
            "Agendar visita se a degradação for na fibra."
        ]
    },
    "VoIP": {
        practices: [
            "Lembre-se que muitas vezes o cliente não tem familiaridade com os cabos.",
            "Seja paciente ao pedir para verificar conexões físicas."
        ],
        steps: [
            "Verifique se o cabo telefônico (RJ11) está na porta correta (FXS1/Tel1).",
            "Sonde se há tom de discagem.",
            "Verifique se há extensões irregulares causando ruído."
        ],
        suggestions: [
            "Resetar a porta VoIP remotamente.",
            "Trocar cabo ou testar direto no roteador sem filtros.",
            "Se for bloqueio, verificar status de pagamento."
        ]
    },
    "Teste de Velocidade": {
        practices: [
            "Eduque o cliente sobre as limitações do Wi-Fi de forma clara.",
            "Evite linguagem técnica excessiva (ex: 'placa fast/giga')."
        ],
        steps: [
            "Identifique por onde o teste foi feito (Cabo ou Wi-Fi).",
            "Sonde qual dispositivo foi usado (celular antigo, notebook novo).",
            "Sonde o servidor escolhido no teste."
        ],
        suggestions: [
            "Orientar a fazer o teste via cabo para garantir precisão.",
            "Explicar que a rede 2.4Ghz não entrega os 500 Mega contratados.",
            "Indicar uso de cabo de rede para jogar online."
        ]
    },
    "LOS": {
        practices: [
            "Acalme o cliente, pois é um problema físico que impede o acesso.",
            "Evite jargões técnicos complexos, explique de forma simples."
        ],
        steps: [
            "Pergunte se a luz vermelha (LOS ou PON) está piscando no roteador.",
            "Verifique se o cabo óptico (fio fino amarelo ou verde) está bem conectado.",
            "Sonde se houve alguma reforma, móvel arrastado ou chuva forte recente."
        ],
        suggestions: [
            "Pedir para retirar e recolocar o conector óptico com cuidado.",
            "Agendar visita técnica para reparo no cabo ou conector.",
            "Verificar no painel se há indisponibilidade em massa na região (CTO)."
        ]
    },
    "Câmeras": {
        practices: [
            "Diferencie problemas do provedor de internet dos problemas do equipamento de CFTV.",
            "Seja claro sobre o escopo de suporte do provedor."
        ],
        steps: [
            "Confirme se a internet está funcionando normalmente em outros aparelhos.",
            "Sonde se as câmeras são IP (Wi-Fi) ou via DVR (Cabo).",
            "Verifique se o DVR está recebendo IP do roteador."
        ],
        suggestions: [
            "Liberar portas (Port Forwarding) no roteador caso necessário.",
            "Recomendar conectar o DVR direto no roteador via cabo.",
            "Orientar o contato com um técnico de CFTV se for defeito do DVR."
        ]
    }
};

// --- Scenarios Data Generation ---
const names = [
    'João Silva', 'Maria Oliveira', 'Carlos Souza', 'Ana Clara', 'Pedro Henrique', 'Fernanda Lima', 
    'Roberto Alves', 'Juliana Costa', 'Marcos Paulo', 'Luiza Santos', 'Fernando Costa', 'Beatriz Silva',
    'Gabriel Santos', 'Rafael Mendes', 'Camila Rocha', 'Thiago Gomes', 'Renata Martins', 'Felipe Nunes',
    'Lucas Pereira', 'Isabela Ribeiro', 'Gustavo Dias', 'Mariana Carvalho', 'Diego Barros', 'Larissa Freitas',
    'Eduardo Castro', 'Vanessa Monteiro', 'Rodrigo Farias', 'Patricia Duarte', 'Bruno Machado', 'Letícia Borges'
];
const avatars = [
    '0D8ABC', 'E53935', '4CAF50', 'FF9800', '9C27B0', '795548', 
    '607D8B', 'F44336', '3F51B5', '009688', 'FFC107', 'E91E63',
    '3F51B5', '00BCD4', '8BC34A', 'CDDC39', 'FFC107', 'FF5722',
    '795548', '9E9E9E', '607D8B', 'F44336', 'E91E63', '9C27B0',
    '673AB7', '3F51B5', '2196F3', '03A9F4', '00BCD4', '009688'
];

function getRandomProfile(usedNamesSet) {
    let availableIdxs = names.map((_, i) => i).filter(i => !usedNamesSet.has(names[i]));
    
    if (availableIdxs.length === 0) {
        availableIdxs = names.map((_, i) => i);
    }
    
    const idx = availableIdxs[Math.floor(Math.random() * availableIdxs.length)];
    usedNamesSet.add(names[idx]);
    
    return {
        name: names[idx],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(names[idx])}&background=${avatars[idx]}&color=fff`
    };
}



// --- DOM Elements ---
const chatListEl = document.getElementById('chat-list');
const chatBoxEl = document.getElementById('chat-box');
const optionsContainerEl = document.getElementById('options-container');
const welcomeScreenEl = document.getElementById('welcome-screen');
const activeClientNameEl = document.getElementById('active-client-name');
const activeClientStatusEl = document.getElementById('active-client-status');
const activeClientAvatarEl = document.getElementById('active-client-avatar');
const btnSound = document.getElementById('btn-sound');
const btnClear = document.getElementById('btn-clear-history');
const soundIcon = document.getElementById('sound-icon');
const resultModal = document.getElementById('result-modal');

const sidebarEl = document.querySelector('.sidebar');
const btnBackMobile = document.getElementById('btn-back-mobile');
const btnGuidance = document.getElementById('btn-guidance');
const guidancePopup = document.getElementById('guidance-popup');
const btnCloseGuidance = document.getElementById('btn-close-guidance');

// KPIs
const kpiTma = document.getElementById('kpi-tma');
const kpiProtocol = document.getElementById('kpi-protocol');

// --- Initialization ---
async function init() {
    await DB.init();
    updateRankingUI();
    await renderChatList();
    setupEventListeners();
    
    window.addEventListener('resize', () => {
        isMobileMode = window.innerWidth <= 768;
        if (!isMobileMode) {
            sidebarEl.classList.remove('hidden');
        } else if (currentScenario) {
            sidebarEl.classList.add('hidden');
        }
    });
}

function setupEventListeners() {
    btnSound.addEventListener('click', toggleSound);
    btnClear.addEventListener('click', clearHistory);
    document.getElementById('btn-restart').addEventListener('click', async () => {
        resultModal.style.display = 'none';
        resetChatArea();
        await renderChatList();
    });
    
    btnBackMobile.addEventListener('click', () => {
        sidebarEl.classList.remove('hidden');
    });
    
    btnGuidance.addEventListener('click', toggleGuidance);
    btnCloseGuidance.addEventListener('click', () => {
        guidancePopup.classList.remove('open');
    });
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
        soundIcon.classList.replace('ph-speaker-none', 'ph-speaker-high');
        playSound('in');
    } else {
        soundIcon.classList.replace('ph-speaker-high', 'ph-speaker-none');
    }
}

function toggleGuidance() {
    if (guidancePopup.classList.contains('open')) {
        guidancePopup.classList.remove('open');
    } else {
        populateGuidance();
        guidancePopup.classList.add('open');
    }
}

async function populateGuidance() {
    if (!currentScenario) return;
    const catName = currentScenario.category;
    
    // Buscar categoria do banco
    const categories = await DB.getAllCategories();
    const category = categories.find(c => c.name === catName);
    
    if (!category || !category.guidance) return;
    const data = category.guidance;
    
    document.getElementById('guidance-category-name').textContent = catName;
    
    const practicesEl = document.getElementById('guidance-practices');
    practicesEl.innerHTML = data.practices.map(p => `<li>${p}</li>`).join('');
    
    const stepsEl = document.getElementById('guidance-steps');
    stepsEl.innerHTML = data.steps.map(p => `<li>${p}</li>`).join('');
    
    const suggestionsEl = document.getElementById('guidance-suggestions');
    suggestionsEl.innerHTML = data.suggestions.map(p => `<li>${p}</li>`).join('');
}

// --- List Render ---
async function renderChatList() {
    const dbCategories = await DB.getAllCategories();
    const dbScenarios = await DB.getAllScenarios();
    
    // Group by category
    const categories = {};
    dbCategories.forEach(cat => {
        categories[cat.name] = [];
    });
    
    // Distribute scenarios
    const usedNames = new Set();
    dbScenarios.forEach(scen => {
        if (!categories[scen.category]) {
            categories[scen.category] = [];
        }
        const profile = getRandomProfile(usedNames);
        categories[scen.category].push({
            ...scen,
            clientName: profile.name,
            avatar: profile.avatar,
            uniqueId: Math.random().toString(36).substr(2, 9),
            unread: true
        });
    });
    
    // Render
    chatListEl.innerHTML = '';
    Object.keys(categories).forEach(cat => {
        const header = document.createElement('div');
        header.className = 'category-header collapsed';
        header.innerHTML = `<span>${cat} (${categories[cat].length})</span> <i class="ph ph-caret-down"></i>`;
        
        const group = document.createElement('div');
        group.className = 'category-group collapsed';
        
        header.onclick = () => {
            header.classList.toggle('collapsed');
            group.classList.toggle('collapsed');
        };
        
        categories[cat].forEach(scenario => {
            const item = document.createElement('div');
            item.className = 'chat-item unread';
            item.id = `chat-${scenario.uniqueId}`;
            item.onclick = (e) => startChat(scenario, item);
            
            item.innerHTML = `
                <img src="${scenario.avatar}" alt="Avatar" class="avatar">
                <div class="chat-item-info">
                    <div class="chat-item-top">
                        <span class="chat-item-name">${scenario.clientName}</span>
                        <span class="chat-item-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="chat-item-last" style="display:flex; justify-content:space-between;">
                        <span>${scenario.title}</span>
                        <span class="unread-badge">NOVO</span>
                    </div>
                </div>
            `;
            group.appendChild(item);
        });
        
        chatListEl.appendChild(header);
        chatListEl.appendChild(group);
    });
}

function resetChatArea() {
    chatBoxEl.innerHTML = '';
    chatBoxEl.appendChild(welcomeScreenEl);
    welcomeScreenEl.style.display = 'flex';
    optionsContainerEl.innerHTML = '';
    activeClientNameEl.textContent = 'Selecione um atendimento';
    activeClientStatusEl.textContent = 'Aguardando...';
    activeClientAvatarEl.src = 'https://ui-avatars.com/api/?name=C&background=ccc&color=333';
    stopTmaTimer();
    kpiTma.textContent = '00:00';
    kpiProtocol.textContent = '------';
    btnGuidance.disabled = true;
    guidancePopup.classList.remove('open');
    currentScenario = null;
    
    if (isMobileMode) {
        sidebarEl.classList.remove('hidden');
    }
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
}

// --- Chat Logic ---
function startChat(scenario, itemElement) {
    initAudio();

    currentScenario = scenario;
    currentStepId = 'start';
    score = 0;
    correctDecisions = 0;
    totalDecisions = 0;
    
    // Unread status removal
    itemElement.classList.remove('unread');
    const badge = itemElement.querySelector('.unread-badge');
    if (badge) badge.remove();
    
    welcomeScreenEl.style.display = 'none';
    chatBoxEl.innerHTML = ''; 
    optionsContainerEl.innerHTML = '';
    
    activeClientNameEl.textContent = scenario.clientName;
    activeClientAvatarEl.src = scenario.avatar;
    kpiProtocol.textContent = Math.floor(Math.random() * 1000000000).toString();
    
    btnGuidance.disabled = false;
    guidancePopup.classList.remove('open'); // Close if open
    
    if (isMobileMode) {
        sidebarEl.classList.add('hidden');
    }
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    if (itemElement) {
        itemElement.classList.add('active');
    }

    startTmaTimer();
    processStep(currentStepId);
}

function startTmaTimer() {
    startTime = Date.now();
    if(tmaInterval) clearInterval(tmaInterval);
    tmaInterval = setInterval(() => {
        const diff = Date.now() - startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        kpiTma.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTmaTimer() {
    clearInterval(tmaInterval);
}

function formatTime() {
    return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function scrollToBottom() {
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
}

// --- Step Processing ---
function processStep(stepId) {
    if (stepId === 'END' || stepId === 'END_VISITA') {
        finishChat();
        return;
    }

    const step = currentScenario.steps[stepId];
    if (!step) return;

    currentStepId = stepId;
    optionsContainerEl.innerHTML = ''; 

    if (step.isSystemAction) {
        setTimeout(() => {
            renderMessage(step.systemMessage, 'out');
            
            setTimeout(() => {
                showTypingIndicator();
                const randomResponse = step.clientResponses[Math.floor(Math.random() * step.clientResponses.length)];
                
                setTimeout(() => {
                    removeTypingIndicator();
                    renderMessage(randomResponse.msg, 'in');
                    processStep(randomResponse.next);
                }, 2000); 
            }, 1000); 
            
        }, 500);
        
    } else {
        showTypingIndicator();
        activeClientStatusEl.textContent = 'digitando...';
        
        setTimeout(() => {
            removeTypingIndicator();
            activeClientStatusEl.textContent = 'online';
            renderMessage(step.clientMessage, 'in');
            
            renderOptions(step.options);
        }, 1500); 
    }
}

function renderMessage(text, type) {
    const row = document.createElement('div');
    row.className = 'message-row';
    
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    
    msg.innerHTML = `
        ${text}
        <span class="message-time">${formatTime()}</span>
    `;
    
    row.appendChild(msg);
    chatBoxEl.appendChild(row);
    playSound(type);
    scrollToBottom();
}

let typingIndicatorEl = null;

function showTypingIndicator() {
    if (typingIndicatorEl) return;
    
    const row = document.createElement('div');
    row.className = 'message-row';
    row.id = 'typing-row';
    
    typingIndicatorEl = document.createElement('div');
    typingIndicatorEl.className = 'typing-indicator';
    typingIndicatorEl.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    
    row.appendChild(typingIndicatorEl);
    chatBoxEl.appendChild(row);
    scrollToBottom();
}

function removeTypingIndicator() {
    const row = document.getElementById('typing-row');
    if (row) {
        row.remove();
        typingIndicatorEl = null;
    }
}

function renderOptions(options) {
    optionsContainerEl.innerHTML = '';
    if (!options) return;

    // Embaralhar opções aleatoriamente
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

    shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.text;
        btn.onclick = () => handleOptionSelect(opt);
        optionsContainerEl.appendChild(btn);
    });
    scrollToBottom();
}

function handleOptionSelect(option) {
    optionsContainerEl.innerHTML = '';
    
    totalDecisions++;
    score += option.points;
    if (option.points > 0) {
        correctDecisions++;
    }
    
    renderMessage(option.text, 'out');
    
    setTimeout(() => {
        processStep(option.next);
    }, 500);
}

// --- End of Simulation ---

function finishChat() {
    stopTmaTimer();
    activeClientStatusEl.textContent = 'Atendimento finalizado';
    optionsContainerEl.innerHTML = ''; // Limpar opções restantes
    
    setTimeout(() => {
        showResults();
    }, 1000);
}

function showResults() {
    const accuracy = totalDecisions > 0 ? Math.round((correctDecisions / totalDecisions) * 100) : 0;
    
    document.getElementById('result-decisions-text').textContent = `✅ Você acertou ${correctDecisions} de ${totalDecisions} decisões`;
    document.getElementById('result-score').textContent = score;
    document.getElementById('result-accuracy').textContent = `${accuracy}%`;
    document.getElementById('result-time').textContent = kpiTma.textContent;
    
    const feedbackEl = document.getElementById('result-feedback');
    const levelEl = document.getElementById('result-level-text');
    
    levelEl.className = 'result-level';
    
    let levelName = "";
    
    if (accuracy >= 80) {
        levelName = "Excelente";
        levelEl.classList.add('level-excelente');
        feedbackEl.innerHTML = "<strong>Ótimo trabalho!</strong> Você fez a sondagem correta e a abordagem das suas respostas te ajudou a tomar as melhores decisões.";
    } else if (accuracy >= 60) {
        levelName = "Bom";
        levelEl.classList.add('level-bom');
        feedbackEl.innerHTML = "<strong>Bom atendimento.</strong> Você fez uma boa sondagem, mas pode melhorar ainda mais a sua comunicação.";
    } else if (accuracy >= 40) {
        levelName = "Regular";
        levelEl.classList.add('level-regular');
        feedbackEl.innerHTML = "<strong>Atenção.</strong> Foque mais na sua comunicação para tomar as melhores decisões.";
    } else {
        levelName = "Precisa Melhorar";
        levelEl.classList.add('level-ruim');
        feedbackEl.innerHTML = "<strong>Cuidado.</strong> Suas decisões não estão totalmente adequedas. Revise a abordagem de suas respostas.";
    }
    
    levelEl.textContent = `Nível: ${levelName}`;
    
    saveHistory({ score, accuracy, date: new Date().toISOString() });
    
    resultModal.style.display = 'flex';
}

function addSystemFooter() {
    const sidebar = document.querySelector('.sidebar');
    const footer = document.createElement('div');
    footer.className = 'system-footer';
    footer.style.padding = '10px';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '11px';
    footer.style.color = 'var(--text-muted)';
    footer.style.borderTop = '1px solid var(--border-color)';
    footer.style.backgroundColor = 'var(--bg-panel)';
    footer.style.lineHeight = '1.5';
    
    footer.innerHTML = `
        Versão do sistema: v1.1.0<br>
        Última revisão de chats: 11/05/2026
    `;
    
    sidebar.appendChild(footer);
}

init();
addSystemFooter();

// Auto-reload data when it changes in the cloud
DB.onUpdate(() => {
    console.log("Cloud database updated, refreshing list...");
    renderChatList();
});
