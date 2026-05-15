// ─── Utilitários de Modal ─────────────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
}
document.querySelectorAll('.auth-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ─── Referências ──────────────────────────────────────────────────────────────
const btnStartSim  = document.getElementById('btn-start-sim');
const chkCiente    = document.getElementById('chk-ciente');
const inputIdCode  = document.getElementById('input-id-code');
const idCodeIcon   = document.getElementById('id-code-icon');
const idCodeErrMsg = document.getElementById('id-code-error-msg');

// ─── Reset completo ao carregar ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    chkCiente.checked = false;
    inputIdCode.value = '';
    inputIdCode.classList.remove('input-error');
    if (idCodeIcon)   idCodeIcon.className = 'ph ph-lock-simple id-code-icon';
    if (idCodeErrMsg) idCodeErrMsg.textContent = '';
    checkRequirements();

    // Inicia sessão anônima para acesso ao DB em modo de Produção
    DB.init().catch(e => console.warn("Aviso DB.init:", e));
});

// ─── Validação do botão Iniciar ───────────────────────────────────────────────
function checkRequirements() {
    btnStartSim.disabled = !(chkCiente.checked && inputIdCode.value.trim().length > 0);
}

chkCiente.addEventListener('change', checkRequirements);

inputIdCode.addEventListener('input', () => {
    inputIdCode.classList.remove('input-error');
    if (idCodeIcon)   idCodeIcon.className = 'ph ph-lock-simple id-code-icon';
    if (idCodeErrMsg) idCodeErrMsg.textContent = '';
    checkRequirements();
});

// Enter no campo dispara o login
inputIdCode.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btnStartSim.disabled) btnStartSim.click();
});

// ─── Helpers de estado de erro ────────────────────────────────────────────────
function setLoginError(msg) {
    inputIdCode.classList.add('input-error');
    if (idCodeIcon)   idCodeIcon.className = 'ph ph-warning id-code-icon input-error-icon';
    if (idCodeErrMsg) idCodeErrMsg.textContent = msg;
    btnStartSim.disabled = false;
    btnStartSim.textContent = 'Iniciar Treinamento';
}

// ─── Login ────────────────────────────────────────────────────────────────────
btnStartSim.addEventListener('click', async () => {
    const codigo = inputIdCode.value.trim();
    btnStartSim.disabled = true;
    btnStartSim.textContent = 'Verificando...';

    let result;
    try {
        result = await AUTH.validateCodigo(codigo);
    } catch (err) {
        console.error(err);
        setLoginError('Erro ao conectar. Verifique sua internet e tente novamente.');
        return;
    }

    if (!result.ok) {
        setLoginError('Código não encontrado. Verifique com seu supervisor.');
        return;
    }

    SESSION.save(codigo, result.role, result.nome, result.fbKey);

    const introScreen   = document.getElementById('intro-screen');
    const mainNav       = document.getElementById('main-nav');
    const mainFooter    = document.getElementById('main-footer');
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar   = document.getElementById('progress-bar');
    const loadingText   = document.getElementById('loading-text');

    introScreen.style.display   = 'none';
    mainNav.style.display       = 'none';
    mainFooter.style.display    = 'none';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.height  = '100vh';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 100 / (3000 / 30);
        if (progress >= 100) {
            clearInterval(interval);
            progressBar.style.width = '100%';
            loadingText.textContent = `Bem-vindo, ${result.nome.split(' ')[0]}!`;
            setTimeout(() => { window.location.href = 'simulator.html'; }, 600);
        } else {
            progressBar.style.width = `${progress}%`;
        }
    }, 30);
});

// ─── Modal: Recuperar Acesso ──────────────────────────────────────────────────
document.getElementById('btn-rec-submit').addEventListener('click', async () => {
    const dataNascimento = document.getElementById('rec-nasc').value;
    const matricula      = document.getElementById('rec-matricula').value.trim();
    const errorEl        = document.getElementById('rec-error');
    const successEl      = document.getElementById('rec-success');
    const btn            = document.getElementById('btn-rec-submit');

    errorEl.textContent     = '';
    successEl.style.display = 'none';

    if (!dataNascimento || !matricula) { errorEl.textContent = 'Preencha todos os campos.'; return; }

    btn.disabled = true;
    btn.textContent = 'Verificando...';

    let result;
    try { result = await AUTH.recoverCodigo({ dataNascimento, matricula }); }
    catch (err) { errorEl.textContent = 'Erro ao conectar. Tente novamente.'; btn.disabled = false; btn.textContent = 'Recuperar Código'; return; }

    btn.disabled = false;
    btn.textContent = 'Recuperar Código';

    if (!result.ok) { errorEl.textContent = 'Dados não encontrados. Verifique a data de nascimento e matrícula.'; return; }

    document.getElementById('rec-codigo-display').textContent = result.codigo;
    successEl.style.display = 'flex';
});

// Reseta modal recuperação ao fechar
document.getElementById('btn-close-recuperar-acesso').addEventListener('click', () => {
    document.getElementById('rec-error').textContent = '';
    document.getElementById('rec-success').style.display = 'none';
    ['rec-nasc', 'rec-matricula'].forEach(id => document.getElementById(id).value = '');
});
