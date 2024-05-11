// streamEmbed.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

function StreamEmbed({ stream, streams, closeStream }) {
    const [isRaiding, setIsRaiding] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [watchTime, setWatchTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [startTime, setStartTime] = useState(null);
    const [userId, setUserId] = useState(null);
    const [profileData, setProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalWatchTimeSeconds, setTotalWatchTimeSeconds] = useState(0);

    const streamData = streams;
    console.log(streamData);
    console.log(stream);

    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(response.data);
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
        if (stream) { // Check if stream is provided
            const embed = new window.Twitch.Embed("twitch-embed-stream", {
                width: "100%",
                height: 480,
                channel: stream,
                layout: "video-with-chat",
                parent: ["zer0.tv"]
            });
        }

        setStartTime(new Date());
        fetchProfileData(); // Fetch profile data

        if (stream) {
            const streamerData = streamData.find(data => data.user_login === stream);
            if (streamerData) {
                console.log(streamerData.followerCount);
                setFollowerCount(streamerData.followerCount);
            }
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

    useEffect(() => {
        let intervalId;
        if (userId) {
            intervalId = setInterval(() => {
                setTotalWatchTimeSeconds(prev => prev + 1);
            }, 1000);
        }

        return () => clearInterval(intervalId);
    }, [userId]);

    useEffect(() => {
        const hours = String(Math.floor(totalWatchTimeSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalWatchTimeSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalWatchTimeSeconds % 60).padStart(2, '0');

        setWatchTime({ hours, minutes, seconds });
    }, [totalWatchTimeSeconds]);

    useEffect(() => {
        if (stream) {
            const intervalId = setInterval(() => {
                const streamerData = streamData.find(data => data.user_login === stream);
                if (streamerData) {
                    const now = new Date();
                    const start = new Date(streamerData.started_at);
                    const elapsedSeconds = Math.floor((now - start) / 1000);
                    const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
                    const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
                    const seconds = String(elapsedSeconds % 60).padStart(2, '0');

                    setElapsedTime({ hours, minutes, seconds });
                }
            }, 1000);

            return () => clearInterval(intervalId);
        }
    }, [stream, streamData]);

    const userName = stream; // 'stream' is the username of the clicked stream
    const streamInfo = streams.find(s => s.user_name === userName);

    if (streamInfo) {
        const broadcasterId = streamInfo.user_id;
        console.log('Broadcaster ID:', broadcasterId);
        // Now you can use broadcasterId in your startRaid and cancelRaid functions
    } else {
        console.log('User not found in streams data');
    }

    const startRaid = async () => {
        try {
            const profileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });

            const fromBroadcasterId = profileResponse.data.twitch.twitchId;
            const accessToken = profileResponse.data.twitch.accessToken;
            const toBroadcasterId = streamInfo.user_id;

            try {
                const response = await axios.post(`${apiUrl}/api/twitch/start-raid`, { fromBroadcasterId, toBroadcasterId }, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                console.log(response.data);
                return response;
            } catch (err) {
                console.error('Error starting raid:', err);
                if (err.response && err.response.status === 400) {
                    alert("Channel not accepting raids at this time.");
                }
            }
        } catch (err) {
            console.error('Error getting profile:', err);
        }
    };

    const cancelRaid = async () => {
        const profileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true, // This allows the request to send cookies
            headers: { 'Content-Type': 'application/json' }
        });
        const broadcasterId = profileResponse.data.twitch.twitchId;
        const accessToken = profileResponse.data.twitch.accessToken;
        console.log('Access Token:', accessToken);

        try {
            const response = await axios.post(`${apiUrl}/api/twitch/cancel-raid`, { broadcasterId }, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            console.log(response.data);
        } catch (err) {
            console.error('Error cancelling raid:', err);
        }
    };

    const handleRaid = async () => {
        if (!isRaiding) {
            try {
                const response = await startRaid();
                if (response.status !== 400) {
                    setIsRaiding(true);
                }
            } catch (err) {
                console.error('Error starting raid:', err);
            }
        } else {
            try {
                await cancelRaid();
                setIsRaiding(false);
            } catch (err) {
                console.error('Error cancelling raid:', err);
            }
        }
    };

    const handleCloseStream = async () => {
        if (userId && totalWatchTimeSeconds > 0) {
            try {
                await axios.put(`${apiUrl}/api/watchtime/update-twitch-watch-time`, {
                    userId: userId,
                    watchTime: totalWatchTimeSeconds
                }, {
                    withCredentials: true
                });
                console.log('Watch time updated successfully');
            } catch (error) {
                console.error('Error updating watch time:', error);
            }
        }
        closeStream();
    };

    return (
        <div>
            {stream && <div className="overlay"></div>}
            <div id="twitch-embed">
                <div id="twitch-embed-stream"></div>
                {stream && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <button onClick={handleCloseStream}>Close Stream</button>
                            <button onClick={handleRaid} style={{ backgroundColor: isRaiding ? 'red' : 'green' }}>
                                {isRaiding ? 'Cancel Raid' : 'Start Raid'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <p style={{ padding: '0 10px' }}>F: {followerCount}</p>
                            <p style={{ padding: '0 10px' }}>E: {elapsedTime.hours}:{elapsedTime.minutes}:{elapsedTime.seconds}</p>
                            <p style={{ padding: '0 10px' }}>W: {watchTime.hours}:{watchTime.minutes}:{watchTime.seconds}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StreamEmbed;
