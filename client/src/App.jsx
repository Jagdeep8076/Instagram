import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import Logo from './components/Logo';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Legal from './pages/Legal';
import Settings from './pages/Settings';
import Feed from './pages/Feed';
import Reels from './pages/Reels';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import PostPage from './pages/PostPage';
import Create from './pages/Create';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Tag from './pages/Tag';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><Logo size={72} /></div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accounts/emailsignup" element={<Signup />} />
        <Route path="/accounts/password/reset" element={<ForgotPassword />} />
        <Route path="/accounts/password/reset/confirm/:token" element={<ResetPassword />} />
        <Route path="/legal/:doc" element={<Legal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <div className="layout">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:username" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tag/:tag" element={<Tag />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/accounts/*" element={<Navigate to="/" replace />} />
          <Route path="/:username" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
