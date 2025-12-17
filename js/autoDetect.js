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
    // EXP: 하단 기준 (상태바는 항상 화면 맨 아래에 고정)
    // 메소: 상단 기준 (인벤토리는 화면 상단-중앙에 위치)
    const UI_RATIOS = {
        exp: {
            xRatio: 0.454,           // X는 좌측 기준
            fromBottom: 0.067,       // 하단에서 6.7% 위 (1765-1647=118, 118/1765)
            widthRatio: 0.124,
            heightRatio: 0.037
        },
        gold: {
            xRatio: 0.595,           // X는 좌측 기준
            fromBottom: 0.261,       // 하단에서 26.1% 위 (1765-1305=460, 460/1765)
            widthRatio: 0.127,
            heightRatio: 0.033
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
     * EXP 영역 감지 (비율 기반 - 하단 기준)
     * 상태바는 항상 화면 맨 아래에 고정되므로 하단 기준으로 계산
     */
    function detectExpRegion(canvas) {
        const width = canvas.width;
        const height = canvas.height;

        const ratio = UI_RATIOS.exp;
        
        const expX = Math.floor(width * ratio.xRatio);
        const expHeight = Math.floor(height * ratio.heightRatio);
        const expWidth = Math.floor(width * ratio.widthRatio);
        // Y는 하단 기준: 화면 높이 - (하단에서의 거리) - 영역 높이
        const expY = Math.floor(height * (1 - ratio.fromBottom)) - expHeight;
        
        console.log('[AutoDetect] EXP 영역 (하단 기준):', {
            x: expX, y: expY, width: expWidth, height: expHeight,
            screenSize: { width, height },
            fromBottom: ratio.fromBottom
        });

        return { x: expX, y: expY, width: expWidth, height: expHeight };
    }

    /**
     * 메소 영역 감지 (비율 기반 - 하단 기준)
     * 인벤토리도 하단 기준으로 계산
     */
    function detectGoldRegion(canvas) {
        const width = canvas.width;
        const height = canvas.height;

        const ratio = UI_RATIOS.gold;
        
        const goldX = Math.floor(width * ratio.xRatio);
        const goldHeight = Math.floor(height * ratio.heightRatio);
        const goldWidth = Math.floor(width * ratio.widthRatio);
        // Y는 하단 기준
        const goldY = Math.floor(height * (1 - ratio.fromBottom)) - goldHeight;
        
        console.log('[AutoDetect] 메소 영역 (하단 기준):', {
            x: goldX, y: goldY, width: goldWidth, height: goldHeight,
            screenSize: { width, height },
            fromBottom: ratio.fromBottom
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
