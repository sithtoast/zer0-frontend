import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Footer from './Footer';
import Navbar from './Navbar'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import { jwtDecode } from 'jwt-decode';

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
        const token = localStorage.getItem('token');
        try {
            const decoded = jwtDecode(token);
            const userId = decoded.user.userId;
            const response = await axios.get(`${apiUrl}/api/favorites/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setFavorites(new Set(response.data.map(cat => cat.categoryId)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        }
        setLoading(false);
    };
    
    const toggleFavorite = async (category, event) => {
        event.stopPropagation();
        const token = localStorage.getItem('token');
        const decoded = jwtDecode(token);
        const userId = decoded?.user?.userId;
    
        if (!userId || !category?.id) {
            console.error("Missing required parameters", {userId, categoryId: category?.id});
            setError("Missing required parameters");
            return;
        }
    
        const action = favorites.has(category.id) ? 'remove' : 'add';
        console.log("User ID:", userId);
        console.log("Category passed to toggleFavorite:", category);
        
        try {
            console.log("Sending data:", { userId, categoryId: category.id, name: category.name });
            await axios.post(`${apiUrl}/api/favorites/${action}`, {
                userId,  // Include userId in the request
                categoryId: category.id,
                name: category.name
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
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
            const token = localStorage.getItem('token');
            const decoded = jwtDecode(token);
            const userId = decoded.user.userId;

            const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUserProfileResponse(userProfileResponse.data);
            // Check if Twitch account is linked
            if (!userProfileResponse.data.twitch) {
                setError('Please link your Twitch account to continue');
                setLoading(false);
                return;  // Skip the rest of the function
            }

            const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

            const response = await axios.get(`${apiUrl}/api/twitch/followed-streams/${userId}`, {
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
                    width: 854,
                    height: 480,
                    channel: selectedStream.user_name,
                    layout: "video-with-chat",
                    autoplay: false,
                    parent: "zer0.tv"
                });
            }
        }
    }, [selectedStream]);

    if (error) {
        return <div>Error: {error}</div>;
    }

return (
<div className="container">
    <Navbar />
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
                        <img 
                            src={stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')} 
                            className="card-img-top" 
                            alt={stream.title} 
                        />
                        <div className="card-body">
                            <h2 className="card-title">{stream.user_name}</h2>
                            <p className="card-text">{stream.title}</p>
                        <p className='card-text'>
                            {stream.game_name}
                            <span 
                                style={{cursor: 'pointer', marginLeft: '10px'}} 
                                onClick={(event) => toggleFavorite({id: stream.game_id, name: stream.game_name}, event)}
                            >
                                {favorites.has(stream.game_id) ? '★' : '☆'}
                            </span>
                        </p>
                            <p className="card-text">Started at: {new Date(stream.started_at).toLocaleString()}</p>
                            <p className="card-text">{stream.viewer_count} viewers</p>
                            <p className="card-text">{stream.followerCount} followers</p>
                            <div className="tag-cloud">
                                {stream.tags.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
    <Footer />
</div>
);
};

export default FollowedStreams;