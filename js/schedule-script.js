const { createApp, ref, computed, watch, onMounted } = Vue;

// 工单管理应用
createApp({
  setup() {
    // --- 工单图表数据 ---
    const chartData = ref({
      type: {
        labels: ['设备故障', '系统维护', '巡检', '其他'],
        data: [35, 25, 20, 20],
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#6B7280']
      },
      priority: {
        labels: ['紧急', '高', '中', '低'],
        data: [15, 30, 35, 20],
        colors: ['#DC2626', '#F59E0B', '#10B981', '#6B7280']
      }
    });

    const currentChartView = ref('type');
    const ticketChart = ref(null);

    // --- 工单列表数据 ---
    const tickets = ref([
      {
        id: 'TK-20230615-001',
        alarmId: 'ALM-20230615-001',
        type: '设备故障',
        site: '北京朝阳储能电站',
        device: '电池包 #B-12',
        priority: '紧急',
        status: '处理中',
        createTime: '2023-06-15 14:35:22',
        handler: '张工程师'
      },
      // ... 其他工单数据
    ]);

    // --- 方法 ---
    const switchChartView = (view) => {
      currentChartView.value = view;
      updateChart(view);
    };

    const updateChart = (view) => {
      if (!ticketChart.value) return;
      
      const data = chartData.value[view];
      ticketChart.value.data.labels = data.labels;
      ticketChart.value.data.datasets[0].data = data.data;
      ticketChart.value.data.datasets[0].backgroundColor = data.colors;
      ticketChart.value.update();
    };

    const initCharts = () => {
      const ctx = document.getElementById('ticketCategoryChart').getContext('2d');
      ticketChart.value = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: chartData.value.type.labels,
          datasets: [{
            data: chartData.value.type.data,
            backgroundColor: chartData.value.type.colors,
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
                padding: 20,
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    };

    // --- 生命周期钩子 ---
    onMounted(() => {
      initCharts();
    });

    return {
      chartData,
      currentChartView,
      tickets,
      switchChartView
    };
  }
}).mount('#order-app');

// 原有的调度日历应用
createApp({
  setup() {
    // --- Reactive Data ---
    const isStrategyModalVisible = ref(false);
    const activeStrategyTab = ref('peak'); // 'peak' or 'normal'
    const currentDate = new Date();
    const selectedYear = ref(currentDate.getFullYear());
    const selectedMonth = ref(currentDate.getMonth() + 1); // 1-12
    const calendarDays = ref([]);
    const years = computed(() => { // Generate year options, e.g., past 5 and next 5 years
        const current = new Date().getFullYear();
        const range = 5;
        const opts = [];
        for (let i = current + range; i >= current - range; i--) {
            opts.push(i);
        }
        return opts;
    });
    const months = ref([ // Month options
        { value: 1, text: '1月' }, { value: 2, text: '2月' }, { value: 3, text: '3月' },
        { value: 4, text: '4月' }, { value: 5, text: '5月' }, { value: 6, text: '6月' },
        { value: 7, text: '7月' }, { value: 8, text: '8月' }, { value: 9, text: '9月' },
        { value: 10, text: '10月' }, { value: 11, text: '11月' }, { value: 12, text: '12月' }
    ]);

    // --- Methods ---
    const showStrategyModal = () => { isStrategyModalVisible.value = true; };
    const closeStrategyModal = () => { isStrategyModalVisible.value = false; };
    const setActiveStrategyTab = (tab) => { activeStrategyTab.value = tab; };

    const generateCalendar = (year, month) => {
      calendarDays.value = [];
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      const lastDayOfPrevMonth = new Date(year, month - 1, 0);

      const daysInMonth = lastDayOfMonth.getDate();
      const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
      const prevMonthDaysToShow = startDayOfWeek; // Number of days from prev month
      const totalCells = 42; // 6 rows * 7 columns

      // 1. Add days from previous month
      for (let i = prevMonthDaysToShow - 1; i >= 0; i--) {
        const day = lastDayOfPrevMonth.getDate() - i;
        const date = new Date(year, month - 2, day); // month-2 because month is 1-indexed
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`; // Generate YYYY-MM-DD
        calendarDays.value.push({
          dayOfMonth: day,
          isCurrentMonth: false,
          isToday: false,
          fullDateString: date.toLocaleDateString('zh-CN'),
          dateStr: dateStr, // Add YYYY-MM-DD format
          strategy: null // Placeholder for strategy data
        });
      }

      // 2. Add days from current month
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`; // Already calculated
        const isToday = (dateStr === todayStr);
        // Placeholder: Fetch or determine strategy based on dateStr
        let strategyText = null;
        if (day % 5 === 0) strategyText = '广东地区尖峰策略'; // Example strategy
        if (day % 7 === 0) strategyText = '广东地区平时策略'; // Example strategy

        calendarDays.value.push({
          dayOfMonth: day,
          isCurrentMonth: true,
          isToday: isToday,
          fullDateString: date.toLocaleDateString('zh-CN'),
          dateStr: dateStr, // Add YYYY-MM-DD format
           strategy: strategyText // Placeholder
        });
      }

      // 3. Add days from next month
      const daysRendered = calendarDays.value.length;
      const nextMonthDaysToShow = totalCells - daysRendered;
      for (let day = 1; day <= nextMonthDaysToShow; day++) {
        const date = new Date(year, month, day); // month is correct here (next month)
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`; // Generate YYYY-MM-DD
        calendarDays.value.push({
          dayOfMonth: day,
          isCurrentMonth: false,
          isToday: false,
           fullDateString: date.toLocaleDateString('zh-CN'),
           dateStr: dateStr, // Add YYYY-MM-DD format
           strategy: null // Placeholder
        });
      }
      // Here you might fetch actual strategy data for the visible range
    };

    const updateCalendar = () => {
        generateCalendar(selectedYear.value, selectedMonth.value);
    };

    const previousMonth = () => {
      if (selectedMonth.value === 1) {
        selectedMonth.value = 12;
        selectedYear.value--;
      } else {
        selectedMonth.value--;
      }
      // Watcher will trigger updateCalendar
    };

    const nextMonth = () => {
      if (selectedMonth.value === 12) {
        selectedMonth.value = 1;
        selectedYear.value++;
      } else {
        selectedMonth.value++;
      }
       // Watcher will trigger updateCalendar
    };

    const goToToday = () => {
        const today = new Date();
        selectedYear.value = today.getFullYear();
        selectedMonth.value = today.getMonth() + 1;
        // Watcher will trigger updateCalendar
    };

    // Watch for changes in year or month to regenerate calendar
    watch([selectedYear, selectedMonth], updateCalendar);

    // --- Sidebar Menu Logic (Keep as is for now) ---
     const toggleSubmenu = (submenuId, chevronId) => {
         const submenu = document.getElementById(submenuId);
         const chevron = document.getElementById(chevronId);
         if (submenu && chevron) {
             submenu.classList.toggle('open');
             chevron.classList.toggle('rotate-180');
         }
     };

    // --- Lifecycle Hooks ---
    onMounted(() => {
      generateCalendar(selectedYear.value, selectedMonth.value); // Initial calendar generation

      // Sidebar listener
       const batteryManagement = document.getElementById('battery-management');
       if (batteryManagement) {
           batteryManagement.addEventListener('click', () => {
               toggleSubmenu('battery-submenu', 'battery-chevron');
           });
       }
    });

    // --- Return reactive state and methods ---
    return {
      isStrategyModalVisible,
      activeStrategyTab,
      selectedYear,
      selectedMonth,
      calendarDays,
      years,
      months,
      showStrategyModal,
      closeStrategyModal,
      setActiveStrategyTab,
      previousMonth,
      nextMonth,
      goToToday
    };
  }
}).mount('#app');
