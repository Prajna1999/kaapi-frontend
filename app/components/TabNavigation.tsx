/**
 * TabNavigation - Generic two-tab switcher component
 * Provides a tab interface with active state highlighting
 */

"use client"
import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
      <div className="flex px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: isActive ? 'hsl(167, 59%, 22%)' : 'transparent',
                color: isActive ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
