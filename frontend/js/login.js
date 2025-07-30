const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';

// DOM Elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const formToggle = document.querySelector('.form-toggle');
const loginForm = document.querySelector('.login-form');
const registerForm = document.querySelector('.register-form');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const successText = document.getElementById('successText');
const errorText = document.getElementById('errorText');
const emailStatus = document.getElementById('emailStatus');
const emailStatusIcon = document.getElementById('emailStatusIcon');
const emailStatusTitle = document.getElementById('emailStatusTitle');
const emailStatusText = document.getElementById('emailStatusText');
const emailStatusAddress = document.getElementById('emailStatusAddress');
const checkEmailBtn = document.getElementById('checkEmailBtn');
const resendEmailBtn = document.getElementById('resendEmailBtn');
const useCodeBtn = document.getElementById('useCodeBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Form Toggle Functionality
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const formType = btn.dataset.form;
        // Update toggle state
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        formToggle.dataset.active = formType;
        // Switch forms
        if (formType === 'login') {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
        }
        clearMessages();
        clearPasswordValidation();
        hideEmailStatus();
    });
});

// Password confirmation validation
function validatePasswordConfirmation() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    
    if (password.value && confirmPassword.value) {
        if (password.value === confirmPassword.value) {
            password.classList.remove('error');
            password.classList.add('success');
            confirmPassword.classList.remove('error');
            confirmPassword.classList.add('success');
            return true;
        } else {
            password.classList.remove('success');
            password.classList.add('error');
            confirmPassword.classList.remove('success');
            confirmPassword.classList.add('error');
            return false;
        }
    }
    return true; // Allow empty fields during typing
}

function clearPasswordValidation() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    
    password.classList.remove('error', 'success');
    confirmPassword.classList.remove('error', 'success');
}

// Add password confirmation event listeners
document.addEventListener('DOMContentLoaded', function() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    
    if (password && confirmPassword) {
        password.addEventListener('input', validatePasswordConfirmation);
        confirmPassword.addEventListener('input', validatePasswordConfirmation);
    }
});

// Message Functions
function showMessage(type, message) {
    clearMessages();
    if (type === 'success') {
        successText.textContent = message;
        successMessage.classList.add('show');
    } else if (type === 'error') {
        errorText.textContent = message;
        errorMessage.classList.add('show');
    }
}

function clearMessages() {
    successMessage.classList.remove('show');
    errorMessage.classList.remove('show');
}

function showEmailStatus(type, email, title, text) {
    hideEmailStatus();
    emailStatus.className = 'email-status show ' + type;
    emailStatusAddress.textContent = email;
    emailStatusTitle.textContent = title;
    emailStatusText.innerHTML = text;
    
    // Set appropriate icon
    switch(type) {
        case 'pending':
            emailStatusIcon.textContent = 'schedule';
            break;
        case 'success':
            emailStatusIcon.textContent = 'check_circle';
            break;
        case 'error':
            emailStatusIcon.textContent = 'error';
            break;
        default:
            emailStatusIcon.textContent = 'mail';
    }
    
    emailStatus.classList.add('show');
}

function hideEmailStatus() {
    emailStatus.classList.remove('show');
    emailStatus.className = 'email-status';
}

function setLoading(button, isLoading) {
    const btnContent = button.querySelector('.btn-content');
    const btnText = button.querySelector('.btn-text');
    
    if (isLoading) {
        // Store original text before replacing
        if (btnText && !btnText.dataset.originalText) {
            btnText.dataset.originalText = btnText.textContent;
        }
        button.disabled = true;
        btnContent.innerHTML = '<div class="loading-spinner"></div>';
    } else {
        button.disabled = false;
        const originalText = btnText?.dataset.originalText || (button.id === 'loginBtn' ? 'Accedi' : 'Crea Account');
        btnContent.innerHTML = `<span class="btn-text">${originalText}</span>`;
    }
}

// API Request Function for Login
async function makeLoginRequest(url, options = {}) {
    try {
        console.log('Making login request...'); // Debug log
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        console.log('Login response:', response.status, data); // Debug log
        
        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            console.log('Login successful, redirecting...'); // Debug log
            
            // Get return URL from query parameters or default to search.html
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl') || 'search.html';
            
            // Force redirect with a small delay to ensure localStorage is saved
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 100);
        } else {
            const errorMessage = data.msg || 'Accesso fallito. Riprova.';
            showMessage('error', errorMessage);
        }
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// API Request Function for Registration with Email Verification
async function makeRegisterRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return { response, data };
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    clearMessages();
    setLoading(loginBtn, true);
    try {
        await makeLoginRequest('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
    } catch (error) {
        showMessage('error', error.message);
    } finally {
        setLoading(loginBtn, false);
    }
});

