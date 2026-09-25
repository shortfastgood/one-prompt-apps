// Aircraft definitions and low-poly geometry builders.
// Every plane model is built with its nose along +Z, so velocity is
// always "local +Z" — see Game.forwardOf() in game.js.

const PLANES = [
  {
    id: "jet", name: "F-22 Raptor", kind: "Fighter Jet", color: 0x8a939e,
    maxSpeed: 260, minSpeed: 120, turn: 1.0, dmg: 12, armor: 3, fireRate: 0.15,
    stats: { Speed: 5, Firepower: 4, Armor: 3, Agility: 3 },
  },
  {
    id: "prop", name: "P-51 Mustang", kind: "Propeller Plane", color: 0xd94f30,
    maxSpeed: 150, minSpeed: 60, turn: 1.6, dmg: 8, armor: 2, fireRate: 0.20,
    stats: { Speed: 2, Firepower: 2, Armor: 2, Agility: 5 },
  },
  {
    id: "future", name: "V-42 Stormbird", kind: "Experimental Craft", color: 0x7d4dff,
    maxSpeed: 210, minSpeed: 90, turn: 1.2, dmg: 10, armor: 4, fireRate: 0.18,
    stats: { Speed: 4, Firepower: 3, Armor: 4, Agility: 4 },
  },
];

function buildPlane(def) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: def.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x22262b });
  const glass = new THREE.MeshLambertMaterial({ color: 0x18324a });

  if (def.id === "jet") {
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.7, 15, 12), body);
    fuselage.rotation.x = Math.PI / 2;

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4, 12), body);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 9.5;

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), glass);
    canopy.scale.set(1, 0.7, 1.8);
    canopy.position.set(0, 1.1, 3);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 3.5), body);
    wing.position.z = -0.5;

    const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 2), body);
    tail.position.set(0, 0.7, -7);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 2.2), body);
    fin.position.set(0, 1.6, -7);

    const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5, 8), dark);
    engineL.rotation.x = Math.PI / 2;
    engineL.position.set(-2.4, -0.4, -3);
    const engineR = engineL.clone();
    engineR.position.x = 2.4;

    g.add(fuselage, nose, canopy, wing, tail, fin, engineL, engineR);
  }

  if (def.id === "prop") {
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 11, 10), body);
    fuselage.rotation.x = Math.PI / 2;

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 10), dark);
    engine.rotation.x = Math.PI / 2;
    engine.position.z = 6.5;

    const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 2.5, 10), dark);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 7.8;

    const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 2.8), body);
    wing.position.y = 0.6;

    const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 1.8), body);
    tail.position.set(0, 0.5, -6);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 1.8), body);
    fin.position.set(0, 1.4, -6);

    const propeller = new THREE.Group();
    const bladeV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), dark);
    const bladeH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 4.5), dark);
    propeller.add(bladeV, bladeH);
    propeller.position.z = 9.2;

    g.add(fuselage, engine, nose, wing, tail, fin, propeller);
    g.userData.propeller = propeller; // rotated every frame in game.js
  }

  if (def.id === "future") {
    const delta = new THREE.Mesh(new THREE.ConeGeometry(5.5, 9, 3), body);
    delta.rotation.x = Math.PI / 2;
    delta.scale.y = 0.3;
    delta.position.z = 1;

    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x11e0c0 }));
    dome.position.set(0, 1, 2);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 2.6), body);
    fin.position.set(0, 1.4, -3.5);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3, 8),
      new THREE.MeshLambertMaterial({ color: 0x30e0ff }));
    engine.rotation.x = Math.PI / 2;
    engine.position.set(0, -0.2, -4.5);

    g.add(delta, dome, fin, engine);
  }

  return g;
}
