import { useState, useEffect, useCallback } from 'react';
import useCustomWebSocket, { ReadyState } from './useCustomWebSocket';

const WS_URL = 'ws://localhost:3000';

export function useTelemetry() {
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
        deviceId: 'esp32-01',
        msgId: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data
      }));
    }
  }, [readyState, sendMessage]);

  return {
    deviceStatus,
    telemetryData,
    events,
    connectionStatus,
    readyState,
    sendCommand,
    isMock: false
  };
}
