/**
 * 자동 영역 감지 모듈
 * 화면에서 EXP, 메소 영역을 자동으로 감지합니다.
 * 비율 기반으로 계산하여 다양한 해상도에 대응합니다.
 */

const AutoDetect = (function() {
    // 상태 콜백
    let onStatusChange = null;
    let onDetectionComplete = null;

    // 메이플랜드 UI 비율 (사용자 수동 지정 좌표 기반)
    // 화면 크기: 약 2951x1765 (역산)
    // EXP: 366x66 @ (1341, 1647)
    // 메소: 376x59 @ (1756, 1305)
    const UI_RATIOS = {
        exp: {
            xRatio: 0.454,      // 1341/2951
            yRatio: 0.933,      // 1647/1765
            widthRatio: 0.124,  // 366/2951
            heightRatio: 0.037  // 66/1765
        },
        gold: {
            xRatio: 0.595,      // 1756/2951
            yRatio: 0.739,      // 1305/1765
            widthRatio: 0.127,  // 376/2951
            heightRatio: 0.033  // 59/1765
        }
    };

    /**
     * 상태 업데이트
     */
    function updateStatus(status) {
        if (typeof onStatusChange === 'function') {
            onStatusChange(status);
        }
        console.log('[AutoDetect]', status);
    }

    /**
     * 전체 화면에서 모든 영역 자동 감지
     */
    function detectAll(fullScreenCanvas) {
        updateStatus('영역 자동 감지 중...');

        const results = {
            exp: null,
            gold: null
        };

        try {
            // 1. EXP 영역 감지 (비율 기반)
            updateStatus('EXP 영역 감지 중...');
            results.exp = detectExpRegion(fullScreenCanvas);

            // 2. 메소 영역 감지 (비율 기반)
            updateStatus('메소 영역 감지 중...');
            results.gold = detectGoldRegion(fullScreenCanvas);

            updateStatus('자동 감지 완료');

            if (typeof onDetectionComplete === 'function') {
                onDetectionComplete(results);
            }

            return results;
        } catch (error) {
            console.error('자동 감지 오류:', error);
            updateStatus('자동 감지 실패');
            return results;
        }
    }

    /**
     * EXP 영역 감지 (비율 기반)
     */
    function detectExpRegion(canvas) {
        const width = canvas.width;
        const height = canvas.height;

        const ratio = UI_RATIOS.exp;
        
        const expX = Math.floor(width * ratio.xRatio);
        const expY = Math.floor(height * ratio.yRatio);
        const expWidth = Math.floor(width * ratio.widthRatio);
        const expHeight = Math.floor(height * ratio.heightRatio);
        
        console.log('[AutoDetect] EXP 영역 (비율 기반):', {
            x: expX, y: expY, width: expWidth, height: expHeight,
            screenSize: { width, height }
        });

        return { x: expX, y: expY, width: expWidth, height: expHeight };
    }

    /**
     * 메소 영역 감지 (비율 기반)
     * 인벤토리 위치가 일반적으로 비슷한 위치에 있으므로 비율로 계산
     */
    function detectGoldRegion(canvas) {
        const width = canvas.width;
        const height = canvas.height;

        const ratio = UI_RATIOS.gold;
        
        const goldX = Math.floor(width * ratio.xRatio);
        const goldY = Math.floor(height * ratio.yRatio);
        const goldWidth = Math.floor(width * ratio.widthRatio);
        const goldHeight = Math.floor(height * ratio.heightRatio);
        
        console.log('[AutoDetect] 메소 영역 (비율 기반):', {
            x: goldX, y: goldY, width: goldWidth, height: goldHeight,
            screenSize: { width, height }
        });

        return { x: goldX, y: goldY, width: goldWidth, height: goldHeight };
    }

    /**
     * 콜백 설정
     */
    function setOnStatusChange(callback) {
        onStatusChange = callback;
    }

    function setOnDetectionComplete(callback) {
        onDetectionComplete = callback;
    }

    return {
        detectAll,
        detectExpRegion,
        detectGoldRegion,
        setOnStatusChange,
        setOnDetectionComplete
    };
})();
