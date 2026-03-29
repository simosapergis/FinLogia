export type NotificationPayload = {
  id?: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  timeout?: number;
};

export type NotificationMessage = Required<Omit<NotificationPayload, 'timeout'>> & { timeout: number };

type Subscriber = (payload: NotificationMessage) => void;

const subscribers = new Set<Subscriber>();

let counter = 0;
function createId(): string {
  return `notif-${Date.now()}-${++counter}`;
}

export const subscribe = (listener: Subscriber) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

export const notify = (payload: NotificationPayload): NotificationMessage => {
  const message: NotificationMessage = {
    id: payload.id ?? createId(),
    message: payload.message,
    type: payload.type ?? 'info',
    timeout: payload.timeout ?? 4000,
  };
  subscribers.forEach((listener) => listener(message));
  return message;
};
