function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.text}</div>;
}

export default Toast;