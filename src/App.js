import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Profile from './components/Profile';
import TopGames from './components/topGames';
import CategorySearch from './components/categorySearch';
import TopEight from './components/favorites';
import FollowedStreamers from './components/followedStreamers';
import TagSearch from './components/tagSearch';

function App() {
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/top-games" element={<TopGames />} />
                    <Route path="/" element={<CategorySearch />} />
                    <Route path="/favorites" element={<TopEight />} />
                    <Route path="/followed-streamers" element={<FollowedStreamers />} />
                    <Route path="/tag-search" element={<TagSearch />} />
                    
                </Routes>
            </div>
        </Router>
    );
}

export default App;
