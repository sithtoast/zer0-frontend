import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 
import Footer from './Footer';
import 'bootstrap/dist/css/bootstrap.min.css';

const apiUrl = process.env.REACT_APP_API_URL;

function Register() {
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
	});
	const { username, email, password } = formData;
	const navigate = useNavigate();

	const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

	const onSubmit = async e => {
		e.preventDefault();
		try {
			const config = {
				headers: {
					'Content-Type': 'application/json'
				}
			};
			const body = JSON.stringify({ username, email, password });
			await axios.post(`${apiUrl}/api/users/register`, body, config);
			navigate('/login'); // Redirect to login after registration
		} catch (err) {
			console.error('Registration error:', err.response.data); // Log error message from server
			alert('Error: ' + err.response.data.message); // Display error message to user
		}
	};

	return (
		<div className="container">
			<Navbar />  {/* Add Navbar to the top */}
			<div className="row justify-content-center">
				<div className="col-md-6">
					<h1 className="text-center mb-4">Sign Up</h1>
					<form onSubmit={onSubmit}>
						<div className="form-group">
							<label>Username</label>
							<input
								type="text"
								className="form-control"
								placeholder="Username"
								name="username"
								value={username}
								onChange={onChange}
								required
							/>
						</div>
						<div className="form-group">
							<label>Email Address</label>
							<input
								type="email"
								className="form-control"
								placeholder="Email Address"
								name="email"
								value={email}
								onChange={onChange}
								required
							/>
						</div>
						<div className="form-group">
							<label>Password</label>
							<input
								type="password"
								className="form-control"
								placeholder="Password"
								name="password"
								value={password}
								onChange={onChange}
								required
							/>
						</div>
						<button type="submit" className="btn btn-primary btn-block">Register</button>
					</form>
				</div>
			</div>
			<Footer />
		</div>
	);
}

export default Register;
