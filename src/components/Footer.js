import React from 'react';


const Footer = () => {
return (
    <div className="footer" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '10px', 
        backgroundColor: 'var(--twitch-dark-alt)', 
        color: 'var(--twitch-text)' 
    }}>
        <div>Created with love by <a href="https://www.github.com/sithtoast">sithtoast</a>.</div>
        <div>
            <a href="https://ko-fi.com/sithtoast">
            <i className="fas fa-coffee"></i> Send me a Ko-fi
            </a>
        </div>
    </div>
);
};

export default Footer;