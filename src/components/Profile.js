import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar'; 
import Footer from './Footer';
import './Profile.css';

const apiUrl = process.env.REACT_APP_API_URL;

const Profile = () => {
    const [profileData, setProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [watchTimeStats, setWatchTimeStats] = useState({
        topStreamer: null,
        topCategory: null
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileResponse, streamersResponse, categoriesResponse] = await Promise.all([
                    axios.get(`${apiUrl}/api/users/profile`, {
                        withCredentials: true,
                        headers: { 'Content-Type': 'application/json' }
                    }),
                    axios.get(`${apiUrl}/api/users/streamers/most-watched?limit=1`),
                    axios.get(`${apiUrl}/api/users/categories/most-watched?limit=1`)
                ]);

                setProfileData(profileResponse.data);
                setWatchTimeStats({
                    topStreamer: streamersResponse.data[0],
                    topCategory: categoriesResponse.data[0]
                });
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch profile data');
                setLoading(false);
                console.error('There was an error!', err);
            }
        };

        fetchData();
    }, []);

    const formatWatchTime = (seconds) => {
        if (!seconds) return '0h 0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const linkTwitchAccount = () => {
        window.location.href = `${apiUrl}/auth/twitch`;
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading profile data...</p>
        </div>
    );
    
    if (error) return <p className="error-message">Error: {error}</p>;

    return (
        <div>
            <Navbar />
            <div className="profile-page">
                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-avatar">
                        {profileData.twitch ? (
                            <img 
                                src={profileData.twitch.profileImageUrl} 
                                alt="Profile" 
                                className="avatar-image"
                            />
                        ) : (
                            <div className="avatar-placeholder">
                                <i className="fas fa-user"></i>
                            </div>
                        )}
                    </div>
                    <div className="profile-info">
                        <h1>{profileData.twitch?.displayName || profileData.user?.username || 'User'}</h1>
                        <div className="profile-stats">
                            <div className="stat-item">
                                <i className="fas fa-clock"></i>
                                <span>Total Watch Time: {formatWatchTime(profileData.user?.totalWatchTime)}</span>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-user"></i>
                                <span>User ID: {profileData.user?.userId}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-content">
                    {/* Watch Time Statistics */}
                    <div className="profile-section watch-stats">
                        <h2>Watch Time Statistics</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Most Watched Streamer</h3>
                                {watchTimeStats.topStreamer ? (
                                    <div className="stat-content">
                                        <img 
                                            src={watchTimeStats.topStreamer.streamerInfo?.profilePictureUrl} 
                                            alt="Streamer"
                                            className="streamer-avatar"
                                        />
                                        <div className="stat-details">
                                            <p className="name">{watchTimeStats.topStreamer.streamerInfo?.displayName}</p>
                                            <p className="time">{formatWatchTime(watchTimeStats.topStreamer.totalWatchTime)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p>No streamer data available</p>
                                )}
                            </div>
                            <div className="stat-card">
                                <h3>Most Watched Category</h3>
                                {watchTimeStats.topCategory ? (
                                    <div className="stat-content">
                                        <div className="stat-details">
                                            <p className="name">{watchTimeStats.topCategory.categoryName}</p>
                                            <p className="time">{formatWatchTime(watchTimeStats.topCategory.totalWatchTime)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p>No category data available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Achievements Section */}
                    <div className="profile-section achievements">
                        <h2>Achievements</h2>
                        <div className="achievements-grid">
                            <div className="achievement-card locked">
                                <div className="achievement-icon">
                                    <i className="fas fa-trophy"></i>
                                </div>
                                <h3>First Stream</h3>
                                <p>Watch your first stream</p>
                            </div>
                            <div className="achievement-card locked">
                                <div className="achievement-icon">
                                    <i className="fas fa-clock"></i>
                                </div>
                                <h3>Time Keeper</h3>
                                <p>Watch 24 hours of streams</p>
                            </div>
                            <div className="achievement-card locked">
                                <div className="achievement-icon">
                                    <i className="fas fa-star"></i>
                                </div>
                                <h3>Category Expert</h3>
                                <p>Watch 50 different categories</p>
                            </div>
                            <div className="achievement-card locked">
                                <div className="achievement-icon">
                                    <i className="fas fa-users"></i>
                                </div>
                                <h3>Community Builder</h3>
                                <p>Follow 100 streamers</p>
                            </div>
                        </div>
                    </div>

                    {/* Account Links */}
                    <div className="profile-section account-links">
                        <h2>Connected Accounts</h2>
                        <div className="connections-grid">
                            <div className={`connection-card ${profileData.twitch ? 'connected' : ''}`}>
                                <i className="fab fa-twitch"></i>
                                <h3>Twitch</h3>
                                {profileData.twitch ? (
                                    <p className="connected-status">Connected as {profileData.twitch.displayName}</p>
                                ) : (
                                    <button onClick={linkTwitchAccount} className="connect-button">
                                        Connect Twitch
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Profile;