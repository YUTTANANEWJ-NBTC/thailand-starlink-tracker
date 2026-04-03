import { useEffect, useRef, useState } from 'react';
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

export default function DomeView({ satellites, timeRef }) {
  const canvasRef = useRef(null);
  const [observer, setObserver] = useState(LOCATIONS[0]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedSat, setSelectedSat] = useState(null);
  const drawnSatsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Event Listener สำหรับเช็คการคลิก
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      let closest = null;
      let minDist = 20; // 20px รัศมีการคลิก 

      for (const sat of drawnSatsRef.current) {
         const d = Math.hypot(sat.x - pointerX, sat.y - pointerY);
         if (d < minDist) {
            minDist = d;
            closest = sat;
         }
      }

      if (closest) {
         setSelectedSat({ name: closest.name, x: e.clientX, y: e.clientY });
      } else {
         setSelectedSat(null);
      }
    };
    canvas.addEventListener('click', handleClick);

    let animationId;
    let lastCount = 0;
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      // รัศมีของโดมท้องฟ้า
      const radius = Math.min(cx, cy) * 0.85;
      
      // พื้นหลัง
      const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height));
      bgGradient.addColorStop(0, '#0a0f1d'); 
      bgGradient.addColorStop(1, '#02050a'); 
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0,0,width,height);
      
      // ขอบฟ้า
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#050a14'; 
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // เข็มทิศ
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const offset = radius + 20;
      ctx.fillText('N', cx, cy - offset);
      ctx.fillText('S', cx, cy + offset);
      ctx.fillText('E', cx + offset, cy);
      ctx.fillText('W', cx - offset, cy);

      // เส้นตาราง
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      [0.25, 0.5, 0.75].forEach(scale => {
         ctx.beginPath();
         ctx.arc(cx, cy, radius * scale, 0, 2 * Math.PI);
         ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
      ctx.stroke();

      // วาดดาวเทียม
      const now = timeRef ? new Date(timeRef.current) : new Date();
      let currentVisible = 0;
      const currentDrawn = [];
      
      satellites.forEach(sat => {
        const eci = getSatelliteEci(sat.tleLine1, sat.tleLine2, now);
        if(!eci) return;
        
        const coords = getObserverCoordinates(observer.lat, observer.lng, observer.alt, eci, now);
        
        // ถ้าอยู่เหนือขอบฟ้า (Elevation > 0)
        if (coords && coords.elevation > 0) {
            currentVisible++;
            
            // ยก Zenith (90 องศา) ไว้ตรงกลาง
            const r = radius * (1 - coords.elevation / (Math.PI / 2));
            
            // ให้ N=-Y (ปกติ Azimuth 0 คือทิศเหนือ หันตามเข็มนาฬิกา)
            // ใน Canvas แนวนอน X แนวนอน Y บนลงล่าง ต้องแปลงเพื่อให้ 0 องศาชี้ขึ้น
            const theta = coords.azimuth - Math.PI / 2;
            
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 200, 255, 0.9)'; 
            ctx.fill();
            
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0, 200, 255, 1)';
            ctx.fill();
            ctx.shadowBlur = 0; 
            
            // เก็บข้อมูลไว้สำหรับการคลิก
            currentDrawn.push({ name: sat.name, x, y });
        }
      });
      drawnSatsRef.current = currentDrawn;

      if (currentVisible !== lastCount) {
        lastCount = currentVisible;
        setVisibleCount(currentVisible);
      }

      animationId = requestAnimationFrame(draw);
    };
    
    animationId = requestAnimationFrame(draw);
    
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
    };
  }, [satellites, observer]);

  return (
    <div className="w-full h-full relative cursor-crosshair bg-[#02050a] flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      <div className="absolute top-20 left-4 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/5 pointer-events-none">
        
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
        </div>
      </div>

      {/* Target Info Popup */}
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

      {/* Hint Bubble */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center z-20 pointer-events-none">
        <div className="px-6 py-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-white/60 text-xs tracking-[0.2em] shadow-lg shadow-black/50">
          CLICK ON TARGET TO IDENTIFY
        </div>
      </div>
    </div>
  );
}
