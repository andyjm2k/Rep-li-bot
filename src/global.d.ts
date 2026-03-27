import type { ReplibotApi } from '../shared/types';

declare global {
  interface Window {
    replibot: ReplibotApi;
  }
}

export {};

