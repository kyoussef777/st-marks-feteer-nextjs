'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './components/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new feteer orders page
    router.replace('/new-orders/feteer');
  }, [router]);

  // Show loading screen while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <LoadingSpinner 
        size="xl" 
        message="Redirecting to Feteer Orders..." 
        messageAr="توجيه إلى طلبات الفطير..."
      />
    </div>
  );
}
