// API Configuration - use existing API_BASE if defined, otherwise define it
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
}

// DOM Elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const formToggle = document.querySelector('.form-toggle');
const loginForm = document.querySelector('.login-form');
const registerForm = document.querySelector('.register-form');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const successText = document.getElementById('successText');
const errorText = document.getElementById('errorText');
const loginErrorMessage = document.getElementById('loginErrorMessage');
const loginErrorText = document.getElementById('loginErrorText');
const emailStatus = document.getElementById('emailStatus');
const emailStatusIcon = document.getElementById('emailStatusIcon');
const emailStatusTitle = document.getElementById('emailStatusTitle');
const emailStatusText = document.getElementById('emailStatusText');
const emailStatusAddress = document.getElementById('emailStatusAddress');
const resendEmailBtn = document.getElementById('resendEmailBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const contactSupportBtn = document.getElementById('contactSupportBtn');
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

// Password validation functions
function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('La password deve contenere almeno 8 caratteri');
    }
    
    if (password.length > 128) {
        errors.push('La password non può superare i 128 caratteri');
    }
    
    if (!password.match(/[A-Z]/)) {
        errors.push('La password deve contenere almeno una lettera maiuscola');
    }
    
    if (!password.match(/[a-z]/)) {
        errors.push('La password deve contenere almeno una lettera minuscola');
    }
    
    if (!password.match(/\d/)) {
        errors.push('La password deve contenere almeno un numero');
    }
    
    return errors;
}

function validateUsername(username) {
    const errors = [];
    
    if (username.length < 3) {
        errors.push('Il nome utente deve contenere almeno 3 caratteri');
    }
    
    if (username.length > 50) {
        errors.push('Il nome utente non può superare i 50 caratteri');
    }
    
    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
        errors.push('Il nome utente può contenere solo lettere, numeri e underscore');
    }
    
    return errors;
}

function validateEmail(email) {
    const errors = [];
    
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        errors.push('Inserisci un indirizzo email valido');
    }
    
    return errors;
}

function validateName(name, fieldName) {
    const errors = [];
    
    if (name.length < 1) {
        errors.push(`${fieldName} è obbligatorio`);
    }
    
    if (name.length > 100) {
        errors.push(`${fieldName} non può superare i 100 caratteri`);
    }
    
    return errors;
}

function showFieldError(fieldId, errors) {
    const field = document.getElementById(fieldId);
    const formGroup = field.parentNode;
    let errorTooltip = formGroup.querySelector('.error-tooltip');
    
    // Remove existing error tooltip
    if (errorTooltip) {
        errorTooltip.remove();
    }
    
    if (errors.length > 0) {
        field.classList.add('error');
        field.classList.remove('success');
        
        // Create error tooltip
        errorTooltip = document.createElement('div');
        errorTooltip.className = 'error-tooltip';
        
        if (errors.length === 1) {
            errorTooltip.textContent = errors[0];
        } else {
            const errorList = document.createElement('ul');
            errorList.className = 'error-list';
            errors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error;
                errorList.appendChild(li);
            });
            errorTooltip.appendChild(errorList);
        }
        
        formGroup.appendChild(errorTooltip);
        
        // Show tooltip with animation
        setTimeout(() => {
            errorTooltip.classList.add('show');
        }, 10);
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (errorTooltip && errorTooltip.parentNode) {
                errorTooltip.classList.remove('show');
                setTimeout(() => {
                    if (errorTooltip && errorTooltip.parentNode) {
                        errorTooltip.remove();
                    }
                }, 300);
            }
        }, 4000);
    } else {
        field.classList.remove('error');
        field.classList.add('success');
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const formGroup = field.parentNode;
    const errorTooltip = formGroup.querySelector('.error-tooltip');
    
    if (errorTooltip) {
        errorTooltip.classList.remove('show');
        setTimeout(() => {
            if (errorTooltip && errorTooltip.parentNode) {
                errorTooltip.remove();
            }
        }, 300);
    }
    
    field.classList.remove('error', 'success');
}

// Password confirmation validation with debouncing
let confirmPasswordTimeout = null;

