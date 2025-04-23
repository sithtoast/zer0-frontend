import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import Navbar from './Navbar';
import Footer from './Footer';
import StreamCard from './streamCard';
import FilterBox from './filterBox';
import StreamEmbed from './streamEmbed';
import './tagSearch.css'; // Ensure this is imported

const apiUrl = process.env.REACT_APP_API_URL;

const TagSearch = () => {
    const [tag, setTag] = useState('');
    const [searchedTag, setSearchedTag] = useState(''); // Store the tag that was actually searched
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [topTags, setTopTags] = useState([]);
    const [selectedStream, setSelectedStream] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredStreams, setFilteredStreams] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const itemsPerPage = 24; // Adjust as needed for grid layout

    // --- Fetch Top Tags ---
    const fetchTopTags = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/top-tags`);
            setTopTags(response.data.tags || []);
        } catch (err) {
            console.error('Error fetching top tags:', err);
            // Don't set global error, maybe a small indicator if needed
        }
    }, []);

    // --- Fetch Suggested Tags ---
    const fetchTags = useCallback(debounce(async (searchQuery) => {
        if (!searchQuery.trim()) {
            setSuggestedTags([]);
            return;
        }
        try {
            const response = await axios.get(`${apiUrl}/api/twitch/tags/${searchQuery}`);
            setSuggestedTags(response.data || []);
        } catch (err) {
            console.error('Error fetching suggested tags:', err);
        }
    }, 300), []); // Slightly faster debounce

    // --- Handle Input Change ---
    const handleInputChange = (e) => {
        const newTag = e.target.value;
        setTag(newTag);
        fetchTags(newTag);
    };

    // --- Handle Search / Fetch Streams ---
    const handleSearch = useCallback(async (searchTag) => {
        const trimmedTag = searchTag.trim();
        if (!trimmedTag) {
            setStreams([]);
            setFilteredStreams([]);
            setError('');
            setSearchedTag('');
            return;
        }
        setLoading(true);
        setError('');
        setStreams([]);
        setFilteredStreams([]);
        setSelectedStream(null);
        setCurrentPage(1);
        setSearchedTag(trimmedTag); // Store the searched tag
        setSuggestedTags([]); // Clear suggestions on search
        try {
            // Simplified fetch logic (assuming backend handles complexity)
            const response = await axios.get(`${apiUrl}/api/twitch/streamers-by-tags/${encodeURIComponent(trimmedTag)}`, {
                 withCredentials: true // Needed for follower counts potentially
            });

            // Assuming the backend now returns streams with user_info and followerCount
            // TEMPORARILY REMOVE/COMMENT OUT THE FILTER:
            // const liveStreamsData = response.data.filter(stream => stream.viewer_count <= 10);
            const liveStreamsData = response.data; // Use the raw response data for now

            console.log('Raw API Response Data:', response.data); // Log raw data
            console.log('Live Streams Data (without filter):', liveStreamsData); // Log data after potential assignment

            if (!Array.isArray(liveStreamsData) || liveStreamsData.length === 0) { // Check if it's an array and not empty
                console.log('API returned no streams or data is not an array.'); // Add specific log
                // setLoading(false); // setLoading is handled in finally block
                // No error, just no results - handled by render logic
                // return; // Let it proceed to set empty arrays
            }

            setStreams(liveStreamsData || []); // Ensure setting an array even if null/undefined
            setFilteredStreams(liveStreamsData || []); // Ensure setting an array

        } catch (err) {
            console.error('Error during tag search:', err);
            setError(`Failed to search for tag "${trimmedTag}". Please try again.`);
            setStreams([]);
            setFilteredStreams([]);
        } finally {
            setLoading(false);
        }
    }, []); // Removed dependencies, rely on passed `searchTag`

    // --- Initial Fetch for Top Tags ---
    useEffect(() => {
        fetchTopTags();
    }, [fetchTopTags]);

    // --- Handle Filter Change ---
    const handleFilterChange = useCallback((filtered) => {
        setFilteredStreams(filtered);
        setCurrentPage(1);
    }, []);

    // --- Handle Tag Click ---
    const handleTagClick = (clickedTag) => {
        setTag(clickedTag);
        setSuggestedTags([]);
        handleSearch(clickedTag);
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredStreams.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStreams.slice(indexOfFirstItem, indexOfLastItem);

    const handlePreviousClick = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleNextClick = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            window.scrollTo(0, 0);
        }
    };

    // --- Render Logic ---
    return (
        <> {/* Use Fragment instead of div */}
            <Navbar />
            <div className="profile-page tag-search-page">
                <h1>Discover Streams by Tag</h1>

                <div className="tag-search-layout">

                    {/* --- Sidebar --- */}
                    <aside className="tag-search-sidebar">
                        {/* Search Section */}
                        <div className="profile-section tag-section">
                            <h2>Search Tag</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleSearch(tag); }} className="search-form-tags">
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={handleInputChange}
                                    placeholder="Enter a tag (e.g., Programming)"
                                    className="search-input-tags"
                                    aria-label="Search by tag"
                                />
                                <button type="submit" className="search-button-tags" disabled={loading}>
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                            {suggestedTags.length > 0 && (
                                <ul className="suggested-tags-list">
                                    {suggestedTags.map((currentTag, index) => (
                                        <li key={index} onClick={() => handleTagClick(currentTag.name)}>
                                            {currentTag.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Top Tags Section */}
                        <div className="profile-section tag-section">
                            <h2>Top Tags</h2>
                            {topTags.length > 0 ? (
                                <div className="top-tags-grid">
                                    {topTags.map((topTag, index) => (
                                        <button key={index} className="tag-button" onClick={() => handleTagClick(topTag.name)}>
                                            {topTag.name}
                                            {/* <span className="badge">{topTag.count}</span> */}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p>Loading top tags...</p> // Or a small spinner
                            )}
                        </div>

                         {/* Filter Box Section */}
                         {streams.length > 0 && ( // Only show filters if there are base results
                            <div className="profile-section tag-section filter-box-wrapper">
                                <h2>Filter Results</h2>
                                <FilterBox
                                    allStreamsWithFollowerCounts={streams}
                                    setFilteredStreams={handleFilterChange}
                                />
                            </div>
                         )}
                    </aside>

                    {/* --- Main Content --- */}
                    <main className="tag-search-main">
                        {/* Error Message */}
                        {error && <p className="error-message-tags">{error}</p>}

                        {/* Stream Embed */}
                        {selectedStream && (
                            <div className="stream-embed-wrapper">
                                {/* Optionally wrap embed in a section */}
                                {/* <div className="profile-section tag-section"> */}
                                    <StreamEmbed
                                        stream={selectedStream}
                                        streams={streams}
                                        closeStream={() => setSelectedStream(null)}
                                    />
                                {/* </div> */}
                            </div>
                        )}

                        {/* Results Area */}
                        {loading ? (
                            <div className="loading-container-tags">
                                <div className="loading-spinner-tags"></div>
                                <p>Searching for streams with tag "{searchedTag}"...</p>
                            </div>
                        ) : filteredStreams.length > 0 ? (
                            <>
                                {/* Results Grid */}
                                <div className="streams-grid-tags">
                                    {currentItems.map((stream) => (
                                        <StreamCard
                                            key={stream.id}
                                            stream={stream}
                                            setSelectedStream={setSelectedStream}
                                            // Pass other necessary props if StreamCard needs them
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination-controls">
                                        <button onClick={handlePreviousClick} disabled={currentPage === 1 || loading}>
                                            Previous
                                        </button>
                                        <span> Page {currentPage} of {totalPages} </span>
                                        <button onClick={handleNextClick} disabled={currentPage === totalPages || loading}>
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>

                                                ) : (
                                                    // Show message only if not loading and a search was attempted
                                                    !error && searchedTag && <p className="no-results-message">No live streams found matching the tag "{searchedTag}" and criteria (viewer count &lt;= 10).</p>
                                                )}
                    </main>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default TagSearch;