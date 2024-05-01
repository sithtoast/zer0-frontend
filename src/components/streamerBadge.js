// StreamerBadge.js
import React from 'react';
import MatureIcon from '../assets/ratedm.png';  // Assuming you've imported images
import EveryoneIcon from '../assets/ratede.png';

const StreamerBadge = ({ stream }) => {
    const isNewbie = (new Date() - new Date(stream.user_info.created_at)) / (1000 * 60 * 60 * 24 * 30) < 6;
    const isNearAffiliate = stream.followerCount >= 45 && stream.followerCount < 50;
    const justStarted = (new Date() - new Date(stream.started_at)) / (1000 * 60 * 60) < 1;
    const yearsRegistered = (new Date() - new Date(stream.user_info.created_at)) / (1000 * 60 * 60 * 24 * 365);
    const oldFriend = yearsRegistered >= 5 && yearsRegistered < 10;
    const twitchVeteran = yearsRegistered >= 10 && new Date(stream.user_info.created_at) > new Date('2011-06-14');
    const justinsFriend = new Date(stream.user_info.created_at) >= new Date('2007-03-01') && new Date(stream.user_info.created_at) <= new Date('2011-06-14');

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
                {justStarted &&
                    <p className="card-text just-started-message">Just Started</p>
                }
                {oldFriend &&
                    <p className="card-text old-friend-message">Old Friend</p>
                }
                {justinsFriend &&
                    <p className="card-text justins-friend-message">Justin's Friend</p>
                }
                {twitchVeteran &&
                    <p className="card-text twitch-veteran-message">Twitch Veteran</p>
                }
            </div>
        </div>
    );
};

export default StreamerBadge;