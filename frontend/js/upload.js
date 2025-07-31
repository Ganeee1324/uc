// Configuration
const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
let authToken = localStorage.getItem('authToken');
let selectedFiles = [];
let currentVetrine = [];

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// API call function using our existing backend logic
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error(data.msg || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    // Refresh the page to show login button
    window.location.reload();
}

// Load user's vetrine
async function loadVetrine() {
    try {
        const response = await makeRequest('/vetrine');
        const allVetrine = response.vetrine || [];
        
        if (allVetrine.length === 0) {
            document.getElementById('vetrinaSelect').innerHTML = '<option value="">No vetrine available - create one first</option>';
            showError('No vetrine found. You need to create a vetrina first before uploading files.');
            return;
        }
        
        currentVetrine = allVetrine;
        
        const select = document.getElementById('vetrinaSelect');
        select.innerHTML = '<option value="">Select a vetrina...</option>';
        
        currentVetrine.forEach(vetrina => {
            const option = document.createElement('option');
            option.value = vetrina.id;
            option.textContent = vetrina.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading vetrine:', error);
        showError('Failed to load vetrine. Please make sure you are logged in and vetrine exist.');
    }
}

// File handling
function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderFileList();
    updateUploadButton();
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="remove-btn" data-remove-index="${index}">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    updateUploadButton();
}

function updateUploadButton() {
    const uploadBtn = document.getElementById('uploadBtn');
    const vetrinaSelect = document.getElementById('vetrinaSelect');
    uploadBtn.disabled = selectedFiles.length === 0 || !vetrinaSelect.value;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Upload files using our existing backend logic
async function uploadFiles() {
    const vetrinaSelect = document.getElementById('vetrinaSelect');
    const tagSelect = document.getElementById('tagSelect');
    const vetrinaId = vetrinaSelect.value;
    const selectedTag = tagSelect.value;
    
    if (!vetrinaId || selectedFiles.length === 0) {
        showError('Please select a vetrina and files to upload');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="material-symbols-outlined spinning">refresh</span> Uploading...';

    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = '<h3>Upload Progress</h3>';

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <span>${file.name} ${selectedTag ? `(${selectedTag})` : ''}</span>
                <span class="status">Uploading...</span>
            `;
            statusDiv.appendChild(progressItem);

            const formData = new FormData();
            formData.append('file', file);
            
            // Add tag if selected
            if (selectedTag) {
                formData.append('tag', selectedTag);
            }

            // Use our existing backend endpoint pattern
            const response = await fetch(`${API_BASE}/vetrine/${vetrinaId}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            if (response.ok) {
                progressItem.querySelector('.status').textContent = 'Uploaded';
                progressItem.querySelector('.status').className = 'status success';
                showSuccess(`${file.name} uploaded successfully!`);
            } else {
                const error = await response.json();
                progressItem.querySelector('.status').textContent = `Error: ${error.msg}`;
                progressItem.querySelector('.status').className = 'status error';
                showError(`Failed to upload ${file.name}: ${error.msg}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            const progressItem = statusDiv.querySelector(`[data-file="${file.name}"]`);
            if (progressItem) {
                progressItem.querySelector('.status').textContent = 'Failed';
                progressItem.querySelector('.status').className = 'status error';
            }
            showError(`Failed to upload ${file.name}: ${error.message}`);
        }
    }

    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span class="material-symbols-outlined">upload</span> Upload Files';
    
    // Clear selected files
    selectedFiles = [];
    renderFileList();
    updateUploadButton();
}

function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        color: #dc2626;
        padding: 16px 24px;
        border-radius: 12px;
        border: 1px solid #fca5a5;
        box-shadow: 0 8px 32px rgba(220, 38, 38, 0.2);
        z-index: 10000;
        max-width: 400px;
        font-weight: 500;
        backdrop-filter: blur(10px);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.parentNode.removeChild(notification), 300);
        }
    }, 5000);
    
    console.error('Upload Error:', message);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
        padding: 16px 24px;
        border-radius: 12px;
        border: 1px solid #6ee7b7;
        box-shadow: 0 8px 32px rgba(6, 95, 70, 0.2);
        z-index: 10000;
        max-width: 400px;
        font-weight: 500;
        backdrop-filter: blur(10px);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.parentNode.removeChild(notification), 300);
        }
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    loadVetrine();

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const vetrinaSelect = document.getElementById('vetrinaSelect');

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Browse button
    browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Upload button
    uploadBtn.addEventListener('click', uploadFiles);

    // Vetrina selection
    vetrinaSelect.addEventListener('change', updateUploadButton);

    // Logout
    document.getElementById('userIcon').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });

    // Remove file event delegation
    document.getElementById('fileList').addEventListener('click', function(e) {
        if (e.target.closest('.remove-btn')) {
            const btn = e.target.closest('.remove-btn');
            const index = btn.getAttribute('data-remove-index');
            if (index !== null) {
                removeFile(Number(index));
            }
        }
    });
}); 