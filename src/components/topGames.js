// topGames.js
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import FilterBox from './filterBox';
import StreamEmbed from './streamEmbed';

const apiUrl = process.env.REACT_APP_API_URL;

const TopGames = () => {
    const [categories, setCategories] = useState([]);
    const [allStreamsWithFollowerCounts, setAllStreamsWithFollowerCounts] = useState([]);
    const [filteredStreams, setFilteredStreams] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentGameName, setCurrentGameName] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [favorites, setFavorites] = useState(new Set());
    const [currentCursor, setCurrentCursor] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [pages, setPages] = useState(0);
    const [nextCursor] = useState(null);
    const [selectedStream, setSelectedStream] = useState(null);
    const [userProfileResponse, setUserProfileResponse] = useState(null);
    const [categoryClicked, setCategoryClicked] = useState(false);
    const [fetchedStreams, setFetchedStreams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const fetchStreams = useCallback(async (categoryId, cursor) => {
        setLoading(true);
        try {
            const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

            const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
                headers:{
                    'Authorization': `Bearer ${twitchAccessToken}`
                },
                params: {
                    first: 500,
                    after: cursor
                }
            });

            let filteredStreams = response.data.streams.filter(stream => stream.viewer_count <= 10);

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
                    const userInfoData = userInfoResponse.data;
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

            let newStreams = [];

            for (const stream of filteredStreams) {
                if (!stream.followerCount) {
                    try {
                        const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
                            headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                        });
                        const followerData = followerCountResponse.data.find(item => item.id === stream.user_id);
                        const followerCount = followerData ? followerData.followerCount : 0;
                        stream.followerCount = followerCount;
                    } catch (err) {
                        console.error('Error fetching follower count for stream:', stream.user_id, err);
                        stream.followerCount = 0;
                    }
                }
                newStreams.push(stream);
            }

            setAllStreamsWithFollowerCounts(newStreams);
            setFetchedStreams(filteredStreams);
        } catch (err) {
            setError(`Failed to fetch streams for category ${categoryId}`);
            console.error('Error fetching streams:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true, 
                headers: { 'Content-Type': 'application/json' }
            });
            const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

            setUserProfileResponse(userProfileResponse.data);

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
                withCredentials: true, 
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

        try {
            await axios.post(`${apiUrl}/api/favorites/${action}`, {
                categoryId: category.id,
                name: category.name
            }, {
                withCredentials: true,
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
        setCurrentPage(1);
        setStreams([]);
        setCurrentCursor(null);
        setSelectedCategoryId(categoryId);
        fetchStreams(categoryId, null);
        setCurrentGameName(categories.find(category => category.id === categoryId)?.name);
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        fetchStreams(selectedCategoryId, nextCursor);
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

        const response = await axios.get(`${apiUrl}/api/twitch/search/categories`, {
            headers: { 'Authorization': `Bearer ${twitchAccessToken}` },
            params: { name: searchQuery }
        });
        setSearchResults(response.data);
    };

    useEffect(() => {
        fetchCategories();
        fetchFavorites();
    }, []);

    useEffect(() => {
        if (selectedCategoryId) {
            fetchStreams(selectedCategoryId, null);
        }
    }, [selectedCategoryId, fetchStreams]);

    useEffect(() => {
        const startIndex = (currentPage - 1) * 30;
        const endIndex = currentPage * 30;
        const currentPageStreamsWithFollowerCounts = filteredStreams.slice(startIndex, endIndex);

        setStreams(currentPageStreamsWithFollowerCounts);
        setPages(Math.ceil(filteredStreams.length / 30));
    }, [filteredStreams, currentPage]);

    return (
        <div>
            <Navbar />
            <div className="top-category-container">
                <div className="row d-flex">
                    <div className="col-md-4 categories flex-column">
                        {!userProfileResponse || !userProfileResponse.twitch || !userProfileResponse.twitch.twitchId ? (
                            <div>Please link your Twitch account to continue</div>
                        ) : (
                            <>
                                <h1 className="category-search-box-container">Search</h1>
                                <form onSubmit={handleSearch}>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search categories"
                                        autoComplete="off"
                                    />
                                    <button type="submit">Search</button>
                                </form>
                                {searchResults.length > 0 && (
                                    <>
                                        <h1 className="category-search-container">Search Results</h1>
                                        <ul className="list-group">
                                            {searchResults.map(category => (
                                                <li key={category.id} className="list-group-item search-list d-flex justify-content-between align-items-center">
                                                    <img src={category.boxArtUrl} alt={category.name} />
                                                    <span onClick={() => {
                                                        handleClickCategory(category.id);
                                                        setCategoryClicked(true);
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
                                <h1 className="top-category-container">Top Categories</h1>
                                <ul className="list-group">
                                    {categories.map(category => (
                                        <li key={category.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <img src={category.boxArtUrl} alt={category.name} />
                                            <span onClick={() => {
                                                handleClickCategory(category.id);
                                                setCategoryClicked(true);
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
                    {categoryClicked && (
                        <div className="col-md-8 streams flex-column" style={{minHeight: '500px', flexGrow: 2}}> 
                            <FilterBox 
                                selectedStream={selectedStream} 
                                setSelectedStream={setSelectedStream} 
                                allStreamsWithFollowerCounts={allStreamsWithFollowerCounts} 
                                setFilteredStreams={setFilteredStreams} 
                            />
                            <h2 className="stream-details">Streams {currentGameName && `for ${currentGameName}`}</h2>
                            <StreamEmbed 
                                stream={selectedStream} 
                                streams={streams} 
                                closeStream={() => setSelectedStream(null)} 
                            />
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
                                    <StreamCard 
                                        key={stream.id}
                                        stream={stream} 
                                        selectedStream={selectedStream} 
                                        setSelectedStream={setSelectedStream} 
                                    />
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
    );
};

export default TopGames;
