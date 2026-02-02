// Estado de la aplicación
const appState = {
    user: null,
    stars: 0,
    trialPhotos: 5,
    generatedImages: [],
    currentImage: null,
    currentCarouselIndex: 0
};

// Datos iniciales para usuarios demo
const demoUsers = [
    { email: "demo@example.com", password: "demo123", name: "Usuario Demo", stars: 25, trialPhotos: 5, generations: 3, joined: "2023-10-15" }
];

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay usuario en localStorage
    const savedUser = localStorage.getItem('designIAUser');
    if (savedUser) {
        appState.user = JSON.parse(savedUser);
        appState.stars = appState.user.stars;
        appState.trialPhotos = appState.user.trialPhotos;
        updateUIAfterLogin();
        showSection('dashboardSection');
    }

    // Configurar event listeners
    setupEventListeners();
    updateStarsDisplay();
});

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

// Funciones de navegación
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección solicitada
    document.getElementById(sectionId).classList.add('active');
}

function updateNavActive(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

// Funciones de autenticación
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'flex';
}

function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    // Verificar usuario demo
    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Iniciar sesión exitosamente
        appState.user = { ...user };
        appState.stars = user.stars;
        appState.trialPhotos = user.trialPhotos;
        
        // Guardar en localStorage
        localStorage.setItem('designIAUser', JSON.stringify(appState.user));
        
        updateUIAfterLogin();
        showSection('dashboardSection');
        updateNavActive(document.querySelector('.nav-item[data-section="dashboard"]'));
        showAlert('¡Inicio de sesión exitoso!', 'success');
    } else {
        // Si no es usuario demo, verificar en localStorage
        const savedUser = localStorage.getItem('designIAUser');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.email === email && parsedUser.password === password) {
                appState.user = parsedUser;
                appState.stars = parsedUser.stars;
                appState.trialPhotos = parsedUser.trialPhotos;
                
                updateUIAfterLogin();
                showSection('dashboardSection');
                updateNavActive(document.querySelector('.nav-item[data-section="dashboard"]'));
                showAlert('¡Inicio de sesión exitoso!', 'success');
                return;
            }
        }
        
        // Credenciales incorrectas
        showAlert('Correo o contraseña incorrectos', 'warning');
    }
}

function handleRegister() {
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
    
    // Verificar si el usuario ya existe
    const userExists = demoUsers.some(u => u.email === email) || localStorage.getItem('designIAUser');
    
    if (userExists) {
        showAlert('Ya existe un usuario con este correo', 'warning');
        return;
    }
    
    // Crear nuevo usuario
    const newUser = {
        email,
        password,
        name,
        stars: 0,
        trialPhotos: 5,
        generations: 0,
        joined: new Date().toISOString().split('T')[0]
    };
    
    appState.user = newUser;
    appState.stars = 0;
    appState.trialPhotos = 5;
    
    // Guardar en localStorage
    localStorage.setItem('designIAUser', JSON.stringify(newUser));
    
    updateUIAfterLogin();
    showSection('dashboardSection');
    updateNavActive(document.querySelector('.nav-item[data-section="dashboard"]'));
    showAlert('¡Registro exitoso! Tienes 5 fotos de prueba para comenzar.', 'success');
    
    // Volver al formulario de login
    showLoginForm();
}

function updateUIAfterLogin() {
    // Actualizar avatar y nombre
    const userInitial = appState.user.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').innerHTML = `<span>${userInitial}</span>`;
    document.getElementById('profileAvatar').textContent = userInitial;
    document.getElementById('profileName').textContent = appState.user.name;
    document.getElementById('profileEmail').textContent = appState.user.email;
    document.getElementById('memberSince').textContent = appState.user.joined;
    
    // Actualizar estadísticas
    document.getElementById('totalStars').textContent = appState.stars;
    document.getElementById('totalGenerations').textContent = appState.user.generations || 0;
    document.getElementById('trialPhotos').textContent = appState.trialPhotos;
    document.getElementById('totalSpent').textContent = (appState.user.totalSpent || 0);
    
    // Ocultar sección de autenticación
    document.getElementById('authSection').classList.remove('active');
    
    // Mostrar navegación y dashboard
    document.getElementById('dashboardSection').classList.add('active');
    
    // Actualizar display de estrellas
    updateStarsDisplay();
}

// Funciones de imagen
function handleImageUpload() {
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
    
    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        
        previewImage.src = e.target.result;
        preview.style.display = 'block';
        appState.currentImage = e.target.result;
        
        // Scroll a la vista previa
        preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    reader.readAsDataURL(file);
}

// Funciones de generación
function updateGenerationCost() {
    const photosCount = parseInt(document.getElementById('photosRange').value);
    const cost = photosCount * 10; // 10 estrellas por foto
    document.getElementById('generationCost').textContent = cost;
}

