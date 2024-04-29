import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 
import '../twitch.css';
import Footer from './Footer';

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
		<div>
		<Navbar />  {/* Add Navbar to the top */}
			<h1>Sign Up</h1>
			<form onSubmit={onSubmit}>
				<div>
					<input
						type="text"
						placeholder="Username"
						name="username"
						value={username}
						onChange={onChange}
						required
					/>
				</div>
				<div>
					<input
						type="email"
						placeholder="Email Address"
						name="email"
						value={email}
						onChange={onChange}
						required
					/>
				</div>
				<div>
					<input
						type="password"
						placeholder="Password"
						name="password"
						value={password}
						onChange={onChange}
						required
					/>
				</div>
				<button type="submit">Register</button>
			</form>
			<Footer />
		</div>
	);
}

export default Register;
