// Estado de la aplicación
const appState = {
    user: null,
    userData: null,
    stars: 0,
    trialPhotos: 5,
    generatedImages: [],
    currentImage: null,
    currentCarouselIndex: 0
};

// URL del backend (cambia esto cuando despliegues)
const API_URL = 'http://localhost:3000/api'; // Para desarrollo local
// const API_URL = 'https://tu-backend-en-render.onrender.com/api'; // Para producción

// Importar Firebase
import { 
    auth, 
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    collection
} from './firebase-config.js';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Verificar estado de autenticación
    checkAuthState();
    
    // Configurar event listeners
    setupEventListeners();
    updateStarsDisplay();
});

// Verificar estado de autenticación
function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuario está autenticado
            appState.user = user;
            
            // Obtener datos del usuario desde Firestore
            await loadUserData(user.uid);
            
            updateUIAfterLogin();
            showSection('dashboardSection');
            
            // Verificar token con el backend
            await verifyBackendToken();
        } else {
            // Usuario no autenticado
            appState.user = null;
            appState.userData = null;
            localStorage.removeItem('authToken');
            
            // Mostrar sección de autenticación
            showSection('authSection');
        }
    });
}

// Cargar datos del usuario desde Firestore
async function loadUserData(userId) {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            appState.userData = userDoc.data();
            appState.stars = appState.userData.stars || 0;
            appState.trialPhotos = appState.userData.trialPhotos || 5;
        } else {
            // Crear documento de usuario si no existe
            await createUserDocument(userId);
        }
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
    }
}

// Crear documento de usuario en Firestore
async function createUserDocument(userId) {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userData = {
            uid: userId,
            email: appState.user.email,
            name: appState.user.displayName || appState.user.email.split('@')[0],
            stars: 0,
            trialPhotos: 5,
            generations: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await setDoc(userDocRef, userData);
        appState.userData = userData;
        appState.stars = 0;
        appState.trialPhotos = 5;
    } catch (error) {
        console.error('Error creando documento de usuario:', error);
    }
}

// Configurar todos los event listeners
function setupEventListeners() {
    // Navegación
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section') + 'Section';
            showSection(sectionId);
            updateNavActive(this);
            if (window.innerWidth <= 768) {
                document.getElementById('navMenu').classList.remove('active');
            }
        });
    });

    // Login/Registro
    document.getElementById('switchToRegister').addEventListener('click', showRegisterForm);
    document.getElementById('switchToLogin').addEventListener('click', showLoginForm);
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);

    // Dashboard
    document.getElementById('uploadArea').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    
    // Arrastrar y soltar imagen
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            document.getElementById('imageInput').files = e.dataTransfer.files;
            handleImageUpload();
        }
    });

    document.getElementById('photosRange').addEventListener('input', function() {
        document.getElementById('photosValue').textContent = this.value;
        updateGenerationCost();
    });

    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // Resultados
    document.getElementById('goToDashboardBtn').addEventListener('click', () => {
        showSection('dashboardSection');
        updateNavActive(document.querySelector('.nav-item[data-section="dashboard"]'));
    });
    document.getElementById('carouselPrev').addEventListener('click', showPrevImage);
    document.getElementById('carouselNext').addEventListener('click', showNextImage);
    document.getElementById('downloadAllBtn').addEventListener('click', downloadAllImages);
    document.getElementById('generateMoreBtn').addEventListener('click', () => {
        showSection('dashboardSection');
        updateNavActive(document.querySelector('.nav-item[data-section="dashboard"]'));
    });

    // Recarga
    document.querySelectorAll('.recharge-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.recharge-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            updateSelectedPackage();
        });
    });

    document.getElementById('requestRechargeBtn').addEventListener('click', showRechargeModal);

    // Modales
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalConfirm').addEventListener('click', confirmGeneration);
    
    document.getElementById('rechargeModalClose').addEventListener('click', closeRechargeModal);
    document.getElementById('rechargeModalCancel').addEventListener('click', closeRechargeModal);
    document.getElementById('rechargeModalConfirm').addEventListener('click', confirmRechargeRequest);
}

// Funciones de autenticación actualizadas
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    try {
        // Iniciar sesión con Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Cargar datos del usuario
        await loadUserData(user.uid);
        
        showAlert('¡Inicio de sesión exitoso!', 'success');
    } catch (error) {
        console.error('Error en login:', error);
        
        let errorMessage = 'Error en el inicio de sesión';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuario no encontrado';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Usuario deshabilitado';
                break;
        }
        
        showAlert(errorMessage, 'warning');
    }
}

async function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'warning');
        return;
    }
    
    try {
        // Crear usuario en Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Actualizar perfil con nombre
        await updateProfile(user, {
            displayName: name
        });
        
        // Crear documento en Firestore
        await createUserDocument(user.uid);
        
        showAlert('¡Registro exitoso! Tienes 5 fotos de prueba para comenzar.', 'success');
        
        // Volver al formulario de login
        showLoginForm();
    } catch (error) {
        console.error('Error en registro:', error);
        
        let errorMessage = 'Error en el registro';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'El email ya está registrado';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido';
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña es demasiado débil';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Operación no permitida';
                break;
        }
        
        showAlert(errorMessage, 'warning');
    }
}

// Verificar token con el backend
async function verifyBackendToken() {
    try {
        if (!auth.currentUser) return;
        
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem('authToken', token);
        
        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.warn('No se pudo verificar token con el backend');
        }
    } catch (error) {
        console.error('Error verificando token:', error);
    }
}

// Función para obtener el token de autenticación
async function getAuthToken() {
    if (!auth.currentUser) {
        showAlert('Por favor, inicia sesión para continuar', 'warning');
        return null;
    }
    
    try {
        const token = await auth.currentUser.getIdToken();
        return token;
    } catch (error) {
        console.error('Error obteniendo token:', error);
        showAlert('Error de autenticación', 'warning');
        return null;
    }
}

