import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';  // Import Navbar component
import '../twitch.css';

const apiUrl = process.env.REACT_APP_API_URL;

function Login() {
  const [formData, setFormData] = useState({
	email: '',
	password: '',
  });
  const { email, password } = formData;
  const navigate = useNavigate();

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
	  navigate('/profile');
	} catch (err) {
	  console.error(err.response.data);
	}
  };

  return (
	<div>
	  <Navbar />  {/* Add Navbar to the top */}
	  <h1>Sign In</h1>
	  <form onSubmit={e => onSubmit(e)}>
		<div>
		  <input type="email" placeholder="Email Address" name="email" value={email} onChange={e => onChange(e)} required />
		</div>
		<div>
		  <input type="password" placeholder="Password" name="password" value={password} onChange={e => onChange(e)} required />
		</div>
		<button type="submit">Login</button>
	  </form>
	</div>
  );
}

export default Login;