import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';

const LandingPage = () => {
    const [streams, setStreams] = useState([]);
    const [tag, setTag] = useState(null);

useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const twitchClientID = process.env.REACT_APP_TWITCH_CLIENT_ID;
    const twitchSecret = process.env.REACT_APP_TWITCH_SECRET;

    const getOAuthToken = async () => {
        console.log('Getting OAuth token');
        console.log(twitchClientID);
        console.log(twitchSecret);
        try {
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: twitchClientID,
                    client_secret: twitchSecret,
                    grant_type: 'client_credentials'
                }
            });
            return response.data.access_token;
        } catch (err) {
            console.error('Error getting OAuth token:', err);
        }
    };

    const fetchRandomTag = async (twitchAccessToken) => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-tags`, {
                headers: {
                    'Authorization': `Bearer ${twitchAccessToken}`
                }
            });
            const tags = response.data.tagNames;
            console.log(tags);
            const randomTag = tags[Math.floor(Math.random() * tags.length)];
            setTag(randomTag);
            return randomTag;
        } catch (err) {
            console.error('Error fetching tags:', err);
        }
    };

    const fetchStreamers = async (tagId) => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/streamers-by-tags/${tagId}`);
            console.log(response.data);
            return response.data;
        } catch (err) {
            console.error('Error fetching streamers:', err);
        }
    };

    const fetchStreams = async (twitchIds, twitchAccessToken) => {
        try {
            console.log(twitchIds);
            const response = await axios.post(`${apiUrl}/api/twitch/stream`, 
                { twitchIds }, 
                {
                    headers: {
                        'Authorization': `Bearer ${twitchAccessToken}`
                    }
                }
            );
            console.log(response.data);

            // Filter streams with 10 or fewer viewers
            const filteredStreams = response.data.filter(stream => stream.viewer_count <= 10);

            // Get three random streams from filtered data
            let randomStreams = [];
            for (let i = 0; i < 3; i++) {
                let randomIndex = Math.floor(Math.random() * filteredStreams.length);
                randomStreams.push(filteredStreams[randomIndex]);
            }

            setStreams(randomStreams);
            console.log(randomStreams);
        } catch (err) {
            console.error('Error fetching streams:', err);
        }
    };

    getOAuthToken().then(twitchAccessToken => {
        if (twitchAccessToken) {
            fetchRandomTag(twitchAccessToken).then(tag => {
                if (tag) {
                    fetchStreamers(tag).then(streamers => {
                        const twitchIds = streamers.map(s => s.twitchId);
                        fetchStreams(twitchIds, twitchAccessToken);
                    });
                }
            });
        }
    });
}, []);

return (
    <div>
        <Navbar />
        <div className="login-container d-flex justify-content-center align-items-center">
            <div className="text-center">
                <h1>Welcome!</h1>
                {tag && <h2>Showing streams for tag: {tag}</h2>}
                <div className="container">
                    <div className="row justify-content-center">
                    {(streams || []).map((stream, index) => (
                            <div key={stream.id} className="col-sm-4">
                                <div className="card mx-auto" style={{width: "18rem"}}>
                                    <img 
                                        src={stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')} 
                                        className="card-img-top" 
                                        alt="Stream thumbnail" 
                                    />
                                    <div className="card-body">
                                        <h5 className="card-title">{stream.user_name}</h5>
                                        <p className="card-text">{stream.title}</p>
                                        <a href={`https://www.twitch.tv/${stream.user_name}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Watch Stream</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <Footer />
    </div>
);
    };

export default LandingPage;