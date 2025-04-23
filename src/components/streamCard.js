import { useState, useEffect, useCallback } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import AffiliateIcon from '../assets/affiliate.png';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import StreamerBadge from './streamerBadge'; // Import StreamerBadge
import './streamCard.css';

const apiUrl = process.env.REACT_APP_API_URL;

// Helper function outside component if it doesn't rely on state/props
const calculateTimeDifference = (startTime) => {
    if (!startTime) return null; // Handle cases where start time might be missing
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = now - start;

    // If the stream started in the future (clock sync issues?), return 'Live'
    if (diffMs < 0) return 'Live';

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
    if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds % 60}s`;
    if (diffSeconds > 0) return `${diffSeconds}s`; // Show seconds if less than a minute
    return 'Just started'; // If diffMs is very small or 0
};

const StreamCard = ({ stream, setSelectedStream }) => {
    const [favorites, setFavorites] = useState(new Set());
    const [error, setError] = useState('');
    const [loadingFavorites, setLoadingFavorites] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [sessionData, setSessionData] = useState(null);

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    // --- Fetch Session Data ---
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, {
                    withCredentials: true,
                });
                setSessionData(response.data);
            } catch (error) {
                console.error('Error fetching session data:', error);
            }
        };
        fetchSession();
    }, []);

    // --- Fetch Favorites ---
    const fetchFavorites = useCallback(async () => {
        if (!sessionData || sessionData.user?.userId === 0) {
            setLoadingFavorites(false);
            return;
        }
        setLoadingFavorites(true);
        try {
            const response = await axios.get(`${apiUrl}/api/favorites`, {
                withCredentials: true,
            });
            setFavorites(new Set(response.data.map(fav => fav.categoryId)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
            setError('Could not load favorites.');
        } finally {
            setLoadingFavorites(false);
        }
    }, [sessionData]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    // --- Toggle Favorite ---
    const toggleFavorite = useCallback(async (category, event) => {
        event.stopPropagation();
        if (!sessionData || sessionData.user?.userId === 0) {
            handleShow();
            return;
        }
        if (!category?.id || !category?.name) {
            console.error("Missing category ID or name for favorite toggle");
            return;
        }

        const action = favorites.has(category.id) ? 'remove' : 'add';
        const originalFavorites = new Set(favorites);

        setFavorites(prev => {
            const updated = new Set(prev);
            if (action === 'add') updated.add(category.id);
            else updated.delete(category.id);
            return updated;
        });
        setError('');

        try {
            await axios.post(`${apiUrl}/api/favorites/${action}`, {
                categoryId: category.id,
                name: category.name
            }, { withCredentials: true });
        } catch (err) {
            console.error(`Failed to ${action} favorite:`, err.response?.data || err);
            setError(`Failed to ${action} favorite.`);
            setFavorites(originalFavorites);
        }
    }, [favorites, sessionData]);

    // --- Render Tooltip ---
    const renderTooltip = (props) => (
        <Tooltip id={`tooltip-${stream.user_name}`} {...props}>
            {stream.user_info?.profile_image_url && (
                 <img src={stream.user_info.profile_image_url} alt={`${stream.user_name}'s profile`} className="tooltip-streamer-avatar" />
            )}
            <strong>{stream.user_name}</strong><br />
            Status: {stream.user_info?.broadcaster_type || 'User'}<br />
            {(stream.followerCount !== null && stream.followerCount !== undefined) && (
                <>
                    Followers: {stream.followerCount.toLocaleString()}
                    <br />
                </>
            )}
            Joined: {stream.user_info?.created_at ? new Date(stream.user_info.created_at).toLocaleDateString() : 'N/A'}
        </Tooltip>
    );

    // --- Handle Card Click ---
    const handleCardClick = () => {
        setSelectedStream(stream.user_name);
    };

    // Calculate uptime
    const streamUptime = calculateTimeDifference(stream.started_at);

    // --- Render Component ---
    return (
        <>
            <div className="stream-card" onClick={handleCardClick}>
                <div className="stream-thumbnail-container">
                    <img
                        src={stream.thumbnail_url.replace('{width}x{height}', '320x180')}
                        className="stream-thumbnail"
                        alt={`${stream.game_name} stream by ${stream.user_name}`}
                        loading="lazy"
                    />
                    <span className="stream-live-indicator">LIVE</span>
                    <span className="stream-viewer-count">
                        <i className="fas fa-user" style={{ marginRight: '4px' }}></i>
                        {stream.viewer_count.toLocaleString()}
                    </span>
                    {/* Optional: Add uptime to thumbnail */}
                    {/* {streamUptime && <span className="stream-uptime-indicator">{streamUptime}</span>} */}
                </div>

                <div className="stream-info">
                    <div className="stream-header">
                         <OverlayTrigger placement="top" overlay={renderTooltip}>
                            <a href={`https://twitch.tv/${stream.user_name}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="streamer-avatar-link">
                                {stream.user_info?.profile_image_url && (
                                    <img
                                        src={stream.user_info.profile_image_url}
                                        alt=""
                                        className="streamer-avatar"
                                    />
                                )}
                            </a>
                        </OverlayTrigger>

                        <div className="stream-text-content">
                            <span className="stream-title" title={stream.title}>{stream.title}</span>
                             <OverlayTrigger placement="top" overlay={renderTooltip}>
                                <a href={`https://twitch.tv/${stream.user_name}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="streamer-name">
                                    {stream.user_name}
                                    {stream.user_info?.broadcaster_type === "affiliate" &&
                                        <img className="affiliate-icon-sc" src={AffiliateIcon} alt="Affiliate" title="Affiliate" />
                                    }
                                </a>
                            </OverlayTrigger>
                            <span className="stream-game">
                                {stream.game_name}
                                {/* Favorite Button Logic */}
                                {!loadingFavorites && sessionData?.user?.userId !== 0 && (
                                    <span
                                        className={`favorite-icon ${favorites.has(stream.game_id) ? 'favorited' : ''}`}
                                        title={favorites.has(stream.game_id) ? 'Remove Favorite' : 'Add Favorite'}
                                        onClick={(e) => toggleFavorite({ id: stream.game_id, name: stream.game_name }, e)}
                                    >
                                        {favorites.has(stream.game_id) ? '★' : '☆'}
                                    </span>
                                )}
                                 {!loadingFavorites && (!sessionData || sessionData.user?.userId === 0) && (
                                     <span
                                        className="favorite-icon"
                                        title="Login to Favorite"
                                        onClick={(e) => { e.stopPropagation(); handleShow(); }}
                                    >
                                        ☆
                                    </span>
                                 )}
                            </span>
                            {/* Display Uptime */}
                            {streamUptime && (
                                <span className="stream-uptime">{streamUptime}</span>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="stream-tags">
                        {stream.tags?.slice(0, 3).map((tag, index) => (
                            <span key={index} className="stream-tag">{tag}</span>
                        ))}
                    </div>

                    {/* Streamer Badges - Render here */}
                    {/* Conditionally render based on necessary data */}
                    {(stream.user_info && stream.followerCount !== undefined) && (
                        <StreamerBadge stream={stream} />
                    )}

                     {/* Display favorite error inline */}
                     {error && <p className="stream-card-error">{error}</p>}
                </div>
            </div>

            {/* Login Modal */}
            <Modal show={showModal} onHide={handleClose} centered>
                 <Modal.Header closeButton>
                    <Modal.Title>Login Required</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Please log in with Twitch to favorite games.
                </Modal.Body>
                <Modal.Footer>
                    <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}>
                        <i className="fab fa-twitch"></i> Login with Twitch
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default StreamCard;