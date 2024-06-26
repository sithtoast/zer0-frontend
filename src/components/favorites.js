import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Collapse } from 'react-bootstrap';
import Footer from './Footer';
import StreamCard from './streamCard';
import StreamEmbed from './streamEmbed';


const apiUrl = process.env.REACT_APP_API_URL;

const FavoritesPage = (categoryId) => {
	const [favorites, setFavorites] = useState([]);
	const [selectedStream, setSelectedStream] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [openCategories, setOpenCategories] = useState({});
	const [showNoStreamsMessage, setShowNoStreamsMessage] = useState(false);
    const [streams, setStreams] = useState([]);
	
	
	let timeoutId = null;
	
	
function shuffleAndPick(array, numItems) {
		// Filter the array for streams with 3 or fewer viewers
		const filteredArray = array.filter(stream => stream.viewer_count <= 10);
	
		// Shuffle the filtered array using the Durstenfeld shuffle algorithm
		for (let i = filteredArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[filteredArray[i], filteredArray[j]] = [filteredArray[j], filteredArray[i]]; // Swap elements
		}
	
		// Return the first numItems elements from the shuffled filtered array
		return filteredArray.slice(0, numItems);
	}
	
	
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
		try {
			await axios.post(`${apiUrl}/api/favorites/remove`, { categoryId }, {
				withCredentials: true, // This allows the request to send cookies
				headers: { 'Content-Type': 'application/json' }
			});
	
			// Update the favorites state to remove the category
			setFavorites(prevFavorites => prevFavorites.filter(category => category.id !== categoryId));
		} catch (err) {
			console.error(`Failed to remove favorite category ${categoryId}:`, err);
			setError(`Failed to remove favorite category: ${err.message}`);
		}
	};

	const fetchStreamsForCategory = async (categoryId) => {
    setLoading(prevLoading => ({ ...prevLoading, [categoryId]: true }));
    try {
        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

        const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
            headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
        });

        const shuffledPickedStreams = shuffleAndPick(response.data.streams, 8);

        const batchSize = 8;
        for (let i = 0; i < shuffledPickedStreams.length; i += batchSize) {
            const batch = shuffledPickedStreams.slice(i, i + batchSize);
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

        // Fetch follower counts for each stream
        const newStreams = [];
        for (const stream of shuffledPickedStreams) {
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

        setFavorites(prevFavorites => prevFavorites.map(category => 
            category.id === categoryId ? {...category, streams: newStreams} : category
        ));

        setStreams(newStreams);
    } catch (err) {
        console.error(`Failed to fetch streams for category ${categoryId}:`, err);
        setError(`Failed to fetch streams for category: ${err.message}`);
    } finally {
        setLoading(prevLoading => ({ ...prevLoading, [categoryId]: false }));
    }
};


	useEffect(() => {
        const fetchFavorites = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${apiUrl}/api/favorites`, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' }
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

useEffect(() => {
    setLoading(true);
    let timeoutId = null;

    const fetchStreams = async () => {
        try {
            // Fetch your streams here
            // If successful, clear the timeout
            clearTimeout(timeoutId);
        } catch (error) {
            // Handle error
        }
    };

    timeoutId = setTimeout(() => {
        setShowNoStreamsMessage(true);
        setLoading(false); // Stop loading after 10 seconds regardless of data status
    }, 10000);

    fetchStreams();

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}, [categoryId]);

useEffect(() => {
    console.log(selectedStream);
}, [selectedStream]);

	
return (
    <div>
        <Navbar />
        <div className="container">
            <div className="d-flex flex-wrap align-items-start">
                <div className="w-100">
                    {selectedStream && (
                        <StreamEmbed 
                            stream={selectedStream} 
                            streams={streams} 
                            closeStream={() => setSelectedStream(null)} 
                        />
                    )}
                    <h1>Your Favorite Categories</h1>
                </div>
                {favorites.map(cat => (
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
                                {loading[cat.id] ? (
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
                                ) : cat.streams.length > 0 ? (
                                        cat.streams.map(stream => (
                                            <StreamCard 
                                                key={stream.id}
                                                stream={stream} 
                                                selectedStream={selectedStream} 
                                                setSelectedStream={setSelectedStream} 
                                            />

                                    ))
                                ) : showNoStreamsMessage && (
                                    <p>No streams were found for this category.</p>
                                )}
                            </div>
                        </Collapse>
                    </div>
                ))}
                {favorites.length === 0 && !Object.values(loading).some(v => v) && (
                    <p className="w-100 text-center">You are either not logged in or you have no favorite categories. Start adding some!</p>
                )}
            </div>
        </div>
        <Footer />
    </div>
);
};

export default FavoritesPage;
