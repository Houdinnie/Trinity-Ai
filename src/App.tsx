import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, query, collection, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Academics } from './pages/Academics';
import { Journal } from './pages/Journal';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import type { UserProfile, AnalysisRecord } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: new Date().toISOString(),
            riskTolerance: 'MODERATE',
            experienceLevel: 'BEGINNER',
            tradingGoal: 'GROWTH',
            aiSettings: {
              breakoutSensitivity: 50,
              reversalSensitivity: 50,
              anomalySensitivity: 50
            }
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }

        const q = query(
          collection(db, 'analyses'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        onSnapshot(q, (snapshot) => {
          const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalysisRecord[];
          setHistory(records);
        });
      } else {
        setProfile(null);
        setHistory([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success("Profile updated!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to update profile.");
    }
  };

  const handleUpdateOutcome = async (id: string, outcome: 'WIN' | 'LOSS') => {
    try {
      const recordRef = doc(db, 'analyses', id);
      await updateDoc(recordRef, { outcome });
      toast.success(`Marked as ${outcome}!`);
    } catch (err) {
      console.error("Failed to update outcome:", err);
      toast.error("Failed to update outcome.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'analyses', id));
      toast.success("Analysis deleted.");
    } catch (err) {
      console.error("Failed to delete analysis:", err);
      toast.error("Failed to delete analysis.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout user={user} onPriceUpdate={setCurrentPrices}>
          <Routes>
            <Route path="/" element={
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
            <Route path="/academics" element={<Academics />} />
            <Route path="/journal" element={<Journal user={user} />} />
            <Route path="/history" element={
              <History 
                user={user} 
                history={history} 
                onUpdateOutcome={handleUpdateOutcome}
                onDeleteRecord={handleDeleteRecord} 
              />
            } />
            <Route path="/profile" element={
              <Profile 
                profile={profile} 
                onUpdateProfile={handleUpdateProfile} 
              />
            } />
          </Routes>
        </Layout>
        <Toaster position="top-right" theme="dark" />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
