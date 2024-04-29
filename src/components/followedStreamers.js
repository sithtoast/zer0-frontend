import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
                const response = await axios.get(`${apiUrl}/api/twitch/followed-streams`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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
            <h1>Followed Streams</h1>
            {streams.map(stream => (
                <div key={stream.id}>
                    <h2>{stream.user_name}</h2>
                    <p>{stream.title}</p>
                    <p>{stream.viewer_count} viewers</p>
                </div>
            ))}
        </div>
    );
};

export default FollowedStreams;