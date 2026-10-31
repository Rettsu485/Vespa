// Общие типы данных, используются и в main-, и в renderer-процессе.
export const MONITORING_STATUSES = [
    'в работе',
    'приостановлено',
    'выполнено',
    'архив',
];
export const ABSENCE_TYPES = [
    'отпуск',
    'командировка',
    'больничный',
    'иное',
];
export const APPROVAL_STATUSES = [
    'на согласовании',
    'на подписи',
    'подписан',
];
export const TASK_PRIORITIES = [
    'срочно',
    'высокий',
    'обычный',
    'низкий',
];
export const TASK_STATUSES = [
    'входящая',
    'в работе',
    'ожидание',
    'на проверке',
    'выполнено',
    'отменено',
];
export const DEFAULT_SETTINGS = {
    theme: 'system',
    density: 'normal',
    controlRedName: 'Красный',
    controlGreenName: 'Зелёный',
    edoLinkTemplate: 'https://sed.example.ru/doc/{номер}',
};
