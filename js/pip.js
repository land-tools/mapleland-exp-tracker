/**
 * PIP (Picture-in-Picture) 모듈
 * Document PIP API를 사용하여 HTML 요소를 PIP 창으로 표시합니다.
 */

const PIPModule = (function() {
    let pipWindow = null;
    let pipContainer = null;
    let isAnalyzing = false;
    let showGold = true; // 메소 섹션 표시 여부
    let hasGoldDataPrev = false; // 이전 메소 데이터 존재 여부 (리사이즈 판단용)
    // 액션 콜백
    let onPlay = null;
    let onPause = null;
    let onStop = null;

    // 색상 테마 (밝은 회색톤)
    const COLORS = {
        background: '#4a5568',
        headerBg: '#5a6578',
        expColor: '#7dd3fc',
        goldColor: '#fcd34d',
        textPrimary: '#f8fafc',
        textSecondary: '#d1d5db',
        positive: '#6ee7a0',
        negative: '#fca5a5',
        border: '#8892a0',
        buttonBg: '#5a6578',
        buttonHover: '#6b7588',
        playBtn: '#4ade80',
        pauseBtn: '#fb923c',
        resetBtn: '#818cf8'
    };

    /**
     * 모듈 초기화
     */
    function init() {
        // Document PIP 지원 확인
        if (!('documentPictureInPicture' in window)) {
            console.warn('Document PIP API를 지원하지 않습니다. 기본 PIP를 사용합니다.');
        }
    }

    /**
     * PIP용 스타일 생성
     */
    function createStyles() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', 'Noto Sans KR', sans-serif;
                background: ${COLORS.background};
                color: ${COLORS.textPrimary};
                padding: 0;
                overflow: hidden;
            }
            .pip-container {
                width: 240px;
                min-height: 100%;
                position: relative;
            }
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .section-time {
                font-size: 11px;
                color: ${COLORS.textSecondary};
                font-family: 'Consolas', monospace;
            }
            .section {
                padding: 6px 10px;
            }
            .section-title {
                font-size: 12px;
                font-weight: bold;
            }
            .section-title.exp { color: ${COLORS.expColor}; }
            .section-title.gold { color: ${COLORS.goldColor}; }
            .row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                font-size: 11px;
            }
            .row-label {
                color: ${COLORS.textSecondary};
                padding-left: 10px;
            }
            .row-value {
                font-family: 'Consolas', monospace;
                font-weight: 600;
            }
            .row-value.positive { color: ${COLORS.positive}; }
            .row-value.negative { color: ${COLORS.negative}; }
            .divider {
                height: 1px;
                background: ${COLORS.border};
                margin: 4px 10px;
            }
            .controls {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                gap: 8px;
                padding: 8px 10px;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                opacity: 0;
                transition: opacity 0.2s;
            }
            .pip-container:hover .controls {
                opacity: 1;
            }
            .btn {
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.1s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .btn:hover {
                transform: scale(1.15);
            }
            .btn:active {
                transform: scale(0.9);
            }
            .btn-toggle {
                background: ${COLORS.playBtn};
                color: white;
                width: 28px;
                height: 28px;
                font-size: 12px;
            }
            .btn-toggle.playing {
                background: ${COLORS.pauseBtn};
            }
            .btn-stop {
                background: #dc3545;
                color: white;
                width: 28px;
                height: 28px;
                font-size: 12px;
            }
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .btn-gold {
                background: ${COLORS.goldColor};
                color: #1a1a2e;
                font-size: 11px;
            }
            .btn-gold.hidden {
                background: ${COLORS.buttonBg};
                color: ${COLORS.textSecondary};
            }
            .levelup-alert {
                background: ${COLORS.positive};
                color: white;
                text-align: center;
                padding: 4px;
                font-size: 10px;
                font-weight: bold;
                display: none;
            }
            .levelup-alert.show {
                display: block;
            }
        `;
    }

    /**
     * PIP용 HTML 생성
     */
    function createHTML() {
        return `
            <div class="pip-container">
                <div class="section">
                    <div class="section-header">
                        <span class="section-title exp">⚡ 경험치</span>
                        <span class="section-time" id="pipElapsed">00:00:00</span>
                    </div>
                    <div class="row">
                        <span class="row-label">현재</span>
                        <span class="row-value" id="pipCurrentExp">-</span>
                    </div>
                    <div class="row">
                        <span class="row-label">변화</span>
                        <span class="row-value" id="pipExpChange">-</span>
                    </div>
                    <div class="row">
                        <span class="row-label">시간당</span>
                        <span class="row-value" id="pipExpPerHour">-</span>
                    </div>
                    <div class="row">
                        <span class="row-label">레벨업</span>
                        <span class="row-value" id="pipTimeToLevel">-</span>
                    </div>
                </div>
                
                <div class="divider" id="pipGoldDivider"></div>
                
                <div class="section" id="pipGoldSection">
                    <div class="section-title gold">💰 메소</div>
                    <div class="row">
                        <span class="row-label">현재</span>
                        <span class="row-value" id="pipCurrentGold">-</span>
                    </div>
                    <div class="row">
                        <span class="row-label">변화</span>
                        <span class="row-value" id="pipGoldChange">-</span>
                    </div>
                    <div class="row">
                        <span class="row-label">시간당</span>
                        <span class="row-value" id="pipGoldPerHour">-</span>
                    </div>
                </div>
                
                <div class="levelup-alert" id="pipLevelupAlert">
                    🎉 레벨업! 추적 재시작
                </div>
                
                <div class="controls">
                    <button class="btn btn-toggle" id="pipBtnToggle" title="시작/일시정지">▶</button>
                    <button class="btn btn-stop" id="pipBtnStop" title="정지">⏹</button>
                    <button class="btn btn-gold" id="pipBtnGold" title="메소 표시/숨김">💰</button>
                </div>
            </div>
        `;
    }

    /**
     * Document PIP 창 열기
     * @returns {Promise<boolean>}
     */
    async function openPIP() {
        // Document PIP 지원 확인
        if (!('documentPictureInPicture' in window)) {
            alert('이 브라우저는 Document PIP를 지원하지 않습니다.\nChrome 116 이상을 사용해주세요.');
            return false;
        }

        try {
            // PIP 창 열기 (초기에는 넉넉하게, 내용 렌더링 후 조절)
            pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 240,
                height: 250
            });

            // 스타일 추가
            const style = pipWindow.document.createElement('style');
            style.textContent = createStyles();
            pipWindow.document.head.appendChild(style);

            // HTML 추가
            pipWindow.document.body.innerHTML = createHTML();

            // 버튼 이벤트 연결
            const btnToggle = pipWindow.document.getElementById('pipBtnToggle');
            const btnStop = pipWindow.document.getElementById('pipBtnStop');
            const btnGold = pipWindow.document.getElementById('pipBtnGold');

            btnToggle.addEventListener('click', () => {
                // 현재 상태에 따라 시작 또는 일시정지
                if (btnToggle.classList.contains('playing')) {
                    if (typeof onPause === 'function') onPause();
                } else {
                    if (typeof onPlay === 'function') onPlay();
                }
            });

            btnStop.addEventListener('click', () => {
                if (typeof onStop === 'function') onStop();
            });

            btnGold.addEventListener('click', () => {
                showGold = !showGold;
                updateGoldVisibility();
            });
            
            // 초기 버튼 상태 설정
            updateToggleButton();
            updateGoldVisibility();

            // 내용 렌더링 후 실제 크기에 맞게 조절 (여러 번 시도)
            setTimeout(() => fitPIPToContent(), 50);
            setTimeout(() => fitPIPToContent(), 150);
            setTimeout(() => fitPIPToContent(), 300);

            // PIP 창 닫힘 이벤트
            pipWindow.addEventListener('pagehide', () => {
                pipWindow = null;
            });

            console.log('Document PIP 창 열림');
            return true;
        } catch (error) {
            console.error('PIP 열기 실패:', error);
            return false;
        }
    }

    /**
     * PIP 창 닫기
     */
    function closePIP() {
        if (pipWindow) {
            pipWindow.close();
            pipWindow = null;
        }
    }

    /**
     * PIP 상태 확인
     * @returns {boolean}
     */
    function isPIPOpen() {
        return pipWindow !== null && !pipWindow.closed;
    }

    /**
     * PIP 창 데이터 업데이트
     * @param {Object} result - Analyzer 결과
     */
    function render(result) {
        if (!isPIPOpen()) return;

        const doc = pipWindow.document;

        // 경과 시간
        const elapsed = doc.getElementById('pipElapsed');
        if (elapsed) elapsed.textContent = Analyzer.formatElapsed(result.elapsed);

        // EXP
        const currentExp = doc.getElementById('pipCurrentExp');
        if (currentExp) {
            let expText = Analyzer.formatNumber(result.exp.current);
            if (result.exp.percent !== null) {
                expText += ` (${result.exp.percent.toFixed(2)}%)`;
            }
            currentExp.textContent = expText;
        }

        const expChange = doc.getElementById('pipExpChange');
        if (expChange) {
            expChange.textContent = Analyzer.formatChange(result.exp.change);
            expChange.className = 'row-value ' + (result.exp.change >= 0 ? 'positive' : 'negative');
        }

        const expPerHour = doc.getElementById('pipExpPerHour');
        if (expPerHour) expPerHour.textContent = Analyzer.formatNumber(result.exp.perHour);

        const timeToLevel = doc.getElementById('pipTimeToLevel');
        if (timeToLevel) timeToLevel.textContent = Analyzer.formatTimeEstimate(result.exp.timeToLevel);

        // 메소 (showGold 상태 및 데이터 유무에 따라 표시)
        const goldSection = doc.getElementById('pipGoldSection');
        const goldDivider = doc.getElementById('pipGoldDivider');
        const hasGoldData = result.gold.current !== null;
        const shouldShowGold = showGold && hasGoldData;
        
        if (goldSection) goldSection.style.display = shouldShowGold ? 'block' : 'none';
        if (goldDivider) goldDivider.style.display = shouldShowGold ? 'block' : 'none';

        // 메소 버튼 - 데이터가 없으면 숨김
        const btnGold = doc.getElementById('pipBtnGold');
        if (btnGold) btnGold.style.display = hasGoldData ? 'flex' : 'none';

        // 메소 데이터 존재 여부가 변경되면 창 크기 조절
        if (hasGoldData !== hasGoldDataPrev) {
            hasGoldDataPrev = hasGoldData;
            if (hasGoldData && showGold) {
                resizePIPWindow();
            }
        }

        if (hasGoldData) {
            const currentGold = doc.getElementById('pipCurrentGold');
            if (currentGold) currentGold.textContent = Analyzer.formatNumber(result.gold.current);

            const goldChange = doc.getElementById('pipGoldChange');
            if (goldChange) {
                goldChange.textContent = Analyzer.formatChange(result.gold.change);
                goldChange.className = 'row-value ' + (result.gold.change >= 0 ? 'positive' : 'negative');
            }

            const goldPerHour = doc.getElementById('pipGoldPerHour');
            if (goldPerHour) goldPerHour.textContent = Analyzer.formatNumber(result.gold.perHour);
        }

        // 레벨업 알림
        const levelupAlert = doc.getElementById('pipLevelupAlert');
        if (levelupAlert) {
            levelupAlert.className = 'levelup-alert' + (result.isLevelUp ? ' show' : '');
        }
    }

    /**
     * 대기 화면 렌더링
     */
    function renderWaiting() {
        // Document PIP에서는 기본 HTML이 표시됨
    }

    /**
     * 에러 화면 렌더링
     */
    function renderError(message) {
        if (!isPIPOpen()) return;
        // 필요시 에러 표시 구현
    }

    /**
     * 토글 버튼 상태 업데이트
     */
    function updateToggleButton() {
        if (!isPIPOpen()) return;
        
        const btnToggle = pipWindow.document.getElementById('pipBtnToggle');
        if (btnToggle) {
            if (isAnalyzing) {
                btnToggle.textContent = '⏸';
                btnToggle.classList.add('playing');
                btnToggle.title = '일시정지';
            } else {
                btnToggle.textContent = '▶';
                btnToggle.classList.remove('playing');
                btnToggle.title = '시작/재개';
            }
        }
    }

    /**
     * 메소 섹션 표시/숨김 업데이트
     */
    function updateGoldVisibility() {
        if (!isPIPOpen()) return;

        const doc = pipWindow.document;
        const goldSection = doc.getElementById('pipGoldSection');
        const goldDivider = doc.getElementById('pipGoldDivider');
        const btnGold = doc.getElementById('pipBtnGold');

        if (goldSection) goldSection.style.display = showGold ? 'block' : 'none';
        if (goldDivider) goldDivider.style.display = showGold ? 'block' : 'none';
        
        if (btnGold) {
            if (showGold) {
                btnGold.classList.remove('hidden');
                btnGold.title = '메소 숨기기';
            } else {
                btnGold.classList.add('hidden');
                btnGold.title = '메소 표시';
            }
        }

        // PIP 창 크기 조절
        resizePIPWindow();
    }

    /**
     * PIP 창을 내용에 맞게 크기 조절
     */
    function fitPIPToContent() {
        if (!isPIPOpen()) return;

        try {
            const doc = pipWindow.document;
            const body = doc.body;
            const container = doc.querySelector('.pip-container');
            
            if (!container) return;
            
            // 방법 1: body의 scrollHeight 사용
            let contentHeight = body.scrollHeight;
            
            // 방법 2: container의 getBoundingClientRect 사용 (더 정확)
            const rect = container.getBoundingClientRect();
            if (rect.height > 0) {
                contentHeight = Math.ceil(rect.height);
            }
            
            // 방법 3: 마지막 visible 요소의 bottom 위치 계산
            const allElements = container.querySelectorAll('.section, .divider, .levelup-alert');
            let maxBottom = 0;
            allElements.forEach(el => {
                if (el.style.display !== 'none' && el.offsetParent !== null) {
                    const elRect = el.getBoundingClientRect();
                    const bottom = el.offsetTop + el.offsetHeight;
                    if (bottom > maxBottom) {
                        maxBottom = bottom;
                    }
                }
            });
            
            if (maxBottom > 0) {
                contentHeight = maxBottom;
            }
            
            // 여유 공간 추가 (+28px)
            contentHeight += 32;
            
            // 최소/최대 높이 제한
            contentHeight = Math.max(contentHeight, 80);
            contentHeight = Math.min(contentHeight, 400);
            
            // 창 크기 조절
            pipWindow.resizeTo(240, contentHeight);
            
            console.log('PIP 크기 조절:', 240, 'x', contentHeight);
        } catch (e) {
            console.log('PIP 창 크기 조절 불가:', e);
        }
    }

    /**
     * PIP 창 크기 조절 (메소 토글 시)
     */
    function resizePIPWindow() {
        if (!isPIPOpen()) return;

        // 약간의 딜레이 후 콘텐츠 크기에 맞게 조절
        requestAnimationFrame(() => {
            fitPIPToContent();
        });
    }

    /**
     * 액션 콜백 설정
     */
    function setOnPlay(callback) { onPlay = callback; }
    function setOnPause(callback) { onPause = callback; }
    function setOnStop(callback) { onStop = callback; }

    /**
     * 분석 상태 업데이트 (버튼 표시용)
     */
    function updateMediaSessionState(playing) {
        isAnalyzing = playing;
        updateToggleButton();
    }

    return {
        init,
        render,
        renderWaiting,
        renderError,
        openPIP,
        closePIP,
        isPIPOpen,
        setOnPlay,
        setOnPause,
        setOnStop,
        updateMediaSessionState
    };
})();
