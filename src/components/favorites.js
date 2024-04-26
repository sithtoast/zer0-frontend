import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../twitch.css';
import { Collapse } from 'react-bootstrap';


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
				const decoded = jwtDecode(token);
				const userId = decoded.user.userId;
	
				const response = await axios.get(`${apiUrl}/api/favorites/${userId}`, {
					headers: { 'Authorization': `Bearer ${token}` }
				});
				if (response.data && Array.isArray(response.data)) {
					setFavorites(response.data.map(category => ({
						id: category.categoryId,
						name: category.categoryName,
						streams: shuffleAndPick(category.streams || [], 8)  // Pick 8 random streams
					})));
				} else {
					setError('No categories found or invalid data structure');
				}
				setLoading(false);
			} catch (err) {
				setError('Failed to fetch favorite categories');
				setLoading(false);
				console.error('Error:', err);
			}
		};
	
		fetchFavorites();
	}, []);
	
	const handleStreamSelect = (stream) => {
		setSelectedStream(stream);
	};
	
	function shuffleAndPick(array, numItems) {
		// Shuffle array using the Durstenfeld shuffle algorithm
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]]; // Swap elements
		}
		return array.slice(0, numItems); // Return the first numItems elements
	}

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

return (
		<div className="container">
			<Navbar />
			<div className="d-flex flex-wrap align-items-start">
				<div className="w-100">
					<h1>Your Favorite Categories</h1>
				</div>
				{favorites.length > 0 ? (
					favorites.map(cat => (
						<div key={cat.id} className="w-100 mb-4">
							<h2 onClick={() => setOpenCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
								{cat.name}
								<span className={`toggle-indicator ${openCategories[cat.id] ? 'open' : 'closed'}`}>
									{openCategories[cat.id] ? '▼' : '▲'}
								</span>
							</h2>
							<Collapse in={openCategories[cat.id]}>
								<div className="row">
									{cat.streams.map(stream => (
										<div className="col-md-4" key={stream.id} onClick={() => handleStreamSelect(stream)}>
											<div className="card">
												<img src={stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')} className="card-img-top" alt="Stream thumbnail" />
												<div className="card-body">
													<h5 className="card-title">{stream.user_name}</h5>
													<p className="card-text">Viewers: {stream.viewer_count}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</Collapse>
						</div>
					))
				) : (
					<p className="w-100 text-center">You have no favorite categories. Start adding some!</p>
				)}
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
		</div>
	);
};

export default FavoritesPage;
