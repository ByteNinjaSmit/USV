import { Activity, Radio, Cpu, Battery, Settings2, AlignCenter } from 'lucide-react';
import Dashboard from './components/Dashboard.tsx';
import ControlPanel from './components/ControlPanel.tsx';
import EventLog from './components/EventLog.tsx';

// --- TELEMETRY DATA SOURCE ---
// Uncomment the 'useRealTelemetry' import and comment 'useMockTelemetry' to use the real WebSocket backend.
// import { useTelemetry } from './hooks/useMockTelemetry';
import { useTelemetry } from './hooks/useRealTelemetry';

function App() {
  const {
    deviceStatus,
    telemetryData,
    events,
    connectionStatus,
    readyState,
    sendCommand,
    isMock
  } = useTelemetry();

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
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              IIoT Floating Waste Collector
              {isMock && (
                <span className="bg-amber-500/20 text-amber-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Mock Data</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium">
            <Radio className={`w-4 h-4 ${readyState === 1 ? 'text-green-500' : 'text-red-500'}`} />
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