function validatePasswordConfirmation(immediate = false) {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    
    if (password.value && confirmPassword.value) {
        if (password.value === confirmPassword.value) {
            clearFieldError('registerPasswordConfirm');
            confirmPassword.classList.remove('error');
            confirmPassword.classList.add('success');
            return true;
        } else {
            // Only show error immediately if explicitly requested (like on form submit)
            // Otherwise, debounce the error display to avoid showing it while user is typing
            if (immediate) {
                showFieldError('registerPasswordConfirm', ['Le password non coincidono']);
                return false;
            } else {
                // Clear any existing timeout
                if (confirmPasswordTimeout) {
                    clearTimeout(confirmPasswordTimeout);
                }
                
                // Set a delay before showing the error
                confirmPasswordTimeout = setTimeout(() => {
                    // Double-check the values haven't changed during the timeout
                    if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
                        showFieldError('registerPasswordConfirm', ['Le password non coincidono']);
                    }
                }, 800); // 800ms delay - user stops typing before showing error
                return false;
            }
        }
    }
    return true; // Allow empty fields during typing
}

function clearPasswordValidation() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    
    password.classList.remove('error', 'success');
    confirmPassword.classList.remove('error', 'success');
    
    clearFieldError('registerPassword');
    clearFieldError('registerPasswordConfirm');
    hidePasswordRequirements();
    
    // Clear any pending confirmation validation timeout
    if (confirmPasswordTimeout) {
        clearTimeout(confirmPasswordTimeout);
        confirmPasswordTimeout = null;
    }
}

function showPasswordRequirements() {
    const panel = document.getElementById('passwordRequirementsPanel');
    if (!panel) return;
    
    // Check if panel should be positioned on the left side (if there's not enough space on the right)
    if (window.innerWidth > 768) {
        const container = panel.closest('.password-field-container');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const panelWidth = 280;
            const spacing = 20;
            
            // Check if there's enough space on the right side
            const spaceOnRight = window.innerWidth - (containerRect.right + spacing);
            
            if (spaceOnRight < panelWidth) {
                // Not enough space on right, position on left
                panel.classList.add('left-side');
            } else {
                // Enough space on right, use default positioning
                panel.classList.remove('left-side');
            }
        }
    }
    
    // Simply show the panel - CSS handles all positioning automatically!
    panel.classList.add('show');
}

function hidePasswordRequirements() {
    const panel = document.getElementById('passwordRequirementsPanel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function updatePasswordRequirements(password) {
    const panel = document.getElementById('passwordRequirementsPanel');
    if (!panel) return;
    
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        digit: /\d/.test(password)
    };
    
    Object.entries(checks).forEach(([requirement, isValid]) => {
        const item = panel.querySelector(`[data-requirement="${requirement}"]`);
        if (item) {
            item.classList.remove('valid', 'invalid');
            if (password.length > 0) {
                item.classList.add(isValid ? 'valid' : 'invalid');
            }
        }
    });
}

function validateAllRegistrationFields() {
    const name = document.getElementById('registerName').value;
    const surname = document.getElementById('registerSurname').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    
    let isValid = true;
    
    // Validate name
    const nameErrors = validateName(name, 'Nome');
    if (nameErrors.length > 0) {
        showFieldError('registerName', nameErrors);
        isValid = false;
    } else {
        clearFieldError('registerName');
    }
    
    // Validate surname
    const surnameErrors = validateName(surname, 'Cognome');
    if (surnameErrors.length > 0) {
        showFieldError('registerSurname', surnameErrors);
        isValid = false;
    } else {
        clearFieldError('registerSurname');
    }
    
    // Validate username
    const usernameErrors = validateUsername(username);
    if (usernameErrors.length > 0) {
        showFieldError('registerUsername', usernameErrors);
        isValid = false;
    } else {
        clearFieldError('registerUsername');
    }
    
    // Validate email
    const emailErrors = validateEmail(email);
    if (emailErrors.length > 0) {
        showFieldError('registerEmail', emailErrors);
        isValid = false;
    } else {
        clearFieldError('registerEmail');
    }
    
    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        showFieldError('registerPassword', passwordErrors);
        isValid = false;
    } else {
        clearFieldError('registerPassword');
    }
    
    // Validate password confirmation with immediate validation
    if (password !== confirmPassword) {
        showFieldError('registerPasswordConfirm', ['Le password non coincidono']);
        isValid = false;
    } else if (confirmPassword.length > 0) {
        clearFieldError('registerPasswordConfirm');
    }
    
    return isValid;
}

