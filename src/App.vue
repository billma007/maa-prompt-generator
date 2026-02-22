<script setup lang="ts">
import { ref, watch } from 'vue';
import { TASK_TYPES, type Task, type TaskType } from './types.ts';

// Simple ID generator
let idCounter = 0;
const tasks = ref<Task[]>([]);
const configName = ref('');
const promptResult = ref('');
const resultVisible = ref(false);

const addTask = (type: TaskType) => {
  const currentTasks = tasks.value;
  const closeIndex = currentTasks.findIndex(t => t.type === 'Close');
  
  if (type === 'Close') {
    if (closeIndex !== -1) {
      alert('“关闭游戏”任务已存在！');
      return;
    }
  }

  const newTask: Task = {
    id: String(idCounter++),
    type,
    settings: getDefaultSettings(type),
  };

  if (closeIndex !== -1) {
    // Insert before Close
    currentTasks.splice(closeIndex, 0, newTask);
  } else {
    currentTasks.push(newTask);
  }
};

const removeTask = (index: number) => {
  tasks.value.splice(index, 1);
};

const moveTask = (index: number, direction: 'up' | 'down') => {
  const currentTasks = tasks.value;
  // If moving the Close task, prevent it (it's pinned to bottom)
  if (currentTasks[index]?.type === 'Close') return;

  if (direction === 'up' && index > 0) {
    const temp = currentTasks[index] as Task;
    currentTasks[index] = currentTasks[index - 1] as Task;
    currentTasks[index - 1] = temp;
  } else if (direction === 'down' && index < currentTasks.length - 1) {
    // Prevent moving below Close
    if (currentTasks[index + 1]?.type === 'Close') return;

    const temp = currentTasks[index] as Task;
    currentTasks[index] = currentTasks[index + 1] as Task;
    currentTasks[index + 1] = temp;
  }
};

// Enforce "Close Game" task to be single and always at the end
watch(tasks, (newVal) => {
    const closeIndices: number[] = [];
    newVal.forEach((t, i) => { 
        if (t.type === 'Close') closeIndices.push(i);
    });

    if (closeIndices.length > 0) {
        // Remove duplicates if any (keep the last added one usually, or first? Let's keep first found)
        if (closeIndices.length > 1) {
            // Remove all except the first one found
            for (let i = closeIndices.length - 1; i > 0; i--) {
                const idx = closeIndices[i];
                if (idx !== undefined) {
                    newVal.splice(idx, 1);
                }
            }
        }
        
        // Move the single Close task to the end if not already there
        const currentCloseIndex = newVal.findIndex(t => t.type === 'Close');
        if (currentCloseIndex !== -1 && currentCloseIndex !== newVal.length - 1) {
            const closeTask = newVal[currentCloseIndex];
            if (closeTask) {
                newVal.splice(currentCloseIndex, 1);
                newVal.push(closeTask);
            }
        }
    }
}, { deep: true });

const getDefaultSettings = (type: TaskType) => {
  switch (type) {
    case 'Start':
      return { clientType: 'Official' };
    case 'Recruit':
      return {
        refresh3Star: true,
        useExpedited: true,
        maxTimes: '4',
        confirm1: false,
        confirm3: true,
        confirm4: true,
        confirm5: true,
      };
    case 'Base':
      return {
        mode: 'Default',
        droneUsage: '不使用无人机',
        facilities: {
          trade: false,
          factory: false,
          control: false,
          power: false,
          meeting: false,
          office: false,
          dorm: false,
          workshop: false,
          training: false,
        },
        moodThreshold: 0,
        trust: true,
        noDormIfStationed: true,
        originiumShard: true,
        meetingCredit: true,
        continueTraining: true,
      };
    case 'Battle':
      return {
        stageMode: 'Current',
        customStage: '',
        eatSanityPot: 0,
        enableEatSanity: false,
        eatOriginium: 0,
        enableEatOriginium: false,
        runTimes: 0,
        enableRunTimes: false,
        consecutive: '0',
        stoneCrushingMode: false,
        ignoreExpiry: false,
      };
    case 'Shop':
      return {
        creditShop: true,
        ignoreBlacklistOverflow: true,
        earnCredit: true,
        priority: { recruit: true, lmd: true },
        blacklist: { expedited: true, furniture: true },
      };
    case 'Reward':
      return {
        daily: true,
        mail: true,
        recruit: true,
        orundum: true,
        mining: true,
        monthly: true,
      };
    case 'Close':
    default:
      return {};
  }
};

