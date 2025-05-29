// Global değişkenler - basit sistem
let scene, camera, renderer;
let submarine, treasureChest, heldPearl = null; // Tekrar tek inci sistemi
let pearls = [], fish = [], corals = [];
let isNearTreasure = false, treasureOpened = false, pearlCount = 0;
let lightIntensity = 1.0;
let submarineSpotlight, ambientLight;

// Kontrol değişkenleri
const keys = {};
let mouseX = 0, mouseY = 0;
let mouseSensitivity = 0.003;
let isMouseLocked = false;
let submarineRotation = { x: 0, y: 0 };

// Event listeners
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('click', onMouseClick);
document.addEventListener('keydown', onKeyDown);
document.addEventListener('click', requestMouseLock);
document.addEventListener('pointerlockchange', onPointerLockChange);

function requestMouseLock() {
    if (!isMouseLocked) {
        document.body.requestPointerLock();
    }
}

function onPointerLockChange() {
    isMouseLocked = document.pointerLockElement === document.body;
}

function onMouseMove(event) {
    if (isMouseLocked) {
        submarineRotation.y -= event.movementX * mouseSensitivity;
        submarineRotation.x -= event.movementY * mouseSensitivity;
        submarineRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, submarineRotation.x));
    } else {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}

function onMouseClick(event) {
    if (!isMouseLocked) {
        requestMouseLock();
        return;
    }
    
    if (heldPearl) {
        heldPearl.position.copy(submarine.position);
        heldPearl.position.y -= 2;
        scene.add(heldPearl);
        heldPearl = null;
    } else {
        const nearbyPearl = findNearbyPearl();
        if (nearbyPearl) {
            scene.remove(nearbyPearl);
            heldPearl = nearbyPearl;
            pearlCount++;
            updateUI();
        }
    }
}

function onKeyDown(event) {
    switch(event.code) {
        case 'Digit1':
            lightIntensity = Math.max(0.2, lightIntensity - 0.2);
            updateLights();
            break;
        case 'Digit2':
            lightIntensity = Math.min(2.0, lightIntensity + 0.2);
            updateLights();
            break;
        case 'Digit3':
            mouseSensitivity = Math.max(0.001, mouseSensitivity - 0.001);
            break;
        case 'Digit4':
            mouseSensitivity = Math.min(0.01, mouseSensitivity + 0.001);
            break;
        case 'Space':
            if (isNearTreasure && !treasureOpened) {
                openTreasure();
            }
            break;
    }
}

// Three.js başlatma
function initGame() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x001133);
    
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    scene.fog = new THREE.Fog(0x004466, 20, 100);
    
    setupLighting();
    createGameObjects();
    
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 10, 0);
    
    animate();
}

// Işıklandırma
function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    submarineSpotlight = new THREE.SpotLight(0xffffff, 1, 30, Math.PI / 6, 0.5);
    submarineSpotlight.castShadow = true;
    scene.add(submarineSpotlight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
}

// Oyun objelerini oluştur
function createGameObjects() {
    submarine = createSubmarine();
    scene.add(submarine);
    
    treasureChest = createTreasureChest();
    scene.add(treasureChest);
    
    const seaFloor = createSeaFloor();
    scene.add(seaFloor);
    
    // Balıklar
    for (let i = 0; i < 25; i++) {
        const fishObj = createFish(
            (Math.random() - 0.5) * 120,
            Math.random() * 15 - 5,
            (Math.random() - 0.5) * 120
        );
        fish.push(fishObj);
        scene.add(fishObj);
    }
    
    // Mercanlar
    for (let i = 0; i < 40; i++) {
        const coral = createCoral(
            (Math.random() - 0.5) * 150,
            -10,
            (Math.random() - 0.5) * 150
        );
        corals.push(coral);
        scene.add(coral);
    }
    
    // Deniz yosunları
    for (let i = 0; i < 30; i++) {
        const seaweed = createSeaweed(
            (Math.random() - 0.5) * 140,
            -10,
            (Math.random() - 0.5) * 140
        );
        scene.add(seaweed);
    }
    
    // Kayalar
    for (let i = 0; i < 20; i++) {
        const rock = createRock(
            (Math.random() - 0.5) * 130,
            -9 + Math.random() * 2,
            (Math.random() - 0.5) * 130
        );
        scene.add(rock);
    }
    
    // İnciler
    for (let i = 0; i < 12; i++) {
        const pearl = createPearl(
            (Math.random() - 0.5) * 80,
            -8 + Math.random() * 3,
            (Math.random() - 0.5) * 80
        );
        pearls.push(pearl);
        scene.add(pearl);
    }
}

