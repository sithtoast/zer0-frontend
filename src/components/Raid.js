import React, { useState } from 'react';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

function Raid({ stream, streamInfo, userId }) {
    const [isRaiding, setIsRaiding] = useState(false);

    const startRaid = async () => {
        try {
            const profileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });

            const fromBroadcasterId = profileResponse.data.twitch.twitchId;
            const accessToken = profileResponse.data.twitch.accessToken;
            const toBroadcasterId = streamInfo.user_id;

            try {
                const response = await axios.post(`${apiUrl}/api/twitch/start-raid`, { fromBroadcasterId, toBroadcasterId }, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
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
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
        });
        const broadcasterId = profileResponse.data.twitch.twitchId;
        const accessToken = profileResponse.data.twitch.accessToken;

        try {
            const response = await axios.post(`${apiUrl}/api/twitch/cancel-raid`, { broadcasterId }, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
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
        <button onClick={handleRaid} style={{ backgroundColor: isRaiding ? 'red' : 'green' }}>
            {isRaiding ? 'Cancel Raid' : 'Start Raid'}
        </button>
    );
}

export default Raid;
