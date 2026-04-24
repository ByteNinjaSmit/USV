import { AlertCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react';

interface EventLogProps {
  events: any[];
}

export default function EventLog({ events }: EventLogProps) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-[300px]">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" /> System Events
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No recent events
          </div>
        ) : (
          events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

function EventItem({ event }: { event: any }) {
  const getIcon = () => {
    switch (event.severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getFormatTime = () => {
    return new Date(event.ts || Date.now()).toLocaleTimeString();
  };

  const formatType = (type: string) => {
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/40 border border-border/50 text-sm">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold">{formatType(event.type)}</span>
          <span className="text-xs text-muted-foreground">{getFormatTime()}</span>
        </div>
        <div className="text-muted-foreground text-xs">
          {event.data?.message || JSON.stringify(event.data)}
        </div>
      </div>
    </div>
  );
}
