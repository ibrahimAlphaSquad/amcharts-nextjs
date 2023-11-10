import React, { useState } from 'react';

const Tabs = ({ tabs }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const onTabClick = (index) => {
    setActiveTabIndex(index);
  };

  return (
    <div className='w-full px-3'>
      {/* Tab Headers */}
      <div className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`py-2 px-4 text-lg font-bold ${
              index === activeTabIndex
                ? 'border-b-2 border-blue-700 text-blue-800'
                : 'text-gray-900 hover:text-blue-600'
            }`}
            onClick={() => onTabClick(index)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="p-4">
        {tabs[activeTabIndex].content}
      </div>
    </div>
  );
};

export default Tabs;

// Usage Example
/*
const tabsData = [
    { title: 'Candle Chart', content: <CandleChart instId="BTC-USD-SWAP" channel="mark-price-candle1m" lastMessage={lastMessage} /> },
    { title: 'Ticker', content: <LineChart /> },
  ]


  <Tabs tabs={tabsData} />
*/
