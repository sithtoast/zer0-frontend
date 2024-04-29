import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from './Navbar'; 
import '../twitch.css';


const apiUrl = process.env.REACT_APP_API_URL;

const Profile = () => {
	const [profileData, setProfileData] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [profileImage, setProfileImage] = useState(null);
	
	const handleUnlink = async () => {
		try {
			const token = localStorage.getItem('token');
			const userId = profileData.user?.userId;  // Ensure you're getting the right userId
			const response = await axios.post(`${apiUrl}/api/users/unlink/twitch/${userId}`, {}, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			alert(response.data.message);
			// Force refresh the profile to reflect the changes
			window.location.reload();
		} catch (error) {
			console.error('Failed to unlink Twitch account:', error);
			alert('Failed to unlink Twitch account');
		}
	};

	useEffect(() => {
		const fetchProfileData = async () => {
			try {
				const token = localStorage.getItem('token');
				const decoded = jwtDecode(token);
				const userId = decoded.user.userId;

				const response = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				});
				console.log(response.data);
				setProfileData(response.data);
				setLoading(false);
			} catch (err) {
				setError('Failed to fetch profile data');
				setLoading(false);
				console.error('There was an error!', err);
			}
		};

		fetchProfileData();
	}, []);
	
	const handleImageChange = (event) => {
		setProfileImage(event.target.files[0]);
	};
	
	const handleImageUpload = async () => {
		const formData = new FormData();
		formData.append('profileImage', profileImage);
	
		try {
			const token = localStorage.getItem('token');
			const decoded = jwtDecode(token);
			const userId = decoded.user.userId;
			
			const response = await axios.post(`${apiUrl}/api/users/upload-profile-image/${userId}`, formData, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'multipart/form-data'
				}
			});
			alert('Profile image uploaded successfully!');
			setProfileData({...profileData, profileImageUrl: response.data.profileImageUrl});
		} catch (error) {
			console.error('Failed to upload profile image:', error);
			alert('Failed to upload profile image');
		}
	};

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	const linkTwitchAccount = () => {
		// Function to handle Twitch account linking (e.g., redirect to Twitch login)
		// Implement the logic to link Twitch account here
		console.log("Redirecting to Twitch linking flow...");
		window.location.href = `${apiUrl}/auth/twitch`;
	};
	
	const linkSteamAccount = () => {
		console.log("Redirecting to Steam linking flow...");
		window.location.href = `${apiUrl}/auth/steam`;
	};

	const steamButtonImage = '../assets/steam_login.png';

	return (
			<div>
			<Navbar />
				<h1>Profile Page</h1>
				<h2>General Information</h2>
				<p><strong>Email:</strong> {profileData.user?.email}</p>
				<p><strong>UserID:</strong> {profileData.user?.userId}</p>
				<div>
					<h2>Profile Picture</h2>
					<img src={profileData.user?.profileImageUrl || 'default-profile.png'} alt="Profile" />
					<input type="file" onChange={handleImageChange} />
					<button onClick={handleImageUpload}>Upload Image</button>
				</div>
				{profileData.twitch ? (
					<div>
						<h2>Twitch Information</h2>
						<p><strong>Display Name:</strong> {profileData.twitch.displayName}</p>
						<p><strong>Twitch ID:</strong> {profileData.twitch.twitchId}</p>
						<img src={profileData.twitch.profileImageUrl} alt="Twitch Avatar" />
						<button onClick={handleUnlink} className="btn btn-warning">Unlink Twitch Account</button>
					</div>
				) : (
					<button onClick={linkTwitchAccount} style={{ marginTop: '20px', fontSize: '16px', padding: '10px 20px', cursor: 'pointer' }}>
						Link Twitch Account
					</button>
				)}
				{/* Steam link/unlink logic */}
				{profileData.steam ? (
					<div>
						<h2>Steam Information</h2>
						<p><strong>Steam Display Name:</strong> {profileData.steam.displayName}</p>
						<p><strong>Steam ID:</strong> {profileData.steam.steamId}</p>
						<img src={profileData.steam.avatar} alt="Steam Avatar" />
					</div>
				) : (
				<button onClick={linkSteamAccount} style={{ marginTop: '20px', cursor: 'pointer' }}>
					<img src={steamButtonImage} alt="Sign in through Steam" />
				</button>
				)}
			</div>
		);
	};

export default Profile;
