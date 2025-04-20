import React, { useEffect, useState } from 'react';

function TimeTracking({ stream, streams, setTotalWatchTimeSeconds, totalWatchTimeSeconds }) {
    const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [watchTime, setWatchTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (stream) {
            const intervalId = setInterval(() => {
                const streamerData = streams.find(data => data.user_name === stream);
                if (streamerData) {
                    const now = new Date();
                    const start = new Date(streamerData.started_at);
                    const elapsedSeconds = Math.floor((now - start) / 1000);
                    const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
                    const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
                    const seconds = String(elapsedSeconds % 60).padStart(2, '0');

                    setElapsedTime({ hours, minutes, seconds });
                } else {
                    setElapsedTime({ hours: '00', minutes: '00', seconds: '00' }); // Reset elapsed time if streamerData is not found
                }
            }, 1000);

            return () => clearInterval(intervalId);
        }
    }, [stream, streams]);

    useEffect(() => {
        let intervalId;
        if (stream) {
            intervalId = setInterval(() => {
                setTotalWatchTimeSeconds(prev => {
                    const newTime = prev + 1;

                    // Log current streamer and watch time in seconds elapsed
                    console.log(`Current Streamer: ${stream}, Watch Time (seconds): ${newTime}`);

                    return newTime;
                });
            }, 1000);
        }

        return () => clearInterval(intervalId);
    }, [stream, setTotalWatchTimeSeconds]);

    useEffect(() => {
        const hours = String(Math.floor(totalWatchTimeSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalWatchTimeSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalWatchTimeSeconds % 60).padStart(2, '0');

        setWatchTime({ hours, minutes, seconds });
    }, [totalWatchTimeSeconds]); 

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ padding: '0 10px' }}>E: {elapsedTime.hours}:{elapsedTime.minutes}:{elapsedTime.seconds}</p>
            <p style={{ padding: '0 10px' }}>W: {watchTime.hours}:{watchTime.minutes}:{watchTime.seconds}</p>
        </div>
    );
}

export default TimeTracking;