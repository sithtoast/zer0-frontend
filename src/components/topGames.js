/* global Twitch */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import StreamerBadge from './streamerBadge';
import AffiliateIcon from '../assets/affiliate.png';
import ReactSlider from 'react-slider';


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
    const [nextCursor] = useState(null);
    const [selectedStream, setSelectedStream] = useState(null);
    const [userProfileResponse, setUserProfileResponse] = useState(null);
    const [categoryClicked, setCategoryClicked] = useState(false);
    const [minViewerCount, setMinViewerCount] = useState(0);
    const [maxViewerCount, setMaxViewerCount] = useState(3);
    const [minJoinDate, setMinJoinDate] = useState(new Date(0)); // Default to epoch
    const [maxJoinDate, setMaxJoinDate] = useState(new Date()); // Default to now
    const [startedWithinHour, setStartedWithinHour] = useState(false); // Default to not filtering by start time
    const [matureContent, setMatureContent] = useState(true);
    const [nonMatureContent, setNonMatureContent] = useState(true);
    const [nearAffiliate, setNearAffiliate] = useState(false);
    const [allStreamsWithFollowerCounts, setAllStreamsWithFollowerCounts] = useState([]);
    

const fetchStreams = useCallback(async (categoryId, cursor) => {
    setLoading(true);
    try {
        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true, // This allows the request to send cookies
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        
        const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
            headers:{
                'Authorization': `Bearer ${twitchAccessToken}`
            },
            params: {
                first: 1500,  // Fetch all streams
                after: cursor  // Use cursor for pagination
            }
        });
        let filteredStreams = response.data.streams.filter(stream => stream.viewer_count <= 3);
    // Fetch user info in batches of 100
    const batchSize = 100;
    for (let i = 0; i < filteredStreams.length; i += batchSize) {
        const batch = filteredStreams.slice(i, i + batchSize);
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

        // Clear the allStreamsWithFollowerCounts array
        setAllStreamsWithFollowerCounts([]);

        // Fetch follower counts for all streams
        for (const stream of filteredStreams) {
            // Check if follower count for this stream has already been fetched
            if (!stream.followerCount) {
                try {
                    const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
                        headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                    });
                    console.log(followerCountResponse.data);
                    const followerCount = followerCountResponse.data[0] ? followerCountResponse.data[0].followerCount : 0;
                    stream.followerCount = followerCount; // Add follower count to stream
                } catch (err) {
                    console.error('Error fetching follower count for stream:', stream.user_id, err);
                    stream.followerCount = 0; // Set follower count to 0 if fetching fails
                }
            }
            // Add stream to array
            setAllStreamsWithFollowerCounts(prevStreams => [...prevStreams, stream]);
        }
    } catch (err) {
        setError(`Failed to fetch streams for category ${categoryId}`);
        console.error('Error fetching streams:', err);
    } finally {
        setLoading(false);
        console.log("Streams fetched:", streams);
    }
}, []); // Add the dependencies of the fetchStreams function here

// Fetch streams when the component mounts
useEffect(() => {
    fetchCategories();
    fetchFavorites();
    fetchStreams();
}, [fetchStreams]);

// Filter and set streams whenever allStreamsWithFollowerCounts or any of the filters change
useEffect(() => {
    const filteredStreams = allStreamsWithFollowerCounts.filter(stream => {
        const meetsViewerCount = stream.viewer_count >= minViewerCount && stream.viewer_count <= maxViewerCount;
        const meetsFollowerCount = !nearAffiliate || (stream.followerCount >= 45 && stream.followerCount < 50);
        const joinDate = new Date(stream.user_info.created_at);
        const meetsJoinDate = joinDate >= minJoinDate && joinDate <= maxJoinDate;
        const meetsMaturity = (matureContent && stream.is_mature) || (nonMatureContent && !stream.is_mature);
        const startedTime = new Date(stream.started_at);
        const meetsStartedWithinHour = !startedWithinHour || (new Date() - startedTime) <= 60 * 60 * 1000;

        return meetsViewerCount && meetsFollowerCount && meetsJoinDate && meetsMaturity && meetsStartedWithinHour;
    });

    // Now you can paginate the filtered streams
    const startIndex = (currentPage - 1) * 30;
    const endIndex = currentPage * 30;
    const currentPageStreamsWithFollowerCounts = filteredStreams.slice(startIndex, endIndex);

    setStreams(currentPageStreamsWithFollowerCounts);
    setPages(Math.ceil(filteredStreams.length / 30));

    if (selectedStream) {
        new Twitch.Embed("twitch-embed", {
            width: "100%",
            height: '500px',
            channel: selectedStream,
            layout: "video-with-chat",
            parent: ["zer0.tv"]
        });
    }
}, [minViewerCount, maxViewerCount, nearAffiliate, minJoinDate, maxJoinDate, matureContent, nonMatureContent, startedWithinHour, selectedStream, allStreamsWithFollowerCounts]);

