// Chrome Extension API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

// Extend the chrome namespace with additional types if needed
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
    }
  }
  
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      active?: boolean;
      currentWindow?: boolean;
    }
    
    function query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
    }): Promise<Tab[]>;
    
    function sendMessage(
      tabId: number,
      message: any,
      callback?: (response: any) => void
    ): void;
  }
  
  namespace runtime {
    const lastError: chrome.runtime.LastError | undefined;
    
    interface LastError {
      message?: string;
    }
  }
}

export {}; 