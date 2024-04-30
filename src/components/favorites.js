import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Collapse } from 'react-bootstrap';
import Footer from './Footer';

const apiUrl = process.env.REACT_APP_API_URL;

const FavoritesPage = () => {
	const [favorites, setFavorites] = useState([]);
	const [selectedStream, setSelectedStream] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [openCategories, setOpenCategories] = useState({});

useEffect(() => {
		const fetchFavorites = async () => {
			try {
				const token = localStorage.getItem('token');
				if (!token) {
					setError('Authentication required.');
					setLoading(false);
					return;
				}
	
				const decoded = jwtDecode(token);
				const userId = decoded.user.userId;
	
				const response = await axios.get(`${apiUrl}/api/favorites/${userId}`, {
					headers: { 'Authorization': `Bearer ${token}` }
				});
	
				if (response.data && Array.isArray(response.data)) {
					setFavorites(response.data.map(category => ({
						id: category.categoryId,
						name: category.categoryName,
						streams: []  // Initialize streams as an empty array
					})));
				} else {
					setError('No categories found or invalid data structure');
				}
			} catch (err) {
				setError('Failed to fetch favorite categories');
				console.error('Error:', err);
			} finally {
				setLoading(false);
			}
		};
	
		fetchFavorites();
	}, []);
	
	const handleStreamSelect = (stream) => {
		setSelectedStream(stream);
	};
	
	
function shuffleAndPick(array, numItems) {
		// Filter the array for streams with 3 or fewer viewers
		const filteredArray = array.filter(stream => stream.viewer_count <= 3);
	
		// Shuffle the filtered array using the Durstenfeld shuffle algorithm
		for (let i = filteredArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[filteredArray[i], filteredArray[j]] = [filteredArray[j], filteredArray[i]]; // Swap elements
		}
	
		// Return the first numItems elements from the shuffled filtered array
		return filteredArray.slice(0, numItems);
	}
	
	const fetchStreamsForCategory = async (categoryId) => {
		const token = localStorage.getItem('token');
		if (!token) {
			setError('Authentication required.');
			return;
		}

		const decoded = jwtDecode(token);
		const userId = decoded.user.userId;
		
		const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
		
		try {
			const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
				headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
			});
			
			// Use shuffleAndPick to select a random subset of streams
			const shuffledPickedStreams = shuffleAndPick(response.data.streams, 8);
			console.log(shuffledPickedStreams);

			const shuffledPickedStreamsWithFollowerCounts = [];
			for (const stream of shuffledPickedStreams) {
				try {
					const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
						headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
					});
					const followerCount = followerCountResponse.data[0] ? followerCountResponse.data[0].followerCount : 0;
					shuffledPickedStreamsWithFollowerCounts.push({ ...stream, followerCount });
				} catch (err) {
					console.error('Error fetching follower count for stream:', stream.user_id, err);
					shuffledPickedStreamsWithFollowerCounts.push({ ...stream, followerCount: 0 });
				}
			}
	
			// Update the state with the fetched and shuffled streams
			setFavorites(prevFavorites => prevFavorites.map(category => 
				category.id === categoryId ? {...category, streams: shuffledPickedStreamsWithFollowerCounts} : category
			));
		} catch (err) {
			console.error(`Failed to fetch streams for category ${categoryId}:`, err);
			setError(`Failed to fetch streams for category: ${err.message}`);
		}
	};
	
	const handleToggleCategory = (categoryId) => {
		setOpenCategories(prev => {
			const isOpen = !prev[categoryId];
			// Check if category is being expanded and streams have not been fetched yet
			const category = favorites.find(cat => cat.id === categoryId);
			if (isOpen && category && category.streams.length === 0) {
				fetchStreamsForCategory(categoryId);
			}
			return { ...prev, [categoryId]: isOpen };
		});
	};

	const removeFavoriteCategory = async (categoryId) => {
		const token = localStorage.getItem('token');
		if (!token) {
			setError('Authentication required.');
			return;
		}
	
		const decoded = jwtDecode(token);
		const userId = decoded.user.userId;
	
		try {
			await axios.post(`${apiUrl}/api/favorites/remove`, { userId, categoryId }, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
	
			// Update the favorites state to remove the category
			setFavorites(prevFavorites => prevFavorites.filter(category => category.id !== categoryId));
		} catch (err) {
			console.error(`Failed to remove favorite category ${categoryId}:`, err);
			setError(`Failed to remove favorite category: ${err.message}`);
		}
	};



	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

return (
    <div>
        <Navbar />
        <div className="container">
            <div className="d-flex flex-wrap align-items-start">
                <div className="w-100">
                    <h1>Your Favorite Categories</h1>
                </div>
                {favorites.length === 0 && loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                        <div className="col-md-4" key={index}>
                            <div className="card">
                                <div className="card-img-top placeholder"></div>
                                <div className="card-body">
                                    <h5 className="card-title">Loading...</h5>
                                    <p className="card-text">Loading...</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
					favorites.map(cat => (
						<div key={cat.id} className="w-100 mb-4">
							<h2 className="category-header" onClick={() => handleToggleCategory(cat.id)}>
								<span 
									style={{cursor: 'pointer', color: favorites.some(fav => fav.id === cat.id) ? 'gold' : 'gray', marginRight: '10px'}}
									onClick={(e) => {
										e.stopPropagation(); // Prevent the category from toggling when the star is clicked
										removeFavoriteCategory(cat.id);
									}}
								>
									{favorites.some(fav => fav.id === cat.id) ? '★' : '☆'}
								</span>
								{cat.name}
								<span className={`toggle-indicator ${openCategories[cat.id] ? 'open' : 'closed'}`} style={{marginLeft: '10px'}}>
									{openCategories[cat.id] ? '▼' : '▲'}
								</span>
							</h2>
                            <Collapse in={openCategories[cat.id]}>
                                <div className="row">
                                    {cat.streams.length > 0 ? (
                                        cat.streams.map(stream => (
                                            <div className="col-md-4" key={stream.id} onClick={() => handleStreamSelect(stream)}>
                                                <div className="card">
                                                    <img src={stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')} className="card-img-top" alt={`${stream.user_name}'s stream thumbnail`} />
                                                    <div className="card-body">
                                                        <h5 className="card-title">{stream.user_name}</h5>
                                                        <p className="card-text">Viewers: {stream.viewer_count}</p>
														<p className="card-text">Followers: {stream.followerCount}</p>
														<p className="card-text">Started at: {new Date(stream.started_at).toLocaleString()}</p>
														<div className="tag-cloud">
															{stream.tags.map((tag, index) => (
																<span key={index} className="tag">{tag}</span>
															))}
														</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        Array.from({ length: 8 }).map((_, index) => (
                                            <div className="col-md-4" key={index}>
                                                <div className="card">
                                                    <div className="card-img-top placeholder"></div>
                                                    <div className="card-body">
                                                        <h5 className="card-title">Loading...</h5>
                                                        <p className="card-text">Loading...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Collapse>
                        </div>
                    ))
                )}
                {favorites.length === 0 && !loading && (
                    <p className="w-100 text-center">You have no favorite categories. Start adding some!</p>
                )}
            </div>
            {selectedStream && (
                <div className="embed-container w-100" style={{ minHeight: "480px" }}>
                    <iframe
                        src={`https://player.twitch.tv/?channel=${selectedStream.user_name}&parent=zer0.tv`}
                        height="480"
                        width="800"
                        allowFullScreen={true}
                        style={{ width: "100%" }}>
                    </iframe>
                    <iframe
                        src={`https://www.twitch.tv/embed/${selectedStream.user_name}/chat?parent=zer0.tv`}
                        height="480"
                        width="350"
                        style={{ width: "100%" }}>
                    </iframe>
                </div>
            )}
        </div>
        <Footer />
    </div>
);
};

export default FavoritesPage;