// Password visibility toggle functionality
function initializePasswordToggles() {
    // Register Password Toggle
    const registerPasswordToggle = document.getElementById('registerPasswordToggle');
    const registerPasswordField = document.getElementById('registerPassword');
    
    if (registerPasswordToggle && registerPasswordField) {
        registerPasswordToggle.addEventListener('click', () => {
            if (registerPasswordField.type === 'password') {
                registerPasswordField.type = 'text';
                registerPasswordToggle.textContent = 'visibility';
            } else {
                registerPasswordField.type = 'password';
                registerPasswordToggle.textContent = 'visibility_off';
            }
        });
    }
    
    // Register Password Confirmation Toggle
    const registerPasswordConfirmToggle = document.getElementById('registerPasswordConfirmToggle');
    const registerPasswordConfirmField = document.getElementById('registerPasswordConfirm');
    
    if (registerPasswordConfirmToggle && registerPasswordConfirmField) {
        registerPasswordConfirmToggle.addEventListener('click', () => {
            if (registerPasswordConfirmField.type === 'password') {
                registerPasswordConfirmField.type = 'text';
                registerPasswordConfirmToggle.textContent = 'visibility';
            } else {
                registerPasswordConfirmField.type = 'password';
                registerPasswordConfirmToggle.textContent = 'visibility_off';
            }
        });
    }
}

// Password info icon functionality for smaller screens
function initializePasswordInfoIcon() {
    const passwordInfoIcon = document.getElementById('passwordInfoIcon');
    const passwordRequirementsPanel = document.getElementById('passwordRequirementsPanel');
    
    if (passwordInfoIcon && passwordRequirementsPanel) {
        passwordInfoIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            
            // Only works on smaller screens where the icon is visible
            if (window.innerWidth <= 768) {
                if (passwordRequirementsPanel.classList.contains('show')) {
                    hidePasswordRequirements();
                } else {
                    showPasswordRequirements();
                }
            }
        });
    }
}

