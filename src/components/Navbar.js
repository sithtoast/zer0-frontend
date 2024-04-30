import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const apiUrl = process.env.REACT_APP_API_URL;

const Navbar = () => {
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
	const fetchProfileData = async () => {
	  try {
		const token = localStorage.getItem('token');
		if (!token) {
		  setLoading(false);
		  return;
		}
		const decoded = jwtDecode(token);
		const userId = decoded.user.userId;

		const response = await axios.get(`${apiUrl}/api/users/profile/${userId}`, {
		  headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json'
		  }
		});
		setProfileData(response.data);
		console.log(response.data);
		setLoading(false);
	  } catch (err) {
		setError('Failed to fetch profile data');
		setLoading(false);
		console.error('There was an error!', err);
	  }
	};

	fetchProfileData();
  }, []);

  const isAuthenticated = () => {
	return !!localStorage.getItem('token'); // Check if the token exists
  };

  const handleLogout = () => {
	localStorage.removeItem('token');
	navigate('/');
  };

return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
            <a className="navbar-brand" href="/">zer0.tv</a>
            <NavLink className="nav-item nav-link" to="/top-games">Top Games</NavLink>
            <NavLink className="nav-item nav-link" to="/favorites">Your Top 8</NavLink>
            <NavLink className="nav-item nav-link" to="/followed-streamers">Followed Streamers</NavLink>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">
                    {!isAuthenticated() && (
                        <React.Fragment>
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/login">Login</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/register">Register</NavLink>
                            </li>
                        </React.Fragment>
                    )}
                    {isAuthenticated() && (
                        <React.Fragment>
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/profile">Welcome, {profileData.user?.username}</NavLink>
                            </li>
                            {!profileData.twitch?.twitchId && (
                                <li className="nav-item">
                                    <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}>Link Twitch Account</button>
                                </li>
                            )}
							<div style={{ width: '20px' }}></div>
                            <li><button onClick={handleLogout}>Logout</button></li>
                        </React.Fragment>
                    )}
                </ul>
            </div>
        </div>
    </nav>
);
};

export default Navbar;
