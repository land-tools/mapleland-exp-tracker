/**
 * 화면 캡처 모듈
 * getDisplayMedia를 사용하여 게임 창을 캡처하고 프리뷰를 표시합니다.
 */

const CaptureModule = (function() {
    let mediaStream = null;
    let videoElement = null;
    let previewCanvas = null;
    let previewCtx = null;
    let animationFrameId = null;
    let isCapturing = false;
    
    // 캡처된 비디오의 실제 크기
    let videoWidth = 0;
    let videoHeight = 0;
    
    // 캔버스에 표시되는 스케일 비율
    let scaleRatio = 1;
    
    // 재사용 캔버스 (메모리 누수 방지)
    let reusableFrameCanvas = null;
    let reusableFrameCtx = null;
    
    // 크롭용 재사용 캔버스 캐시 (영역별)
    const cropCanvasCache = new Map();
    
    // 프리뷰 프레임 레이트 제한 (메모리 최적화)
    let lastRenderTime = 0;
    const TARGET_FPS = 15; // 60fps → 15fps로 줄임
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    /**
     * 모듈 초기화
     */
    function init() {
        videoElement = document.getElementById('sourceVideo');
        previewCanvas = document.getElementById('previewCanvas');
        previewCtx = previewCanvas.getContext('2d');
    }

    /**
     * 화면 캡처 시작
     * @returns {Promise<boolean>} 성공 여부
     */
    async function startCapture() {
        try {
            // 기존 스트림이 있으면 정리
            if (mediaStream) {
                stopCapture();
            }

            // 화면 공유 요청 (프레임 레이트 제한으로 메모리 최적화)
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'never',
                    frameRate: { ideal: 10, max: 15 }  // 60fps → 10-15fps로 제한
                },
                audio: false
            });

            // 스트림 종료 이벤트 처리
            mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                stopCapture();
                if (typeof onCaptureEnded === 'function') {
                    onCaptureEnded();
                }
            });

            // 비디오 해상도 변경 이벤트 처리
            videoElement.addEventListener('resize', handleVideoResize);

            // 비디오 요소에 스트림 연결
            videoElement.srcObject = mediaStream;

            // 비디오 메타데이터 로드 대기
            await new Promise((resolve) => {
                if (videoElement.readyState >= 2) {
                    // 이미 로드됨
                    resolve();
                } else {
                    videoElement.addEventListener('loadedmetadata', resolve, { once: true });
                }
            });

            await videoElement.play();

            // 비디오 크기 가져오기 (메타데이터 로드 후)
            videoWidth = videoElement.videoWidth;
            videoHeight = videoElement.videoHeight;

            // 비디오 크기가 0이면 추가 대기
            if (videoWidth === 0 || videoHeight === 0) {
                await new Promise((resolve) => {
                    const checkSize = () => {
                        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                            videoWidth = videoElement.videoWidth;
                            videoHeight = videoElement.videoHeight;
                            resolve();
                        } else {
                            requestAnimationFrame(checkSize);
                        }
                    };
                    checkSize();
                });
            }

            // 캔버스 크기 설정 (컨테이너에 맞춤)
            const container = previewCanvas.parentElement;
            const containerWidth = container.clientWidth;
            scaleRatio = containerWidth / videoWidth;
            
            previewCanvas.width = containerWidth;
            previewCanvas.height = videoHeight * scaleRatio;

            isCapturing = true;

            // 프리뷰 렌더링 시작
            renderPreview();

            return true;
        } catch (error) {
            console.error('화면 캡처 실패:', error);
            return false;
        }
    }

    /**
     * 화면 캡처 중지
     */
    function stopCapture() {
        isCapturing = false;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        if (videoElement) {
            videoElement.removeEventListener('resize', handleVideoResize);
            videoElement.srcObject = null;
        }
        
        // 메모리 정리
        reusableFrameCanvas = null;
        reusableFrameCtx = null;
        cropCanvasCache.clear();
    }

    /**
     * 비디오 해상도 변경 처리
     */
    function handleVideoResize() {
        const newWidth = videoElement.videoWidth;
        const newHeight = videoElement.videoHeight;
        
        // 크기가 실제로 변경되었는지 확인
        if (newWidth !== videoWidth || newHeight !== videoHeight) {
            console.log(`[Capture] 해상도 변경 감지: ${videoWidth}x${videoHeight} → ${newWidth}x${newHeight}`);
            
            videoWidth = newWidth;
            videoHeight = newHeight;
            
            // 캔버스 크기 재설정
            const container = previewCanvas.parentElement;
            const containerWidth = container.clientWidth;
            scaleRatio = containerWidth / videoWidth;
            
            previewCanvas.width = containerWidth;
            previewCanvas.height = videoHeight * scaleRatio;
            
            // 콜백 호출
            if (typeof onResolutionChanged === 'function') {
                onResolutionChanged({ width: videoWidth, height: videoHeight });
            }
        }
    }

    /**
     * 프리뷰 캔버스에 렌더링
     */
    function renderPreview(timestamp) {
        if (!isCapturing || !videoElement) return;

        // 프레임 레이트 제한 (15fps)
        if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
            lastRenderTime = timestamp;
            
            previewCtx.drawImage(
                videoElement,
                0, 0,
                previewCanvas.width, previewCanvas.height
            );
        }

        animationFrameId = requestAnimationFrame(renderPreview);
    }

    /**
     * 현재 프레임을 캡처하여 ImageData 반환
     * @returns {ImageData|null}
     */
    function captureFrame() {
        if (!isCapturing || !videoElement) return null;

        // 재사용 캔버스 초기화 또는 크기 변경 시 재생성
        if (!reusableFrameCanvas || 
            reusableFrameCanvas.width !== videoWidth || 
            reusableFrameCanvas.height !== videoHeight) {
            reusableFrameCanvas = document.createElement('canvas');
            reusableFrameCanvas.width = videoWidth;
            reusableFrameCanvas.height = videoHeight;
            reusableFrameCtx = reusableFrameCanvas.getContext('2d');
        }
        
        reusableFrameCtx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
        
        return {
            canvas: reusableFrameCanvas,
            ctx: reusableFrameCtx,
            width: videoWidth,
            height: videoHeight
        };
    }

    /**
     * 특정 영역을 크롭하여 캔버스 반환
     * @param {Object} region - { x, y, width, height } (원본 좌표)
     * @param {string} regionKey - 캐시 키 (옵션, 'exp' 또는 'gold')
     * @returns {HTMLCanvasElement|null}
     */
    function cropRegion(region, regionKey = 'default') {
        const frame = captureFrame();
        if (!frame) return null;

        // 캐시된 캔버스 가져오기 또는 생성
        let cached = cropCanvasCache.get(regionKey);
        if (!cached || cached.width !== region.width || cached.height !== region.height) {
            cached = {
                canvas: document.createElement('canvas'),
                ctx: null
            };
            cached.canvas.width = region.width;
            cached.canvas.height = region.height;
            cached.ctx = cached.canvas.getContext('2d');
            cropCanvasCache.set(regionKey, cached);
        }

        cached.ctx.drawImage(
            frame.canvas,
            region.x, region.y, region.width, region.height,
            0, 0, region.width, region.height
        );

        return cached.canvas;
    }

    /**
     * 화면 좌표를 원본 비디오 좌표로 변환
     * @param {number} x - 화면 X 좌표
     * @param {number} y - 화면 Y 좌표
     * @returns {Object} { x, y } 원본 좌표
     */
    function screenToVideoCoords(x, y) {
        return {
            x: Math.round(x / scaleRatio),
            y: Math.round(y / scaleRatio)
        };
    }

    /**
     * 원본 비디오 좌표를 화면 좌표로 변환
     * @param {number} x - 원본 X 좌표
     * @param {number} y - 원본 Y 좌표
     * @returns {Object} { x, y } 화면 좌표
     */
    function videoToScreenCoords(x, y) {
        return {
            x: Math.round(x * scaleRatio),
            y: Math.round(y * scaleRatio)
        };
    }

    // 캡처 종료 콜백
    let onCaptureEnded = null;
    // 해상도 변경 콜백
    let onResolutionChanged = null;

    /**
     * 캡처 종료 콜백 설정
     * @param {Function} callback
     */
    function setOnCaptureEnded(callback) {
        onCaptureEnded = callback;
    }

    /**
     * 해상도 변경 콜백 설정
     * @param {Function} callback
     */
    function setOnResolutionChanged(callback) {
        onResolutionChanged = callback;
    }

    /**
     * 캡처 상태 반환
     * @returns {boolean}
     */
    function getIsCapturing() {
        return isCapturing;
    }

    /**
     * 비디오 크기 반환
     * @returns {Object} { width, height }
     */
    function getVideoSize() {
        return { width: videoWidth, height: videoHeight };
    }

    /**
     * 스케일 비율 반환
     * @returns {number}
     */
    function getScaleRatio() {
        return scaleRatio;
    }

    return {
        init,
        startCapture,
        stopCapture,
        captureFrame,
        cropRegion,
        screenToVideoCoords,
        videoToScreenCoords,
        setOnCaptureEnded,
        setOnResolutionChanged,
        getIsCapturing,
        getVideoSize,
        getScaleRatio
    };
})();

