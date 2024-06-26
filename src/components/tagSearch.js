// tagSearch.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import FilterBox from './filterBox';
import StreamEmbed from './streamEmbed';

const apiUrl = process.env.REACT_APP_API_URL;

const TagSearch = () => {
    const [tag, setTag] = useState('');
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [topTags, setTopTags] = useState([]);
    const [selectedStream, setSelectedStream] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredStreams, setFilteredStreams] = useState([]);
    const [streams, setStreams] = useState([]);

    const itemsPerPage = 30;

    const fetchTopTags = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-tags`);
            setTopTags(response.data.tags);
        } catch (err) {
            console.error('Error fetching top tags:', err);
        }
    }, []);

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

    const handleSearch = useCallback(async (searchTag) => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/streamers-by-tags/${searchTag}`);
            const streamers = response.data;
    
            // Split the streamers into chunks of 100
            const chunks = [];
            for (let i = 0; i < streamers.length; i += 100) {
                chunks.push(streamers.slice(i, i + 100));
            }
    
            let streams = [];
    
            for (let chunk of chunks) {
                try {
                    const twitchIds = chunk.map(streamer => streamer.twitchId);
                    const streamResponse = await axios.post(`${apiUrl}/api/twitch/stream`, {
                        twitchIds: twitchIds
                    });

                    if (streamResponse.data && streamResponse.data.length > 0) {
                        streams.push(...streamResponse.data);
                    }
                } catch (err) {
                    console.error('Error fetching streams:', err);
                }
            }
    
            console.log('Streams:', streams);
            streams = streams.flat().filter(stream => stream.viewer_count <= 10);
            console.log('Filtered Streams:', streams);
    
            const batchSize = 100;
            for (let i = 0; i < streams.length; i += batchSize) {
                const batch = streams.slice(i, i + batchSize);
                const userIds = batch.map(stream => stream.user_id);
                try {
                    const userInfoResponse = await axios.post(`${apiUrl}/api/twitch/users`, { userIds });
                    const userInfoData = userInfoResponse.data;
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

            let twitchAccessToken = null;

            try {
                const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' }
                });

                if (userProfileResponse.data && userProfileResponse.data.twitch && userProfileResponse.data.twitch.accessToken) {
                    twitchAccessToken = userProfileResponse.data.twitch.accessToken;
                }
            } catch (err) {
                if (err.response && err.response.status === 500) {
                    console.error('Received 500 error from /api/users/profile, setting all followerCounts to 0');
                    for (const stream of streams) {
                        stream.followerCount = 0;
                    }
                    setStreams(streams);
                    setFilteredStreams(streams);
                    setCurrentPage(1);
                    return; // Exit the function early
                }
            }
    
            for (const stream of streams) {
                if (!stream.followerCount) {
                    try {
                        const followerCountResponse = await axios.post(`${apiUrl}/api/twitch/streams/follower-count`, { streamerIds: [stream.user_id] }, {
                            headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                        });
                        const followerData = followerCountResponse.data.find(item => item.id === stream.user_id);
                        stream.followerCount = followerData ? followerData.followerCount : 0;
                    } catch (err) {
                        console.error('Error fetching follower count for stream:', stream.user_id, err);
                        stream.followerCount = 0;
                    }
                }
            }
    
            setStreams(streams);
            setFilteredStreams(streams);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching streamers by tag:', err);
        }
    }, []);

    useEffect(() => {
        fetchTopTags();
    }, [fetchTopTags]);

    useEffect(() => {
        if (tag) {
            handleSearch(tag);
        }
    }, [tag, handleSearch]);

    const totalPages = Math.ceil(filteredStreams.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStreams.slice(indexOfFirstItem, indexOfLastItem);

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

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleFilterChange = useCallback((filtered) => {
        setFilteredStreams(filtered);
        setCurrentPage(1);
    }, []);

    const handleTagClick = (clickedTag) => {
        setTag(clickedTag);
    };

    return (
        <div>
            <Navbar />  
            <div className='tag-search-container' style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ marginRight: '20px' }}>
                    <h3>Search Streamers by Tag</h3>
                    <input type="text" value={tag} onChange={handleInputChange} />
                    <button onClick={() => handleSearch(tag)}>Search</button>
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
                    <div className="tag-search-results">
                        <ul>
                            {suggestedTags
                                .flatMap(tagItem => [tagItem])
                                .filter(currentTag => currentTag.name.toLowerCase().includes(tag.toLowerCase()))
                                .map((currentTag, index) => (
                                    <li key={index} onClick={() => handleTagClick(currentTag.name)}>
                                        {currentTag.name} <span className="badge">{currentTag.count}</span>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <FilterBox 
                        selectedStream={selectedStream} 
                        setSelectedStream={setSelectedStream} 
                        allStreamsWithFollowerCounts={streams} 
                        setFilteredStreams={handleFilterChange} 
                    />
                    <StreamEmbed 
                        stream={selectedStream} 
                        streams={streams} 
                        closeStream={() => setSelectedStream(null)} 
                    />
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