// Add password confirmation event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize password toggles and info icon
    initializePasswordToggles();
    initializePasswordInfoIcon();
    
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerPasswordConfirm');
    const name = document.getElementById('registerName');
    const surname = document.getElementById('registerSurname');
    const username = document.getElementById('registerUsername');
    const email = document.getElementById('registerEmail');
    
    // Real-time password validation
    if (password) {
        let hideRequirementsTimeout;
        
        password.addEventListener('focus', () => {
            clearTimeout(hideRequirementsTimeout);
            showPasswordRequirements();
        });
        
        password.addEventListener('input', () => {
            // Show requirements when user starts typing
            showPasswordRequirements();
            updatePasswordRequirements(password.value);
            
            if (password.value.length > 0) {
                const errors = validatePassword(password.value);
                if (errors.length === 0) {
                    clearFieldError('registerPassword');
                    password.classList.add('success');
                } else {
                    password.classList.remove('success');
                }
            }
            
            // Clear any pending confirmation validation timeout since password changed
            if (confirmPasswordTimeout) {
                clearTimeout(confirmPasswordTimeout);
                confirmPasswordTimeout = null;
            }
            
            validatePasswordConfirmation();
        });
        
        // Remove blur hiding - overlay stays visible until click outside
        // (No blur event listener needed)
        
        // Global click handler to hide overlay when clicking outside
        const passwordRequirements = document.getElementById('passwordRequirementsPanel');
        if (passwordRequirements) {
            document.addEventListener('click', (event) => {
                // Check if overlay is visible
                if (passwordRequirements.classList.contains('show')) {
                    // Get the password field container (includes label, input, icon, and panel)
                    const passwordContainer = password.closest('.password-field-container');
                    
                    // Check if click is outside the entire password container
                    const isClickInsideContainer = passwordContainer && passwordContainer.contains(event.target);
                    
                    if (!isClickInsideContainer) {
                        hidePasswordRequirements();
                    }
                }
            });
        }
        
        // Simple resize handler for left/right positioning (CSS handles the rest!)
        const handleResize = () => {
            if (passwordRequirements && passwordRequirements.classList.contains('show')) {
                showPasswordRequirements(); // Only recalculate left/right positioning on resize
            }
        };
        
        // Only need resize event - CSS handles all scroll positioning automatically!
        window.addEventListener('resize', handleResize);
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            // Clear any pending confirmation validation timeout since user is actively typing
            if (confirmPasswordTimeout) {
                clearTimeout(confirmPasswordTimeout);
                confirmPasswordTimeout = null;
            }
            validatePasswordConfirmation();
        });
        
        // Ensure confirm password field never triggers password requirements overlay
        confirmPassword.addEventListener('focus', () => {
            // Explicitly hide password requirements when confirm password is focused
            hidePasswordRequirements();
        });
        
        confirmPassword.addEventListener('blur', () => {
            // Keep requirements hidden when leaving confirm password
            hidePasswordRequirements();
        });
    }
    
    // Real-time validation for other fields
    if (name) {
        name.addEventListener('blur', () => {
            if (name.value.length > 0) {
                const errors = validateName(name.value, 'Nome');
                if (errors.length > 0) {
                    showFieldError('registerName', errors);
                } else {
                    clearFieldError('registerName');
                    name.classList.add('success');
                }
            }
        });
    }
    
    if (surname) {
        surname.addEventListener('blur', () => {
            if (surname.value.length > 0) {
                const errors = validateName(surname.value, 'Cognome');
                if (errors.length > 0) {
                    showFieldError('registerSurname', errors);
                } else {
                    clearFieldError('registerSurname');
                    surname.classList.add('success');
                }
            }
        });
    }
    
    if (username) {
        username.addEventListener('blur', () => {
            if (username.value.length > 0) {
                const errors = validateUsername(username.value);
                if (errors.length > 0) {
                    showFieldError('registerUsername', errors);
                } else {
                    clearFieldError('registerUsername');
                    username.classList.add('success');
                }
            }
        });
    }
    
    if (email) {
        email.addEventListener('blur', () => {
            if (email.value.length > 0) {
                const errors = validateEmail(email.value);
                if (errors.length > 0) {
                    showFieldError('registerEmail', errors);
                } else {
                    clearFieldError('registerEmail');
                    email.classList.add('success');
                }
            }
        });
    }
});

// Message Functions
function showMessage(type, message) {
    if (type === 'success') {
        console.log(message);
    } else if (type === 'error') {
        console.error(message);
        // Show login-specific error message if available
        if (loginErrorMessage && loginErrorText) {
            loginErrorText.textContent = message;
            loginErrorMessage.classList.add('show');
        }
    }
}

