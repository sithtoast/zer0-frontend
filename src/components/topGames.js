/* global Twitch */

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import MatureIcon from '../assets/ratedm.png';  // Assuming you've imported images
import EveryoneIcon from '../assets/ratede.png';
import Footer from './Footer';


const apiUrl = process.env.REACT_APP_API_URL;

const TopCategories = () => {
    const [categories, setCategories] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentGameName, setCurrentGameName] = useState('');  // Initialize the current game name
    const [currentPage, setCurrentPage] = useState(1);  // Initialize the current page
    const [favorites, setFavorites] = useState(new Set());
    const [currentCursor, setCurrentCursor] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [pages, setPages] = useState(0);  // Initialize total pages
    const [nextCursor, setNextCursor] = useState(null);
    const [selectedStream, setSelectedStream] = useState(null);
    const [userProfileResponse, setUserProfileResponse] = useState(null);
    

    const lastStreamElementRef = useRef(null);

useEffect(() => {
    fetchCategories();
    fetchFavorites();

    if (selectedStream) {
        new Twitch.Embed("twitch-embed", {
            width: "100%",
            height: "100%",
            channel: selectedStream,
            layout: "video-with-chat",
        });
    }
}, [selectedStream]);

const fetchCategories = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const decoded = jwtDecode(token);
        const userId = decoded.user.userId;
        
        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        setUserProfileResponse(userProfileResponse.data);
        console.log(userProfileResponse);

        if (!twitchAccessToken) {
            setError('Please link your Twitch account to continue');
            setLoading(false);
            return;
        }

        const response = await axios.get(`${apiUrl}/api/twitch/top-categories`, {
            headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
        });
        setCategories(response.data);
    } catch (err) {
        if (err.response && err.response.status === 401) {
            setError('Please link your Twitch account to fetch top categories');
        } else {
            setError('Failed to fetch top categories');
        }
        console.error('Error:', err);
    }
    setLoading(false);
};

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
    
const handleClickCategory = (categoryId) => {
        setCurrentPage(1);  // Reset to first page on category change
        setStreams([]);  // Clear existing streams
        setCurrentCursor(null);  // Reset the cursor
        setSelectedCategoryId(categoryId);  // Set the selected category ID
        fetchStreams(categoryId, null);  // Fetch without a cursor
        setCurrentGameName(categories.find(category => category.id === categoryId)?.name);  // Update the game name
    };

const fetchStreams = async (categoryId, cursor) => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const decoded = jwtDecode(token);
        const userId = decoded.user.userId;
        
        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        
        const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
            headers: {
                'Authorization': `Bearer ${twitchAccessToken}`
            },
            params: {
                first: 1500,  // Fetch all streams
                after: cursor  // Use cursor for pagination
            }
        });
        const filteredStreams = response.data.streams.filter(stream => stream.viewer_count <= 3);

        // Fetch follower counts one at a time for streams on the current page
        const startIndex = (currentPage - 1) * 30;
        const endIndex = currentPage * 30;
        const currentPageStreams = filteredStreams.slice(startIndex, endIndex);
        const currentPageStreamsWithFollowerCounts = [];
        for (const stream of currentPageStreams) {
            try {
                const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
                    headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                });
                console.log(followerCountResponse.data);
                const followerCount = followerCountResponse.data[0] ? followerCountResponse.data[0].followerCount : 0;
                currentPageStreamsWithFollowerCounts.push({ ...stream, followerCount });
            } catch (err) {
                console.error('Error fetching follower count for stream:', stream.user_id, err);
                currentPageStreamsWithFollowerCounts.push({ ...stream, followerCount: 0 });
            }
        }
        setStreams(currentPageStreamsWithFollowerCounts);
        setPages(Math.ceil(filteredStreams.length / 30));
    } catch (err) {
        setError(`Failed to fetch streams for category ${categoryId}`);
        console.error('Error fetching streams:', err);
    } finally {
        setLoading(false);
        console.log("Streams fetched:", streams);
    }
};
    
const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    fetchStreams(selectedCategoryId, nextCursor);  // Use the cursor for the next page
};

    if (error) return <p>Error: {error}</p>;

    console.log(userProfileResponse);

return (
    !userProfileResponse || !userProfileResponse.twitch || !userProfileResponse.twitch.twitchId ? (
        <div>Please link your Twitch account to continue</div>
    ) : (
<div>
    <Navbar />
    <div className="container mt-3">
        <div className="row">
            <div className="col-md-4 categories">
                <h1 className="category-search-container">Top Categories</h1>
                <ul className="list-group">
                    {categories.map(category => (
                        <li key={category.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span onClick={() => handleClickCategory(category.id)}>
                                {category.name}
                            </span>
                            <button onClick={(e) => toggleFavorite(category, e)}>
                                {favorites.has(category.id) ? '★' : '☆'}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="col-md-8 streams">
                <h2 className="stream-details">Streams {currentGameName && `for ${currentGameName}`}</h2>
                <div id="twitch-embed"></div>
                <div className="row">
                {loading ? (
                    [...Array(30)].map((_, i) => (
                        <div key={i} className="col-md-4 mb-4">
                            <div className="card loading-card" aria-hidden="true">
                                <div className="card-body">
                                    <h5 className="card-title">
                                        <span className="placeholder col-7"></span>
                                    </h5>
                                    <div className="placeholder-glow">
                                        <span className="placeholder col-7"></span>
                                        <span className="placeholder col-4"></span>
                                        <span className="placeholder col-6"></span>
                                        <span className="placeholder col-8"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                    ) : streams.length ? streams.map(stream => (
                        <div 
                        key={stream.id} 
                        className={`col-md-4 mb-4 stream-card ${selectedStream === stream.id ? 'selected-stream' : ''}`}
                        onClick={() => setSelectedStream(stream.id)}
                        >
                            <div className="card">
                                <img src={stream.thumbnail_url.replace('{width}x{height}', '320x180')} className="card-img-top" alt="Stream thumbnail" />
                                <div className="card-body">
                                    <h5 className="card-title">{stream.user_name}</h5>
                                    <p className="card-text">Viewers: {stream.viewer_count}</p>
                                    <p className="card-text">Language: {stream.language}</p>
                                    <p className="card-text">Followers: {stream.followerCount}</p>
                                    {stream.is_mature ? 
                                        <img src={MatureIcon} alt="Mature Content" style={{ width: 30, height: 35 }} /> :
                                        <img src={EveryoneIcon} alt="Family Friendly" style={{ width: 30, height: 35 }} />
                                    }
                                </div>
                            </div>
                        </div>
                    )) : <p className="stream-details">No streams available.</p>}
                </div>
                <div className="pagination">
                    {[...Array(pages).keys()].map(i =>
                        <button 
                            key={i} 
                            onClick={() => handlePageChange(i + 1)}
                            className={`page-item ${currentPage === (i + 1) ? 'current-page' : ''}`}
                        >
                            {i + 1}
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
    <Footer />
</div>
    )
);
};
    
export default TopCategories;