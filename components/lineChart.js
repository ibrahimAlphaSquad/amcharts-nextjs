import React from 'react'

function LineChart({ instId, channel, lastMessage = null }) {
    // console.log("Candle Chart props", { instId, channel, lastMessage });
    return (
        <div className='p-4 flex flex-col items-center justify-center gap-3 w-full'>
            <h1 className="py-2 text-center font-bold text-2xl text-gray-900">Line Chart</h1>
        </div>
    )
}

export default LineChart