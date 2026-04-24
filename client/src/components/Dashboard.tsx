import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Waves, Navigation, Compass, ShieldAlert } from 'lucide-react';

interface DashboardProps {
  telemetryData: any[];
  currentTelemetry: any;
}

export default function Dashboard({ telemetryData, currentTelemetry }: DashboardProps) {
  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          icon={<Navigation className="w-5 h-5 text-blue-500" />}
          title="Speed (L/R)"
          value={`${currentTelemetry?.speedLeft || 0} / ${currentTelemetry?.speedRight || 0}`}
          unit="PWM"
        />
        <MetricCard 
          icon={<Waves className="w-5 h-5 text-cyan-500" />}
          title="Distance"
          value={currentTelemetry?.distance?.toFixed(2) || '0.00'}
          unit="m"
        />
        <MetricCard 
          icon={<Compass className="w-5 h-5 text-purple-500" />}
          title="Heading"
          value={currentTelemetry?.heading || '0'}
          unit="°"
        />
        <MetricCard 
          icon={<ShieldAlert className="w-5 h-5 text-orange-500" />}
          title="Front Sonar"
          value={currentTelemetry?.sensors?.front || '0'}
          unit="cm"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Speed Telemetry</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="ts" stroke="currentColor" className="opacity-50 text-xs" />
                <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Line type="monotone" dataKey="speedLeft" stroke="#3b82f6" strokeWidth={2} dot={false} name="Left Speed" />
                <Line type="monotone" dataKey="speedRight" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Right Speed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Proximity Sensors</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="ts" stroke="currentColor" className="opacity-50 text-xs" />
                <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="sensors.front" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.2} name="Front" />
                <Area type="monotone" dataKey="sensors.left" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Left" />
                <Area type="monotone" dataKey="sensors.right" stackId="3" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} name="Right" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, unit }: { icon: React.ReactNode, title: string, value: string | number, unit: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm flex items-start gap-4">
      <div className="bg-muted/50 p-2.5 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">
          {value} <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );
}
