import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import FilterBox from './filterBox';
import StreamEmbed from './streamEmbed';
import Modal from 'react-bootstrap/Modal';
// Removed debounce as per previous context
import './topGames.css'; // Import the new CSS

const apiUrl = process.env.REACT_APP_API_URL;

const TopGames = () => {
    // ... (keep all existing state variables) ...
    const [categories, setCategories] = useState([]);
    const [allStreamsWithFollowerCounts, setAllStreamsWithFollowerCounts] = useState([]);
    const [filteredStreams, setFilteredStreams] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStreams, setLoadingStreams] = useState(false); // Separate loading for streams
    const [error, setError] = useState('');
    const [currentGameName, setCurrentGameName] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [favorites, setFavorites] = useState(new Set());
    const [currentCursor, setCurrentCursor] = useState(null); // Keep for potential future pagination
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [pages, setPages] = useState(0);
    // const [nextCursor] = useState(null); // Keep if using cursor pagination
    const [selectedStream, setSelectedStream] = useState(null);
    // const [userProfileResponse, setUserProfileResponse] = useState(null); // Likely not needed directly in state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sessionData, setSessionData] = useState(null);
    // const [fetchedStreams, setFetchedStreams] = useState([]); // Replaced by allStreamsWithFollowerCounts

    const [showModal, setShowModal] = useState(false);
    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    const isFetchingStreams = useRef(false);
    const isTogglingFavorite = useRef(false);
    const isClickingCategory = useRef(false);

    // --- Fetching Logic (fetchStreams, fetchCategories, fetchFavorites, toggleFavorite) ---
    // Keep the core logic, but update loading/error states
    const fetchStreams = useCallback(async (categoryId, cursor) => {
        if (isFetchingStreams.current) return;
        isFetchingStreams.current = true;
        setLoadingStreams(true); // Use stream-specific loading
        setError('');
        try {
            // Find category name *before* API call
            const category = categories.find(cat => cat.id === categoryId) || searchResults.find(cat => cat.id === categoryId); // Check both lists
            setCurrentGameName(category?.name || ''); // Set name from found category
            setSelectedCategoryId(categoryId);
            setCurrentPage(1); // Reset page on new category fetch
            setAllStreamsWithFollowerCounts([]); // Clear old streams

            const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
                params: { first: 500, after: cursor } // Adjust 'first' as needed
            });

            let streamsData = response.data.streams.filter(stream => stream.viewer_count <= 10);

            // --- Batch fetch user info (keep this logic) ---
            const batchSize = 100;
            for (let i = 0; i < streamsData.length; i += batchSize) {
                // ... (user info fetching logic remains the same) ...
                 const batch = streamsData.slice(i, i + batchSize);
                 const userIds = batch.map(stream => stream.user_id);
                 try {
                     const userInfoResponse = await axios.post(`${apiUrl}/api/twitch/users`, { userIds });
                     const userInfoData = userInfoResponse.data;
                     batch.forEach(stream => {
                         const userInfo = userInfoData.find(user => user.id === stream.user_id);
                         if (userInfo) stream.user_info = userInfo;
                     });
                 } catch (err) {
                     console.error('Error fetching user data batch:', err);
                 }
            }

            // --- Fetch follower counts (keep this logic, including retry) ---
             const retryAxios = async (maxRetries, fn, ...args) => { /* ... retry logic ... */
                for (let i = 0; i < maxRetries; i++) {
                    try { return await fn(...args); } catch (error) { if (i === maxRetries - 1) throw error; }
                }
             };

            let twitchAccessToken = '';
            try {
                const profileRes = await axios.get(`${apiUrl}/api/users/profile`, { withCredentials: true });
                twitchAccessToken = profileRes.data?.twitch?.accessToken || '';
            } catch (err) {
                console.warn('Could not fetch user profile for access token:', err.message);
                 // Handle 500 specifically if needed, otherwise proceed without token
                 if (err.response && err.response.status === 500) {
                     console.error('Received 500 error from /api/users/profile, setting followerCounts to 0');
                     streamsData.forEach(stream => stream.followerCount = 0);
                     setAllStreamsWithFollowerCounts(streamsData);
                     setLoadingStreams(false);
                     isFetchingStreams.current = false;
                     return; // Exit early
                 }
            }

            let streamsWithFollowers = [];
            if (sessionData?.user?.userId !== 0 && twitchAccessToken) {
                const followerPromises = streamsData.map(stream =>
                    retryAxios(3, axios.post, `${apiUrl}/api/twitch/streams/follower-count`,
                        { streamerIds: [stream.user_id] },
                        { headers: { 'Authorization': `Bearer ${twitchAccessToken}` } }
                    ).then(res => {
                        const followerData = res.data.find(item => item.id === stream.user_id);
                        stream.followerCount = followerData?.followerCount ?? 0;
                        return stream;
                    }).catch(err => {
                        console.error(`Error fetching follower count for ${stream.user_id}:`, err);
                        stream.followerCount = 0; // Default on error
                        return stream;
                    })
                );
                streamsWithFollowers = await Promise.all(followerPromises);
            } else {
                // Anon or no token: set followerCount to null or 0
                streamsData.forEach(stream => stream.followerCount = null);
                streamsWithFollowers = streamsData;
            }

            setAllStreamsWithFollowerCounts(streamsWithFollowers);

        } catch (err) {
            setError(`Failed to fetch streams for ${currentGameName || `category ${categoryId}`}.`);
            console.error('Error fetching streams:', err);
            setAllStreamsWithFollowerCounts([]); // Clear on error
        } finally {
            setLoadingStreams(false);
            isFetchingStreams.current = false;
        }
    }, [categories, searchResults, sessionData]); // Add searchResults and sessionData dependencies

    const fetchCategories = useCallback(async () => {
        // setLoading(true); // Keep overall loading for initial category fetch
        setError('');
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-categories`);
            setCategories(response.data);
        } catch (err) {
             if (err.response && err.response.status === 401) {
                 setError('Please link your Twitch account to fetch top categories.');
             } else {
                 setError('Failed to fetch top categories.');
             }
             console.error('Error fetching categories:', err);
        }
        // setLoading(false);
    }, []);

    const fetchFavorites = useCallback(async () => {
        // No separate loading needed, part of initial load
        try {
            const response = await axios.get(`${apiUrl}/api/favorites`, { withCredentials: true });
            setFavorites(new Set(response.data.map(cat => cat.categoryId)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
            // Optionally set an error state if favorites are critical
        }
    }, []);

    const toggleFavorite = useCallback(async (category, event) => {
        event.stopPropagation();
        if (isTogglingFavorite.current || !category?.id) return;
        isTogglingFavorite.current = true;

        const action = favorites.has(category.id) ? 'remove' : 'add';
        const originalFavorites = new Set(favorites); // Store original state for rollback

        // Optimistic UI update
        setFavorites(prev => {
            const updated = new Set(prev);
            if (action === 'add') updated.add(category.id);
            else updated.delete(category.id);
            return updated;
        });

        try {
            await axios.post(`${apiUrl}/api/favorites/${action}`,
                { categoryId: category.id, name: category.name },
                { withCredentials: true }
            );
            // Success - UI already updated
        } catch (err) {
            console.error(`Failed to ${action} favorite:`, err);
            setError(`Failed to ${action} favorite.`);
            setFavorites(originalFavorites); // Rollback UI on error
        } finally {
            isTogglingFavorite.current = false;
        }
    }, [favorites]); // Add dependency

    // --- Updated Category Click Handler ---
    const handleCategorySelect = useCallback((categoryId, categoryName) => {
        if (isClickingCategory.current) return;
        isClickingCategory.current = true;

        console.log(`Selecting category: ID=${categoryId}, Name=${categoryName}`);

        // Set states immediately for UI update
        setSelectedCategoryId(categoryId);
        setCurrentGameName(categoryName || 'Selected Category'); // Set the name
        setSelectedStream(null); // Close any open stream embed
        setStreams([]); // Clear displayed streams immediately
        setFilteredStreams([]); // Clear filtered streams
        setAllStreamsWithFollowerCounts([]); // Clear raw streams data
        setCurrentPage(1); // Reset pagination
        setLoadingStreams(true); // Set loading state for streams
        setError(''); // Clear previous errors

        // Fetch streams for the newly selected category
        fetchStreams(categoryId, null); // Pass categoryId

        // Reset ref after a short delay
        setTimeout(() => { isClickingCategory.current = false; }, 300);
    }, [fetchStreams]); // Add fetchStreams dependency

    const handlePageChange = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > pages) return;
        setCurrentPage(pageNumber);
        // No need to refetch streams, useEffect handles slicing
        window.scrollTo(0, 0); // Scroll to top on page change
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        // Consider adding loading state for search
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/search/categories`, {
                params: { name: searchQuery }
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error("Search failed:", error);
            setError("Failed to perform category search.");
            setSearchResults([]);
        }
    };

    // --- Initial Data Fetch ---
    useEffect(() => {
        const initialLoad = async () => {
            setLoading(true);
            setError('');
            try {
                const sessionRes = await axios.get(`${apiUrl}/api/users/session`, { withCredentials: true });
                setSessionData(sessionRes.data);
                console.log('User data:', sessionRes.data?.user);

                // Fetch categories first
                await fetchCategories();

                // Fetch favorites only if logged in
                if (sessionRes.data?.user?.userId !== 0) {
                    await fetchFavorites();
                }
            } catch (error) {
                console.error('Error during initial load:', error);
                // Don't necessarily set a global error, fetchCategories might set a specific one
                if (!error.response || error.response.status !== 401) { // Avoid overwriting 401 error
                   setError('Failed to load initial data.');
                }
            } finally {
                setLoading(false);
            }
        };
        initialLoad();
    }, [fetchCategories, fetchFavorites]); // Add dependencies

    // --- Update streams displayed based on filtering and pagination ---
    useEffect(() => {
        // This effect now purely handles slicing for pagination
        const startIndex = (currentPage - 1) * 30;
        const endIndex = startIndex + 30;
        // Use filteredStreams which comes from FilterBox
        const currentPageStreams = filteredStreams.slice(startIndex, endIndex);
        setStreams(currentPageStreams);
        setPages(Math.ceil(filteredStreams.length / 30));
    }, [filteredStreams, currentPage]);

    // --- Update filteredStreams when allStreamsWithFollowerCounts changes ---
    // This ensures FilterBox gets the latest raw data when a new category is fetched
    useEffect(() => {
        setFilteredStreams(allStreamsWithFollowerCounts); // Initially, filtered is all
        setCurrentPage(1); // Reset to page 1 when raw data changes
    }, [allStreamsWithFollowerCounts]);


    // --- Render Logic ---
    // Use handleCategorySelect in renderCategoryItem
    const renderCategoryItem = (category) => (
        <li
            key={category.id}
            className={`category-list-item ${selectedCategoryId === category.id ? 'active' : ''}`} // Add active class
            onClick={() => handleCategorySelect(category.id, category.name)} // Use the updated handler
        >
            <img
                src={category.box_art_url ? category.box_art_url.replace('{width}x{height}', '30x40') : category.boxArtUrl?.replace('{width}x{height}', '30x40')} // Handle both possible property names
                alt={category.name}
                loading="lazy"
            />
            <span className="category-name">{category.name}</span>
            <button
                className={`favorite-button ${favorites.has(category.id) ? 'favorited' : ''}`}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent category selection when clicking favorite
                    if (sessionData?.user?.userId !== 0) {
                        toggleFavorite(category, e);
                    } else {
                        handleShow(); // Show login modal
                    }
                }}
                aria-label={favorites.has(category.id) ? 'Remove favorite' : 'Add favorite'}
            >
                {favorites.has(category.id) ? '★' : '☆'}
            </button>
        </li>
    );

    if (loading) {
         return (
             <div>
                 <Navbar />
                 {/* Use the main loading spinner */}
                 <div className="loading-container" style={{ minHeight: '80vh' }}>
                     <div className="loading-spinner"></div>
                     <p>Loading game data...</p>
                 </div>
                 <Footer />
             </div>
         );
    }

    return (
        <div>
            <Navbar />
            <div className="top-games-page">
                {/* --- Full Screen Loading Overlay --- */}
                {loadingStreams && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Loading Streams...</p>
                </div>
                )}
            {/* --- End Overlay --- */}
                {/* Category Sidebar */}
                <aside className="category-sidebar">
                    <div className="category-section">
                        <h2>Search Categories</h2>
                        <form onSubmit={handleSearch} className="search-form">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search categories..."
                                className="search-input"
                                autoComplete="off"
                            />
                            <button type="submit" className="search-button">Search</button>
                        </form>
                        {searchResults.length > 0 && (
                            <>
                                <h3>Search Results</h3>
                                <ul className="category-list">
                                    {searchResults.map(renderCategoryItem)}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="category-section">
                        <h2>Top Categories</h2>
                        {error && !categories.length ? ( // Show error only if categories failed to load
                             <p className="error-message-inline">{error}</p>
                         ) : (
                            <ul className="category-list">
                                {categories.map(renderCategoryItem)}
                            </ul>
                         )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="streams-main-content">
                    {selectedCategoryId ? (
                        <>
                            <div className="streams-header">
                                <h2>{currentGameName ? `Streams for ${currentGameName}` : 'Loading Category...'}</h2> {/* Updated fallback text */}
                                {/* Display stream-specific errors here */}
                                {error && <p className="error-message-inline" style={{marginTop: '1rem'}}>{error}</p>}
                            </div>

                            {/* Filter Box */}
                            <div className="filter-box-container">
                                <FilterBox
                                    // Pass necessary props to FilterBox
                                    allStreamsWithFollowerCounts={allStreamsWithFollowerCounts}
                                    setFilteredStreams={setFilteredStreams}
                                    // Assuming FilterBox doesn't need selectedStream/setSelectedStream directly
                                />
                            </div>

                            {/* Stream Embed (if a stream is selected) */}
                            <StreamEmbed
                                stream={selectedStream}
                                streams={streams} // Pass the currently displayed page of streams
                                closeStream={() => setSelectedStream(null)}
                            />


                            {/* Streams Grid */}
                            <div className="streams-grid">
                                {loadingStreams ? (
                                    // Loading Placeholders
                                    [...Array(12)].map((_, i) => (
                                        // Placeholder structure remains the same
                                        <div key={i} className="stream-card-placeholder" aria-hidden="true">
                                            <div className="placeholder-thumbnail"></div>
                                            <div className="placeholder-info">
                                                <div className="placeholder-avatar"></div>
                                                <div className="placeholder-text">
                                                    <div className="placeholder-line short"></div>
                                                    <div className="placeholder-line medium"></div>
                                                    <div className="placeholder-line long"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : streams.length > 0 ? (
                                    // Actual Stream Cards - Render directly inside the grid
                                    streams.map(stream => (
                                        <StreamCard
                                            key={stream.id}
                                            stream={stream}
                                            setSelectedStream={setSelectedStream}
                                        /> // No more col-md-4 wrapper needed here
                                    ))
                                ) : (
                                    // No Streams Message
                                    !error && <p className="loading-container-inline">No streams found matching criteria.</p>
                                )}
                            </div>

                            {/* Pagination */}
                            {pages > 1 && (
                                <div className="pagination-controls">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </button>
                                    {/* Simple page number display - enhance if needed */}
                                    <span> Page {currentPage} of {pages} </span>
                                    {/* Example: Render a few page numbers */}
                                    {/* {[...Array(pages).keys()].slice(Math.max(0, currentPage - 3), Math.min(pages, currentPage + 2)).map(i =>
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={currentPage === (i + 1) ? 'current-page' : ''}
                                        >
                                            {i + 1}
                                        </button>
                                    )} */}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === pages}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                         <div className="streams-header">
                             <h2>Select a category from the list to view streams.</h2>
                             {/* Show general error if categories failed */}
                             {error && !categories.length && <p className="error-message-inline" style={{marginTop: '1rem'}}>{error}</p>}
                         </div>
                    )}
                </main>

                {/* Login Modal */}
                <Modal show={showModal} onHide={handleClose} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Login Required</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Please log in with your Twitch account to use features like favorites.
                        <ul>
                            <li>Favorite games & streamers</li>
                            <li>View watch history & stats</li>
                            <li>Discover new streamers</li>
                            {/* Add other features */}
                        </ul>
                    </Modal.Body>
                    <Modal.Footer>
                        <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}>
                            <i className="fab fa-twitch"></i>Login with Twitch
                        </button>
                    </Modal.Footer>
                </Modal>

            </div>
            <Footer />
        </div>
    );
};

export default TopGames;