// Gelişmiş denizaltı oluşturma - düzgün yönlü
function createSubmarine() {
    const group = new THREE.Group();
    
    // Ana gövde - yatay konumda (ileri bakar)
    const bodyGeometry = new THREE.CapsuleGeometry(0.6, 4, 8, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444,
        shininess: 80,
        specular: 0x222222
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2; // Yatay hale getir
    body.castShadow = true;
    group.add(body);
    
    // Alt kısım (ballast tank)
    const ballastGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3.5);
    const ballastMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const ballast = new THREE.Mesh(ballastGeometry, ballastMaterial);
    ballast.rotation.z = Math.PI / 2;
    ballast.position.y = -0.3;
    ballast.castShadow = true;
    group.add(ballast);
    
    // Kule (conning tower)
    const towerGeometry = new THREE.BoxGeometry(1, 0.8, 0.8);
    const tower = new THREE.Mesh(towerGeometry, bodyMaterial);
    tower.position.y = 0.8;
    tower.castShadow = true;
    group.add(tower);
    
    // Pervane hub - arkada
    const propellerHub = new THREE.CylinderGeometry(0.15, 0.15, 0.3);
    const propHub = new THREE.Mesh(propellerHub, new THREE.MeshPhongMaterial({ color: 0x222222 }));
    propHub.position.x = -2.2; // X ekseninde arkada
    propHub.rotation.z = Math.PI / 2;
    group.add(propHub);
    
    // Pervane kanatları
    for (let i = 0; i < 4; i++) {
        const bladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.2);
        const blade = new THREE.Mesh(bladeGeometry, new THREE.MeshPhongMaterial({ color: 0x111111 }));
        blade.position.x = -2.2;
        blade.rotation.x = (i * Math.PI) / 2;
        group.add(blade);
    }
    
    // Cam pencere (önde)
    const windowGeometry = new THREE.SphereGeometry(0.4, 16, 12);
    const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x88ccff, 
        transparent: true, 
        opacity: 0.7,
        shininess: 100
    });
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.x = 1.5; // X ekseninde önde
    group.add(window);
    
    // Farlar (önde)
    const headlightGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.3);
    const headlightMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffaa,
        emissive: 0x444400
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(1.8, 0.3, 0.4);
    leftHeadlight.rotation.z = Math.PI / 2;
    group.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(1.8, 0.3, -0.4);
    rightHeadlight.rotation.z = Math.PI / 2;
    group.add(rightHeadlight);
    
    // Dümen (arkada)
    const rudderGeometry = new THREE.BoxGeometry(0.1, 1, 0.6);
    const rudder = new THREE.Mesh(rudderGeometry, bodyMaterial);
    rudder.position.x = -2;
    rudder.position.y = -0.2;
    group.add(rudder);
    
    group.position.set(0, 5, 0);
    return group;
}

// Gelişmiş hazine sandığı
function createTreasureChest() {
    const group = new THREE.Group();
    
    // Alt kısım (daha detaylı)
    const bottomGeometry = new THREE.BoxGeometry(2.5, 1.2, 1.8);
    const woodMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 20
    });
    const bottom = new THREE.Mesh(bottomGeometry, woodMaterial);
    bottom.castShadow = true;
    group.add(bottom);
    
    // Üst kapak
    const topGeometry = new THREE.BoxGeometry(2.5, 0.6, 1.8);
    const top = new THREE.Mesh(topGeometry, woodMaterial);
    top.position.y = 0.9;
    top.userData = { isLid: true };
    top.castShadow = true;
    group.add(top);
    
    // Metal bantlar (daha fazla)
    for (let i = -0.8; i <= 0.8; i += 0.4) {
        const bandGeometry = new THREE.BoxGeometry(2.6, 0.15, 0.1);
        const metalMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        const band = new THREE.Mesh(bandGeometry, metalMaterial);
        band.position.z = i;
        group.add(band);
    }
    
    // Metal köşe koruyucuları
    for (let x = -1.2; x <= 1.2; x += 2.4) {
        for (let z = -0.8; z <= 0.8; z += 1.6) {
            const cornerGeometry = new THREE.BoxGeometry(0.2, 1.8, 0.2);
            const corner = new THREE.Mesh(cornerGeometry, new THREE.MeshPhongMaterial({ color: 0x222222 }));
            corner.position.set(x, 0.3, z);
            group.add(corner);
        }
    }
    
    // Kilit
    const lockGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.2);
    const lockMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        shininess: 80
    });
    const lock = new THREE.Mesh(lockGeometry, lockMaterial);
    lock.position.set(1.3, 0.6, 0);
    group.add(lock);
    
    group.position.set(15, -8, 10);
    return group;
}

