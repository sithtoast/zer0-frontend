// TopCategories.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';

const apiUrl = process.env.REACT_APP_API_URL;

const TopCategories = () => {
    const [topFavorites, setTopFavorites] = useState([]);
    const [topClicked, setTopClicked] = useState([]);

    useEffect(() => {
        const fetchTopFavorites = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/favorites/top`);
                setTopFavorites(response.data);
            } catch (error) {
                console.error('Failed to fetch top favorite categories:', error);
            }
        };

        const fetchTopClicked = async () => {
            try {
                const userProfileResponse = await axios.get(`${apiUrl}/api/users/profile`, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' }
                });
                const twitchAccessToken = userProfileResponse.data.twitch.accessToken;

                const response = await axios.get(`${apiUrl}/api/favorites/top-clicked`, {
                    headers: { 'Authorization': `Bearer ${twitchAccessToken}` }
                });
                setTopClicked(response.data);
            } catch (error) {
                console.error('Failed to fetch top clicked categories:', error);
            }
        };

        fetchTopFavorites();
        fetchTopClicked();
    }, []);

return (
    <div>
        <Navbar />
        <div className="container">
            <div>
                <h2>Top Favorite Categories on zer0.tv</h2>
                <ul>
                    {topFavorites.map((category, index) => (
                        <li key={index}>
                            <button type="button" className="btn btn-primary">
                                {category.name} <span className="badge bg-secondary">{category.count}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h2>Top Clicked Categories on zer0.tv</h2>
                <ul>
                    {topClicked.map((category, index) => (
                        <li key={index}>
                            <button type="button" className="btn btn-primary">
                                {category.name} <span className="badge bg-secondary">{category.clicks}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <Footer />
    </div>
);
};

export default TopCategories;