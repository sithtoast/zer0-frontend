import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';

const apiUrl = process.env.REACT_APP_API_URL;

const TopCategories = () => {
    const [topFavorites, setTopFavorites] = useState([]);
    const [topClicked, setTopClicked] = useState([]);
    const [globalTopWatchers, setGlobalTopWatchers] = useState([]);
    const [categoryTopWatchers, setCategoryTopWatchers] = useState({});
    const [mostWatchedStreamers, setMostWatchedStreamers] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [favoritedCategories, setFavoritedCategories] = useState([]);
    const [mostWatchedCategories, setMostWatchedCategories] = useState([]);
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [streamerTopWatchers, setStreamerTopWatchers] = useState({});

     // Remove selectedCategory from useEffect dependencies
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
        
                const [
                    favoritesResponse,
                    clickedResponse,
                    globalWatchersResponse,
                    streamersResponse,
                    categoriesResponse
                ] = await Promise.all([
                    axios.get(`${apiUrl}/api/favorites/top`),
                    axios.get(`${apiUrl}/api/favorites/top-clicked`),
                    axios.get(`${apiUrl}/api/users/rankings/global?limit=10`),
                    axios.get(`${apiUrl}/api/users/streamers/most-watched?limit=10`),
                    axios.get(`${apiUrl}/api/users/categories/most-watched?limit=10`)
                ]);
    
                // Add debugging logs here
                console.log('Streamer data:', streamersResponse.data);
                console.log('Raw streamer response:', streamersResponse);
                console.log('Sample streamer:', streamersResponse.data[0]);
        
                setTopFavorites(favoritesResponse.data);
                setTopClicked(clickedResponse.data);
                setGlobalTopWatchers(globalWatchersResponse.data);
                setMostWatchedStreamers(streamersResponse.data);
                setMostWatchedCategories(categoriesResponse.data);
        
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch rankings:', error);
                setLoading(false);
            }
        };
    
        fetchAllData();
    }, []); // Removed selectedCategory dependency

    const handleStreamerClick = async (streamer) => {
        try {
            // Toggle selection if clicking the same streamer
            if (selectedStreamer?.twitchId === streamer.twitchId) {
                setSelectedStreamer(null);
                return;
            }
    
            console.log('Fetching viewers for streamer:', streamer.twitchId);
            const response = await axios.get(
                `${apiUrl}/api/users/rankings/streamer/${streamer.twitchId}?limit=10`
            );
            console.log('Streamer viewers response:', response.data);
    
            setStreamerTopWatchers(prev => ({
                ...prev,
                [streamer.twitchId]: response.data
            }));
            setSelectedStreamer(streamer);
        } catch (error) {
            console.error('Error fetching streamer viewers:', error);
        }
    };

    const handleCategoryClick = async (category) => {
        try {
            // Toggle selection if clicking the same category
            if (selectedCategory?.categoryId === category.categoryId) {
                setSelectedCategory(null);
                return;
            }
    
            console.log('Fetching viewers for category:', category.categoryId);
            const response = await axios.get(
                `${apiUrl}/api/users/rankings/category/${category.categoryId}?limit=10`
            );
            console.log('Category viewers response:', response.data);
    
            // Update categoryTopWatchers with the new data
            setCategoryTopWatchers(prev => ({
                ...prev,
                [category.categoryId]: response.data
            }));
    
            setSelectedCategory(category);
        } catch (error) {
            console.error('Error fetching category viewers:', error);
        }
    };

    const formatWatchTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="container">
                    <h1>Loading rankings...</h1>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="container mt-4">
                <div className="row">
                    {/* Global Top Watchers */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h2>Global Top Watchers</h2>
                            </div>
                            <div className="card-body">
                                <ul className="list-group">
                                    {globalTopWatchers.map((user, index) => (
                                        <li key={user.userId} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>#{index + 1} {user.username}</span>
                                            <span className="badge bg-primary">{formatWatchTime(user.totalWatchTime)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Most Watched Streamers */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h2>Most Watched Streamers</h2>
                            </div>
                            <div className="card-body">
                                <ul className="list-group">
                                    {mostWatchedStreamers.map((streamer, index) => (
                                        <li key={streamer.twitchId} 
                                            className="list-group-item"
                                            onClick={() => handleStreamerClick(streamer)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="d-flex align-items-center">
                                                    {streamer.streamerInfo?.profilePictureUrl && (
                                                        <img 
                                                            src={streamer.streamerInfo.profilePictureUrl}
                                                            alt={streamer.displayName}
                                                            className="rounded-circle me-2"
                                                            style={{ width: '30px', height: '30px' }}
                                                        />
                                                    )}
                                                    <div>
                                                        <span className="badge bg-secondary me-2">#{index + 1}</span>
                                                        {streamer.streamerInfo?.displayName || streamer.streamerInfo?.username || `Streamer ${streamer.twitchId}`}
                                                        <small className="d-block text-muted">
                                                            {streamer.categoryName} • {streamer.viewerCount} viewers
                                                        </small>
                                                    </div>
                                                </div>
                                                <span className="badge bg-primary">
                                                    {formatWatchTime(streamer.totalWatchTime)}
                                                </span>
                                            </div>
                                            
                                            {/* Expand this section when streamer is selected */}
                                            {selectedStreamer?.twitchId === streamer.twitchId && 
                                                streamerTopWatchers[streamer.twitchId] && (
                                                <div className="mt-3 border-top pt-3">
                                                    <h6>Top Viewers:</h6>
                                                    <ul className="list-group list-group-flush">
                                                        {streamerTopWatchers[streamer.twitchId].map((viewer, idx) => (
                                                            <li key={viewer._id || `anon-${idx}`} 
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                                style={{ padding: '0.5rem 0' }}
                                                            >
                                                                <span className="text-truncate" style={{ maxWidth: '60%' }}>
                                                                    #{idx + 1} {viewer.userId === 0 ? 'Anonymous' : viewer.username}
                                                                </span>
                                                                <span className="badge bg-primary ms-2">
                                                                    {formatWatchTime(viewer.totalWatchTime)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Most Watched Categories */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h2>Most Watched Categories</h2>
                            </div>
                            <div className="card-body">
                                <ul className="list-group">
                                    {mostWatchedCategories.map((category, index) => (
                                        <li key={category.categoryId} 
                                            className="list-group-item"
                                            onClick={() => handleCategoryClick(category)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <span className="badge bg-secondary me-2">#{index + 1}</span>
                                                    {category.categoryName}
                                                    <small className="d-block text-muted">
                                                        {category.viewerCount} viewers
                                                    </small>
                                                </div>
                                                <span className="badge bg-primary">
                                                    {formatWatchTime(category.totalWatchTime)}
                                                </span>
                                            </div>
                                            
                                            {/* Expand this section when category is selected */}
                                            {selectedCategory?.categoryId === category.categoryId && 
                                                categoryTopWatchers[category.categoryId] && (
                                                <div className="mt-3 border-top pt-3">
                                                    <h6>Top Viewers:</h6>
                                                    <ul className="list-group list-group-flush">
                                                        {categoryTopWatchers[category.categoryId].map((viewer, idx) => (
                                                            <li key={viewer._id || `anon-${idx}`} 
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                                style={{ padding: '0.5rem 0' }}
                                                            >
                                                                <span className="text-truncate" style={{ maxWidth: '60%' }}>
                                                                    #{idx + 1} {viewer.userId === 0 ? 'Anonymous' : viewer.username}
                                                                </span>
                                                                <span className="badge bg-primary ms-2">
                                                                    {formatWatchTime(viewer.totalCategoryTime)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Popular Categories */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h2>Popular Categories</h2>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    {topClicked.map((category) => (
                                        <div key={category.id} className="col-6 mb-2">
                                            <button 
                                                className={`btn ${selectedCategory?.id === category.id ? 'btn-success' : 'btn-primary'} w-100`}
                                                onClick={() => setSelectedCategory(category)}
                                            >
                                                {category.name}
                                                <span className="badge bg-light text-dark ms-2">{category.clicks}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                        {/* Most Favorited Categories */}
                        <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h2>Most Favorited Categories</h2>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    {topFavorites.map((category) => (
                                        <div key={category.id} className="col-6 mb-2">
                                            <button 
                                                className={`btn ${selectedCategory?.id === category.id ? 'btn-success' : 'btn-primary'} w-100`}
                                                onClick={() => setSelectedCategory(category)}
                                            >
                                                {category.name}
                                                <span className="badge bg-light text-dark ms-2">{category.favoriteCount}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Top Watchers */}
                    {selectedCategory && categoryTopWatchers[selectedCategory.id] && (
                        <div className="col-md-6 mb-4">
                            <div className="card">
                                <div className="card-header">
                                    <h2>Top Watchers: {selectedCategory.name}</h2>
                                </div>
                                <div className="card-body">
                                    <ul className="list-group">
                                        {categoryTopWatchers[selectedCategory.id].map((user, index) => (
                                            <li key={user._id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <span>#{index + 1} {user.username}</span>
                                                <span className="badge bg-primary">{formatWatchTime(user.totalCategoryTime)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TopCategories;