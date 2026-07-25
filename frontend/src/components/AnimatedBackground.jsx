import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexToThree(hex) {
  return new THREE.Color(hex.startsWith('#') ? hex : `#${hex}`);
}

export default function AnimatedBackground() {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    const primary = cssVar('--primary', '#3b82f6');
    const accent = cssVar('--accent', '#8b5cf6');
    const success = cssVar('--success', '#10b981');

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(theme === 'dark' ? 0x0b0f19 : 0xeef2ff, reducedMotion ? 0.08 : 0.045);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      120,
    );
    camera.position.set(0, 3.5, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Grid floor ──
    const grid = new THREE.GridHelper(60, 60, hexToThree(primary), hexToThree(accent));
    grid.material.opacity = theme === 'dark' ? 0.22 : 0.18;
    grid.material.transparent = true;
    grid.position.y = -3;
    scene.add(grid);

    // ── Particle field ──
    const particleCount = reducedMotion ? 400 : isMobile ? 1200 : 2800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const palette = [hexToThree(primary), hexToThree(accent), hexToThree(success)];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        size: isMobile ? 0.06 : 0.08,
        vertexColors: true,
        transparent: true,
        opacity: theme === 'dark' ? 0.75 : 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(particles);

    // ── Floating wireframe shapes ──
    const shapes = [];
    const shapeDefs = [
      { geo: new THREE.IcosahedronGeometry(1.2, 1), pos: [-4, 1, -6], color: primary },
      { geo: new THREE.TorusKnotGeometry(0.7, 0.22, 100, 16), pos: [5, 2, -8], color: accent },
      { geo: new THREE.OctahedronGeometry(1, 0), pos: [0, 3.5, -12], color: success },
      { geo: new THREE.BoxGeometry(1.4, 2.2, 0.35), pos: [3, 0.5, -4], color: primary },
      { geo: new THREE.BoxGeometry(1.1, 1.8, 0.3), pos: [-3.5, 1.2, -5], color: accent },
    ];

    shapeDefs.forEach(({ geo, pos, color }) => {
      const mat = new THREE.MeshBasicMaterial({
        color: hexToThree(color),
        wireframe: true,
        transparent: true,
        opacity: theme === 'dark' ? 0.35 : 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.userData = {
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.004,
          y: (Math.random() - 0.5) * 0.006,
          z: (Math.random() - 0.5) * 0.003,
        },
        floatOffset: Math.random() * Math.PI * 2,
        baseY: pos[1],
      };
      scene.add(mesh);
      shapes.push(mesh);
    });

    // ── Connection lines between nearby particles (sample subset) ──
    const linePositions = [];
    const sampleStep = reducedMotion ? 80 : 40;
    for (let i = 0; i < particleCount; i += sampleStep) {
      for (let j = i + sampleStep; j < particleCount; j += sampleStep) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 36) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2],
          );
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: hexToThree(primary),
        transparent: true,
        opacity: theme === 'dark' ? 0.12 : 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(lines);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!reducedMotion) {
        grid.rotation.y = t * 0.04;
        particles.rotation.y = t * 0.015;
        particles.rotation.x = Math.sin(t * 0.1) * 0.05;

        shapes.forEach((mesh) => {
          const { rotSpeed, floatOffset, baseY } = mesh.userData;
          mesh.rotation.x += rotSpeed.x;
          mesh.rotation.y += rotSpeed.y;
          mesh.rotation.z += rotSpeed.z;
          mesh.position.y = baseY + Math.sin(t * 0.6 + floatOffset) * 0.35;
        });

        lines.rotation.y = t * 0.01;

        camera.position.x = Math.sin(t * 0.12) * 0.8;
        camera.position.y = 3.5 + Math.sin(t * 0.08) * 0.4;
        camera.lookAt(0, 0, -2);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      particleGeo.dispose();
      particles.material.dispose();
      lineGeo.dispose();
      lines.material.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      shapes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/78 to-background/92" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,var(--bg)_85%)]" />
      <div className="noise-overlay opacity-[0.03]" />
    </div>
  );
}
