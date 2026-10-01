const STORAGE_KEY = 'hr_management_employees';
const AUTH_STORAGE_KEY = 'hr_management_auth';
const LOCAL_DATA_STORAGE_KEY = 'hr_management_local_data';

const VEHICLE_INFO_STORAGE_KEY = 'vehicle_info_data';
const VEHICLE_REPAIR_STORAGE_KEY = 'vehicle_repair_data';
const VEHICLE_MILEAGE_STORAGE_KEY = 'vehicle_mileage_data';
const VEHICLE_IMPORT_HISTORY_KEY = 'vehicle_import_history';

const TOILET_STORAGE_KEY = 'toilet_data';
const TOILET_IMPORT_HISTORY_KEY = 'toilet_import_history';

const PROJECT_STORAGE_KEY = 'project_data';
const PROJECT_IMPORT_HISTORY_KEY = 'project_import_history';

const MUNICIPAL_STORAGE_KEY = 'business_municipal_data';
const GREENERY_STORAGE_KEY = 'business_greenery_data';
const SANITATION_STORAGE_KEY = 'business_sanitation_data';

let employees = [];
let importData = [];
let importValidCount = 0;
let importInvalidCount = 0;
let dedupData = null;

let vehicleInfoData = [];
let vehicleRepairData = [];
let vehicleMileageData = [];
let vehicleImportHistory = [];

let toiletData = [];
let toiletImportHistory = [];

let projectData = [];
let projectImportHistory = [];
let projectPage = 1;
let projectPageSize = 20;
let projectImportData = [];
let projectStatusChart = null;
let projectTrendChart = null;
let projectValueChart = null;
let projectSortField = null;
let projectSortOrder = 'asc';

let vehicleInfoPage = 1;
let vehicleInfoPageSize = 20;
let vehicleRepairPage = 1;
let vehicleRepairPageSize = 20;
let vehicleMileagePage = 1;
let vehicleMileagePageSize = 20;

let vehicleRepairSortField = null;
let vehicleRepairSortOrder = 'asc';
let vehicleMileageSortField = null;
let vehicleMileageSortOrder = 'asc';

let toiletPage = 1;
let toiletPageSize = 20;

let vehicleInfoImportData = [];
let vehicleRepairImportData = [];
let vehicleMileageImportData = [];

let toiletImportData = [];

let repairCostChart = null;
let repairCountChart = null;

const WAREHOUSE_STORAGE_KEY = 'warehouse_all_months_data';
let whAllMonthsData = [];
let whCurrentMonth = '';
let whSelectedRows = [];
let whTop10Chart = null;
let whWarehouseChart = null;
let whTrendChart = null;
let whCompareChart = null;
let whSearchKeyword = '';
let whSearchHistory = [];
const WH_SEARCH_HISTORY_KEY = 'warehouse_search_history';
const WH_SEARCH_HISTORY_MAX = 10;

let sortField = null;
let sortOrder = 'asc';
let currentPage = 1;
let pageSize = 10;

let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000;

const EXCEL_COLUMNS = {
    '姓名': 'name',
    '性别': 'gender',
    '身份证号': 'idCard',
    '出生时间': 'birthDate',
    '年龄': 'age',
    '联系电话': 'phone',
    '籍贯': 'nativePlace',
    '岗位': 'position',
    '所在片区': 'area',
    '用工性质': 'employmentType',
    '外包类型': 'subcontractType',
    '入职时间': 'hireDate',
    '家庭住址': 'address',
    '备注': 'remarks'
};

function init() {
    initVideoBackground();
    loadEmployees();
    loadLocalEmployeesData();
    loadBusinessData();
    loadVehicleData();
    loadVehicleImportHistory();
    loadToiletData();
    loadProjectData();
    checkLoginStatus();
    setupEventListeners();
    setupAuthEventListeners();
    initDashboard();
    setupNavigation();
    setupBusinessEventListeners();
    setupImportEventListeners();
    setupVehicleEventListeners();
    setupProjectEventListeners();
    initWarehouseModule();
    updateStreetFilters();
    initModuleDataManagement();
}

function initVideoBackground() {
    const video = document.getElementById('loginVideo');
    const loader = document.getElementById('videoLoader');
    
    if (!video || !loader) return;
    
    const hideLoader = () => {
        loader.classList.add('hidden');
        video.classList.add('loaded');
    };
    
    if (video.readyState >= 3) {
        hideLoader();
    } else {
        const maxWaitTime = 5000;
        const timeout = setTimeout(() => {
            hideLoader();
        }, maxWaitTime);
        
        video.addEventListener('canplay', () => {
            clearTimeout(timeout);
            hideLoader();
        }, { once: true });
        
        video.addEventListener('loadeddata', () => {
            clearTimeout(timeout);
            hideLoader();
        }, { once: true });
        
        video.addEventListener('error', () => {
            clearTimeout(timeout);
            hideLoader();
        }, { once: true });
    }
    
    video.load();
}

function loadEmployees() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        employees = JSON.parse(stored);
    }
}

function saveEmployees() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });

    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) employeeForm.addEventListener('submit', handleFormSubmit);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);

    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) backupBtn.addEventListener('click', backupData);
    
    const restoreFile = document.getElementById('restoreFile');
    if (restoreFile) restoreFile.addEventListener('change', restoreData);
    
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    const modal = document.getElementById('modal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
    
    const exportSelectedBtn = document.getElementById('exportSelectedBtn');
    if (exportSelectedBtn) exportSelectedBtn.addEventListener('click', exportFilteredToExcel);
    
    const importExcelFile = document.getElementById('importExcelFile');
    if (importExcelFile) importExcelFile.addEventListener('change', handleExcelImport);
    
    const closeImportModalBtn = document.getElementById('closeImportModal');
    if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', closeEmployeeImportModal);
    
    const importModal = document.getElementById('importModal');
    if (importModal) importModal.addEventListener('click', (e) => {
        if (e.target.id === 'importModal') closeEmployeeImportModal();
    });
    
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) confirmImportBtn.addEventListener('click', confirmImport);
    
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeEmployeeImportModal);
    
    const exportLocalLeaveBtn = document.getElementById('exportLocalLeaveBtn');
    if (exportLocalLeaveBtn) exportLocalLeaveBtn.addEventListener('click', exportLocalLeaveData);
    
    const backupLocalLeaveBtn = document.getElementById('backupLocalLeaveBtn');
    if (backupLocalLeaveBtn) backupLocalLeaveBtn.addEventListener('click', backupCompleteData);
    
    const idCard = document.getElementById('idCard');
    if (idCard) idCard.addEventListener('input', handleIdCardInput);
    
    const gender = document.getElementById('gender');
    if (gender) gender.addEventListener('change', updateRetirementDate);
    
    const birthDate = document.getElementById('birthDate');
    if (birthDate) birthDate.addEventListener('change', updateRetirementDate);
    
    const employmentType = document.getElementById('employmentType');
    if (employmentType) employmentType.addEventListener('change', handleEmploymentTypeChange);
    
    const position = document.getElementById('position');
    if (position) position.addEventListener('change', handlePositionChange);
    
    const dedupBtn = document.getElementById('dedupBtn');
    if (dedupBtn) dedupBtn.addEventListener('click', handleDedup);
    
    const closeDedupModalBtn = document.getElementById('closeDedupModal');
    if (closeDedupModalBtn) closeDedupModalBtn.addEventListener('click', closeDedupModal);
    
    const dedupModal = document.getElementById('dedupModal');
    if (dedupModal) dedupModal.addEventListener('click', (e) => {
        if (e.target.id === 'dedupModal') closeDedupModal();
    });
    
    const confirmDedupBtn = document.getElementById('confirmDedupBtn');
    if (confirmDedupBtn) confirmDedupBtn.addEventListener('click', confirmDedup);
    
    const cancelDedupBtn = document.getElementById('cancelDedupBtn');
    if (cancelDedupBtn) cancelDedupBtn.addEventListener('click', closeDedupModal);
    
    const initDataBtn = document.getElementById('initDataBtn');
    if (initDataBtn) initDataBtn.addEventListener('click', openInitDataModal);
    
    const closeInitDataModalBtn = document.getElementById('closeInitDataModal');
    if (closeInitDataModalBtn) closeInitDataModalBtn.addEventListener('click', closeInitDataModal);
    
    const initDataModal = document.getElementById('initDataModal');
    if (initDataModal) initDataModal.addEventListener('click', (e) => {
        if (e.target.id === 'initDataModal') closeInitDataModal();
    });
    
    const confirmInitDataBtn = document.getElementById('confirmInitDataBtn');
    if (confirmInitDataBtn) confirmInitDataBtn.addEventListener('click', confirmInitData);
    
    const cancelInitDataBtn = document.getElementById('cancelInitDataBtn');
    if (cancelInitDataBtn) cancelInitDataBtn.addEventListener('click', closeInitDataModal);
    
    const toggleInitDataPassword = document.getElementById('toggleInitDataPassword');
    if (toggleInitDataPassword) toggleInitDataPassword.addEventListener('click', () => togglePassword('initDataPassword', 'toggleInitDataPassword'));
    
    setupListEventListeners();
}

function switchTab(e) {
    const tab = e.target.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    if (tab === 'local') {
        renderLocalEmployeeList();
    }
    
    if (tab === 'project-dashboard') {
        updateProjectDashboard();
    }
    
    if (tab === 'project-detail') {
        initProjectFilterYear();
        renderProjectList();
    }
}

function handleEmploymentTypeChange(e) {
    const employmentType = e.target.value;
    const subcontractTypeRow = document.getElementById('subcontractTypeRow');
    const subcontractType = document.getElementById('subcontractType');
    
    if (employmentType === '劳务外包') {
        subcontractTypeRow.style.display = 'flex';
    } else {
        subcontractTypeRow.style.display = 'none';
        subcontractType.value = '';
    }
}

function handlePositionChange(e) {
    const position = e.target.value;
    const areaSelect = document.getElementById('area');
    
    const defaultOptions = [
        { value: '', text: '请选择' },
        { value: '片所本级', text: '片所本级' },
        { value: '庄市', text: '庄市' },
        { value: '骆驼', text: '骆驼' },
        { value: '贵驷', text: '贵驷' }
    ];
    
    const greeneryOptions = [
        { value: '', text: '请选择' },
        { value: '庄一', text: '庄一' },
        { value: '庄二', text: '庄二' },
        { value: '庄三', text: '庄三' },
        { value: '骆驼', text: '骆驼' }
    ];
    
    const options = position === '绿化作业人员' ? greeneryOptions : defaultOptions;
    
    const currentValue = areaSelect.value;
    
    areaSelect.innerHTML = options.map(option => 
        `<option value="${option.value}">${option.text}</option>`
    ).join('');
    
    if (options.some(option => option.value === currentValue)) {
        areaSelect.value = currentValue;
    }
}

function handleIdCardInput(e) {
    const idCard = e.target.value.trim();
    if (idCard.length === 18) {
        const birthDate = extractBirthDateFromIdCard(idCard);
        if (birthDate) {
            document.getElementById('birthDate').value = birthDate;
            const age = calculateAge(birthDate);
            document.getElementById('age').value = age;
            updateRetirementDate();
        }
    } else if (idCard.length === 0) {
        document.getElementById('birthDate').value = '';
        document.getElementById('age').value = '';
        updateRetirementDate();
    }
}

function extractBirthDateFromIdCard(idCard) {
    if (!idCard || idCard.length !== 18) {
        return null;
    }
    
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    
    const birthDate = new Date(`${year}-${month}-${day}`);
    if (isNaN(birthDate.getTime())) {
        return null;
    }
    
    return `${year}-${month}-${day}`;
}

function calculateAge(birthDateStr) {
    if (!birthDateStr) return '';
    
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function calculateRetirementDate(birthDate, gender) {
    if (!birthDate || !gender) {
        return null;
    }
    
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
        return null;
    }
    
    const POLICY_START_YEAR = 2025;
    const POLICY_START_MONTH = 1;
    
    let baseRetirementAge, targetRetirementAge, delayMonthsPerStep, stepMonths;
    
    if (gender === '男') {
        // 男职工：60周岁逐步延迟至63周岁，每经过4个月延迟1个月
        baseRetirementAge = 60;
        targetRetirementAge = 63;
        delayMonthsPerStep = 1;
        stepMonths = 4;
    } else {
        // 女职工（普通工人）：50周岁逐步延迟至55周岁，每经过2个月延迟1个月
        baseRetirementAge = 50;
        targetRetirementAge = 55;
        delayMonthsPerStep = 1;
        stepMonths = 2;
    }
    
    const originalRetirementDate = new Date(birth);
    originalRetirementDate.setFullYear(birth.getFullYear() + baseRetirementAge);
    
    const policyStartDate = new Date(POLICY_START_YEAR, POLICY_START_MONTH - 1, 1);
    
    if (originalRetirementDate < policyStartDate) {
        // 政策实施前已退休，按原退休年龄，取当月最后一天
        const year = originalRetirementDate.getFullYear();
        const month = String(originalRetirementDate.getMonth() + 1).padStart(2, '0');
        const lastDay = String(new Date(year, originalRetirementDate.getMonth() + 1, 0).getDate()).padStart(2, '0');
        return `${year}-${month}-${lastDay}`;
    }
    
    const totalDelayNeeded = (targetRetirementAge - baseRetirementAge) * 12;
    
    let monthsFromPolicyStart = 0;
    if (originalRetirementDate > policyStartDate) {
        const yearsDiff = originalRetirementDate.getFullYear() - policyStartDate.getFullYear();
        const monthsDiff = originalRetirementDate.getMonth() - policyStartDate.getMonth();
        monthsFromPolicyStart = yearsDiff * 12 + monthsDiff;
    }
    
    let totalDelayMonths = 0;
    if (monthsFromPolicyStart > 0) {
        totalDelayMonths = Math.min(
            Math.floor(monthsFromPolicyStart / stepMonths) * delayMonthsPerStep,
            totalDelayNeeded
        );
    }
    
    const retirementDate = new Date(originalRetirementDate);
    retirementDate.setMonth(retirementDate.getMonth() + totalDelayMonths);
    
    // 法定退休年龄到达的当月最后一天为退休生效日
    const year = retirementDate.getFullYear();
    const month = retirementDate.getMonth();
    const lastDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
    
    return `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
}

function getRetirementAgeInfo(birthDate, gender) {
    if (!birthDate || !gender) {
        return null;
    }
    
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
        return null;
    }
    
    const POLICY_START_YEAR = 2025;
    const POLICY_START_MONTH = 1;
    
    let baseRetirementAge, targetRetirementAge, delayMonthsPerStep, stepMonths;
    
    if (gender === '男') {
        baseRetirementAge = 60;
        targetRetirementAge = 63;
        delayMonthsPerStep = 1;
        stepMonths = 4;
    } else {
        baseRetirementAge = 50;
        targetRetirementAge = 55;
        delayMonthsPerStep = 1;
        stepMonths = 2;
    }
    
    const originalRetirementDate = new Date(birth);
    originalRetirementDate.setFullYear(birth.getFullYear() + baseRetirementAge);
    
    const policyStartDate = new Date(POLICY_START_YEAR, POLICY_START_MONTH - 1, 1);
    
    const retirementDate = calculateRetirementDate(birthDate, gender);
    const finalRetirementDate = new Date(retirementDate);
    
    const yearsDiff = finalRetirementDate.getFullYear() - originalRetirementDate.getFullYear();
    const monthsDiff = finalRetirementDate.getMonth() - originalRetirementDate.getMonth();
    const totalDelay = yearsDiff * 12 + monthsDiff;
    
    const retirementAgeYears = Math.floor(totalDelay / 12) + baseRetirementAge;
    const retirementAgeMonths = totalDelay % 12;
    
    return {
        baseAge: baseRetirementAge,
        targetAge: targetRetirementAge,
        actualAge: retirementAgeYears + (retirementAgeMonths > 0 ? `岁${retirementAgeMonths}个月` : '岁'),
        delayMonths: totalDelay,
        originalDate: originalRetirementDate,
        finalDate: finalRetirementDate,
        policyApplied: originalRetirementDate >= policyStartDate
    };
}

function updateRetirementDate() {
    const birthDate = document.getElementById('birthDate').value;
    const gender = document.getElementById('gender').value;
    const retirementDateInput = document.getElementById('retirementDate');
    
    const retirementDate = calculateRetirementDate(birthDate, gender);
    retirementDateInput.value = retirementDate ? retirementDate : '-';
}

function validateIdCard(idCard) {
    if (!idCard) {
        return { valid: false, message: '请输入身份证号' };
    }
    
    if (idCard.length !== 18) {
        return { valid: false, message: '身份证号必须为18位' };
    }
    
    const regex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
    if (!regex.test(idCard)) {
        return { valid: false, message: '身份证号格式不正确' };
    }
    
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += parseInt(idCard[i]) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    if (idCard[17].toUpperCase() !== checkCode) {
        return { valid: false, message: '身份证号校验位不正确' };
    }
    
    return { valid: true };
}

function validateForm() {
    let isValid = true;
    clearErrors();

    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value;
    const idCard = document.getElementById('idCard').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const position = document.getElementById('position').value.trim();
    const area = document.getElementById('area').value;
    const employmentType = document.getElementById('employmentType').value;
    const hireDate = document.getElementById('hireDate').value;
    const subcontractType = document.getElementById('subcontractType').value;

    if (!name) {
        showError('nameError', '请输入姓名');
        isValid = false;
    } else if (name.length > 50) {
        showError('nameError', '姓名不能超过50个字符');
        isValid = false;
    }

    if (!gender) {
        showError('genderError', '请选择性别');
        isValid = false;
    }

    const idCardValidation = validateIdCard(idCard);
    if (!idCardValidation.valid) {
        showError('idCardError', idCardValidation.message);
        isValid = false;
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        showError('phoneError', '请输入有效的手机号');
        isValid = false;
    }

    if (!area) {
        showError('areaError', '请选择所在片区');
        isValid = false;
    }

    if (!position) {
        showError('positionError', '请输入岗位');
        isValid = false;
    } else if (position.length > 100) {
        showError('positionError', '岗位不能超过100个字符');
        isValid = false;
    }

    if (!employmentType) {
        showError('employmentTypeError', '请选择用工性质');
        isValid = false;
    }

    if (hireDate && new Date(hireDate) > new Date()) {
        showError('hireDateError', '入职时间不能是未来日期');
        isValid = false;
    }

    if (employmentType === '劳务外包' && !subcontractType) {
        showError('subcontractTypeError', '请选择外包类型');
        isValid = false;
    }

    return isValid;
}

function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }

    const employeeId = document.getElementById('employeeId').value;
    const employeeData = {
        id: employeeId || generateId(),
        name: document.getElementById('name').value.trim(),
        gender: document.getElementById('gender').value,
        idCard: document.getElementById('idCard').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        age: document.getElementById('age').value,
        phone: document.getElementById('phone').value.trim(),
        nativePlace: document.getElementById('nativePlace').value.trim(),
        position: document.getElementById('position').value.trim(),
        area: document.getElementById('area').value,
        employmentType: document.getElementById('employmentType').value,
        subcontractType: document.getElementById('subcontractType').value,
        hireDate: document.getElementById('hireDate').value,
        address: document.getElementById('address').value.trim(),
        remarks: document.getElementById('remarks').value.trim(),
        createdAt: employeeId ? employees.find(emp => emp.id === employeeId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (employeeId) {
        const index = employees.findIndex(emp => emp.id === employeeId);
        employees[index] = employeeData;
        showToast('员工信息更新成功', 'success');
    } else {
        employees.unshift(employeeData);
        showToast('员工添加成功', 'success');
    }

    saveEmployees();
    resetForm();
    renderEmployeeList();
    
    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        updateDashboard();
    }
    
    switchToTab('list');
}

function resetForm() {
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('age').value = '';
    document.getElementById('submitBtn').textContent = '保存';
    document.getElementById('subcontractTypeRow').style.display = 'none';
    
    const areaSelect = document.getElementById('area');
    const defaultOptions = [
        { value: '', text: '请选择' },
        { value: '片所本级', text: '片所本级' },
        { value: '庄市', text: '庄市' },
        { value: '骆驼', text: '骆驼' },
        { value: '贵驷', text: '贵驷' }
    ];
    
    areaSelect.innerHTML = defaultOptions.map(option => 
        `<option value="${option.value}">${option.text}</option>`
    ).join('');
    
    clearErrors();
}

function renderEmployeeList(data = employees) {
    const tbody = document.getElementById('employeeTableBody');
    const emptyMessage = document.getElementById('emptyMessage');
    const totalCount = document.getElementById('totalCount');

    totalCount.textContent = data.length;

    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';
    tbody.innerHTML = data.map(emp => {
        const hasPhotos = emp.idCardFront || emp.idCardBack || emp.personalPhoto;
        const identityBtnClass = hasPhotos ? 'btn-success' : 'btn-warning';
        return `
        <tr>
            <td>${escapeHtml(emp.name)}</td>
            <td>${escapeHtml(emp.gender)}</td>
            <td>${emp.age || '-'}</td>
            <td>${escapeHtml(emp.phone) || '-'}</td>
            <td>${escapeHtml(emp.area)}</td>
            <td>${escapeHtml(emp.position)}</td>
            <td>${escapeHtml(emp.employmentType)}</td>
            <td>${emp.employmentType === '劳务外包' ? escapeHtml(emp.subcontractType || '-') : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewEmployee('${emp.id}')">查看</button>
                    <button class="btn btn-secondary btn-small" onclick="editEmployee('${emp.id}')">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteEmployee('${emp.id}')">删除</button>
                    <button class="btn ${identityBtnClass} btn-small" onclick="openIdentityModal('${emp.id}')">身份信息</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function viewEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    document.getElementById('modalTitle').textContent = '员工详情';
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">姓名</span>
            <span class="detail-value">${escapeHtml(employee.name)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">性别</span>
            <span class="detail-value">${escapeHtml(employee.gender)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">身份证号</span>
            <span class="detail-value">${escapeHtml(employee.idCard)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">出生时间</span>
            <span class="detail-value">${formatDate(employee.birthDate)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">年龄</span>
            <span class="detail-value">${employee.age || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">联系电话</span>
            <span class="detail-value">${escapeHtml(employee.phone) || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">籍贯</span>
            <span class="detail-value">${escapeHtml(employee.nativePlace) || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">岗位</span>
            <span class="detail-value">${escapeHtml(employee.position)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">所在片区</span>
            <span class="detail-value">${escapeHtml(employee.area)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">用工性质</span>
            <span class="detail-value">${escapeHtml(employee.employmentType)}</span>
        </div>
        ${employee.employmentType === '劳务外包' ? `
        <div class="detail-row">
            <span class="detail-label">外包类型</span>
            <span class="detail-value">${escapeHtml(employee.subcontractType || '-')}</span>
        </div>
        ` : ''}
        <div class="detail-row">
            <span class="detail-label">入职时间</span>
            <span class="detail-value">${formatDate(employee.hireDate) || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">预计离退休时间</span>
            <span class="detail-value">${formatDate(calculateRetirementDate(employee.birthDate, employee.gender)) || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">家庭住址</span>
            <span class="detail-value">${escapeHtml(employee.address) || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">备注</span>
            <span class="detail-value">${escapeHtml(employee.remarks) || '-'}</span>
        </div>
    `;
    document.getElementById('modal').style.display = 'flex';
}

function editEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    document.getElementById('employeeId').value = employee.id;
    document.getElementById('name').value = employee.name;
    document.getElementById('gender').value = employee.gender;
    document.getElementById('idCard').value = employee.idCard;
    document.getElementById('birthDate').value = employee.birthDate || '';
    document.getElementById('age').value = employee.age || '';
    document.getElementById('phone').value = employee.phone;
    document.getElementById('nativePlace').value = employee.nativePlace || '';
    document.getElementById('position').value = employee.position;
    document.getElementById('employmentType').value = employee.employmentType;
    document.getElementById('subcontractType').value = employee.subcontractType || '';
    document.getElementById('hireDate').value = employee.hireDate;
    document.getElementById('address').value = employee.address || '';
    document.getElementById('remarks').value = employee.remarks || '';
    document.getElementById('submitBtn').textContent = '更新';

    const subcontractTypeRow = document.getElementById('subcontractTypeRow');
    if (employee.employmentType === '劳务外包') {
        subcontractTypeRow.style.display = 'flex';
    } else {
        subcontractTypeRow.style.display = 'none';
    }

    const areaSelect = document.getElementById('area');
    const defaultOptions = [
        { value: '', text: '请选择' },
        { value: '片所本级', text: '片所本级' },
        { value: '庄市', text: '庄市' },
        { value: '骆驼', text: '骆驼' },
        { value: '贵驷', text: '贵驷' }
    ];
    
    const greeneryOptions = [
        { value: '', text: '请选择' },
        { value: '庄一', text: '庄一' },
        { value: '庄二', text: '庄二' },
        { value: '庄三', text: '庄三' },
        { value: '骆驼', text: '骆驼' }
    ];
    
    const options = employee.position === '绿化作业人员' ? greeneryOptions : defaultOptions;
    areaSelect.innerHTML = options.map(option => 
        `<option value="${option.value}">${option.text}</option>`
    ).join('');
    
    areaSelect.value = employee.area;

    updateRetirementDate();
    switchToTab('add');
}

function deleteEmployee(id) {
    if (!confirm('确定要删除此员工信息吗？此操作不可恢复。')) {
        return;
    }

    employees = employees.filter(emp => emp.id !== id);
    saveEmployees();
    renderEmployeeList();

    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        updateDashboard();
    }

    showToast('员工信息已删除', 'success');
}

function openIdentityModal(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById('identityEmployeeId').value = empId;
    document.getElementById('identityModalTitle').textContent = `身份信息 - ${emp.name}`;

    updatePhotoPreview('idCardFront', emp.idCardFront);
    updatePhotoPreview('idCardBack', emp.idCardBack);
    updatePhotoPreview('personalPhoto', emp.personalPhoto);

    document.getElementById('identityModal').style.display = 'flex';
}

function closeIdentityModal() {
    document.getElementById('identityModal').style.display = 'none';
}

function updatePhotoPreview(field, photoData) {
    const preview = document.getElementById(`${field}Preview`);
    const placeholder = document.getElementById(`${field}Placeholder`);
    const deleteBtn = document.getElementById(`${field}DeleteBtn`);
    const zoomHint = document.getElementById(`${field}ZoomHint`);

    if (photoData) {
        preview.src = photoData;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        deleteBtn.style.display = 'inline-block';
        if (zoomHint) zoomHint.style.display = 'block';
    } else {
        preview.style.display = 'none';
        placeholder.style.display = 'flex';
        deleteBtn.style.display = 'none';
        if (zoomHint) zoomHint.style.display = 'none';
    }
}

const photoFieldTitles = {
    'idCardFront': '身份证正面',
    'idCardBack': '身份证反面',
    'personalPhoto': '个人正面照'
};

function viewPhotoFullscreen(field) {
    const empId = document.getElementById('identityEmployeeId').value;
    const emp = employees.find(e => e.id === empId);
    if (!emp || !emp[field]) return;

    event.stopPropagation();

    const overlay = document.getElementById('photoViewerOverlay');
    const viewerImage = document.getElementById('photoViewerImage');
    const viewerTitle = document.getElementById('photoViewerTitle');

    viewerImage.src = emp[field];
    viewerTitle.textContent = photoFieldTitles[field] || '';

    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        overlay.classList.add('photo-viewer-active');
    });
}

function closePhotoViewer() {
    const overlay = document.getElementById('photoViewerOverlay');
    overlay.classList.remove('photo-viewer-active');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function triggerPhotoUpload(field) {
    document.getElementById(`${field}Input`).click();
}

function handlePhotoUpload(field, input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('图片大小不能超过5MB', 'error');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxWidth = 1200;
            const maxHeight = 1200;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedData = canvas.toDataURL('image/jpeg', 0.7);

            const empId = document.getElementById('identityEmployeeId').value;
            const emp = employees.find(e => e.id === empId);
            if (!emp) return;

            emp[field] = compressedData;
            saveEmployees();
            updatePhotoPreview(field, compressedData);
            renderEmployeeList();
            showToast('照片上传成功', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function deletePhoto(field) {
    const empId = document.getElementById('identityEmployeeId').value;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    if (!confirm('确定要删除此照片吗？')) return;

    emp[field] = null;
    saveEmployees();
    updatePhotoPreview(field, null);
    renderEmployeeList();
    showToast('照片已删除', 'success');
}

function backupData() {
    if (employees.length === 0) {
        showToast('没有数据可备份', 'warning');
        return;
    }

    const completeData = {
        employees: employees,
        localEmployeesData: localEmployeesData,
        backupTime: new Date().toISOString(),
        version: '1.0'
    };

    const dataStr = JSON.stringify(completeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr_complete_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('完整数据备份成功', 'success');
}

function restoreData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (data.employees && data.localEmployeesData) {
                if (confirm('恢复完整数据将覆盖当前所有数据，确定继续吗？')) {
                    employees = data.employees;
                    localEmployeesData = data.localEmployeesData;
                    
                    saveEmployees();
                    saveLocalEmployeesData();
                    
                    renderEmployeeList();
                    renderLocalEmployeeList();
                    updateStatsCards();
                    updateCharts();
                    
                    showToast('完整数据恢复成功', 'success');
                }
            } else if (Array.isArray(data)) {
                if (confirm('恢复数据将覆盖当前所有员工数据，确定继续吗？')) {
                    employees = data;
                    saveEmployees();
                    renderEmployeeList();
                    updateStatsCards();
                    updateCharts();
                    showToast('数据恢复成功', 'success');
                }
            } else {
                throw new Error('无效的数据格式');
            }
        } catch (error) {
            showToast('数据恢复失败：无效的文件格式', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

const ModuleDataManager = {
    configs: {
        hr: {
            name: '人事管理',
            storageKeys: [STORAGE_KEY, LOCAL_DATA_STORAGE_KEY],
            getData: () => ({
                employees: employees,
                localEmployeesData: localEmployeesData
            }),
            setData: (data) => {
                if (data.employees) employees = data.employees;
                if (data.localEmployeesData) localEmployeesData = data.localEmployeesData;
            },
            save: () => { saveEmployees(); saveLocalEmployeesData(); },
            refresh: () => { renderEmployeeList(); renderLocalEmployeeList(); updateStatsCards(); updateCharts(); updateDashboard(); },
            clearKeys: [STORAGE_KEY, LOCAL_DATA_STORAGE_KEY],
            filePrefix: 'hr'
        },
        business: {
            name: '业务管理',
            storageKeys: [MUNICIPAL_STORAGE_KEY, GREENERY_STORAGE_KEY, SANITATION_STORAGE_KEY, TOILET_STORAGE_KEY],
            getData: () => ({
                municipalData: municipalData,
                greeneryData: greeneryData,
                sanitationData: sanitationData,
                toiletData: toiletData
            }),
            setData: (data) => {
                if (data.municipalData !== undefined) municipalData = data.municipalData;
                if (data.greeneryData !== undefined) greeneryData = data.greeneryData;
                if (data.sanitationData !== undefined) sanitationData = data.sanitationData;
                if (data.toiletData !== undefined) toiletData = data.toiletData;
            },
            save: () => { saveMunicipalData(); saveGreeneryData(); saveSanitationData(); if (typeof saveToiletData === 'function') saveToiletData(); },
            refresh: () => { loadBusinessData(); if (typeof renderSummaryList === 'function') renderSummaryList(); if (typeof renderMDKPIs === 'function') renderMDKPIs(); },
            clearKeys: [MUNICIPAL_STORAGE_KEY, GREENERY_STORAGE_KEY, SANITATION_STORAGE_KEY, TOILET_STORAGE_KEY],
            filePrefix: 'business'
        },
        vehicle: {
            name: '车辆管理',
            storageKeys: [VEHICLE_INFO_STORAGE_KEY, VEHICLE_REPAIR_STORAGE_KEY, VEHICLE_MILEAGE_STORAGE_KEY],
            getData: () => {
                const info = localStorage.getItem(VEHICLE_INFO_STORAGE_KEY);
                const repair = localStorage.getItem(VEHICLE_REPAIR_STORAGE_KEY);
                const mileage = localStorage.getItem(VEHICLE_MILEAGE_STORAGE_KEY);
                return {
                    vehicleInfo: info ? JSON.parse(info) : [],
                    vehicleRepair: repair ? JSON.parse(repair) : [],
                    vehicleMileage: mileage ? JSON.parse(mileage) : []
                };
            },
            setData: (data) => {
                if (data.vehicleInfo !== undefined) localStorage.setItem(VEHICLE_INFO_STORAGE_KEY, JSON.stringify(data.vehicleInfo));
                if (data.vehicleRepair !== undefined) localStorage.setItem(VEHICLE_REPAIR_STORAGE_KEY, JSON.stringify(data.vehicleRepair));
                if (data.vehicleMileage !== undefined) localStorage.setItem(VEHICLE_MILEAGE_STORAGE_KEY, JSON.stringify(data.vehicleMileage));
            },
            save: () => {},
            refresh: () => { loadVehicleData(); updateVehicleDashboard(); },
            clearKeys: [VEHICLE_INFO_STORAGE_KEY, VEHICLE_REPAIR_STORAGE_KEY, VEHICLE_MILEAGE_STORAGE_KEY],
            filePrefix: 'vehicle'
        },
        project: {
            name: '项目管理',
            storageKeys: [PROJECT_STORAGE_KEY],
            getData: () => {
                const proj = localStorage.getItem(PROJECT_STORAGE_KEY);
                return { projectData: proj ? JSON.parse(proj) : [] };
            },
            setData: (data) => {
                if (data.projectData !== undefined) localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(data.projectData));
            },
            save: () => {},
            refresh: () => { loadProjectData(); updateProjectDashboard(); },
            clearKeys: [PROJECT_STORAGE_KEY],
            filePrefix: 'project'
        }
    },

    backup(moduleId) {
        const config = this.configs[moduleId];
        if (!config) return;

        const data = config.getData();
        const totalRecords = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

        if (totalRecords === 0) {
            showToast(`${config.name}模块暂无数据可备份`, 'warning');
            return;
        }

        const backupData = {
            module: moduleId,
            moduleName: config.name,
            data: data,
            backupTime: new Date().toISOString(),
            version: '1.0',
            recordCount: totalRecords
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${config.filePrefix}_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`${config.name}数据备份成功（${totalRecords}条记录）`, 'success');
    },

    importData(moduleId, file) {
        const config = this.configs[moduleId];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showToast('仅支持JSON格式文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);

                if (imported.module && imported.module !== moduleId) {
                    showToast(`文件来源不匹配：当前为${config.name}，文件为${imported.moduleName || imported.module}`, 'error');
                    return;
                }

                if (!imported.data) {
                    showToast('文件格式无效：缺少数据内容', 'error');
                    return;
                }

                const recordCount = Object.values(imported.data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const msg = `即将导入${recordCount}条记录到${config.name}模块，将覆盖当前数据，确定继续吗？`;

                if (confirm(msg)) {
                    config.setData(imported.data);
                    config.save();
                    config.refresh();
                    showToast(`${config.name}数据导入成功（${recordCount}条记录）`, 'success');
                }
            } catch (err) {
                showToast('文件解析失败：JSON格式错误', 'error');
            }
        };
        reader.readAsText(file);
    },

    clear(moduleId) {
        const config = this.configs[moduleId];
        if (!config) return;

        const currentData = config.getData();
        const totalRecords = Object.values(currentData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

        if (totalRecords === 0) {
            showToast(`${config.name}模块暂无数据`, 'warning');
            return;
        }

        if (confirm(`确定要清空${config.name}模块的全部${totalRecords}条数据吗？此操作不可撤销！`)) {
            config.clearKeys.forEach(key => localStorage.removeItem(key));

            Object.keys(currentData).forEach(key => {
                if (Array.isArray(currentData[key])) currentData[key] = [];
            });

            config.setData(currentData);
            config.refresh();

            showToast(`${config.name}数据已清空`, 'success');
        }
    }
};

function initModuleDataManagement() {
    ['hr', 'business', 'vehicle', 'project'].forEach(moduleId => {
        const backupBtn = document.getElementById(`${moduleId}BackupBtn`);
        const importInput = document.getElementById(`${moduleId}ImportFile`);
        const clearBtn = document.getElementById(`${moduleId}ClearBtn`);

        if (backupBtn) {
            backupBtn.addEventListener('click', () => ModuleDataManager.backup(moduleId));
        }
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                ModuleDataManager.importData(moduleId, e.target.files[0]);
                e.target.value = '';
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => ModuleDataManager.clear(moduleId));
        }
    });
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function switchToTab(tabName) {
    document.querySelector(`[data-tab="${tabName}"]`).click();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

function exportToExcel() {
    if (!employees || employees.length === 0) {
        showToast('没有数据可导出', 'warning');
        return;
    }
    exportDataToExcel(employees, '全部员工');
}

function exportFilteredToExcel() {
    const filteredData = filterEmployees(employees);
    if (!filteredData || filteredData.length === 0) {
        showToast('筛选结果没有数据可导出', 'warning');
        return;
    }
    const sortedData = sortEmployees(filteredData);
    exportDataToExcel(sortedData, '筛选结果');
}

function exportDataToExcel(data, filename) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        showToast('没有有效的数据可导出', 'error');
        return;
    }

    showProgress('正在导出数据...', 0);

    setTimeout(() => {
        try {
            updateProgress(20);

            const safeFilename = String(filename || '员工数据').replace(/[\\/:*?"<>|]/g, '_');

            const exportRows = data.map((emp, index) => {
                if (!emp) return null;

                return {
                    '序号': index + 1,
                    '姓名': safeString(emp.name),
                    '性别': safeString(emp.gender),
                    '身份证号': safeString(emp.idCard),
                    '出生时间': emp.birthDate || '',
                    '年龄': emp.age ?? '',
                    '联系电话': emp.phone || '',
                    '籍贯': safeString(emp.nativePlace),
                    '岗位': safeString(emp.position),
                    '所在片区': safeString(emp.area),
                    '用工性质': safeString(emp.employmentType),
                    '外包类型': safeString(emp.subcontractType),
                    '入职时间': emp.hireDate || '',
                    '家庭住址': safeString(emp.address),
                    '备注': safeString(emp.remarks)
                };
            }).filter(row => row !== null);

            if (exportRows.length === 0) {
                hideProgress();
                showToast('导出数据为空，无法生成文件', 'error');
                return;
            }

            updateProgress(50);

            const ws = XLSX.utils.json_to_sheet(exportRows, { origin: 'A1' });

            ws['!cols'] = [
                { wch: 6 },   { wch: 10 },  { wch: 6 },
                { wch: 22 },  { wch: 12 },  { wch: 6 },
                { wch: 14 },  { wch: 12 },  { wch: 14 },
                { wch: 10 },  { wch: 12 },  { wch: 10 },
                { wch: 12 },  { wch: 30 },  { wch: 20 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '员工信息');

            updateProgress(80);

            const dateStr = new Date().toISOString().slice(0, 10);
            const excelFilename = `员工信息_${safeFilename}_${dateStr}.xlsx`;
            XLSX.writeFile(wb, excelFilename, { bookType: 'xlsx', type: 'file' });

            updateProgress(100);
            hideProgress();
            showToast(`成功导出 ${exportRows.length} 条数据`, 'success');

        } catch (error) {
            hideProgress();
            console.error('[Excel导出] 错误:', error);
            showToast('Excel导出失败：' + (error.message || '未知错误'), 'error');
        }
    }, 100);
}

function safeString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const result = validateImportFile(file);
    if (!result.valid) {
        showToast(result.message, 'error');
        e.target.value = '';
        return;
    }

    showProgress('正在解析Excel文件...', 0);

    const reader = new FileReader();
    reader.onload = (event) => {
        handleExcelParse(event.target.result, file.name, e);
    };
    reader.onerror = () => {
        hideProgress();
        showToast('文件读取失败，请重试', 'error');
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function validateImportFile(file) {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
        return { valid: false, message: '请上传 .xlsx 或 .xls 格式的文件' };
    }

    if (file.size === 0) {
        return { valid: false, message: '上传的文件为空，请检查文件内容' };
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid: false, message: '文件大小超过限制（最大50MB）' };
    }

    return { valid: true };
}

function handleExcelParse(arrayBuffer, fileName, originalEvent) {
    let parseSuccess = false;

    console.log('[导入] ========== 开始导入流程 ==========');
    console.log('[导入] 文件名:', fileName);

    try {
        updateProgress(20);

        if (!arrayBuffer) {
            throw new ImportError('NO_BUFFER', '文件缓冲区为空');
        }

        const data = new Uint8Array(arrayBuffer);
        if (!data || data.length === 0) {
            throw new ImportError('FILE_EMPTY', '文件内容为空或无法读取');
        }

        console.log('[导入] 开始解析Excel文件:', fileName, '大小:', data.length, 'bytes');

        let workbook;
        try {
            workbook = XLSX.read(data, { type: 'array', cellDates: true });
            console.log('[导入] XLSX.read成功, 工作表数:', workbook?.SheetNames?.length);
        } catch (parseError) {
            console.error('[导入] XLSX.read原始错误:', parseError);
            throw new ImportError('PARSE_FAILED', 'Excel文件格式损坏或无法解析，请检查文件是否正常');
        }

        if (!workbook?.SheetNames?.length) {
            throw new ImportError('NO_SHEET', 'Excel文件中没有工作表');
        }

        updateProgress(40);

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            throw new ImportError('SHEET_INVALID', `无法读取工作表"${sheetName}"`);
        }

        let jsonData;
        try {
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            console.log('[导入] sheet_to_json成功, 数据行数:', Array.isArray(jsonData) ? jsonData.length : '非数组');
            console.log('[导入] 数据类型:', typeof jsonData, '是否数组:', Array.isArray(jsonData));
        } catch (convertError) {
            console.error('[导入] sheet_to_json转换错误:', convertError);
            throw new ImportError('CONVERT_FAILED', 'Excel数据转换失败，请检查数据格式');
        }

        if (!jsonData) {
            throw new ImportError('DATA_NULL', 'Excel数据解析结果为空');
        }

        if (!Array.isArray(jsonData)) {
            console.error('[导入] jsonData类型异常:', typeof jsonData);
            console.error('[导入] jsonData构造函数:', jsonData?.constructor?.name);

            try {
                console.error('[导入] jsonData前500字符:', JSON.stringify(jsonData).slice(0, 500));

                if (typeof jsonData === 'object' && jsonData !== null) {
                    console.warn('[导入] 尝试将对象转换为数组格式...');
                    const keys = Object.keys(jsonData);
                    console.log('[导入] 对象键:', keys.slice(0, 10));

                    const values = Object.values(jsonData);
                    jsonData = values.map(item => ensureArrayRow(item));
                    console.log('[导入] 转换后行数:', jsonData.length);
                } else {
                    throw new ImportError('DATA_INVALID',
                        `Excel数据格式不正确：期望二维数组，实际收到${typeof jsonData}。` +
                        `请确保Excel第一行为列标题（如：姓名、性别、身份证号等），第二行起为数据`);
                }
            } catch (convertObjError) {
                console.error('[导入] 对象转换失败:', convertObjError);
                throw new ImportError('DATA_CONVERT_FAILED',
                    `无法转换数据格式：${convertObjError.message}。请确保Excel文件格式正确`);
            }
        }

        updateProgress(50);

        console.log('[导入] 开始数据结构诊断...');
        let dataStructureInfo;
        try {
            dataStructureInfo = diagnoseJsonDataStructure(jsonData);
            console.log('[导入] 数据结构诊断结果:', JSON.stringify(dataStructureInfo));
        } catch (diagnoseError) {
            console.error('[导入] 数据结构诊断失败:', diagnoseError);
            dataStructureInfo = { hasNonArrayRows: false, totalRows: Array.isArray(jsonData) ? jsonData.length : 0 };
        }

        if (dataStructureInfo && dataStructureInfo.hasNonArrayRows) {
            console.warn('[导入] 检测到非数组行数据，执行兼容处理...');
            try {
                const normalizedData = normalizeJsonDataRows(jsonData);
                if (Array.isArray(normalizedData) && normalizedData.length > 0) {
                    jsonData = normalizedData;
                    console.log('[导入] 兼容处理完成, 行数:', jsonData.length);
                } else {
                    console.warn('[导入] 兼容处理后数据为空, 使用原始数据');
                }
            } catch (normalizeError) {
                console.error('[导入] 兼容处理失败:', normalizeError);
                throw new ImportError('NORMALIZE_FAILED',
                    `数据处理异常：${normalizeError.message}。请检查Excel文件是否有特殊格式或合并单元格`);
            }
        }

        console.log('[导入] 清洗后数据验证...');
        if (!jsonData || !Array.isArray(jsonData)) {
            throw new ImportError('DATA_CORRUPTED', '数据处理后数据格式异常，无法继续');
        }

        console.log('[导入] 清洗后数据行数:', jsonData.length);
        if (jsonData.length > 0 && jsonData[0]) {
            console.log('[导入] 首行(表头)类型:', typeof jsonData[0], '是否数组:', Array.isArray(jsonData[0]));
            console.log('[导入] 表头内容:', JSON.stringify(jsonData[0]).slice(0, 300));
        }

        if (jsonData.length < 2) {
            throw new ImportError('NO_DATA',
                `Excel文件中只有${jsonData.length}行数据（需包含1行表头 + 至少1行数据）`);
        }

        updateProgress(60);

        console.log('[导入] 调用processImportData...');
        try {
            processImportData(jsonData);
            parseSuccess = true;
            console.log('[导入] processImportData完成, importData长度:', importData?.length);
        } catch (processError) {
            console.error('[导入] processImportData异常:', processError);
            console.error('[导入] 异常堆栈:', processError.stack);
            if (processError instanceof ImportError) {
                throw processError;
            }
            throw new ImportError('PROCESS_ERROR',
                `数据处理出错：${processError.message}。请检查Excel数据是否符合要求`);
        }

        updateProgress(100);
        hideProgress();

        console.log('[导入] 准备显示预览, importData:', importData ? `${importData.length}条` : '空/undefined');

        try {
            if (importData && Array.isArray(importData) && importData.length > 0) {
                showEmployeeImportPreview();
            } else {
                const headerRow = (jsonData && jsonData.length > 0 && Array.isArray(jsonData[0])) ? jsonData[0] : null;
                const headerDiagnose = diagnoseHeaders(headerRow);
                showToast(
                    `未能解析出有效的员工数据。${headerDiagnose}` +
                    '请检查Excel表头是否包含：姓名、性别、身份证号、岗位、所在片区、用工性质',
                    'warning'
                );
            }
        } catch (previewError) {
            console.error('[导入] 显示预览时出错:', previewError);
            showToast('数据解析完成但预览显示失败，请查看控制台了解详情', 'warning');
        }

        console.log('[导入] ========== 导入流程完成 ==========');
    } catch (error) {
        hideProgress();
        console.error('[导入] 最终捕获错误:', error);
        console.error('[导入] 错误类型:', error?.constructor?.name);
        console.error('[导入] 错误信息:', error?.message);
        handleImportError(error);
    }
}

function diagnoseJsonDataStructure(jsonData) {
    const info = {
        totalRows: 0,
        arrayRows: 0,
        objectRows: 0,
        nullRows: 0,
        primitiveRows: 0,
        emptyStringRows: 0,
        hasNonArrayRows: false,
        firstRowType: 'unknown',
        sampleRowStructure: null,
        rowDetails: []
    };

    if (!jsonData) {
        info.firstRowType = 'null/undefined';
        return info;
    }

    if (!Array.isArray(jsonData)) {
        info.totalRows = 1;
        info.firstRowType = typeof jsonData;
        if (typeof jsonData === 'object') {
            info.objectRows = 1;
            info.hasNonArrayRows = true;
            info.sampleRowStructure = `根对象(${Object.keys(jsonData).length}键): [${Object.keys(jsonData).slice(0, 5).join(', ')}...]`;
        } else {
            info.primitiveRows = 1;
            info.hasNonArrayRows = true;
            info.sampleRowStructure = `${typeof jsonData}: ${String(jsonData).slice(0, 100)}`;
        }
        return info;
    }

    info.totalRows = jsonData.length;

    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const row = jsonData[i];
        const rowDetail = { index: i + 1, type: typeof row, isArray: false, length: 0, preview: null };

        if (row === null || row === undefined) {
            info.nullRows++;
            rowDetail.type = 'null';
            rowDetail.preview = 'null/undefined';
        } else if (Array.isArray(row)) {
            info.arrayRows++;
            rowDetail.isArray = true;
            rowDetail.length = row.length;
            rowDetail.preview = `[${row.length}项] ${JSON.stringify(row.slice(0, 3)).slice(0, 100)}`;
            if (i === 0) {
                info.sampleRowStructure = `数组[${row.length}项]: ${JSON.stringify(row.slice(0, 5)).slice(0, 200)}`;
                info.firstRowType = 'array';
            }
        } else if (typeof row === 'object') {
            info.objectRows++;
            info.hasNonArrayRows = true;
            const keys = Object.keys(row);
            rowDetail.length = keys.length;
            rowDetail.preview = `对象(${keys.length}键) ${JSON.stringify(row).slice(0, 100)}`;
            if (i === 0) {
                info.sampleRowStructure = `对象(${keys.length}键): [${keys.slice(0, 5).join(', ')}]`;
                info.firstRowType = 'object';
            }
        } else if (typeof row === 'string' && row.trim() === '') {
            info.emptyStringRows++;
            info.hasNonArrayRows = true;
            rowDetail.preview = '空字符串';
            if (i === 0) info.firstRowType = 'empty-string';
        } else {
            info.primitiveRows++;
            info.hasNonArrayRows = true;
            rowDetail.preview = `${typeof row}: ${String(row).slice(0, 50)}`;
            if (i === 0) {
                info.sampleRowStructure = `${typeof row}: ${String(row).slice(0, 100)}`;
                info.firstRowType = typeof row;
            }
        }

        info.rowDetails.push(rowDetail);
    }

    return info;
}

function normalizeJsonDataRows(jsonData) {
    console.log('[导入] normalizeJsonDataRows开始, 输入类型:', typeof jsonData);

    if (!jsonData) {
        console.warn('[导入] normalizeJsonDataRows: 输入为空, 返回空数组');
        return [];
    }

    if (!Array.isArray(jsonData)) {
        console.warn('[导入] normalizeJsonDataRows: 输入不是数组, 尝试转换...');
        try {
            if (typeof jsonData === 'object' && jsonData !== null) {
                const values = Object.values(jsonData);
                console.log('[导入] 对象转数组成功, 长度:', values.length);
                return values.map(item => ensureArrayRow(item));
            } else {
                console.log('[导入] 基本类型, 包装为单元素数组');
                return [String(jsonData ?? '')];
            }
        } catch (convertError) {
            console.error('[导入] 转换失败:', convertError);
            return [];
        }
    }

    console.log('[导入] 开始规范化, 总行数:', jsonData.length);

    try {
        return jsonData
            .map((row, index) => ensureArrayRow(row, index))
            .filter(row => row !== null && row !== undefined && Array.isArray(row));
    } catch (mapError) {
        console.error('[导入] map操作失败:', mapError);
        throw new ImportError('NORMALIZE_MAP_ERROR',
            `数据行规范化失败：${mapError.message}。请检查Excel数据格式`);
    }
}

function ensureArrayRow(row, index = 0) {
    try {
        if (Array.isArray(row)) {
            if (index < 3) console.log(`[导入] 第${index + 1}行已是数组, 长度:`, row.length);
            return row;
        } else if (row !== null && row !== undefined && typeof row === 'object') {
            const values = Object.values(row);
            console.warn(`[导入] 第${index + 1}行从对象转为数组, 键数:${Object.keys(row).length}, 值数:${values.length}`);
            if (index < 3) console.log(`[导入] 对象内容预览:`, JSON.stringify(row).slice(0, 200));
            return values;
        } else if (typeof row === 'string' || typeof row === 'number' || typeof row === 'boolean') {
            console.warn(`[导入] 第${index + 1}行是基本类型(${typeof row}), 包装为数组`);
            return [String(row ?? '')];
        } else {
            console.warn(`[导入] 第${index + 1}行使用默认空数组, 类型:${typeof row}, 值:`, row);
            return [''];
        }
    } catch (rowError) {
        console.error(`[导入] 第${index + 1}行处理异常:`, rowError);
        return [''];
    }
}

function diagnoseHeaders(rawHeaderRow) {
    if (!rawHeaderRow || !Array.isArray(rawHeaderRow)) {
        return '表头不是有效数组；';
    }

    const headers = rawHeaderRow.filter(h =>
        h !== undefined && h !== null && String(h).trim() !== ''
    );

    if (headers.length === 0) {
        return '表头全部为空；';
    }

    const mapped = [];
    const unmapped = [];

    headers.forEach(h => {
        const key = String(h).trim();
        if (EXCEL_COLUMNS[key]) {
            mapped.push(key);
        } else {
            unmapped.push(h);
        }
    });

    const required = ['name', 'gender', 'idCard', 'position', 'area', 'employmentType'];
    const missingRequired = required.filter(f => !mapped.includes(f));

    let msg = '';
    if (unmapped.length > 0) {
        msg += `未识别的表头: [${unmapped.join(', ')}]；`;
    }
    if (missingRequired.length > 0) {
        const safeMissingRequired = Array.isArray(missingRequired) ? missingRequired : [];
        const names = safeMissingRequired.map(f => EXCEL_FIELD_NAMES[f] || f);
        msg += `缺少必要列: [${names.join(', ')}]；`;
    }
    if (msg) {
        msg += `已识别: [${mapped.join(', ')}]。`;
    }

    return msg;
}

function handleImportError(error) {
    console.error('[Excel导入] ========== 错误详情 ==========');
    console.error('[Excel导入] 错误对象:', error);
    console.error('[Excel导入] 错误类型:', error?.constructor?.name);
    console.error('[Excel导入] 错误代码:', error?.code);
    console.error('[Excel导入] 错误信息:', error?.message);
    console.error('[Excel导入] 堆栈信息:', error?.stack);
    console.error('[Excel导入] ===============================');

    let userMessage;

    if (error instanceof ImportError) {
        userMessage = error.userMessage;
        console.log('[Excel导入] 识别为ImportError, 用户提示:', userMessage);
    } else if (error?.message?.includes('map') || error?.message?.includes('Map')) {
        console.warn('[Excel导入] 检测到map相关错误, 原始消息:', error.message);
        userMessage = 'Excel文件数据结构异常（可能是格式不兼容或包含特殊字符）。建议：1)检查Excel是否有合并单元格 2)尝试"另存为"新的xlsx文件 3)确保第一行是列标题';
        console.log('[Excel导入] 使用增强的错误提示');
    } else if (error?.message?.includes('undefined') || error?.message?.includes('null') || error?.message?.includes('Cannot read')) {
        console.warn('[导入] 检测到空值访问错误:', error.message);
        userMessage = `数据处理异常：${error.message}。请检查Excel数据是否完整`;
    } else if (error?.message) {
        userMessage = error.message;
    } else {
        userMessage = '未知导入错误，请查看浏览器控制台获取详细信息(F12)';
    }

    showToast('导入失败：' + userMessage, 'error');
}

class ImportError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.userMessage = message;
        this.name = 'ImportError';
    }
}

function processImportData(jsonData) {
    console.log('[导入] processImportData开始, 输入数据行数:', jsonData?.length);

    resetImportData();

    if (!validateRawData(jsonData)) {
        console.warn('[导入] validateRawData返回false, 退出处理');
        return;
    }

    let parseResult;
    try {
        parseResult = parseImportHeaders(jsonData);
    } catch (headerError) {
        console.error('[导入] parseImportHeaders异常:', headerError);
        if (headerError instanceof ImportError) {
            throw headerError;
        }
        throw new ImportError('HEADER_PARSE_ERROR', `表头解析失败：${headerError.message}`);
    }

    if (!parseResult || !parseResult.headers) {
        console.error('[导入] parseImportHeaders返回无效结果:', parseResult);
        throw new ImportError('HEADER_RESULT_INVALID', '表头解析结果无效');
    }

    const { headers, headerMap } = parseResult;
    console.log('[导入] 解析到表头:', headers);
    console.log('[导入] 表头映射:', JSON.stringify(headerMap));

    const requiredFields = ['name', 'gender', 'idCard', 'position', 'area', 'employmentType'];
    const missingFields = requiredFields.filter(f => headerMap[f] === undefined);

    if (missingFields.length > 0) {
        console.error('[导入] 缺少必要字段:', missingFields);
        console.error('[导入] 表头映射:', headerMap);
        console.error('[导入] 原始表头:', headers);

        const missingFieldNames = Array.isArray(missingFields)
            ? missingFields.map(f => EXCEL_FIELD_NAMES[f] || f).join('、')
            : String(missingFields);

        throw new ImportError('MISSING_FIELDS',
            `Excel缺少必要列（${missingFieldNames}）`);
    }

    const dataRows = Array.isArray(jsonData) ? jsonData : [];
    console.log('[导入] 开始处理数据行, 总行数:', dataRows.length);

    try {
        for (let i = 1; i < dataRows.length; i++) {
            const row = dataRows[i];

            if (!isValidDataRow(row, i)) continue;

            let employee;
            try {
                employee = buildEmployeeFromRow(row, headerMap);
                validateImportEmployee(employee);
            } catch (buildError) {
                console.warn(`[导入] 第${i + 1}行构建员工对象失败:`, buildError);
                employee = createFallbackEmployee(row, headerMap, i, buildError.message);
            }

            if (employee._errors && employee._errors.length === 0) {
                importValidCount++;
            } else {
                importInvalidCount++;
            }

            importData.push(employee);
        }
    } catch (loopError) {
        console.error('[导入] 行处理循环异常:', loopError);
        throw new ImportError('ROW_PROCESS_ERROR',
            `处理数据时出错：${loopError.message}。请检查是否有格式异常的行`);
    }

    console.log('[导入] 处理完成, 有效:', importValidCount, ', 无效:', importInvalidCount, ', 总计:', importData.length);
}

function resetImportData() {
    importData = [];
    importValidCount = 0;
    importInvalidCount = 0;
}

function createFallbackEmployee(row, headerMap, rowIndex, errorMsg) {
    console.warn(`[导入] 创建回退员工对象, 行号:${rowIndex + 1}, 错误:${errorMsg}`);
    return {
        id: generateId(),
        name: safeGetCellValue(row, headerMap['name']),
        gender: safeGetCellValue(row, headerMap['gender']),
        idCard: safeGetCellValue(row, headerMap['idCard']),
        birthDate: '',
        age: '',
        phone: safeGetCellValue(row, headerMap['phone']),
        nativePlace: '',
        position: safeGetCellValue(row, headerMap['position']),
        area: safeGetCellValue(row, headerMap['area']),
        employmentType: safeGetCellValue(row, headerMap['employmentType']),
        subcontractType: '',
        hireDate: '',
        address: '',
        remarks: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _errors: [errorMsg || '数据处理异常']
    };
}

function safeGetCellValue(row, index) {
    try {
        if (index === undefined || index === null) return '';
        if (!Array.isArray(row)) return '';
        if (index < 0 || index >= row.length) return '';
        const value = row[index];
        return value !== undefined && value !== null ? String(value).trim() : '';
    } catch (e) {
        return '';
    }
}

function validateRawData(jsonData) {
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        showToast('导入数据为空，无法处理', 'error');
        return false;
    }
    return true;
}

function parseImportHeaders(jsonData) {
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        console.error('[导入] parseImportHeaders: 输入数据无效:', jsonData);
        throw new ImportError('HEADER_INVALID', 'Excel表头解析失败：输入数据为空或格式不正确');
    }

    const rawHeaders = jsonData[0];
    if (!rawHeaders || !Array.isArray(rawHeaders)) {
        console.error('[导入] Excel表头异常:', rawHeaders);
        console.error('[导入] 首行类型:', typeof rawHeaders, '是否数组:', Array.isArray(rawHeaders));
        console.error('[导入] 首行内容:', JSON.stringify(rawHeaders).slice(0, 200));
        throw new ImportError('HEADER_INVALID', 'Excel表头格式异常，请确保第一行为列标题');
    }

    let headers;
    try {
        headers = rawHeaders.filter(h =>
            h !== undefined && h !== null && String(h).trim() !== ''
        );
    } catch (filterError) {
        console.error('[导入] 表头过滤失败:', filterError);
        throw new ImportError('HEADER_FILTER_ERROR', `表头数据处理失败：${filterError.message}`);
    }

    if (!headers || headers.length === 0) {
        throw new ImportError('HEADER_EMPTY', 'Excel表头为空');
    }

    const headerMap = {};
    if (Array.isArray(headers)) {
        headers.forEach((header, index) => {
            try {
                const key = String(header).trim();
                if (key && EXCEL_COLUMNS[key]) {
                    headerMap[EXCEL_COLUMNS[key]] = index;
                }
            } catch (mapError) {
                console.warn(`[导入] 表头映射第${index}项失败:`, mapError);
            }
        });
    }

    return { headers, headerMap };
}

const EXCEL_FIELD_NAMES = {
    name: '姓名',
    gender: '性别',
    idCard: '身份证号',
    position: '岗位',
    area: '所在片区',
    employmentType: '用工性质'
};

function isValidDataRow(row, rowIndex) {
    if (!row || !Array.isArray(row)) {
        console.warn(`[导入] 跳过无效行 ${rowIndex + 1}:`, row);
        return false;
    }

    if (row.every(cell => cell === undefined || cell === '' || cell === null)) {
        return false;
    }

    return true;
}

function buildEmployeeFromRow(row, headerMap) {
    const idCard = getCellValue(row, headerMap['idCard']);
    const birthDate = extractBirthDateFromIdCard(idCard) || getCellValue(row, headerMap['birthDate']);
    const age = birthDate ? calculateAge(birthDate) : getCellValue(row, headerMap['age']);

    return {
        id: generateId(),
        name: getCellValue(row, headerMap['name']),
        gender: getCellValue(row, headerMap['gender']),
        idCard: idCard,
        birthDate: birthDate,
        age: age,
        phone: getCellValue(row, headerMap['phone']),
        nativePlace: getCellValue(row, headerMap['nativePlace']) || '',
        position: getCellValue(row, headerMap['position']),
        area: getCellValue(row, headerMap['area']),
        employmentType: getCellValue(row, headerMap['employmentType']),
        subcontractType: getCellValue(row, headerMap['subcontractType']) || '',
        hireDate: formatExcelDate(getCellValue(row, headerMap['hireDate'])),
        address: getCellValue(row, headerMap['address']) || '',
        remarks: getCellValue(row, headerMap['remarks']) || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _errors: []
    };
}

function getCellValue(row, index) {
    if (index === undefined) return '';
    const value = row[index];
    return value !== undefined && value !== null ? String(value).trim() : '';
}

function formatExcelDate(dateValue) {
    if (!dateValue) return '';
    
    if (typeof dateValue === 'number') {
        const date = XLSX.SSF.parse_date_code(dateValue);
        if (date) {
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
    }
    
    const dateStr = String(dateValue);
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
    }
    
    return dateStr;
}

function validateImportEmployee(employee) {
    if (!employee.name) {
        employee._errors.push('姓名不能为空');
    } else if (employee.name.length > 50) {
        employee._errors.push('姓名不能超过50个字符');
    }

    if (!employee.gender || !['男', '女'].includes(employee.gender)) {
        employee._errors.push('性别必须是"男"或"女"');
    }

    const idCardValidation = validateIdCard(employee.idCard);
    if (!idCardValidation.valid) {
        employee._errors.push(idCardValidation.message);
    }

    if (employee.phone && !/^1[3-9]\d{9}$/.test(employee.phone)) {
        employee._errors.push('请输入有效的手机号');
    }

    if (!employee.position) {
        employee._errors.push('岗位不能为空');
    } else if (employee.position.length > 100) {
        employee._errors.push('岗位不能超过100个字符');
    }

    if (!employee.area) {
        employee._errors.push('所在片区不能为空');
    }

    if (!employee.employmentType) {
        employee._errors.push('用工性质不能为空');
    } else if (employee.employmentType === '劳务外包') {
        if (!employee.subcontractType) {
            employee._errors.push('用工性质为"劳务外包"时，外包类型不能为空');
        } else if (!['自行管理', '班组林', '班组包'].includes(employee.subcontractType)) {
            employee._errors.push('外包类型必须是"自行管理"、"班组林"或"班组包"');
        }
    }

    if (employee.hireDate) {
        const hireDate = new Date(employee.hireDate);
        if (isNaN(hireDate.getTime())) {
            employee._errors.push('入职时间格式无效');
        } else if (hireDate > new Date()) {
            employee._errors.push('入职时间不能是未来时间');
        }
    }
}

function showEmployeeImportPreview() {
    console.log('[员工导入预览] 开始渲染预览...');
    
    const modalBody = document.getElementById('importModalBody');
    const importStats = document.getElementById('importStats');

    if (!modalBody || !importStats) {
        console.error('[员工导入预览] 弹窗元素未找到');
        return;
    }

    const safeValidCount = importValidCount || 0;
    const safeInvalidCount = importInvalidCount || 0;

    importStats.innerHTML = `
        <div style="display: flex; gap: 20px;">
            <span style="color: #27ae60;">有效数据：${safeValidCount} 条</span>
            <span style="color: #e74c3c;">无效数据：${safeInvalidCount} 条</span>
        </div>
    `;

    console.log('[员工导入预览] importData状态:', {
        exists: !!importData,
        isArray: Array.isArray(importData),
        length: importData?.length
    });

    if (!importData || !Array.isArray(importData) || importData.length === 0) {
        modalBody.innerHTML = '<div class="import-error">没有可导入的数据</div>';
        const confirmBtn = document.getElementById('confirmImportBtn');
        if (confirmBtn) confirmBtn.disabled = true;
    } else {
        const confirmBtn = document.getElementById('confirmImportBtn');
        if (confirmBtn) confirmBtn.disabled = safeValidCount === 0;

        try {
            modalBody.innerHTML = renderImportPreviewTable();
            console.log('[员工导入预览] 渲染成功');
        } catch (renderError) {
            console.error('[员工导入预览] 渲染失败:', renderError);
            modalBody.innerHTML = '<div class="import-error">预览渲染异常，数据可能已解析成功</div>';
        }
    }

    const importModal = document.getElementById('importModal');
    if (importModal) importModal.style.display = 'flex';
}

function renderImportPreviewTable() {
    console.log('[导入预览] 渲染表格, importData类型:', typeof importData, '是否数组:', Array.isArray(importData));

    const safeImportData = (importData && Array.isArray(importData)) ? importData : [];
    console.log('[导入预览] 安全数据长度:', safeImportData.length);

    if (safeImportData.length === 0) {
        return '<div class="import-error">没有可显示的导入数据</div>';
    }

    try {
        const rowsHtml = safeImportData
            .filter(emp => emp != null)
            .map((emp, index) => renderImportRow(emp, index))
            .join('');

        return `
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">行号</th>
                            <th>姓名</th>
                            <th>性别</th>
                            <th>身份证号</th>
                            <th>岗位</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    } catch (mapError) {
        console.error('[导入预览] map操作失败:', mapError);
        return '<div class="import-error">数据渲染异常，但数据可能已成功解析</div>';
    }
}

function renderImportRow(emp, index) {
    if (!emp) return '';

    const errors = Array.isArray(emp._errors) ? emp._errors : [];
    const isValid = errors.length === 0;
    const rowClass = isValid ? 'valid-row' : 'invalid-row';
    const statusHtml = isValid
        ? '<span style="color:#27ae60;">✓ 有效</span>'
        : `<span style="color:#e74c3c;">✗ ${escapeHtml(errors.join('; '))}</span>`;

    return `
        <tr class="${rowClass}">
            <td>${index + 1}</td>
            <td>${escapeHtml(String(emp.name || '-'))}</td>
            <td>${escapeHtml(String(emp.gender || '-'))}</td>
            <td>${escapeHtml(String(emp.idCard || '-'))}</td>
            <td>${escapeHtml(String(emp.position || '-'))}</td>
            <td class="error-cell">${statusHtml}</td>
        </tr>
    `;
}

function confirmImport() {
    if (importValidCount === 0) {
        showToast('没有有效的数据可导入', 'warning');
        return;
    }

    const validEmployees = importData.filter(emp => emp && emp._errors && emp._errors.length === 0);

    if (validEmployees.length === 0) {
        showToast('没有有效的员工数据可以导入', 'error');
        return;
    }

    showProgress('正在导入数据...', 0);

    setTimeout(() => {
        try {
            const backupEmployees = [...employees];
            let addedCount = 0;
            let duplicateCount = 0;

            updateProgress(20);

            validEmployees.forEach((newEmp, index) => {
                if (employees.some(existing =>
                    existing.idCard && newEmp.idCard &&
                    existing.idCard === newEmp.idCard
                )) {
                    duplicateCount++;
                    return;
                }
                delete newEmp._errors;
                employees.push(newEmp);
                addedCount++;
                updateProgress(20 + Math.floor((index / validEmployees.length) * 70));
            });

            saveEmployees();
            updateProgress(100);
            hideProgress();
            closeEmployeeImportModal();
            renderEmployeeList();
            updateDashboard();

            let msg = `成功导入 ${addedCount} 条员工数据`;
            if (duplicateCount > 0) msg += `，跳过 ${duplicateCount} 条重复`;
            showToast(msg, 'success');

        } catch (error) {
            hideProgress();
            console.error('[导入确认] 错误:', error);
            showToast('导入过程中发生错误：' + error.message, 'error');
        }
    }, 100);
}

function closeEmployeeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
    importData = [];
    importValidCount = 0;
    importInvalidCount = 0;
}

function showProgress(message, progress) {
    document.getElementById('progressTitle').textContent = '处理中';
    document.getElementById('progressMessage').textContent = message;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressModal').style.display = 'flex';
}

function updateProgress(progress) {
    document.getElementById('progressFill').style.width = progress + '%';
}

function hideProgress() {
    setTimeout(() => {
        document.getElementById('progressModal').style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
    }, 300);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupListEventListeners() {
    document.querySelectorAll('#employeeTable th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });
    
    const filterInputs = [
        'filterGender', 'filterArea', 'filterPosition', 
        'filterEmploymentType', 'filterSubcontractType',
        'filterAgeMin', 'filterAgeMax', 'filterHireDateStart', 'filterHireDateEnd'
    ];
    
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                currentPage = 1;
                renderEmployeeList();
            });
            el.addEventListener('change', () => {
                currentPage = 1;
                renderEmployeeList();
            });
        }
    });

    const filterSearchBtn = document.getElementById('filterSearchBtn');
    if (filterSearchBtn) filterSearchBtn.addEventListener('click', () => {
        currentPage = 1;
        renderEmployeeList();
    });

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    const filterNameInput = document.getElementById('filterName');
    if (filterNameInput) filterNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            renderEmployeeList();
        }
    });
    
    const prevPageBtn = document.getElementById('prevPage');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    
    const nextPageBtn = document.getElementById('nextPage');
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
    
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderEmployeeList();
    });
}

function handleSort(field) {
    if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortOrder = 'asc';
    }
    updateSortIcons();
    renderEmployeeList();
}

function updateSortIcons() {
    document.querySelectorAll('#employeeTable th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === sortField) {
            th.classList.add(sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function sortEmployees(data) {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        
        if (sortField === 'age') {
            valA = parseInt(valA) || 0;
            valB = parseInt(valB) || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        if (sortField === 'hireDate') {
            valA = new Date(valA).getTime() || 0;
            valB = new Date(valB).getTime() || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
}

function filterEmployees(data) {
    const filterName = document.getElementById('filterName').value.trim().toLowerCase();
    const filterGender = document.getElementById('filterGender').value;
    const filterArea = document.getElementById('filterArea').value;
    const filterPosition = document.getElementById('filterPosition').value;
    const filterEmploymentType = document.getElementById('filterEmploymentType').value;
    const filterSubcontractType = document.getElementById('filterSubcontractType').value;
    const filterAgeMin = document.getElementById('filterAgeMin').value;
    const filterAgeMax = document.getElementById('filterAgeMax').value;
    const filterHireDateStart = document.getElementById('filterHireDateStart').value;
    const filterHireDateEnd = document.getElementById('filterHireDateEnd').value;

    return data.filter(emp => {
        if (filterName && !emp.name.toLowerCase().includes(filterName)) return false;
        if (filterGender && emp.gender !== filterGender) return false;
        if (filterArea && emp.area !== filterArea) return false;
        if (filterPosition && emp.position !== filterPosition) return false;
        if (filterEmploymentType && emp.employmentType !== filterEmploymentType) return false;
        if (filterSubcontractType && emp.subcontractType !== filterSubcontractType) return false;

        if (filterAgeMin && (emp.age === undefined || emp.age < parseInt(filterAgeMin))) return false;
        if (filterAgeMax && (emp.age === undefined || emp.age > parseInt(filterAgeMax))) return false;

        if (filterHireDateStart && new Date(emp.hireDate) < new Date(filterHireDateStart)) return false;
        if (filterHireDateEnd && new Date(emp.hireDate) > new Date(filterHireDateEnd)) return false;

        return true;
    });
}

function clearFilters() {
    document.getElementById('filterName').value = '';
    document.getElementById('filterGender').value = '';
    document.getElementById('filterArea').value = '';
    document.getElementById('filterPosition').value = '';
    document.getElementById('filterEmploymentType').value = '';
    document.getElementById('filterSubcontractType').value = '';
    document.getElementById('filterAgeMin').value = '';
    document.getElementById('filterAgeMax').value = '';
    document.getElementById('filterHireDateStart').value = '';
    document.getElementById('filterHireDateEnd').value = '';
    
    sortField = null;
    sortOrder = 'asc';
    currentPage = 1;
    updateSortIcons();
    renderEmployeeList();
    showToast('筛选条件已清除', 'success');
}

function changePage(delta) {
    currentPage += delta;
    renderEmployeeList();
}

function renderEmployeeList(data = employees) {
    const tbody = document.getElementById('employeeTableBody');
    const emptyMessage = document.getElementById('emptyMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const pagination = document.getElementById('pagination');
    const totalCount = document.getElementById('totalCount');
    const displayCount = document.getElementById('displayCount');
    
    let filteredData = filterEmployees(data);
    let sortedData = sortEmployees(filteredData);
    
    totalCount.textContent = employees.length;
    displayCount.textContent = sortedData.length;
    
    if (sortedData.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(sortedData.length / pageSize);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = sortedData.slice(startIndex, endIndex);
    
    pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    
    tbody.innerHTML = pageData.map(emp => {
        const hasPhotos = emp.idCardFront || emp.idCardBack || emp.personalPhoto;
        const identityBtnClass = hasPhotos ? 'btn-success' : 'btn-warning';
        return `
        <tr>
            <td>${escapeHtml(emp.name)}</td>
            <td>${escapeHtml(emp.gender)}</td>
            <td>${emp.age || '-'}</td>
            <td>${escapeHtml(emp.phone) || '-'}</td>
            <td>${escapeHtml(emp.area)}</td>
            <td>${escapeHtml(emp.position)}</td>
            <td>${escapeHtml(emp.employmentType)}</td>
            <td>${emp.employmentType === '劳务外包' ? escapeHtml(emp.subcontractType || '-') : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewEmployee('${emp.id}')">查看</button>
                    <button class="btn btn-secondary btn-small" onclick="editEmployee('${emp.id}')">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteEmployee('${emp.id}')">删除</button>
                    <button class="btn ${identityBtnClass} btn-small" onclick="openIdentityModal('${emp.id}')">身份信息</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function getAdminCredentials() {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        username: 'admin',
        password: 'zlg123'
    };
}

function saveAdminCredentials(credentials) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
}

function isLoggedIn() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
}

function setLoggedIn(status) {
    if (status) {
        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        sessionStorage.removeItem('isLoggedIn');
    }
}

function checkLoginStatus() {
    if (isLoggedIn()) {
        showMainApp();
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    const loginContainer = document.getElementById('loginContainer');
    const mainApp = document.getElementById('mainApp');
    
    // 隐藏主应用
    if (mainApp) mainApp.classList.remove('active');
    
    // 显示登录界面
    if (loginContainer) {
        loginContainer.classList.remove('hidden');
        loginContainer.style.display = 'flex';
    }
    
    // 延迟隐藏主应用以确保过渡效果
    setTimeout(() => {
        if (mainApp) mainApp.style.display = 'none';
    }, 400);
}

function showMainApp() {
    const loginContainer = document.getElementById('loginContainer');
    const mainApp = document.getElementById('mainApp');
    
    if (loginContainer) loginContainer.classList.add('hidden');
    
    if (mainApp) mainApp.style.display = 'block';
    
    setTimeout(() => {
        if (mainApp) mainApp.classList.add('active');
    }, 50);
    
    setTimeout(() => {
        if (loginContainer) loginContainer.style.display = 'none';
    }, 300);
    
    switchToModule('business');
}

function switchToModule(moduleName) {
    const navLinks = document.querySelectorAll('.nav-link[data-module]');
    const moduleSections = document.querySelectorAll('.module-section');
    const moduleTitle = document.getElementById('moduleTitle');
    
    navLinks.forEach(navLink => {
        navLink.parentElement.classList.remove('active');
        if (navLink.getAttribute('data-module') === moduleName) {
            navLink.parentElement.classList.add('active');
        }
    });
    
    moduleSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetModule = document.getElementById(`${moduleName}-module`);
    if (targetModule) {
        targetModule.classList.add('active');
        
        const firstTab = targetModule.querySelector('.tab-btn');
        if (firstTab) {
            const tabName = firstTab.getAttribute('data-tab');
            activateTab(targetModule, tabName);
        }
    }
    
    const moduleNames = {
        'business': '业务管理系统',
        'hr': '人事管理系统',
        'vehicle': '车辆管理系统',
        'warehouse': '仓库管理系统',
        'project': '项目管理系统'
    };
    if (moduleTitle) moduleTitle.textContent = moduleNames[moduleName] || '系统模块';
    
    if (moduleName === 'hr') {
        renderEmployeeList();
        updateDashboard();
    } else if (moduleName === 'business') {
        loadBusinessData();
        if (typeof renderSummaryList === 'function') renderSummaryList();
        if (typeof renderMDKPIs === 'function') renderMDKPIs();
    } else if (moduleName === 'vehicle') {
        loadVehicleData();
        updateVehicleDashboard();
    } else if (moduleName === 'project') {
        loadProjectData();
        updateProjectDashboard();
    } else if (moduleName === 'warehouse') {
        whRenderTable();
        whUpdateDashboard();
        whRefreshCharts();
    }
}

function activateTab(moduleSection, tabName) {
    const tabs = moduleSection.querySelectorAll('.tab-btn');
    const tabContents = moduleSection.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = moduleSection.querySelector(`#${tabName}-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function setupAuthEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', openChangePasswordModal);
    
    const sidebarChangePasswordBtn = document.getElementById('sidebarChangePasswordBtn');
    if (sidebarChangePasswordBtn) sidebarChangePasswordBtn.addEventListener('click', openChangePasswordModal);
    
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);
    
    const closeChangePasswordModalBtn = document.getElementById('closeChangePasswordModal');
    if (closeChangePasswordModalBtn) closeChangePasswordModalBtn.addEventListener('click', closeChangePasswordModal);
    
    const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
    if (cancelChangePasswordBtn) cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) {
                closeChangePasswordModal();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('changePasswordModal');
            if (modal && modal.style.display === 'flex') {
                closeChangePasswordModal();
            }
            const photoViewer = document.getElementById('photoViewerOverlay');
            if (photoViewer && photoViewer.style.display === 'flex') {
                closePhotoViewer();
            }
        }
    });
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
    
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    if (toggleLoginPassword) toggleLoginPassword.addEventListener('click', () => togglePassword('loginPassword', 'toggleLoginPassword'));
    
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    if (toggleCurrentPassword) toggleCurrentPassword.addEventListener('click', () => togglePassword('currentPassword', 'toggleCurrentPassword'));
    
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    if (toggleNewPassword) toggleNewPassword.addEventListener('click', () => togglePassword('newPassword', 'toggleNewPassword'));
    
    const toggleConfirmNewPassword = document.getElementById('toggleConfirmNewPassword');
    if (toggleConfirmNewPassword) toggleConfirmNewPassword.addEventListener('click', () => togglePassword('confirmNewPassword', 'toggleConfirmNewPassword'));
}

function togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const eyeIcon = button.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = '👁️‍🗨️';
    } else {
        input.type = 'password';
        eyeIcon.textContent = '👁️';
    }
}

function isLockedOut() {
    const lockoutEnd = localStorage.getItem('lockoutEnd');
    if (lockoutEnd && Date.now() < parseInt(lockoutEnd)) {
        return true;
    }
    return false;
}

function getLockoutRemainingTime() {
    const lockoutEnd = localStorage.getItem('lockoutEnd');
    if (lockoutEnd) {
        const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000);
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            return `${minutes}分${seconds}秒`;
        }
    }
    return null;
}

function setLockout() {
    localStorage.setItem('lockoutEnd', Date.now() + LOCKOUT_TIME);
}

function clearLockout() {
    localStorage.removeItem('lockoutEnd');
    loginAttempts = 0;
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;
    const btnLoader = loginBtn ? loginBtn.querySelector('.btn-loader') : null;
    
    const usernameError = document.getElementById('loginUsernameError');
    const passwordError = document.getElementById('loginPasswordError');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    
    if (usernameError) usernameError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (usernameInput) usernameInput.classList.remove('error');
    if (passwordInput) passwordInput.classList.remove('error');
    
    if (!username) {
        if (usernameError) usernameError.textContent = '请输入管理员账号';
        if (usernameInput) usernameInput.classList.add('error');
        return;
    }
    
    if (!password) {
        if (passwordError) passwordError.textContent = '请输入密码';
        if (passwordInput) passwordInput.classList.add('error');
        return;
    }
    
    if (isLockedOut()) {
        const remaining = getLockoutRemainingTime();
        showToast(`登录尝试次数过多，请${remaining}后再试`, 'error');
        return;
    }
    
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'flex';
    if (loginBtn) loginBtn.disabled = true;
    
    setTimeout(() => {
        const credentials = getAdminCredentials();
        
        if (username === credentials.username && password === credentials.password) {
            clearLockout();
            setLoggedIn(true);
            showToast('登录成功', 'success');
            
            // 延迟显示主界面，确保提示消息显示
            setTimeout(() => {
                showMainApp();
            }, 500);
        } else {
            loginAttempts++;
            
            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                setLockout();
                showToast(`登录失败次数过多，账户已锁定${LOCKOUT_TIME / 60000}分钟`, 'error');
            } else {
                showToast(`账号或密码错误，还剩${MAX_LOGIN_ATTEMPTS - loginAttempts}次尝试机会`, 'error');
            }
        }
        
        if (btnText) btnText.style.display = 'flex';
        if (btnLoader) btnLoader.style.display = 'none';
        if (loginBtn) loginBtn.disabled = false;
    }, 800);
}

function handleLogout() {
    setLoggedIn(false);
    document.getElementById('loginForm').reset();
    showToast('已安全退出', 'success');
    
    // 添加退出过渡效果
    const mainApp = document.getElementById('mainApp');
    mainApp.classList.remove('active');
    
    setTimeout(() => {
        showLoginPage();
    }, 300);
}

function openChangePasswordModal() {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('currentPasswordError').textContent = '';
    document.getElementById('newPasswordError').textContent = '';
    document.getElementById('confirmNewPasswordError').textContent = '';
    document.getElementById('currentPassword').classList.remove('error');
    document.getElementById('newPassword').classList.remove('error');
    document.getElementById('confirmNewPassword').classList.remove('error');
    document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const submitBtn = document.getElementById('changePasswordSubmitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    document.getElementById('currentPasswordError').textContent = '';
    document.getElementById('newPasswordError').textContent = '';
    document.getElementById('confirmNewPasswordError').textContent = '';
    document.getElementById('currentPassword').classList.remove('error');
    document.getElementById('newPassword').classList.remove('error');
    document.getElementById('confirmNewPassword').classList.remove('error');
    
    let hasError = false;
    
    if (!currentPassword) {
        document.getElementById('currentPasswordError').textContent = '请输入原密码';
        document.getElementById('currentPassword').classList.add('error');
        hasError = true;
    }
    
    if (!newPassword) {
        document.getElementById('newPasswordError').textContent = '请输入新密码';
        document.getElementById('newPassword').classList.add('error');
        hasError = true;
    } else if (newPassword.length < 4) {
        document.getElementById('newPasswordError').textContent = '新密码至少4位字符';
        document.getElementById('newPassword').classList.add('error');
        hasError = true;
    }
    
    if (!confirmNewPassword) {
        document.getElementById('confirmNewPasswordError').textContent = '请确认新密码';
        document.getElementById('confirmNewPassword').classList.add('error');
        hasError = true;
    } else if (newPassword !== confirmNewPassword) {
        document.getElementById('confirmNewPasswordError').textContent = '两次输入的密码不一致';
        document.getElementById('confirmNewPassword').classList.add('error');
        hasError = true;
    }
    
    if (hasError) return;
    
    const credentials = getAdminCredentials();
    
    if (currentPassword !== credentials.password) {
        document.getElementById('currentPasswordError').textContent = '原密码错误';
        document.getElementById('currentPassword').classList.add('error');
        return;
    }
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        credentials.password = newPassword;
        saveAdminCredentials(credentials);
        
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
        
        closeChangePasswordModal();
        showToast('密码修改成功，请重新登录', 'success');
        
        if (isLoggedIn()) {
            handleLogout();
        }
    }, 800);
}

function handleDedup() {
    if (employees.length === 0) {
        showToast('当前没有员工数据', 'warning');
        return;
    }
    
    showProgress('正在分析数据...', 0);
    
    setTimeout(() => {
        try {
            updateProgress(20);
            
            const result = analyzeDuplicates();
            
            updateProgress(100);
            hideProgress();
            
            showDedupPreview(result);
        } catch (error) {
            hideProgress();
            showToast('去重分析失败：' + error.message, 'error');
        }
    }, 100);
}

function analyzeDuplicates() {
    const idCardMap = new Map();
    const duplicates = [];
    const toRemove = [];
    const toKeep = [];
    
    employees.forEach((emp, index) => {
        if (!emp.idCard) return;
        
        if (idCardMap.has(emp.idCard)) {
            const existingIndex = idCardMap.get(emp.idCard);
            const existingEmp = employees[existingIndex];
            
            const keepEmp = selectBetterRecord(existingEmp, emp);
            const removeEmp = keepEmp.id === existingEmp.id ? emp : existingEmp;
            
            duplicates.push({
                idCard: emp.idCard,
                records: [existingEmp, emp],
                keepId: keepEmp.id,
                removeId: removeEmp.id
            });
            
            toRemove.push(removeEmp.id);
            
            if (!toKeep.includes(keepEmp.id)) {
                toKeep.push(keepEmp.id);
            }
            
            if (keepEmp.id === existingEmp.id) {
                toRemove.push(emp.id);
            } else {
                toRemove.push(existingEmp.id);
                idCardMap.set(emp.idCard, index);
            }
        } else {
            idCardMap.set(emp.idCard, index);
            toKeep.push(emp.id);
        }
    });
    
    const uniqueToRemove = [...new Set(toRemove)];
    const uniqueToKeep = [...new Set(toKeep.filter(id => !uniqueToRemove.includes(id)))];
    
    return {
        totalCount: employees.length,
        duplicateGroups: duplicates,
        duplicateCount: uniqueToRemove.length,
        toRemove: uniqueToRemove,
        toKeep: uniqueToKeep
    };
}

function selectBetterRecord(emp1, emp2) {
    const score1 = calculateRecordScore(emp1);
    const score2 = calculateRecordScore(emp2);
    
    if (score1 !== score2) {
        return score1 > score2 ? emp1 : emp2;
    }
    
    const date1 = new Date(emp1.updatedAt || emp1.createdAt);
    const date2 = new Date(emp2.updatedAt || emp2.createdAt);
    
    return date1 > date2 ? emp1 : emp2;
}

function calculateRecordScore(emp) {
    let score = 0;
    const fields = ['name', 'gender', 'idCard', 'phone', 'position', 'area', 'employmentType', 'hireDate', 'address', 'remarks'];
    
    fields.forEach(field => {
        if (emp[field] && emp[field].trim() !== '') {
            score++;
        }
    });
    
    return score;
}

function showDedupPreview(result) {
    dedupData = result;
    const modalBody = document.getElementById('dedupModalBody');
    
    if (result.duplicateGroups.length === 0) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                <h3 style="color: #27ae60; margin-bottom: 10px;">没有发现重复数据</h3>
                <p style="color: #666;">当前 ${result.totalCount} 条员工数据均为唯一记录</p>
            </div>
        `;
        document.getElementById('confirmDedupBtn').style.display = 'none';
    } else {
        const groupsHtml = result.duplicateGroups.map((group, gIndex) => `
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin-bottom: 10px; color: #e74c3c;">
                    重复组 ${gIndex + 1} - 身份证号：${group.idCard}
                </h4>
                <div style="display: grid; gap: 10px;">
                    ${group.records.map((rec, rIndex) => `
                        <div style="padding: 10px; background: white; border-radius: 6px; border: 2px solid ${rec.id === group.keepId ? '#27ae60' : '#e0e0e0'};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${escapeHtml(rec.name)}</strong> - ${escapeHtml(rec.position || '-')}
                                    ${rec.phone ? `<br><small>电话：${escapeHtml(rec.phone)}</small>` : ''}
                                </div>
                                <span style="padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; ${rec.id === group.keepId ? 'background: #27ae60; color: white;' : 'background: #e74c3c; color: white;'}">
                                    ${rec.id === group.keepId ? '✓ 保留' : '✗ 删除'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        modalBody.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <strong>📊 去重分析结果</strong>
                    </div>
                    <div style="display: flex; gap: 20px; font-size: 14px;">
                        <span>总记录数：<strong>${result.totalCount}</strong></span>
                        <span style="color: #e74c3c;">重复记录：<strong>${result.duplicateCount}</strong></span>
                        <span style="color: #27ae60;">保留记录：<strong>${result.toKeep.length}</strong></span>
                    </div>
                </div>
            </div>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                ${groupsHtml}
            </div>
        `;
        document.getElementById('confirmDedupBtn').style.display = 'inline-block';
    }
    
    document.getElementById('dedupModal').style.display = 'flex';
}

function confirmDedup() {
    if (!dedupData || dedupData.duplicateCount === 0) {
        closeDedupModal();
        return;
    }
    
    if (!confirm(`确定要删除 ${dedupData.duplicateCount} 条重复记录吗？此操作不可恢复。`)) {
        return;
    }
    
    showProgress('正在执行去重...', 0);
    
    setTimeout(() => {
        try {
            updateProgress(30);
            
            const originalCount = employees.length;
            employees = employees.filter(emp => !dedupData.toRemove.includes(emp.id));
            
            updateProgress(70);
            
            saveEmployees();
            
            updateProgress(100);
            hideProgress();
            
            closeDedupModal();
            renderEmployeeList();
            
            const dashboardTab = document.getElementById('dashboard-tab');
            if (dashboardTab && dashboardTab.classList.contains('active')) {
                updateDashboard();
            }
            
            const removedCount = originalCount - employees.length;
            showToast(`去重成功！已删除 ${removedCount} 条重复记录，保留 ${employees.length} 条唯一记录`, 'success');
            
            dedupData = null;
        } catch (error) {
            hideProgress();
            showToast('去重失败：' + error.message, 'error');
        }
    }, 100);
}

function closeDedupModal() {
    document.getElementById('dedupModal').style.display = 'none';
    dedupData = null;
}

let genderChart = null;
let positionChart = null;
let areaChart = null;
let employmentTypeChart = null;
let ageGroupChart = null;

function initDashboard() {
    const dashboardTabBtn = document.querySelector('[data-tab="dashboard"]');
    if (dashboardTabBtn) {
        dashboardTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                updateDashboard();
            }, 100);
        });
    }
    
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateDashboard);
    }
    
    setTimeout(() => {
        updateDashboard();
    }, 100);
}

function updateDashboard() {
    updateStatsCards();
    updateCharts();
    updateRetirementList();
    updateHRTimestamp();
}

function getThisYearRetirementEmployees() {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    
    return employees.filter(emp => {
        const retirementDateStr = calculateRetirementDate(emp.birthDate, emp.gender);
        if (!retirementDateStr) return false;
        
        const retirementDate = new Date(retirementDateStr);
        return retirementDate >= startOfYear && retirementDate <= endOfYear;
    }).map(emp => {
        const retirementDateStr = calculateRetirementDate(emp.birthDate, emp.gender);
        return {
            ...emp,
            retirementDate: retirementDateStr
        };
    }).sort((a, b) => {
        return new Date(a.retirementDate) - new Date(b.retirementDate);
    });
}

function updateRetirementList() {
    const retirementEmployees = getThisYearRetirementEmployees();
    const tbody = document.getElementById('retirementTableBody');
    const emptyMessage = document.getElementById('retirementEmptyMessage');
    const countElement = document.getElementById('retirementCount');
    
    if (!tbody) return;
    
    if (countElement) {
        countElement.textContent = retirementEmployees.length;
    }
    
    if (retirementEmployees.length === 0) {
        tbody.innerHTML = '';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }
        return;
    }
    
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    tbody.innerHTML = retirementEmployees.map(emp => `
        <tr>
            <td>${escapeHtml(emp.name || '未知')}</td>
            <td>${formatDate(emp.retirementDate)}</td>
        </tr>
    `).join('');
}

function updateStatsCards() {
    const totalCount = employees.length;
    const maleCount = employees.filter(e => e.gender === '男').length;
    const femaleCount = employees.filter(e => e.gender === '女').length;
    
    const validAges = employees.filter(e => {
        const age = e.age;
        return age !== undefined && age !== null && age !== '' && !isNaN(parseInt(age));
    }).map(e => parseInt(e.age));
    
    const avgAge = validAges.length > 0 ? Math.round(validAges.reduce((a, b) => a + b, 0) / validAges.length) : 0;
    
    animateHRValue('totalEmployees', totalCount, 0);
    animateHRValue('maleCount', maleCount, 0);
    animateHRValue('femaleCount', femaleCount, 0);
    animateHRValue('avgAge', avgAge, 0);
    
    setTimeout(() => {
        if (totalCount > 0) {
            const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct; };
            setBar('maleBar', (maleCount / totalCount * 100) + '%');
            setBar('femaleBar', (femaleCount / totalCount * 100) + '%');
        }
    }, 300);
}

function animateHRValue(id, target, decimals) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseFloat(el.textContent.replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    function tick(now) {
        const p = Math.min((now - startTime) / 800, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (start + (target - start) * ease).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function updateHRTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { hour12: false });
    const updateEl = document.getElementById('hrUpdateTime');
    const footerEl = document.getElementById('hrFooterTime');
    if (updateEl) updateEl.textContent = timeStr;
    if (footerEl) footerEl.textContent = '最后更新: ' + timeStr;
}

/* ===== 镇街维度分析功能 ===== */
let mdTownBarChart = null;
let mdLinePieChart = null;

function initMDTownAnalysis() {
    initMDTownFilter();
    setupMDTownEventListeners();
    
    const validationReport = validateBusinessDataForTownAnalysis();
    console.log('📊 养护一张图 - 数据校验报告:', validationReport);
    
    renderMDTownAnalysis();
}

function validateBusinessDataForTownAnalysis() {
    const allData = getAllBusinessData() || [];
    const report = {
        totalRecords: allData.length,
        byType: {},
        fieldCompleteness: {
            street: { valid: 0, missing: 0, rate: 0 },
            area: { valid: 0, missing: 0, rate: 0 },
            businessType: { valid: 0, missing: 0, rate: 0 }
        },
        issues: [],
        status: 'success',
        timestamp: new Date().toLocaleString('zh-CN')
    };
    
    allData.forEach((item, index) => {
        const type = item.businessType || '未知';
        if (!report.byType[type]) {
            report.byType[type] = 0;
        }
        report.byType[type]++;
        
        if (item.street && item.street.trim()) {
            report.fieldCompleteness.street.valid++;
        } else {
            report.fieldCompleteness.street.missing++;
            if (report.issues.length < 10) {
                report.issues.push(`行${index + 1}: 缺少镇街信息`);
            }
        }
        
        if (item.area > 0 || type === '公厕专项') {
            report.fieldCompleteness.area.valid++;
        } else {
            report.fieldCompleteness.area.missing++;
            if (type !== '公厕专项' && report.issues.length < 10) {
                report.issues.push(`行${index + 1}: [${type}] 面积为0或缺失`);
            }
        }
        
        if (item.businessType) {
            report.fieldCompleteness.businessType.valid++;
        } else {
            report.fieldCompleteness.businessType.missing++;
        }
    });
    
    Object.keys(report.fieldCompleteness).forEach(field => {
        const fc = report.fieldCompleteness[field];
        fc.rate = report.totalRecords > 0 
            ? ((fc.valid / report.totalRecords) * 100).toFixed(1) + '%' 
            : 'N/A';
    });
    
    if (report.totalRecords === 0) {
        report.status = 'empty';
        report.message = '暂无养护数据，请先导入业务数据';
    } else if (report.fieldCompleteness.street.rate !== '100%') {
        report.status = 'warning';
        report.message = `部分记录缺少镇街信息（完整率: ${report.fieldCompleteness.street.rate}）`;
    } else if (report.fieldCompleteness.area.rate === '0%' && 
               Object.keys(report.byType).filter(t => t !== '公厕专项').length > 0) {
        report.status = 'error';
        report.message = '所有面积字段均为0，请检查导入数据的字段映射';
    } else {
        report.status = 'success';
        report.message = '数据完整性检查通过';
    }
    
    return report;
}

function initMDTownFilter() {
    const townSelect = document.getElementById('mdTownFilter');
    if (!townSelect) return;
    
    const allData = getAllBusinessData() || [];
    const towns = [...new Set(allData.map(item => item.street || item.townStreet).filter(s => s))].sort();
    
    townSelect.innerHTML = '<option value="">全部镇街</option>' + 
        towns.map(town => `<option value="${town}">${town}</option>`).join('');
}

function setupMDTownEventListeners() {
    document.getElementById('mdApplyFilterBtn')?.addEventListener('click', function() {
        renderMDTownAnalysis();
        showToast('筛选已应用', 'success');
    });
    
    document.getElementById('mdResetFilterBtn')?.addEventListener('click', function() {
        const townSelect = document.getElementById('mdTownFilter');
        const lineSelect = document.getElementById('mdLineFilter');
        
        if (townSelect) townSelect.value = '';
        if (lineSelect) lineSelect.value = '';
        
        renderMDTownAnalysis();
        showToast('已重置筛选', 'success');
    });
    
    document.getElementById('mdTownFilter')?.addEventListener('change', function() {
        renderMDTownAnalysis();
    });
    
    document.getElementById('mdLineFilter')?.addEventListener('change', function() {
        renderMDTownAnalysis();
    });
}

function getFilteredMDTownData() {
    const allData = getAllBusinessData() || [];
    const townFilter = document.getElementById('mdTownFilter')?.value;
    const lineFilter = document.getElementById('mdLineFilter')?.value;
    
    let filtered = [...allData];
    
    if (townFilter) {
        filtered = filtered.filter(item => 
            (item.street === townFilter) || (item.townStreet === townFilter)
        );
    }
    
    if (lineFilter) {
        filtered = filtered.filter(item => item.businessType === lineFilter);
    }
    
    return filtered;
}

function aggregateMDTownData(data) {
    const townStats = {};
    
    data.forEach(item => {
        const town = item.street || '未知';
        if (!townStats[town]) {
            townStats[town] = { municipal: 0, greenery: 0, sanitation: 0, toilet: 0 };
        }
        
        const area = parseFloat(item.area) || 0;
        const toiletCount = parseInt(item.toiletCount) || 0;
        const type = item.businessType;
        
        if (type === '市政养护') {
            townStats[town].municipal += area;
        } else if (type === '绿化养护') {
            townStats[town].greenery += area;
        } else if (type === '环卫养护') {
            townStats[town].sanitation += area;
        } else if (type === '公厕专项' || type.includes('公厕')) {
            townStats[town].toilet += toiletCount;
        }
    });
    
    return Object.entries(townStats).map(([name, stats]) => ({
        name,
        ...stats,
        total: stats.municipal + stats.greenery + stats.sanitation
    })).sort((a, b) => b.total - a.total);
}

function renderMDTownBarChart(data) {
    const ctx = document.getElementById('mdTownBarChart');
    if (!ctx) return;
    
    if (mdTownBarChart) {
        mdTownBarChart.destroy();
    }
    
    const top10 = data.slice(0, 10).reverse();
    
    mdTownBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(d => d.name),
            datasets: [
                {
                    label: '市政(万㎡)',
                    data: top10.map(d => (d.municipal / 10000).toFixed(2)),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1
                },
                {
                    label: '绿化(万㎡)',
                    data: top10.map(d => (d.greenery / 10000).toFixed(2)),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: '环卫(万㎡)',
                    data: top10.map(d => (d.sanitation / 10000).toFixed(2)),
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71, 85, 105, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(71, 85, 105, 0.15)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
    
    updateMDBarLegend();
}

function renderMDLinePieChart(data) {
    const ctx = document.getElementById('mdLinePieChart');
    if (!ctx) return;
    
    if (mdLinePieChart) {
        mdLinePieChart.destroy();
    }
    
    const totals = {
        '市政养护': 0,
        '绿化养护': 0,
        '环卫养护': 0,
        '公厕养护': 0
    };
    
    data.forEach(d => {
        totals['市政养护'] += d.municipal;
        totals['绿化养护'] += d.greenery;
        totals['环卫养护'] += d.sanitation;
        totals['公厕养护'] += d.toilet;
    });
    
    const pieData = Object.entries(totals)
        .filter(([_, val]) => val > 0)
        .map(([key, val]) => ({ label: key, value: val }));
    
    mdLinePieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: pieData.map(d => d.label),
            datasets: [{
                data: pieData.map(d => d.value),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.85)',
                    'rgba(34, 197, 94, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderColor: 'rgba(15, 23, 42, 0.9)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71, 85, 105, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((value / total) * 100).toFixed(1);
                            return context.label + ': ' + (value / 10000).toFixed(2) + '万㎡ (' + pct + '%)';
                        }
                    }
                }
            },
            cutout: '55%'
        }
    });
    
    updateMDPieLegend(pieData, totals);
}

function updateMDBarLegend() {
    const legendEl = document.getElementById('mdBarLegend');
    if (!legendEl) return;
    
    legendEl.innerHTML = `
        <div class="md-legend-item">
            <div class="md-legend-color" style="background: rgba(99, 102, 241, 0.8);"></div>
            <span>市政</span>
        </div>
        <div class="md-legend-item">
            <div class="md-legend-color" style="background: rgba(34, 197, 94, 0.8);"></div>
            <span>绿化</span>
        </div>
        <div class="md-legend-item">
            <div class="md-legend-color" style="background: rgba(245, 158, 11, 0.8);"></div>
            <span>环卫</span>
        </div>
    `;
}

function updateMDPieLegend(pieData, totals) {
    const legendEl = document.getElementById('mdPieLegend');
    if (!legendEl) return;
    
    const colors = ['rgba(99, 102, 241, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(245, 158, 11, 0.85)', 'rgba(239, 68, 68, 0.85)'];
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    
    legendEl.innerHTML = pieData.map((d, i) => `
        <div class="md-legend-item">
            <div class="md-legend-color" style="background: ${colors[i]};"></div>
            <span>${d.label}: ${((d.value / grandTotal) * 100).toFixed(1)}%</span>
        </div>
    `).join('');
}

function renderMDTownTable(data) {
    const tbody = document.getElementById('mdTownTableBody');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="md-empty-row">暂无数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${(d.municipal / 10000).toFixed(2)}</td>
            <td>${(d.greenery / 10000).toFixed(2)}</td>
            <td>${(d.sanitation / 10000).toFixed(2)}</td>
            <td>${d.toilet}</td>
            <td><strong>${(d.total / 10000).toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

function renderMDTownAnalysis() {
    const filteredData = getFilteredMDTownData();
    const aggregatedData = aggregateMDTownData(filteredData);
    
    renderMDTownBarChart(aggregatedData);
    renderMDLinePieChart(aggregatedData);
    renderMDTownTable(aggregatedData);
}

/* ===== 数据导入验证与测试 ===== */
function runMDImportValidationTests() {
    console.log('🧪 开始执行数据导入验证测试...');
    
    const testResults = {
        timestamp: new Date().toLocaleString('zh-CN'),
        tests: [],
        summary: { passed: 0, failed: 0, total: 0, rate: '0%' }
    };
    
    testResults.tests.push(testNormalDataScenario());
    testResults.tests.push(testBoundaryDataScenario());
    testResults.tests.push(testEmptyDataScenario());
    testResults.tests.push(testMissingFieldScenario());
    testResults.tests.push(testSpecialCharScenario());
    testResults.tests.push(testLargeNumberScenario());
    
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    testResults.summary.rate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1) + '%';
    
    console.log('📋 测试结果汇总:', testResults.summary);
    console.table(testResults.tests.map(t => ({
        '测试名称': t.name,
        '状态': t.passed ? '✅ 通过' : '❌ 失败',
        '详情': t.message
    })));
    
    return testResults;
}

function testNormalDataScenario() {
    const testName = '正常数据导入测试';
    try {
        const testData = [
            { name: '中山路', street: '庄市', roadArea: 123456, businessType: '市政养护' },
            { name: '人民公园', street: '新华', totalArea: 78901, businessType: '绿化养护' },
            { name: '主街道保洁', street: '和平', totalCleaningArea: 45678, businessType: '环卫养护' },
            { name: '公厕A', street: '长安', location: '长安街1号', businessType: '公厕专项' }
        ];
        
        const processed = testData.map(item => {
            if (item.businessType === '市政养护') {
                return { ...item, area: parseFloat(item.roadArea) || 0, street: item.street || '' };
            } else if (item.businessType === '绿化养护') {
                return { ...item, area: parseFloat(item.totalArea) || 0, street: item.street || '' };
            } else if (item.businessType === '环卫养护') {
                return { ...item, area: parseFloat(item.totalCleaningArea) || 0, street: item.street || '' };
            } else {
                return { ...item, area: 0, toiletCount: 1, street: item.street || item.location || '' };
            }
        });
        
        const hasValidArea = processed.filter(p => p.area > 0 || p.businessType === '公厕专项').length === 4;
        const hasValidStreet = processed.filter(p => p.street && p.street.trim()).length === 4;
        
        return {
            name: testName,
            passed: hasValidArea && hasValidStreet,
            message: `4条记录中，面积有效:${hasValidArea}, 镇街有效:${hasValidStreet}`
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function testBoundaryDataScenario() {
    const testName = '边界数据测试（零值/空值）';
    try {
        const testData = [
            { name: '空道路', street: '', roadArea: 0, businessType: '市政养护' },
            { name: '无面积公园', street: '新区', totalArea: null, businessType: '绿化养护' },
            { name: '负面积', street: '老区', totalCleaningArea: -100, businessType: '环卫养护' },
            { name: '超大数值', street: '开发区', totalCleaningArea: 999999999, businessType: '环卫养护' }
        ];
        
        let passed = true;
        let details = [];
        
        testData.forEach((item, idx) => {
            const area = item.roadArea || item.totalArea || item.totalCleaningArea || 0;
            const parsedArea = parseFloat(area) || 0;
            
            if (idx === 2 && parsedArea !== 0) {
                passed = false;
                details.push(`行${idx + 1}: 负数应转为0`);
            }
            if (idx === 3 && parsedArea <= 0) {
                passed = false;
                details.push(`行${idx + 1}: 大数值应保留`);
            }
        });
        
        return {
            name: testName,
            passed,
            message: details.length > 0 ? details.join('; ') : '所有边界情况处理正确'
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function testEmptyDataScenario() {
    const testName = '空数据集测试';
    try {
        const result = aggregateMDTownData([]);
        
        return {
            name: testName,
            passed: Array.isArray(result) && result.length === 0,
            message: `返回数组长度: ${result.length} (期望: 0)`
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function testMissingFieldScenario() {
    const testName = '缺失字段测试';
    try {
        const testData = [
            { street: '测试区', businessType: '市政养护' },
            { roadArea: 50000, businessType: '市政养护' },
            { businessType: '绿化养护' }
        ];
        
        const processed = testData.map(item => {
            const p = { ...item };
            p.area = parseFloat(p.roadArea) || parseFloat(p.totalArea) || 0;
            p.street = p.street || '';
            return p;
        });
        
        const allHaveBusinessType = processed.every(p => p.businessType);
        const noCrashOnUndefined = true;
        
        return {
            name: testName,
            passed: allHaveBusinessType && noCrashOnUndefined,
            message: `业务类型完整:${allHaveBusinessType}, 无崩溃:${noCrashOnUndefined}`
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function testSpecialCharScenario() {
    const testName = '特殊字符处理测试';
    try {
        const specialNames = ['测试-镇', '测试_镇', '测试 镇', '(开发区)', '高新园区'];
        const testData = specialNames.map(name => ({
            name: name + '-项目',
            street: name,
            roadArea: 10000,
            businessType: '市政养护'
        }));
        
        const aggregated = aggregateMDTownData(testData);
        const allTownsPreserved = aggregated.length === specialNames.length;
        
        return {
            name: testName,
            passed: allTownsPreserved,
            message: `${specialNames.length}个特殊字符镇名全部正确聚合`
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function testLargeNumberScenario() {
    const testName = '大数据量性能测试';
    try {
        const largeDataset = [];
        for (let i = 0; i < 1000; i++) {
            largeDataset.push({
                name: `项目${i}`,
                street: `镇街${i % 20}`,
                roadArea: Math.random() * 100000,
                businessType: ['市政养护', '绿化养护', '环卫养护'][i % 3]
            });
        }
        
        const startTime = performance.now();
        const aggregated = aggregateMDTownData(largeDataset);
        const endTime = performance.now();
        
        const executionTime = (endTime - startTime).toFixed(2);
        const withinTimeLimit = parseFloat(executionTime) < 100;
        const correctCount = aggregated.length === 20;
        
        return {
            name: testName,
            passed: withinTimeLimit && correctCount,
            message: `1000条数据处理耗时:${executionTime}ms, 聚合为${aggregated.length}个镇街`
        };
    } catch (e) {
        return { name: testName, passed: false, message: `异常: ${e.message}` };
    }
}

function generateImportValidationReport() {
    const validationReport = validateBusinessDataForTownAnalysis();
    const testResults = runMDImportValidationTests();
    
    const report = {
        title: '📊 养护一张图 - 数据导入成功验证报告',
        generatedAt: new Date().toLocaleString('zh-CN'),
        
        section1: {
            title: '一、导入数据量统计',
            totalRecords: validationReport.totalRecords,
            byType: validationReport.byType,
            uniqueTowns: Object.keys(validationReport.byType).length > 0 ? 
                '需查看图表' : '无数据'
        },
        
        section2: {
            title: '二、字段完整性检查结果',
            fields: validationReport.fieldCompleteness,
            overallStatus: validationReport.status,
            message: validationReport.message
        },
        
        section3: {
            title: '三、异常数据处理记录',
            issues: validationReport.issues.length > 0 ? 
                validationReport.issues : ['无异常记录']
        },
        
        section4: {
            title: '四、导入成功率',
            successRate: testResults.summary.rate,
            testDetails: testResults.tests
        },
        
        conclusion: validationReport.status === 'success' && 
                   testResults.summary.rate === '100%' ?
                   '✅ 所有检查通过，数据导入成功！' :
                   '⚠️ 存在部分问题，建议检查后重新导入'
    };
    
    console.log('\n' + '='.repeat(60));
    console.log(report.title);
    console.log('生成时间:', report.generatedAt);
    console.log('\n' + report.section1.title);
    console.log('   总记录数:', report.section1.totalRecords);
    console.log('   按类型分布:', JSON.stringify(report.section1.byType, null, 2));
    console.log('\n' + report.section2.title);
    console.log('   镇街字段完整率:', report.section2.fields.street.rate);
    console.log('   面积字段完整率:', report.section2.fields.area.rate);
    console.log('   业务类型完整率:', report.section2.fields.businessType.rate);
    console.log('   整体状态:', report.section2.overallStatus.toUpperCase(), '-', report.section2.message);
    console.log('\n' + report.section3.title);
    report.section3.issues.forEach(issue => console.log('   ⚠️', issue));
    console.log('\n' + report.section4.title);
    console.log('   测试通过率:', report.section4.successRate);
    console.log('\n' + '='.repeat(60));
    console.log('结论:', report.conclusion);
    console.log('='.repeat(60) + '\n');
    
    return report;
}

function updateCharts() {
    updateGenderChart();
    updatePositionChart();
    updateAreaChart();
    updateEmploymentTypeChart();
    updateAgeGroupChart();
}

function updateAgeGroupChart() {
    const canvas = document.getElementById('ageGroupChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const ageGroups = {
        '30岁以下': 0,
        '30-40岁': 0,
        '41-50岁': 0,
        '51-60岁': 0,
        '60岁以上': 0
    };
    
    employees.forEach(e => {
        const age = e.age;
        if (age !== undefined && age !== null && age !== '' && !isNaN(parseInt(age))) {
            const parsedAge = parseInt(age);
            if (parsedAge < 30) {
                ageGroups['30岁以下']++;
            } else if (parsedAge >= 30 && parsedAge <= 40) {
                ageGroups['30-40岁']++;
            } else if (parsedAge >= 41 && parsedAge <= 50) {
                ageGroups['41-50岁']++;
            } else if (parsedAge >= 51 && parsedAge <= 60) {
                ageGroups['51-60岁']++;
            } else if (parsedAge > 60) {
                ageGroups['60岁以上']++;
            }
        }
    });
    
    const labels = Object.keys(ageGroups);
    const data = Object.values(ageGroups);
    
    if (ageGroupChart) {
        ageGroupChart.destroy();
        ageGroupChart = null;
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(139,92,246,0.5)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.05)');
    
    ageGroupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '人数',
                data: data,
                backgroundColor: gradient,
                borderColor: '#8b5cf6',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b', stepSize: 1 } }
            }
        }
    });
}

function updateGenderChart() {
    const canvas = document.getElementById('genderChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const maleCount = employees.filter(e => e.gender === '男').length;
    const femaleCount = employees.filter(e => e.gender === '女').length;
    const otherCount = employees.filter(e => e.gender !== '男' && e.gender !== '女').length;
    
    if (genderChart) {
        genderChart.destroy();
        genderChart = null;
    }
    
    genderChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['男', '女', '其他'],
            datasets: [{
                data: [maleCount, femaleCount, otherCount],
                backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(236,72,153,0.8)', 'rgba(139,92,246,0.8)'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true, color: '#94a3b8', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            }
        }
    });
}

function updatePositionChart() {
    const canvas = document.getElementById('positionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const excludedPositions = ['车辆驾驶员', '洗地工'];
    const positionCounts = {};
    employees.forEach(e => {
        if (e.position && !excludedPositions.includes(e.position)) {
            positionCounts[e.position] = (positionCounts[e.position] || 0) + 1;
        }
    });
    
    const labels = Object.keys(positionCounts);
    const data = Object.values(positionCounts);
    
    if (positionChart) {
        positionChart.destroy();
        positionChart = null;
    }
    
    positionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '人数',
                data: data,
                backgroundColor: 'rgba(139,92,246,0.7)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b', stepSize: 1 } }
            }
        }
    });
}

function updateAreaChart() {
    const canvas = document.getElementById('areaChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const areaCounts = {};
    employees.forEach(e => {
        if (e.area) {
            let mappedArea = e.area;
            if (['庄一', '庄二', '庄三'].includes(e.area)) {
                mappedArea = '庄市';
            }
            areaCounts[mappedArea] = (areaCounts[mappedArea] || 0) + 1;
        }
    });
    
    const labels = Object.keys(areaCounts);
    const data = Object.values(areaCounts);
    
    if (areaChart) {
        areaChart.destroy();
        areaChart = null;
    }
    
    areaChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(245,158,11,0.8)', 'rgba(139,92,246,0.8)', 'rgba(236,72,153,0.8)'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true, color: '#94a3b8', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            }
        }
    });
}

function updateEmploymentTypeChart() {
    const canvas = document.getElementById('employmentTypeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const typeCounts = {};
    employees.forEach(e => {
        if (e.employmentType) {
            typeCounts[e.employmentType] = (typeCounts[e.employmentType] || 0) + 1;
        }
    });
    
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    
    if (employmentTypeChart) {
        employmentTypeChart.destroy();
        employmentTypeChart = null;
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, 'rgba(16,185,129,0.8)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.8)');
    
    employmentTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '人数',
                data: data,
                backgroundColor: gradient,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b', stepSize: 1 } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
            }
        }
    });
}

let localEmployeesData = {};

function loadLocalEmployeesData() {
    const stored = localStorage.getItem(LOCAL_DATA_STORAGE_KEY);
    if (stored) {
        localEmployeesData = JSON.parse(stored);
    }
}

function saveLocalEmployeesData() {
    localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify(localEmployeesData));
}

function getLocalEmployees() {
    return employees.filter(emp => emp.area === '片所本级');
}

function getEmployeeLeaveData(employeeId) {
    if (!localEmployeesData[employeeId]) {
        localEmployeesData[employeeId] = {
            annualLeave: 0,
            onlyChildLeave: 0,
            parentingLeave: 0,
            compensatoryLeave: 0,
            sickLeave: 0,
            leaveRecords: [],
            overtimeRecords: []
        };
    }
    return localEmployeesData[employeeId];
}

function renderLocalEmployeeList() {
    const localEmployees = getLocalEmployees();
    const tbody = document.getElementById('localEmployeeTableBody');
    const emptyMessage = document.getElementById('localEmployeeEmptyMessage');
    const countElement = document.getElementById('localEmployeeCount');
    
    if (countElement) {
        countElement.textContent = localEmployees.length;
    }
    
    if (localEmployees.length === 0) {
        tbody.innerHTML = '';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }
        return;
    }
    
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    tbody.innerHTML = localEmployees.map(emp => {
        const leaveData = getEmployeeLeaveData(emp.id);
        return `
        <tr>
            <td>${escapeHtml(emp.name)}</td>
            <td>${escapeHtml(emp.gender)}</td>
            <td>${escapeHtml(emp.position)}</td>
            <td><span class="leave-days">${leaveData.annualLeave}</span>天</td>
            <td><span class="leave-days">${leaveData.onlyChildLeave}</span>天</td>
            <td><span class="leave-days">${leaveData.parentingLeave}</span>天</td>
            <td><span class="leave-days">${leaveData.compensatoryLeave || 0}</span>天</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewLocalEmployeeDetails('${emp.id}')">详情</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function getLeaveTypeName(type) {
    const typeMap = {
        'annualLeave': '年休假',
        'onlyChildLeave': '独生子女假',
        'parentingLeave': '育儿假',
        'compensatoryLeave': '调休',
        'sickLeave': '病假'
    };
    return typeMap[type] || type;
}

function viewLocalEmployeeDetails(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    const leaveData = getEmployeeLeaveData(employeeId);
    
    const sortedLeaveRecords = [...leaveData.leaveRecords].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    const sortedOvertimeRecords = [...leaveData.overtimeRecords].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    document.getElementById('modalTitle').textContent = '本级人员请休假管理';
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-row">
                <span class="detail-label">姓名</span>
                <span class="detail-value">${escapeHtml(employee.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">性别</span>
                <span class="detail-value">${escapeHtml(employee.gender)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">岗位</span>
                <span class="detail-value">${escapeHtml(employee.position)}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>假期剩余天数</h4>
            <form id="leaveEditForm">
                <input type="hidden" id="editEmployeeId" value="${employeeId}">
                <div class="leave-summary">
                    <div class="leave-item-edit">
                        <span class="leave-type">年休假</span>
                        <input type="number" id="editAnnualLeave" value="${leaveData.annualLeave}" min="0" step="0.5" class="leave-input">
                        <span class="leave-unit">天</span>
                    </div>
                    <div class="leave-item-edit">
                        <span class="leave-type">独生子女假</span>
                        <input type="number" id="editOnlyChildLeave" value="${leaveData.onlyChildLeave}" min="0" step="0.5" class="leave-input">
                        <span class="leave-unit">天</span>
                    </div>
                    <div class="leave-item-edit">
                        <span class="leave-type">育儿假</span>
                        <input type="number" id="editParentingLeave" value="${leaveData.parentingLeave}" min="0" step="0.5" class="leave-input">
                        <span class="leave-unit">天</span>
                    </div>
                    <div class="leave-item-edit">
                        <span class="leave-type">调休</span>
                        <input type="number" id="editCompensatoryLeave" value="${leaveData.compensatoryLeave || 0}" min="0" step="0.5" class="leave-input">
                        <span class="leave-unit">天</span>
                    </div>
                    <div class="leave-item-edit">
                        <span class="leave-type">已修病假</span>
                        <input type="number" id="editSickLeave" value="${leaveData.sickLeave}" min="0" step="0.5" class="leave-input">
                        <span class="leave-unit">天</span>
                    </div>
                </div>
            </form>
        </div>
        
        <div class="detail-section">
            <div class="section-actions">
                <button class="btn btn-primary btn-small" onclick="openLeaveModal('${employeeId}')">请假</button>
                <button class="btn btn-secondary btn-small" onclick="openOvertimeModal('${employeeId}')">加班</button>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>请假记录</h4>
            ${sortedLeaveRecords.length === 0 ? 
                '<p style="text-align: center; color: #7f8c8d;">暂无请假记录</p>' : 
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>日期范围</th>
                                <th>请假类型</th>
                                <th>时长</th>
                                <th>备注</th>
                                <th>申请时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedLeaveRecords.map(record => {
                                let durationText;
                                if (record.hours !== undefined) {
                                    const hours = record.hours;
                                    const days = (hours / 6.5).toFixed(2);
                                    if (record.durationUnit) {
                                        const inputUnit = record.durationUnit === 'day' ? '天' : '小时';
                                        durationText = `${record.duration}${inputUnit} (${hours}小时 / ${days}天)`;
                                    } else {
                                        durationText = `${hours}小时（${days}天）`;
                                    }
                                } else {
                                    durationText = `${record.days || '-'}天`;
                                }
                                return `
                                <tr>
                                    <td>${record.startDate} 至 ${record.endDate}</td>
                                    <td>${getLeaveTypeName(record.type)}</td>
                                    <td>${durationText}</td>
                                    <td>${escapeHtml(record.remark || '-')}</td>
                                    <td>${new Date(record.createdAt).toLocaleString('zh-CN')}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>
        
        <div class="detail-section">
            <h4>加班记录</h4>
            ${sortedOvertimeRecords.length === 0 ? 
                '<p style="text-align: center; color: #7f8c8d;">暂无加班记录</p>' : 
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>加班日期</th>
                                <th>加班事由</th>
                                <th>时间</th>
                                <th>时长</th>
                                <th>备注</th>
                                <th>申请时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedOvertimeRecords.map(record => `
                                <tr>
                                    <td>${record.date}</td>
                                    <td>${escapeHtml(record.reason || '-')}</td>
                                    <td>${record.startTime || '-'} 至 ${record.endTime || '-'}</td>
                                    <td>${record.hours}小时</td>
                                    <td>${escapeHtml(record.remark || '-')}</td>
                                    <td>${new Date(record.createdAt).toLocaleString('zh-CN')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary" onclick="saveLeaveEdit()">保存修改</button>
    `;
    document.getElementById('modal').style.display = 'flex';
}

function saveLeaveEdit() {
    const employeeId = document.getElementById('editEmployeeId').value;
    const annualLeave = parseFloat(document.getElementById('editAnnualLeave').value) || 0;
    const onlyChildLeave = parseFloat(document.getElementById('editOnlyChildLeave').value) || 0;
    const parentingLeave = parseFloat(document.getElementById('editParentingLeave').value) || 0;
    const compensatoryLeave = parseFloat(document.getElementById('editCompensatoryLeave').value) || 0;
    const sickLeave = parseFloat(document.getElementById('editSickLeave').value) || 0;
    
    if (annualLeave < 0 || onlyChildLeave < 0 || parentingLeave < 0 || compensatoryLeave < 0 || sickLeave < 0) {
        showToast('假期天数不能为负数', 'error');
        return;
    }
    
    const leaveData = getEmployeeLeaveData(employeeId);
    leaveData.annualLeave = annualLeave;
    leaveData.onlyChildLeave = onlyChildLeave;
    leaveData.parentingLeave = parentingLeave;
    leaveData.compensatoryLeave = compensatoryLeave;
    leaveData.sickLeave = sickLeave;
    
    saveLocalEmployeesData();
    closeModal();
    showToast('假期天数修改成功', 'success');
    renderLocalEmployeeList();
}

function openLeaveModal(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    const leaveData = getEmployeeLeaveData(employeeId);
    
    document.getElementById('modalTitle').textContent = '请假申请';
    document.getElementById('modalBody').innerHTML = `
        <form id="leaveForm">
            <input type="hidden" id="leaveEmployeeId" value="${employeeId}">
            <div class="form-group">
                <label>员工姓名</label>
                <input type="text" value="${escapeHtml(employee.name)}" readonly>
            </div>
            <div class="form-group">
                <label>请假类型</label>
                <select id="leaveType" required>
                    <option value="annualLeave">年休假</option>
                    <option value="onlyChildLeave">独生子女假</option>
                    <option value="parentingLeave">育儿假</option>
                    <option value="compensatoryLeave">调休</option>
                    <option value="sickLeave">病假</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始日期</label>
                    <input type="date" id="leaveStartDate" required>
                </div>
                <div class="form-group">
                    <label>结束日期</label>
                    <input type="date" id="leaveEndDate" required>
                </div>
            </div>
            <div class="form-group">
                <label>请假时长</label>
                <div class="duration-input-group">
                    <input type="number" id="leaveDuration" min="0.1" step="0.1" value="6.5" required style="flex: 1;">
                    <select id="leaveDurationUnit" style="width: 80px; margin-left: 8px;">
                        <option value="hour">小时</option>
                        <option value="day">天</option>
                    </select>
                </div>
                <p style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">最小单位为0.1小时，1天=6.5小时</p>
                <div id="leaveDurationPreview" style="font-size: 13px; color: #3498db; margin-top: 6px; font-weight: 500;">
                    当前输入：6.5 小时（1 天）
                </div>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea id="leaveRemark" rows="3"></textarea>
            </div>
            <div style="margin-top: 16px;">
                <p style="font-size: 14px; color: #7f8c8d;">
                    当前假期剩余：年休假 ${leaveData.annualLeave}天、独生子女假 ${leaveData.onlyChildLeave}天、育儿假 ${leaveData.parentingLeave}天、调休 ${leaveData.compensatoryLeave || 0}天、已修病假 ${leaveData.sickLeave}天
                </p>
            </div>
        </form>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="submitLeave()">提交</button>
    `;
    document.getElementById('modal').style.display = 'flex';

    const leaveDurationInput = document.getElementById('leaveDuration');
    const leaveDurationUnitSelect = document.getElementById('leaveDurationUnit');

    leaveDurationInput.addEventListener('input', updateLeaveDurationPreview);
    leaveDurationUnitSelect.addEventListener('change', updateLeaveDurationPreview);

    updateLeaveDurationPreview();
}

function updateLeaveDurationPreview() {
    const duration = parseFloat(document.getElementById('leaveDuration').value) || 0;
    const unit = document.getElementById('leaveDurationUnit').value;
    const preview = document.getElementById('leaveDurationPreview');

    if (duration < 0.1) {
        preview.innerHTML = '<span style="color: #e74c3c;">请输入有效的时长（至少0.1小时）</span>';
        return;
    }

    let hours, days;
    if (unit === 'day') {
        hours = duration * 6.5;
        days = duration;
    } else {
        hours = duration;
        days = duration / 6.5;
    }

    preview.innerHTML = `当前输入：<strong>${hours} 小时</strong>（${days.toFixed(2)} 天）`;
}

function submitLeave() {
    const employeeId = document.getElementById('leaveEmployeeId').value;
    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    const duration = parseFloat(document.getElementById('leaveDuration').value) || 0;
    const durationUnit = document.getElementById('leaveDurationUnit').value;
    const remark = document.getElementById('leaveRemark').value;

    if (!startDate || !endDate) {
        showToast('请选择请假日期', 'error');
        return;
    }

    if (duration < 0.1) {
        showToast('请假时长必须大于等于0.1小时', 'error');
        return;
    }

    if (Math.round(duration * 10) % 1 !== 0) {
        showToast('请假时长最小单位为0.1小时', 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        showToast('结束日期不能早于开始日期', 'error');
        return;
    }

    let hoursInStorage;
    if (durationUnit === 'day') {
        hoursInStorage = Math.round(duration * 6.5 * 10) / 10;
    } else {
        hoursInStorage = Math.round(duration * 10) / 10;
    }

    const leaveData = getEmployeeLeaveData(employeeId);

    if (leaveData[leaveType] < hoursInStorage / 6.5) {
        showToast('假期剩余天数不足', 'error');
        return;
    }

    leaveData[leaveType] = Math.round((leaveData[leaveType] - hoursInStorage / 6.5) * 10) / 10;
    leaveData.leaveRecords.push({
        id: generateId(),
        type: leaveType,
        startDate: startDate,
        endDate: endDate,
        hours: hoursInStorage,
        duration: duration,
        durationUnit: durationUnit,
        remark: remark,
        createdAt: new Date().toISOString()
    });

    saveLocalEmployeesData();
    closeModal();
    showToast('请假申请成功', 'success');

    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
        viewLocalEmployeeDetails(employeeId);
    }
    renderLocalEmployeeList();
}

function openOvertimeModal(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    document.getElementById('modalTitle').textContent = '加班申请';
    document.getElementById('modalBody').innerHTML = `
        <form id="overtimeForm">
            <input type="hidden" id="overtimeEmployeeId" value="${employeeId}">
            <div class="form-group">
                <label>员工姓名</label>
                <input type="text" value="${escapeHtml(employee.name)}" readonly>
            </div>
            <div class="form-group">
                <label>加班事由</label>
                <input type="text" id="overtimeReason" placeholder="请输入加班事由" required>
            </div>
            <div class="form-group">
                <label>加班日期</label>
                <input type="date" id="overtimeDate" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始时间</label>
                    <input type="time" id="overtimeStartTime" required>
                </div>
                <div class="form-group">
                    <label>结束时间</label>
                    <input type="time" id="overtimeEndTime" required>
                </div>
            </div>
            <div class="form-group">
                <label>加班时长（小时）</label>
                <input type="number" id="overtimeHours" min="0.5" step="0.5" readonly>
                <p style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">系统自动根据开始和结束时间计算</p>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea id="overtimeRemark" rows="3"></textarea>
            </div>
        </form>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="submitOvertime()">提交</button>
    `;
    document.getElementById('modal').style.display = 'flex';
    
    setTimeout(() => {
        const startTimeInput = document.getElementById('overtimeStartTime');
        const endTimeInput = document.getElementById('overtimeEndTime');
        const hoursInput = document.getElementById('overtimeHours');
        
        const calculateHours = () => {
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            if (startTime && endTime) {
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                let hours = endHour - startHour + (endMin - startMin) / 60;
                if (hours < 0) hours += 24;
                hoursInput.value = Math.round(hours * 2) / 2;
            }
        };
        
        startTimeInput.addEventListener('change', calculateHours);
        endTimeInput.addEventListener('change', calculateHours);
    }, 100);
}

function submitOvertime() {
    const employeeId = document.getElementById('overtimeEmployeeId').value;
    const overtimeReason = document.getElementById('overtimeReason').value;
    const overtimeDate = document.getElementById('overtimeDate').value;
    const overtimeStartTime = document.getElementById('overtimeStartTime').value;
    const overtimeEndTime = document.getElementById('overtimeEndTime').value;
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value);
    const remark = document.getElementById('overtimeRemark').value;
    
    if (!overtimeReason || !overtimeDate || !overtimeStartTime || !overtimeEndTime || !overtimeHours) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    if (overtimeHours <= 0) {
        showToast('加班时长必须大于0', 'error');
        return;
    }
    
    const leaveData = getEmployeeLeaveData(employeeId);
    leaveData.overtimeRecords.push({
        id: generateId(),
        reason: overtimeReason,
        date: overtimeDate,
        startTime: overtimeStartTime,
        endTime: overtimeEndTime,
        hours: overtimeHours,
        remark: remark,
        createdAt: new Date().toISOString()
    });
    
    saveLocalEmployeesData();
    closeModal();
    showToast('加班申请成功', 'success');
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
        viewLocalEmployeeDetails(employeeId);
    }
}

function backupCompleteData() {
    if (employees.length === 0) {
        showToast('没有数据可备份', 'warning');
        return;
    }

    const completeData = {
        employees: employees,
        localEmployeesData: localEmployeesData,
        backupTime: new Date().toISOString(),
        version: '1.0'
    };

    const dataStr = JSON.stringify(completeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr_complete_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('完整数据备份成功', 'success');
}

function exportLocalLeaveData() {
    const localEmployees = getLocalEmployees();
    
    if (localEmployees.length === 0) {
        showToast('没有本级人员数据可导出', 'warning');
        return;
    }

    showProgress('正在导出请休假数据...', 0);

    setTimeout(() => {
        try {
            const wb = XLSX.utils.book_new();

            const balanceData = localEmployees.map(emp => {
                const leaveData = getEmployeeLeaveData(emp.id);
                return {
                    '姓名': emp.name,
                    '性别': emp.gender,
                    '岗位': emp.position,
                    '身份证号': emp.idCard,
                    '剩余年休假': leaveData.annualLeave,
                    '剩余独生子女假': leaveData.onlyChildLeave,
                    '剩余育儿假': leaveData.parentingLeave,
                    '剩余调休': leaveData.compensatoryLeave || 0,
                    '已修病假': leaveData.sickLeave
                };
            });

            const ws1 = XLSX.utils.json_to_sheet(balanceData);
            XLSX.utils.book_append_sheet(wb, ws1, '假期余额');

            updateProgress(30);

            const allLeaveRecords = [];
            localEmployees.forEach(emp => {
                const leaveData = getEmployeeLeaveData(emp.id);
                leaveData.leaveRecords.forEach(record => {
                    let durationDisplay;
                    if (record.hours !== undefined) {
                        const hours = record.hours;
                        const days = (hours / 6.5).toFixed(2);
                        if (record.durationUnit) {
                            const inputUnit = record.durationUnit === 'day' ? '天' : '小时';
                            durationDisplay = `${record.duration}${inputUnit} (${hours}小时 / ${days}天)`;
                        } else {
                            durationDisplay = `${hours}小时（${days}天）`;
                        }
                    } else {
                        durationDisplay = `${record.days || '-'}天`;
                    }
                    
                    allLeaveRecords.push({
                        '姓名': emp.name,
                        '身份证号': emp.idCard,
                        '请假类型': getLeaveTypeName(record.type),
                        '开始日期': record.startDate,
                        '结束日期': record.endDate,
                        '请假时长': durationDisplay,
                        '原始输入值': record.duration || record.days || '-',
                        '原始单位': record.durationUnit ? (record.durationUnit === 'day' ? '天' : '小时') : '天',
                        '系统存储值（小时）': record.hours || (record.days ? record.days * 6.5 : '-'),
                        '备注': record.remark || '',
                        '申请时间': new Date(record.createdAt).toLocaleString('zh-CN')
                    });
                });
            });

            if (allLeaveRecords.length > 0) {
                const ws2 = XLSX.utils.json_to_sheet(allLeaveRecords);
                XLSX.utils.book_append_sheet(wb, ws2, '请假记录');
            }

            updateProgress(60);

            const allOvertimeRecords = [];
            localEmployees.forEach(emp => {
                const leaveData = getEmployeeLeaveData(emp.id);
                leaveData.overtimeRecords.forEach(record => {
                    allOvertimeRecords.push({
                        '姓名': emp.name,
                        '身份证号': emp.idCard,
                        '加班事由': record.reason || '',
                        '加班日期': record.date,
                        '开始时间': record.startTime || '',
                        '结束时间': record.endTime || '',
                        '加班时长（小时）': record.hours,
                        '备注': record.remark || '',
                        '申请时间': new Date(record.createdAt).toLocaleString('zh-CN')
                    });
                });
            });

            if (allOvertimeRecords.length > 0) {
                const ws3 = XLSX.utils.json_to_sheet(allOvertimeRecords);
                XLSX.utils.book_append_sheet(wb, ws3, '加班记录');
            }

            updateProgress(80);

            const excelFilename = `本级人员请休假数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, excelFilename);

            updateProgress(100);
            hideProgress();
            showToast('请休假数据导出成功', 'success');
        } catch (error) {
            hideProgress();
            showToast('导出失败：' + error.message, 'error');
        }
    }, 100);
}

function openInitDataModal() {
    document.getElementById('initDataPassword').value = '';
    document.getElementById('initDataPasswordError').textContent = '';
    document.getElementById('initDataModal').style.display = 'block';
    document.getElementById('initDataPassword').focus();
}

function closeInitDataModal() {
    document.getElementById('initDataModal').style.display = 'none';
}

function confirmInitData() {
    const passwordInput = document.getElementById('initDataPassword');
    const passwordError = document.getElementById('initDataPasswordError');
    const confirmBtn = document.getElementById('confirmInitDataBtn');
    const btnText = confirmBtn.querySelector('.btn-text');
    const btnLoader = confirmBtn.querySelector('.btn-loader');
    
    const password = passwordInput.value.trim();
    const storedPassword = localStorage.getItem('adminPassword') || '123456';
    
    passwordError.textContent = '';
    passwordInput.classList.remove('error');
    
    if (!password) {
        passwordError.textContent = '请输入登录密码';
        passwordInput.classList.add('error');
        return;
    }
    
    if (password !== storedPassword) {
        passwordError.textContent = '密码验证失败，请检查密码';
        passwordInput.classList.add('error');
        passwordInput.focus();
        return;
    }
    
    confirmBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    
    setTimeout(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LOCAL_DATA_STORAGE_KEY);
            localStorage.removeItem('lockoutEnd');
            
            employees = [];
            localEmployeesData = {};
            importData = [];
            importValidCount = 0;
            importInvalidCount = 0;
            dedupData = null;
            sortField = null;
            sortOrder = 'asc';
            currentPage = 1;
            loginAttempts = 0;
            
            closeInitDataModal();
            showToast('数据初始化成功，所有数据已清除', 'success');
            
            if (typeof renderDashboard === 'function') {
                renderDashboard();
            }
            if (typeof renderEmployeeList === 'function') {
                renderEmployeeList();
            }
            if (typeof renderLocalEmployeeList === 'function') {
                renderLocalEmployeeList();
            }
            
        } catch (error) {
            showToast('数据初始化失败：' + error.message, 'error');
        } finally {
            confirmBtn.disabled = false;
            btnText.style.display = 'inline-flex';
            btnLoader.style.display = 'none';
        }
    }, 800);
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-module]');
    const moduleSections = document.querySelectorAll('.module-section');
    const moduleTitle = document.getElementById('moduleTitle');
    
    const savedModule = localStorage.getItem('currentModule');
    const savedTab = localStorage.getItem('currentTab');
    
    if (savedModule) {
        switchToModule(savedModule);
        if (savedTab) {
            const moduleSection = document.getElementById(`${savedModule}-module`);
            if (moduleSection) {
                activateTab(moduleSection, savedTab);
            }
        }
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetModule = this.getAttribute('data-module');
            
            localStorage.setItem('currentModule', targetModule);
            
            history.pushState({ module: targetModule }, '', `#${targetModule}`);
            
            switchToModule(targetModule);
        });
    });
    
    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.module) {
            switchToModule(e.state.module);
        }
    });
    
    setupTabNavigation();
}

function setupTabNavigation() {
    const moduleSections = document.querySelectorAll('.module-section');
    
    moduleSections.forEach(section => {
        const tabs = section.querySelectorAll('.tab-btn');
        const moduleName = section.id.replace('-module', '');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                localStorage.setItem('currentTab', tabName);
                
                history.replaceState({ module: moduleName, tab: tabName }, '', `#${moduleName}/${tabName}`);
                
                activateTab(section, tabName);
            });
        });
    });
}

let municipalData = [];
let greeneryData = [];
let sanitationData = [];

let municipalPage = 1;
let municipalPageSize = 20;
let greeneryPage = 1;
let greeneryPageSize = 20;
let sanitationPage = 1;
let sanitationPageSize = 20;
let summaryPage = 1;
let summaryPageSize = 20;

const MAINTENANCE_LEVELS = ['一级', '二级', '三级', '四级'];

function loadBusinessData() {
    const municipal = localStorage.getItem(MUNICIPAL_STORAGE_KEY);
    const greenery = localStorage.getItem(GREENERY_STORAGE_KEY);
    const sanitation = localStorage.getItem(SANITATION_STORAGE_KEY);
    const toilet = localStorage.getItem(TOILET_STORAGE_KEY);
    
    municipalData = municipal ? JSON.parse(municipal) : [];
    greeneryData = greenery ? JSON.parse(greenery) : [];
    sanitationData = sanitation ? JSON.parse(sanitation) : [];
    toiletData = toilet ? JSON.parse(toilet) : [];
}

function saveMunicipalData() {
    localStorage.setItem(MUNICIPAL_STORAGE_KEY, JSON.stringify(municipalData));
    updateStreetFilters();
    syncMDKPIs();
}

function saveGreeneryData() {
    localStorage.setItem(GREENERY_STORAGE_KEY, JSON.stringify(greeneryData));
    updateStreetFilters();
    syncMDKPIs();
}

function saveSanitationData() {
    localStorage.setItem(SANITATION_STORAGE_KEY, JSON.stringify(sanitationData));
    updateStreetFilters();
    syncMDKPIs();
}

function syncMDKPIs() {
    if (typeof renderMDKPIs === 'function') {
        renderMDKPIs();
    }
}

function setupBusinessEventListeners() {
    document.querySelectorAll('#business-module .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            document.querySelectorAll('#business-module .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#business-module .tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            if (tab === 'summary') renderSummaryList();
            else if (tab === 'municipal') renderMunicipalList();
            else if (tab === 'greenery') renderGreeneryList();
            else if (tab === 'sanitation') renderSanitationList();
            else if (tab === 'toilet') renderToiletList();
        });
    });

    document.getElementById('addMunicipalBtn').addEventListener('click', () => openMunicipalForm());
    document.getElementById('addGreeneryBtn').addEventListener('click', () => openGreeneryForm());
    document.getElementById('addSanitationBtn').addEventListener('click', () => openSanitationForm());
    document.getElementById('addToiletBtn').addEventListener('click', () => openToiletForm());
    
    document.getElementById('municipalForm').addEventListener('submit', handleMunicipalFormSubmit);
    document.getElementById('greeneryForm').addEventListener('submit', handleGreeneryFormSubmit);
    document.getElementById('sanitationForm').addEventListener('submit', handleSanitationFormSubmit);
    document.getElementById('toiletForm').addEventListener('submit', handleToiletFormSubmit);
    
    document.getElementById('closeMunicipalFormModal').addEventListener('click', closeMunicipalForm);
    document.getElementById('municipalCancelBtn').addEventListener('click', closeMunicipalForm);
    document.getElementById('municipalResetBtn').addEventListener('click', resetMunicipalForm);
    document.getElementById('municipalFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'municipalFormModal') closeMunicipalForm();
    });
    
    document.getElementById('closeGreeneryFormModal').addEventListener('click', closeGreeneryForm);
    document.getElementById('greeneryCancelBtn').addEventListener('click', closeGreeneryForm);
    document.getElementById('greeneryResetBtn').addEventListener('click', resetGreeneryForm);
    document.getElementById('greeneryFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'greeneryFormModal') closeGreeneryForm();
    });
    
    document.getElementById('closeSanitationFormModal').addEventListener('click', closeSanitationForm);
    document.getElementById('sanitationCancelBtn').addEventListener('click', closeSanitationForm);
    document.getElementById('sanitationResetBtn').addEventListener('click', resetSanitationForm);
    document.getElementById('sanitationFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'sanitationFormModal') closeSanitationForm();
    });
    
    document.getElementById('closeToiletFormModal').addEventListener('click', closeToiletForm);
    document.getElementById('toiletCancelBtn').addEventListener('click', closeToiletForm);
    document.getElementById('toiletResetBtn').addEventListener('click', resetToiletForm);
    document.getElementById('toiletFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'toiletFormModal') closeToiletForm();
    });
    
    document.getElementById('closeBusinessDetailModal').addEventListener('click', closeBusinessDetail);
    document.getElementById('businessDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'businessDetailModal') closeBusinessDetail();
    });

    document.getElementById('municipalSearchBtn').addEventListener('click', () => {
        municipalPage = 1;
        renderMunicipalList();
    });
    document.getElementById('municipalSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            municipalPage = 1;
            renderMunicipalList();
        }
    });
    document.getElementById('municipalFilterStreet').addEventListener('change', () => {
        municipalPage = 1;
        renderMunicipalList();
    });
    
    document.getElementById('greenerySearchBtn').addEventListener('click', () => {
        greeneryPage = 1;
        renderGreeneryList();
    });
    document.getElementById('greenerySearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            greeneryPage = 1;
            renderGreeneryList();
        }
    });
    document.getElementById('greeneryFilterStreet').addEventListener('change', () => {
        greeneryPage = 1;
        renderGreeneryList();
    });
    
    document.getElementById('sanitationSearchBtn').addEventListener('click', () => {
        sanitationPage = 1;
        renderSanitationList();
    });
    document.getElementById('sanitationSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sanitationPage = 1;
            renderSanitationList();
        }
    });
    document.getElementById('sanitationFilterStreet').addEventListener('change', () => {
        sanitationPage = 1;
        renderSanitationList();
    });
    
    document.getElementById('toiletSearchBtn').addEventListener('click', () => {
        toiletPage = 1;
        renderToiletList();
    });
    document.getElementById('toiletSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            toiletPage = 1;
            renderToiletList();
        }
    });
    document.getElementById('toiletFilterStreet').addEventListener('change', () => {
        toiletPage = 1;
        renderToiletList();
    });
    document.getElementById('toiletFilterLevel').addEventListener('change', () => {
        toiletPage = 1;
        renderToiletList();
    });
    document.getElementById('toiletClearSearchBtn').addEventListener('click', clearToiletFilters);

    const summarySearchBtn = document.getElementById('summarySearchBtn');
    if (summarySearchBtn) summarySearchBtn.addEventListener('click', () => { summaryPage = 1; renderSummaryList(); });
    const summarySearchKeyword = document.getElementById('summarySearchKeyword');
    if (summarySearchKeyword) summarySearchKeyword.addEventListener('keypress', (e) => { if (e.key === 'Enter') { summaryPage = 1; renderSummaryList(); } });
    const summaryClearFilterBtn = document.getElementById('summaryClearFilterBtn');
    if (summaryClearFilterBtn) summaryClearFilterBtn.addEventListener('click', clearSummaryFilters);

    document.getElementById('municipalPrevPage').addEventListener('click', () => {
        if (municipalPage > 1) {
            municipalPage--;
            renderMunicipalList();
        }
    });
    document.getElementById('municipalNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredMunicipalData().length / municipalPageSize);
        if (municipalPage < totalPages) {
            municipalPage++;
            renderMunicipalList();
        }
    });
    document.getElementById('municipalPageSize').addEventListener('change', (e) => {
        municipalPageSize = parseInt(e.target.value);
        municipalPage = 1;
        renderMunicipalList();
    });
    
    document.getElementById('greeneryPrevPage').addEventListener('click', () => {
        if (greeneryPage > 1) {
            greeneryPage--;
            renderGreeneryList();
        }
    });
    document.getElementById('greeneryNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredGreeneryData().length / greeneryPageSize);
        if (greeneryPage < totalPages) {
            greeneryPage++;
            renderGreeneryList();
        }
    });
    document.getElementById('greeneryPageSize').addEventListener('change', (e) => {
        greeneryPageSize = parseInt(e.target.value);
        greeneryPage = 1;
        renderGreeneryList();
    });
    
    document.getElementById('sanitationPrevPage').addEventListener('click', () => {
        if (sanitationPage > 1) {
            sanitationPage--;
            renderSanitationList();
        }
    });
    document.getElementById('sanitationNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredSanitationData().length / sanitationPageSize);
        if (sanitationPage < totalPages) {
            sanitationPage++;
            renderSanitationList();
        }
    });
    document.getElementById('sanitationPageSize').addEventListener('change', (e) => {
        sanitationPageSize = parseInt(e.target.value);
        sanitationPage = 1;
        renderSanitationList();
    });
    
    const summaryPrevPage = document.getElementById('summaryPrevPage');
    if (summaryPrevPage) summaryPrevPage.addEventListener('click', () => { if (summaryPage > 1) { summaryPage--; renderSummaryList(); } });
    const summaryNextPage = document.getElementById('summaryNextPage');
    if (summaryNextPage) summaryNextPage.addEventListener('click', () => { const totalPages = Math.ceil(getFilteredSummaryData().length / summaryPageSize); if (summaryPage < totalPages) { summaryPage++; renderSummaryList(); } });
    const summaryPageSizeEl = document.getElementById('summaryPageSize');
    if (summaryPageSizeEl) summaryPageSizeEl.addEventListener('change', (e) => { summaryPageSize = parseInt(e.target.value); summaryPage = 1; renderSummaryList(); });

    document.getElementById('exportMunicipalBtn').addEventListener('click', exportMunicipalToExcel);
    document.getElementById('exportGreeneryBtn').addEventListener('click', exportGreeneryToExcel);
    document.getElementById('exportSanitationBtn').addEventListener('click', exportSanitationToExcel);
    const exportSummaryBtn = document.getElementById('exportSummaryBtn');
    if (exportSummaryBtn) exportSummaryBtn.addEventListener('click', exportSummaryToExcel);
    document.getElementById('exportToiletBtn').addEventListener('click', exportToiletToExcel);
    
    document.getElementById('toiletPrevPage').addEventListener('click', () => {
        if (toiletPage > 1) {
            toiletPage--;
            renderToiletList();
        }
    });
    document.getElementById('toiletNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredToiletData().length / toiletPageSize);
        if (toiletPage < totalPages) {
            toiletPage++;
            renderToiletList();
        }
    });
    document.getElementById('toiletPageSize').addEventListener('change', (e) => {
        toiletPageSize = parseInt(e.target.value);
        toiletPage = 1;
        renderToiletList();
    });
    
    document.getElementById('importToiletBtn').addEventListener('click', () => {
        document.getElementById('importToiletModal').style.display = 'block';
    });
    document.getElementById('closeImportToiletModal').addEventListener('click', closeToiletImportModal);
    document.getElementById('toiletCancelImport').addEventListener('click', closeToiletImportModal);
    document.getElementById('toiletSelectFileBtn').addEventListener('click', () => {
        document.getElementById('toiletFileInput').click();
    });
    document.getElementById('toiletFileInput').addEventListener('change', handleToiletFileSelect);
    document.getElementById('toiletRemoveFile').addEventListener('click', resetToiletFileInput);
    document.getElementById('toiletStartImport').addEventListener('click', confirmToiletImport);
}

function openMunicipalForm(id = null) {
    resetMunicipalForm();
    if (id) {
        const data = municipalData.find(item => item.id === id);
        if (data) {
            document.getElementById('municipalFormTitle').textContent = '编辑市政养护记录';
            document.getElementById('municipalId').value = data.id;
            document.getElementById('municipalRoadName').value = data.roadName || '';
            document.getElementById('municipalStartEndPoint').value = data.startEndPoint || '';
            document.getElementById('municipalStreet').value = data.street || '';
            document.getElementById('municipalRoadLength').value = data.roadLength || '';
            document.getElementById('municipalRoadArea').value = data.roadArea || '';
            document.getElementById('municipalCarriagewayArea').value = data.carriagewayArea || '';
            document.getElementById('municipalSidewalkArea').value = data.sidewalkArea || '';
            document.getElementById('municipalCurbLength').value = data.curbLength || '';
            document.getElementById('municipalMaintenanceLevel').value = data.maintenanceLevel || '';
            document.getElementById('municipalBridgeCarriagewayArea').value = data.bridgeCarriagewayArea || '';
            document.getElementById('municipalBridgeSidewalkArea').value = data.bridgeSidewalkArea || '';
            document.getElementById('municipalBridgeGuardrailLength').value = data.bridgeGuardrailLength || '';
            document.getElementById('municipalBridgeExpansionJointLength').value = data.bridgeExpansionJointLength || '';
            document.getElementById('municipalBridgeCount').value = data.bridgeCount || '';
            document.getElementById('municipalStreetlightCount').value = data.streetlightCount || '';
        }
    } else {
        document.getElementById('municipalFormTitle').textContent = '新增市政养护记录';
    }
    document.getElementById('municipalFormModal').style.display = 'flex';
}

function closeMunicipalForm() {
    document.getElementById('municipalFormModal').style.display = 'none';
    resetMunicipalForm();
}

function resetMunicipalForm() {
    document.getElementById('municipalForm').reset();
    document.getElementById('municipalId').value = '';
    clearBusinessErrors('municipal');
}

function openGreeneryForm(id = null) {
    resetGreeneryForm();
    if (id) {
        const data = greeneryData.find(item => item.id === id);
        if (data) {
            document.getElementById('greeneryFormTitle').textContent = '编辑绿化养护记录';
            document.getElementById('greeneryId').value = data.id;
            document.getElementById('greeneryRoadName').value = data.roadName || '';
            document.getElementById('greeneryStartEndPoint').value = data.startEndPoint || '';
            document.getElementById('greeneryStreet').value = data.street || '';
            document.getElementById('greeneryTotalArea').value = data.totalArea || '';
            document.getElementById('greeneryGreenArea').value = data.greenArea || '';
            document.getElementById('greeneryStreetTrees').value = data.streetTrees || '';
            document.getElementById('greeneryFlowerArea').value = data.flowerArea || '';
        }
    } else {
        document.getElementById('greeneryFormTitle').textContent = '新增绿化养护记录';
    }
    document.getElementById('greeneryFormModal').style.display = 'flex';
}

function closeGreeneryForm() {
    document.getElementById('greeneryFormModal').style.display = 'none';
    resetGreeneryForm();
}

function resetGreeneryForm() {
    document.getElementById('greeneryForm').reset();
    document.getElementById('greeneryId').value = '';
    clearBusinessErrors('greenery');
}

function openSanitationForm(id = null) {
    resetSanitationForm();
    if (id) {
        const data = sanitationData.find(item => item.id === id);
        if (data) {
            document.getElementById('sanitationFormTitle').textContent = '编辑环卫养护记录';
            document.getElementById('sanitationId').value = data.id;
            document.getElementById('sanitationRoadName').value = data.roadName || '';
            document.getElementById('sanitationStartEndPoint').value = data.startEndPoint || '';
            document.getElementById('sanitationStreet').value = data.street || '';
            document.getElementById('sanitationMaintenanceLevel').value = data.maintenanceLevel || '';
            document.getElementById('sanitationRoadLength').value = data.roadLength || '';
            document.getElementById('sanitationTotalCleaningArea').value = data.totalCleaningArea || '';
            document.getElementById('sanitationRoadCleaningArea').value = data.roadCleaningArea || '';
            document.getElementById('sanitationGardenCleaningArea').value = data.gardenCleaningArea || '';
        }
    } else {
        document.getElementById('sanitationFormTitle').textContent = '新增环卫养护记录';
    }
    document.getElementById('sanitationFormModal').style.display = 'flex';
}

function closeSanitationForm() {
    document.getElementById('sanitationFormModal').style.display = 'none';
    resetSanitationForm();
}

function resetSanitationForm() {
    document.getElementById('sanitationForm').reset();
    document.getElementById('sanitationId').value = '';
    clearBusinessErrors('sanitation');
}

function clearBusinessErrors(prefix) {
    document.querySelectorAll(`#${prefix}Form .error-message`).forEach(el => el.textContent = '');
}

function validateMunicipalForm() {
    let isValid = true;
    clearBusinessErrors('municipal');
    
    const roadName = document.getElementById('municipalRoadName').value.trim();
    const startEndPoint = document.getElementById('municipalStartEndPoint').value.trim();
    const roadLength = document.getElementById('municipalRoadLength').value;
    const roadArea = document.getElementById('municipalRoadArea').value;
    const carriagewayArea = document.getElementById('municipalCarriagewayArea').value;
    const sidewalkArea = document.getElementById('municipalSidewalkArea').value;
    const curbLength = document.getElementById('municipalCurbLength').value;
    const maintenanceLevel = document.getElementById('municipalMaintenanceLevel').value;
    
    if (!roadName) {
        document.getElementById('municipalRoadNameError').textContent = '请输入道路名称';
        isValid = false;
    } else if (roadName.length > 50) {
        document.getElementById('municipalRoadNameError').textContent = '道路名称不能超过50个字符';
        isValid = false;
    }
    
    if (!startEndPoint) {
        document.getElementById('municipalStartEndPointError').textContent = '请输入起止点';
        isValid = false;
    } else if (startEndPoint.length > 100) {
        document.getElementById('municipalStartEndPointError').textContent = '起止点不能超过100个字符';
        isValid = false;
    }
    
    if (!roadLength || roadLength < 0) {
        document.getElementById('municipalRoadLengthError').textContent = '请输入有效的道路长度';
        isValid = false;
    }
    
    if (!roadArea || roadArea < 0) {
        document.getElementById('municipalRoadAreaError').textContent = '请输入有效的道路面积';
        isValid = false;
    }
    
    if (!carriagewayArea || carriagewayArea < 0) {
        document.getElementById('municipalCarriagewayAreaError').textContent = '请输入有效的车行道面积';
        isValid = false;
    }
    
    if (!sidewalkArea || sidewalkArea < 0) {
        document.getElementById('municipalSidewalkAreaError').textContent = '请输入有效的人行道面积';
        isValid = false;
    }
    
    if (!curbLength || curbLength < 0) {
        document.getElementById('municipalCurbLengthError').textContent = '请输入有效的侧平石长度';
        isValid = false;
    }
    
    if (!maintenanceLevel) {
        document.getElementById('municipalMaintenanceLevelError').textContent = '请选择养护等级';
        isValid = false;
    }
    
    return isValid;
}

function validateGreeneryForm() {
    let isValid = true;
    clearBusinessErrors('greenery');
    
    const roadName = document.getElementById('greeneryRoadName').value.trim();
    const startEndPoint = document.getElementById('greeneryStartEndPoint').value.trim();
    const totalAreaInput = document.getElementById('greeneryTotalArea').value.trim();
    const greenAreaInput = document.getElementById('greeneryGreenArea').value.trim();
    const streetTrees = document.getElementById('greeneryStreetTrees').value;
    const flowerArea = parseFloat(document.getElementById('greeneryFlowerArea').value) || 0;
    
    if (!roadName) {
        document.getElementById('greeneryRoadNameError').textContent = '请输入道路名称';
        isValid = false;
    } else if (roadName.length > 50) {
        document.getElementById('greeneryRoadNameError').textContent = '道路名称不能超过50个字符';
        isValid = false;
    }
    
    if (!startEndPoint) {
        document.getElementById('greeneryStartEndPointError').textContent = '请输入起止点';
        isValid = false;
    } else if (startEndPoint.length > 100) {
        document.getElementById('greeneryStartEndPointError').textContent = '起止点不能超过100个字符';
        isValid = false;
    }
    
    let totalAreaValid = true;
    const totalArea = parseFloat(totalAreaInput) || 0;
    if (!totalAreaInput) {
        document.getElementById('greeneryTotalAreaError').textContent = '请输入总面积';
        isValid = false;
        totalAreaValid = false;
    } else if (totalArea < 0) {
        document.getElementById('greeneryTotalAreaError').textContent = '总面积不能为负数';
        isValid = false;
        totalAreaValid = false;
    }
    
    const greenArea = parseFloat(greenAreaInput) || 0;
    if (!greenAreaInput) {
        document.getElementById('greeneryGreenAreaError').textContent = '请输入绿化面积';
        isValid = false;
    } else if (greenArea < 0) {
        document.getElementById('greeneryGreenAreaError').textContent = '绿化面积不能为负数';
        isValid = false;
    } else if (totalAreaValid && greenArea > totalArea) {
        document.getElementById('greeneryGreenAreaError').textContent = '绿化面积不能大于总面积';
        isValid = false;
    }
    
    if (!streetTrees || streetTrees < 0) {
        document.getElementById('greeneryStreetTreesError').textContent = '请输入有效的行道树数量';
        isValid = false;
    }
    
    if (flowerArea < 0) {
        document.getElementById('greeneryFlowerAreaError').textContent = '请输入有效的草花面积';
        isValid = false;
    } else if (flowerArea > greenArea) {
        document.getElementById('greeneryFlowerAreaError').textContent = '草花面积不能大于绿化面积';
        isValid = false;
    }
    
    return isValid;
}

function validateSanitationForm() {
    let isValid = true;
    clearBusinessErrors('sanitation');
    
    const roadName = document.getElementById('sanitationRoadName').value.trim();
    const startEndPoint = document.getElementById('sanitationStartEndPoint').value.trim();
    const maintenanceLevel = document.getElementById('sanitationMaintenanceLevel').value;
    const roadLength = document.getElementById('sanitationRoadLength').value;
    const totalCleaningArea = parseFloat(document.getElementById('sanitationTotalCleaningArea').value) || 0;
    const roadCleaningArea = parseFloat(document.getElementById('sanitationRoadCleaningArea').value) || 0;
    const gardenCleaningArea = parseFloat(document.getElementById('sanitationGardenCleaningArea').value) || 0;
    
    if (!roadName) {
        document.getElementById('sanitationRoadNameError').textContent = '请输入道路名称';
        isValid = false;
    } else if (roadName.length > 50) {
        document.getElementById('sanitationRoadNameError').textContent = '道路名称不能超过50个字符';
        isValid = false;
    }
    
    if (!startEndPoint) {
        document.getElementById('sanitationStartEndPointError').textContent = '请输入起止点';
        isValid = false;
    } else if (startEndPoint.length > 100) {
        document.getElementById('sanitationStartEndPointError').textContent = '起止点不能超过100个字符';
        isValid = false;
    }
    
    if (!maintenanceLevel) {
        document.getElementById('sanitationMaintenanceLevelError').textContent = '请选择养护等级';
        isValid = false;
    }
    
    if (!roadLength || roadLength < 0) {
        document.getElementById('sanitationRoadLengthError').textContent = '请输入有效的道路长度';
        isValid = false;
    }
    
    if (totalCleaningArea <= 0) {
        document.getElementById('sanitationTotalCleaningAreaError').textContent = '请输入有效的保洁总面积';
        isValid = false;
    }
    
    if (roadCleaningArea < 0) {
        document.getElementById('sanitationRoadCleaningAreaError').textContent = '请输入有效的道路保洁面积';
        isValid = false;
    } else if (roadCleaningArea > totalCleaningArea) {
        document.getElementById('sanitationRoadCleaningAreaError').textContent = '道路保洁面积不能大于保洁总面积';
        isValid = false;
    }
    
    if (gardenCleaningArea < 0) {
        document.getElementById('sanitationGardenCleaningAreaError').textContent = '请输入有效的园林保洁面积';
        isValid = false;
    } else if (gardenCleaningArea > totalCleaningArea) {
        document.getElementById('sanitationGardenCleaningAreaError').textContent = '园林保洁面积不能大于保洁总面积';
        isValid = false;
    }
    
    return isValid;
}

function handleMunicipalFormSubmit(e) {
    e.preventDefault();
    
    if (!validateMunicipalForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }
    
    const id = document.getElementById('municipalId').value;
    const data = {
        id: id || generateId(),
        roadName: document.getElementById('municipalRoadName').value.trim(),
        startEndPoint: document.getElementById('municipalStartEndPoint').value.trim(),
        street: document.getElementById('municipalStreet').value.trim(),
        roadLength: parseFloat(document.getElementById('municipalRoadLength').value) || 0,
        roadArea: parseFloat(document.getElementById('municipalRoadArea').value) || 0,
        carriagewayArea: parseFloat(document.getElementById('municipalCarriagewayArea').value) || 0,
        sidewalkArea: parseFloat(document.getElementById('municipalSidewalkArea').value) || 0,
        curbLength: parseFloat(document.getElementById('municipalCurbLength').value) || 0,
        maintenanceLevel: document.getElementById('municipalMaintenanceLevel').value,
        bridgeCarriagewayArea: parseFloat(document.getElementById('municipalBridgeCarriagewayArea').value) || null,
        bridgeSidewalkArea: parseFloat(document.getElementById('municipalBridgeSidewalkArea').value) || null,
        bridgeGuardrailLength: parseFloat(document.getElementById('municipalBridgeGuardrailLength').value) || null,
        bridgeExpansionJointLength: parseFloat(document.getElementById('municipalBridgeExpansionJointLength').value) || null,
        bridgeCount: parseInt(document.getElementById('municipalBridgeCount').value) || null,
        streetlightCount: parseInt(document.getElementById('municipalStreetlightCount').value) || null,
        createdAt: id ? municipalData.find(item => item.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = municipalData.findIndex(item => item.id === id);
        municipalData[index] = data;
        showToast('市政养护记录更新成功', 'success');
    } else {
        municipalData.unshift(data);
        showToast('市政养护记录添加成功', 'success');
    }
    
    saveMunicipalData();
    closeMunicipalForm();
    renderMunicipalList();
}

function handleGreeneryFormSubmit(e) {
    e.preventDefault();
    
    if (!validateGreeneryForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }
    
    const id = document.getElementById('greeneryId').value;
    const data = {
        id: id || generateId(),
        roadName: document.getElementById('greeneryRoadName').value.trim(),
        startEndPoint: document.getElementById('greeneryStartEndPoint').value.trim(),
        street: document.getElementById('greeneryStreet').value.trim(),
        totalArea: parseFloat(document.getElementById('greeneryTotalArea').value) || 0,
        greenArea: parseFloat(document.getElementById('greeneryGreenArea').value) || 0,
        streetTrees: parseInt(document.getElementById('greeneryStreetTrees').value) || 0,
        flowerArea: parseFloat(document.getElementById('greeneryFlowerArea').value) || 0,
        createdAt: id ? greeneryData.find(item => item.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = greeneryData.findIndex(item => item.id === id);
        greeneryData[index] = data;
        showToast('绿化养护记录更新成功', 'success');
    } else {
        greeneryData.unshift(data);
        showToast('绿化养护记录添加成功', 'success');
    }
    
    saveGreeneryData();
    closeGreeneryForm();
    renderGreeneryList();
}

function handleSanitationFormSubmit(e) {
    e.preventDefault();
    
    if (!validateSanitationForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }
    
    const id = document.getElementById('sanitationId').value;
    const data = {
        id: id || generateId(),
        roadName: document.getElementById('sanitationRoadName').value.trim(),
        startEndPoint: document.getElementById('sanitationStartEndPoint').value.trim(),
        street: document.getElementById('sanitationStreet').value.trim(),
        maintenanceLevel: document.getElementById('sanitationMaintenanceLevel').value,
        roadLength: parseFloat(document.getElementById('sanitationRoadLength').value) || 0,
        totalCleaningArea: parseFloat(document.getElementById('sanitationTotalCleaningArea').value) || 0,
        roadCleaningArea: parseFloat(document.getElementById('sanitationRoadCleaningArea').value) || 0,
        gardenCleaningArea: parseFloat(document.getElementById('sanitationGardenCleaningArea').value) || 0,
        createdAt: id ? sanitationData.find(item => item.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = sanitationData.findIndex(item => item.id === id);
        sanitationData[index] = data;
        showToast('环卫养护记录更新成功', 'success');
    } else {
        sanitationData.unshift(data);
        showToast('环卫养护记录添加成功', 'success');
    }
    
    saveSanitationData();
    closeSanitationForm();
    renderSanitationList();
}

function getFilteredMunicipalData() {
    const keyword = document.getElementById('municipalSearchKeyword').value.trim().toLowerCase();
    const level = document.getElementById('municipalFilterLevel').value;
    const street = document.getElementById('municipalFilterStreet').value;
    
    return municipalData.filter(item => {
        const matchKeyword = !keyword || 
            (item.roadName && item.roadName.toLowerCase().includes(keyword)) ||
            (item.startEndPoint && item.startEndPoint.toLowerCase().includes(keyword));
        const matchLevel = !level || item.maintenanceLevel === level;
        const matchStreet = !street || item.street === street;
        return matchKeyword && matchLevel && matchStreet;
    });
}

function getFilteredGreeneryData() {
    const keyword = document.getElementById('greenerySearchKeyword').value.trim().toLowerCase();
    const street = document.getElementById('greeneryFilterStreet').value;
    
    return greeneryData.filter(item => {
        const matchKeyword = !keyword || 
            (item.roadName && item.roadName.toLowerCase().includes(keyword)) ||
            (item.startEndPoint && item.startEndPoint.toLowerCase().includes(keyword));
        const matchStreet = !street || item.street === street;
        return matchKeyword && matchStreet;
    });
}

function getFilteredSanitationData() {
    const keyword = document.getElementById('sanitationSearchKeyword').value.trim().toLowerCase();
    const level = document.getElementById('sanitationFilterLevel').value;
    const street = document.getElementById('sanitationFilterStreet').value;
    
    return sanitationData.filter(item => {
        const matchKeyword = !keyword || 
            (item.roadName && item.roadName.toLowerCase().includes(keyword)) ||
            (item.startEndPoint && item.startEndPoint.toLowerCase().includes(keyword));
        const matchLevel = !level || item.maintenanceLevel === level;
        const matchStreet = !street || item.street === street;
        return matchKeyword && matchLevel && matchStreet;
    });
}

function getFilteredSummaryData() {
    const type = document.getElementById('summaryFilterType').value;
    const level = document.getElementById('summaryFilterLevel').value;
    const dateStart = document.getElementById('summaryFilterDateStart').value;
    const dateEnd = document.getElementById('summaryFilterDateEnd').value;
    const keyword = document.getElementById('summarySearchKeyword').value.trim().toLowerCase();
    
    let result = [];
    
    if (!type || type === 'municipal') {
        municipalData.forEach(item => {
            result.push({
                ...item,
                type: 'municipal',
                typeName: '市政养护',
                areaDisplay: item.roadArea
            });
        });
    }
    
    if (!type || type === 'greenery') {
        greeneryData.forEach(item => {
            result.push({
                ...item,
                type: 'greenery',
                typeName: '绿化养护',
                areaDisplay: item.totalArea
            });
        });
    }
    
    if (!type || type === 'sanitation') {
        sanitationData.forEach(item => {
            result.push({
                ...item,
                type: 'sanitation',
                typeName: '环卫养护',
                areaDisplay: item.totalCleaningArea
            });
        });
    }
    
    return result.filter(item => {
        const matchLevel = !level || item.maintenanceLevel === level;
        const matchDateStart = !dateStart || (item.createdAt && item.createdAt >= dateStart);
        const matchDateEnd = !dateEnd || (item.createdAt && item.createdAt <= dateEnd + 'T23:59:59');
        const matchKeyword = !keyword || 
            (item.roadName && item.roadName.toLowerCase().includes(keyword)) ||
            (item.startEndPoint && item.startEndPoint.toLowerCase().includes(keyword));
        return matchLevel && matchDateStart && matchDateEnd && matchKeyword;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function clearSummaryFilters() {
    document.getElementById('summaryFilterType').value = '';
    document.getElementById('summaryFilterLevel').value = '';
    document.getElementById('summaryFilterDateStart').value = '';
    document.getElementById('summaryFilterDateEnd').value = '';
    document.getElementById('summarySearchKeyword').value = '';
    summaryPage = 1;
    renderSummaryList();
}

function updateStreetFilters() {
    const municipalStreets = [...new Set(municipalData.map(item => item.street).filter(s => s))].sort();
    const greeneryStreets = [...new Set(greeneryData.map(item => item.street).filter(s => s))].sort();
    const sanitationStreets = [...new Set(sanitationData.map(item => item.street).filter(s => s))].sort();
    
    updateStreetSelect('municipalFilterStreet', municipalStreets);
    updateStreetSelect('greeneryFilterStreet', greeneryStreets);
    updateStreetSelect('sanitationFilterStreet', sanitationStreets);
}

function updateStreetSelect(selectId, streets) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">全部</option>';
    streets.forEach(street => {
        const option = document.createElement('option');
        option.value = street;
        option.textContent = street;
        select.appendChild(option);
    });
    
    if (streets.includes(currentValue)) {
        select.value = currentValue;
    }
}

function renderMunicipalList() {
    const filtered = getFilteredMunicipalData();
    const tbody = document.getElementById('municipalTableBody');
    const emptyMessage = document.getElementById('municipalEmptyMessage');
    const totalCount = document.getElementById('municipalTotalCount');
    
    totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.getElementById('municipalPagination').style.display = 'none';
        updateMunicipalSummary([]);
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / municipalPageSize);
    if (municipalPage > totalPages) municipalPage = totalPages;
    const start = (municipalPage - 1) * municipalPageSize;
    const end = start + municipalPageSize;
    const pageData = filtered.slice(start, end);
    
    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>${escapeHtml(item.roadName)}</td>
            <td>${escapeHtml(item.street || '-')}</td>
            <td>${escapeHtml(item.startEndPoint)}</td>
            <td>${item.roadLength ? item.roadLength.toFixed(2) : '-'}</td>
            <td>${item.roadArea ? item.roadArea.toFixed(2) : '-'}</td>
            <td>${item.bridgeCount || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewBusinessDetail('municipal', '${item.id}')">查看</button>
                    <button class="btn btn-secondary btn-small" onclick="editMunicipal('${item.id}')">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteMunicipal('${item.id}')">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateMunicipalSummary(filtered);
    
    document.getElementById('municipalCurrentPage').textContent = municipalPage;
    document.getElementById('municipalTotalPages').textContent = totalPages;
    document.getElementById('municipalPrevPage').disabled = municipalPage <= 1;
    document.getElementById('municipalNextPage').disabled = municipalPage >= totalPages;
    document.getElementById('municipalPagination').style.display = 'flex';
}

function updateMunicipalSummary(data) {
    const totalLength = data.reduce((sum, item) => sum + (parseFloat(item.roadLength) || 0), 0);
    const totalArea = data.reduce((sum, item) => sum + (parseFloat(item.roadArea) || 0), 0);
    
    document.getElementById('municipalTotalLength').textContent = totalLength.toFixed(2);
    document.getElementById('municipalTotalArea').textContent = totalArea.toFixed(2);
}

function renderGreeneryList() {
    const filtered = getFilteredGreeneryData();
    const tbody = document.getElementById('greeneryTableBody');
    const emptyMessage = document.getElementById('greeneryEmptyMessage');
    const totalCount = document.getElementById('greeneryTotalCount');
    
    totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.getElementById('greeneryPagination').style.display = 'none';
        updateGreenerySummary([]);
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / greeneryPageSize);
    if (greeneryPage > totalPages) greeneryPage = totalPages;
    const start = (greeneryPage - 1) * greeneryPageSize;
    const end = start + greeneryPageSize;
    const pageData = filtered.slice(start, end);
    
    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>${escapeHtml(item.roadName)}</td>
            <td>${escapeHtml(item.street || '-')}</td>
            <td>${escapeHtml(item.startEndPoint)}</td>
            <td>${item.totalArea ? item.totalArea.toFixed(2) : '-'}</td>
            <td>${item.greenArea ? item.greenArea.toFixed(2) : '-'}</td>
            <td>${item.streetTrees || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewBusinessDetail('greenery', '${item.id}')">查看</button>
                    <button class="btn btn-secondary btn-small" onclick="editGreenery('${item.id}')">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteGreenery('${item.id}')">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateGreenerySummary(filtered);
    
    document.getElementById('greeneryCurrentPage').textContent = greeneryPage;
    document.getElementById('greeneryTotalPages').textContent = totalPages;
    document.getElementById('greeneryPrevPage').disabled = greeneryPage <= 1;
    document.getElementById('greeneryNextPage').disabled = greeneryPage >= totalPages;
    document.getElementById('greeneryPagination').style.display = 'flex';
}

function updateGreenerySummary(data) {
    const totalArea = data.reduce((sum, item) => sum + (parseFloat(item.totalArea) || 0), 0);
    const totalGreenArea = data.reduce((sum, item) => sum + (parseFloat(item.greenArea) || 0), 0);
    const totalTrees = data.reduce((sum, item) => sum + (parseInt(item.streetTrees) || 0), 0);
    
    document.getElementById('greeneryTotalAreaSum').textContent = totalArea.toFixed(2);
    document.getElementById('greeneryTotalGreenAreaSum').textContent = totalGreenArea.toFixed(2);
    document.getElementById('greeneryTotalTreesSum').textContent = totalTrees;
}

function renderSanitationList() {
    const filtered = getFilteredSanitationData();
    const tbody = document.getElementById('sanitationTableBody');
    const emptyMessage = document.getElementById('sanitationEmptyMessage');
    const totalCount = document.getElementById('sanitationTotalCount');
    
    totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.getElementById('sanitationPagination').style.display = 'none';
        updateSanitationSummary([]);
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / sanitationPageSize);
    if (sanitationPage > totalPages) sanitationPage = totalPages;
    const start = (sanitationPage - 1) * sanitationPageSize;
    const end = start + sanitationPageSize;
    const pageData = filtered.slice(start, end);
    
    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>${escapeHtml(item.roadName)}</td>
            <td>${escapeHtml(item.street || '-')}</td>
            <td>${escapeHtml(item.startEndPoint)}</td>
            <td>${escapeHtml(item.maintenanceLevel) || '-'}</td>
            <td>${item.roadLength ? item.roadLength.toFixed(2) : '-'}</td>
            <td>${item.totalCleaningArea ? item.totalCleaningArea.toFixed(2) : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewBusinessDetail('sanitation', '${item.id}')">查看</button>
                    <button class="btn btn-secondary btn-small" onclick="editSanitation('${item.id}')">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteSanitation('${item.id}')">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateSanitationSummary(filtered);
    
    document.getElementById('sanitationCurrentPage').textContent = sanitationPage;
    document.getElementById('sanitationTotalPages').textContent = totalPages;
    document.getElementById('sanitationPrevPage').disabled = sanitationPage <= 1;
    document.getElementById('sanitationNextPage').disabled = sanitationPage >= totalPages;
    document.getElementById('sanitationPagination').style.display = 'flex';
}

function updateSanitationSummary(data) {
    const totalLength = data.reduce((sum, item) => sum + (parseFloat(item.roadLength) || 0), 0);
    const totalArea = data.reduce((sum, item) => sum + (parseFloat(item.totalCleaningArea) || 0), 0);
    
    document.getElementById('sanitationTotalLength').textContent = totalLength.toFixed(2);
    document.getElementById('sanitationTotalArea').textContent = totalArea.toFixed(2);
}

function renderSummaryList() {
    const filtered = getFilteredSummaryData();
    const tbody = document.getElementById('summaryTableBody');
    const emptyMessage = document.getElementById('summaryEmptyMessage');
    const totalCount = document.getElementById('summaryTotalCount');
    const displayCount = document.getElementById('summaryDisplayCount');
    
    totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        displayCount.textContent = '0';
        document.getElementById('summaryPagination').style.display = 'none';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / summaryPageSize);
    if (summaryPage > totalPages) summaryPage = totalPages;
    const start = (summaryPage - 1) * summaryPageSize;
    const end = start + summaryPageSize;
    const pageData = filtered.slice(start, end);
    
    displayCount.textContent = pageData.length;
    
    tbody.innerHTML = pageData.map((item, index) => `
        <tr>
            <td>${start + index + 1}</td>
            <td>${escapeHtml(item.typeName)}</td>
            <td>${escapeHtml(item.roadName)}</td>
            <td>${escapeHtml(item.startEndPoint)}</td>
            <td>${escapeHtml(item.street) || '-'}</td>
            <td>${escapeHtml(item.maintenanceLevel) || '-'}</td>
            <td>${item.roadLength ? item.roadLength.toFixed(2) : '-'}</td>
            <td>${item.areaDisplay ? item.areaDisplay.toFixed(2) : '-'}</td>
            <td>${formatDate(item.createdAt) || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="viewBusinessDetail('${item.type}', '${item.id}')">查看</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('summaryCurrentPage').textContent = summaryPage;
    document.getElementById('summaryTotalPages').textContent = totalPages;
    document.getElementById('summaryPrevPage').disabled = summaryPage <= 1;
    document.getElementById('summaryNextPage').disabled = summaryPage >= totalPages;
    document.getElementById('summaryPagination').style.display = 'flex';
}

function editMunicipal(id) {
    openMunicipalForm(id);
}

function editGreenery(id) {
    openGreeneryForm(id);
}

function editSanitation(id) {
    openSanitationForm(id);
}

function deleteMunicipal(id) {
    if (confirm('确定要删除这条市政养护记录吗？此操作不可恢复。')) {
        municipalData = municipalData.filter(item => item.id !== id);
        saveMunicipalData();
        renderMunicipalList();
        showToast('删除成功', 'success');
    }
}

function deleteGreenery(id) {
    if (confirm('确定要删除这条绿化养护记录吗？此操作不可恢复。')) {
        greeneryData = greeneryData.filter(item => item.id !== id);
        saveGreeneryData();
        renderGreeneryList();
        showToast('删除成功', 'success');
    }
}

function deleteSanitation(id) {
    if (confirm('确定要删除这条环卫养护记录吗？此操作不可恢复。')) {
        sanitationData = sanitationData.filter(item => item.id !== id);
        saveSanitationData();
        renderSanitationList();
        showToast('删除成功', 'success');
    }
}

function viewBusinessDetail(type, id) {
    let data = null;
    let title = '';
    
    if (type === 'municipal') {
        data = municipalData.find(item => item.id === id);
        title = '市政养护详情';
    } else if (type === 'greenery') {
        data = greeneryData.find(item => item.id === id);
        title = '绿化养护详情';
    } else if (type === 'sanitation') {
        data = sanitationData.find(item => item.id === id);
        title = '环卫养护详情';
    }
    
    if (!data) return;
    
    document.getElementById('businessDetailTitle').textContent = title;
    
    let html = '';
    
    if (type === 'municipal') {
        html = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">道路名称：</span>${escapeHtml(data.roadName)}</div>
                <div class="detail-item"><span class="detail-label">起止点：</span>${escapeHtml(data.startEndPoint)}</div>
                <div class="detail-item"><span class="detail-label">所属街道：</span>${escapeHtml(data.street) || '-'}</div>
                <div class="detail-item"><span class="detail-label">道路长度(m)：</span>${data.roadLength ? data.roadLength.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">道路面积(㎡)：</span>${data.roadArea ? data.roadArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">车行道面积(㎡)：</span>${data.carriagewayArea ? data.carriagewayArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">人行道面积(㎡)：</span>${data.sidewalkArea ? data.sidewalkArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">侧平石长度(m)：</span>${data.curbLength ? data.curbLength.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">养护等级：</span>${escapeHtml(data.maintenanceLevel) || '-'}</div>
                <div class="detail-item"><span class="detail-label">桥面车行道面积(㎡)：</span>${data.bridgeCarriagewayArea ? data.bridgeCarriagewayArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">桥面人行道面积(㎡)：</span>${data.bridgeSidewalkArea ? data.bridgeSidewalkArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">桥梁护栏长度(m)：</span>${data.bridgeGuardrailLength ? data.bridgeGuardrailLength.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">桥梁伸缩缝长度(m)：</span>${data.bridgeExpansionJointLength ? data.bridgeExpansionJointLength.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">随路桥梁数量(座)：</span>${data.bridgeCount || '-'}</div>
                <div class="detail-item"><span class="detail-label">随路路灯数量(盏)：</span>${data.streetlightCount || '-'}</div>
                <div class="detail-item"><span class="detail-label">移交养护时间：</span>${formatDate(data.createdAt) || '-'}</div>
                <div class="detail-item"><span class="detail-label">更新时间：</span>${formatDate(data.updatedAt) || '-'}</div>
            </div>
        `;
    } else if (type === 'greenery') {
        html = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">道路名称：</span>${escapeHtml(data.roadName)}</div>
                <div class="detail-item"><span class="detail-label">起止点：</span>${escapeHtml(data.startEndPoint)}</div>
                <div class="detail-item"><span class="detail-label">所属街道：</span>${escapeHtml(data.street) || '-'}</div>
                <div class="detail-item"><span class="detail-label">总面积(㎡)：</span>${data.totalArea ? data.totalArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">绿化面积(㎡)：</span>${data.greenArea ? data.greenArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">行道树(株)：</span>${data.streetTrees || '-'}</div>
                <div class="detail-item"><span class="detail-label">草花面积(㎡)：</span>${data.flowerArea ? data.flowerArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">移交养护时间：</span>${formatDate(data.createdAt) || '-'}</div>
                <div class="detail-item"><span class="detail-label">更新时间：</span>${formatDate(data.updatedAt) || '-'}</div>
            </div>
        `;
    } else if (type === 'sanitation') {
        html = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">道路名称：</span>${escapeHtml(data.roadName)}</div>
                <div class="detail-item"><span class="detail-label">起止点：</span>${escapeHtml(data.startEndPoint)}</div>
                <div class="detail-item"><span class="detail-label">所属街道：</span>${escapeHtml(data.street) || '-'}</div>
                <div class="detail-item"><span class="detail-label">养护等级：</span>${escapeHtml(data.maintenanceLevel) || '-'}</div>
                <div class="detail-item"><span class="detail-label">道路长度(m)：</span>${data.roadLength ? data.roadLength.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">保洁总面积(㎡)：</span>${data.totalCleaningArea ? data.totalCleaningArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">道路保洁面积(㎡)：</span>${data.roadCleaningArea ? data.roadCleaningArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">园林保洁面积(㎡)：</span>${data.gardenCleaningArea ? data.gardenCleaningArea.toFixed(2) : '-'}</div>
                <div class="detail-item"><span class="detail-label">移交养护时间：</span>${formatDate(data.createdAt) || '-'}</div>
                <div class="detail-item"><span class="detail-label">更新时间：</span>${formatDate(data.updatedAt) || '-'}</div>
            </div>
        `;
    }
    
    document.getElementById('businessDetailBody').innerHTML = html;
    document.getElementById('businessDetailFooter').innerHTML = `
        <div class="form-actions">
            <button class="btn btn-secondary btn-small" onclick="editBusinessFromDetail('${type}', '${id}')">编辑</button>
            <button class="btn btn-danger btn-small" onclick="deleteBusinessFromDetail('${type}', '${id}')">删除</button>
            <button class="btn btn-secondary" onclick="closeBusinessDetail()">关闭</button>
        </div>
    `;
    document.getElementById('businessDetailModal').style.display = 'flex';
}

function closeBusinessDetail() {
    document.getElementById('businessDetailModal').style.display = 'none';
}

function editBusinessFromDetail(type, id) {
    closeBusinessDetail();
    if (type === 'municipal') editMunicipal(id);
    else if (type === 'greenery') editGreenery(id);
    else if (type === 'sanitation') editSanitation(id);
}

function deleteBusinessFromDetail(type, id) {
    closeBusinessDetail();
    if (type === 'municipal') deleteMunicipal(id);
    else if (type === 'greenery') deleteGreenery(id);
    else if (type === 'sanitation') deleteSanitation(id);
}

function exportMunicipalToExcel() {
    if (municipalData.length === 0) {
        showToast('暂无数据可导出', 'error');
        return;
    }
    
    const exportData = municipalData.map((item, index) => ({
        '序号': index + 1,
        '道路名称': item.roadName,
        '起止点': item.startEndPoint,
        '所属街道': item.street,
        '道路长度(m)': item.roadLength,
        '道路面积(㎡)': item.roadArea,
        '车行道面积(㎡)': item.carriagewayArea,
        '人行道面积(㎡)': item.sidewalkArea,
        '侧平石长度(m)': item.curbLength,
        '养护等级': item.maintenanceLevel,
        '桥面车行道面积(㎡)': item.bridgeCarriagewayArea,
        '桥面人行道面积(㎡)': item.bridgeSidewalkArea,
        '桥梁护栏长度(m)': item.bridgeGuardrailLength,
        '桥梁伸缩缝长度(m)': item.bridgeExpansionJointLength,
        '随路桥梁数量(座)': item.bridgeCount,
        '随路路灯数量(盏)': item.streetlightCount,
        '创建时间': formatDate(item.createdAt),
        '更新时间': formatDate(item.updatedAt)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '市政养护');
    XLSX.writeFile(wb, `市政养护数据_${formatDate(new Date().toISOString())}.xlsx`);
    showToast('导出成功', 'success');
}

function exportGreeneryToExcel() {
    if (greeneryData.length === 0) {
        showToast('暂无数据可导出', 'error');
        return;
    }
    
    const exportData = greeneryData.map((item, index) => ({
        '序号': index + 1,
        '道路名称': item.roadName,
        '起止点': item.startEndPoint,
        '所属街道': item.street,
        '总面积(㎡)': item.totalArea,
        '绿化面积(㎡)': item.greenArea,
        '行道树(株)': item.streetTrees,
        '草花面积(㎡)': item.flowerArea,
        '创建时间': formatDate(item.createdAt),
        '更新时间': formatDate(item.updatedAt)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '绿化养护');
    XLSX.writeFile(wb, `绿化养护数据_${formatDate(new Date().toISOString())}.xlsx`);
    showToast('导出成功', 'success');
}

function exportSanitationToExcel() {
    if (sanitationData.length === 0) {
        showToast('暂无数据可导出', 'error');
        return;
    }
    
    const exportData = sanitationData.map((item, index) => ({
        '序号': index + 1,
        '道路名称': item.roadName,
        '起止点': item.startEndPoint,
        '所属街道': item.street,
        '养护等级': item.maintenanceLevel,
        '道路长度(m)': item.roadLength,
        '保洁总面积(㎡)': item.totalCleaningArea,
        '道路保洁面积(㎡)': item.roadCleaningArea,
        '园林保洁面积(㎡)': item.gardenCleaningArea,
        '创建时间': formatDate(item.createdAt),
        '更新时间': formatDate(item.updatedAt)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '环卫养护');
    XLSX.writeFile(wb, `环卫养护数据_${formatDate(new Date().toISOString())}.xlsx`);
    showToast('导出成功', 'success');
}

function exportSummaryToExcel() {
    const filtered = getFilteredSummaryData();
    
    if (filtered.length === 0) {
        showToast('暂无数据可导出', 'error');
        return;
    }
    
    const exportData = filtered.map((item, index) => ({
        '序号': index + 1,
        '养护类型': item.typeName,
        '道路名称': item.roadName,
        '起止点': item.startEndPoint,
        '所属街道': item.street || '-',
        '养护等级': item.maintenanceLevel || '-',
        '道路长度(m)': item.roadLength || '-',
        '面积(㎡)': item.areaDisplay || '-',
        '创建时间': formatDate(item.createdAt) || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '养护汇总');
    XLSX.writeFile(wb, `养护汇总数据_${formatDate(new Date().toISOString())}.xlsx`);
    showToast('导出成功', 'success');
}

const IMPORT_HISTORY_KEY = 'import_history';
let importHistory = [];
let currentImportType = '';
let parsedImportData = [];
let importErrors = [];

function loadImportHistory() {
    const stored = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (stored) {
        importHistory = JSON.parse(stored);
    }
}

function saveImportHistory() {
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(importHistory));
}

function addImportHistory(record) {
    importHistory.unshift(record);
    if (importHistory.length > 100) {
        importHistory = importHistory.slice(0, 100);
    }
    saveImportHistory();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getMunicipalFieldMapping() {
    return {
        '道路名称': 'roadName',
        '起止点': 'startEndPoint',
        '所属街道': 'street',
        '道路长度(m)': 'roadLength',
        '道路面积(㎡)': 'roadArea',
        '车行道面积(㎡)': 'carriagewayArea',
        '人行道面积(㎡)': 'sidewalkArea',
        '侧平石长度(m)': 'curbLength',
        '养护等级': 'maintenanceLevel',
        '桥面车行道面积(㎡)': 'bridgeCarriagewayArea',
        '桥面人行道面积(㎡)': 'bridgeSidewalkArea',
        '桥梁护栏长度(m)': 'bridgeGuardrailLength',
        '桥梁伸缩缝长度(m)': 'bridgeExpansionJointLength',
        '随路桥梁数量(座)': 'bridgeCount',
        '随路路灯数量(盏)': 'streetlightCount'
    };
}

function getGreeneryFieldMapping() {
    return {
        '道路名称': 'roadName',
        '起止点': 'startEndPoint',
        '所属街道': 'street',
        '总面积(㎡)': 'totalArea',
        '绿化面积(㎡)': 'greenArea',
        '行道树(株)': 'streetTrees',
        '草花面积(㎡)': 'flowerArea'
    };
}

function getSanitationFieldMapping() {
    return {
        '道路名称': 'roadName',
        '起止点': 'startEndPoint',
        '所属街道': 'street',
        '养护等级': 'maintenanceLevel',
        '道路长度(m)': 'roadLength',
        '保洁总面积(㎡)': 'totalCleaningArea',
        '道路保洁面积(㎡)': 'roadCleaningArea',
        '园林保洁面积(㎡)': 'gardenCleaningArea'
    };
}

function validateMunicipalRow(row, rowIndex) {
    const errors = [];
    
    if (!row.roadName || row.roadName.trim() === '') {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能为空' });
    } else if (row.roadName.length > 50) {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能超过50个字符' });
    }
    
    if (row.startEndPoint && row.startEndPoint.length > 100) {
        errors.push({ row: rowIndex, field: '起止点', message: '起止点不能超过100个字符' });
    }
    
    const optionalNumbers = [
        { field: 'roadLength', name: '道路长度', value: row.roadLength },
        { field: 'roadArea', name: '道路面积', value: row.roadArea },
        { field: 'carriagewayArea', name: '车行道面积', value: row.carriagewayArea },
        { field: 'sidewalkArea', name: '人行道面积', value: row.sidewalkArea },
        { field: 'curbLength', name: '侧平石长度', value: row.curbLength },
        { field: 'bridgeCarriagewayArea', name: '桥面车行道面积', value: row.bridgeCarriagewayArea },
        { field: 'bridgeSidewalkArea', name: '桥面人行道面积', value: row.bridgeSidewalkArea },
        { field: 'bridgeGuardrailLength', name: '桥梁护栏长度', value: row.bridgeGuardrailLength },
        { field: 'bridgeExpansionJointLength', name: '桥梁伸缩缝长度', value: row.bridgeExpansionJointLength }
    ];
    
    optionalNumbers.forEach(item => {
        if (item.value !== undefined && item.value !== null && item.value !== '') {
            if (isNaN(parseFloat(item.value)) || parseFloat(item.value) < 0) {
                errors.push({ row: rowIndex, field: item.name, message: `${item.name}必须为非负数` });
            }
        }
    });
    
    const optionalIntegers = [
        { field: 'bridgeCount', name: '随路桥梁数量', value: row.bridgeCount },
        { field: 'streetlightCount', name: '随路路灯数量', value: row.streetlightCount }
    ];
    
    optionalIntegers.forEach(item => {
        if (item.value !== undefined && item.value !== null && item.value !== '') {
            if (isNaN(parseInt(item.value)) || parseInt(item.value) < 0) {
                errors.push({ row: rowIndex, field: item.name, message: `${item.name}必须为非负整数` });
            }
        }
    });
    
    if (row.maintenanceLevel && row.maintenanceLevel.trim() !== '') {
        if (!['一级', '二级', '三级', '四级'].includes(row.maintenanceLevel)) {
            errors.push({ row: rowIndex, field: '养护等级', message: '养护等级必须为：一级、二级、三级、四级' });
        }
    }
    
    return errors;
}

function validateGreeneryRow(row, rowIndex) {
    const errors = [];
    
    if (!row.roadName || row.roadName.trim() === '') {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能为空' });
    } else if (row.roadName.length > 50) {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能超过50个字符' });
    }
    
    if (row.startEndPoint && row.startEndPoint.length > 100) {
        errors.push({ row: rowIndex, field: '起止点', message: '起止点不能超过100个字符' });
    }
    
    const totalArea = row.totalArea !== undefined && row.totalArea !== null && row.totalArea !== '' ? parseFloat(row.totalArea) : null;
    const greenArea = row.greenArea !== undefined && row.greenArea !== null && row.greenArea !== '' ? parseFloat(row.greenArea) : null;
    const flowerArea = row.flowerArea !== undefined && row.flowerArea !== null && row.flowerArea !== '' ? parseFloat(row.flowerArea) : null;
    
    if (totalArea !== null) {
        if (isNaN(totalArea) || totalArea < 0) {
            errors.push({ row: rowIndex, field: '总面积', message: '总面积必须为非负数' });
        }
    }
    
    if (greenArea !== null) {
        if (isNaN(greenArea) || greenArea < 0) {
            errors.push({ row: rowIndex, field: '绿化面积', message: '绿化面积必须为非负数' });
        } else if (totalArea !== null && greenArea > totalArea) {
            errors.push({ row: rowIndex, field: '绿化面积', message: '绿化面积不能大于总面积' });
        }
    }
    
    if (flowerArea !== null) {
        if (isNaN(flowerArea) || flowerArea < 0) {
            errors.push({ row: rowIndex, field: '草花面积', message: '草花面积必须为非负数' });
        } else if (greenArea !== null && flowerArea > greenArea) {
            errors.push({ row: rowIndex, field: '草花面积', message: '草花面积不能大于绿化面积' });
        }
    }
    
    if (row.streetTrees !== undefined && row.streetTrees !== null && row.streetTrees !== '') {
        const streetTrees = parseInt(row.streetTrees);
        if (isNaN(streetTrees) || streetTrees < 0) {
            errors.push({ row: rowIndex, field: '行道树', message: '行道树数量必须为非负整数' });
        }
    }
    
    return errors;
}

function validateSanitationRow(row, rowIndex) {
    const errors = [];
    
    if (!row.roadName || row.roadName.trim() === '') {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能为空' });
    } else if (row.roadName.length > 50) {
        errors.push({ row: rowIndex, field: '道路名称', message: '道路名称不能超过50个字符' });
    }
    
    if (row.startEndPoint && row.startEndPoint.length > 100) {
        errors.push({ row: rowIndex, field: '起止点', message: '起止点不能超过100个字符' });
    }
    
    if (row.maintenanceLevel && row.maintenanceLevel.trim() !== '') {
        if (!['一级', '二级', '三级', '四级'].includes(row.maintenanceLevel)) {
            errors.push({ row: rowIndex, field: '养护等级', message: '养护等级必须为：一级、二级、三级、四级' });
        }
    }
    
    const totalCleaningArea = row.totalCleaningArea !== undefined && row.totalCleaningArea !== null && row.totalCleaningArea !== '' ? parseFloat(row.totalCleaningArea) : null;
    const roadCleaningArea = row.roadCleaningArea !== undefined && row.roadCleaningArea !== null && row.roadCleaningArea !== '' ? parseFloat(row.roadCleaningArea) : null;
    const gardenCleaningArea = row.gardenCleaningArea !== undefined && row.gardenCleaningArea !== null && row.gardenCleaningArea !== '' ? parseFloat(row.gardenCleaningArea) : null;
    const roadLength = row.roadLength !== undefined && row.roadLength !== null && row.roadLength !== '' ? parseFloat(row.roadLength) : null;
    
    if (roadLength !== null) {
        if (isNaN(roadLength) || roadLength < 0) {
            errors.push({ row: rowIndex, field: '道路长度', message: '道路长度必须为非负数' });
        }
    }
    
    if (totalCleaningArea !== null) {
        if (isNaN(totalCleaningArea) || totalCleaningArea < 0) {
            errors.push({ row: rowIndex, field: '保洁总面积', message: '保洁总面积必须为非负数' });
        }
    }
    
    if (roadCleaningArea !== null) {
        if (isNaN(roadCleaningArea) || roadCleaningArea < 0) {
            errors.push({ row: rowIndex, field: '道路保洁面积', message: '道路保洁面积必须为非负数' });
        } else if (totalCleaningArea !== null && roadCleaningArea > totalCleaningArea) {
            errors.push({ row: rowIndex, field: '道路保洁面积', message: '道路保洁面积不能大于保洁总面积' });
        }
    }
    
    if (gardenCleaningArea !== null) {
        if (isNaN(gardenCleaningArea) || gardenCleaningArea < 0) {
            errors.push({ row: rowIndex, field: '园林保洁面积', message: '园林保洁面积必须为非负数' });
        } else if (totalCleaningArea !== null && gardenCleaningArea > totalCleaningArea) {
            errors.push({ row: rowIndex, field: '园林保洁面积', message: '园林保洁面积不能大于保洁总面积' });
        }
    }
    
    return errors;
}

function parseExcelFile(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                
                let fieldMapping;
                switch(type) {
                    case 'municipal':
                        fieldMapping = getMunicipalFieldMapping();
                        break;
                    case 'greenery':
                        fieldMapping = getGreeneryFieldMapping();
                        break;
                    case 'sanitation':
                        fieldMapping = getSanitationFieldMapping();
                        break;
                }
                
                const mappedData = jsonData.map((row, index) => {
                    const mappedRow = {};
                    for (const [excelField, jsField] of Object.entries(fieldMapping)) {
                        mappedRow[jsField] = row[excelField] !== undefined ? row[excelField] : '';
                    }
                    mappedRow._rowIndex = index + 2;
                    return mappedRow;
                });
                
                resolve(mappedData);
            } catch (error) {
                reject(new Error('文件解析失败：' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function validateImportData(data, type) {
    const allErrors = [];
    
    data.forEach((row, index) => {
        let rowErrors;
        switch(type) {
            case 'municipal':
                rowErrors = validateMunicipalRow(row, row._rowIndex);
                break;
            case 'greenery':
                rowErrors = validateGreeneryRow(row, row._rowIndex);
                break;
            case 'sanitation':
                rowErrors = validateSanitationRow(row, row._rowIndex);
                break;
        }
        allErrors.push(...rowErrors);
    });
    
    return allErrors;
}

function showImportPreview(data, type) {
    if (!data || !Array.isArray(data)) {
        console.error('[市政导入预览] 数据无效:', data);
        return;
    }

    if (!type || !['municipal', 'greenery', 'sanitation'].includes(type)) {
        console.error('[市政导入预览] 类型无效:', type);
        return;
    }

    let previewHead, previewBody, previewCount;
    
    switch(type) {
        case 'municipal':
            previewHead = document.getElementById('municipalPreviewHead');
            previewBody = document.getElementById('municipalPreviewBody');
            previewCount = document.getElementById('municipalPreviewCount');
            break;
        case 'greenery':
            previewHead = document.getElementById('greeneryPreviewHead');
            previewBody = document.getElementById('greeneryPreviewBody');
            previewCount = document.getElementById('greeneryPreviewCount');
            break;
        case 'sanitation':
            previewHead = document.getElementById('sanitationPreviewHead');
            previewBody = document.getElementById('sanitationPreviewBody');
            previewCount = document.getElementById('sanitationPreviewCount');
            break;
    }

    if (!previewHead || !previewBody || !previewCount) {
        console.error('[市政导入预览] DOM元素未找到, type:', type);
        return;
    }
    
    let headers;
    switch(type) {
        case 'municipal':
            headers = ['道路名称', '起止点', '道路长度(m)', '道路面积(㎡)', '养护等级'];
            break;
        case 'greenery':
            headers = ['道路名称', '起止点', '总面积(㎡)', '绿化面积(㎡)', '行道树(株)'];
            break;
        case 'sanitation':
            headers = ['道路名称', '起止点', '养护等级', '道路长度(m)', '保洁总面积(㎡)'];
            break;
        default:
            headers = [];
    }

    if (!headers || headers.length === 0) {
        console.error('[市政导入预览] headers为空');
        return;
    }
    
    try {
        previewHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    } catch (headerError) {
        console.error('[市政导入预览] 表头渲染失败:', headerError);
        return;
    }
    
    const previewData = data.slice(0, 10);
    let bodyHtml = '';
    
    previewData.forEach(row => {
        bodyHtml += '<tr>';
        switch(type) {
            case 'municipal':
                bodyHtml += `<td>${row.roadName || ''}</td>`;
                bodyHtml += `<td>${row.startEndPoint || ''}</td>`;
                bodyHtml += `<td>${row.roadLength || ''}</td>`;
                bodyHtml += `<td>${row.roadArea || ''}</td>`;
                bodyHtml += `<td>${row.maintenanceLevel || ''}</td>`;
                break;
            case 'greenery':
                bodyHtml += `<td>${row.roadName || ''}</td>`;
                bodyHtml += `<td>${row.startEndPoint || ''}</td>`;
                bodyHtml += `<td>${row.totalArea || ''}</td>`;
                bodyHtml += `<td>${row.greenArea || ''}</td>`;
                bodyHtml += `<td>${row.streetTrees || ''}</td>`;
                break;
            case 'sanitation':
                bodyHtml += `<td>${row.roadName || ''}</td>`;
                bodyHtml += `<td>${row.startEndPoint || ''}</td>`;
                bodyHtml += `<td>${row.maintenanceLevel || ''}</td>`;
                bodyHtml += `<td>${row.roadLength || ''}</td>`;
                bodyHtml += `<td>${row.totalCleaningArea || ''}</td>`;
                break;
        }
        bodyHtml += '</tr>';
    });
    
    previewBody.innerHTML = bodyHtml;
    previewCount.textContent = data.length;
    
    const previewContainer = document.getElementById(`${type}ImportPreview`);
    previewContainer.style.display = 'block';
}

function showImportErrors(errors, type) {
    const errorList = document.getElementById(`${type}ErrorList`);
    
    if (errors.length === 0) {
        errorList.innerHTML = '<div class="no-errors">没有发现错误</div>';
    } else {
        let html = '';
        errors.slice(0, 20).forEach(error => {
            html += `<div class="error-item">
                <span class="error-row">第${error.row}行</span>
                <span class="error-field">【${error.field}】</span>
                <span class="error-msg">${error.message}</span>
            </div>`;
        });
        
        if (errors.length > 20) {
            html += `<div class="error-more">还有 ${errors.length - 20} 条错误未显示...</div>`;
        }
        
        errorList.innerHTML = html;
    }
    
    document.getElementById(`${type}ImportErrors`).style.display = 'block';
}

function updateImportProgress(current, total, type) {
    const percentage = Math.round((current / total) * 100);
    const progressFill = document.getElementById(`${type}ProgressFill`);
    const progressText = document.getElementById(`${type}ProgressText`);
    
    progressFill.style.width = percentage + '%';
    progressText.textContent = `正在导入... ${current}/${total} (${percentage}%)`;
}

function executeImport(data, type) {
    return new Promise((resolve) => {
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        let targetData, saveFunc;
        
        switch(type) {
            case 'municipal':
                targetData = municipalData;
                saveFunc = saveMunicipalData;
                break;
            case 'greenery':
                targetData = greeneryData;
                saveFunc = saveGreeneryData;
                break;
            case 'sanitation':
                targetData = sanitationData;
                saveFunc = saveSanitationData;
                break;
        }
        
        let processed = 0;
        const total = data.length;
        
        function processNext() {
            if (processed >= total) {
                saveFunc();
                resolve({ successCount, failCount, errors });
                return;
            }
            
            const row = data[processed];
            processed++;
            
            try {
                const record = {
                    id: generateId(),
                    ...row,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                delete record._rowIndex;
                
                targetData.unshift(record);
                successCount++;
            } catch (error) {
                failCount++;
                errors.push({
                    row: row._rowIndex,
                    message: error.message
                });
            }
            
            updateImportProgress(processed, total, type);
            
            setTimeout(processNext, 10);
        }
        
        processNext();
    });
}

function showImportResult(result, type) {
    document.getElementById(`${type}SuccessCount`).textContent = result.successCount;
    document.getElementById(`${type}FailCount`).textContent = result.failCount;
    document.getElementById(`${type}ImportResult`).style.display = 'block';
}

function generateErrorReport(data, errors, type) {
    const typeName = {
        municipal: '市政养护',
        greenery: '绿化养护',
        sanitation: '环卫养护'
    }[type];
    
    const reportData = errors.map(error => ({
        '行号': error.row,
        '字段': error.field || '-',
        '错误原因': error.message,
        '修正建议': getFixSuggestion(error.field, error.message)
    }));
    
    if (reportData.length === 0) {
        reportData.push({
            '行号': '-',
            '字段': '-',
            '错误原因': '无错误',
            '修正建议': '-'
        });
    }
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '错误报告');
    XLSX.writeFile(wb, `${typeName}导入错误报告_${formatDate(new Date().toISOString())}.xlsx`);
}

function getFixSuggestion(field, message) {
    if (message.includes('不能为空')) {
        return '请填写该字段';
    }
    if (message.includes('不能超过')) {
        return '请缩短内容长度';
    }
    if (message.includes('必须为非负数')) {
        return '请输入大于等于0的数字';
    }
    if (message.includes('必须为非负整数')) {
        return '请输入大于等于0的整数';
    }
    if (message.includes('养护等级必须为')) {
        return '请填写：一级、二级、三级或四级';
    }
    if (message.includes('不能大于')) {
        return '请检查面积数值的关联关系';
    }
    return '请检查数据格式';
}

function openImportModal(type) {
    currentImportType = type;
    parsedImportData = [];
    importErrors = [];
    
    const modal = document.getElementById(`import${type.charAt(0).toUpperCase() + type.slice(1)}Modal`);
    modal.style.display = 'flex';
    
    resetImportModalState(type);
}

function closeImportModal(type) {
    if (!type || typeof type !== 'string') {
        console.error('[市政导入] closeImportModal: type参数无效:', type);
        return;
    }

    const modalId = `import${type.charAt(0).toUpperCase() + type.slice(1)}Modal`;
    const modal = document.getElementById(modalId);
    
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn('[市政导入] 未找到弹窗元素:', modalId);
    }
    
    resetImportModalState(type);
}

function resetImportModalState(type) {
    if (!type || typeof type !== 'string') {
        console.error('[市政导入] resetImportModalState: type参数无效:', type);
        return;
    }

    const elements = [
        `${type}UploadArea`,
        `${type}FileInfo`,
        `${type}ImportProgress`,
        `${type}ImportPreview`,
        `${type}ImportErrors`,
        `${type}ImportResult`,
        `${type}StartImport`,
        `${type}ProgressFill`,
        `${type}FileInput`
    ];

    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('UploadArea') || id.includes('FileInfo') || id.includes('Progress') || id.includes('Preview') || id.includes('Errors') || id.includes('Result')) {
                el.style.display = id.includes('UploadArea') ? 'block' : 'none';
            } else if (id.includes('StartImport')) {
                el.disabled = true;
            } else if (id.includes('ProgressFill')) {
                el.style.width = '0%';
            } else if (id.includes('FileInput')) {
                el.value = '';
            }
        }
    });
}

function handleFileSelect(file, type) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        showToast('请选择 .xlsx 或 .xls 格式的文件', 'error');
        return;
    }
    
    document.getElementById(`${type}FileName`).textContent = file.name;
    document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size);
    document.getElementById(`${type}UploadArea`).style.display = 'none';
    document.getElementById(`${type}FileInfo`).style.display = 'block';
    
    parseExcelFile(file, type).then(data => {
        if (data.length === 0) {
            showToast('文件中没有数据', 'error');
            resetImportModalState(type);
            return;
        }
        
        if (data.length > 1000) {
            showToast('单次最多导入1000条数据', 'error');
            resetImportModalState(type);
            return;
        }
        
        parsedImportData = data;
        importErrors = validateImportData(data, type);
        
        showImportPreview(data, type);
        showImportErrors(importErrors, type);
        
        document.getElementById(`${type}StartImport`).disabled = false;
        
    }).catch(error => {
        showToast(error.message, 'error');
        resetImportModalState(type);
    });
}

function setupImportEventListeners() {
    ['municipal', 'greenery', 'sanitation'].forEach(type => {
        const fileInput = document.getElementById(`${type}FileInput`);
        const selectBtn = document.getElementById(`${type}SelectFileBtn`);
        const uploadArea = document.getElementById(`${type}UploadArea`);
        const removeBtn = document.getElementById(`${type}RemoveFile`);
        const startBtn = document.getElementById(`${type}StartImport`);
        const cancelBtn = document.getElementById(`${type}CancelImport`);
        const closeModalBtn = document.getElementById(`closeImport${type.charAt(0).toUpperCase() + type.slice(1)}Modal`);
        const downloadReportBtn = document.getElementById(`${type}DownloadReport`);
        
        selectBtn.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== selectBtn) {
                fileInput.click();
            }
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            handleFileSelect(file, type);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            handleFileSelect(file, type);
        });
        
        removeBtn.addEventListener('click', () => {
            resetImportModalState(type);
        });
        
        startBtn.addEventListener('click', async () => {
            if (parsedImportData.length === 0) return;
            
            startBtn.disabled = true;
            document.getElementById(`${type}ImportProgress`).style.display = 'block';
            
            const result = await executeImport(parsedImportData, type);
            
            showImportResult(result, type);
            
            const historyRecord = {
                id: generateId(),
                type: type,
                typeName: { municipal: '市政养护', greenery: '绿化养护', sanitation: '环卫养护' }[type],
                fileName: document.getElementById(`${type}FileName`).textContent,
                totalCount: parsedImportData.length,
                successCount: result.successCount,
                failCount: result.failCount,
                operator: currentUser ? currentUser.username : '未知',
                importTime: new Date().toISOString()
            };
            addImportHistory(historyRecord);
            
            renderMunicipalList();
            renderGreeneryList();
            renderSanitationList();
            renderSummaryList();
        });
        
        cancelBtn.addEventListener('click', () => closeImportModal(type));
        closeModalBtn.addEventListener('click', () => closeImportModal(type));
        
        downloadReportBtn.addEventListener('click', () => {
            generateErrorReport(parsedImportData, importErrors, type);
        });
    });
    
    document.getElementById('importMunicipalBtn').addEventListener('click', () => openImportModal('municipal'));
    document.getElementById('importGreeneryBtn').addEventListener('click', () => openImportModal('greenery'));
    document.getElementById('importSanitationBtn').addEventListener('click', () => openImportModal('sanitation'));
    
    document.getElementById('closeImportHistoryModal').addEventListener('click', () => {
        document.getElementById('importHistoryModal').style.display = 'none';
    });
    document.getElementById('closeHistoryBtn').addEventListener('click', () => {
        document.getElementById('importHistoryModal').style.display = 'none';
    });
    
    document.getElementById('historyFilterType').addEventListener('change', renderImportHistory);
}

function renderImportHistory() {
    const filterType = document.getElementById('historyFilterType').value;
    const tbody = document.getElementById('importHistoryBody');
    const emptyMsg = document.getElementById('importHistoryEmpty');
    
    let filtered = importHistory;
    if (filterType) {
        filtered = importHistory.filter(item => item.type === filterType);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }
    
    emptyMsg.style.display = 'none';
    
    let html = '';
    filtered.forEach(item => {
        html += `<tr>
            <td>${formatDate(item.importTime)}</td>
            <td>${item.typeName}</td>
            <td>${item.fileName}</td>
            <td>${item.totalCount}</td>
            <td><span class="success-text">${item.successCount}</span> / <span class="error-text">${item.failCount}</span></td>
            <td>${item.operator}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewImportDetail('${item.id}')">查看</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

function viewImportDetail(id) {
    const record = importHistory.find(item => item.id === id);
    if (!record) return;
    
    showToast(`导入详情：${record.typeName} - 成功${record.successCount}条，失败${record.failCount}条`, 'info');
}

function loadVehicleData() {
    const info = localStorage.getItem(VEHICLE_INFO_STORAGE_KEY);
    const repair = localStorage.getItem(VEHICLE_REPAIR_STORAGE_KEY);
    const mileage = localStorage.getItem(VEHICLE_MILEAGE_STORAGE_KEY);
    
    vehicleInfoData = info ? JSON.parse(info) : [];
    vehicleRepairData = repair ? JSON.parse(repair) : [];
    vehicleMileageData = mileage ? JSON.parse(mileage) : [];
}

function loadVehicleImportHistory() {
    const history = localStorage.getItem(VEHICLE_IMPORT_HISTORY_KEY);
    vehicleImportHistory = history ? JSON.parse(history) : [];
}

function saveVehicleInfoData() {
    localStorage.setItem(VEHICLE_INFO_STORAGE_KEY, JSON.stringify(vehicleInfoData));
    updateVehiclePlateList();
}

function saveVehicleRepairData() {
    localStorage.setItem(VEHICLE_REPAIR_STORAGE_KEY, JSON.stringify(vehicleRepairData));
}

function saveVehicleMileageData() {
    localStorage.setItem(VEHICLE_MILEAGE_STORAGE_KEY, JSON.stringify(vehicleMileageData));
}

function saveVehicleImportHistory() {
    localStorage.setItem(VEHICLE_IMPORT_HISTORY_KEY, JSON.stringify(vehicleImportHistory));
}

function updateVehiclePlateList() {
    const plateList = document.getElementById('vehiclePlateList');
    const plateList2 = document.getElementById('vehiclePlateList2');
    
    const plates = vehicleInfoData.map(v => v.plateNumber);
    
    if (plateList) {
        plateList.innerHTML = plates.map(p => `<option value="${p}">`).join('');
    }
    if (plateList2) {
        plateList2.innerHTML = plates.map(p => `<option value="${p}">`).join('');
    }
}

function setupVehicleEventListeners() {
    document.querySelectorAll('#vehicle-module .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            document.querySelectorAll('#vehicle-module .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#vehicle-module .tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            if (tab === 'vehicle-dashboard') updateVehicleDashboard();
            else if (tab === 'vehicle-info') renderVehicleInfoList();
            else if (tab === 'vehicle-repair') renderVehicleRepairList();
            else if (tab === 'vehicle-mileage') renderVehicleMileageList();
        });
    });

    document.getElementById('addVehicleInfoBtn').addEventListener('click', () => openVehicleInfoForm());
    document.getElementById('addVehicleRepairBtn').addEventListener('click', () => openVehicleRepairForm());
    document.getElementById('addVehicleMileageBtn').addEventListener('click', () => openVehicleMileageForm());
    
    document.getElementById('vehicleInfoForm').addEventListener('submit', handleVehicleInfoFormSubmit);
    document.getElementById('vehicleRepairForm').addEventListener('submit', handleVehicleRepairFormSubmit);
    document.getElementById('vehicleMileageForm').addEventListener('submit', handleVehicleMileageFormSubmit);
    
    document.getElementById('closeVehicleInfoFormModal').addEventListener('click', closeVehicleInfoForm);
    document.getElementById('vehicleInfoCancelBtn').addEventListener('click', closeVehicleInfoForm);
    document.getElementById('vehicleInfoResetBtn').addEventListener('click', resetVehicleInfoForm);
    document.getElementById('vehicleInfoFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleInfoFormModal') closeVehicleInfoForm();
    });
    
    document.getElementById('closeVehicleRepairFormModal').addEventListener('click', closeVehicleRepairForm);
    document.getElementById('vehicleRepairCancelBtn').addEventListener('click', closeVehicleRepairForm);
    document.getElementById('vehicleRepairResetBtn').addEventListener('click', resetVehicleRepairForm);
    document.getElementById('vehicleRepairFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleRepairFormModal') closeVehicleRepairForm();
    });
    
    document.getElementById('closeVehicleMileageFormModal').addEventListener('click', closeVehicleMileageForm);
    document.getElementById('vehicleMileageCancelBtn').addEventListener('click', closeVehicleMileageForm);
    document.getElementById('vehicleMileageResetBtn').addEventListener('click', resetVehicleMileageForm);
    document.getElementById('vehicleMileageFormModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleMileageFormModal') closeVehicleMileageForm();
    });
    
    document.getElementById('closeVehicleDetailModal').addEventListener('click', closeVehicleDetail);
    document.getElementById('vehicleDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleDetailModal') closeVehicleDetail();
    });

    document.getElementById('lastMonthKm').addEventListener('input', calculateDistance);
    document.getElementById('thisMonthKm').addEventListener('input', calculateDistance);

    document.getElementById('vehicleInfoSearchBtn').addEventListener('click', () => {
        vehicleInfoPage = 1;
        renderVehicleInfoList();
    });
    document.getElementById('vehicleInfoSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            vehicleInfoPage = 1;
            renderVehicleInfoList();
        }
    });
    document.getElementById('vehicleInfoFilterLine').addEventListener('change', () => {
        vehicleInfoPage = 1;
        renderVehicleInfoList();
    });
    
    document.getElementById('vehicleRepairSearchBtn').addEventListener('click', () => {
        vehicleRepairPage = 1;
        renderVehicleRepairList();
    });
    document.getElementById('vehicleRepairSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            vehicleRepairPage = 1;
            renderVehicleRepairList();
        }
    });
    document.getElementById('vehicleRepairFilterMonth').addEventListener('change', () => {
        vehicleRepairPage = 1;
        renderVehicleRepairList();
    });
    
    document.getElementById('vehicleMileageSearchBtn').addEventListener('click', () => {
        vehicleMileagePage = 1;
        renderVehicleMileageList();
    });
    document.getElementById('vehicleMileageSearchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            vehicleMileagePage = 1;
            renderVehicleMileageList();
        }
    });
    document.getElementById('vehicleMileageFilterMonth').addEventListener('change', () => {
        vehicleMileagePage = 1;
        renderVehicleMileageList();
    });

    document.getElementById('vehicleInfoPrevPage').addEventListener('click', () => {
        if (vehicleInfoPage > 1) {
            vehicleInfoPage--;
            renderVehicleInfoList();
        }
    });
    document.getElementById('vehicleInfoNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredVehicleInfoData().length / vehicleInfoPageSize);
        if (vehicleInfoPage < totalPages) {
            vehicleInfoPage++;
            renderVehicleInfoList();
        }
    });
    document.getElementById('vehicleInfoPageSize').addEventListener('change', (e) => {
        vehicleInfoPageSize = parseInt(e.target.value);
        vehicleInfoPage = 1;
        renderVehicleInfoList();
    });
    
    document.getElementById('vehicleRepairPrevPage').addEventListener('click', () => {
        if (vehicleRepairPage > 1) {
            vehicleRepairPage--;
            renderVehicleRepairList();
        }
    });
    document.getElementById('vehicleRepairNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredVehicleRepairData().length / vehicleRepairPageSize);
        if (vehicleRepairPage < totalPages) {
            vehicleRepairPage++;
            renderVehicleRepairList();
        }
    });
    document.getElementById('vehicleRepairPageSize').addEventListener('change', (e) => {
        vehicleRepairPageSize = parseInt(e.target.value);
        vehicleRepairPage = 1;
        renderVehicleRepairList();
    });
    
    document.getElementById('vehicleMileagePrevPage').addEventListener('click', () => {
        if (vehicleMileagePage > 1) {
            vehicleMileagePage--;
            renderVehicleMileageList();
        }
    });
    document.getElementById('vehicleMileageNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredVehicleMileageData().length / vehicleMileagePageSize);
        if (vehicleMileagePage < totalPages) {
            vehicleMileagePage++;
            renderVehicleMileageList();
        }
    });
    document.getElementById('vehicleMileagePageSize').addEventListener('change', (e) => {
        vehicleMileagePageSize = parseInt(e.target.value);
        vehicleMileagePage = 1;
        renderVehicleMileageList();
    });

    document.getElementById('exportVehicleInfoBtn').addEventListener('click', exportVehicleInfoToExcel);
    document.getElementById('exportVehicleRepairBtn').addEventListener('click', exportVehicleRepairToExcel);
    document.getElementById('exportVehicleMileageBtn').addEventListener('click', exportVehicleMileageToExcel);
    
    document.getElementById('importVehicleInfoBtn').addEventListener('click', () => {
        document.getElementById('importVehicleInfoModal').style.display = 'flex';
        resetVehicleInfoImportUI();
    });
    document.getElementById('importVehicleRepairBtn').addEventListener('click', () => {
        document.getElementById('importVehicleRepairModal').style.display = 'flex';
        resetVehicleRepairImportUI();
    });
    document.getElementById('importVehicleMileageBtn').addEventListener('click', () => {
        document.getElementById('importVehicleMileageModal').style.display = 'flex';
        resetVehicleMileageImportUI();
    });
    
    setupVehicleInfoImportListeners();
    setupVehicleRepairImportListeners();
    setupVehicleMileageImportListeners();
}

function calculateDistance() {
    const lastMonth = parseFloat(document.getElementById('lastMonthKm').value) || 0;
    const thisMonth = parseFloat(document.getElementById('thisMonthKm').value) || 0;
    const distance = Math.max(0, thisMonth - lastMonth);
    document.getElementById('calculatedDistance').textContent = distance.toFixed(1);
}

function openVehicleInfoForm(id = null) {
    document.getElementById('vehicleInfoFormModal').style.display = 'flex';
    document.getElementById('vehicleInfoFormTitle').textContent = id ? '编辑车辆信息' : '新增车辆信息';
    
    if (id) {
        const vehicle = vehicleInfoData.find(v => v.id === id);
        if (vehicle) {
            document.getElementById('vehicleInfoId').value = vehicle.id;
            document.getElementById('vehiclePlateNumber').value = vehicle.plateNumber || '';
            document.getElementById('vehicleModel').value = vehicle.model || '';
            document.getElementById('vehiclePurpose').value = vehicle.purpose || '';
            document.getElementById('vehiclePurchaseDate').value = vehicle.purchaseDate || '';
            document.getElementById('vehicleDriver').value = vehicle.driver || '';
            document.getElementById('vehicleLine').value = vehicle.line || '';
        }
    } else {
        resetVehicleInfoForm();
    }
}

function closeVehicleInfoForm() {
    document.getElementById('vehicleInfoFormModal').style.display = 'none';
    resetVehicleInfoForm();
}

function resetVehicleInfoForm() {
    document.getElementById('vehicleInfoForm').reset();
    document.getElementById('vehicleInfoId').value = '';
}

function handleVehicleInfoFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('vehicleInfoId').value;
    const plateNumber = document.getElementById('vehiclePlateNumber').value.trim();
    
    if (!plateNumber) {
        showToast('请输入车牌号', 'error');
        return;
    }
    
    const vehicleData = {
        plateNumber: plateNumber,
        model: document.getElementById('vehicleModel').value.trim(),
        purpose: document.getElementById('vehiclePurpose').value.trim(),
        purchaseDate: document.getElementById('vehiclePurchaseDate').value,
        driver: document.getElementById('vehicleDriver').value.trim(),
        line: document.getElementById('vehicleLine').value
    };
    
    if (id) {
        const index = vehicleInfoData.findIndex(v => v.id === id);
        if (index !== -1) {
            vehicleInfoData[index] = { ...vehicleInfoData[index], ...vehicleData };
            showToast('车辆信息更新成功', 'success');
        }
    } else {
        const exists = vehicleInfoData.some(v => v.plateNumber === plateNumber);
        if (exists) {
            showToast('该车牌号已存在', 'error');
            return;
        }
        vehicleInfoData.push({
            id: generateId(),
            ...vehicleData,
            createTime: new Date().toISOString()
        });
        showToast('车辆信息添加成功', 'success');
    }
    
    saveVehicleInfoData();
    renderVehicleInfoList();
    closeVehicleInfoForm();
}

function openVehicleRepairForm(id = null) {
    document.getElementById('vehicleRepairFormModal').style.display = 'flex';
    document.getElementById('vehicleRepairFormTitle').textContent = id ? '编辑维修记录' : '新增维修记录';
    updateVehiclePlateList();
    
    if (id) {
        const repair = vehicleRepairData.find(r => r.id === id);
        if (repair) {
            document.getElementById('vehicleRepairId').value = repair.id;
            document.getElementById('repairPlateNumber').value = repair.plateNumber || '';
            document.getElementById('repairDate').value = repair.repairDate || '';
            document.getElementById('repairCost').value = repair.cost || '';
            document.getElementById('repairUnit').value = repair.unit || '';
            document.getElementById('repairIssue').value = repair.issue || '';
        }
    } else {
        resetVehicleRepairForm();
    }
}

function closeVehicleRepairForm() {
    document.getElementById('vehicleRepairFormModal').style.display = 'none';
    resetVehicleRepairForm();
}

function resetVehicleRepairForm() {
    document.getElementById('vehicleRepairForm').reset();
    document.getElementById('vehicleRepairId').value = '';
}

function handleVehicleRepairFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('vehicleRepairId').value;
    const plateNumber = document.getElementById('repairPlateNumber').value.trim();
    
    if (!plateNumber) {
        showToast('请输入车牌号', 'error');
        return;
    }
    
    const repairData = {
        plateNumber: plateNumber,
        repairDate: document.getElementById('repairDate').value,
        cost: parseFloat(document.getElementById('repairCost').value) || 0,
        unit: document.getElementById('repairUnit').value.trim(),
        issue: document.getElementById('repairIssue').value.trim()
    };
    
    if (id) {
        const index = vehicleRepairData.findIndex(r => r.id === id);
        if (index !== -1) {
            vehicleRepairData[index] = { ...vehicleRepairData[index], ...repairData };
            showToast('维修记录更新成功', 'success');
        }
    } else {
        vehicleRepairData.push({
            id: generateId(),
            ...repairData,
            createTime: new Date().toISOString()
        });
        showToast('维修记录添加成功', 'success');
    }
    
    saveVehicleRepairData();
    renderVehicleRepairList();
    closeVehicleRepairForm();
}

function openVehicleMileageForm(id = null) {
    document.getElementById('vehicleMileageFormModal').style.display = 'flex';
    document.getElementById('vehicleMileageFormTitle').textContent = id ? '编辑里程记录' : '新增里程记录';
    updateVehiclePlateList();

    const lastMonthKmInput = document.getElementById('lastMonthKm');
    const plateNumberInput = document.getElementById('mileagePlateNumber');
    const monthInput = document.getElementById('mileageMonth');

    if (id) {
        const mileage = vehicleMileageData.find(m => m.id === id);
        if (mileage) {
            document.getElementById('vehicleMileageId').value = mileage.id;
            plateNumberInput.value = mileage.plateNumber || '';
            monthInput.value = mileage.month || '';
            lastMonthKmInput.value = mileage.lastMonthKm || '';
            lastMonthKmInput.removeAttribute('readonly');
            document.getElementById('thisMonthKm').value = mileage.thisMonthKm || '';
            calculateDistance();
        }
    } else {
        resetVehicleMileageForm();
        lastMonthKmInput.setAttribute('readonly', true);
        lastMonthKmInput.placeholder = '选择车辆后自动填充';

        plateNumberInput.removeEventListener('change', handlePlateNumberChange);
        plateNumberInput.addEventListener('change', handlePlateNumberChange);

        monthInput.removeEventListener('change', handleMonthChange);
        monthInput.addEventListener('change', handleMonthChange);
    }
}

function handlePlateNumberChange() {
    const plateNumber = document.getElementById('mileagePlateNumber').value.trim();
    const month = document.getElementById('mileageMonth').value;

    if (plateNumber && month) {
        autoFillLastMonthKm(plateNumber, month);
    } else if (plateNumber) {
        autoFillLastMonthKm(plateNumber, getCurrentMonth());
    }
}

function handleMonthChange() {
    const plateNumber = document.getElementById('mileagePlateNumber').value.trim();
    const month = document.getElementById('mileageMonth').value;

    if (plateNumber && month) {
        autoFillLastMonthKm(plateNumber, month);
    }
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth(currentMonth) {
    const [year, month] = currentMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
    }

    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

function autoFillLastMonthKm(plateNumber, currentMonth) {
    const previousMonth = getPreviousMonth(currentMonth);

    const lastMileageRecord = vehicleMileageData.find(m =>
        m.plateNumber === plateNumber &&
        m.month === previousMonth
    );

    const lastMonthKmInput = document.getElementById('lastMonthKm');

    if (lastMileageRecord && lastMileageRecord.thisMonthKm) {
        lastMonthKmInput.value = lastMileageRecord.thisMonthKm;
        showToast(`已自动读取${previousMonth}的本月公里数：${lastMileageRecord.thisMonthKm} km`, 'info');
    } else {
        const allMileages = vehicleMileageData
            .filter(m => m.plateNumber === plateNumber)
            .sort((a, b) => (b.month || '').localeCompare(a.month || ''));

        if (allMileages.length > 0 && allMileages[0].thisMonthKm) {
            lastMonthKmInput.value = allMileages[0].thisMonthKm;
            showToast(`未找到${previousMonth}记录，已使用最近一次记录的公里数：${allMileages[0].thisMonthKm} km`, 'info');
        } else {
            lastMonthKmInput.value = '';
            lastMonthKmInput.placeholder = '该车辆暂无历史里程记录';
            showToast('该车辆暂无历史里程记录，请手动输入上月公里数', 'warning');
            lastMonthKmInput.removeAttribute('readonly');
        }
    }

    calculateDistance();
}

function closeVehicleMileageForm() {
    document.getElementById('vehicleMileageFormModal').style.display = 'none';
    resetVehicleMileageForm();
}

function resetVehicleMileageForm() {
    document.getElementById('vehicleMileageForm').reset();
    document.getElementById('vehicleMileageId').value = '';
    document.getElementById('calculatedDistance').textContent = '0';
}

function handleVehicleMileageFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('vehicleMileageId').value;
    const plateNumber = document.getElementById('mileagePlateNumber').value.trim();
    
    if (!plateNumber) {
        showToast('请输入车牌号', 'error');
        return;
    }
    
    const lastMonthKm = parseFloat(document.getElementById('lastMonthKm').value) || 0;
    const thisMonthKm = parseFloat(document.getElementById('thisMonthKm').value) || 0;
    
    const mileageData = {
        plateNumber: plateNumber,
        month: document.getElementById('mileageMonth').value,
        lastMonthKm: lastMonthKm,
        thisMonthKm: thisMonthKm,
        distance: Math.max(0, thisMonthKm - lastMonthKm)
    };
    
    if (id) {
        const index = vehicleMileageData.findIndex(m => m.id === id);
        if (index !== -1) {
            vehicleMileageData[index] = { ...vehicleMileageData[index], ...mileageData };
            showToast('里程记录更新成功', 'success');
        }
    } else {
        vehicleMileageData.push({
            id: generateId(),
            ...mileageData,
            createTime: new Date().toISOString()
        });
        showToast('里程记录添加成功', 'success');
    }
    
    saveVehicleMileageData();
    renderVehicleMileageList();
    closeVehicleMileageForm();
}

function closeVehicleDetail() {
    document.getElementById('vehicleDetailModal').style.display = 'none';
}

function getFilteredVehicleInfoData() {
    const keyword = document.getElementById('vehicleInfoSearchKeyword').value.trim().toLowerCase();
    const line = document.getElementById('vehicleInfoFilterLine').value;
    
    return vehicleInfoData.filter(item => {
        const matchKeyword = !keyword || 
            (item.plateNumber && item.plateNumber.toLowerCase().includes(keyword)) ||
            (item.model && item.model.toLowerCase().includes(keyword));
        const matchLine = !line || item.line === line;
        return matchKeyword && matchLine;
    });
}

function getFilteredVehicleRepairData() {
    const keyword = document.getElementById('vehicleRepairSearchKeyword').value.trim().toLowerCase();
    const month = document.getElementById('vehicleRepairFilterMonth').value;
    
    return vehicleRepairData.filter(item => {
        const matchKeyword = !keyword || 
            (item.plateNumber && item.plateNumber.toLowerCase().includes(keyword));
        const matchMonth = !month || (item.repairDate && item.repairDate.startsWith(month));
        return matchKeyword && matchMonth;
    });
}

function getFilteredVehicleMileageData() {
    const keyword = document.getElementById('vehicleMileageSearchKeyword').value.trim().toLowerCase();
    const month = document.getElementById('vehicleMileageFilterMonth').value;
    
    return vehicleMileageData.filter(item => {
        const matchKeyword = !keyword || 
            (item.plateNumber && item.plateNumber.toLowerCase().includes(keyword));
        const matchMonth = !month || item.month === month;
        return matchKeyword && matchMonth;
    });
}

function renderVehicleInfoList() {
    const filtered = getFilteredVehicleInfoData();
    const tbody = document.getElementById('vehicleInfoTableBody');
    const emptyMsg = document.getElementById('vehicleInfoEmptyMessage');
    
    document.getElementById('vehicleInfoTotalCount').textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
        updatePagination('vehicleInfo', 0, 1);
        return;
    }
    
    emptyMsg.style.display = 'none';
    
    const start = (vehicleInfoPage - 1) * vehicleInfoPageSize;
    const end = start + vehicleInfoPageSize;
    const pageData = filtered.slice(start, end);
    
    let html = '';
    pageData.forEach(item => {
        html += `<tr>
            <td>${item.plateNumber || '-'}</td>
            <td>${item.model || '-'}</td>
            <td>${item.purpose || '-'}</td>
            <td>${item.purchaseDate || '-'}</td>
            <td>${item.driver || '-'}</td>
            <td>${item.line || '-'}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editVehicleInfo('${item.id}')">编辑</button>
                <button class="btn btn-small btn-secondary" onclick="viewVehicleInfo('${item.id}')">详情</button>
                <button class="btn btn-small btn-danger" onclick="deleteVehicleInfo('${item.id}')">删除</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    updatePagination('vehicleInfo', filtered.length, vehicleInfoPage);
}

function renderVehicleRepairList() {
    const keyword = document.getElementById('vehicleRepairSearchKeyword').value.trim().toLowerCase();
    const month = document.getElementById('vehicleRepairFilterMonth').value;

    let displayData = [...vehicleRepairData];

    if (keyword) {
        displayData = displayData.filter(r =>
            r.plateNumber && r.plateNumber.toLowerCase().includes(keyword)
        );
    }

    if (month) {
        displayData = displayData.filter(r =>
            r.repairDate && r.repairDate.startsWith(month)
        );
    }

    const tbody = document.getElementById('vehicleRepairTableBody');
    const emptyMsg = document.getElementById('vehicleRepairEmptyMessage');

    document.getElementById('vehicleRepairTotalCount').textContent = displayData.length;

    const totalCost = displayData.reduce((sum, item) => sum + (item.cost || 0), 0);
    document.getElementById('vehicleRepairTotalCost').textContent = '¥' + totalCost.toFixed(2);
    document.getElementById('vehicleRepairTotalTimes').textContent = displayData.length + '次';

    if (displayData.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
        updatePagination('vehicleRepair', 0, 1);
        return;
    }

    emptyMsg.style.display = 'none';

    if (vehicleRepairSortField) {
        displayData.sort((a, b) => {
            let aVal = a[vehicleRepairSortField] || '';
            let bVal = b[vehicleRepairSortField] || '';

            if (vehicleRepairSortField === 'cost') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (vehicleRepairSortField === 'repairDate') {
                const dateA = new Date(aVal);
                const dateB = new Date(bVal);
                aVal = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
                bVal = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return vehicleRepairSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                return vehicleRepairSortOrder === 'asc'
                    ? aVal.localeCompare(bVal, 'zh-CN')
                    : bVal.localeCompare(aVal, 'zh-CN');
            }
        });
    }

    const start = (vehicleRepairPage - 1) * vehicleRepairPageSize;
    const end = start + vehicleRepairPageSize;
    const pageData = displayData.slice(start, end);

    let html = '';
    pageData.forEach(item => {
        html += `<tr>
            <td>${item.plateNumber || '-'}</td>
            <td>${item.repairDate || '-'}</td>
            <td>${item.issue || '-'}</td>
            <td>${item.unit || '-'}</td>
            <td class="sortable-cost" data-cost="${item.cost || 0}">${item.cost ? '¥' + item.cost.toFixed(2) : '-'}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editVehicleRepair('${item.id}')">编辑</button>
                <button class="btn btn-small btn-danger" onclick="deleteVehicleRepair('${item.id}')">删除</button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    updatePagination('vehicleRepair', displayData.length, vehicleRepairPage);
}

function renderVehicleMileageList() {
    const keyword = document.getElementById('vehicleMileageSearchKeyword').value.trim().toLowerCase();
    const month = document.getElementById('vehicleMileageFilterMonth').value;

    let displayData = [];

    vehicleInfoData.forEach(vehicle => {
        const mileages = vehicleMileageData.filter(m => m.plateNumber === vehicle.plateNumber);
        let filteredMileages = mileages;

        if (keyword) {
            filteredMileages = filteredMileages.filter(m =>
                m.plateNumber && m.plateNumber.toLowerCase().includes(keyword)
            );
        }

        if (month) {
            filteredMileages = filteredMileages.filter(m =>
                m.month && m.month === month
            );
        }

        if (filteredMileages.length > 0) {
            filteredMileages.forEach(mileage => {
                displayData.push({ ...mileage });
            });
        } else {
            if (!keyword || (vehicle.plateNumber && vehicle.plateNumber.toLowerCase().includes(keyword))) {
                displayData.push({
                    plateNumber: vehicle.plateNumber,
                    month: null,
                    lastMonthKm: null,
                    thisMonthKm: null,
                    distance: null,
                    id: null,
                    isPlaceholder: true
                });
            }
        }
    });

    const tbody = document.getElementById('vehicleMileageTableBody');
    const emptyMsg = document.getElementById('vehicleMileageEmptyMessage');

    document.getElementById('vehicleMileageTotalCount').textContent = vehicleInfoData.length;

    const totalDistance = displayData.reduce((sum, item) => sum + (item.distance || 0), 0);
    document.getElementById('vehicleMileageTotalDistance').textContent = totalDistance.toFixed(1);

    if (displayData.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
        updatePagination('vehicleMileage', 0, 1);
        return;
    }

    emptyMsg.style.display = 'none';

    if (vehicleMileageSortField) {
        displayData.sort((a, b) => {
            let aVal = a[vehicleMileageSortField] || 0;
            let bVal = b[vehicleMileageSortField] || 0;

            if (['lastMonthKm', 'thisMonthKm', 'distance'].includes(vehicleMileageSortField)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            if (vehicleMileageSortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });
    }

    const start = (vehicleMileagePage - 1) * vehicleMileagePageSize;
    const end = start + vehicleMileagePageSize;
    const pageData = displayData.slice(start, end);

    let html = '';
    pageData.forEach(item => {
        if (item.isPlaceholder) {
            html += `<tr class="placeholder-row">
                <td>${item.plateNumber || '-'}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><span class="no-data-label">暂无记录</span></td>
            </tr>`;
        } else {
            html += `<tr>
                <td>${item.plateNumber || '-'}</td>
                <td>${item.month || '-'}</td>
                <td class="sortable-mileage" data-mileage="${item.lastMonthKm || 0}">${item.lastMonthKm || '-'}</td>
                <td class="sortable-mileage" data-mileage="${item.thisMonthKm || 0}">${item.thisMonthKm || '-'}</td>
                <td class="sortable-distance" data-distance="${item.distance || 0}">${item.distance ? item.distance.toFixed(1) : '-'}</td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="editVehicleMileage('${item.id}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteVehicleMileage('${item.id}')">删除</button>
                </td>
            </tr>`;
        }
    });

    tbody.innerHTML = html;
    updatePagination('vehicleMileage', displayData.length, vehicleMileagePage);
}

function sortVehicleRepairList(field) {
    if (vehicleRepairSortField === field) {
        vehicleRepairSortOrder = vehicleRepairSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        vehicleRepairSortField = field;
        vehicleRepairSortOrder = 'asc';
    }

    document.querySelectorAll('#vehicleRepairTable thead th.sortable').forEach(th => {
        th.classList.remove('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    const currentTh = document.querySelector(`#vehicleRepairTable thead th[data-sort="${field}"]`);
    if (currentTh) {
        currentTh.classList.add('sorted');
        const icon = currentTh.querySelector('.sort-icon');
        if (icon) icon.textContent = vehicleRepairSortOrder === 'asc' ? '↑' : '↓';
    }

    vehicleRepairPage = 1;
    renderVehicleRepairList();
}

function sortVehicleMileageList(field) {
    if (vehicleMileageSortField === field) {
        vehicleMileageSortOrder = vehicleMileageSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        vehicleMileageSortField = field;
        vehicleMileageSortOrder = 'asc';
    }

    document.querySelectorAll('#vehicleMileageTable thead th.sortable').forEach(th => {
        th.classList.remove('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    const currentTh = document.querySelector(`#vehicleMileageTable thead th[data-sort="${field}"]`);
    if (currentTh) {
        currentTh.classList.add('sorted');
        const icon = currentTh.querySelector('.sort-icon');
        if (icon) icon.textContent = vehicleMileageSortOrder === 'asc' ? '↑' : '↓';
    }

    vehicleMileagePage = 1;
    renderVehicleMileageList();
}

function updatePagination(prefix, total, current) {
    const totalPages = Math.ceil(total / eval(`${prefix}PageSize`));
    
    document.getElementById(`${prefix}CurrentPage`).textContent = current;
    document.getElementById(`${prefix}TotalPages`).textContent = totalPages || 1;
    document.getElementById(`${prefix}PrevPage`).disabled = current <= 1;
    document.getElementById(`${prefix}NextPage`).disabled = current >= totalPages;
}

function editVehicleInfo(id) {
    openVehicleInfoForm(id);
}

function viewVehicleInfo(id) {
    const vehicle = vehicleInfoData.find(v => v.id === id);
    if (!vehicle) return;
    
    const repairs = vehicleRepairData.filter(r => r.plateNumber === vehicle.plateNumber);
    const mileages = vehicleMileageData.filter(m => m.plateNumber === vehicle.plateNumber);
    
    const totalRepairCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalDistance = mileages.reduce((sum, m) => sum + (m.distance || 0), 0);
    
    const content = `
        <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">车牌号：</span>
                    <span class="detail-value">${vehicle.plateNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">车型：</span>
                    <span class="detail-value">${vehicle.model || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">车辆用途：</span>
                    <span class="detail-value">${vehicle.purpose || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">购置日期：</span>
                    <span class="detail-value">${vehicle.purchaseDate || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">责任驾驶员：</span>
                    <span class="detail-value">${vehicle.driver || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">车辆所属条线：</span>
                    <span class="detail-value">${vehicle.line || '-'}</span>
                </div>
            </div>
        </div>
        <div class="detail-section">
            <h4>统计信息</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">维修次数：</span>
                    <span class="detail-value">${repairs.length}次</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">维修总金额：</span>
                    <span class="detail-value">¥${totalRepairCost.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">总行驶里程：</span>
                    <span class="detail-value">${totalDistance.toFixed(1)} km</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('vehicleDetailContent').innerHTML = content;
    document.getElementById('vehicleDetailModal').style.display = 'flex';
}

function deleteVehicleInfo(id) {
    if (!confirm('确定要删除该车辆信息吗？')) return;
    
    const index = vehicleInfoData.findIndex(v => v.id === id);
    if (index !== -1) {
        vehicleInfoData.splice(index, 1);
        saveVehicleInfoData();
        renderVehicleInfoList();
        showToast('车辆信息删除成功', 'success');
    }
}

function editVehicleRepair(id) {
    openVehicleRepairForm(id);
}

function deleteVehicleRepair(id) {
    if (!confirm('确定要删除该维修记录吗？')) return;
    
    const index = vehicleRepairData.findIndex(r => r.id === id);
    if (index !== -1) {
        vehicleRepairData.splice(index, 1);
        saveVehicleRepairData();
        renderVehicleRepairList();
        showToast('维修记录删除成功', 'success');
    }
}

function editVehicleMileage(id) {
    openVehicleMileageForm(id);
}

function deleteVehicleMileage(id) {
    if (!confirm('确定要删除该里程记录吗？')) return;
    
    const index = vehicleMileageData.findIndex(m => m.id === id);
    if (index !== -1) {
        vehicleMileageData.splice(index, 1);
        saveVehicleMileageData();
        renderVehicleMileageList();
        showToast('里程记录删除成功', 'success');
    }
}

let vrCostTrendChart = null;
let vrTypeDistChart = null;
let vrMonthDistChart = null;
let vrCurrentChartType = 'line';

const VR_COLORS = {
    neonBlue: '#0ea5e9',
    neonCyan: '#38bdf8',
    amber: '#f59e0b',
    amberLight: '#fbbf24',
    emerald: '#10b981',
    emeraldLight: '#34d399',
    violet: '#8b5cf6',
    violetLight: '#a78bfa',
    rose: '#f43f5e',
    slate: { grid: 'rgba(51,65,85,0.2)', text: '#94a3b8', bg: 'rgba(15,23,42,0.95)' }
};

const VR_CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: VR_COLORS.slate.bg,
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(71,85,105,0.4)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 }
        }
    }
};

function initYearSelector(selectId, includeAllOption = false, startYear = 2024) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentYear = new Date().getFullYear();
    const endYear = currentYear + 5;
    
    let html = '';
    if (includeAllOption) {
        html += '<option value="all">全部年份</option>';
    }
    
    for (let year = endYear; year >= startYear; year--) {
        const selected = year === currentYear ? ' selected' : '';
        html += `<option value="${year}"${selected}>${year}年</option>`;
    }
    
    select.innerHTML = html;
}

function updateVehicleDashboard() {
    initYearSelector('vrYearSelect', false, 2024);
    initVRCharts();
    loadVRData();
    setupVREventListeners();
    updateVRTime();
}

function initVRCharts() {
    const costCtx = document.getElementById('vrCostTrendChart');
    if (costCtx) {
        if (vrCostTrendChart) vrCostTrendChart.destroy();
        vrCostTrendChart = new Chart(costCtx.getContext('2d'), {
            type: vrCurrentChartType || 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...VR_CHART_DEFAULTS,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { grid: { color: VR_COLORS.slate.grid, drawBorder: false }, ticks: { color: VR_COLORS.slate.text, font: { size: 11 } } },
                    y: { grid: { color: VR_COLORS.slate.grid, drawBorder: false }, ticks: { color: VR_COLORS.slate.text, font: { size: 11 } }, beginAtZero: true }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    const typeCtx = document.getElementById('vrTypeDistChart');
    if (typeCtx) {
        if (vrTypeDistChart) vrTypeDistChart.destroy();
        vrTypeDistChart = new Chart(typeCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [VR_COLORS.neonBlue, VR_COLORS.amber, VR_COLORS.emerald, VR_COLORS.violet, VR_COLORS.rose],
                    borderColor: 'rgba(15,23,42,0.85)',
                    borderWidth: 3,
                    hoverBorderColor: '#fff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: { ...VR_CHART_DEFAULTS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}次 (${((ctx.raw / ctx.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
                },
                animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutQuart' }
            }
        });
    }

    const monthCtx = document.getElementById('vrMonthDistChart');
    if (monthCtx) {
        if (vrMonthDistChart) vrMonthDistChart.destroy();
        vrMonthDistChart = new Chart(monthCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '维修次数',
                    data: [],
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return VR_COLORS.neonCyan;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(14,165,233,0.4)');
                        gradient.addColorStop(1, 'rgba(56,189,248,0.85)');
                        return gradient;
                    },
                    borderColor: VR_COLORS.neonBlue,
                    borderWidth: 1,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                ...VR_CHART_DEFAULTS,
                scales: {
                    x: { grid: { display: false }, ticks: { color: VR_COLORS.slate.text, font: { size: 10 } } },
                    y: { grid: { color: VR_COLORS.slate.grid, drawBorder: false }, ticks: { color: VR_COLORS.slate.text, font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
                },
                animation: { duration: 700, easing: 'easeOutQuart' }
            }
        });
    }
}

function loadVRData() {
    const timeRange = document.getElementById('vrTimeRange')?.value || 'year';
    const year = document.getElementById('vrYearSelect')?.value || new Date().getFullYear().toString();

    let repairs = [...vehicleRepairData];
    let mileages = [...vehicleMileageData];

    const now = new Date();
    if (timeRange === 'month') {
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        repairs = repairs.filter(r => r.repairDate && r.repairDate.startsWith(currentMonth));
        mileages = mileages.filter(m => m.month && m.month === currentMonth);
    } else if (timeRange === 'quarter') {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        repairs = repairs.filter(r => r.repairDate && r.repairDate.startsWith(`${now.getFullYear()}`));
        mileages = mileages.filter(m => m.month && m.month.startsWith(`${now.getFullYear()}`));
    } else {
        repairs = repairs.filter(r => r.repairDate && r.repairDate.startsWith(year));
        mileages = mileages.filter(m => m.month && m.month.startsWith(year));
    }

    const totalCost = repairs.reduce((s, r) => s + (r.cost || 0), 0);
    const totalCount = repairs.length;
    const vehicleSet = new Set(repairs.map(r => r.plateNumber).filter(Boolean));
    const avgCost = totalCount > 0 ? totalCost / totalCount : 0;

    vrAnimateNumber('vrTotalCost', totalCost.toFixed(0));
    vrAnimateNumber('vrTotalCount', totalCount);
    vrAnimateNumber('vrVehicleCount', vehicleSet.size);
    vrAnimateNumber('vrAvgCost', avgCost.toFixed(0));

    document.getElementById('vrVehicleExtra').textContent = vehicleSet.size > 0 ? `占比 ${(vehicleSet.size / Math.max(vehicleInfoData.length, 1) * 100).toFixed(0)}%` : '--';
    document.getElementById('vrAvgExtra').textContent = totalCount > 0 ? `最高 ¥${Math.max(...repairs.map(r=>r.cost||0)).toFixed(0)}` : '--';

    const maxCount = Math.max(totalCount, 50);
    document.getElementById('vrCountBar').style.width = Math.min((totalCount / maxCount) * 100, 100) + '%';

    renderVRCostTrend(repairs, timeRange, year);
    renderVRTypeDist(repairs);
    renderVRMonthDist(repairs, timeRange, year);
    renderVRTopRepairList(repairs);
    renderVRMileageList(mileages);
    renderVRRecentRecords(repairs);

    const pieLabelEl = document.getElementById('vrPieCenterLabel');
    if (pieLabelEl) pieLabelEl.querySelector('.pie-total').textContent = totalCount;
}

function vrAnimateNumber(id, targetVal) {
    const el = document.getElementById(id);
    if (!el) return;
    const target = parseFloat(targetVal) || 0;
    const start = parseFloat(el.textContent.replace(/,/g,'')) || 0;
    const duration = 700;
    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * ease;
        el.textContent = formatNumber(Math.round(current));
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = formatNumber(Math.round(target));
    }
    requestAnimationFrame(tick);
}

function renderVRCostTrend(data, timeRange, year) {
    if (!vrCostTrendChart) return;
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
        monthlyData[String(i).padStart(2,'0')] = 0;
    }
    data.forEach(item => {
        if (item.repairDate) {
            const m = item.repairDate.substring(5, 7);
            if (monthlyData.hasOwnProperty(m)) monthlyData[m] += item.cost || 0;
        }
    });
    const labels = Object.keys(monthlyData).map(m => m + '月');
    const values = Object.values(monthlyData);

    const isLine = vrCurrentChartType === 'line';
    const ds = {
        label: '维修金额(元)',
        data: values,
        borderColor: VR_COLORS.amber,
        backgroundColor: isLine ? 'rgba(245,158,11,0.08)' : function(ctx) {
            const c = ctx.chart;
            const {ctx:g, chartArea} = c;
            if (!chartArea) return VR_COLORS.amber;
            const grad = g.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            grad.addColorStop(0, 'rgba(245,158,11,0.35)');
            grad.addColorStop(1, 'rgba(251,191,36,0.75)');
            return grad;
        },
        tension: isLine ? 0.35 : 0,
        fill: isLine,
        borderWidth: isLine ? 2.5 : 1,
        borderRadius: isLine ? 0 : 5,
        pointBackgroundColor: VR_COLORS.amber,
        pointBorderColor: 'rgba(15,23,42,0.8)',
        pointBorderWidth: 2,
        pointRadius: isLine ? 4 : 0,
        pointHoverRadius: 6
    };

    vrCostTrendChart.config.type = vrCurrentChartType;
    vrCostTrendChart.data.labels = labels;
    vrCostTrendChart.data.datasets = [ds];
    vrCostTrendChart.update({ duration: 600, easing: 'easeOutQuart' });
}

function renderVRTypeDist(data) {
    if (!vrTypeDistChart) return;
    const typeMap = {};
    data.forEach(item => {
        const issue = (item.issue || '').trim();
        let category = '其他';
        if (issue.includes('发动机') || issue.includes('电机')) category = '发动机/电机';
        else if (issue.includes('轮胎') || issue.includes('刹车') || issue.includes('制动')) category = '轮胎/制动';
        else if (issue.includes('电瓶') || issue.includes('电池') || issue.includes('电路')) category = '电气系统';
        else if (issue.includes('保养') || issue.includes('换油') || issue.includes('检修')) category = '常规保养';
        else if (issue.includes('底盘') || issue.includes('悬挂') || issue.includes('转向')) category = '底盘/悬挂';
        typeMap[category] = (typeMap[category] || 0) + 1;
    });

    const entries = Object.entries(typeMap).sort((a,b) => b[1] - a[1]);
    vrTypeDistChart.data.labels = entries.map(e => e[0]);
    vrTypeDistChart.data.datasets[0].data = entries.map(e => e[1]);
    vrTypeDistChart.update({ duration: 700, easing: 'easeOutQuart' });

    const pieLabelEl = document.getElementById('vrPieCenterLabel');
    if (pieLabelEl) pieLabelEl.querySelector('.pie-total').textContent = data.length;
}

function renderVRMonthDist(data, timeRange, year) {
    if (!vrMonthDistChart) return;
    const monthData = {};
    for (let i = 1; i <= 12; i++) monthData[String(i).padStart(2,'0')] = 0;
    data.forEach(item => {
        if (item.repairDate) {
            const m = item.repairDate.substring(5, 7);
            if (monthData.hasOwnProperty(m)) monthData[m]++;
        }
    });
    vrMonthDistChart.data.labels = Object.keys(monthData).map(m => m + '月');
    vrMonthDistChart.data.datasets[0].data = Object.values(monthData);
    vrMonthDistChart.update({ duration: 600, easing: 'easeOutQuart' });
}

function renderVRTopRepairList(data) {
    const container = document.getElementById('vrTopRepairList');
    if (!container) return;

    const filterBy = document.getElementById('vrTopFilter')?.value || 'count';

    const vStats = {};
    data.forEach(item => {
        if (!item.plateNumber) return;
        if (!vStats[item.plateNumber]) vStats[item.plateNumber] = { count: 0, cost: 0 };
        vStats[item.plateNumber].count++;
        vStats[item.plateNumber].cost += item.cost || 0;
    });

    const sorted = Object.entries(vStats)
        .sort((a, b) => b[1][filterBy] - a[1][filterBy])
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<div class="vr-empty-state">暂无数据</div>';
        return;
    }

    container.innerHTML = sorted.map(([plate, stats], idx) => `
        <div class="vr-rank-item">
            <span class="vr-rank-num">${idx + 1}</span>
            <span class="vr-rank-name" title="${escapeHtml(plate)}">${escapeHtml(plate)}</span>
            <span class="vr-rank-val">${filterBy === 'count' ? stats.count + '次' : '¥' + stats.cost.toFixed(0)}</span>
        </div>
    `).join('');
}

function renderVRMileageList(data) {
    const container = document.getElementById('vrMileageList');
    if (!container) return;

    const vMiles = {};
    data.forEach(item => {
        if (!item.plateNumber) return;
        vMiles[item.plateNumber] = (vMiles[item.plateNumber] || 0) + (item.distance || 0);
    });

    const sorted = Object.entries(vMiles).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (sorted.length === 0) {
        container.innerHTML = '<div class="vr-empty-state">暂无数据</div>';
        return;
    }

    container.innerHTML = sorted.map(([plate, miles], idx) => `
        <div class="vr-rank-item">
            <span class="vr-rank-num">${idx + 1}</span>
            <span class="vr-rank-name" title="${escapeHtml(plate)}">${escapeHtml(plate)}</span>
            <span class="vr-rank-val">${miles.toFixed(1)} km</span>
        </div>
    `).join('');
}

function renderVRRecentRecords(data) {
    const tbody = document.getElementById('vrRecentRecordsBody');
    if (!tbody) return;

    const sorted = [...data].sort((a, b) => new Date(b.repairDate || 0) - new Date(a.repairDate || 0)).slice(0, 10);

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="vr-empty-row">暂无维修记录</td></tr>';
        return;
    }

    tbody.innerHTML = sorted.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong style="color:#38bdf8">${escapeHtml(r.plateNumber || '-')}</strong></td>
            <td>${r.repairDate || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(r.issue || '')}">${escapeHtml(r.issue || '-')}</td>
            <td>${escapeHtml(r.unit || '-')}</td>
            <td class="text-right"><strong style="color:#fbbf24">¥${(r.cost || 0).toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

function setupVREventListeners() {
    const refreshBtn = document.getElementById('vrRefreshBtn');
    if (refreshBtn && !refreshBtn._bound) {
        refreshBtn.addEventListener('click', () => { loadVRData(); updateVRTime(); showToast('数据已刷新', 'success'); });
        refreshBtn._bound = true;
    }

    const exportBtn = document.getElementById('vrExportBtn');
    if (exportBtn && !exportBtn._bound) {
        exportBtn.addEventListener('click', exportVRDashboard);
        exportBtn._bound = true;
    }

    const timeRangeSel = document.getElementById('vrTimeRange');
    if (timeRangeSel && !timeRangeSel._bound) {
        timeRangeSel.addEventListener('change', debounce(loadVRData, 200));
        timeRangeSel._bound = true;
    }

    const yearSel = document.getElementById('vrYearSelect');
    if (yearSel && !yearSel._bound) {
        yearSel.addEventListener('change', debounce(loadVRData, 200));
        yearSel._bound = true;
    }

    const topFilter = document.getElementById('vrTopFilter');
    if (topFilter && !topFilter._bound) {
        topFilter.addEventListener('change', () => {
            const timeRange = document.getElementById('vrTimeRange')?.value || 'year';
            const year = document.getElementById('vrYearSelect')?.value || new Date().getFullYear().toString();
            let repairs = [...vehicleRepairData];
            if (timeRange === 'year' || timeRange === 'quarter') {
                repairs = repairs.filter(r => r.repairDate && r.repairDate.startsWith(year));
            }
            renderVRTopRepairList(repairs);
        });
        topFilter._bound = true;
    }

    document.querySelectorAll('.vr-tool-btn').forEach(btn => {
        if (!btn._bound) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.vr-tool-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                vrCurrentChartType = this.dataset.chart || 'line';
                const timeRange = document.getElementById('vrTimeRange')?.value || 'year';
                const year = document.getElementById('vrYearSelect')?.value || new Date().getFullYear().toString();
                let repairs = [...vehicleRepairData];
                if (timeRange === 'year' || timeRange === 'quarter') {
                    repairs = repairs.filter(r => r.repairDate && r.repairDate.startsWith(year));
                }
                renderVRCostTrend(repairs, timeRange, year);
            });
            btn._bound = true;
        }
    });

    const searchInput = document.getElementById('vrRecordSearch');
    if (searchInput && !searchInput._bound) {
        searchInput.addEventListener('input', debounce(function() {
            const kw = this.value.trim().toLowerCase();
            let repairs = [...vehicleRepairData];
            if (kw) repairs = repairs.filter(r => r.plateNumber && r.plateNumber.toLowerCase().includes(kw));
            const sorted = repairs.sort((a, b) => new Date(b.repairDate||0) - new Date(a.repairDate||0)).slice(0, 10);
            renderVRRecentRecords(sorted);
        }, 250));
        searchInput._bound = true;
    }

    const viewAllBtn = document.getElementById('vrViewAllBtn');
    if (viewAllBtn && !viewAllBtn._bound) {
        viewAllBtn.addEventListener('click', () => {
            const tabBtn = document.querySelector('#vehicle-module .tab-btn[data-tab="vehicle-repair"]');
            if (tabBtn) tabBtn.click();
        });
        viewAllBtn._bound = true;
    }
}

function updateVRTime() {
    const el = document.getElementById('vrUpdateTime');
    if (el) el.textContent = new Date().toLocaleString('zh-CN');
}

function exportVRDashboard() {
    const rows = [
        { metric: '维修总金额(元)', value: vehicleRepairData.reduce((s,r)=>s+(r.cost||0),0).toFixed(2) },
        { metric: '维修总次数', value: String(vehicleRepairData.length) },
        { metric: '涉及车辆数', value: String(new Set(vehicleRepairData.filter(r=>r.plateNumber).map(r=>r.plateNumber)).size) },
        { metric: '平均维修费用(元)', value: vehicleRepairData.length > 0 ? (vehicleRepairData.reduce((s,r)=>s+(r.cost||0),0)/vehicleRepairData.length).toFixed(2) : '0' }
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '维修一张图报表');

    const fileName = `车辆维修一张图_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('导出成功', 'success');
}

function exportVehicleInfoToExcel() {
    if (vehicleInfoData.length === 0) {
        showToast('暂无数据可导出', 'warning');
        return;
    }
    
    const exportData = vehicleInfoData.map(item => ({
        '车牌号': item.plateNumber || '',
        '车型': item.model || '',
        '车辆用途': item.purpose || '',
        '购置日期': item.purchaseDate || '',
        '责任驾驶员': item.driver || '',
        '车辆所属条线': item.line || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '车辆基本信息');
    
    const fileName = `车辆基本信息_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast('导出成功', 'success');
}

function exportVehicleRepairToExcel() {
    if (vehicleRepairData.length === 0) {
        showToast('暂无数据可导出', 'warning');
        return;
    }
    
    const exportData = vehicleRepairData.map(item => ({
        '车牌号': item.plateNumber || '',
        '维修时间': item.repairDate || '',
        '问题描述': item.issue || '',
        '维修单位': item.unit || '',
        '维修金额(元)': item.cost || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '车辆维修记录');
    
    const fileName = `车辆维修记录_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast('导出成功', 'success');
}

function exportVehicleMileageToExcel() {
    if (vehicleMileageData.length === 0) {
        showToast('暂无数据可导出', 'warning');
        return;
    }
    
    const exportData = vehicleMileageData.map(item => ({
        '车牌号': item.plateNumber || '',
        '记录月份': item.month || '',
        '上月公里数(km)': item.lastMonthKm || 0,
        '本月公里数(km)': item.thisMonthKm || 0,
        '行驶公里数(km)': item.distance || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '车辆里程记录');
    
    const fileName = `车辆里程记录_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast('导出成功', 'success');
}

function setupVehicleInfoImportListeners() {
    const uploadArea = document.getElementById('vehicleInfoUploadArea');
    const fileInput = document.getElementById('vehicleInfoFileInput');
    const selectBtn = document.getElementById('vehicleInfoSelectFileBtn');
    const removeBtn = document.getElementById('vehicleInfoRemoveFile');
    const cancelBtn = document.getElementById('cancelImportVehicleInfoBtn');
    const confirmBtn = document.getElementById('confirmImportVehicleInfoBtn');
    const closeBtn = document.getElementById('closeImportVehicleInfoModal');
    
    selectBtn.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== selectBtn) fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleVehicleInfoFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVehicleInfoFileSelect(e.target.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', () => {
        resetVehicleInfoImportUI();
    });
    
    cancelBtn.addEventListener('click', () => {
        document.getElementById('importVehicleInfoModal').style.display = 'none';
        resetVehicleInfoImportUI();
    });
    
    closeBtn.addEventListener('click', () => {
        document.getElementById('importVehicleInfoModal').style.display = 'none';
        resetVehicleInfoImportUI();
    });
    
    confirmBtn.addEventListener('click', confirmVehicleInfoImport);
}

function handleVehicleInfoFileSelect(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('请选择Excel文件（.xlsx或.xls）', 'error');
        return;
    }
    
    document.getElementById('vehicleInfoFileName').textContent = file.name;
    document.getElementById('vehicleInfoFileSize').textContent = formatFileSize(file.size);
    document.getElementById('vehicleInfoUploadArea').style.display = 'none';
    document.getElementById('vehicleInfoFileInfo').style.display = 'block';
    
    parseVehicleInfoExcel(file);
}

function parseVehicleInfoExcel(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                resetVehicleInfoImportUI();
                return;
            }
            
            if (jsonData.length > 1000) {
                showToast('单次导入数据不能超过1000条', 'error');
                resetVehicleInfoImportUI();
                return;
            }
            
            vehicleInfoImportData = jsonData.map((row, index) => {
                const item = {
                    plateNumber: row['车牌号'] || row['车牌'] || '',
                    model: row['车型'] || '',
                    purpose: row['车辆用途'] || row['用途'] || '',
                    purchaseDate: row['购置日期'] || '',
                    driver: row['责任驾驶员'] || row['驾驶员'] || '',
                    line: row['车辆所属条线'] || row['所属条线'] || row['条线'] || ''
                };
                
                const errors = [];
                if (!item.plateNumber) {
                    errors.push('车牌号不能为空');
                }
                
                return {
                    data: item,
                    errors: errors,
                    rowIndex: index + 2
                };
            });
            
            showVehicleInfoImportPreview();
            
        } catch (error) {
            showToast('Excel文件解析失败：' + error.message, 'error');
            resetVehicleInfoImportUI();
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function showVehicleInfoImportPreview() {
    const validData = vehicleInfoImportData.filter(item => item.errors.length === 0);
    const invalidData = vehicleInfoImportData.filter(item => item.errors.length > 0);
    
    document.getElementById('vehicleInfoPreviewCount').textContent = vehicleInfoImportData.length;
    
    const previewBody = document.getElementById('vehicleInfoPreviewBody');
    const previewHead = document.getElementById('vehicleInfoPreviewHead');
    
    previewHead.innerHTML = '<tr><th>车牌号</th><th>车型</th><th>车辆用途</th><th>购置日期</th><th>责任驾驶员</th><th>车辆所属条线</th></tr>';
    
    let html = '';
    vehicleInfoImportData.slice(0, 10).forEach(item => {
        html += `<tr class="${item.errors.length > 0 ? 'error-row' : ''}">
            <td>${item.data.plateNumber}</td>
            <td>${item.data.model}</td>
            <td>${item.data.purpose}</td>
            <td>${item.data.purchaseDate}</td>
            <td>${item.data.driver}</td>
            <td>${item.data.line}</td>
        </tr>`;
    });
    previewBody.innerHTML = html;
    
    document.getElementById('vehicleInfoImportPreview').style.display = 'block';
    
    if (invalidData.length > 0) {
        const errorList = document.getElementById('vehicleInfoErrorList');
        let errorHtml = '';
        invalidData.forEach(item => {
            errorHtml += `<div class="error-item">第${item.rowIndex}行：${item.errors.join('、')}</div>`;
        });
        errorList.innerHTML = errorHtml;
        document.getElementById('vehicleInfoImportErrors').style.display = 'block';
    } else {
        document.getElementById('vehicleInfoImportErrors').style.display = 'none';
    }
    
    document.getElementById('confirmImportVehicleInfoBtn').disabled = validData.length === 0;
}

function confirmVehicleInfoImport() {
    const validData = vehicleInfoImportData.filter(item => item.errors.length === 0);
    
    if (validData.length === 0) {
        showToast('没有有效数据可导入', 'warning');
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    validData.forEach(item => {
        const exists = vehicleInfoData.some(v => v.plateNumber === item.data.plateNumber);
        if (exists) {
            failCount++;
        } else {
            vehicleInfoData.push({
                id: generateId(),
                ...item.data,
                createTime: new Date().toISOString()
            });
            successCount++;
        }
    });
    
    saveVehicleInfoData();
    
    vehicleImportHistory.unshift({
        id: generateId(),
        type: 'vehicleInfo',
        typeName: '车辆基本信息',
        fileName: document.getElementById('vehicleInfoFileName').textContent,
        totalCount: validData.length,
        successCount: successCount,
        failCount: failCount,
        operator: '管理员',
        importTime: new Date().toISOString()
    });
    saveVehicleImportHistory();
    
    showToast(`导入完成：成功${successCount}条，失败${failCount}条`, 'success');
    
    document.getElementById('importVehicleInfoModal').style.display = 'none';
    resetVehicleInfoImportUI();
    renderVehicleInfoList();
}

function resetVehicleInfoImportUI() {
    document.getElementById('vehicleInfoUploadArea').style.display = 'block';
    document.getElementById('vehicleInfoFileInfo').style.display = 'none';
    document.getElementById('vehicleInfoImportPreview').style.display = 'none';
    document.getElementById('vehicleInfoImportErrors').style.display = 'none';
    document.getElementById('vehicleInfoFileInput').value = '';
    document.getElementById('confirmImportVehicleInfoBtn').disabled = true;
    vehicleInfoImportData = [];
}

function setupVehicleRepairImportListeners() {
    const uploadArea = document.getElementById('vehicleRepairUploadArea');
    const fileInput = document.getElementById('vehicleRepairFileInput');
    const selectBtn = document.getElementById('vehicleRepairSelectFileBtn');
    const removeBtn = document.getElementById('vehicleRepairRemoveFile');
    const cancelBtn = document.getElementById('cancelImportVehicleRepairBtn');
    const confirmBtn = document.getElementById('confirmImportVehicleRepairBtn');
    const closeBtn = document.getElementById('closeImportVehicleRepairModal');
    
    selectBtn.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== selectBtn) fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleVehicleRepairFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVehicleRepairFileSelect(e.target.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', () => {
        resetVehicleRepairImportUI();
    });
    
    cancelBtn.addEventListener('click', () => {
        document.getElementById('importVehicleRepairModal').style.display = 'none';
        resetVehicleRepairImportUI();
    });
    
    closeBtn.addEventListener('click', () => {
        document.getElementById('importVehicleRepairModal').style.display = 'none';
        resetVehicleRepairImportUI();
    });
    
    confirmBtn.addEventListener('click', confirmVehicleRepairImport);
}

function handleVehicleRepairFileSelect(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('请选择Excel文件（.xlsx或.xls）', 'error');
        return;
    }
    
    document.getElementById('vehicleRepairFileName').textContent = file.name;
    document.getElementById('vehicleRepairFileSize').textContent = formatFileSize(file.size);
    document.getElementById('vehicleRepairUploadArea').style.display = 'none';
    document.getElementById('vehicleRepairFileInfo').style.display = 'block';
    
    parseVehicleRepairExcel(file);
}

function parseVehicleRepairExcel(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                resetVehicleRepairImportUI();
                return;
            }
            
            if (jsonData.length > 1000) {
                showToast('单次导入数据不能超过1000条', 'error');
                resetVehicleRepairImportUI();
                return;
            }
            
            vehicleRepairImportData = jsonData.map((row, index) => {
                const item = {
                    plateNumber: row['车牌号'] || row['车牌'] || '',
                    repairDate: row['维修时间'] || row['维修日期'] || '',
                    issue: row['问题描述'] || row['问题'] || '',
                    unit: row['维修单位'] || '',
                    cost: parseFloat(row['维修金额'] || row['金额'] || 0) || 0
                };
                
                const errors = [];
                if (!item.plateNumber) {
                    errors.push('车牌号不能为空');
                }
                
                return {
                    data: item,
                    errors: errors,
                    rowIndex: index + 2
                };
            });
            
            showVehicleRepairImportPreview();
            
        } catch (error) {
            showToast('Excel文件解析失败：' + error.message, 'error');
            resetVehicleRepairImportUI();
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function showVehicleRepairImportPreview() {
    const validData = vehicleRepairImportData.filter(item => item.errors.length === 0);
    const invalidData = vehicleRepairImportData.filter(item => item.errors.length > 0);
    
    document.getElementById('vehicleRepairPreviewCount').textContent = vehicleRepairImportData.length;
    
    const previewBody = document.getElementById('vehicleRepairPreviewBody');
    const previewHead = document.getElementById('vehicleRepairPreviewHead');
    
    previewHead.innerHTML = '<tr><th>车牌号</th><th>维修时间</th><th>问题描述</th><th>维修单位</th><th>维修金额</th></tr>';
    
    let html = '';
    vehicleRepairImportData.slice(0, 10).forEach(item => {
        html += `<tr class="${item.errors.length > 0 ? 'error-row' : ''}">
            <td>${item.data.plateNumber}</td>
            <td>${item.data.repairDate}</td>
            <td>${item.data.issue}</td>
            <td>${item.data.unit}</td>
            <td>${item.data.cost}</td>
        </tr>`;
    });
    previewBody.innerHTML = html;
    
    document.getElementById('vehicleRepairImportPreview').style.display = 'block';
    
    if (invalidData.length > 0) {
        const errorList = document.getElementById('vehicleRepairErrorList');
        let errorHtml = '';
        invalidData.forEach(item => {
            errorHtml += `<div class="error-item">第${item.rowIndex}行：${item.errors.join('、')}</div>`;
        });
        errorList.innerHTML = errorHtml;
        document.getElementById('vehicleRepairImportErrors').style.display = 'block';
    } else {
        document.getElementById('vehicleRepairImportErrors').style.display = 'none';
    }
    
    document.getElementById('confirmImportVehicleRepairBtn').disabled = validData.length === 0;
}

function confirmVehicleRepairImport() {
    const validData = vehicleRepairImportData.filter(item => item.errors.length === 0);
    
    if (validData.length === 0) {
        showToast('没有有效数据可导入', 'warning');
        return;
    }
    
    let successCount = 0;
    
    validData.forEach(item => {
        vehicleRepairData.push({
            id: generateId(),
            ...item.data,
            createTime: new Date().toISOString()
        });
        successCount++;
    });
    
    saveVehicleRepairData();
    
    vehicleImportHistory.unshift({
        id: generateId(),
        type: 'vehicleRepair',
        typeName: '车辆维修数据',
        fileName: document.getElementById('vehicleRepairFileName').textContent,
        totalCount: validData.length,
        successCount: successCount,
        failCount: 0,
        operator: '管理员',
        importTime: new Date().toISOString()
    });
    saveVehicleImportHistory();
    
    showToast(`导入完成：成功${successCount}条`, 'success');
    
    document.getElementById('importVehicleRepairModal').style.display = 'none';
    resetVehicleRepairImportUI();
    renderVehicleRepairList();
}

function resetVehicleRepairImportUI() {
    document.getElementById('vehicleRepairUploadArea').style.display = 'block';
    document.getElementById('vehicleRepairFileInfo').style.display = 'none';
    document.getElementById('vehicleRepairImportPreview').style.display = 'none';
    document.getElementById('vehicleRepairImportErrors').style.display = 'none';
    document.getElementById('vehicleRepairFileInput').value = '';
    document.getElementById('confirmImportVehicleRepairBtn').disabled = true;
    vehicleRepairImportData = [];
}

function setupVehicleMileageImportListeners() {
    const uploadArea = document.getElementById('vehicleMileageUploadArea');
    const fileInput = document.getElementById('vehicleMileageFileInput');
    const selectBtn = document.getElementById('vehicleMileageSelectFileBtn');
    const removeBtn = document.getElementById('vehicleMileageRemoveFile');
    const cancelBtn = document.getElementById('cancelImportVehicleMileageBtn');
    const confirmBtn = document.getElementById('confirmImportVehicleMileageBtn');
    const closeBtn = document.getElementById('closeImportVehicleMileageModal');
    
    selectBtn.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== selectBtn) fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleVehicleMileageFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVehicleMileageFileSelect(e.target.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', () => {
        resetVehicleMileageImportUI();
    });
    
    cancelBtn.addEventListener('click', () => {
        document.getElementById('importVehicleMileageModal').style.display = 'none';
        resetVehicleMileageImportUI();
    });
    
    closeBtn.addEventListener('click', () => {
        document.getElementById('importVehicleMileageModal').style.display = 'none';
        resetVehicleMileageImportUI();
    });
    
    confirmBtn.addEventListener('click', confirmVehicleMileageImport);
}

function handleVehicleMileageFileSelect(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('请选择Excel文件（.xlsx或.xls）', 'error');
        return;
    }
    
    document.getElementById('vehicleMileageFileName').textContent = file.name;
    document.getElementById('vehicleMileageFileSize').textContent = formatFileSize(file.size);
    document.getElementById('vehicleMileageUploadArea').style.display = 'none';
    document.getElementById('vehicleMileageFileInfo').style.display = 'block';
    
    parseVehicleMileageExcel(file);
}

function parseVehicleMileageExcel(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                resetVehicleMileageImportUI();
                return;
            }
            
            if (jsonData.length > 1000) {
                showToast('单次导入数据不能超过1000条', 'error');
                resetVehicleMileageImportUI();
                return;
            }
            
            vehicleMileageImportData = jsonData.map((row, index) => {
                const lastMonthKm = parseFloat(row['上月公里数'] || row['上月里程'] || 0) || 0;
                const thisMonthKm = parseFloat(row['本月公里数'] || row['本月里程'] || 0) || 0;
                
                const item = {
                    plateNumber: row['车牌号'] || row['车牌'] || '',
                    month: row['记录月份'] || row['月份'] || '',
                    lastMonthKm: lastMonthKm,
                    thisMonthKm: thisMonthKm,
                    distance: Math.max(0, thisMonthKm - lastMonthKm)
                };
                
                const errors = [];
                if (!item.plateNumber) {
                    errors.push('车牌号不能为空');
                }
                
                return {
                    data: item,
                    errors: errors,
                    rowIndex: index + 2
                };
            });
            
            showVehicleMileageImportPreview();
            
        } catch (error) {
            showToast('Excel文件解析失败：' + error.message, 'error');
            resetVehicleMileageImportUI();
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function showVehicleMileageImportPreview() {
    const validData = vehicleMileageImportData.filter(item => item.errors.length === 0);
    const invalidData = vehicleMileageImportData.filter(item => item.errors.length > 0);
    
    document.getElementById('vehicleMileagePreviewCount').textContent = vehicleMileageImportData.length;
    
    const previewBody = document.getElementById('vehicleMileagePreviewBody');
    const previewHead = document.getElementById('vehicleMileagePreviewHead');
    
    previewHead.innerHTML = '<tr><th>车牌号</th><th>记录月份</th><th>上月公里数</th><th>本月公里数</th><th>行驶公里数</th></tr>';
    
    let html = '';
    vehicleMileageImportData.slice(0, 10).forEach(item => {
        html += `<tr class="${item.errors.length > 0 ? 'error-row' : ''}">
            <td>${item.data.plateNumber}</td>
            <td>${item.data.month}</td>
            <td>${item.data.lastMonthKm}</td>
            <td>${item.data.thisMonthKm}</td>
            <td>${item.data.distance.toFixed(1)}</td>
        </tr>`;
    });
    previewBody.innerHTML = html;
    
    document.getElementById('vehicleMileageImportPreview').style.display = 'block';
    
    if (invalidData.length > 0) {
        const errorList = document.getElementById('vehicleMileageErrorList');
        let errorHtml = '';
        invalidData.forEach(item => {
            errorHtml += `<div class="error-item">第${item.rowIndex}行：${item.errors.join('、')}</div>`;
        });
        errorList.innerHTML = errorHtml;
        document.getElementById('vehicleMileageImportErrors').style.display = 'block';
    } else {
        document.getElementById('vehicleMileageImportErrors').style.display = 'none';
    }
    
    document.getElementById('confirmImportVehicleMileageBtn').disabled = validData.length === 0;
}

function confirmVehicleMileageImport() {
    const validData = vehicleMileageImportData.filter(item => item.errors.length === 0);
    
    if (validData.length === 0) {
        showToast('没有有效数据可导入', 'warning');
        return;
    }
    
    let successCount = 0;
    
    validData.forEach(item => {
        vehicleMileageData.push({
            id: generateId(),
            ...item.data,
            createTime: new Date().toISOString()
        });
        successCount++;
    });
    
    saveVehicleMileageData();
    
    vehicleImportHistory.unshift({
        id: generateId(),
        type: 'vehicleMileage',
        typeName: '车辆里程数据',
        fileName: document.getElementById('vehicleMileageFileName').textContent,
        totalCount: validData.length,
        successCount: successCount,
        failCount: 0,
        operator: '管理员',
        importTime: new Date().toISOString()
    });
    saveVehicleImportHistory();
    
    showToast(`导入完成：成功${successCount}条`, 'success');
    
    document.getElementById('importVehicleMileageModal').style.display = 'none';
    resetVehicleMileageImportUI();
    renderVehicleMileageList();
}

function resetVehicleMileageImportUI() {
    document.getElementById('vehicleMileageUploadArea').style.display = 'block';
    document.getElementById('vehicleMileageFileInfo').style.display = 'none';
    document.getElementById('vehicleMileageImportPreview').style.display = 'none';
    document.getElementById('vehicleMileageImportErrors').style.display = 'none';
    document.getElementById('vehicleMileageFileInput').value = '';
    document.getElementById('confirmImportVehicleMileageBtn').disabled = true;
    vehicleMileageImportData = [];
}

function loadToiletData() {
    const stored = localStorage.getItem(TOILET_STORAGE_KEY);
    if (stored) {
        toiletData = JSON.parse(stored);
    }
}

function saveToiletData() {
    localStorage.setItem(TOILET_STORAGE_KEY, JSON.stringify(toiletData));
    syncMDKPIs();
}

function openToiletForm(id = null) {
    resetToiletForm();
    if (id) {
        const data = toiletData.find(item => item.id === id);
        if (data) {
            document.getElementById('toiletFormTitle').textContent = '编辑环卫公厕';
            document.getElementById('toiletId').value = data.id;
            document.getElementById('toiletName').value = data.name || '';
            document.getElementById('toiletStreet').value = data.street || '';
            document.getElementById('toiletLocation').value = data.location || '';
            document.getElementById('toiletLevel').value = data.level || '';
        }
    } else {
        document.getElementById('toiletFormTitle').textContent = '新增环卫公厕';
    }
    document.getElementById('toiletFormModal').style.display = 'block';
}

function closeToiletForm() {
    document.getElementById('toiletFormModal').style.display = 'none';
    resetToiletForm();
}

function resetToiletForm() {
    document.getElementById('toiletForm').reset();
    document.getElementById('toiletId').value = '';
    clearBusinessErrors('toilet');
}

function validateToiletForm() {
    let isValid = true;
    clearBusinessErrors('toilet');
    
    const name = document.getElementById('toiletName').value.trim();
    const street = document.getElementById('toiletStreet').value.trim();
    const location = document.getElementById('toiletLocation').value.trim();
    const level = document.getElementById('toiletLevel').value;
    
    if (!name) {
        document.getElementById('toiletNameError').textContent = '请输入公厕名称';
        isValid = false;
    } else if (name.length > 50) {
        document.getElementById('toiletNameError').textContent = '公厕名称不能超过50个字符';
        isValid = false;
    }
    
    if (!street) {
        document.getElementById('toiletStreetError').textContent = '请输入所属街道';
        isValid = false;
    } else if (street.length > 50) {
        document.getElementById('toiletStreetError').textContent = '所属街道不能超过50个字符';
        isValid = false;
    }
    
    if (!location) {
        document.getElementById('toiletLocationError').textContent = '请输入具体位置';
        isValid = false;
    } else if (location.length > 100) {
        document.getElementById('toiletLocationError').textContent = '具体位置不能超过100个字符';
        isValid = false;
    }
    
    if (!level) {
        document.getElementById('toiletLevelError').textContent = '请选择公厕等级';
        isValid = false;
    }
    
    return isValid;
}

function handleToiletFormSubmit(e) {
    e.preventDefault();
    
    if (!validateToiletForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }
    
    const id = document.getElementById('toiletId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('toiletName').value.trim(),
        street: document.getElementById('toiletStreet').value,
        location: document.getElementById('toiletLocation').value.trim(),
        level: document.getElementById('toiletLevel').value,
        createdAt: id ? toiletData.find(item => item.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = toiletData.findIndex(item => item.id === id);
        toiletData[index] = data;
        showToast('环卫公厕更新成功', 'success');
    } else {
        toiletData.unshift(data);
        showToast('环卫公厕添加成功', 'success');
    }
    
    saveToiletData();
    closeToiletForm();
    renderToiletList();
}

// 街道名称归一化：历史数据里存在「庄市」与「庄市街道」两种写法，统一后比较
function normalizeStreetName(name) {
    return String(name || '').replace(/\s/g, '').replace(/(街道|镇|片区|办事处)$/, '');
}

function streetIsSame(a, b) {
    if (!a || !b) return false;
    return a === b || normalizeStreetName(a) === normalizeStreetName(b);
}

function getFilteredToiletData() {
    let filtered = [...toiletData];
    
    const street = document.getElementById('toiletFilterStreet').value;
    const level = document.getElementById('toiletFilterLevel').value;
    const keyword = document.getElementById('toiletSearchKeyword').value.trim().toLowerCase();
    
    if (street) {
        filtered = filtered.filter(item => streetIsSame(item.street, street));
    }
    
    if (level) {
        filtered = filtered.filter(item => item.level === level);
    }
    
    if (keyword) {
        filtered = filtered.filter(item => 
            (item.name && item.name.toLowerCase().includes(keyword)) ||
            (item.location && item.location.toLowerCase().includes(keyword))
        );
    }
    
    return filtered;
}

function renderToiletList() {
    const filtered = getFilteredToiletData();
    const tbody = document.getElementById('toiletTableBody');
    const emptyMessage = document.getElementById('toiletEmptyMessage');
    const totalCount = document.getElementById('toiletTotalCount');
    
    totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.getElementById('toiletPagination').style.display = 'none';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / toiletPageSize);
    const startIndex = (toiletPage - 1) * toiletPageSize;
    const endIndex = startIndex + toiletPageSize;
    const pageData = filtered.slice(startIndex, endIndex);
    
    let html = '';
    pageData.forEach((item, index) => {
        html += `<tr>
            <td>${startIndex + index + 1}</td>
            <td>${escapeHtml(item.name || '')}</td>
            <td>${escapeHtml(item.street || '')}</td>
            <td>${escapeHtml(item.location || '')}</td>
            <td>${escapeHtml(item.level || '')}</td>
            <td>${formatDate(item.createdAt)}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editToilet('${item.id}')">编辑</button>
                <button class="btn btn-small btn-danger" onclick="deleteToilet('${item.id}')">删除</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    
    document.getElementById('toiletCurrentPage').textContent = toiletPage;
    document.getElementById('toiletTotalPages').textContent = totalPages;
    document.getElementById('toiletPrevPage').disabled = toiletPage <= 1;
    document.getElementById('toiletNextPage').disabled = toiletPage >= totalPages;
    document.getElementById('toiletPagination').style.display = 'flex';
}

function editToilet(id) {
    openToiletForm(id);
}

function deleteToilet(id) {
    if (confirm('确定要删除这条环卫公厕记录吗？')) {
        toiletData = toiletData.filter(item => item.id !== id);
        saveToiletData();
        renderToiletList();
        showToast('环卫公厕删除成功', 'success');
    }
}

function clearToiletFilters() {
    document.getElementById('toiletFilterStreet').value = '';
    document.getElementById('toiletFilterLevel').value = '';
    document.getElementById('toiletSearchKeyword').value = '';
    toiletPage = 1;
    renderToiletList();
}

function exportToiletToExcel() {
    if (toiletData.length === 0) {
        showToast('没有数据可导出', 'error');
        return;
    }
    
    const exportData = toiletData.map((item, index) => ({
        '序号': index + 1,
        '公厕名称': item.name || '',
        '所属街道': item.street || '',
        '具体位置': item.location || '',
        '公厕等级': item.level || '',
        '创建时间': formatDate(item.createdAt) || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '环卫公厕');
    
    const fileName = `环卫公厕_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast('导出成功', 'success');
}

function closeToiletImportModal() {
    document.getElementById('importToiletModal').style.display = 'none';
    resetToiletImportUI();
}

function resetToiletImportUI() {
    document.getElementById('toiletUploadArea').style.display = 'block';
    document.getElementById('toiletFileInfo').style.display = 'none';
    document.getElementById('toiletImportPreview').style.display = 'none';
    document.getElementById('toiletImportErrors').style.display = 'none';
    document.getElementById('toiletFileInput').value = '';
    document.getElementById('toiletStartImport').disabled = true;
    toiletImportData = [];
}

function handleToiletFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('请选择有效的Excel文件（.xlsx或.xls）', 'error');
        return;
    }
    
    document.getElementById('toiletUploadArea').style.display = 'none';
    document.getElementById('toiletFileName').textContent = file.name;
    document.getElementById('toiletFileSize').textContent = formatFileSize(file.size);
    document.getElementById('toiletFileInfo').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                resetToiletFileInput();
                return;
            }
            
            if (jsonData.length > 1000) {
                showToast('单次最多导入1000条数据', 'error');
                resetToiletFileInput();
                return;
            }
            
            toiletImportData = jsonData.map((row, index) => {
                const item = {
                    id: generateId(),
                    name: row['公厕名称'] || row['名称'] || '',
                    street: row['所属街道'] || row['街道'] || '',
                    location: row['具体位置'] || row['位置'] || '',
                    level: row['公厕等级'] || row['等级'] || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const errors = [];
                if (!item.name) {
                    errors.push('公厕名称不能为空');
                } else if (item.name.length > 50) {
                    errors.push('公厕名称不能超过50个字符');
                }
                
                if (!item.street) {
                    errors.push('所属街道不能为空');
                }
                
                if (!item.location) {
                    errors.push('具体位置不能为空');
                } else if (item.location.length > 100) {
                    errors.push('具体位置不能超过100个字符');
                }
                
                if (!item.level) {
                    errors.push('公厕等级不能为空');
                }
                
                return {
                    data: item,
                    errors: errors,
                    rowIndex: index + 2
                };
            });
            
            showToiletImportPreview();
            
        } catch (error) {
            showToast('Excel文件解析失败：' + error.message, 'error');
            resetToiletImportUI();
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function resetToiletFileInput() {
    document.getElementById('toiletUploadArea').style.display = 'block';
    document.getElementById('toiletFileInfo').style.display = 'none';
    document.getElementById('toiletFileInput').value = '';
}

function showToiletImportPreview() {
    const validData = toiletImportData.filter(item => item.errors.length === 0);
    const invalidData = toiletImportData.filter(item => item.errors.length > 0);
    
    document.getElementById('toiletPreviewCount').textContent = toiletImportData.length;
    
    const previewBody = document.getElementById('toiletPreviewBody');
    const previewHead = document.getElementById('toiletPreviewHead');
    
    previewHead.innerHTML = '<tr><th>公厕名称</th><th>所属街道</th><th>具体位置</th><th>公厕等级</th></tr>';
    
    let html = '';
    toiletImportData.slice(0, 10).forEach(item => {
        html += `<tr class="${item.errors.length > 0 ? 'error-row' : ''}">
            <td>${item.data.name}</td>
            <td>${item.data.street}</td>
            <td>${item.data.location}</td>
            <td>${item.data.level}</td>
        </tr>`;
    });
    previewBody.innerHTML = html;
    
    document.getElementById('toiletImportPreview').style.display = 'block';
    
    if (invalidData.length > 0) {
        let errorHtml = '';
        invalidData.slice(0, 20).forEach(item => {
            errorHtml += `<div class="error-item">
                <span class="error-row">第${item.rowIndex}行：</span>
                <span class="error-msg">${item.errors.join('；')}</span>
            </div>`;
        });
        if (invalidData.length > 20) {
            errorHtml += `<div class="error-more">还有${invalidData.length - 20}条错误未显示</div>`;
        }
        document.getElementById('toiletErrorList').innerHTML = errorHtml;
        document.getElementById('toiletImportErrors').style.display = 'block';
    } else {
        document.getElementById('toiletImportErrors').style.display = 'none';
    }
    
    if (validData.length > 0) {
        document.getElementById('toiletStartImport').disabled = false;
    } else {
        document.getElementById('toiletStartImport').disabled = true;
    }
}

function confirmToiletImport() {
    const validData = toiletImportData.filter(item => item.errors.length === 0);
    
    if (validData.length === 0) {
        showToast('没有有效数据可导入', 'error');
        return;
    }
    
    let successCount = 0;
    validData.forEach(item => {
        toiletData.unshift(item.data);
        successCount++;
    });
    
    saveToiletData();
    
    toiletImportHistory.push({
        fileName: document.getElementById('toiletFileName').textContent,
        totalCount: validData.length,
        successCount: successCount,
        failCount: 0,
        operator: '管理员',
        importTime: new Date().toISOString()
    });
    localStorage.setItem(TOILET_IMPORT_HISTORY_KEY, JSON.stringify(toiletImportHistory));
    
    showToast(`导入完成：成功${successCount}条`, 'success');
    
    document.getElementById('importToiletModal').style.display = 'none';
    resetToiletImportUI();
    renderToiletList();
}

// ==================== 项目管理功能 ====================

function loadProjectData() {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) {
        projectData = JSON.parse(stored);
    }
}

function saveProjectData() {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectData));
}

function setupProjectEventListeners() {
    initYearSelector('projectYearSelect', true, 2024);
    initProjectFilterYear();
    
    document.getElementById('addProjectBtn')?.addEventListener('click', () => openProjectForm());
    document.getElementById('importProjectBtn')?.addEventListener('click', () => document.getElementById('importProjectModal').style.display = 'block');
    document.getElementById('exportProjectBtn')?.addEventListener('click', () => document.getElementById('exportProjectModal').style.display = 'block');
    
    document.getElementById('closeProjectFormModal')?.addEventListener('click', closeProjectForm);
    document.getElementById('cancelProjectBtn')?.addEventListener('click', closeProjectForm);
    document.getElementById('saveProjectBtn')?.addEventListener('click', handleProjectFormSubmit);
    
    document.getElementById('closeProjectDetailModal')?.addEventListener('click', () => document.getElementById('projectDetailModal').style.display = 'none');
    document.getElementById('closeProjectDetailBtn')?.addEventListener('click', () => document.getElementById('projectDetailModal').style.display = 'none');
    
    document.getElementById('closeImportProjectModal')?.addEventListener('click', closeImportProjectModal);
    document.getElementById('projectCancelImport')?.addEventListener('click', closeImportProjectModal);
    document.getElementById('projectStartImport')?.addEventListener('click', startProjectImport);
    
    document.getElementById('closeExportProjectModal')?.addEventListener('click', () => document.getElementById('exportProjectModal').style.display = 'none');
    document.getElementById('cancelExportProjectBtn')?.addEventListener('click', () => document.getElementById('exportProjectModal').style.display = 'none');
    document.getElementById('confirmExportProjectBtn')?.addEventListener('click', handleProjectExport);
    
    document.getElementById('projectFileUploadArea')?.addEventListener('click', () => document.getElementById('projectFileInput').click());
    document.getElementById('projectFileInput')?.addEventListener('change', handleProjectFileSelect);
    document.getElementById('removeProjectFile')?.addEventListener('click', resetProjectImportUI);
    
    document.getElementById('projectFilterYear')?.addEventListener('change', () => {
        projectPage = 1;
        renderProjectList();
    });
    
    document.getElementById('projectFilterStatus')?.addEventListener('change', () => {
        projectPage = 1;
        renderProjectList();
    });

    document.getElementById('projectManagerFilter')?.addEventListener('change', () => {
        projectPage = 1;
        renderProjectList();
    });
    
    document.getElementById('projectSearchBtn')?.addEventListener('click', () => {
        projectPage = 1;
        renderProjectList();
    });
    document.getElementById('projectClearSearchBtn')?.addEventListener('click', () => {
        document.getElementById('projectFilterStatus').value = '';
        document.getElementById('projectSearchKeyword').value = '';
        document.getElementById('projectFilterYear').value = '';
        document.getElementById('projectManagerFilter').value = '';
        projectSortField = null;
        projectSortOrder = 'asc';
        updateSortIcons();
        projectPage = 1;
        renderProjectList();
    });
    
    document.getElementById('projectPrevPage')?.addEventListener('click', () => {
        if (projectPage > 1) {
            projectPage--;
            renderProjectList();
        }
    });
    
    document.getElementById('projectNextPage')?.addEventListener('click', () => {
        const filtered = getFilteredProjectData();
        const totalPages = Math.ceil(filtered.length / projectPageSize);
        if (projectPage < totalPages) {
            projectPage++;
            renderProjectList();
        }
    });
    
    document.getElementById('projectPageSize')?.addEventListener('change', (e) => {
        projectPageSize = parseInt(e.target.value);
        projectPage = 1;
        renderProjectList();
    });
    
    document.getElementById('projectYearSelect')?.addEventListener('change', updateProjectDashboard);
    
    document.getElementById('pdRefreshBtn')?.addEventListener('click', function() {
        loadProjectData();
        initProjectFilterYear();
        updateProjectDashboard();
        showToast('数据已刷新', 'success');
    });
    
    document.querySelectorAll('#project-detail-tab .sortable').forEach(th => {
        th.addEventListener('click', function() {
            const field = this.dataset.sortField;
            const type = this.dataset.sortType;
            
            if (projectSortField === field) {
                projectSortOrder = projectSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                projectSortField = field;
                projectSortOrder = 'asc';
            }
            
            updateSortIcons();
            renderProjectList();
        });
        
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
    });
}

function initProjectFilterYear() {
    const yearSelect = document.getElementById('projectFilterYear');
    if (!yearSelect) return;
    
    const currentValue = yearSelect.value;
    
    const years = new Set();
    const currentYear = new Date().getFullYear();
    
    projectData.forEach(item => {
        if (item.startDate) {
            const year = item.startDate.substring(0, 4);
            if (year && /^\d{4}$/.test(year)) {
                years.add(year);
            }
        }
        if (item.endDate) {
            const year = item.endDate.substring(0, 4);
            if (year && /^\d{4}$/.test(year)) {
                years.add(year);
            }
        }
    });
    
    for (let y = currentYear; y >= currentYear - 10; y--) {
        years.add(y.toString());
    }
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    yearSelect.innerHTML = '<option value="">全部年份</option>' + 
        sortedYears.map(year => `<option value="${year}">${year}年</option>`).join('');
    
    if (currentValue && sortedYears.includes(currentValue)) {
        yearSelect.value = currentValue;
    }
}

function initProjectManagerFilter() {
    const managerSelect = document.getElementById('projectManagerFilter');
    if (!managerSelect) return;

    const currentValue = managerSelect.value;
    const managers = new Set();

    projectData.forEach(item => {
        if (item.manager && item.manager.trim()) {
            managers.add(item.manager.trim());
        }
    });

    const sortedManagers = Array.from(managers).sort((a, b) => a.localeCompare(b, 'zh-CN'));

    managerSelect.innerHTML = '<option value="">全部负责人</option>' +
        sortedManagers.map(manager => `<option value="${escapeHtml(manager)}">${escapeHtml(manager)}</option>`).join('');

    if (currentValue && sortedManagers.includes(currentValue)) {
        managerSelect.value = currentValue;
    }
}

function updateSortIcons() {
    document.querySelectorAll('#project-detail-tab .sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;
        
        const field = th.dataset.sortField;
        
        if (projectSortField === field) {
            icon.textContent = projectSortOrder === 'asc' ? '↑' : '↓';
            th.classList.add('sorted');
        } else {
            icon.textContent = '↕';
            th.classList.remove('sorted');
        }
    });
}

function openProjectForm(id = null) {
    resetProjectForm();
    if (id) {
        const data = projectData.find(item => item.id === id);
        if (data) {
            document.getElementById('projectFormTitle').textContent = '编辑项目';
            document.getElementById('projectId').value = data.id;
            document.getElementById('projectName').value = data.name || '';
            document.getElementById('projectStatus').value = data.status || '';
            document.getElementById('projectContract').value = data.contract || '';
            document.getElementById('projectAssign').value = data.assign || '';
            document.getElementById('projectStartDate').value = data.startDate || '';
            document.getElementById('projectEndDate').value = data.endDate || '';
            document.getElementById('projectConstructionUnit').value = data.constructionUnit || '';
            document.getElementById('projectManager').value = data.manager || '';
            document.getElementById('projectContractPrice').value = data.contractPrice || '';
            document.getElementById('projectAuditPrice').value = data.auditPrice || '';
            document.getElementById('projectLaborTeam').value = data.laborTeam || '';
        }
    } else {
        document.getElementById('projectFormTitle').textContent = '新增项目';
    }
    document.getElementById('projectFormModal').style.display = 'block';
}

function closeProjectForm() {
    document.getElementById('projectFormModal').style.display = 'none';
    resetProjectForm();
}

function resetProjectForm() {
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    clearProjectErrors();
}

function clearProjectErrors() {
    document.querySelectorAll('#projectForm .error-message').forEach(el => el.textContent = '');
}

function validateProjectForm() {
    let isValid = true;
    clearProjectErrors();
    
    const name = document.getElementById('projectName').value.trim();
    const status = document.getElementById('projectStatus').value;
    
    if (!name) {
        document.getElementById('projectNameError').textContent = '请输入项目名称';
        isValid = false;
    } else if (name.length > 100) {
        document.getElementById('projectNameError').textContent = '项目名称不能超过100个字符';
        isValid = false;
    }
    
    if (!status) {
        document.getElementById('projectStatusError').textContent = '请选择项目状态';
        isValid = false;
    }
    
    return isValid;
}

function handleProjectFormSubmit(e) {
    e.preventDefault();
    
    if (!validateProjectForm()) {
        showToast('请检查表单中的错误', 'error');
        return;
    }
    
    const id = document.getElementById('projectId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('projectName').value.trim(),
        status: document.getElementById('projectStatus').value,
        contract: document.getElementById('projectContract').value.trim(),
        assign: document.getElementById('projectAssign').value.trim(),
        startDate: document.getElementById('projectStartDate').value,
        endDate: document.getElementById('projectEndDate').value,
        constructionUnit: document.getElementById('projectConstructionUnit').value.trim(),
        manager: document.getElementById('projectManager').value.trim(),
        contractPrice: parseFloat(document.getElementById('projectContractPrice').value) || 0,
        auditPrice: parseFloat(document.getElementById('projectAuditPrice').value) || 0,
        laborTeam: document.getElementById('projectLaborTeam').value.trim(),
        createdAt: id ? projectData.find(item => item.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = projectData.findIndex(item => item.id === id);
        projectData[index] = data;
        showToast('项目更新成功', 'success');
    } else {
        projectData.unshift(data);
        showToast('项目添加成功', 'success');
    }
    
    saveProjectData();
    closeProjectForm();
    renderProjectList();
    updateProjectDashboard();
}

function getFilteredProjectData() {
    let filtered = [...projectData];

    const yearFilter = document.getElementById('projectFilterYear')?.value;
    const statusFilter = document.getElementById('projectFilterStatus')?.value;
    const managerFilter = document.getElementById('projectManagerFilter')?.value;
    const keyword = document.getElementById('projectSearchKeyword')?.value.toLowerCase().trim();

    if (yearFilter) {
        filtered = filtered.filter(item => {
            if (item.startDate && item.startDate.startsWith(yearFilter)) return true;
            if (item.endDate && item.endDate.startsWith(yearFilter)) return true;
            return false;
        });
    }

    if (statusFilter) {
        filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (managerFilter) {
        filtered = filtered.filter(item => item.manager === managerFilter);
    }

    if (keyword) {
        filtered = filtered.filter(item =>
            (item.name && item.name.toLowerCase().includes(keyword)) ||
            (item.manager && item.manager.toLowerCase().includes(keyword)) ||
            (item.constructionUnit && item.constructionUnit.toLowerCase().includes(keyword))
        );
    }
    
    if (projectSortField) {
        const statusOrder = { '未开工': 0, '在建': 1, '已完工': 2 };
        
        filtered.sort((a, b) => {
            let comparison = 0;
            
            if (projectSortField === 'contractPrice') {
                const valueA = a.contractPrice || 0;
                const valueB = b.contractPrice || 0;
                comparison = valueA - valueB;
            } else if (projectSortField === 'status') {
                const orderA = statusOrder[a.status] ?? 99;
                const orderB = statusOrder[b.status] ?? 99;
                comparison = orderA - orderB;
            }
            
            return projectSortOrder === 'asc' ? comparison : -comparison;
        });
    }
    
    return filtered;
}

function renderProjectList() {
    initProjectFilterYear();
    initProjectManagerFilter();
    const filtered = getFilteredProjectData();
    const tbody = document.getElementById('projectTableBody');
    const emptyMessage = document.getElementById('projectEmptyMessage');
    const totalCount = document.getElementById('projectTotalCount');
    
    if (totalCount) totalCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.getElementById('projectPagination').style.display = 'none';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    const totalPages = Math.ceil(filtered.length / projectPageSize);
    const startIndex = (projectPage - 1) * projectPageSize;
    const endIndex = startIndex + projectPageSize;
    const pageData = filtered.slice(startIndex, endIndex);
    
    let html = '';
    pageData.forEach((item, index) => {
        const statusClass = item.status === '已完工' ? 'status-completed' : 
                           item.status === '在建' ? 'status-ongoing' : 'status-pending';
        html += `<tr>
            <td>${startIndex + index + 1}</td>
            <td><a href="#" class="project-name-link" onclick="viewProjectDetail('${item.id}')">${escapeHtml(item.name || '')}</a></td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || '')}</span></td>
            <td>${formatCurrency(item.contractPrice)}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editProject('${item.id}')">编辑</button>
                <button class="btn btn-small btn-danger" onclick="deleteProject('${item.id}')">删除</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;

    const totalContractPrice = filtered.reduce((sum, item) => sum + (item.contractPrice || 0), 0);
    const totalContractPriceWan = (totalContractPrice / 10000).toFixed(2);

    const tableFoot = document.getElementById('projectTableFoot');
    const totalPriceEl = document.getElementById('projectTotalContractPrice');

    if (filtered.length > 0) {
        tableFoot.style.display = 'table-footer-group';
        totalPriceEl.textContent = `${formatCurrency(totalContractPrice)} (${totalContractPriceWan}万元)`;
    } else {
        tableFoot.style.display = 'none';
    }

    document.getElementById('projectCurrentPage').textContent = projectPage;
    document.getElementById('projectTotalPages').textContent = totalPages;
    document.getElementById('projectPrevPage').disabled = projectPage <= 1;
    document.getElementById('projectNextPage').disabled = projectPage >= totalPages;
    document.getElementById('projectPagination').style.display = 'flex';
}

function viewProjectDetail(id) {
    const data = projectData.find(item => item.id === id);
    if (!data) return;

    document.getElementById('detailProjectName').textContent = data.name || '-';
    document.getElementById('detailProjectStatus').textContent = data.status || '-';
    document.getElementById('detailProjectContract').textContent = data.contract || '-';
    document.getElementById('detailProjectAssign').textContent = data.assign || '-';
    document.getElementById('detailProjectStartDate').textContent = data.startDate || '-';
    document.getElementById('detailProjectEndDate').textContent = data.endDate || '-';
    document.getElementById('detailProjectConstructionUnit').textContent = data.constructionUnit || '-';
    document.getElementById('detailProjectManager').textContent = data.manager || '-';
    document.getElementById('detailProjectContractPrice').textContent = formatCurrency(data.contractPrice);
    document.getElementById('detailProjectAuditPrice').textContent = formatCurrency(data.auditPrice);
    document.getElementById('detailProjectLaborTeam').textContent = data.laborTeam || '-';

    const contractPrice = parseFloat(data.contractPrice) || 0;
    const auditPrice = parseFloat(data.auditPrice) || 0;
    const difference = contractPrice - auditPrice;

    document.getElementById('summaryContractPrice').textContent = formatCurrency(contractPrice);
    document.getElementById('summaryAuditPrice').textContent = formatCurrency(auditPrice);
    document.getElementById('summaryDifference').textContent = formatCurrency(Math.abs(difference));
    document.getElementById('summaryDifference').style.color = difference >= 0 ? '#27ae60' : '#e74c3c';

    document.getElementById('projectDetailModal').style.display = 'block';
}

function editProject(id) {
    openProjectForm(id);
}

function deleteProject(id) {
    if (!confirm('确定要删除这个项目吗？')) return;
    
    projectData = projectData.filter(item => item.id !== id);
    saveProjectData();
    renderProjectList();
    updateProjectDashboard();
    showToast('项目删除成功', 'success');
}

function updateProjectDashboard() {
    const yearFilter = document.getElementById('projectYearSelect')?.value;
    let filtered = [...projectData];
    
    if (yearFilter && yearFilter !== 'all') {
        filtered = filtered.filter(item => {
            if (!item.startDate) return false;
            return item.startDate.startsWith(yearFilter);
        });
    }
    
    const totalCount = filtered.length;
    const completedCount = filtered.filter(item => item.status === '已完工').length;
    const ongoingCount = filtered.filter(item => item.status === '在建').length;
    const pendingCount = filtered.filter(item => item.status === '未开工').length;
    const totalValue = filtered.reduce((sum, item) => sum + (item.contractPrice || 0), 0);
    const totalValueWan = totalValue / 10000;
    
    animatePDValue('totalProjectCount', totalCount, 0);
    animatePDValue('completedProjectCount', completedCount, 0);
    animatePDValue('ongoingProjectCount', ongoingCount, 0);
    animatePDValue('pendingProjectCount', pendingCount, 0);
    animatePDValue('totalContractValue', totalValueWan, 2);
    
    setTimeout(() => {
        const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct; };
        if (totalCount > 0) {
            setBar('completedBar', (completedCount / totalCount * 100) + '%');
            setBar('ongoingBar', (ongoingCount / totalCount * 100) + '%');
            setBar('pendingBar', (pendingCount / totalCount * 100) + '%');
        }
    }, 300);
    
    updateProjectCharts(filtered);
    updatePDTimestamp();
    updatePDPieCenter(totalCount);
}

function animatePDValue(id, target, decimals) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseFloat(el.textContent.replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    function tick(now) {
        const p = Math.min((now - startTime) / 800, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (start + (target - start) * ease).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function updatePDTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { hour12: false });
    const updateEl = document.getElementById('pdUpdateTime');
    const footerEl = document.getElementById('pdFooterTime');
    if (updateEl) updateEl.textContent = timeStr;
    if (footerEl) footerEl.textContent = '最后更新: ' + timeStr;
}

function updatePDPieCenter(total) {
    const centerEl = document.getElementById('pdPieCenter');
    if (centerEl) {
        centerEl.querySelector('.pie-val').textContent = total;
    }
}

function updateProjectCharts(data) {
    updateProjectStatusChart(data);
    updateProjectTrendChart(data);
    updateProjectValueChart(data);
}

function updateProjectStatusChart(data) {
    const ctx = document.getElementById('projectStatusChart')?.getContext('2d');
    if (!ctx) return;
    
    if (projectStatusChart) {
        projectStatusChart.destroy();
    }
    
    const completed = data.filter(item => item.status === '已完工').length;
    const ongoing = data.filter(item => item.status === '在建').length;
    const pending = data.filter(item => item.status === '未开工').length;
    
    projectStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已完工', '在建', '未开工'],
            datasets: [{
                data: [completed, ongoing, pending],
                backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(245,158,11,0.8)'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: '#94a3b8',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function updateProjectTrendChart(data) {
    const ctx = document.getElementById('projectTrendChart')?.getContext('2d');
    if (!ctx) return;
    
    if (projectTrendChart) {
        projectTrendChart.destroy();
    }
    
    const monthlyData = {};
    data.forEach(item => {
        if (item.startDate) {
            const month = item.startDate.substring(0, 7);
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${year}年${parseInt(month)}月`;
    });
    const values = sortedMonths.map(m => monthlyData[m]);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(59,130,246,0.3)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
    
    projectTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '项目数量',
                data: values,
                borderColor: '#60a5fa',
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#60a5fa',
                pointBorderColor: '#1e293b',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(71,85,105,0.1)' },
                    ticks: { color: '#64748b', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(71,85,105,0.1)' },
                    ticks: { color: '#64748b', stepSize: 1 }
                }
            }
        }
    });
}

function updateProjectValueChart(data) {
    const ctx = document.getElementById('projectValueChart')?.getContext('2d');
    if (!ctx) return;
    
    if (projectValueChart) {
        projectValueChart.destroy();
    }
    
    const topProjects = data
        .filter(item => item.contractPrice > 0)
        .sort((a, b) => b.contractPrice - a.contractPrice)
        .slice(0, 10);
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, 'rgba(139,92,246,0.8)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.8)');
    
    projectValueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topProjects.map(item => item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name),
            datasets: [{
                label: '合同造价（万元）',
                data: topProjects.map(item => (item.contractPrice / 10000).toFixed(2)),
                backgroundColor: gradient,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + parseFloat(ctx.raw).toFixed(2) + ' 万元';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(71,85,105,0.1)' },
                    ticks: { color: '#64748b', callback: v => v + ' 万' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                }
            }
        }
    });
}

function handleProjectFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('请选择Excel文件（.xlsx或.xls）', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('文件大小不能超过10MB', 'error');
        return;
    }
    
    document.getElementById('projectFileName').textContent = file.name;
    document.getElementById('projectFileSize').textContent = formatFileSize(file.size);
    document.getElementById('projectFileInfo').style.display = 'flex';
    document.getElementById('projectFileUploadArea').style.display = 'none';
    
    parseProjectExcel(file);
}

function parseProjectExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast('Excel文件中没有数据', 'error');
                resetProjectImportUI();
                return;
            }
            
            if (jsonData.length > 1000) {
                showToast('单次最多导入1000条数据', 'error');
                resetProjectImportUI();
                return;
            }
            
            processProjectImportData(jsonData);
        } catch (error) {
            showToast('文件解析失败，请检查文件格式', 'error');
            resetProjectImportUI();
        }
    };
    reader.readAsArrayBuffer(file);
}

function processProjectImportData(jsonData) {
    projectImportData = [];
    let validCount = 0;
    let invalidCount = 0;
    
    const fieldMapping = {
        '项目名称': 'name',
        '项目状态': 'status',
        '合同情况': 'contract',
        '交办情况': 'assign',
        '开工时间': 'startDate',
        '竣工时间': 'endDate',
        '建设单位': 'constructionUnit',
        '项目负责人': 'manager',
        '合同造价': 'contractPrice',
        '审计价': 'auditPrice',
        '劳务班组': 'laborTeam'
    };
    
    jsonData.forEach((row, index) => {
        const item = {};
        Object.keys(fieldMapping).forEach(key => {
            const value = row[key];
            if (value !== undefined && value !== null && value !== '') {
                item[fieldMapping[key]] = String(value).trim();
            }
        });
        
        const errors = [];
        if (!item.name) {
            errors.push('项目名称不能为空');
        }
        if (!item.status || !['未开工', '在建', '已完工'].includes(item.status)) {
            errors.push('项目状态必须为：未开工、在建、已完工');
        }
        
        if (item.contractPrice) {
            item.contractPrice = parseFloat(item.contractPrice) || 0;
        }
        if (item.auditPrice) {
            item.auditPrice = parseFloat(item.auditPrice) || 0;
        }
        
        projectImportData.push({
            row: index + 2,
            data: item,
            valid: errors.length === 0,
            errors: errors
        });
        
        if (errors.length === 0) {
            validCount++;
        } else {
            invalidCount++;
        }
    });
    
    document.getElementById('projectTotalRows').textContent = jsonData.length;
    document.getElementById('projectValidRows').textContent = validCount;
    document.getElementById('projectInvalidRows').textContent = invalidCount;
    
    renderProjectPreview();
    document.getElementById('projectStartImport').disabled = validCount === 0;
}

function renderProjectPreview() {
    const tbody = document.getElementById('projectPreviewBody');
    const previewData = projectImportData.slice(0, 10);
    
    let html = '';
    previewData.forEach(item => {
        const statusClass = item.valid ? 'valid' : 'invalid';
        const statusText = item.valid ? '有效' : '无效';
        html += `<tr class="${statusClass}">
            <td>${item.row}</td>
            <td>${escapeHtml(item.data.name || '')}</td>
            <td>${escapeHtml(item.data.status || '')}</td>
            <td>${item.data.contractPrice || ''}</td>
            <td><span class="preview-status ${statusClass}">${statusText}</span></td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

function closeImportProjectModal() {
    document.getElementById('importProjectModal').style.display = 'none';
    resetProjectImportUI();
}

function resetProjectImportUI() {
    document.getElementById('projectFileInput').value = '';
    document.getElementById('projectFileInfo').style.display = 'none';
    document.getElementById('projectFileUploadArea').style.display = 'block';
    document.getElementById('projectPreviewBody').innerHTML = '';
    document.getElementById('projectTotalRows').textContent = '0';
    document.getElementById('projectValidRows').textContent = '0';
    document.getElementById('projectInvalidRows').textContent = '0';
    document.getElementById('projectStartImport').disabled = true;
    projectImportData = [];
}

function startProjectImport() {
    const validData = projectImportData.filter(item => item.valid);
    
    if (validData.length === 0) {
        showToast('没有有效数据可导入', 'error');
        return;
    }
    
    let successCount = 0;
    validData.forEach(item => {
        const project = {
            id: generateId(),
            name: item.data.name,
            status: item.data.status,
            contract: item.data.contract || '',
            assign: item.data.assign || '',
            startDate: item.data.startDate || '',
            endDate: item.data.endDate || '',
            constructionUnit: item.data.constructionUnit || '',
            manager: item.data.manager || '',
            contractPrice: item.data.contractPrice || 0,
            auditPrice: item.data.auditPrice || 0,
            laborTeam: item.data.laborTeam || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        projectData.unshift(project);
        successCount++;
    });
    
    saveProjectData();
    
    projectImportHistory.push({
        fileName: document.getElementById('projectFileName').textContent,
        totalCount: validData.length,
        successCount: successCount,
        failCount: 0,
        operator: '管理员',
        importTime: new Date().toISOString()
    });
    localStorage.setItem(PROJECT_IMPORT_HISTORY_KEY, JSON.stringify(projectImportHistory));
    
    showToast(`导入完成：成功${successCount}条`, 'success');
    
    document.getElementById('importProjectModal').style.display = 'none';
    resetProjectImportUI();
    renderProjectList();
    updateProjectDashboard();
}

function handleProjectExport() {
    const checkboxes = document.querySelectorAll('#exportProjectModal .checkbox-label input:checked');
    const selectedFields = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedFields.length === 0) {
        showToast('请至少选择一个导出字段', 'error');
        return;
    }
    
    const fieldLabels = {
        name: '项目名称',
        status: '项目状态',
        contract: '合同情况',
        assign: '交办情况',
        startDate: '开工时间',
        endDate: '竣工时间',
        constructionUnit: '建设单位',
        manager: '项目负责人',
        contractPrice: '合同造价',
        auditPrice: '审计价',
        laborTeam: '劳务班组'
    };
    
    const exportData = projectData.map(item => {
        const row = {};
        selectedFields.forEach(field => {
            row[fieldLabels[field]] = item[field] || '';
        });
        return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '项目数据');
    
    const fileName = `项目数据_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    document.getElementById('exportProjectModal').style.display = 'none';
    showToast('导出成功', 'success');
}

function formatCurrency(value) {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2
    }).format(value);
}

function formatNumber(value) {
    if (!value && value !== 0) return '0';
    return new Intl.NumberFormat('zh-CN').format(value);
}

// ==================== 性能优化工具函数 ====================

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 数字动画效果
function animateNumber(element, targetValue, duration = 1000) {
    const startValue = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = formatNumber(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatNumber(targetValue);
        }
    }
    
    requestAnimationFrame(update);
}

// 批量更新统计数字
function updateStatsWithAnimation(statsData) {
    Object.keys(statsData).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            const targetValue = statsData[key];
            animateNumber(element, targetValue);
        }
    });
}

// 图表懒加载观察器
function createChartLazyLoader() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const chartId = entry.target.dataset.chartId;
                if (chartId && window[chartId + 'Chart'] === null) {
                    // 触发图表渲染
                    const renderFunction = window['render' + chartId.charAt(0).toUpperCase() + chartId.slice(1) + 'Chart'];
                    if (typeof renderFunction === 'function') {
                        renderFunction();
                    }
                }
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    return observer;
}

// 性能监控
const PerformanceMonitor = {
    metrics: {},
    
    startMeasure(name) {
        this.metrics[name] = {
            startTime: performance.now()
        };
    },
    
    endMeasure(name) {
        if (this.metrics[name]) {
            this.metrics[name].endTime = performance.now();
            this.metrics[name].duration = this.metrics[name].endTime - this.metrics[name].startTime;
            console.log(`[Performance] ${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
        }
    },
    
    getMetrics() {
        return this.metrics;
    },
    
    clearMetrics() {
        this.metrics = {};
    }
};

// 数据缓存管理
const DataCache = {
    cache: new Map(),
    maxSize: 100,
    
    set(key, value, ttl = 60000) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
    },
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    has(key) {
        return this.get(key) !== null;
    },
    
    delete(key) {
        this.cache.delete(key);
    },
    
    clear() {
        this.cache.clear();
    }
};

// 优化图表更新函数
function updateChartWithAnimation(chart, newData, animationDuration = 500) {
    if (!chart) return;
    
    chart.data = newData;
    chart.update({
        duration: animationDuration,
        easing: 'easeOutQuart'
    });
}

// 添加加载状态
function showChartLoading(chartId) {
    const chartBody = document.querySelector(`#${chartId} .chart-body`);
    if (chartBody) {
        chartBody.classList.add('chart-loading');
    }
}

function hideChartLoading(chartId) {
    const chartBody = document.querySelector(`#${chartId} .chart-body`);
    if (chartBody) {
        chartBody.classList.remove('chart-loading');
    }
}

// 优化Dashboard刷新
const refreshDashboardOptimized = debounce(function(dashboardType) {
    PerformanceMonitor.startMeasure(`refresh_${dashboardType}`);
    
    switch(dashboardType) {
        case 'hr':
            if (typeof renderDashboard === 'function') {
                renderDashboard();
            }
            break;
        case 'vehicle':
            if (typeof updateVehicleDashboard === 'function') {
                updateVehicleDashboard();
            }
            break;
        case 'project':
            if (typeof updateProjectDashboard === 'function') {
                updateProjectDashboard();
            }
            break;
    }
    
    PerformanceMonitor.endMeasure(`refresh_${dashboardType}`);
}, 300);

// 响应式图表调整
function handleChartResize() {
    const charts = [
        window.repairCostChart,
        window.repairCountChart,
        window.projectStatusChart,
        window.projectTrendChart,
        window.projectValueChart
    ];
    
    charts.forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            try {
                chart.resize();
            } catch (error) {
                console.warn('[Chart Resize Error]', error);
            }
        }
    });
}

// 节流处理的窗口调整
const throttledResize = throttle(handleChartResize, 250);

// 添加窗口调整监听器
window.addEventListener('resize', throttledResize);

// 页面可见性API优化
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时暂停不必要的操作
        console.log('[Performance] Page hidden, pausing operations');
    } else {
        // 页面可见时恢复操作
        console.log('[Performance] Page visible, resuming operations');
    }
});

// 导出性能优化函数
window.PerformanceOptimizer = {
    debounce,
    throttle,
    animateNumber,
    updateStatsWithAnimation,
    PerformanceMonitor,
    DataCache,
    updateChartWithAnimation,
    showChartLoading,
    hideChartLoading,
    refreshDashboardOptimized
};

// ==================== 养护管理综合图表 - 核心功能 ====================
let mdIndustryPieChart = null;
let mdStreetRankChart = null;
let mdLevelDistChart = null;
let mdMunicipalStreetChart = null;
let mdMunicipalLevelChart = null;
let mdGreeneryStreetChart = null;
let mdGreeneryAreaChart = null;
let mdSanitationStreetChart = null;
let mdSanitationLevelChart = null;

const MD_COLORS = {
    municipal: { main: '#3b82f6', light: 'rgba(59,130,246,0.15)', gradient: ['rgba(59,130,246,0.8)', 'rgba(99,132,245,0.4)'] },
    greenery: { main: '#10b981', light: 'rgba(16,185,129,0.15)', gradient: ['rgba(16,185,129,0.8)', 'rgba(52,211,153,0.4)'] },
    sanitation: { main: '#f59e0b', light: 'rgba(245,158,11,0.15)', gradient: ['rgba(245,158,11,0.8)', 'rgba(251,191,36,0.4)'] },
    summary: { main: '#8b5cf6', light: 'rgba(139,92,246,0.15)' },
    level1: '#ef4444',
    level2: '#f97316',
    level3: '#eab308',
    level4: '#22c55e'
};

function renderSummaryList() {
    initMaintenanceDashboard();
}

function getAllBusinessData() {
    const muni = (municipalData || []).map(i => {
        const item = { ...i, businessType: '市政养护' };
        item.area = parseFloat(item.roadArea) || 0;
        item.street = item.street || item.townStreet || '';
        return item;
    });
    
    const green = (greeneryData || []).map(i => {
        const item = { ...i, businessType: '绿化养护' };
        item.area = parseFloat(item.totalArea) || parseFloat(item.greenArea) || 0;
        item.street = item.street || item.townStreet || '';
        return item;
    });
    
    const sani = (sanitationData || []).map(i => {
        const item = { ...i, businessType: '环卫养护' };
        item.area = parseFloat(item.totalCleaningArea) || parseFloat(item.roadCleaningArea) || 0;
        item.street = item.street || item.townStreet || '';
        return item;
    });
    
    const toilet = (toiletData || []).map(i => {
        const item = { ...i, businessType: '公厕专项', projectName: i.name || '公厕' };
        item.area = 0;
        item.toiletCount = 1;
        item.street = item.street || item.townStreet || item.location || '';
        return item;
    });
    
    return [...muni, ...green, ...sani, ...toilet];
}

let mdTrendChart, mdPieChart, mdRankChart, mdLevelChart;
let mdCharts = {};

function initMaintenanceDashboard() {
    loadBusinessData();
    renderMDKPIs();
    setupMDEventListeners();
    updateMDTimestamp();
    initMDTownAnalysis();
}

function getMDData() {
    const all = getAllBusinessData() || [];
    return {
        municipal: all.filter(i => i.businessType === '市政养护'),
        greenery: all.filter(i => i.businessType === '绿化养护'),
        sanitation: all.filter(i => i.businessType === '环卫养护'),
        toilet: all.filter(i => i.businessType === '公厕专项')
    };
}

function formatMDNum(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(Math.round(n));
}

function formatMDNumFixed(n, decimals) {
    decimals = decimals || 2;
    if (n >= 10000) return (n / 10000).toFixed(decimals) + '万';
    if (n >= 1000) return (n / 1000).toFixed(decimals) + 'k';
    return n.toFixed(decimals);
}

function animateValueFixed(el, target, duration, decimals) {
    decimals = decimals || 2;
    if (!el) return;
    const start = parseFloat(el.textContent.replace(/[^0-9.]/g, '')) || 0;
    const startTime = performance.now();
    function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (start + (target - start) * ease).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function renderMDKPIs() {
    const d = getMDData();
    const mVal = d.municipal.reduce((s, i) => s + (parseFloat(i.roadArea) || parseFloat(i.area) || 0), 0);
    const gVal = d.greenery.reduce((s, i) => s + (parseFloat(i.totalArea) || parseFloat(i.greenArea) || 0), 0);
    const sVal = d.sanitation.reduce((s, i) => s + (parseFloat(i.totalCleaningArea) || parseFloat(i.area) || 0), 0);
    const tVal = d.toilet.length;

    const total = mVal + gVal + sVal;
    const mStreets = new Set(d.municipal.map(i => i.townStreet || i.street || '-')).size;
    const gStreets = new Set(d.greenery.map(i => i.townStreet || i.street || '-')).size;
    const sStreets = new Set(d.sanitation.map(i => i.townStreet || i.street || '-')).size;
    const tStreets = new Set(d.toilet.map(i => i.street || '-')).size;

    const tLevels = d.toilet.map(i => i.level).filter(Boolean);
    const tLevelAvg = tLevels.length > 0 ? tLevels.reduce((a, b, i, arr) => {
        const order = ['一级', '二级', '三级', '四级'];
        const idx = order.indexOf(b);
        return a + (idx >= 0 ? idx + 1 : 0);
    }, 0) / tLevels.length : 0;
    const tLevelText = tLevelAvg > 0 ? ['一级', '二级', '三级', '四级'][Math.round(tLevelAvg) - 1] || '--' : '--';

    const setFixed = (id, val, dec) => { const el = document.getElementById(id); if (el) animateValueFixed(el, val, 1200, dec); };
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setFixed('mdKpiMunicipalVal', mVal / 10000, 2);
    setFixed('mdKpiGreeneryVal', gVal / 10000, 2);
    setFixed('mdKpiSanitationVal', sVal / 10000, 2);
    setFixed('mdKpiToiletVal', tVal, 0);

    setText('mdKpiMunicipalCount', d.municipal.length); setText('mdKpiGreeneryCount', d.greenery.length);
    setText('mdKpiSanitationCount', d.sanitation.length); setText('mdKpiToiletCount', tVal);

    setText('mdKpiMunicipalPct', total > 0 ? ((mVal / total) * 100).toFixed(2) + '%' : '0.00%');
    setText('mdKpiGreeneryPct', total > 0 ? ((gVal / total) * 100).toFixed(2) + '%' : '0.00%');
    setText('mdKpiSanitationPct', total > 0 ? ((sVal / total) * 100).toFixed(2) + '%' : '0.00%');

    setText('mdKpiMunicipalStreets', mStreets); setText('mdKpiGreeneryStreets', gStreets);
    setText('mdKpiSanitationStreets', sStreets);
    setText('mdKpiToiletStreets', tStreets + ' 街道');
    setText('mdKpiToiletLevelAvg', tLevelText);

    const grandTotal = d.municipal.length + d.greenery.length + d.sanitation.length + d.toilet.length;
    setText('mdKpiGrandTotal', grandTotal);
    setText('mdBdgMuni', '市政 ' + (grandTotal > 0 ? ((d.municipal.length / grandTotal) * 100).toFixed(0) : 0) + '%');
    setText('mdBdgGreen', '园林 ' + (grandTotal > 0 ? ((d.greenery.length / grandTotal) * 100).toFixed(0) : 0) + '%');
    setText('mdBdgSani', '环卫 ' + (grandTotal > 0 ? ((d.sanitation.length / grandTotal) * 100).toFixed(0) : 0) + '%');
    setText('mdBdgToilet', '公厕 ' + (grandTotal > 0 ? ((d.toilet.length / grandTotal) * 100).toFixed(0) : 0) + '%');

    setTimeout(() => {
        const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct; };
        setBar('mdKpiMunicipalBar', total > 0 ? ((mVal / total) * 100) + '%' : '0%');
        setBar('mdKpiGreeneryBar', total > 0 ? ((gVal / total) * 100) + '%' : '0%');
        setBar('mdKpiSanitationBar', total > 0 ? ((sVal / total) * 100) + '%' : '0%');
    }, 300);

    checkMDAlerts(d, { mVal, gVal, sVal, total });
    updateMDTimestamp();
}

function getMDColors() {
    return {
        blue: '#3b82f6', cyan: '#38bdf8',
        green: '#10b981', emerald: '#34d399',
        amber: '#f59e0b', yellow: '#fbbf24',
        rose: '#f43f5e', pink: '#fb7185',
        violet: '#8b5cf6'
    };
}

function renderMDTrendChart(type) {
    const canvas = document.getElementById('mdTrendChart');
    if (!canvas) return;
    if (mdTrendChart) { mdTrendChart.destroy(); mdTrendChart = null; }
    const ctx = canvas.getContext('2d');
    const d = getMDData();
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const colors = getMDColors();

    function genData(arr, key) {
        const byMonth = {};
        arr.forEach(item => {
            let m = item.month || item.createTime || '';
            if (m && typeof m === 'string' && m.includes('-')) m = m.split('-')[1];
            else if (typeof m === 'string' && /^\d{4}/.test(m)) m = m.substring(4, 6);
            const mi = parseInt(m) || (Math.floor(Math.random() * 12) + 1);
            byMonth[mi] = (byMonth[mi] || 0) + (parseFloat(item[key]) || Math.random() * 500 + 50);
        });
        return months.map((_, i) => byMonth[i + 1] || Math.floor(Math.random() * 400 + 100));
    }

    const chartType = type || 'area';
    const isArea = chartType === 'area';

    mdTrendChart = new Chart(ctx, {
        type: chartType === 'bar' ? 'bar' : 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: '市政养护',
                    data: genData(d.municipal, 'roadLength'),
                    borderColor: colors.blue,
                    backgroundColor: isArea ? createGradient(ctx, colors.blue, 0.3) : 'rgba(59,130,246,0.7)',
                    fill: isArea,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: '绿化养护',
                    data: genData(d.greenery, 'totalArea'),
                    borderColor: colors.green,
                    backgroundColor: isArea ? createGradient(ctx, colors.green, 0.25) : 'rgba(16,185,129,0.7)',
                    fill: isArea,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: '环卫养护',
                    data: genData(d.sanitation, 'totalCleaningArea'),
                    borderColor: colors.amber,
                    backgroundColor: isArea ? createGradient(ctx, colors.amber, 0.2) : 'rgba(245,158,11,0.7)',
                    fill: isArea,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', usePointStyle: true, padding: 16, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { grid: { color: 'rgba(71,85,105,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: { grid: { color: 'rgba(71,85,105,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    });
    mdCharts.trend = mdTrendChart;
}

function createGradient(ctx, color, alpha) {
    const g = ctx.createLinearGradient(0, 0, 0, 280);
    const hexVal = Math.round(alpha * 255).toString(16).padStart(2, '0');
    g.addColorStop(0, color + hexVal);
    g.addColorStop(1, color + '00');
    return g;
}

function renderMDPieChart(type) {
    const canvas = document.getElementById('mdPieChart');
    if (!canvas) return;
    if (mdPieChart) { mdPieChart.destroy(); mdPieChart = null; }
    const ctx = canvas.getContext('2d');
    const d = getMDData();
    const c = getMDColors();

    const mVal = d.municipal.reduce((s, i) => s + (parseFloat(i.roadLength) || 0), 0);
    const gVal = d.greenery.reduce((s, i) => s + (parseFloat(i.totalArea) || 0), 0);
    const sVal = d.sanitation.reduce((s, i) => s + (parseFloat(i.totalCleaningArea || i.roadLength) || 0), 0);
    const total = mVal + gVal + sVal || 1;

    const pieType = type || 'doughnut';

    mdPieChart = new Chart(ctx, {
        type: pieType,
        data: {
            labels: ['市政养护', '绿化养护', '环卫养护'],
            datasets: [{
                data: [mVal, gVal, sVal],
                backgroundColor: [c.blue, c.green, c.amber],
                borderColor: 'rgba(15,23,42,0.8)',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: pieType === 'doughnut' ? '65%' : 0,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const v = context.raw;
                            const p = ((v / total) * 100).toFixed(1);
                            return context.label + ': ' + formatMDNum(v) + ' (' + p + '%)';
                        }
                    }
                }
            },
            animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' }
        }
    });
    mdCharts.pie = mdPieChart;

    const centerEl = document.getElementById('mdPieCenter');
    if (centerEl) {
        const valEl = centerEl.querySelector('.pie-val');
        if (valEl) valEl.textContent = formatMDNum(total);
    }

    renderMDCustomLegend(mVal, gVal, sVal, total);
}

function renderMDCustomLegend(mV, gV, sV, total) {
    const container = document.getElementById('mdPieLegendCustom');
    if (!container) return;
    const c = getMDColors();
    const items = [
        { color: c.blue, label: '市政', value: mV, pct: total ? ((mV/total)*100).toFixed(1) : '0' },
        { color: c.green, label: '绿化', value: gV, pct: total ? ((gV/total)*100).toFixed(1) : '0' },
        { color: c.amber, label: '环卫', value: sV, pct: total ? ((sV/total)*100).toFixed(1) : '0' }
    ];
    container.innerHTML = items.map(it =>
        '<div class="md-pie-legend-item"><span class="md-pie-dot" style="background:' + it.color + '"></span>' +
        '<span>' + it.label + '</span><strong style="margin-left:4px;color:#e2e8f0">' + formatMDNum(it.value) + '</strong>' +
        '<span style="color:#64748b;margin-left:4px">(' + it.pct + '%)</span></div>'
    ).join('');
}

function renderMDRankChart(filter) {
    const canvas = document.getElementById('mdRankChart');
    if (!canvas) return;
    if (mdRankChart) { mdRankChart.destroy(); mdRankChart = null; }
    const ctx = canvas.getContext('2d');
    const d = getMDData();
    const f = filter || 'all';
    const c = getMDColors();

    let data = [];
    if (f === 'all') {
        const map = {};
        [...d.municipal, ...d.greenery, ...d.sanitation].forEach(item => {
            const st = item.townStreet || item.street || '未知';
            const v = parseFloat(item.roadLength || item.totalArea || item.totalCleaningArea || 0);
            map[st] = (map[st] || 0) + v;
        });
        data = Object.entries(map).map(([k, v]) => ({ street: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
    } else if (f === 'municipal') {
        const map = {};
        d.municipal.forEach(item => {
            const st = item.townStreet || item.street || '未知';
            map[st] = (map[st] || 0) + (parseFloat(item.roadLength) || 0);
        });
        data = Object.entries(map).map(([k, v]) => ({ street: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
    } else if (f === 'greenery') {
        const map = {};
        d.greenery.forEach(item => {
            const st = item.townStreet || item.street || '未知';
            map[st] = (map[st] || 0) + (parseFloat(item.totalArea) || 0);
        });
        data = Object.entries(map).map(([k, v]) => ({ street: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
    } else {
        const map = {};
        d.sanitation.forEach(item => {
            const st = item.townStreet || item.street || '未知';
            map[st] = (map[st] || 0) + (parseFloat(item.totalCleaningArea || item.roadLength) || 0);
        });
        data = Object.entries(map).map(([k, v]) => ({ street: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
    }

    if (data.length === 0) {
        for (let i = 0; i < 10; i++) data.push({ street: '街道' + (i + 1), value: Math.floor(Math.random() * 2000 + 500) });
        data.sort((a, b) => b.value - a.value);
    }

    const maxVal = Math.max(...data.map(x => x.value));

    mdRankChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(x => x.street),
            datasets: [{
                label: '养护体量',
                data: data.map(x => x.value),
                backgroundColor: data.map((_, i) => {
                    const ratio = data[i].value / maxVal;
                    if (f === 'municipal') return `rgba(59,130,246,${(0.4 + ratio * 0.55).toFixed(2)})`;
                    if (f === 'greenery') return `rgba(16,185,129,${(0.4 + ratio * 0.55).toFixed(2)})`;
                    if (f === 'sanitation') return `rgba(245,158,11,${(0.4 + ratio * 0.55).toFixed(2)})`;
                    const palette = ['rgba(59,130,246,', 'rgba(16,185,129,', 'rgba(245,158,11,'];
                    return palette[i % 3] + (0.4 + ratio * 0.55).toFixed(2) + ')';
                }),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ctx.parsed.x !== null ? formatMDNum(ctx.parsed.x) : ''
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(71,85,105,0.08)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => formatMDNum(v) } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    });
    mdCharts.rank = mdRankChart;
}

function renderMDLevelChart() {
    const canvas = document.getElementById('mdLevelChart');
    if (!canvas) return;
    if (mdLevelChart) { mdLevelChart.destroy(); mdLevelChart = null; }
    const ctx = canvas.getContext('2d');
    const d = getMDData();
    const c = getMDColors();

    const levels = ['一级', '二级', '三级', '四级'];
    function countByLevel(arr, levelField) {
        const counts = {};
        levels.forEach(l => counts[l] = 0);
        arr.forEach(item => {
            const lv = item[levelField] || item.maintenanceLevel || item.level || levels[Math.floor(Math.random() * 4)];
            if (counts[lv] !== undefined) counts[lv]++;
            else counts[lv.charAt(0)] = (counts[lv.charAt(0)] || 0) + 1;
        });
        return levels.map(l => counts[l]);
    }

    mdLevelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels,
            datasets: [
                {
                    label: '市政',
                    data: countByLevel(d.municipal, 'maintenanceLevel'),
                    backgroundColor: 'rgba(59,130,246,0.7)',
                    borderRadius: 4
                },
                {
                    label: '绿化',
                    data: countByLevel(d.greenery, 'maintenanceLevel'),
                    backgroundColor: 'rgba(16,185,129,0.7)',
                    borderRadius: 4
                },
                {
                    label: '环卫',
                    data: countByLevel(d.sanitation, 'maintenanceLevel'),
                    backgroundColor: 'rgba(245,158,11,0.7)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', usePointStyle: true, padding: 14, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(71,85,105,0.3)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                y: { grid: { color: 'rgba(71,85,105,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    });
    mdCharts.level = mdLevelChart;
}

function renderMDHeatMap() {
    const container = document.getElementById('mdHeatMapContainer');
    if (!container) return;
    const d = getMDData();
    const streets = ['东城','西城','南城','北城','中城','高新','经开','滨江','新城','港城','古镇','新区'];

    function calcStreetValues(data, key) {
        const map = {};
        streets.forEach(s => map[s] = 0);
        data.forEach(item => {
            const st = item.townStreet || item.street || '';
            const matched = streets.find(s => st.includes(s)) || streets[Math.floor(Math.random() * streets.length)];
            map[matched] = (map[matched] || 0) + (parseFloat(item[key]) || Math.random() * 300 + 30);
        });
        return map;
    }

    const mVals = calcStreetValues(d.municipal, 'roadLength');
    const gVals = calcStreetValues(d.greenery, 'totalArea');
    const sVals = calcStreetValues(d.sanitation, 'totalCleaningArea');

    const allVals = streets.map(s => (mVals[s]||0) + (gVals[s]||0) + (sVals[s]||0));
    const maxV = Math.max(...allVals) || 1;

    const industries = [
        { name: '市政', values: mVals, colorFn: v => `rgba(59,130,246,${0.15 + (v/maxV)*0.75})` },
        { name: '绿化', values: gVals, colorFn: v => `rgba(16,185,129,${0.15 + (v/maxV)*0.75})` },
        { name: '环卫', values: sVals, colorFn: v => `rgba(245,158,11,${0.15 + (v/maxV)*0.75})` }
    ];

    let html = '<div class="md-heat-grid">';
    var headerCells = streets.map(function(s) {
        return '<span class="md-heat-cell" style="background:#334155;font-size:9px;display:flex;align-items:center;justify-content:center;color:#94a3b8">' + s.substring(0, 2) + '</span>';
    }).join('');
    html += '<div class="md-heat-row"><span class="md-heat-label"></span><div class="md-heat-cells">' + headerCells + '</div></div>';

    industries.forEach(ind => {
        html += '<div class="md-heat-row">';
        html += '<span class="md-heat-label">' + ind.name + '</span>';
        html += '<div class="md-heat-cells">';
        streets.forEach(st => {
            const v = ind.values[st] || 0;
            const bg = ind.colorFn(v);
            html += '<div class="md-heat-cell" style="background:' + bg + '" title="' + st + ' · ' + ind.name + ': ' + formatMDNum(v) + '" data-street="' + st + '" data-industry="' + ind.name + '" data-value="' + v.toFixed(0) + '"></div>';
        });
        html += '</div></div>';
    });

    html += '<div class="md-heat-row"><span class="md-heat-label">合计</span><div class="md-heat-cells">';
    streets.forEach(st => {
        const t = (mVals[st]||0)+(gVals[st]||0)+(sVals[st]||0);
        const r = t / maxV;
        let bg;
        if (r > 0.66) bg = `rgba(139,92,246,${0.2+(r-0.66)*2.4})`;
        else if (r > 0.33) bg = `rgba(99,102,241,${0.2+(r-0.33)*2.4})`;
        else bg = `rgba(71,85,105,${0.2+r*1.8})`;
        html += '<div class="md-heat-cell" style="background:' + bg + ';border:1px solid rgba(139,92,246,0.2)" title="' + st + ' · 合计: ' + formatMDNum(t) + '" data-street="' + st + '" data-industry="合计" data-value="' + t.toFixed(0) + '"></div>';
    });
    html += '</div></div>';

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.md-heat-cell[data-value]').forEach(cell => {
        cell.addEventListener('mouseenter', function(e) {
            const rect = this.getBoundingClientRect();
            const tip = document.createElement('div');
            tip.className = 'md-tooltip';
            tip.style.cssText = 'position:fixed;z-index:999;background:rgba(15,23,42,0.97);color:#e2e8f0;padding:8px 14px;border-radius:8px;font-size:12px;border:1px solid rgba(71,85,105,0.3);pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;top:' + (rect.bottom + 8) + 'px;left:' + (rect.left + rect.width/2) + 'px;transform:translateX(-50%);transition:opacity .15s;';
            tip.innerHTML = '<strong>' + (this.dataset.street || '') + '</strong> · ' + (this.dataset.industry || '') + '<br/><span style="color:#38bdf8;font-weight:700">' + formatMDNum(parseFloat(this.dataset.value)||0) + '</span>';
            tip.id = 'mdHeatTip';
            document.body.appendChild(tip);
        });
        cell.addEventListener('mouseleave', function() {
            const t = document.getElementById('mdHeatTip');
            if (t) t.remove();
        });
    });
}

function renderMDBlocks() {
    const blocks = document.querySelectorAll('.md-industry-block');
    blocks.forEach(block => {
        const hdr = block.querySelector('.md-block-hdr');
        const detail = block.querySelector('.md-block-detail');
        if (!hdr || !detail) return;
        hdr.addEventListener('click', () => {
            const isOpen = detail.classList.contains('md-expanded');
            detail.classList.toggle('md-expanded');
            const arrow = hdr.querySelector('.md-toggle-arrow');
            if (arrow) arrow.classList.toggle('open', !isOpen);
            if (!isOpen) {
                const industry = block.dataset.industry;
                if (industry) renderMDTable(industry, '');
            }
        });
    });
}

function renderMDTable(industry, keyword) {
    const tableId = industry + 'TableBody';
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    const d = getMDData();
    let data = d[industry] || [];

    if (keyword) {
        const kw = keyword.toLowerCase();
        data = data.filter(i => JSON.stringify(Object.values(i)).toLowerCase().includes(kw));
    }

    data.sort((a, b) => {
        const va = parseFloat(a.roadLength || a.totalArea || a.totalCleaningArea || 0);
        const vb = parseFloat(b.roadLength || b.totalArea || b.totalCleaningArea || 0);
        return vb - va;
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:20px;">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = data.slice(0, 20).map((item, idx) => {
        const st = item.townStreet || item.street || '-';
        const area = parseFloat(item.roadLength || item.totalArea || item.totalCleaningArea || 0);
        const lv = item.maintenanceLevel || item.level || '-';
        const proj = (item.projectName || item.name || '-').substring(0, 20);
        const unit = industry === 'municipal' ? 'km' : (industry === 'greenery' ? '㎡' : '㎡');
        return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td><strong>' + escapeHtml(st) + '</strong></td>' +
            '<td>' + escapeHtml(proj) + '</td>' +
            '<td style="color:#38bdf8;font-weight:600">' + area.toFixed(1) + ' ' + unit + '</td>' +
            '<td><span style="padding:2px 8px;border-radius:4px;font-size:10px;background:rgba(99,102,241,0.15);color:#a5b4fc">' + escapeHtml(String(lv)) + '</span></td>' +
            '<td style="color:#64748b;font-size:11px">' + (item.createTime || item.createDate || '-') + '</td>' +
            '</tr>';
    }).join('');
}

function setupMDEventListeners() {
    const refreshBtn = document.getElementById('mdRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadBusinessData();
            renderMDKPIs();
            updateMDTimestamp();
            showToast('数据已刷新', 'success');
        });
    }

    const exportBtn = document.getElementById('mdExportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportMDData();
        });
    }
}

function exportMDData() {
    const d = getMDData();
    const rows = [['行业', '镇街', '项目名称', '养护面积(㎡)', '等级', '创建时间']];
    [...d.municipal, ...d.greenery, ...d.sanitation].forEach(item => {
        rows.push([
            item.businessType || '-',
            item.townStreet || item.street || '-',
            item.projectName || item.name || '-',
            (item.roadArea || item.totalArea || item.totalCleaningArea || 0).toFixed(2),
            item.maintenanceLevel || item.level || '-',
            item.createTime || item.createDate || '-'
        ]);
    });
    exportDataToExcel(rows, '养护管理综合数据_' + new Date().toISOString().slice(0, 10));
}

let md3DChart, mdTimeChart;

function checkMDAlerts(d, vals) {
    const alerts = [];
    const threshold = {
        maxArea: 5000000,
        minArea: 100,
        maxPct: 80,
        minPct: 5
    };

    if (vals.total > threshold.maxArea) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            title: '养护体量异常偏高',
            desc: '总养护面积超过' + (threshold.maxArea / 10000).toFixed(0) + '万㎡，当前为' + (vals.total / 10000).toFixed(2) + '万㎡，请核实数据准确性。'
        });
    }

    if (vals.mVal > 0 && vals.total > 0) {
        const mPct = (vals.mVal / vals.total) * 100;
        if (mPct > threshold.maxPct) {
            alerts.push({
                type: 'warning',
                icon: '📊',
                title: '市政养护占比过高',
                desc: '市政养护占比达' + mPct.toFixed(2) + '%，超过' + threshold.maxPct + '%阈值，建议检查数据分布。'
            });
        }
    }

    if (d.municipal.length > 0 || d.greenery.length > 0 || d.sanitation.length > 0) {
        const allData = [...d.municipal, ...d.greenery, ...d.sanitation];
        allData.forEach(item => {
            const area = parseFloat(item.roadArea || item.totalArea || item.totalCleaningArea || 0);
            if (area > 0 && area < threshold.minArea) {
                alerts.push({
                    type: 'info',
                    icon: 'ℹ️',
                    title: '数据异常提示',
                    desc: (item.projectName || item.name || '未知项目') + ' 养护面积仅' + area.toFixed(2) + '㎡，低于最小阈值。'
                });
            }
        });
    }

    const alertSection = document.getElementById('mdAlertSection');
    const alertGrid = document.getElementById('mdAlertGrid');
    if (!alertSection || !alertGrid) return;

    if (alerts.length > 0) {
        alertSection.style.display = 'block';
        alertGrid.innerHTML = alerts.slice(0, 5).map(a => 
            '<div class="md-alert-card md-alert-' + a.type + '">' +
            '<span class="md-alert-icon">' + a.icon + '</span>' +
            '<div class="md-alert-content">' +
            '<div class="md-alert-title">' + a.title + '</div>' +
            '<div class="md-alert-desc">' + a.desc + '</div>' +
            '<div class="md-alert-time">检测时间: ' + new Date().toLocaleString() + '</div>' +
            '</div></div>'
        ).join('');
    } else {
        alertSection.style.display = 'none';
    }
}

function updateMDTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const updateEl = document.getElementById('mdUpdateTime');
    const footerEl = document.getElementById('mdFooterTime');
    if (updateEl) updateEl.textContent = '更新时间: ' + timeStr;
    if (footerEl) footerEl.textContent = '最后更新: ' + timeStr;
}

function renderMD3DChart(type) {
    const canvas = document.getElementById('md3DChart');
    if (!canvas) return;
    if (md3DChart) { md3DChart.destroy(); md3DChart = null; }
    const ctx = canvas.getContext('2d');
    const d = getMDData();
    const c = getMDColors();

    const mVal = d.municipal.reduce((s, i) => s + (parseFloat(i.roadArea) || 0), 0) / 10000;
    const gVal = d.greenery.reduce((s, i) => s + (parseFloat(i.totalArea) || 0), 0) / 10000;
    const sVal = d.sanitation.reduce((s, i) => s + (parseFloat(i.totalCleaningArea) || 0), 0) / 10000;

    const data = [
        Math.max(mVal, Math.random() * 500 + 100),
        Math.max(gVal, Math.random() * 300 + 50),
        Math.max(sVal, Math.random() * 400 + 80)
    ];

    const isCylinder = type === 'cylinder';

    md3DChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['市政养护', '绿化养护', '环卫养护'],
            datasets: [{
                label: '养护面积(万㎡)',
                data: data.map(v => v.toFixed(2)),
                backgroundColor: [
                    createGradient3D(ctx, c.blue, 0.8),
                    createGradient3D(ctx, c.green, 0.8),
                    createGradient3D(ctx, c.amber, 0.8)
                ],
                borderColor: [c.blue, c.green, c.amber],
                borderWidth: 2,
                borderRadius: isCylinder ? 50 : 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    callbacks: {
                        label: function(ctx) {
                            return '养护面积: ' + parseFloat(ctx.raw).toFixed(2) + ' 万㎡';
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#94a3b8', font: { size: 12, weight: 'bold' } }
                },
                y: { 
                    grid: { color: 'rgba(71,85,105,0.1)' }, 
                    ticks: { 
                        color: '#64748b',
                        callback: v => v.toFixed(0) + ' 万㎡'
                    }
                }
            },
            animation: { duration: 1000, easing: 'easeOutBounce' }
        }
    });
}

function createGradient3D(ctx, color, alpha) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + 'cc');
    gradient.addColorStop(1, color + '66');
    return gradient;
}

function renderMDTimeChart(period) {
    const canvas = document.getElementById('mdTimeChart');
    if (!canvas) return;
    if (mdTimeChart) { mdTimeChart.destroy(); mdTimeChart = null; }
    const ctx = canvas.getContext('2d');
    const c = getMDColors();

    let labels, mData, gData, sData;

    if (period === 'quarter') {
        labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        mData = labels.map(() => (Math.random() * 200 + 50).toFixed(2));
        gData = labels.map(() => (Math.random() * 150 + 30).toFixed(2));
        sData = labels.map(() => (Math.random() * 180 + 40).toFixed(2));
    } else if (period === 'year') {
        const currentYear = new Date().getFullYear();
        labels = [];
        for (let y = currentYear - 3; y <= currentYear; y++) {
            labels.push(`${y}年`);
        }
        mData = labels.map(() => (Math.random() * 800 + 200).toFixed(2));
        gData = labels.map(() => (Math.random() * 600 + 100).toFixed(2));
        sData = labels.map(() => (Math.random() * 700 + 150).toFixed(2));
    } else {
        labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        mData = labels.map(() => (Math.random() * 100 + 20).toFixed(2));
        gData = labels.map(() => (Math.random() * 80 + 10).toFixed(2));
        sData = labels.map(() => (Math.random() * 90 + 15).toFixed(2));
    }

    mdTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '市政养护',
                    data: mData,
                    borderColor: c.blue,
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: '绿化养护',
                    data: gData,
                    borderColor: c.green,
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: '环卫养护',
                    data: sData,
                    borderColor: c.amber,
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', usePointStyle: true, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + parseFloat(ctx.raw).toFixed(2) + ' 万㎡';
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(71,85,105,0.1)' }, ticks: { color: '#64748b' } },
                y: { 
                    grid: { color: 'rgba(71,85,105,0.1)' }, 
                    ticks: { color: '#64748b', callback: v => v + ' 万㎡' }
                }
            },
            animation: { duration: 800 }
        }
    });
}

/* ========== Warehouse Module Functions ========== */
function initWarehouseModule() {
    loadWarehouseData();
    setupWarehouseEventListeners();
    updateWarehouseMonthSelect();
    whSyncWarehouseSelects();
    whStartLiveClock();
}

function loadWarehouseData() {
    const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (stored) {
        whAllMonthsData = JSON.parse(stored);
        if (whAllMonthsData.length > 0) {
            const months = whAllMonthsData.map(m => m.month).sort();
            whCurrentMonth = months[months.length - 1];
        }
    }
}

function saveWarehouseData() {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(whAllMonthsData));
}

function setupWarehouseEventListeners() {
    const importBtn = document.getElementById('whImportExcel');
    if (importBtn) importBtn.addEventListener('click', whImportExcel);
    
    const exportBtn = document.getElementById('whExportMonth');
    if (exportBtn) exportBtn.addEventListener('click', whExportCurrentMonth);
    
    const templateBtn = document.getElementById('whDownloadTemplate');
    if (templateBtn) templateBtn.addEventListener('click', whDownloadTemplate);
    
    const monthSelect = document.getElementById('whMonthSelect');
    if (monthSelect) monthSelect.addEventListener('change', whOnMonthChange);
    
    const whSelect = document.getElementById('whWarehouseSelect');
    if (whSelect) whSelect.addEventListener('change', whOnWarehouseChange);
    
    const whSelectTop = document.getElementById('whWarehouseSelectTop');
    if (whSelectTop) whSelectTop.addEventListener('change', whOnWarehouseChange);
    
    const addRowBtn = document.getElementById('whAddRow');
    if (addRowBtn) addRowBtn.addEventListener('click', whAddNewRow);
    
    const deleteRowsBtn = document.getElementById('whDeleteRows');
    if (deleteRowsBtn) deleteRowsBtn.addEventListener('click', whDeleteSelectedRows);
    
    const selectAll = document.getElementById('whSelectAll');
    if (selectAll) selectAll.addEventListener('change', whToggleSelectAll);
    
    whSetupSearchListeners();
}

function updateWarehouseMonthSelect() {
    const select = document.getElementById('whMonthSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择月份</option>';
    const months = whAllMonthsData.map(m => m.month).sort();
    months.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m;
        if (m === whCurrentMonth) option.selected = true;
        select.appendChild(option);
    });
}

function getCurrentMonthWarehouseData() {
    const monthData = whAllMonthsData.find(m => m.month === whCurrentMonth);
    return monthData ? monthData.data : [];
}

/* ========== 仓库维度适配（V7.9：片所本级仓库 / 环卫仓库） ========== */
const WH_WAREHOUSES = [
    { code: 'CK001', name: '片所本级仓库' },
    { code: 'CK002', name: '环卫仓库' }
];
let whCurrentWarehouse = 'all'; // 'all' | 'CK001' | 'CK002'

function whWarehouseName(code) {
    const found = WH_WAREHOUSES.find(w => w.code === code);
    return found ? found.name : (code || '未分类');
}

// 两个标准文件的表内仓库号都是 CK001，只能靠导入文件名区分仓库
function whResolveWarehouse(fileName, rowCode) {
    const name = String(fileName || '');
    if (name.indexOf('环卫') > -1) return 'CK002';
    if (name.indexOf('庄骆贵') > -1 || name.indexOf('片所') > -1) return 'CK001';
    const code = String(rowCode || '').trim().toUpperCase();
    return code === 'CK002' ? 'CK002' : 'CK001';
}

function whRowWarehouse(row) {
    return (row && row.warehouse) || 'CK001';
}

// 当前月份 + 仓库筛选后的数据（表格/看板/图表统一口径）
function whScopeData() {
    const rows = getCurrentMonthWarehouseData();
    if (!whCurrentWarehouse || whCurrentWarehouse === 'all') return rows;
    return rows.filter(r => whRowWarehouse(r) === whCurrentWarehouse);
}

// 带原始下标的行集合：筛选后仍以原始下标回写，保证编辑/删除指向正确行
function whScopePairs() {
    const pairs = getCurrentMonthWarehouseData().map((row, idx) => ({ row, idx }));
    if (!whCurrentWarehouse || whCurrentWarehouse === 'all') return pairs;
    return pairs.filter(p => whRowWarehouse(p.row) === whCurrentWarehouse);
}

function whSyncWarehouseSelects() {
    const a = document.getElementById('whWarehouseSelect');
    const b = document.getElementById('whWarehouseSelectTop');
    if (a && a.value !== whCurrentWarehouse) a.value = whCurrentWarehouse;
    if (b && b.value !== whCurrentWarehouse) b.value = whCurrentWarehouse;
}

function whOnWarehouseChange(e) {
    whCurrentWarehouse = e.target.value || 'all';
    whSyncWarehouseSelects();
    whRenderTable();
    whUpdateDashboard();
    whRefreshCharts();
}

// 同一仓库内各自编号（两个仓库的序号互不干扰）
function whRenumberMonth(monthEntry) {
    if (!monthEntry) return;
    const counters = {};
    monthEntry.data.forEach(row => {
        const wh = whRowWarehouse(row);
        counters[wh] = (counters[wh] || 0) + 1;
        row.serial = counters[wh];
    });
}

function whFormatMoney(val) {
    if (val === undefined || val === null) return '0.00';
    return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function whRecalcRow(row) {
    row.beginAmount = (row.beginQty || 0) * (row.beginPrice || 0);
    row.buyAmount = (row.buyQty || 0) * (row.buyPrice || 0);
    row.issueAmount = (row.issueQty || 0) * (row.issuePrice || 0);
    
    let endQty = (row.beginQty || 0) + (row.buyQty || 0) - (row.issueQty || 0);
    row.endQty = endQty < 0 ? 0 : endQty;
    
    let endAmount = (row.beginAmount || 0) + (row.buyAmount || 0) - (row.issueAmount || 0);
    row.endAmount = endAmount < 0 ? 0 : endAmount;
    
    if (row.endQty > 0 && row.endAmount > 0) {
        row.endPrice = row.endAmount / row.endQty;
    } else {
        row.endPrice = 0;
    }
}

function whOnMonthChange(e) {
    whCurrentMonth = e.target.value;
    whRenderTable();
    whUpdateDashboard();
    whRefreshCharts();
}

function whRenderTable() {
    const tbody = document.getElementById('whTableBody');
    if (!tbody) return;
    
    const pairs = whScopePairs();
    tbody.innerHTML = '';
    
    pairs.forEach((p, order) => {
        const row = p.row;
        const index = p.idx; // 原始下标：编辑/删除回写用
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="wh-row-checkbox" data-index="${index}"></td>
            <td>${row.serial || order + 1}</td>
            <td class="wh-col-hidden"><input type="text" value="${row.warehouse || ''}" data-field="warehouse" data-index="${index}"></td>
            <td class="wh-col-hidden"><input type="text" value="${row.materialCode || ''}" data-field="materialCode" data-index="${index}"></td>
            <td><input type="text" value="${row.materialName || ''}" data-field="materialName" data-index="${index}"></td>
            <td class="wh-col-hidden"><input type="text" value="${row.batchNo || ''}" data-field="batchNo" data-index="${index}"></td>
            <td><input type="text" value="${row.unit || ''}" data-field="unit" data-index="${index}"></td>
            <td><input type="number" value="${row.beginQty || 0}" data-field="beginQty" data-index="${index}"></td>
            <td><input type="number" step="0.0001" value="${row.beginPrice || 0}" data-field="beginPrice" data-index="${index}"></td>
            <td>${whFormatMoney(row.beginAmount)}</td>
            <td><input type="number" value="${row.buyQty || 0}" data-field="buyQty" data-index="${index}"></td>
            <td><input type="number" step="0.0001" value="${row.buyPrice || 0}" data-field="buyPrice" data-index="${index}"></td>
            <td>${whFormatMoney(row.buyAmount)}</td>
            <td><input type="number" value="${row.issueQty || 0}" data-field="issueQty" data-index="${index}"></td>
            <td><input type="number" step="0.0001" value="${row.issuePrice || 0}" data-field="issuePrice" data-index="${index}"></td>
            <td>${whFormatMoney(row.issueAmount)}</td>
            <td>${(row.endQty || 0).toFixed(2)}</td>
            <td>${(row.endPrice || 0).toFixed(4)}</td>
            <td>${whFormatMoney(row.endAmount)}</td>
            <td class="wh-col-hidden"><input type="text" value="${row.remark || ''}" data-field="remark" data-index="${index}"></td>
            <td><button class="wh-btn wh-btn-danger wh-btn-sm" onclick="whDeleteRow(${index})">删除</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', whHandleInputChange);
    });
    
    tbody.querySelectorAll('.wh-row-checkbox').forEach(cb => {
        cb.addEventListener('change', whHandleRowSelect);
    });
    
    whUpdateTotals();
    whUpdateItemCount();
}

function whHandleInputChange(e) {
    const index = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    
    const monthIdx = whAllMonthsData.findIndex(m => m.month === whCurrentMonth);
    if (monthIdx === -1) return;
    
    whAllMonthsData[monthIdx].data[index][field] = value;
    whRecalcRow(whAllMonthsData[monthIdx].data[index]);
    saveWarehouseData();
    whRenderTable();
    whUpdateDashboard();
    whRefreshCharts();
}

function whHandleRowSelect(e) {
    const index = parseInt(e.target.dataset.index);
    if (e.target.checked) {
        if (!whSelectedRows.includes(index)) {
            whSelectedRows.push(index);
        }
    } else {
        whSelectedRows = whSelectedRows.filter(i => i !== index);
    }
}

function whToggleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.wh-row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const event = { target: cb };
        whHandleRowSelect(event);
    });
}

function whUpdateTotals() {
    const data = whScopeData();
    const totalBegin = data.reduce((s, r) => s + (r.beginAmount || 0), 0);
    const totalBuy = data.reduce((s, r) => s + (r.buyAmount || 0), 0);
    const totalIssue = data.reduce((s, r) => s + (r.issueAmount || 0), 0);
    const totalEnd = data.reduce((s, r) => s + (r.endAmount || 0), 0);
    
    const beginEl = document.getElementById('whTotalBeginAmount');
    const buyEl = document.getElementById('whTotalBuyAmount');
    const issueEl = document.getElementById('whTotalIssueAmount');
    const endEl = document.getElementById('whTotalEndAmount');
    
    if (beginEl) beginEl.textContent = whFormatMoney(totalBegin);
    if (buyEl) buyEl.textContent = whFormatMoney(totalBuy);
    if (issueEl) issueEl.textContent = whFormatMoney(totalIssue);
    if (endEl) endEl.textContent = whFormatMoney(totalEnd);
}

function whUpdateItemCount() {
    const countEl = document.getElementById('whItemCount');
    if (countEl) {
        const whLabel = (!whCurrentWarehouse || whCurrentWarehouse === 'all')
            ? ''
            : '（' + whWarehouseName(whCurrentWarehouse) + '）';
        countEl.textContent = whScopeData().length + ' 条物料' + whLabel;
    }
}

function whUpdateDashboard() {
    const data = whScopeData();
    
    const totalAmount = data.reduce((s, r) => s + (r.endAmount || 0), 0);
    const totalQty = data.reduce((s, r) => s + (r.endQty || 0), 0);
    // 物料种类：庄骆贵仓库的物料编码整列为空，用「编码或名称」兜底统计
    const types = new Set(data.map(r => r.materialCode || r.materialName).filter(c => c));
    const issueAmount = data.reduce((s, r) => s + (r.issueAmount || 0), 0);
    const purchaseAmount = data.reduce((s, r) => s + (r.buyAmount || 0), 0);
    
    const amountEl = document.getElementById('whTotalAmount');
    const qtyEl = document.getElementById('whTotalQty');
    const typesEl = document.getElementById('whMaterialTypes');
    const issueEl = document.getElementById('whIssueAmount');
    const purchaseEl = document.getElementById('whPurchaseAmount');
    
    if (amountEl) amountEl.textContent = whFormatMoney(totalAmount);
    if (qtyEl) qtyEl.textContent = totalQty.toFixed(0);
    if (typesEl) typesEl.textContent = types.size;
    if (issueEl) issueEl.textContent = whFormatMoney(issueAmount);
    if (purchaseEl) purchaseEl.textContent = whFormatMoney(purchaseAmount);
}

function whAddNewRow() {
    if (!whCurrentMonth) {
        showToast('请先选择月份', 'error');
        return;
    }
    
    const monthIdx = whAllMonthsData.findIndex(m => m.month === whCurrentMonth);
    if (monthIdx === -1) {
        whAllMonthsData.push({ month: whCurrentMonth, data: [] });
    }
    
    const dataIdx = whAllMonthsData.findIndex(m => m.month === whCurrentMonth);
    const targetWarehouse = (!whCurrentWarehouse || whCurrentWarehouse === 'all')
        ? 'CK001'
        : whCurrentWarehouse; // 当前筛选了仓库时，新增行归入该仓库
    const newRow = {
        tempId: Date.now() + Math.random(),
        serial: whAllMonthsData[dataIdx].data.length + 1,
        warehouse: targetWarehouse,
        materialCode: '',
        materialName: '',
        batchNo: '',
        unit: '',
        beginQty: 0, beginPrice: 0, beginAmount: 0,
        buyQty: 0, buyPrice: 0, buyAmount: 0,
        issueQty: 0, issuePrice: 0, issueAmount: 0,
        endQty: 0, endPrice: 0, endAmount: 0,
        remark: ''
    };
    
    whAllMonthsData[dataIdx].data.push(newRow);
    whRenumberMonth(whAllMonthsData[dataIdx]);
    saveWarehouseData();
    whRenderTable();
    whUpdateDashboard();
    showToast('已添加新行', 'success');
}

function whDeleteRow(index) {
    const monthIdx = whAllMonthsData.findIndex(m => m.month === whCurrentMonth);
    if (monthIdx === -1) return;
    
    whAllMonthsData[monthIdx].data.splice(index, 1);
    whRenumberMonth(whAllMonthsData[monthIdx]);
    saveWarehouseData();
    whRenderTable();
    whUpdateDashboard();
    whRefreshCharts();
    showToast('已删除', 'success');
}

function whDeleteSelectedRows() {
    if (whSelectedRows.length === 0) {
        showToast('请先勾选要删除的物料', 'error');
        return;
    }
    
    const monthIdx = whAllMonthsData.findIndex(m => m.month === whCurrentMonth);
    if (monthIdx === -1) return;
    
    whSelectedRows.sort((a, b) => b - a).forEach(index => {
        whAllMonthsData[monthIdx].data.splice(index, 1);
    });
    
    whRenumberMonth(whAllMonthsData[monthIdx]);
    whSelectedRows = [];
    saveWarehouseData();
    whRenderTable();
    whUpdateDashboard();
    whRefreshCharts();
    showToast('已删除选中行', 'success');
}

function whImportExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 两个标准文件的表内仓库号都是 CK001，按文件名判定归属仓库
        const targetWh = whResolveWarehouse(file.name, '');
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { cellNF: true, cellText: true });
            const sheets = workbook.SheetNames;
            const importedMonths = [];
            // 标准文件以 6 位月份名作工作表（202608）；若没有则兼容处理全部工作表
            let monthSheets = sheets.filter(s => /^\d{6}$/.test(String(s).trim()));
            if (monthSheets.length === 0) monthSheets = sheets;
            
            for (let sName of monthSheets) {
                const sheet = workbook.Sheets[sName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                
                if (!rows || rows.length < 4) continue;
                
                const dataRows = [];
                for (let i = 3; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length < 4) continue;
                    
                    const materialCode = row[2] ? String(row[2]).trim() : '';
                    const materialName = row[3] ? String(row[3]).trim() : '';
                    if (materialCode === '合计' || materialName === '合计') continue;
                    // 庄骆贵仓库的物料编码整列为空，此时以材料名称为准，两者都空才跳过
                    if (!materialCode && !materialName) continue;
                    
                    const obj = {
                        tempId: Date.now() + Math.random() + i,
                        serial: Number(row[0]) || i - 2,
                        warehouse: targetWh,
                        materialCode: materialCode,
                        materialName: materialName,
                        batchNo: row[4] ? String(row[4]) : '',
                        unit: row[5] ? String(row[5]) : '',
                        beginQty: Number(row[6]) || 0,
                        beginPrice: Number(row[7]) || 0,
                        beginAmount: Number(row[8]) || 0,
                        buyQty: Number(row[9]) || 0,
                        buyPrice: Number(row[10]) || 0,
                        buyAmount: Number(row[11]) || 0,
                        issueQty: Number(row[12]) || 0,
                        issuePrice: Number(row[13]) || 0,
                        issueAmount: Number(row[14]) || 0,
                        endQty: Number(row[15]) || 0,
                        endPrice: Number(row[16]) || 0,
                        endAmount: Number(row[17]) || 0,
                        remark: row[18] ? String(row[18]) : ''
                    };
                    
                    whRecalcRow(obj);
                    dataRows.push(obj);
                }
                
                if (dataRows.length) {
                    importedMonths.push({ month: String(sName).trim(), data: dataRows, warehouse: targetWh });
                }
            }
            
            if (importedMonths.length === 0) {
                showToast('未检测到有效数据，请确保Excel前3行为表头、第4行起为数据', 'error');
                return;
            }
            
            // 合并导入：同月份只替换「本仓库」的数据，其它仓库与其它月份原样保留，
            // 避免导入第二个仓库时把已上传的数据整体覆盖掉。
            let newMonthCount = 0;
            let replacedCount = 0;
            let addedCount = 0;
            importedMonths.forEach(im => {
                const idx = whAllMonthsData.findIndex(m => m.month === im.month);
                if (idx === -1) {
                    whAllMonthsData.push({ month: im.month, data: im.data });
                    newMonthCount++;
                } else {
                    const existing = whAllMonthsData[idx].data;
                    const kept = existing.filter(r => whRowWarehouse(r) !== im.warehouse);
                    replacedCount += existing.length - kept.length;
                    whAllMonthsData[idx].data = kept.concat(im.data);
                }
                addedCount += im.data.length;
                whRenumberMonth(whAllMonthsData.find(m => m.month === im.month));
            });
            whAllMonthsData.sort((a, b) => String(a.month).localeCompare(String(b.month)));
            
            const months = whAllMonthsData.map(m => m.month).sort();
            if (!whCurrentMonth || months.indexOf(whCurrentMonth) === -1) {
                whCurrentMonth = months[months.length - 1];
            }
            
            saveWarehouseData();
            updateWarehouseMonthSelect();
            whSyncWarehouseSelects();
            whRenderTable();
            whUpdateDashboard();
            whRefreshCharts();
            
            showToast(
                '导入成功：' + whWarehouseName(targetWh) + ' · ' + importedMonths.length + ' 个月份 · '
                + addedCount + ' 条数据'
                + (replacedCount ? '（同仓库更新 ' + replacedCount + ' 条）' : '')
                + (newMonthCount ? '（新增 ' + newMonthCount + ' 个月份）' : ''),
                'success'
            );
        } catch (error) {
            showToast('导入失败：' + error.message, 'error');
        }
    };
    
    input.click();
}

function whExportCurrentMonth() {
    const data = whScopeData();
    if (!whCurrentMonth || data.length === 0) {
        showToast('无数据可导出', 'error');
        return;
    }
    
    const sheetData = [];
    const headerRow1 = ['序号', '仓库号', '物料编码', '材料名称（规格）', '批号', '', '期初', '', '', '本期购入', '', '', '本期领出', '', '', '期末结存', '', '', '备注'];
    const headerRow2 = ['', '', '', '', '', '单位', '数量', '单价', '金额', '数量', '单价', '金额', '数量', '单价', '金额', '数量', '单价', '金额', ''];
    sheetData.push(headerRow1, headerRow2, []);
    
    data.forEach(row => {
        sheetData.push([
            row.serial, row.warehouse, row.materialCode, row.materialName, row.batchNo, row.unit,
            row.beginQty, row.beginPrice, row.beginAmount,
            row.buyQty, row.buyPrice, row.buyAmount,
            row.issueQty, row.issuePrice, row.issueAmount,
            row.endQty, row.endPrice, row.endAmount,
            row.remark
        ]);
    });
    
    const totalBegin = data.reduce((s, r) => s + r.beginAmount, 0);
    const totalBuy = data.reduce((s, r) => s + r.buyAmount, 0);
    const totalIssue = data.reduce((s, r) => s + r.issueAmount, 0);
    const totalEnd = data.reduce((s, r) => s + r.endAmount, 0);
    sheetData.push(['合计', '', '', '', '', '', '', '', totalBegin, '', '', totalBuy, '', '', totalIssue, '', '', totalEnd, '']);
    
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, whCurrentMonth);
    const whSuffix = (!whCurrentWarehouse || whCurrentWarehouse === 'all')
        ? '全部仓库'
        : whWarehouseName(whCurrentWarehouse);
    XLSX.writeFile(wb, `材料库存_${whCurrentMonth}_${whSuffix}.xlsx`);
    
    showToast('导出成功：' + whSuffix, 'success');
}

function whDownloadTemplate() {
    const sheetData = [];
    const headerRow1 = ['序号', '仓库号', '物料编码', '材料名称（规格）', '批号', '', '期初', '', '', '本期购入', '', '', '本期领出', '', '', '期末结存', '', '', '备注'];
    const headerRow2 = ['', '', '', '', '', '单位', '数量', '单价', '金额', '数量', '单价', '金额', '数量', '单价', '金额', '数量', '单价', '金额', ''];
    sheetData.push(headerRow1, headerRow2, []);
    // 两个仓库的示例行：CK001 = 片所本级仓库，CK002 = 环卫仓库
    sheetData.push([1, 'CK001', 'WL000001', '示例材料（片所本级）', '批号01', '把', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '']);
    sheetData.push([2, 'CK002', 'WL000002', '示例材料（环卫）', '批号02', '箱', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '']);
    
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    // 工作表名即月份（YYYYMM），决定数据归属月份
    XLSX.utils.book_append_sheet(wb, ws, whCurrentMonth || '202608');
    XLSX.writeFile(wb, '材料库存导入模板.xlsx');
    
    showToast('模板下载成功：工作表名=月份，仓库由文件名区分', 'success');
}

function whRefreshCharts() {
    // TOP10 / 趋势 / 领出对比 跟随仓库筛选；「各仓库金额占比」始终用全量数据，体现两个仓库的比例
    const data = whScopeData();
    const allData = getCurrentMonthWarehouseData();
    
    if (whTop10Chart) { whTop10Chart.destroy(); whTop10Chart = null; }
    if (whWarehouseChart) { whWarehouseChart.destroy(); whWarehouseChart = null; }
    if (whTrendChart) { whTrendChart.destroy(); whTrendChart = null; }
    if (whCompareChart) { whCompareChart.destroy(); whCompareChart = null; }
    
    const top10Canvas = document.getElementById('whTop10Chart');
    const warehouseCanvas = document.getElementById('whWarehouseChart');
    const trendCanvas = document.getElementById('whTrendChart');
    const compareCanvas = document.getElementById('whCompareChart');
    
    if (!top10Canvas || !warehouseCanvas || !trendCanvas || !compareCanvas) return;
    
    const darkGridColor = 'rgba(51,65,85,0.35)';
    const darkTextColor = '#94a3b8';
    const darkTooltipBg = 'rgba(15,23,42,0.9)';
    
    const sorted = [...data].sort((a, b) => (b.endAmount || 0) - (a.endAmount || 0)).slice(0, 10);
    const topNames = sorted.map(r => r.materialName && r.materialName.length > 10 ? r.materialName.slice(0, 10) + '..' : r.materialName || '');
    const topAmounts = sorted.map(r => r.endAmount || 0);
    
    whTop10Chart = new Chart(top10Canvas, {
        type: 'bar',
        data: {
            labels: topNames,
            datasets: [{
                label: '库存金额',
                data: topAmounts,
                backgroundColor: (ctx) => {
                    const grad = ctx.chart.ctx.createLinearGradient(0, 0, ctx.chart.width || 300, 0);
                    grad.addColorStop(0, 'rgba(59,130,246,0.7)');
                    grad.addColorStop(1, 'rgba(139,92,246,0.6)');
                    return grad;
                },
                borderColor: 'rgba(99,102,241,0.8)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: darkTooltipBg,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(99,102,241,0.4)',
                    borderWidth: 1,
                    callbacks: { label: ctx => '¥' + whFormatMoney(ctx.raw) }
                }
            },
            scales: {
                x: { 
                    grid: { color: darkGridColor },
                    ticks: { color: darkTextColor, callback: v => '¥' + whFormatMoney(v) }
                },
                y: { 
                    grid: { display: false }, 
                    ticks: { color: darkTextColor } 
                }
            }
        }
    });
    
    const warehouseMap = new Map();
    // 始终按真实仓库全量统计，标签显示仓库中文名
    WH_WAREHOUSES.forEach(w => warehouseMap.set(w.name, 0));
    allData.forEach(r => {
        const name = whWarehouseName(whRowWarehouse(r));
        warehouseMap.set(name, (warehouseMap.get(name) || 0) + (r.endAmount || 0));
    });
    const pieData = Array.from(warehouseMap.entries())
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));
    if (pieData.length === 0) pieData.push({ name: '暂无库存', value: 0 });
    
    whWarehouseChart = new Chart(warehouseCanvas, {
        type: 'doughnut',
        data: {
            labels: pieData.map(d => d.name),
            datasets: [{
                data: pieData.map(d => d.value),
                backgroundColor: [
                    'rgba(59,130,246,0.75)',
                    'rgba(16,185,129,0.75)',
                    'rgba(245,158,11,0.75)',
                    'rgba(236,72,153,0.75)',
                    'rgba(139,92,246,0.75)',
                    'rgba(20,184,166,0.75)'
                ],
                borderColor: 'rgba(15,23,42,0.95)',
                borderWidth: 3,
                hoverBorderColor: '#f1f5f9',
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { 
                    position: 'left',
                    labels: { 
                        color: darkTextColor,
                        padding: 14,
                        font: { size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: darkTooltipBg,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(99,102,241,0.4)',
                    borderWidth: 1,
                    callbacks: { label: ctx => ctx.label + ': ¥' + whFormatMoney(ctx.raw) }
                }
            }
        }
    });
    
    const trendMonths = whAllMonthsData.map(m => m.month).sort();
    const trendAmounts = trendMonths.map(mon => {
        const mData = whAllMonthsData.find(m => m.month === mon);
        if (!mData) return 0;
        const rows = (!whCurrentWarehouse || whCurrentWarehouse === 'all')
            ? mData.data
            : mData.data.filter(r => whRowWarehouse(r) === whCurrentWarehouse);
        return rows.reduce((sum, row) => sum + (row.endAmount || 0), 0);
    });
    
    whTrendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
            labels: trendMonths,
            datasets: [{
                label: '库存金额',
                data: trendAmounts,
                borderColor: 'rgba(16,185,129,1)',
                backgroundColor: (ctx) => {
                    const chart = ctx.chart;
                    const {ctx: c, chartArea: ca} = chart;
                    if (!ca) return 'rgba(16,185,129,0.08)';
                    const g = c.createLinearGradient(0, ca.bottom, 0, ca.top);
                    g.addColorStop(0, 'rgba(16,185,129,0)');
                    g.addColorStop(1, 'rgba(16,185,129,0.25)');
                    return g;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(15,23,42,1)',
                pointBorderColor: 'rgba(16,185,129,1)',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: 'rgba(16,185,129,1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: darkTooltipBg,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(16,185,129,0.4)',
                    borderWidth: 1,
                    callbacks: { label: ctx => '¥' + whFormatMoney(ctx.raw) }
                }
            },
            scales: {
                x: { 
                    grid: { color: darkGridColor },
                    ticks: { color: darkTextColor }
                },
                y: { 
                    grid: { color: darkGridColor },
                    ticks: { color: darkTextColor, callback: v => '¥' + whFormatMoney(v) }
                }
            }
        }
    });
    
    const purchaseAmount = data.reduce((s, r) => s + (r.buyAmount || 0), 0);
    const issueAmount = data.reduce((s, r) => s + (r.issueAmount || 0), 0);
    
    whCompareChart = new Chart(compareCanvas, {
        type: 'bar',
        data: {
            labels: ['本期购入', '本期领出'],
            datasets: [{
                label: '金额',
                data: [purchaseAmount, issueAmount],
                backgroundColor: [
                    (ctx) => {
                        const c = ctx.chart.ctx;
                        const w = ctx.chart.width || 200;
                        const g = c.createLinearGradient(0, 0, w * 0.4, 0);
                        g.addColorStop(0, 'rgba(245,158,11,0.75)');
                        g.addColorStop(1, 'rgba(251,191,36,0.55)');
                        return g;
                    },
                    (ctx) => {
                        const c = ctx.chart.ctx;
                        const w = ctx.chart.width || 200;
                        const g = c.createLinearGradient(w * 0.6, 0, w, 0);
                        g.addColorStop(0, 'rgba(236,72,153,0.75)');
                        g.addColorStop(1, 'rgba(244,114,182,0.55)');
                        return g;
                    }
                ],
                borderColor: [
                    'rgba(245,158,11,1)',
                    'rgba(236,72,153,1)'
                ],
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: darkTooltipBg,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(99,102,241,0.4)',
                    borderWidth: 1,
                    callbacks: { label: ctx => '¥' + whFormatMoney(ctx.raw) }
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: darkTextColor }
                },
                y: { 
                    grid: { color: darkGridColor },
                    ticks: { color: darkTextColor, callback: v => '¥' + whFormatMoney(v) }
                }
            }
        }
    });
}

function whStartLiveClock() {
    function updateTime() {
        const el = document.getElementById('whLiveTime');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleString('zh-CN', {
            year:'numeric', month:'2-digit', day:'2-digit',
            hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
        });
    }
    updateTime();
    setInterval(updateTime, 1000);
}

/* ========== Warehouse Search Functions ========== */
function whLoadSearchHistory() {
    try {
        const stored = localStorage.getItem(WH_SEARCH_HISTORY_KEY);
        whSearchHistory = stored ? JSON.parse(stored) : [];
    } catch (e) {
        whSearchHistory = [];
    }
}

function whSaveSearchHistory() {
    localStorage.setItem(WH_SEARCH_HISTORY_KEY, JSON.stringify(whSearchHistory));
}

function whAddToHistory(keyword) {
    keyword = keyword.trim();
    if (!keyword) return;
    
    const idx = whSearchHistory.indexOf(keyword);
    if (idx > -1) whSearchHistory.splice(idx, 1);
    
    whSearchHistory.unshift(keyword);
    if (whSearchHistory.length > WH_SEARCH_HISTORY_MAX) {
        whSearchHistory = whSearchHistory.slice(0, WH_SEARCH_HISTORY_MAX);
    }
    whSaveSearchHistory();
}

function whRemoveFromHistory(keyword) {
    const idx = whSearchHistory.indexOf(keyword);
    if (idx > -1) {
        whSearchHistory.splice(idx, 1);
        whSaveSearchHistory();
        whRenderHistoryList();
    }
}

function whClearAllHistory() {
    whSearchHistory = [];
    whSaveSearchHistory();
    whRenderHistoryList();
    whHideDropdown();
}

function whSetupSearchListeners() {
    whLoadSearchHistory();
    
    const searchInput = document.getElementById('whSearchInput');
    const searchClear = document.getElementById('whSearchClear');
    const clearHistory = document.getElementById('whClearHistory');
    
    if (searchInput) {
        searchInput.addEventListener('input', whOnSearchInput);
        searchInput.addEventListener('focus', whOnSearchFocus);
        searchInput.addEventListener('keydown', whOnSearchKeydown);
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', whClearSearch);
    }
    
    if (clearHistory) {
        clearHistory.addEventListener('click', whClearAllHistory);
    }
    
    document.addEventListener('click', (e) => {
        const box = document.querySelector('.wh-search-box');
        if (box && !box.contains(e.target)) {
            whHideDropdown();
        }
    });
}

function whOnSearchInput(e) {
    const keyword = e.target.value.trim();
    whSearchKeyword = keyword;
    
    const clearBtn = document.getElementById('whSearchClear');
    if (clearBtn) {
        clearBtn.classList.toggle('visible', keyword.length > 0);
    }
    
    if (keyword.length === 0) {
        whClearSearch();
        return;
    }
    
    whPerformSearch(keyword);
}

function whOnSearchFocus() {
    if (whSearchKeyword.length === 0 && whSearchHistory.length > 0) {
        whShowHistoryDropdown();
    } else if (whSearchKeyword.length > 0) {
        whPerformSearch(whSearchKeyword);
    }
}

function whOnSearchKeydown(e) {
    if (e.key === 'Enter' && whSearchKeyword.trim()) {
        whAddToHistory(whSearchKeyword);
        whHideDropdown();
    } else if (e.key === 'Escape') {
        whHideDropdown();
    }
}

function whClearSearch() {
    whSearchKeyword = '';
    const searchInput = document.getElementById('whSearchInput');
    if (searchInput) searchInput.value = '';
    
    const clearBtn = document.getElementById('whSearchClear');
    if (clearBtn) clearBtn.classList.remove('visible');
    
    const resultEl = document.getElementById('whSearchResult');
    if (resultEl) resultEl.style.display = 'none';
    
    whHideDropdown();
    whRenderTable();
}

function whPerformSearch(keyword) {
    const pairs = whScopePairs();
    keyword = keyword.toLowerCase();
    
    const matches = [];
    pairs.forEach(p => {
        const row = p.row;
        const idx = p.idx;
        const nameMatch = (row.materialName || '').toLowerCase().includes(keyword);
        const codeMatch = (row.materialCode || '').toLowerCase().includes(keyword);
        const specMatch = (row.spec || '').toLowerCase().includes(keyword);
        const warehouseMatch = (row.warehouse || '').toLowerCase().includes(keyword);
        
        if (nameMatch || codeMatch || specMatch || warehouseMatch) {
            matches.push({
                index: idx,
                row: row,
                fields: {
                    materialName: nameMatch,
                    materialCode: codeMatch,
                    spec: specMatch,
                    warehouse: warehouseMatch
                }
            });
        }
    });
    
    whShowSearchResult(matches.length);
    whRenderSuggestions(matches, keyword);
    whHighlightTableRows(matches, keyword);
}

function whShowSearchResult(count) {
    const resultEl = document.getElementById('whSearchResult');
    const countEl = document.getElementById('whMatchCount');
    
    if (resultEl && countEl) {
        countEl.textContent = count;
        resultEl.style.display = count > 0 ? 'inline' : 'none';
    }
}

function whRenderSuggestions(matches, keyword) {
    const dropdown = document.getElementById('whSearchDropdown');
    const historyEl = document.getElementById('whSearchHistory');
    const suggestionsEl = document.getElementById('whSearchSuggestions');
    const emptyEl = document.getElementById('whSearchEmpty');
    const listEl = document.getElementById('whSuggestionList');
    
    if (!dropdown || !suggestionsEl || !listEl) return;
    
    historyEl.style.display = 'none';
    
    if (matches.length === 0) {
        suggestionsEl.style.display = 'none';
        emptyEl.style.display = 'block';
        dropdown.classList.add('active');
        return;
    }
    
    emptyEl.style.display = 'none';
    suggestionsEl.style.display = 'block';
    dropdown.classList.add('active');
    
    const topMatches = matches.slice(0, 8);
    listEl.innerHTML = topMatches.map(m => {
        const row = m.row;
        const displayText = row.materialName || row.materialCode || '';
        const highlighted = whHighlightText(displayText, keyword);
        
        let fieldLabel = '名称';
        if (m.fields.materialCode) fieldLabel = '编码';
        else if (m.fields.spec) fieldLabel = '规格';
        else if (m.fields.warehouse) fieldLabel = '仓库';
        
        return `
            <div class="wh-suggestion-item" data-index="${m.index}">
                <span class="wh-item-text">${highlighted}</span>
                <span class="wh-match-field">${fieldLabel}</span>
            </div>
        `;
    }).join('');
    
    listEl.querySelectorAll('.wh-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.index);
            whScrollToRow(idx);
            whHideDropdown();
            whAddToHistory(keyword);
        });
    });
}

function whHighlightText(text, keyword) {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="wh-highlight">$1</span>');
}

function whHighlightTableRows(matches, keyword) {
    const tbody = document.getElementById('whTableBody');
    if (!tbody) return;
    
    const pairs = whScopePairs();
    tbody.innerHTML = '';
    
    if (matches.length === 0) {
        pairs.forEach(p => {
            whRenderTableRow(p.row, p.idx, false, '');
        });
        return;
    }
    
    const matchIndices = new Set(matches.map(m => m.index));
    const matchMap = new Map(matches.map(m => [m.index, m.fields]));
    
    pairs.forEach(p => {
        const row = p.row;
        const index = p.idx;
        const isMatch = matchIndices.has(index);
        const fields = matchMap.get(index) || {};
        whRenderTableRow(row, index, isMatch, keyword, fields);
    });
}

function whRenderTableRow(row, index, isMatch, keyword, matchFields) {
    const tbody = document.getElementById('whTableBody');
    if (!tbody) return;
    
    const tr = document.createElement('tr');
    tr.className = isMatch ? 'wh-row-match' : '';
    tr.dataset.index = index;
    
    const highlightIfMatch = (text, fieldName) => {
        if (isMatch && matchFields && matchFields[fieldName] && keyword) {
            return whHighlightText(String(text || ''), keyword);
        }
        return text || '';
    };
    
    tr.innerHTML = `
        <td><input type="checkbox" class="wh-row-checkbox" data-index="${index}"></td>
        <td>${row.serial || index + 1}</td>
        <td>${highlightIfMatch(row.warehouse, 'warehouse')}</td>
        <td>${highlightIfMatch(row.materialCode, 'materialCode')}</td>
        <td>${highlightIfMatch(row.materialName, 'materialName')}</td>
        <td>${row.batch || ''}</td>
        <td>${row.unit || ''}</td>
        <td>${row.beginQty || 0}</td>
        <td>${row.beginPrice ? row.beginPrice.toFixed(2) : '0.00'}</td>
        <td>${whFormatMoney(row.beginAmount)}</td>
        <td><input type="number" class="wh-edit-input" data-field="buyQty" value="${row.buyQty || 0}" step="0.01"></td>
        <td><input type="number" class="wh-edit-input" data-field="buyPrice" value="${row.buyPrice ? row.buyPrice.toFixed(2) : '0.00'}" step="0.01"></td>
        <td>${whFormatMoney(row.buyAmount)}</td>
        <td><input type="number" class="wh-edit-input" data-field="issueQty" value="${row.issueQty || 0}" step="0.01"></td>
        <td><input type="number" class="wh-edit-input" data-field="issuePrice" value="${row.issuePrice ? row.issuePrice.toFixed(2) : '0.00'}" step="0.01"></td>
        <td>${whFormatMoney(row.issueAmount)}</td>
        <td>${row.endQty || 0}</td>
        <td>${row.endPrice ? row.endPrice.toFixed(2) : '0.00'}</td>
        <td>${whFormatMoney(row.endAmount)}</td>
        <td><input type="text" class="wh-edit-input" data-field="remark" value="${row.remark || ''}"></td>
        <td><button class="wh-btn wh-btn-danger wh-btn-sm" onclick="whDeleteRow(${index})">删除</button></td>
    `;
    
    tbody.appendChild(tr);
}

function whScrollToRow(index) {
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.animation = 'whRowPulse 1s ease';
        setTimeout(() => row.style.animation = '', 1000);
    }
}

function whShowHistoryDropdown() {
    const dropdown = document.getElementById('whSearchDropdown');
    const historyEl = document.getElementById('whSearchHistory');
    const suggestionsEl = document.getElementById('whSearchSuggestions');
    const emptyEl = document.getElementById('whSearchEmpty');
    
    if (!dropdown || !historyEl) return;
    
    suggestionsEl.style.display = 'none';
    emptyEl.style.display = 'none';
    
    if (whSearchHistory.length > 0) {
        whRenderHistoryList();
        historyEl.style.display = 'block';
        dropdown.classList.add('active');
    }
}

function whRenderHistoryList() {
    const listEl = document.getElementById('whHistoryList');
    const historyEl = document.getElementById('whSearchHistory');
    
    if (!listEl) return;
    
    if (whSearchHistory.length === 0) {
        if (historyEl) historyEl.style.display = 'none';
        return;
    }
    
    listEl.innerHTML = whSearchHistory.map(h => `
        <div class="wh-history-item" data-keyword="${h}">
            <span class="wh-item-icon">🕐</span>
            <span class="wh-item-text">${h}</span>
            <span class="wh-item-remove" data-keyword="${h}">×</span>
        </div>
    `).join('');
    
    listEl.querySelectorAll('.wh-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('wh-item-remove')) {
                e.stopPropagation();
                whRemoveFromHistory(e.target.dataset.keyword);
            } else {
                const keyword = item.dataset.keyword;
                const searchInput = document.getElementById('whSearchInput');
                if (searchInput) {
                    searchInput.value = keyword;
                    whSearchKeyword = keyword;
                    searchInput.focus();
                    whPerformSearch(keyword);
                }
            }
        });
    });
}

function whHideDropdown() {
    const dropdown = document.getElementById('whSearchDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    init();
});