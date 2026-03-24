import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Splash from './pages/Splash';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import BottomNav from './components/BottomNav';
import LoadingState from './components/LoadingState';
import { AuthProvider } from './contexts/AuthContext';
import useIsMobile from './hooks/useIsMobile';
import usePushNotifications from './hooks/usePushNotifications';
import { useAuth } from './contexts/AuthContext';
import './index.css';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Adoption = lazy(() => import('./pages/Adoption'));
const Social = lazy(() => import('./pages/Social'));
const Inbox = lazy(() => import('./pages/Inbox'));
const MapScreen = lazy(() => import('./pages/MapScreen'));
const CreatePlace = lazy(() => import('./pages/CreatePlace'));
const Profile = lazy(() => import('./pages/Profile'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Cart = lazy(() => import('./pages/Cart'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Alerts = lazy(() => import('./pages/Alerts'));
const CreateAlert = lazy(() => import('./pages/CreateAlert'));
const AlertDetail = lazy(() => import('./pages/AlertDetail'));
const Explore = lazy(() => import('./pages/Explore'));
const Discover = lazy(() => import('./pages/Discover'));
const AddService = lazy(() => import('./pages/AddService'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const AddAdoptionPet = lazy(() => import('./pages/AddAdoptionPet'));
const AdoptionDetail = lazy(() => import('./pages/AdoptionDetail'));
const AddProduct = lazy(() => import('./pages/AddProduct'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const MarketplaceDashboard = lazy(() => import('./pages/MarketplaceDashboard'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));
const ActivateRole = lazy(() => import('./pages/ActivateRole'));
const CreateCourse = lazy(() => import('./pages/CreateCourse'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const AddPet = lazy(() => import('./pages/AddPet'));
const PetProfile = lazy(() => import('./pages/PetProfile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const BookAppointment = lazy(() => import('./pages/BookAppointment'));
const CreateActivity = lazy(() => import('./pages/CreateActivity'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CreatePost = lazy(() => import('./pages/CreatePost'));

const PATHS_WITHOUT_NAV = ['/', '/login', '/complete-profile'];

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/adoption" element={<ProtectedRoute><Adoption /></ProtectedRoute>} />
            <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
            <Route path="/map/new" element={<ProtectedRoute><CreatePlace /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
            <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alerts/new" element={<CreateAlert />} />
            <Route path="/alerts/:id" element={<AlertDetail />} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/services/new" element={<ProtectedRoute><AddService /></ProtectedRoute>} />
            <Route path="/services/:id" element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />
            <Route path="/adoption/new" element={<ProtectedRoute><AddAdoptionPet /></ProtectedRoute>} />
            <Route path="/adoption/:id" element={<ProtectedRoute><AdoptionDetail /></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
            <Route path="/marketplace/new" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
            <Route path="/marketplace/dashboard" element={<ProtectedRoute><MarketplaceDashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><BusinessDashboard /></ProtectedRoute>} />
            <Route path="/activate-role" element={<ProtectedRoute><ActivateRole /></ProtectedRoute>} />
            <Route path="/courses/new" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/pets/new" element={<ProtectedRoute><AddPet /></ProtectedRoute>} />
            <Route path="/pets/:id" element={<ProtectedRoute><PetProfile /></ProtectedRoute>} />
            <Route path="/users/:id" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><MyAppointments /></ProtectedRoute>} />
            <Route path="/appointments/new/:businessRoleId" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
            <Route path="/activities/new" element={<ProtectedRoute><CreateActivity /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/posts/new" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        </Routes>
    );
}

function AppShell() {
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile();
    const location = useLocation();
    const { user } = useAuth();
    usePushNotifications(user);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) return <Splash />;

    const showNav = !PATHS_WITHOUT_NAV.includes(location.pathname);

    const routes = (
        <Suspense fallback={<LoadingState message="Cargando..." />}>
            <AppRoutes />
        </Suspense>
    );

    if (!showNav) {
        return routes;
    }

    if (!isMobile) {
        // Desktop: sidebar (in document flow) + scrollable content
        return (
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-bg-soft)' }}>
                <BottomNav />
                <div style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                    {routes}
                </div>
            </div>
        );
    }

    // Mobile: scrollable content + bottom nav (in document flow, not fixed)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-bg-soft)' }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                {routes}
            </div>
            <BottomNav />
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppShell />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
