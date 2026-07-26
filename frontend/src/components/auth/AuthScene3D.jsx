import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexToThree(hex) {
  return new THREE.Color(hex.startsWith('#') ? hex : `#${hex}`);
}

function addCandle(group, x, bodyH, isLight, colors) {
  const { purpleDark, purpleLight, accent } = colors;
  const color = isLight ? purpleLight : purpleDark;
  const glow = isLight ? purpleLight : purpleDark;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, bodyH, 0.5),
    new THREE.MeshStandardMaterial({
      color: hexToThree(color),
      emissive: hexToThree(glow),
      emissiveIntensity: isLight ? 0.2 : 0.12,
      metalness: 0.25,
      roughness: 0.45,
      transparent: true,
      opacity: 0.9,
    }),
  );
  body.position.set(x, bodyH / 2, 0);

  const wickH = bodyH + 0.55;
  const wick = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, wickH, 0.05),
    new THREE.MeshBasicMaterial({
      color: hexToThree(accent),
      transparent: true,
      opacity: 0.4,
    }),
  );
  wick.position.set(x, wickH / 2, 0);

  group.add(body, wick);
  return { body, wick, baseH: bodyH, x };
}

export default function AuthScene3D({ compact = false, className = '' }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const primary = cssVar('--primary', '#3b82f6');
    const accent = cssVar('--accent', '#8b5cf6');
    const bg = theme === 'dark' ? 0x0b0f19 : 0xeef2ff;
    const colors = {
      primary,
      accent,
      purpleDark: theme === 'dark' ? '#5b21b6' : '#6d28d9',
      purpleLight: theme === 'dark' ? '#a78bfa' : '#c4b5fd',
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(bg, compact ? 0.075 : 0.052);

    const camera = new THREE.PerspectiveCamera(compact ? 44 : 40, 1, 0.1, 100);
    camera.position.set(0, compact ? 3 : 4, compact ? 11 : 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.5 : 0.7));
    const key = new THREE.DirectionalLight(hexToThree(primary), 1);
    key.position.set(5, 8, 6);
    scene.add(key);

    const grid = new THREE.GridHelper(compact ? 20 : 28, compact ? 20 : 28, hexToThree(primary), hexToThree(accent));
    grid.material.opacity = theme === 'dark' ? 0.14 : 0.1;
    grid.material.transparent = true;
    grid.position.y = 0;
    scene.add(grid);

    const chart = new THREE.Group();
    scene.add(chart);

    const specs = compact
      ? [[1.2, true], [1.8, false], [1.5, true], [2.2, true], [1.7, false], [2.5, true]]
      : [[1.1, true], [1.6, false], [1.3, true], [2.0, true], [1.5, false], [2.4, true], [2.0, true], [2.8, true], [2.3, false], [3.0, true]];

    const candles = specs.map(([h, up], i) => {
      const x = (i - (specs.length - 1) / 2) * (compact ? 0.85 : 0.9);
      return addCandle(chart, x, h, up, colors);
    });

    chart.rotation.x = -0.18;
    chart.position.y = 0.1;

    const trendPts = candles.map((c) => new THREE.Vector3(c.x, c.baseH + 0.5, 0.35));
    const curve = new THREE.CatmullRomCurve3(trendPts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.045, 8, false),
      new THREE.MeshBasicMaterial({
        color: hexToThree(accent),
        transparent: true,
        opacity: theme === 'dark' ? 0.8 : 0.6,
      }),
    );
    chart.add(tube);

    const rings = [];
    [2.8, 3.6].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 8, 64),
        new THREE.MeshBasicMaterial({
          color: hexToThree(i === 0 ? accent : primary),
          transparent: true,
          opacity: theme === 'dark' ? 0.2 : 0.12,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      scene.add(ring);
      rings.push(ring);
    });

    const floaters = [
      { geo: new THREE.IcosahedronGeometry(compact ? 0.5 : 0.7, 1), pos: [-4, 3.5, -3], color: accent },
      { geo: new THREE.OctahedronGeometry(compact ? 0.45 : 0.6, 0), pos: [4.2, 4, -4], color: colors.purpleLight },
    ].map(({ geo, pos, color }) => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: hexToThree(color),
          wireframe: true,
          transparent: true,
          opacity: theme === 'dark' ? 0.35 : 0.22,
        }),
      );
      m.position.set(...pos);
      m.userData = { baseY: pos[1], phase: Math.random() * Math.PI * 2 };
      scene.add(m);
      return m;
    });

    const particleCount = compact ? 120 : 280;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (compact ? 16 : 22);
      positions[i * 3 + 1] = Math.random() * (compact ? 8 : 10) + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * (compact ? 12 : 16);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        size: compact ? 0.04 : 0.05,
        color: hexToThree(accent),
        transparent: true,
        opacity: theme === 'dark' ? 0.45 : 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(particles);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      camera.lookAt(0, compact ? 1.5 : 1.8, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let frameId = 0;
    const clock = new THREE.Clock();
    const baseRotY = compact ? 0.1 : -0.2;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!reducedMotion) {
        chart.rotation.y = baseRotY + Math.sin(t * 0.22) * 0.15;

        candles.forEach((c, i) => {
          const pulse = 1 + Math.sin(t * 1.1 + i * 0.5) * 0.06;
          c.body.scale.y = pulse;
          c.body.position.y = (c.baseH * pulse) / 2;
          c.wick.position.y = (c.baseH * pulse + 0.55) / 2;
        });

        rings.forEach((ring, i) => {
          ring.rotation.z = t * (0.08 + i * 0.04);
        });

        floaters.forEach((m) => {
          m.rotation.x += 0.004;
          m.rotation.y += 0.006;
          m.position.y = m.userData.baseY + Math.sin(t * 0.5 + m.userData.phase) * 0.3;
        });

        particles.rotation.y = t * 0.015;
        grid.rotation.y = t * 0.025;

        camera.position.x = Math.sin(t * 0.12) * 0.6;
        camera.position.y = (compact ? 3 : 4) + Math.sin(t * 0.1) * 0.25;
        camera.lookAt(0, compact ? 1.5 : 1.8, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      renderer.dispose();
      particleGeo.dispose();
      particles.material.dispose();
      tube.geometry.dispose();
      tube.material.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      chart.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      rings.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      floaters.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, compact]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`} aria-hidden="true" />
  );
}
