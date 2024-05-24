export function waitForElement<T extends Element>(
  selector: string,
  root: HTMLElement | null | undefined | Document = document,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (!root) {
        clearInterval(interval);
        clearTimeout(timer);
        reject(new Error('Root element not found'));
      }
      const element = root!.querySelector<T>(selector);
      if (element) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve(element);
      }
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
