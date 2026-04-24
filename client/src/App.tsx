import { useState, useEffect, useCallback } from 'react';
import useCustomWebSocket, { ReadyState } from './hooks/useCustomWebSocket';
import { Activity, Radio, Cpu, Battery, Settings2, AlignCenter } from 'lucide-react';
import Dashboard from './components/Dashboard.tsx';
import ControlPanel from './components/ControlPanel.tsx';
import EventLog from './components/EventLog.tsx';

const WS_URL = 'ws://localhost:3000';

function App() {
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('offline');
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const { sendMessage, lastMessage, readyState } = useCustomWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState] || 'Unknown';

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({ 
        type: 'init-frontend', 
        frontendId: `web-${Date.now()}`
      }));
    }
  }, [readyState, sendMessage]);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const msg = JSON.parse(lastMessage.data);
        
        if (msg.type === 'deviceStatus') {
          setDeviceStatus(msg.data.status);
        } else if (msg.type === 'telemetry') {
          setTelemetryData(prev => {
            const updated = [...prev, { ...msg.data, ts: new Date().toLocaleTimeString() }];
            return updated.slice(-50); // Keep last 50
          });
        } else if (['obstacleDetected', 'wasteDetected', 'fault', 'conveyorActive', 'machineStarted', 'machineStopped'].includes(msg.type)) {
          setEvents(prev => [{ ...msg, id: Date.now() }, ...prev].slice(0, 20));
        }
      } catch (e) {
        console.error("Failed to parse msg:", e);
      }
    }
  }, [lastMessage]);

  const sendCommand = useCallback((type: string, data: any) => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        type,
        source: 'frontend',
        deviceId: 'esp32-01', // hardcoded for now
        msgId: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data
      }));
    }
  }, [readyState, sendMessage]);

  const currentTelemetry = telemetryData.length > 0 ? telemetryData[telemetryData.length - 1] : null;

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-zinc-950 p-6 flex flex-col gap-6">
      <header className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading">AquaBot Dashboard</h1>
            <p className="text-sm text-muted-foreground">IIoT Floating Waste Collector</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium">
            <Radio className={`w-4 h-4 ${readyState === ReadyState.OPEN ? 'text-green-500' : 'text-red-500'}`} />
            Server: {connectionStatus}
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium">
            <Cpu className={`w-4 h-4 ${deviceStatus === 'online' ? 'text-green-500' : 'text-red-500'}`} />
            Robot: {deviceStatus.toUpperCase()}
          </div>
          {currentTelemetry?.battery && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium">
              <Battery className="w-4 h-4 text-emerald-500" />
              {currentTelemetry.battery}%
            </div>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Dashboard telemetryData={telemetryData} currentTelemetry={currentTelemetry} />
        </div>
        <div className="flex flex-col gap-6">
          <ControlPanel sendCommand={sendCommand} deviceStatus={deviceStatus} currentMode={currentTelemetry?.mode || 'manual'} />
          <EventLog events={events} />
        </div>
      </main>
    </div>
  );
}

export default App;