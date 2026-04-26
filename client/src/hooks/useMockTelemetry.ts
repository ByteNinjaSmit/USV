import { useState, useEffect, useCallback } from 'react';

export function useTelemetry() {
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('online');
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const connectionStatus = 'Open';
  const readyState = 1; // 1 = OPEN in WebSocket ReadyState

  useEffect(() => {
    // Initial static precise data
    const initialTelemetry = Array.from({ length: 50 }).map((_, i) => {
      const now = new Date();
      now.setSeconds(now.getSeconds() - (50 - i));
      return {
        speedLeft: 140 + Math.floor(Math.random() * 20),
        speedRight: 140 + Math.floor(Math.random() * 20),
        distance: 10 + i * 2.5,
        heading: (90 + i * 2) % 360,
        sensors: {
          front: Math.floor(Math.random() * 100) + 50,
          left: Math.floor(Math.random() * 80) + 20,
          right: Math.floor(Math.random() * 80) + 20,
        },
        battery: 85 - Math.floor(i / 10),
        mode: 'auto',
        ts: now.toLocaleTimeString()
      };
    });
    setTelemetryData(initialTelemetry);

    const initialEvents = [
      { id: 1, type: 'machineStarted', ts: Date.now() - 60000, severity: 'info', data: { message: 'System boot sequence completed successfully.' } },
      { id: 2, type: 'conveyorActive', ts: Date.now() - 50000, severity: 'info', data: { message: 'Waste collection conveyor engaged at optimal speed.' } },
      { id: 3, type: 'wasteDetected', ts: Date.now() - 40000, severity: 'info', data: { message: 'Floating debris detected ahead, approaching.' } },
      { id: 4, type: 'obstacleDetected', ts: Date.now() - 25000, severity: 'warning', data: { message: 'Obstacle at 50cm, adjusting course automatically.' } },
      { id: 5, type: 'fault', ts: Date.now() - 10000, severity: 'critical', data: { message: 'Minor sensor latency detected and resolved.' } },
    ].reverse();
    setEvents(initialEvents);

    const interval = setInterval(() => {
      setTelemetryData(prev => {
        const last = prev[prev.length - 1] || initialTelemetry[initialTelemetry.length - 1];
        const updated = [...prev, {
          speedLeft: last.speedLeft + (Math.random() > 0.5 ? 2 : -2),
          speedRight: last.speedRight + (Math.random() > 0.5 ? 2 : -2),
          distance: last.distance + 0.5,
          heading: (last.heading + 1) % 360,
          sensors: {
            front: Math.floor(Math.random() * 100) + 50,
            left: Math.floor(Math.random() * 80) + 20,
            right: Math.floor(Math.random() * 80) + 20,
          },
          battery: last.battery,
          mode: 'auto',
          ts: new Date().toLocaleTimeString()
        }];
        return updated.slice(-50);
      });
      
      if (Math.random() > 0.90) {
        setEvents(prev => {
          const isObstacle = Math.random() > 0.5;
          const newEvent = {
            id: Date.now(),
            type: isObstacle ? 'obstacleDetected' : 'wasteDetected',
            ts: Date.now(),
            severity: isObstacle ? 'warning' : 'info',
            data: { message: isObstacle ? 'Minor object dodged.' : 'Collected small debris.' }
          };
          return [newEvent, ...prev].slice(0, 20);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendCommand = useCallback((type: string, data: any) => {
    console.log("Mock Frontend Action:", type, data);
  }, []);

  return {
    deviceStatus,
    telemetryData,
    events,
    connectionStatus,
    readyState,
    sendCommand,
    isMock: true
  };
}
