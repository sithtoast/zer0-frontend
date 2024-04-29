import React from 'react';
import { execSync } from 'child_process';

const Footer = () => {
    const gitCommitHash = execSync('git rev-parse HEAD').toString().trim();

    return (
        <div style={{ position: 'fixed', right: 0, bottom: 0, padding: '10px', backgroundColor: '#f8f9fa' }}>
            {`Git Commit: ${gitCommitHash}`}
        </div>
    );
};

export default Footer;