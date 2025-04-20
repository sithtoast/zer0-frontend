import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar'; 
import Footer from './Footer';


const apiUrl = process.env.REACT_APP_API_URL;

const Profile = () => {
	const [profileData, setProfileData] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

useEffect(() => {
    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true, // Add this line
                headers: {
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

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	const linkTwitchAccount = () => {
		// Function to handle Twitch account linking (e.g., redirect to Twitch login)
		// Implement the logic to link Twitch account here
		console.log("Redirecting to Twitch linking flow...");
		window.location.href = `${apiUrl}/auth/twitch`;
	};

return (
	<div>
	<Navbar />
	<div className="profile-container">
        <h1>Profile Page</h1>
        <h2>General Information</h2>
        {profileData.user && (
            <>
                <p><strong>Email:</strong> {profileData.user.email}</p>
                <p><strong>UserID:</strong> {profileData.user.userId}</p>
                <p><strong>Overall Watchtime:</strong> {profileData.user.totalWatchTime}</p>
            </>
        )}
        {profileData.twitch ? (
    <div className="twitch-profile-container">
        <h2>Twitch Information</h2>
        <p><strong>Display Name:</strong> {profileData.twitch.displayName}</p>
        <p><strong>Twitch ID:</strong> {profileData.twitch.twitchId}</p>
        <img src={profileData.twitch.profileImageUrl} alt="Twitch Avatar" />
    </div>
) : (
    <button onClick={linkTwitchAccount} style={{ marginTop: '20px', fontSize: '16px', padding: '10px 20px', cursor: 'pointer' }}>
        Link Twitch Account
    </button>
)}
        
    </div>
	<Footer />
	</div>
);
	};

export default Profile;
