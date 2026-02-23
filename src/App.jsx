import React, { useState, useEffect, useCallback } from 'react';
import { Menu, X, Plus, Edit2, Trash2, Phone, Users, BarChart3, ShoppingBag, DollarSign, Building2, Eye, EyeOff, Package, LogOut, Calendar, ChefHat} from 'lucide-react';
import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion'; 
import toast, { Toaster } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AdvancedAnalytics from './AdvancedAnalytics'; // ← NOUVEAU




// ========== FULLCALENDAR ========== 
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
// ========== FIN FULLCALENDAR ==========

// Fonction pour demander la permission de notifications
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('❌ Les notifications ne sont pas supportées');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    console.log('✅ Permission notifications déjà accordée');
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('✅ Permission notifications accordée');
      return true;
    }
  }
  
  console.log('❌ Permission notifications refusée');
  return false;
};

// Fonction pour enregistrer le service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker enregistré:', registration.scope);
      
      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Nouvelle version du Service Worker détectée');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ Nouvelle version prête');
            // Optionnel: Afficher un toast pour informer l'utilisateur
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('❌ Erreur enregistrement Service Worker:', error);
      return null;
    }
  }
  return null;
};

// Fonction pour envoyer une notification
const sendNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.log('❌ Notifications non supportées');
    return;
  }
  
  if (Notification.permission !== 'granted') {
    console.log('❌ Permission notifications non accordée');
    return;
  }
  
  const defaultOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options
  };
  
  // Si service worker disponible, utiliser showNotification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, defaultOptions);
    });
  } else {
    // Sinon utiliser Notification API directe
    new Notification(title, defaultOptions);
  }
};





const calendarStyles = `
  .fc {
    font-family: inherit;
  }
  .fc-event {
    cursor: pointer;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
    border: none !important;
  }
  .fc-event-main {
    padding: 4px;
  }
  .fc-event-title {
    font-weight: 600;
  }
  .fc-toolbar-title {
    font-size: 1.5rem !important;
    font-weight: bold;
    color: #1e3a5f;
  }
  .fc-button {
    background-color: #1e3a5f !important;
    border: none !important;
    text-transform: capitalize;
    font-weight: 500;
  }
  .fc-button:hover {
    background-color: #ff8c42 !important;
  }
  .fc-button-active {
    background-color: #ff8c42 !important;
  }
  .fc-daygrid-day:hover {
    background-color: #f3f4f6;
    cursor: pointer;
  }
`;

// Injecter les styles dans le document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = calendarStyles;
  document.head.appendChild(styleElement);
}
// ========== FIN STYLES ==========



const initialData = {
  restaurants: [],
  users: [],
  menuCategories: [],
  menuItems: [],
  orders: [],
  reservations: []
};

// ========== COMPOSANT ANIMATED NUMBER ========== 
const AnimatedNumber = ({ value, duration = 1 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    
    // Si la valeur finale est 0, pas besoin d'animer
    if (end === 0) {
      setCount(0);
      return;
    }

    // Calculer l'incrément
    const increment = end / 30; // 30 frames
    const stepTime = (duration * 1000) / 30; // Durée par frame

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};
// ========== FIN ANIMATED NUMBER ==========




export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [data, setData] = useState(initialData);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [calendarView, setCalendarView] = useState('calendar'); // 'calendar' ou 'table'
  const [orderStatusFilter, setOrderStatusFilter] = useState('active');
  const [kitchenSoundEnabled, setKitchenSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);  
  const [dashboardPeriod, setDashboardPeriod] = useState('today'); // 'today', 'week', 'month', 'all'
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);




  // ========== FONCTION DE CHARGEMENT DES DONNÉES (extraite pour être réutilisable) ========== 
  const loadData = useCallback(async () => {
    try {
      const { data: restaurants } = await supabase.from('restaurants').select('*');
      const { data: users } = await supabase.from('users').select('*');
      const { data: categories } = await supabase.from('menu_categories').select('*').order('order_position');
      const { data: items } = await supabase.from('menu_items').select('*');
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: reservations } = await supabase.from('reservations').select('*').order('date', { ascending: true });

      const formattedCategories = categories?.map(cat => ({
        id: cat.id,
        restaurantId: cat.restaurant_id,
        name: cat.name,
        order: cat.order_position
      })) || [];

      const formattedItems = items?.map(item => ({
        id: item.id,
        restaurantId: item.restaurant_id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        basePrice: item.base_price,
        menuPrice: item.menu_price,
        available: item.available
      })) || [];

      const formattedOrders = orders?.map(order => ({
        id: order.id,
        restaurantId: order.restaurant_id,
        customer_phone: order.customer_phone,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        items: order.items,
        created_at: order.created_at,
        cancelled_at: order.cancelled_at
      })) || [];

      const formattedReservations = reservations?.map(res => ({
        id: res.id,
        restaurantId: res.restaurant_id,
        customerName: res.customer_name,
        customerPhone: res.customer_phone,
        customerEmail: res.customer_email,
        date: res.date,
        time: res.time,
        numberOfPeople: res.number_of_people,
        status: res.status,
        notes: res.notes
      })) || [];

      setData({
        restaurants: restaurants || [],
        users: users || [],
        menuCategories: formattedCategories,
        menuItems: formattedItems,
        orders: formattedOrders,
        reservations: formattedReservations
      });

      console.log('✅ Données chargées:', {
        restaurants: restaurants?.length,
        users: users?.length,
        categories: formattedCategories.length,
        items: formattedItems.length,
        orders: formattedOrders.length,
        reservations: formattedReservations.length
      });
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    }
  }, []);


  // useEffect POUR INITIALISER LE PWA ===== //

