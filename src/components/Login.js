import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import default CSS for react-toastify
import Navbar from './Navbar';  // Import Navbar component
import Footer from './Footer';

const apiUrl = process.env.REACT_APP_API_URL;

function Login() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
	  email: '',
	  password: '',
	});
	const { email, password } = formData;
  
	const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  
	const onSubmit = async e => {
	  e.preventDefault();
	  try {
		const user = { email, password };
		const config = {
		  headers: {
			'Content-Type': 'application/json'
		  }
		};
		const body = JSON.stringify(user);
		const res = await axios.post(`${apiUrl}/api/users/login`, body, config);
		localStorage.setItem('token', res.data.token);
		localStorage.setItem('user', JSON.stringify(res.data.user));
		toast.success('Login Successful!');  // Display success toast
		setTimeout(() => { 
		  navigate('/');  // Navigate to home page
		}, 2000);
	  } catch (err) {
		console.error(err.response.data);
		toast.error('Login Failed!');  // Display error toast if login fails
	  }
	};

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
                <h1 className="text-center mb-4">Sign In</h1>
                <form onSubmit={e => onSubmit(e)}>
				<button onClick={handleTwitchLogin} className="btn btn-secondary btn-block">Login with Twitch</button>
					<div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-control" placeholder="Enter email" name="email" value={email} onChange={e => onChange(e)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" className="form-control" placeholder="Enter password" name="password" value={password} onChange={e => onChange(e)} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Login</button>
                </form>
            </div>
        </div>
        
    </div>
	<Footer />
	</div>
);
}

export default Login;

