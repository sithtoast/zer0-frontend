import React, { useEffect, useState } from 'react';

function TimeTracking({ stream, streams, setTotalWatchTimeSeconds, totalWatchTimeSeconds }) {
    const [elapsedTime, setElapsedTime] = useState({ hours: '00', minutes: '00', seconds: '00' }); // Initialize as strings
    const [watchTime, setWatchTime] = useState({ hours: '00', minutes: '00', seconds: '00' }); // Initialize as strings

    // Effect for Elapsed Time
    useEffect(() => {
        console.log('[TimeTracking Elapsed Effect] Stream:', stream, 'Streams:', streams); // Log inputs

        // Check if stream exists AND streams is a non-empty array before starting interval
        if (stream && Array.isArray(streams) && streams.length > 0) {
            let intervalId = null; // Define intervalId here

            const updateElapsedTime = () => {
                // Ensure streams is still valid inside interval
                if (!Array.isArray(streams)) {
                     console.log('[TimeTracking Elapsed Interval] Streams is not an array anymore.');
                     setElapsedTime({ hours: '00', minutes: '00', seconds: '00' });
                     if (intervalId) clearInterval(intervalId); // Clear interval if streams become invalid
                     return;
                }

                const streamerData = streams.find(data => data.user_name === stream);
                //console.log('[TimeTracking Elapsed Interval] Found streamerData:', streamerData); // Log found data

                if (streamerData && streamerData.started_at) {
                    const now = new Date();
                    const start = new Date(streamerData.started_at);
                    const elapsedSeconds = Math.floor((now - start) / 1000);
                    //console.log('[TimeTracking Elapsed Interval] Calculated elapsedSeconds:', elapsedSeconds); // Log calculation

                    if (elapsedSeconds >= 0) {
                        const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
                        const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
                        const seconds = String(elapsedSeconds % 60).padStart(2, '0');
                        setElapsedTime({ hours, minutes, seconds });
                    } else {
                         console.log('[TimeTracking Elapsed Interval] Negative elapsed time, resetting.');
                         setElapsedTime({ hours: '00', minutes: '00', seconds: '00' });
                    }
                } else {
                    console.log('[TimeTracking Elapsed Interval] StreamerData or started_at not found, resetting.');
                    setElapsedTime({ hours: '00', minutes: '00', seconds: '00' });
                    // Consider clearing interval if data is permanently missing?
                    // if (intervalId) clearInterval(intervalId);
                }
            };

            // Run immediately and then set interval
            updateElapsedTime();
            intervalId = setInterval(updateElapsedTime, 1000);

            // Cleanup function
            return () => {
                console.log('[TimeTracking Elapsed Effect] Cleaning up interval.');
                clearInterval(intervalId);
            };
        } else {
            // Reset elapsed time if stream is null/undefined or streams is not a valid array
             console.log('[TimeTracking Elapsed Effect] No stream or invalid streams array, resetting elapsed time.');
             setElapsedTime({ hours: '00', minutes: '00', seconds: '00' });
        }
    }, [stream, streams]); // Dependency array includes streams

    // Effect for Watch Time
    useEffect(() => {
        let intervalId;
        if (stream) {
            console.log('[TimeTracking Watch Effect] Starting watch time interval for:', stream);
            intervalId = setInterval(() => {
                setTotalWatchTimeSeconds(prev => {
                    const newTime = prev + 1;
                    // console.log(`[TimeTracking Watch Interval] Current Streamer: ${stream}, Watch Time (seconds): ${newTime}`);
                    return newTime;
                });
            }, 1000);
        } else {
            console.log('[TimeTracking Watch Effect] No stream, interval not started/cleared.');
        }
        // Clear interval if stream becomes null/undefined or component unmounts
        return () => {
            console.log('[TimeTracking Watch Effect] Cleaning up watch time interval.');
            clearInterval(intervalId);
        };
    }, [stream, setTotalWatchTimeSeconds]); // Keep dependencies

    // Effect to format Watch Time
    useEffect(() => {
        const hours = String(Math.floor(totalWatchTimeSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalWatchTimeSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalWatchTimeSeconds % 60).padStart(2, '0');
        setWatchTime({ hours, minutes, seconds });
    }, [totalWatchTimeSeconds]);

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* Ensure state values are used */}
            <p style={{ padding: '0 10px' }}>E: {elapsedTime.hours}:{elapsedTime.minutes}:{elapsedTime.seconds}</p>
            <p style={{ padding: '0 10px' }}>W: {watchTime.hours}:{watchTime.minutes}:{watchTime.seconds}</p>
        </div>
    );
}

export default TimeTracking;