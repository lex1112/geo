export const sleep = (ms?: number): Promise<void> => {
  if (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  } else {
    return new Promise((resolve) => setImmediate(resolve));
  }
};