useEffect(() => {
  // Enregistrer le service worker
  const initPWA = async () => {
    const registration = await registerServiceWorker();
    setSwRegistration(registration);
    
    // Demander permission notifications
    const hasPermission = await requestNotificationPermission();
    setNotificationsEnabled(hasPermission);
  };
  
  initPWA();
  
  // Détecter si installé comme PWA
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA installée !');
    toast.success('Application installée avec succès !');
  });
  
  // Détecter mode standalone (installé)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) {
    console.log('📱 Application lancée en mode standalone');
  }
}, []);




  // ========== useEffect SUPABASE REALTIME ========== 
  useEffect(() => {
  if (!isLoggedIn) return;

  loadData();

  const ordersChannel = supabase
    .channel('orders-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('🔄 Changement orders:', payload);
      loadData();
      
      if (payload.eventType === 'INSERT') {
        const newOrder = payload.new;
        toast.success('📦 Nouvelle commande !');
        playNotificationSound();
        
        // ========== NOUVEAU : NOTIFICATION PWA ==========
        if (notificationsEnabled) {
          sendNotification('🍔 Nouvelle commande !', {
            body: `Commande #${newOrder.order_number || 'N/A'} - ${newOrder.total}€`,
            tag: `order-${newOrder.id}`,
            data: {
              url: '/?section=kitchen',
              orderId: newOrder.id
            },
            actions: [
              {
                action: 'view',
                title: '👀 Voir',
                icon: '/icons/icon-96x96.png'
              }
            ]
          });
        }
        // ========== FIN NOUVEAU CODE ==========
      }
    })
    .subscribe();

  const reservationsChannel = supabase
    .channel('reservations-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
      console.log('🔄 Changement reservations:', payload);
      loadData();
      
      if (payload.eventType === 'INSERT') {
        const newReservation = payload.new;
        toast.success('📅 Nouvelle réservation !');
        playNotificationSound();
        
        // ========== NOUVEAU : NOTIFICATION PWA ==========
        if (notificationsEnabled) {
          sendNotification('📅 Nouvelle réservation !', {
            body: `${newReservation.customer_name} - ${newReservation.number_of_people} pers.\n${newReservation.date} à ${newReservation.time}`,
            tag: `reservation-${newReservation.id}`,
            data: {
              url: '/?section=reservations',
              reservationId: newReservation.id
            },
            actions: [
              {
                action: 'view',
                title: '👀 Voir',
                icon: '/icons/icon-96x96.png'
              }
            ]
          });
        }
        // ========== FIN NOUVEAU CODE ==========
      }
    })
    .subscribe();

  return () => {
    ordersChannel.unsubscribe();
    reservationsChannel.unsubscribe();
  };
}, [isLoggedIn, currentUser, selectedRestaurant, loadData, notificationsEnabled]); // ← Ajouter notificationsEnabled

  // ========== Restaurer session ========== 
  useEffect(() => {
  const savedUser = localStorage.getItem('currentUser');
  const savedRestaurant = localStorage.getItem('selectedRestaurant');
  
  if (savedUser && savedUser !== 'undefined') {
    try {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      console.log('✅ Session restaurée:', user);
    } catch (error) {
      console.error('❌ Erreur parsing user:', error);
      localStorage.removeItem('currentUser');
    }
  }
  
  if (savedRestaurant && savedRestaurant !== 'undefined') {
    try {
      const resto = JSON.parse(savedRestaurant);
      setSelectedRestaurant(resto);
    } catch (error) {
      console.error('❌ Erreur parsing restaurant:', error);
      localStorage.removeItem('selectedRestaurant');
    }
  }
}, []);
  // ========== LISTENER PLEIN ÉCRAN (CORRIGÉ - maintenant dans App()) ========== 
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleLogin = async () => {
  setLoginError('');
  console.log('🔐 Tentative de connexion avec:', username);

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username);

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      setLoginError('Erreur de connexion');
      return;
    }

    console.log('👥 Utilisateurs trouvés:', users);

    if (!users || users.length === 0) {
      setLoginError('Utilisateur non trouvé');
      return;
    }

    const user = users[0];
    
    // ===== DÉBOGAGE : Afficher la structure de l'utilisateur =====
    console.log('🔍 Structure user:', {
      id: user.id,
      username: user.username,
      password: user.password ? 'EXISTS' : 'MISSING',
      password_hash: user.password_hash ? 'EXISTS' : 'MISSING',
      role: user.role
    });

    // ===== VÉRIFICATION : Quel champ contient le mot de passe ? =====
    const passwordField = user.password_hash || user.password;
    
    if (!passwordField) {
      console.error('❌ Aucun champ de mot de passe trouvé !');
      setLoginError('Configuration incorrecte');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, passwordField);

    if (!isPasswordValid) {
      setLoginError('Mot de passe incorrect');
      return;
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      name: user.name
    };

    setCurrentUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    if (user.restaurant_id) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', user.restaurant_id)
        .single();
      
      if (restaurant) {
        setSelectedRestaurant(restaurant);
        localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
      }
    }

    console.log('✅ Connexion réussie !', userData);
  } catch (error) {
    console.error('💥 ERREUR:', error);
    setLoginError('Erreur: ' + error.message);
  }
};

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedRestaurant(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedRestaurant');
    console.log('👋 Déconnexion');
  };

  const handleFormSubmit = async () => {
    console.log('📝 Soumission formulaire:', modalType, formData);
    
    
    if (modalType === 'restaurant') {
      if (formData.id) {
        const { error } = await supabase.from('restaurants').update({
          name: formData.name,
          address: formData.address,
          cuisine_type: formData.cuisineType,
          hours: formData.hours
        }).eq('id', formData.id);
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Restaurant mis à jour !');
      } else {
        const { error } = await supabase.from('restaurants').insert({
          name: formData.name,
          address: formData.address,
          cuisine_type: formData.cuisineType,
          hours: formData.hours
        });
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Restaurant créé !');
      }
    } else if (modalType === 'user') {
  console.log('👤 Modification utilisateur:', formData);
  
  if (formData.id) {
    // ===== MODIFICATION (avec ou sans mot de passe) =====
    const updateData = {
      name: formData.name,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      restaurant_id: formData.restaurantId || null
    };
    
    // NE hasher le mot de passe QUE s'il a été modifié
    if (formData.password && formData.password.trim() !== '') {
      console.log('🔐 Nouveau mot de passe détecté, hashing...');
      const hashedPassword = await bcrypt.hash(formData.password, 10);
      updateData.password_hash = hashedPassword;
    } else {
      console.log('🔐 Pas de nouveau mot de passe, on garde l\'ancien');
    }
    
    const { error } = await supabase.from('users').update(updateData).eq('id', formData.id);
    
    if (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    toast.success('✅ Utilisateur mis à jour !');
  } else {
    // ===== CRÉATION (mot de passe obligatoire) =====
    if (!formData.password || formData.password.trim() === '') {
      toast.error('⚠️ Le mot de passe est obligatoire pour créer un utilisateur');
      return;
    }
    
    console.log('🆕 Création utilisateur avec mot de passe');
    const hashedPassword = await bcrypt.hash(formData.password, 10);
    
    const { error } = await supabase.from('users').insert({
      name: formData.name,
      username: formData.username,
      password_hash: hashedPassword,
      email: formData.email,
      role: formData.role,
      restaurant_id: formData.restaurantId || null
    });
    
    if (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la création');
      return;
    }
        toast.success('✅ Utilisateur créé !');
      }
    } else if (modalType === 'reservation') {
      if (formData.id) {
        const { error } = await supabase.from('reservations').update({
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail,
          date: formData.date,
          time: formData.time,
          number_of_people: formData.numberOfPeople,
          status: formData.status,
          notes: formData.notes
        }).eq('id', formData.id);
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Réservation mise à jour !');
      } else {
        const { error } = await supabase.from('reservations').insert({
          restaurant_id: selectedRestaurant?.id,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail,
          date: formData.date,
          time: formData.time,
          number_of_people: formData.numberOfPeople,
          status: formData.status || 'pending',
          notes: formData.notes
        });
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Réservation créée !');
      }
    } else if (modalType === 'menuItem') {
      if (formData.id) {
        const { error } = await supabase.from('menu_items').update({
          category_id: formData.categoryId,
          name: formData.name,
          description: formData.description,
          base_price: formData.basePrice,
          menu_price: formData.menuPrice
        }).eq('id', formData.id);
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Article mis à jour !');
      } else {
        const { error } = await supabase.from('menu_items').insert({
          restaurant_id: selectedRestaurant?.id,
          category_id: formData.categoryId,
          name: formData.name,
          description: formData.description,
          base_price: formData.basePrice,
          menu_price: formData.menuPrice,
          available: true
        });
        
        if (error) {
          console.error('❌ Erreur:', error);
          return;
        }
        toast.success('✅ Article créé !');
      } 
    }  else if (modalType === 'menuCategory') {
  if (formData.id) {
    // Modification
    const { error } = await supabase.from('menu_categories').update({
      name: formData.name,
      order_position: formData.order || 0
    }).eq('id', formData.id);
    
    if (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    toast.success('✅ Catégorie mise à jour !');
  } else {
    // Création
    const { error } = await supabase.from('menu_categories').insert({
      restaurant_id: selectedRestaurant?.id || currentUser.restaurantId,
      name: formData.name,
      order_position: formData.order || 0
    });
    
    if (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la création');
      return;
    }
    toast.success('✅ Catégorie créée !');
  }
}
    
    
    closeModal();
    loadData();
  };
  

  const openModal = (type, item = {}) => {
    setModalType(type);
    setFormData(item);
    setShowModal(true);
  };


  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setFormData({});
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 Son joué !');
    } catch (error) {
      console.error('Erreur son:', error);
    }
  };




  

  // ========== SON CUISINE (plus fort et long) ========== 
  const playKitchenSound = () => {
    if (!kitchenSoundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      console.log('🔊 Son cuisine joué !');
    } catch (error) {
      console.error('Erreur son cuisine:', error);
    }
  };

  // ========== TOGGLE SON CUISINE ========== 
  const toggleKitchenSound = () => {
    setKitchenSoundEnabled(!kitchenSoundEnabled);
    toast.success(
      !kitchenSoundEnabled 
        ? '🔊 Son de cuisine activé' 
        : '🔇 Son de cuisine désactivé'
    );
  };

  // ========== TOGGLE PLEIN ÉCRAN ========== 
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast.success('🖥️ Mode plein écran activé');
      }).catch(err => {
        console.error('Erreur plein écran:', err);
        toast.error('Impossible d\'activer le plein écran');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        toast.success('🖥️ Mode normal');
      });
    }
  };

