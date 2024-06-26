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
    const [sessionData, setSessionData] = useState(null);
  
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, {
                    withCredentials: true,
                });
                setSessionData(response.data);
                //console.log('User data:', response.data.user.user);
            } catch (error) {
                //console.error('Error fetching session data:', error);
            }
        };
        fetchData();
        
        const fetchProfileData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/profile`, {
                    withCredentials: true, // This allows the request to send cookies
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                console.log(response.data);
                setProfileData(response.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch profile data');
                setLoading(false);
                console.error('There was an error!', err);
            }
        };
  
        if (sessionData && sessionData.user) {
            fetchProfileData(); // Fetch profile data
        }
    }, []);

	const refreshToken = () => {
		axios.post(`${apiUrl}/api/users/token`, {}, {
			withCredentials: true,
			headers: {
				'Content-Type': 'application/json'
			}
		})
		.then(response => {
			setProfileData(prevState => ({ ...prevState, token: response.data.token }));
			setTokenRefreshTimeout(response.data.token);
		})
		.catch(err => {
			console.error('Error refreshing token:', err);
		});
	};

    const setTokenRefreshTimeout = (token) => {
        const decodedToken = jwtDecode(token);
        const expirationTime = decodedToken.exp;
        const delay = expirationTime * 1000 - Date.now() - 60000; // Refresh 1 minute before token expiration

        setTimeout(refreshToken, delay);
    };
  
    const handleLogout = async () => {
        try {
            await axios.post(`${apiUrl}/api/users/logout`, {}, {
                withCredentials: true, // This allows the request to send cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setProfileData({});
            navigate('/');
        } catch (err) {
            console.error('Failed to logout:', err);
        }
    };

return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
            <a className="navbar-brand" href="/">zer0.tv</a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav me-auto">
                    <li className="nav-item">
                        <NavLink className="nav-link" to="/top-games">Search</NavLink>
                    </li>
                    {sessionData && sessionData.user ? (
                        <>
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/favorites">Your Top 8</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/followed-streamers">Followed Streamers</NavLink>
                            </li>
                        </>
                    ) : null}
					<li className="nav-item">
						<NavLink className="nav-link" to="/tag-search">Tag Search</NavLink>
					</li>
					<li className="nav-item">
						<NavLink className="nav-link" to="/top-categories">Top on zer0</NavLink>
					</li>
                </ul>
                <ul className="navbar-nav ms-auto align-items-center">
                    {!sessionData || !sessionData.user ? (
                        <React.Fragment>
                            <li className="nav-item">
                                <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}><i className="fab fa-twitch" style={{ paddingRight: '10px' }}></i>Register/Login with Twitch</button>
                            </li>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            <li className="nav-item d-none d-lg-block">
                                <NavLink className="nav-link" to="/profile">
                                    {profileData.twitch?.profileImageUrl && (
                                        <img src={profileData.twitch.profileImageUrl} alt="Profile" style={{width: '25px', height: '25px', borderRadius: '50%', marginLeft: '10px'}} />
                                    )}
                                </NavLink>
                            </li>
                            {!profileData.twitch?.twitchId && (
                                <li className="nav-item">
                                    <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}>Link Twitch Account</button>
                                </li>
                            )}
                            <li className="nav-item">
                                <button onClick={handleLogout}>Logout</button>
                            </li>
                        </React.Fragment>
                    )}
                </ul>
            </div>
        </div>
    </nav>
);
};

export default Navbar;
