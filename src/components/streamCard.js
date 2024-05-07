// StreamCard.js
import { useState, useEffect } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import StreamerBadge from './streamerBadge';
import AffiliateIcon from '../assets/affiliate.png';
import axios from 'axios';



const apiUrl = process.env.REACT_APP_API_URL;

const StreamCard = ({ stream, selectedStream, setSelectedStream }) => {

    const [favorites, setFavorites] = useState(new Set());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    
    const fetchFavorites = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/api/favorites`, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
            setFavorites(new Set(response.data.map(cat => cat.categoryId)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        }
        setLoading(false);
    };


    const toggleFavorite = async (category, event) => {
        event.stopPropagation();
        if (!category?.id) {
            console.error("Missing required parameters", {categoryId: category?.id});
            setError("Missing required parameters");
            return;
        }
    
        const action = favorites.has(category.id) ? 'remove' : 'add';
        console.log("Category passed to toggleFavorite:", category);
        
        try {
            console.log("Sending data:", { categoryId: category.id, name: category.name });
            await axios.post(`${apiUrl}/api/favorites/${action}`, {
                categoryId: category.id,
                name: category.name
            }, {
                withCredentials: true, // This allows the request to send cookies
                headers: { 'Content-Type': 'application/json' }
            });
    
            setFavorites(prev => {
                const updated = new Set(prev);
                if (action === 'add') {
                    updated.add(category.id);
                } else {
                    updated.delete(category.id);
                }
                return updated;
            });
        } catch (err) {
            console.error(`Failed to ${action} favorite:`, err.response ? err.response.data : err);
            setError(`Failed to ${action} favorite: ${err.response ? err.response.data.message : "Unknown error"}`);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, []); 

    return (
        <div 
            key={stream.id} 
            className={`col-md-4 mb-4 selected-stream ${selectedStream === stream.id ? 'selected-stream' : ''}`}
        >
            <div className="card">
                <img 
                    src={stream.thumbnail_url.replace('{width}x{height}', '320x180')} 
                    className="card-img-top" 
                    alt="Stream thumbnail" 
                    onClick={() => {
                        if (selectedStream === stream.user_name) {
                            setSelectedStream(null);
                        } else {
                            setSelectedStream(stream.user_name);
                        }
                    }}
                />
                <div className="card-body">
                <OverlayTrigger
                    placement="left"
                    overlay={
                        <Tooltip id={`tooltip-${stream.user_name}`} className="large-tooltip">
                            <img src={stream.user_info.profile_image_url} alt={`${stream.user_name}'s profile`} className="small-image" /><br />
                            <strong>{stream.user_name}</strong><br />
                            Status: {stream.user_info.broadcaster_type === '' ? 'Regular User' : stream.user_info.broadcaster_type === 'affiliate' ? 'Affiliate' : stream.user_info.broadcaster_type}<br />
                            Followers: {stream.followerCount}<br />
                            Created at: {new Date(stream.user_info.created_at).toLocaleString()}
                        </Tooltip>
                    }
                >
                    <h5 className="card-title d-flex align-items-center justify-content-between">
                        <div>
                            {stream.user_name}
                            {stream.user_info.broadcaster_type === "affiliate" && 
                                <img className="affiliate-icon ml-2" src={AffiliateIcon} alt="Affiliate" style={{ width: 25, height: 20 }} />
                            }
                        </div>
                        <div className="d-flex align-items-center">
                            <span className="live-dot"></span>
                            <p className="mb-0 ml-3">{stream.viewer_count}</p>
                        </div>
                    </h5>
                </OverlayTrigger>
                <p className='card-text'>{stream.title}</p>
                <p className="card-text">
                    Game: {stream.game_name}
                    <span 
                        style={{ cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }} 
                        onClick={(event) => toggleFavorite({ id: stream.game_id, name: stream.game_name }, event)}
                    >
                        {favorites.has(stream.game_id) ? '★' : '☆'}
                    </span>
                </p>
                <p className="card-text">Language: {stream.language}</p>
                <p className="card-text">Started at: {new Date(stream.started_at).toLocaleString()}</p>
                <div className="tag-cloud">
                {stream.tags && stream.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                ))}
                </div>
                <StreamerBadge stream={stream} />
                </div>
            </div>
        </div>
    );
};

export default StreamCard;