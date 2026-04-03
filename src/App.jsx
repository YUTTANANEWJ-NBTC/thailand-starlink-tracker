import { useState, useEffect, useRef } from 'react'
import GlobeView from './components/GlobeView'
import SkyView from './components/SkyView'
import DomeView from './components/DomeView'
import { fetchStarlinkTLE } from './lib/tleManager'

function App() {
  const [viewMode, setViewMode] = useState('globe') 
  const [satellites, setSatellites] = useState([])
  const [loading, setLoading] = useState(true)
  
  // ระบบเวลาจำลอง
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(1)
  useEffect(() => { speedRef.current = speed; }, [speed])

  const simulatedTimeRef = useRef(Date.now())
  const lastRealTimeRef = useRef(Date.now())
  const [uiTime, setUiTime] = useState(Date.now())

  useEffect(() => {
    let raf;
    const tick = () => {
       const now = Date.now();
       const dt = now - lastRealTimeRef.current;
       lastRealTimeRef.current = now;
       simulatedTimeRef.current += dt * speedRef.current;
       raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // อัปเดตนาฬิกา UI ให้บ่อยขึ้นเพื่อให้เห็นวินาทีวิ่งรัวๆ เวลากด x16
  useEffect(() => {
    const timer = setInterval(() => setUiTime(simulatedTimeRef.current), 100);
    return () => clearInterval(timer);
  }, []);

  const resetToPresent = () => {
    simulatedTimeRef.current = Date.now();
    lastRealTimeRef.current = Date.now();
    setSpeed(1);
  };

  // ฟอร์แมตเวลา YYYY MM DD HH:MM:SS
  const formatTime = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${yyyy} ${mm} ${dd} ${hh}:${mins}:${ss}`;
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await fetchStarlinkTLE()
      setSatellites(data)
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <div className="w-full h-full flex flex-col relative bg-[#050505] overflow-hidden font-sans text-gray-200">
      <div className="absolute top-4 left-4 z-10 flex gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
        <button 
          onClick={() => setViewMode('globe')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === 'globe' ? 'bg-blue-600/90 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
          Globe View
        </button>
        <button 
          onClick={() => setViewMode('sky')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === 'sky' ? 'bg-blue-600/90 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
          3D Stellarium View
        </button>
        <button 
          onClick={() => setViewMode('dome')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === 'dome' ? 'bg-blue-600/90 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
          Sky Circle View
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 text-white/90 font-mono tracking-widest pointer-events-none">
        <div className="flex items-center gap-3">
          {/* Speed Control Container: makes elements inside clickable */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg px-2 py-1 pointer-events-auto">
            <span className="text-xs text-blue-400 font-semibold px-2">SPEED</span>
            {[1, 2, 4, 8, 16].map(s => (
                <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors ${speed === s ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.8)]' : 'hover:bg-white/10 text-gray-400'}`}
                >
                    x{s}
                </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 items-end pointer-events-auto">
            <div className="p-2 px-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg text-sm bg-gradient-to-br from-blue-900/40 to-black/40">
              {formatTime(new Date(uiTime))}
            </div>
            <button 
                onClick={resetToPresent}
                className="text-[10px] uppercase font-bold tracking-[0.15em] text-blue-300 bg-black/50 border border-blue-500/30 rounded px-2 py-1 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:bg-blue-600 hover:text-white hover:border-transparent transition-all"
                title="Reset to real world present time"
            >
              Present Time
            </button>
          </div>
        </div>
      </div>

      {/* Banner ตรงกลางด้านบน */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center w-max">
        <h1 className="text-lg md:text-2xl font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] uppercase">
          THAILAND STARLINK TRACKING SIMULATION
        </h1>
        <div className="w-full h-[1px] mt-1.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      </div>
      
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-blue-500 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin"></div>
          <p className="text-sm tracking-widest uppercase opacity-70 drop-shadow-lg">Acquiring Orbital Data...</p>
        </div>
      ) : (
        <div className="w-full h-full flex-1 relative fade-in">
            {viewMode === 'globe' && <GlobeView satellites={satellites} timeRef={simulatedTimeRef} />}
            {viewMode === 'sky' && <SkyView satellites={satellites} timeRef={simulatedTimeRef} />}
            {viewMode === 'dome' && <DomeView satellites={satellites} timeRef={simulatedTimeRef} />}
        </div>
      )}
    </div>
  )
}

export default App
