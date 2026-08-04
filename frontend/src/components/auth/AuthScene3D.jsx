import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function color(value) {
  return new THREE.Color(value.startsWith('#') ? value : `#${value}`);
}

function glowingMaterial(value, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color: color(value),
    emissive: color(value),
    emissiveIntensity: intensity,
    metalness: 0.45,
    roughness: 0.25,
  });
}

function buildIntelligenceCore(root, palette, compact) {
  const animated = [];
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(compact ? 1.05 : 1.55, 2),
    new THREE.MeshPhysicalMaterial({
      color: color(palette.primary),
      emissive: color(palette.primary),
      emissiveIntensity: 0.65,
      metalness: 0.65,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.92,
    }),
  );
  root.add(core);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(compact ? 1.32 : 1.95, 1),
    new THREE.MeshBasicMaterial({
      color: color(palette.accent), wireframe: true, transparent: true, opacity: 0.26,
    }),
  );
  root.add(shell);

  const rings = [
    [compact ? 1.8 : 2.8, palette.primary, [1.05, 0.05, 0.2]],
    [compact ? 2.2 : 3.6, palette.accent, [0.15, 0.95, 0.55]],
    [compact ? 2.55 : 4.35, palette.success, [0.75, 0.35, 1.05]],
  ].map(([radius, ringColor, rotation], index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, compact ? 0.018 : 0.028, 8, 128),
      new THREE.MeshBasicMaterial({
        color: color(ringColor), transparent: true, opacity: 0.42 - index * 0.07,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.set(...rotation);
    root.add(ring);
    return ring;
  });

  const satellites = [];
  const connections = [];
  const count = compact ? 8 : 15;
  for (let index = 0; index < count; index += 1) {
    const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    const radius = compact ? 2.45 : 4.15;
    const position = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) * 0.72,
      radius * Math.sin(phi) * Math.sin(theta),
    );
    const nodeColor = [palette.primary, palette.accent, palette.success][index % 3];
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(compact ? 0.07 : 0.11, 16, 16),
      glowingMaterial(nodeColor, 1.6),
    );
    node.position.copy(position);
    node.userData = { phase: index * 0.73, baseScale: index % 4 === 0 ? 1.5 : 1 };
    root.add(node);
    satellites.push(node);
    connections.push(0, 0, 0, position.x, position.y, position.z);
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connections, 3));
  const network = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: color(palette.primary), transparent: true, opacity: 0.13,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  root.add(network);
  animated.push({ core, shell, rings, satellites, network });
  return animated;
}

