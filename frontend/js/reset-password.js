// API Configuration
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
}

// DOM Elements
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordResetForm = document.getElementById('passwordResetForm');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const passwordStrength = document.getElementById('passwordStrength');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');
const requirementsList = document.getElementById('requirementsList');
const resetForm = document.getElementById('resetForm');
const successState = document.getElementById('successState');
const toggleNewPassword = document.getElementById('toggleNewPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Password validation requirements
const passwordRequirements = {
    length: { regex: /.{8,}/, text: 'Almeno 8 caratteri' },
    uppercase: { regex: /[A-Z]/, text: 'Una maiuscola' },
    lowercase: { regex: /[a-z]/, text: 'Una minuscola' },
    number: { regex: /[0-9]/, text: 'Un numero' }
};

// Get reset token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token') || urlParams.get('reset_token');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check if reset token is present
    if (!resetToken) {
        showError('Link di reset non valido o scaduto. Richiedi un nuovo link di reset.');
        submitBtn.disabled = true;
        return;
    }

    // Verify token with backend (optional - for immediate validation)
    verifyResetToken();

    // Add event listeners
    setupEventListeners();
    
    // Focus first input
    newPasswordInput.focus();
});

async function verifyResetToken() {
    try {
        // This is optional - some systems verify the token immediately
        // For dev purposes, we'll assume the token is valid
        console.log('Reset token:', resetToken);
    } catch (error) {
        console.error('Token verification failed:', error);
        showError('Link di reset non valido o scaduto.');
        submitBtn.disabled = true;
    }
}

function setupEventListeners() {
    // Password input handlers
    newPasswordInput.addEventListener('input', handlePasswordInput);
    
    // Confirm password handler
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    
    // Password visibility toggles
    toggleNewPassword.addEventListener('click', () => togglePasswordVisibility('newPassword'));
    toggleConfirmPassword.addEventListener('click', () => togglePasswordVisibility('confirmPassword'));
    
    // Form submission
    passwordResetForm.addEventListener('submit', handleFormSubmission);
    
    // Hide error on input
    [newPasswordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', hideError);
    });
}

function handlePasswordInput() {
    const password = newPasswordInput.value;
    
    updatePasswordRequirements(password);
    validatePasswordMatch();
    updateSubmitButton();
}

// Password strength functions removed for compact UI

function updatePasswordRequirements(password) {
    Object.entries(passwordRequirements).forEach(([key, requirement]) => {
        const item = document.querySelector(`[data-requirement="${key}"]`);
        if (!item) return;
        
        const isValid = requirement.regex.test(password);
        
        item.classList.remove('valid', 'invalid');
        
        if (password.length > 0) {
            item.classList.add(isValid ? 'valid' : 'invalid');
        }
    });
}

function validatePasswordMatch() {
    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!confirmPassword) {
        confirmPasswordInput.classList.remove('error', 'valid');
        return true;
    }
    
    const matches = password === confirmPassword;
    
    if (matches) {
        confirmPasswordInput.classList.remove('error');
        confirmPasswordInput.classList.add('valid');
    } else {
        confirmPasswordInput.classList.add('error');
        confirmPasswordInput.classList.remove('valid');
    }
    
    updateSubmitButton();
    return matches;
}

function validatePassword(password) {
    const errors = [];
    
    Object.entries(passwordRequirements).forEach(([key, requirement]) => {
        if (!requirement.regex.test(password)) {
            errors.push(requirement.text);
        }
    });
    
    return errors;
}

function updateSubmitButton() {
    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    const passwordErrors = validatePassword(password);
    const passwordsMatch = password === confirmPassword;
    const hasConfirmPassword = confirmPassword.length > 0;
    
    const isValid = passwordErrors.length === 0 && passwordsMatch && hasConfirmPassword;
    
    submitBtn.disabled = !isValid;
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(`toggle${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`);
    const icon = toggle.querySelector('.material-symbols-outlined');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

async function handleFormSubmission(e) {
    e.preventDefault();
    
    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Final validation
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        showError('Password non valida: ' + passwordErrors.join(', '));
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Le password non coincidono');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        await updatePassword(password, resetToken);
    } catch (error) {
        console.error('Password reset failed:', error);
        showError('Errore durante l\'aggiornamento della password. Riprova.');
    } finally {
        setLoadingState(false);
    }
}

async function updatePassword(newPassword, token) {
    // FOR DEVELOPMENT: Simulate successful update
    if (token && token.includes('dev')) {
        console.log('DEV MODE: Simulating password update');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        showSuccessState();
        return;
    }
    
    try {
        const response = await fetch(API_BASE + '/reset-password/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessState();
        } else {
            throw new Error(data.msg || 'Errore durante l\'aggiornamento della password');
        }
    } catch (error) {
        console.error('Password update failed:', error);
        throw error;
    }
}

function setLoadingState(isLoading) {
    const btnContent = submitBtn.querySelector('.btn-content');
    const btnText = submitBtn.querySelector('.btn-text');
    
    if (isLoading) {
        submitBtn.disabled = true;
        btnContent.innerHTML = '<div class="loading-spinner"></div><span>Aggiornamento...</span>';
    } else {
        btnContent.innerHTML = '<span class="btn-text">Aggiorna Password</span>';
        updateSubmitButton(); // Re-enable based on validation
    }
}

function showSuccessState() {
    resetForm.style.display = 'none';
    successState.classList.add('show');
    
    // Hide footer
    document.querySelector('.reset-footer').style.display = 'none';
}

function showError(message) {
    // NOTIFICATIONS DISABLED - Function does nothing
    return;
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
    // Prevent going back if password was successfully reset
    if (successState.classList.contains('show')) {
        window.history.pushState(null, null, window.location.pathname);
    }
});

// Prevent form submission on Enter if button is disabled
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && submitBtn.disabled) {
        e.preventDefault();
    }
});

// Security: Clear form data when leaving page
window.addEventListener('beforeunload', function() {
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
});

// Security: Disable autocomplete and autofill
newPasswordInput.setAttribute('autocomplete', 'new-password');
confirmPasswordInput.setAttribute('autocomplete', 'new-password');

// Add paste event handling for security
[newPasswordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('paste', function(e) {
        // Allow paste but validate immediately
        setTimeout(() => {
            if (input === newPasswordInput) {
                handlePasswordInput();
            } else {
                validatePasswordMatch();
            }
        }, 0);
    });
});

console.log('Password reset page loaded successfully');