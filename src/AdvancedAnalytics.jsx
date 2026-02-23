// ========== ANALYTICS AVANCÉS - COMPOSANT PRINCIPAL ==========
// À intégrer dans App.jsx comme nouvelle section

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, ScatterChart, Scatter
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ========== COULEURS THEME ANALYTICS ==========
const ANALYTICS_COLORS = {
  primary: '#667eea',
  secondary: '#764ba2', 
  accent: '#f093fb',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#06b6d4',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  chartColors: ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#fbbf24', '#ef4444', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']
};

// ========== FONCTIONS DE CALCUL DES DONNÉES ==========
const calculateAnalytics = (orders, reservations, menuItems) => {
  // Top 10 produits
  const productCounts = {};
  orders.forEach(order => {
    order.items?.forEach(item => {
      productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
    });
  });
  
  const topProducts = Object.entries(productCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Heures de pointe
  const hourlyStats = {};
  for (let i = 0; i < 24; i++) {
    hourlyStats[i] = 0;
  }
  
  orders.forEach(order => {
    const hour = new Date(order.created_at).getHours();
    hourlyStats[hour]++;
  });
  
  const peakHours = Object.entries(hourlyStats).map(([hour, count]) => ({
    hour: `${hour}h`,
    commandes: count,
    hourNum: parseInt(hour)
  }));

  // Panier moyen
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageOrder = orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0;

  // Revenue par jour (7 derniers jours)
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayOrders = orders.filter(order => 
      order.created_at.split('T')[0] === dateStr
    );
    
    const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    last7Days.push({
      date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      revenue: dayRevenue,
      orders: dayOrders.length,
      fullDate: dateStr
    });
  }

  // Répartition par statut
  const statusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status === 'pending' ? 'En attente' : 
          status === 'preparing' ? 'En préparation' :
          status === 'ready' ? 'Prêt' :
          status === 'delivered' ? 'Livré' : 'Annulé',
    value: count,
    status
  }));

  return {
    topProducts,
    peakHours,
    averageOrder,
    totalRevenue,
    last7Days,
    statusData,
    totalOrders: orders.length,
    totalReservations: reservations.length
  };
};

// ========== COMPOSANTS DE CARTES ANALYTICS ==========
const AnalyticsCard = ({ title, value, subtitle, icon, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {value}
        </p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
            <span>{trend > 0 ? '↗️' : '↘️'}</span>
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`text-4xl opacity-20`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

// ========== COMPOSANT GRAPHIQUE PERSONNALISÉ ==========
const ChartContainer = ({ title, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 ${className}`}
  >
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      {title}
    </h3>
    <div className="w-full h-80">
      {children}
    </div>
  </motion.div>
);

// ========== COMPOSANT PRINCIPAL ANALYTICS ==========
const AdvancedAnalytics = ({ orders, reservations, menuItems }) => {
  const [timeFilter, setTimeFilter] = useState('7days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Filtrer les données selon la période
  const filteredData = useMemo(() => {
    const now = new Date();
    let filterDate = new Date();
    
    switch (timeFilter) {
      case '24h':
        filterDate.setHours(now.getHours() - 24);
        break;
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        filterDate = new Date(0);
    }

    const filteredOrders = orders.filter(order => 
      new Date(order.created_at) >= filterDate
    );
    const filteredReservations = reservations.filter(res => 
      new Date(res.created_at || res.date) >= filterDate
    );

    return { 
      orders: filteredOrders, 
      reservations: filteredReservations 
    };
  }, [orders, reservations, timeFilter]);

  const analytics = useMemo(() => 
    calculateAnalytics(filteredData.orders, filteredData.reservations, menuItems), 
    [filteredData, menuItems]
  );

  const timeFilters = [
    { value: '24h', label: '24h' },
    { value: '7days', label: '7 jours' },
    { value: '30days', label: '30 jours' },
    { value: '90days', label: '90 jours' }
  ];

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header avec filtres */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 Analytics Avancés
          </h1>
          <p className="text-gray-600 mt-1">Analyse détaillée de vos performances</p>
        </div>
        
        <div className="flex gap-2">
          {timeFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeFilter === filter.value
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cartes de métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Chiffre d'affaires"
          value={`${analytics.totalRevenue}€`}
          subtitle={`${analytics.totalOrders} commandes`}
          icon="💰"
          color="from-green-600 to-emerald-600"
          trend={12.5}
        />
        <AnalyticsCard
          title="Panier moyen"
          value={`${analytics.averageOrder}€`}
          subtitle="Par commande"
          icon="🛒"
          color="from-blue-600 to-cyan-600"
          trend={8.2}
        />
        <AnalyticsCard
          title="Commandes"
          value={analytics.totalOrders}
          subtitle="Période sélectionnée"
          icon="📦"
          color="from-purple-600 to-pink-600"
          trend={-3.1}
        />
        <AnalyticsCard
          title="Réservations"
          value={analytics.totalReservations}
          subtitle="Période sélectionnée"
          icon="📅"
          color="from-orange-600 to-red-600"
          trend={15.7}
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du CA */}
        <ChartContainer title="📈 Évolution du chiffre d'affaires">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.last7Days}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="date" stroke="#666" fontSize={12}/>
              <YAxis stroke="#666" fontSize={12}/>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#667eea" 
                strokeWidth={3}
                fill="url(#revenueGradient)"
                name="Revenus (€)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Heures de pointe */}
        <ChartContainer title="⏰ Heures de pointe">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="hour" stroke="#666" fontSize={12}/>
              <YAxis stroke="#666" fontSize={12}/>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Bar 
                dataKey="commandes" 
                fill="#764ba2" 
                name="Commandes"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top produits */}
        <ChartContainer title="🏆 Top 5 Produits" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.topProducts.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" stroke="#666" fontSize={12}/>
              <YAxis dataKey="name" type="category" width={120} stroke="#666" fontSize={12}/>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="count" fill="#f093fb" name="Vendus" radius={[0, 4, 4, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Répartition statuts */}
        <ChartContainer title="📊 Statuts commandes">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analytics.statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
              >
                {analytics.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS.chartColors[index % ANALYTICS_COLORS.chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Insights automatiques */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 border border-purple-200"
      >
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
          🧠 Insights automatiques
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4">
            <div className="text-2xl mb-2">🔥</div>
            <h4 className="font-semibold text-gray-800">Heure de pointe</h4>
            <p className="text-sm text-gray-600">
              {analytics.peakHours.sort((a, b) => b.commandes - a.commandes)[0]?.hour} 
              ({analytics.peakHours.sort((a, b) => b.commandes - a.commandes)[0]?.commandes} commandes)
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-2xl mb-2">⭐</div>
            <h4 className="font-semibold text-gray-800">Produit star</h4>
            <p className="text-sm text-gray-600">
              {analytics.topProducts[0]?.name} ({analytics.topProducts[0]?.count} vendus)
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-2xl mb-2">💡</div>
            <h4 className="font-semibold text-gray-800">Recommandation</h4>
            <p className="text-sm text-gray-600">
              {analytics.averageOrder < 20 ? 'Proposez des menus pour augmenter le panier' : 'Excellent panier moyen !'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedAnalytics;