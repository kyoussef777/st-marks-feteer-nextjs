'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  messageAr?: string;
  overlay?: boolean;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  message, 
  messageAr, 
  overlay = false,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin`}></div>
      {(message || messageAr) && (
        <div className="mt-3 text-center">
          {message && (
            <div className="text-sm text-gray-600 font-medium">{message}</div>
          )}
          {messageAr && (
            <div className="text-xs font-arabic text-amber-700">{messageAr}</div>
          )}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline loading spinner for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`}></div>
  );
}

// Loading skeleton for content
export function LoadingSkeleton({ 
  lines = 3, 
  className = '',
  height = 'h-4'
}: { 
  lines?: number; 
  className?: string;
  height?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded animate-pulse ${height} ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
}

// Loading card for orders
export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-200 ${className}`}>
      <div className="animate-pulse">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}