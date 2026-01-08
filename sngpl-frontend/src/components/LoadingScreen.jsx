import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoadingScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to dashboard after 4 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated Background Patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-indigo-400/30 to-transparent rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-400/20 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Rotating SNGPL Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Outer Glow Ring */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="w-48 h-48 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500"></div>
            </div>

            {/* Middle Ring */}
            <div className="absolute inset-4 animate-spin-reverse">
              <div className="w-40 h-40 rounded-full border-4 border-transparent border-b-purple-400 border-l-blue-400"></div>
            </div>

            {/* Logo Container */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse-gentle">
                <div className="animate-gentle-rotate">
                  <img
                    src="/assets/sngpl-logo.png"
                    alt="SNGPL Logo"
                    className="h-20 w-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      parent.innerHTML = '<span class="text-4xl font-bold text-white">SNGPL</span>';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
            Welcome to SMS Monitoring System
          </h2>
          <p className="text-lg text-gray-600 font-medium animate-fade-in-delayed">
            Initializing your dashboard...
          </p>

          {/* Loading Progress Dots */}
          <div className="flex justify-center items-center space-x-2 pt-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>

        {/* Feature Cards Preview */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto px-4 animate-slide-up">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-700">Real-time Monitoring</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-700">Smart Alerts</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-purple-100">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-700">Secure Access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
