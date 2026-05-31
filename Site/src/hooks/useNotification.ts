// src/hooks/useNotification.ts
import { useState, useEffect, useCallback } from "react";

export type NotificationType = "success" | "error" | "info" | "warning" | "confirm";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  resolve?: (value: boolean) => void;
}

// Estado global e sistema de ouvintes (listeners) fora do React Context
let notificationsStore: Notification[] = [];
let listeners: Array<(n: Notification[]) => void> = [];

const emit = () => {
  listeners.forEach((listener) => listener([...notificationsStore]));
};

/**
 * Hook centralizado para gerenciar notificações e confirmações.
 * Registra ouvintes para manter o estado sincronizado entre todos os componentes.
 */
export function useNotification() {
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notificationsStore);

  useEffect(() => {
    listeners.push(setLocalNotifications);
    setLocalNotifications([...notificationsStore]);
    return () => {
      listeners = listeners.filter((l) => l !== setLocalNotifications);
    };
  }, []);

  /**
   * Remove uma notificação pelo ID. Se for uma confirmação pendente, resolve como false.
   */
  const remove = useCallback((id: string, result: boolean = false) => {
    const item = notificationsStore.find((n) => n.id === id);
    if (item?.resolve) {
      item.resolve(result);
    }
    notificationsStore = notificationsStore.filter((n) => n.id !== id);
    emit();
  }, []);

  /**
   * Dispara uma notificação simples.
   */
  const notify = useCallback(
    (message: string, type: Exclude<NotificationType, "confirm">, duration: number = 4000) => {
      const id = crypto.randomUUID();
      const newNotification: Notification = { id, message, type, duration };

      notificationsStore = [...notificationsStore, newNotification];
      emit();

      if (duration > 0) {
        setTimeout(() => {
          // Remove silenciosamente se não for clicado
          notificationsStore = notificationsStore.filter((n) => n.id !== id);
          emit();
        }, duration);
      }
    },
    []
  );

  /**
   * Abre um toast de confirmação e retorna uma Promise<boolean>.
   * Não possui tempo de expiração automático.
   */
  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const newNotification: Notification = {
        id,
        message,
        type: "confirm",
        resolve,
      };

      notificationsStore = [...notificationsStore, newNotification];
      emit();
    });
  }, []);

  return {
    notify,
    confirm,
    notifications: localNotifications,
    remove,
  };
}
