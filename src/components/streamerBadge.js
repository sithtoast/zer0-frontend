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
    const noFollowers = stream.followerCount === 0;

return (
    <div className="card-content" style={{ marginTop: '20px' }}>
        <div className="maturity-icon">
            {stream.is_mature ? 
                <img src={MatureIcon} alt="Mature Content" style={{ width: 60, height: 70 }} /> :
                <img src={EveryoneIcon} alt="Family Friendly" style={{ width: 60, height: 70 }} />
            }
        </div>
        <div className="badge-messages">
            {isNearAffiliate &&
                <p className="card-text affiliate-message" title="This user is <5 followers to meeting affiliate requirement.">Near Affiliate</p>
            }
            {isNewbie &&
                <p className="card-text newbie-message" title="This user's account is less than 6 months old.">Twitch Newbie</p>
            }
            {justStarted &&
                <p className="card-text just-started-message" title="This user has just started streaming.">Just Started</p>
            }
            {oldFriend &&
                <p className="card-text old-friend-message" title="This user has been on Twitch for a long time. (5-9 yrs)">Old Friend</p>
            }
            {justinsFriend &&
                <p className="card-text justins-friend-message" title="This user's account was made in the Justin.tv days.">Justin's Friend</p>
            }
            {twitchVeteran &&
                <p className="card-text twitch-veteran-message" title="This user has been on Twitch for a very long time. (10+ yrs)">Twitch Veteran</p>
            }
            {noFollowers &&
                <p className="card-text no-followers-message" title="This user has no followers.">Be my #1</p>
            }
        </div>
    </div>
);
};

export default StreamerBadge;