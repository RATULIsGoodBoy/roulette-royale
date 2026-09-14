// 3D Renderer Module for BLACK ROOM
import * as THREE from 'three';
import { events } from './events.js';

export class Renderer3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.players = [];
    this.table = null;
    this.revolver = null;
    this.cards = [];
    this.shells = [];
    this.particles = [];
    this.clock = new THREE.Clock();
    this.isInitialized = false;
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.FogExp2(0x050505, 0.02);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Add canvas to DOM
    const container = document.querySelector('.table-grid');
    if (container) {
      container.appendChild(this.renderer.domElement);
      this.renderer.domElement.style.position = 'absolute';
      this.renderer.domElement.style.top = '0';
      this.renderer.domElement.style.left = '0';
      this.renderer.domElement.style.zIndex = '1';
    }

    // Setup lighting
    this.setupLighting();

    // Create environment
    this.createTable();
    this.createRevolver();
    this.createFloor();

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // Start animation loop
    this.animate();

    this.isInitialized = true;
    events.emit('RENDERER_READY');
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Main spotlight (overhead)
    const spotLight = new THREE.SpotLight(0xff003c, 2);
    spotLight.position.set(0, 15, 0);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.5;
    spotLight.decay = 2;
    spotLight.distance = 50;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    this.scene.add(spotLight);

    // Rim lights for drama
    const rimLight1 = new THREE.PointLight(0x00f0ff, 1, 20);
    rimLight1.position.set(-10, 5, -10);
    this.scene.add(rimLight1);

    const rimLight2 = new THREE.PointLight(0x00ff41, 0.5, 20);
    rimLight2.position.set(10, 5, -10);
    this.scene.add(rimLight2);

    // Flickering light effect
    this.flickerLight = new THREE.PointLight(0xffaa00, 0.3, 15);
    this.flickerLight.position.set(0, 3, 0);
    this.scene.add(this.flickerLight);
  }

  createTable() {
    // Circular poker table
    const tableGeometry = new THREE.CylinderGeometry(6, 6, 0.3, 64);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7,
      metalness: 0.3,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
    this.table = new THREE.Mesh(tableGeometry, tableMaterial);
    this.table.position.y = -0.5;
    this.table.receiveShadow = true;
    this.scene.add(this.table);

    // Table edge (felt)
    const edgeGeometry = new THREE.TorusGeometry(6, 0.3, 16, 64);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a0a0a,
      roughness: 0.9,
      metalness: 0.1
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = -0.35;
    edge.receiveShadow = true;
    this.scene.add(edge);

    // Glowing ring on table
    const ringGeometry = new THREE.RingGeometry(5.5, 5.7, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff003c,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = -0.34;
    this.scene.add(glowRing);

    // Animate glow
    this.glowRing = glowRing;
  }

  createRevolver() {
    // Simplified revolver model using primitives
    this.revolver = new THREE.Group();

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.6;
    barrel.position.y = 0.3;
    barrel.castShadow = true;
    this.revolver.add(barrel);

    // Cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
    const cylinder = new THREE.Mesh(cylinderGeometry, barrelMaterial);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.z = 0;
    cylinder.position.y = 0.3;
    cylinder.castShadow = true;
    this.revolver.add(cylinder);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.3, 0.6, 0.25);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.6,
      metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    handle.position.z = -0.3;
    handle.castShadow = true;
    this.revolver.add(handle);

    // Trigger guard
    const guardGeometry = new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.9
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.rotation.x = Math.PI / 2;
    guard.rotation.y = Math.PI / 2;
    guard.position.set(0, -0.1, 0.3);
    this.revolver.add(guard);

    this.revolver.position.y = 0.5;
    this.revolver.castShadow = true;
    this.scene.add(this.revolver);

    // Muzzle flash light
    this.muzzleFlash = new THREE.PointLight(0xffffaa, 0, 10);
    this.muzzleFlash.position.set(0, 0.3, 1.5);
    this.scene.add(this.muzzleFlash);
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  createPlayer(position, index, totalPlayers) {
    // Calculate position around the table
    const angle = (index / totalPlayers) * Math.PI * 2 - Math.PI / 2;
    const radius = 7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const playerGroup = new THREE.Group();
    playerGroup.position.set(x, 0, z);
    playerGroup.lookAt(0, 0, 0);

    // Player base (holographic platform)
    const baseGeometry = new THREE.CylinderGeometry(0.8, 0.9, 0.1, 16);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    playerGroup.add(base);

    // Player indicator (floating orb)
    const orbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 1.2;
    orb.castShadow = true;
    playerGroup.add(orb);

    // HP indicators (small spheres around orb)
    const hpGroup = new THREE.Group();
    hpGroup.position.y = 1.2;
    for (let i = 0; i < 3; i++) {
      const hpGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const hpMat = new THREE.MeshStandardMaterial({
        color: 0xff003c,
        emissive: 0xff003c,
        emissiveIntensity: 0.8
      });
      const hpSphere = new THREE.Mesh(hpGeom, hpMat);
      hpSphere.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.5, 0, Math.sin(i * Math.PI * 2 / 3) * 0.5);
      hpGroup.add(hpSphere);
    }
    playerGroup.add(hpGroup);

    // Cards holder
    const cardsGroup = new THREE.Group();
    cardsGroup.position.set(0, 0.5, 0.5);
    playerGroup.add(cardsGroup);

    // Name label (using sprite)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'Bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`PLAYER ${index + 1}`, 128, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    const label = new THREE.Sprite(labelMaterial);
    label.position.y = 2.5;
    label.scale.set(3, 0.75, 1);
    playerGroup.add(label);

    this.scene.add(playerGroup);

    return {
      mesh: playerGroup,
      orb: orb,
      hpGroup: hpGroup,
      cardsGroup: cardsGroup,
      base: base,
      label: label,
      hpSpheres: hpGroup.children
    };
  }

  updatePlayers(playerData) {
    // Clear existing players
    this.players.forEach(p => this.scene.remove(p.mesh));
    this.players = [];

    // Create new players
    playerData.forEach((player, index) => {
      const playerObj = this.createPlayer(null, index, playerData.length);
      playerObj.data = player;
      
      // Update appearance based on state
      this.updatePlayerState(playerObj, player);
      
      this.players.push(playerObj);
    });
  }

  updatePlayerState(playerObj, playerData) {
    if (!playerObj) return;

    // Update HP
    const maxHp = playerData.maxHp || 3;
    playerObj.hpSpheres.forEach((sphere, i) => {
      sphere.visible = i < playerData.hp;
      sphere.material.emissiveIntensity = playerData.hp <= 1 ? 1.5 : 0.8;
    });

    // Update elimination state
    if (playerData.eliminated) {
      playerObj.orb.material.color.setHex(0x333333);
      playerObj.orb.material.emissive.setHex(0x000000);
      playerObj.base.material.opacity = 0.1;
    } else {
      playerObj.orb.material.color.setHex(0x00f0ff);
      playerObj.orb.material.emissive.setHex(0x00f0ff);
      playerObj.base.material.opacity = 0.3;
    }

    // Active player highlight
    if (playerData.isActive) {
      playerObj.orb.scale.setScalar(1.3);
      playerObj.base.material.opacity = 0.6;
    } else {
      playerObj.orb.scale.setScalar(1);
    }

    // Update cards
    this.updateCards(playerObj, playerData.cards || []);
  }

  updateCards(playerObj, cards) {
    // Clear existing cards
    while(playerObj.cardsGroup.children.length > 0) {
      playerObj.cardsGroup.remove(playerObj.cardsGroup.children[0]);
    }

    // Create card meshes
    cards.forEach((card, index) => {
      const cardGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.6);
      const cardMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.5,
        metalness: 0.1
      });
      const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
      cardMesh.position.set(
        (index - cards.length / 2) * 0.45,
        0.1 + index * 0.05,
        0
      );
      cardMesh.rotation.x = -Math.PI / 8;
      cardMesh.castShadow = true;
      playerObj.cardsGroup.add(cardMesh);
    });
  }

  animateRevolver(isFiring) {
    if (!this.revolver) return;

    if (isFiring) {
      // Recoil animation
      const startTime = Date.now();
      const recoil = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < 0.2) {
          this.revolver.position.z = Math.sin(elapsed * Math.PI * 5) * 0.3;
          this.revolver.rotation.x = Math.sin(elapsed * Math.PI * 5) * 0.2;
          requestAnimationFrame(recoil);
        } else {
          this.revolver.position.z = 0;
          this.revolver.rotation.x = 0;
        }
      };
      recoil();

      // Muzzle flash
      this.muzzleFlash.intensity = 5;
      setTimeout(() => {
        this.muzzleFlash.intensity = 0;
      }, 50);
    }
  }

  createBloodParticles(position, intensity = 1) {
    const particleCount = Math.floor(intensity * 50);
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
      positions.push(position.x, position.y, position.z);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      velocities.push(
        Math.cos(angle) * speed,
        Math.random() * 3 + 2,
        Math.sin(angle) * speed
      );

      colors.push(1, 0, 0); // Red blood
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    this.particles.push({
      mesh: particles,
      velocities: velocities,
      age: 0,
      maxAge: 2
    });
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.age += delta;

      if (particle.age >= particle.maxAge) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const positions = particle.mesh.geometry.attributes.position.array;
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += particle.velocities[j * 3] * delta;
        positions[j * 3 + 1] += particle.velocities[j * 3 + 1] * delta;
        positions[j * 3 + 2] += particle.velocities[j * 3 + 2] * delta;
        
        // Gravity
        particle.velocities[j * 3 + 1] -= 9.8 * delta;
      }
      particle.mesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Animate revolver idle
    if (this.revolver) {
      this.revolver.rotation.y = Math.sin(time * 0.5) * 0.1;
      this.revolver.position.y = 0.5 + Math.sin(time * 2) * 0.02;
    }

    // Animate glow ring
    if (this.glowRing) {
      this.glowRing.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
    }

    // Animate flicker light
    if (this.flickerLight) {
      this.flickerLight.intensity = 0.3 + Math.sin(time * 10) * 0.1 + Math.random() * 0.1;
    }

    // Animate player orbs
    this.players.forEach((player, index) => {
      if (!player.orb) return;
      player.orb.position.y = 1.2 + Math.sin(time * 2 + index) * 0.1;
      
      // Rotate base
      if (player.base) {
        player.base.rotation.y += delta * 0.5;
      }
    });

    // Update particles
    this.updateParticles(delta);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setCameraAngle(angle) {
    const radius = 12;
    this.camera.position.x = Math.cos(angle) * radius;
    this.camera.position.z = Math.sin(angle) * radius;
    this.camera.lookAt(0, 0, 0);
  }

  shakeCamera(intensity = 0.1) {
    const originalPos = this.camera.position.clone();
    const startTime = Date.now();
    
    const shake = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        this.camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
        this.camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
        this.camera.position.z = originalPos.z + (Math.random() - 0.5) * intensity;
        requestAnimationFrame(shake);
      } else {
        this.camera.position.copy(originalPos);
      }
    };
    shake();
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.isInitialized = false;
  }
}

export const renderer3D = new Renderer3D();
