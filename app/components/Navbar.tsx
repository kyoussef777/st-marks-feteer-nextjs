'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'New Orders', nameAr: 'طلبات جديدة', href: '/', icon: '🍽️' },
    { name: 'All Orders', nameAr: 'كل الطلبات', href: '/orders', icon: '📋' },
    { name: 'Menu Editor', nameAr: 'تحرير القائمة', href: '/menu', icon: '📝' },
    { name: 'Analytics', nameAr: 'التحليلات', href: '/analytics', icon: '📊' }
  ];

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar-enhanced text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="group text-white transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">🥞</span>
                </div>
                <div>
                  <span className="block text-xl font-bold tracking-wide group-hover:text-amber-200 transition-colors">
                    St. Mark&apos;s Sweets & Feteer
                  </span>
                  <span className="block font-arabic-large opacity-90 group-hover:opacity-100 transition-opacity text-white">
                    حلويات وفطير مارك الإسكندرية
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  pathname === item.href
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-amber-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                }`}
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                <span className="font-semibold">{item.name}</span>
                <span className="font-arabic opacity-80 group-hover:opacity-100 transition-opacity">{item.nameAr}</span>
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden pb-6">
            <div className="space-y-3 mt-4">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-4 rounded-xl text-base font-medium transition-all duration-300 ${
                    pathname === item.href
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                      : 'text-amber-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                  }`}
                >
                  <span className="text-2xl mr-4">{item.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="font-arabic opacity-80">{item.nameAr}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}