const handleDelete = async (type, id) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
  
  const tables = {
    restaurant: 'restaurants',
    user: 'users',
    reservation: 'reservations',
    menuItem: 'menu_items',
    menuCategory: 'menu_categories'  // ← AJOUT
  };
  
  const { error } = await supabase.from(tables[type]).delete().eq('id', id);
  
  if (error) {
    console.error('❌ Erreur:', error);
    toast.error('Erreur lors de la suppression');
    return;
  }
  
  toast.success('✅ Supprimé !');
  loadData();
};




  // ========== UPDATE ORDER STATUS ========== 
  const updateOrderStatus = async (orderId, newStatus) => {
    console.log('🔄 Changement statut:', orderId, '→', newStatus);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) {
        console.error('❌ Erreur:', error);
        toast.error('Erreur lors de la mise à jour');
        return;
      }
      
      const messages = {
        'preparing': '👨‍🍳 Commande en préparation',
        'ready': '✅ Commande prête !',
        'delivered': '🚚 Commande livrée !'
      };
      
      toast.success(messages[newStatus] || 'Statut mis à jour');
      
      if (kitchenSoundEnabled) {
        playKitchenSound();
      }
      
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      const formattedOrders = orders?.map(order => ({
        id: order.id,
        restaurantId: order.restaurant_id,
        customer_phone: order.customer_phone,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        items: order.items,
        created_at: order.created_at,
        cancelled_at: order.cancelled_at
      })) || [];
      
      setData(prev => ({ ...prev, orders: formattedOrders }));
      
    } catch (error) {
      console.error('💥 ERREUR:', error);
      toast.error('Erreur: ' + error.message);
    }
  };

  // ========== CANCEL ORDER ========== 
  const cancelOrder = async (orderId) => {
    if (!confirm('⚠️ Voulez-vous vraiment annuler cette commande ?')) {
      return;
    }
    
    console.log('❌ Annulation commande:', orderId);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('❌ Erreur:', error);
        toast.error('Erreur lors de l\'annulation');
        return;
      }
      
      toast.success('❌ Commande annulée');
      
      if (kitchenSoundEnabled) {
        playKitchenSound();
      }
      
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      const formattedOrders = orders?.map(order => ({
        id: order.id,
        restaurantId: order.restaurant_id,
        customer_phone: order.customer_phone,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        items: order.items,
        created_at: order.created_at,
        cancelled_at: order.cancelled_at
      })) || [];
      
      setData(prev => ({ ...prev, orders: formattedOrders }));
      
    } catch (error) {
      console.error('💥 ERREUR:', error);
      toast.error('Erreur: ' + error.message);
    }
  };

  // ========== DRAG & DROP HANDLER ========== 
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    console.log('🖱️ Drag & Drop:', {
      orderId: draggableId,
      from: source.droppableId,
      to: destination.droppableId
    });
    
    const statusMap = {
      'pending': 'pending',
      'preparing': 'preparing',
      'ready': 'ready'
    };
    
    const newStatus = statusMap[destination.droppableId];
    
    if (!newStatus) return;
    
    await updateOrderStatus(draggableId, newStatus);
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };


  // ========== FILTRE PAR PÉRIODE ========== 
