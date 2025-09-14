// Prairie Driving Game
class PrairieDrivingGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.vehicle = null;
        this.terrain = null;
        this.keys = {};
        this.clock = new THREE.Clock();
        this.vehiclePosition = new THREE.Vector3(0, 0.75, 0);
        this.vehicleRotation = 0;
        this.speed = 0;
        this.maxSpeed = 8.0; // Base maximum speed (significantly increased)
        this.maxDownhillSpeed = this.maxSpeed * 1.5; // 50% more when going downhill
        this.minUphillSpeed = this.maxSpeed * 0.75; // 25% less when going uphill
        this.terrainSize = 200;
        this.terrainResolution = 64;
        this.collisionObjects = []; // Store objects for collision detection
        this.damageLevel = 0; // 0=pristine, 1=minor, 2=major, 3=wrecked
        this.vehicleParts = {}; // Store references to vehicle parts for damage
        this.lastCollisionTime = 0; // Prevent multiple damage applications
        this.collisionCooldown = 2000; // 2 seconds between damage applications

        this.init();
    }

    // Calculate terrain slope at given position
    getTerrainSlope(x, z) {
        const sampleDistance = 1.0; // Distance to sample for slope calculation

        // Get height at current position and nearby positions
        const currentHeight = this.getTerrainHeight(x, z);
        const frontHeight = this.getTerrainHeight(x, z - sampleDistance);
        const backHeight = this.getTerrainHeight(x, z + sampleDistance);
        const leftHeight = this.getTerrainHeight(x - sampleDistance, z);
        const rightHeight = this.getTerrainHeight(x + sampleDistance, z);

        // Calculate slopes in both directions
        const slopeZ = (frontHeight - backHeight) / (2 * sampleDistance); // Forward/backward slope
        const slopeX = (rightHeight - leftHeight) / (2 * sampleDistance); // Left/right slope

        // Return the slope in the direction of movement
        const cos = Math.cos(this.vehicleRotation);
        const sin = Math.sin(this.vehicleRotation);

        // Project slope onto movement direction
        const movementSlope = slopeZ * cos + slopeX * sin;

        return movementSlope;
    }

    init() {
        this.setupScene();
        this.createTerrain();
        this.createVehicle();
        this.createEnvironment();
        this.setupLighting();
        this.setupControls();
        this.animate();

        // Hide loading screen
        document.getElementById('loading').style.display = 'none';
    }

    setupScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87ceeb, 100, 1000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 10, 20);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87ceeb);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // Removed physics setup - using simple position-based movement

    createTerrain() {
        const size = this.terrainSize;
        const resolution = this.terrainResolution;

        // Create visual terrain
        const geometry = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
        geometry.rotateX(-Math.PI / 2);

        // Store height data for collision detection
        this.heightData = [];

        // Modify vertices for hills and store height data
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const height = Math.sin(x * 0.05) * 3 + Math.cos(z * 0.03) * 2;
            vertices[i + 1] = height;

            // Store height data in a 2D array
            const gridX = Math.floor(((x + size / 2) / size) * (resolution - 1));
            const gridZ = Math.floor(((z + size / 2) / size) * (resolution - 1));
            if (!this.heightData[gridX]) this.heightData[gridX] = [];
            this.heightData[gridX][gridZ] = height;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });

        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);
    }

    getTerrainHeight(x, z) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(
            ((x + this.terrainSize / 2) / this.terrainSize) * (this.terrainResolution - 1)
        );
        const gridZ = Math.floor(
            ((z + this.terrainSize / 2) / this.terrainSize) * (this.terrainResolution - 1)
        );

        // Clamp to terrain bounds
        const clampedX = Math.max(0, Math.min(this.terrainResolution - 1, gridX));
        const clampedZ = Math.max(0, Math.min(this.terrainResolution - 1, gridZ));

        // Return height if data exists, otherwise calculate it
        if (this.heightData[clampedX] && this.heightData[clampedX][clampedZ] !== undefined) {
            return this.heightData[clampedX][clampedZ];
        }
        // Fallback calculation using the same formula as terrain generation
        return Math.sin(x * 0.05) * 3 + Math.cos(z * 0.03) * 2;
    }

    createVehicle() {
        // Main vehicle group
        this.vehicle = new THREE.Group();

        // Create realistic jeep body with open wheel wells
        const bodyGroup = new THREE.Group();

        // Main body center section
        const centerBodyGeometry = new THREE.BoxGeometry(2.4, 1.8, 6.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f2f });
        const centerBody = new THREE.Mesh(centerBodyGeometry, bodyMaterial);
        centerBody.position.set(0, 0.2, 0);
        centerBody.castShadow = true;
        bodyGroup.add(centerBody);

        // Side panels (between wheels)
        const sidePanelGeometry = new THREE.BoxGeometry(0.6, 1.8, 2.2);

        const leftSidePanel = new THREE.Mesh(sidePanelGeometry, bodyMaterial);
        leftSidePanel.position.set(-1.5, 0.2, 0);
        leftSidePanel.castShadow = true;
        bodyGroup.add(leftSidePanel);

        const rightSidePanel = new THREE.Mesh(sidePanelGeometry, bodyMaterial);
        rightSidePanel.position.set(1.5, 0.2, 0);
        rightSidePanel.castShadow = true;
        bodyGroup.add(rightSidePanel);

        this.vehicle.add(bodyGroup);
        this.vehicleParts.body = bodyGroup;

        // Create hood
        const hoodGeometry = new THREE.BoxGeometry(3.6, 0.3, 2.2); // Adjusted for reduced length
        const hoodMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f2f });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 1.05, -2.2); // Positioned at front (negative Z)
        hood.castShadow = true;
        this.vehicle.add(hood);
        this.vehicleParts.hood = hood;

        // Create front grille
        const grilleGeometry = new THREE.BoxGeometry(2.8, 1.2, 0.1); // Narrower grille
        const grilleMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(0, 0.3, -3.35); // Moved to actual front (negative Z is forward)
        grille.castShadow = true;
        this.vehicle.add(grille);
        this.vehicleParts.grille = grille;

        // Create headlights (at the front)
        const headlightGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
        const headlightMaterial = new THREE.MeshLambertMaterial({ color: 0xfffff0 });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.0, 0.6, -3.4); // At the front of the vehicle (negative Z)
        leftHeadlight.rotation.x = Math.PI / 2;
        leftHeadlight.castShadow = true;
        this.vehicle.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.0, 0.6, -3.4); // At the front of the vehicle (negative Z)
        rightHeadlight.rotation.x = Math.PI / 2;
        rightHeadlight.castShadow = true;
        this.vehicle.add(rightHeadlight);

        this.vehicleParts.headlights = [leftHeadlight, rightHeadlight];

        // Create realistic wheels with treads
        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const rimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.45, 16);
        const rimMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });

        const wheelPositions = [
            [-1.35, -0.7, -2.1], // front left (negative Z is forward)
            [1.35, -0.7, -2.1], // front right
            [-1.35, -0.7, 2.1], // rear left (positive Z is back)
            [1.35, -0.7, 2.1], // rear right
        ];

        this.vehicleParts.wheels = [];
        wheelPositions.forEach((pos, index) => {
            const wheelGroup = new THREE.Group();

            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheelGroup.add(wheel);

            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            wheelGroup.position.set(pos[0], pos[1], pos[2]);
            wheelGroup.castShadow = true;
            this.vehicleParts.wheels.push(wheelGroup);
            this.vehicle.add(wheelGroup);
        });

        // Create realistic doors with window frames (aligned with back of hood)
        const doorGeometry = new THREE.BoxGeometry(0.08, 1.4, 2.4); // Adjusted for reduced length
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f2f });

        const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        leftDoor.position.set(-1.84, 0.2, 0.0); // Front edge aligns with back of hood
        leftDoor.castShadow = true;
        this.vehicle.add(leftDoor);
        this.vehicleParts.leftDoor = leftDoor;

        const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        rightDoor.position.set(1.84, 0.2, 0.0); // Front edge aligns with back of hood
        rightDoor.castShadow = true;
        this.vehicle.add(rightDoor);
        this.vehicleParts.rightDoor = rightDoor;

        // Windshield frame will be the roll bars - removed separate frame

        // Create windshield (will be positioned within roll bars later)
        const windshieldGeometry = new THREE.PlaneGeometry(2.0, 1.2);
        const windshieldMaterial = new THREE.MeshLambertMaterial({
            color: 0xc0c0c0, // Light grey
            transparent: true,
            opacity: 0.7, // Higher opacity for better visibility
            side: THREE.DoubleSide, // Make sure it's visible from both sides
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 1.6, -1.2); // Positioned within roll bars
        windshield.rotation.x = -Math.PI / 12; // Slight angle
        windshield.castShadow = true;
        this.vehicle.add(windshield);
        this.vehicleParts.windshield = windshield;

        // Create windshield crack overlays (initially invisible)
        this.vehicleParts.windshieldCracks = [];

        // Single crack for damage level 1
        const singleCrackGeometry = new THREE.PlaneGeometry(2.0, 1.2);
        const singleCrackCanvas = document.createElement('canvas');
        singleCrackCanvas.width = 256;
        singleCrackCanvas.height = 256;
        const singleCrackCtx = singleCrackCanvas.getContext('2d');
        singleCrackCtx.strokeStyle = 'black';
        singleCrackCtx.lineWidth = 3;
        singleCrackCtx.beginPath();
        singleCrackCtx.moveTo(50, 128);
        singleCrackCtx.lineTo(80, 100);
        singleCrackCtx.lineTo(120, 110);
        singleCrackCtx.lineTo(150, 80);
        singleCrackCtx.lineTo(200, 90);
        singleCrackCtx.stroke();

        const singleCrackTexture = new THREE.CanvasTexture(singleCrackCanvas);
        const singleCrackMaterial = new THREE.MeshLambertMaterial({
            map: singleCrackTexture,
            transparent: true,
            opacity: 0,
        });
        const singleCrack = new THREE.Mesh(singleCrackGeometry, singleCrackMaterial);
        singleCrack.position.set(0, 1.6, -1.19);
        singleCrack.rotation.x = -Math.PI / 12;
        this.vehicle.add(singleCrack);
        this.vehicleParts.windshieldCracks.push(singleCrack);

        // Multiple cracks for damage level 2
        const multipleCrackCanvas = document.createElement('canvas');
        multipleCrackCanvas.width = 256;
        multipleCrackCanvas.height = 256;
        const multipleCrackCtx = multipleCrackCanvas.getContext('2d');
        multipleCrackCtx.strokeStyle = 'black';
        multipleCrackCtx.lineWidth = 2;

        // Draw multiple jagged cracks
        multipleCrackCtx.beginPath();
        multipleCrackCtx.moveTo(30, 100);
        multipleCrackCtx.lineTo(60, 80);
        multipleCrackCtx.lineTo(90, 90);
        multipleCrackCtx.lineTo(120, 70);
        multipleCrackCtx.lineTo(150, 75);
        multipleCrackCtx.stroke();

        multipleCrackCtx.beginPath();
        multipleCrackCtx.moveTo(70, 150);
        multipleCrackCtx.lineTo(100, 130);
        multipleCrackCtx.lineTo(130, 140);
        multipleCrackCtx.lineTo(160, 120);
        multipleCrackCtx.lineTo(190, 125);
        multipleCrackCtx.stroke();

        multipleCrackCtx.beginPath();
        multipleCrackCtx.moveTo(40, 200);
        multipleCrackCtx.lineTo(70, 180);
        multipleCrackCtx.lineTo(100, 190);
        multipleCrackCtx.lineTo(130, 170);
        multipleCrackCtx.stroke();

        const multipleCrackTexture = new THREE.CanvasTexture(multipleCrackCanvas);
        const multipleCrackMaterial = new THREE.MeshLambertMaterial({
            map: multipleCrackTexture,
            transparent: true,
            opacity: 0,
        });
        const multipleCracks = new THREE.Mesh(singleCrackGeometry, multipleCrackMaterial);
        multipleCracks.position.set(0, 1.6, -1.18);
        multipleCracks.rotation.x = -Math.PI / 12;
        this.vehicle.add(multipleCracks);
        this.vehicleParts.windshieldCracks.push(multipleCracks);

        // Create front bumper
        const bumperGeometry = new THREE.BoxGeometry(3.8, 0.3, 0.2);
        const bumperMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const frontBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        frontBumper.position.set(0, -0.5, -3.4); // At actual front (negative Z)
        frontBumper.castShadow = true;
        this.vehicle.add(frontBumper);
        this.vehicleParts.frontBumper = frontBumper;

        // Create rear bumper
        const rearBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        rearBumper.position.set(0, -0.5, 3.4); // At actual rear (positive Z)
        rearBumper.castShadow = true;
        this.vehicle.add(rearBumper);
        this.vehicleParts.rearBumper = rearBumper;

        // Create spare tire on back (at the rear)
        const spareGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 16);
        const spareMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
        const spareTire = new THREE.Mesh(spareGeometry, spareMaterial);
        spareTire.position.set(0, 0.2, 3.5); // At the back (positive Z)
        spareTire.rotation.x = Math.PI / 2;
        spareTire.castShadow = true;
        this.vehicle.add(spareTire);
        this.vehicleParts.spareTire = spareTire;

        // Create antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
        const antennaMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(-1.5, 1.6, -0.8); // Adjusted for reduced length
        antenna.castShadow = true;
        this.vehicle.add(antenna);
        this.vehicleParts.antenna = antenna;

        // Create windshield frame (using roll bars as frame structure)
        const frameBarGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });

        // Left windshield frame bar
        const leftFrameBar = new THREE.Mesh(frameBarGeometry, frameMaterial);
        leftFrameBar.position.set(-1.0, 1.4, -1.2); // Position for windshield frame
        leftFrameBar.castShadow = true;
        this.vehicle.add(leftFrameBar);

        // Right windshield frame bar
        const rightFrameBar = new THREE.Mesh(frameBarGeometry, frameMaterial);
        rightFrameBar.position.set(1.0, 1.4, -1.2); // Position for windshield frame
        rightFrameBar.castShadow = true;
        this.vehicle.add(rightFrameBar);

        // Top windshield frame bar
        const topFrameBarGeometry = new THREE.CylinderGeometry(0.06, 0.06, 2.0);
        const topFrameBar = new THREE.Mesh(topFrameBarGeometry, frameMaterial);
        topFrameBar.position.set(0, 2.2, -1.2);
        topFrameBar.rotation.z = Math.PI / 2;
        topFrameBar.castShadow = true;
        this.vehicle.add(topFrameBar);

        this.vehicleParts.windshieldFrame = [leftFrameBar, rightFrameBar, topFrameBar];

        // Create exhaust pipe
        const tailPipeGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8);
        const tailPipeMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const tailPipe = new THREE.Mesh(tailPipeGeometry, tailPipeMaterial);
        tailPipe.position.set(1.5, -0.4, -2.6); // Adjusted for reduced length
        tailPipe.rotation.z = Math.PI / 2;
        tailPipe.castShadow = true;
        this.vehicle.add(tailPipe);
        this.vehicleParts.tailPipe = tailPipe;

        this.vehicle.position.copy(this.vehiclePosition);
        this.scene.add(this.vehicle);
    }

    createEnvironment() {
        // Add rocks
        for (let i = 0; i < 20; i++) {
            const rockSize = Math.random() * 2 + 1;
            const rockGeometry = new THREE.DodecahedronGeometry(rockSize);
            const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);

            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;
            const terrainHeight = this.getTerrainHeight(x, z);

            rock.position.set(x, terrainHeight + 0.5, z);
            rock.castShadow = true;
            this.scene.add(rock);

            // Store collision data
            this.collisionObjects.push({
                position: { x: x, z: z },
                radius: rockSize + 0.5, // Add some buffer for collision
                type: 'rock',
            });
        }

        // Add logs
        for (let i = 0; i < 15; i++) {
            const logGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6);
            const logMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const log = new THREE.Mesh(logGeometry, logMaterial);

            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            const terrainHeight = this.getTerrainHeight(x, z);

            log.position.set(x, terrainHeight + 0.3, z);
            log.rotation.z = Math.random() * Math.PI;
            log.castShadow = true;
            this.scene.add(log);

            // Store collision data (logs are cylindrical, use radius of 3 for length)
            this.collisionObjects.push({
                position: { x: x, z: z },
                radius: 3.2, // Half the log length plus buffer
                type: 'log',
            });
        }

        // Add trees
        for (let i = 0; i < 30; i++) {
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

            const leavesGeometry = new THREE.SphereGeometry(2);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 3;

            const tree = new THREE.Group();
            tree.add(trunk);
            tree.add(leaves);

            const x = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 200;
            const terrainHeight = this.getTerrainHeight(x, z);

            tree.position.set(x, terrainHeight, z);
            tree.castShadow = true;
            this.scene.add(tree);

            // Store collision data (use leaves radius for collision)
            this.collisionObjects.push({
                position: { x: x, z: z },
                radius: 2.5, // Leaves radius plus buffer
                type: 'tree',
            });
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }

    setupControls() {
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            console.log('Key pressed:', event.code); // Debug
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Pointer lock for mouse look
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Remove mouse look for now - focus on vehicle movement first
        // document.addEventListener('mousemove', (event) => {
        //     if (document.pointerLockElement === document.body) {
        //         this.camera.rotation.y -= event.movementX * 0.002;
        //         this.camera.rotation.x -= event.movementY * 0.002;
        //         this.camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.camera.rotation.x));
        //     }
        // });
    }

    checkCollisions(newX, newZ) {
        const vehicleRadius = 2; // Vehicle collision radius

        for (const obj of this.collisionObjects) {
            const dx = newX - obj.position.x;
            const dz = newZ - obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < vehicleRadius + obj.radius) {
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    applyDamage() {
        if (this.damageLevel >= 3) return; // Already completely wrecked

        const currentTime = Date.now();
        if (currentTime - this.lastCollisionTime < this.collisionCooldown) {
            return; // Still in cooldown period
        }

        this.lastCollisionTime = currentTime;
        this.damageLevel++;
        this.updateVehicleVisuals();

        console.log(`Vehicle damage level: ${this.damageLevel}`);

        if (this.damageLevel >= 3) {
            this.gameOver();
        }
    }

    updateVehicleVisuals() {
        switch (this.damageLevel) {
            case 1: // Minor damage: bent antenna, single crack in windshield
                // Bend antenna
                if (this.vehicleParts.antenna) {
                    this.vehicleParts.antenna.rotation.z = Math.PI / 6; // 30 degree bend
                }
                // Show single crack in windshield
                if (this.vehicleParts.windshieldCracks?.[0]) {
                    this.vehicleParts.windshieldCracks[0].material.opacity = 1.0; // Show single crack
                }
                break;

            case 2: // Major damage: antenna removed, multiple cracks in windshield, left door falls off
                // Remove antenna
                if (this.vehicleParts.antenna) {
                    this.vehicle.remove(this.vehicleParts.antenna);
                    this.vehicleParts.antenna = null;
                }
                // Show multiple cracks in windshield
                if (this.vehicleParts.windshieldCracks?.[1]) {
                    this.vehicleParts.windshieldCracks[1].material.opacity = 1.0; // Show multiple cracks
                }
                // Remove left door
                if (this.vehicleParts.leftDoor) {
                    this.vehicle.remove(this.vehicleParts.leftDoor);
                    this.vehicleParts.leftDoor = null;
                }
                break;

            case 3: // Completely wrecked: windshield completely invisible
                // Make windshield completely invisible
                if (this.vehicleParts.windshield) {
                    this.vehicleParts.windshield.material.opacity = 0;
                }
                // Hide all crack overlays
                if (this.vehicleParts.windshieldCracks) {
                    for (const crack of this.vehicleParts.windshieldCracks) {
                        crack.material.opacity = 0;
                    }
                }
                // Remove right door
                if (this.vehicleParts.rightDoor) {
                    this.vehicle.remove(this.vehicleParts.rightDoor);
                    this.vehicleParts.rightDoor = null;
                }
                // Damage body color (need to handle body group)
                if (this.vehicleParts.body?.children) {
                    for (const part of this.vehicleParts.body.children) {
                        if (part.material) {
                            part.material.color.setHex(0x444444); // Dark gray
                        }
                    }
                }
                // Remove tail pipe
                if (this.vehicleParts.tailPipe) {
                    this.vehicle.remove(this.vehicleParts.tailPipe);
                    this.vehicleParts.tailPipe = null;
                }
                break;
        }
    }

    gameOver() {
        // Create game over overlay
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'gameOver';
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            font-size: 24px;
            z-index: 300;
        `;
        gameOverDiv.innerHTML = `
            <h2>VEHICLE DESTROYED!</h2>
            <p>Your jeep is completely wrecked and can no longer be driven.</p>
            <button onclick="location.reload()" style="
                padding: 10px 20px;
                font-size: 18px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">Restart Game</button>
        `;
        document.body.appendChild(gameOverDiv);
    }

    updateVehicle() {
        const deltaTime = this.clock.getDelta();

        // Simple movement controls
        let acceleration = 0;
        let turning = 0;

        if (this.keys.KeyW || this.keys.ArrowUp) {
            acceleration = 150;
            console.log('Moving forward');
        }
        if (this.keys.KeyS || this.keys.ArrowDown) {
            acceleration = -100;
            console.log('Moving backward');
        }
        if (this.keys.KeyA || this.keys.ArrowLeft) {
            turning = 2;
            console.log('Turning left');
        }
        if (this.keys.KeyD || this.keys.ArrowRight) {
            turning = -2;
            console.log('Turning right');
        }
        if (this.keys.Space) {
            this.speed *= 0.9; // Brake
            console.log('Braking');
        }

        // Update speed and rotation
        this.speed += acceleration * deltaTime;
        this.speed *= 0.98; // Reduced natural deceleration to maintain speed better
        this.vehicleRotation += turning * deltaTime;

        // Apply terrain-based speed modifications
        const terrainSlope = this.getTerrainSlope(this.vehiclePosition.x, this.vehiclePosition.z);
        const slopeEffect = terrainSlope * 30; // Amplify slope effect

        // Apply slope-based acceleration/deceleration
        this.speed += slopeEffect * deltaTime;

        // Apply speed limits based on terrain
        let currentMaxSpeed = this.maxSpeed;
        if (terrainSlope < -0.1) {
            // Going downhill (negative slope)
            currentMaxSpeed = this.maxDownhillSpeed;
        } else if (terrainSlope > 0.1) {
            // Going uphill (positive slope)
            currentMaxSpeed = this.minUphillSpeed;
        }

        // Clamp speed to current terrain-based limits
        if (this.speed > currentMaxSpeed) {
            this.speed = currentMaxSpeed;
        } else if (this.speed < -currentMaxSpeed * 0.7) {
            // Allow reverse but limited
            this.speed = -currentMaxSpeed * 0.7;
        }

        // Calculate movement (fix inverted controls)
        const moveX = -Math.sin(this.vehicleRotation) * this.speed * deltaTime;
        const moveZ = -Math.cos(this.vehicleRotation) * this.speed * deltaTime;

        // Calculate new position
        const newX = this.vehiclePosition.x + moveX;
        const newZ = this.vehiclePosition.z + moveZ;

        // Check for collisions before moving
        if (!this.checkCollisions(newX, newZ)) {
            // No collision, update position
            this.vehiclePosition.x = newX;
            this.vehiclePosition.z = newZ;
        } else {
            // Collision detected, stop the vehicle and apply damage
            this.speed *= 0.1; // Dramatically reduce speed on collision
            this.applyDamage();
        }

        // Get terrain height at vehicle position and add vehicle height offset
        const terrainHeight = this.getTerrainHeight(this.vehiclePosition.x, this.vehiclePosition.z);
        this.vehiclePosition.y = terrainHeight + 0.75; // Vehicle height above terrain

        // Update visual vehicle
        this.vehicle.position.copy(this.vehiclePosition);
        this.vehicle.rotation.y = this.vehicleRotation;

        // Update camera to follow vehicle
        this.camera.position.set(
            this.vehiclePosition.x,
            this.vehiclePosition.y + 10,
            this.vehiclePosition.z + 15
        );
        this.camera.lookAt(this.vehiclePosition);

        // Update speed display
        document.getElementById('speed').textContent = Math.round(Math.abs(this.speed) * 2);

        console.log(
            'Vehicle position:',
            this.vehiclePosition.x,
            this.vehiclePosition.y,
            this.vehiclePosition.z
        );
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update vehicle
        this.updateVehicle();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new PrairieDrivingGame();
});
