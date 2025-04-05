document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validación de usuario (esto debe manejarse en el servidor en producción)
    if (username === 'admin' && password === 'admin123') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        window.location.href = 'admin.html';
    } else {
        const errorMessage = document.getElementById('error-message');
        errorMessage.style.display = 'block';
    }
});
