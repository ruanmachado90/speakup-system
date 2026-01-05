export const showToast = (setToast, message, duration = 3000) => {
  setToast(message);
  setTimeout(() => setToast(null), duration);
};
