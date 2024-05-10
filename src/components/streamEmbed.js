// StreamEmbed.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

function StreamEmbed({ stream, streams, closeStream }) {
    const [isRaiding, setIsRaiding] = useState(false);

    const streamData = streams;
    console.log(streamData);
    console.log(stream);

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
    
return (
    <div>
        <div className="overlay"></div>
        <div id="twitch-embed">
            <div id="twitch-embed-stream"></div>
            {stream && <button onClick={closeStream}>Close Stream</button>}
            {stream && (
                <button onClick={handleRaid} style={{ backgroundColor: isRaiding ? 'red' : 'green' }}>
                    {isRaiding ? 'Cancel Raid' : 'Start Raid'}
                </button>
            )}
        </div>
    </div>
);
};

export default StreamEmbed;