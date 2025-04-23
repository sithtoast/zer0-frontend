import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import { Link } from 'react-router-dom'; // Added for potential future links
import './WatchHistory.css'; // Keep existing CSS for now, may need adjustments

const apiUrl = process.env.REACT_APP_API_URL;

// Helper function to format seconds into HH:MM:SS
const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format date and time
const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { date: 'Invalid Date', time: '' };
        const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        return {
            date: date.toLocaleDateString(undefined, optionsDate),
            time: date.toLocaleTimeString(undefined, optionsTime)
        };
    } catch (e) {
        console.error("Error formatting date:", e);
        return { date: 'Error', time: '' };
    }
};

// Component to render a list of totals (streamers or categories)
// Keep TotalsList component as is, it's a good reusable component
const TotalsList = ({ title, items, type }) => {
    if (!items || items.length === 0) {
        return null;
    }
    return (
        <div className="totals-section">
            <h4>{title}</h4>
            <ul className="totals-list">
                {items.map((item, index) => (
                    <li key={index} className="totals-item">
                        {type === 'streamers' && item.streamerProfilePic && (
                            <img src={item.streamerProfilePic} alt={item.streamerName} className="totals-pfp" />
                        )}
                        <span className="totals-name">
                            {type === 'streamers' ? item.streamerName : item.categoryName}
                        </span>
                        <span className="totals-time">{formatDuration(item.totalWatchTime)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


function WatchHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 20;

    // State for filters
    const [categoryFilter, setCategoryFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    // State for totals
    const [overallTotals, setOverallTotals] = useState({ streamers: [], categories: [] });
    const [filteredTotals, setFilteredTotals] = useState({ streamers: [], categories: [] });
    // Removed showFilteredTotals, use hasActiveFilters directly

    const fetchHistory = useCallback(async (page, filters = {}) => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                limit,
                categoryName: filters.categoryName || undefined,
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
            };
            Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

            const response = await axios.get(`${apiUrl}/api/users/watch-history`, {
                params: params,
                withCredentials: true,
            });
            setHistory(response.data.watchHistory || []);
            setCurrentPage(response.data.currentPage);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.totalItems);
            setOverallTotals(response.data.overallTotals || { streamers: [], categories: [] });
            setFilteredTotals(response.data.filteredTotals || { streamers: [], categories: [] });

        } catch (err) {
            console.error('Error fetching watch history:', err);
            if (err.response && err.response.status === 401) {
                setError('Please log in to view your watch history.');
            } else {
                setError('Failed to load watch history. Please try again later.');
            }
            setHistory([]);
            setTotalPages(0);
            setTotalItems(0);
            setOverallTotals({ streamers: [], categories: [] });
            setFilteredTotals({ streamers: [], categories: [] });
        } finally {
            setLoading(false);
        }
    }, [limit]); // Removed apiUrl from dependencies as it's constant

    useEffect(() => {
        fetchHistory(currentPage, {
            categoryName: categoryFilter,
            startDate: startDateFilter,
            endDate: endDateFilter
        });
    }, [fetchHistory, currentPage, categoryFilter, startDateFilter, endDateFilter]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleResetFilters = () => {
        setCategoryFilter('');
        setStartDateFilter('');
        setEndDateFilter('');
        setCurrentPage(1); // Reset to page 1 when filters are reset
    };

    const handleFilterChange = (setter) => (event) => {
        setter(event.target.value);
        setCurrentPage(1); // Reset to page 1 on filter change
    };

    const hasActiveFilters = !!(categoryFilter || startDateFilter || endDateFilter);

    // Loading State Component (similar to Profile.js)
    if (loading) {
        return (
            <>
                <Navbar />
                <div className="loading-container watch-history-loading"> {/* Added specific class */}
                    <div className="loading-spinner"></div>
                    <p>Loading watch history...</p>
                </div>
                <Footer />
            </>
        );
    }

    // Error State Component (similar to Profile.js)
    if (error) {
         return (
            <>
                <Navbar />
                <div className="profile-page watch-history-page"> {/* Use consistent page class */}
                     <p className="error-message">{error}</p>
                </div>
                <Footer />
            </>
         );
    }

    return (
        <>
            <Navbar />
            {/* Use a main container class similar to profile-page */}
            <div className="profile-page watch-history-page">
                <h2>Watch History</h2>

                {/* Filter Section - wrapped in a section container */}
                <div className="profile-section history-section filter-section">
                    <h3>Filter History</h3> {/* Use h3 for section title */}
                    <div className="filter-controls">
                        <input
                            type="text"
                            placeholder="Filter by Category Name"
                            value={categoryFilter}
                            onChange={handleFilterChange(setCategoryFilter)}
                            className="filter-input"
                        />
                        <input
                            type="date"
                            placeholder="Start Date"
                            value={startDateFilter}
                            onChange={handleFilterChange(setStartDateFilter)}
                            className="filter-input"
                        />
                        <input
                            type="date"
                            placeholder="End Date"
                            value={endDateFilter}
                            onChange={handleFilterChange(setEndDateFilter)}
                            className="filter-input"
                        />
                        <button onClick={handleResetFilters} className="filter-reset-button">Reset Filters</button>
                    </div>
                </div>

                {/* Totals Section - wrapped in a section container */}
                <div className="profile-section history-section totals-section-wrapper">
                     <h3>Watch Time Totals</h3> {/* Use h3 for section title */}
                    <div className="totals-container">
                        <TotalsList title="Overall Top Streamers" items={overallTotals.streamers} type="streamers" />
                        <TotalsList title="Overall Top Categories" items={overallTotals.categories} type="categories" />
                        {/* Conditionally render filtered totals */}
                        {hasActiveFilters && (
                            <>
                                <TotalsList title="Filtered Top Streamers" items={filteredTotals.streamers} type="streamers" />
                                <TotalsList title="Filtered Top Categories" items={filteredTotals.categories} type="categories" />
                            </>
                        )}
                    </div>
                </div>

                {/* History List Section - wrapped in a section container */}
                <div className="profile-section history-section history-list-section">
                    <h3>History Entries</h3> {/* Use h3 for section title */}
                    {!loading && !error && history.length === 0 && (
                        <p className="no-entries-message"> {/* More specific class */}
                            {totalItems === 0 && !hasActiveFilters
                                ? "Your watch history is empty. Go watch some streams!"
                                : "No history entries match your filters."}
                        </p>
                    )}

                    {!loading && !error && history.length > 0 && (
                        <>
                            <p className="entry-count-info">
                                Showing {history.length} of {totalItems} entries {hasActiveFilters ? 'matching filters' : 'total'}.
                            </p>
                            <div className="history-cards-container">
                                {history.map((entry, index) => {
                                    const { date, time } = formatDateTime(entry.lastWatched);
                                    return (
                                        <div className="history-card" key={`${entry.twitchId}-${entry.lastWatched}-${index}`}> {/* Consider a more stable key if possible */}
                                            <div className="card-streamer-info">
                                                {entry.streamerProfilePic && (
                                                    <img src={entry.streamerProfilePic} alt={entry.streamerName} className="card-streamer-pfp" />
                                                )}
                                                <span className="card-streamer-name">{entry.streamerName || 'Unknown Streamer'}</span>
                                            </div>
                                            <div className="card-details">
                                                <p><strong>Category:</strong> {entry.categoryName || 'Unknown Category'}</p>
                                                <p><strong>Watched:</strong> {formatDuration(entry.watchTime)}</p>
                                                <p><strong>When:</strong> {date} at {time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination - kept within the history list section */}
                            {totalPages > 1 && ( // Only show pagination if needed
                                <div className="pagination-controls">
                                    <button onClick={handlePreviousPage} disabled={currentPage <= 1 || loading}>
                                        {/* Optionally add icon: <i className="fas fa-chevron-left"></i> */}
                                        Previous
                                    </button>
                                    <span>Page {currentPage} of {totalPages}</span>
                                    <button onClick={handleNextPage} disabled={currentPage >= totalPages || loading}>
                                        Next
                                        {/* Optionally add icon: <i className="fas fa-chevron-right"></i> */}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default WatchHistory;