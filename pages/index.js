import { useEffect, useRef } from 'react';

import { Inter } from 'next/font/google';

import useWebSocket from 'react-use-websocket';

import CandleChart from '@/components/candleChart';
import LineChart from '@/components/lineChart';

const inter = Inter({ subsets: ['latin'] });

// WebSocket connection URL
const SOCKET_URL = 'wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999';

export default function Home({ instId = "BTC-USD-SWAP", channel = "mark-price-candle1m" }) {
  // The hook returns a send function and the last message received
  const { sendMessage, lastMessage } = useWebSocket(SOCKET_URL, {
    onOpen: () => console.log('WebSocket Connected'),
    // Will attempt to reconnect on all close events
    shouldReconnect: (closeEvent) => true,
  });

  // Send the subscription message when the component mounts
  useEffect(() => {
    const message = {
      op: 'subscribe',
      args: [
        {
          channel: channel,
          instId: instId,
        },
      ],
    };
    sendMessage(JSON.stringify(message));
  }, [instId, sendMessage]);

  return (
    <main className={`flex min-h-screen flex-col items-center gap-6 ${inter.className}`}>
      
      <div className='flex items-center gap-1 w-full border border-gray-900'>
        <CandleChart instId="BTC-USD-SWAP" channel="mark-price-candle1m" lastMessage={lastMessage} />
        <LineChart />
      </div>
    </main>
  )
}
