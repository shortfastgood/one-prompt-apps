// World building (sky, terrain, clouds) and transient effects
// (explosions, smoke). All functions take the scene as a parameter so
// this file stays free of game-state knowledge.

function makeSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#1a6fd4");
  grad.addColorStop(0.5, "#87c5e8");
  grad.addColorStop(0.55, "#cfe8f5");
  grad.addColorStop(1, "#e8f4f8");
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  return new THREE.CanvasTexture(c);
}

function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#3e7d34";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = Math.random() < 0.5 ? "#4a8a3c" : "#356b2e";
    g.fillRect(Math.random() * 256, Math.random() * 256,
      20 + Math.random() * 40, 20 + Math.random() * 40);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(200, 200);
  return t;
}

function buildWorld(scene) {
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xcfe8f5, 2500, 9000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x446644, 0.9));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.8);
  sun.position.set(1, 1, 0.5);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40000, 40000),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // scattered low-detail mountains
  const rock = new THREE.MeshLambertMaterial({ color: 0x667766 });
  for (let i = 0; i < 25; i++) {
    const h = 300 + Math.random() * 600;
    const m = new THREE.Mesh(new THREE.ConeGeometry(400 + Math.random() * 800, h, 7), rock);
    m.position.set((Math.random() - 0.5) * 24000, h / 2, (Math.random() - 0.5) * 24000);
    scene.add(m);
  }

  // clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 30; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(60 + Math.random() * 100, 8, 6), cloudMat);
    c.position.set((Math.random() - 0.5) * 24000, 1800 + Math.random() * 2400,
      (Math.random() - 0.5) * 24000);
    scene.add(c);
  }
}

// A sphere that grows and fades out, then removes itself.
function boom(scene, pos, color, scale) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  m.position.copy(pos);
  m.scale.setScalar(scale);
  scene.add(m);
  setTimeout(() => scene.remove(m), 600);
}

// Smoke puff for damaged aircraft.
function smokePuff(scene, pos) {
  boom(scene, pos, 0x555555, 3 + Math.random() * 3);
}
