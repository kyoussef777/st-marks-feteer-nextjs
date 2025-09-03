'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Filter navigation based on user role
  const allNavigation = [
    { nameEn: 'New Feteer Orders', nameAr: 'طلبات فطير جديدة', href: '/new-orders/feteer', icon: '🥞', roles: ['admin', 'cashier'] },
    { nameEn: 'New Sweet Orders', nameAr: 'طلبات حلويات جديدة', href: '/new-orders/sweets', icon: '🍯', roles: ['admin', 'cashier'] },
    { nameEn: 'Feteer Orders', nameAr: 'طلبات الفطير', href: '/orders/feteer', icon: '📋', roles: ['admin', 'cashier'] },
    { nameEn: 'Menu', nameAr: 'تحرير القائمة', href: '/menu', icon: '📝', roles: ['admin', 'cashier'] },
    { nameEn: 'Analytics', nameAr: 'التحليلات', href: '/analytics', icon: '📊', roles: ['admin'] },
    { nameEn: 'Admin', nameAr: 'لوحة الإدارة', href: '/admin', icon: '⚙️', roles: ['admin'] }
  ];

  const navigation = allNavigation.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar-enhanced text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex justify-between items-center h-16 lg:h-20 gap-2">
          {/* Logo */}
          <div className="flex-shrink-0 min-w-0 flex-1 lg:flex-initial">
            <Link href="/" className="group text-white transition-all duration-300">
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-lg lg:text-2xl">🥞</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm lg:text-xl font-bold tracking-wide group-hover:text-amber-200 transition-colors truncate">
                    {t("St. Mark's Sweets", "حلويات وفطير القديس مرقس")}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  pathname === item.href
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-amber-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                }`}
              >
                <span className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                <span className="font-semibold whitespace-nowrap">{t(item.nameEn, item.nameAr)}</span>
              </Link>
            ))}
            
            {/* User Menu */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
              >
                <span className="mr-2">👤</span>
                <span className="font-medium">{user?.username}</span>
                <span className={`ml-2 transform transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}>▼</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    <p className="text-xs text-gray-500 font-arabic">مرحبا بك</p>
                  </div>
                  
                  {/* Language Toggle */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">{t('Language', 'اللغة')}</p>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setLanguage('en');
                          setShowUserMenu(false);
                        }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          language === 'en' 
                            ? 'bg-amber-100 text-amber-800 font-medium' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('ar');
                          setShowUserMenu(false);
                        }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors font-arabic ${
                          language === 'ar' 
                            ? 'bg-amber-100 text-amber-800 font-medium' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        العربية
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                  >
                    <span className="mr-2">🚪</span>
                    {t('Sign Out', 'خروج')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2 flex-shrink-0">
            <div className="hidden sm:block text-white text-sm">
              <span className="block font-medium text-xs truncate max-w-20">{user?.username}</span>
            </div>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300 flex-shrink-0"
              aria-label="Toggle menu"
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
            {/* Mobile User Info */}
            <div className="px-4 py-3 mt-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="flex items-center">
                <span className="text-xl mr-3">👤</span>
                <div>
                  <span className="block text-sm font-medium text-white">{user?.username}</span>
                  <span className="block text-xs capitalize text-amber-200">{user?.role}</span>
                  <span className="block text-xs font-arabic opacity-80 text-amber-100">مرحبا بك</span>
                </div>
              </div>
            </div>
            
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
                    <div className="font-semibold">{t(item.nameEn, item.nameAr)}</div>
                  </div>
                </Link>
              ))}
              
              {/* Mobile Language Toggle */}
              <div className="px-4 py-4 border-t border-white/20">
                <p className="text-sm text-amber-200 mb-3">{t('Language', 'اللغة')}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setIsOpen(false);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      language === 'en' 
                        ? 'bg-white/20 text-white font-medium' 
                        : 'bg-white/5 text-amber-200 hover:bg-white/10'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('ar');
                      setIsOpen(false);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors font-arabic ${
                      language === 'ar' 
                        ? 'bg-white/20 text-white font-medium' 
                        : 'bg-white/5 text-amber-200 hover:bg-white/10'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>

              {/* Mobile Logout */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center px-4 py-4 rounded-xl text-base font-medium text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all duration-300"
              >
                <span className="text-2xl mr-4">🚪</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{t('Sign Out', 'خروج')}</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}