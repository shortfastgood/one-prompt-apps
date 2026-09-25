// Bootstrap: renderer, scene, input, plane-selection menu, main loop.

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

buildWorld(scene);
Game.init(scene, camera);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- input ----------
addEventListener("keydown", e => {
  if ([" ", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
  Game.keys[e.key.toLowerCase()] = true;
});
addEventListener("keyup", e => { Game.keys[e.key.toLowerCase()] = false; });

// ---------- plane selection menu ----------
function buildMenu() {
  const cards = document.getElementById("cards");
  PLANES.forEach((p, i) => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<h2>${p.name}</h2><div class="kind">${p.kind}</div>` +
      Object.entries(p.stats).map(([k, v]) =>
        `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${v * 20}%"></i></div></div>`
      ).join("");
    c.onclick = () => Game.startGame(i);
    cards.appendChild(c);
  });
}
buildMenu();

// ---------- main loop ----------
const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  Game.update(dt);
  Game.updateHud();

  // spin propellers of every live plane
  [Game.player, ...Game.enemies].forEach(p => {
    if (p && p.group.userData.propeller) p.group.userData.propeller.rotation.z += dt * 20;
  });

  renderer.render(scene, camera);
})();
