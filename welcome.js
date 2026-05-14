const btnStartSim  = document.getElementById('btn-start-sim');
const chkCiente    = document.getElementById('chk-ciente');
const inputIdCode  = document.getElementById('input-id-code');

/**
 * Verifica se todos os requisitos estão atendidos:
 *  1. Checkbox de leitura obrigatória marcado
 *  2. Campo de código de identificação preenchido
 */
function checkRequirements() {
    const checkboxOk = chkCiente.checked;
    const codeOk     = inputIdCode.value.trim().length > 0;

    btnStartSim.disabled = !(checkboxOk && codeOk);
}

// Escuta as mudanças em ambos os campos
chkCiente.addEventListener('change', checkRequirements);
inputIdCode.addEventListener('input', checkRequirements);

// --- Lógica do botão Iniciar ---
btnStartSim.addEventListener('click', () => {
    const introScreen   = document.getElementById('intro-screen');
    const mainNav        = document.getElementById('main-nav');
    const mainFooter     = document.getElementById('main-footer');
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar  = document.getElementById('progress-bar');
    const loadingText  = document.getElementById('loading-text');

    // Esconde intro, nav e footer; exibe apenas o loading
    introScreen.style.display   = 'none';
    mainNav.style.display       = 'none';
    mainFooter.style.display    = 'none';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.height  = '100vh';

    // Anima a barra de progresso em ~3 segundos
    let progress = 0;
    const intervalTime = 30;
    const increment    = 100 / (3000 / intervalTime);

    const loadingInterval = setInterval(() => {
        progress += increment;

        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);

            progressBar.style.width    = '100%';
            loadingText.textContent    = 'Pronto!';

            setTimeout(() => {
                window.location.href = 'simulator.html';
            }, 500);
        } else {
            progressBar.style.width = `${progress}%`;
        }
    }, intervalTime);
});
