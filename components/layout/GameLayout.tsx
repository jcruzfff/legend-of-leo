'use client';

import React, { ReactNode } from 'react';

interface GameLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({
  children,
  header,
  sidebar,
}) => {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#2B2A3D' }}>
      {/* Header - optional */}
      {header && (
        <header className="w-full p-4 bg-primary-500 text-ui-text shadow-md">
          {header}
        </header>
      )}

      {/* Main content area with optional sidebar */}
      <main className="flex flex-1 overflow-hidden">
        {/* Game container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-auto aspect-[4/3] shadow-xl rounded-lg overflow-hidden" style={{ backgroundColor: '#2B2A3D' }}>
            {children}
          </div>
        </div>

        {/* Sidebar - optional */}
        {sidebar && (
          <aside className="w-64 p-4 text-ui-text shadow-inner" style={{ backgroundColor: '#2B2A3D' }}>
            {sidebar}
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full p-2 bg-primary-500 text-ui-text text-xs text-center">
        Legend of Leo - An educational Aleo blockchain game
      </footer>
    </div>
  );
};

export default GameLayout; 