// Register Form Handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const registerBtn = document.getElementById('registerBtn');
    const name = document.getElementById('registerName').value;
    const surname = document.getElementById('registerSurname').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    
    // Validate password confirmation
    if (password !== confirmPassword) {
        showMessage('error', 'Le password non coincidono. Riprova.');
        return;
    }
    
    clearMessages();
    setLoading(registerBtn, true);
    try {
        const { response, data } = await makeRegisterRequest('/register', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                surname: surname,
                username: username,
                email: email,
                password: password
            })
        });

        if (response.ok) {
            // Check if email verification is required
            if (data.email_verification_required) {
                // Store email for verification flow
                localStorage.setItem('pendingEmail', email);
                
                // Show email verification status
                showEmailStatus('pending', email, 'Verifica la tua Email', 
                    `Abbiamo inviato un link di verifica a <span class="email-address">${email}</span>. Clicca sul link per attivare il tuo account.`);
                
                // Hide the registration form
                document.querySelector('.form-toggle').style.display = 'none';
                document.querySelector('.form-section').style.display = 'none';
                document.querySelector('.demo-info').style.display = 'none';
            } else {
                // Direct login without email verification (legacy)
                localStorage.setItem('authToken', data.access_token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                console.log('Registration successful, redirecting...'); // Debug log
                
                // Get return URL from query parameters or default to search.html
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('returnUrl') || 'search.html';
                
                // Force redirect with a small delay to ensure localStorage is saved
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 100);
            }
        } else {
            const errorMsg = data.msg || 'Registrazione fallita. Riprova.';
            showMessage('error', errorMsg);
        }
    } catch (error) {
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
    } finally {
        setLoading(registerBtn, false);
    }
});

// Email Status Button Handlers
checkEmailBtn?.addEventListener('click', () => {
    // Try to open default email client
    window.location.href = 'mailto:';
});

resendEmailBtn?.addEventListener('click', async () => {
    const email = localStorage.getItem('pendingEmail');
    if (!email) return;
    
    try {
        const response = await fetch(API_BASE + '/resend-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('success', 'Link di verifica inviato nuovamente!');
        } else {
            showMessage('error', data.msg || 'Errore durante l\'invio.');
        }
    } catch (error) {
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
    }
});

useCodeBtn?.addEventListener('click', () => {
    const email = localStorage.getItem('pendingEmail');
    if (email) {
        window.location.href = `verify-code.html?email=${encodeURIComponent(email)}`;
    }
});

forgotPasswordLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showMessage('error', 'Funzionalità in arrivo. Contatta il supporto per reimpostare la password.');
});

// Input field enhancements
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
        if (input.value.trim()) {
            input.classList.add('filled');
        } else {
            input.classList.remove('filled');
        }
    });
    
    input.addEventListener('focus', () => {
        input.classList.remove('error');
    });
});

// Check for pending email verification on page load
const pendingEmail = localStorage.getItem('pendingEmail');
if (pendingEmail && !localStorage.getItem('authToken')) {
    showEmailStatus('pending', pendingEmail, 'Verifica in Sospeso', 
        `Hai una verifica email in sospeso per <span class="email-address">${pendingEmail}</span>. Controlla la tua casella di posta.`);
    
    // Hide forms initially
    document.querySelector('.form-toggle').style.display = 'none';
    document.querySelector('.form-section').style.display = 'none';
    document.querySelector('.demo-info').style.display = 'none';
    
    // Add a button to show forms again
    const backToLoginBtn = document.createElement('button');
    backToLoginBtn.className = 'email-action-btn secondary';
    backToLoginBtn.innerHTML = '<span class="material-symbols-outlined">arrow_back</span> Torna al Login';
    backToLoginBtn.onclick = () => {
        hideEmailStatus();
        localStorage.removeItem('pendingEmail');
        document.querySelector('.form-toggle').style.display = 'flex';
        document.querySelector('.form-section').style.display = 'block';
        document.querySelector('.demo-info').style.display = 'block';
    };
    document.querySelector('.email-actions').appendChild(backToLoginBtn);
}

// Auto-redirect if already logged in
if (localStorage.getItem('authToken')) {
    console.log('Auth token found, redirecting...'); // Debug log
    
    // Get return URL from query parameters or default to search.html
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl') || 'search.html';
    
    window.location.href = returnUrl;
}