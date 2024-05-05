import React, { useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar'; 
import Footer from './Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import default CSS for react-toastify

const apiUrl = process.env.REACT_APP_API_URL;

function Register() {
	return (
		<div>
			<Navbar />
			<div className="signup-container">
				<ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
				<div className="row justify-content-center">
					<div className="col-md-6">
						<h1 className="text-center mb-4">Sign Up</h1>
						<div className="text-center"> {/* Add this line */}
							<button className="btn btn-primary">
								<i className="fab fa-twitch"></i> {/* Add this line */}
								Sign Up with Twitch
							</button>
						</div>
                </div>
            </div>
        </div>
        <Footer />
    </div>
);
}

export default Register;
