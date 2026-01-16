import { useToasts } from "../services/ToastService";

export default function ToastContainer() {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="toast-container">
      {toasts.map((t:any) => (
        <div onClick={() => removeToast(t.id)} key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
