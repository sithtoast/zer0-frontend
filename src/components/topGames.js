import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import '../twitch.css';
import MatureIcon from '../assets/ratedm.png';  // Assuming you've imported images
import EveryoneIcon from '../assets/ratede.png';

const apiUrl = process.env.REACT_APP_API_URL;

const TopCategories = () => {
    const [categories, setCategories] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentGameName, setCurrentGameName] = useState('');  // Initialize the current game name
    const [currentPage, setCurrentPage] = useState(1);  // Initialize the current page
    const [totalPages, setTotalPages] = useState(0);  // Initialize total pages
    const [favorites, setFavorites] = useState(new Set());
    const [currentCursor, setCurrentCursor] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [streamsPerPage, setStreamsPerPage] = useState(30);
    const [totalStreams, setTotalStreams] = useState(0);
    const [page, setPage] = useState(1);  // Initialize the current page
    const [pages, setPages] = useState(0);  // Initialize total pages
    

    const lastStreamElementRef = useRef(null);

    useEffect(() => {
        fetchCategories();
        fetchFavorites();
    }, []);

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

            const response = await axios.get(`${apiUrl}/api/twitch/top-categories`, {
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });
            setCategories(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch top categories');
            setLoading(false);
            console.error('Error:', err);
        }
    };
    
  const fetchFavorites = async () => {
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
            setStreams(prevStreams => [...prevStreams, ...filteredStreams.slice((currentPage - 1) * 30, currentPage * 30)]);
            setPages(Math.ceil(filteredStreams.length / 30));
            setLoading(false);
        } catch (err) {
            setError(`Failed to fetch streams for category ${categoryId}`);
            setLoading(false);
            console.error('Error fetching streams:', err);
        }
    };

const handleNextPage = () => {
    if (currentPage < pages) {
        setCurrentPage(prevPage => prevPage + 1);
        fetchStreams(selectedCategoryId, null);
    }
};
    
    const handlePrevPage = () => {
        // Handling the previous page is more complex with cursor-based APIs since you don't typically get a 'previous' cursor.
        // You might need to track all cursors manually if you need to navigate back or adjust API usage.
    };
    
    const handlePageChange = (page) => {
        setCurrentPage(page);
        fetchStreams(currentGameName, page);
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
            <div>
                <Navbar />
                <div className="container mt-3">
                    <div className="row">
                        <div className="col-md-4 categories">
                            <h1>Top Categories</h1>
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
                            <h2>Streams {currentGameName && `for ${currentGameName}`}</h2>
                            <div className="row">
                                {streams.length ? streams.map(stream => (
                                    <div key={stream.id} className="col-md-4 mb-4">
                                        <div className="card">
                                            <img src={stream.thumbnail_url.replace('{width}x{height}', '320x180')} className="card-img-top" alt="Stream thumbnail" />
                                            <div className="card-body">
                                                <h5 className="card-title">{stream.user_name}</h5>
                                                <p className="card-text">Viewers: {stream.viewer_count}</p>
                                                <p className="card-text">Language: {stream.language}</p>
                                                {stream.is_mature ? 
                                                    <img src={MatureIcon} alt="Mature Content" style={{ width: 30, height: 35 }} /> :
                                                    <img src={EveryoneIcon} alt="Family Friendly" style={{ width: 30, height: 35 }} />
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )) : <p>No streams available.</p>}
                            </div>
                            <div className="pagination">
                                {[...Array(pages).keys()].map(i =>
                                    <button key={i} onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

export default TopCategories;
