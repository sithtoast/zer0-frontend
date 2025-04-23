import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Followers from './Followers';
import TimeTracking from './TimeTracking';
import Raid from './Raid';

const apiUrl = process.env.REACT_APP_API_URL;

// Helper function (keep as is)
const findStreamDetails = (streamName, streamsList) => {
    if (!streamName || !Array.isArray(streamsList)) {
        return null;
    }
    return streamsList.find(s => s.user_name === streamName) || null;
};

function StreamEmbed({ stream, streams, closeStream }) {
    const [localUserId, setLocalUserId] = useState(null);
    const [profileData, setProfileData] = useState({});
    // Use separate loading states
    const [sessionLoading, setSessionLoading] = useState(true); // Start true for initial session load
    const [embedLoading, setEmbedLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalWatchTimeSeconds, setTotalWatchTimeSeconds] = useState(0);
    const [sessionData, setSessionData] = useState(null);
    const initializedStreamRef = useRef(null);
    const embedInstanceRef = useRef(null);
    const checkIntervalRef = useRef(null);

    // --- Fetch Profile Data (can be called by the session effect) ---
    const fetchProfileData = async () => {
        // Make sure error handling here doesn't overwrite session errors if needed
        // or use a different error state for profile errors.
        try {
            const response = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            setProfileData(response.data);
            setLocalUserId(response.data.user.userId);
        } catch (err) {
            // Consider setting a specific profile error if needed
            // setError('Failed to fetch profile data');
            console.error('There was an error fetching profile data!', err);
        }
    };

    // --- Effect for Session and Profile (runs ONCE on mount) ---
    useEffect(() => {
        let isMounted = true; // Track mount status for this specific effect

        const fetchSessionAndProfile = async () => {
            console.log("[Session Effect] Starting fetch...");
            // No need to set sessionLoading(true) here, it defaults to true
            setError(''); // Clear errors specific to session loading
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, { withCredentials: true });
                if (!isMounted) return; // Check if unmounted during API call

                setSessionData(response.data);
                console.log("[Session Effect] Session data fetched:", response.data);

                if (response.data?.user?.userId !== 0) {
                    // Fetch profile only if logged in
                    await fetchProfileData(); // Call the profile fetch function
                }
            } catch (error) {
                 if (!isMounted) return;
                console.error('[Session Effect] Error fetching session data:', error);
                setError('Failed to load session data.'); // Set session-specific error
            } finally {
                if (isMounted) {
                    console.log("[Session Effect] Reached finally block. Setting sessionLoading to false.");
                    setSessionLoading(false); // Set loading false *only* for session
                } else {
                     console.log("[Session Effect] Reached finally block BUT component unmounted.");
                }
            }
       };

       fetchSessionAndProfile();

       // Cleanup for the session effect
       return () => {
           isMounted = false;
           console.log("[Session Effect] Cleanup.");
       };
    }, []); // <-- Empty dependency array ensures this runs only once on mount

    // --- Effect for Embed Initialization/Cleanup (depends on stream) ---
    useEffect(() => {
        const embedContainerId = 'twitch-embed-stream';
        let isMounted = true; // Separate mount tracking for this effect

        console.log(`[Embed Effect] Run. Stream: ${stream}`);
        // Don't clear session errors here, clear only embed-related errors if needed
        // setError(''); // Maybe clear only non-session errors: if (error && !error.includes('session')) setError('');

        // --- Cleanup Function (for embed) ---
        const cleanup = () => {
            console.log(`[Embed Effect Cleanup] Running cleanup for stream: ${stream || 'none'}`);
            isMounted = false;
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;

            const twitchEmbedElement = document.getElementById(embedContainerId);
            if (twitchEmbedElement) {
                twitchEmbedElement.innerHTML = '';
                console.log(`[Embed Cleanup] Content cleared.`);
            } else {
                console.warn(`[Embed Cleanup] Element #${embedContainerId} not found.`);
            }

            embedInstanceRef.current = null;
            initializedStreamRef.current = null;
            console.log("[Embed Cleanup] Complete.");
        };

        // --- Initialize Embed ---
        const initializeEmbed = () => {
            if (!isMounted || !stream || initializedStreamRef.current === stream) {
                if (initializedStreamRef.current === stream) {
                    console.log(`[initializeEmbed] Already initialized for ${stream}.`);
                    if (isMounted) setEmbedLoading(false);
                } else {
                    console.log(`[initializeEmbed] Aborted. Mounted: ${isMounted}, Stream: ${stream}`);
                }
                return;
            }

            console.log(`[initializeEmbed] Attempting to initialize for stream: ${stream}`);
            const element = document.getElementById(embedContainerId);

            if (!element) {
                console.error(`[initializeEmbed] CRITICAL: Element #${embedContainerId} NOT FOUND!`);
                 if(isMounted) {
                    setError('Embed container not found.'); // Set embed-specific error
                    setEmbedLoading(false);
                 }
                return;
            }
            if (!window.Twitch || typeof window.Twitch.Embed !== 'function') {
                 console.error(`[initializeEmbed] CRITICAL: window.Twitch.Embed NOT FOUND!`);
                  if(isMounted) {
                    setError('Twitch script not loaded.'); // Set embed-specific error
                    setEmbedLoading(false);
                 }
                 return;
            }

            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
            console.log("[initializeEmbed] Element and window.Twitch ready.");

            embedInstanceRef.current = null; // Ensure ref is null before creating new

            try {
                const embedOptions = {
                    width: "100%",
                    height: 480,
                    channel: stream,
                    layout: "video-with-chat",
                    parent: ["zer0.tv", "localhost"] // Verify domains
                };
                console.log("[initializeEmbed] Creating embed with options:", embedOptions);

                const newEmbed = new window.Twitch.Embed(embedContainerId, embedOptions);
                embedInstanceRef.current = newEmbed;

                newEmbed.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
                    console.log(`[Embed Event] VIDEO_READY for ${stream}`);
                    if (isMounted) {
                        setEmbedLoading(false);
                        initializedStreamRef.current = stream;
                        // Clear embed-specific errors on success
                        if (error && !error.includes('session')) setError('');
                    }
                });
                newEmbed.addEventListener(window.Twitch.Embed.VIDEO_PLAY, () => {
                     console.log(`[Embed Event] VIDEO_PLAY for ${stream}`);
                });

                console.log("[initializeEmbed] Twitch Embed instance created.");

            } catch (initError) {
                 console.error("[initializeEmbed] FATAL Error during new window.Twitch.Embed():", initError);
                 initializedStreamRef.current = null;
                 embedInstanceRef.current = null;
                 if (isMounted) {
                    // Set embed-specific error
                    setError(`Failed to create embed: ${initError.message}`);
                    setEmbedLoading(false);
                 }
            }
        };

        // --- Embed Effect Logic ---
        if (stream) {
            console.log(`[Embed Effect Logic] Stream selected (${stream}). Setting up check.`);
            // Clear previous embed errors when trying a new stream
             if (error && !error.includes('session')) setError('');
            setEmbedLoading(true); // Show loading for embed
            initializedStreamRef.current = null;

            clearInterval(checkIntervalRef.current); // Clear previous interval

            checkIntervalRef.current = setInterval(() => {
                // console.log(`[Interval Check] Checking for embed readiness for ${stream}...`); // Reduce console noise
                const element = document.getElementById(embedContainerId);
                if (element && window.Twitch && typeof window.Twitch.Embed === 'function') {
                    console.log("[Interval Check] Ready! Calling initializeEmbed.");
                    initializeEmbed(); // Will clear interval if successful
                } else {
                    // console.log(`[Interval Check] Not ready yet.`); // Reduce noise
                }
            }, 300);

        } else {
            console.log("[Embed Effect Logic] No stream selected. Running cleanup.");
            cleanup(); // Clear embed if stream becomes null
            if (isMounted) setEmbedLoading(false); // No stream, not loading embed
        }

        // Return the cleanup function for the embed effect
        return cleanup;

    }, [stream, error]); // Keep 'stream' dependency, add 'error' if clearing errors inside

    // --- Handle Closing the Stream (keep as is) ---
    const handleCloseStream = async () => {
        const currentStreamInfo = findStreamDetails(stream, streams);
        console.log("Stream info found on close:", currentStreamInfo);
        let twitchId = currentStreamInfo?.user_id;
        let categoryId = currentStreamInfo?.game_id;
        let categoryName = currentStreamInfo?.game_name;
        let shouldUpdateWatchTime = false;
        if (twitchId && categoryId && totalWatchTimeSeconds > 0) {
            shouldUpdateWatchTime = true;
            console.log(`Preparing to update watch time - Streamer: ${twitchId}, Category: ${categoryId}, Watch Time: ${totalWatchTimeSeconds}s`);
        } else {
            console.log(`Skipping watch time update: twitchId=${twitchId}, categoryId=${categoryId}, watchTime=${totalWatchTimeSeconds}s`);
        }
        if (shouldUpdateWatchTime) {
            try {
                await axios.post(`${apiUrl}/api/twitch/streamer/update`, {
                    twitchId, watchTime: totalWatchTimeSeconds, categoryId, categoryName
                }, { withCredentials: true });
                console.log('Watch time updated successfully');
            } catch (error) {
                console.error('Error updating watch time:', error.response?.data || error.message);
            }
        }
        console.log("Resetting watch time and calling closeStream prop.");
        setTotalWatchTimeSeconds(0);
        closeStream();
    };

    // --- Render Logic ---
    const currentStreamInfoForRender = findStreamDetails(stream, streams);

    // Show initial loading only for session/profile
    if (sessionLoading) {
        return (
             <div className="loading-container-inline" style={{ height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner-small"></div>
                <span>Loading User Info...</span>
            </div>
        );
    }

    // Show session error prominently if it occurred
    if (error && error.includes('session')) {
         return <p className="error-message" style={{ height: '520px' }}>{error}</p>;
    }

    return (
        <div>
            {/* Container for the embed and controls */}
            <div id="twitch-embed">
                {/* The div where the Twitch embed iframe will be placed */}
                {/* Always render this div, give it fixed height */}
                <div id="twitch-embed-stream" style={{ height: '480px', background: 'var(--twitch-dark)', position: 'relative' }}>
                    {/* Conditional rendering *inside* the container */}
                    {embedLoading && stream && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'var(--twitch-text-alt)' }}>
                            <div className="loading-spinner-small"></div>
                            <span>Loading Stream...</span>
                        </div>
                    )}
                    {!stream && !embedLoading && (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--twitch-text-alt)'}}>
                            Select a stream to watch
                        </div>
                    )}
                    {error && !error.includes('session') && ( // Show embed-specific errors
                         <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--twitch-error)'}}>
                             Error: {error}
                         </div>
                     )}
                    {/* The Twitch Embed script will target this div's content */}
                </div>

                {/* Controls shown only when a stream is active */}
                {stream && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--twitch-dark-alt)' }}>
                        <div>
                            <button onClick={handleCloseStream}>Close Stream</button>
                            {sessionData?.user?.userId !== 0 && currentStreamInfoForRender && (
                                <Raid stream={stream} streamInfo={currentStreamInfoForRender} userId={localUserId} />
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {sessionData?.user?.userId !== 0 && currentStreamInfoForRender && (
                                <Followers stream={stream} streams={streams} streamInfo={currentStreamInfoForRender} />
                            )}
                            <TimeTracking
                                stream={stream}
                                streams={streams}
                                setTotalWatchTimeSeconds={setTotalWatchTimeSeconds}
                                totalWatchTimeSeconds={totalWatchTimeSeconds}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StreamEmbed;