// Gelişmiş balık oluşturma
function createFish(x, y, z) {
    const group = new THREE.Group();
    const fishType = Math.floor(Math.random() * 3); // 3 farklı balık türü
    
    if (fishType === 0) {
        // Tropikal balık
        const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 8);
        bodyGeometry.scale(1.8, 1.2, 1);
        const colors = [0xff6b35, 0x4ecdc4, 0xffe66d, 0xff6b6b, 0xa8e6cf];
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            shininess: 80
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);
        
        // Çizgiler
        for (let i = 0; i < 3; i++) {
            const stripeGeometry = new THREE.RingGeometry(0.2 + i * 0.1, 0.25 + i * 0.1, 8);
            const stripeMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                transparent: true,
                opacity: 0.3
            });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.x = -0.3 + i * 0.3;
            stripe.rotation.y = Math.PI / 2;
            group.add(stripe);
        }
    } else if (fishType === 1) {
        // Büyük balık
        const bodyGeometry = new THREE.SphereGeometry(0.7, 12, 8);
        bodyGeometry.scale(2, 1, 1);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a90e2,
            shininess: 60
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);
    } else {
        // Küçük renkli balık
        const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        bodyGeometry.scale(1.5, 1, 1);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: Math.random() * 0xffffff,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);
    }
    
    // Kuyruk (daha detaylı)
    const tailGeometry = new THREE.ConeGeometry(0.4, 1, 6);
    const tailMaterial = new THREE.MeshPhongMaterial({ 
        color: group.children[0].material.color,
        shininess: 60
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -1.2;
    tail.rotation.z = Math.PI / 2;
    tail.castShadow = true;
    group.add(tail);
    
    // Yüzgeçler
    const finGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
    const finMaterial = new THREE.MeshPhongMaterial({ 
        color: group.children[0].material.color,
        transparent: true,
        opacity: 0.8
    });
    
    const topFin = new THREE.Mesh(finGeometry, finMaterial);
    topFin.position.set(0, 0.4, 0);
    topFin.rotation.x = Math.PI;
    group.add(topFin);
    
    const bottomFin = new THREE.Mesh(finGeometry, finMaterial);
    bottomFin.position.set(0, -0.4, 0);
    group.add(bottomFin);
    
    // Gözler
    const eyeGeometry = new THREE.SphereGeometry(0.1);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.6, 0.2, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.6, 0.2, -0.2);
    group.add(rightEye);
    
    group.position.set(x, y, z);
    group.userData = { 
        speed: 0.015 + Math.random() * 0.04,
        direction: Math.random() * Math.PI * 2,
        bobPhase: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
    };
    
    return group;
}

// Mercan oluşturma
function createCoral(x, y, z) {
    const group = new THREE.Group();
    const height = 1 + Math.random() * 3;
    const segments = Math.floor(3 + Math.random() * 5);
    
    for (let i = 0; i < segments; i++) {
        const segmentHeight = height / segments;
        const radius = 0.2 + Math.random() * 0.3;
        
        const geometry = new THREE.CylinderGeometry(
            radius * (1 - i / segments * 0.5),
            radius * (1 - (i + 1) / segments * 0.5),
            segmentHeight,
            6
        );
        
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7];
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)] 
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.position.y = i * segmentHeight + segmentHeight / 2;
        group.add(segment);
    }
    
    group.position.set(x, y, z);
    return group;
}

// Deniz yosunu
function createSeaweed(x, y, z) {
    const group = new THREE.Group();
    const height = 2 + Math.random() * 4;
    const segments = Math.floor(8 + Math.random() * 8);
    
    for (let i = 0; i < segments; i++) {
        const segmentHeight = height / segments;
        const radius = 0.1 + Math.random() * 0.05;
        
        const geometry = new THREE.CylinderGeometry(radius, radius * 0.8, segmentHeight, 6);
        const material = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.3)
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.position.y = i * segmentHeight + segmentHeight / 2;
        group.add(segment);
    }
    
    group.position.set(x, y, z);
    group.userData = { 
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.01
    };
    
    return group;
}

