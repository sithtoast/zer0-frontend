import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Followers from './Followers';
import TimeTracking from './TimeTracking';
import Raid from './Raid';

const apiUrl = process.env.REACT_APP_API_URL;


function StreamEmbed({ stream, streams, closeStream }) {
    const [userId, setUserId] = useState(null);
    const [profileData, setProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalWatchTimeSeconds, setTotalWatchTimeSeconds] = useState(0);
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
            setUserId(response.data.user.userId); // Update userId
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
        if (userId && totalWatchTimeSeconds > 0) {
            try {
                await axios.put(`${apiUrl}/api/watchtime/update-twitch-watch-time`, {
                    userId: userId,
                    watchTime: totalWatchTimeSeconds
                }, {
                    withCredentials: true
                });
            } catch (error) {
                console.error('Error updating watch time:', error);
            }
        }
        closeStream();
    };

    const userName = stream;
    const streamInfo = streams.find(s => s.user_name === userName);

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
                            {sessionData && sessionData.user && (
                            <Raid stream={stream} streamInfo={streamInfo} userId={userId} />
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {sessionData && sessionData.user && (
                            <Followers stream={stream} streams={streams} />
                        )}
                            <TimeTracking stream={stream} streams={streams} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StreamEmbed;
