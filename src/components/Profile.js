import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar'; 
import Footer from './Footer';
import { Link } from 'react-router-dom';
import './Profile.css';

const apiUrl = process.env.REACT_APP_API_URL;

const Profile = () => {
    const [profileData, setProfileData] = useState({});
    const [achievements, setAchievements] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [watchTimeStats, setWatchTimeStats] = useState({
        topStreamer: null,
        topCategory: null
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First get the profile data
                const profileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' }
                });
    
                // Then get the rest of the data in parallel
                const [streamersResponse, categoriesResponse, achievementsResponse] = 
                    await Promise.all([
                        axios.get(`${apiUrl}/api/users/streamers/most-watched?limit=1`),
                        axios.get(`${apiUrl}/api/users/categories/most-watched?limit=1`),
                        axios.get(`${apiUrl}/api/achievements/${profileResponse.data.user.userId}`)
                    ]);
    
                setProfileData(profileResponse.data);
                setWatchTimeStats({
                    topStreamer: streamersResponse.data[0],
                    topCategory: categoriesResponse.data[0]
                });
                setAchievements(achievementsResponse.data);
                
                // Check for new achievements
                await axios.post(`${apiUrl}/api/achievements/check`, {
                    userId: profileResponse.data.user.userId,
                    followCount: profileResponse.data.twitch?.followCount,
                    categoryCount: Object.keys(profileResponse.data.user?.categoryWatchTime || {}).length
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

    const calculateProgress = (achievement, title) => {
        if (achievement?.unlocked) return 100;

        let currentValue = 0;
        let targetValue = getTargetProgress(title);

        switch (title) {
            case 'Category Expert':
                currentValue = Object.keys(profileData.user?.categoryWatchTime || {}).length;
                break;
            case 'Time Keeper':
                currentValue = profileData.user?.totalWatchTime || 0;
                break;
            case 'Community Builder':
                currentValue = profileData.twitch?.followCount || 0;
                break;
            case 'First Stream':
                currentValue = profileData.user?.totalWatchTime > 0 ? 1 : 0;
                break;
            default:
                return 0;
        }

        return Math.min((currentValue / targetValue) * 100, 100);
    };

    const renderAchievement = (achievement, icon, title, description) => {
        const progress = calculateProgress(achievement, title);
        const targetValue = getTargetProgress(title);
        let currentValue = 0;

        switch (title) {
            case 'Category Expert':
                currentValue = Object.keys(profileData.user?.categoryWatchTime || {}).length;
                break;
            case 'Time Keeper':
                currentValue = profileData.user?.totalWatchTime || 0;
                break;
            case 'Community Builder':
                currentValue = profileData.twitch?.followCount || 0;
                break;
            default:
                currentValue = achievement?.progress || 0;
        }

        return (
            <div className={`achievement-card ${achievement?.unlocked ? 'unlocked' : 'locked'}`}>
                <div className="achievement-icon">
                    <i className={`fas fa-${icon}`}></i>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                {achievement?.unlocked ? (
                    <div className="achievement-unlock-date">
                        Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                ) : (
                    <div className="achievement-progress">
                        <div className="progress-text">
                            Progress: {Math.round(progress)}%
                        </div>
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="progress-details">
                            {currentValue} / {targetValue} {getProgressLabel(title)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const getTargetProgress = (achievementTitle) => {
        switch (achievementTitle) {
            case 'Time Keeper':
                return 86400; // 24 hours in seconds
            case 'Category Expert':
                return 50; // categories
            case 'Community Builder':
                return 100; // followers
            default:
                return 1;
        }
    };

    const getProgressLabel = (achievementTitle) => {
        switch (achievementTitle) {
            case 'Time Keeper':
                return 'seconds watched';
            case 'Category Expert':
                return 'categories';
            case 'Community Builder':
                return 'followers';
            case 'First Stream':
                return 'stream watched';
            default:
                return '';
        }
    };

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

    // ... rest of the component remains the same ...
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
                                <i className="fas fa-list-ul"></i> {/* Changed icon for Categories Watched */}
                                <span>Categories Watched: {Object.keys(profileData.user?.categoryWatchTime || {}).length}</span>
                            </div>
                            {/* Add Watch History Link Here */}
                            <div className="stat-item">
                                <i className="fas fa-history"></i> {/* Icon for history */}
                                <Link to="/history" className="profile-stat-link">View Watch History</Link>
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
                            {renderAchievement(
                                achievements?.achievements.firstStream,
                                'trophy',
                                'First Stream',
                                'Watch your first stream'
                            )}
                            {renderAchievement(
                                achievements?.achievements.timeKeeper,
                                'clock',
                                'Time Keeper',
                                'Watch 24 hours of streams'
                            )}
                            {renderAchievement(
                                achievements?.achievements.categoryExpert,
                                'star',
                                'Category Expert',
                                'Watch 50 different categories'
                            )}
                            {renderAchievement(
                                achievements?.achievements.communityBuilder,
                                'users',
                                'Community Builder',
                                'Follow 100 streamers'
                            )}
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