// Kaya
function createRock(x, y, z) {
    const geometry = new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6);
    const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.1, 0.3, 0.2 + Math.random() * 0.2)
    });
    const rock = new THREE.Mesh(geometry, material);
    rock.scale.y = 0.6 + Math.random() * 0.4;
    rock.position.set(x, y, z);
    return rock;
}

// Gelişmiş inci - halka kaldırıldı
function createPearl(x, y, z) {
    const group = new THREE.Group();
    
    // Ana inci
    const geometry = new THREE.SphereGeometry(0.25, 16, 12);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xfff8dc,
        shininess: 150,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.95
    });
    const pearl = new THREE.Mesh(geometry, material);
    pearl.castShadow = true;
    group.add(pearl);
    
    // İç parlaklık efekti
    const innerGeometry = new THREE.SphereGeometry(0.15, 12, 8);
    const innerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
    });
    const innerGlow = new THREE.Mesh(innerGeometry, innerMaterial);
    group.add(innerGlow);
    
    group.position.set(x, y, z);
    group.userData = {
        bobPhase: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
    };
    
    return group;
}

// Deniz tabanı (gelişmiş terrain)
function createSeaFloor() {
    const geometry = new THREE.PlaneGeometry(300, 300, 60, 60);
    
    // Terrain oluştur
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const z = vertices.getZ(i);
        
        // Perlin noise benzeri dalgalanma
        const height = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 2 +
                        Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1 +
                        Math.random() * 0.5;
                        
        vertices.setZ(i, height);
    }
    vertices.needsUpdate = true;
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ 
        color: 0x8b7355,
        transparent: true,
        opacity: 0.9
    });
    
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    floor.receiveShadow = true;
    
    return floor;
}

// Yardımcı fonksiyonlar
function updateLights() {
    if (submarineSpotlight) {
        submarineSpotlight.intensity = lightIntensity;
    }
    updateUI();
}

function findNearbyPearl() {
    for (let pearl of pearls) {
        if (scene.children.includes(pearl)) {
            const distance = submarine.position.distanceTo(pearl.position);
            if (distance < 3) {
                return pearl;
            }
        }
    }
    return null;
}

function openTreasure() {
    treasureOpened = true;
    const lid = treasureChest.children.find(child => child.userData.isLid);
    if (lid) {
        lid.rotation.x = -Math.PI / 3;
        lid.position.z = 0.5;
        lid.position.y = 1;
    }
    updateUI();
}

function updateUI() {
    document.getElementById('depth').textContent = Math.max(0, Math.floor((10 - submarine.position.y) * 2));
    document.getElementById('lightPower').textContent = Math.floor(lightIntensity * 50);
    document.getElementById('pearls').textContent = pearlCount;
    document.getElementById('treasureStatus').textContent = treasureOpened ? 'Açıldı!' : 'Kapalı';
}

