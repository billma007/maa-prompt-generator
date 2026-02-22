export type ClientType = 'Official' | 'Bilibili' | 'txwy' | 'YostarJP' | 'YostarEN' | 'YostarKR';

export type TaskType = 
  | 'Start' 
  | 'Recruit' 
  | 'Base' 
  | 'Battle' 
  | 'Shop' 
  | 'Reward'
  | 'Close';

export interface Task {
  id: string;
  type: TaskType;
  // Specific settings for each task type
  settings: Record<string, any>;
}

export const TASK_TYPES: { type: TaskType; label: string }[] = [
  { type: 'Start', label: '开始唤醒' },
  { type: 'Recruit', label: '自动公招' },
  { type: 'Base', label: '基建换班' },
  { type: 'Battle', label: '刷理智' },
  { type: 'Shop', label: '收取信用及购物' },
  { type: 'Reward', label: '领取奖励' },
  { type: 'Close', label: '关闭游戏' },
];
