'use client';

import React from 'react';
import Sidebar from '../../components/Sidebar';
import { CommandPalette } from '../../components/CommandPalette';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout-container">
      <Sidebar />
      <main className="dashboard-layout-main">
        <div className="dashboard-layout-content">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
