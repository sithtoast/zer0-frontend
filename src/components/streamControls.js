const StreamControls = React.memo(({ isRaiding, handleRaid, handleCloseStream, followerCount, elapsedTime, watchTime }) => (
    <div>
        {stream && <div className="overlay"></div>}
        <div id="twitch-embed">
            <div id="twitch-embed-stream"></div>
            {stream && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <button onClick={handleCloseStream}>Close Stream</button>
                        <button onClick={handleRaid} style={{ backgroundColor: isRaiding ? 'red' : 'green' }}>
                            {isRaiding ? 'Cancel Raid' : 'Start Raid'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ padding: '0 10px' }}>F: {followerCount}</p>
                        <p style={{ padding: '0 10px' }}>E: {elapsedTime.hours}:{elapsedTime.minutes}:{elapsedTime.seconds}</p>
                        <p style={{ padding: '0 10px' }}>W: {watchTime.hours}:{watchTime.minutes}:{watchTime.seconds}</p>
                    </div>
                </div>
            )}
        </div>
    </div>
));