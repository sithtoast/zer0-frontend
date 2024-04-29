import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Footer from './Footer';
import Navbar from './Navbar'; 
import '../twitch.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { jwtDecode } from 'jwt-decode';

const apiUrl = process.env.REACT_APP_API_URL;

const FollowedStreams = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

return (
    <div>
        <Navbar />
        <div className="container">
            <h1>Followed Streams</h1>
            <div className="row">
                {streams.map(stream => (
                    <div key={stream.id} className="col-md-4 mb-4">
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
        </div>
        <Footer />
    </div>
);
};

export default FollowedStreams;