const filterByPeriod = (items, dateField = 'created_at') => {
  if (dashboardPeriod === 'all') return items;
  
  const now = new Date();
  
  return items.filter(item => {
    const itemDate = new Date(item[dateField]);
    
    if (dashboardPeriod === 'today') {
      return isToday(item[dateField]);
    }
    
    if (dashboardPeriod === 'week') {
      // Cette semaine (lundi à dimanche)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek;
    }
    
    if (dashboardPeriod === 'month') {
      // Ce mois
      return itemDate.getMonth() === now.getMonth() && 
             itemDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  });
};


// ========== FILTRE PAR PÉRIODE ET RESTAURANT COMBINÉS ========== 
const filterDashboardData = (items, dateField = 'created_at') => {
  let filtered = items;
  
  // Filtre 1 : Par période
  if (dashboardPeriod !== 'all') {
    filtered = filterByPeriod(filtered, dateField);
  }
  
  // Filtre 2 : Par restaurant
  filtered = filtered.filter(item => {
    if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
      return item.restaurantId === selectedRestaurant.id;
    }
    if (currentUser.role !== 'super_admin') {
      return item.restaurantId === currentUser.restaurantId;
    }
    return true;
  });
  
  return filtered;
};



  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    }
    return days;
  };

  const getRevenueByDay = () => {
  const last7Days = getLast7Days();
  
  // ===== FILTRE PAR RESTAURANT D'ABORD ===== 
  const filteredOrders = data.orders.filter(order => {
    if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
      return order.restaurantId === selectedRestaurant.id;
    }
    if (currentUser.role !== 'super_admin') {
      return order.restaurantId === currentUser.restaurantId;
    }
    return true;
  });
  
  // ===== PUIS CALCUL PAR JOUR =====
  return last7Days.map(day => {
    const dayOrders = filteredOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      const dayLabel = orderDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      return dayLabel === day;
    });
    
    const revenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    return { name: day, revenue: Math.round(revenue) };
  });
};

  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'restaurants', icon: Building2, label: 'Restaurants', roles: ['super_admin'] },
    { id: 'menu', icon: ShoppingBag, label: 'Menu' },
    { id: 'orders', icon: Package, label: 'Commandes' },
    { id: 'kitchen', icon: ChefHat, label: 'Vue Cuisine' },
    { id: 'users', icon: Users, label: 'Utilisateurs' },
    { id: 'reservations', icon: Calendar, label: 'Réservations' }
  ];

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Toaster />
        <div className="m-auto w-full max-w-md p-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-8"
          >
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex items-center justify-center">
                      <img 
                        src="/logo.png" 
                        alt="GastroManager" 
                        className="w-100 h-100"
                        style={{ objectFit: 'contain', maxWidth: '400px', maxHeight: '400px' }}
                        onError={(e) => {
                          // Si le logo ne charge pas, afficher l'icône
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center" style={{display: 'none'}}>
                        <ShoppingBag className="w-10 h-10 text-white" />
                      </div>
                    </div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome</h1>
              <p className="text-gray-500 mt-2">Sign to you account</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez votre username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Entrez votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm text-center"
                >
                  {loginError}
                </motion.p>
              )}

              <button
                onClick={handleLogin}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold"
              >
                Se connecter
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster />

      {/* Sidebar */}
      <div className={`${isFullscreen ? 'hidden' : sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all flex flex-col`}>
        <div className="p-4 border-b border-gray-800">
  {sidebarOpen ? (
    <div className="relative">
      <button 
        onClick={() => setSidebarOpen(false)} 
        className="absolute -right-2 -top-2 p-1.5 hover:bg-gray-800 rounded-full"
      >
        <X size={16} />
      </button>
      
   <div className="text-center">
  <div className="mx-auto mb-2 rounded-2xl flex items-center justify-center p-2 shadow-lg">
    <img 
      src="/logo3.png" 
      alt="Logo" 
      className="w-full h-full"
      style={{ objectFit: 'contain',}}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    <div className="w-full h-full flex items-center justify-center" style={{display: 'none'}}>
      <ShoppingBag className="w-12 h-12 text-white" />
    </div>
  </div>
</div>
    </div>
  ) : (
    <button 
      onClick={() => setSidebarOpen(true)} 
      className="w-full p-2 hover:bg-gray-800 rounded-lg"
    >
      <Menu size={20} className="mx-auto" />
    </button>
  )}
