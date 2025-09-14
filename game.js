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
        this.terrainSize = 200;
        this.terrainResolution = 64;
        this.collisionObjects = []; // Store objects for collision detection
        
        this.init();
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
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 10, 20);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
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
            const gridX = Math.floor((x + size/2) / size * (resolution - 1));
            const gridZ = Math.floor((z + size/2) / size * (resolution - 1));
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
        const gridX = Math.floor((x + this.terrainSize/2) / this.terrainSize * (this.terrainResolution - 1));
        const gridZ = Math.floor((z + this.terrainSize/2) / this.terrainSize * (this.terrainResolution - 1));
        
        // Clamp to terrain bounds
        const clampedX = Math.max(0, Math.min(this.terrainResolution - 1, gridX));
        const clampedZ = Math.max(0, Math.min(this.terrainResolution - 1, gridZ));
        
        // Return height if data exists, otherwise calculate it
        if (this.heightData[clampedX] && this.heightData[clampedX][clampedZ] !== undefined) {
            return this.heightData[clampedX][clampedZ];
        } else {
            // Fallback calculation using the same formula as terrain generation
            return Math.sin(x * 0.05) * 3 + Math.cos(z * 0.03) * 2;
        }
    }

    createVehicle() {
        // Create jeep body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const vehicleBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        vehicleBody.position.set(0, 3, 0); // Start closer to ground level
        vehicleBody.castShadow = true;
        
        // Create wheels
        const wheelGeometry = new THREE.CylinderGeometry(1, 1, 0.5, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const wheels = [];
        const wheelPositions = [
            [-1.5, -0.5, 1.2],  // front left
            [1.5, -0.5, 1.2],   // front right
            [-1.5, -0.5, -1.2], // rear left
            [1.5, -0.5, -1.2]   // rear right
        ];
        
        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.castShadow = true;
            wheels.push(wheel);
            vehicleBody.add(wheel);
        });

        this.vehicle = vehicleBody;
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
                type: 'rock'
            });
        }

        // Add logs
        for (let i = 0; i < 15; i++) {
            const logGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6);
            const logMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
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
                type: 'log'
            });
        }

        // Add trees
        for (let i = 0; i < 30; i++) {
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

            const leavesGeometry = new THREE.SphereGeometry(2);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
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
                type: 'tree'
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
        
        for (let obj of this.collisionObjects) {
            const dx = newX - obj.position.x;
            const dz = newZ - obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < (vehicleRadius + obj.radius)) {
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    updateVehicle() {
        const deltaTime = this.clock.getDelta();
        
        // Simple movement controls
        let acceleration = 0;
        let turning = 0;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            acceleration = 50;
            console.log('Moving forward');
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            acceleration = -35;
            console.log('Moving backward');
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            turning = 2;
            console.log('Turning left');
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            turning = -2;
            console.log('Turning right');
        }
        if (this.keys['Space']) {
            this.speed *= 0.9; // Brake
            console.log('Braking');
        }
        
        // Update speed and rotation
        this.speed += acceleration * deltaTime;
        this.speed *= 0.95; // Natural deceleration
        this.vehicleRotation += turning * deltaTime;
        
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
            // Collision detected, stop the vehicle
            this.speed *= 0.1; // Dramatically reduce speed on collision
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
        
        console.log('Vehicle position:', this.vehiclePosition.x, this.vehiclePosition.y, this.vehiclePosition.z);
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
