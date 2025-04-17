/**
 * 工单管理系统脚本
 * 初始化图表、处理弹窗事件、表单提交等功能
 */

// 全局变量
let ticketChart; // 工单分类饼图实例
let trendChart; // 工单趋势图实例
const chartData = {
    type: {
        labels: ['设备故障', '系统维护', '巡检', '其他'],
        data: [35, 25, 20, 20],
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#6B7280']
    },
    priority: {
        labels: ['紧急', '高', '中', '低'],
        data: [15, 30, 35, 20], 
        colors: ['#DC2626', '#F59E0B', '#10B981', '#6B7280']
    },
    trend: {
        day: {
            labels: ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
            data: {
                pending: [2, 4, 3, 5, 4, 6, 3],
                processing: [1, 2, 4, 3, 5, 4, 2],
                completed: [0, 1, 2, 4, 3, 2, 1]
            }
        },
        week: {
            labels: ['6/10', '6/11', '6/12', '6/13', '6/14', '6/15', '6/16'],
            data: {
                pending: [3, 5, 4, 6, 5, 7, 4],
                processing: [2, 3, 5, 4, 6, 5, 3],
                completed: [1, 2, 3, 5, 4, 3, 2]
            }
        },
        month: {
            labels: ['5/15', '5/20', '5/25', '5/30', '6/5', '6/10', '6/15'],
            data: {
                pending: [8, 12, 10, 15, 13, 18, 24],
                processing: [5, 8, 13, 10, 15, 12, 18],
                completed: [3, 6, 9, 15, 12, 9, 6]
            }
        }
    }
};

// 模拟工单数据
const ticketData = {
    'TK-20230615-001': {
        status: '处理中',
        statusBadge: '<span class="status-badge status-warning">处理中</span>',
        assignee: '张工程师',
        description: '电池包 #B-12 温度异常，超过设定阈值。需要立即检查冷却系统和电池状态，防止安全事故。',
        records: [
            { type: '创建', user: '系统自动', time: '2023-06-15 14:35:22', content: '基于告警 ALM-20230615-001 自动创建工单', icon: 'plus', color: 'blue' },
            { type: '分配', user: '系统自动', time: '2023-06-15 14:36:05', content: '工单已分配给张工程师', icon: 'user-check', color: 'yellow' },
            { type: '开始处理', user: '张工程师', time: '2023-06-15 14:50:33', content: '已到达现场，开始检查冷却系统', icon: 'tools', color: 'green' }
        ],
        showAddRecord: true,
        showCompleteBtn: true
    },
    'TK-20230615-002': {
        status: '待处理',
        statusBadge: '<span class="status-badge status-info">待处理</span>',
        assignee: '李工程师',
        description: 'PCS #P-05 通信异常，需尽快排查。',
        records: [
            { type: '创建', user: '系统自动', time: '2023-06-15 15:12:45', content: '手动创建工单', icon: 'plus', color: 'blue' }
        ],
        showAddRecord: true,
        showCompleteBtn: false
    },
    'TK-20230614-005': {
        status: '已完成',
        statusBadge: '<span class="status-badge status-normal">已完成</span>',
        assignee: '王工程师',
        description: '全站巡检，未发现异常。',
        records: [
            { type: '创建', user: '系统自动', time: '2023-06-14 09:30:15', content: '巡检工单自动创建', icon: 'plus', color: 'blue' },
            { type: '完成', user: '王工程师', time: '2023-06-14 17:00:00', content: '巡检完成，无异常', icon: 'check', color: 'green' }
        ],
        showAddRecord: false,
        showCompleteBtn: false
    },
    'TK-20230614-003': {
        status: '已完成',
        statusBadge: '<span class="status-badge status-normal">已完成</span>',
        assignee: '赵工程师',
        description: 'BMS #BMS-03 软件升级。',
        records: [
            { type: '创建', user: '系统自动', time: '2023-06-14 11:45:33', content: '升级工单自动创建', icon: 'plus', color: 'blue' },
            { type: '完成', user: '赵工程师', time: '2023-06-14 13:00:00', content: '升级完成', icon: 'check', color: 'green' }
        ],
        showAddRecord: false,
        showCompleteBtn: false
    },
    'TK-20230613-008': {
        status: '超时',
        statusBadge: '<span class="status-badge status-critical">超时</span>',
        assignee: '未分配',
        description: 'PCS #P-02 设备异常，等待分配处理人。',
        records: [
            { type: '创建', user: '系统自动', time: '2023-06-13 16:20:45', content: '异常工单自动创建', icon: 'plus', color: 'blue' }
        ],
        showAddRecord: false,
        showCompleteBtn: false
    }
};