const getPrompt = () => {
  let lines = [];
  lines.push('请基于（参考文件路径）内的所有帮助你编写的文档，帮我写一个如下的自动化脚本：');
  
  tasks.value.forEach((task, index) => {
    let taskLines = [];
    const s = task.settings;

    // Task Header
    let title = TASK_TYPES.find(t => t.type === task.type)?.label || task.type;
    taskLines.push(`${index + 1}.${title}`);

    // Task Details
    switch (task.type) {
      case 'Start':
        if (s.clientType) taskLines.push(`客户端类型：${s.clientType}`);
        break;
      
      case 'Recruit':
        if (s.refresh3Star) taskLines.push('- 自动刷新3星tags');
        if (s.useExpedited) taskLines.push('- 自动使用加急许可');
        if (s.maxTimes) taskLines.push(`- 每次执行时最大招募次数：${s.maxTimes}`);
        if (s.confirm1) taskLines.push('- 手动确认1星');
        if (s.confirm3) taskLines.push('- 自动确认3星');
        if (s.confirm4) taskLines.push('- 自动确认4星');
        if (s.confirm5) taskLines.push('- 自动确认5星');
        break;

      case 'Base':
        taskLines.push(`- 无人机用途：${s.droneUsage}`);
        taskLines.push(`- 基建模式：${s.mode === 'Default' ? '常规模式' : '队列轮换'}`);
        taskLines.push(`- 基建工作心情阈值：${s.moodThreshold}%`);

        if (s.trust) taskLines.push('- 宿舍空余位置蹭信赖');
        if (s.noDormIfStationed) taskLines.push('- 不将已进驻的干员放入宿舍');
        if (s.originiumShard) taskLines.push('- 源石碎片自动补货');
        if (s.meetingCredit) taskLines.push('- 会客室信息板收取信用');
        if (s.continueTraining) taskLines.push('- 当前技能训练完成后继续尝试专精');

         if (s.mode === 'Default') {
            const facNames: Record<string, string> = { 
                'factory': '制造站', 'trade': '贸易站', 'control': '控制中枢', 
                'power': '发电站', 'meeting': '会客室', 'office': '办公室', 
                'dorm': '宿舍', 'workshop': '加工站', 'training': '训练室' 
            };
            const activeFacilities = Object.keys(s.facilities).filter(k => s.facilities[k]).map(k => facNames[k]);
            activeFacilities.forEach(f => taskLines.push(`- ${f}`));
        }
        break;

      case 'Battle':
        if (s.stageMode === 'Current') taskLines.push('- 关卡选择：当前/上次');
        else if (s.stageMode === 'Custom' && s.customStage) taskLines.push(`- 关卡选择：${s.customStage}`);
        
        if (s.enableEatSanity && s.eatSanityPot > 0) taskLines.push(`- 吃理智药：${s.eatSanityPot}`);
        if (s.enableEatOriginium && s.eatOriginium > 0) taskLines.push(`- 吃源石：${s.eatOriginium}`);
        if (s.enableRunTimes && s.runTimes > 0) taskLines.push(`- 指定次数：${s.runTimes}`);
        
        if (s.consecutive && s.consecutive !== '0') {
             taskLines.push(`- 连战次数：${s.consecutive}`);
        }

        if (s.stoneCrushingMode) taskLines.push('- 博朗台碎石模式');
        if (s.ignoreExpiry) taskLines.push('- 无限吃48小时内过期的理智药');
        break;

      case 'Shop':
        if (s.creditShop) taskLines.push('- 信用购物');
        if (s.ignoreBlacklistOverflow) taskLines.push('- 信用溢出时无视blacklist');
        if (s.earnCredit) taskLines.push('- 借助战赚信用');
        
        {
          let priority = [];
          if (s.priority.recruit) priority.push('招聘许可');
          if (s.priority.lmd) priority.push('龙门币');
          if (priority.length > 0) taskLines.push(`- 优先购买：${priority.join('/')}`);
        }
        {
          let blacklist = [];
          if (s.blacklist.expedited) blacklist.push('加急许可');
          if (s.blacklist.furniture) blacklist.push('家具零件');
          if (blacklist.length > 0) taskLines.push(`- 黑名单：${blacklist.join('/')}`);
        }
        break;

      case 'Reward':
        if (s.daily) taskLines.push('- 领取每日/每周任务奖励');
        if (s.mail) taskLines.push('- 领取所有邮件奖励');
        if (s.recruit) taskLines.push('- 进行每日免费单抽');
        if (s.orundum) taskLines.push('- 领取幸运壇合成玉奖励');
        if (s.mining) taskLines.push('- 领取限时开采许可合成玉奖励');
        if (s.monthly) taskLines.push('- 领取周年庆赠送月卡奖励');
        break;

      case 'Close':
        break;
    }

    if (taskLines.length > 1 || task.type === 'Close' ) { // Close has no sub-items but is valid
       lines.push(taskLines.join('\n'));
    } else { 
       // Just title, no settings? Usually implies defaults or skip.
       // But if user added the task explicitly, maybe they want default?
       // We keep it.
       lines.push(taskLines[0]);
    }
  });

  const finalName = configName.value.trim() || '（配置文件）';
  lines.push(`\n如果你没找到相关功能则告诉我并忽略，然后将你能编写的内容编写到一个配置文件中。这个配置文件用途是：${finalName}。当我将来说帮我完成${finalName}时，则运行这个配置文件`);
  
  promptResult.value = lines.join('\n');
  resultVisible.value = true;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(promptResult.value).then(() => {
    alert('已复制到剪贴板');
  });
};

