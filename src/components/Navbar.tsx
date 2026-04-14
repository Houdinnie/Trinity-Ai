import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Zap, 
  LayoutDashboard, 
  User, 
  BookOpen, 
  History, 
  BookMarked,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';

import { PriceTicker } from './PriceTicker';

export function Navbar({ user, onPriceUpdate }: { user: any, onPriceUpdate: (prices: Record<string, number>) => void }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Academics', path: '/academics', icon: BookOpen },
    { name: 'Journal', path: '/journal', icon: BookMarked },
    { name: 'History', path: '/history', icon: History },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className='border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>
        <Link to='/' className='flex items-center gap-2 shrink-0'>
          <div className='w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20'>
            <Zap className='w-5 h-5 text-white fill-white' />
          </div>
          <span className='text-xl font-bold tracking-tighter uppercase italic hidden xs:inline'>Trinity</span>
        </Link>

        <PriceTicker onPriceUpdate={onPriceUpdate} />

        <div className='hidden md:flex items-center gap-1'>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                location.pathname === item.path 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className='w-4 h-4' />
              {item.name}
            </Link>
          ))}
        </div>
        
        <div className='flex items-center gap-2 sm:gap-4 shrink-0'>
          <a 
            href='https://charts.deriv.com/deriv' 
            target='_blank' 
            rel='noopener noreferrer'
            className='hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/10 transition-all'
          >
            <Maximize2 className='w-4 h-4 text-orange-500' />
            Deriv
          </a>
          
          <div className='flex items-center gap-2'>
            <div className='hidden sm:flex flex-col items-end'>
              <span className='text-xs text-gray-400'>Welcome back</span>
              <span className='text-sm font-medium'>{user?.displayName || 'Guest'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav */}
      <div className='md:hidden flex items-center justify-around py-2 border-t border-white/5 bg-black/20'>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
              location.pathname === item.path ? 'text-orange-500' : 'text-gray-500'
            )}
          >
            <item.icon className='w-5 h-5' />
            <span className='text-[10px] font-bold uppercase'>{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
