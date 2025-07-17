import React from 'react';
import '@/app/loader.css';

export function CustomLoader() {
  return (
    <div className="loader-body">
      <main className="loader-main">
        <div className="preloader">
          <div className="preloader__square"></div>
          <div className="preloader__square"></div>
          <div className="preloader__square"></div>
          <div className="preloader__square"></div>
        </div>
        <div className="status">
          Loading<span className="status__dot">.</span><span className="status__dot">.</span><span className="status__dot">.</span>
        </div>
      </main>
    </div>
  );
}
