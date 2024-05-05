import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import default CSS for react-toastify
import Navbar from './Navbar';  // Import Navbar component
import Footer from './Footer';

const apiUrl = process.env.REACT_APP_API_URL;

function Login() {

	const handleTwitchLogin = () => {
		// Redirect to the backend route configured for Passport Twitch authentication
		window.location.href = `${apiUrl}/auth/twitch`;
	};

return (
<div>
<Navbar />
<div className="login-container">
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        <div className="row justify-content-center">
            <div className="col-md-6">
                <h1 className="text-center mb-4">Welcome to zer0.tv!</h1>
				<h3 className="text-center mb-4">A small streamer discovery engine.</h3>
				<p className="text-center">Please mash the button to continue.</p>
					<div className="d-flex justify-content-center">
						<button onClick={handleTwitchLogin} className="btn btn-primary btn-lg">
							<i className="fab fa-twitch" style={{ paddingRight: '10px' }}></i>Login with Twitch
						</button>
					</div>            
				</div>
        	</div>
    	</div>
	<Footer />
</div>
);
}

export default Login;

