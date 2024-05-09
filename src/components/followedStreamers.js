import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Footer from './Footer';
import Navbar from './Navbar'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import StreamCard from './streamCard';
import StreamEmbed from './streamEmbed';

const apiUrl = process.env.REACT_APP_API_URL;

const FollowedStreams = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStream, setSelectedStream] = useState(null);
    const [userProfileResponse, setUserProfileResponse] = useState(null);
    const [favorites, setFavorites] = useState(new Set());

    const fetchFavorites = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/api/favorites`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
            setFavorites(new Set(response.data.map(cat => cat.categoryId)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        }
        setLoading(false);
    };
    
useEffect(() => {
    const fetchStreams = async () => {
        setLoading(true);
        try {
            const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
            setUserProfileResponse(userProfileResponse.data);
            // Check if Twitch account is linked
            if (!userProfileResponse.data.twitch) {
                setError('Please link your Twitch account to continue');
                setLoading(false);
                return;  // Skip the rest of the function
            }

            const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

            const response = await axios.get(`${apiUrl}/api/twitch/followed-streams`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });
            console.log(response.data);

            // Fetch follower counts one at a time
            const streamsWithFollowerCounts = [];
            for (const stream of response.data) {
                try {
                    const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
                        headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                    });
                    console.log(followerCountResponse.data);
                    const followerCount = followerCountResponse.data[0] ? followerCountResponse.data[0].followerCount : 0;
                    streamsWithFollowerCounts.push({ ...stream, followerCount });
                } catch (err) {
                    console.error('Error fetching follower count for stream:', stream.user_id, err);
                    streamsWithFollowerCounts.push({ ...stream, followerCount: 0 });
                }
            }

            // Fetch user info in batches
            const batchSize = 100; // Adjust this to a smaller number if needed
            for (let i = 0; i < streamsWithFollowerCounts.length; i += batchSize) {
                const batch = streamsWithFollowerCounts.slice(i, Math.min(i + batchSize, streamsWithFollowerCounts.length));
                const userIds = batch.map(stream => stream.user_id);
                try {
                    const userInfoResponse = await axios.post(`${apiUrl}/api/twitch/users`, { userIds }, {
                        headers: {
                            'Authorization': `Bearer ${twitchAccessToken}`
                        }
                    });
                    // Add user info to streams
                    const userInfoData = userInfoResponse.data.data;
                    for (let j = 0; j < batch.length; j++) {
                        const stream = batch[j];
                        const userInfo = userInfoData.find(user => user.id === stream.user_id);
                        if (userInfo) {
                            stream.user_info = userInfo;
                        }
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                }
            }

            setStreams(streamsWithFollowerCounts);

            setLoading(false);
        } catch (err) {
            setError('Failed to fetch followed streams');
            setLoading(false);
            console.error('Error:', err);
        }
    };

    fetchStreams();
    fetchFavorites();
}, []);

    useEffect(() => {
    console.log(userProfileResponse);
}, [userProfileResponse]);


const handleTagClick = async (tagId) => {
    try {
        const response = await axios.get(`${apiUrl}/api/twitch/streams/tag/${tagId}`);
        const streamers = response.data;
        console.log(streamers);
        // Update your state or UI with the fetched streamers
    } catch (err) {
        console.error('Error fetching streamers by tag:', err);
    }
};

return (
    <div>
        <Navbar />
        <div className="followed-container">
            <div className="content">
                <h1>Followed Streamers</h1>
                <StreamEmbed stream={selectedStream} closeStream={() => setSelectedStream(null)} />
                {error && <div>Error: {error}</div>}
                <div className="followed-row">
                    {streams.map(stream => (
                        <StreamCard 
                        key={stream.id}
                        stream={stream} 
                        selectedStream={selectedStream} 
                        setSelectedStream={setSelectedStream} 
                    />
                    ))}
                </div>
            </div>
        </div>
        <Footer />
    </div>
);
};

export default FollowedStreams;