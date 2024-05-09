// StreamEmbed.js
import React, { useEffect } from 'react';

const StreamEmbed = ({ stream, closeStream }) => {
    useEffect(() => {
        let embed;
        if (stream) {
            embed = new window.Twitch.Embed("twitch-embed", {
                width: "100%",
                height: 480,
                channel: stream,
                layout: "video-with-chat",
                parent: ["zer0.tv"]
            });
        }

    // Return a cleanup function that removes the Twitch embed
    return () => {
        const twitchEmbedElement = document.getElementById('twitch-embed');
        if (twitchEmbedElement) {
            while (twitchEmbedElement.firstChild) {
                twitchEmbedElement.removeChild(twitchEmbedElement.firstChild);
            }
        }
    };
    }, [stream]);

    return (
        <div id="twitch-embed">
            {stream && <button onClick={closeStream}>Close Stream</button>}
        </div>
    );
};

export default StreamEmbed;