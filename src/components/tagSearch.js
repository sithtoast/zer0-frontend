import React, { useState } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import Navbar from './Navbar';
import Footer from './Footer';

const TagSearch = () => {
    const [tag, setTag] = useState('');
    const [streamers, setStreamers] = useState([]);
    const [suggestedTags, setSuggestedTags] = useState([]);

    const apiUrl = process.env.REACT_APP_API_URL;

    const fetchTags = debounce(async (tag) => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/tags/${tag}`);
            setSuggestedTags(response.data);
        } catch (err) {
            console.error('Error fetching suggested tags:', err);
        }
    }, 900);

const handleInputChange = (e) => {
    setTag(e.target.value);
    if (e.target.value.length >= 3) {
        fetchTags(e.target.value);
    }
};

    const handleSearch = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/streams/tag/${tag}`);
            const streamers = response.data;

            const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
            const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

            const streams = await Promise.all(streamers.map(async (streamer) => {
                const streamResponse = await axios.get(`${apiUrl}/api/twitch/stream/${streamer.twitchId}`, {
                    headers: {
                        Authorization: `Bearer ${twitchAccessToken}`
                    }
                });
                return streamResponse.data;
            }));

            setStreamers(streams);
            console.log(streams);
        } catch (err) {
            console.error('Error fetching streamers by tag:', err);
        }
    };

    return (
        <div>
            <Navbar />  
            <div className='tag-search-container'>
                <h3>Search Streamers by Tag</h3>
                <input type="text" value={tag} onChange={handleInputChange} />
                <ul>
                    {suggestedTags.flatMap(tag => tag.tags).filter(tag => tag.toLowerCase().includes(tag.toLowerCase())).map((tag, index) => (
                        <li key={index}>{tag}</li>
                    ))}
                </ul>
                <button onClick={handleSearch}>Search</button>
                <div className="results">
                    {streamers.map((streamerArray, index) => (
                        streamerArray.length > 0 && streamerArray.map((streamer, subIndex) => (
                            <div key={`${index}-${subIndex}`} className="streamer-card">
                                <div style={{ marginTop: index === 0 ? '20px' : '0' }}>
                                    <h5>{streamer.user_name}</h5>
                                    <p>{streamer.title}</p>
                                    {/* Display other streamer details... */}
                                </div>
                            </div>
                        ))
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TagSearch;