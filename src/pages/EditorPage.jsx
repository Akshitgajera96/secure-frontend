import React from 'react';

import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CanvasArea } from '@/components/CanvasArea';
import { Toolbar } from '@/components/Toolbar';

import '@/styles/editor.css';

const EditorPage = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 min-h-0 flex flex-row">
        <Sidebar />
        <CanvasArea />
        <Toolbar />
      </div>
    </div>
  );
};

export default EditorPage;
