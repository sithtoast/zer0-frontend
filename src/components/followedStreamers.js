import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import Footer from './Footer';
import Navbar from './Navbar';
// Removed bootstrap CSS import
import StreamCard from './streamCard';
import StreamEmbed from './streamEmbed';
import './followedStreamers.css'; // Import the new CSS

const apiUrl = process.env.REACT_APP_API_URL;

const FollowedStreams = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true); // Combined loading state
    const [error, setError] = useState('');
    const [selectedStream, setSelectedStream] = useState(null);
    // Removed userProfileResponse state as it's not needed after fetch
    // Removed favorites state as it's handled within StreamCard

    // --- Fetch Followed Streams ---
    const fetchFollowedStreams = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch profile first to get token and check link status
            const profileRes = await axios.get(`${apiUrl}/api/users/profile`, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });

            if (!profileRes.data.twitch) {
                setError('Please link your Twitch account to view followed streams.');
                setLoading(false);
                return;
            }
            const twitchAccessToken = profileRes.data.twitch.accessToken;

            // Fetch followed streams
            const streamsRes = await axios.get(`${apiUrl}/api/twitch/followed-streams`, {
                withCredentials: true,
                headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
            });

            let streamsData = streamsRes.data;

            if (streamsData.length === 0) {
                setStreams([]);
                setLoading(false);
                return; // Exit early if no streams
            }

            // --- Batch fetch user info ---
            const batchSize = 100;
            const userInfoPromises = [];
            for (let i = 0; i < streamsData.length; i += batchSize) {
                const batchUserIds = streamsData.slice(i, i + batchSize).map(stream => stream.user_id);
                userInfoPromises.push(
                    axios.post(`${apiUrl}/api/twitch/users`, { userIds: batchUserIds }, {
                        headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                    }).then(res => res.data)
                      .catch(err => {
                          console.error('Error fetching user data batch:', err);
                          return []; // Return empty array for this batch on error
                      })
                );
            }
            const userInfoBatches = await Promise.all(userInfoPromises);
            const userInfoMap = userInfoBatches.flat().reduce((map, user) => {
                map[user.id] = user;
                return map;
            }, {});

            // --- Batch fetch follower counts ---
            const followerCountPromises = [];
             for (let i = 0; i < streamsData.length; i += batchSize) {
                const batchStreamerIds = streamsData.slice(i, i + batchSize).map(stream => stream.user_id);
                 followerCountPromises.push(
                    axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: batchStreamerIds }, {
                        headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                    }).then(res => res.data)
                      .catch(err => {
                          console.error('Error fetching follower count batch:', err);
                          // Map IDs to 0 count on error for this batch
                          return batchStreamerIds.map(id => ({ id, followerCount: 0 }));
                      })
                 );
             }
            const followerCountBatches = await Promise.all(followerCountPromises);
            const followerCountMap = followerCountBatches.flat().reduce((map, item) => {
                map[item.id] = item.followerCount;
                return map;
            }, {});


            // Combine data
            const streamsWithDetails = streamsData.map(stream => ({
                ...stream,
                user_info: userInfoMap[stream.user_id] || null,
                followerCount: followerCountMap[stream.user_id] ?? 0
            }));

            setStreams(streamsWithDetails);

        } catch (err) {
            // Handle specific errors like 401 or general fetch failures
            if (err.response && err.response.status === 401) {
                 setError('Authentication failed. Please re-link your Twitch account or log in again.');
            } else {
                 setError('Failed to fetch followed streams. Please try again later.');
            }
            console.error('Error fetching followed streams:', err);
            setStreams([]); // Clear streams on error
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array, runs once on mount

    useEffect(() => {
        fetchFollowedStreams();
    }, [fetchFollowedStreams]);


    // --- Render Loading State ---
    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="loading-container-followed">
                    <div className="loading-spinner-followed"></div>
                    <p>Loading followed streams...</p>
                </div>
                <Footer />
            </div>
        );
    }

    // --- Render Main Content ---
    return (
        <div>
            <Navbar />
            <div className="followed-page">
                {/* Embed Area */}
                <div className="w-100 mb-4"> {/* Simple wrapper for spacing */}
                    {selectedStream && (
                        <StreamEmbed
                            stream={selectedStream}
                            streams={streams} // Pass all fetched streams
                            closeStream={() => setSelectedStream(null)}
                        />
                    )}
                </div>

                {/* Page Header */}
                <div className="followed-header">
                    <h1>Followed Streams</h1>
                </div>

                {/* Display Error or Content */}
                {error ? (
                    <p className="error-message-followed">{error}</p>
                ) : streams.length > 0 ? (
                    <div className="streams-grid-followed">
                        {streams.map(stream => (
                            <StreamCard
                                key={stream.id}
                                stream={stream}
                                setSelectedStream={setSelectedStream}
                                // Favorites are handled internally by StreamCard now
                            />
                        ))}
                    </div>
                ) : (
                    <p className="no-streams-message">None of the streamers you follow are currently live, or no streams match the criteria.</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default FollowedStreams;