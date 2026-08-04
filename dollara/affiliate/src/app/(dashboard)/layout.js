// src/app/(dashboard)/layout.js
'use client';

import { useState, useEffect } from 'react';
import Sidebar from './_components/Sidebar';
import Header from './_components/Header';





export default function DashboardLayout({ children }) {
  const [theme, setTheme] = useState('light');




  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('affiliate-theme') || 'light';
    setTheme(savedTheme);
  },
   []);



  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('affiliate-theme', newTheme);
  };



  return (

    <div className={`${theme === 'dark' ? 'dark' : ''} w-full h-full`}>

      <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
       
       
        {/* Persistent left sidebar */}
        <Sidebar theme={theme} />

       
        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        
        
          {/* Persistent top header */}
          <Header theme={theme} toggleTheme={toggleTheme} />

         
         
          {/* Dynamic page content */}
         
         
          <main className="flex-1 overflow-y-auto p-6 bg-[#F4F6FA] dark:bg-slate-950 transition-colors duration-300">
          
            {children}
         
          </main>
       
       
        </div>
    
      </div>
   
   
    </div>
  );
}
