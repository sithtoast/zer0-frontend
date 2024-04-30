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
        console.log(twitchAccessToken);

        const response = await axios.get(`${apiUrl}/api/twitch/followed-streams/${userId}`, {
            headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
        });
        console.log(response.data);
        setStreams(response.data);
        setLoading(false);
    } catch (err) {
        setError('Failed to fetch followed streams');
        setLoading(false);
        console.error('Error:', err);
    }
};

        fetchStreams();
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
                });
            }
        }
    }, [selectedStream]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

return (
    <div>
        <Navbar />
        <div>
            <h1>Followed Streams</h1>
            <div id="twitch-embed"></div>
            {error && <div>Error: {error}</div>}
            {!userProfileResponse.twitch ? (
                <p>Please link your Twitch account to continue</p>
            ) : (
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
                                    <p className="card-text">{stream.viewer_count} viewers</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <Footer />
    </div>
);
};

export default FollowedStreams;