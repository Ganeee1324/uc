const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';

// Debug logging
    APP_CONFIG: window.APP_CONFIG,
    API_BASE: API_BASE
});

// DOM Elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const formToggle = document.querySelector('.form-toggle');
const loginForm = document.querySelector('.login-form');
const registerForm = document.querySelector('.register-form');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const successText = document.getElementById('successText');
const errorText = document.getElementById('errorText');

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

// API Request Function
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            // Redirect to search page after successful login
            window.location.href = 'search.html';
        } else {
            const errorMessage = data.msg || 'Accesso fallito. Riprova.';
            showMessage('error', errorMessage);
        }
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
        await makeRequest('/login', {
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
        await makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                surname: surname,
                username: username,
                email: email,
                password: password
            })
        });
    } catch (error) {
        showMessage('error', error.message);
    } finally {
        setLoading(registerBtn, false);
    }
});

// Auto-redirect if already logged in
if (localStorage.getItem('authToken')) {
    window.location.href = 'search.html';
} 