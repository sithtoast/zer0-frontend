/* global Twitch */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import FilterBox from './filterBox';


const apiUrl = process.env.REACT_APP_API_URL;


const TagSearch = () => {
    const [tag, setTag] = useState('');
    const [streamers, setStreamers] = useState([]);
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [topTags, setTopTags] = useState([]);
    const [selectedStream, setSelectedStream] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredStreams, setFilteredStreams] = useState([]);



    const itemsPerPage = 30;

    const fetchTopTags = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-tags`);
            setTopTags(response.data);
        } catch (err) {
            console.error('Error fetching top tags:', err);
        }
    };

    

const fetchTags = debounce(async (tag) => {
    try {
        const response = await axios.get(`${apiUrl}/api/twitch/tags/${tag}`);
        setSuggestedTags(response.data);
    } catch (err) {
        console.error('Error fetching suggested tags:', err);
    }
}, 900);

const handleInputChange = (e) => {
    setTag(e.target.value);
    fetchTags(e.target.value);
};

const handleSearch = async (searchTag = tag) => {
    try {
        const response = await axios.get(`${apiUrl}/api/twitch//streamers-by-tags/${searchTag}`);
        const streamers = response.data;

        const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
            withCredentials: true, // This allows the request to send cookies
            headers: { 'Content-Type': 'application/json' }
        });
        const twitchAccessToken = userProfileResponse.data.twitch.accessToken;
        console.log(twitchAccessToken);

        let streams = (await Promise.all(streamers.map(async (streamer) => {
    const streamResponse = await axios.get(`${apiUrl}/api/twitch/stream/${streamer.twitchId}`, {
        headers: {
            Authorization: `Bearer ${twitchAccessToken}`
        }
    });
    return streamResponse.data;
        }))).filter(stream => stream.length > 0);

        // Flatten the array
        streams = streams.flat();

        // Filter the streams
        streams = streams.filter(stream => stream.viewer_count <= 3);

        const batchSize = 100;
        console.log(streams);
        for (let i = 0; i < streams.length; i += batchSize) {
            const batch = streams.slice(i, i + batchSize);
            const userIds = batch.map(stream => stream.user_id);
            try {
                const userInfoResponse = await axios.post(`${apiUrl}/api/twitch/users`, { userIds }, {
                    headers: {
                        'Authorization': `Bearer ${twitchAccessToken}`
                    }
                });
                const userInfoData = userInfoResponse.data.data;
                for (let j = 0; j < batch.length; j++) {
                    const stream = batch[j];
                    const userInfo = userInfoData.find(user => user.id === stream.user_id);
                    if (userInfo) {
                        stream.user_info = userInfo;
                    }
                }
            } catch (err) {
                console.error('Error fetching user data:', err);
            }
        }

                setStreamers(streams);
                console.log(streams);
            } catch (err) {
                console.error('Error fetching streamers by tag:', err);
            }
};

// Calculate the total number of pages
const totalPages = Math.ceil(filteredStreams.length / itemsPerPage);

// Calculate the items for the current page
const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentItems = filteredStreams.slice(indexOfFirstItem, indexOfLastItem);

// Add functions to handle clicking the previous and next buttons
const handlePreviousClick = () => {
    if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
    }
};

const handleNextClick = () => {
    if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
    }
};

// Add a function to handle page changes
const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
};

const handleFilterChange = (filtered) => {
    setFilteredStreams(filtered);
};

    const handleTagClick = (clickedTag) => {
        setTag(clickedTag);
        handleSearch(clickedTag);
    };

    useEffect(() => {
        fetchTopTags();
    }, []);

    useEffect(() => {

        if (selectedStream) {
            new Twitch.Embed("twitch-embed", {
                width: "100%",
                height: '500px',
                channel: selectedStream,
                layout: "video-with-chat",
                parent: ["zer0.tv"]
            });
        }
    }, [selectedStream]);

return (
    <div>
        <Navbar />  
        <div className='tag-search-container' style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <h3>Search Streamers by Tag</h3>
                <input type="text" value={tag} onChange={handleInputChange} />
                <button onClick={handleSearch}>Search</button>
                <div className="top-tags" style={{ paddingTop: '20px' }}>
                    <h3>Top Tags</h3>
                    <div>
                        {topTags.map((tag, index) => (
                            <button key={index} className="tag-button" onClick={() => handleTagClick(tag.name)}>
                                {tag.name} <span className="badge">{tag.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <ul>
                {suggestedTags.flatMap(tagItem => [tagItem]).filter(currentTag => currentTag.name.toLowerCase().includes(tag.toLowerCase())).map((currentTag, index) => (
                    <li key={index} onClick={() => handleTagClick(currentTag.name)}>
                        {currentTag.name} <span className="badge">{currentTag.count}</span>
                    </li>
                ))}
                </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <FilterBox 
                        selectedStream={selectedStream} 
                        setSelectedStream={setSelectedStream} 
                        allStreamsWithFollowerCounts={streamers} 
                        setFilteredStreams={handleFilterChange} 
                    />
                
                {selectedStream && (
                    <div>
                    <div id="twitch-embed"></div>
                    <button onClick={() => setSelectedStream(null)}>Close Stream</button>
                    </div>
                )}
                <div className="results" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {currentItems.map((stream, index) => (
                        
                        <StreamCard 
                            key={stream.id}
                            stream={stream} 
                            selectedStream={selectedStream} 
                            setSelectedStream={setSelectedStream} 
                        />
                    ))}
                </div>
                <div>
    <button onClick={handlePreviousClick} disabled={currentPage === 1}>
        Previous
    </button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
        <button 
            key={pageNumber} 
            onClick={() => handlePageChange(pageNumber)}
            style={{ backgroundColor: pageNumber === currentPage ? '#9146FF' : '#E0B2FF', color: pageNumber === currentPage ? 'white' : 'black' }}
        >
            {pageNumber}
        </button>
    ))}
    <button onClick={handleNextClick} disabled={currentPage === totalPages}>
        Next
    </button>
</div>
            </div>
        </div>
        <Footer />
    </div>
);
};

export default TagSearch;