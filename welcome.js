// ─── Utilitários de Modal ─────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.body.style.overflow = '';
}

// Fecha ao clicar no overlay
document.querySelectorAll('.auth-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

// ─── Validação do botão Iniciar ───────────────────────────────────────────────
const btnStartSim = document.getElementById('btn-start-sim');
const chkCiente   = document.getElementById('chk-ciente');
const inputIdCode = document.getElementById('input-id-code');
const idCodeIcon  = document.getElementById('id-code-icon');

function checkRequirements() {
    const checkboxOk = chkCiente.checked;
    const codeOk     = inputIdCode.value.trim().length > 0;
    btnStartSim.disabled = !(checkboxOk && codeOk);
}

chkCiente.addEventListener('change', checkRequirements);
inputIdCode.addEventListener('input', () => {
    // Remove estado de erro ao digitar
    inputIdCode.classList.remove('input-error');
    idCodeIcon.className = 'ph ph-lock-simple id-code-icon';
    document.getElementById('id-code-error-msg').textContent = '';
    checkRequirements();
});

// ─── Login ao clicar Iniciar ──────────────────────────────────────────────────
btnStartSim.addEventListener('click', async () => {
    const codigo = inputIdCode.value.trim();

    // Estado de carregamento
    btnStartSim.disabled = true;
    btnStartSim.textContent = 'Verificando...';

    const result = await AUTH.validateCodigo(codigo);

    if (!result.ok) {
        // Exibe erro
        inputIdCode.classList.add('input-error');
        idCodeIcon.className = 'ph ph-warning id-code-icon input-error-icon';
        document.getElementById('id-code-error-msg').textContent =
            'Código de identificação não encontrado. Verifique ou realize o Primeiro Acesso.';
        btnStartSim.disabled = false;
        btnStartSim.textContent = 'Iniciar Treinamento';
        return;
    }

    // Salva sessão
    SESSION.save(codigo, result.role, result.nome);

    // Esconde nav, footer, intro e exibe loading
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

    // Anima barra de progresso em ~3 segundos
    let progress = 0;
    const intervalTime = 30;
    const increment    = 100 / (3000 / intervalTime);

    const loadingInterval = setInterval(() => {
        progress += increment;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            progressBar.style.width   = '100%';
            loadingText.textContent   = `Bem-vindo, ${result.nome.split(' ')[0]}!`;
            setTimeout(() => { window.location.href = 'simulator.html'; }, 600);
        } else {
            progressBar.style.width = `${progress}%`;
        }
    }, intervalTime);
});

// ─── Modal: Primeiro Acesso (Cadastro) ────────────────────────────────────────
document.getElementById('btn-reg-submit').addEventListener('click', async () => {
    const nomeCompleto   = document.getElementById('reg-nome').value.trim();
    const dataNascimento = document.getElementById('reg-nasc').value;
    const matricula      = document.getElementById('reg-matricula').value.trim();
    const chave          = document.getElementById('reg-chave').value;
    const errorEl        = document.getElementById('reg-error');
    const successEl      = document.getElementById('reg-success');
    const btn            = document.getElementById('btn-reg-submit');

    errorEl.textContent = '';
    successEl.style.display = 'none';

    // Validações locais
    if (!nomeCompleto || !dataNascimento || !matricula || !chave) {
        errorEl.textContent = 'Por favor, preencha todos os campos.';
        return;
    }
    if (chave !== AUTH.PALAVRA_CHAVE) {
        errorEl.textContent = 'Palavra-chave incorreta. Solicite ao seu supervisor.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    const result = await AUTH.registerColaborador({ nomeCompleto, dataNascimento, matricula });

    btn.disabled = false;
    btn.textContent = 'Criar Acesso';

    if (!result.ok) {
        errorEl.textContent = result.error;
        return;
    }

    // Exibe sucesso com o código gerado
    document.getElementById('reg-codigo-display').textContent = result.codigo;
    successEl.style.display = 'flex';
    btn.style.display = 'none';

    // Limpa os campos
    document.getElementById('reg-nome').value      = '';
    document.getElementById('reg-nasc').value      = '';
    document.getElementById('reg-matricula').value = '';
    document.getElementById('reg-chave').value     = '';
});

// ─── Modal: Recuperar Acesso ──────────────────────────────────────────────────
document.getElementById('btn-rec-submit').addEventListener('click', async () => {
    const dataNascimento = document.getElementById('rec-nasc').value;
    const matricula      = document.getElementById('rec-matricula').value.trim();
    const chave          = document.getElementById('rec-chave').value;
    const errorEl        = document.getElementById('rec-error');
    const successEl      = document.getElementById('rec-success');
    const btn            = document.getElementById('btn-rec-submit');

    errorEl.textContent = '';
    successEl.style.display = 'none';

    if (!dataNascimento || !matricula || !chave) {
        errorEl.textContent = 'Por favor, preencha todos os campos.';
        return;
    }
    if (chave !== AUTH.PALAVRA_CHAVE) {
        errorEl.textContent = 'Palavra-chave incorreta.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Verificando...';

    const result = await AUTH.recoverCodigo({ dataNascimento, matricula });

    btn.disabled = false;
    btn.textContent = 'Recuperar Código';

    if (!result.ok) {
        errorEl.textContent = 'Dados não encontrados. Solicite acesso ao seu supervisor.';
        return;
    }

    document.getElementById('rec-codigo-display').textContent = result.codigo;
    successEl.style.display = 'flex';
});

// Reseta modais ao fechar
document.getElementById('btn-close-primeiro-acesso').addEventListener('click', () => {
    document.getElementById('reg-error').textContent = '';
    document.getElementById('reg-success').style.display = 'none';
    document.getElementById('btn-reg-submit').style.display = '';
    document.getElementById('btn-reg-submit').disabled = false;
    document.getElementById('btn-reg-submit').textContent = 'Criar Acesso';
});

document.getElementById('btn-close-recuperar-acesso').addEventListener('click', () => {
    document.getElementById('rec-error').textContent = '';
    document.getElementById('rec-success').style.display = 'none';
    document.getElementById('rec-nasc').value      = '';
    document.getElementById('rec-matricula').value = '';
    document.getElementById('rec-chave').value     = '';
});
