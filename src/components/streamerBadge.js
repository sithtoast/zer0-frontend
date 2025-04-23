// filepath: /Users/william/Dev/zer0-frontend/src/components/streamerBadge.js
import React, { useEffect, useState } from 'react';
import MatureIcon from '../assets/ratedm.png';
import EveryoneIcon from '../assets/ratede.png';
import axios from 'axios';
import './streamerBadge.css'; // Import the new CSS

const apiUrl = process.env.REACT_APP_API_URL;

const StreamerBadge = ({ stream }) => {
    const [sessionData, setSessionData] = useState(null);

    // Calculate badge conditions (ensure stream.user_info exists)
    const createdAt = stream.user_info?.created_at ? new Date(stream.user_info.created_at) : null;
    const startedAt = stream.started_at ? new Date(stream.started_at) : null;
    const now = new Date();

    const isNewbie = createdAt && (now - createdAt) / (1000 * 60 * 60 * 24 * 30) < 6;
    const isNearAffiliate = stream.followerCount >= 45 && stream.followerCount < 50;
    const justStarted = startedAt && (now - startedAt) / (1000 * 60 * 60) < 1;
    const yearsRegistered = createdAt ? (now - createdAt) / (1000 * 60 * 60 * 24 * 365) : 0;
    const oldFriend = yearsRegistered >= 5 && yearsRegistered < 10;
    const twitchVeteran = yearsRegistered >= 10 && createdAt > new Date('2011-06-14');
    const justinsFriend = createdAt >= new Date('2007-03-01') && createdAt <= new Date('2011-06-14');
    const noFollowers = stream.followerCount === 0;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, {
                    withCredentials: true,
                });
                setSessionData(response.data);
            } catch (error) {
                // console.error('Error fetching session data:', error);
            }
        };
        fetchData();
    }, []);

    // Don't render anything if no badges apply and no maturity icon needed?
    // Or decide if maturity icon should always show. Let's assume it should.
    const shouldRenderBadges = isNearAffiliate || isNewbie || justStarted || oldFriend || justinsFriend || twitchVeteran || (noFollowers && sessionData?.user?.userId !== 0);

    return (
        <div className="streamer-badge-container">
            <div className="maturity-icon">
                {stream.is_mature ?
                    <img src={MatureIcon} alt="Mature Content" title="Mature Content (18+)" /> :
                    <img src={EveryoneIcon} alt="Family Friendly" title="Family Friendly" />
                }
            </div>
            {/* Only render badge messages container if there are badges */}
            {shouldRenderBadges && (
                <div className="badge-messages">
                    {isNearAffiliate &&
                        <span className="badge-message affiliate-message" title="This user is <5 followers to meeting affiliate requirement.">Near Affiliate</span>
                    }
                    {isNewbie &&
                        <span className="badge-message newbie-message" title="This user's account is less than 6 months old.">Twitch Newbie</span>
                    }
                    {justStarted &&
                        <span className="badge-message just-started-message" title="This user has just started streaming.">Just Started</span>
                    }
                    {oldFriend &&
                        <span className="badge-message old-friend-message" title="This user has been on Twitch for a long time. (5-9 yrs)">Old Friend</span>
                    }
                    {justinsFriend &&
                        <span className="badge-message justins-friend-message" title="This user's account was made in the Justin.tv days.">Justin's Friend</span>
                    }
                    {twitchVeteran &&
                        <span className="badge-message twitch-veteran-message" title="This user has been on Twitch for a very long time. (10+ yrs)">Twitch Veteran</span>
                    }
                    {sessionData?.user?.userId !== 0 && noFollowers &&
                        <span className="badge-message no-followers-message" title="This user has no followers.">Be my #1</span>
                    }
                </div>
            )}
        </div>
    );
};

export default StreamerBadge;