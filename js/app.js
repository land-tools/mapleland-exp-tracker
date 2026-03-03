/**
 * 메이플랜드 경험치 측정기 - 메인 앱
 * 모든 모듈을 통합하고 5초 주기 분석 루프를 관리합니다.
 */

const App = (function() {
    // 상태
    let isAnalyzing = false;  // 분석 활성화 (시작됨)
    let isPaused = false;     // 일시정지 상태
    let pausedAt = null;      // 일시정지 시점 (timestamp)
    let totalPausedTime = 0;  // 총 일시정지 시간 (ms)
    let analysisInterval = null;
    let currentInterval = 1000; // 기본 1초
    let memoryCleanupInterval = null; // 주기적 메모리 정리
    
    // DOM 요소
    let elements = {};

    /**
     * 모바일 기기 감지
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    /**
     * 랜딩 페이지 표시/숨김
     */
    function showLanding(show) {
        const landingEl = document.getElementById('mobileNotice');
        const pageWrapper = document.querySelector('.page-wrapper');
        const mobileCtaSection = document.getElementById('mobileCtaSection');
        
        if (show) {
            landingEl.classList.add('active');
            pageWrapper.classList.add('hidden');
            
            // PC에서 랜딩 페이지를 볼 때는 "PC에서 이용해주세요" 섹션 숨기기
            if (!isMobileDevice() && mobileCtaSection) {
                mobileCtaSection.style.display = 'none';
            } else if (mobileCtaSection) {
                mobileCtaSection.style.display = '';
            }
        } else {
            landingEl.classList.remove('active');
            pageWrapper.classList.remove('hidden');
            // URL에서 landing 파라미터 제거
            const url = new URL(window.location);
            url.searchParams.delete('landing');
            window.history.replaceState({}, '', url);
        }
    }

    /**
     * 앱 초기화
     */
    async function init() {
        console.log('🍁 메이플랜드 경험치 측정기 초기화 중...');

        // URL 파라미터로 랜딩 페이지 표시 여부 확인
        const urlParams = new URLSearchParams(window.location.search);
        const showLandingPage = urlParams.get('landing') === 'true';

        // 모바일 감지 또는 랜딩 페이지 요청
        if (isMobileDevice() || showLandingPage) {
            showLanding(true);
            if (isMobileDevice()) {
                console.log('📱 모바일 기기 감지 - PC 접속 안내 표시');
            } else {
                console.log('📄 랜딩 페이지 표시');
            }
            // PC에서 랜딩 페이지를 볼 때만 "앱 사용하기" 버튼 표시
            if (!isMobileDevice()) {
                const btnGoToApp = document.getElementById('btnGoToApp');
                if (btnGoToApp) {
                    btnGoToApp.style.display = 'block';
                }
            }
            return; // 초기화 중단
        }

        // DOM 요소 캐싱
        cacheElements();

        // 모듈 초기화
        CaptureModule.init();
        RegionSelector.init();
        PIPModule.init();

        // OCR 초기화 (비동기)
        initOCR();

        // 이벤트 리스너 등록
        bindEvents();

        // 저장된 설정 복원
        restoreSettings();

        // PIP 대기 화면 렌더링
        PIPModule.renderWaiting();

        // 기록 테이블 렌더링
        renderHistoryTable();

        console.log('🍁 초기화 완료');
    }

    /**
     * DOM 요소 캐싱
     */
    function cacheElements() {
        elements = {
            btnSelectScreen: document.getElementById('btnSelectScreen'),
            btnSelectExp: document.getElementById('btnSelectExp'),
            btnSelectGold: document.getElementById('btnSelectGold'),
            btnStart: document.getElementById('btnStart'),
            btnPause: document.getElementById('btnPause'),
            btnStop: document.getElementById('btnStop'),
            btnPip: document.getElementById('btnPip'),
            previewWrapper: document.querySelector('.preview-wrapper'),
            previewPlaceholder: document.getElementById('previewPlaceholder'),
            expRegionInfo: document.getElementById('expRegionInfo'),
            goldRegionInfo: document.getElementById('goldRegionInfo'),
            autoDetectBtn: document.getElementById('btnAutoDetect'),
            statusText: document.getElementById('statusText'),
            elapsedTime: document.getElementById('elapsedTime'),
            ocrStatus: document.getElementById('ocrStatus'),
            currentExp: document.getElementById('currentExp'),
            expChange: document.getElementById('expChange'),
            expPerHour: document.getElementById('expPerHour'),
            timeToLevel: document.getElementById('timeToLevel'),
            currentGold: document.getElementById('currentGold'),
            goldChange: document.getElementById('goldChange'),
            goldPerHour: document.getElementById('goldPerHour'),
            intervalSelect: document.getElementById('intervalSelect'),
            btnClearAll: document.getElementById('btnClearAll'),
            btnTheme: document.getElementById('btnTheme'),
            btnLanding: document.getElementById('btnLanding'),
            btnManualToggle: document.getElementById('btnManualToggle'),
            manualSettings: document.querySelector('.manual-settings'),
            // 기록 패널
            historyTableBody: document.getElementById('historyTableBody'),
            historyEmpty: document.getElementById('historyEmpty'),
            btnClearHistory: document.getElementById('btnClearHistory'),
            historyTableWrapper: document.querySelector('.history-table-wrapper'),
            // 도움말 모달
            btnHelp: document.getElementById('btnHelp'),
            helpModal: document.getElementById('helpModal'),
            btnCloseHelp: document.getElementById('btnCloseHelp'),
            btnCloseHelpOk: document.getElementById('btnCloseHelpOk'),
            chkDontShowAgain: document.getElementById('chkDontShowAgain')
        };
    }

    /**
     * OCR 초기화
     */
    async function initOCR() {
        OCRModule.setOnStatusChange((status) => {
            elements.ocrStatus.textContent = status;
        });

        const success = await OCRModule.init();
        if (!success) {
            alert('OCR 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
        }
    }

    /**
     * 이벤트 리스너 등록
     */
    function bindEvents() {
        // 화면 선택
        elements.btnSelectScreen.addEventListener('click', handleSelectScreen);

        // 자동 감지 버튼
        if (elements.autoDetectBtn) {
            elements.autoDetectBtn.addEventListener('click', runAutoDetect);
        }

        // 영역 선택
        elements.btnSelectExp.addEventListener('click', () => {
            RegionSelector.startSelection('exp');
        });

        elements.btnSelectGold.addEventListener('click', () => {
            RegionSelector.startSelection('gold');
        });

        // 영역 선택 완료 콜백
        RegionSelector.setOnRegionSelected((type, region) => {
            Storage.saveRegion(type, region);
            updateRegionInfo();
            updateButtonStates();
        });

        // 분석 시작/중지
        elements.btnStart.addEventListener('click', startOrResumeAnalysis);
        elements.btnPause.addEventListener('click', pauseAnalysis);
        elements.btnStop.addEventListener('click', stopAnalysis);

        // 전체 초기화 (모든 설정 삭제)
        elements.btnClearAll.addEventListener('click', handleClearAll);

        // PIP
        elements.btnPip.addEventListener('click', handlePIP);

        // PIP 버튼 연결
        PIPModule.setOnPlay(() => {
            startOrResumeAnalysis();
        });
        PIPModule.setOnPause(() => {
            pauseAnalysis();
        });
        PIPModule.setOnStop(() => {
            stopAnalysis();
        });
        // 레벨업 감지 콜백
        Analyzer.setOnLevelUp(() => {
            updateStatus('레벨업 감지! 추적 재시작');
        });

        // 캡처 종료 콜백
        CaptureModule.setOnCaptureEnded(() => {
            stopAnalysis();
            elements.previewWrapper.classList.remove('active');
            elements.previewPlaceholder.classList.remove('hidden');
            updateButtonStates();
            updateStatus('화면 캡처 종료됨');
        });

        // 해상도 변경 콜백
        CaptureModule.setOnResolutionChanged((newSize) => {
            console.log('해상도 변경 감지:', newSize);
            // 영역 인디케이터만 업데이트 (자동 감지는 사용자가 직접)
            RegionSelector.updateIndicators();
        });

        // 테마 토글
        elements.btnTheme.addEventListener('click', toggleTheme);

        // 랜딩 페이지 표시
        if (elements.btnLanding) {
            elements.btnLanding.addEventListener('click', () => {
                showLanding(true);
                // PC에서 랜딩 페이지를 볼 때 "앱 사용하기" 버튼 표시
                const btnGoToApp = document.getElementById('btnGoToApp');
                if (btnGoToApp) {
                    btnGoToApp.style.display = 'block';
                }
            });
        }

        // 랜딩 페이지에서 앱으로 이동
        const btnGoToApp = document.getElementById('btnGoToApp');
        if (btnGoToApp) {
            btnGoToApp.addEventListener('click', () => {
                showLanding(false);
            });
        }

        // 수동 설정 토글
        elements.btnManualToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.manualSettings.classList.toggle('open');
        });

        // 바깥 클릭시 수동 설정 패널 닫기
        document.addEventListener('click', (e) => {
            if (elements.manualSettings && !elements.manualSettings.contains(e.target)) {
                elements.manualSettings.classList.remove('open');
            }
        });

        // 갱신 주기 변경
        elements.intervalSelect.addEventListener('change', (e) => {
            currentInterval = parseInt(e.target.value, 10);
            console.log('갱신 주기 변경:', currentInterval + 'ms');
            
            // 분석 중이면 새 주기로 재시작
            if (isAnalyzing) {
                clearInterval(analysisInterval);
                analysisInterval = setInterval(runAnalysis, currentInterval);
                updateStatus(`분석 중... (${currentInterval / 1000}초 주기)`);
            }
        });

        // 기록 전체 삭제
        elements.btnClearHistory.addEventListener('click', handleClearHistory);

        // 도움말 모달
        elements.btnHelp.addEventListener('click', openHelpModal);
        elements.btnCloseHelp.addEventListener('click', closeHelpModal);
        elements.btnCloseHelpOk.addEventListener('click', closeHelpModal);
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                closeHelpModal();
            }
        });

        // 처음 방문 시 도움말 자동 표시
        if (!localStorage.getItem('mapleland_help_seen')) {
            setTimeout(() => openHelpModal(), 500);
        }
    }

    /**
     * 도움말 모달 열기
     */
    function openHelpModal() {
        elements.helpModal.classList.add('active');
    }

    /**
     * 도움말 모달 닫기
     */
    function closeHelpModal() {
        elements.helpModal.classList.remove('active');
        
        // "다시 보지 않기" 체크 시 저장
        if (elements.chkDontShowAgain.checked) {
            localStorage.setItem('mapleland_help_seen', 'true');
        }
    }

    /**
     * 화면 선택 핸들러
     */
    async function handleSelectScreen() {
        updateStatus('화면 선택 중...');
        
        // 먼저 프리뷰 영역을 보이게 설정 (크기 측정을 위해)
        elements.previewWrapper.classList.add('active');
        elements.previewPlaceholder.classList.add('hidden');
        
        const success = await CaptureModule.startCapture();
        
        if (success) {
            updateStatus('화면 캡처 중');
            
            // 저장된 영역이 있으면 인디케이터 업데이트
            RegionSelector.updateIndicators();
        } else {
            // 실패 시 다시 숨김
            elements.previewWrapper.classList.remove('active');
            elements.previewPlaceholder.classList.remove('hidden');
            updateStatus('화면 선택 취소됨');
        }
        
        updateButtonStates();
    }

    /**
     * 자동 영역 감지 실행
     */
    async function runAutoDetect() {
        if (!CaptureModule.getIsCapturing()) {
            alert('먼저 화면을 선택해주세요.');
            return;
        }

        updateStatus('영역 자동 감지 중...');

        try {
            // 현재 프레임 캡처
            const frame = CaptureModule.captureFrame();
            if (!frame) {
                updateStatus('프레임 캡처 실패');
                return;
            }

            // 자동 감지 실행
            const results = await AutoDetect.detectAll(frame.canvas);

            // 감지된 영역 적용
            if (results.exp) {
                RegionSelector.setRegion('exp', results.exp);
                Storage.saveRegion('exp', results.exp);
                console.log('EXP 영역 자동 설정:', results.exp);
            }

            if (results.gold) {
                RegionSelector.setRegion('gold', results.gold);
                Storage.saveRegion('gold', results.gold);
                console.log('메소 영역 자동 설정:', results.gold);
            }

            // UI 업데이트
            updateRegionInfo();
            updateButtonStates();
            RegionSelector.updateIndicators();

            // 결과 메시지
            const detectedCount = [results.exp, results.gold].filter(Boolean).length;
            if (detectedCount > 0) {
                updateStatus(`자동 감지 완료 (${detectedCount}개 영역)`);
            } else {
                updateStatus('자동 감지 실패 - 수동으로 선택해주세요');
            }

        } catch (error) {
            console.error('자동 감지 오류:', error);
            updateStatus('자동 감지 실패');
        }
    }

    /**
     * 분석 시작
     */
    /**
     * 분석 시작 또는 재개
     */
    function startOrResumeAnalysis() {
        if (!CaptureModule.getIsCapturing()) {
            alert('먼저 화면을 선택해주세요.');
            return;
        }

        if (!RegionSelector.areAllRegionsSet()) {
            alert('EXP 영역을 선택해주세요.');
            return;
        }

        if (!OCRModule.getIsInitialized()) {
            alert('OCR이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // 일시정지 상태에서 재개
        if (isPaused) {
            // 일시정지 시간 누적
            if (pausedAt) {
                totalPausedTime += Date.now() - pausedAt;
                pausedAt = null;
            }
            
            isPaused = false;

            // 프리뷰 숨기기 + 비디오 일시정지 (CaptureService 부하 감소)
            elements.previewWrapper.classList.remove('active');
            elements.previewPlaceholder.classList.remove('hidden');
            elements.previewPlaceholder.querySelector('p').textContent = '측정 중... PIP 창에서 확인하세요';
            CaptureModule.pausePreview();

            updateButtonStates();
            updateStatus(`분석 중... (${currentInterval / 1000}초 주기)`);
            elements.statusText.classList.add('analyzing');

            // Media Session 상태 업데이트
            PIPModule.updateMediaSessionState(true);

            // 즉시 분석 실행 및 인터벌 재시작
            runAnalysis();
            analysisInterval = setInterval(runAnalysis, currentInterval);
            return;
        }

        // 처음 시작
        isAnalyzing = true;
        isPaused = false;
        totalPausedTime = 0; // 일시정지 시간 초기화
        pausedAt = null;
        
        // 처음 시작할 때만 reset
        if (!Analyzer.isStarted()) {
            Analyzer.reset();
        }
        
        // 프리뷰 숨기기 + 비디오 일시정지 (CaptureService 부하 감소)
        elements.previewWrapper.classList.remove('active');
        elements.previewPlaceholder.classList.remove('hidden');
        elements.previewPlaceholder.querySelector('p').textContent = '측정 중... PIP 창에서 확인하세요';
        CaptureModule.pausePreview();

        updateButtonStates();
        updateStatus(`분석 중... (${currentInterval / 1000}초 주기)`);
        elements.statusText.classList.add('analyzing');

        // Media Session 상태 업데이트
        PIPModule.updateMediaSessionState(true);

        // 즉시 첫 분석 실행
        runAnalysis();

        // 선택된 주기로 분석
        analysisInterval = setInterval(runAnalysis, currentInterval);
        
        // 주기적 메모리 정리 시작 (10분마다)
        if (!memoryCleanupInterval) {
            memoryCleanupInterval = setInterval(() => {
                performMemoryCleanup();
            }, 10 * 60 * 1000); // 10분
        }
        
        // 참고: Windows CaptureService 메모리 누수는 브라우저 코드로 완전히 제어할 수 없습니다.
        // 자동 재시작은 사용자 경험을 해치므로 제거했습니다.
        // 필요시 사용자가 수동으로 "화면 선택" 버튼을 눌러 재시작할 수 있습니다.
    }
    
    /**
     * 주기적 메모리 정리 (Windows CaptureService 메모리 누수 완화)
     */
    function performMemoryCleanup() {
        console.log('[Memory] 주기적 메모리 정리 실행');
        
        // Canvas 캐시 정리
        if (CaptureModule && typeof CaptureModule.cleanupCache === 'function') {
            CaptureModule.cleanupCache();
        }
        
        // 가비지 컬렉션 유도 (가능한 경우)
        if (window.gc) {
            window.gc();
        }
        
        // 메모리 사용량 로그 (개발 모드)
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
            const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
            console.log(`[Memory] 사용량: ${used}MB / ${total}MB`);
        }
    }
    
    /**
     * MediaStream 재시작 (Windows CaptureService 메모리 누수 완화)
     * 사용자에게 알림을 주고 확인 후 재시작
     * 
     * 참고: getDisplayMedia는 재시작 시 화면 선택 다이얼로그를 띄우므로,
     * 자동 재시작은 사용자 경험을 해칠 수 있습니다.
     * 대신 주기적으로 사용자에게 알림을 주는 방식으로 변경했습니다.
     */
    async function restartCaptureStream() {
        if (!CaptureModule.getIsCapturing() || !isAnalyzing) {
            return; // 캡처 중이 아니거나 분석 중이 아니면 재시작 불필요
        }
        
        // 사용자에게 알림 (자동 재시작 대신)
        const shouldRestart = confirm(
            '메모리 최적화를 위해 화면 캡처를 재시작하시겠습니까?\n\n' +
            '재시작 시 화면 선택 다이얼로그가 다시 나타납니다.\n' +
            '같은 화면을 선택하시면 분석이 계속됩니다.\n\n' +
            '취소하시면 계속 사용하실 수 있지만, 메모리 사용량이 증가할 수 있습니다.'
        );
        
        if (!shouldRestart) {
            console.log('[Capture] 사용자가 재시작 취소');
            return;
        }
        
        console.log('[Capture] MediaStream 재시작 (사용자 확인)');
        updateStatus('스트림 재시작 중... (메모리 최적화)');
        
        // 현재 영역 정보 저장
        const regions = RegionSelector.getAllRegions();
        
        // 캡처 중지
        CaptureModule.stopCapture();
        
        // 잠시 대기 (OS가 리소스를 정리할 시간 제공)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 캡처 재시작 (화면 선택 다이얼로그 표시)
        const success = await CaptureModule.startCapture();
        
        if (success) {
            updateStatus('스트림 재시작 완료');
            
            // 영역 인디케이터 업데이트
            if (regions.exp || regions.gold) {
                RegionSelector.updateIndicators();
            }
            
            console.log('[Capture] MediaStream 재시작 완료');
        } else {
            updateStatus('스트림 재시작 실패 - 수동으로 다시 선택해주세요');
            console.error('[Capture] MediaStream 재시작 실패');
            // 분석 중지 (스트림이 없으면 분석 불가)
            pauseAnalysis();
        }
    }

    /**
     * 분석 일시정지 (기록 저장 안함)
     */
    function pauseAnalysis() {
        if (!isAnalyzing || isPaused) return;

        isPaused = true;
        pausedAt = Date.now(); // 일시정지 시점 저장
        
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }

        // Media Session 상태 업데이트
        PIPModule.updateMediaSessionState(false);
        
        // 프리뷰 재개 + 다시 보이기 (영역 확인용)
        if (CaptureModule.getIsCapturing()) {
            CaptureModule.resumePreview();
            elements.previewWrapper.classList.add('active');
            elements.previewPlaceholder.classList.add('hidden');
        }

        updateButtonStates();
        updateStatus('일시정지');
        elements.statusText.classList.remove('analyzing');
    }

    /**
     * 분석 중지
     */
    /**
     * 분석 정지 (종료 - 기록 저장)
     */
    function stopAnalysis() {
        if (!isAnalyzing) return;

        // 세션 기록 저장 (정지 시에만)
        const record = Analyzer.createSessionRecord();
        if (record) {
            // 경험치 변동이 0이면 저장하지 않음
            if (record.exp.gained === 0) {
                console.log('📝 경험치 변동 없음 - 기록 저장 안함');
            } else {
                Storage.saveRecord(record);
                console.log('📝 사냥 기록 저장됨:', record);
                // 기록 테이블 업데이트
                renderHistoryTable();
            }
        }

        isAnalyzing = false;
        isPaused = false;

        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        
        // 메모리 정리 인터벌 정리
        if (memoryCleanupInterval) {
            clearInterval(memoryCleanupInterval);
            memoryCleanupInterval = null;
        }
        
        // 최종 메모리 정리 실행
        performMemoryCleanup();

        // 분석 데이터 초기화 (새 세션 준비)
        Analyzer.reset();

        // Media Session 상태 업데이트
        PIPModule.updateMediaSessionState(false);

        updateButtonStates();
        updateStatus('분석 종료');
        elements.statusText.classList.remove('analyzing');
        
        // UI 초기화
        elements.elapsedTime.textContent = '00:00:00';
        
        // 프리뷰 재개 + 다시 보이기
        if (CaptureModule.getIsCapturing()) {
            CaptureModule.resumePreview();
            elements.previewWrapper.classList.add('active');
            elements.previewPlaceholder.classList.add('hidden');
        }
    }

    /**
     * 분석 실행 (5초마다)
     */
    async function runAnalysis() {
        if (!isAnalyzing) return;

        try {
            const regions = RegionSelector.getAllRegions();

            // 비디오 프레임 준비 (정지 상태이면 잠깐 재생 후 새 프레임 대기)
            await CaptureModule.prepareFrame();

            // EXP 영역 OCR (재사용 캔버스 키 전달)
            const expCanvas = CaptureModule.cropRegion(regions.exp, 'exp');

            // 메소 영역 크롭 (영역이 설정된 경우에만)
            let goldCanvas = null;
            if (regions.gold) {
                goldCanvas = CaptureModule.cropRegion(regions.gold, 'gold');
            }

            // 프레임 캡처 완료 → 비디오 다시 일시정지 (OCR 처리 동안 CaptureService 부하 없음)
            CaptureModule.releaseFrame();

            const expResult = await OCRModule.recognizeExp(expCanvas);

            // 메소 영역 OCR
            let goldResult = { gold: null, raw: '' };
            if (goldCanvas) {
                goldResult = await OCRModule.recognizeGold(goldCanvas);
            }

            // 분석 (일시정지 시간 전달)
            const analysisResult = Analyzer.analyze({
                exp: expResult.exp,
                percent: expResult.percent,
                gold: goldResult.gold,
                pausedTime: totalPausedTime
            });

            // UI 업데이트
            updateResultsUI(analysisResult);

            // PIP 업데이트
            PIPModule.render(analysisResult);

            // 경과 시간 업데이트
            elements.elapsedTime.textContent = Analyzer.formatElapsed(analysisResult.elapsed);

        } catch (error) {
            console.error('분석 오류:', error);
            PIPModule.renderError('분석 오류');
        }
    }

    /**
     * 결과 UI 업데이트
     */
    function updateResultsUI(result) {
        // EXP
        if (result.exp.current !== null) {
            let expText = Analyzer.formatNumber(result.exp.current);
            if (result.exp.percent !== null) {
                expText += ` (${result.exp.percent.toFixed(2)}%)`;
            }
            elements.currentExp.textContent = expText;
        }
        
        elements.expChange.textContent = Analyzer.formatChange(result.exp.change);
        elements.expChange.style.color = result.exp.change >= 0 ? '#00c853' : '#ff5252';
        
        elements.expPerHour.textContent = Analyzer.formatNumber(result.exp.perHour);
        elements.timeToLevel.textContent = Analyzer.formatTimeEstimate(result.exp.timeToLevel);

        // 메소 (영역이 설정된 경우에만)
        const goldCard = document.querySelector('.gold-card');
        if (result.gold.current !== null) {
            if (goldCard) goldCard.style.display = 'block';
            elements.currentGold.textContent = Analyzer.formatNumber(result.gold.current);
            elements.goldChange.textContent = Analyzer.formatChange(result.gold.change);
            elements.goldChange.style.color = result.gold.change >= 0 ? '#00c853' : '#ff5252';
            elements.goldPerHour.textContent = Analyzer.formatNumber(result.gold.perHour);
        } else {
            if (goldCard) goldCard.style.display = 'none';
        }
    }

    /**
     * 리셋 핸들러 (기준값만 초기화 - PIP와 동일)
     */
    /**
     * 전체 초기화 핸들러 (모든 설정 삭제)
     */
    function handleClearAll() {
        if (confirm('영역 설정을 초기화하시겠습니까?')) {
            stopAnalysis();
            Analyzer.reset();
            RegionSelector.clearRegions();
            Storage.clear();
            
            // UI 초기화
            elements.expRegionInfo.textContent = '미설정';
            elements.goldRegionInfo.textContent = '미설정';
            elements.elapsedTime.textContent = '00:00:00';
            elements.currentExp.textContent = '-';
            elements.expChange.textContent = '-';
            elements.expPerHour.textContent = '-';
            elements.timeToLevel.textContent = '-';
            elements.currentGold.textContent = '-';
            elements.goldChange.textContent = '-';
            elements.goldPerHour.textContent = '-';

            PIPModule.renderWaiting();
            updateStatus('전체 초기화됨');
            updateButtonStates();
        }
    }

    /**
     * PIP 핸들러
     */
    async function handlePIP() {
        if (PIPModule.isPIPOpen()) {
            await PIPModule.closePIP();
        } else {
            const success = await PIPModule.openPIP();
            if (!success) {
                alert('PIP 창을 열 수 없습니다. 브라우저가 PIP를 지원하는지 확인해주세요.');
            }
        }
    }

    /**
     * 버튼 상태 업데이트
     */
    function updateButtonStates() {
        const isCapturing = CaptureModule.getIsCapturing();
        const allRegionsSet = RegionSelector.areAllRegionsSet();
        const ocrReady = OCRModule.getIsInitialized();
        
        // 분석 중이고 일시정지 아님 = 활성 분석 중
        const isActivelyAnalyzing = isAnalyzing && !isPaused;

        // 화면 선택 버튼: 활성 분석 중에는 비활성화 (공유 끊김 방지)
        elements.btnSelectScreen.disabled = isActivelyAnalyzing;

        elements.btnSelectExp.disabled = !isCapturing || isActivelyAnalyzing;
        elements.btnSelectGold.disabled = !isCapturing || isActivelyAnalyzing;
        
        // 시작 버튼: 분석 중이 아니거나, 일시정지 상태일 때 활성화
        elements.btnStart.disabled = !isCapturing || !allRegionsSet || !ocrReady || isActivelyAnalyzing;
        
        // 일시정지 버튼: 활성 분석 중일 때만 활성화
        elements.btnPause.disabled = !isActivelyAnalyzing;
        
        // 정지 버튼: 분석 시작됐으면 활성화 (일시정지 상태에서도 정지 가능)
        elements.btnStop.disabled = !isAnalyzing;
        
        elements.btnPip.disabled = false;
        
        // 시작 버튼 텍스트 변경
        if (isPaused) {
            elements.btnStart.innerHTML = '<span class="icon">▶️</span> 재개';
        } else {
            elements.btnStart.innerHTML = '<span class="icon">▶️</span> 시작';
        }
        
        // 자동 감지 버튼: 분석 중에는 비활성화
        if (elements.autoDetectBtn) {
            elements.autoDetectBtn.disabled = !isCapturing || !ocrReady || isActivelyAnalyzing;
        }
        
        // 수동 설정 토글: 분석 중에는 비활성화
        if (elements.btnManualToggle) {
            elements.btnManualToggle.disabled = isActivelyAnalyzing;
            // 분석 중이면 패널도 닫기
            if (isActivelyAnalyzing && elements.manualSettings) {
                elements.manualSettings.classList.remove('open');
            }
        }
        
        // 초기화 버튼: 분석 중에는 비활성화
        if (elements.btnClearAll) {
            elements.btnClearAll.disabled = isActivelyAnalyzing;
        }
    }

    /**
     * 상태 텍스트 업데이트
     */
    function updateStatus(text) {
        elements.statusText.textContent = text;
    }

    /**
     * 영역 정보 업데이트
     */
    function updateRegionInfo() {
        const regions = RegionSelector.getAllRegions();

        if (regions.exp) {
            elements.expRegionInfo.textContent = 
                `${regions.exp.width}x${regions.exp.height} @ (${regions.exp.x}, ${regions.exp.y})`;
        } else {
            elements.expRegionInfo.textContent = '미설정';
        }

        if (regions.gold) {
            elements.goldRegionInfo.textContent = 
                `${regions.gold.width}x${regions.gold.height} @ (${regions.gold.x}, ${regions.gold.y})`;
        } else {
            elements.goldRegionInfo.textContent = '미설정';
        }

    }

    /**
     * 기록 테이블 렌더링
     */
    function renderHistoryTable() {
        const history = Storage.loadHistory();
        
        if (history.length === 0) {
            elements.historyTableBody.innerHTML = '';
            elements.historyEmpty.classList.add('active');
            if (elements.historyTableWrapper) {
                elements.historyTableWrapper.style.display = 'none';
            }
            return;
        }

        elements.historyEmpty.classList.remove('active');
        if (elements.historyTableWrapper) {
            elements.historyTableWrapper.style.display = 'block';
        }

        elements.historyTableBody.innerHTML = history.map(record => {
            // 날짜 포맷: MM/DD HH:mm
            const startDate = new Date(record.id);
            const dateStr = `${String(startDate.getMonth() + 1).padStart(2, '0')}/${String(startDate.getDate()).padStart(2, '0')} ${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
            
            // 시간 포맷 (초 단위까지 표시)
            const totalSeconds = record.durationSeconds || (record.duration * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            let durationStr;
            if (hours > 0) {
                durationStr = `${hours}시간 ${minutes}분 ${seconds}초`;
            } else if (minutes > 0) {
                durationStr = `${minutes}분 ${seconds}초`;
            } else {
                durationStr = `${seconds}초`;
            }

            // EXP/메소 포맷
            const expStr = Analyzer.formatCompact(record.exp.gained);
            const expPerHourStr = record.exp.perHour ? Analyzer.formatCompact(record.exp.perHour) : '-';
            const mesoStr = record.meso.gained ? Analyzer.formatCompact(record.meso.gained) : '-';
            const mesoPerHourStr = record.meso.perHour ? Analyzer.formatCompact(record.meso.perHour) : '-';
            
            // 메모
            const memoValue = record.memo || '';

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td class="duration">${durationStr}</td>
                    <td class="exp-value">${expStr}</td>
                    <td class="exp-value">${expPerHourStr}</td>
                    <td class="meso-value">${mesoStr}</td>
                    <td class="meso-value">${mesoPerHourStr}</td>
                    <td class="memo-cell">
                        <input type="text" class="memo-input" data-id="${record.id}" 
                               value="${memoValue}" placeholder="메모" maxlength="50">
                    </td>
                    <td>
                        <button class="delete-btn" data-id="${record.id}" title="삭제">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        // 삭제 버튼 이벤트 바인딩
        elements.historyTableBody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                if (confirm('이 기록을 삭제하시겠습니까?')) {
                    Storage.deleteRecord(id);
                    renderHistoryTable();
                }
            });
        });

        // 메모 입력 이벤트 바인딩
        elements.historyTableBody.querySelectorAll('.memo-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const memo = e.target.value.trim();
                Storage.updateRecordMemo(id, memo);
            });
        });
    }

    /**
     * 전체 기록 삭제
     */
    function handleClearHistory() {
        if (confirm('모든 사냥 기록을 삭제하시겠습니까?')) {
            Storage.clearHistory();
            renderHistoryTable();
        }
    }

    /**
     * 테마 토글
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // 버튼 아이콘 업데이트
        updateThemeButton(newTheme);
    }

    /**
     * 테마 버튼 아이콘 업데이트
     */
    function updateThemeButton(theme) {
        if (elements.btnTheme) {
            elements.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
            elements.btnTheme.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
        }
    }

    /**
     * 저장된 테마 복원
     */
    function restoreTheme() {
        const savedTheme = localStorage.getItem('theme');
        // 저장된 테마가 없으면 시스템 설정 따라감
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeButton(savedTheme);
        } else {
            // 시스템 다크모드 감지
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = prefersDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeButton(theme);
        }
    }

    /**
     * 저장된 설정 복원
     */
    function restoreSettings() {
        // 테마 복원
        restoreTheme();

        const regions = Storage.loadAllRegions();

        if (regions.exp) {
            RegionSelector.setRegion('exp', regions.exp);
        }

        if (regions.gold) {
            RegionSelector.setRegion('gold', regions.gold);
        }

        updateRegionInfo();
        updateButtonStates();

        if (Storage.hasSettings()) {
            console.log('저장된 설정 복원됨');
        }
    }

    // DOM 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        startAnalysis,
        stopAnalysis,
        isAnalyzing: () => isAnalyzing
    };
})();