</div>

        <div className="flex-1 overflow-y-auto">
          {currentUser.role === 'super_admin' && data.restaurants.length > 0 && (
  <div className="p-4 border-b border-gray-800">
    {sidebarOpen ? (
      <>
        <p className="text-xs text-gray-400 mb-2">Restaurant</p>
        <select
              value={selectedRestaurant?.id || ''}
              onChange={(e) => {
                const restoId = e.target.value;
                if (restoId === '') {
                  // Si "Tous les restaurants" est sélectionné
                  setSelectedRestaurant(null);
                  localStorage.removeItem('selectedRestaurant');
                } else {
                  const resto = data.restaurants.find(r => r.id === restoId);
                  if (resto) {
                    setSelectedRestaurant(resto);
                    localStorage.setItem('selectedRestaurant', JSON.stringify(resto));
                  }
                }
              }}
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="" className="bg-gray-800 text-white">Tous les restaurants</option>
          {data.restaurants.map(r => (
            <option key={r.id} value={r.id} className="bg-gray-800 text-white">
              {r.name}
            </option>
          ))}
        </select>
      </>
    ) : (
      <div className="flex justify-center">
        <Building2 size={20} className="text-gray-400" />
      </div>
    )}
  </div>
)}

          <nav className="p-2">
            {navItems.map(item => {
              if (item.roles && !item.roles.includes(currentUser.role)) return null;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                    activeSection === item.id 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
              {currentUser.name?.[0] || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-sm">{currentUser.name}</p>
                <p className="text-xs text-gray-400">{currentUser.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">
            <LogOut size={16} />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={`flex-1 overflow-auto ${isFullscreen ? 'p-4' : 'p-8'}`}>
        <AnimatePresence mode="wait">
          
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              
                      <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      {selectedRestaurant && (
        <p className="text-gray-500 mt-1">{selectedRestaurant.name}</p>
      )}
      {!selectedRestaurant && currentUser.role === 'super_admin' && (
        <p className="text-gray-500 mt-1">Vue globale</p>
      )}
      <div className="mb-6 flex justify-end">

      <button
      // UN BOUTON TOGGLE NOTIFICATIONS DANS LE DASHBOARD
        onClick={async () => {
          if (!notificationsEnabled) {
            const granted = await requestNotificationPermission();
            setNotificationsEnabled(granted);
            if (granted) {
              toast.success('🔔 Notifications activées !');
              // Test notification
              sendNotification('🎉 Notifications activées !', {
                body: 'Vous recevrez maintenant les alertes en temps réel',
                requireInteraction: true
              });
            } else {
              toast.error('❌ Permission refusée');
            }
          } else {
            toast.info('✅ Notifications déjà activées');
          }
        }}
        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
          notificationsEnabled 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {notificationsEnabled ? '🔔 Notifications ON' : '🔕 Activer notifications'}
      </button>
    </div>
    </div>
                  {/* Sélecteur de période */}
                  <div className="flex gap-2 bg-white rounded-lg shadow p-1 mb-8 w-fit">
                    <button
                      onClick={() => setDashboardPeriod('today')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        dashboardPeriod === 'today' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📅 Aujourd'hui
                    </button>
                    <button
                      onClick={() => setDashboardPeriod('week')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        dashboardPeriod === 'week' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📆 Cette semaine
                    </button>
                    <button
                      onClick={() => setDashboardPeriod('month')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        dashboardPeriod === 'month' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      🗓️ Ce mois
                    </button>
                    <button
                      onClick={() => setDashboardPeriod('all')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        dashboardPeriod === 'all' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📊 Total
                    </button>
                                      <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => setActiveSection('analytics')}
                    className={`w-full flex items-center px-3 py-3 rounded-lg transition-all ${
                      activeSection === 'analytics'
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-xl mr-3">📊</span>
                    {!sidebarCollapsed && <span>Analytics</span>}
                  </motion.button>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      {/* Carte 1 : Commandes */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg p-6 border border-blue-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                            {dashboardPeriod === 'today' ? 'Aujourd\'hui' : 
                            dashboardPeriod === 'week' ? 'Cette semaine' :
                            dashboardPeriod === 'month' ? 'Ce mois' : 'Total'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Commandes</p>
                        <p className="text-3xl font-bold text-blue-600">
                          <AnimatedNumber value={filterDashboardData(data.orders).length} duration={1.5} />
                        </p>
                      </motion.div>

                      {/* Carte 2 : Revenus */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg p-6 border border-green-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-600">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800">
                            {dashboardPeriod === 'today' ? 'Aujourd\'hui' : 
                            dashboardPeriod === 'week' ? 'Cette semaine' :
                            dashboardPeriod === 'month' ? 'Ce mois' : 'Total'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Revenus</p>
                        <p className="text-3xl font-bold text-green-600">
                            €<AnimatedNumber 
                              value={filterDashboardData(data.orders)
                                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
                                .toFixed(0)
                              } 
                              duration={1.5} 
                            />
                          </p>
                      </motion.div>

                      {/* Carte 3 : Réservations */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-lg p-6 border border-purple-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-600">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                            {dashboardPeriod === 'today' ? 'Aujourd\'hui' : 
                            dashboardPeriod === 'week' ? 'Cette semaine' :
                            dashboardPeriod === 'month' ? 'Ce mois' : 'Total'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Réservations</p>
                        <p className="text-3xl font-bold text-purple-600">
                          <AnimatedNumber 
                            value={filterDashboardData(data.reservations, 'date').length} 
                            duration={1.5} 
                          />
                        </p>
                      </motion.div>

                      {/* Carte 4 : Utilisateurs */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg p-6 border border-orange-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-600">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-800">Total</span>
                        </div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Utilisateurs</p>
                        <p className="text-3xl font-bold text-orange-600">
                          <AnimatedNumber value={data.users.length} duration={1.5} />
                        </p>
                      </motion.div>
                    </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Revenus des 7 derniers jours</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getRevenueByDay()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Commandes récentes</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {filterDashboardData(data.orders)
                      .slice(0, 5)
                      .map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">Commande #{order.order_number || order.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-500">{order.customer_phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">€{order.total}</p>
                            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                        </div>
                      ))}
                    
                    {filterDashboardData(data.orders).length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Aucune commande</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
                            {/* ========== NOUVELLE SECTION ANALYTICS ========== */}
      {activeSection === 'analytics' && (
        <motion.div
          key="analytics"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <AdvancedAnalytics 
            orders={data.orders}
            reservations={data.reservations}
            menuItems={data.menuItems}
          />
        </motion.div>
      )}
            </motion.div>

            
          )}

          {/* Section Restaurants (super_admin only) */}
          {activeSection === 'restaurants' && currentUser.role === 'super_admin' && (
            <motion.div 
              key="restaurants"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Restaurants</h1>
                <button onClick={() => openModal('restaurant')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus size={20} /> Ajouter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.restaurants.map((resto, index) => (
                  <motion.div 
                    key={resto.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <h3 className="text-xl font-bold mb-2">{resto.name}</h3>
                    <p className="text-gray-600 mb-2">{resto.address}</p>
                    <p className="text-sm text-gray-500 mb-1">{resto.cuisine_type}</p>
                    <p className="text-sm text-gray-500 mb-4">{resto.hours}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('restaurant', resto)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <Edit2 size={16} className="inline mr-1" /> Modifier
                      </button>
                      <button onClick={() => handleDelete('restaurant', resto.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Section Menu */}
          {activeSection === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-bold">Menu</h1>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => openModal('menuCategory')} 
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Plus size={20} /> Ajouter une catégorie
                    </button>
                    <button 
                      onClick={() => openModal('menuItem')} 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus size={20} /> Ajouter un article
                    </button>
                  </div>
                </div>

              <div className="space-y-6">
                {data.menuCategories
                      .filter(cat => {
                        if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                          return cat.restaurantId === selectedRestaurant.id;
                        }
                        if (currentUser.role !== 'super_admin') {
                          return cat.restaurantId === currentUser.restaurantId;
                        }
                        return true;
                      })
                  .map((category, catIndex) => (
                    <motion.div 
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIndex * 0.1 }}
                      className="bg-white rounded-xl shadow-lg p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">{category.name}</h2>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openModal('menuCategory', {
                              id: category.id,
                              name: category.name,
                              order: category.order
                            })} 
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <Edit2 size={14} className="inline mr-1" /> Modifier
                          </button>
                          <button 
                            onClick={() => handleDelete('menuCategory', category.id)} 
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.menuItems
                          .filter(item => item.categoryId === category.id)
                          .map(item => (
                            <motion.div 
                              key={item.id}
                              whileHover={{ scale: 1.02 }}
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold">{item.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {item.available ? 'Dispo' : 'Indispo'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                              <div className="flex justify-between items-center mb-3">
                                <div>
                                  <p className="text-sm text-gray-500">Seul: <span className="font-bold">€{item.basePrice}</span></p>
                                  <p className="text-sm text-gray-500">Menu: <span className="font-bold">€{item.menuPrice}</span></p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => openModal('menuItem', item)} className="flex-1 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                                  <Edit2 size={14} className="inline mr-1" /> Modifier
                                </button>
                                <button onClick={() => handleDelete('menuItem', item.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Section Commandes */}
          {activeSection === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Commandes</h1>
                
                <div className="flex gap-2 bg-white rounded-lg shadow p-1">
                  <button
                    onClick={() => setOrderStatusFilter('active')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      orderStatusFilter === 'active' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    ✅ Actives
                  </button>
                  <button
                    onClick={() => setOrderStatusFilter('cancelled')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      orderStatusFilter === 'cancelled' 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    ❌ Annulées
                  </button>
                  <button
                    onClick={() => setOrderStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      orderStatusFilter === 'all' 
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    📋 Toutes
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders
                        .filter(o => {
                          if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                            return o.restaurantId === selectedRestaurant.id;
                          }
                          if (currentUser.role !== 'super_admin') {
                            return o.restaurantId === currentUser.restaurantId;
                          }
                          return true;
                        })
                    .filter(o => {
                      if (orderStatusFilter === 'active') {
                        return o.status !== 'cancelled';
                      } else if (orderStatusFilter === 'cancelled') {
                        return o.status === 'cancelled';
                      }
                      return true;
                    })
                    .map(o => (
                      <tr key={o.id} className={`border-t ${o.status === 'cancelled' ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 font-medium">#{o.order_number || o.id.slice(0, 8)}</td>
                        <td className="px-6 py-4">{o.customer_phone}</td>
                        <td className="px-6 py-4 font-bold text-green-600">€{o.total}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            o.status === 'cancelled' 
                              ? 'bg-red-100 text-red-800' 
                              : o.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : o.status === 'ready'
                              ? 'bg-blue-100 text-blue-800'
                              : o.status === 'preparing'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {o.status === 'cancelled' ? '❌ Annulée' : 
                             o.status === 'delivered' ? '✅ Livrée' :
                             o.status === 'ready' ? '🎁 Prête' :
                             o.status === 'preparing' ? '👨‍🍳 Préparation' :
                             '⏳ En attente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(o.created_at).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ==================== VUE CUISINE AVEC DRAG & DROP ==================== */}
          {activeSection === 'kitchen' && (
            <motion.div 
              key="kitchen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">🍳 Vue Cuisine</h1>
                  <p className="text-gray-600 mt-1">Gestion des commandes en temps réel</p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={toggleKitchenSound}
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      kitchenSoundEnabled 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {kitchenSoundEnabled ? '🔊 Son activé' : '🔇 Son désactivé'}
                  </button>

                  <button 
                    onClick={toggleFullscreen}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isFullscreen ? '🖥️ Quitter plein écran' : '🖥️ Mode plein écran'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">En attente</p>
                  <div className="text-3xl font-bold text-red-700">
                    <p className="text-3xl font-bold text-red-700">
                        {(data.orders || [])
                          .filter(o => o.status === 'pending')
                          .filter(o => {
                            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                              return o.restaurantId === selectedRestaurant.id;
                            }
                            if (currentUser.role !== 'super_admin') {
                              return o.restaurantId === currentUser.restaurantId;
                            }
                            return true;
                          }).length
                        }
                      </p>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium">En préparation</p>
                  <div className="text-3xl font-bold text-orange-700">
                    <p className="text-3xl font-bold text-red-700">
                        {(data.orders || [])
                          .filter(o => o.status === 'pending')
                          .filter(o => {
                            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                              return o.restaurantId === selectedRestaurant.id;
                            }
                            if (currentUser.role !== 'super_admin') {
                              return o.restaurantId === currentUser.restaurantId;
                            }
                            return true;
                          }).length
                        }
                      </p>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Prêt</p>
                  <div className="text-3xl font-bold text-green-700">
                    <p className="text-3xl font-bold text-red-700">
                        {(data.orders || [])
                          .filter(o => o.status === 'pending')
                          .filter(o => {
                            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                              return o.restaurantId === selectedRestaurant.id;
                            }
                            if (currentUser.role !== 'super_admin') {
                              return o.restaurantId === currentUser.restaurantId;
                            }
                            return true;
                          }).length
                        }
                      </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Livrées aujourd'hui</p>
                  <div className="text-3xl font-bold text-blue-700">
                    <p className="text-3xl font-bold text-red-700">
                        {(data.orders || [])
                          .filter(o => o.status === 'pending')
                          .filter(o => {
                            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                              return o.restaurantId === selectedRestaurant.id;
                            }
                            if (currentUser.role !== 'super_admin') {
                              return o.restaurantId === currentUser.restaurantId;
                            }
                            return true;
                          }).length
                        }
                      </p>
                  </div>
                </div>
              </div>

              {/* Kanban Board avec Drag & Drop */}
              <div className="bg-gray-100 rounded-xl p-6 min-h-[600px]">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="grid grid-cols-3 gap-6">
                    

                    {/* COLONNE 1 : EN ATTENTE */}
                  <Droppable droppableId="pending">
  {(provided, snapshot) => (
    <div 
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`bg-white rounded-lg shadow-lg transition-colors ${
        snapshot.isDraggingOver ? 'ring-4 ring-red-300' : ''
      }`}
    >
      <div className="bg-red-600 text-white p-4 rounded-t-lg">
        <h3 className="font-bold text-lg flex items-center justify-between">
          <span>📋 En attente</span>
          <span className="bg-red-700 px-3 py-1 rounded-full text-sm">
            {(data.orders || [])
              .filter(o => o.status === 'pending')
              .filter(o => {
                if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                  return o.restaurantId === selectedRestaurant.id;
                }
                if (currentUser.role !== 'super_admin') {
                  return o.restaurantId === currentUser.restaurantId;
                }
                return true;
              }).length
            }
          </span>
        </h3>
      </div>
      
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {(data.orders || [])
          .filter(o => o.status === 'pending')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          })
          .map((order, index) => (
            <Draggable key={order.id} draggableId={order.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`bg-red-50 border-2 border-red-200 rounded-lg p-4 transition-shadow ${
                    snapshot.isDragging 
                      ? 'shadow-2xl rotate-2 scale-105' 
                      : 'hover:shadow-lg'
                  }`}
                  style={{
                    ...provided.draggableProps.style,
                    cursor: 'grab'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">
                        #{order.order_number || order.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        📞 {order.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {order.created_at && new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-bold text-red-600">
                        🕐 {order.created_at && Math.floor((new Date() - new Date(order.created_at)) / 60000)} min
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items && Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>• {item.name}</span>
                        <span className="font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t">
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium"
                    >
                      👨‍🍳 Commencer
                    </button>
                    <button 
                      onClick={() => cancelOrder(order.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                      title="Annuler"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
        {provided.placeholder}
        
        {(data.orders || [])
          .filter(o => o.status === 'pending')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          }).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p>Aucune commande en attente</p>
          </div>
        )}
      </div>
    </div>
  )}
</Droppable>

{/* COLONNE 2 : EN PRÉPARATION */}
<Droppable droppableId="preparing">
  {(provided, snapshot) => (
    <div 
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`bg-white rounded-lg shadow-lg transition-colors ${
        snapshot.isDraggingOver ? 'ring-4 ring-orange-300' : ''
      }`}
    >
      <div className="bg-orange-600 text-white p-4 rounded-t-lg">
        <h3 className="font-bold text-lg flex items-center justify-between">
          <span>👨‍🍳 En préparation</span>
          <span className="bg-orange-700 px-3 py-1 rounded-full text-sm">
            {(data.orders || [])
              .filter(o => o.status === 'preparing')
              .filter(o => {
                if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                  return o.restaurantId === selectedRestaurant.id;
                }
                if (currentUser.role !== 'super_admin') {
                  return o.restaurantId === currentUser.restaurantId;
                }
                return true;
              }).length
            }
          </span>
        </h3>
      </div>
      
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {(data.orders || [])
          .filter(o => o.status === 'preparing')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          })
          .map((order, index) => (
            <Draggable key={order.id} draggableId={order.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`bg-orange-50 border-2 border-orange-200 rounded-lg p-4 transition-shadow ${
                    snapshot.isDragging 
                      ? 'shadow-2xl rotate-2 scale-105' 
                      : 'hover:shadow-lg'
                  }`}
                  style={{
                    ...provided.draggableProps.style,
                    cursor: 'grab'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">
                        #{order.order_number || order.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        📞 {order.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {order.created_at && new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-bold text-orange-600">
                        🕐 {order.created_at && Math.floor((new Date() - new Date(order.created_at)) / 60000)} min
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items && Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>• {item.name}</span>
                        <span className="font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t">
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      ✅ Terminé
                    </button>
                    <button 
                      onClick={() => cancelOrder(order.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                      title="Annuler"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
        {provided.placeholder}
        
        {(data.orders || [])
          .filter(o => o.status === 'preparing')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          }).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p>Aucune commande en préparation</p>
          </div>
        )}
      </div>
    </div>
  )}
</Droppable>

{/* COLONNE 3 : PRÊT */}
<Droppable droppableId="ready">
  {(provided, snapshot) => (
    <div 
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`bg-white rounded-lg shadow-lg transition-colors ${
        snapshot.isDraggingOver ? 'ring-4 ring-green-300' : ''
      }`}
    >
      <div className="bg-green-600 text-white p-4 rounded-t-lg">
        <h3 className="font-bold text-lg flex items-center justify-between">
          <span>✅ Prêt</span>
          <span className="bg-green-700 px-3 py-1 rounded-full text-sm">
            {(data.orders || [])
              .filter(o => o.status === 'ready')
              .filter(o => {
                if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                  return o.restaurantId === selectedRestaurant.id;
                }
                if (currentUser.role !== 'super_admin') {
                  return o.restaurantId === currentUser.restaurantId;
                }
                return true;
              }).length
            }
          </span>
        </h3>
      </div>
      
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {(data.orders || [])
          .filter(o => o.status === 'ready')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          })
          .map((order, index) => (
            <Draggable key={order.id} draggableId={order.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`bg-green-50 border-2 border-green-200 rounded-lg p-4 transition-shadow ${
                    snapshot.isDragging 
                      ? 'shadow-2xl rotate-2 scale-105' 
                      : 'hover:shadow-lg'
                  }`}
                  style={{
                    ...provided.draggableProps.style,
                    cursor: 'grab'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">
                        #{order.order_number || order.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        📞 {order.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {order.created_at && new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-bold text-green-600">
                        ✅ Prêt
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items && Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>• {item.name}</span>
                        <span className="font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t">
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      🚚 Livrée
                    </button>
                    <button 
                      onClick={() => cancelOrder(order.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                      title="Annuler"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
        {provided.placeholder}
        
        {(data.orders || [])
          .filter(o => o.status === 'ready')
          .filter(o => {
            if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
              return o.restaurantId === selectedRestaurant.id;
            }
            if (currentUser.role !== 'super_admin') {
              return o.restaurantId === currentUser.restaurantId;
            }
            return true;
          }).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <DollarSign className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p>Aucune commande prête</p>
          </div>
        )}
      </div>
    </div>
  )}
</Droppable>

                  </div>
                </DragDropContext>
              </div>
            </motion.div>
          )}

          {/* Section Users */}
          {activeSection === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Utilisateurs</h1>
                <button onClick={() => openModal('user')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus size={20} /> Ajouter
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
    </tr>
  </thead>
  <tbody>
    {data.users
      .filter(u => currentUser.role === 'super_admin' || u.restaurant_id === selectedRestaurant?.id)
      .map(u => {
        const userRestaurant = data.restaurants.find(r => r.id === u.restaurant_id);
        
        return (
          <tr key={u.id} className="border-t hover:bg-gray-50">
            <td className="px-6 py-4 font-medium">{u.name}</td>
            <td className="px-6 py-4">{u.username}</td>
            <td className="px-6 py-4">{u.email}</td>
            <td className="px-6 py-4">
              {userRestaurant ? (
                <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                  🏢 {userRestaurant.name}
                </span>
              ) : (
                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                  Tous les restaurants
                </span>
              )}
            </td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                {u.role.replace('_', ' ')}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button onClick={() => openModal('user', {
                  id: u.id,
                  name: u.name,
                  username: u.username,
                  email: u.email,
                  role: u.role,
                  restaurantId: u.restaurant_id
                })} className="text-blue-600 hover:underline text-sm">
                  Modifier
                </button>
                <button onClick={() => handleDelete('user', u.id)} className="text-red-600 hover:underline text-sm">
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        );
      })}
  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Section Reservations */}
          {activeSection === 'reservations' && (
            <motion.div 
              key="reservations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Réservations</h1>
                
                <div className="flex gap-3">
                  <div className="flex gap-2 bg-white rounded-lg shadow p-1">
                    <button
                      onClick={() => setCalendarView('calendar')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        calendarView === 'calendar' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📅 Calendrier
                    </button>
                    <button
                      onClick={() => setCalendarView('table')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        calendarView === 'table' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📋 Tableau
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => openModal('reservation')} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={20} /> Ajouter
                  </button>
                </div>
              </div>

              {calendarView === 'calendar' ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={frLocale}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    buttonText={{
                      today: "Aujourd'hui",
                      month: 'Mois',
                      week: 'Semaine',
                      day: 'Jour'
                    }}
                    height="auto"
                    events={(data.reservations || [])
                        .filter(r => {
                          if (currentUser.role === 'super_admin' && selectedRestaurant?.id) {
                            return r.restaurantId === selectedRestaurant.id;
                          }
                          if (currentUser.role !== 'super_admin') {
                            return r.restaurantId === currentUser.restaurantId;
                          }
                          return true;
                        })
                      .map(r => ({
                        id: r.id,
                        title: `${r.customerName} - ${r.numberOfPeople} pers.`,
                        start: `${r.date}T${r.time}`,
                        backgroundColor: 
                          r.status === 'confirmed' ? '#00c369' :
                          r.status === 'pending' ? '#f59e0b' :
                          r.status === 'cancelled' ? '#ef4444' :
                          '#10b981',
                        borderColor: 
                          r.status === 'confirmed' ? '#00c369' :
                          r.status === 'pending' ? '#f59e0b' :
                          r.status === 'cancelled' ? '#ef4444' :
                          '#10b981',
                        extendedProps: {
                          reservation: r
                        }
                      }))}
                    eventClick={(info) => {
                      const r = info.event.extendedProps.reservation;
                      openModal('reservation', {
                        id: r.id,
                        customerName: r.customerName,
                        customerPhone: r.customerPhone,
                        customerEmail: r.customerEmail,
                        date: r.date,
                        time: r.time,
                        numberOfPeople: r.numberOfPeople,
                        status: r.status,
                        notes: r.notes
                      });
                    }}
                    dateClick={(info) => {
                      openModal('reservation', {
                        date: info.dateStr,
                        time: '19:00',
                        numberOfPeople: 2,
                        status: 'pending'
                      });
                    }}
                    editable={true}
                    eventDrop={async (info) => {
                      const newDate = info.event.start.toISOString().split('T')[0];
                      const newTime = info.event.start.toTimeString().split(' ')[0].slice(0, 5);
                      
                      const { error } = await supabase
                        .from('reservations')
                        .update({ 
                          date: newDate,
                          time: newTime
                        })
                        .eq('id', info.event.id);

                      if (error) {
                        console.error('Erreur:', error);
                        info.revert();
                        toast.error('Erreur lors du déplacement');
                      } else {
                        toast.success('✅ Réservation déplacée !');
                        loadData();
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personnes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reservations
                        .filter(r => currentUser.role === 'super_admin' || r.restaurantId === selectedRestaurant?.id)
                        .map(r => (
                          <tr key={r.id} className="border-t hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{r.customerName}</td>
                            <td className="px-6 py-4">{r.customerPhone}</td>
                            <td className="px-6 py-4">{r.date} à {r.time}</td>
                            <td className="px-6 py-4">{r.numberOfPeople} pers.</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                r.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => openModal('reservation', {
                                  id: r.id,
                                  customerName: r.customerName,
                                  customerPhone: r.customerPhone,
                                  customerEmail: r.customerEmail,
                                  date: r.date,
                                  time: r.time,
                                  numberOfPeople: r.numberOfPeople,
                                  status: r.status,
                                  notes: r.notes
                                })} className="text-blue-600 hover:underline text-sm">
                                  Modifier
                                </button>
                                <button onClick={() => handleDelete('reservation', r.id)} className="text-red-600 hover:underline text-sm">
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={closeModal}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-2xl font-bold mb-6">
                  {formData.id ? 'Modifier' : 'Ajouter'} {
                    modalType === 'restaurant' ? 'Restaurant' :
                    modalType === 'user' ? 'Utilisateur' :
                    modalType === 'reservation' ? 'Réservation' :
                    modalType === 'menuItem' ? 'Article' : ''
                  }
                </h2>
                
                <div className="space-y-4">
                  {modalType === 'restaurant' && (
                    <>
                      <input 
                        type="text" 
                        placeholder="Nom du restaurant" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="text" 
                        placeholder="Adresse" 
                        value={formData.address || ''} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="text" 
                        placeholder="Type de cuisine" 
                        value={formData.cuisineType || ''} 
                        onChange={(e) => setFormData({...formData, cuisineType: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="text" 
                        placeholder="Horaires (ex: 11:00 - 23:00)" 
                        value={formData.hours || ''} 
                        onChange={(e) => setFormData({...formData, hours: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                    </>
                  )}

                  {modalType === 'menuCategory' && (
                        <>
                          <input 
                            type="text" 
                            placeholder="Nom de la catégorie (ex: Burgers, Desserts...)" 
                            value={formData.name || ''} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full border rounded-lg px-4 py-2" 
                          />
                          <input 
                            type="number" 
                            placeholder="Position d'affichage (ordre)" 
                            value={formData.order || ''} 
                            onChange={(e) => setFormData({...formData, order: e.target.value})}
                            className="w-full border rounded-lg px-4 py-2" 
                          />
                        </>
                      )}


                  {modalType === 'user' && (
                    <>
                      <input 
                        type="text" 
                        placeholder="Nom complet" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="text" 
                        placeholder="Username" 
                        value={formData.username || ''} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Mot de passe" 
                          value={formData.password || ''} 
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full border rounded-lg px-4 py-2 pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <input 
                        type="email" 
                        placeholder="Email" 
                        value={formData.email || ''} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <select 
                        value={formData.role || ''} 
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2"
                      >
                        <option value="">Sélectionnez un rôle</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="restaurant_owner">Propriétaire</option>
                        <option value="restaurant_manager">Gérant</option>
                        <option value="kitchen_staff">Cuisine</option>
                        <option value="cashier">Caissier</option>
                      </select>
                      {currentUser.role === 'super_admin' && (
                        <select 
                          value={formData.restaurantId || ''} 
                          onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                          className="w-full border rounded-lg px-4 py-2"
                        >
                          <option value="">Tous les restaurants</option>
                          {data.restaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}

                  {modalType === 'reservation' && (
                    <>
                      <input 
                        type="text" 
                        placeholder="Nom du client" 
                        value={formData.customerName || ''} 
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="tel" 
                        placeholder="Telephone" 
                        value={formData.customerPhone || ''} 
                        onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="email" 
                        placeholder="Email (optionnel)" 
                        value={formData.customerEmail || ''} 
                        onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="date" 
                        value={formData.date || ''} 
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="time" 
                        value={formData.time || ''} 
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        placeholder="Nombre de personnes" 
                        value={formData.numberOfPeople || ''} 
                        onChange={(e) => setFormData({...formData, numberOfPeople: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                      />
                      <select 
                        value={formData.status || 'pending'} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2"
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="cancelled">Annulé</option>
                        <option value="completed">Terminer</option>
                      </select>
                      <textarea 
                        placeholder="Notes (allergies, demandes speciales...)" 
                        value={formData.notes || ''} 
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2" 
                        rows="3"
                      />
                    </>
                  )}

                  {modalType === 'menuItem' && (
                    <>
                      <select value={formData.categoryId || ''} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full border rounded-lg px-4 py-2">
                        <option value="">Categorie</option>
                        {data.menuCategories.filter(c => c.restaurantId === selectedRestaurant?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="text" placeholder="Nom" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                      <textarea placeholder="Description" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg px-4 py-2" rows="3" />
                      <input type="number" step="0.01" placeholder="Prix seul" value={formData.basePrice || ''} onChange={(e) => setFormData({...formData, basePrice: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                      <input type="number" step="0.01" placeholder="Prix menu" value={formData.menuPrice || ''} onChange={(e) => setFormData({...formData, menuPrice: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                    </>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                    <button type="button" onClick={handleFormSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {formData.id ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </div>
              </motion.div>
           
 </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
