// StreamerBadge.js
import React from 'react';
import MatureIcon from '../assets/ratedm.png';  // Assuming you've imported images
import EveryoneIcon from '../assets/ratede.png';

const StreamerBadge = ({ stream }) => {
    const isNewbie = (new Date() - new Date(stream.user_info.created_at)) / (1000 * 60 * 60 * 24 * 30) < 6;
    const isNearAffiliate = stream.followerCount >= 45 && stream.followerCount < 50;

    return (
        <div className="card-content">
            <div className="maturity-icon">
                {stream.is_mature ? 
                    <img src={MatureIcon} alt="Mature Content" style={{ width: 30, height: 35 }} /> :
                    <img src={EveryoneIcon} alt="Family Friendly" style={{ width: 30, height: 35 }} />
                }
            </div>
            <div className="badge-messages">
                {isNearAffiliate &&
                    <p className="card-text affiliate-message">Near Affiliate</p>
                }
                {isNewbie &&
                    <p className="card-text newbie-message">Twitch Newbie</p>
                }
            </div>
        </div>
    );
};

export default StreamerBadge;