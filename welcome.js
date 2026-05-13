const btnStartSim = document.getElementById('btn-start-sim');
const chkCiente = document.getElementById('chk-ciente');

chkCiente.addEventListener('change', (e) => {
    btnStartSim.disabled = !e.target.checked;
});

btnStartSim.addEventListener('click', () => {
    const introScreen = document.getElementById('intro-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    // Hide intro
    introScreen.style.display = 'none';
    
    // Show loading
    loadingScreen.style.display = 'flex';
    
    // Animate progress bar over ~3 seconds
    let progress = 0;
    const intervalTime = 30; // ms
    const increment = 100 / (3000 / intervalTime); // reaches 100 in 3s
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Reached 100%
            progressBar.style.width = '100%';
            loadingText.textContent = 'Pronto!';
            
            // Wait briefly before redirecting
            setTimeout(() => {
                window.location.href = 'simulator.html';
            }, 500);
        } else {
            progressBar.style.width = `${progress}%`;
        }
    }, intervalTime);
});
