import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getSatelliteEci, getObserverCoordinates } from '../lib/satelliteUtils';

const LOCATIONS = [
  { name: 'Bangkok, TH', lat: 13.7563, lng: 100.5018, alt: 0.001 },
  { name: 'New York, US', lat: 40.7128, lng: -74.0060, alt: 0.001 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, alt: 0.001 },
  { name: 'Tokyo, JP', lat: 35.6762, lng: 139.6503, alt: 0.001 },
  { name: 'Sydney, AU', lat: -33.8688, lng: 151.2093, alt: 0.001 },
  { name: 'North Pole', lat: 90.0, lng: 0.0, alt: 0.001 },
  { name: 'Custom...', lat: 0.0, lng: 0.0, alt: 0.001 }
];

export default function SkyView({ satellites, timeRef }) {
  const mountRef = useRef(null);
  const [observer, setObserver] = useState(LOCATIONS[0]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedSat, setSelectedSat] = useState(null);
  
  const [starOpacity, setStarOpacity] = useState(0.4);
  const starMatRef = useRef(null);

  // Use ref to hold current observer for the vanilla JS event listeners without stale closures
  const observerRef = useRef(observer);
  useEffect(() => { observerRef.current = observer; }, [observer]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // === Scene ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030814');

    // === Camera ===
    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 2500);
    camera.position.set(0, 0, 0);

    // === Renderer ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // =========================================
    // Drag-to-look & Raycaster (Click to identify)
    // =========================================
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let clickStartX = 0;
    let clickStartY = 0;
    let lon = 0;   // horizontal angle
    let lat = 20;  // vertical angle

    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';

    const handleDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(e.pointerId);
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      lon -= dx * 0.25;
      lat = Math.max(-5, Math.min(89.9, lat - dy * 0.25));
    };

    const handleUp = (e) => {
      isDragging = false;
      canvas.style.cursor = 'grab';
      canvas.releasePointerCapture(e.pointerId);

      // Check if it was a click (not a drag)
      const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
      if (dist < 5) {
        const rect = canvas.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        let closestSat = null;
        let minDist = 30; // รัศมีวงกลมที่คลิกโดนดาวเทียมได้ (ขนาดใหญ่ 30px ให้จิ้มง่ายๆ)

        satGroup.children.forEach(sp => {
            if (!sp.visible || !sp.userData.name) return;
            // ฉายตำแหน่ง 3D ของดาวเทียมลงมาบนหน้าจอ 2D
            const vec = sp.position.clone();
            vec.project(camera);
            
            // ข้ามดาวเทียมที่อยู่ข้างหลังกล้อง
            if (vec.z > 1) return;

            // แปลงพิกัด NDC (-1 ถึง 1) กลับมาเป็น pixel ของหน้าจอ
            const px = (vec.x * 0.5 + 0.5) * rect.width;
            const py = -(vec.y * 0.5 - 0.5) * rect.height;

            const d = Math.hypot(px - pointerX, py - pointerY);
            if (d < minDist) {
                minDist = d;
                closestSat = sp.userData;
            }
        });

        if (closestSat) {
            setSelectedSat({
                name: closestSat.name,
                x: e.clientX,
                y: e.clientY
            });
        } else {
            // ถ้าคลิกแต่ไม่โดนดาวเทียมในระยะ 30px ให้ซ่อน info
            setSelectedSat(null);
        }
      }
    };

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp);

    // Zoom ด้วยลูกกลิ้งเมาส์
    const handleWheel = (e) => {
      let newFov = camera.fov + e.deltaY * 0.05;
      newFov = Math.max(10, Math.min(100, newFov)); // ล็อกระดับการซูม (แคบสุด 10, กว้างสุด 100)
      camera.fov = newFov;
      camera.updateProjectionMatrix();
    };
    canvas.addEventListener('wheel', handleWheel, { passive: true });

    // === Textures ===
    const dotTexture = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    // === Ground ===
    const groundGeo = new THREE.CylinderGeometry(1500, 1500, 10, 32);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x010204 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -5;
    scene.add(ground);

    // === Compass Labels ===
    const makeLabel = (text, color) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 64);
      const t = new THREE.CanvasTexture(c);
      const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.scale.set(120, 60, 1);
      return s;
    };
    [
      { text: 'N', az: 0, color: '#ff6666' },
      { text: 'E', az: Math.PI / 2, color: '#cccccc' },
      { text: 'S', az: Math.PI, color: '#cccccc' },
      { text: 'W', az: -Math.PI / 2, color: '#cccccc' },
    ].forEach(m => {
      const s = makeLabel(m.text, m.color);
      s.position.set(500 * Math.sin(m.az), 20, -500 * Math.cos(m.az));
      scene.add(s);
    });

    // === Background Stars ===
    const starCount = 1000; // ลดจำนวนดาวพื้นหลังให้ดูสบายขึ้น ไม่รกตา
    const starArr = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 800 + Math.random() * 200;
      const th = Math.random() * 2 * Math.PI;
      const ph = Math.acos(Math.random());
      starArr[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      starArr[i * 3 + 1] = r * Math.cos(ph);
      starArr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3));
    const starMat = new THREE.PointsMaterial({
      map: dotTexture, color: 0xffffff, size: 6,
      sizeAttenuation: false, transparent: true, opacity: starOpacity, depthWrite: false,
    });
    starMatRef.current = starMat;
    scene.add(new THREE.Points(starGeo, starMat));

    // === Satellite Sprites ===
    const satSpriteMat = new THREE.SpriteMaterial({
      map: dotTexture, color: 0x00c8ff, transparent: true,
      blending: THREE.AdditiveBlending,
    });
    // ขยายขนาดดาวเทียมขึ้นมานิดนึงเพื่อให้คลิกง่ายขึ้น
    const POOL = 3000;
    const sprites = [];
    const satGroup = new THREE.Group();
    for (let i = 0; i < POOL; i++) {
      const s = new THREE.Sprite(satSpriteMat);
      s.scale.set(12, 12, 1);
      s.visible = false;
      satGroup.add(s);
      sprites.push(s);
    }
    scene.add(satGroup);

    // === Resize ===
    const onResize = () => {
      if (!container) return;
      const ww = container.clientWidth;
      const hh = container.clientHeight;
      renderer.setSize(ww, hh);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // === Animation Loop ===
    let raf;
    let lastCalc = 0;

    const animate = (t) => {
      raf = requestAnimationFrame(animate);

      // Update camera look direction
      const phi   = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );

      // Recalculate satellite positions frequently for smooth high-speed simulation
      if (t - lastCalc > 50) {
        lastCalc = t;
        const now = timeRef ? new Date(timeRef.current) : new Date();
        let vis = 0;
        
        // ใช้พิกัดผู้สังเกตล่าสุดจาก observerRef
        const obs = observerRef.current;

        satellites.forEach(sat => {
          const eci = getSatelliteEci(sat.tleLine1, sat.tleLine2, now);
          if (!eci) return;
          const c = getObserverCoordinates(obs.lat, obs.lng, obs.alt, eci, now);
          if (c && c.elevation > 0 && !isNaN(c.elevation) && !isNaN(c.azimuth) && vis < POOL) {
            const R = 500;
            const sp = sprites[vis];
            sp.visible = true;
            // ฝังชื่อและข้อมูลดาวเทียมเอาไว้สำหรับ Raycaster สแกนเจอ
            sp.userData = { name: sat.name, lat: c.elevation, lng: c.azimuth };
            
            sp.position.set(
              R * Math.cos(c.elevation) * Math.sin(c.azimuth),
              R * Math.sin(c.elevation),
              -R * Math.cos(c.elevation) * Math.cos(c.azimuth),
            );
            vis++;
          }
        });
        for (let i = vis; i < POOL; i++) {
          if (!sprites[i].visible) break;
          sprites[i].visible = false;
        }
        setVisibleCount(vis);
      }

      renderer.render(scene, camera);
    };
    animate(0);

    // === Cleanup ===
    return () => {
      canvas.removeEventListener('pointerdown', handleDown);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleUp);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
      starGeo.dispose(); starMat.dispose();
      groundGeo.dispose(); groundMat.dispose();
      satSpriteMat.dispose(); dotTexture.dispose();
    };
  }, [satellites]); // แกะ observer ออกจาก dependency array ป้องกันกล้องรีเซ็ตมุมเมื่อเปลี่ยนสถานที่

  return (
    <div ref={mountRef} className="w-full h-full relative">
      {/* UI Overlay — pointer-events-none on parent but pointer-events-auto on interactive parts */}
      <div className="absolute top-20 left-4 z-20 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/5 pointer-events-none">
        
        <div className="flex items-center gap-3 mb-3 pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <select 
                className="bg-white/10 hover:bg-white/20 text-white font-semibold outline-none border border-white/20 rounded-md px-2 py-1 text-sm appearance-none cursor-pointer transition-colors"
                value={observer.name}
                onChange={(e) => {
                    const loc = LOCATIONS.find(l => l.name === e.target.value);
                    if(loc) setObserver(loc);
                    setSelectedSat(null);
                }}
            >
                {LOCATIONS.map(loc => (
                    <option key={loc.name} value={loc.name} className="bg-gray-900 text-white">{loc.name}</option>
                ))}
            </select>
            <span className="text-gray-400 text-xs">(Location)</span>
        </div>

        <div className="text-sm text-gray-400">
          <div className="flex justify-between items-center w-48 mb-1 pointer-events-auto">
              <span>Latitude:</span>
              {observer.name === 'Custom...' ? (
                  <input type="number" step="0.0001" className="w-24 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-right text-gray-200 outline-none focus:border-blue-500" value={observer.lat} onChange={e => setObserver({...observer, lat: parseFloat(e.target.value) || 0})} />
              ) : (
                  <span className="text-gray-200">{observer.lat.toFixed(4)}°</span>
              )}
          </div>
          <div className="flex justify-between items-center w-48 mb-1 pointer-events-auto">
              <span>Longitude:</span>
              {observer.name === 'Custom...' ? (
                  <input type="number" step="0.0001" className="w-24 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-right text-gray-200 outline-none focus:border-blue-500" value={observer.lng} onChange={e => setObserver({...observer, lng: parseFloat(e.target.value) || 0})} />
              ) : (
                  <span className="text-gray-200">{observer.lng.toFixed(4)}°</span>
              )}
          </div>
          <p className="mt-2 text-blue-400 font-medium">✨ Visible Targets: {visibleCount}</p>
          
          <div className="mt-4 pt-3 border-t border-white/10 pointer-events-auto">
              <div className="flex justify-between items-center mb-1 text-xs">
                  <span>Stars Opacity</span>
                  <span className="text-gray-200">{Math.round(starOpacity * 100)}%</span>
              </div>
              <input 
                  type="range" min="0" max="1" step="0.05"
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 outline-none"
                  value={starOpacity}
                  onChange={e => {
                     const val = parseFloat(e.target.value);
                     setStarOpacity(val);
                     if (starMatRef.current) starMatRef.current.opacity = val;
                  }}
              />
          </div>
        </div>
      </div>
      
      {/* Target Info Popup (แสดงเมื่อคลิกดาวเทียมปุ่มใดปุ่มหนึ่ง) */}
      {selectedSat && (
          <div 
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full pb-4 fade-in"
            style={{ left: selectedSat.x, top: selectedSat.y }}
          >
              <div className="bg-blue-900/80 backdrop-blur-md border border-blue-400/50 rounded-lg px-4 py-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  <p className="text-white font-mono font-bold text-sm tracking-wider">{selectedSat.name}</p>
                  <p className="text-blue-300 text-xs">Tracking Selected</p>
                  
                  {/* สามเหลี่ยมชี้ลง */}
                  <div className="absolute left-1/2 bottom-2 w-3 h-3 bg-blue-900/80 border-b border-r border-blue-400/50 transform -translate-x-1/2 translate-y-full rotate-45"></div>
              </div>
          </div>
      )}

      <div className="absolute bottom-6 left-0 w-full flex justify-center z-20 pointer-events-none">
        <div className="px-6 py-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-white/60 text-xs tracking-[0.2em] shadow-lg shadow-black/50">
          DRAG TO LOOK <span className="opacity-50 px-1">•</span> SCROLL TO ZOOM <span className="opacity-50 px-1">•</span> CLICK TO IDENTIFY
        </div>
      </div>
    </div>
  );
}
