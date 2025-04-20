import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Followers from './Followers';
import TimeTracking from './TimeTracking';
import Raid from './Raid';

const apiUrl = process.env.REACT_APP_API_URL;



function StreamEmbed({ stream, streams, closeStream }) {
    const [localUserId, setLocalUserId] = useState(null);
    const [profileData, setProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalWatchTimeSeconds, setTotalWatchTimeSeconds] = useState(0);
    const [watchTimeFormatted, setWatchTimeFormatted] = useState('00:00:00');
    const [sessionData, setSessionData] = useState(null);

    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setProfileData(response.data);
            setLocalUserId(response.data.user.userId); // Update userId
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch profile data');
            setLoading(false);
            console.error('There was an error!', err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, {
                    withCredentials: true,
                });
                setSessionData(response.data);
                //console.log('User data:', response.data.user.user);
            } catch (error) {
                //console.error('Error fetching session data:', error);
            }
        };
        fetchData();


        if (stream) {
            console.log("Initializing Twitch Embed for stream:", stream);
            setTimeout(() => {
                const element = document.getElementById('twitch-embed-stream');
                console.log("Twitch Embed Element:", element);
                if (element) {
                    const embed = new window.Twitch.Embed("twitch-embed-stream", {
                        width: "100%",
                        height: 480,
                        channel: stream,
                        layout: "video-with-chat",
                        parent: ["zer0.tv"]
                    });
                }
            }, 1000); // Adding a delay to ensure the element is rendered
        }
    
        if (sessionData && sessionData.user) {
            fetchProfileData(); // Fetch profile data
        } else {
            setLoading(false);
        }

        // Return a cleanup function that removes the Twitch embed
        return () => {
            const twitchEmbedElement = document.getElementById('twitch-embed-stream');
            if (twitchEmbedElement) {
                while (twitchEmbedElement.firstChild) {
                    twitchEmbedElement.removeChild(twitchEmbedElement.firstChild);
                }
            }
        };
    }, [stream]);
    

    const handleCloseStream = async () => {
        const streamInfo = streams.find(s => s.user_name === stream);
        const twitchId = streamInfo ? streamInfo.user_id : null;
        const categoryId = streamInfo ? streamInfo.game_id : null;
        const categoryName = streamInfo ? streamInfo.game_name : null;
    
        if (twitchId && totalWatchTimeSeconds > 0) {
            console.log(`Updating watch time - Streamer: ${twitchId}, Category: ${categoryId}, Watch Time: ${totalWatchTimeSeconds}s`);
            try {
                // Single API call to update both streamer stats and user watch history
                const response = await axios.post(`${apiUrl}/api/twitch/streamer/update`, {
                    twitchId,
                    watchTime: totalWatchTimeSeconds,
                    categoryId,
                    categoryName
                }, {
                    withCredentials: true
                });
                
                console.log('Watch time updated successfully:', response.data);
                
                // You can use the response data to update local state if needed
                if (response.data.totalWatchTime) {
                    console.log(`Total watch time: ${response.data.totalWatchTime}`);
                    console.log(`Category watch times:`, response.data.categoryWatchTimes);
                }
            } catch (error) {
                console.error('Error updating watch time:', error);
            }
        } else {
            console.log('No valid twitchId, categoryId, or watch time to update');
        }
    
        // Reset totalWatchTimeSeconds
        setTotalWatchTimeSeconds(0);
        closeStream();
    };

    if (loading) {
        return <p>Loading...</p>;
    }
    

    return (
        <div>
            {stream && <div className="overlay"></div>}
            <div id="twitch-embed">
                <div id="twitch-embed-stream"></div>
                {stream && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <button onClick={handleCloseStream}>Close Stream</button>
                            {sessionData && sessionData.user.userId !== 0 && (
                                <Raid stream={stream} streamInfo={streams.find(s => s.user_name === stream)} userId={localUserId} />
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {sessionData && sessionData.user.userId !== 0 && (
                                <Followers stream={stream} streams={streams} />
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