let currentActionType = null;
let currentTicketId = null;

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // --- 获取DOM元素 ---
    const createTicketModal = document.getElementById('create-ticket-modal');
    const ticketDetailModal = document.getElementById('ticket-detail-modal');
    const autoRuleModal = document.getElementById('auto-rule-modal');
    const addRuleModal = document.getElementById('add-rule-modal');
    const ticketTableBody = document.querySelector('.ticket-table tbody');
    const submitCreateBtn = document.getElementById('submit-create-btn');
    const saveRuleBtn = document.getElementById('save-rule-btn');
    const autoRuleTableBody = autoRuleModal ? autoRuleModal.querySelector('table tbody') : null;
    const ruleCountSpan = autoRuleModal ? autoRuleModal.querySelector('.text-sm.text-gray-500') : null;
    let editingRuleRow = null; // 跟踪正在编辑的行

    // 初始化图表
    initCharts();
    
    // 设置默认趋势视图为周
    const dayBtn = document.getElementById('trend-day-btn');
    const weekBtn = document.getElementById('trend-week-btn');
    if (dayBtn) dayBtn.className = 'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    if (weekBtn) weekBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded';
    
    // --- 绑定事件处理函数 ---
    
    // 侧边栏子菜单切换
    const batteryManagement = document.getElementById('battery-management');
    const batterySubmenu = document.getElementById('battery-submenu');
    const batteryChevron = document.getElementById('battery-chevron');

    if (batteryManagement && batterySubmenu && batteryChevron) {
        batteryManagement.addEventListener('click', function() {
            batterySubmenu.classList.toggle('open');
            batteryChevron.style.transform = batterySubmenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
        });
    }
    
    // 工单详情弹窗
    const viewButtons = document.querySelectorAll('.ticket-table .fa-eye');
    if (viewButtons.length > 0) {
        viewButtons.forEach(function(btn) {
            btn.parentElement.addEventListener('click', function() {
                const ticketIdMatch = this.getAttribute('onclick').match(/'([^']+)'/);
                if (ticketIdMatch && ticketIdMatch[1]) {
                    showTicketDetail(ticketIdMatch[1]);
                }
            });
        });
    }
    
    // 关闭工单详情弹窗
    const closeDetailModal = document.getElementById('close-detail-modal');
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', function() {
            const modal = document.getElementById('ticket-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    const closeDetailBtn = document.getElementById('close-detail-btn');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', function() {
            const modal = document.getElementById('ticket-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    // 检查URL哈希，如果是#create-ticket则打开创建工单弹窗
    if (window.location.hash === '#create-ticket') {
        const createTicketModal = document.getElementById('create-ticket-modal');
        if (createTicketModal) {
            createTicketModal.classList.remove('hidden');
        }
    }
    
    // 创建工单按钮
    const createTicketBtn = document.getElementById('create-ticket-btn');
    if (createTicketBtn) {
        createTicketBtn.addEventListener('click', function() {
            const createTicketModal = document.getElementById('create-ticket-modal');
            if (createTicketModal) {
                createTicketModal.classList.remove('hidden');
            }
        });
    }
    
    // 关闭创建工单弹窗
    const closeCreateModal = document.getElementById('close-create-modal');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    if (closeCreateModal) {
        closeCreateModal.addEventListener('click', function() {
            const createTicketModal = document.getElementById('create-ticket-modal');
            if (createTicketModal) {
                createTicketModal.classList.add('hidden');
                // 清除URL哈希
                if (window.location.hash === '#create-ticket') {
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                }
            }
        });
    }
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', function() {
            const createTicketModal = document.getElementById('create-ticket-modal');
            if (createTicketModal) {
                createTicketModal.classList.add('hidden');
                // 清除URL哈希
                if (window.location.hash === '#create-ticket') {
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                }
            }
        });
    }
    
    // 自动规则按钮
    const autoRuleBtn = document.getElementById('auto-rule-btn');
    if (autoRuleBtn) {
        autoRuleBtn.addEventListener('click', function() {
            const modal = document.getElementById('auto-rule-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        });
    }
    
    // 关闭自动规则弹窗
    const closeRuleModal = document.getElementById('close-rule-modal');
    if (closeRuleModal) {
        closeRuleModal.addEventListener('click', function() {
            const modal = document.getElementById('auto-rule-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    // 点击弹窗外部关闭弹窗
    if (ticketDetailModal) {
        ticketDetailModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    }
    
    if (createTicketModal) {
        createTicketModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
                // 清除URL哈希
                 if (window.location.hash === '#create-ticket') {
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                }
            }
        });
    }
    
    if (autoRuleModal) {
        autoRuleModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    }

    // 新增规则按钮
    const addRuleBtn = document.getElementById('add-rule-btn');
    if (addRuleBtn) {
        addRuleBtn.addEventListener('click', function() {
            const modal = document.getElementById('add-rule-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        });
    }

    // 关闭新增规则弹窗
    const closeAddRuleModal = document.getElementById('close-add-rule-modal');
    if (closeAddRuleModal) {
        closeAddRuleModal.addEventListener('click', function() {
            const modal = document.getElementById('add-rule-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }

    const cancelAddRuleBtn = document.getElementById('cancel-add-rule-btn');
    if (cancelAddRuleBtn) {
        cancelAddRuleBtn.addEventListener('click', function() {
            const modal = document.getElementById('add-rule-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // 触发类型切换事件
    const triggerTypeSelect = document.getElementById('trigger-type-select');
    if (triggerTypeSelect) {
        triggerTypeSelect.addEventListener('change', function() {
            const alarmConditions = document.getElementById('alarm-conditions');
            const scheduledConditions = document.getElementById('scheduled-conditions');

            if(!alarmConditions || !scheduledConditions) return; // Exit if elements not found

            if (this.value === 'alarm') {
                alarmConditions.classList.remove('hidden');
                scheduledConditions.classList.add('hidden');
            } else if (this.value === 'scheduled') {
                alarmConditions.classList.add('hidden');
                scheduledConditions.classList.remove('hidden');
                 // Also trigger schedule type change to ensure its sub-options are correct
                 const scheduleType = document.getElementById('schedule-type');
                 if(scheduleType) scheduleType.dispatchEvent(new Event('change'));
            } else {
                 // Hide both if nothing selected (or default)
                 alarmConditions.classList.add('hidden');
                 scheduledConditions.classList.add('hidden');
            }
        });
         // Initial call to set correct visibility based on default value
         triggerTypeSelect.dispatchEvent(new Event('change'));
    }
    
    // 定时触发周期类型切换事件
    const scheduleTypeSelect = document.getElementById('schedule-type');
    if (scheduleTypeSelect) {
        scheduleTypeSelect.addEventListener('change', function() {
            const weeklyOption = document.getElementById('weekly-option');
            const monthlyOption = document.getElementById('monthly-option');
            const yearlyOption = document.getElementById('yearly-option');

            if (!weeklyOption || !monthlyOption || !yearlyOption) return; // Exit if elements not found

            // Hide all options first
            weeklyOption.classList.add('hidden');
            monthlyOption.classList.add('hidden');
            yearlyOption.classList.add('hidden');

            // Show the selected one
            if (this.value === 'weekly') {
                weeklyOption.classList.remove('hidden');
            } else if (this.value === 'monthly') {
                monthlyOption.classList.remove('hidden');
            } else if (this.value === 'yearly') {
                yearlyOption.classList.remove('hidden');
            }
        });
         // Initial call to set correct visibility based on default value
         scheduleTypeSelect.dispatchEvent(new Event('change'));
    }

    // 根据屏幕大小调整布局
    adjustLayout();

    // 为筛选条件添加实时筛选功能
    const filterElements = [
        document.getElementById('ticket-search'),
        document.getElementById('filter-site'),
        document.getElementById('filter-type'),
        document.getElementById('filter-priority'),
        document.getElementById('filter-status'),
        document.getElementById('filter-date')
    ];
    
    filterElements.forEach(element => {
        if (element) {
            if (element.tagName === 'INPUT') {
                element.addEventListener('input', applyFilters);
            } else {
                element.addEventListener('change', applyFilters);
            }
        }
    });
});

/**
 * 初始化所有图表
 */
function initCharts() {
    // 防止重复初始化
    if (window.chartsInitialized) {
        return;
    }
    
    try {
    // 工单趋势图
    const trendCtx = document.getElementById('ticketTrendChart');
    if (trendCtx) {
            trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: chartData.trend.week.labels,
                datasets: [
                    {
                        label: '待处理',
                        data: chartData.trend.week.data.pending,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '处理中',
                        data: chartData.trend.week.data.processing,
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '已完成',
                        data: chartData.trend.week.data.completed,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 10 // 增加图例间距
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                             padding: 5 // X轴标签内边距
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                         ticks: {
                             padding: 5 // Y轴标签内边距
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 5, // 图表顶部留白
                        bottom: 5 // 图表底部留白
                    }
                }
            }
        });
    }
    
    // 工单分类饼图
    const categoryCtx = document.getElementById('ticketCategoryChart');
    if (categoryCtx) {
            ticketChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                    labels: chartData.type.labels,
                datasets: [{
                        data: chartData.type.data,
                        backgroundColor: chartData.type.colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 15 // 增加图例间距
                        }
                    }
                },
                cutout: '70%'
            }
        });
        }
        
        // 标记图表已初始化
        window.chartsInitialized = true;
    } catch (error) {
        console.error('初始化图表时出错:', error);
    }
}

/**
 * 工单分类饼图视图切换
 */
function switchChartView(view) {
    document.getElementById('typeBtn').className = view === 'type' ? 
        'px-3 py-1 text-xs bg-blue-500 text-white rounded' : 
        'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    document.getElementById('priorityBtn').className = view === 'priority' ? 
        'px-3 py-1 text-xs bg-blue-500 text-white rounded' : 
        'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    
    updateChart(view);
}

/**
 * 更新图表数据
 */
function updateChart(view) {
    // 安全检查
    if (!ticketChart) {
        initCharts();
        if (!ticketChart) {
            return;
        }
    }
    
    try {
        const data = chartData[view];
        ticketChart.data.labels = data.labels;
        ticketChart.data.datasets[0].data = data.data;
        ticketChart.data.datasets[0].backgroundColor = data.colors;
        ticketChart.update();
    } catch (error) {
        console.error('更新图表时出错:', error);
    }
}

/**
 * 响应式布局调整
 */
function adjustLayout() {
    const width = window.innerWidth;
    const contentContainer = document.querySelector('.content-container');
    const sidebar = document.getElementById('sidebar');
    
    if (contentContainer && sidebar) {
        if (width < 768) {
            contentContainer.style.left = '0';
            sidebar.classList.add('hidden');
        } else {
            contentContainer.style.left = '240px';
            sidebar.classList.remove('hidden');
        }
    }
}

/**
 * 工单详情弹窗
 */
function showTicketDetail(ticketId, actionType) {
    const modal = document.getElementById('ticket-detail-modal');
    const ticketIdElement = document.getElementById('detail-ticket-id');
    if (!modal || !ticketIdElement) return;
    ticketIdElement.textContent = ticketId;
    currentActionType = actionType || 'view';
    currentTicketId = ticketId;

    // 获取工单数据
    const data = ticketData[ticketId];
    if (!data) return;

    // 状态
    const statusEl = document.getElementById('detail-ticket-status');
    if (statusEl) statusEl.outerHTML = data.statusBadge;
    // 处理人
    const assigneeEl = document.getElementById('detail-ticket-assignee');
    if (assigneeEl) assigneeEl.textContent = data.assignee;
    // 描述
    const descEl = document.getElementById('detail-ticket-desc');
    if (descEl) descEl.textContent = data.description;
    // 处理记录区块显示/隐藏（设备类型工单不显示）
    const typeEl = Array.from(modal.querySelectorAll('div.mb-4 h4')).find(h4 => h4.textContent.includes('工单类型'))?.nextElementSibling;
    const recordBlock = Array.from(modal.querySelectorAll('h4.text-sm.font-medium')).find(h4 => h4.textContent.includes('处理记录'))?.parentElement;
    if (typeEl && recordBlock) {
        if (typeEl.textContent.trim() === '设备') {
            recordBlock.style.display = 'none';
        } else {
            recordBlock.style.display = '';
        }
    }
    // 处理记录内容根据工单状态动态渲染（已完成、处理中、待处理、未分配等显示不同步骤）
    if (recordBlock && recordBlock.style.display !== 'none') {
        recordBlock.querySelector('.relative').innerHTML = '<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>' +
            data.records.map(r => `
            <div class="relative pl-10 pb-6">
                <div class="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-${r.color}-500 text-white flex items-center justify-center">
                    <i class="fas fa-${r.icon}"></i>
                </div>
                <div>
                    <p class="text-sm font-medium">${r.type}</p>
                    <p class="text-xs text-gray-500">${r.user} · ${r.time}</p>
                    <p class="text-sm mt-1">${r.content}</p>
                </div>
            </div>`).join('');
    }
    // "添加处理记录"区块显示/隐藏
    const addRecordBlock = Array.from(modal.querySelectorAll('h4.text-sm.font-medium')).find(h4 => h4.textContent.includes('添加处理记录'))?.parentElement;
    if (addRecordBlock) addRecordBlock.style.display = data.showAddRecord ? '' : 'none';
    // "完成工单"按钮显示/隐藏
    const completeBtn = document.getElementById('handle-ticket-btn');
    if (completeBtn) completeBtn.style.display = data.showCompleteBtn ? '' : 'none';
    // "导出报告"按钮显示/隐藏（仅已完成状态显示）
    const exportBtn = Array.from(modal.querySelectorAll('button')).find(btn => btn.innerText.includes('导出报告'));
    if (exportBtn) exportBtn.style.display = (data.status === '已完成') ? '' : 'none';
    // "开始处理"按钮显示/隐藏（仅待处理状态显示）
    const startBtn = document.getElementById('start-process-btn');
    if (startBtn) startBtn.style.display = (data.status === '待处理') ? '' : 'none';
    // "分配人员"按钮显示/隐藏（仅超时状态显示）
    const assignBtn = document.getElementById('assign-person-btn');
    if (assignBtn) assignBtn.style.display = (data.status === '超时') ? '' : 'none';

    modal.classList.remove('hidden');
}

// 操作确认弹窗逻辑
const actionConfirmModal = document.getElementById('action-confirm-modal');
const actionConfirmBtn = document.getElementById('action-confirm-btn');
const actionCancelBtn = document.getElementById('action-cancel-btn');
const actionConfirmText = document.getElementById('action-confirm-text');

function showActionConfirm(text, onConfirm) {
    if (actionConfirmModal && actionConfirmText) {
        actionConfirmText.textContent = text;
        actionConfirmModal.classList.remove('hidden');
        actionConfirmBtn.onclick = function() {
            actionConfirmModal.classList.add('hidden');
            if (onConfirm) onConfirm();
        };
        actionCancelBtn.onclick = function() {
            actionConfirmModal.classList.add('hidden');
        };
    }
}

// 拦截"完成工单""开始处理"按钮点击
window.addEventListener('DOMContentLoaded', function() {
    const completeBtn = document.getElementById('handle-ticket-btn');
    if (completeBtn) {
        completeBtn.onclick = function(e) {
            e.preventDefault();
            showActionConfirm('确定要完成该工单吗？', function() {
                // 这里可添加完成工单的实际逻辑
                alert('工单已完成！');
                document.getElementById('ticket-detail-modal').classList.add('hidden');
            });
        };
    }
    const startBtn = document.getElementById('start-process-btn');
    if (startBtn) {
        startBtn.onclick = function(e) {
            e.preventDefault();
            showActionConfirm('确定要开始处理该工单吗？', function() {
                // 这里可添加开始处理的实际逻辑
                alert('工单已进入处理中！');
                document.getElementById('ticket-detail-modal').classList.add('hidden');
            });
        };
    }
});

// 分配人员弹窗逻辑
const assignPersonModal = document.getElementById('assign-person-modal');
const assignPersonBtn = document.getElementById('assign-person-btn');
const assignCancelBtn = document.getElementById('assign-cancel-btn');
const assignConfirmBtn = document.getElementById('assign-confirm-btn');
const assignPersonSelect = document.getElementById('assign-person-select');

if (assignPersonBtn) {
    assignPersonBtn.onclick = function(e) {
        e.preventDefault();
        if (assignPersonModal) assignPersonModal.classList.remove('hidden');
    };
}
if (assignCancelBtn) {
    assignCancelBtn.onclick = function() {
        if (assignPersonModal) assignPersonModal.classList.add('hidden');
    };
}
if (assignConfirmBtn) {
    assignConfirmBtn.onclick = function() {
        const val = assignPersonSelect.value;
        if (!val) {
            alert('请选择处理人！');
            return;
        }
        alert('已分配给：' + val);
        if (assignPersonModal) assignPersonModal.classList.add('hidden');
        document.getElementById('ticket-detail-modal').classList.add('hidden');
    };
}

// 注册窗口大小变化事件
window.addEventListener('load', adjustLayout);
window.addEventListener('resize', adjustLayout);

/**
 * 工单趋势图时间范围切换
 */
function switchTrendView(range) {
    // 通过ID获取按钮
    const dayBtn = document.getElementById('trend-day-btn');
    const weekBtn = document.getElementById('trend-week-btn');
    const monthBtn = document.getElementById('trend-month-btn');
    
    // 重置所有按钮样式
    if (dayBtn) dayBtn.className = 'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    if (weekBtn) weekBtn.className = 'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    if (monthBtn) monthBtn.className = 'px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded';
    
    // 设置当前激活按钮样式
    if (range === 'day' && dayBtn) dayBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded';
    if (range === 'week' && weekBtn) weekBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded';
    if (range === 'month' && monthBtn) monthBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded';
    
    updateTrendChart(range);
}

/**
 * 更新趋势图数据
 */
function updateTrendChart(range) {
    // 安全检查
    if (!trendChart) {
        initCharts();
        if (!trendChart) return;
    }
    
    try {
        const data = chartData.trend[range];
        trendChart.data.labels = data.labels;
        trendChart.data.datasets[0].data = data.data.pending;
        trendChart.data.datasets[1].data = data.data.processing;
        trendChart.data.datasets[2].data = data.data.completed;
        trendChart.update();
    } catch (error) {
        console.error('更新趋势图时出错:', error);
    }
}

/**
 * 应用筛选条件
 */
function applyFilters() {
    const searchText = document.getElementById('ticket-search').value.toLowerCase();
    const siteFilter = document.getElementById('filter-site').value;
    const typeFilter = document.getElementById('filter-type').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    const statusFilter = document.getElementById('filter-status').value;
    const dateFilter = document.getElementById('filter-date').value;
    
    // 获取表格中的所有行（跳过表头）
    const rows = document.querySelectorAll('.ticket-table tbody tr');
    
    rows.forEach(row => {
        const ticketId = row.cells[0].textContent.trim();
        const alarmText = row.cells[1].textContent.trim();
        const type = row.cells[2].textContent.trim();
        const site = row.cells[3].textContent.trim();
        const device = row.cells[4].textContent.trim();
        const priority = row.querySelector('.status-badge').textContent.trim();
        const status = row.cells[6].querySelector('.status-badge').textContent.trim();
        const createDate = row.cells[7].textContent.trim();
        const assignee = row.cells[8].textContent.trim();
        
        // 所有字段的组合文本用于搜索匹配
        const allText = `${ticketId} ${alarmText} ${type} ${site} ${device} ${priority} ${status} ${createDate} ${assignee}`.toLowerCase();
        
        // 检查每个筛选条件
        let matchesSearch = searchText === '' || allText.includes(searchText);
        let matchesSite = siteFilter === '' || site === siteFilter;
        let matchesType = typeFilter === '' || type === typeFilter;
        let matchesPriority = priorityFilter === '' || priority === priorityFilter;
        let matchesStatus = statusFilter === '' || status === statusFilter;
        
        // 日期筛选 (格式化为YYYY-MM-DD进行比较)
        let matchesDate = true;
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            const rowDateParts = createDate.split(' ')[0].split('-');
            const rowDate = new Date(`${rowDateParts[0]}-${rowDateParts[1]}-${rowDateParts[2]}`);
            matchesDate = filterDate.toDateString() === rowDate.toDateString();
        }
        
        // 所有条件都匹配时显示行
        if (matchesSearch && matchesSite && matchesType && matchesPriority && matchesStatus && matchesDate) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // 更新显示统计
    updateVisibleCount();
}

/**
 * 重置所有筛选条件
 */
function resetFilters() {
    // 重置搜索框和所有下拉选择框
    document.getElementById('ticket-search').value = '';
    document.getElementById('filter-site').selectedIndex = 0;
    document.getElementById('filter-type').selectedIndex = 0;
    document.getElementById('filter-priority').selectedIndex = 0;
    document.getElementById('filter-status').selectedIndex = 0;
    document.getElementById('filter-date').value = '';
    
    // 显示所有行
    const rows = document.querySelectorAll('.ticket-table tbody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
    
    // 更新显示统计
    updateVisibleCount();
}

/**
 * 更新显示的工单数统计
 */
function updateVisibleCount() {
    const totalRows = document.querySelectorAll('.ticket-table tbody tr').length;
    const visibleRows = document.querySelectorAll('.ticket-table tbody tr:not([style*="display: none"])').length;
    const countText = document.querySelector('.text-sm.text-gray-500');
    
    if (countText) {
        countText.textContent = `显示 1 至 ${visibleRows} 条，共 ${totalRows} 条`;
    }
} 