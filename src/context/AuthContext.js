// src/context/AuthContext.js
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [authToken, setAuthToken] = useState(localStorage.getItem('token'));

	const login = (token) => {
		localStorage.setItem('token', token);
		setAuthToken(token);
	};

	const logout = () => {
		localStorage.removeItem('token');
		setAuthToken(null);
	};

	return (
		<AuthContext.Provider value={{ authToken, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);