function clearMessages() {
    if (successMessage) {
        successMessage.classList.remove('show');
    }
    if (errorMessage) {
        errorMessage.classList.remove('show');
    }
    if (loginErrorMessage) {
        loginErrorMessage.classList.remove('show');
    }
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
            
            // Get return URL from query parameters
            const urlParams = new URLSearchParams(window.location.search);
            let returnUrl = urlParams.get('returnUrl');
            
            // If no specific return URL, determine based on user's login history
            if (!returnUrl) {
                // Check if this is the user's first login
                // Use explicit is_first_login flag from backend if available
                // Otherwise, use localStorage to track if user has already completed profile setup
                const isFirstLogin = data.user && (
                    data.user.is_first_login ||
                    (!localStorage.getItem('profileSetupCompleted'))
                );
                
                // If redirecting to profile completion, mark that we're doing so
                if (isFirstLogin) {
                    localStorage.setItem('profileSetupInitiated', 'true');
                }
                
                returnUrl = isFirstLogin ? 'complete-profile.html' : 'search.html';
            }
            
            // Force redirect with a small delay to ensure localStorage is saved
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 100);
        } else {
            // Handle specific login errors
            let errorMessage = 'Accesso fallito. Riprova.';
            
            if (data.error) {
                switch (data.error) {
                    case 'invalid_credentials':
                    case 'invalid_password':
                        errorMessage = 'Email o password non corretta.';
                        break;
                    case 'user_not_found':
                        errorMessage = 'Nessun account trovato con questa email.';
                        break;
                    case 'account_not_verified':
                        errorMessage = 'Il tuo account non è stato ancora verificato. Controlla la tua email.';
                        break;
                    case 'account_locked':
                        errorMessage = 'Account temporaneamente bloccato. Riprova più tardi.';
                        break;
                    default:
                        errorMessage = data.msg || 'Accesso fallito. Riprova.';
                }
            } else {
                errorMessage = data.msg || 'Accesso fallito. Riprova.';
            }
            
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
    const rememberMe = document.getElementById('rememberMe').checked;
    
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
        // Save remembered credentials on successful login
        saveRememberedCredentials(email, rememberMe);
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
    
    clearMessages();
    
    // Validate all fields before submission
    if (!validateAllRegistrationFields()) {
        showMessage('error', 'Correggi gli errori evidenziati prima di continuare.');
        return;
    }
    
    const name = document.getElementById('registerName').value;
    const surname = document.getElementById('registerSurname').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
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
            // Always require email verification for new registrations
            // Store email for verification flow
            localStorage.setItem('pendingEmail', email);
            
            // Show email verification status
            showEmailStatus('pending', email, 'Verifica la tua Email', 
                `Abbiamo inviato un link di verifica a <span class="email-address">${email}</span>. Clicca sul link per attivare il tuo account.`);
            
            // Hide the registration form
            document.querySelector('.form-toggle').style.display = 'none';
            document.querySelector('.form-section').style.display = 'none';
        } else {
            // Handle specific backend validation errors
            if (data.error) {
                switch (data.error) {
                    case 'email_already_exists':
                        showFieldError('registerEmail', ['Questo indirizzo email è già registrato']);
                        break;
                    case 'username_already_exists':
                        showFieldError('registerUsername', ['Questo nome utente è già in uso']);
                        break;
                    case 'validation_error':
                        // Try to parse validation details if available
                        if (data.details && Array.isArray(data.details)) {
                            data.details.forEach(detail => {
                                if (detail.includes('password')) {
                                    if (detail.includes('uppercase')) {
                                        showFieldError('registerPassword', ['La password deve contenere almeno una lettera maiuscola']);
                                    } else if (detail.includes('lowercase')) {
                                        showFieldError('registerPassword', ['La password deve contenere almeno una lettera minuscola']);
                                    } else if (detail.includes('digit')) {
                                        showFieldError('registerPassword', ['La password deve contenere almeno un numero']);
                                    } else if (detail.includes('min_length')) {
                                        showFieldError('registerPassword', ['La password deve contenere almeno 8 caratteri']);
                                    }
                                } else if (detail.includes('username')) {
                                    showFieldError('registerUsername', ['Nome utente non valido']);
                                } else if (detail.includes('email')) {
                                    showFieldError('registerEmail', ['Indirizzo email non valido']);
                                }
                            });
                        } else {
                            showMessage('error', data.msg || 'Errore di validazione. Controlla i dati inseriti.');
                        }
                        break;
                    default:
                        showMessage('error', data.msg || 'Registrazione fallita. Riprova.');
                }
            } else {
                showMessage('error', data.msg || 'Registrazione fallita. Riprova.');
            }
        }
    } catch (error) {
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
    } finally {
        setLoading(registerBtn, false);
    }
});

// Email Status Button Handlers
resendEmailBtn?.addEventListener('click', async () => {
    const email = localStorage.getItem('pendingEmail');
    if (!email) return;
    
    try {
        const response = await fetch(API_BASE + '/login/resend-verification-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('success', 'Email di verifica inviata nuovamente!');
        } else {
            showMessage('error', data.msg || 'Errore durante l\'invio.');
        }
    } catch (error) {
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
    }
});

backToLoginBtn?.addEventListener('click', () => {
    // Clear any pending email data
    localStorage.removeItem('pendingEmail');
    // Redirect to basic starting index.html (reload the page to reset to initial state)
    window.location.href = 'index.html';
});

contactSupportBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // Open support email with pre-filled subject
    const email = localStorage.getItem('pendingEmail') || '';
    const subject = encodeURIComponent('Supporto - Problema con verifica email');
    const body = encodeURIComponent(`Ciao,

Ho bisogno di aiuto con la verifica del mio account.

Email: ${email}
Problema: Non riesco a completare la verifica email

Grazie per l'assistenza.`);
    
    window.location.href = `mailto:support@uniclarity.com?subject=${subject}&body=${body}`;
});

// Forgot Password Modal functionality
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalActionBtn = document.getElementById('modalActionBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const resetEmail = document.getElementById('resetEmail');
const modalErrorMessage = document.getElementById('modalErrorMessage');
const modalErrorText = document.getElementById('modalErrorText');

let currentStep = 1;
let resetToken = null;

function showModal() {
    forgotPasswordModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    forgotPasswordModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    hideModalError();
    // Reset modal state after animation completes
    setTimeout(() => {
        resetModalState();
    }, 300);
}

function resetModalState() {
    currentStep = 1;
    resetToken = null;
    
    // Reset form
    resetEmail.value = '';
    
    // Show step 1
    document.querySelectorAll('.modal-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    
    // Reset header
    modalTitle.textContent = 'Reimposta Password';
    modalSubtitle.textContent = 'Inserisci il tuo indirizzo email per ricevere le istruzioni di reset';
    
    // Reset button
    updateModalButton('Invia Email', false);
    
    // Hide modal error
    hideModalError();
}

function showModalError(message) {
    modalErrorText.textContent = message;
    modalErrorMessage.style.display = 'flex';
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        hideModalError();
    }, 4000);
}

function hideModalError() {
    if (modalErrorMessage) {
        modalErrorMessage.style.display = 'none';
    }
}

function updateModalButton(text, isLoading = false) {
    const btnContent = modalActionBtn.querySelector('.btn-content');
    const btnText = modalActionBtn.querySelector('.btn-text');
    
    if (isLoading) {
        modalActionBtn.disabled = true;
        btnContent.innerHTML = '<div class="loading-spinner"></div>';
    } else {
        modalActionBtn.disabled = false;
        btnContent.innerHTML = `<span class="btn-text">${text}</span>`;
    }
}

function switchToStep(step) {
    currentStep = step;
    
    // Hide all steps
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    
    // Only handle step 1 since we're redirecting for password reset
    if (step === 1) {
        document.getElementById('step1').classList.add('active');
        modalTitle.textContent = 'Reimposta Password';
        modalSubtitle.textContent = 'Inserisci il tuo indirizzo email per ricevere le istruzioni di reset';
        updateModalButton('Invia Email');
    }
}

async function sendPasswordResetEmail(email) {
    // FOR DEVELOPMENT: Redirect directly to password reset page
    console.log('DEV MODE: Redirecting to password reset page');
    
    // Hide modal first
    hideModal();
    
    // Redirect to password reset page with dev token
    window.location.href = 'reset-password.html?token=dev-bypass-token-' + Date.now();
    return true;
    
    /* ORIGINAL CODE - for production use:
    try {
        const response = await fetch(API_BASE + '/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            switchToStep(2);
            return true;
        } else {
            showMessage('error', data.msg || 'Errore durante l\'invio dell\'email di reset.');
            return false;
        }
    } catch (error) {
        console.error('Password reset request failed:', error);
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
        return false;
    }
    */
}

async function updatePassword(newPasswordValue, token) {
    // FOR DEVELOPMENT: Simulate successful password update
    if (token === 'dev-bypass-token') {
        console.log('DEV MODE: Simulating successful password update');
        hideModal();
        showMessage('success', 'Password aggiornata con successo! Ora puoi accedere con la nuova password.');
        return true;
    }
    
    /* ORIGINAL CODE - will run for real tokens:
    try {
        const response = await fetch(API_BASE + '/reset-password/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token: token,
                new_password: newPasswordValue 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideModal();
            showMessage('success', 'Password aggiornata con successo! Ora puoi accedere con la nuova password.');
            return true;
        } else {
            showMessage('error', data.msg || 'Errore durante l\'aggiornamento della password.');
            return false;
        }
    } catch (error) {
        console.error('Password update failed:', error);
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
        return false;
    }
    */
    
    try {
        const response = await fetch(API_BASE + '/reset-password/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token: token,
                new_password: newPasswordValue 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideModal();
            showMessage('success', 'Password aggiornata con successo! Ora puoi accedere con la nuova password.');
            return true;
        } else {
            showMessage('error', data.msg || 'Errore durante l\'aggiornamento della password.');
            return false;
        }
    } catch (error) {
        console.error('Password update failed:', error);
        showMessage('error', 'Errore di connessione. Riprova più tardi.');
        return false;
    }
}

