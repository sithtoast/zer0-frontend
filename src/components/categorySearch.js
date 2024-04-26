import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar';
import '../twitch.css';
import './categorySearch.css';
import { useNavigate } from 'react-router-dom';

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
			setError('Failed to fetch categories');
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

const handleCategorySelect = async (categoryId) => {
		setSelectedCategory(categoryId);
		setLoading(true);
		const token = localStorage.getItem('token');
		const decoded = jwtDecode(token);
		const userId = decoded.user.userId;
		
		const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
		
		let fetchedStreams = [];
		let cursor = null;
		try {
			do {
				const response = await axios.get(`${apiUrl}/api/twitch/streams/${categoryId}`, {
					headers: { 'Authorization': `Bearer ${twitchAccessToken}` },
					params: { limit: 100, cursor: cursor }
				});
				fetchedStreams = [...fetchedStreams, ...response.data.streams];
				cursor = response.data.cursor; // Assuming the cursor is passed directly like this
			} while (fetchedStreams.length < 1500 && cursor);
	
			// Filter streams with 3 or fewer viewers
			const lowViewerStreams = fetchedStreams.filter(stream => stream.viewer_count <= 3);
			setStreams(lowViewerStreams);
		} catch (err) {
			setError('Failed to fetch streams');
			console.error('Error fetching streams:', err);
		}
		setLoading(false);
	};

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="category-search-container">
			<Navbar />
			<div className="category-search-layout">
				<div className="search-results">
					<h1>Search Game Categories</h1>
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
					<ul className="category-list">
						{categories.map(category => (
							<li key={category.id} className="category-item" onClick={() => handleCategorySelect(category.id)}>
								<img src={category.boxArtUrl} alt={`Box art for ${category.name}`} className="category-box-art" />
								<span className="category-name">{category.name}</span>
								<button onClick={(e) => toggleFavorite(category, e)} className="favorite-button">
									{favorites.has(category.id) ? '★' : '☆'}
								</button>
							</li>
						))}
					</ul>
				</div>
				{selectedCategory && (
					<div className="stream-details">
						<h2>Streams for {categories.find(cat => cat.id === selectedCategory)?.name || 'selected category'}</h2>
						{streams.length > 0 ? (
							<ul className="streams-list">
								{streams.map(stream => (
									<li key={stream.id} className="stream-card">
										<img src={stream.thumbnail_url} alt={`Stream by ${stream.user_name}`} className="stream-thumbnail" />
										<div className="stream-info">
											<p>{stream.title} by {stream.user_name}</p>
											<p>{stream.viewer_count} viewers</p>
											<p>Started at: {new Date(stream.started_at).toLocaleString()}</p>
											<p>Language: {stream.language}</p>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p>No streams available for this category.</p>
						)}
					</div>
				)}
			</div>
		</div>
	);

	};

export default CategorySearch;
