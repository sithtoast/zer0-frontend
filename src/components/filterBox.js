// FilterBox.js
import React, { useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import AffiliateIcon from '../assets/affiliate.png';
import Modal from 'react-bootstrap/Modal';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const FilterBox = ({ selectedStream, setSelectedStream, allStreamsWithFollowerCounts, setFilteredStreams }) => {
    const [minViewerCount, setMinViewerCount] = useState(0);
    const [maxViewerCount, setMaxViewerCount] = useState(10);
    const [startedWithinHour, setStartedWithinHour] = useState(false);
    const [matureContent, setMatureContent] = useState(true);
    const [nonMatureContent, setNonMatureContent] = useState(true);
    const [nearAffiliate, setNearAffiliate] = useState(false);
    const [lessThanSixMonths, setLessThanSixMonths] = useState(false);
    const [fiveToNineYears, setFiveToNineYears] = useState(false);
    const [overTenYears, setOverTenYears] = useState(false);
    const [specificPeriod, setSpecificPeriod] = useState(false);
    const [isAffiliate, setIsAffiliate] = useState(false);
    const [isNotAffiliate, setIsNotAffiliate] = useState(false);
    const [sessionData, setSessionData] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {

        const fetchData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/users/session`, {
                    withCredentials: true,
                });
                setSessionData(response.data);
                //console.log('User data:', response.data.user.user);
            } catch (error) {
                //console.error('Error fetching session data:', error);
            }
        };
        fetchData();

        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        const specificStartDate = new Date('2007-03-01');
        const specificEndDate = new Date('2011-06-14');

        const filteredStreams = allStreamsWithFollowerCounts.filter(stream => {
            const meetsViewerCount = stream.viewer_count >= minViewerCount && stream.viewer_count <= maxViewerCount;

            const meetsFollowerCount = 
                (!nearAffiliate || (stream.followerCount >= 45 && stream.followerCount < 50)) &&
                (!isAffiliate || stream.user_info.broadcaster_type === 'affiliate') &&
                (!isNotAffiliate || stream.user_info.broadcaster_type !== 'affiliate');
            
            const joinDate = new Date(stream.user_info.created_at);
            const meetsJoinDate = 
                (!lessThanSixMonths || (lessThanSixMonths && joinDate >= sixMonthsAgo)) &&
                (!fiveToNineYears || (fiveToNineYears && joinDate <= fiveYearsAgo && joinDate > tenYearsAgo)) &&
                (!overTenYears || (overTenYears && joinDate <= tenYearsAgo)) &&
                (!specificPeriod || (specificPeriod && joinDate >= specificStartDate && joinDate <= specificEndDate));
            
            const meetsMaturity = (matureContent && stream.is_mature) || (nonMatureContent && !stream.is_mature);
            const startedTime = new Date(stream.started_at);
            const meetsStartedWithinHour = !startedWithinHour || (now - startedTime) <= 60 * 60 * 1000;

            return meetsViewerCount && meetsFollowerCount && meetsJoinDate && meetsMaturity && meetsStartedWithinHour;
        });

        setFilteredStreams(filteredStreams);
    }, [
        minViewerCount, maxViewerCount, startedWithinHour, matureContent, nonMatureContent,
        nearAffiliate, lessThanSixMonths, fiveToNineYears, overTenYears, specificPeriod,
        isAffiliate, isNotAffiliate, allStreamsWithFollowerCounts, setFilteredStreams
    ]);

    return (
        <div id="filter" className="filter-box">
            <div className="mb-3">
                <label htmlFor="viewerCount" className="form-label">Viewer Count:</label>
                <ReactSlider
                    className="react-slider"
                    thumbClassName="thumb"
                    trackClassName="track"
                    min={0}
                    max={10}
                    value={[minViewerCount, maxViewerCount]}
                    onChange={([min, max]) => {
                        setMinViewerCount(min);
                        setMaxViewerCount(max);
                    }}
                    pearling
                    minDistance={1}
                />
                <p>Selected range: {minViewerCount} - {maxViewerCount}</p>
            </div>
            <div className="mb-3 form-check-group">
            <div className="mb-3 form-check">
                        <input 
                        type="checkbox" 
                        className={`form-check-input ${!(sessionData && sessionData.user) ? 'disabled-look' : ''}`} 
                        id="nearAffiliate" 
                        checked={nearAffiliate} 
                        onClick={() => {
                            if (!(sessionData && sessionData.user)) {
                                setShowModal(true);
                            }
                        }}
                        onChange={e => { 
                            if (sessionData && sessionData.user) {
                                setNearAffiliate(e.target.checked); 
                                if (e.target.checked) setIsNotAffiliate(false); 
                            } else {
                                setShowModal(true);
                            }
                        }} 
                    />
                    <label className="form-check-label" htmlFor="nearAffiliate">
                        <p className="card-text affiliate-message" title="This user is <5 followers to meeting affiliate requirement.">Near Affiliate</p>
                    </label>
                    </div>

                    {showModal && 
                        <Modal show={showModal} onHide={() => setShowModal(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Login for more features!</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>Login with your Twitch account for more features like:
                                <ul>
                                <li>Favorite games</li>
                                <li>Favorite streamers</li>
                                <li>View your watch time (later)</li>
                                <li>Easily find streamers who are near affiliate.</li>
                                <li>Raid streamers right from Zer0.tv</li>
                                </ul>
                            </Modal.Body>
                            <Modal.Footer>
                                <button onClick={() => window.location.href=`${apiUrl}/auth/twitch`}><i className="fab fa-twitch" style={{ paddingRight: '10px' }}></i>Register/Login with Twitch</button>
                            </Modal.Footer>
                        </Modal>
                    }
                <div className="mb-3 form-check">
                    <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="isAffiliate" 
                        checked={isAffiliate} 
                        onChange={e => { 
                            setIsAffiliate(e.target.checked); 
                            if (e.target.checked) setIsNotAffiliate(false);
                        }} 
                    />
                    <label className="form-check-label" htmlFor="isAffiliate">
                        Affiliate<img className="affiliate-icon ml-2" src={AffiliateIcon} alt="Affiliate" style={{ width: 25, height: 20 }} />
                    </label>
                </div>
                <div className="mb-3 form-check">
                    <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="isNotAffiliate" 
                        checked={isNotAffiliate} 
                        onChange={e => setIsNotAffiliate(e.target.checked)} 
                        disabled={nearAffiliate || isAffiliate} 
                    />
                    <label className="form-check-label" htmlFor="isNotAffiliate">
                        Not Affiliate
                    </label>
                </div>
            </div>
            <div className="mb-3 form-check-group">
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="lessThanSixMonths" checked={lessThanSixMonths} onChange={e => setLessThanSixMonths(e.target.checked)} />
                    <label className="form-check-label" htmlFor="lessThanSixMonths">
                        <p className="card-text newbie-message" title="This user's account is less than 6 months old.">Twitch Newbie</p>
                    </label>
                </div>
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="fiveToNineYears" checked={fiveToNineYears} onChange={e => { setFiveToNineYears(e.target.checked); setSelectedStream(null); }} />
                    <label className="form-check-label" htmlFor="fiveToNineYears">
                        <p className="card-text old-friend-message" title="This user has been on Twitch for a long time. (5-9 yrs)">Old Friend</p>
                    </label>
                </div>
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="overTenYears" checked={overTenYears} onChange={e => setOverTenYears(e.target.checked)} />
                    <label className="form-check-label" htmlFor="overTenYears">
                        <p className="card-text twitch-veteran-message" title="This user has been on Twitch for a very long time. (10+ yrs)">Twitch Veteran</p></label>
                </div>
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="specificPeriod" checked={specificPeriod} onChange={e => setSpecificPeriod(e.target.checked)} />
                    <label className="form-check-label" htmlFor="specificPeriod">
                        <p className="card-text justins-friend-message" title="This user's account was made in the Justin.tv days.">Justin's Friend</p></label>
                </div>
            </div>
            <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="matureContent" checked={matureContent} onChange={e => setMatureContent(e.target.checked)} />
                <label className="form-check-label" htmlFor="matureContent">Mature Content</label>
            </div>
            <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="nonMatureContent" checked={nonMatureContent} onChange={e => setNonMatureContent(e.target.checked)} />
                <label className="form-check-label" htmlFor="nonMatureContent">Non-Mature Content</label>
            </div>
            <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="startedWithinHour" checked={startedWithinHour} onChange={e => setStartedWithinHour(e.target.checked)} />
                <label className="form-check-label" htmlFor="startedWithinHour">
                    <p className="card-text just-started-message" title="This user has just started streaming.">Just Started</p>
                </label>
            </div>
        </div>
    );
};

export default FilterBox;
