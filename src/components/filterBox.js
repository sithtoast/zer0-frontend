// FilterBox.js
import React, { useEffect, useState } from 'react';
import ReactSlider from 'react-slider';

const FilterBox = ({ selectedStream, setSelectedStream, allStreamsWithFollowerCounts, setFilteredStreams }) => {
    const [minViewerCount, setMinViewerCount] = useState(0);
    const [maxViewerCount, setMaxViewerCount] = useState(3);
    const [startedWithinHour, setStartedWithinHour] = useState(false); // Default to not filtering by start time
    const [matureContent, setMatureContent] = useState(true);
    const [nonMatureContent, setNonMatureContent] = useState(true);
    const [nearAffiliate, setNearAffiliate] = useState(false);
    const [lessThanSixMonths, setLessThanSixMonths] = useState(false);
    const [fiveToNineYears, setFiveToNineYears] = useState(false);
    const [overTenYears, setOverTenYears] = useState(false);
    const [specificPeriod, setSpecificPeriod] = useState(false);
    // Add other state variables and setters here

    useEffect(() => {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        const specificStartDate = new Date('2007-03-01');
        const specificEndDate = new Date('2011-06-14');
    
        const filteredStreams = allStreamsWithFollowerCounts.filter(stream => {
            const meetsViewerCount = stream.viewer_count >= minViewerCount && stream.viewer_count <= maxViewerCount;
            const meetsFollowerCount = !nearAffiliate || (stream.followerCount >= 45 && stream.followerCount < 50);
            const joinDate = new Date(stream.user_info.created_at);
            const meetsJoinDate = 
                (!lessThanSixMonths || joinDate >= sixMonthsAgo) &&
                (!fiveToNineYears || (joinDate <= fiveYearsAgo && joinDate > tenYearsAgo)) &&
                (!overTenYears || joinDate <= tenYearsAgo) &&
                (!specificPeriod || (joinDate >= specificStartDate && joinDate <= specificEndDate));
            const meetsMaturity = (matureContent && stream.is_mature) || (nonMatureContent && !stream.is_mature);
            const startedTime = new Date(stream.started_at);
            const meetsStartedWithinHour = !startedWithinHour || (new Date() - startedTime) <= 60 * 60 * 1000;
    
            return meetsViewerCount && meetsFollowerCount && meetsJoinDate && meetsMaturity && meetsStartedWithinHour;
        });

        if (typeof setFilteredStreams === 'function') {
            setFilteredStreams(filteredStreams);
        }
    }, [minViewerCount, maxViewerCount, startedWithinHour, matureContent, nonMatureContent, nearAffiliate, lessThanSixMonths, fiveToNineYears, overTenYears, specificPeriod, allStreamsWithFollowerCounts]);

    return (
        <div id="filter" className="filter-box">
                    {/* Add filter inputs here */}
                    <div className="mb-3">
                        <label htmlFor="viewerCount" className="form-label">Viewer Count:</label>
                        <ReactSlider
                            className="react-slider"
                            thumbClassName="thumb"
                            trackClassName="track"
                            min={0}
                            max={3}
                            value={[minViewerCount, maxViewerCount]}
                            onChange={([min, max]) => {
                                setMinViewerCount(min);
                                setMaxViewerCount(max);
                            }}
                            pearling
                            minDistance={0}
                        />
                        <p>Selected range: {minViewerCount} - {maxViewerCount}</p>
                    </div>
                    <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="nearAffiliate" checked={nearAffiliate} onChange={e => setNearAffiliate(e.target.checked)} />
                        <label className="form-check-label" htmlFor="nearAffiliate"><p className="card-text affiliate-message" title="This user is <5 followers to meeting affiliate requirement.">Near Affiliate</p></label>
                    </div>
                    <div className="mb-3 form-check-group">
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="lessThanSixMonths" checked={lessThanSixMonths} onChange={e => setLessThanSixMonths(e.target.checked)} />
                            <label className="form-check-label" htmlFor="lessThanSixMonths"><p className="card-text newbie-message" title="This user's account is less than 6 months old.">Twitch Newbie</p></label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="fiveToNineYears" checked={fiveToNineYears} onChange={e => { setFiveToNineYears(e.target.checked); setSelectedStream(null); }} />
                            <label className="form-check-label" htmlFor="fiveToNineYears"><p className="card-text old-friend-message" title="This user has been on Twitch for a long time. (5-9 yrs)">Old Friend</p></label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="overTenYears" checked={overTenYears} onChange={e => setOverTenYears(e.target.checked)} />
                            <label className="form-check-label" htmlFor="overTenYears"><p className="card-text twitch-veteran-message" title="This user has been on Twitch for a very long time. (10+ yrs)">Twitch Veteran</p></label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="specificPeriod" checked={specificPeriod} onChange={e => setSpecificPeriod(e.target.checked)} />
                            <label className="form-check-label" htmlFor="specificPeriod"><p className="card-text justins-friend-message" title="This user's account was made in the Justin.tv days.">Justin's Friend</p></label>
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
                        <label className="form-check-label" htmlFor="startedWithinHour"><p className="card-text just-started-message" title="This user has just started streaming.">Just Started</p></label>
                    </div>
                </div>
    );
};

export default FilterBox;