function handleGenerate() {
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

function confirmGeneration() {
    const photosCount = parseInt(document.getElementById('photosRange').value);
    const cost = photosCount * 10;
    
    // Determinar si usa fotos de prueba o estrellas
    let usingTrial = false;
    
    if (appState.trialPhotos >= photosCount) {
        // Usar fotos de prueba
        appState.trialPhotos -= photosCount;
        usingTrial = true;
    } else {
        // Usar estrellas
        appState.stars -= cost;
        if (!appState.user.totalSpent) appState.user.totalSpent = 0;
        appState.user.totalSpent += cost;
    }
    
    // Actualizar usuario en localStorage
    appState.user.stars = appState.stars;
    appState.user.trialPhotos = appState.trialPhotos;
    localStorage.setItem('designIAUser', JSON.stringify(appState.user));
    
    // Actualizar UI
    updateStarsDisplay();
    document.getElementById('trialPhotos').textContent = appState.trialPhotos;
    document.getElementById('totalStars').textContent = appState.stars;
    document.getElementById('totalSpent').textContent = appState.user.totalSpent || 0;
    
    // Generar imágenes simuladas
    generateImages(photosCount);
    
    // Cerrar modal
    closeModal();
    
    // Mostrar mensaje
    const message = usingTrial 
        ? `Has usado ${photosCount} de tus fotos de prueba. Te quedan ${appState.trialPhotos}.`
        : `Generación exitosa. Se han descontado ${cost} estrellas.`;
    
    showAlert(message, 'success');
}

function generateImages(count) {
    // Simular generación de imágenes con IA
    appState.generatedImages = [];
    
    // Crear URLs de imágenes de ejemplo (simuladas)
    for (let i = 0; i < count; i++) {
        // En un caso real, aquí se llamaría a la API de Replicate
        // Por ahora usamos imágenes de placeholder
        const imageUrl = `https://picsum.photos/seed/${Date.now() + i}/800/600`;
        appState.generatedImages.push(imageUrl);
    }
    
    // Actualizar contador de generaciones
    if (!appState.user.generations) appState.user.generations = 0;
    appState.user.generations += count;
    localStorage.setItem('designIAUser', JSON.stringify(appState.user));
    
    // Mostrar resultados
    displayGeneratedImages();
    showSection('resultsSection');
    updateNavActive(document.querySelector('.nav-item[data-section="results"]'));
    
    // Actualizar perfil
    document.getElementById('totalGenerations').textContent = appState.user.generations;
}

function displayGeneratedImages() {
    const resultsEmpty = document.getElementById('resultsEmpty');
    const resultsCarousel = document.getElementById('resultsCarousel');
    const resultsActions = document.getElementById('resultsActions');
    const carouselSlides = document.getElementById('carouselSlides');
    const carouselIndicators = document.getElementById('carouselIndicators');
    
    if (appState.generatedImages.length === 0) {
        resultsEmpty.style.display = 'block';
        resultsCarousel.style.display = 'none';
        resultsActions.style.display = 'none';
        return;
    }
    
    resultsEmpty.style.display = 'none';
    resultsCarousel.style.display = 'block';
    resultsActions.style.display = 'flex';
    
    // Limpiar carrusel
    carouselSlides.innerHTML = '';
    carouselIndicators.innerHTML = '';
    
    // Agregar imágenes al carrusel
    appState.generatedImages.forEach((imageUrl, index) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.innerHTML = `
            <img src="${imageUrl}" alt="Diseño generado ${index + 1}" class="generated-image">
            <p style="margin-top: 15px;">Diseño ${index + 1} de ${appState.generatedImages.length}</p>
        `;
        carouselSlides.appendChild(slide);
        
        // Agregar indicador
        const indicator = document.createElement('div');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.dataset.index = index;
        indicator.addEventListener('click', () => showImage(index));
        carouselIndicators.appendChild(indicator);
    });
    
    // Reiniciar índice
    appState.currentCarouselIndex = 0;
    updateCarousel();
}

// Funciones del carrusel
function showPrevImage() {
    appState.currentCarouselIndex = (appState.currentCarouselIndex - 1 + appState.generatedImages.length) % appState.generatedImages.length;
    updateCarousel();
}

function showNextImage() {
    appState.currentCarouselIndex = (appState.currentCarouselIndex + 1) % appState.generatedImages.length;
    updateCarousel();
}

function showImage(index) {
    appState.currentCarouselIndex = index;
    updateCarousel();
}

function updateCarousel() {
    const carouselSlides = document.getElementById('carouselSlides');
    const indicators = document.querySelectorAll('.indicator');
    
    // Mover carrusel
    carouselSlides.style.transform = `translateX(-${appState.currentCarouselIndex * 100}%)`;
    
    // Actualizar indicadores
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === appState.currentCarouselIndex);
    });
}

function downloadAllImages() {
    // En una implementación real, aquí se descargarían las imágenes
    // Por ahora simulamos la descarga
    showAlert('Las imágenes se están preparando para descargar...', 'success');
    
    // Simular descarga después de un breve retraso
    setTimeout(() => {
        showAlert('¡Todas las imágenes han sido descargadas!', 'success');
    }, 1500);
}

// Funciones de recarga
function updateSelectedPackage() {
    const selectedOption = document.querySelector('.recharge-option.selected');
    const stars = selectedOption.getAttribute('data-stars');
    const price = selectedOption.getAttribute('data-price');
    
    document.getElementById('selectedStars').textContent = stars;
    document.getElementById('selectedPrice').textContent = price;
}

function showRechargeModal() {
    const selectedOption = document.querySelector('.recharge-option.selected');
    const stars = selectedOption.getAttribute('data-stars');
    const price = selectedOption.getAttribute('data-price');
    
    document.getElementById('modalPackageStars').textContent = stars;
    document.getElementById('modalPackagePrice').textContent = price;
    document.getElementById('rechargeModal').classList.add('active');
}

function confirmRechargeRequest() {
    // En una implementación real, aquí se enviaría la solicitud al backend
    // Por ahora simulamos el proceso
    showAlert('Solicitud de recarga enviada. Por favor, realiza el pago y envía el comprobante para activar tus estrellas.', 'success');
    closeRechargeModal();
}

// Funciones de utilidad
function updateStarsDisplay() {
    document.getElementById('starsCount').textContent = appState.stars;
}

function showAlert(message, type) {
    // Crear alerta temporal
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Insertar al inicio del contenedor
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function closeModal() {
    document.getElementById('confirmationModal').classList.remove('active');
}

function closeRechargeModal() {
    document.getElementById('rechargeModal').classList.remove('active');
}

// Inicializar costos
updateGenerationCost();
updateSelectedPackage();