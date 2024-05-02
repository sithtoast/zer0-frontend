import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Footer from './Footer';
import Navbar from './Navbar'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import StreamerBadge from './streamerBadge';
import AffiliateIcon from '../assets/affiliate.png';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

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
    
    const toggleFavorite = async (category, event) => {
        event.stopPropagation();
    
        if (!category?.id) {
            console.error("Missing required parameters", {categoryId: category?.id});
            setError("Missing required parameters");
            return;
        }
    
        const action = favorites.has(category.id) ? 'remove' : 'add';
        console.log("Category passed to toggleFavorite:", category);
        
        try {
            console.log("Sending data:", { categoryId: category.id, name: category.name });
            await axios.post(`${apiUrl}/api/favorites/${action}`, {
                categoryId: category.id,
                name: category.name
            }, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
    
            setFavorites(prev => {
                const updated = new Set(prev);
                if (action === 'add') {
                    updated.add(category.id);
                } else {
                    updated.delete(category.id);
                }
                return updated;
            });
        } catch (err) {
            console.error(`Failed to ${action} favorite:`, err.response ? err.response.data : err);
            setError(`Failed to ${action} favorite: ${err.response ? err.response.data.message : "Unknown error"}`);
        }
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

    useEffect(() => {
        if (selectedStream) {
            // Make sure the Twitch object is defined before trying to use it
            if (window.Twitch && window.Twitch.Embed) {
                new window.Twitch.Embed("twitch-embed", {
                    width: '100%',
                    height: 480,
                    channel: selectedStream.user_name,
                    layout: "video-with-chat",
                    autoplay: false,
                    parent: "zer0.tv"
                });
            }
        }
    }, [selectedStream]);


return (
    <div>
        <Navbar />
        <div className="container">
            <div className="content">
                <h1>Followed Streams</h1>
                <div id="twitch-embed"></div>
                {error && <div>Error: {error}</div>}
                <div className="row">
                    {streams.map(stream => (
                        <div 
                            key={stream.id} 
                            className={`col-md-4 mb-4 ${stream === selectedStream ? 'selected' : ''}`}
                            onClick={() => {
                                // If the clicked stream is already the selected stream, return early
                                if (stream === selectedStream) {
                                    return;
                                }

                                setSelectedStream(stream);
                            }}
                        >
                            <div className="card">
                                <img src={stream.thumbnail_url.replace('{width}x{height}', '320x180')} className="card-img-top" alt="Stream thumbnail" />
                                <div className="card-body">
                                    <OverlayTrigger
                                        placement="left"
                                        overlay={
                                            <Tooltip id={`tooltip-${stream.user_name}`} className="large-tooltip">
                                                <img src={stream.user_info.profile_image_url} alt={`${stream.user_name}'s profile`} className="small-image" /><br />
                                                <strong>{stream.user_name}</strong><br />
                                                Status: {stream.user_info.broadcaster_type === '' ? 'Regular User' : stream.user_info.broadcaster_type === 'affiliate' ? 'Affiliate' : stream.user_info.broadcaster_type}<br />
                                                Followers: {stream.followerCount}<br />
                                                Created at: {new Date(stream.user_info.created_at).toLocaleString()}
                                            </Tooltip>
                                        }
                                    >
                                    <h5 className="card-title">
                                        {stream.user_name}
                                        {stream.user_info.broadcaster_type === "affiliate" && 
                                            <img className="affiliate-icon" src={AffiliateIcon} alt="Affiliate" style={{ width: 25, height: 20 }} />
                                        }
                                    </h5>
                                    </OverlayTrigger>
                                    <p className="card-text">Viewers: {stream.viewer_count}</p>
                                    <p className="card-text">Language: {stream.language}</p>
                                    <p className="card-text">Started at: {new Date(stream.started_at).toLocaleString()}</p>
                                    <StreamerBadge stream={stream} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <Footer />
    </div>
);
};

export default FollowedStreams;