import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, query, collection, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Academics } from './pages/Academics';
import { Journal } from './pages/Journal';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { getGuestUser, getGuestProfile, updateGuestProfile } from './lib/guestAuth';
import type { UserProfile, AnalysisRecord } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Always use guest auth - no login required
    const guestUser = getGuestUser();
    const guestProfile = getGuestProfile();
    setUser(guestUser);
    setProfile(guestProfile);

    // Load history from Firestore using guest UID
    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', guestUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalysisRecord[];
      setHistory(records);
    }, (error) => {
      console.error('Firestore error:', error);
      // Fallback to localStorage if Firestore fails
      const localHistory = localStorage.getItem('trinity_history');
      if (localHistory) {
        setHistory(JSON.parse(localHistory));
      }
    });

    setLoading(false);
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, updates);
      const updated = updateGuestProfile(updates);
      setProfile(updated as UserProfile);
      toast.success('Profile updated!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Still update locally
      const updated = updateGuestProfile(updates);
      setProfile(updated as UserProfile);
      toast.success('Profile updated locally!');
    }
  };

  const handleUpdateOutcome = async (id: string, outcome: 'WIN' | 'LOSS') => {
    try {
      const recordRef = doc(db, 'analyses', id);
      await updateDoc(recordRef, { outcome });
      toast.success(`Marked as ${outcome}!`);
    } catch (err) {
      console.error('Failed to update outcome:', err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'analyses', id));
      toast.success('Analysis deleted.');
    } catch (err) {
      console.error('Failed to delete analysis:', err);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-black flex items-center justify-center'>
        <Loader2 className='w-12 h-12 text-orange-500 animate-spin' />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout user={user} onPriceUpdate={setCurrentPrices}>
          <Routes>
            <Route path='/' element={
              <Dashboard 
                user={user} 
                profile={profile} 
                history={history}
                currentPrices={currentPrices}
                onUpdateProfile={handleUpdateProfile}
                onUpdateOutcome={handleUpdateOutcome}
                onDeleteRecord={handleDeleteRecord}
              />
            } />
            <Route path='/academics' element={<Academics />} />
            <Route path='/journal' element={<Journal user={user} />} />
            <Route path='/history' element={
              <History 
                user={user} 
                history={history} 
                onUpdateOutcome={handleUpdateOutcome}
                onDeleteRecord={handleDeleteRecord} 
              />
            } />
            <Route path='/profile' element={
              <Profile 
                profile={profile} 
                onUpdateProfile={handleUpdateProfile} 
              />
            } />
          </Routes>
        </Layout>
        <Toaster position='top-right' theme='dark' />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