// validateNewPassword function removed - now handled in reset-password.js

// Event Listeners
forgotPasswordLink?.addEventListener('click', (e) => {
    e.preventDefault();
    clearMessages();
    showModal();
});

// Hide modal error when user starts typing in reset email
resetEmail?.addEventListener('input', () => {
    hideModalError();
});

modalCancelBtn?.addEventListener('click', hideModal);

// Close modal when clicking outside
forgotPasswordModal?.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
        hideModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && forgotPasswordModal.classList.contains('show')) {
        hideModal();
    }
});

modalActionBtn?.addEventListener('click', async () => {
    // Clear any existing modal errors
    hideModalError();
    
    // Send reset email
    const email = resetEmail.value.trim();
    if (!email) {
        showModalError('Inserisci un indirizzo email valido');
        return;
    }
    
    const emailErrors = validateEmail(email);
    if (emailErrors.length > 0) {
        showModalError(emailErrors[0]);
        return;
    }
    
    updateModalButton('Invio in corso...', true);
    const success = await sendPasswordResetEmail(email);
    if (!success) {
        updateModalButton('Invia Email', false);
    }
});

// Password reset is now handled in reset-password.html

// Remember me functionality
function loadRememberedCredentials() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
}

function saveRememberedCredentials(email, remember) {
    if (remember) {
        localStorage.setItem('rememberedEmail', email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
}

// Load remembered credentials on page load
document.addEventListener('DOMContentLoaded', function() {
    loadRememberedCredentials();
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
        // Clear error state and hide any error tooltips
        input.classList.remove('error');
        const formGroup = input.parentNode;
        const errorTooltip = formGroup.querySelector('.error-tooltip');
        if (errorTooltip) {
            errorTooltip.classList.remove('show');
            setTimeout(() => {
                if (errorTooltip && errorTooltip.parentNode) {
                    errorTooltip.remove();
                }
            }, 300);
        }
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
    
    // The "Torna al login" button is now handled in HTML and doesn't need dynamic creation
}

// Check URL parameters for email verification result
const urlParams = new URLSearchParams(window.location.search);
const verified = urlParams.get('verified');
const verificationError = urlParams.get('error');

// Handle email verification result
if (verified === 'true') {
    // Email was successfully verified
    localStorage.removeItem('pendingEmail');
    showEmailStatus('success', '', 'Email Verificata!', 
        'Il tuo account è stato verificato con successo. Ora puoi accedere con le tue credenziali.');
    
    // Hide forms initially but show them after a delay so user can login
    document.querySelector('.form-toggle').style.display = 'none';
    document.querySelector('.form-section').style.display = 'none';
    
    // Show login form after 2 seconds
    setTimeout(() => {
        hideEmailStatus();
        document.querySelector('.form-toggle').style.display = 'flex';
        document.querySelector('.form-section').style.display = 'block';
    }, 2000);
} else if (verificationError) {
    // Email verification failed
    const errorMessage = verificationError === 'invalid_token' ? 
        'Link di verifica non valido o scaduto.' : 
        'Si è verificato un errore durante la verifica.';
    
    showEmailStatus('error', '', 'Verifica Fallita', errorMessage);
    
    // Hide forms initially but allow user to try again
    document.querySelector('.form-toggle').style.display = 'none';
    document.querySelector('.form-section').style.display = 'none';
}

// Auto-redirect if already logged in
if (localStorage.getItem('authToken')) {
    console.log('Auth token found, redirecting...'); // Debug log
    
    // Get return URL from query parameters or default to search.html for already logged in users
    const returnUrl = urlParams.get('returnUrl') || 'search.html';
    
    window.location.href = returnUrl;
}