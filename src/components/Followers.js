import React, { useEffect, useState } from 'react';

function Followers({ stream, streams }) {
    const [followerCount, setFollowerCount] = useState(0);

    useEffect(() => {
        if (stream && streams) {
            console.log(stream);
            console.log(streams);
            const streamerData = streams.find(data => data.user_name === stream);
            console.log("Streamer Data:", streamerData);
            if (streamerData) {
                setFollowerCount(streamerData.followerCount || 0); // Use correct property and handle undefined
            } else {
                setFollowerCount(0); // Reset follower count if streamerData is not found
            }
        }
    }, [stream, streams]);

    return (
        <p style={{ padding: '0 10px' }}>F: {followerCount}</p>
    );
}

export default Followers;
