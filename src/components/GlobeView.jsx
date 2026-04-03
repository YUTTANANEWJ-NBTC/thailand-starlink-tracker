import { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { getSatellitePosition } from '../lib/satelliteUtils';

// แชร์ Geometry และ Material เพื่อประสิทธิภาพตอนเรนเดอร์ดาวเทียม 6000 ดวง
const satGeom = new THREE.SphereGeometry(0.4, 8, 8);
const satMat = new THREE.MeshBasicMaterial({ color: 0x00c8ff, opacity: 0.9, transparent: true });

export default function GlobeView({ satellites, timeRef }) {
  const globeEl = useRef();
  const [satData, setSatData] = useState([]);

  // หมุนลูกโลกไปยังกรุงเทพฯ โดยอัตโนมัติเมื่อติดตั้ง Component
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 13.7563, lng: 100.5018, altitude: 2.2 }, 1500);
    }
  }, []);

  useEffect(() => {
    // Auto-rotate settings
    if (globeEl.current) {
        globeEl.current.controls().autoRotate = false;
        globeEl.current.controls().autoRotateSpeed = 0.5;
        // set initial zoom
        globeEl.current.pointOfView({ altitude: 2.5 });
    }
  }, []);

  useEffect(() => {
    if (!satellites || satellites.length === 0) return

    const updateGlobeData = () => {
      const now = timeRef ? new Date(timeRef.current) : new Date()
      
      const updatedSats = satellites.map(sat => {
        const pos = getSatellitePosition(sat.tleLine1, sat.tleLine2, now);
        if(!pos) return null;
        return {
          ...sat,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt / 6371 // altitude relative to globe radius (Earth radius = 6371km)
        };
      }).filter(s => s !== null);
      
      setSatData(updatedSats);
    }

    updateGlobeData()
    // อัปเดตบ่อยขึ้นจาก 1000ms เป็น 100ms เพื่อรองรับความเร็ววิดีโอที่เร็วมาก (x16)
    const timer = setInterval(updateGlobeData, 100)

    return () => clearInterval(timer)
  }, [satellites, timeRef]);

  return (
    <div className="w-full h-full cursor-move">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        objectsData={satData}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="alt"
        objectThreeObject={() => new THREE.Mesh(satGeom, satMat)}
      />
      
      <div className="absolute bottom-4 right-4 text-xs text-white/50 pointer-events-none">
        Satellites Tracked: {satData.length.toLocaleString()}
      </div>
    </div>
  );
}
