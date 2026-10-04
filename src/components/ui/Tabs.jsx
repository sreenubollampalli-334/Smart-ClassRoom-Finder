import React, { useState } from 'react';

export const Tabs = ({ tabs, defaultTab, onChange, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onChange) onChange(tabId);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                {tab.icon && <tab.icon className={`inline-block mr-2 h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-6 fade-in">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};
