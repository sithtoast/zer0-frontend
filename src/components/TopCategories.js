// filepath: /Users/william/Dev/zer0-frontend/src/components/TopCategories.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import './topCategories.css'; // Import the new CSS file

const apiUrl = process.env.REACT_APP_API_URL;

const TopCategories = () => {
    // ... existing state variables ...
    const [topFavorites, setTopFavorites] = useState([]);
    const [topClicked, setTopClicked] = useState([]);
    const [globalTopWatchers, setGlobalTopWatchers] = useState([]);
    const [categoryTopWatchers, setCategoryTopWatchers] = useState({});
    const [mostWatchedStreamers, setMostWatchedStreamers] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null); // Store the whole category object
    const [loading, setLoading] = useState(true);
    // const [favoritedCategories, setFavoritedCategories] = useState([]); // Removed as not used directly
    const [mostWatchedCategories, setMostWatchedCategories] = useState([]);
    const [selectedStreamer, setSelectedStreamer] = useState(null); // Store the whole streamer object
    const [streamerTopWatchers, setStreamerTopWatchers] = useState({});
    const [error, setError] = useState(''); // Add error state

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                setError(''); // Reset error on new fetch

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

                setTopFavorites(favoritesResponse.data);
                setTopClicked(clickedResponse.data);
                setGlobalTopWatchers(globalWatchersResponse.data);
                setMostWatchedStreamers(streamersResponse.data);
                setMostWatchedCategories(categoriesResponse.data);

                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch rankings:', err);
                setError('Failed to load rankings. Please try again later.');
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const handleStreamerClick = async (streamer) => {
        // Toggle selection
        if (selectedStreamer?.twitchId === streamer.twitchId) {
            setSelectedStreamer(null);
            return;
        }

        setSelectedStreamer(streamer); // Select immediately for UI feedback
        setSelectedCategory(null); // Deselect category if a streamer is clicked

        // Fetch data if not already fetched
        if (!streamerTopWatchers[streamer.twitchId]) {
            try {
                const response = await axios.get(
                    `${apiUrl}/api/users/rankings/streamer/${streamer.twitchId}?limit=10`
                );
                setStreamerTopWatchers(prev => ({
                    ...prev,
                    [streamer.twitchId]: response.data
                }));
            } catch (error) {
                console.error(`Error fetching viewers for streamer ${streamer.twitchId}:`, error);
                // Optionally show an error message to the user
                setStreamerTopWatchers(prev => ({
                    ...prev,
                    [streamer.twitchId]: [] // Set empty array on error to prevent infinite loading
                }));
            }
        }
    };

    const handleCategoryClick = async (category) => {
         // Toggle selection
        if (selectedCategory?.categoryId === category.categoryId) {
            setSelectedCategory(null);
            return;
        }

        setSelectedCategory(category); // Select immediately
        setSelectedStreamer(null); // Deselect streamer

        // Fetch data if not already fetched
        if (!categoryTopWatchers[category.categoryId]) {
            try {
                const response = await axios.get(
                    `${apiUrl}/api/users/rankings/category/${category.categoryId}?limit=10`
                );
                setCategoryTopWatchers(prev => ({
                    ...prev,
                    [category.categoryId]: response.data
                }));
            } catch (error) {
                console.error(`Error fetching viewers for category ${category.categoryId}:`, error);
                 setCategoryTopWatchers(prev => ({
                    ...prev,
                    [category.categoryId]: []
                }));
            }
        }
    };

    // Updated formatWatchTime to be more concise like in Profile.js
    const formatWatchTime = (seconds) => {
        if (!seconds) return '0h 0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    // Helper to render the expanded viewer list
    const renderExpandedView = (viewers, timeField = 'totalWatchTime') => {
        if (!viewers) return <p>Loading viewers...</p>; // Handle loading state
        if (viewers.length === 0) return <p>No viewer data available.</p>;

        return (
            <div className="expanded-view">
                <h4>Top Viewers</h4>
                <ul className="ranking-list">
                    {viewers.map((viewer, idx) => (
                        <li key={viewer._id || `viewer-${idx}`} className="expanded-list-item">
                            <div className="expanded-item-info">
                                <span className="expanded-item-rank">#{idx + 1}</span>
                                <span className="expanded-item-name">
                                    {viewer.userId === 0 ? 'Anonymous' : viewer.username}
                                </span>
                            </div>
                            <span className="expanded-item-value">
                                {formatWatchTime(viewer[timeField])}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };


    if (loading) return (
        <div>
            <Navbar />
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading rankings...</p>
            </div>
            <Footer />
        </div>
    );

    if (error) return (
         <div>
            <Navbar />
            <div className="rankings-page">
                 <p className="error-message">{error}</p>
            </div>
            <Footer />
        </div>
    );

    return (
        <div>
            <Navbar />
            <div className="rankings-page">
                <h1>Rankings</h1>

                <div className="rankings-grid">
                    {/* Global Top Watchers */}
                    <div className="ranking-card">
                        <h3>Global Top Watchers</h3>
                        <ul className="ranking-list">
                            {globalTopWatchers.map((user, index) => (
                                // Add item-main-content wrapper here
                                <li key={user.userId} className="ranking-list-item">
                                    <div className="item-main-content"> {/* Added wrapper */}
                                        <span className="item-rank">#{index + 1}</span>
                                        <div className="item-info">
                                            {/* You could add a placeholder avatar/icon here if desired */}
                                            <span className="item-name">{user.username}</span>
                                        </div>
                                        <span className="item-value">{formatWatchTime(user.totalWatchTime)}</span>
                                    </div> {/* End wrapper */}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Most Watched Streamers (Structure is already correct) */}
                    <div className="ranking-card">
                        <h3>Most Watched Streamers</h3>
                        <ul className="ranking-list">
                            {mostWatchedStreamers.map((streamer, index) => (
                                <li
                                    key={streamer.twitchId}
                                    className={`ranking-list-item clickable ${selectedStreamer?.twitchId === streamer.twitchId ? 'selected' : ''}`}
                                    onClick={() => handleStreamerClick(streamer)}
                                >
                                    <div className="item-main-content">
                                        <span className="item-rank">#{index + 1}</span>
                                        <div className="item-info">
                                            {streamer.streamerInfo?.profilePictureUrl && (
                                                <img
                                                    src={streamer.streamerInfo.profilePictureUrl}
                                                    alt={streamer.streamerInfo?.displayName || ''}
                                                    className="item-avatar"
                                                />
                                            )}
                                            <div>
                                                <div className="item-name">{streamer.streamerInfo?.displayName || `Streamer ${streamer.twitchId}`}</div>
                                            </div>
                                        </div>
                                        <span className="item-value">{formatWatchTime(streamer.totalWatchTime)}</span>
                                    </div>
                                    {selectedStreamer?.twitchId === streamer.twitchId &&
                                        renderExpandedView(streamerTopWatchers[streamer.twitchId], 'totalWatchTime')
                                    }
                                </li>
                            ))}
                        </ul>
                    </div>

                     {/* Most Watched Categories (Structure is already correct) */}
                    <div className="ranking-card">
                        <h3>Most Watched Categories</h3>
                        <ul className="ranking-list">
                            {mostWatchedCategories.map((category, index) => (
                                <li
                                    key={category.categoryId}
                                    className={`ranking-list-item clickable ${selectedCategory?.categoryId === category.categoryId ? 'selected' : ''}`}
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    <div className="item-main-content">
                                        <span className="item-rank">#{index + 1}</span>
                                        <div className="item-info">
                                            <span className="item-name">{category.categoryName}</span>
                                        </div>
                                        <span className="item-value">{formatWatchTime(category.totalWatchTime)}</span>
                                    </div>
                                    {selectedCategory?.categoryId === category.categoryId &&
                                        renderExpandedView(categoryTopWatchers[category.categoryId], 'totalCategoryTime')
                                    }
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Popular Categories (Clicks) */}
                    <div className="ranking-card">
                        <h3>Popular Categories (Most Clicked)</h3>
                        <div className="category-buttons-grid">
                            {topClicked.map((category) => (
                                <button key={category.id} className="category-button">
                                    <span>{category.name}</span>
                                    <span className="badge">{category.clicks}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Most Favorited Categories */}
                    <div className="ranking-card">
                        <h3>Most Favorited Categories</h3>
                         <div className="category-buttons-grid">
                            {topFavorites.map((category) => (
                                <button key={category.id} className="category-button">
                                    <span>{category.name}</span>
                                    <span className="badge">{category.favoriteCount}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TopCategories;