// Funciones de generación actualizadas
async function handleGenerate() {
    // Verificar si hay imagen cargada
    if (!appState.currentImage) {
        showAlert('Por favor, sube una imagen de tu producto primero', 'warning');
        return;
    }
    
    const photosCount = parseInt(document.getElementById('photosRange').value);
    const cost = photosCount * 10;
    
    // Verificar si tiene suficientes estrellas o fotos de prueba
    let hasEnoughResources = false;
    let usingTrial = false;
    
    if (appState.trialPhotos >= photosCount) {
        hasEnoughResources = true;
        usingTrial = true;
    } else if (appState.stars >= cost) {
        hasEnoughResources = true;
        usingTrial = false;
    }
    
    if (!hasEnoughResources) {
        document.getElementById('starsWarning').style.display = 'flex';
        return;
    }
    
    // Mostrar modal de confirmación
    document.getElementById('confirmPhotos').textContent = photosCount;
    document.getElementById('confirmStars').textContent = cost;
    document.getElementById('confirmationModal').classList.add('active');
}

async function confirmGeneration() {
    const photosCount = parseInt(document.getElementById('photosRange').value);
    const cost = photosCount * 10;
    
    const style = document.getElementById('styleOption').value;
    const audience = document.getElementById('audienceOption').value;
    const size = document.getElementById('sizeOption').value;
    
    const token = await getAuthToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                imageUrl: appState.currentImage,
                style,
                audience,
                numPhotos: photosCount,
                size
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Actualizar estado local
            appState.generatedImages = data.images;
            
            if (data.usedTrial) {
                appState.trialPhotos -= photosCount;
                // Actualizar Firestore
                await updateDoc(doc(db, 'users', appState.user.uid), {
                    trialPhotos: appState.trialPhotos
                });
            } else {
                appState.stars -= cost;
                // Actualizar Firestore
                await updateDoc(doc(db, 'users', appState.user.uid), {
                    stars: appState.stars,
                    totalSpent: (appState.userData.totalSpent || 0) + cost
                });
            }
            
            // Actualizar UI
            updateStarsDisplay();
            document.getElementById('trialPhotos').textContent = appState.trialPhotos;
            document.getElementById('totalStars').textContent = appState.stars;
            document.getElementById('totalSpent').textContent = (appState.userData.totalSpent || 0) + (data.usedTrial ? 0 : cost);
            
            // Mostrar resultados
            displayGeneratedImages();
            showSection('resultsSection');
            updateNavActive(document.querySelector('.nav-item[data-section="results"]'));
            
            showAlert(data.message, 'success');
        } else {
            throw new Error(data.message || 'Error al generar diseños');
        }
    } catch (error) {
        showAlert(error.message, 'warning');
    } finally {
        closeModal();
    }
}

// Función para subir imagen al backend
async function handleImageUpload() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showAlert('Por favor, sube una imagen en formato JPG o PNG', 'warning');
        return;
    }
    
    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('La imagen es demasiado grande. Máximo 5MB.', 'warning');
        return;
    }
    
    const token = await getAuthToken();
    if (!token) return;
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_URL}/generate/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Mostrar vista previa
            const preview = document.getElementById('uploadPreview');
            const previewImage = document.getElementById('previewImage');
            
            previewImage.src = data.imageUrl;
            preview.style.display = 'block';
            appState.currentImage = data.imageUrl;
            
            // Scroll a la vista previa
            preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            throw new Error(data.message || 'Error al subir la imagen');
        }
    } catch (error) {
        showAlert(error.message, 'warning');
    }
}

// Función para solicitar recarga
async function confirmRechargeRequest() {
    const selectedOption = document.querySelector('.recharge-option.selected');
    const stars = parseInt(selectedOption.getAttribute('data-stars'));
    const price = parseFloat(selectedOption.getAttribute('data-price'));
    const paymentMethod = 'transfer'; // En una implementación real, esto vendría de un selector
    
    const token = await getAuthToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/users/recharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                stars: stars,
                paymentMethod: paymentMethod,
                amount: price
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Solicitud de recarga enviada. Un administrador la revisará en 24 horas.', 'success');
            closeRechargeModal();
        } else {
            throw new Error(data.message || 'Error al solicitar recarga');
        }
    } catch (error) {
        showAlert(error.message, 'warning');
    }
}

// Funciones de actualización de UI
function updateUIAfterLogin() {
    if (!appState.user || !appState.userData) return;
    
    // Actualizar avatar y nombre
    const userInitial = appState.userData.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').innerHTML = `<span>${userInitial}</span>`;
    document.getElementById('profileAvatar').textContent = userInitial;
    document.getElementById('profileName').textContent = appState.userData.name;
    document.getElementById('profileEmail').textContent = appState.userData.email;
    document.getElementById('memberSince').textContent = new Date(appState.userData.createdAt).toLocaleDateString();
    
    // Actualizar estadísticas
    document.getElementById('totalStars').textContent = appState.stars;
    document.getElementById('totalGenerations').textContent = appState.userData.generations || 0;
    document.getElementById('trialPhotos').textContent = appState.trialPhotos;
    document.getElementById('totalSpent').textContent = appState.userData.totalSpent || 0;
    
    // Ocultar sección de autenticación
    document.getElementById('authSection').classList.remove('active');
    
    // Mostrar navegación y dashboard
    document.getElementById('dashboardSection').classList.add('active');
    
    // Actualizar display de estrellas
    updateStarsDisplay();
}

// Resto de las funciones permanecen iguales...
// (las funciones de navegación, carrusel, etc. que no cambian)