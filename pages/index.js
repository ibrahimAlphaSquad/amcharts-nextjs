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

  // You can use lastMessage for the most recent message
  const parsedMessage = lastMessage ? JSON.parse(lastMessage.data) : null;

  return (
    <main className={`flex min-h-screen flex-col items-center gap-6 ${inter.className}`}>
      <div className='flex flex-col items-center justify-center gap-3 w-full'>
        <h2 className="text-xl font-bold">{instId}</h2>
        <h3>Channel: {channel}</h3>
        <div className='flex flex-col justify-center items-center gap-2'>
          {parsedMessage && parsedMessage.data && parsedMessage.data.length && parsedMessage.data[0].map((item, idx, arr) => {
            return (
              <p key={idx}>{item}</p>
            )
          })}
        </div>
      </div>
      <div className='flex items-center gap-1 w-full border border-gray-900'>
        <CandleChart instId="BTC-USD-SWAP" channel="mark-price-candle1m" lastMessage={lastMessage} />
        <LineChart instId="BTC-USD-SWAP" channel="mark-price-candle1m" lastMessage={lastMessage} />
      </div>
    </main>
  )
}
