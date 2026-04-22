import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Clock, Zap, TrendingUp, MapPin, AlertCircle, CheckCircle, Truck, Wind, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../utils/supabase';

const getRiskColor = (score) => {
  if (score > 80) return '#ef4444';
  if (score > 60) return '#f97316';
  if (score > 40) return '#eab308';
  return '#10b981';
};

const getRiskLabel = (score) => {
  if (score > 80) return 'CRITICAL';
  if (score > 60) return 'HIGH';
  if (score > 40) return 'MEDIUM';
  return 'LOW';
};

export default function Dashboard() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  const [activeShipments, setActiveShipments] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [onTimeProbability, setOnTimeProbability] = useState(0);
  const [selfHealingActions, setSelfHealingActions] = useState(0);
  const [shipmentsList, setShipmentsList] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [riskForecast, setRiskForecast] = useState([]);
  const [disruptionData, setDisruptionData] = useState([]);
  const [allShipments, setAllShipments] = useState([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current, { 
      center: [20, 78], 
      zoom: 5,
      scrollWheelZoom: false 
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB',
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(map);
    
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch active shipments
        const { data: shipments } = await supabase
          .from('shipments')
          .select('*')
          .eq('status', 'in_transit')
          .order('created_at', { ascending: false });

        setAllShipments(shipments || []);
        setActiveShipments(shipments?.length || 0);

        // Get high-risk shipments
        const highRisk = (shipments || [])
          .filter(s => (s.risk_score || 0) > 60)
          .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
          .slice(0, 5);
        setShipmentsList(highRisk);

        // Fetch all alerts
        const { data: alerts } = await supabase
          .from('alerts')
          .select('*')
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(50);

        const alertData = alerts || [];
        const critical = alertData.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
        setCriticalAlerts(critical.length);

        // Generate activity feed
        const feed = alertData.slice(0, 8).map(alert => ({
          id: alert.id,
          time: new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: alert.alert_type?.replace(/_/g, ' ') || 'Alert',
          severity: alert.severity,
          location: alert.location || 'System',
        }));
        setActivityFeed(feed);

        // Generate disruption breakdown
        const disruptions = {
          Weather: critical.filter(a => a.alert_type?.includes('WEATHER')).length,
          'Social Unrest': critical.filter(a => a.alert_type?.includes('PROTEST')).length,
          Infrastructure: critical.filter(a => a.alert_type?.includes('INFRA')).length,
        };
        
        setDisruptionData([
          { name: 'Weather', value: disruptions.Weather, fill: '#ef4444' },
          { name: 'Social Unrest', value: disruptions['Social Unrest'], fill: '#f97316' },
          { name: 'Infrastructure', value: disruptions.Infrastructure, fill: '#eab308' },
        ].filter(d => d.value > 0));

        // Generate risk forecast
        const now = new Date();
        const forecast = Array.from({ length: 6 }, (_, i) => ({
          time: `${String((now.getHours() + i) % 24).padStart(2, '0')}:00`,
          risk: Math.floor((critical.length / Math.max(shipments?.length || 1, 1)) * 100),
        }));
        setRiskForecast(forecast);

        // Calculate on-time probability
        const onTimeCount = (shipments || []).filter(s => !s.risk_score || s.risk_score < 50).length;
        setOnTimeProbability(shipments?.length ? Math.round((onTimeCount / shipments.length) * 100) : 0);

        // Mock self-healing actions
        setSelfHealingActions(Math.floor(Math.random() * 20) + 5);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
  }, []);

  // Update map with shipments
  useEffect(() => {
    const map = mapRef.current;
    if (!map || allShipments.length === 0) return;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add shipment markers
    allShipments.forEach(shipment => {
      const coords = shipment.source 
        ? [shipment.source.lat, shipment.source.lng]
        : null;

      if (!coords) return;

      const color = getRiskColor(shipment.risk_score || 0);
      const emoji = shipment.type === 'water' ? '🚢' : '🚛';

      const marker = L.marker(coords, {
        icon: L.divIcon({
          html: `<div style="font-size:20px;filter:drop-shadow(0 0 8px ${color});">${emoji}</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
        title: shipment.display_id
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:monospace;font-size:11px;color:#1a1a2e">
          <strong>${shipment.display_id}</strong><br/>
          ${shipment.source?.name || 'N/A'} → ${shipment.destination?.name || 'N/A'}<br/>
          Risk: <span style="color:${getRiskColor(shipment.risk_score || 0)}">${getRiskLabel(shipment.risk_score || 0)}</span>
        </div>
      `);
    });

  }, [allShipments]);

  const kpis = [
    {
      label: 'Active Shipments',
      value: activeShipments,
      icon: Truck,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      trend: `+${Math.max(0, activeShipments - 2)}`,
    },
    {
      label: 'Critical Alerts',
      value: criticalAlerts,
      icon: AlertTriangle,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      trend: '+1',
    },
    {
      label: 'On-Time Probability',
      value: `${onTimeProbability}%`,
      icon: Clock,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      trend: '+3%',
    },
    {
      label: 'Self-Healing Actions',
      value: selfHealingActions,
      icon: Zap,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.1)',
      trend: '24h',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time fleet analytics and risk management</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white"
          >
            <RefreshCw size={18} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#050810] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl" style={{ backgroundColor: kpi.bg }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{kpi.trend}</span>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-1">{kpi.value}</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Live Map + Risk Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mini Live Map */}
        <div className="lg:col-span-2 bg-[#050810] border border-white/5 p-8 rounded-2xl">
          <h2 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
            <MapPin size={16} /> Live Fleet Tracking
            <span className="text-slate-400 font-normal">({activeShipments} Active)</span>
          </h2>
          <div 
            ref={mapContainerRef}
            className="h-80 w-full rounded-xl border border-white/10 overflow-hidden"
            style={{ background: '#030407' }}
          />
        </div>

        {/* Risk Forecast */}
        <div className="bg-[#050810] border border-white/5 p-8 rounded-2xl">
          <h2 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
            <TrendingUp size={16} /> Risk Forecast
            <span className="text-slate-400 font-normal">(6H)</span>
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskForecast} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#050810', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Disruption + High-Risk Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Disruption Breakdown */}
        <div className="bg-[#050810] border border-white/5 p-8 rounded-2xl">
          <h2 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
            <Wind size={16} /> Disruption Breakdown
          </h2>
          <div className="h-64 w-full flex items-center justify-center">
            {disruptionData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disruptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {disruptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050810', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <CheckCircle size={40} className="text-emerald-500/50 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-semibold">No Major Disruptions</p>
                <p className="text-slate-600 text-xs mt-1">Fleet running smoothly</p>
              </div>
            )}
          </div>
          {disruptionData.filter(d => d.value > 0).length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
              {disruptionData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></div>
                    <span className="text-slate-400 font-semibold">{item.name}</span>
                  </div>
                  <span className="text-white font-black">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High-Risk Shipments */}
        <div className="lg:col-span-2 bg-[#050810] border border-white/5 p-8 rounded-2xl">
          <h2 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
            <AlertTriangle size={16} /> High-Risk Shipments
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {shipmentsList.length > 0 ? (
              shipmentsList.map((shipment, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-white font-black text-sm tracking-tight">{shipment.display_id}</span>
                        <span 
                          className="text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex-shrink-0"
                          style={{ 
                            backgroundColor: getRiskColor(shipment.risk_score || 0) + '20',
                            color: getRiskColor(shipment.risk_score || 0)
                          }}
                        >
                          {getRiskLabel(shipment.risk_score || 0)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {shipment.source?.name || 'N/A'} → {shipment.destination?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-black text-lg" style={{ color: getRiskColor(shipment.risk_score || 0) }}>
                        {Math.round(shipment.risk_score || 0)}%
                      </p>
                      <p className="text-slate-500 text-[8px] uppercase tracking-widest">Risk</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs border-t border-white/5 pt-2">
                    💡 Monitor for disruptions on {shipment.source?.name || 'current'} corridor
                  </p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-48 text-center">
                <div>
                  <Truck size={40} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-semibold">No High-Risk Shipments</p>
                  <p className="text-slate-600 text-xs mt-1">All shipments operating normally</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Activity Feed */}
      <div className="bg-[#050810] border border-white/5 p-8 rounded-2xl">
        <h2 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
          <AlertCircle size={16} /> System Activity Feed
        </h2>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activityFeed.length > 0 ? (
            activityFeed.map((event, i) => (
              <div key={i} className="flex items-start gap-4 pb-3 border-b border-white/5 last:border-b-0">
                <div className="flex-shrink-0 mt-1">
                  {event.severity === 'CRITICAL' || event.severity === 'HIGH' ? (
                    <div className="relative">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping absolute"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full relative"></div>
                    </div>
                  ) : (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-black uppercase tracking-tight break-words">{event.message}</p>
                  <p className="text-slate-400 text-[10px] mt-1">
                    {event.time} • {event.location}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-xs text-center py-6">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
