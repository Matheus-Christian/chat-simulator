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
let recFbKeyAtual = null;

document.getElementById('btn-rec-submit').addEventListener('click', async () => {
    const dataNascimento = document.getElementById('rec-nasc').value;
    const matricula      = document.getElementById('rec-matricula').value.trim();
    const chave          = document.getElementById('rec-chave').value;
    const errorEl        = document.getElementById('rec-error');
    const successEl      = document.getElementById('rec-success');
    const changeEl       = document.getElementById('rec-change-section');
    const btn            = document.getElementById('btn-rec-submit');

    errorEl.textContent     = '';
    successEl.style.display = 'none';
    changeEl.style.display  = 'none';
    recFbKeyAtual           = null;

    if (!dataNascimento || !matricula || !chave) { errorEl.textContent = 'Preencha todos os campos.'; return; }
    if (chave !== AUTH.PALAVRA_CHAVE) { errorEl.textContent = 'Palavra-chave incorreta.'; return; }

    btn.disabled = true;
    btn.textContent = 'Verificando...';

    let result;
    try { result = await AUTH.recoverCodigo({ dataNascimento, matricula }); }
    catch (err) { errorEl.textContent = 'Erro ao conectar. Tente novamente.'; btn.disabled = false; btn.textContent = 'Recuperar Código'; return; }

    btn.disabled = false;
    btn.textContent = 'Recuperar Código';

    if (!result.ok) { errorEl.textContent = 'Dados não encontrados. Solicite acesso ao seu supervisor.'; return; }

    document.getElementById('rec-codigo-display').textContent = result.codigo;
    successEl.style.display = 'flex';
    recFbKeyAtual = result.fbKey;
    changeEl.style.display = 'block';

    const infoEl = document.getElementById('rec-change-info');
    const formEl = document.getElementById('rec-change-form');
    if (result.codigoAlterado) {
        infoEl.textContent = 'Você já alterou seu código anteriormente. Para redefini-lo, solicite ao supervisor.';
        infoEl.style.color = '#666';
        formEl.style.display = 'none';
    } else {
        infoEl.textContent = 'Você pode alterar seu código de identificação uma única vez.';
        infoEl.style.color = '';
        formEl.style.display = 'block';
    }
});

document.getElementById('btn-rec-change').addEventListener('click', async () => {
    const novoCodigo = document.getElementById('rec-novo-codigo').value.trim();
    const errorEl    = document.getElementById('rec-change-error');
    const btn        = document.getElementById('btn-rec-change');

    errorEl.textContent = '';
    if (!novoCodigo || novoCodigo.length < 4) { errorEl.textContent = 'O novo código deve ter pelo menos 4 caracteres.'; return; }
    if (!recFbKeyAtual) { errorEl.textContent = 'Erro inesperado. Recarregue e tente novamente.'; return; }

    btn.disabled = true;
    btn.textContent = 'Alterando...';

    let result;
    try { result = await AUTH.changeColaboradorCodigo({ fbKey: recFbKeyAtual, novoCodigo }); }
    catch (err) { errorEl.textContent = 'Erro ao conectar. Tente novamente.'; btn.disabled = false; btn.textContent = 'Confirmar Alteração'; return; }

    btn.disabled = false;
    btn.textContent = 'Confirmar Alteração';

    if (!result.ok) { errorEl.textContent = result.error; return; }

    document.getElementById('rec-codigo-display').textContent = novoCodigo;
    document.getElementById('rec-change-form').style.display  = 'none';
    const infoEl = document.getElementById('rec-change-info');
    infoEl.textContent = '✅ Código alterado com sucesso! Use o novo código para acessar o simulador.';
    infoEl.style.color = '#15803d';
});

// Reseta modal recuperação ao fechar
document.getElementById('btn-close-recuperar-acesso').addEventListener('click', () => {
    ['rec-error', 'rec-change-error'].forEach(id => document.getElementById(id).textContent = '');
    ['rec-success', 'rec-change-section', 'rec-change-form'].forEach(id => document.getElementById(id).style.display = 'none');
    ['rec-nasc', 'rec-matricula', 'rec-chave', 'rec-novo-codigo'].forEach(id => document.getElementById(id).value = '');
    recMatriculaAtual = null;
});