const fetchCategories = async () => {
    setLoading(true);
    try {
        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true, // This allows the request to send cookies
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        console.log(twitchAccessToken);
        setUserProfileResponse(userProfileResponse.data);
        console.log(userProfileResponse.data.twitch.accessToken);

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
    
const handleClickCategory = (categoryId) => {
        setCurrentPage(1);  // Reset to first page on category change
        setStreams([]);  // Clear existing streams
        setCurrentCursor(null);  // Reset the cursor
        setSelectedCategoryId(categoryId);  // Set the selected category ID
        fetchStreams(categoryId, null);  // Fetch without a cursor
        setCurrentGameName(categories.find(category => category.id === categoryId)?.name);  // Update the game name
    };

 
    
const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    fetchStreams(selectedCategoryId, nextCursor);  // Use the cursor for the next page
};

return (
<div>
    <Navbar />
    <div className="container mt-3">
        <div className="row">
            <div className="col-md-4 categories">
                {!userProfileResponse || !userProfileResponse.twitch || !userProfileResponse.twitch.twitchId ? (
                    <div>Please link your Twitch account to continue</div>
                ) : (
                    <>
                        <h1 className="category-search-container">Top Categories</h1>
                        <ul className="list-group">
                            {categories.map(category => (
                                <li key={category.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span onClick={() => {
                                        handleClickCategory(category.id);
                                        setCategoryClicked(true); // set state variable to true when a category is clicked
                                    }}>
                                        {category.name}
                                    </span>
                                    <button onClick={(e) => toggleFavorite(category, e)}>
                                        {favorites.has(category.id) ? '★' : '☆'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
            {categoryClicked && ( // only render this div if a category has been clicked
                <div className="col-md-8 streams"> 
                <div id="filter" classname="filter-box">
                    {/* Add filter inputs here */}
                    <div className="mb-3">
                        <label htmlFor="viewerCount" className="form-label">Viewer Count:</label>
                        <ReactSlider
                            className="react-slider"
                            thumbClassName="thumb"
                            trackClassName="track"
                            min={0}
                            max={3}
                            value={[minViewerCount, maxViewerCount]}
                            onChange={([min, max]) => {
                                setMinViewerCount(min);
                                setMaxViewerCount(max);
                            }}
                            pearling
                            minDistance={0}
                        />
                        <p>Selected range: {minViewerCount} - {maxViewerCount}</p>
                    </div>
                    <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="nearAffiliate" checked={nearAffiliate} onChange={e => setNearAffiliate(e.target.checked)} />
                        <label className="form-check-label" htmlFor="nearAffiliate">Near Affiliate</label>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="minJoinDate" className="form-label">Minimum Join Date:</label>
                        <input type="date" className="form-control" id="minJoinDate" value={minJoinDate.toISOString().split('T')[0]} onChange={e => setMinJoinDate(new Date(e.target.value))} />

                        <label htmlFor="maxJoinDate" className="form-label">Maximum Join Date:</label>
                        <input type="date" className="form-control" id="maxJoinDate" value={maxJoinDate.toISOString().split('T')[0]} onChange={e => setMaxJoinDate(new Date(e.target.value))} />
                    </div>
                    <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="matureContent" checked={matureContent} onChange={e => setMatureContent(e.target.checked)} />
                        <label className="form-check-label" htmlFor="matureContent">Mature Content</label>
                    </div>
                    <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="nonMatureContent" checked={nonMatureContent} onChange={e => setNonMatureContent(e.target.checked)} />
                        <label className="form-check-label" htmlFor="nonMatureContent">Non-Mature Content</label>
                    </div>
                    <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="startedWithinHour" checked={startedWithinHour} onChange={e => setStartedWithinHour(e.target.checked)} />
                        <label className="form-check-label" htmlFor="startedWithinHour">Started Within Last Hour</label>
                    </div>
                </div>
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
                            className={`col-md-4 mb-4 selected-stream ${selectedStream === stream.id ? 'selected-stream' : ''}`}
                            onClick={() => setSelectedStream(stream.user_name)}
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
                        )) : <p className="stream-details">No streams available.</p>}
                    </div>
                    <div className="pagination">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        {[...Array(pages).keys()].slice(Math.max(0, currentPage - 3), currentPage + 2).map(i =>
                            <button 
                                key={i} 
                                onClick={() => handlePageChange(i + 1)}
                                className={`page-item ${currentPage === (i + 1) ? 'current-page' : ''}`}
                            >
                                {i + 1}
                            </button>
                        )}
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === pages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
    <Footer />
</div>
)
};
    
export default TopCategories;