function buildPortfolioDna(root, palette, compact) {
  const animated = [];
  const turns = compact ? 2.5 : 3.7;
  const count = compact ? 42 : 76;
  const radius = compact ? 1.25 : 1.85;
  const height = compact ? 4.2 : 6.8;
  const strandA = [];
  const strandB = [];

  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const angle = progress * Math.PI * 2 * turns;
    const y = (progress - 0.5) * height;
    strandA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    strandB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
  }

  const makeStrand = (points, strandColor) => new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), count * 2, compact ? 0.035 : 0.055, 8, false),
    new THREE.MeshBasicMaterial({
      color: color(strandColor), transparent: true, opacity: 0.78,
      blending: THREE.AdditiveBlending,
    }),
  );
  const helixA = makeStrand(strandA, palette.primary);
  const helixB = makeStrand(strandB, palette.accent);
  root.add(helixA, helixB);

  const rungs = [];
  const rungGeometry = new THREE.BufferGeometry();
  const rungPositions = [];
  const step = compact ? 5 : 6;
  for (let index = 0; index < count; index += step) {
    rungPositions.push(...strandA[index].toArray(), ...strandB[index].toArray());
    [strandA[index], strandB[index]].forEach((position, side) => {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(compact ? 0.075 : 0.115, 16, 16),
        glowingMaterial(side === 0 ? palette.primary : palette.accent, 1.4),
      );
      bead.position.copy(position);
      bead.userData.phase = index * 0.3 + side;
      root.add(bead);
      rungs.push(bead);
    });
  }
  rungGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rungPositions, 3));
  const bridges = new THREE.LineSegments(
    rungGeometry,
    new THREE.LineBasicMaterial({
      color: color(palette.success), transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(bridges);

  const genesisCore = new THREE.Mesh(
    new THREE.TorusKnotGeometry(compact ? 0.44 : 0.7, compact ? 0.12 : 0.19, 120, 18),
    glowingMaterial(palette.success, 0.85),
  );
  genesisCore.rotation.x = Math.PI / 2;
  root.add(genesisCore);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(compact ? 2.05 : 3.15, 0.025, 8, 128),
    new THREE.MeshBasicMaterial({
      color: color(palette.success), transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  root.add(halo);
  animated.push({ helixA, helixB, rungs, bridges, genesisCore, halo });
  return animated;
}

export default function AuthScene3D({ compact = false, variant = 'core', className = '' }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette = {
      primary: cssVar('--primary', '#3b82f6'),
      accent: cssVar('--accent', '#8b5cf6'),
      success: cssVar('--success', '#10b981'),
    };
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(theme === 'dark' ? 0x090d17 : 0xeef2ff, compact ? 0.07 : 0.045);

    const camera = new THREE.PerspectiveCamera(compact ? 48 : 42, 1, 0.1, 100);
    camera.position.set(0, 0, compact ? 8.5 : 11.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === 'dark' ? 1.15 : 0.92;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x18213a, theme === 'dark' ? 1.1 : 1.6));
    const keyLight = new THREE.PointLight(color(palette.primary), 12, 24);
    keyLight.position.set(4, 5, 6);
    const rimLight = new THREE.PointLight(color(palette.accent), 10, 22);
    rimLight.position.set(-5, -2, 4);
    scene.add(keyLight, rimLight);

    const root = new THREE.Group();
    root.rotation.x = variant === 'dna' ? -0.12 : 0.08;
    scene.add(root);
    const animated = variant === 'dna'
      ? buildPortfolioDna(root, palette, compact)
      : buildIntelligenceCore(root, palette, compact);

    const particleCount = compact ? 180 : 520;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const paletteColors = [color(palette.primary), color(palette.accent), color(palette.success)];
    for (let index = 0; index < particleCount; index += 1) {
      const distance = compact ? 11 : 17;
      particlePositions[index * 3] = (Math.random() - 0.5) * distance;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * distance;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * distance;
      const particleColor = paletteColors[index % paletteColors.length];
      particleColors[index * 3] = particleColor.r;
      particleColors[index * 3 + 1] = particleColor.g;
      particleColors[index * 3 + 2] = particleColor.b;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: compact ? 0.045 : 0.065, vertexColors: true, transparent: true,
        opacity: theme === 'dark' ? 0.75 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    container.addEventListener('pointermove', onPointerMove, { passive: true });

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const clock = new THREE.Clock();
    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!reducedMotion) {
        root.rotation.y += 0.0022;
        root.position.y = Math.sin(elapsed * 0.55) * (compact ? 0.08 : 0.16);
        particles.rotation.y = elapsed * 0.012;
        particles.rotation.x = Math.sin(elapsed * 0.1) * 0.08;

        if (variant === 'dna') {
          const dna = animated[0];
          dna.genesisCore.rotation.x += 0.01;
          dna.genesisCore.rotation.y += 0.014;
          dna.halo.rotation.z = elapsed * 0.22;
          dna.rungs.forEach((bead) => {
            const pulse = 0.85 + Math.sin(elapsed * 2 + bead.userData.phase) * 0.2;
            bead.scale.setScalar(pulse);
          });
        } else {
          const core = animated[0];
          core.core.rotation.x += 0.004;
          core.core.rotation.y += 0.007;
          core.shell.rotation.x -= 0.0025;
          core.shell.rotation.y += 0.0035;
          core.rings.forEach((ring, index) => { ring.rotation.z += 0.0015 + index * 0.0007; });
          core.satellites.forEach((node) => {
            const pulse = node.userData.baseScale * (0.9 + Math.sin(elapsed * 1.8 + node.userData.phase) * 0.18);
            node.scale.setScalar(pulse);
          });
        }

        camera.position.x += (pointer.x * (compact ? 0.3 : 0.8) - camera.position.x) * 0.025;
        camera.position.y += (-pointer.y * (compact ? 0.2 : 0.55) - camera.position.y) * 0.025;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [theme, compact, variant]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} aria-hidden="true" />;
}
