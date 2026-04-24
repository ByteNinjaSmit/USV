import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Settings, StopCircle, RefreshCw, Power, Bot, Hand } from 'lucide-react';

interface ControlPanelProps {
  sendCommand: (type: string, data: any) => void;
  deviceStatus: 'online' | 'offline';
  currentMode: string;
}

export default function ControlPanel({ sendCommand, deviceStatus, currentMode }: ControlPanelProps) {
  const [speed, setSpeed] = useState(150);
  const [conveyorActive, setConveyorActive] = useState(false);

  const disabled = deviceStatus === 'offline' || currentMode === 'auto';

  const handleMove = (direction: string) => {
    let speedLeft = 0;
    let speedRight = 0;
    
    if (direction === 'forward') { speedLeft = speed; speedRight = speed; }
    else if (direction === 'backward') { speedLeft = -speed; speedRight = -speed; }
    else if (direction === 'left') { speedLeft = -speed; speedRight = speed; }
    else if (direction === 'right') { speedLeft = speed; speedRight = -speed; }
    else if (direction === 'stop') { speedLeft = 0; speedRight = 0; }

    sendCommand('motorControl', { direction, speedLeft, speedRight });
  };

  const setAutonomousMode = (active: boolean) => {
    sendCommand('modeSwitch', { mode: active ? 'auto' : 'manual' });
  };

  const toggleConveyor = () => {
    setConveyorActive(!conveyorActive);
    sendCommand('conveyorControl', { active: !conveyorActive, speed: 200 });
  };

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Control Panel
        </h2>
        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${currentMode === 'auto' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
          {currentMode.toUpperCase()}
        </span>
      </div>

      <div className="flex gap-3">
        {currentMode === 'manual' ? (
          <button 
            onClick={() => setAutonomousMode(true)}
            disabled={deviceStatus === 'offline'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50"
          >
            <Bot className="w-5 h-5" /> Start Auto
          </button>
        ) : (
          <button 
            onClick={() => setAutonomousMode(false)}
            disabled={deviceStatus === 'offline'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md disabled:opacity-50"
          >
            <Hand className="w-5 h-5" /> Stop Auto
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <ControlButton icon={<ArrowUp />} onClick={() => handleMove('forward')} disabled={disabled} className="rounded-t-2xl" />
        <div className="flex gap-3">
          <ControlButton icon={<ArrowLeft />} onClick={() => handleMove('left')} disabled={disabled} className="rounded-l-2xl" />
          <ControlButton icon={<StopCircle className="w-8 h-8 text-destructive" />} onClick={() => handleMove('stop')} disabled={disabled} variant="destructive" />
          <ControlButton icon={<ArrowRight />} onClick={() => handleMove('right')} disabled={disabled} className="rounded-r-2xl" />
        </div>
        <ControlButton icon={<ArrowDown />} onClick={() => handleMove('backward')} disabled={disabled} className="rounded-b-2xl" />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-muted-foreground">Motor Speed</span>
            <span className="font-bold">{speed}</span>
          </div>
          <input 
            type="range" 
            min="0" max="255" 
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full accent-primary"
          />
        </div>

        <button 
          onClick={toggleConveyor}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${conveyorActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
        >
          {conveyorActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {conveyorActive ? 'Conveyor Running' : 'Start Conveyor'}
        </button>
      </div>
    </div>
  );
}

function ControlButton({ icon, onClick, disabled, className = '', variant = 'default' }: any) {
  const baseStyle = "w-16 h-16 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-sm",
    destructive: "bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive shadow-sm"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}
