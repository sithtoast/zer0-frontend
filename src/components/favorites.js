import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../twitch.css';

const apiUrl = process.env.REACT_APP_API_URL;

const FavoritesPage = () => {
	const [favorites, setFavorites] = useState([]);
	const [selectedStream, setSelectedStream] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

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
					setFavorites(response.data.map(cat => ({
						...cat,
						streams: cat.streams || []  // Ensure streams is always an array
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

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="container">
			<Navbar />
			<div className="d-flex">
				<div className="flex-fill">
					<h1>Your Favorite Categories</h1>
					{favorites.length > 0 ? (
						favorites.map(cat => (
							<div key={cat.categoryId} className="mb-4">
								<h2>{cat.categoryName}</h2>
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
							</div>
						))
					) : (
						<p>You have no favorite categories. Start adding some!</p>
					)}
				</div>
				<div className="flex-fill">
					{selectedStream && (
						<div className="embed-container" style={{ minWidth: "400px" }}>
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
		</div>
	);
};

export default FavoritesPage;
