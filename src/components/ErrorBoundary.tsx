import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('{"error":')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-2xl font-bold">System Error</h1>
          </div>
          <p className="text-gray-600 mb-6 font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-40">
            {errorInfo}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
