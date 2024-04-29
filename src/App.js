import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Profile from './components/Profile';
import TopGames from './components/topGames';
import CategorySearch from './components/categorySearch';
import TopEight from './components/favorites';
import './twitch.css';

function App() {
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/top-games" element={<TopGames />} />
                    <Route path="/" element={<CategorySearch />} />
                    <Route path="/favorites" element={<TopEight />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
