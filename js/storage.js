/**
 * LocalStorage 관리 모듈
 * 설정값(좌표, 기준값 등)을 저장하고 복원합니다.
 */

const Storage = (function() {
    const STORAGE_KEY = 'mapleland_exp_tracker';
    const HISTORY_KEY = 'mapleland_hunt_history';

    /**
     * 기본 설정값
     */
    const defaultSettings = {
        regions: {
            exp: null,
            gold: null
        },
        lastUpdated: null
    };

    /**
     * 설정 저장
     * @param {Object} settings
     */
    function save(settings) {
        try {
            const data = {
                ...settings,
                lastUpdated: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('설정 저장됨:', data);
            return true;
        } catch (error) {
            console.error('설정 저장 실패:', error);
            return false;
        }
    }

    /**
     * 설정 불러오기
     * @returns {Object}
     */
    function load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                console.log('설정 불러옴:', parsed);
                return { ...defaultSettings, ...parsed };
            }
        } catch (error) {
            console.error('설정 불러오기 실패:', error);
        }
        return { ...defaultSettings };
    }

    /**
     * 영역 저장
     * @param {string} type - 'exp' or 'gold'
     * @param {Object} region - { x, y, width, height }
     */
    function saveRegion(type, region) {
        const settings = load();
        settings.regions[type] = region;
        save(settings);
    }

    /**
     * 영역 불러오기
     * @param {string} type - 'exp' or 'gold'
     * @returns {Object|null}
     */
    function loadRegion(type) {
        const settings = load();
        return settings.regions[type];
    }

    /**
     * 모든 영역 불러오기
     * @returns {Object}
     */
    function loadAllRegions() {
        const settings = load();
        return settings.regions;
    }

    /**
     * 설정 초기화
     */
    function clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('설정 초기화됨');
            return true;
        } catch (error) {
            console.error('설정 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 저장된 설정이 있는지 확인
     * @returns {boolean}
     */
    function hasSettings() {
        const settings = load();
        return settings.regions.exp !== null || settings.regions.gold !== null;
    }

    // ==================== 사냥 기록 관리 ====================

    /**
     * 사냥 기록 저장
     * @param {Object} record - 사냥 기록 객체
     * @returns {boolean}
     */
    function saveRecord(record) {
        try {
            const history = loadHistory();
            history.unshift(record); // 최신 기록을 맨 앞에
            
            // 최대 100개까지만 저장
            if (history.length > 100) {
                history.pop();
            }
            
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            console.log('사냥 기록 저장됨:', record);
            return true;
        } catch (error) {
            console.error('사냥 기록 저장 실패:', error);
            return false;
        }
    }

    /**
     * 전체 사냥 기록 불러오기
     * @returns {Array}
     */
    function loadHistory() {
        try {
            const data = localStorage.getItem(HISTORY_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('사냥 기록 불러오기 실패:', error);
        }
        return [];
    }

    /**
     * 개별 사냥 기록 삭제
     * @param {number} id - 기록 ID (timestamp)
     * @returns {boolean}
     */
    function deleteRecord(id) {
        try {
            const history = loadHistory();
            const filtered = history.filter(record => record.id !== id);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
            console.log('사냥 기록 삭제됨:', id);
            return true;
        } catch (error) {
            console.error('사냥 기록 삭제 실패:', error);
            return false;
        }
    }

    /**
     * 사냥 기록 메모 업데이트
     * @param {number} id - 기록 ID (timestamp)
     * @param {string} memo - 메모 내용
     * @returns {boolean}
     */
    function updateRecordMemo(id, memo) {
        try {
            const history = loadHistory();
            const record = history.find(r => r.id === id);
            if (record) {
                record.memo = memo;
                localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
                console.log('메모 업데이트됨:', id, memo);
                return true;
            }
            return false;
        } catch (error) {
            console.error('메모 업데이트 실패:', error);
            return false;
        }
    }

    /**
     * 전체 사냥 기록 삭제
     * @returns {boolean}
     */
    function clearHistory() {
        try {
            localStorage.removeItem(HISTORY_KEY);
            console.log('전체 사냥 기록 삭제됨');
            return true;
        } catch (error) {
            console.error('전체 사냥 기록 삭제 실패:', error);
            return false;
        }
    }

    /**
     * 사냥 기록 개수
     * @returns {number}
     */
    function getHistoryCount() {
        return loadHistory().length;
    }

    return {
        save,
        load,
        saveRegion,
        loadRegion,
        loadAllRegions,
        clear,
        hasSettings,
        // 사냥 기록
        saveRecord,
        loadHistory,
        deleteRecord,
        updateRecordMemo,
        clearHistory,
        getHistoryCount
    };
})();

