import { toast as sonnerToast } from "sonner";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  const toast = ({ title, description, variant = "default" }: Toast) => {
    const message = description ? `${title}: ${description}` : title;

    switch (variant) {
      case "destructive":
        sonnerToast.error(title, {
          description: description,
        });
        break;
      case "success":
        sonnerToast.success(title, {
          description: description,
        });
        break;
      default:
        sonnerToast(title, {
          description: description,
        });
        break;
    }
  };

  return { toast };
}

// Also export direct access to sonner toast
export { toast as sonnerToast } from "sonner";
