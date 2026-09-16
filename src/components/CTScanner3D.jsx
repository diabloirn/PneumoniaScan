import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { 
  Play, 
  Eye, 
  Crosshair, 
  Zap 
} from "lucide-react";

export default function CTScanner3D() {
  const mountRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeSlice, setActiveSlice] = useState(0);
  const [isTransparent, setIsTransparent] = useState(false);
  const [lasersOn, setLasersOn] = useState(true);
  const [activePreset, setActivePreset] = useState("iso");

  // Telemetry states
  const [tubeKV, setTubeKV] = useState(120);
  const [tubeMA, setTubeMA] = useState(320);
  const [currentRPM, setCurrentRPM] = useState(0);
  const [tableZPos, setTableZPos] = useState(0);

  // References for animation loop
  const animRefs = useRef({
    scene: null,
    camera: null,
    renderer: null,
    rotorGroup: null,
    couchGroup: null,
    gantryHousingMesh: null,
    boreRingLight: null,
    laserGroup: null,
    scanBeamMesh: null,
    isScanning: false,
    scanTime: 0,
    rotorSpeed: 0.015,
    targetRotorSpeed: 0.015,
    tableTargetZ: 0,
    tableCurrentZ: 0,
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    spherical: { radius: 8.5, theta: Math.PI / 4, phi: Math.PI / 3 },
    targetLookAt: new THREE.Vector3(0, 1.4, 0),
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x140408);
    scene.fog = new THREE.FogExp2(0x140408, 0.035);
    animRefs.current.scene = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    animRefs.current.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    animRefs.current.renderer = renderer;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.9);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainKeyLight.position.set(5, 10, 7);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 1024;
    mainKeyLight.shadow.mapSize.height = 1024;
    mainKeyLight.shadow.bias = -0.0001;
    scene.add(mainKeyLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 1.6);
    rimLight.position.set(-6, 6, -6);
    scene.add(rimLight);

    const floorBounceLight = new THREE.PointLight(0x851832, 0.8, 14);
    floorBounceLight.position.set(0, 0.5, 0);
    scene.add(floorBounceLight);

    // --- ROOM & FLOOR ---
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a060c,
      roughness: 0.35,
      metalness: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Medical Grid Line Decals (Burgundy & Antique Gold)
    const gridHelper = new THREE.GridHelper(20, 20, 0xd4af37, 0x4a0e1c);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Wall backdrop
    const wallGeo = new THREE.PlaneGeometry(30, 15);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x120306,
      roughness: 0.7,
      metalness: 0.1,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 7.5, -8);
    wall.receiveShadow = true;
    scene.add(wall);

    // --- MATERIALS ---
    const medicalWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f3,
      roughness: 0.22,
      metalness: 0.1,
      name: "housingMat"
    });
    const medicalSlateMat = new THREE.MeshStandardMaterial({
      color: 0x2e0811,
      roughness: 0.4,
      metalness: 0.5,
    });
    const metallicChromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.15,
      metalness: 0.9,
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      roughness: 0.6,
      metalness: 0.2,
    });
    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
    });
    const redAlertMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
    });

    // --- CT SCANNER GANTRY ASSEMBLY ---
    const gantryRoot = new THREE.Group();
    gantryRoot.position.set(0, 0, -0.6);
    scene.add(gantryRoot);

    // 1. Gantry Pedestal Base
    const baseGeo = new THREE.BoxGeometry(3.6, 0.3, 2.2);
    const baseMesh = new THREE.Mesh(baseGeo, medicalSlateMat);
    baseMesh.position.set(0, 0.15, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    gantryRoot.add(baseMesh);

    // 2. Gantry Main Outer Housing Shell
    const outerRingRadius = 2.0;
    const innerRingRadius = 0.95;
    const gantryDepth = 1.3;

    // Outer Cylinder
    const housingOuterGeo = new THREE.CylinderGeometry(
      outerRingRadius,
      outerRingRadius * 1.03,
      gantryDepth,
      64,
      1,
      false
    );
    const housingMesh = new THREE.Mesh(housingOuterGeo, medicalWhiteMat);
    housingMesh.rotation.x = Math.PI / 2;
    housingMesh.position.set(0, 1.95, 0);
    housingMesh.castShadow = true;
    housingMesh.receiveShadow = true;
    gantryRoot.add(housingMesh);
    animRefs.current.gantryHousingMesh = housingMesh;

    // Gantry Front Bezel Cap (Soft curved torus lip around the bore)
    const boreLipGeo = new THREE.TorusGeometry(innerRingRadius + 0.12, 0.12, 24, 64);
    const frontBoreLip = new THREE.Mesh(boreLipGeo, medicalSlateMat);
    frontBoreLip.position.set(0, 1.95, gantryDepth / 2 + 0.01);
    gantryRoot.add(frontBoreLip);

    const rearBoreLip = new THREE.Mesh(boreLipGeo, medicalSlateMat);
    rearBoreLip.position.set(0, 1.95, -gantryDepth / 2 - 0.01);
    gantryRoot.add(rearBoreLip);

    // Bore Inner Lining Tunnel
    const boreTunnelGeo = new THREE.CylinderGeometry(
      innerRingRadius,
      innerRingRadius,
      gantryDepth + 0.04,
      48,
      1,
      true
    );
    const boreTunnelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.BackSide,
    });
    const boreTunnel = new THREE.Mesh(boreTunnelGeo, boreTunnelMat);
    boreTunnel.rotation.x = Math.PI / 2;
    boreTunnel.position.set(0, 1.95, 0);
    gantryRoot.add(boreTunnel);

    // Bore Halo LED Strip Ring
    const haloGeo = new THREE.TorusGeometry(innerRingRadius + 0.02, 0.02, 16, 64);
    const haloMesh = new THREE.Mesh(haloGeo, cyanGlowMat);
    haloMesh.position.set(0, 1.95, gantryDepth / 2 - 0.15);
    gantryRoot.add(haloMesh);
    animRefs.current.boreRingLight = haloMesh;

    // Gantry Shoulder Operator Touch Display Console
    const consoleStandGeo = new THREE.BoxGeometry(0.12, 0.45, 0.15);
    const consoleStand = new THREE.Mesh(consoleStandGeo, medicalSlateMat);
    consoleStand.position.set(1.7, 3.4, 0.1);
    consoleStand.rotation.z = -0.2;
    gantryRoot.add(consoleStand);

    const screenGeo = new THREE.BoxGeometry(0.7, 0.45, 0.08);
    const screenMesh = new THREE.Mesh(screenGeo, medicalSlateMat);
    screenMesh.position.set(1.9, 3.65, 0.15);
    screenMesh.rotation.y = -0.4;
    screenMesh.rotation.x = 0.15;
    gantryRoot.add(screenMesh);

    // Display Screen Face (Glowing UI)
    const screenFaceGeo = new THREE.PlaneGeometry(0.62, 0.38);
    const screenFaceMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });
    const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
    screenFace.position.set(0, 0, 0.045);
    screenMesh.add(screenFace);

    // Emergency Stop Button on Gantry front left
    const eStopCollarGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const eStopCollar = new THREE.Mesh(eStopCollarGeo, new THREE.MeshBasicMaterial({ color: 0xeab308 }));
    eStopCollar.rotation.x = Math.PI / 2;
    eStopCollar.position.set(-1.45, 1.95, gantryDepth / 2 + 0.02);
    gantryRoot.add(eStopCollar);

    const eStopBtnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
    const eStopBtn = new THREE.Mesh(eStopBtnGeo, redAlertMat);
    eStopBtn.rotation.x = Math.PI / 2;
    eStopBtn.position.set(-1.45, 1.95, gantryDepth / 2 + 0.04);
    gantryRoot.add(eStopBtn);

    // --- INTERNAL ROTATING GANTRY SLIP RING & X-RAY TUBE ---
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 1.95, 0);
    gantryRoot.add(rotorGroup);
    animRefs.current.rotorGroup = rotorGroup;

    // Rotor Slip Ring Structure
    const rotorDiscGeo = new THREE.TorusGeometry(1.4, 0.08, 16, 48);
    const rotorDisc = new THREE.Mesh(rotorDiscGeo, metallicChromeMat);
    rotorGroup.add(rotorDisc);

    // Heavy-Duty X-Ray Tube Assembly (at 12 o'clock on rotor)
    const xrayTubeBox = new THREE.Group();
    xrayTubeBox.position.set(0, 1.4, 0);

    const tubeBodyGeo = new THREE.BoxGeometry(0.45, 0.35, 0.6);
    const tubeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    const tubeBody = new THREE.Mesh(tubeBodyGeo, tubeBodyMat);
    xrayTubeBox.add(tubeBody);

    // Collimator Cone pointing toward center
    const collimatorGeo = new THREE.ConeGeometry(0.18, 0.22, 16);
    const collimator = new THREE.Mesh(collimatorGeo, metallicChromeMat);
    collimator.rotation.x = Math.PI;
    collimator.position.set(0, -0.25, 0);
    xrayTubeBox.add(collimator);

    rotorGroup.add(xrayTubeBox);

    // Curved Multi-Row Detector Array (at 6 o'clock on rotor, opposite X-Ray tube)
    const detectorGroup = new THREE.Group();
    detectorGroup.position.set(0, -1.4, 0);

    const detectorArcGeo = new THREE.BoxGeometry(0.7, 0.25, 0.65);
    const detectorMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.2,
    });
    const detectorMesh = new THREE.Mesh(detectorArcGeo, detectorMat);
    detectorGroup.add(detectorMesh);

    rotorGroup.add(detectorGroup);

    // Counter-weight balance modules on rotor
    const counterW1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.4), metallicChromeMat);
    counterW1.position.set(1.4, 0, 0);
    rotorGroup.add(counterW1);

    const counterW2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.4), metallicChromeMat);
    counterW2.position.set(-1.4, 0, 0);
    rotorGroup.add(counterW2);

    // --- PATIENT TABLE / COUCH SYSTEM ---
    const tableBaseGroup = new THREE.Group();
    tableBaseGroup.position.set(0, 0, 1.5);
    scene.add(tableBaseGroup);

    // Hydraulic Pedestal Base
    const tablePedestalGeo = new THREE.BoxGeometry(1.2, 0.8, 2.4);
    const tablePedestal = new THREE.Mesh(tablePedestalGeo, medicalWhiteMat);
    tablePedestal.position.set(0, 0.4, 0);
    tablePedestal.castShadow = true;
    tablePedestal.receiveShadow = true;
    tableBaseGroup.add(tablePedestal);

    // Telescopic Lift Column
    const liftColumnGeo = new THREE.BoxGeometry(0.7, 0.6, 1.4);
    const liftColumn = new THREE.Mesh(liftColumnGeo, metallicChromeMat);
    liftColumn.position.set(0, 0.9, 0);
    tableBaseGroup.add(liftColumn);

    // Cantilever Floating Cradle (Motorized Patient Couch that glides)
    const couchGroup = new THREE.Group();
    couchGroup.position.set(0, 1.25, 0);
    tableBaseGroup.add(couchGroup);
    animRefs.current.couchGroup = couchGroup;

    // Couch Carbon-Fiber Mattress Platter
    const couchTopGeo = new THREE.BoxGeometry(0.78, 0.08, 3.2);
    const couchTop = new THREE.Mesh(couchTopGeo, carbonMat);
    couchTop.position.set(0, 0, -0.4);
    couchTop.castShadow = true;
    couchGroup.add(couchTop);

    // Ergonomic Contoured Headrest & Safety Edge Rails
    const headrestGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.09, 24);
    const headrest = new THREE.Mesh(headrestGeo, medicalSlateMat);
    headrest.position.set(0, 0.05, -1.8);
    couchGroup.add(headrest);

    // Patient Restraint Straps
    const strapMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), strapMat);
    strap1.position.set(0, 0.05, -0.7);
    couchGroup.add(strap1);

    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), strapMat);
    strap2.position.set(0, 0.05, 0.4);
    couchGroup.add(strap2);

    // --- LASER ALIGNMENT & SCANNING FAN BEAM ---
    const laserGroup = new THREE.Group();
    scene.add(laserGroup);
    animRefs.current.laserGroup = laserGroup;

    // Sagittal & Axial Crosshair Laser Lines (Thin glowing lines)
    const laserAxialMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
    const axialPoints = [
      new THREE.Vector3(-0.45, 1.3, -0.6),
      new THREE.Vector3(0.45, 1.3, -0.6)
    ];
    const axialGeo = new THREE.BufferGeometry().setFromPoints(axialPoints);
    const axialLine = new THREE.Line(axialGeo, laserAxialMat);
    laserGroup.add(axialLine);

    const sagittalPoints = [
      new THREE.Vector3(0, 1.3, -1.8),
      new THREE.Vector3(0, 1.3, 1.2)
    ];
    const sagittalGeo = new THREE.BufferGeometry().setFromPoints(sagittalPoints);
    const sagittalLine = new THREE.Line(sagittalGeo, laserAxialMat);
    laserGroup.add(sagittalLine);

    // Volumetric Dynamic Scanning Laser Fan Beam (Plane cutting across bore aperture)
    const scanBeamGeo = new THREE.PlaneGeometry(1.7, 1.7);
    const scanBeamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scanBeamMesh = new THREE.Mesh(scanBeamGeo, scanBeamMat);
    scanBeamMesh.position.set(0, 1.95, -0.6);
    scene.add(scanBeamMesh);
    animRefs.current.scanBeamMesh = scanBeamMesh;

    // --- MOUSE ORBIT CONTROLS ---
    const updateCameraFromSpherical = () => {
      const { radius, theta, phi } = animRefs.current.spherical;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + animRefs.current.targetLookAt.y;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(animRefs.current.targetLookAt);
    };
    updateCameraFromSpherical();

    const handlePointerDown = (e) => {
      animRefs.current.isDragging = true;
      animRefs.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      if (!animRefs.current.isDragging) return;
      const deltaX = e.clientX - animRefs.current.previousMousePosition.x;
      const deltaY = e.clientY - animRefs.current.previousMousePosition.y;

      animRefs.current.spherical.theta -= deltaX * 0.007;
      animRefs.current.spherical.phi -= deltaY * 0.007;
      // Clamp phi to prevent flipping
      animRefs.current.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, animRefs.current.spherical.phi));

      updateCameraFromSpherical();
      animRefs.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      animRefs.current.isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      animRefs.current.spherical.radius += e.deltaY * 0.005;
      animRefs.current.spherical.radius = Math.max(4.0, Math.min(14.0, animRefs.current.spherical.radius));
      updateCameraFromSpherical();
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- ANIMATION RAF LOOP ---
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle rotor idle vs active scan acceleration
      const refs = animRefs.current;
      refs.rotorSpeed = THREE.MathUtils.lerp(refs.rotorSpeed, refs.targetRotorSpeed, 0.04);
      if (refs.rotorGroup) {
        refs.rotorGroup.rotation.z += refs.rotorSpeed;
      }

      // Smooth patient couch motion
      refs.tableCurrentZ = THREE.MathUtils.lerp(refs.tableCurrentZ, refs.tableTargetZ, 0.035);
      if (refs.couchGroup) {
        refs.couchGroup.position.z = refs.tableCurrentZ;
      }

      // Scanner scanline & volumetric pulsing
      if (refs.scanBeamMesh) {
        if (refs.isScanning) {
          refs.scanBeamMesh.material.opacity = 0.35 + 0.15 * Math.sin(elapsed * 12);
          refs.scanBeamMesh.rotation.z += 0.08;
        } else {
          refs.scanBeamMesh.material.opacity = THREE.MathUtils.lerp(refs.scanBeamMesh.material.opacity, 0.0, 0.1);
        }
      }

      // Pulsing bore halo glow
      if (refs.boreRingLight) {
        const pulse = 0.8 + 0.2 * Math.sin(elapsed * 2.5);
        refs.boreRingLight.scale.set(pulse, pulse, pulse);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dom.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Transparency effect when isTransparent toggles
  useEffect(() => {
    const mesh = animRefs.current.gantryHousingMesh;
    if (mesh) {
      if (isTransparent) {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.25;
        mesh.material.roughness = 0.1;
        mesh.material.metalness = 0.9;
      } else {
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.roughness = 0.25;
        mesh.material.metalness = 0.1;
      }
      mesh.material.needsUpdate = true;
    }
  }, [isTransparent]);

  // Update Laser visibility
  useEffect(() => {
    if (animRefs.current.laserGroup) {
      animRefs.current.laserGroup.visible = lasersOn;
    }
  }, [lasersOn]);

  // Camera presets
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const spherical = animRefs.current.spherical;
    if (preset === "iso") {
      spherical.radius = 8.5;
      spherical.theta = Math.PI / 4;
      spherical.phi = Math.PI / 3;
    } else if (preset === "bore") {
      spherical.radius = 5.2;
      spherical.theta = 0.1;
      spherical.phi = Math.PI / 2.3;
    } else if (preset === "table") {
      spherical.radius = 6.0;
      spherical.theta = Math.PI / 2;
      spherical.phi = Math.PI / 2.8;
    } else if (preset === "top") {
      spherical.radius = 9.0;
      spherical.theta = 0;
      spherical.phi = 0.15;
    }

    const { radius, theta, phi } = spherical;
    const camera = animRefs.current.camera;
    if (camera) {
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi) + animRefs.current.targetLookAt.y;
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(animRefs.current.targetLookAt);
    }
  };

  // Trigger automated CT Scan procedure
  const triggerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    animRefs.current.isScanning = true;
    animRefs.current.targetRotorSpeed = 0.25; // Accelerate to 180 RPM
    animRefs.current.tableTargetZ = -1.8; // Slide couch into the bore

    setScanProgress(0);
    setActiveSlice(1);
    setTubeKV(120);
    setTubeMA(350);

    const totalDuration = 7000; // 7 seconds scan sequence
    const intervalTime = 100;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalTime;
      const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setScanProgress(progress);

      const slice = Math.min(64, Math.ceil((progress / 100) * 64));
      setActiveSlice(slice);

      // Dynamic telemetry changes during acquisition
      setCurrentRPM(Math.round((animRefs.current.rotorSpeed / 0.25) * 180));
      setTableZPos(Math.round(Math.abs(animRefs.current.tableCurrentZ) * 250));

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        // Return couch and decelerate
        animRefs.current.tableTargetZ = 0;
        animRefs.current.targetRotorSpeed = 0.015;
        animRefs.current.isScanning = false;
        setTimeout(() => {
          setIsScanning(false);
          setCurrentRPM(0);
        }, 1200);
      }
    }, intervalTime);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#d4af37]/25 bg-gradient-to-b from-[#1c070d] to-[#120408] shadow-2xl">
      {/* 3D WebGL Canvas Mount Container */}
      <div 
        ref={mountRef} 
        className="w-full h-[420px] sm:h-[500px] lg:h-[540px] cursor-grab active:cursor-grabbing"
      />

      {/* Top Clinical Suite Telemetry HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        {/* Unit Status */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#24060d]/95 to-[#160408]/95 backdrop-blur border border-[#d4af37]/30 px-3.5 py-2 rounded-xl text-xs font-mono shadow-lg">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className="font-bold text-[#fdf8f0] tracking-wider">AXIOM CT-64 GANTRY</span>
          </div>
          <span className="text-[#d4af37]/40">|</span>
          <span className={isScanning ? "text-amber-300 font-semibold" : "text-[#eedcc6]/80"}>
            STATUS: {isScanning ? "ACQUIRING HELICAL SLICES" : "CALIBRATED & STANDBY"}
          </span>
        </div>

        {/* Real-time Radiographic Telemetry Card */}
        <div className="hidden sm:flex items-center gap-4 bg-gradient-to-r from-[#24060d]/95 to-[#160408]/95 backdrop-blur border border-[#d4af37]/30 px-3.5 py-2 rounded-xl text-[11px] font-mono text-[#eedcc6] shadow-lg">
          <div>
            <span className="text-[#eedcc6]/60 block text-[9px] uppercase">Tube Voltage</span>
            <span className="text-[#d4af37] font-bold">{tubeKV} kVp</span>
          </div>
          <div className="border-l border-[#d4af37]/20 pl-3">
            <span className="text-[#eedcc6]/60 block text-[9px] uppercase">Tube Current</span>
            <span className="text-[#d4af37] font-bold">{isScanning ? tubeMA : 0} mA</span>
          </div>
          <div className="border-l border-[#d4af37]/20 pl-3">
            <span className="text-[#eedcc6]/60 block text-[9px] uppercase">Gantry Rotation</span>
            <span className="text-emerald-400 font-bold">{isScanning ? currentRPM : 15} RPM</span>
          </div>
          <div className="border-l border-[#d4af37]/20 pl-3">
            <span className="text-[#eedcc6]/60 block text-[9px] uppercase">Table Position</span>
            <span className="text-[#fdf8f0] font-bold">{tableZPos} mm</span>
          </div>
        </div>
      </div>

      {/* Active Scan Progress HUD Bar */}
      {isScanning && (
        <div className="absolute top-16 left-3 right-3 sm:left-6 sm:right-6 bg-gradient-to-r from-[#380e1a]/95 to-[#24060d]/95 backdrop-blur border border-[#d4af37]/50 p-3 rounded-xl shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-pulse">
          <div className="flex items-center justify-between text-xs font-mono text-[#eedcc6] mb-1.5">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#d4af37] animate-spin" />
              HELI-SCAN RUNNING: SLICE {activeSlice}/64
            </span>
            <span className="font-bold text-[#d4af37]">{scanProgress}% COMPLETE</span>
          </div>
          <div className="w-full bg-[#160408] rounded-full h-2 overflow-hidden border border-[#d4af37]/30">
            <div 
              className="bg-gradient-to-r from-[#a61e3e] via-[#d4af37] to-emerald-400 h-2 rounded-full transition-all duration-100"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Floating Interactive Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#24060d]/95 to-[#160408]/95 backdrop-blur border border-[#d4af37]/30 p-2.5 rounded-xl shadow-xl">
        {/* Camera Views */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono uppercase text-[#eedcc6]/70 px-2 hidden sm:inline">Camera:</span>
          <button
            onClick={() => applyPreset("iso")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              activePreset === "iso" 
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border border-[#d4af37]/50" 
                : "text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
          >
            Iso 3D
          </button>
          <button
            onClick={() => applyPreset("bore")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              activePreset === "bore" 
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border border-[#d4af37]/50" 
                : "text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
          >
            Bore View
          </button>
          <button
            onClick={() => applyPreset("table")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              activePreset === "table" 
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border border-[#d4af37]/50" 
                : "text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
          >
            Patient Couch
          </button>
          <button
            onClick={() => applyPreset("top")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              activePreset === "top" 
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border border-[#d4af37]/50" 
                : "text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
          >
            Axial Top
          </button>
        </div>

        {/* Feature Toggles & Actions */}
        <div className="flex items-center gap-2">
          {/* Casing Transparency Toggle */}
          <button
            onClick={() => setIsTransparent(!isTransparent)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
              isTransparent
                ? "bg-[#eedcc6]/20 border-[#d4af37]/60 text-[#fdf8f0] shadow-[0_0_15px_rgba(212,175,55,0.25)]"
                : "bg-[#380e1a]/70 border-[#d4af37]/25 text-[#eedcc6]/80 hover:text-white"
            }`}
            title="Toggle X-Ray casing transparency to reveal internal slip-ring and X-ray tube"
          >
            <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{isTransparent ? "X-Ray Casing: ON" : "See-Through"}</span>
          </button>

          {/* Laser Guide Toggle */}
          <button
            onClick={() => setLasersOn(!lasersOn)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
              lasersOn
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : "bg-[#380e1a]/70 border-[#d4af37]/25 text-[#eedcc6]/80 hover:text-white"
            }`}
            title="Toggle alignment lasers"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Lasers</span>
          </button>

          {/* Start Scan Button */}
          <button
            onClick={triggerScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-[#fdf8f0] bg-gradient-to-r from-[#851832] via-[#a61e3e] to-[#c5a059] hover:from-[#a61e3e] hover:to-[#d4af37] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-95"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? "Acquiring..." : "Simulate CT Scan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

