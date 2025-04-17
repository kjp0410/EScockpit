const { createApp, ref, computed, onMounted } = Vue;
createApp({
  setup() {
    const isMobile = ref(window.innerWidth <= 1024);
    const sidebarOpen = ref(false);
    const efficiencyDays = ref(7);
    const powerDays = ref(1);
    const today = new Date();
    const efficiencyLabels = computed(() => {
      const days = efficiencyDays.value;
      return Array.from({length: days}, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return `${d.getMonth()+1}/${d.getDate()}`;
      });
    });
    const efficiencyData = computed(() => {
      return Array.from({length: efficiencyDays.value}, () => 96 + Math.random() * 2);
    });
    const powerLabels = computed(() => {
      if (powerDays.value === 1) {
        return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      } else {
        const days = powerDays.value;
        return Array.from({length: days}, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (days - 1 - i));
          return `${d.getMonth()+1}/${d.getDate()}`;
        });
      }
    });
    const powerData = computed(() => {
      if (powerDays.value === 1) {
        return [200, 350, 500, 450, 380, 250].map(d => d + Math.random() * 10);
      } else {
        return Array.from({length: powerDays.value}, () => 200 + Math.random() * 400);
      }
    });
    const handleResize = () => {
      isMobile.value = window.innerWidth <= 1024;
      if (!isMobile.value) sidebarOpen.value = false;
    };
    const setEfficiencyDays = days => {
      efficiencyDays.value = days;
      if (window.efficiencyChartInstance) {
        window.efficiencyChartInstance.data.labels = efficiencyLabels.value;
        window.efficiencyChartInstance.data.datasets[0].data = efficiencyData.value;
        window.efficiencyChartInstance.update();
      }
    };
    const setPowerDays = days => {
      powerDays.value = days;
      if (window.powerChartInstance) {
        window.powerChartInstance.data.labels = powerLabels.value;
        window.powerChartInstance.data.datasets[0].data = powerData.value;
        window.powerChartInstance.update();
      }
    };
    onMounted(() => {
      window.addEventListener('resize', handleResize);
      handleResize();
      // 初始化图表
      setTimeout(() => {
        const powerChartElement = document.getElementById('powerChart');
        if (powerChartElement) {
          const powerCtx = powerChartElement.getContext('2d');
          if (powerCtx) {
            if (window.powerChartInstance) { window.powerChartInstance.destroy(); }
            window.powerChartInstance = new Chart(powerCtx, {
              type: 'line',
              data: {
                labels: powerLabels.value,
                datasets: [{
                  label: '功率输出',
                  data: powerData.value,
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  tension: 0.4,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }
            });
          }
        }
        const efficiencyChartElement = document.getElementById('efficiencyChart');
        if (efficiencyChartElement) {
          const efficiencyCtx = efficiencyChartElement.getContext('2d');
          if (efficiencyCtx) {
            if (window.efficiencyChartInstance) { window.efficiencyChartInstance.destroy(); }
            window.efficiencyChartInstance = new Chart(efficiencyCtx, {
              type: 'line',
              data: {
                labels: efficiencyLabels.value,
                datasets: [{
                  label: 'PCS效率',
                  data: efficiencyData.value,
                  borderColor: '#4F46E5',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  tension: 0.4,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 80, max: 100 } }
              }
            });
          }
        }
      }, 300);
    });
    return { isMobile, sidebarOpen, setEfficiencyDays, efficiencyDays, powerDays, setPowerDays };
  }
}).mount('#app');
