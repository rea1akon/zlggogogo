function calculateRetirementDate(birthDate, gender, position) {
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
        const cadrePositions = ['片所本级人员', '考核员'];
        if (position && cadrePositions.includes(position)) {
            baseRetirementAge = 55;
            targetRetirementAge = 58;
            delayMonthsPerStep = 1;
            stepMonths = 4;
        } else {
            baseRetirementAge = 50;
            targetRetirementAge = 55;
            delayMonthsPerStep = 1;
            stepMonths = 2;
        }
    }
    
    const originalRetirementDate = new Date(birth);
    originalRetirementDate.setFullYear(birth.getFullYear() + baseRetirementAge);
    
    const policyStartDate = new Date(POLICY_START_YEAR, POLICY_START_MONTH - 1, 1);
    
    if (originalRetirementDate < policyStartDate) {
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
    
    const year = retirementDate.getFullYear();
    const month = retirementDate.getMonth();
    const lastDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
    
    return `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
}

function assert(actual, expected, testName) {
    const status = actual === expected ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${testName}`);
    if (actual !== expected) {
        console.log(`  期望: ${expected}`);
        console.log(`  实际: ${actual}`);
    }
}

console.log('======== 退休年龄计算逻辑验证 ========');
console.log('');

// ===== 男职工测试 =====
console.log('--- 男职工 (60→63, 每4个月延迟1个月) ---');

// 政策前已退休
assert(calculateRetirementDate('1964-06-15', '男', '驾驶员'), '2024-06-30', '男 1964年生，政策前退休');

// 政策开始时
assert(calculateRetirementDate('1965-01-15', '男', '驾驶员'), '2025-01-31', '男 1965-01出生，政策开始时，延迟0月');

// 延迟1个月（4个月后）
assert(calculateRetirementDate('1965-05-15', '男', '驾驶员'), '2025-06-30', '男 1965-05出生，延迟1个月');

// 延迟2个月（8个月后）
assert(calculateRetirementDate('1965-09-15', '男', '驾驶员'), '2025-11-30', '男 1965-09出生，延迟2个月');

// 延迟15个月
assert(calculateRetirementDate('1970-01-15', '男', '驾驶员'), '2031-04-30', '男 1970-01出生，延迟15个月');

// 延迟30个月
assert(calculateRetirementDate('1975-01-15', '男', '驾驶员'), '2037-07-31', '男 1975-01出生，延迟30个月');

// 封顶36个月
assert(calculateRetirementDate('1980-01-15', '男', '驾驶员'), '2043-01-31', '男 1980-01出生，封顶延迟36个月');

// 封顶36个月 - 更晚出生
assert(calculateRetirementDate('1990-01-15', '男', '驾驶员'), '2053-01-31', '男 1990-01出生，封顶延迟36个月');

console.log('');

// ===== 女工人测试 =====
console.log('--- 女工人 (50→55, 每2个月延迟1个月) ---');

// 政策前已退休
assert(calculateRetirementDate('1974-06-15', '女', '环卫作业人员'), '2024-06-30', '女工人 1974年生，政策前退休');

// 政策开始时
assert(calculateRetirementDate('1975-01-15', '女', '环卫作业人员'), '2025-01-31', '女工人 1975-01出生，政策开始时，延迟0月');

// 延迟1个月（2个月后）
assert(calculateRetirementDate('1975-03-15', '女', '环卫作业人员'), '2025-04-30', '女工人 1975-03出生，延迟1个月');

// 延迟2个月（4个月后）
assert(calculateRetirementDate('1975-05-15', '女', '环卫作业人员'), '2025-07-31', '女工人 1975-05出生，延迟2个月');

// 延迟3个月（6个月后）
assert(calculateRetirementDate('1975-07-15', '女', '环卫作业人员'), '2025-10-31', '女工人 1975-07出生，延迟3个月');

// 延迟30个月
assert(calculateRetirementDate('1980-01-15', '女', '环卫作业人员'), '2032-07-31', '女工人 1980-01出生，延迟30个月');

// 封顶60个月
assert(calculateRetirementDate('1985-01-15', '女', '环卫作业人员'), '2040-01-31', '女工人 1985-01出生，封顶延迟60个月');

// 封顶60个月 - 更晚出生
assert(calculateRetirementDate('1995-01-15', '女', '环卫作业人员'), '2050-01-31', '女工人 1995-01出生，封顶延迟60个月');

console.log('');

// ===== 女干部测试 =====
console.log('--- 女干部 (55→58, 每4个月延迟1个月) ---');

// 政策前已退休
assert(calculateRetirementDate('1969-06-15', '女', '片所本级人员'), '2024-06-30', '女干部 1969年生，政策前退休');

// 政策开始时
assert(calculateRetirementDate('1970-01-15', '女', '考核员'), '2025-01-31', '女干部 1970-01出生，政策开始时，延迟0月');

// 延迟1个月（4个月后）
assert(calculateRetirementDate('1970-05-15', '女', '片所本级人员'), '2025-06-30', '女干部 1970-05出生，延迟1个月');

// 延迟2个月（8个月后）
assert(calculateRetirementDate('1970-09-15', '女', '考核员'), '2025-11-30', '女干部 1970-09出生，延迟2个月');

// 延迟15个月
assert(calculateRetirementDate('1975-01-15', '女', '考核员'), '2031-04-30', '女干部 1975-01出生，延迟15个月');

// 封顶36个月
assert(calculateRetirementDate('1980-01-15', '女', '片所本级人员'), '2038-01-31', '女干部 1980-01出生，封顶延迟36个月');

console.log('');

// ===== 月末边界测试 =====
console.log('--- 月末边界测试 ---');

// 1月31日生日，1月有31天
assert(calculateRetirementDate('1965-01-31', '男', '驾驶员'), '2025-01-31', '月末边界：1月31日生日');

// 2月平年28天
assert(calculateRetirementDate('1975-02-10', '女', '环卫作业人员'), '2025-02-28', '月末边界：2月平年28天');

// 跨年延迟
assert(calculateRetirementDate('1965-12-01', '男', '驾驶员'), '2026-02-28', '月末边界：跨年延迟11个月→2026年2月28日');

// 4月只有30天
assert(calculateRetirementDate('1965-04-15', '男', '驾驶员'), '2025-04-30', '月末边界：4月30天');

// 2月闰年29天
assert(calculateRetirementDate('1965-02-10', '男', '驾驶员'), '2025-02-28', '月末边界：2025年2月平年28天');

console.log('');
console.log('======== 测试完成 ========');