const selectText = (event: Event) => {
  (event.target as HTMLTextAreaElement).select();
};

const downloadConfig = () => {
  const data = JSON.stringify(tasks.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maa-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const uploadConfigInput = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  uploadConfigInput.value?.click();
};

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  readFile(file);
  input.value = '';
};

const handleDrop = (event: DragEvent) => {
    const file = event.dataTransfer?.files[0];
    if (file && file.name.endsWith('.json')) {
        readFile(file);
    } else if (file) {
        alert('请拖入有效的 .json 配置文件');
    }
};

const readFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        tasks.value = parsed;
        alert('配置已成功加载！');
      } else {
        alert('文件格式错误：必须是任务数组');
      }
    } catch (err) {
      alert('文件解析失败：无效的 JSON 文件');
    }
  };
  reader.readAsText(file);
};

</script>

<template>
  <div class="container mx-auto p-4 max-w-2xl text-left min-h-screen" @dragover.prevent @drop.prevent="handleDrop">
    <h1 class="text-3xl font-bold mb-6 text-center text-blue-400">MAA Prompt Generator</h1>
    
    <div class="mb-4 flex flex-col items-center">
      <label class="text-gray-400 mb-1 text-sm">配置名称 (可选)</label>
      <input v-model="configName" type="text" placeholder="配置文件" class="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white w-full max-w-xs focus:outline-none focus:border-blue-500 text-center placeholder-gray-500" />
    </div>

    <div class="mb-6 flex flex-wrap gap-2 justify-center">
        <button v-for="t in TASK_TYPES" :key="t.type" @click="addTask(t.type)" 
          class="px-3 py-2 bg-blue-600 rounded hover:bg-blue-500 text-white text-sm transition font-medium shadow-md">
            + {{ t.label }}
        </button>
    </div>
    
    <input type="file" ref="uploadConfigInput" @change="handleFileUpload" accept=".json" class="hidden" />

    <!-- Task List -->
    <div v-for="(task, index) in tasks" :key="task.id" 
      class="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-800 text-gray-200 shadow-lg relative transition hover:border-gray-600">
      
      <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <div class="flex items-center gap-2">
           <span class="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-400">#{{ index + 1 }}</span>
           <h2 class="text-lg font-semibold text-white">{{ TASK_TYPES.find(t => t.type === task.type)?.label }}</h2>
        </div>
        <div class="flex gap-1">
            <button @click="moveTask(index, 'up')" :disabled="index === 0" class="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-30 transition">↑</button>
            <button @click="moveTask(index, 'down')" :disabled="index === tasks.length - 1" class="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-30 transition">↓</button>
            <button @click="removeTask(index)" class="w-8 h-8 flex items-center justify-center bg-red-900/50 hover:bg-red-700 text-red-200 rounded transition ml-2">✕</button>
        </div>
      </div>

      <!-- Task Details Form -->
      <div class="space-y-3 text-sm">
        
        <!-- Start -->
        <div v-if="task.type === 'Start'">
          <label class="block text-gray-400 mb-1">客户端类型</label>
          <select v-model="task.settings.clientType" class="w-full bg-gray-900 border border-gray-700 p-2 rounded focus:border-blue-500 focus:outline-none">
            <option v-for="opt in ['Official', 'Bilibili', 'txwy', 'YostarJP', 'YostarEN', 'YostarKR']" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <!-- Recruit -->
        <div v-if="task.type === 'Recruit'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-700/50"><input type="checkbox" v-model="task.settings.refresh3Star"> 自动刷新3星tags</label>
            <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-700/50"><input type="checkbox" v-model="task.settings.useExpedited"> 自动使用加急许可</label>
          </div>
          <div class="mt-2">
            <label class="block text-gray-400 mb-1">每次执行时最大招募次数</label>
            <select v-model="task.settings.maxTimes" class="bg-gray-900 border border-gray-700 p-2 rounded w-full focus:border-blue-500 focus:outline-none">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700/50">
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" v-model="task.settings.confirm1"> 手动确认1星</label>
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" v-model="task.settings.confirm3"> 自动确认3星</label>
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" v-model="task.settings.confirm4"> 自动确认4星</label>
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" v-model="task.settings.confirm5"> 自动确认5星</label>
          </div>
        </div>

        <!-- Base -->
        <div v-if="task.type === 'Base'">
          <label class="block text-gray-400 mb-1">无人机用途</label>
          <select v-model="task.settings.droneUsage" class="bg-gray-900 border border-gray-700 p-2 rounded w-full mb-3 focus:outline-none">
              <option value="不使用无人机">不使用无人机</option>
              <option value="贸易站-龙门币">贸易站-龙门币</option>
              <option value="贸易站-合成玉">贸易站-合成玉</option>
              <option value="制造站-经验书">制造站-经验书</option>
              <option value="制造站-赤金">制造站-赤金</option>
              <option value="制造站-源石碎片">制造站-源石碎片</option>
              <option value="制造站-芯片组">制造站-芯片组</option>
          </select>

          <label class="block text-gray-400 mb-1">基建模式</label>
          <div class="flex gap-4 mb-3 p-2 bg-gray-900/50 rounded">
            <label class="cursor-pointer"><input type="radio" value="Default" v-model="task.settings.mode"> 常规模式</label>
            <label class="cursor-pointer"><input type="radio" value="Queue" v-model="task.settings.mode"> 队列轮换</label>
          </div>

          <div v-if="task.settings.mode === 'Default'" class="pl-3 border-l-2 border-blue-500/50 my-3">
             <label class="block text-xs text-blue-300 mb-1">换班设施</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <label v-for="(val, key) in { '制造站': 'factory', '贸易站': 'trade', '控制中枢': 'control', '发电站': 'power', '会客室': 'meeting', '办公室': 'office', '宿舍': 'dorm', '加工站': 'workshop', '训练室': 'training' }" :key="key"
                  class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" v-model="task.settings.facilities[val]"> {{ key }}
                </label>
            </div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
               <span>基建工作心情阈值</span>
               <span>{{ task.settings.moodThreshold }}%</span>
            </div>
            <input type="range" min="0" max="100" v-model.number="task.settings.moodThreshold" class="w-full accent-blue-500">
          </div>

          <div class="grid grid-cols-1 gap-2 text-xs pt-2 border-t border-gray-700/50">
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.trust"> 宿舍空余位置蹭信赖</label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.noDormIfStationed"> 不将已进驻的干员放入宿舍</label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.originiumShard"> 源石碎片自动补货</label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.meetingCredit"> 会客室信息板收取信用</label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.continueTraining"> 当前技能训练完成后继续尝试专精</label>
          </div>
        </div>

        <!-- Battle -->
        <div v-if="task.type === 'Battle'">
            <div class="mb-3">
                <label class="block text-gray-400 mb-1 font-medium">关卡选择</label>
                <div class="flex flex-col gap-2 text-sm">
                   <label class="flex items-center gap-2 cursor-pointer p-2 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 transition" :class="{'bg-blue-900/40 border-blue-500': task.settings.stageMode === 'Current'}">
                      <input type="radio" value="Current" v-model="task.settings.stageMode" class="accent-blue-500">
                      <span>当前 / 上次</span>
                   </label>
                   
                   <label class="flex items-center gap-2 cursor-pointer p-2 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 transition" :class="{'bg-blue-900/40 border-blue-500': task.settings.stageMode === 'Custom'}">
                      <input type="radio" value="Custom" v-model="task.settings.stageMode" class="accent-blue-500">
                      <span>自定义</span>
                   </label>
                </div>
                <div v-if="task.settings.stageMode === 'Custom'" class="mt-2 pl-6 animate-fade-in">
                    <input v-model="task.settings.customStage" placeholder="输入关卡名 (如 1-7)" class="w-full bg-black border border-gray-600 p-2 rounded focus:outline-none focus:border-blue-500 text-white placeholder-gray-500">
                </div>
            </div>

            <div class="space-y-3 bg-gray-900/30 p-2 rounded">
                <div class="flex items-center justify-between gap-4">
                   <label class="flex items-center gap-2 cursor-pointer min-w-[100px]">
                       <input type="checkbox" v-model="task.settings.enableEatSanity" class="accent-green-500">
                       <span :class="{'text-gray-400': !task.settings.enableEatSanity}">吃理智药</span>
                   </label>
                   <input v-if="task.settings.enableEatSanity" type="number" min="0" max="99" v-model.number="task.settings.eatSanityPot" class="w-20 bg-black border border-gray-600 rounded px-2 py-1 text-right focus:border-green-500 focus:outline-none">
                </div>
                <div class="flex items-center justify-between gap-4">
                   <label class="flex items-center gap-2 cursor-pointer min-w-[100px]">
                       <input type="checkbox" v-model="task.settings.enableEatOriginium" class="accent-yellow-500">
                       <span :class="{'text-gray-400': !task.settings.enableEatOriginium}">吃源石</span>
                   </label>
                   <input v-if="task.settings.enableEatOriginium" type="number" min="0" max="99" v-model.number="task.settings.eatOriginium" class="w-20 bg-black border border-gray-600 rounded px-2 py-1 text-right focus:border-yellow-500 focus:outline-none">
                </div>
                <div class="flex items-center justify-between gap-4">
                   <label class="flex items-center gap-2 cursor-pointer min-w-[100px]">
                       <input type="checkbox" v-model="task.settings.enableRunTimes" class="accent-purple-500">
                       <span :class="{'text-gray-400': !task.settings.enableRunTimes}">指定次数</span>
                   </label>
                   <input v-if="task.settings.enableRunTimes" type="number" min="0" max="99" v-model.number="task.settings.runTimes" class="w-20 bg-black border border-gray-600 rounded px-2 py-1 text-right focus:border-purple-500 focus:outline-none">
                </div>
            </div>

            <div class="mt-3">
                <label class="block text-gray-400 mb-1">连战次数</label>
                <select v-model="task.settings.consecutive" class="w-full bg-gray-900 border border-gray-700 p-2 rounded focus:outline-none">
                    <option value="0">0 (默认)</option>
                    <option v-for="n in 6" :key="n" :value="String(n)">{{ n }}</option>
                    <option value="AUTO">AUTO</option>
                </select>
            </div>

            <div class="mt-3 space-y-2 pt-2 border-t border-gray-700/50">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.stoneCrushingMode" class="accent-red-500"> 博朗台碎石模式</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.ignoreExpiry" class="accent-blue-500"> 无限吃48小时内过期的理智药</label>
            </div>
        </div>
        
        <!-- Shop -->
        <div v-if="task.type === 'Shop'">
             <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.creditShop"> 信用购物</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.ignoreBlacklistOverflow"> 信用溢出时无视blacklist</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.earnCredit"> 借助战赚信用</label>
             </div>
             
             <div class="mt-3 p-2 bg-gray-900/50 rounded">
                <label class="block text-xs font-semibold text-gray-400 mb-1">优先购买</label>
                <div class="flex gap-4">
                    <label class="cursor-pointer"><input type="checkbox" v-model="task.settings.priority.recruit"> 招聘许可</label>
                    <label class="cursor-pointer"><input type="checkbox" v-model="task.settings.priority.lmd"> 龙门币</label>
                </div>
             </div>

             <div class="mt-2 p-2 bg-gray-900/50 rounded">
                <label class="block text-xs font-semibold text-gray-400 mb-1">黑名单</label>
                <div class="flex gap-4">
                    <label class="cursor-pointer"><input type="checkbox" v-model="task.settings.blacklist.expedited"> 加急许可</label>
                    <label class="cursor-pointer"><input type="checkbox" v-model="task.settings.blacklist.furniture"> 家具零件</label>
                </div>
             </div>
        </div>

        <!-- Reward -->
        <div v-if="task.type === 'Reward'">
            <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.daily"> 领取每日/每周任务奖励</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.mail"> 领取所有邮件奖励</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.recruit"> 进行每日免费单抽</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.orundum"> 领取幸运壇合成玉奖励</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.mining"> 领取限时开采许可合成玉奖励</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="task.settings.monthly"> 领取周年庆赠送月卡奖励</label>
            </div>
        </div>

      </div>
    </div>

    <!-- Generate Button -->
    <div class="mt-8 text-center sticky bottom-4 z-10 flex justify-center gap-4 bg-gray-900/80 p-4 rounded-xl backdrop-blur-sm border border-gray-700/50">
        <button @click="triggerUpload" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2 text-sm">
             <span>📂</span> 导入
        </button>
        <button @click="getPrompt" class="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 rounded-full hover:from-green-500 hover:to-green-400 text-white font-bold text-lg shadow-xl transform transition hover:scale-105">
            生成 Prompt
        </button>
        <button @click="downloadConfig" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2 text-sm">
             <span>💾</span> 导出
        </button>
    </div>

    <!-- Result Area -->
    <div v-if="resultVisible" class="mt-8 mb-12 animate-fade-in-up">
        <div class="flex justify-between items-center mb-2 px-1">
            <h3 class="font-bold text-green-400">生成结果</h3>
            <button @click="copyToClipboard" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white flex items-center gap-1">
               <span>📋</span> 复制 All
            </button>
        </div>
        <div class="relative">
            <textarea readonly v-model="promptResult" class="w-full h-64 bg-black text-gray-300 p-4 rounded-lg font-mono text-sm border border-gray-700 focus:outline-none focus:border-green-500" @click="selectText"></textarea>
        </div>
    </div>

  </div>
</template>

<style>
body {
    background-color: #111827; /* gray-900 */
    color: #e5e7eb; /* gray-200 */
}
input[type="range"] {
    cursor: pointer;
}
</style>
