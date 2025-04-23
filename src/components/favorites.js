import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import StreamEmbed from './streamEmbed';
import { Collapse } from 'react-bootstrap';
import './favorites.css'; // Import the new CSS

const apiUrl = process.env.REACT_APP_API_URL;

const FavoritesPage = () => {
    const [favorites, setFavorites] = useState([]); // Stores { id, name, streams }
    const [selectedStream, setSelectedStream] = useState(null);
    const [loading, setLoading] = useState(true); // Overall page loading
    const [loadingStreams, setLoadingStreams] = useState({}); // Loading state per category { categoryId: boolean }
    const [error, setError] = useState('');
    const [openCategories, setOpenCategories] = useState({});
    // Removed showNoStreamsMessage, handle directly in render
    // Removed streams state, use favorites[catIndex].streams

    // --- Shuffle Function ---
    const shuffleAndPick = (array, numItems) => {
        const filteredArray = array.filter(stream => stream.viewer_count <= 10);
        for (let i = filteredArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredArray[i], filteredArray[j]] = [filteredArray[j], filteredArray[i]];
        }
        return filteredArray.slice(0, numItems);
    };

    // --- Fetch Initial Favorites List ---
    const fetchFavoritesList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${apiUrl}/api/favorites`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && Array.isArray(response.data)) {
                setFavorites(response.data.map(category => ({
                    id: category.categoryId,
                    name: category.categoryName,
                    streams: [] // Initialize streams
                })));
            } else {
                setFavorites([]); // Ensure it's an empty array if no data
                // setError('No favorite categories found.'); // Optional: specific message
            }
        } catch (err) {
            setError('Failed to fetch favorite categories. Please ensure you are logged in.');
            console.error('Error fetching favorites list:', err);
            setFavorites([]); // Clear on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavoritesList();
    }, [fetchFavoritesList]);

    // --- Fetch Streams for a Specific Category ---
    const fetchStreamsForCategory = useCallback(async (categoryId) => {
        setLoadingStreams(prev => ({ ...prev, [categoryId]: true }));
        setError(''); // Clear general errors when fetching streams
        try {
            // Fetch access token (consider caching or context)
            const profileRes = await axios.get(`${apiUrl}/api/users/profile`, { withCredentials: true });
            const twitchAccessToken = profileRes.data?.twitch?.accessToken;
            if (!twitchAccessToken) throw new Error("Twitch access token not found.");

            // Fetch streams
            const streamsRes = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });

            const shuffledPickedStreams = shuffleAndPick(streamsRes.data.streams, 8);

            if (shuffledPickedStreams.length === 0) {
                 setFavorites(prev => prev.map(cat =>
                    cat.id === categoryId ? { ...cat, streams: [] } : cat // Ensure streams is empty array
                 ));
                 setLoadingStreams(prev => ({ ...prev, [categoryId]: false }));
                 return; // Exit if no streams found after filtering
            }

            // Fetch user info
            const userIds = shuffledPickedStreams.map(s => s.user_id);
            const usersRes = await axios.post(`${apiUrl}/api/twitch/users`, { userIds }, {
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });
            const userInfoMap = usersRes.data.reduce((map, user) => {
                map[user.id] = user;
                return map;
            }, {});

            // Fetch follower counts
            const followerRes = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: userIds }, {
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });
            const followerCountMap = followerRes.data.reduce((map, item) => {
                map[item.id] = item.followerCount;
                return map;
            }, {});

            // Combine data
            const streamsWithDetails = shuffledPickedStreams.map(stream => ({
                ...stream,
                user_info: userInfoMap[stream.user_id] || null,
                followerCount: followerCountMap[stream.user_id] ?? 0
            }));

            // Update state
            setFavorites(prev => prev.map(cat =>
                cat.id === categoryId ? { ...cat, streams: streamsWithDetails } : cat
            ));

        } catch (err) {
            console.error(`Failed to fetch streams for category ${categoryId}:`, err);
            // Set specific error for this category? Or keep general error.
            setError(`Failed to load streams for this category.`);
            // Ensure streams array is empty on error for this category
             setFavorites(prev => prev.map(cat =>
                cat.id === categoryId ? { ...cat, streams: [] } : cat
             ));
        } finally {
            setLoadingStreams(prev => ({ ...prev, [categoryId]: false }));
        }
    }, []); // Removed dependency on 'favorites' to avoid loops

    // --- Toggle Category Collapse ---
    const handleToggleCategory = (categoryId) => {
        const category = favorites.find(cat => cat.id === categoryId);
        const isOpening = !openCategories[categoryId];

        setOpenCategories(prev => ({ ...prev, [categoryId]: isOpening }));

        // Fetch streams only when opening and if streams haven't been fetched yet
        if (isOpening && category && category.streams.length === 0 && !loadingStreams[categoryId]) {
            fetchStreamsForCategory(categoryId);
        }
    };

    // --- Remove Favorite Category ---
    const removeFavoriteCategory = async (categoryId, event) => {
        event.stopPropagation(); // Prevent toggling collapse
        const originalFavorites = [...favorites]; // Backup state

        // Optimistic UI update
        setFavorites(prev => prev.filter(category => category.id !== categoryId));
        setError('');

        try {
            await axios.post(`${apiUrl}/api/favorites/remove`, { categoryId }, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            // Success - UI already updated
        } catch (err) {
            console.error(`Failed to remove favorite category ${categoryId}:`, err);
            setError(`Failed to remove favorite.`);
            setFavorites(originalFavorites); // Rollback on error
        }
    };

    // --- Render Loading State ---
    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="loading-container-fav">
                    <div className="loading-spinner-fav"></div>
                    <p>Loading your favorites...</p>
                </div>
                <Footer />
            </div>
        );
    }

    // --- Render Main Content ---
    return (
        <div>
            <Navbar />
            <div className="favorites-page">
                {/* Embed Area */}
                <div className="w-100 mb-4"> {/* Simple wrapper for spacing */}
                    {selectedStream && (
                        <StreamEmbed
                            stream={selectedStream}
                            // Find the streams array for the currently selected category
                            // This might need adjustment if streams can be selected across categories
                            streams={favorites.find(cat => cat.streams.some(s => s.user_name === selectedStream))?.streams || []}
                            closeStream={() => setSelectedStream(null)}
                        />
                    )}
                </div>

                {/* Page Header */}
                <div className="favorites-header">
                    <h1>Your Favorite Categories</h1>
                </div>

                {/* Display General Error */}
                {error && <p className="error-message-fav">{error}</p>}

                {/* List of Favorite Categories */}
                {favorites.length > 0 ? (
                    favorites.map(cat => (
                        <div key={cat.id} className="favorite-category-section">
                            <div
                                className={`category-header ${openCategories[cat.id] ? 'open' : ''}`}
                                onClick={() => handleToggleCategory(cat.id)}
                            >
                                <span
                                    className={`favorite-star favorited`} // Always favorited on this page
                                    onClick={(e) => removeFavoriteCategory(cat.id, e)}
                                    title="Remove Favorite"
                                >
                                    ★
                                </span>
                                <span className="category-name">{cat.name}</span>
                                <span className={`toggle-indicator ${openCategories[cat.id] ? 'open' : 'closed'}`}>
                                    ▼
                                </span>
                            </div>
                            <Collapse in={openCategories[cat.id]}>
                                <div className="category-content">
                                    {loadingStreams[cat.id] ? (
                                        // Loading placeholders for streams
                                        <div className="streams-grid-fav">
                                            {[...Array(4)].map((_, index) => ( // Show fewer placeholders
                                                <div key={index} className="stream-card-placeholder-fav">
                                                    <div className="placeholder-thumbnail-fav"></div>
                                                    <div className="placeholder-info-fav">
                                                        <div className="placeholder-avatar-fav"></div>
                                                        <div className="placeholder-text-fav">
                                                            <div className="placeholder-line-fav short"></div>
                                                            <div className="placeholder-line-fav medium"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : cat.streams.length > 0 ? (
                                        // Display stream cards
                                        <div className="streams-grid-fav">
                                            {cat.streams.map(stream => (
                                                <StreamCard
                                                    key={stream.id}
                                                    stream={stream}
                                                    setSelectedStream={setSelectedStream}
                                                    // Pass favorites set for game favorite icon (optional here)
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        // No streams found message (only show if not loading)
                                        <p className="no-content-message">No streams found with 10 or fewer viewers in this category right now.</p>
                                    )}
                                </div>
                            </Collapse>
                        </div>
                    ))
                ) : (
                    // No favorites message (only show if not loading initial list)
                    !loading && <p className="no-content-message">You haven't favorited any categories yet. Find some games you like!</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default FavoritesPage;