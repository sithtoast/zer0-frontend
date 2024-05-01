import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import StreamerBadge from './streamerBadge';
import AffiliateIcon from '../assets/affiliate.png';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';


const apiUrl = process.env.REACT_APP_API_URL;

const CategorySearch = () => {
const navigate = useNavigate();
const [categories, setCategories] = useState([]);
const [favorites, setFavorites] = useState(new Set());
const [streams, setStreams] = useState([]);
const [selectedCategory, setSelectedCategory] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [searchQuery, setSearchQuery] = useState('');
const [errorMessage, setErrorMessage] = useState(null);
const [currentPage, setCurrentPage] = useState(1);
const [selectedStream, setSelectedStream] = useState(null);
const [pages, setPages] = useState(0);  // Initialize total pages
const [selectedCategoryId, setSelectedCategoryId] = useState(null);
const [nextCursor] = useState(null);
const [currentGameName, setCurrentGameName] = useState('');
const [currentCursor, setCurrentCursor] = useState(null);


useEffect(() => {
	const checkAuthentication = () => {
		const token = localStorage.getItem('token');
		if (!token) {
			navigate('/login');
		}
	};

	checkAuthentication();

	const fetchInitialFavorites = async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			if (!token) return;  // Early return if token is not available
			const userId = jwtDecode(token).user.userId;
			const response = await axios.get(`${apiUrl}/api/favorites/${userId}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			console.log(response.data);
			const favoriteCategories = response.data.map(fav => fav.categoryId);
			if (favoriteCategories.length > 0) {
				setFavorites(new Set(favoriteCategories));
			} else {
				setFavorites(new Set());  // Ensure it's always a Set, even if empty
			}
		} catch (err) {
			setError('Failed to load favorites');
			console.error('Error loading favorites:', err);
		}
		setLoading(false);
	};

	fetchInitialFavorites();
}, [navigate]);


	const fetchCategories = async (query) => {
		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			const decoded = jwtDecode(token);
			const userId = decoded.user.userId;
			
			const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
			
			const response = await axios.get(`${apiUrl}/api/twitch/search/categories`, {
				headers: { 'Authorization': `Bearer ${twitchAccessToken}` },
				params: { name: query }  // Ensure this matches your API expectation
			});
			setCategories(response.data);
		} catch (err) {
			setError('Failed to fetch categories, please try linking a Twitch account first.');
			console.error('Error fetching categories:', err);
		}
		setLoading(false);
	};

	const handleSearch = (event) => {
		event.preventDefault();
		if (searchQuery.trim()) {
			fetchCategories(searchQuery.trim());
		}
	};

const toggleFavorite = async (category, e) => {
		e.stopPropagation();  // Stop the event from bubbling up to the list item click
		const token = localStorage.getItem('token');
		const userId = jwtDecode(token).user.userId;
		console.log("User ID:", userId);
		console.log("Category passed to toggleFavorite:", category);
		const isFavorite = favorites.has(category.id);
		const actionUrl = `${apiUrl}/api/favorites/${isFavorite ? 'remove' : 'add'}`;
		
		if (!isFavorite && favorites.size >= 8) {
			setErrorMessage("You can only choose 8 categories at a time.");
			return;
		}
		const data = {
			userId,
			categoryId: category.id,
			name: category.name  // Ensure to pass the name when adding a favorite
		};
		console.log("Data sent to server:", data);
		try {
			await axios.post(actionUrl, data, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			setFavorites(prev => {
				const updated = new Set(prev);
				if (isFavorite) {
					updated.delete(category.id);
				} else {
					updated.add(category.id);
				}
				return updated;
			});
		} catch (err) {
			console.error(`Failed to ${isFavorite ? 'remove' : 'add'} favorite:`, err);
		}
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
        console.log("Current page streams with follower counts:", currentPageStreamsWithFollowerCounts);
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

const handleClickCategory = (categoryId) => {
	setCurrentPage(1);  // Reset to first page on category change
	setStreams([]);  // Clear existing streams
	setCurrentCursor(null);  // Reset the cursor
	setSelectedCategoryId(categoryId);  // Set the selected category ID
	fetchStreams(categoryId, null);  // Fetch without a cursor
	setCurrentGameName(categories.find(category => category.id === categoryId)?.name);  // Update the game name
};

return (
    <div>
        <Navbar />
        <div className="container mt-3">
            <div className="row">
                <div className="col-md-4 categories">
                    {error ? (
                        <div>{error}</div>
                    ) : (
                        <>
                            <div className="search-results">
                                <h1>Search Categories</h1>
                                {errorMessage && <div className="error-message">{errorMessage}</div>}
                                <form onSubmit={handleSearch}>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearch(e);
                                        }}
                                        placeholder="Search categories"
                                        autoComplete="off"
                                    />
                                </form>
                                <table className="category-table">
                                    <tbody>
                                        {categories.map(category => (
                                            <tr key={category.id} onClick={() => handleClickCategory(category.id)}>
                                                <td><img src={category.boxArtUrl} alt={`Box art for ${category.name}`} className="category-box-art" /></td>
                                                <td className="category-name">{category.name}</td>
                                                <td>
                                                    <button onClick={(e) => toggleFavorite(category, e)} className="favorite-button">
                                                        {favorites.has(category.id) ? '★' : '☆'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
                {selectedCategory && (
                    <div className="col-md-8 streams">
                        <h2 className="stream-details">Streams for {categories.find(cat => cat.id === selectedCategory)?.name || 'selected category'}</h2>
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
                            )) : (
                                <p>No streams available for this category.</p>
                            )}
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

export default CategorySearch;