// Ana oyun döngüsü
function animate() {
    requestAnimationFrame(animate);
    
    if (submarine) {
        const speed = 0.2;
        
        const yaw = submarine.rotation.y;
        const pitch = submarine.rotation.x;
        
        const forwardX = Math.sin(yaw) * Math.cos(pitch);
        const forwardZ = Math.cos(yaw) * Math.cos(pitch);
        const forwardY = Math.sin(pitch);
        
        const rightX = -Math.cos(yaw);
        const rightZ = Math.sin(yaw);
        
        if (keys['KeyW']) {
            submarine.position.x += forwardX * speed;
            submarine.position.z += forwardZ * speed;
            submarine.position.y += forwardY * speed;
        }
        if (keys['KeyS']) {
            submarine.position.x -= forwardX * speed;
            submarine.position.z -= forwardZ * speed;
            submarine.position.y -= forwardY * speed;
        }
        if (keys['KeyA']) {
            submarine.position.x -= rightX * speed;
            submarine.position.z -= rightZ * speed;
        }
        if (keys['KeyD']) {
            submarine.position.x += rightX * speed;
            submarine.position.z += rightZ * speed;
        }
        if (keys['KeyQ']) submarine.position.y += speed;
        if (keys['KeyE']) submarine.position.y -= speed;

        // Deniz tabanı collision detection
        const seaFloorLevel = -8; // Deniz tabanı + denizaltı yarıçapı
        if (submarine.position.y < seaFloorLevel) {
            submarine.position.y = seaFloorLevel;
        }

        // Deniz yüzeyi collision detection (opsiyonel)
        const seaSurfaceLevel = 20; // Deniz yüzeyi sınırı
        if (submarine.position.y > seaSurfaceLevel) {
            submarine.position.y = seaSurfaceLevel;
        }
        
        if (isMouseLocked) {
            submarine.rotation.y = submarineRotation.y;
            submarine.rotation.x = submarineRotation.x;
        } else {
            submarine.rotation.y = -mouseX * 0.5;
            submarine.rotation.x = mouseY * 0.3;
        }
        
        const cameraDistance = 10;
        const cameraHeight = 3;
        
        camera.position.x = submarine.position.x - cameraDistance * Math.sin(submarine.rotation.y) * Math.cos(submarine.rotation.x);
        camera.position.z = submarine.position.z - cameraDistance * Math.cos(submarine.rotation.y) * Math.cos(submarine.rotation.x);
        camera.position.y = submarine.position.y + cameraHeight - cameraDistance * Math.sin(submarine.rotation.x);
        
        camera.lookAt(submarine.position);
        
        if (submarineSpotlight) {
            submarineSpotlight.position.copy(submarine.position);
            submarineSpotlight.position.y += 1;
            
            // Spot ışığı denizaltının ileri yönüne ayarla
            submarineSpotlight.target.position.set(
                submarine.position.x + forwardX * 10,
                submarine.position.y + forwardY * 10,
                submarine.position.z + forwardZ * 10
            );
            submarineSpotlight.target.updateMatrixWorld();
        }
    }
    
    // Balık animasyonları
    fish.forEach(fishObj => {
        if (fishObj.userData) {
            fishObj.userData.bobPhase += 0.02;
            fishObj.position.y += Math.sin(fishObj.userData.bobPhase) * 0.01;
            
            fishObj.position.x += Math.cos(fishObj.userData.direction) * fishObj.userData.speed;
            fishObj.position.z += Math.sin(fishObj.userData.direction) * fishObj.userData.speed;
            
            fishObj.rotation.y = fishObj.userData.direction;
            
            if (Math.abs(fishObj.position.x) > 60 || Math.abs(fishObj.position.z) > 60) {
                fishObj.userData.direction += Math.PI;
            }
        }
    });
    
    // Deniz yosunu animasyonu
    scene.children.forEach(child => {
        if (child.userData && child.userData.swayPhase !== undefined) {
            child.userData.swayPhase += child.userData.swaySpeed;
            child.children.forEach((segment, index) => {
                segment.rotation.z = Math.sin(child.userData.swayPhase + index * 0.2) * 0.1;
            });
        }
    });
    
    // İnci animasyonu
    pearls.forEach(pearl => {
        if (pearl.userData && scene.children.includes(pearl)) {
            pearl.userData.bobPhase += 0.03;
            pearl.position.y += Math.sin(pearl.userData.bobPhase) * 0.02;
            pearl.rotation.y += pearl.userData.rotationSpeed;
        }
    });
    
    // Tutulan inci - basit sistem
    if (heldPearl && submarine) {
        heldPearl.position.copy(submarine.position);
        heldPearl.position.y -= 1;
        heldPearl.position.x += 2;
    }
    
    // Hazine etkileşimi
    if (submarine && treasureChest) {
        const distance = submarine.position.distanceTo(treasureChest.position);
        isNearTreasure = distance < 5;
        
        const interactionDiv = document.getElementById('interaction');
        if (isNearTreasure && !treasureOpened) {
            interactionDiv.style.display = 'block';
            document.getElementById('interactionText').textContent = 'Hazine Sandığını Açmak için Space\'e basın';
        } else if (!isNearTreasure) {
            // İnci mesafesi kontrolü yukarıda yapılıyor, sadece hazine yoksa gizle
            const hasNearbyPearl = pearls.some(pearl => {
                if (scene.children.includes(pearl)) {
                    return submarine.position.distanceTo(pearl.position) < 10;
                }
                return false;
            });
            
            if (!hasNearbyPearl) {
                interactionDiv.style.display = 'none';
            }
        }
    }
    
    updateUI();
    renderer.render(scene, camera);
}

// Pencere yeniden boyutlandırma
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Oyunu başlat
window.addEventListener('load', () => {
    if (typeof THREE !== 'undefined') {
        initGame();
    } else {
        document.body.innerHTML = '<div style="color:white; text-align:center; margin-top:100px;"><h1>Three.js Yüklenemedi</h1><p>İnternet bağlantınızı kontrol edin.</p></div>';
    }
});