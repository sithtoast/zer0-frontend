import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamerBadge from './streamerBadge';
import AffiliateIcon from '../assets/affiliate.png';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';


const apiUrl = process.env.REACT_APP_API_URL;


const TagSearch = () => {
    const [tag, setTag] = useState('');
    const [streamers, setStreamers] = useState([]);
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [topTags, setTopTags] = useState([]);

    const fetchTopTags = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-tags`);
            setTopTags(response.data);
        } catch (err) {
            console.error('Error fetching top tags:', err);
        }
    };

    

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
    fetchTags(e.target.value);
};

const handleSearch = async (searchTag = tag) => {
    try {
        const response = await axios.get(`${apiUrl}/api/twitch//streamers-by-tags/${searchTag}`);
        const streamers = response.data;

        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true, // This allows the request to send cookies
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        console.log(twitchAccessToken);

        let streams = (await Promise.all(streamers.map(async (streamer) => {
    const streamResponse = await axios.get(`${apiUrl}/api/twitch/stream/${streamer.twitchId}`, {
        headers: {
            Authorization: `Bearer ${twitchAccessToken}`
        }
    });
    return streamResponse.data;
}))).filter(stream => stream.length > 0);

// Flatten the array
streams = streams.flat();

// Filter the streams
streams = streams.filter(stream => stream.viewer_count <= 3);

const batchSize = 100;
console.log(streams);
for (let i = 0; i < streams.length; i += batchSize) {
    const batch = streams.slice(i, i + batchSize);
    const userIds = batch.map(stream => stream.user_id);
    try {
        const userInfoResponse = await axios.post(`${apiUrl}/api/twitch/users`, { userIds }, {
            headers: {
                'Authorization': `Bearer ${twitchAccessToken}`
            }
        });
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

        setStreamers(streams);
        console.log(streams);
    } catch (err) {
        console.error('Error fetching streamers by tag:', err);
    }
};

    const handleTagClick = (clickedTag) => {
        setTag(clickedTag);
        handleSearch(clickedTag);
    };

    useEffect(() => {
        fetchTopTags();
    }, []);

return (
    <div>
        <Navbar />  
        <div className='tag-search-container' style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <h3>Search Streamers by Tag</h3>
                <input type="text" value={tag} onChange={handleInputChange} />
                <button onClick={handleSearch}>Search</button>
                <div className="top-tags" style={{ paddingTop: '20px' }}>
                    <h3>Top Tags</h3>
                    <div>
                        {topTags.map((tag, index) => (
                            <button key={index} className="tag-button" onClick={() => handleTagClick(tag.name)}>
                                {tag.name} <span className="badge">{tag.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <ul>
                {suggestedTags.flatMap(tagItem => [tagItem]).filter(currentTag => currentTag.name.toLowerCase().includes(tag.toLowerCase())).map((currentTag, index) => (
                    <li key={index} onClick={() => handleTagClick(currentTag.name)}>
                        {currentTag.name} <span className="badge">{currentTag.count}</span>
                    </li>
                ))}
                </ul>
            </div>
            
            <div className="results" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {streamers.map((stream, index) => (
                    <div key={index} className="card" style={{ flex: '0 0 30%', margin: '1%' }}>
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
                            <p className='card-text'>{stream.title}</p>
                            <p className="card-text">Game: {stream.game_name}</p>
                            <p className="card-text">Viewers: {stream.viewer_count}</p>
                            <p className="card-text">Language: {stream.language}</p>
                            <p className="card-text">Started at: {new Date(stream.started_at).toLocaleString()}</p>
                            <div className="tag-cloud">
                                {stream.tags && stream.tags.map((tag, index) => (
                                    <span key={index} className="tag" onClick={() => handleTagClick(tag)}>{tag}</span>
                                ))}
                            </div>
                            <StreamerBadge stream={stream} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <Footer />
    </div>
);
};

export default TagSearch;