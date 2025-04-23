import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import Followers from './Followers';
import TimeTracking from './TimeTracking';
import Raid from './Raid';

const apiUrl = process.env.REACT_APP_API_URL;

// Helper function (keep as is)
const findStreamDetails = (streamName, streamsList) => {
    if (!streamName || !Array.isArray(streamsList)) return null;
    return streamsList.find(s => s.user_name === streamName) || null;
};

function StreamEmbed({ stream, streams, closeStream }) {
    // State variables
    const [localUserId, setLocalUserId] = useState(null);
    const [profileData, setProfileData] = useState({});
    const [sessionLoading, setSessionLoading] = useState(true);
    const [embedLoading, setEmbedLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalWatchTimeSeconds, setTotalWatchTimeSeconds] = useState(0);
    const [sessionData, setSessionData] = useState(null);

    // Refs
    const initializedStreamRef = useRef(null);
    const embedInstanceRef = useRef(null);
    const checkIntervalRef = useRef(null);
    const lastStreamNameRef = useRef(null); // Ref to track the currently active stream name

    // --- Fetch Profile Data (keep as is) ---
    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            setProfileData(response.data);
            setLocalUserId(response.data.user.userId);
        } catch (err) {
            console.error('There was an error fetching profile data!', err);
        }
    };

    // --- Effect for Session and Profile (keep as is) ---
    useEffect(() => {
        let isMounted = true;
        const fetchSessionAndProfile = async () => {
            // ... (existing session fetch logic) ...
            console.log("[Session Effect] Starting fetch...");
            setError('');
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, { withCredentials: true });
                if (!isMounted) return;
                setSessionData(response.data);
                console.log("[Session Effect] Session data fetched:", response.data);
                if (response.data?.user?.userId !== 0) {
                    await fetchProfileData();
                }
            } catch (error) {
                 if (!isMounted) return;
                console.error('[Session Effect] Error fetching session data:', error);
                setError('Failed to load session data.');
            } finally {
                if (isMounted) {
                    console.log("[Session Effect] Reached finally block. Setting sessionLoading to false.");
                    setSessionLoading(false);
                } else {
                     console.log("[Session Effect] Reached finally block BUT component unmounted.");
                }
            }
       };
       fetchSessionAndProfile();
       return () => { isMounted = false; console.log("[Session Effect] Cleanup."); };
    }, []); // Empty dependency array is correct here

    // --- Function to send watch time update ---
    const sendWatchTimeUpdate = useCallback(async (streamNameToUpdate, timeToSend) => {
        if (!streamNameToUpdate || timeToSend <= 0) {
            console.log(`[sendWatchTimeUpdate] Skipping: No stream name or zero/negative time (${timeToSend}s).`);
            return;
        }

        const streamInfo = findStreamDetails(streamNameToUpdate, streams);
        const twitchId = streamInfo?.user_id;
        const categoryId = streamInfo?.game_id;
        const categoryName = streamInfo?.game_name;

        if (twitchId && categoryId && categoryName) {
            console.log(`[sendWatchTimeUpdate] Sending ${timeToSend}s for ${streamNameToUpdate} (Twitch ID: ${twitchId})`);
            try {
                await axios.post(`${apiUrl}/api/twitch/streamer/update`, {
                    twitchId, watchTime: timeToSend, categoryId, categoryName
                }, { withCredentials: true });
                console.log(`[sendWatchTimeUpdate] Update successful for ${streamNameToUpdate}.`);
            } catch (error) {
                console.error(`[sendWatchTimeUpdate] Error updating watch time for ${streamNameToUpdate}:`, error.response?.data || error.message);
                // Consider adding error state feedback if needed
            }
        } else {
            console.log(`[sendWatchTimeUpdate] Skipping update for ${streamNameToUpdate}: Missing stream details (ID, CatID, CatName).`);
        }
    }, [streams]); // Depends on the streams list to find details

    // --- Effect for Embed Initialization/Cleanup ---
    useEffect(() => {
        const embedContainerId = 'twitch-embed-stream';
        let isMounted = true;
        const currentStreamName = stream; // Capture prop value for use in cleanup

        // Update the ref whenever the stream prop changes
        lastStreamNameRef.current = currentStreamName;

        console.log(`[Embed Effect] Run. Stream: ${currentStreamName}`);

        const cleanup = () => {
            console.log(`[Embed Effect Cleanup] Running cleanup for stream: ${currentStreamName || 'none'}`);
            isMounted = false;
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;

            const twitchEmbedElement = document.getElementById(embedContainerId);
            if (twitchEmbedElement) {
                twitchEmbedElement.innerHTML = ''; // Clear embed content
                console.log(`[Embed Cleanup] Content cleared.`);
            }

            embedInstanceRef.current = null;
            initializedStreamRef.current = null;

            // --- Send FINAL watch time on cleanup ---
            // This sends time accumulated since the last 'visibilitychange' hidden event,
            // or the total time if visibility never changed or component unmounts.
            if (currentStreamName && totalWatchTimeSeconds > 0) {
                console.log(`[Embed Cleanup] Sending final ${totalWatchTimeSeconds}s for ${currentStreamName}`);
                sendWatchTimeUpdate(currentStreamName, totalWatchTimeSeconds);
                // Reset time *after* sending attempt in cleanup
                // Note: State updates might not complete before unmount, but it's good practice
                setTotalWatchTimeSeconds(0);
            }
            // --- End send watch time ---

            lastStreamNameRef.current = null; // Clear ref on final cleanup
            console.log("[Embed Cleanup] Complete.");
        };

        const initializeEmbed = () => {
            // --- Initialize Embed Logic (remains largely the same) ---
            if (!isMounted || !currentStreamName || initializedStreamRef.current === currentStreamName) {
                 if (initializedStreamRef.current === currentStreamName) console.log(`[initializeEmbed] Already initialized for ${currentStreamName}.`);
                 else console.log(`[initializeEmbed] Aborted. Mounted: ${isMounted}, Stream: ${currentStreamName}`);
                 if (isMounted) setEmbedLoading(false);
                 return;
            }
            console.log(`[initializeEmbed] Attempting to initialize for stream: ${currentStreamName}`);
            const element = document.getElementById(embedContainerId);
            if (!element) { /* ... error handling ... */ return; }
            if (!window.Twitch || typeof window.Twitch.Embed !== 'function') { /* ... error handling ... */ return; }

            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
            embedInstanceRef.current = null;

            try {
                const embedOptions = { width: "100%", height: 480, channel: currentStreamName, layout: "video-with-chat", parent: ["zer0.tv", "localhost"] };
                const newEmbed = new window.Twitch.Embed(embedContainerId, embedOptions);
                embedInstanceRef.current = newEmbed;
                newEmbed.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
                    console.log(`[Embed Event] VIDEO_READY for ${currentStreamName}`);
                    if (isMounted) { setEmbedLoading(false); initializedStreamRef.current = currentStreamName; if (error && !error.includes('session')) setError(''); }
                });
                newEmbed.addEventListener(window.Twitch.Embed.VIDEO_PLAY, () => { console.log(`[Embed Event] VIDEO_PLAY for ${currentStreamName}`); });
                console.log("[initializeEmbed] Twitch Embed instance created.");
            } catch (initError) { /* ... error handling ... */ }
            // --- End Initialize Embed Logic ---
        };

        if (currentStreamName) {
            console.log(`[Embed Effect Logic] Stream selected (${currentStreamName}). Setting up check.`);
            // Reset time only if the stream *changes* from a previous one
            if (lastStreamNameRef.current !== currentStreamName && initializedStreamRef.current !== currentStreamName) {
                 console.log(`[Embed Effect Logic] New stream detected (${currentStreamName}), resetting watch time.`);
                 setTotalWatchTimeSeconds(0);
            }
            if (error && !error.includes('session')) setError('');
            setEmbedLoading(true);
            initializedStreamRef.current = null; // Mark as needing init
            clearInterval(checkIntervalRef.current); // Clear previous interval
            // Start interval to check for Twitch script readiness
            checkIntervalRef.current = setInterval(() => {
                const element = document.getElementById(embedContainerId);
                if (element && window.Twitch && typeof window.Twitch.Embed === 'function') {
                    console.log("[Interval Check] Ready! Calling initializeEmbed.");
                    initializeEmbed(); // Initialize once ready
                } else {
                    console.log("[Interval Check] Waiting for Twitch script/element...");
                }
            }, 300);
        } else {
            console.log("[Embed Effect Logic] No stream selected. Running cleanup.");
            cleanup(); // Trigger cleanup (and potential final send) if stream becomes null
            if (isMounted) setEmbedLoading(false);
        }

        // Return the cleanup function to be called on unmount or when `stream` changes
        return cleanup;

    }, [stream, error, sendWatchTimeUpdate]); // Add sendWatchTimeUpdate dependency

    // --- Effect for Visibility Change ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            const streamNameToUpdate = lastStreamNameRef.current; // Get current stream from ref

            if (document.hidden) {
                // Page is hidden - send current time and reset
                if (streamNameToUpdate && totalWatchTimeSeconds > 0) {
                    console.log(`[Visibility] Page hidden. Sending ${totalWatchTimeSeconds}s for ${streamNameToUpdate}`);
                    // Send the update
                    sendWatchTimeUpdate(streamNameToUpdate, totalWatchTimeSeconds);
                    // Reset time *after* attempting send
                    setTotalWatchTimeSeconds(0);
                } else {
                     console.log(`[Visibility] Page hidden. No active stream or time to send.`);
                }
            } else {
                // Page is visible - No action needed here, TimeTracking component handles resuming
                console.log(`[Visibility] Page visible.`);
                // Optional: Could reset time here too if desired, but TimeTracking should handle pauses
                // setTotalWatchTimeSeconds(0);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        console.log("[Visibility] Listener added.");

        // Cleanup listener on component unmount or when dependencies change
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            console.log("[Visibility] Listener removed.");
            // Note: The main embed effect's cleanup handles sending final time on unmount.
        };
        // Dependencies: time, the send function, and streams (needed by send function)
    }, [totalWatchTimeSeconds, sendWatchTimeUpdate, streams]);

    // --- Handle Closing the Stream (Explicit Button Click) ---
    const handleCloseStream = async () => {
        const streamNameToClose = stream; // Capture current stream name from prop
        const timeToSend = totalWatchTimeSeconds; // Capture current time

        // Reset time immediately to prevent potential double sends (e.g., visibility change fires right after)
        setTotalWatchTimeSeconds(0);

        // Send time via POST using the reusable function
        if (streamNameToClose && timeToSend > 0) {
             console.log(`[CloseStream Button] Sending ${timeToSend}s for ${streamNameToClose}`);
             await sendWatchTimeUpdate(streamNameToClose, timeToSend); // Use await if subsequent actions depend on it
        } else {
             console.log(`[CloseStream Button] Skipping update: No stream or zero time.`);
        }

        // Call the original closeStream prop (passed from parent to hide/remove embed)
        console.log("[CloseStream Button] Calling closeStream prop.");
        closeStream();
    };

    // --- Render Logic ---
    const currentStreamInfoForRender = findStreamDetails(stream, streams);

    // Loading/Error States for Session
    if (sessionLoading) {
        return (
             <div className="loading-container-inline" style={{ height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner-small"></div>
                <span>Loading User Info...</span>
            </div>
        );
    }
    if (error && error.includes('session')) {
         return <p className="error-message" style={{ height: '520px' }}>{error}</p>;
    }

    // Main Render
    return (
        <div> {/* Keep the outer div for structure */}
            <div id="twitch-embed">
                {/* Embed container */}
                <div id="twitch-embed-stream" style={{ height: '480px', background: 'var(--twitch-dark)', position: 'relative' }}>
                    {/* Conditional rendering inside for loading/placeholder/error */}
                    {embedLoading && stream && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'var(--twitch-text)' }}>
                            <div className="loading-spinner-small"></div>
                            <span style={{ marginLeft: '10px' }}>Loading Stream...</span>
                        </div>
                    )}
                    {!stream && !embedLoading && (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--twitch-gray)'}}>
                            Select a stream to watch
                        </div>
                    )}
                    {error && !error.includes('session') && (
                         <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--twitch-danger)'}}>
                             Error loading embed: {error}
                         </div>
                     )}
                </div>

                {/* Controls - Only show if a stream is selected */}
                {stream && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--twitch-dark-alt)', borderTop: '1px solid var(--twitch-light-gray)' }}>
                        {/* Left Controls */}
                        <div>
                            <button onClick={handleCloseStream} className="embed-control-button">Close Stream</button>
                            {sessionData?.user?.userId !== 0 && currentStreamInfoForRender && (
                                <Raid stream={stream} streamInfo={currentStreamInfoForRender} userId={localUserId} />
                            )}
                        </div>
                        {/* Right Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {sessionData?.user?.userId !== 0 && currentStreamInfoForRender && (
                                <Followers stream={stream} streams={streams} streamInfo={currentStreamInfoForRender} />
                            )}
                            <TimeTracking
                                stream={stream} // Pass current stream name
                                streams={streams} // Pass streams list
                                setTotalWatchTimeSeconds={setTotalWatchTimeSeconds} // Pass setter
                                totalWatchTimeSeconds={totalWatchTimeSeconds} // Pass current time
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StreamEmbed;